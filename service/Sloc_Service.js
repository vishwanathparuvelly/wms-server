const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");

const MODULE_NAME = "Sloc";

async function getSloc(pool, slocId) {
  try {
    if (!slocId || isNaN(parseInt(slocId))) {
      throw new CustomError("A valid numeric SlocID is required.");
    }

    const query = `
        SELECT S.*, CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM Slocs S
        LEFT JOIN Users CU ON S.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON S.UpdatedBy = UU.UserID
        WHERE S.SlocID = @SlocID AND S.IsDeleted = 0
    `;
    const request = pool.request().input("SlocID", sql.Int, slocId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError("No active SLOC found with the given ID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching SLOC: ${err.message}`);
  }
}

async function getAllSlocs(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "SlocName";
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC";

    const whereClauses = ["S.IsDeleted = 0"];
    let request = pool.request();

    if (values.IsActive !== undefined) {
      whereClauses.push("S.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (searchTerm) {
      whereClauses.push("(S.SlocName LIKE @SearchTerm)");
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;
    const validSortColumns = ["SlocName", "CreatedDate"];
    const safeSortBy = validSortColumns.includes(sortBy)
      ? `S.${sortBy}`
      : "S.SlocName";

    const countQuery = `SELECT COUNT(*) as total FROM Slocs S ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = `
        SELECT S.*, CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM Slocs S
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
    throw new CustomError(`Error fetching all SLOCs: ${err.message}`);
  }
}

async function addSloc(pool, values) {
  try {
    const { SlocName, IsActive, user_id } = values;

    if (!SlocName || IsActive === undefined || !user_id) {
      throw new CustomError("SLOC Name and Active status are required.");
    }

    let duplicateCheckQuery = `SELECT COUNT(*) as NameCount FROM Slocs WHERE SlocName = @Name AND IsDeleted = 0`;
    let request = pool.request().input("Name", sql.NVarChar(100), SlocName);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(`SLOC with name '${SlocName}' already exists.`);

    const query = `
        DECLARE @OutputTable TABLE (SlocID INT);
        INSERT INTO Slocs (SlocName, IsActive, CreatedBy, UpdatedBy)
        OUTPUT INSERTED.SlocID INTO @OutputTable
        VALUES (@Name, @IsActive, @UserID, @UserID);
        SELECT SlocID FROM @OutputTable;
    `;
    const insertRequest = pool
      .request()
      .input("Name", sql.NVarChar(100), SlocName)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await insertRequest.query(query);
    const newId = result.recordset[0].SlocID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_SLOC",
      moduleName: MODULE_NAME,
      referenceID: newId,
      details: { newData: values },
    });

    return getSloc(pool, newId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new SLOC: ${err.message}`);
  }
}

async function updateSloc(pool, values) {
  try {
    const { SlocID, ...updateData } = values;
    if (!SlocID) throw new CustomError("SlocID is required for update.");

    const { SlocName, IsActive, user_id } = updateData;
    const original = await getSloc(pool, SlocID);

    let duplicateCheckQuery = `SELECT COUNT(*) as NameCount FROM Slocs WHERE SlocName = @Name AND IsDeleted = 0 AND SlocID != @ID`;
    let request = pool
      .request()
      .input("Name", sql.NVarChar(100), SlocName)
      .input("ID", sql.Int, SlocID);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(`SLOC with name '${SlocName}' already exists.`);

    const query = `
        UPDATE Slocs SET
            SlocName = @Name, IsActive = @IsActive, 
            UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE SlocID = @ID;
    `;
    const updateRequest = pool
      .request()
      .input("Name", sql.NVarChar(100), SlocName)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, SlocID);
    await updateRequest.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_SLOC",
      moduleName: MODULE_NAME,
      referenceID: SlocID,
      details: { oldData: original, newData: updateData },
    });

    return getSloc(pool, SlocID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating SLOC: ${err.message}`);
  }
}

async function deleteSloc(pool, values) {
  try {
    const { SlocID, user_id } = values;
    if (!SlocID) throw new CustomError("SlocID is required for deletion.");
    const toDelete = await getSloc(pool, SlocID);

    const query = `
        UPDATE Slocs SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE SlocID = @ID;
    `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, SlocID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_SLOC",
      moduleName: MODULE_NAME,
      referenceID: SlocID,
      details: { deletedData: toDelete },
    });
    return { message: "SLOC deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting SLOC: ${err.message}`);
  }
}

async function getSlocsLite(pool) {
  try {
    let query = `
        SELECT SlocID, SlocName 
        FROM Slocs 
        WHERE IsDeleted = 0 AND IsActive = 1
        ORDER BY SlocName
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching SLOCs list: ${err.message}`);
  }
}

module.exports = {
  getSloc,
  getAllSlocs,
  addSloc,
  updateSloc,
  deleteSloc,
  getSlocsLite,
};
