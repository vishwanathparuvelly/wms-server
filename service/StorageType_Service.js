const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");

const MODULE_NAME = "StorageType";

async function getStorageType(pool, storageTypeId) {
  try {
    if (!storageTypeId || isNaN(parseInt(storageTypeId))) {
      throw new CustomError("A valid numeric StorageTypeID is required.");
    }

    const query = `
        SELECT ST.*, CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM StorageTypes ST
        LEFT JOIN Users CU ON ST.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON ST.UpdatedBy = UU.UserID
        WHERE ST.StorageTypeID = @StorageTypeID AND ST.IsDeleted = 0
    `;
    const request = pool
      .request()
      .input("StorageTypeID", sql.Int, storageTypeId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError("No active Storage Type found with the given ID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching Storage Type: ${err.message}`);
  }
}

async function getAllStorageTypes(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "StorageTypeName";
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC";

    const whereClauses = ["ST.IsDeleted = 0"];
    let request = pool.request();

    if (values.IsActive !== undefined) {
      whereClauses.push("ST.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (searchTerm) {
      whereClauses.push(
        "(ST.StorageTypeName LIKE @SearchTerm OR ST.StorageTypeDescription LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;
    const validSortColumns = [
      "StorageTypeName",
      "StorageTypeDescription",
      "CreatedDate",
    ];
    const safeSortBy = validSortColumns.includes(sortBy)
      ? `ST.${sortBy}`
      : "ST.StorageTypeName";

    const countQuery = `SELECT COUNT(*) as total FROM StorageTypes ST ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = `
        SELECT ST.*, CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM StorageTypes ST
        LEFT JOIN Users CU ON ST.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON ST.UpdatedBy = UU.UserID
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
    throw new CustomError(`Error fetching all Storage Types: ${err.message}`);
  }
}

async function addStorageType(pool, values) {
  try {
    const { StorageTypeName, StorageTypeDescription, IsActive, user_id } =
      values;

    if (
      !StorageTypeName ||
      !StorageTypeDescription ||
      IsActive === undefined ||
      !user_id
    ) {
      throw new CustomError(
        "Storage Type Name, Description, and Active status are required."
      );
    }

    let duplicateCheckQuery = `SELECT COUNT(*) as NameCount FROM StorageTypes WHERE StorageTypeName = @Name AND IsDeleted = 0`;
    let request = pool
      .request()
      .input("Name", sql.NVarChar(100), StorageTypeName);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Storage Type with name '${StorageTypeName}' already exists.`
      );

    const query = `
        DECLARE @OutputTable TABLE (StorageTypeID INT);
        INSERT INTO StorageTypes (StorageTypeName, StorageTypeDescription, IsActive, CreatedBy, UpdatedBy)
        OUTPUT INSERTED.StorageTypeID INTO @OutputTable
        VALUES (@Name, @Description, @IsActive, @UserID, @UserID);
        SELECT StorageTypeID FROM @OutputTable;
    `;
    const insertRequest = pool
      .request()
      .input("Name", sql.NVarChar(100), StorageTypeName)
      .input("Description", sql.NVarChar(500), StorageTypeDescription)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await insertRequest.query(query);
    const newId = result.recordset[0].StorageTypeID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_STORAGE_TYPE",
      moduleName: MODULE_NAME,
      referenceID: newId,
      details: { newData: values },
    });

    return getStorageType(pool, newId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new Storage Type: ${err.message}`);
  }
}

async function updateStorageType(pool, values) {
  try {
    const { StorageTypeID, ...updateData } = values;
    if (!StorageTypeID)
      throw new CustomError("StorageTypeID is required for update.");

    const { StorageTypeName, StorageTypeDescription, IsActive, user_id } =
      updateData;
    const original = await getStorageType(pool, StorageTypeID);

    let duplicateCheckQuery = `SELECT COUNT(*) as NameCount FROM StorageTypes WHERE StorageTypeName = @Name AND IsDeleted = 0 AND StorageTypeID != @ID`;
    let request = pool
      .request()
      .input("Name", sql.NVarChar(100), StorageTypeName)
      .input("ID", sql.Int, StorageTypeID);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Storage Type with name '${StorageTypeName}' already exists.`
      );

    const query = `
        UPDATE StorageTypes SET
            StorageTypeName = @Name, StorageTypeDescription = @Description, IsActive = @IsActive, 
            UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE StorageTypeID = @ID;
    `;
    const updateRequest = pool
      .request()
      .input("Name", sql.NVarChar(100), StorageTypeName)
      .input("Description", sql.NVarChar(500), StorageTypeDescription)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, StorageTypeID);
    await updateRequest.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_STORAGE_TYPE",
      moduleName: MODULE_NAME,
      referenceID: StorageTypeID,
      details: { oldData: original, newData: updateData },
    });

    return getStorageType(pool, StorageTypeID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating Storage Type: ${err.message}`);
  }
}

async function deleteStorageType(pool, values) {
  try {
    const { StorageTypeID, user_id } = values;
    if (!StorageTypeID)
      throw new CustomError("StorageTypeID is required for deletion.");
    const toDelete = await getStorageType(pool, StorageTypeID);

    const query = `
        UPDATE StorageTypes SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE StorageTypeID = @ID;
    `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, StorageTypeID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_STORAGE_TYPE",
      moduleName: MODULE_NAME,
      referenceID: StorageTypeID,
      details: { deletedData: toDelete },
    });
    return { message: "Storage Type deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting Storage Type: ${err.message}`);
  }
}

async function getStorageTypesLite(pool) {
  try {
    let query = `
        SELECT StorageTypeID, StorageTypeName 
        FROM StorageTypes 
        WHERE IsDeleted = 0 AND IsActive = 1
        ORDER BY StorageTypeName
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching Storage Types list: ${err.message}`);
  }
}

module.exports = {
  getStorageType,
  getAllStorageTypes,
  addStorageType,
  updateStorageType,
  deleteStorageType,
  getStorageTypesLite,
};
