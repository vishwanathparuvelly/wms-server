const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");

const MODULE_NAME = "Skill";

async function getSkill(pool, skillId) {
  try {
    if (!skillId || isNaN(parseInt(skillId)))
      throw new CustomError("A valid numeric SkillID is required.");
    const query = `
            SELECT S.*, U.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
            FROM Skills S
            LEFT JOIN Users U ON S.CreatedBy = U.UserID
            LEFT JOIN Users UU ON S.UpdatedBy = UU.UserID
            WHERE S.SkillID = @SkillID AND S.IsDeleted = 0
        `;
    const result = await pool
      .request()
      .input("SkillID", sql.Int, skillId)
      .query(query);
    if (result.recordset.length === 0)
      throw new CustomError("No active Skill found with the given ID.");
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching Skill: ${err.message}`);
  }
}

// File: Skill_Service.js

// ... (existing imports)

async function getAllSkills(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    let request = pool.request();

    // === START FIX: Extract and Validate Sort Parameters ===
    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "SkillName"; // Default sort column
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC"; // Default sort order

    // Whitelist of valid columns for sorting
    const validSortColumns = [
      "SkillName",
      "SkillDescription",
      "IsActive",
      "CreatedDate",
    ];
    // Ensure sortBy is safe for SQL injection
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : "SkillName";
    // === END FIX ===

    const whereClauses = ["IsDeleted = 0"];
    if (values.IsActive !== undefined) {
      whereClauses.push("IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    // Add search term to where clauses
    if (searchTerm) {
      whereClauses.push(
        "(SkillName LIKE @SearchTerm OR SkillDescription LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;
    const countQuery = `SELECT COUNT(*) as total FROM Skills ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;

    const query = `
            SELECT SkillID, SkillName, SkillDescription, IsActive, CreatedDate
            FROM Skills
            ${whereClause}
            ORDER BY ${safeSortBy} ${sortOrder}  /* <--- FIX APPLIED HERE */
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
    throw new CustomError(`Error fetching all Skills: ${err.message}`);
  }
}

// ... (rest of the file)

async function getSkillsLite(pool) {
  try {
    const query = `SELECT SkillID, SkillName FROM Skills WHERE IsDeleted = 0 AND IsActive = 1 ORDER BY SkillName`;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching Skills list: ${err.message}`);
  }
}

async function addSkill(pool, values) {
  try {
    const { SkillName, SkillDescription, IsActive, user_id } = values;
    if (!SkillName || IsActive === undefined || !user_id)
      throw new CustomError(
        "SkillName, IsActive status, and user_id are required."
      );

    let duplicateCheck = await pool
      .request()
      .input("SkillName", sql.NVarChar(100), SkillName)
      .query(
        `SELECT 1 FROM Skills WHERE SkillName = @SkillName AND IsDeleted = 0`
      );
    if (duplicateCheck.recordset.length > 0)
      throw new CustomError(`Skill with name '${SkillName}' already exists.`);

    const query = `
            DECLARE @OutputTable TABLE (SkillID INT);
            INSERT INTO Skills (SkillName, SkillDescription, IsActive, CreatedBy, UpdatedBy, CreatedDate, UpdatedDate)
            OUTPUT INSERTED.SkillID INTO @OutputTable
            VALUES (@SkillName, @SkillDescription, @IsActive, @UserID, @UserID, GETDATE(), GETDATE());
            SELECT SkillID FROM @OutputTable;
        `;
    const request = pool
      .request()
      .input("SkillName", sql.NVarChar(100), SkillName)
      .input("SkillDescription", sql.NVarChar(255), SkillDescription)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await request.query(query);
    const newSkillId = result.recordset[0].SkillID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_SKILL",
      moduleName: MODULE_NAME,
      referenceID: newSkillId,
      details: { newData: values },
    });
    return getSkill(pool, newSkillId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new Skill: ${err.message}`);
  }
}

async function updateSkill(pool, values) {
  try {
    const { SkillID, SkillName, SkillDescription, IsActive, user_id } = values;
    if (!SkillID) throw new CustomError("SkillID is required for update.");
    const originalSkill = await getSkill(pool, SkillID);

    let duplicateCheck = await pool
      .request()
      .input("SkillName", sql.NVarChar(100), SkillName)
      .input("SkillID", sql.Int, SkillID)
      .query(
        `SELECT 1 FROM Skills WHERE SkillName = @SkillName AND IsDeleted = 0 AND SkillID != @SkillID`
      );
    if (duplicateCheck.recordset.length > 0)
      throw new CustomError(`Skill with name '${SkillName}' already exists.`);

    const query = `
            UPDATE Skills SET 
                SkillName = @SkillName, SkillDescription = @SkillDescription, IsActive = @IsActive, 
                UpdatedBy = @UserID, UpdatedDate = GETDATE() 
            WHERE SkillID = @SkillID;
        `;
    const request = pool
      .request()
      .input("SkillID", sql.Int, SkillID)
      .input("SkillName", sql.NVarChar(100), SkillName)
      .input("SkillDescription", sql.NVarChar(255), SkillDescription)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    await request.query(query);
    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_SKILL",
      moduleName: MODULE_NAME,
      referenceID: SkillID,
      details: { oldData: originalSkill, newData: values },
    });
    return getSkill(pool, SkillID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating Skill: ${err.message}`);
  }
}

async function deleteSkill(pool, values) {
  try {
    const { SkillID, user_id } = values;
    if (!SkillID) throw new CustomError("SkillID is required for deletion.");

    const depCheck = await pool
      .request()
      .input("SkillID", sql.Int, SkillID)
      .query(
        "SELECT COUNT(*) as count FROM EmployeeSkills WHERE SkillID = @SkillID"
      );
    if (depCheck.recordset[0].count > 0) {
      throw new CustomError(
        "Cannot delete this skill as it is currently assigned to one or more employees."
      );
    }

    const skillToDelete = await getSkill(pool, SkillID);
    const query = `UPDATE Skills SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UserID, UpdatedDate = GETDATE() WHERE SkillID = @SkillID;`;
    await pool
      .request()
      .input("UserID", sql.Int, user_id)
      .input("SkillID", sql.Int, SkillID)
      .query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_SKILL",
      moduleName: MODULE_NAME,
      referenceID: SkillID,
      details: { deletedData: skillToDelete },
    });
    return { message: "Skill deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting Skill: ${err.message}`);
  }
}

module.exports = {
  addSkill,
  getSkill,
  getAllSkills,
  updateSkill,
  deleteSkill,
  getSkillsLite,
};
