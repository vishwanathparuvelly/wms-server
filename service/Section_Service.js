const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");
const MODULE_NAME = "Section";

async function addSection(pool, values) {
  try {
    if (
      !values.SectionCode ||
      !values.SectionName ||
      values.SectionCode.trim() === "" ||
      values.SectionName.trim() === ""
    ) {
      throw new CustomError("SectionCode and SectionName are required.");
    }

    const duplicateCheckQuery = `
      SELECT COUNT(*) as CodeCount FROM Sections 
      WHERE SectionCode = @SectionCode AND IsDeleted = 0
    `;
    const dupResult = await pool
      .request()
      .input("SectionCode", sql.VarChar(50), values.SectionCode)
      .query(duplicateCheckQuery);

    if (dupResult.recordset[0].CodeCount > 0) {
      throw new CustomError(
        `Section with code '${values.SectionCode}' already exists.`,
      );
    }

    const insertQuery = `
      INSERT INTO Sections (SectionCode, SectionName, Description, IsActive, IsDeleted, CreatedBy, UpdatedBy)
      VALUES (@SectionCode, @SectionName, @Description, @IsActive, 0, @CreatedBy, @UpdatedBy)
      SELECT CAST(SCOPE_IDENTITY() as int) as SectionID
    `;

    const result = await pool
      .request()
      .input("SectionCode", sql.VarChar(50), values.SectionCode)
      .input("SectionName", sql.VarChar(100), values.SectionName)
      .input("Description", sql.VarChar(500), values.Description || null)
      .input("IsActive", sql.Bit, values.IsActive !== false ? 1 : 0)
      .input("CreatedBy", sql.Int, values.user_id)
      .input("UpdatedBy", sql.Int, values.user_id)
      .query(insertQuery);

    const sectionId = result.recordset[0].SectionID;
    const section = await getSection(pool, sectionId);

    await logService.createLog(
      pool,
      "CREATE_SECTION",
      MODULE_NAME,
      sectionId,
      values.user_id,
    );
    return section;
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError("Catch Exception in addSection: " + err.message);
  }
}

async function getSection(pool, sectionId) {
  try {
    const query = `
      SELECT * FROM Sections WHERE SectionID = @SectionID AND IsDeleted = 0
    `;
    const result = await pool
      .request()
      .input("SectionID", sql.Int, sectionId)
      .query(query);

    if (result.recordset.length === 0) {
      throw new CustomError("No section found with the given ID");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError("Catch Exception in getSection: " + err.message);
  }
}

async function getAllSections(pool, values) {
  try {
    let query = `SELECT * FROM Sections WHERE IsDeleted = 0`;
    let request = pool.request();

    if (values.search) {
      query += ` AND (SectionCode LIKE @search OR SectionName LIKE @search)`;
      request.input("search", sql.VarChar(100), `%${values.search}%`);
    }

    if (values.IsActive !== undefined) {
      query += ` AND IsActive = @IsActive`;
      request.input("IsActive", sql.Bit, values.IsActive ? 1 : 0);
    }

    const pageSize = values.pageSize || 10;
    const page = values.page || 1;
    const offset = (page - 1) * pageSize;

    const countQuery = query.replace(
      /SELECT \*/,
      "SELECT COUNT(*) as totalCount",
    );
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].totalCount;

    query += ` ORDER BY SectionID DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;
    request
      .input("offset", sql.Int, offset)
      .input("pageSize", sql.Int, pageSize);

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
    throw new CustomError("Catch Exception in getAllSections: " + err.message);
  }
}

async function updateSection(pool, values) {
  try {
    if (!values.SectionID) {
      throw new CustomError("SectionID is required");
    }

    const section = await getSection(pool, values.SectionID);

    const updateQuery = `
      UPDATE Sections 
      SET SectionCode = @SectionCode, 
          SectionName = @SectionName, 
          Description = @Description,
          IsActive = @IsActive,
          UpdatedBy = @UpdatedBy,
          UpdatedDate = GETDATE()
      WHERE SectionID = @SectionID
    `;

    await pool
      .request()
      .input("SectionID", sql.Int, values.SectionID)
      .input(
        "SectionCode",
        sql.VarChar(50),
        values.SectionCode || section.SectionCode,
      )
      .input(
        "SectionName",
        sql.VarChar(100),
        values.SectionName || section.SectionName,
      )
      .input(
        "Description",
        sql.VarChar(500),
        values.Description || section.Description,
      )
      .input(
        "IsActive",
        sql.Bit,
        values.IsActive !== undefined
          ? values.IsActive
            ? 1
            : 0
          : section.IsActive,
      )
      .input("UpdatedBy", sql.Int, values.user_id)
      .query(updateQuery);

    await logService.createLog(
      pool,
      "UPDATE_SECTION",
      MODULE_NAME,
      values.SectionID,
      values.user_id,
    );
    return await getSection(pool, values.SectionID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError("Catch Exception in updateSection: " + err.message);
  }
}

async function deleteSection(pool, values) {
  try {
    if (!values.SectionID) {
      throw new CustomError("SectionID is required");
    }

    const section = await getSection(pool, values.SectionID);

    const deleteQuery = `
      UPDATE Sections SET IsDeleted = 1, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
      WHERE SectionID = @SectionID
    `;

    await pool
      .request()
      .input("SectionID", sql.Int, values.SectionID)
      .input("UpdatedBy", sql.Int, values.user_id)
      .query(deleteQuery);

    await logService.createLog(
      pool,
      "DELETE_SECTION",
      MODULE_NAME,
      values.SectionID,
      values.user_id,
    );
    return { message: "Section deleted successfully" };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError("Catch Exception in deleteSection: " + err.message);
  }
}

async function getSectionsLite(pool, values) {
  try {
    const query = `
      SELECT SectionID, SectionName FROM Sections 
      WHERE IsDeleted = 0 AND IsActive = 1
      ORDER BY SectionName
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError("Catch Exception in getSectionsLite: " + err.message);
  }
}

module.exports.addSection = addSection;
module.exports.getSection = getSection;
module.exports.getAllSections = getAllSections;
module.exports.updateSection = updateSection;
module.exports.deleteSection = deleteSection;
module.exports.getSectionsLite = getSectionsLite;
