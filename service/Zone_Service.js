const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");
const validationService = require("./Validation_Service");

const MODULE_NAME = "Zone";

async function getZone(pool, zoneId) {
  try {
    if (!zoneId || isNaN(parseInt(zoneId))) {
      throw new CustomError("A valid numeric ZoneID is required.");
    }

    const query = `
            SELECT 
                Z.ZoneID, Z.ZoneName, Z.ZoneCode, Z.CountryID, Z.IsActive, Z.IsDeleted,
                Z.CreatedBy, Z.UpdatedBy, Z.CreatedDate, Z.UpdatedDate,
                C.CountryName,
                CU.UserName AS CreatedByUserName,
                UU.UserName AS UpdatedByUserName
            FROM Zones Z
            LEFT JOIN Countries C ON Z.CountryID = C.CountryID
            LEFT JOIN Users CU ON Z.CreatedBy = CU.UserID
            LEFT JOIN Users UU ON Z.UpdatedBy = UU.UserID
            WHERE Z.ZoneID = @ZoneID AND Z.IsDeleted = 0
        `;

    const request = pool.request();
    request.input("ZoneID", sql.Int, zoneId);

    const result = await request.query(query);
    if (result.recordset.length === 0) {
      throw new CustomError("No active zone found with the given ZoneID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching zone: ${err.message}`);
  }
}

// REPLACE your existing getAllZones function in service/Zone_Service.js

async function getAllZones(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // --- ENHANCEMENT: Added Search and Sort ---
    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "ZoneName"; // Default sort column
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC"; // Default sort order

    const whereClauses = [];
    let request = pool.request();

    whereClauses.push("Z.IsDeleted = 0");
    if (values.IsActive !== undefined) {
      whereClauses.push("Z.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (values.CountryID) {
      whereClauses.push("Z.CountryID = @CountryID");
      request.input("CountryID", sql.Int, values.CountryID);
    }
    // Server-side search logic
    if (searchTerm) {
      whereClauses.push(
        "(Z.ZoneName LIKE @SearchTerm OR Z.ZoneCode LIKE @SearchTerm OR C.CountryName LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;

    // Validate sortBy column to prevent SQL injection
    const validSortColumns = [
      "ZoneName",
      "CountryName",
      "IsActive",
      "CreatedDate",
    ];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : "ZoneName";

    const countQuery = `SELECT COUNT(*) as total FROM Zones Z LEFT JOIN Countries C ON Z.CountryID = C.CountryID ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = `
            SELECT 
                Z.ZoneID, Z.ZoneName, Z.ZoneCode, Z.CountryID, Z.IsActive, Z.CreatedDate,
                C.CountryName,
                CU.UserName AS CreatedByUserName
            FROM Zones Z
            LEFT JOIN Countries C ON Z.CountryID = C.CountryID
            LEFT JOIN Users CU ON Z.CreatedBy = CU.UserID
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
    throw new CustomError(`Error fetching all zones: ${err.message}`);
  }
}

async function addZone(pool, values) {
  try {
    const requiredFields = [
      "ZoneName",
      "ZoneCode",
      "CountryID",
      "IsActive",
      "user_id",
    ];
    const invalidFields = [];
    for (const field of requiredFields) {
      const value = values[field];
      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "")
      ) {
        invalidFields.push(field);
      }
    }
    if (invalidFields.length > 0) {
      if (invalidFields.length === requiredFields.length)
        throw new CustomError("Enter all tags");
      else throw new CustomError(`${invalidFields[0]} is req`);
    }

    const { ZoneName, ZoneCode, CountryID, IsActive, user_id } = values;

    await validationService.validateCountryExists(pool, CountryID);

    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Zones WHERE ZoneName = @ZoneName AND CountryID = @CountryID AND IsDeleted = 0) as NameCount,
                (SELECT COUNT(*) FROM Zones WHERE UPPER(ZoneCode) = @ZoneCode AND CountryID = @CountryID AND IsDeleted = 0) as CodeCount
        `;
    let request = pool
      .request()
      .input("ZoneName", sql.NVarChar(100), ZoneName)
      .input("ZoneCode", sql.NVarChar(10), ZoneCode.toUpperCase())
      .input("CountryID", sql.Int, CountryID);
    const duplicateResult = await request.query(duplicateCheckQuery);

    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Zone with name '${ZoneName}' already exists in this country.`
      );
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(
        `Zone with code '${ZoneCode}' already exists in this country.`
      );

    const query = `
            DECLARE @OutputTable TABLE (ZoneID INT);
            INSERT INTO Zones (ZoneName, ZoneCode, CountryID, IsActive, CreatedBy, UpdatedBy, CreatedDate, UpdatedDate)
            OUTPUT INSERTED.ZoneID INTO @OutputTable
            VALUES (@ZoneName, @ZoneCode, @CountryID, @IsActive, @UserID, @UserID, GETDATE(), GETDATE());
            SELECT ZoneID FROM @OutputTable;
        `;
    request = pool
      .request()
      .input("ZoneName", sql.NVarChar(100), ZoneName)
      .input("ZoneCode", sql.NVarChar(10), ZoneCode)
      .input("CountryID", sql.Int, CountryID)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await request.query(query);
    const newZoneId = result.recordset[0].ZoneID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_ZONE",
      moduleName: MODULE_NAME,
      referenceID: newZoneId,
      details: { newData: values },
    });

    return getZone(pool, newZoneId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new zone: ${err.message}`);
  }
}

async function updateZone(pool, values) {
  try {
    const { ZoneID, ...updateData } = values;
    if (!ZoneID) throw new CustomError("ZoneID is required for update.");

    await validationService.validateCountryExists(pool, updateData.CountryID);
    const originalZone = await getZone(pool, ZoneID);

    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Zones WHERE ZoneName = @ZoneName AND CountryID = @CountryID AND IsDeleted = 0 AND ZoneID != @ZoneID) as NameCount,
                (SELECT COUNT(*) FROM Zones WHERE UPPER(ZoneCode) = @ZoneCode AND CountryID = @CountryID AND IsDeleted = 0 AND ZoneID != @ZoneID) as CodeCount
        `;
    let request = pool
      .request()
      .input("ZoneName", sql.NVarChar(100), updateData.ZoneName)
      .input("ZoneCode", sql.NVarChar(10), updateData.ZoneCode.toUpperCase())
      .input("CountryID", sql.Int, updateData.CountryID)
      .input("ZoneID", sql.Int, ZoneID);
    const duplicateResult = await request.query(duplicateCheckQuery);

    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Zone with name '${updateData.ZoneName}' already exists in this country.`
      );
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(
        `Zone with code '${updateData.ZoneCode}' already exists in this country.`
      );

    const query = `
            UPDATE Zones SET ZoneName = @ZoneName, ZoneCode = @ZoneCode, CountryID = @CountryID, IsActive = @IsActive, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
            WHERE ZoneID = @ZoneID;
        `;
    request = pool
      .request()
      .input("ZoneName", sql.NVarChar(100), updateData.ZoneName)
      .input("ZoneCode", sql.NVarChar(10), updateData.ZoneCode)
      .input("CountryID", sql.Int, updateData.CountryID)
      .input("IsActive", sql.Bit, updateData.IsActive)
      .input("UpdatedBy", sql.Int, values.user_id)
      .input("ZoneID", sql.Int, ZoneID);

    await request.query(query);

    await logService.createLog(pool, {
      userID: values.user_id,
      actionType: "UPDATE_ZONE",
      moduleName: MODULE_NAME,
      referenceID: ZoneID,
      details: { oldData: originalZone, newData: updateData },
    });

    return getZone(pool, ZoneID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating zone: ${err.message}`);
  }
}

async function deleteZone(pool, values) {
  try {
    const { ZoneID, user_id } = values;
    if (!ZoneID) throw new CustomError("ZoneID is required for deletion.");
    const zoneToDelete = await getZone(pool, ZoneID);

    const query = `
            UPDATE Zones SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
            WHERE ZoneID = @ZoneID;
        `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("ZoneID", sql.Int, ZoneID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_ZONE",
      moduleName: MODULE_NAME,
      referenceID: ZoneID,
      details: { deletedData: zoneToDelete },
    });

    return { message: "Zone deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting zone: ${err.message}`);
  }
}
async function getZonesLite(pool, values) {
  try {
    let query = `
            SELECT ZoneID, ZoneName 
            FROM Zones 
            WHERE IsDeleted = 0 AND IsActive = 1
        `;
    const request = pool.request();
    if (values && values.CountryID) {
      query += " AND CountryID = @CountryID";
      request.input("CountryID", sql.Int, values.CountryID);
    }
    query += " ORDER BY ZoneName";
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching zones list: ${err.message}`);
  }
}

module.exports = {
  addZone,
  getZone,
  getAllZones,
  updateZone,
  deleteZone,
  getZonesLite,
};
