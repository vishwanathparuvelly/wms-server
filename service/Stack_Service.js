// service/Stack_Service.js

const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");
const validationService = require("./Validation_Service");

const MODULE_NAME = "Stack";

/**
 * Fetches a single stack by its ID.
 */
async function getStack(pool, stackId) {
  try {
    if (!stackId || isNaN(parseInt(stackId))) {
      throw new CustomError("A valid numeric StackID is required.");
    }

    const query = `
        SELECT 
            S.StackID, S.StackCode, S.StackName, S.CompartmentID,
            CP.CompartmentName, W.WarehouseID, W.WarehouseName,
            S.IsActive, S.IsDeleted, S.CreatedBy, S.UpdatedBy, S.CreatedDate, S.UpdatedDate,
            CU.UserName AS CreatedByUserName,
            UU.UserName AS UpdatedByUserName
        FROM Stacks S
        LEFT JOIN Compartments CP ON S.CompartmentID = CP.CompartmentID
        LEFT JOIN Warehouses W ON CP.WarehouseID = W.WarehouseID
        LEFT JOIN Users CU ON S.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON S.UpdatedBy = UU.UserID
        WHERE S.StackID = @StackID AND S.IsDeleted = 0
    `;
    const request = pool.request().input("StackID", sql.Int, stackId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError("No active stack found with the given ID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching stack: ${err.message}`);
  }
}

/**
 * Fetches a paginated, searchable, and sortable list of all stacks.
 */
async function getAllStacks(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "StackName";
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC";

    const whereClauses = ["S.IsDeleted = 0"];
    let request = pool.request();

    if (values.IsActive !== undefined) {
      whereClauses.push("S.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (values.CompartmentID) {
      whereClauses.push("S.CompartmentID = @CompartmentID");
      request.input("CompartmentID", sql.Int, values.CompartmentID);
    }
    if (searchTerm) {
      whereClauses.push(
        "(S.StackName LIKE @SearchTerm OR S.StackCode LIKE @SearchTerm OR CP.CompartmentName LIKE @SearchTerm OR W.WarehouseName LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;

    const sortColumnMap = {
      StackName: "S.StackName",
      StackCode: "S.StackCode",
      CompartmentName: "CP.CompartmentName",
      WarehouseName: "W.WarehouseName",
      CreatedDate: "S.CreatedDate",
    };
    const safeSortBy = sortColumnMap[sortBy] || "S.StackName";

    const countQuery = `
        SELECT COUNT(*) as total 
        FROM Stacks S
        LEFT JOIN Compartments CP ON S.CompartmentID = CP.CompartmentID
        LEFT JOIN Warehouses W ON CP.WarehouseID = W.WarehouseID
        ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = `
        SELECT 
            S.StackID, S.StackCode, S.StackName, S.IsActive, S.CreatedDate,
            S.CompartmentID, -- <<< *** THE FIX IS HERE ***
            CP.CompartmentName,
            W.WarehouseID,
            W.WarehouseName,
            CU.UserName AS CreatedByUserName, 
            UU.UserName AS UpdatedByUserName
        FROM Stacks S
        LEFT JOIN Compartments CP ON S.CompartmentID = CP.CompartmentID
        LEFT JOIN Warehouses W ON CP.WarehouseID = W.WarehouseID
        LEFT JOIN Users CU ON S.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON S.UpdatedBy = UU.UserID
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
    throw new CustomError(`Error fetching all stacks: ${err.message}`);
  }
}

/**
 * Adds a new stack to the database.
 */
async function addStack(pool, values) {
  try {
    const { StackCode, StackName, CompartmentID, IsActive, user_id } = values;

    if (
      !StackCode ||
      !StackName ||
      !CompartmentID ||
      IsActive === undefined ||
      !user_id
    ) {
      throw new CustomError(
        "Required fields are missing. Please provide all necessary stack details."
      );
    }

    await validationService.validateCompartmentExists(pool, CompartmentID);

    let duplicateCheckQuery = `
        SELECT 
            (SELECT COUNT(*) FROM Stacks WHERE StackCode = @StackCode AND IsDeleted = 0) as CodeCount,
            (SELECT COUNT(*) FROM Stacks WHERE StackName = @StackName AND CompartmentID = @CompartmentID AND IsDeleted = 0) as NameCount
    `;
    let request = pool
      .request()
      .input("StackCode", sql.NVarChar(50), StackCode)
      .input("StackName", sql.NVarChar(100), StackName)
      .input("CompartmentID", sql.Int, CompartmentID);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(`Stack with code '${StackCode}' already exists.`);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Stack with name '${StackName}' already exists in this compartment.`
      );

    const query = `
        DECLARE @OutputTable TABLE (StackID INT);
        INSERT INTO Stacks (StackCode, StackName, CompartmentID, IsActive, CreatedBy, UpdatedBy)
        OUTPUT INSERTED.StackID INTO @OutputTable
        VALUES (@StackCode, @StackName, @CompartmentID, @IsActive, @UserID, @UserID);
        SELECT StackID FROM @OutputTable;
    `;
    const insertRequest = pool
      .request()
      .input("StackCode", sql.NVarChar(50), StackCode)
      .input("StackName", sql.NVarChar(100), StackName)
      .input("CompartmentID", sql.Int, CompartmentID)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await insertRequest.query(query);
    const newStackId = result.recordset[0].StackID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_STACK",
      moduleName: MODULE_NAME,
      referenceID: newStackId,
      details: { newData: values },
    });

    return getStack(pool, newStackId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new stack: ${err.message}`);
  }
}

/**
 * Updates an existing stack.
 */
async function updateStack(pool, values) {
  try {
    const { StackID, ...updateData } = values;
    if (!StackID) throw new CustomError("StackID is required for update.");

    const { StackCode, StackName, CompartmentID, IsActive, user_id } =
      updateData;

    const originalStack = await getStack(pool, StackID);
    await validationService.validateCompartmentExists(pool, CompartmentID);

    let duplicateCheckQuery = `
        SELECT 
            (SELECT COUNT(*) FROM Stacks WHERE StackCode = @StackCode AND IsDeleted = 0 AND StackID != @StackID) as CodeCount,
            (SELECT COUNT(*) FROM Stacks WHERE StackName = @StackName AND CompartmentID = @CompartmentID AND IsDeleted = 0 AND StackID != @StackID) as NameCount
    `;
    let request = pool
      .request()
      .input("StackCode", sql.NVarChar(50), StackCode)
      .input("StackName", sql.NVarChar(100), StackName)
      .input("CompartmentID", sql.Int, CompartmentID)
      .input("StackID", sql.Int, StackID);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(`Stack with code '${StackCode}' already exists.`);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Stack with name '${StackName}' already exists in this compartment.`
      );

    const query = `
        UPDATE Stacks SET
            StackCode = @StackCode, StackName = @StackName, CompartmentID = @CompartmentID,
            IsActive = @IsActive, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE StackID = @StackID;
    `;
    const updateRequest = pool
      .request()
      .input("StackCode", sql.NVarChar(50), StackCode)
      .input("StackName", sql.NVarChar(100), StackName)
      .input("CompartmentID", sql.Int, CompartmentID)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id)
      .input("StackID", sql.Int, StackID);
    await updateRequest.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_STACK",
      moduleName: MODULE_NAME,
      referenceID: StackID,
      details: { oldData: originalStack, newData: updateData },
    });

    return getStack(pool, StackID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating stack: ${err.message}`);
  }
}

/**
 * Soft-deletes a stack.
 */
async function deleteStack(pool, values) {
  try {
    const { StackID, user_id } = values;
    if (!StackID) throw new CustomError("StackID is required for deletion.");
    const stackToDelete = await getStack(pool, StackID);

    const query = `
        UPDATE Stacks SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE StackID = @StackID;
    `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("StackID", sql.Int, StackID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_STACK",
      moduleName: MODULE_NAME,
      referenceID: StackID,
      details: { deletedData: stackToDelete },
    });

    return { message: "Stack deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting stack: ${err.message}`);
  }
}

/**
 * Fetches a simplified list of stacks for dropdowns.
 */
async function getStacksLite(pool, values) {
  try {
    let query = `
        SELECT StackID, StackName 
        FROM Stacks 
        WHERE IsDeleted = 0 AND IsActive = 1
    `;
    const request = pool.request();

    if (values && values.CompartmentID) {
      query += " AND CompartmentID = @CompartmentID";
      request.input("CompartmentID", sql.Int, values.CompartmentID);
    }

    query += " ORDER BY StackName";
    const result = await request.query(query);
    return { data: result.recordset };
  } catch (err) {
    throw new CustomError(`Error fetching stacks list: ${err.message}`);
  }
}

module.exports = {
  getStack,
  getAllStacks,
  addStack,
  updateStack,
  deleteStack,
  getStacksLite,
};
