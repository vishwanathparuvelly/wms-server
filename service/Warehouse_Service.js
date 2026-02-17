const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");
const validationService = require("./Validation_Service");

const MODULE_NAME = "Warehouse";

async function getWarehouse(pool, warehouseId) {
  try {
    if (!warehouseId || isNaN(parseInt(warehouseId))) {
      throw new CustomError("A valid numeric WarehouseID is required.");
    }

    const query = `
            SELECT 
                W.*,
                WT.WarehouseTypeName,
                C.CountryName,
                S.StateName,
                CI.CityName,
                Z.ZoneName,
                B.BranchName,
                B.BranchCode,
                PW.WarehouseName as ParentWarehouseName,
                CU.UserName AS CreatedByUserName,
                UU.UserName AS UpdatedByUserName
            FROM Warehouses W
            LEFT JOIN WarehouseTypes WT ON W.WarehouseTypeID = WT.WarehouseTypeID
            LEFT JOIN Countries C ON W.CountryID = C.CountryID
            LEFT JOIN States S ON W.StateID = S.StateID
            LEFT JOIN Cities CI ON W.CityID = CI.CityID
            LEFT JOIN Zones Z ON W.ZoneID = Z.ZoneID
            LEFT JOIN Branches B ON W.BranchID = B.BranchID
            LEFT JOIN Warehouses PW ON W.ParentWarehouseID = PW.WarehouseID
            LEFT JOIN Users CU ON W.CreatedBy = CU.UserID
            LEFT JOIN Users UU ON W.UpdatedBy = UU.UserID
            WHERE W.WarehouseID = @WarehouseID AND W.IsDeleted = 0
        `;
    const request = pool.request().input("WarehouseID", sql.Int, warehouseId);
    const result = await request.query(query);
    if (result.recordset.length === 0) {
      throw new CustomError(
        "No active warehouse found with the given WarehouseID."
      );
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching warehouse: ${err.message}`);
  }
}

// REPLACE your existing getAllWarehouses function in service/Warehouse_Service.js

async function getAllWarehouses(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // --- ENHANCEMENT: Added Search and Sort ---
    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "WarehouseName"; // Default sort column
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC"; // Default sort order

    const whereClauses = [];
    let request = pool.request();

    whereClauses.push("W.IsDeleted = 0");
    if (values.IsActive !== undefined) {
      whereClauses.push("W.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (values.CityID) {
      whereClauses.push("W.CityID = @CityID");
      request.input("CityID", sql.Int, values.CityID);
    }
    if (values.ZoneID) {
      whereClauses.push("W.ZoneID = @ZoneID");
      request.input("ZoneID", sql.Int, values.ZoneID);
    }
    if (values.BranchID) {
      whereClauses.push("W.BranchID = @BranchID");
      request.input("BranchID", sql.Int, values.BranchID);
    }
    // Server-side search logic
    if (searchTerm) {
      whereClauses.push(
        "(W.WarehouseName LIKE @SearchTerm OR W.WarehouseCode LIKE @SearchTerm OR B.BranchName LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;

    // Validate sortBy column to prevent SQL injection
    const validSortColumns = [
      "WarehouseName",
      "WarehouseCode",
      "ZoneName",
      "BranchName",
      "MaxCapacitySQFT",
      "CarpetArea",
      "CreatedDate",
      "IsActive",
    ];
    const safeSortBy = validSortColumns.includes(sortBy)
      ? `W.${sortBy}`
      : "W.WarehouseName";

    const countQuery = `
        SELECT COUNT(*) as total 
        FROM Warehouses W 
        LEFT JOIN Branches B ON W.BranchID = B.BranchID
        ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = `
            SELECT 
                W.*, WT.WarehouseTypeName, C.CountryName, S.StateName, CI.CityName, 
                Z.ZoneName, B.BranchName, PW.WarehouseName as ParentWarehouseName,
                CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
            FROM Warehouses W
            LEFT JOIN WarehouseTypes WT ON W.WarehouseTypeID = WT.WarehouseTypeID
            LEFT JOIN Countries C ON W.CountryID = C.CountryID
            LEFT JOIN States S ON W.StateID = S.StateID
            LEFT JOIN Cities CI ON W.CityID = CI.CityID
            LEFT JOIN Zones Z ON W.ZoneID = Z.ZoneID
            LEFT JOIN Branches B ON W.BranchID = B.BranchID
            LEFT JOIN Warehouses PW ON W.ParentWarehouseID = PW.WarehouseID
            LEFT JOIN Users CU ON W.CreatedBy = CU.UserID
            LEFT JOIN Users UU ON W.UpdatedBy = UU.UserID
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
    throw new CustomError(`Error fetching all warehouses: ${err.message}`);
  }
}

async function addWarehouse(pool, values) {
  try {
    const requiredFields = [
      "WarehouseName",
      "WarehouseCode",
      "WarehouseTypeID",
      "StreetAddress1",
      "CountryID",
      "StateID",
      "CityID",
      "ZoneID",
      "BranchID",
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
      throw new CustomError(`${invalidFields.join(", ")} is/are required.`);
    }

    const {
      WarehouseName,
      WarehouseCode,
      WarehouseTypeID,
      ParentWarehouseID,
      StreetAddress1,
      StreetAddress2,
      Latitude,
      Longitude,
      MaxCapacitySQFT,
      MaxCapacityMT,
      CarpetArea,
      CityID,
      StateID,
      ZoneID,
      CountryID,
      BranchID,
      IsActive,
      user_id,
    } = values;

    // --- All Validations ---
    await validationService.validateWarehouseTypeExists(pool, WarehouseTypeID);
    await validationService.validateWarehouseLocationHierarchy(pool, {
      countryId: CountryID,
      stateId: StateID,
      cityId: CityID,
      zoneId: ZoneID,
      branchId: BranchID,
    });
    if (ParentWarehouseID) {
      await validationService.validateWarehouseExists(pool, ParentWarehouseID);
    }

    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Warehouses WHERE WarehouseCode = @WarehouseCode AND IsDeleted = 0) as CodeCount,
                (SELECT COUNT(*) FROM Warehouses WHERE WarehouseName = @WarehouseName AND IsDeleted = 0) as NameCount
        `;
    let request = pool
      .request()
      .input("WarehouseCode", sql.NVarChar(50), WarehouseCode)
      .input("WarehouseName", sql.NVarChar(100), WarehouseName);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(
        `Warehouse with code '${WarehouseCode}' already exists.`
      );
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Warehouse with name '${WarehouseName}' already exists.`
      );

    const query = `
            DECLARE @OutputTable TABLE (WarehouseID INT);
            INSERT INTO Warehouses (
                WarehouseCode, WarehouseName, WarehouseTypeID, ParentWarehouseID, StreetAddress1, StreetAddress2,
                Latitude, Longitude, MaxCapacitySQFT, MaxCapacityMT, CarpetArea,
                CityID, StateID, ZoneID, CountryID, BranchID, IsActive,
                CreatedBy, UpdatedBy
            )
            OUTPUT INSERTED.WarehouseID INTO @OutputTable
            VALUES (
                @WarehouseCode, @WarehouseName, @WarehouseTypeID, @ParentWarehouseID, @StreetAddress1, @StreetAddress2,
                @Latitude, @Longitude, @MaxCapacitySQFT, @MaxCapacityMT, @CarpetArea,
                @CityID, @StateID, @ZoneID, @CountryID, @BranchID, @IsActive,
                @UserID, @UserID
            );
            SELECT WarehouseID FROM @OutputTable;
        `;
    request = pool
      .request()
      .input("WarehouseCode", sql.NVarChar(50), WarehouseCode)
      .input("WarehouseName", sql.NVarChar(100), WarehouseName)
      .input("WarehouseTypeID", sql.Int, WarehouseTypeID)
      .input("ParentWarehouseID", sql.Int, ParentWarehouseID)
      .input("StreetAddress1", sql.NVarChar(255), StreetAddress1)
      .input("StreetAddress2", sql.NVarChar(255), StreetAddress2)
      .input("Latitude", sql.Decimal(9, 6), Latitude)
      .input("Longitude", sql.Decimal(9, 6), Longitude)
      .input("MaxCapacitySQFT", sql.Decimal(18, 2), MaxCapacitySQFT)
      .input("MaxCapacityMT", sql.Decimal(18, 2), MaxCapacityMT)
      .input("CarpetArea", sql.Decimal(18, 2), CarpetArea)
      .input("CityID", sql.Int, CityID)
      .input("StateID", sql.Int, StateID)
      .input("ZoneID", sql.Int, ZoneID)
      .input("CountryID", sql.Int, CountryID)
      .input("BranchID", sql.Int, BranchID)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await request.query(query);
    const newWarehouseId = result.recordset[0].WarehouseID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_WAREHOUSE",
      moduleName: MODULE_NAME,
      referenceID: newWarehouseId,
      details: { newData: values },
    });

    return getWarehouse(pool, newWarehouseId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new warehouse: ${err.message}`);
  }
}

async function updateWarehouse(pool, values) {
  try {
    const { WarehouseID, ...updateData } = values;
    if (!WarehouseID)
      throw new CustomError("WarehouseID is required for update.");

    const {
      WarehouseName,
      WarehouseCode,
      WarehouseTypeID,
      ParentWarehouseID,
      StreetAddress1,
      StreetAddress2,
      Latitude,
      Longitude,
      MaxCapacitySQFT,
      MaxCapacityMT,
      CarpetArea,
      CityID,
      StateID,
      ZoneID,
      CountryID,
      BranchID,
      IsActive,
      user_id,
    } = updateData;

    // --- All Validations ---
    await validationService.validateWarehouseTypeExists(pool, WarehouseTypeID);
    await validationService.validateWarehouseLocationHierarchy(pool, {
      countryId: CountryID,
      stateId: StateID,
      cityId: CityID,
      zoneId: ZoneID,
      branchId: BranchID,
    });
    if (ParentWarehouseID) {
      if (ParentWarehouseID === WarehouseID)
        throw new CustomError("A warehouse cannot be its own parent.");
      await validationService.validateWarehouseExists(pool, ParentWarehouseID);
    }

    const originalWarehouse = await getWarehouse(pool, WarehouseID);

    let duplicateCheckQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Warehouses WHERE WarehouseCode = @WarehouseCode AND IsDeleted = 0 AND WarehouseID != @WarehouseID) as CodeCount,
                (SELECT COUNT(*) FROM Warehouses WHERE WarehouseName = @WarehouseName AND IsDeleted = 0 AND WarehouseID != @WarehouseID) as NameCount
        `;
    let request = pool
      .request()
      .input("WarehouseCode", sql.NVarChar(50), WarehouseCode)
      .input("WarehouseName", sql.NVarChar(100), WarehouseName)
      .input("WarehouseID", sql.Int, WarehouseID);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(
        `Warehouse with code '${WarehouseCode}' already exists.`
      );
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Warehouse with name '${WarehouseName}' already exists.`
      );

    const query = `
        UPDATE Warehouses SET
            WarehouseCode = @WarehouseCode, WarehouseName = @WarehouseName, WarehouseTypeID = @WarehouseTypeID,
            ParentWarehouseID = @ParentWarehouseID, StreetAddress1 = @StreetAddress1, StreetAddress2 = @StreetAddress2,
            Latitude = @Latitude, Longitude = @Longitude, MaxCapacitySQFT = @MaxCapacitySQFT, MaxCapacityMT = @MaxCapacityMT,
            CarpetArea = @CarpetArea, CityID = @CityID, StateID = @StateID, ZoneID = @ZoneID, CountryID = @CountryID,
            BranchID = @BranchID, IsActive = @IsActive, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE WarehouseID = @WarehouseID;
    `;
    request = pool
      .request()
      .input("WarehouseCode", sql.NVarChar(50), WarehouseCode)
      .input("WarehouseName", sql.NVarChar(100), WarehouseName)
      .input("WarehouseTypeID", sql.Int, WarehouseTypeID)
      .input("ParentWarehouseID", sql.Int, ParentWarehouseID)
      .input("StreetAddress1", sql.NVarChar(255), StreetAddress1)
      .input("StreetAddress2", sql.NVarChar(255), StreetAddress2)
      .input("Latitude", sql.Decimal(9, 6), Latitude)
      .input("Longitude", sql.Decimal(9, 6), Longitude)
      .input("MaxCapacitySQFT", sql.Decimal(18, 2), MaxCapacitySQFT)
      .input("MaxCapacityMT", sql.Decimal(18, 2), MaxCapacityMT)
      .input("CarpetArea", sql.Decimal(18, 2), CarpetArea)
      .input("CityID", sql.Int, CityID)
      .input("StateID", sql.Int, StateID)
      .input("ZoneID", sql.Int, ZoneID)
      .input("CountryID", sql.Int, CountryID)
      .input("BranchID", sql.Int, BranchID)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id)
      .input("WarehouseID", sql.Int, WarehouseID);

    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_WAREHOUSE",
      moduleName: MODULE_NAME,
      referenceID: WarehouseID,
      details: { oldData: originalWarehouse, newData: updateData },
    });

    return getWarehouse(pool, WarehouseID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating warehouse: ${err.message}`);
  }
}

async function deleteWarehouse(pool, values) {
  try {
    const { WarehouseID, user_id } = values;
    if (!WarehouseID)
      throw new CustomError("WarehouseID is required for deletion.");
    const warehouseToDelete = await getWarehouse(pool, WarehouseID);

    const childCheckRequest = pool
      .request()
      .input("ParentWarehouseID", sql.Int, WarehouseID);
    const childResult = await childCheckRequest.query(
      `SELECT COUNT(*) as childCount FROM Warehouses WHERE ParentWarehouseID = @ParentWarehouseID AND IsDeleted = 0`
    );
    if (childResult.recordset[0].childCount > 0) {
      throw new CustomError(
        "Cannot delete warehouse. It is a parent to other warehouses."
      );
    }

    const query = `
            UPDATE Warehouses SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
            WHERE WarehouseID = @WarehouseID;
        `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("WarehouseID", sql.Int, WarehouseID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_WAREHOUSE",
      moduleName: MODULE_NAME,
      referenceID: WarehouseID,
      details: { deletedData: warehouseToDelete },
    });

    return { message: "Warehouse deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting warehouse: ${err.message}`);
  }
}
async function getWarehousesLite(pool, values) {
  try {
    let query = `
            SELECT WarehouseID, WarehouseName 
            FROM Warehouses 
            WHERE IsDeleted = 0 AND IsActive = 1
        `;
    const request = pool.request();
    if (values && values.BranchID) {
      query += " AND BranchID = @BranchID";
      request.input("BranchID", sql.Int, values.BranchID);
    }
    if (values && values.ZoneID) {
      query += " AND ZoneID = @ZoneID";
      request.input("ZoneID", sql.Int, values.ZoneID);
    }
    if (values && values.CityID) {
      query += " AND CityID = @CityID";
      request.input("CityID", sql.Int, values.CityID);
    }
    query += " ORDER BY WarehouseName";
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching warehouses list: ${err.message}`);
  }
}
module.exports = {
  getWarehouse,
  getAllWarehouses,
  addWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getWarehousesLite,
};
