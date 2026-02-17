const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");
const validationService = require("./Validation_Service");

const MODULE_NAME = "Line";

async function getLine(pool, lineId) {
  try {
    if (!lineId || isNaN(parseInt(lineId))) {
      throw new CustomError("A valid numeric LineID is required.");
    }

    const query = `
        SELECT 
            L.*, W.WarehouseName,
            CU.UserName AS CreatedByUserName,
            UU.UserName AS UpdatedByUserName
        FROM Lines L
        LEFT JOIN Warehouses W ON L.WarehouseID = W.WarehouseID
        LEFT JOIN Users CU ON L.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON L.UpdatedBy = UU.UserID
        WHERE L.LineID = @LineID AND L.IsDeleted = 0
    `;
    const request = pool.request().input("LineID", sql.Int, lineId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError("No active line found with the given ID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching line: ${err.message}`);
  }
}

// service/Line_Service.js

async function getAllLines(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "LineName";
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC";

    const whereClauses = ["L.IsDeleted = 0"];
    let request = pool.request();

    if (values.IsActive !== undefined) {
      whereClauses.push("L.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (values.WarehouseID) {
      whereClauses.push("L.WarehouseID = @WarehouseID");
      request.input("WarehouseID", sql.Int, values.WarehouseID);
    }
    if (searchTerm) {
      whereClauses.push(
        "(L.LineName LIKE @SearchTerm OR L.LineNumber LIKE @SearchTerm OR W.WarehouseName LIKE @SearchTerm OR L.LineType LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;

    // --- FIXED: Use a map for correct table alias on sort columns ---
    const sortColumnMap = {
      LineName: "L.LineName",
      LineNumber: "L.LineNumber",
      LineType: "L.LineType",
      WarehouseName: "W.WarehouseName", // Correctly points to the Warehouses table
      CreatedDate: "L.CreatedDate",
    };
    const safeSortBy = sortColumnMap[sortBy] || "L.LineName";
    // --- END FIX ---

    const countQuery = `
        SELECT COUNT(*) as total FROM Lines L 
        LEFT JOIN Warehouses W ON L.WarehouseID = W.WarehouseID 
        ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = `
        SELECT 
            L.*, W.WarehouseName,
            CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM Lines L
        LEFT JOIN Warehouses W ON L.WarehouseID = W.WarehouseID
        LEFT JOIN Users CU ON L.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON L.UpdatedBy = UU.UserID
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
    throw new CustomError(`Error fetching all lines: ${err.message}`);
  }
}

async function addLine(pool, values) {
  try {
    const { LineNumber, LineName, LineType, WarehouseID, IsActive, user_id } =
      values;

    if (!LineNumber || !LineName || IsActive === undefined || !user_id) {
      throw new CustomError(
        "Line Number, Line Name, and Active status are required."
      );
    }
    if (WarehouseID) {
      await validationService.validateWarehouseExists(pool, WarehouseID);
    }

    let duplicateCheckQuery = `
        SELECT 
            (SELECT COUNT(*) FROM Lines WHERE LineNumber = @LineNumber AND IsDeleted = 0) as NumberCount,
            (SELECT COUNT(*) FROM Lines WHERE LineName = @LineName AND (WarehouseID = @WarehouseID OR (@WarehouseID IS NULL AND WarehouseID IS NULL)) AND IsDeleted = 0) as NameCount
    `;
    let request = pool
      .request()
      .input("LineNumber", sql.NVarChar(50), LineNumber)
      .input("LineName", sql.NVarChar(100), LineName)
      .input("WarehouseID", sql.Int, WarehouseID);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].NumberCount > 0)
      throw new CustomError(`Line with number '${LineNumber}' already exists.`);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Line with name '${LineName}' already exists for the specified warehouse.`
      );

    const query = `
        DECLARE @OutputTable TABLE (LineID INT);
        INSERT INTO Lines (LineNumber, LineName, LineType, WarehouseID, IsActive, CreatedBy, UpdatedBy)
        OUTPUT INSERTED.LineID INTO @OutputTable
        VALUES (@LineNumber, @LineName, @LineType, @WarehouseID, @IsActive, @UserID, @UserID);
        SELECT LineID FROM @OutputTable;
    `;
    const insertRequest = pool
      .request()
      .input("LineNumber", sql.NVarChar(50), LineNumber)
      .input("LineName", sql.NVarChar(100), LineName)
      .input("LineType", sql.NVarChar(50), LineType)
      .input("WarehouseID", sql.Int, WarehouseID)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await insertRequest.query(query);
    const newLineId = result.recordset[0].LineID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_LINE",
      moduleName: MODULE_NAME,
      referenceID: newLineId,
      details: { newData: values },
    });

    return getLine(pool, newLineId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new line: ${err.message}`);
  }
}

async function updateLine(pool, values) {
  try {
    const { LineID, ...updateData } = values;
    if (!LineID) throw new CustomError("LineID is required for update.");

    const { LineNumber, LineName, LineType, WarehouseID, IsActive, user_id } =
      updateData;
    const originalLine = await getLine(pool, LineID);
    if (WarehouseID) {
      await validationService.validateWarehouseExists(pool, WarehouseID);
    }

    let duplicateCheckQuery = `
        SELECT 
            (SELECT COUNT(*) FROM Lines WHERE LineNumber = @LineNumber AND IsDeleted = 0 AND LineID != @LineID) as NumberCount,
            (SELECT COUNT(*) FROM Lines WHERE LineName = @LineName AND (WarehouseID = @WarehouseID OR (@WarehouseID IS NULL AND WarehouseID IS NULL)) AND IsDeleted = 0 AND LineID != @LineID) as NameCount
    `;
    let request = pool
      .request()
      .input("LineNumber", sql.NVarChar(50), LineNumber)
      .input("LineName", sql.NVarChar(100), LineName)
      .input("WarehouseID", sql.Int, WarehouseID)
      .input("LineID", sql.Int, LineID);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].NumberCount > 0)
      throw new CustomError(`Line with number '${LineNumber}' already exists.`);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Line with name '${LineName}' already exists for the specified warehouse.`
      );

    const query = `
        UPDATE Lines SET
            LineNumber = @LineNumber, LineName = @LineName, LineType = @LineType, WarehouseID = @WarehouseID,
            IsActive = @IsActive, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE LineID = @LineID;
    `;
    const updateRequest = pool
      .request()
      .input("LineNumber", sql.NVarChar(50), LineNumber)
      .input("LineName", sql.NVarChar(100), LineName)
      .input("LineType", sql.NVarChar(50), LineType)
      .input("WarehouseID", sql.Int, WarehouseID)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id)
      .input("LineID", sql.Int, LineID);
    await updateRequest.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_LINE",
      moduleName: MODULE_NAME,
      referenceID: LineID,
      details: { oldData: originalLine, newData: updateData },
    });

    return getLine(pool, LineID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating line: ${err.message}`);
  }
}

async function deleteLine(pool, values) {
  try {
    const { LineID, user_id } = values;
    if (!LineID) throw new CustomError("LineID is required for deletion.");
    const lineToDelete = await getLine(pool, LineID);

    const query = `
            UPDATE Lines SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
            WHERE LineID = @LineID;
        `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("LineID", sql.Int, LineID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_LINE",
      moduleName: MODULE_NAME,
      referenceID: LineID,
      details: { deletedData: lineToDelete },
    });

    return { message: "Line deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting line: ${err.message}`);
  }
}

async function getLinesLite(pool, values) {
  try {
    let query = `
            SELECT LineID, LineName, LineNumber 
            FROM Lines 
            WHERE IsDeleted = 0 AND IsActive = 1
        `;
    const request = pool.request();

    if (values && values.WarehouseID) {
      query += " AND WarehouseID = @WarehouseID";
      request.input("WarehouseID", sql.Int, values.WarehouseID);
    }

    query += " ORDER BY LineName";
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching lines list: ${err.message}`);
  }
}

async function getLineTypes(pool) {
  try {
    const lineTypes = ["Production", "Packing", "QA", "Other"];
    return lineTypes;
  } catch (err) {
    throw new CustomError(`Error fetching line types: ${err.message}`);
  }
}

module.exports = {
  getLine,
  getAllLines,
  addLine,
  updateLine,
  deleteLine,
  getLinesLite,
  getLineTypes,
};
