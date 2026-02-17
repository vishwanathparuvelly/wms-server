const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");
const validationService = require("./Validation_Service"); // Assuming Validation_Service.js exists

const MODULE_NAME = "Customer"; //

/**
 * Retrieves a single active customer by ID with all related information.
 */
async function getCustomer(pool, customerId) {
  //
  try {
    if (!customerId || isNaN(parseInt(customerId))) {
      //
      throw new CustomError("A valid numeric CustomerID is required."); //
    }

    // FIX: Replaced template literal backticks with regular quotes or
    // escaped any unintended backticks (though none were apparent here).
    const query = `
            SELECT 
                CU.CustomerID, CU.CustomerCode, CU.CustomerName, CU.CustomerTypeID, CU.BusinessSize, CU.Description,
                CU.CustomerContactNumber, CU.EmailAddress, CU.StreetAddress1, CU.StreetAddress2,
                CU.CityID, CI.CityName, CU.StateID, S.StateName, CU.ZoneID, Z.ZoneName, CU.CountryID, CO.CountryName,
                CU.WarehouseID, W.WarehouseName, CU.GSTIN,
                CU.IsActive, CU.IsDeleted, CU.CreatedBy, CU.UpdatedBy, CU.CreatedDate, CU.UpdatedDate,
                CT.CustomerTypeName,
                CrU.UserName AS CreatedByUserName,
                UpU.UserName AS UpdatedByUserName
            FROM Customers CU
            LEFT JOIN CustomerTypes CT ON CU.CustomerTypeID = CT.CustomerTypeID
            LEFT JOIN Countries CO ON CU.CountryID = CO.CountryID
            LEFT JOIN States S ON CU.StateID = S.StateID
            LEFT JOIN Cities CI ON CU.CityID = CI.CityID
            LEFT JOIN Zones Z ON CU.ZoneID = Z.ZoneID
            LEFT JOIN Warehouses W ON CU.WarehouseID = W.WarehouseID
            LEFT JOIN Users CrU ON CU.CreatedBy = CrU.UserID
            LEFT JOIN Users UpU ON CU.UpdatedBy = UpU.UserID
            WHERE CU.CustomerID = @CustomerID AND CU.IsDeleted = 0
        `;
    const request = pool.request().input("CustomerID", sql.Int, customerId); //
    const result = await request.query(query); //

    if (result.recordset.length === 0) {
      //
      throw new CustomError(
        "No active customer found with the given CustomerID."
      ); //
    }
    return result.recordset[0]; //
  } catch (err) {
    if (err instanceof CustomError) throw err;
    // FIX: Ensure error message uses template literal correctly (as it did before)
    throw new CustomError(`Error fetching customer: ${err.message}`); //
  }
}

/**
 * Retrieves a paginated and searchable list of all customers.
 */
async function getAllCustomers(pool, values) {
  //
  try {
    const page = parseInt(values.page) || 1; //
    const pageSize = parseInt(values.pageSize) || 10; //
    const offset = (page - 1) * pageSize; //

    const searchTerm = values.search || null; //
    const sortBy = values.sortBy || "CustomerName"; //
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC"; //

    const whereClauses = []; //
    let request = pool.request(); //

    whereClauses.push("CU.IsDeleted = 0"); //
    if (values.IsActive !== undefined) {
      //
      whereClauses.push("CU.IsActive = @IsActive"); //
      request.input("IsActive", sql.Bit, values.IsActive); //
    }
    if (values.CustomerTypeID) {
      //
      whereClauses.push("CU.CustomerTypeID = @CustomerTypeID"); //
      request.input("CustomerTypeID", sql.Int, values.CustomerTypeID); //
    }

    // Server-side search logic: Code, Name, Email, or Contact Number
    if (searchTerm) {
      //
      whereClauses.push(
        "(CU.CustomerName LIKE @SearchTerm OR CU.CustomerCode LIKE @SearchTerm OR CU.EmailAddress LIKE @SearchTerm OR CU.CustomerContactNumber LIKE @SearchTerm)" //
      );
      // FIX: Ensure template literal is outside the input value
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`); //
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`; //

    const validSortColumns = [
      "CustomerName",
      "CustomerCode",
      "EmailAddress",
      "IsActive",
      "CreatedDate",
    ]; //
    const safeSortBy = validSortColumns.includes(sortBy)
      ? `CU.${sortBy}`
      : "CU.CustomerName"; //

    const countQuery = `
        SELECT COUNT(*) as total 
        FROM Customers CU 
        ${whereClause}`; //
    const countResult = await request.query(countQuery); //
    const totalItems = countResult.recordset[0].total; //
    const totalPages = Math.ceil(totalItems / pageSize); //

    const query = `
            SELECT 
                CU.*,
                CT.CustomerTypeName, CO.CountryName, S.StateName, CI.CityName, Z.ZoneName, W.WarehouseName,
                CrU.UserName AS CreatedByUserName, UpU.UserName AS UpdatedByUserName
            FROM Customers CU
            LEFT JOIN CustomerTypes CT ON CU.CustomerTypeID = CT.CustomerTypeID
            LEFT JOIN Countries CO ON CU.CountryID = CO.CountryID
            LEFT JOIN States S ON CU.StateID = S.StateID
            LEFT JOIN Cities CI ON CU.CityID = CI.CityID
            LEFT JOIN Zones Z ON CU.ZoneID = Z.ZoneID
            LEFT JOIN Warehouses W ON CU.WarehouseID = W.WarehouseID
            LEFT JOIN Users CrU ON CU.CreatedBy = CrU.UserID
            LEFT JOIN Users UpU ON CU.UpdatedBy = UpU.UserID
            ${whereClause}
            ORDER BY ${safeSortBy} ${sortOrder}
            OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
        `; //

    const result = await request.query(query); //

    return {
      data: result.recordset,
      pagination: { totalItems, totalPages, currentPage: page, pageSize }, //
    };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    // FIX: Ensure error message uses template literal correctly (as it did before)
    throw new CustomError(`Error fetching all customers: ${err.message}`); //
  }
}

/**
 * Adds a new customer after performing all necessary validations.
 */
async function addCustomer(pool, values) {
  //
  try {
    // --- Validation: Required Fields Check (Matches the screen fields) ---
    const requiredFields = [
      "CustomerCode",
      "CustomerName",
      "CustomerTypeID",
      "StreetAddress1",
      "CountryID",
      "StateID",
      "CityID",
      "CustomerContactNumber",
      "EmailAddress",
      "IsActive",
      "user_id",
    ]; //
    const invalidFields = []; //
    for (const field of requiredFields) {
      //
      const value = values[field]; //
      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "")
      ) {
        //
        // BusinessSize and Description are optional, but others are not.
        // We handle validation for optional fields later if they are provided.
        if (field === "BusinessSize" || field === "Description") continue; //
        invalidFields.push(field); //
      }
    }

    if (invalidFields.length > 0) {
      //
      if (invalidFields.length === requiredFields.length)
        throw new CustomError("Enter all required fields"); //
      else throw new CustomError(`${invalidFields[0]} is required`); //
    }

    const {
      CustomerCode,
      CustomerName,
      CustomerTypeID,
      BusinessSize,
      Description,
      CustomerContactNumber,
      EmailAddress,
      StreetAddress1,
      StreetAddress2,
      CityID,
      StateID,
      ZoneID,
      CountryID,
      WarehouseID,
      GSTIN,
      IsActive,
      user_id,
    } = values; //

    // --- Validation: Location Hierarchy & FKs ---
    // FIX: Corrected the function name from validationService.validateBranchLocationHierarchy (used in Branch_Service.js)
    // to the more generic and appropriate validationService.validateLocationHierarchy
    // (Assuming this function is available in Validation_Service.js)
    await validationService.validateLocationHierarchy(pool, {
      countryId: CountryID,
      stateId: StateID,
      cityId: CityID,
    }); //
    // Validate optional FKs
    // FIX: Assuming these validation functions are available in Validation_Service.js
    // Call all necessary validators
    await validationService.validateLocationHierarchy(pool, {
      countryId: CountryID,
      stateId: StateID,
      cityId: CityID,
    });
    await validationService.validateCustomerTypeExists(pool, CustomerTypeID);
    if (ZoneID) await validationService.validateZoneExists(pool, ZoneID);
    if (WarehouseID)
      await validationService.validateWarehouseExists(pool, WarehouseID);

    // --- Validation: Duplicate Check ---
    // FIX: Replaced template literal backticks with regular quotes inside the query string
    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Customers WHERE CustomerCode = @CustomerCode AND IsDeleted = 0) as CodeCount,
                (SELECT COUNT(*) FROM Customers WHERE CustomerName = @CustomerName AND IsDeleted = 0) as NameCount,
                (SELECT COUNT(*) FROM Customers WHERE EmailAddress = @EmailAddress AND IsDeleted = 0) as EmailCount
        `; //
    let request = pool
      .request()
      .input("CustomerCode", sql.NVarChar(50), CustomerCode)
      .input("CustomerName", sql.NVarChar(100), CustomerName)
      .input("EmailAddress", sql.NVarChar(100), EmailAddress); //

    const duplicateResult = await request.query(duplicateCheckQuery); //

    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(
        `Customer with code '${CustomerCode}' already exists.`
      ); //
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Customer with name '${CustomerName}' already exists.`
      ); //
    if (duplicateResult.recordset[0].EmailCount > 0)
      throw new CustomError(
        `Customer with email '${EmailAddress}' already exists.`
      ); //

    // --- INSERT Operation ---
    const insertRequest = pool.request(); //
    // FIX: Replaced template literal backticks with regular quotes inside the query string
    const query = `
            DECLARE @OutputTable TABLE (CustomerID INT);
            INSERT INTO Customers (CustomerCode, CustomerName, CustomerTypeID, BusinessSize, Description, CustomerContactNumber, EmailAddress, StreetAddress1, StreetAddress2, CityID, StateID, ZoneID, CountryID, WarehouseID, GSTIN, IsActive, CreatedBy, UpdatedBy, CreatedDate, UpdatedDate)
            OUTPUT INSERTED.CustomerID INTO @OutputTable
            VALUES (@CustomerCode, @CustomerName, @CustomerTypeID, @BusinessSize, @Description, @CustomerContactNumber, @EmailAddress, @StreetAddress1, @StreetAddress2, @CityID, @StateID, @ZoneID, @CountryID, @WarehouseID, @GSTIN, @IsActive, @UserID, @UserID, GETDATE(), GETDATE());
            SELECT CustomerID FROM @OutputTable;
        `;

    insertRequest
      .input("CustomerCode", sql.NVarChar(50), CustomerCode) //
      .input("CustomerName", sql.NVarChar(100), CustomerName) //
      .input("CustomerTypeID", sql.Int, CustomerTypeID) //
      .input("BusinessSize", sql.NVarChar(100), BusinessSize || null) //
      .input("Description", sql.NVarChar(500), Description || null) //
      .input("CustomerContactNumber", sql.NVarChar(50), CustomerContactNumber) //
      .input("EmailAddress", sql.NVarChar(100), EmailAddress) //
      .input("StreetAddress1", sql.NVarChar(255), StreetAddress1) //
      .input("StreetAddress2", sql.NVarChar(255), StreetAddress2 || null) //
      .input("CityID", sql.Int, CityID) //
      .input("StateID", sql.Int, StateID) //
      .input("ZoneID", sql.Int, ZoneID || null) //
      .input("CountryID", sql.Int, CountryID) //
      .input("WarehouseID", sql.Int, WarehouseID || null) //
      .input("GSTIN", sql.NVarChar(15), GSTIN || null) //
      .input("IsActive", sql.Bit, IsActive) //
      .input("UserID", sql.Int, user_id); //

    const result = await insertRequest.query(query); //
    const newCustomerId = result.recordset[0].CustomerID; //

    // --- Logging ---
    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_CUSTOMER",
      moduleName: MODULE_NAME,
      referenceID: newCustomerId,
      details: { newData: values },
    }); //

    return getCustomer(pool, newCustomerId); //
  } catch (err) {
    if (err instanceof CustomError) throw err;
    // FIX: Ensure error message uses template literal correctly (as it did before)
    throw new CustomError(`Error adding new customer: ${err.message}`); //
  }
}

/**
 * Updates an existing customer.
 */
async function updateCustomer(pool, values) {
  //
  try {
    const { CustomerID, ...updateData } = values; //
    if (!CustomerID)
      throw new CustomError("CustomerID is required for update."); //

    const {
      CustomerCode,
      CustomerName,
      CustomerTypeID,
      StreetAddress1,
      CityID,
      StateID,
      CountryID,
      EmailAddress,
      ZoneID,
      WarehouseID,
    } = updateData; //

    // Retrieve original customer data for logging and existence check
    const originalCustomer = await getCustomer(pool, CustomerID); //

    // --- Validation: Location Hierarchy & FKs ---
    // FIX: Corrected the function name
    await validationService.validateLocationHierarchy(pool, {
      countryId: CountryID,
      stateId: StateID,
      cityId: CityID,
    }); //
    if (ZoneID) await validationService.validateZoneExists(pool, ZoneID); //
    if (WarehouseID)
      await validationService.validateWarehouseExists(pool, WarehouseID); //
    if (CustomerTypeID)
      await validationService.validateCustomerTypeExists(pool, CustomerTypeID); //

    // --- Validation: Duplicate Check (excluding current ID) ---
    // FIX: Replaced template literal backticks with regular quotes inside the query string
    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Customers WHERE CustomerCode = @CustomerCode AND IsDeleted = 0 AND CustomerID != @CustomerID) as CodeCount,
                (SELECT COUNT(*) FROM Customers WHERE CustomerName = @CustomerName AND IsDeleted = 0 AND CustomerID != @CustomerID) as NameCount,
                (SELECT COUNT(*) FROM Customers WHERE EmailAddress = @EmailAddress AND IsDeleted = 0 AND CustomerID != @CustomerID) as EmailCount
        `; //
    let request = pool
      .request()
      .input("CustomerCode", sql.NVarChar(50), CustomerCode)
      .input("CustomerName", sql.NVarChar(100), CustomerName)
      .input("EmailAddress", sql.NVarChar(100), EmailAddress)
      .input("CustomerID", sql.Int, CustomerID); //

    const duplicateResult = await request.query(duplicateCheckQuery); //

    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(
        `Customer with code '${CustomerCode}' already exists.`
      ); //
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Customer with name '${CustomerName}' already exists.`
      ); //
    if (duplicateResult.recordset[0].EmailCount > 0)
      throw new CustomError(
        `Customer with email '${EmailAddress}' already exists.`
      ); //

    // --- UPDATE Operation ---
    const updateRequest = pool.request(); //
    // FIX: Replaced template literal backticks with regular quotes inside the query string
    const query = `
            UPDATE Customers SET
                CustomerCode = @CustomerCode, CustomerName = @CustomerName, CustomerTypeID = @CustomerTypeID,
                BusinessSize = @BusinessSize, Description = @Description, CustomerContactNumber = @CustomerContactNumber,
                EmailAddress = @EmailAddress, StreetAddress1 = @StreetAddress1, StreetAddress2 = @StreetAddress2, 
                CityID = @CityID, StateID = @StateID, ZoneID = @ZoneID, CountryID = @CountryID, 
                WarehouseID = @WarehouseID, GSTIN = @GSTIN, IsActive = @IsActive, 
                UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
            WHERE CustomerID = @CustomerID;
        `; //
    updateRequest
      .input("CustomerCode", sql.NVarChar(50), CustomerCode) //
      .input("CustomerName", sql.NVarChar(100), CustomerName) //
      .input("CustomerTypeID", sql.Int, CustomerTypeID) //
      .input("BusinessSize", sql.NVarChar(100), updateData.BusinessSize || null) //
      .input("Description", sql.NVarChar(500), updateData.Description || null) //
      .input(
        "CustomerContactNumber",
        sql.NVarChar(50),
        updateData.CustomerContactNumber
      ) //
      .input("EmailAddress", sql.NVarChar(100), EmailAddress) //
      .input("StreetAddress1", sql.NVarChar(255), StreetAddress1) //
      .input(
        "StreetAddress2",
        sql.NVarChar(255),
        updateData.StreetAddress2 || null
      ) //
      .input("CityID", sql.Int, CityID) //
      .input("StateID", sql.Int, StateID) //
      .input("ZoneID", sql.Int, ZoneID || null) //
      .input("CountryID", sql.Int, CountryID) //
      .input("WarehouseID", sql.Int, WarehouseID || null) //
      .input("GSTIN", sql.NVarChar(15), updateData.GSTIN || null) //
      .input("IsActive", sql.Bit, updateData.IsActive) //
      .input("UpdatedBy", sql.Int, values.user_id) //
      .input("CustomerID", sql.Int, CustomerID); //

    await updateRequest.query(query); //

    // --- Logging ---
    await logService.createLog(pool, {
      userID: values.user_id,
      actionType: "UPDATE_CUSTOMER",
      moduleName: MODULE_NAME,
      referenceID: CustomerID,
      details: { oldData: originalCustomer, newData: updateData },
    }); //

    return getCustomer(pool, CustomerID); //
  } catch (err) {
    if (err instanceof CustomError) throw err;
    // FIX: Ensure error message uses template literal correctly (as it did before)
    throw new CustomError(`Error updating customer: ${err.message}`); //
  }
}

/**
 * Marks a customer as deleted (soft delete).
 */
async function deleteCustomer(pool, values) {
  //
  try {
    const { CustomerID, user_id } = values; //
    if (!CustomerID)
      throw new CustomError("CustomerID is required for deletion."); //

    // Existence check and retrieve data for logging
    const customerToDelete = await getCustomer(pool, CustomerID); //

    // FIX: Replaced template literal backticks with regular quotes inside the query string
    const query = `
            UPDATE Customers 
            SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
            WHERE CustomerID = @CustomerID;
        `; //
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id) //
      .input("CustomerID", sql.Int, CustomerID); //

    await request.query(query); //

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_CUSTOMER",
      moduleName: MODULE_NAME,
      referenceID: CustomerID,
      details: { deletedData: customerToDelete },
    }); //

    return { message: "Customer deleted successfully." }; //
  } catch (err) {
    if (err instanceof CustomError) throw err;
    // FIX: Ensure error message uses template literal correctly (as it did before)
    throw new CustomError(`Error deleting customer: ${err.message}`); //
  }
}

/**
 * Retrieves a list of active customers for dropdown/lite use.
 */
async function getCustomersLite(pool, values) {
  //
  try {
    // FIX: Replaced template literal backticks with regular quotes inside the query string
    let query = `
            SELECT CustomerID, CustomerName, CustomerCode
            FROM Customers 
            WHERE IsDeleted = 0 AND IsActive = 1
        `; //
    const request = pool.request(); //

    // Optional filter for CustomerTypeID
    if (values && values.CustomerTypeID) {
      //
      query += " AND CustomerTypeID = @CustomerTypeID"; //
      request.input("CustomerTypeID", sql.Int, values.CustomerTypeID); //
    }
    // Optional filter for WarehouseID (to show customers tied to a specific warehouse)
    if (values && values.WarehouseID) {
      //
      query += " AND WarehouseID = @WarehouseID"; //
      request.input("WarehouseID", sql.Int, values.WarehouseID); //
    }

    query += " ORDER BY CustomerName"; //
    const result = await request.query(query); //
    return result.recordset; //
  } catch (err) {
    // FIX: Ensure error message uses template literal correctly (as it did before)
    throw new CustomError(`Error fetching customers list: ${err.message}`); //
  }
}

module.exports = {
  addCustomer,
  getCustomer,
  getAllCustomers,
  updateCustomer,
  deleteCustomer,
  getCustomersLite,
};
