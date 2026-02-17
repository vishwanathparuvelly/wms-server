const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");

const MODULE_NAME = "LaborProvider";

async function getLaborProvider(pool, providerId) {
  try {
    if (!providerId || isNaN(parseInt(providerId))) {
      throw new CustomError("A valid numeric ProviderID is required.");
    }
    const query = `
            SELECT LP.*, U.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
            FROM LaborProviders LP
            LEFT JOIN Users U ON LP.CreatedBy = U.UserID
            LEFT JOIN Users UU ON LP.UpdatedBy = UU.UserID
            WHERE LP.ProviderID = @ProviderID AND LP.IsDeleted = 0
        `;
    const request = pool.request().input("ProviderID", sql.Int, providerId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError(
        "No active Labor Provider found with the given ID."
      );
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching Labor Provider: ${err.message}`);
  }
}

async function getAllLaborProviders(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    let request = pool.request();

    // === FIX FOR SORTING AND SEARCHING ===
    const sortBy = values.sortBy || "ProviderName"; // Default sort column
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC"; // Default sort order

    // Whitelist for safe dynamic sorting
    const validSortColumns = [
      "ProviderName",
      "ProviderCode",
      "IsActive",
      "CreatedDate",
    ];
    const safeSortBy = validSortColumns.includes(sortBy)
      ? sortBy
      : "ProviderName";

    const whereClauses = ["IsDeleted = 0"];

    // Active status filter
    if (values.IsActive !== undefined) {
      whereClauses.push("IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }

    // Search term filter
    const searchTerm = values.search || null;
    if (searchTerm) {
      whereClauses.push(
        "(ProviderName LIKE @SearchTerm OR ProviderCode LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }
    // === END FIX ===

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;
    const countQuery = `SELECT COUNT(*) as total FROM LaborProviders ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;

    const query = `
            SELECT ProviderID, ProviderName, ProviderCode, IsActive, CreatedDate
            FROM LaborProviders
            ${whereClause}
            ORDER BY ${safeSortBy} ${sortOrder} /* <-- Dynamic Sort Applied */
            OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
        `;

    const result = await request.query(query);

    return {
      data: result.recordset,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        pageSize,
      },
    };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching all Labor Providers: ${err.message}`);
  }
}

async function getLaborProvidersLite(pool) {
  try {
    const query = `SELECT ProviderID, ProviderName FROM LaborProviders WHERE IsDeleted = 0 AND IsActive = 1 ORDER BY ProviderName`;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(
      `Error fetching Labor Providers list: ${err.message}`
    );
  }
}

async function addLaborProvider(pool, values) {
  try {
    const { ProviderName, ProviderCode, IsActive, user_id } = values;
    if (!ProviderName || !ProviderCode || IsActive === undefined || !user_id) {
      throw new CustomError(
        "ProviderName, ProviderCode, IsActive status, and user_id are required."
      );
    }
    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM LaborProviders WHERE ProviderName = @ProviderName AND IsDeleted = 0) as NameCount,
                (SELECT COUNT(*) FROM LaborProviders WHERE ProviderCode = @ProviderCode AND IsDeleted = 0) as CodeCount
        `;
    let request = pool
      .request()
      .input("ProviderName", sql.NVarChar(100), ProviderName)
      .input("ProviderCode", sql.NVarChar(50), ProviderCode);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Provider with name '${ProviderName}' already exists.`
      );
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(
        `Provider with code '${ProviderCode}' already exists.`
      );

    const query = `
            DECLARE @OutputTable TABLE (ProviderID INT);
            INSERT INTO LaborProviders (ProviderName, ProviderCode, IsActive, CreatedBy, UpdatedBy, CreatedDate, UpdatedDate)
            OUTPUT INSERTED.ProviderID INTO @OutputTable
            VALUES (@ProviderName, @ProviderCode, @IsActive, @UserID, @UserID, GETDATE(), GETDATE());
            SELECT ProviderID FROM @OutputTable;
        `;
    request = pool
      .request()
      .input("ProviderName", sql.NVarChar(100), ProviderName)
      .input("ProviderCode", sql.NVarChar(50), ProviderCode)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await request.query(query);
    const newProviderId = result.recordset[0].ProviderID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_LABOR_PROVIDER",
      moduleName: MODULE_NAME,
      referenceID: newProviderId,
      details: { newData: values },
    });
    return getLaborProvider(pool, newProviderId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new Labor Provider: ${err.message}`);
  }
}

async function updateLaborProvider(pool, values) {
  try {
    const { ProviderID, ProviderName, ProviderCode, IsActive, user_id } =
      values;
    if (!ProviderID)
      throw new CustomError("ProviderID is required for update.");
    const originalProvider = await getLaborProvider(pool, ProviderID);

    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM LaborProviders WHERE ProviderName = @ProviderName AND IsDeleted = 0 AND ProviderID != @ProviderID) as NameCount,
                (SELECT COUNT(*) FROM LaborProviders WHERE ProviderCode = @ProviderCode AND IsDeleted = 0 AND ProviderID != @ProviderID) as CodeCount
        `;
    let request = pool
      .request()
      .input("ProviderName", sql.NVarChar(100), ProviderName)
      .input("ProviderCode", sql.NVarChar(50), ProviderCode)
      .input("ProviderID", sql.Int, ProviderID);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Provider with name '${ProviderName}' already exists.`
      );
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(
        `Provider with code '${ProviderCode}' already exists.`
      );

    const query = `
            UPDATE LaborProviders SET 
                ProviderName = @ProviderName, ProviderCode = @ProviderCode, IsActive = @IsActive, 
                UpdatedBy = @UserID, UpdatedDate = GETDATE() 
            WHERE ProviderID = @ProviderID;
        `;
    request = pool
      .request()
      .input("ProviderID", sql.Int, ProviderID)
      .input("ProviderName", sql.NVarChar(100), ProviderName)
      .input("ProviderCode", sql.NVarChar(50), ProviderCode)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    await request.query(query);
    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_LABOR_PROVIDER",
      moduleName: MODULE_NAME,
      referenceID: ProviderID,
      details: { oldData: originalProvider, newData: values },
    });
    return getLaborProvider(pool, ProviderID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating Labor Provider: ${err.message}`);
  }
}

async function deleteLaborProvider(pool, values) {
  try {
    const { ProviderID, user_id } = values;
    if (!ProviderID)
      throw new CustomError("ProviderID is required for deletion.");

    const depCheck = await pool
      .request()
      .input("ProviderID", sql.Int, ProviderID)
      .query(
        "SELECT COUNT(*) as count FROM Employees WHERE ProviderID = @ProviderID AND IsDeleted = 0"
      );
    if (depCheck.recordset[0].count > 0) {
      throw new CustomError(
        "Cannot delete this provider as it is currently linked to one or more active employees."
      );
    }

    const providerToDelete = await getLaborProvider(pool, ProviderID);
    const query = `UPDATE LaborProviders SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UserID, UpdatedDate = GETDATE() WHERE ProviderID = @ProviderID;`;
    await pool
      .request()
      .input("UserID", sql.Int, user_id)
      .input("ProviderID", sql.Int, ProviderID)
      .query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_LABOR_PROVIDER",
      moduleName: MODULE_NAME,
      referenceID: ProviderID,
      details: { deletedData: providerToDelete },
    });
    return { message: "Labor Provider deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting Labor Provider: ${err.message}`);
  }
}

module.exports = {
  addLaborProvider,
  getLaborProvider,
  getAllLaborProviders,
  updateLaborProvider,
  deleteLaborProvider,
  getLaborProvidersLite,
};
