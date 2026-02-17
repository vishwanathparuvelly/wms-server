const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");
const validationService = require("./Validation_Service");

const MODULE_NAME = "State"; // <-- THIS LINE WAS MISSING

async function addState(pool, values) {
  try {
    const requiredFields = [
      "StateName",
      "StateCode",
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
      if (invalidFields.length === requiredFields.length) {
        throw new CustomError("Enter all tags");
      } else {
        throw new CustomError(`${invalidFields[0]} is req`);
      }
    }

    const { StateName, StateCode, TinNumber, CountryID, IsActive, user_id } =
      values;

    await validationService.validateCountryExists(pool, CountryID);

    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM States WHERE StateName = @StateName AND CountryID = @CountryID AND IsDeleted = 0) as NameCount,
                (SELECT COUNT(*) FROM States WHERE StateCode = @StateCode AND CountryID = @CountryID AND IsDeleted = 0) as CodeCount
        `;
    let request = pool
      .request()
      .input("StateName", sql.NVarChar(100), StateName)
      .input("StateCode", sql.NVarChar(10), StateCode)
      .input("CountryID", sql.Int, CountryID);
    const duplicateResult = await request.query(duplicateCheckQuery);

    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `State with name '${StateName}' already exists in this country.`
      );
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(
        `State with code '${StateCode}' already exists in this country.`
      );

    // --- DEFINITIVE FIX ---
    // Explicitly insert GETDATE() for CreatedDate and UpdatedDate.
    const query = `
            DECLARE @OutputTable TABLE (StateID INT);
            INSERT INTO States (StateName, StateCode, TinNumber, CountryID, IsActive, CreatedBy, UpdatedBy, CreatedDate, UpdatedDate)
            OUTPUT INSERTED.StateID INTO @OutputTable
            VALUES (@StateName, @StateCode, @TinNumber, @CountryID, @IsActive, @UserID, @UserID, GETDATE(), GETDATE());
            SELECT StateID FROM @OutputTable;
        `;
    request = pool
      .request()
      .input("StateName", sql.NVarChar(100), StateName)
      .input("StateCode", sql.NVarChar(10), StateCode)
      .input("TinNumber", sql.NVarChar(50), TinNumber)
      .input("CountryID", sql.Int, CountryID)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await request.query(query);
    const newStateId = result.recordset[0].StateID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_STATE",
      moduleName: MODULE_NAME,
      referenceID: newStateId,
      details: { newData: values },
    });

    return getState(pool, newStateId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new state: ${err.message}`);
  }
}

async function getState(pool, stateId) {
  try {
    if (!stateId || isNaN(parseInt(stateId))) {
      throw new CustomError("A valid numeric StateID is required.");
    }
    const query = `
            SELECT 
                S.StateID, S.StateName, S.StateCode, S.TinNumber, S.CountryID, S.IsActive, S.IsDeleted,
                S.CreatedBy, S.UpdatedBy, S.CreatedDate, S.UpdatedDate,
                C.CountryName,
                CU.UserName AS CreatedByUserName,
                UU.UserName AS UpdatedByUserName
            FROM States S
            LEFT JOIN Countries C ON S.CountryID = C.CountryID
            LEFT JOIN Users CU ON S.CreatedBy = CU.UserID
            LEFT JOIN Users UU ON S.UpdatedBy = UU.UserID
            WHERE S.StateID = @StateID AND S.IsDeleted = 0
        `;
    const request = pool.request();
    request.input("StateID", sql.Int, stateId);
    const result = await request.query(query);
    if (result.recordset.length === 0) {
      throw new CustomError("No active state found with the given StateID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching state: ${err.message}`);
  }
}
async function getAllStates(pool, values) {
  try {
    let query = `
            SELECT 
                S.StateID, S.StateName, S.StateCode, S.TinNumber, S.CountryID, S.IsActive, S.IsDeleted,
                S.CreatedBy, S.UpdatedBy, S.CreatedDate, S.UpdatedDate,
                C.CountryName,
                CU.UserName AS CreatedByUserName,
                UU.UserName AS UpdatedByUserName
            FROM States S
            LEFT JOIN Countries C ON S.CountryID = C.CountryID
            LEFT JOIN Users CU ON S.CreatedBy = CU.UserID
            LEFT JOIN Users UU ON S.UpdatedBy = UU.UserID
        `;
    const request = pool.request();
    const whereClauses = [];
    if (values.includeDeleted !== true) {
      whereClauses.push("S.IsDeleted = 0");
    }
    if (values.IsActive !== undefined) {
      whereClauses.push("S.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (values.CountryID) {
      whereClauses.push("S.CountryID = @CountryID");
      request.input("CountryID", sql.Int, values.CountryID);
    }
    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }
    query += " ORDER BY S.StateName";
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching all states: ${err.message}`);
  }
}

async function updateState(pool, values) {
  try {
    const { StateID, ...updateData } = values;
    if (!StateID) {
      throw new CustomError("StateID is required for update.");
    }

    await validationService.validateCountryExists(pool, updateData.CountryID);

    const originalState = await getState(pool, StateID);

    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM States WHERE StateName = @StateName AND CountryID = @CountryID AND IsDeleted = 0 AND StateID != @StateID) as NameCount,
                (SELECT COUNT(*) FROM States WHERE StateCode = @StateCode AND CountryID = @CountryID AND IsDeleted = 0 AND StateID != @StateID) as CodeCount
        `;
    let request = pool
      .request()
      .input("StateName", sql.NVarChar(100), updateData.StateName)
      .input("StateCode", sql.NVarChar(10), updateData.StateCode)
      .input("CountryID", sql.Int, updateData.CountryID)
      .input("StateID", sql.Int, StateID);
    const duplicateResult = await request.query(duplicateCheckQuery);

    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `State with name '${updateData.StateName}' already exists in this country.`
      );
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(
        `State with code '${updateData.StateCode}' already exists in this country.`
      );

    const query = `
            UPDATE States
            SET 
                StateName = @StateName,
                StateCode = @StateCode,
                TinNumber = @TinNumber,
                CountryID = @CountryID,
                IsActive = @IsActive,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE StateID = @StateID;
        `;
    request = pool
      .request()
      .input("StateName", sql.NVarChar(100), updateData.StateName)
      .input("StateCode", sql.NVarChar(10), updateData.StateCode)
      .input("TinNumber", sql.NVarChar(50), updateData.TinNumber)
      .input("CountryID", sql.Int, updateData.CountryID)
      .input("IsActive", sql.Bit, updateData.IsActive)
      .input("UpdatedBy", sql.Int, values.user_id)
      .input("StateID", sql.Int, StateID);

    await request.query(query);

    await logService.createLog(pool, {
      userID: values.user_id,
      actionType: "UPDATE_STATE",
      moduleName: MODULE_NAME,
      referenceID: StateID,
      details: { oldData: originalState, newData: updateData },
    });

    return getState(pool, StateID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating state: ${err.message}`);
  }
}

async function deleteState(pool, values) {
  try {
    const { StateID, user_id } = values;
    if (!StateID) {
      throw new CustomError("StateID is required for deletion.");
    }

    const stateToDelete = await getState(pool, StateID);

    const query = `
            UPDATE States
            SET 
                IsDeleted = 1,
                IsActive = 0,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE StateID = @StateID;
        `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("StateID", sql.Int, StateID);

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      throw new CustomError("Failed to delete state or state not found.");
    }

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_STATE",
      moduleName: MODULE_NAME,
      referenceID: StateID,
      details: { deletedData: stateToDelete },
    });

    return { message: "State deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting state: ${err.message}`);
  }
}
async function getStatesLite(pool, values) {
  try {
    let query = `
            SELECT StateID, StateName 
            FROM States 
            WHERE IsDeleted = 0 AND IsActive = 1
        `;
    const request = pool.request();
    if (values && values.CountryID) {
      query += " AND CountryID = @CountryID";
      request.input("CountryID", sql.Int, values.CountryID);
    }
    query += " ORDER BY StateName";
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching states list: ${err.message}`);
  }
}

module.exports = {
  addState,
  getState,
  getAllStates,
  updateState,
  deleteState,
  getStatesLite,
};
