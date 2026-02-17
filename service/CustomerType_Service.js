// service/CustomerType_Service.js

const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");

const MODULE_NAME = "Customer Type";

async function getCustomerType(pool, customerTypeId) {
  try {
    if (!customerTypeId || isNaN(parseInt(customerTypeId))) {
      throw new CustomError("A valid numeric CustomerTypeID is required.");
    }

    const query = `
        SELECT CT.*, 
               CU.UserName AS CreatedByUserName, 
               UU.UserName AS UpdatedByUserName
        FROM CustomerTypes CT
        LEFT JOIN Users CU ON CT.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON CT.UpdatedBy = UU.UserID
        WHERE CT.CustomerTypeID = @CustomerTypeID AND CT.IsDeleted = 0
    `;
    const request = pool
      .request()
      .input("CustomerTypeID", sql.Int, customerTypeId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError("No active Customer Type found with the given ID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching Customer Type: ${err.message}`);
  }
}

async function getAllCustomerTypes(pool, values) {
  try {
    const {
      page = 1,
      pageSize = 10,
      search = null,
      sortBy = "CustomerTypeName",
      sortOrder = "asc",
    } = values;
    const offset = (page - 1) * pageSize;
    let request = pool.request();
    const whereClauses = ["CT.IsDeleted = 0"];

    if (values.IsActive !== undefined) {
      whereClauses.push("CT.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (search) {
      whereClauses.push(
        "(CT.CustomerTypeName LIKE @Search OR CT.CustomerTypeDescription LIKE @Search)"
      );
      request.input("Search", sql.NVarChar, `%${search}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;

    const validSortColumns = ["CustomerTypeName", "CreatedDate"];
    const safeSortBy = validSortColumns.includes(sortBy)
      ? `CT.${sortBy}`
      : "CT.CustomerTypeName";

    const countQuery = `SELECT COUNT(*) as total FROM CustomerTypes CT ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;

    const query = `
        SELECT CT.*
        FROM CustomerTypes CT
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
    throw new CustomError(`Error fetching all Customer Types: ${err.message}`);
  }
}

async function addCustomerType(pool, values) {
  try {
    const {
      CustomerTypeName,
      CustomerTypeDescription = null,
      IsActive,
      user_id,
    } = values;

    if (!CustomerTypeName || IsActive === undefined || !user_id) {
      throw new CustomError(
        "Customer Type Name and Active Status are mandatory."
      );
    }

    // Check for duplicate name
    const duplicateCheck = await pool
      .request()
      .input("Name", sql.NVarChar(100), CustomerTypeName)
      .query(
        "SELECT COUNT(*) as Count FROM CustomerTypes WHERE CustomerTypeName = @Name AND IsDeleted = 0"
      );
    if (duplicateCheck.recordset[0].Count > 0) {
      throw new CustomError(
        `Customer Type '${CustomerTypeName}' already exists.`
      );
    }

    const query = `
        DECLARE @OutputTable TABLE (CustomerTypeID INT);
        INSERT INTO CustomerTypes (CustomerTypeName, CustomerTypeDescription, IsActive, CreatedBy, UpdatedBy)
        OUTPUT INSERTED.CustomerTypeID INTO @OutputTable
        VALUES (@CustomerTypeName, @CustomerTypeDescription, @IsActive, @UserID, @UserID);
        SELECT CustomerTypeID FROM @OutputTable;
    `;
    const result = await pool
      .request()
      .input("CustomerTypeName", sql.NVarChar(100), CustomerTypeName)
      .input(
        "CustomerTypeDescription",
        sql.NVarChar(500),
        CustomerTypeDescription
      )
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id)
      .query(query);

    const newId = result.recordset[0].CustomerTypeID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_CUSTOMER_TYPE",
      moduleName: MODULE_NAME,
      referenceID: newId,
      details: { newData: values },
    });
    return getCustomerType(pool, newId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new Customer Type: ${err.message}`);
  }
}

async function updateCustomerType(pool, values) {
  try {
    const { CustomerTypeID, ...updateData } = values;
    if (!CustomerTypeID)
      throw new CustomError("CustomerTypeID is required for update.");

    const original = await getCustomerType(pool, CustomerTypeID);

    const {
      CustomerTypeName,
      CustomerTypeDescription = null,
      IsActive,
      user_id,
    } = updateData;

    // Check for duplicate name (excluding current ID)
    const duplicateCheck = await pool
      .request()
      .input("Name", sql.NVarChar(100), CustomerTypeName)
      .input("ID", sql.Int, CustomerTypeID)
      .query(
        "SELECT COUNT(*) as Count FROM CustomerTypes WHERE CustomerTypeName = @Name AND IsDeleted = 0 AND CustomerTypeID != @ID"
      );
    if (duplicateCheck.recordset[0].Count > 0) {
      throw new CustomError(
        `Customer Type '${CustomerTypeName}' already exists.`
      );
    }

    const query = `
          UPDATE CustomerTypes SET
              CustomerTypeName = @CustomerTypeName, 
              CustomerTypeDescription = @CustomerTypeDescription, 
              IsActive = @IsActive, 
              UpdatedBy = @UpdatedBy, 
              UpdatedDate = GETDATE()
          WHERE CustomerTypeID = @ID;
      `;
    const updateRequest = pool
      .request()
      .input("ID", sql.Int, CustomerTypeID)
      .input("CustomerTypeName", sql.NVarChar(100), CustomerTypeName)
      .input(
        "CustomerTypeDescription",
        sql.NVarChar(500),
        CustomerTypeDescription
      )
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id);

    await updateRequest.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_CUSTOMER_TYPE",
      moduleName: MODULE_NAME,
      referenceID: CustomerTypeID,
      details: { oldData: original, newData: updateData },
    });

    return getCustomerType(pool, CustomerTypeID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating Customer Type: ${err.message}`);
  }
}

async function deleteCustomerType(pool, values) {
  try {
    const { CustomerTypeID, user_id } = values;
    if (!CustomerTypeID)
      throw new CustomError("CustomerTypeID is required for deletion.");
    const toDelete = await getCustomerType(pool, CustomerTypeID);

    // TODO: Check for dependencies (if any Customers use this type) before soft deleting

    const query = `
        UPDATE CustomerTypes SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE CustomerTypeID = @ID;
    `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, CustomerTypeID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_CUSTOMER_TYPE",
      moduleName: MODULE_NAME,
      referenceID: CustomerTypeID,
      details: { deletedData: toDelete },
    });
    return { message: "Customer Type deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting Customer Type: ${err.message}`);
  }
}

async function getCustomerTypesLite(pool) {
  try {
    let query = `
        SELECT CustomerTypeID, CustomerTypeName 
        FROM CustomerTypes 
        WHERE IsDeleted = 0 AND IsActive = 1
        ORDER BY CustomerTypeName
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching Customer Types list: ${err.message}`);
  }
}

module.exports = {
  getCustomerType,
  getAllCustomerTypes,
  addCustomerType,
  updateCustomerType,
  deleteCustomerType,
  getCustomerTypesLite,
};
