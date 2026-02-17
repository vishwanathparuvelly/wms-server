// service/PalletType_Service.js

const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");

const MODULE_NAME = "PalletType";

async function getPalletType(pool, palletTypeId) {
  try {
    if (!palletTypeId || isNaN(parseInt(palletTypeId))) {
      throw new CustomError("A valid numeric PalletTypeID is required.");
    }

    const query = `
        SELECT PT.*, U.UOMName,
               CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM PalletTypes PT
        LEFT JOIN UOMs U ON PT.UOMID = U.UOMID
        LEFT JOIN Users CU ON PT.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON PT.UpdatedBy = UU.UserID
        WHERE PT.PalletTypeID = @PalletTypeID AND PT.IsDeleted = 0
    `;
    const request = pool.request().input("PalletTypeID", sql.Int, palletTypeId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError("No active Pallet Type found with the given ID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching Pallet Type: ${err.message}`);
  }
}

async function getAllPalletTypes(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "PalletName";
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC";

    const whereClauses = ["PT.IsDeleted = 0"];
    let request = pool.request();

    if (values.IsActive !== undefined) {
      whereClauses.push("PT.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (searchTerm) {
      whereClauses.push(
        "(PT.PalletName LIKE @SearchTerm OR U.UOMName LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;
    const validSortColumns = ["PalletName", "Length", "UOMName", "CreatedDate"];
    const safeSortBy = validSortColumns.includes(sortBy)
      ? `${sortBy.includes("UOM") ? "U" : "PT"}.${sortBy}`
      : "PT.PalletName";

    const countQuery = `
        SELECT COUNT(*) as total 
        FROM PalletTypes PT 
        LEFT JOIN UOMs U ON PT.UOMID = U.UOMID
        ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = `
        SELECT PT.*, U.UOMName,
               CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM PalletTypes PT
        LEFT JOIN UOMs U ON PT.UOMID = U.UOMID
        LEFT JOIN Users CU ON PT.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON PT.UpdatedBy = UU.UserID
        ${whereClause}
        ORDER BY ${safeSortBy} ${sortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
    `;
    const result = await request.query(query);
    return {
      data: result.recordset,
      pagination: { totalItems, totalPages, currentPage: page, pageSize },
    };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching all Pallet Types: ${err.message}`);
  }
}

async function addPalletType(pool, values) {
  try {
    const { PalletName, Length, Breadth, Height, UOMID, IsActive, user_id } =
      values;

    if (
      !PalletName ||
      !Length ||
      !Breadth ||
      !Height ||
      !UOMID ||
      IsActive === undefined ||
      !user_id
    ) {
      throw new CustomError(
        "Pallet Name, Dimensions, UOM, and Active status are required."
      );
    }

    let duplicateCheckQuery = `SELECT COUNT(*) as NameCount FROM PalletTypes WHERE PalletName = @Name AND IsDeleted = 0`;
    let request = pool.request().input("Name", sql.NVarChar(100), PalletName);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Pallet Type with name '${PalletName}' already exists.`
      );

    const query = `
        DECLARE @OutputTable TABLE (PalletTypeID INT);
        INSERT INTO PalletTypes (PalletName, Length, Breadth, Height, UOMID, IsActive, CreatedBy, UpdatedBy)
        OUTPUT INSERTED.PalletTypeID INTO @OutputTable
        VALUES (@Name, @Length, @Breadth, @Height, @UOMID, @IsActive, @UserID, @UserID);
        SELECT PalletTypeID FROM @OutputTable;
    `;
    const insertRequest = pool
      .request()
      .input("Name", sql.NVarChar(100), PalletName)
      .input("Length", sql.Decimal(10, 2), Length)
      .input("Breadth", sql.Decimal(10, 2), Breadth)
      .input("Height", sql.Decimal(10, 2), Height)
      .input("UOMID", sql.Int, UOMID)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await insertRequest.query(query);
    const newId = result.recordset[0].PalletTypeID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_PALLET_TYPE",
      moduleName: MODULE_NAME,
      referenceID: newId,
      details: { newData: values },
    });

    return getPalletType(pool, newId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new Pallet Type: ${err.message}`);
  }
}

async function updatePalletType(pool, values) {
  try {
    const { PalletTypeID, ...updateData } = values;
    if (!PalletTypeID)
      throw new CustomError("PalletTypeID is required for update.");

    const { PalletName, Length, Breadth, Height, UOMID, IsActive, user_id } =
      updateData;
    const original = await getPalletType(pool, PalletTypeID);

    let duplicateCheckQuery = `SELECT COUNT(*) as NameCount FROM PalletTypes WHERE PalletName = @Name AND IsDeleted = 0 AND PalletTypeID != @ID`;
    let request = pool
      .request()
      .input("Name", sql.NVarChar(100), PalletName)
      .input("ID", sql.Int, PalletTypeID);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Pallet Type with name '${PalletName}' already exists.`
      );

    const query = `
        UPDATE PalletTypes SET
            PalletName = @Name, Length = @Length, Breadth = @Breadth, Height = @Height,
            UOMID = @UOMID, IsActive = @IsActive, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE PalletTypeID = @ID;
    `;
    const updateRequest = pool
      .request()
      .input("Name", sql.NVarChar(100), PalletName)
      .input("Length", sql.Decimal(10, 2), Length)
      .input("Breadth", sql.Decimal(10, 2), Breadth)
      .input("Height", sql.Decimal(10, 2), Height)
      .input("UOMID", sql.Int, UOMID)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, PalletTypeID);
    await updateRequest.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_PALLET_TYPE",
      moduleName: MODULE_NAME,
      referenceID: PalletTypeID,
      details: { oldData: original, newData: updateData },
    });

    return getPalletType(pool, PalletTypeID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating Pallet Type: ${err.message}`);
  }
}

async function deletePalletType(pool, values) {
  try {
    const { PalletTypeID, user_id } = values;
    if (!PalletTypeID)
      throw new CustomError("PalletTypeID is required for deletion.");
    const toDelete = await getPalletType(pool, PalletTypeID);

    // Dependency check
    const dependencyCheck = await pool
      .request()
      .input("ID", sql.Int, PalletTypeID)
      .query(
        "SELECT COUNT(*) as count FROM ProductPalletConfigs WHERE PalletTypeID = @ID AND IsDeleted = 0"
      );
    if (dependencyCheck.recordset[0].count > 0) {
      throw new CustomError(
        "Cannot delete Pallet Type. It is currently linked to one or more active products."
      );
    }

    const query = `
        UPDATE PalletTypes SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE PalletTypeID = @ID;
    `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, PalletTypeID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_PALLET_TYPE",
      moduleName: MODULE_NAME,
      referenceID: PalletTypeID,
      details: { deletedData: toDelete },
    });
    return { message: "Pallet Type deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting Pallet Type: ${err.message}`);
  }
}

async function getPalletTypesLite(pool) {
  try {
    // UPDATED: Added Length, Breadth, and Height to the selection
    let query = `
        SELECT PalletTypeID, PalletName, Length, Breadth, Height
        FROM PalletTypes 
        WHERE IsDeleted = 0 AND IsActive = 1
        ORDER BY PalletName
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching Pallet Types list: ${err.message}`);
  }
}

module.exports = {
  getPalletType,
  getAllPalletTypes,
  addPalletType,
  updatePalletType,
  deletePalletType,
  getPalletTypesLite,
};
