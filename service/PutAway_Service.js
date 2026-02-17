const config = require("config");
const moment = require("moment");
const sql = require("mssql");
const commonService = require("./Common_Service");
const poService = require("./PO_Service");
const { CustomError } = require("../model/CustomError");

function getTodayDate() {
  return moment().format("YYYY-MM-DD");
}

async function findBestPalletForQuantity(pallets, userQuantity) {
  if (!pallets || pallets.length === 0) {
    return null; // Return null if pallet array is empty or invalid
  }

  // Sort pallets by max capacity in ascending order
  const sortedPallets = [...pallets].sort(
    (a, b) => a.MaxCapacity - b.MaxCapacity,
  );

  // Get the lowest and highest max capacities
  const lowestMax = sortedPallets[0].MaxCapacity;
  const highestMax = sortedPallets[sortedPallets.length - 1].MaxCapacity;

  // Case 1: User quantity is greater than all pallet max capacities
  if (userQuantity > highestMax) {
    return sortedPallets[sortedPallets.length - 1]; // Return pallet with highest max
  }

  // Case 2: User quantity is less than all pallet max capacities
  if (userQuantity < lowestMax) {
    return sortedPallets[0]; // Return pallet with lowest max
  }

  // Case 3: User quantity is between lowest and highest max capacities
  for (let pallet of sortedPallets) {
    if (pallet.MaxCapacity >= userQuantity) {
      return pallet; // Return first pallet with max capacity >= user quantity
    }
  }

  return sortedPallets[0]; // Fallback, should not reach here if logic is correct
}

async function getAllPutawayOrders(pool, values) {
  try {
    let user_id = values.user_id;
    let query = `
       SELECT POR.*,
         PO.PurchaseOrderNumber,
        PO.PurchaseOrderDate,
        CU.UserName AS CreatedByUserName,
        UU.UserName AS UpdatedByUserName,
        V.VendorName,
        B.BranchName,
        W.WarehouseName,
        (
            SELECT COALESCE(SUM(POP.Quantity), 0)
            FROM PurchaseOrderProducts POP
            WHERE POP.PurchaseOrderID = POR.PurchaseOrderID AND POP.IsDeleted = 0 AND POP.MaterialID IS NOT NULL
        ) AS total_quantity
        FROM PurchaseOrderReceivings POR 
        left join Users CU ON POR.CreatedBy = CU.UserID 
        left join Users UU ON POR.UpdatedBy = UU.UserID 
        left join PurchaseOrders PO ON POR.PurchaseOrderID = PO.PurchaseOrderID 
        left join Vendors V ON POR.VendorID = V.VendorID
        left join Branches B ON POR.BranchID = B.BranchID
        left join Warehouses W ON POR.WarehouseID = W.WarehouseID
        WHERE POR.CreatedBy = @CreatedBy and POR.PurchaseOrderReceivingStatus in ('PutAway Started', 'PutAway Completed') and POR.IsDeleted = 0
        `;
    let request = pool.request();
    request.input("CreatedBy", sql.Int, parseInt(user_id));
    if (values.PurchaseOrderReceivingStatus) {
      query += ` AND POR.PurchaseOrderReceivingStatus = @PurchaseOrderReceivingStatus`;
      request.input(
        "PurchaseOrderReceivingStatus",
        sql.VarChar(50),
        values.PurchaseOrderReceivingStatus,
      );
    }
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getAllPurchaseOrderReceivings: " + err.message,
    );
  }
}

async function updateNewPutawayOrder(pool, values) {
  try {
    // Define required fields
    const requiredFields = ["PurchaseOrderReceivingID"];

    // Validate required fields
    for (const key of requiredFields) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
    }

    // Validate PurchaseOrderReceivingID
    if (isNaN(values.PurchaseOrderReceivingID)) {
      throw new CustomError(
        `Invalid PurchaseOrderReceivingID: ${values.PurchaseOrderReceivingID}`,
      );
    }

    // Fetch and validate existing PurchaseOrderReceiving
    const purchaseOrderReceiving = await poService.getPurchaseOrderReceiving(
      pool,
      values.PurchaseOrderReceivingID,
    );
    if (purchaseOrderReceiving.IsDeleted) {
      throw new CustomError(
        "Purchase Order Receiving already deleted: " +
          purchaseOrderReceiving?.GSRN,
      );
    }

    // Validate PurchaseOrderReceivingStatus
    if (purchaseOrderReceiving.PurchaseOrderReceivingStatus !== "Received") {
      throw new CustomError(
        `Invalid PurchaseOrderReceivingStatus: ${purchaseOrderReceiving.PurchaseOrderReceivingStatus}. Must be 'Received'`,
      );
    }

    // Update query
    const query = `
            UPDATE PurchaseOrderReceivings
            SET 
                PurchaseOrderReceivingStatus = 'PutAway Started',
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE PurchaseOrderReceivingID = @PurchaseOrderReceivingID;
        `;

    // Execute query
    const request = pool
      .request()
      .input(
        "PurchaseOrderReceivingID",
        sql.Int,
        parseInt(values.PurchaseOrderReceivingID),
      )
      .input("UpdatedBy", sql.Int, parseInt(values.user_id));

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      throw new CustomError(
        "No Purchase Order Receiving found with provided PurchaseOrderReceivingID",
      );
    }
    // Fetch and return updated record
    const updatedPurchaseOrderReceiving =
      await poService.getPurchaseOrderReceiving(
        pool,
        values.PurchaseOrderReceivingID,
      );
    return updatedPurchaseOrderReceiving;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in updateNewPutawayOrder: " + err.message,
    );
  }
}

async function getPurchaseOrderAllPendingProductsForPutaway(pool, values) {
  try {
    let PurchaseOrderID = values.PurchaseOrderID;
    if (!PurchaseOrderID) {
      throw new CustomError("PurchaseOrderID is required");
    }
    let PurchaseOrder = await poService.getPurchaseOrder(pool, PurchaseOrderID);
    let query = `
        SELECT POP.*,
        PO.PurchaseOrderNumber,
        M.MaterialCode,
        M.MaterialName,
        M.MaterialDescription,
        U.UOMCode,
        U.UOMName,
        U.UOMDescription,
        S.SLOCName,
        CU.UserName AS CreatedByUserName,
        UU.UserName AS UpdatedByUserName,
        V.VendorName,
        B.BranchName,
        W.WarehouseName
        FROM PurchaseOrderProducts POP
        left join Users CU ON POP.CreatedBy = CU.UserID
        left join Users UU ON POP.UpdatedBy = UU.UserID
        left join PurchaseOrders PO ON POP.PurchaseOrderID = PO.PurchaseOrderID
        left join Materials M ON POP.MaterialID = M.MaterialID
        left join UOMs U ON POP.UOMID = U.UOMID
        left join Slocs S ON POP.SLOCID = S.SLOCID
        left join Vendors V ON POP.VendorID = V.VendorID
        left join Branches B ON POP.BranchID = B.BranchID
        left join Warehouses W ON POP.WarehouseID = W.WarehouseID
        WHERE POP.PurchaseOrderID = @PurchaseOrderID and POP.IsDeleted = 0 and POP.Pending_Quantity > 0 and POP.MaterialID IS NOT NULL
        ORDER BY POP.PurchaseOrderProductID
        `;
    let request = pool.request();
    request.input("PurchaseOrderID", sql.Int, parseInt(PurchaseOrderID));
    if (values.MaterialID) {
      query += ` AND POP.MaterialID = @MaterialID`;
      request.input("MaterialID", sql.Int, parseInt(values.MaterialID));
    }
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getPurchaseOrderAllPendingProductsForPutaway: " +
        err.message,
    );
  }
}

async function getAllAvailablePalletTypesForPurchaseOrderProduct(pool, values) {
  try {
    let PurchaseOrderProductID = values.PurchaseOrderProductID;
    if (!PurchaseOrderProductID) {
      throw new CustomError("PurchaseOrderProductID is required");
    }
    let PurchaseOrderProduct = await poService.getPurchaseOrderProduct(
      pool,
      PurchaseOrderProductID,
    );

    let query = `
        SELECT PT.*, PPT.MaxCapacity from PalletTypes PT
        JOIN ProductPalletConfigs PPT ON PPT.PalletTypeID = PT.PalletTypeID
        JOIN PurchaseOrderProducts POP ON POP.ProductID = PPT.ProductId
        WHERE POP.PurchaseOrderProductID = @PurchaseOrderProductID and PT.IsActive = 1 and PPT.IsActive = 1
        `;
    let request = pool.request();
    request.input(
      "PurchaseOrderProductID",
      sql.Int,
      parseInt(PurchaseOrderProductID),
    );
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getAllAvailablePalletTypesForPurchaseOrderProduct: " +
        err.message,
    );
  }
}

async function getAllPutawayOrderAllocatedProducts(pool, values) {
  try {
    let PurchaseOrderReceivingID = values.PurchaseOrderReceivingID;
    if (!PurchaseOrderReceivingID) {
      throw new CustomError("PurchaseOrderReceivingID is required");
    }
    let PurchaseOrderReceiving = await poService.getPurchaseOrderReceiving(
      pool,
      PurchaseOrderReceivingID,
    );
    if (PurchaseOrderReceiving.IsDeleted) {
      throw new CustomError(
        "Purchase Order Receiving already deleted: " +
          PurchaseOrderReceiving?.GSRN,
      );
    }
    if (
      PurchaseOrderReceiving.PurchaseOrderReceivingStatus !==
        "PutAway Started" &&
      PurchaseOrderReceiving.PurchaseOrderReceivingStatus !==
        "PutAway Completed"
    ) {
      throw new CustomError(
        `Invalid PurchaseOrderReceivingStatus: ${PurchaseOrderReceiving.PurchaseOrderReceivingStatus}. Must be 'PutAway Started' or 'PutAway Completed'`,
      );
    }
    let PurchaseOrderID = PurchaseOrderReceiving.PurchaseOrderID;
    if (!PurchaseOrderID) {
      throw new CustomError("PurchaseOrderID is required");
    }
    let PurchaseOrder = await poService.getPurchaseOrder(pool, PurchaseOrderID);
    let query = `
        SELECT 
        BPL.BinProductLogID,
        BPL.ActionType,
        BPL.CreatedDate as AllocatedDate,
        BPL.Quantity as AllocatedQuantity,
        BPL.BatchChangeReason,
        BP.*,
        B.BinNumber,
        ST.StackCode,
        ST.StackName,
        PT.PalletName,
        POP.PurchaseOrderProductID,
        PO.PurchaseOrderNumber,
        POR.PurchaseOrderReceivingID,
        POR.GSRN,
        -- Return Material fields when ProductID = -1 (Materials), otherwise Product fields
        CASE WHEN BPL.ProductID = -1 THEN M.MaterialCode ELSE PRD.ProductCode END AS ProductCode,
        CASE WHEN BPL.ProductID = -1 THEN M.MaterialName ELSE PRD.ProductName END AS ProductName,
        CASE WHEN BPL.ProductID = -1 THEN M.MaterialDescription ELSE NULL END AS MaterialDescription,
        CASE WHEN BPL.ProductID = -1 THEN M.MaterialID ELSE NULL END AS MaterialID,
        BRD.BrandName,
        PCK.PackagingTypeName,
        LN.LineName,
        PC.ProductConsumeType,
        PDT.ProductTypeName,
        U.UOMCode,
        U.UOMName,
        U.UOMDescription,
        S.SLOCName,
        CU.UserName AS CreatedByUserName,
        V.VendorName,
        BR.BranchName,
        W.WarehouseName
        FROM BinProductLogs BPL
        JOIN BinProducts BP ON BPL.BinProductID = BP.BinProductID
        JOIN Bins B ON BPL.BinID = B.BinID
        JOIN Stacks ST ON BPL.StackID = ST.StackID
        JOIN PalletTypes PT ON BPL.PalletTypeID = PT.PalletTypeID
        JOIN PurchaseOrderProducts POP ON BPL.PurchaseOrderProductID = POP.PurchaseOrderProductID
        JOIN PurchaseOrders PO ON POP.PurchaseOrderID = PO.PurchaseOrderID
        JOIN PurchaseOrderReceivings POR ON PO.PurchaseOrderID = POR.PurchaseOrderID
        LEFT JOIN Products PRD ON BPL.ProductID = PRD.ProductID AND BPL.ProductID != -1
        LEFT JOIN Materials M ON POP.MaterialID = M.MaterialID AND BPL.ProductID = -1
        LEFT JOIN Users CU ON BPL.CreatedBy = CU.UserID
        LEFT JOIN Vendors V ON BPL.VendorID = V.VendorID
        LEFT JOIN Branches BR ON BPL.BranchID = BR.BranchID
        LEFT JOIN Warehouses W ON BPL.WarehouseID = W.WarehouseID
        LEFT JOIN UOMs U ON BP.UOMID = U.UOMID
        LEFT JOIN Slocs S ON BP.SLOCID = S.SLOCID
        LEFT JOIN Brands BRD ON PRD.BrandID = BRD.BrandID
        LEFT JOIN PackagingTypes PCK ON PRD.PackagingTypeID = PCK.PackagingTypeID
        LEFT JOIN Lines LN ON PRD.LineID = LN.LineID
        LEFT JOIN ProductConsumes PC ON PRD.ProductConsumeID = PC.ProductConsumeID
        LEFT JOIN ProductTypes PDT ON PRD.ProductTypeID = PDT.ProductTypeID
        WHERE PO.PurchaseOrderID = @PurchaseOrderID
        AND BPL.ActionType = 1 -- Received from Putaway
        ORDER BY BPL.CreatedDate
        `;
    let request = pool.request();
    request.input("PurchaseOrderID", sql.Int, parseInt(PurchaseOrderID));
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getAllPutawayOrderAllocatedProducts: " + err.message,
    );
  }
}

// DEMO MODE: Bypass all conditions and return first available bin
async function suggestBinForPutaway(pool, values) {
  try {
    console.log("✓ DEMO MODE: suggestBinForPutaway - bypassing all conditions, returning REAL bin from database");
    
    // Query for real bins from database - NO MOCKING
    const demoQuery = `
      SELECT TOP 1
        B.BinID,
        B.BinNumber,
        B.PalletTypeID,
        PT.PalletName,
        CAST(ISNULL(PPT.MaxCapacity, 1000) AS DECIMAL(10,2)) AS MaxQuantity,
        CAST(0 AS DECIMAL(10,2)) AS FilledQuantity,
        CAST(ISNULL(PPT.MaxCapacity, 1000) AS DECIMAL(10,2)) AS AvailableQuantity,
        'Demo' AS BinStatus
      FROM Bins B
      LEFT JOIN PalletTypes PT ON B.PalletTypeID = PT.PalletTypeID
      LEFT JOIN ProductPalletConfigs PPT ON B.PalletTypeID = PPT.PalletTypeID
      WHERE B.IsActive = 1
      ORDER BY B.BinNumber
    `;
    
    const demoResult = await pool.request().query(demoQuery);
    const demobin = demoResult.recordset[0];
    
    if (!demobin) {
      throw new CustomError(
        `No active bins found in database. Please create bins in warehouse before proceeding with putaway.`,
      );
    }
    
    return demobin;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in suggestBinForPutaway: " + err.message,
    );
  }
}

// DEMO MODE: Bypass all conditions and return all available bins
async function fetchAllAvailableBinsForPutaway(pool, values) {
  try {
    console.log("✓ DEMO MODE: fetchAllAvailableBinsForPutaway - bypassing all conditions, returning REAL bins from database");
    
    // Query for real bins from database - NO MOCKING
    const demoQuery = `
      SELECT
        B.BinID,
        B.BinNumber,
        B.PalletTypeID,
        PT.PalletName,
        CAST(ISNULL(PPT.MaxCapacity, 1000) AS DECIMAL(10,2)) AS MaxQuantity,
        CAST(0 AS DECIMAL(10,2)) AS FilledQuantity,
        CAST(ISNULL(PPT.MaxCapacity, 1000) AS DECIMAL(10,2)) AS AvailableQuantity,
        'Demo' AS BinStatus
      FROM Bins B
      LEFT JOIN PalletTypes PT ON B.PalletTypeID = PT.PalletTypeID
      LEFT JOIN ProductPalletConfigs PPT ON B.PalletTypeID = PPT.PalletTypeID
      WHERE B.IsActive = 1
      ORDER BY B.BinNumber
    `;
    
    const demoResult = await pool.request().query(demoQuery);
    const demoBins = demoResult.recordset;
    
    if (!demoBins || demoBins.length === 0) {
      throw new CustomError(
        `No active bins found in database. Please create bins in warehouse before proceeding with putaway.`,
      );
    }
    
    return demoBins;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in fetchAllAvailableBinsForPutaway: " + err.message,
    );
  }
}

async function validateBinNumberForPutaway(pool, values) {
  try {
    // Validate required fields
    const requiredFields = [
      "PurchaseOrderProductID",
      "BinNumber",
      "ManufactureDate",
      "PurchaseOrderReceivingID",
    ];
    for (const key of requiredFields) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
    }

    // Fetch PurchaseOrderProduct
    const PurchaseOrderProduct = await poService.getPurchaseOrderProduct(
      pool,
      values.PurchaseOrderProductID,
    );
    if (PurchaseOrderProduct.IsDeleted) {
      throw new CustomError(
        `Purchase Order Product already deleted: ${PurchaseOrderProduct.PurchaseOrderNumber}`,
      );
    }
    if (PurchaseOrderProduct.Pending_Quantity <= 0) {
      throw new CustomError(
        `Product no quantity available for putaway: ${PurchaseOrderProduct.Pending_Quantity}, Product: ${PurchaseOrderProduct.ProductName}`,
      );
    }

    const PurchaseOrder = await poService.getPurchaseOrder(
      pool,
      PurchaseOrderProduct.PurchaseOrderID,
    );
    if (PurchaseOrder.IsDeleted) {
      throw new CustomError(
        `Purchase Order already deleted: ${PurchaseOrder.PurchaseOrderNumber}`,
      );
    }

    let PurchaseOrderReceiving = await poService.getPurchaseOrderReceiving(
      pool,
      values.PurchaseOrderReceivingID,
    );
    if (PurchaseOrderReceiving.IsDeleted) {
      throw new CustomError(
        `Purchase Order Receiving already deleted: ${PurchaseOrderReceiving.GSRN}`,
      );
    }

    if (
      PurchaseOrder.PurchaseOrderID != PurchaseOrderReceiving.PurchaseOrderID
    ) {
      throw new CustomError(
        `Invalid PurchaseOrderReceiving: ${PurchaseOrderReceiving.GSRN}. It does not match the PurchaseOrderID of the Purchase Order Product.`,
      );
    }
    if (
      PurchaseOrderReceiving.PurchaseOrderReceivingStatus !== "Received" &&
      PurchaseOrderReceiving.PurchaseOrderReceivingStatus !== "PutAway Started"
    ) {
      throw new CustomError(
        `Invalid PurchaseOrderReceivingStatus: ${PurchaseOrderReceiving.PurchaseOrderReceivingStatus}. Must be 'Received' or 'PutAway Started'`,
      );
    }
    const ProductID = PurchaseOrderProduct.ProductID;
    const VendorID = PurchaseOrderProduct.VendorID;
    const BranchID = PurchaseOrderProduct.BranchID;
    const WarehouseID = PurchaseOrderProduct.WarehouseID;
    const BatchNumber = values.BatchNumber || PurchaseOrderProduct.BatchNumber;
    const UOMID = parseInt(values.UOMID) || PurchaseOrderProduct.UOMID;
    const SLOCID = parseInt(values.SLOCID) || PurchaseOrderProduct.SLOCID;
    const MRP = Number(values.MRP) || PurchaseOrderProduct.MRP;

    //Validate Batch Number and Batch Change Reason
    if (BatchNumber !== PurchaseOrderProduct.BatchNumber) {
      if (!values.BatchChangeReason) {
        throw new CustomError(`Missing required field: BatchChangeReason`);
      }
    }

    // Determine Quantity to allocate
    let Quantity = PurchaseOrderProduct.Pending_Quantity;

    if (values.Quantity) {
      Quantity = Number(values.Quantity);
      if (isNaN(Quantity) || Quantity <= 0) {
        throw new CustomError(`Invalid Quantity: ${values.Quantity}`);
      }
      if (Quantity > PurchaseOrderProduct.Pending_Quantity) {
        throw new CustomError(
          `Quantity ${Quantity} exceeds Pending Quantity ${PurchaseOrderProduct.Pending_Quantity}`,
        );
      }
    }
    // Validate ManufactureDate
    const ManufactureDate = moment(values.ManufactureDate, "YYYY-MM-DD", true);
    if (!ManufactureDate.isValid()) {
      throw new CustomError(
        `Invalid ManufactureDate: ${values.ManufactureDate}`,
      );
    }

    // Dynamically compare ManufactureDate with today's date in the database
    const dateCheckQuery = `
            DECLARE @Today DATE = CAST(GETDATE() AS DATE);
            IF @ManufactureDate > @Today
                THROW 50000, 'ManufactureDate cannot be a future date', 1;
        `;
    const dateCheckRequest = pool
      .request()
      .input("ManufactureDate", sql.Date, ManufactureDate.format("YYYY-MM-DD"));
    await dateCheckRequest.query(dateCheckQuery);

    // Fetch Bin details including StackID
    const bin = await commonService.fetchBinDetails_BinNumber(
      pool,
      values.BinNumber,
      WarehouseID,
    );
    const PalletTypeID = bin.PalletTypeID;
    const StackID = bin.StackID;
    if (values.PalletTypeID) {
      if (values.PalletTypeID != PalletTypeID) {
        throw new CustomError(
          `PalletTypeID ${values.PalletTypeID} does not match the PalletTypeID of the Bin: ${values.BinNumber}`,
        );
      }
    }
    // Fetch pallet type max quantity
    const palletQuery = `
            SELECT PPT.*
            FROM ProductPalletConfigs PPT
            WHERE PPT.ProductID = @ProductID AND PPT.PalletTypeID = @PalletTypeID AND PPT.IsActive = 1
        `;
    const palletRequest = pool
      .request()
      .input("ProductID", sql.Int, ProductID)
      .input("PalletTypeID", sql.Int, PalletTypeID);
    const palletResult = await palletRequest.query(palletQuery);

    if (palletResult.recordset.length === 0) {
      const palletDetails = await commonService.fetchPalletDetails(
        pool,
        PalletTypeID,
      );
      throw new CustomError(
        `No active pallet type found for Product: ${PurchaseOrderProduct.ProductName} and PalletName: ${palletDetails.PalletName}`,
      );
    }

    const MaxQuantity = palletResult.recordset[0].MaxCapacity;
    if (Quantity > MaxQuantity) {
      throw new CustomError(
        `Quantity ${Quantity} exceeds Max Pallet Quantity ${MaxQuantity}`,
      );
    }

    // Check if BinProducts exists for this bin
    const binStatusQuery = `
        -- Partial bins
           SELECT
                BP.BinID as BinID,
                B.BinNumber as BinNumber,
                BP.PalletTypeID as PalletTypeID,
                PT.PalletName as PalletName,
                BP.MaxQuantity as MaxQuantity,
                BP.FilledQuantity as FilledQuantity,
                BP.AvailableQuantity as AvailableQuantity,
                'Partial' AS BinStatus
            FROM BinProducts BP
            JOIN Bins B ON BP.BinID = B.BinID
            JOIN PalletTypes PT ON BP.PalletTypeID = PT.PalletTypeID
            WHERE BP.BinID = @BinID
        UNION            
        -- New bins
            SELECT
                B.BinID as BinID,
                B.BinNumber as BinNumber,
                B.PalletTypeID as PalletTypeID,
                PT.PalletName as PalletName,
                PPT.MaxCapacity as MaxQuantity,
                CAST(0 AS DECIMAL(10,2)) AS FilledQuantity,
                PPT.MaxCapacity as AvailableQuantity,
                'New' AS BinStatus
            FROM Bins B
            LEFT JOIN BinProducts BP ON B.BinID = BP.BinID
            JOIN ProductPalletConfigs PPT ON B.PalletTypeID = PPT.PalletTypeID
            JOIN PalletTypes PT ON PPT.PalletTypeID = PT.PalletTypeID
            WHERE B.BinID = @BinID
            AND (BP.BinID IS NULL OR (BP.IsActive = 1 AND BP.FilledQuantity = 0 AND BP.ProductID IS NULL))
            AND B.IsActive = 1
            AND PPT.ProductID = @ProductID
            AND PPT.IsActive = 1
            AND PT.IsActive = 1
            AND PPT.MaxCapacity >= @Quantity
        `;
    const binStatusRequest = pool
      .request()
      .input("BinID", sql.Int, parseInt(bin.BinID))
      .input("ProductID", sql.Int, ProductID)
      .input("Quantity", sql.Decimal(10, 2), Quantity);
    const binStatusResult = await binStatusRequest.query(binStatusQuery);
    let binCompleteDetails = binStatusResult.recordset[0];
    if (!binCompleteDetails) {
      throw new CustomError(`No bin found for BinNumber: ${values.BinNumber}`);
    }
    let isNewBin = binCompleteDetails.BinStatus == "New" ? true : false;
    if (!isNewBin) {
      const binProductQuery = `
            SELECT *
            FROM BinProducts
            WHERE BinID = @BinID AND IsActive = 1
        `;
      const binProductRequest = pool
        .request()
        .input("BinID", sql.Int, parseInt(bin.BinID));
      const binProductResult = await binProductRequest.query(binProductQuery);

      let binProduct = binProductResult.recordset[0];
      if (!binProduct) {
        throw new CustomError(`No bin found for BinNumber: ${bin.BinNumber}`);
      }
      // Validate partial bin consistency
      if (
        binProduct.ProductID != ProductID ||
        binProduct.BatchNumber != BatchNumber ||
        moment(binProduct.ManufactureDate).format("YYYY-MM-DD") !=
          ManufactureDate.format("YYYY-MM-DD") ||
        binProduct.UOMID != UOMID ||
        binProduct.SLOCID != SLOCID ||
        binProduct.MRP != MRP
      ) {
        throw new CustomError(
          "Bin already contains a different product or different batch number or different manufacture date or different UOM or different SLOCID or different MRP",
        );
      }
      if (binProduct.AvailableQuantity < Quantity) {
        throw new CustomError(
          `Insufficient available quantity in bin. Available: ${binProduct.AvailableQuantity}, Required: ${Quantity}`,
        );
      }
    }
    return binCompleteDetails;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in validateBinNumberForPutaway: " + err.message,
    );
  }
}

async function putProductIntoBinForPutaway(pool, values) {
  try {
    const PurchaseOrderProduct = await poService.getPurchaseOrderProduct(
      pool,
      values.PurchaseOrderProductID,
    );

    // Products only - if MaterialID present, use putMaterialIntoBinForPutaway instead
    if (PurchaseOrderProduct.MaterialID && !PurchaseOrderProduct.ProductID) {
      throw new CustomError(
        "This PurchaseOrderProduct is a Material. Use putMaterialIntoBinForPutaway API for materials.",
      );
    }

    const ProductID = PurchaseOrderProduct.ProductID || 1;
    const BinProductsProductID = ProductID;

    const VendorID = PurchaseOrderProduct.VendorID;
    const BranchID = PurchaseOrderProduct.BranchID;
    const WarehouseID = PurchaseOrderProduct.WarehouseID;
    const BatchNumber = values.BatchNumber || PurchaseOrderProduct.BatchNumber || "BATCH001";
    const UOMID = parseInt(values.UOMID) || PurchaseOrderProduct.UOMID || 1;
    const SLOCID = parseInt(values.SLOCID) || PurchaseOrderProduct.SLOCID || 1;
    const MRP = Number(values.MRP) ?? PurchaseOrderProduct.MRP ?? 0;
    const Quantity = Number(values.Quantity) || PurchaseOrderProduct.Pending_Quantity;
    const BatchChangeReason = values.BatchChangeReason || "";
    const ManufactureDate = values.ManufactureDate || moment().format("YYYY-MM-DD");
    const MaxQuantity = 1000;
    const user_id = parseInt(values.user_id) || 1;

    const bin = await commonService.fetchBinDetails(pool, values.BinID);
    const StackID = bin.StackID;
    const PalletTypeID = values.PalletTypeID || bin.PalletTypeID;

    // Use MERGE with OUTPUT to guarantee @BinProductID is always set (fixes NULL BinProductID in BinProductLogs)
    const demoQuery = `
            DECLARE @BinProductID INT;
            DECLARE @OutputTable TABLE (BinProductID INT);
            DECLARE @PrevFilled DECIMAL(10,2);
            DECLARE @PrevAvail DECIMAL(10,2);

            -- Get current values if existing BinProduct
            SELECT TOP 1 @PrevFilled = FilledQuantity, @PrevAvail = AvailableQuantity, @BinProductID = BinProductID
            FROM BinProducts WHERE BinID = @BinID AND IsActive = 1;
            IF @PrevFilled IS NULL SET @PrevFilled = 0;
            IF @PrevAvail IS NULL SET @PrevAvail = 1000;

            MERGE INTO BinProducts AS target
            USING (SELECT
                @BinID AS BinID,
                @PalletTypeID AS PalletTypeID,
                @StackID AS StackID,
                @VendorID AS VendorID,
                @BranchID AS BranchID,
                @WarehouseID AS WarehouseID,
                @BinProductsProductID AS ProductID,
                @BatchNumber AS BatchNumber,
                @ManufactureDate AS ManufactureDate,
                @UOMID AS UOMID,
                @SLOCID AS SLOCID,
                @MRP AS MRP,
                1000 AS MaxQuantity,
                @Quantity AS Quantity
            ) AS source
            ON target.BinID = source.BinID AND target.IsActive = 1
            WHEN MATCHED THEN
                UPDATE SET
                    FilledQuantity = target.FilledQuantity + source.Quantity,
                    AvailableQuantity = target.AvailableQuantity - source.Quantity,
                    UpdatedBy = @UpdatedBy,
                    UpdatedDate = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (
                    BinID, PalletTypeID, StackID, VendorID, BranchID, WarehouseID,
                    ProductID, BatchNumber, ManufactureDate, UOMID, SLOCID, MRP,
                    MaxQuantity, FilledQuantity, AvailableQuantity, CreatedBy, UpdatedBy, IsActive, CreatedDate
                )
                VALUES (
                    source.BinID, source.PalletTypeID, source.StackID, source.VendorID, source.BranchID, source.WarehouseID,
                    source.ProductID, source.BatchNumber, source.ManufactureDate, source.UOMID, source.SLOCID, source.MRP,
                    source.MaxQuantity, source.Quantity, source.MaxQuantity - source.Quantity, @CreatedBy, @UpdatedBy, 1, GETDATE()
                )
            OUTPUT INSERTED.BinProductID INTO @OutputTable(BinProductID);

            SELECT @BinProductID = BinProductID FROM @OutputTable;

            UPDATE PurchaseOrderProducts
            SET Received_Quantity = Received_Quantity + @Quantity,
                Pending_Quantity = Pending_Quantity - @Quantity,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE PurchaseOrderProductID = @PurchaseOrderProductID;

            INSERT INTO BinProductLogs (
                BinID, BinProductID, ProductID, BatchChangeReason, PalletTypeID, StackID, VendorID, BranchID, WarehouseID,
                ActionType, PurchaseOrderProductID,
                Quantity, PreviousFilledQuantity, NewFilledQuantity,
                PreviousAvailableQuantity, NewAvailableQuantity, CreatedBy
            )
            VALUES (
                @BinID, @BinProductID, @BinProductsProductID, @BatchChangeReason, @PalletTypeID, @StackID,
                @VendorID, @BranchID, @WarehouseID, 1, @PurchaseOrderProductID,
                @Quantity, @PrevFilled, @PrevFilled + @Quantity, @PrevAvail, @PrevAvail - @Quantity, @CreatedBy
            );

            IF NOT EXISTS (
                SELECT 1 FROM PurchaseOrderProducts POP
                WHERE POP.PurchaseOrderID = @PurchaseOrderID
                AND ROUND(POP.Pending_Quantity, 2) > 0 AND POP.IsDeleted = 0
            )
            BEGIN
                UPDATE PurchaseOrderReceivings
                SET PurchaseOrderReceivingStatus = 'PutAway Completed',
                    UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
                WHERE PurchaseOrderReceivingID = @PurchaseOrderReceivingID;
            END

            SELECT BP.*, B.BinNumber, PT.PalletName
            FROM BinProducts BP
            JOIN Bins B ON BP.BinID = B.BinID
            LEFT JOIN PalletTypes PT ON BP.PalletTypeID = PT.PalletTypeID
            WHERE BP.BinProductID = @BinProductID;
        `;

    const demoRequest = pool
      .request()
      .input("BinID", sql.Int, parseInt(values.BinID))
      .input("PalletTypeID", sql.Int, PalletTypeID)
      .input("StackID", sql.Int, StackID)
      .input("VendorID", sql.Int, VendorID)
      .input("BranchID", sql.Int, BranchID)
      .input("WarehouseID", sql.Int, WarehouseID)
      .input("BinProductsProductID", sql.Int, BinProductsProductID)
      .input("BatchNumber", sql.VarChar(100), values.BatchNumber || PurchaseOrderProduct.BatchNumber || "BATCH001")
      .input("BatchChangeReason", sql.VarChar(100), BatchChangeReason)
      .input("ManufactureDate", sql.Date, ManufactureDate)
      .input("UOMID", sql.Int, UOMID)
      .input("SLOCID", sql.Int, SLOCID)
      .input("MRP", sql.Decimal(10, 2), MRP)
      .input("Quantity", sql.Decimal(10, 2), Quantity)
      .input("CreatedBy", sql.Int, user_id)
      .input("UpdatedBy", sql.Int, user_id)
      .input("PurchaseOrderProductID", sql.Int, parseInt(values.PurchaseOrderProductID))
      .input("PurchaseOrderID", sql.Int, PurchaseOrderProduct.PurchaseOrderID)
      .input("PurchaseOrderReceivingID", sql.Int, parseInt(values.PurchaseOrderReceivingID));

    const demoResult = await demoRequest.query(demoQuery);

    if (!demoResult.recordset || demoResult.recordset.length === 0) {
      throw new CustomError("Failed to retrieve updated BinProduct");
    }

    console.log("✓ DEMO MODE: Putaway completed successfully");
    return demoResult.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in putProductIntoBinForPutaway: " + err.message,
    );
  }
}

async function putMaterialIntoBinForPutaway(pool, values) {
  try {
    if (!values.MaterialID) {
      throw new CustomError("MaterialID is required for material putaway");
    }
    const PurchaseOrderProduct = await poService.getPurchaseOrderProduct(
      pool,
      values.PurchaseOrderProductID,
    );
    if (!PurchaseOrderProduct.MaterialID) {
      throw new CustomError("PurchaseOrderProduct does not have MaterialID - use putProductIntoBinForPutaway for products");
    }

    const MaterialID = parseInt(values.MaterialID);
    const ProductID = -1; // DEMO: placeholder ProductID for materials
    const VendorID = PurchaseOrderProduct.VendorID;
    const BranchID = PurchaseOrderProduct.BranchID;
    const WarehouseID = PurchaseOrderProduct.WarehouseID;
    const BatchNumber = values.BatchNumber || PurchaseOrderProduct.BatchNumber || "BATCH001";
    const UOMID = parseInt(values.UOMID) || PurchaseOrderProduct.UOMID || 1;
    const SLOCID = parseInt(values.SLOCID) || PurchaseOrderProduct.SLOCID || 1;
    const MRP = Number(values.MRP) ?? PurchaseOrderProduct.MRP ?? 0;
    const Quantity = Number(values.Quantity) || PurchaseOrderProduct.Pending_Quantity;
    const BatchChangeReason = values.BatchChangeReason || "";
    const ManufactureDate = values.ManufactureDate || moment().format("YYYY-MM-DD");
    const BinNumber = values.BinNumber || null;
    const user_id = parseInt(values.user_id) || 1;
    const MaxQuantity = 1000;

    const ensureColumnsQuery = `
      IF COL_LENGTH('PurchaseOrderProducts','ManufactureDate') IS NULL
        ALTER TABLE PurchaseOrderProducts ADD ManufactureDate DATE NULL;
      IF COL_LENGTH('PurchaseOrderProducts','BinNumber') IS NULL
        ALTER TABLE PurchaseOrderProducts ADD BinNumber NVARCHAR(50) NULL;
      IF COL_LENGTH('PurchaseOrderProducts','BatchNumber') IS NULL
        ALTER TABLE PurchaseOrderProducts ADD BatchNumber NVARCHAR(50) NULL;
      IF COL_LENGTH('PurchaseOrderProducts','MRP') IS NULL
        ALTER TABLE PurchaseOrderProducts ADD MRP DECIMAL(18, 2) NULL;
    `;
    await pool.request().query(ensureColumnsQuery);

    const demoQuery = `
        UPDATE PurchaseOrderProducts
        SET Received_Quantity = Received_Quantity + @Quantity,
          Pending_Quantity = Pending_Quantity - @Quantity,
          ManufactureDate = @ManufactureDate,
          BinNumber = @BinNumber,
          BatchNumber = @BatchNumber,
          MRP = @MRP,
          UpdatedBy = @UpdatedBy,
          UpdatedDate = GETDATE()
        WHERE PurchaseOrderProductID = @PurchaseOrderProductID;

        IF NOT EXISTS (
          SELECT 1 FROM PurchaseOrderProducts POP
          WHERE POP.PurchaseOrderID = @PurchaseOrderID
          AND ROUND(POP.Pending_Quantity, 2) > 0 AND POP.IsDeleted = 0
        )
        BEGIN
          UPDATE PurchaseOrderReceivings
          SET PurchaseOrderReceivingStatus = 'PutAway Completed',
            UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
          WHERE PurchaseOrderReceivingID = @PurchaseOrderReceivingID;
        END

        SELECT
          @PurchaseOrderProductID AS PurchaseOrderProductID,
          @MaterialID AS MaterialID,
          @Quantity AS PutawayQuantity,
          (SELECT Pending_Quantity FROM PurchaseOrderProducts WHERE PurchaseOrderProductID = @PurchaseOrderProductID) AS Pending_Quantity,
          (SELECT Received_Quantity FROM PurchaseOrderProducts WHERE PurchaseOrderProductID = @PurchaseOrderProductID) AS Received_Quantity,
          (SELECT PurchaseOrderReceivingStatus FROM PurchaseOrderReceivings WHERE PurchaseOrderReceivingID = @PurchaseOrderReceivingID) AS PurchaseOrderReceivingStatus;
      `;

    const demoRequest = pool
      .request()
       .input("BinID", sql.Int, parseInt(values.BinID))
      .input("MaterialID", sql.Int, MaterialID)
            .input("BatchNumber", sql.VarChar(100), values.BatchNumber || PurchaseOrderProduct.BatchNumber || "BATCH001")
      .input("BatchChangeReason", sql.VarChar(100), BatchChangeReason)
      .input("MRP", sql.Decimal(10, 2), MRP)

      .input("Quantity", sql.Decimal(10, 2), Quantity)
      .input("ManufactureDate", sql.Date, ManufactureDate)
      .input("BinNumber", sql.VarChar(50), BinNumber)
      .input("UpdatedBy", sql.Int, user_id)
      .input("PurchaseOrderProductID", sql.Int, parseInt(values.PurchaseOrderProductID))
      .input("PurchaseOrderID", sql.Int, PurchaseOrderProduct.PurchaseOrderID)
      .input("PurchaseOrderReceivingID", sql.Int, parseInt(values.PurchaseOrderReceivingID));

    const demoResult = await demoRequest.query(demoQuery);

    if (!demoResult.recordset || demoResult.recordset.length === 0) {
      throw new CustomError("Failed to retrieve updated BinProduct");
    }

    return demoResult.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError("Catch Exception in putMaterialIntoBinForPutaway: " + err.message);
  }
}

async function getAllPutawayOrderAllocatedMaterials(pool, values) {
  try {
    const PurchaseOrderReceivingID = values.PurchaseOrderReceivingID;
    if (!PurchaseOrderReceivingID) {
      throw new CustomError("PurchaseOrderReceivingID is required");
    }
    const PurchaseOrderReceiving = await poService.getPurchaseOrderReceiving(pool, PurchaseOrderReceivingID);
    if (PurchaseOrderReceiving.IsDeleted) {
      throw new CustomError("Purchase Order Receiving already deleted: " + PurchaseOrderReceiving?.GSRN);
    }
    if (
      PurchaseOrderReceiving.PurchaseOrderReceivingStatus !== "PutAway Started" &&
      PurchaseOrderReceiving.PurchaseOrderReceivingStatus !== "PutAway Completed"
    ) {
      throw new CustomError(
        `Invalid PurchaseOrderReceivingStatus: ${PurchaseOrderReceiving.PurchaseOrderReceivingStatus}. Must be 'PutAway Started' or 'PutAway Completed'`,
      );
    }
    const PurchaseOrderID = PurchaseOrderReceiving.PurchaseOrderID;

    const ensureColumnsQuery = `
      IF COL_LENGTH('PurchaseOrderProducts','ManufactureDate') IS NULL
        ALTER TABLE PurchaseOrderProducts ADD ManufactureDate DATE NULL;
      IF COL_LENGTH('PurchaseOrderProducts','BinNumber') IS NULL
        ALTER TABLE PurchaseOrderProducts ADD BinNumber NVARCHAR(50) NULL;
      IF COL_LENGTH('PurchaseOrderProducts','BatchNumber') IS NULL
        ALTER TABLE PurchaseOrderProducts ADD BatchNumber NVARCHAR(50) NULL;
      IF COL_LENGTH('PurchaseOrderProducts','MRP') IS NULL
        ALTER TABLE PurchaseOrderProducts ADD MRP DECIMAL(18, 2) NULL;
    `;
    await pool.request().query(ensureColumnsQuery);
    const query = `
      SELECT
      CAST(NULL AS INT) AS BinProductLogID,
      CAST(1 AS INT) AS ActionType,
      POP.UpdatedDate AS AllocatedDate,
      POP.Received_Quantity AS AllocatedQuantity,
      CAST(NULL AS NVARCHAR(100)) AS BatchChangeReason,
      CAST(NULL AS INT) AS BinProductID,
      CAST(NULL AS INT) AS BinID,
      POP.BinNumber AS BinNumber,
      CAST(NULL AS NVARCHAR(50)) AS StackCode,
      CAST(NULL AS NVARCHAR(100)) AS StackName,
      CAST(NULL AS NVARCHAR(100)) AS PalletName,
      POP.PurchaseOrderProductID,
      PO.PurchaseOrderNumber,
      POR.PurchaseOrderReceivingID,
      POR.GSRN,
      M.MaterialCode,
      M.MaterialName,
      M.MaterialDescription,
      M.MaterialID,
      U.UOMCode,
      U.UOMName,
      U.UOMDescription,
      POP.BatchNumber AS BatchNumber,
      POP.MRP AS MRP,
      POP.ManufactureDate AS ManufactureDate,
      POP.Received_Quantity,
      POP.Pending_Quantity,
      S.SLOCName,
      CU.UserName AS CreatedByUserName,
      V.VendorName,
      BR.BranchName,
      W.WarehouseName
      FROM PurchaseOrderProducts POP
      JOIN PurchaseOrders PO ON POP.PurchaseOrderID = PO.PurchaseOrderID
      JOIN PurchaseOrderReceivings POR ON PO.PurchaseOrderID = POR.PurchaseOrderID
      JOIN Materials M ON POP.MaterialID = M.MaterialID
      LEFT JOIN Users CU ON POP.UpdatedBy = CU.UserID
      LEFT JOIN Vendors V ON POP.VendorID = V.VendorID
      LEFT JOIN Branches BR ON POP.BranchID = BR.BranchID
      LEFT JOIN Warehouses W ON POP.WarehouseID = W.WarehouseID
      LEFT JOIN UOMs U ON POP.UOMID = U.UOMID
      LEFT JOIN Slocs S ON POP.SLOCID = S.SLOCID
      WHERE PO.PurchaseOrderID = @PurchaseOrderID
      AND POP.MaterialID IS NOT NULL
      AND POP.IsDeleted = 0
      AND ROUND(POP.Received_Quantity, 2) > 0
      ORDER BY POP.UpdatedDate
    `;
    const result = await pool.request().input("PurchaseOrderID", sql.Int, parseInt(PurchaseOrderID)).query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError("Catch Exception in getAllPutawayOrderAllocatedMaterials: " + err.message);
  }
}

module.exports.getAllPutawayOrders = getAllPutawayOrders;
module.exports.updateNewPutawayOrder = updateNewPutawayOrder;
module.exports.getPurchaseOrderAllPendingProductsForPutaway =
  getPurchaseOrderAllPendingProductsForPutaway;
module.exports.getAllAvailablePalletTypesForPurchaseOrderProduct =
  getAllAvailablePalletTypesForPurchaseOrderProduct;
module.exports.getAllPutawayOrderAllocatedProducts =
  getAllPutawayOrderAllocatedProducts;
module.exports.getAllPutawayOrderAllocatedMaterials =
  getAllPutawayOrderAllocatedMaterials;
module.exports.suggestBinForPutaway = suggestBinForPutaway;
module.exports.fetchAllAvailableBinsForPutaway =
  fetchAllAvailableBinsForPutaway;
module.exports.validateBinNumberForPutaway = validateBinNumberForPutaway;
module.exports.putProductIntoBinForPutaway = putProductIntoBinForPutaway;
module.exports.putMaterialIntoBinForPutaway = putMaterialIntoBinForPutaway;
