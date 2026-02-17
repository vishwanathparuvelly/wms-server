const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");

const MODULE_NAME = "Country";

async function addCountry(pool, values) {
  try {
    const requiredFields = [
      "CountryName",
      "CountryCode",
      "CountryISDCode",
      "CountryCurrency",
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

    const {
      CountryName,
      CountryCode,
      CountryISDCode,
      CountryCurrency,
      IsActive,
      user_id,
    } = values;

    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Countries WHERE CountryName = @CountryName AND IsDeleted = 0) as NameCount,
                (SELECT COUNT(*) FROM Countries WHERE CountryCode = @CountryCode AND IsDeleted = 0) as CodeCount,
                (SELECT COUNT(*) FROM Countries WHERE CountryISDCode = @CountryISDCode AND IsDeleted = 0) as ISDCodeCount
        `;
    let request = pool
      .request()
      .input("CountryName", sql.NVarChar(100), CountryName)
      .input("CountryCode", sql.NVarChar(10), CountryCode)
      .input("CountryISDCode", sql.NVarChar(10), CountryISDCode);
    const duplicateResult = await request.query(duplicateCheckQuery);

    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Country with name '${CountryName}' already exists.`
      );
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(
        `Country with code '${CountryCode}' already exists.`
      );
    if (duplicateResult.recordset[0].ISDCodeCount > 0)
      throw new CustomError(
        `Country with ISD code '${CountryISDCode}' already exists.`
      );

    // --- DEFINITIVE FIX ---
    // Explicitly insert GETDATE() for CreatedDate and UpdatedDate.
    const query = `
            DECLARE @OutputTable TABLE (CountryID INT);
            INSERT INTO Countries (CountryName, CountryCode, CountryISDCode, CountryCurrency, IsActive, CreatedBy, UpdatedBy, CreatedDate, UpdatedDate)
            OUTPUT INSERTED.CountryID INTO @OutputTable
            VALUES (@CountryName, @CountryCode, @CountryISDCode, @CountryCurrency, @IsActive, @UserID, @UserID, GETDATE(), GETDATE());
            SELECT CountryID FROM @OutputTable;
        `;
    request = pool
      .request()
      .input("CountryName", sql.NVarChar(100), CountryName)
      .input("CountryCode", sql.NVarChar(10), CountryCode)
      .input("CountryISDCode", sql.NVarChar(10), CountryISDCode)
      .input("CountryCurrency", sql.NVarChar(50), CountryCurrency)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await request.query(query);
    const newCountryId = result.recordset[0].CountryID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_COUNTRY",
      moduleName: MODULE_NAME,
      referenceID: newCountryId,
      details: { newData: values },
    });

    return getCountry(pool, newCountryId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new country: ${err.message}`);
  }
}

async function getCountry(pool, countryId) {
  try {
    if (!countryId || isNaN(parseInt(countryId))) {
      throw new CustomError("A valid numeric CountryID is required.");
    }
    const query = `
            SELECT 
                C.CountryID, C.CountryName, C.CountryCode, C.CountryISDCode, C.CountryCurrency,
                C.IsActive, C.IsDeleted, C.CreatedBy, C.UpdatedBy, C.CreatedDate, C.UpdatedDate,
                CU.UserName AS CreatedByUserName,
                UU.UserName AS UpdatedByUserName
            FROM Countries C
            LEFT JOIN Users CU ON C.CreatedBy = CU.UserID
            LEFT JOIN Users UU ON C.UpdatedBy = UU.UserID
            WHERE C.CountryID = @CountryID AND C.IsDeleted = 0
        `;
    const request = pool.request();
    request.input("CountryID", sql.Int, countryId);
    const result = await request.query(query);
    if (result.recordset.length === 0) {
      throw new CustomError(
        "No active country found with the given CountryID."
      );
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching country: ${err.message}`);
  }
}
async function getAllCountries(pool, values) {
  try {
    let query = `
            SELECT 
                C.CountryID, C.CountryName, C.CountryCode, C.CountryISDCode, C.CountryCurrency,
                C.IsActive, C.IsDeleted, C.CreatedBy, C.UpdatedBy, C.CreatedDate, C.UpdatedDate,
                CU.UserName AS CreatedByUserName,
                UU.UserName AS UpdatedByUserName
            FROM Countries C
            LEFT JOIN Users CU ON C.CreatedBy = CU.UserID
            LEFT JOIN Users UU ON C.UpdatedBy = UU.UserID
        `;
    const request = pool.request();
    const whereClauses = [];
    if (values.includeDeleted !== true) {
      whereClauses.push("C.IsDeleted = 0");
    }
    if (values.IsActive !== undefined) {
      whereClauses.push("C.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }
    query += " ORDER BY C.CountryName";
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching all countries: ${err.message}`);
  }
}

async function updateCountry(pool, values) {
  try {
    const { CountryID, ...updateData } = values;
    if (!CountryID) {
      throw new CustomError("CountryID is required for update.");
    }

    const originalCountry = await getCountry(pool, CountryID);

    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Countries WHERE CountryName = @CountryName AND IsDeleted = 0 AND CountryID != @CountryID) as NameCount,
                (SELECT COUNT(*) FROM Countries WHERE CountryCode = @CountryCode AND IsDeleted = 0 AND CountryID != @CountryID) as CodeCount,
                (SELECT COUNT(*) FROM Countries WHERE CountryISDCode = @CountryISDCode AND IsDeleted = 0 AND CountryID != @CountryID) as ISDCodeCount
        `;
    let request = pool
      .request()
      .input("CountryName", sql.NVarChar(100), updateData.CountryName)
      .input("CountryCode", sql.NVarChar(10), updateData.CountryCode)
      .input("CountryISDCode", sql.NVarChar(10), updateData.CountryISDCode)
      .input("CountryID", sql.Int, CountryID);
    const duplicateResult = await request.query(duplicateCheckQuery);

    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Country with name '${updateData.CountryName}' already exists.`
      );
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(
        `Country with code '${updateData.CountryCode}' already exists.`
      );
    if (duplicateResult.recordset[0].ISDCodeCount > 0)
      throw new CustomError(
        `Country with ISD code '${updateData.ISDCode}' already exists.`
      );

    const query = `
            UPDATE Countries
            SET 
                CountryName = @CountryName,
                CountryCode = @CountryCode,
                CountryISDCode = @CountryISDCode,
                CountryCurrency = @CountryCurrency,
                IsActive = @IsActive,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE CountryID = @CountryID;
        `;
    request = pool
      .request()
      .input("CountryName", sql.NVarChar(100), updateData.CountryName)
      .input("CountryCode", sql.NVarChar(10), updateData.CountryCode)
      .input("CountryISDCode", sql.NVarChar(10), updateData.CountryISDCode)
      .input("CountryCurrency", sql.NVarChar(50), updateData.CountryCurrency)
      .input("IsActive", sql.Bit, updateData.IsActive)
      .input("UpdatedBy", sql.Int, values.user_id)
      .input("CountryID", sql.Int, CountryID);

    await request.query(query);

    await logService.createLog(pool, {
      userID: values.user_id,
      actionType: "UPDATE_COUNTRY",
      moduleName: MODULE_NAME,
      referenceID: CountryID,
      details: { oldData: originalCountry, newData: updateData },
    });

    return getCountry(pool, CountryID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating country: ${err.message}`);
  }
}

async function deleteCountry(pool, values) {
  try {
    const { CountryID, user_id } = values;
    if (!CountryID) {
      throw new CustomError("CountryID is required for deletion.");
    }

    const countryToDelete = await getCountry(pool, CountryID);

    const query = `
            UPDATE Countries
            SET 
                IsDeleted = 1,
                IsActive = 0,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE CountryID = @CountryID;
        `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("CountryID", sql.Int, CountryID);

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      throw new CustomError("Failed to delete country or country not found.");
    }

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_COUNTRY",
      moduleName: MODULE_NAME,
      referenceID: CountryID,
      details: { deletedData: countryToDelete },
    });

    return { message: "Country deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting country: ${err.message}`);
  }
}
// Add this new function to Country_Service.js
async function getCountriesLite(pool) {
  try {
    const query = `
            SELECT CountryID, CountryName 
            FROM Countries 
            WHERE IsDeleted = 0 AND IsActive = 1 
            ORDER BY CountryName
        `;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching countries list: ${err.message}`);
  }
}

module.exports = {
  addCountry,
  getCountry,
  getAllCountries,
  updateCountry,
  deleteCountry,
  getCountriesLite,
};
