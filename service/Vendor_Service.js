// service/Vendor_Service.js

const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");

const MODULE_NAME = "Vendor";

async function getVendor(pool, vendorId) {
  try {
    if (!vendorId || isNaN(parseInt(vendorId))) {
      throw new CustomError("A valid numeric VendorID is required.");
    }

    const query = `
        SELECT 
            V.*, 
            C.CountryName, 
            S.StateName, 
            CT.CityName, 
            Z.ZoneName,
            CU.UserName AS CreatedByUserName, 
            UU.UserName AS UpdatedByUserName
        FROM Vendors V
        LEFT JOIN Countries C ON V.CountryID = C.CountryID
        LEFT JOIN States S ON V.StateID = S.StateID
        LEFT JOIN Cities CT ON V.CityID = CT.CityID
        LEFT JOIN Zones Z ON V.ZoneID = Z.ZoneID
        LEFT JOIN Users CU ON V.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON V.UpdatedBy = UU.UserID
        WHERE V.VendorID = @VendorID AND V.IsDeleted = 0
    `;
    const request = pool.request().input("VendorID", sql.Int, vendorId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError("No active Vendor found with the given ID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching Vendor: ${err.message}`);
  }
}

async function getAllVendors(pool, values) {
  try {
    const {
      page = 1,
      pageSize = 10,
      search = null,
      sortBy = "VendorName",
      sortOrder = "asc",
    } = values;
    const offset = (page - 1) * pageSize;
    let request = pool.request();
    const whereClauses = ["V.IsDeleted = 0"];

    if (values.IsActive !== undefined) {
      whereClauses.push("V.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (search) {
      whereClauses.push(
        "(V.VendorName LIKE @Search OR V.VendorCode LIKE @Search OR V.BusinessType LIKE @Search OR C.CountryName LIKE @Search)"
      );
      request.input("Search", sql.NVarChar, `%${search}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;

    const validSortColumns = [
      "VendorName",
      "VendorCode",
      "BusinessType",
      "CountryName",
    ];

    const safeSortBy = validSortColumns.includes(sortBy)
      ? `${sortBy.includes("Country") ? "C" : "V"}.${sortBy}`
      : "V.VendorName";

    const countQuery = `
        SELECT COUNT(*) as total 
        FROM Vendors V
        LEFT JOIN Countries C ON V.CountryID = C.CountryID
        ${whereClause}`;

    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;

    const query = `
        SELECT 
            V.*, 
            C.CountryName, 
            S.StateName, 
            CT.CityName, 
            Z.ZoneName
        FROM Vendors V
        LEFT JOIN Countries C ON V.CountryID = C.CountryID
        LEFT JOIN States S ON V.StateID = S.StateID
        LEFT JOIN Cities CT ON V.CityID = CT.CityID
        LEFT JOIN Zones Z ON V.ZoneID = Z.ZoneID
        ${whereClause}
        ORDER BY ${safeSortBy} ${sortOrder}
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
    throw new CustomError(`Error fetching all Vendors: ${err.message}`);
  }
}

async function addVendor(pool, values) {
  try {
    const {
      VendorCode,
      VendorName,
      VendorDescription = null,
      BusinessType = null,
      VendorContactNumber,
      StreetAddress1,
      StreetAddress2 = null, // Optional
      CountryID,
      StateID,
      CityID,
      ZoneID = null, // Optional
      PrimaryContact = null, // UI field name
      ContactEmail = null, // UI field name
      GSTIN = null, // Optional
      IsActive = true,
      user_id,
    } = values;

    // Map UI field names to DB column names
    const ContactPerson = PrimaryContact;
    const EmailAddress = ContactEmail;

    if (
      !VendorCode ||
      !VendorName ||
      !VendorContactNumber ||
      !StreetAddress1 ||
      !CountryID ||
      !StateID ||
      !CityID ||
      !user_id
    ) {
      throw new CustomError(
        "Vendor Code, Name, Contact Number, Address, Country, State, and City are mandatory."
      );
    }

    // Check for duplicate VendorCode or VendorName
    const duplicateCheck = await pool
      .request()
      .input("Code", sql.NVarChar(50), VendorCode)
      .input("Name", sql.NVarChar(100), VendorName)
      .query(
        "SELECT COUNT(*) as Count FROM Vendors WHERE (VendorCode = @Code OR VendorName = @Name) AND IsDeleted = 0"
      );
    if (duplicateCheck.recordset[0].Count > 0) {
      throw new CustomError(
        `A Vendor with the same Code or Name already exists.`
      );
    }

    const query = `
        DECLARE @OutputTable TABLE (VendorID INT);
        INSERT INTO Vendors (VendorCode, VendorName, VendorDescription, BusinessType,
                          VendorContactNumber, StreetAddress1, StreetAddress2, 
                          CountryID, StateID, CityID, ZoneID,
                          ContactPerson, EmailAddress, GSTIN, IsActive, CreatedBy, UpdatedBy)
        OUTPUT INSERTED.VendorID INTO @OutputTable
        VALUES (@VendorCode, @VendorName, @VendorDescription, @BusinessType,
                @VendorContactNumber, @StreetAddress1, @StreetAddress2, 
                @CountryID, @StateID, @CityID, @ZoneID,
                @ContactPerson, @EmailAddress, @GSTIN, @IsActive, @UserID, @UserID);
        SELECT VendorID FROM @OutputTable;
    `;
    const result = await pool
      .request()
      .input("VendorCode", sql.NVarChar(50), VendorCode)
      .input("VendorName", sql.NVarChar(100), VendorName)
      .input("VendorDescription", sql.NVarChar(500), VendorDescription)
      .input("BusinessType", sql.NVarChar(100), BusinessType)
      .input("VendorContactNumber", sql.NVarChar(50), VendorContactNumber)
      .input("StreetAddress1", sql.NVarChar(255), StreetAddress1)
      .input("StreetAddress2", sql.NVarChar(255), StreetAddress2)
      .input("CountryID", sql.Int, CountryID)
      .input("StateID", sql.Int, StateID)
      .input("CityID", sql.Int, CityID)
      .input("ZoneID", sql.Int, ZoneID)
      .input("ContactPerson", sql.NVarChar(100), ContactPerson)
      .input("EmailAddress", sql.NVarChar(100), EmailAddress)
      .input("GSTIN", sql.NVarChar(15), GSTIN)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id)
      .query(query);

    const newId = result.recordset[0].VendorID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_VENDOR",
      moduleName: MODULE_NAME,
      referenceID: newId,
      details: { newData: values },
    });
    return getVendor(pool, newId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new Vendor: ${err.message}`);
  }
}

async function updateVendor(pool, values) {
  try {
    const { VendorID, ...updateData } = values;
    if (!VendorID) throw new CustomError("VendorID is required for update.");

    const original = await getVendor(pool, VendorID);

    const {
      VendorCode,
      VendorName,
      VendorDescription = null,
      BusinessType = null,
      VendorContactNumber,
      StreetAddress1,
      StreetAddress2 = null, // Optional
      CountryID,
      StateID,
      CityID,
      ZoneID = null, // Optional
      PrimaryContact = null, // UI field name
      ContactEmail = null, // UI field name
      GSTIN = null, // Optional
      IsActive,
      user_id,
    } = updateData;

    // Map UI field names to DB column names
    const ContactPerson = PrimaryContact;
    const EmailAddress = ContactEmail;

    // Check for duplicate Code or Name (excluding current VendorID)
    const duplicateCheck = await pool
      .request()
      .input("Code", sql.NVarChar(50), VendorCode)
      .input("Name", sql.NVarChar(100), VendorName)
      .input("ID", sql.Int, VendorID)
      .query(
        "SELECT COUNT(*) as Count FROM Vendors WHERE (VendorCode = @Code OR VendorName = @Name) AND IsDeleted = 0 AND VendorID != @ID"
      );
    if (duplicateCheck.recordset[0].Count > 0) {
      throw new CustomError(
        `A Vendor with the same Code or Name already exists.`
      );
    }

    const query = `
          UPDATE Vendors SET
              VendorCode = @VendorCode, 
              VendorName = @VendorName, 
              VendorDescription = @VendorDescription,
              BusinessType = @BusinessType,
              VendorContactNumber = @VendorContactNumber,
              StreetAddress1 = @StreetAddress1, 
              StreetAddress2 = @StreetAddress2, 
              CountryID = @CountryID, 
              StateID = @StateID, 
              CityID = @CityID, 
              ZoneID = @ZoneID,
              ContactPerson = @ContactPerson,
              EmailAddress = @EmailAddress,
              GSTIN = @GSTIN,
              IsActive = @IsActive, 
              UpdatedBy = @UpdatedBy, 
              UpdatedDate = GETDATE()
          WHERE VendorID = @ID;
      `;
    const updateRequest = pool
      .request()
      .input("ID", sql.Int, VendorID)
      .input("VendorCode", sql.NVarChar(50), VendorCode)
      .input("VendorName", sql.NVarChar(100), VendorName)
      .input("VendorDescription", sql.NVarChar(500), VendorDescription)
      .input("BusinessType", sql.NVarChar(100), BusinessType)
      .input("VendorContactNumber", sql.NVarChar(50), VendorContactNumber)
      .input("StreetAddress1", sql.NVarChar(255), StreetAddress1)
      .input("StreetAddress2", sql.NVarChar(255), StreetAddress2)
      .input("CountryID", sql.Int, CountryID)
      .input("StateID", sql.Int, StateID)
      .input("CityID", sql.Int, CityID)
      .input("ZoneID", sql.Int, ZoneID)
      .input("ContactPerson", sql.NVarChar(100), ContactPerson)
      .input("EmailAddress", sql.NVarChar(100), EmailAddress)
      .input("GSTIN", sql.NVarChar(15), GSTIN)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id);

    await updateRequest.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_VENDOR",
      moduleName: MODULE_NAME,
      referenceID: VendorID,
      details: { oldData: original, newData: updateData },
    });

    return getVendor(pool, VendorID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating Vendor: ${err.message}`);
  }
}

async function deleteVendor(pool, values) {
  try {
    const { VendorID, user_id } = values;
    if (!VendorID) throw new CustomError("VendorID is required for deletion.");
    const toDelete = await getVendor(pool, VendorID);

    const query = `
        UPDATE Vendors SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE VendorID = @ID;
    `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, VendorID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_VENDOR",
      moduleName: MODULE_NAME,
      referenceID: VendorID,
      details: { deletedData: toDelete },
    });
    return { message: "Vendor deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting Vendor: ${err.message}`);
  }
}

async function getVendorsLite(pool) {
  try {
    let query = `
        SELECT VendorID, VendorName 
        FROM Vendors 
        WHERE IsDeleted = 0 AND IsActive = 1
        ORDER BY VendorName
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching Vendors list: ${err.message}`);
  }
}

module.exports = {
  getVendor,
  getAllVendors,
  addVendor,
  updateVendor,
  deleteVendor,
  getVendorsLite,
};
