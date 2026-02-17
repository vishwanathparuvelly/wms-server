// service/Compartment_Service.js

const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");
const validationService = require("./Validation_Service");

const MODULE_NAME = "Compartment";
/**
 * Fetches a single compartment by its ID.
 */
async function getCompartment(pool, compartmentId) {
  try {
    if (!compartmentId || isNaN(parseInt(compartmentId))) {
      throw new CustomError("A valid numeric CompartmentID is required.");
    }

    const query = `
        SELECT 
            CP.CompartmentID, CP.CompartmentCode, CP.CompartmentName, CP.WarehouseID, W.WarehouseName,
            CP.MaxStockCount, CP.Length, CP.Breadth, CP.Height, 
            -- FIXED: Calculate Volume directly in the query
            (CP.Length * CP.Breadth * CP.Height) AS Volume,
            CP.IsActive, CP.IsDeleted, CP.CreatedBy, CP.UpdatedBy, CP.CreatedDate, CP.UpdatedDate,
            CU.UserName AS CreatedByUserName,
            UU.UserName AS UpdatedByUserName
        FROM Compartments CP
        LEFT JOIN Warehouses W ON CP.WarehouseID = W.WarehouseID
        LEFT JOIN Users CU ON CP.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON CP.UpdatedBy = UU.UserID
        WHERE CP.CompartmentID = @CompartmentID AND CP.IsDeleted = 0
    `;
    const request = pool
      .request()
      .input("CompartmentID", sql.Int, compartmentId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError("No active compartment found with the given ID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching compartment: ${err.message}`);
  }
}

/**
 * Fetches a paginated, searchable, and sortable list of all compartments.
 */
// service/Compartment_Service.js

async function getAllCompartments(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "CompartmentName";
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC";

    const whereClauses = ["CP.IsDeleted = 0"];
    let request = pool.request();

    if (values.IsActive !== undefined) {
      whereClauses.push("CP.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (values.WarehouseID) {
      whereClauses.push("CP.WarehouseID = @WarehouseID");
      request.input("WarehouseID", sql.Int, values.WarehouseID);
    }
    if (searchTerm) {
      whereClauses.push(
        "(CP.CompartmentName LIKE @SearchTerm OR CP.CompartmentCode LIKE @SearchTerm OR W.WarehouseName LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;

    // --- FIXED: Use a map for correct table alias on sort columns ---
    const sortColumnMap = {
      CompartmentName: "CP.CompartmentName",
      CompartmentCode: "CP.CompartmentCode",
      WarehouseName: "W.WarehouseName",
      CreatedDate: "CP.CreatedDate",
      Volume: "(CP.Length * CP.Breadth * CP.Height)",
    };
    const safeSortBy = sortColumnMap[sortBy] || "CP.CompartmentName";
    // --- END FIX ---

    const countQuery = `
        SELECT COUNT(*) as total 
        FROM Compartments CP 
        LEFT JOIN Warehouses W ON CP.WarehouseID = W.WarehouseID
        ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = `
        SELECT 
            CP.CompartmentID, CP.CompartmentCode, CP.CompartmentName, CP.WarehouseID,
            CP.MaxStockCount, CP.Length, CP.Breadth, CP.Height,
            (CP.Length * CP.Breadth * CP.Height) AS Volume,
            CP.IsActive, CP.CreatedDate,
            W.WarehouseName,
            CU.UserName AS CreatedByUserName, 
            UU.UserName AS UpdatedByUserName
        FROM Compartments CP
        LEFT JOIN Warehouses W ON CP.WarehouseID = W.WarehouseID
        LEFT JOIN Users CU ON CP.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON CP.UpdatedBy = UU.UserID
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
    throw new CustomError(`Error fetching all compartments: ${err.message}`);
  }
}

/**
 * Adds a new compartment to the database.
 */
async function addCompartment(pool, values) {
  try {
    const {
      CompartmentCode,
      CompartmentName,
      WarehouseID,
      MaxStockCount,
      Length,
      Breadth,
      Height,
      IsActive,
      user_id,
    } = values;

    if (
      !CompartmentCode ||
      !CompartmentName ||
      !WarehouseID ||
      !MaxStockCount ||
      !Length ||
      !Breadth ||
      !Height ||
      IsActive === undefined ||
      !user_id
    ) {
      throw new CustomError(
        "Required fields are missing. Please provide all necessary compartment details."
      );
    }

    await validationService.validateWarehouseExists(pool, WarehouseID);

    // --- FIXED: More explicit and robust duplicate check ---
    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Compartments WHERE CompartmentCode = @CompartmentCode AND IsDeleted = 0) as CodeCount,
                (SELECT COUNT(*) FROM Compartments WHERE CompartmentName = @CompartmentName AND WarehouseID = @WarehouseID AND IsDeleted = 0) as NameCount
        `;
    let request = pool
      .request()
      .input("CompartmentCode", sql.NVarChar(50), CompartmentCode)
      .input("CompartmentName", sql.NVarChar(100), CompartmentName)
      .input("WarehouseID", sql.Int, WarehouseID);
    // --- END FIX ---

    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(
        `Compartment with code '${CompartmentCode}' already exists.`
      );
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Compartment with name '${CompartmentName}' already exists in this warehouse.`
      );

    const query = `
            DECLARE @OutputTable TABLE (CompartmentID INT);
            INSERT INTO Compartments (CompartmentCode, CompartmentName, WarehouseID, MaxStockCount, Length, Breadth, Height, IsActive, CreatedBy, UpdatedBy)
            OUTPUT INSERTED.CompartmentID INTO @OutputTable
            VALUES (@CompartmentCode, @CompartmentName, @WarehouseID, @MaxStockCount, @Length, @Breadth, @Height, @IsActive, @UserID, @UserID);
            SELECT CompartmentID FROM @OutputTable;
        `;
    const insertRequest = pool
      .request()
      .input("CompartmentCode", sql.NVarChar(50), CompartmentCode)
      .input("CompartmentName", sql.NVarChar(100), CompartmentName)
      .input("WarehouseID", sql.Int, WarehouseID)
      .input("MaxStockCount", sql.Int, MaxStockCount)
      .input("Length", sql.Decimal(10, 2), Length)
      .input("Breadth", sql.Decimal(10, 2), Breadth)
      .input("Height", sql.Decimal(10, 2), Height)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await insertRequest.query(query);
    const newCompartmentId = result.recordset[0].CompartmentID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_COMPARTMENT",
      moduleName: MODULE_NAME,
      referenceID: newCompartmentId,
      details: { newData: values },
    });

    return getCompartment(pool, newCompartmentId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new compartment: ${err.message}`);
  }
}

/**
 * Updates an existing compartment.
 */
async function updateCompartment(pool, values) {
  try {
    const { CompartmentID, ...updateData } = values;
    if (!CompartmentID)
      throw new CustomError("CompartmentID is required for update.");

    const {
      CompartmentCode,
      CompartmentName,
      WarehouseID,
      MaxStockCount,
      Length,
      Breadth,
      Height,
      IsActive,
      user_id,
    } = updateData;

    const originalCompartment = await getCompartment(pool, CompartmentID);
    await validationService.validateWarehouseExists(pool, WarehouseID);

    // --- FIXED: More explicit and robust duplicate check ---
    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Compartments WHERE CompartmentCode = @CompartmentCode AND IsDeleted = 0 AND CompartmentID != @CompartmentID) as CodeCount,
                (SELECT COUNT(*) FROM Compartments WHERE CompartmentName = @CompartmentName AND WarehouseID = @WarehouseID AND IsDeleted = 0 AND CompartmentID != @CompartmentID) as NameCount
        `;
    let request = pool
      .request()
      .input("CompartmentCode", sql.NVarChar(50), CompartmentCode)
      .input("CompartmentName", sql.NVarChar(100), CompartmentName)
      .input("WarehouseID", sql.Int, WarehouseID)
      .input("CompartmentID", sql.Int, CompartmentID);
    // --- END FIX ---

    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(
        `Compartment with code '${CompartmentCode}' already exists.`
      );
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Compartment with name '${CompartmentName}' already exists in this warehouse.`
      );

    const query = `
            UPDATE Compartments SET
                CompartmentCode = @CompartmentCode, CompartmentName = @CompartmentName, WarehouseID = @WarehouseID, 
                MaxStockCount = @MaxStockCount, Length = @Length, Breadth = @Breadth, Height = @Height,
                IsActive = @IsActive, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
            WHERE CompartmentID = @CompartmentID;
        `;
    const updateRequest = pool
      .request()
      .input("CompartmentCode", sql.NVarChar(50), CompartmentCode)
      .input("CompartmentName", sql.NVarChar(100), CompartmentName)
      .input("WarehouseID", sql.Int, WarehouseID)
      .input("MaxStockCount", sql.Int, MaxStockCount)
      .input("Length", sql.Decimal(10, 2), Length)
      .input("Breadth", sql.Decimal(10, 2), Breadth)
      .input("Height", sql.Decimal(10, 2), Height)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id)
      .input("CompartmentID", sql.Int, CompartmentID);
    await updateRequest.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_COMPARTMENT",
      moduleName: MODULE_NAME,
      referenceID: CompartmentID,
      details: { oldData: originalCompartment, newData: updateData },
    });

    return getCompartment(pool, CompartmentID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating compartment: ${err.message}`);
  }
}

/**
 * Soft-deletes a compartment.
 */
async function deleteCompartment(pool, values) {
  try {
    const { CompartmentID, user_id } = values;
    if (!CompartmentID)
      throw new CustomError("CompartmentID is required for deletion.");
    const compartmentToDelete = await getCompartment(pool, CompartmentID);

    // Dependency Check: Ensure compartment is not in use (e.g., has stock).
    // This is a placeholder for a real check against your inventory/stock table.
    /*
    const dependencyCheckRequest = pool.request().input("CompartmentID", sql.Int, CompartmentID);
    const dependencyResult = await dependencyCheckRequest.query(
      `SELECT COUNT(*) as stockCount FROM Inventory WHERE CompartmentID = @CompartmentID AND Quantity > 0`
    );
    if (dependencyResult.recordset[0].stockCount > 0) {
      throw new CustomError("Cannot delete compartment. It contains active stock.");
    }
    */

    const query = `
        UPDATE Compartments SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE CompartmentID = @CompartmentID;
    `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("CompartmentID", sql.Int, CompartmentID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_COMPARTMENT",
      moduleName: MODULE_NAME,
      referenceID: CompartmentID,
      details: { deletedData: compartmentToDelete },
    });

    return { message: "Compartment deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting compartment: ${err.message}`);
  }
}

/**
 * Fetches a simplified list of compartments for dropdowns.
 */
async function getCompartmentsLite(pool, values) {
  try {
    let query = `
        SELECT CompartmentID, CompartmentName 
        FROM Compartments 
        WHERE IsDeleted = 0 AND IsActive = 1
    `;
    const request = pool.request();

    if (values && values.WarehouseID) {
      query += " AND WarehouseID = @WarehouseID";
      request.input("WarehouseID", sql.Int, values.WarehouseID);
    }

    query += " ORDER BY CompartmentName";
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching compartments list: ${err.message}`);
  }
}

module.exports = {
  getCompartment,
  getAllCompartments,
  addCompartment,
  updateCompartment,
  deleteCompartment,
  getCompartmentsLite,
};
