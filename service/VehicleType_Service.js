const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");

const MODULE_NAME = "VehicleType";

async function getVehicleType(pool, vehicleTypeId) {
  try {
    if (!vehicleTypeId || isNaN(parseInt(vehicleTypeId))) {
      throw new CustomError("A valid numeric VehicleTypeID is required.");
    }

    const query = `
        SELECT VT.*, U.UOMName,
               CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM VehicleTypes VT
        LEFT JOIN UOMs U ON VT.UOMID = U.UOMID
        LEFT JOIN Users CU ON VT.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON VT.UpdatedBy = UU.UserID
        WHERE VT.VehicleTypeID = @VehicleTypeID AND VT.IsDeleted = 0
    `;
    const request = pool
      .request()
      .input("VehicleTypeID", sql.Int, vehicleTypeId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError("No active Vehicle Type found with the given ID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching Vehicle Type: ${err.message}`);
  }
}

async function getAllVehicleTypes(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "VehicleTypeName";
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC";

    const whereClauses = ["VT.IsDeleted = 0"];
    let request = pool.request();

    if (values.IsActive !== undefined) {
      whereClauses.push("VT.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (searchTerm) {
      whereClauses.push(
        "(VT.VehicleTypeName LIKE @SearchTerm OR VT.VehicleCapacityTonnes LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;
    const validSortColumns = [
      "VehicleTypeName",
      "VehicleCapacityTonnes",
      "CreatedDate",
    ];
    const safeSortBy = validSortColumns.includes(sortBy)
      ? `VT.${sortBy}`
      : "VT.VehicleTypeName";

    const countQuery = `
        SELECT COUNT(*) as total FROM VehicleTypes VT ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = `
        SELECT VT.*, U.UOMName,
               CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM VehicleTypes VT
        LEFT JOIN UOMs U ON VT.UOMID = U.UOMID
        LEFT JOIN Users CU ON VT.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON VT.UpdatedBy = UU.UserID
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
    throw new CustomError(`Error fetching all Vehicle Types: ${err.message}`);
  }
}

async function addVehicleType(pool, values) {
  try {
    const {
      VehicleTypeName,
      VehicleCapacityTonnes,
      Length,
      Breadth,
      Height,
      UOMID,
      IsActive,
      user_id,
    } = values;

    if (
      !VehicleTypeName ||
      !VehicleCapacityTonnes ||
      IsActive === undefined ||
      !user_id
    ) {
      throw new CustomError(
        "Vehicle Type Name, Capacity, and Active status are required."
      );
    }

    let duplicateCheckQuery = `SELECT COUNT(*) as NameCount FROM VehicleTypes WHERE VehicleTypeName = @Name AND IsDeleted = 0`;
    let request = pool
      .request()
      .input("Name", sql.NVarChar(100), VehicleTypeName);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Vehicle Type with name '${VehicleTypeName}' already exists.`
      );

    const query = `
        DECLARE @OutputTable TABLE (VehicleTypeID INT);
        INSERT INTO VehicleTypes (VehicleTypeName, VehicleCapacityTonnes, Length, Breadth, Height, UOMID, IsActive, CreatedBy, UpdatedBy)
        OUTPUT INSERTED.VehicleTypeID INTO @OutputTable
        VALUES (@Name, @Capacity, @Length, @Breadth, @Height, @UOMID, @IsActive, @UserID, @UserID);
        SELECT VehicleTypeID FROM @OutputTable;
    `;
    const insertRequest = pool
      .request()
      .input("Name", sql.NVarChar(100), VehicleTypeName)
      .input("Capacity", sql.Decimal(10, 2), VehicleCapacityTonnes)
      .input("Length", sql.Decimal(10, 2), Length || null)
      .input("Breadth", sql.Decimal(10, 2), Breadth || null)
      .input("Height", sql.Decimal(10, 2), Height || null)
      .input("UOMID", sql.Int, UOMID || null)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await insertRequest.query(query);
    const newId = result.recordset[0].VehicleTypeID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_VEHICLE_TYPE",
      moduleName: MODULE_NAME,
      referenceID: newId,
      details: { newData: values },
    });

    return getVehicleType(pool, newId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new Vehicle Type: ${err.message}`);
  }
}

async function updateVehicleType(pool, values) {
  try {
    const { VehicleTypeID, ...updateData } = values;
    if (!VehicleTypeID)
      throw new CustomError("VehicleTypeID is required for update.");

    const {
      VehicleTypeName,
      VehicleCapacityTonnes,
      Length,
      Breadth,
      Height,
      UOMID,
      IsActive,
      user_id,
    } = updateData;
    const original = await getVehicleType(pool, VehicleTypeID);

    let duplicateCheckQuery = `SELECT COUNT(*) as NameCount FROM VehicleTypes WHERE VehicleTypeName = @Name AND IsDeleted = 0 AND VehicleTypeID != @ID`;
    let request = pool
      .request()
      .input("Name", sql.NVarChar(100), VehicleTypeName)
      .input("ID", sql.Int, VehicleTypeID);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Vehicle Type with name '${VehicleTypeName}' already exists.`
      );

    const query = `
        UPDATE VehicleTypes SET
            VehicleTypeName = @Name, VehicleCapacityTonnes = @Capacity, Length = @Length, 
            Breadth = @Breadth, Height = @Height, UOMID = @UOMID, 
            IsActive = @IsActive, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE VehicleTypeID = @ID;
    `;
    const updateRequest = pool
      .request()
      .input("Name", sql.NVarChar(100), VehicleTypeName)
      .input("Capacity", sql.Decimal(10, 2), VehicleCapacityTonnes)
      .input("Length", sql.Decimal(10, 2), Length || null)
      .input("Breadth", sql.Decimal(10, 2), Breadth || null)
      .input("Height", sql.Decimal(10, 2), Height || null)
      .input("UOMID", sql.Int, UOMID || null)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, VehicleTypeID);
    await updateRequest.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_VEHICLE_TYPE",
      moduleName: MODULE_NAME,
      referenceID: VehicleTypeID,
      details: { oldData: original, newData: updateData },
    });

    return getVehicleType(pool, VehicleTypeID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating Vehicle Type: ${err.message}`);
  }
}

async function deleteVehicleType(pool, values) {
  try {
    const { VehicleTypeID, user_id } = values;
    if (!VehicleTypeID)
      throw new CustomError("VehicleTypeID is required for deletion.");
    const toDelete = await getVehicleType(pool, VehicleTypeID);

    const query = `
        UPDATE VehicleTypes SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE VehicleTypeID = @ID;
    `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, VehicleTypeID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_VEHICLE_TYPE",
      moduleName: MODULE_NAME,
      referenceID: VehicleTypeID,
      details: { deletedData: toDelete },
    });
    return { message: "Vehicle Type deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting Vehicle Type: ${err.message}`);
  }
}

async function getVehicleTypesLite(pool) {
  try {
    let query = `
        SELECT VehicleTypeID, VehicleTypeName 
        FROM VehicleTypes 
        WHERE IsDeleted = 0 AND IsActive = 1
        ORDER BY VehicleTypeName
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching Vehicle Types list: ${err.message}`);
  }
}

module.exports = {
  getVehicleType,
  getAllVehicleTypes,
  addVehicleType,
  updateVehicleType,
  deleteVehicleType,
  getVehicleTypesLite,
};
