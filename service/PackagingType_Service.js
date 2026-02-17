const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");

const MODULE_NAME = "PackagingType";

async function getPackagingType(pool, packagingTypeId) {
  try {
    if (!packagingTypeId || isNaN(parseInt(packagingTypeId))) {
      throw new CustomError("A valid numeric PackagingTypeID is required.");
    }

    const query = `
        SELECT PT.*, CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM PackagingTypes PT
        LEFT JOIN Users CU ON PT.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON PT.UpdatedBy = UU.UserID
        WHERE PT.PackagingTypeID = @PackagingTypeID AND PT.IsDeleted = 0
    `;
    const request = pool
      .request()
      .input("PackagingTypeID", sql.Int, packagingTypeId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError(
        "No active Packaging Type found with the given ID."
      );
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching Packaging Type: ${err.message}`);
  }
}

async function getAllPackagingTypes(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "PackagingTypeName";
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC";

    const whereClauses = ["PT.IsDeleted = 0"];
    let request = pool.request();

    if (values.IsActive !== undefined) {
      whereClauses.push("PT.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (searchTerm) {
      whereClauses.push(
        "(PT.PackagingTypeName LIKE @SearchTerm OR PT.PackagingTypeDescription LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;
    const validSortColumns = [
      "PackagingTypeName",
      "PackagingTypeDescription",
      "CreatedDate",
    ];
    const safeSortBy = validSortColumns.includes(sortBy)
      ? `PT.${sortBy}`
      : "PT.PackagingTypeName";

    const countQuery = `SELECT COUNT(*) as total FROM PackagingTypes PT ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = `
        SELECT PT.*, CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM PackagingTypes PT
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
    throw new CustomError(`Error fetching all Packaging Types: ${err.message}`);
  }
}

async function addPackagingType(pool, values) {
  try {
    const { PackagingTypeName, PackagingTypeDescription, IsActive, user_id } =
      values;

    if (
      !PackagingTypeName ||
      !PackagingTypeDescription ||
      IsActive === undefined ||
      !user_id
    ) {
      throw new CustomError(
        "Packaging Type Name, Description, and Active status are required."
      );
    }

    let duplicateCheckQuery = `SELECT COUNT(*) as NameCount FROM PackagingTypes WHERE PackagingTypeName = @Name AND IsDeleted = 0`;
    let request = pool
      .request()
      .input("Name", sql.NVarChar(100), PackagingTypeName);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Packaging Type with name '${PackagingTypeName}' already exists.`
      );

    const query = `
        DECLARE @OutputTable TABLE (PackagingTypeID INT);
        INSERT INTO PackagingTypes (PackagingTypeName, PackagingTypeDescription, IsActive, CreatedBy, UpdatedBy)
        OUTPUT INSERTED.PackagingTypeID INTO @OutputTable
        VALUES (@Name, @Description, @IsActive, @UserID, @UserID);
        SELECT PackagingTypeID FROM @OutputTable;
    `;
    const insertRequest = pool
      .request()
      .input("Name", sql.NVarChar(100), PackagingTypeName)
      .input("Description", sql.NVarChar(500), PackagingTypeDescription)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await insertRequest.query(query);
    const newId = result.recordset[0].PackagingTypeID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_PACKAGING_TYPE",
      moduleName: MODULE_NAME,
      referenceID: newId,
      details: { newData: values },
    });

    return getPackagingType(pool, newId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new Packaging Type: ${err.message}`);
  }
}

async function updatePackagingType(pool, values) {
  try {
    const { PackagingTypeID, ...updateData } = values;
    if (!PackagingTypeID)
      throw new CustomError("PackagingTypeID is required for update.");

    const { PackagingTypeName, PackagingTypeDescription, IsActive, user_id } =
      updateData;
    const original = await getPackagingType(pool, PackagingTypeID);

    let duplicateCheckQuery = `SELECT COUNT(*) as NameCount FROM PackagingTypes WHERE PackagingTypeName = @Name AND IsDeleted = 0 AND PackagingTypeID != @ID`;
    let request = pool
      .request()
      .input("Name", sql.NVarChar(100), PackagingTypeName)
      .input("ID", sql.Int, PackagingTypeID);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Packaging Type with name '${PackagingTypeName}' already exists.`
      );

    const query = `
        UPDATE PackagingTypes SET
            PackagingTypeName = @Name, PackagingTypeDescription = @Description, IsActive = @IsActive, 
            UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE PackagingTypeID = @ID;
    `;
    const updateRequest = pool
      .request()
      .input("Name", sql.NVarChar(100), PackagingTypeName)
      .input("Description", sql.NVarChar(500), PackagingTypeDescription)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, PackagingTypeID);
    await updateRequest.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_PACKAGING_TYPE",
      moduleName: MODULE_NAME,
      referenceID: PackagingTypeID,
      details: { oldData: original, newData: updateData },
    });

    return getPackagingType(pool, PackagingTypeID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating Packaging Type: ${err.message}`);
  }
}

async function deletePackagingType(pool, values) {
  try {
    const { PackagingTypeID, user_id } = values;
    if (!PackagingTypeID)
      throw new CustomError("PackagingTypeID is required for deletion.");
    const toDelete = await getPackagingType(pool, PackagingTypeID);

    const query = `
        UPDATE PackagingTypes SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE PackagingTypeID = @ID;
    `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, PackagingTypeID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_PACKAGING_TYPE",
      moduleName: MODULE_NAME,
      referenceID: PackagingTypeID,
      details: { deletedData: toDelete },
    });
    return { message: "Packaging Type deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting Packaging Type: ${err.message}`);
  }
}

async function getPackagingTypesLite(pool) {
  try {
    let query = `
        SELECT PackagingTypeID, PackagingTypeName 
        FROM PackagingTypes 
        WHERE IsDeleted = 0 AND IsActive = 1
        ORDER BY PackagingTypeName
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(
      `Error fetching Packaging Types list: ${err.message}`
    );
  }
}

module.exports = {
  getPackagingType,
  getAllPackagingTypes,
  addPackagingType,
  updatePackagingType,
  deletePackagingType,
  getPackagingTypesLite,
};
