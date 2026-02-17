const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");
const validationService = require("./Validation_Service");

const MODULE_NAME = "City";

async function getCity(pool, cityId) {
  try {
    if (!cityId || isNaN(parseInt(cityId))) {
      throw new CustomError("A valid numeric CityID is required.");
    }

    const query = `
            SELECT 
                CI.CityID, CI.CityName, CI.CityCode, CI.StateID, CI.IsActive, CI.IsDeleted,
                CI.CreatedBy, CI.UpdatedBy, CI.CreatedDate, CI.UpdatedDate,
                S.StateName,
                CO.CountryName, CO.CountryID,
                CU.UserName AS CreatedByUserName,
                UU.UserName AS UpdatedByUserName
            FROM Cities CI
            LEFT JOIN States S ON CI.StateID = S.StateID
            LEFT JOIN Countries CO ON S.CountryID = CO.CountryID
            LEFT JOIN Users CU ON CI.CreatedBy = CU.UserID
            LEFT JOIN Users UU ON CI.UpdatedBy = UU.UserID
            WHERE CI.CityID = @CityID AND CI.IsDeleted = 0
        `;

    const request = pool.request();
    request.input("CityID", sql.Int, cityId);

    const result = await request.query(query);
    if (result.recordset.length === 0) {
      throw new CustomError("No active city found with the given CityID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching city: ${err.message}`);
  }
}

async function getAllCities(pool, values) {
  try {
    let query = `
            SELECT 
                CI.CityID, CI.CityName, CI.CityCode, CI.StateID, CI.IsActive, CI.IsDeleted,
                CI.CreatedBy, CI.UpdatedBy, CI.CreatedDate, CI.UpdatedDate,
                S.StateName,
                CO.CountryName, CO.CountryID,
                CU.UserName AS CreatedByUserName,
                UU.UserName AS UpdatedByUserName
            FROM Cities CI
            LEFT JOIN States S ON CI.StateID = S.StateID
            LEFT JOIN Countries CO ON S.CountryID = CO.CountryID
            LEFT JOIN Users CU ON CI.CreatedBy = CU.UserID
            LEFT JOIN Users UU ON CI.UpdatedBy = UU.UserID
        `;
    const request = pool.request();
    const whereClauses = [];

    if (values.includeDeleted !== true) {
      whereClauses.push("CI.IsDeleted = 0");
    }
    if (values.IsActive !== undefined) {
      whereClauses.push("CI.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (values.StateID) {
      whereClauses.push("CI.StateID = @StateID");
      request.input("StateID", sql.Int, values.StateID);
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    query += " ORDER BY CI.CityName";

    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching all cities: ${err.message}`);
  }
}

async function addCity(pool, values) {
  try {
    const requiredFields = [
      "CityName",
      "CityCode",
      "StateID",
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
      if (invalidFields.length === requiredFields.length) {
        throw new CustomError("Enter all tags");
      } else {
        throw new CustomError(`${invalidFields[0]} is req`);
      }
    }

    const { CityName, CityCode, StateID, IsActive, user_id } = values;

    await validationService.validateStateExists(pool, StateID);

    // --- MODIFICATION START ---
    // Query now checks for both CityName and CityCode duplicates in a single trip.
    // It's case-insensitive for the code.
    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Cities WHERE CityName = @CityName AND StateID = @StateID AND IsDeleted = 0) as NameCount,
                (SELECT COUNT(*) FROM Cities WHERE UPPER(CityCode) = @CityCode AND StateID = @StateID AND IsDeleted = 0) as CodeCount
        `;
    let request = pool
      .request()
      .input("CityName", sql.NVarChar(100), CityName)
      .input("CityCode", sql.NVarChar(10), CityCode.toUpperCase()) // Use uppercase for comparison
      .input("StateID", sql.Int, StateID);
    const duplicateResult = await request.query(duplicateCheckQuery);

    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `City with name '${CityName}' already exists in this state.`
      );
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(
        `City with code '${CityCode}' already exists in this state.`
      );

    const query = `
            DECLARE @OutputTable TABLE (CityID INT);
            INSERT INTO Cities (CityName, CityCode, StateID, IsActive, CreatedBy, UpdatedBy, CreatedDate, UpdatedDate)
            OUTPUT INSERTED.CityID INTO @OutputTable
            VALUES (@CityName, @CityCode, @StateID, @IsActive, @UserID, @UserID, GETDATE(), GETDATE());
            SELECT CityID FROM @OutputTable;
        `;
    request = pool
      .request()
      .input("CityName", sql.NVarChar(100), CityName)
      .input("CityCode", sql.NVarChar(10), CityCode)
      .input("StateID", sql.Int, StateID)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await request.query(query);
    const newCityId = result.recordset[0].CityID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_CITY",
      moduleName: MODULE_NAME,
      referenceID: newCityId,
      details: { newData: values },
    });

    return getCity(pool, newCityId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new city: ${err.message}`);
  }
}

async function updateCity(pool, values) {
  try {
    const { CityID, ...updateData } = values;
    if (!CityID) {
      throw new CustomError("CityID is required for update.");
    }

    await validationService.validateStateExists(pool, updateData.StateID);

    const originalCity = await getCity(pool, CityID);

    // --- MODIFICATION START ---
    // Query now checks for both CityName and CityCode duplicates, excluding the current record.
    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Cities WHERE CityName = @CityName AND StateID = @StateID AND IsDeleted = 0 AND CityID != @CityID) as NameCount,
                (SELECT COUNT(*) FROM Cities WHERE UPPER(CityCode) = @CityCode AND StateID = @StateID AND IsDeleted = 0 AND CityID != @CityID) as CodeCount
        `;
    let request = pool
      .request()
      .input("CityName", sql.NVarChar(100), updateData.CityName)
      .input("CityCode", sql.NVarChar(10), updateData.CityCode.toUpperCase())
      .input("StateID", sql.Int, updateData.StateID)
      .input("CityID", sql.Int, CityID);
    const duplicateResult = await request.query(duplicateCheckQuery);

    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `City with name '${updateData.CityName}' already exists in this state.`
      );
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(
        `City with code '${updateData.CityCode}' already exists in this state.`
      );

    const query = `
            UPDATE Cities
            SET 
                CityName = @CityName,
                CityCode = @CityCode,
                StateID = @StateID,
                IsActive = @IsActive,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE CityID = @CityID;
        `;
    request = pool
      .request()
      .input("CityName", sql.NVarChar(100), updateData.CityName)
      .input("CityCode", sql.NVarChar(10), updateData.CityCode)
      .input("StateID", sql.Int, updateData.StateID)
      .input("IsActive", sql.Bit, updateData.IsActive)
      .input("UpdatedBy", sql.Int, values.user_id)
      .input("CityID", sql.Int, CityID);

    await request.query(query);

    await logService.createLog(pool, {
      userID: values.user_id,
      actionType: "UPDATE_CITY",
      moduleName: MODULE_NAME,
      referenceID: CityID,
      details: { oldData: originalCity, newData: updateData },
    });

    return getCity(pool, CityID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating city: ${err.message}`);
  }
}

async function deleteCity(pool, values) {
  try {
    const { CityID, user_id } = values;
    if (!CityID) {
      throw new CustomError("CityID is required for deletion.");
    }

    const cityToDelete = await getCity(pool, CityID);

    const query = `
            UPDATE Cities
            SET 
                IsDeleted = 1,
                IsActive = 0,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE CityID = @CityID;
        `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("CityID", sql.Int, CityID);

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      throw new CustomError("Failed to delete city or city not found.");
    }

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_CITY",
      moduleName: MODULE_NAME,
      referenceID: CityID,
      details: { deletedData: cityToDelete },
    });

    return { message: "City deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting city: ${err.message}`);
  }
}
async function getCitiesLite(pool, values) {
  try {
    let query = `
            SELECT CityID, CityName 
            FROM Cities 
            WHERE IsDeleted = 0 AND IsActive = 1
        `;
    const request = pool.request();
    if (values && values.StateID) {
      query += " AND StateID = @StateID";
      request.input("StateID", sql.Int, values.StateID);
    }
    query += " ORDER BY CityName";
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching cities list: ${err.message}`);
  }
}

module.exports = {
  addCity,
  getCity,
  getAllCities,
  updateCity,
  deleteCity,
  getCitiesLite,
};
