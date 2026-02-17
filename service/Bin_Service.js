// service/Bin_Service.js

const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");

const MODULE_NAME = "Bin";

async function getBin(pool, binId) {
  try {
    if (!binId || isNaN(parseInt(binId))) {
      throw new CustomError("A valid numeric BinID is required.");
    }

    const query = `
        SELECT 
            B.*, 
            W.WarehouseName, 
            C.CompartmentName, 
            S.StackName,
            ST.StorageTypeName, 
            PT.PalletName AS PalletTypeName,
            SL.SlocName, 
            CU.UserName AS CreatedByUserName, 
            UU.UserName AS UpdatedByUserName
        FROM Bins B
        LEFT JOIN Warehouses W ON B.WarehouseID = W.WarehouseID
        LEFT JOIN Compartments C ON B.CompartmentID = C.CompartmentID
        LEFT JOIN Stacks S ON B.StackID = S.StackID
        LEFT JOIN StorageTypes ST ON B.StorageTypeID = ST.StorageTypeID
        LEFT JOIN PalletTypes PT ON B.PalletTypeID = PT.PalletTypeID
        LEFT JOIN Slocs SL ON B.SlocID = SL.SlocID
        LEFT JOIN Users CU ON B.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON B.UpdatedBy = UU.UserID
        WHERE B.BinID = @BinID AND B.IsDeleted = 0
    `;
    const request = pool.request().input("BinID", sql.Int, binId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError("No active Bin found with the given ID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching Bin: ${err.message}`);
  }
}

async function getAllBins(pool, values) {
  try {
    const {
      page = 1,
      pageSize = 10,
      search = null,
      sortBy = "BinNumber",
      sortOrder = "asc",
      WarehouseID = null, // Filter option
    } = values;
    const offset = (page - 1) * pageSize;
    let request = pool.request();
    const whereClauses = ["B.IsDeleted = 0"];

    if (values.IsActive !== undefined) {
      whereClauses.push("B.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (WarehouseID) {
      whereClauses.push("B.WarehouseID = @WarehouseID");
      request.input("WarehouseID", sql.Int, WarehouseID);
    }
    if (search) {
      whereClauses.push(
        "(B.BinNumber LIKE @Search OR W.WarehouseName LIKE @Search OR ST.StorageTypeName LIKE @Search OR SL.SlocName LIKE @Search)"
      );
      request.input("Search", sql.NVarChar, `%${search}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;

    // Define all valid sortable columns
    const validSortColumns = [
      "BinNumber",
      "WarehouseName",
      "StorageTypeName",
      "SlocName",
      "XCoordinate",
      "YCoordinate",
      "ZCoordinate",
      "MaxPallets",
    ];

    // Safely construct the ORDER BY clause
    const safeSortBy = validSortColumns.includes(sortBy)
      ? `${
          sortBy.includes("Warehouse")
            ? "W"
            : sortBy.includes("StorageType")
            ? "ST"
            : sortBy.includes("Sloc")
            ? "SL"
            : "B"
        }.${sortBy}`
      : "B.BinNumber";

    const countQuery = `
        SELECT COUNT(*) as total 
        FROM Bins B
        LEFT JOIN Warehouses W ON B.WarehouseID = W.WarehouseID
        LEFT JOIN StorageTypes ST ON B.StorageTypeID = ST.StorageTypeID
        LEFT JOIN Slocs SL ON B.SlocID = SL.SlocID
        ${whereClause}`;

    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;

    const query = `
        SELECT 
            B.*, -- VITAL FIX: Select all columns from Bins (B) to get all IDs
            W.WarehouseName, 
            C.CompartmentName,  -- Compartment Name
            S.StackName,        -- Stack Name
            ST.StorageTypeName, 
            PT.PalletName AS PalletTypeName,
            SL.SlocName 
        FROM Bins B
        LEFT JOIN Warehouses W ON B.WarehouseID = W.WarehouseID
        LEFT JOIN Compartments C ON B.CompartmentID = C.CompartmentID 
        LEFT JOIN Stacks S ON B.StackID = S.StackID -- Join alias S
        LEFT JOIN StorageTypes ST ON B.StorageTypeID = ST.StorageTypeID
        LEFT JOIN PalletTypes PT ON B.PalletTypeID = PT.PalletTypeID
        LEFT JOIN Slocs SL ON B.SlocID = SL.SlocID
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
    throw new CustomError(`Error fetching all Bins: ${err.message}`);
  }
}

async function addBin(pool, values) {
  try {
    const {
      BinNumber,
      WarehouseID,
      CompartmentID,
      StackID,
      StorageTypeID,
      SlocID,
      XCoordinate,
      YCoordinate,
      ZCoordinate,
      PalletTypeID = null,
      MaxPallets = null,
      MaxWeightKG = null,
      MaxVolumeM3 = null,
      CheckDigit = null,
      IsActive,
      user_id,
    } = values;

    // VITAL FIX 1: Construct BinCoordinates from X, Y, Z
    const BinCoordinates = `${XCoordinate}-${YCoordinate}-${ZCoordinate}`;

    if (
      !BinNumber ||
      !WarehouseID ||
      !CompartmentID ||
      !StackID ||
      !StorageTypeID ||
      !SlocID ||
      XCoordinate === undefined ||
      YCoordinate === undefined ||
      ZCoordinate === undefined ||
      IsActive === undefined ||
      !user_id
    ) {
      throw new CustomError(
        "All mandatory Bin fields (BinNumber, Warehouse, Compartment, Stack, Sloc, Coordinates, Storage Type) must be provided."
      );
    }

    // Check for duplicate BinNumber within the same warehouse
    const duplicateCheck = await pool
      .request()
      .input("BinNumber", sql.NVarChar(50), BinNumber)
      .input("WarehouseID", sql.Int, WarehouseID)
      .query(
        "SELECT COUNT(*) as BinCount FROM Bins WHERE BinNumber = @BinNumber AND WarehouseID = @WarehouseID AND IsDeleted = 0"
      );
    if (duplicateCheck.recordset[0].BinCount > 0) {
      throw new CustomError(
        `A Bin with number '${BinNumber}' already exists in this warehouse.`
      );
    }

    // Check for duplicate coordinates within the same stack (best practice for 3D location)
    const duplicateCoordCheck = await pool
      .request()
      .input("StackID", sql.Int, StackID)
      .input("X", sql.Int, XCoordinate)
      .input("Y", sql.Int, YCoordinate)
      .input("Z", sql.Int, ZCoordinate)
      .query(
        "SELECT COUNT(*) as CoordCount FROM Bins WHERE StackID = @StackID AND XCoordinate = @X AND YCoordinate = @Y AND ZCoordinate = @Z AND IsDeleted = 0"
      );
    if (duplicateCoordCheck.recordset[0].CoordCount > 0) {
      throw new CustomError(
        `A Bin already exists at coordinates (${XCoordinate}, ${YCoordinate}, ${ZCoordinate}) within this Stack.`
      );
    }

    const query = `
        DECLARE @OutputTable TABLE (BinID INT);
        INSERT INTO Bins (BinNumber, WarehouseID, CompartmentID, StackID, StorageTypeID, SlocID,
                          XCoordinate, YCoordinate, ZCoordinate, BinCoordinates, PalletTypeID, MaxPallets, 
                          MaxWeightKG, MaxVolumeM3, CheckDigit, IsActive, CreatedBy, UpdatedBy)
        OUTPUT INSERTED.BinID INTO @OutputTable
        VALUES (@BinNumber, @WarehouseID, @CompartmentID, @StackID, @StorageTypeID, @SlocID, 
                @XCoordinate, @YCoordinate, @ZCoordinate, @BinCoordinates, @PalletTypeID, @MaxPallets, 
                @MaxWeightKG, @MaxVolumeM3, @CheckDigit, @IsActive, @UserID, @UserID);
        SELECT BinID FROM @OutputTable;
    `;
    const result = await pool
      .request()
      .input("BinNumber", sql.NVarChar(50), BinNumber)
      .input("WarehouseID", sql.Int, WarehouseID)
      .input("CompartmentID", sql.Int, CompartmentID)
      .input("StackID", sql.Int, StackID)
      .input("StorageTypeID", sql.Int, StorageTypeID)
      .input("SlocID", sql.Int, SlocID)
      .input("XCoordinate", sql.Int, XCoordinate)
      .input("YCoordinate", sql.Int, YCoordinate)
      .input("ZCoordinate", sql.Int, ZCoordinate)
      .input("BinCoordinates", sql.NVarChar(50), BinCoordinates) // VITAL FIX 2: Added BinCoordinates input
      .input("PalletTypeID", sql.Int, PalletTypeID)
      .input("MaxPallets", sql.Int, MaxPallets)
      .input("MaxWeightKG", sql.Decimal(10, 2), MaxWeightKG)
      .input("MaxVolumeM3", sql.Decimal(10, 2), MaxVolumeM3)
      .input("CheckDigit", sql.NVarChar(10), CheckDigit)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id)
      .query(query);

    const newId = result.recordset[0].BinID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_BIN",
      moduleName: MODULE_NAME,
      referenceID: newId,
      details: { newData: values },
    });
    return getBin(pool, newId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new Bin: ${err.message}`);
  }
}

async function updateBin(pool, values) {
  try {
    const { BinID, ...updateData } = values;
    if (!BinID) throw new CustomError("BinID is required for update.");

    const original = await getBin(pool, BinID);

    const {
      BinNumber,
      WarehouseID,
      CompartmentID,
      StackID,
      StorageTypeID,
      SlocID,
      XCoordinate,
      YCoordinate,
      ZCoordinate,
      PalletTypeID = null,
      MaxPallets = null,
      MaxWeightKG = null,
      MaxVolumeM3 = null,
      CheckDigit = null,
      IsActive,
      user_id,
    } = updateData;

    // VITAL FIX 3: Construct BinCoordinates from X, Y, Z for update
    const BinCoordinates = `${XCoordinate}-${YCoordinate}-${ZCoordinate}`;

    // Check for duplicate BinNumber within the same warehouse (excluding current BinID)
    const duplicateCheck = await pool
      .request()
      .input("BinNumber", sql.NVarChar(50), BinNumber)
      .input("WarehouseID", sql.Int, WarehouseID)
      .input("ID", sql.Int, BinID)
      .query(
        "SELECT COUNT(*) as BinCount FROM Bins WHERE BinNumber = @BinNumber AND WarehouseID = @WarehouseID AND IsDeleted = 0 AND BinID != @ID"
      );
    if (duplicateCheck.recordset[0].BinCount > 0) {
      throw new CustomError(
        `A Bin with number '${BinNumber}' already exists in this warehouse.`
      );
    }

    // Check for duplicate coordinates within the same stack (excluding current BinID)
    const duplicateCoordCheck = await pool
      .request()
      .input("StackID", sql.Int, StackID)
      .input("X", sql.Int, XCoordinate)
      .input("Y", sql.Int, YCoordinate)
      .input("Z", sql.Int, ZCoordinate)
      .input("ID", sql.Int, BinID)
      .query(
        "SELECT COUNT(*) as CoordCount FROM Bins WHERE StackID = @StackID AND XCoordinate = @X AND YCoordinate = @Y AND ZCoordinate = @Z AND IsDeleted = 0 AND BinID != @ID"
      );
    if (duplicateCoordCheck.recordset[0].CoordCount > 0) {
      throw new CustomError(
        `A Bin already exists at coordinates (${XCoordinate}, ${YCoordinate}, ${ZCoordinate}) within this Stack.`
      );
    }

    const query = `
          UPDATE Bins SET
              BinNumber = @BinNumber, 
              WarehouseID = @WarehouseID, 
              CompartmentID = @CompartmentID, 
              StackID = @StackID,
              StorageTypeID = @StorageTypeID,
              SlocID = @SlocID, 
              XCoordinate = @XCoordinate, 
              YCoordinate = @YCoordinate, 
              ZCoordinate = @ZCoordinate,
              BinCoordinates = @BinCoordinates, -- VITAL FIX 4: Updated BinCoordinates
              PalletTypeID = @PalletTypeID,
              MaxPallets = @MaxPallets,
              MaxWeightKG = @MaxWeightKG,
              MaxVolumeM3 = @MaxVolumeM3,
              CheckDigit = @CheckDigit,
              IsActive = @IsActive, 
              UpdatedBy = @UpdatedBy, 
              UpdatedDate = GETDATE()
          WHERE BinID = @ID;
      `;
    const updateRequest = pool
      .request()
      .input("ID", sql.Int, BinID)
      .input("BinNumber", sql.NVarChar(50), BinNumber)
      .input("WarehouseID", sql.Int, WarehouseID)
      .input("CompartmentID", sql.Int, CompartmentID)
      .input("StackID", sql.Int, StackID)
      .input("StorageTypeID", sql.Int, StorageTypeID)
      .input("SlocID", sql.Int, SlocID)
      .input("XCoordinate", sql.Int, XCoordinate)
      .input("YCoordinate", sql.Int, YCoordinate)
      .input("ZCoordinate", sql.Int, ZCoordinate)
      .input("BinCoordinates", sql.NVarChar(50), BinCoordinates) // VITAL FIX 5: Added BinCoordinates input
      .input("PalletTypeID", sql.Int, PalletTypeID)
      .input("MaxPallets", sql.Int, MaxPallets)
      .input("MaxWeightKG", sql.Decimal(10, 2), MaxWeightKG)
      .input("MaxVolumeM3", sql.Decimal(10, 2), MaxVolumeM3)
      .input("CheckDigit", sql.NVarChar(10), CheckDigit)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id);

    await updateRequest.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_BIN",
      moduleName: MODULE_NAME,
      referenceID: BinID,
      details: { oldData: original, newData: updateData },
    });

    return getBin(pool, BinID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating Bin: ${err.message}`);
  }
}

async function deleteBin(pool, values) {
  try {
    const { BinID, user_id } = values;
    if (!BinID) throw new CustomError("BinID is required for deletion.");
    const toDelete = await getBin(pool, BinID);

    const query = `
        UPDATE Bins SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE BinID = @ID;
    `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, BinID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_BIN",
      moduleName: MODULE_NAME,
      referenceID: BinID,
      details: { deletedData: toDelete },
    });
    return { message: "Bin deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting Bin: ${err.message}`);
  }
}

async function getBinsLite(pool, values) {
  try {
    const { StackID = null, CompartmentID = null } = values;
    let request = pool.request();
    let whereClauses = ["IsDeleted = 0", "IsActive = 1"];

    if (StackID) {
      whereClauses.push("StackID = @StackID");
      request.input("StackID", sql.Int, StackID);
    } else if (CompartmentID) {
      // This is a placeholder for more complex filtering if needed
    }

    const whereClause =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    let query = `
        SELECT BinID, BinNumber, XCoordinate, YCoordinate, ZCoordinate
        FROM Bins 
        ${whereClause}
        ORDER BY BinNumber
    `;
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching Bins list: ${err.message}`);
  }
}

module.exports = {
  getBin,
  getAllBins,
  addBin,
  updateBin,
  deleteBin,
  getBinsLite,
};
