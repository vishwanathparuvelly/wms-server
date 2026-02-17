// service/UOM_Service.js

const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");

const MODULE_NAME = "UOM";

async function getUOM(pool, uomId) {
  try {
    if (!uomId || isNaN(parseInt(uomId))) {
      throw new CustomError("A valid numeric UOMID is required.");
    }

    const query = `
        SELECT 
            U.*,
            CU.UserName AS CreatedByUserName,
            UU.UserName AS UpdatedByUserName
        FROM UOMs U
        LEFT JOIN Users CU ON U.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON U.UpdatedBy = UU.UserID
        WHERE U.UOMID = @UOMID AND U.IsDeleted = 0
    `;
    const request = pool.request().input("UOMID", sql.Int, uomId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError("No active UOM found with the given ID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching UOM: ${err.message}`);
  }
}

async function getAllUOMs(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "UOMName";
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC";

    const whereClauses = ["U.IsDeleted = 0"];
    let request = pool.request();

    if (values.IsActive !== undefined) {
      whereClauses.push("U.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (searchTerm) {
      whereClauses.push(
        "(U.UOMName LIKE @SearchTerm OR U.UOMCode LIKE @SearchTerm OR U.UOMDescription LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;
    const validSortColumns = ["UOMName", "UOMCode", "CreatedDate"];
    const safeSortBy = validSortColumns.includes(sortBy)
      ? `U.${sortBy}`
      : "U.UOMName";

    const countQuery = `SELECT COUNT(*) as total FROM UOMs U ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = `
        SELECT 
            U.*,
            CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM UOMs U
        LEFT JOIN Users CU ON U.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON U.UpdatedBy = UU.UserID
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
    throw new CustomError(`Error fetching all UOMs: ${err.message}`);
  }
}

async function addUOM(pool, values) {
  try {
    const { UOMCode, UOMName, UOMDescription, IsActive, user_id } = values;

    if (
      !UOMCode ||
      !UOMName ||
      !UOMDescription ||
      IsActive === undefined ||
      !user_id
    ) {
      throw new CustomError(
        "UOM Code, Name, Description, and Active status are required."
      );
    }

    let duplicateCheckQuery = `
        SELECT 
            (SELECT COUNT(*) FROM UOMs WHERE UOMCode = @UOMCode AND IsDeleted = 0) as CodeCount,
            (SELECT COUNT(*) FROM UOMs WHERE UOMName = @UOMName AND IsDeleted = 0) as NameCount
    `;
    let request = pool
      .request()
      .input("UOMCode", sql.NVarChar(50), UOMCode)
      .input("UOMName", sql.NVarChar(100), UOMName);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(`UOM with code '${UOMCode}' already exists.`);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(`UOM with name '${UOMName}' already exists.`);

    const query = `
        DECLARE @OutputTable TABLE (UOMID INT);
        INSERT INTO UOMs (UOMCode, UOMName, UOMDescription, IsActive, CreatedBy, UpdatedBy)
        OUTPUT INSERTED.UOMID INTO @OutputTable
        VALUES (@UOMCode, @UOMName, @UOMDescription, @IsActive, @UserID, @UserID);
        SELECT UOMID FROM @OutputTable;
    `;
    const insertRequest = pool
      .request()
      .input("UOMCode", sql.NVarChar(50), UOMCode)
      .input("UOMName", sql.NVarChar(100), UOMName)
      .input("UOMDescription", sql.NVarChar(500), UOMDescription)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await insertRequest.query(query);
    const newUOMId = result.recordset[0].UOMID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_UOM",
      moduleName: MODULE_NAME,
      referenceID: newUOMId,
      details: { newData: values },
    });

    return getUOM(pool, newUOMId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new UOM: ${err.message}`);
  }
}

async function updateUOM(pool, values) {
  try {
    const { UOMID, ...updateData } = values;
    if (!UOMID) throw new CustomError("UOMID is required for update.");

    const { UOMCode, UOMName, UOMDescription, IsActive, user_id } = updateData;
    const originalUOM = await getUOM(pool, UOMID);

    let duplicateCheckQuery = `
        SELECT 
            (SELECT COUNT(*) FROM UOMs WHERE UOMCode = @UOMCode AND IsDeleted = 0 AND UOMID != @UOMID) as CodeCount,
            (SELECT COUNT(*) FROM UOMs WHERE UOMName = @UOMName AND IsDeleted = 0 AND UOMID != @UOMID) as NameCount
    `;
    let request = pool
      .request()
      .input("UOMCode", sql.NVarChar(50), UOMCode)
      .input("UOMName", sql.NVarChar(100), UOMName)
      .input("UOMID", sql.Int, UOMID);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(`UOM with code '${UOMCode}' already exists.`);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(`UOM with name '${UOMName}' already exists.`);

    const query = `
        UPDATE UOMs SET
            UOMCode = @UOMCode, UOMName = @UOMName, UOMDescription = @UOMDescription,
            IsActive = @IsActive, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE UOMID = @UOMID;
    `;
    const updateRequest = pool
      .request()
      .input("UOMCode", sql.NVarChar(50), UOMCode)
      .input("UOMName", sql.NVarChar(100), UOMName)
      .input("UOMDescription", sql.NVarChar(500), UOMDescription)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id)
      .input("UOMID", sql.Int, UOMID);
    await updateRequest.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_UOM",
      moduleName: MODULE_NAME,
      referenceID: UOMID,
      details: { oldData: originalUOM, newData: updateData },
    });

    return getUOM(pool, UOMID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating UOM: ${err.message}`);
  }
}

async function deleteUOM(pool, values) {
  try {
    const { UOMID, user_id } = values;
    if (!UOMID) throw new CustomError("UOMID is required for deletion.");
    const uomToDelete = await getUOM(pool, UOMID);

    // Dependency Check: A UOM cannot be deleted if it is linked to products.
    /*
    const dependencyCheckRequest = pool.request().input("UOMID", sql.Int, UOMID);
    const dependencyResult = await dependencyCheckRequest.query(
      `SELECT COUNT(*) as productCount FROM Products WHERE BaseUOMID = @UOMID OR SalesUOMID = @UOMID`
    );
    if (dependencyResult.recordset[0].productCount > 0) {
      throw new CustomError("Cannot delete UOM. It is linked to one or more products.");
    }
    */

    const query = `
        UPDATE UOMs SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE UOMID = @UOMID;
    `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("UOMID", sql.Int, UOMID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_UOM",
      moduleName: MODULE_NAME,
      referenceID: UOMID,
      details: { deletedData: uomToDelete },
    });

    return { message: "UOM deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting UOM: ${err.message}`);
  }
}

async function getUOMsLite(pool, values) {
  try {
    const query = `
        SELECT UOMID, UOMName, UOMCode 
        FROM UOMs 
        WHERE IsDeleted = 0 AND IsActive = 1
        ORDER BY UOMName
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching UOMs list: ${err.message}`);
  }
}

module.exports = {
  getUOM,
  getAllUOMs,
  addUOM,
  updateUOM,
  deleteUOM,
  getUOMsLite,
};
