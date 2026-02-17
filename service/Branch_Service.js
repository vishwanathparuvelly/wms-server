const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");
const validationService = require("./Validation_Service");

const MODULE_NAME = "Branch";

async function getBranch(pool, branchId) {
  try {
    if (!branchId || isNaN(parseInt(branchId))) {
      throw new CustomError("A valid numeric BranchID is required.");
    }

    const query = `
            SELECT 
                B.BranchID, B.BranchCode, B.BranchName, B.BranchDescription, B.StreetAddress1, B.StreetAddress2,
                B.CityID, CI.CityName, B.StateID, S.StateName, B.ZoneID, Z.ZoneName, B.CountryID, C.CountryName,
                B.IsDefault, B.IsActive, B.IsDeleted, B.CreatedBy, B.UpdatedBy, B.CreatedDate, B.UpdatedDate,
                CU.UserName AS CreatedByUserName,
                UU.UserName AS UpdatedByUserName
            FROM Branches B
            LEFT JOIN Countries C ON B.CountryID = C.CountryID
            LEFT JOIN States S ON B.StateID = S.StateID
            LEFT JOIN Cities CI ON B.CityID = CI.CityID
            LEFT JOIN Zones Z ON B.ZoneID = Z.ZoneID
            LEFT JOIN Users CU ON B.CreatedBy = CU.UserID
            LEFT JOIN Users UU ON B.UpdatedBy = UU.UserID
            WHERE B.BranchID = @BranchID AND B.IsDeleted = 0
        `;
    const request = pool.request().input("BranchID", sql.Int, branchId);
    const result = await request.query(query);
    if (result.recordset.length === 0) {
      throw new CustomError("No active branch found with the given BranchID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching branch: ${err.message}`);
  }
}

// REPLACE your existing getAllBranches function in service/Branch_Service.js

async function getAllBranches(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // --- ENHANCEMENT: Added Search and Sort ---
    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "BranchName"; // Default sort column
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC"; // Default sort order

    const whereClauses = [];
    let request = pool.request();

    whereClauses.push("B.IsDeleted = 0");
    if (values.IsActive !== undefined) {
      whereClauses.push("B.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (values.CityID) {
      whereClauses.push("B.CityID = @CityID");
      request.input("CityID", sql.Int, values.CityID);
    }
    if (values.ZoneID) {
      whereClauses.push("B.ZoneID = @ZoneID");
      request.input("ZoneID", sql.Int, values.ZoneID);
    }
    // Server-side search logic
    if (searchTerm) {
      whereClauses.push(
        "(B.BranchName LIKE @SearchTerm OR B.BranchCode LIKE @SearchTerm OR CI.CityName LIKE @SearchTerm OR S.StateName LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;

    // Validate sortBy column to prevent SQL injection
    const validSortColumns = [
      "BranchName",
      "StreetAddress1",
      "IsActive",
      "IsDefault",
      "CreatedDate",
    ];
    const safeSortBy = validSortColumns.includes(sortBy)
      ? `B.${sortBy}`
      : "B.BranchName";

    const countQuery = `
        SELECT COUNT(*) as total 
        FROM Branches B 
        LEFT JOIN Cities CI ON B.CityID = CI.CityID
        LEFT JOIN States S ON B.StateID = S.StateID
        ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = `
            SELECT 
                B.*,
                C.CountryName, S.StateName, CI.CityName, Z.ZoneName,
                CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
            FROM Branches B
            LEFT JOIN Countries C ON B.CountryID = C.CountryID
            LEFT JOIN States S ON B.StateID = S.StateID
            LEFT JOIN Cities CI ON B.CityID = CI.CityID
            LEFT JOIN Zones Z ON B.ZoneID = Z.ZoneID
            LEFT JOIN Users CU ON B.CreatedBy = CU.UserID
            LEFT JOIN Users UU ON B.UpdatedBy = UU.UserID
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
    throw new CustomError(`Error fetching all branches: ${err.message}`);
  }
}

async function addBranch(pool, values) {
  const transaction = new sql.Transaction(pool);
  let transactionBegun = false;
  try {
    const requiredFields = [
      "BranchCode",
      "BranchName",
      "StreetAddress1",
      "CountryID",
      "StateID",
      "CityID",
      "ZoneID",
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

    const {
      BranchCode,
      BranchName,
      BranchDescription,
      StreetAddress1,
      StreetAddress2,
      CityID,
      StateID,
      ZoneID,
      CountryID,
      IsDefault,
      IsActive,
      user_id,
    } = values;

    await validationService.validateBranchLocationHierarchy(pool, {
      countryId: CountryID,
      stateId: StateID,
      cityId: CityID,
      zoneId: ZoneID,
    });

    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Branches WHERE BranchCode = @BranchCode AND IsDeleted = 0) as CodeCount,
                (SELECT COUNT(*) FROM Branches WHERE BranchName = @BranchName AND IsDeleted = 0) as NameCount
        `;
    let request = pool
      .request()
      .input("BranchCode", sql.NVarChar(50), BranchCode)
      .input("BranchName", sql.NVarChar(100), BranchName);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(`Branch with code '${BranchCode}' already exists.`);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(`Branch with name '${BranchName}' already exists.`);

    await transaction.begin();
    transactionBegun = true;

    if (IsDefault === true) {
      const unsetRequest = new sql.Request(transaction);
      await unsetRequest.query(
        "UPDATE Branches SET IsDefault = 0 WHERE IsDefault = 1"
      );
    }

    const insertRequest = new sql.Request(transaction);
    const query = `
            DECLARE @OutputTable TABLE (BranchID INT);
            INSERT INTO Branches (BranchCode, BranchName, BranchDescription, StreetAddress1, StreetAddress2, CityID, StateID, ZoneID, CountryID, IsDefault, IsActive, CreatedBy, UpdatedBy)
            OUTPUT INSERTED.BranchID INTO @OutputTable
            VALUES (@BranchCode, @BranchName, @BranchDescription, @StreetAddress1, @StreetAddress2, @CityID, @StateID, @ZoneID, @CountryID, @IsDefault, @IsActive, @UserID, @UserID);
            SELECT BranchID FROM @OutputTable;
        `;
    insertRequest
      .input("BranchCode", sql.NVarChar(50), BranchCode)
      .input("BranchName", sql.NVarChar(100), BranchName)
      .input("BranchDescription", sql.NVarChar(500), BranchDescription)
      .input("StreetAddress1", sql.NVarChar(255), StreetAddress1)
      .input("StreetAddress2", sql.NVarChar(255), StreetAddress2)
      .input("CityID", sql.Int, CityID)
      .input("StateID", sql.Int, StateID)
      .input("ZoneID", sql.Int, ZoneID)
      .input("CountryID", sql.Int, CountryID)
      .input("IsDefault", sql.Bit, IsDefault || false)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await insertRequest.query(query);
    const newBranchId = result.recordset[0].BranchID;

    await transaction.commit();

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_BRANCH",
      moduleName: MODULE_NAME,
      referenceID: newBranchId,
      details: { newData: values },
    });

    return getBranch(pool, newBranchId);
  } catch (err) {
    if (transactionBegun) {
      await transaction.rollback();
    }
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new branch: ${err.message}`);
  }
}

async function updateBranch(pool, values) {
  const transaction = new sql.Transaction(pool);
  let transactionBegun = false;
  try {
    const { BranchID, ...updateData } = values;
    if (!BranchID) throw new CustomError("BranchID is required for update.");

    const {
      BranchCode,
      BranchName,
      StreetAddress1,
      CityID,
      StateID,
      ZoneID,
      CountryID,
      IsDefault,
      IsActive,
      user_id,
    } = updateData;

    await validationService.validateBranchLocationHierarchy(pool, {
      countryId: CountryID,
      stateId: StateID,
      cityId: CityID,
      zoneId: ZoneID,
    });
    const originalBranch = await getBranch(pool, BranchID);

    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Branches WHERE BranchCode = @BranchCode AND IsDeleted = 0 AND BranchID != @BranchID) as CodeCount,
                (SELECT COUNT(*) FROM Branches WHERE BranchName = @BranchName AND IsDeleted = 0 AND BranchID != @BranchID) as NameCount
        `;
    let request = pool
      .request()
      .input("BranchCode", sql.NVarChar(50), BranchCode)
      .input("BranchName", sql.NVarChar(100), BranchName)
      .input("BranchID", sql.Int, BranchID);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(`Branch with code '${BranchCode}' already exists.`);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(`Branch with name '${BranchName}' already exists.`);

    await transaction.begin();
    transactionBegun = true;

    if (IsDefault === true) {
      const unsetRequest = new sql.Request(transaction);
      unsetRequest.input("BranchID", sql.Int, BranchID);
      await unsetRequest.query(
        "UPDATE Branches SET IsDefault = 0 WHERE IsDefault = 1 AND BranchID != @BranchID"
      );
    }

    const updateRequest = new sql.Request(transaction);
    const query = `
            UPDATE Branches SET
                BranchCode = @BranchCode, BranchName = @BranchName, BranchDescription = @BranchDescription,
                StreetAddress1 = @StreetAddress1, StreetAddress2 = @StreetAddress2, CityID = @CityID,
                StateID = @StateID, ZoneID = @ZoneID, CountryID = @CountryID, IsDefault = @IsDefault,
                IsActive = @IsActive, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
            WHERE BranchID = @BranchID;
        `;
    updateRequest
      .input("BranchCode", sql.NVarChar(50), BranchCode)
      .input("BranchName", sql.NVarChar(100), BranchName)
      .input(
        "BranchDescription",
        sql.NVarChar(500),
        updateData.BranchDescription
      )
      .input("StreetAddress1", sql.NVarChar(255), StreetAddress1)
      .input("StreetAddress2", sql.NVarChar(255), updateData.StreetAddress2)
      .input("CityID", sql.Int, CityID)
      .input("StateID", sql.Int, StateID)
      .input("ZoneID", sql.Int, ZoneID)
      .input("CountryID", sql.Int, CountryID)
      .input("IsDefault", sql.Bit, IsDefault || false)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id)
      .input("BranchID", sql.Int, BranchID);

    await updateRequest.query(query);

    await transaction.commit();

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_BRANCH",
      moduleName: MODULE_NAME,
      referenceID: BranchID,
      details: { oldData: originalBranch, newData: updateData },
    });

    return getBranch(pool, BranchID);
  } catch (err) {
    if (transactionBegun) {
      await transaction.rollback();
    }
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating branch: ${err.message}`);
  }
}

async function deleteBranch(pool, values) {
  try {
    const { BranchID, user_id } = values;
    if (!BranchID) throw new CustomError("BranchID is required for deletion.");
    const branchToDelete = await getBranch(pool, BranchID);

    // --- ENHANCEMENT: Prevent deletion of the default branch ---
    if (branchToDelete.IsDefault) {
      throw new CustomError(
        "Cannot delete the default branch. Please set another branch as default first."
      );
    }

    // --- ENHANCEMENT: Prevent deletion if branch is linked to warehouses ---
    const dependencyCheckRequest = pool.request();
    dependencyCheckRequest.input("BranchID", sql.Int, BranchID);
    const dependencyResult = await dependencyCheckRequest.query(
      `SELECT COUNT(*) as warehouseCount FROM Warehouses WHERE BranchID = @BranchID AND IsDeleted = 0`
    );
    if (dependencyResult.recordset[0].warehouseCount > 0) {
      throw new CustomError(
        "Cannot delete branch. It is currently linked to one or more active warehouses."
      );
    }

    const query = `
            UPDATE Branches SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
            WHERE BranchID = @BranchID;
        `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("BranchID", sql.Int, BranchID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_BRANCH",
      moduleName: MODULE_NAME,
      referenceID: BranchID,
      details: { deletedData: branchToDelete },
    });

    return { message: "Branch deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting branch: ${err.message}`);
  }
}
// REPLACE your existing getBranchesLite/getBranchesList function

async function getBranchesLite(pool, values) {
  try {
    let query = `
            SELECT BranchID, BranchName 
            FROM Branches 
            WHERE IsDeleted = 0 AND IsActive = 1
        `;
    const request = pool.request();

    // Optional filter for CityID
    if (values && values.CityID) {
      query += " AND CityID = @CityID";
      request.input("CityID", sql.Int, values.CityID);
    }

    // --- NEW: Optional filter for ZoneID ---
    if (values && values.ZoneID) {
      query += " AND ZoneID = @ZoneID";
      request.input("ZoneID", sql.Int, values.ZoneID);
    }

    query += " ORDER BY BranchName";
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching branches list: ${err.message}`);
  }
}

module.exports = {
  addBranch,
  getBranch,
  getAllBranches,
  updateBranch,
  deleteBranch,
  getBranchesLite,
};
