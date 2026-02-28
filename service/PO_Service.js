const config = require("config");
const moment = require("moment");
const sql = require("mssql");
const commonService = require("./Common_Service");
const { CustomError } = require("../model/CustomError");

async function getNewPurchaseOrder(pool, values) {
  try {
    let dateStr = moment(new Date()).format("YYYYMMDD");

    // Get the count of POs created today to generate sequence number
    let countQuery = `
      SELECT COUNT(*) as countToday
      FROM PurchaseOrders
      WHERE CONVERT(DATE, PurchaseOrderDate) = CONVERT(DATE, GETDATE())
    `;
    let countResult = await pool.request().query(countQuery);
    let sequence = (countResult.recordset[0].countToday + 1)
      .toString()
      .padStart(4, "0");

    let newPurchaseOrder = {
      PurchaseOrderNumber: `PO${dateStr}${sequence}`,
      PurchaseOrderDate: moment(new Date()).format("YYYY-MM-DD"),
      CreatedBy: values.user_id,
      UpdatedBy: values.user_id,
    };
    let query = `
                DECLARE @OutputTable TABLE (
                        PurchaseOrderID INT
                );
                INSERT INTO PurchaseOrders (
                    PurchaseOrderNumber, PurchaseOrderDate, CreatedBy, UpdatedBy
                )
                OUTPUT 
                    INSERTED.PurchaseOrderID
                INTO @OutputTable
                VALUES (
                    @PurchaseOrderNumber, @PurchaseOrderDate, @CreatedBy, @UpdatedBy
                );
                SELECT * FROM @OutputTable;
            `;
    let request = pool
      .request()
      .input(
        "PurchaseOrderNumber",
        sql.VarChar(50),
        newPurchaseOrder.PurchaseOrderNumber,
      )
      .input("PurchaseOrderDate", sql.Date, newPurchaseOrder.PurchaseOrderDate)
      .input("CreatedBy", sql.VarChar(100), newPurchaseOrder.CreatedBy)
      .input("UpdatedBy", sql.VarChar(100), newPurchaseOrder.UpdatedBy);
    let result = await request.query(query);
    let insertedRecordId = result.recordset[0].PurchaseOrderID;
    let PurchaseOrder = await getPurchaseOrder(pool, insertedRecordId);
    return PurchaseOrder;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getNewPurchaseOrder: " + err.message,
    );
  }
}

async function getPurchaseOrder(pool, PurchaseOrderID) {
  try {
    if (!PurchaseOrderID) {
      throw new CustomError("PurchaseOrderID is required");
    }
    const input = String(PurchaseOrderID).trim();
    const isNumeric = /^\d+$/.test(input);
    let query = `
        SELECT PO.*,
        CU.UserName AS CreatedByUserName,
        UU.UserName AS UpdatedByUserName,
        V.VendorName,
        B.BranchName,
        W.WarehouseName,
        C.CarrierName,
        PR.PackingRequirementName,
        CP.CarrierPreferenceName,
        (
            SELECT COALESCE(SUM(POP.Quantity), 0)
            FROM PurchaseOrderProducts POP
            WHERE POP.PurchaseOrderID = PO.PurchaseOrderID AND POP.IsDeleted = 0
        ) AS total_quantity
        FROM PurchaseOrders PO 
        left join Users CU ON PO.CreatedBy = CU.UserID 
        left join Users UU ON PO.UpdatedBy = UU.UserID 
        left join Vendors V ON PO.VendorID = V.VendorID
        left join Branches B ON PO.BranchID = B.BranchID
        left join Warehouses W ON PO.WarehouseID = W.WarehouseID
        left join Carriers C ON PO.CarrierID = C.CarrierID
        left join PackingRequirements PR ON PO.PackingRequirementID = PR.PackingRequirementID
        left join CarrierPreferences CP ON PO.CarrierPreferenceID = CP.CarrierPreferenceID
        `;
    let request = pool.request();
    if (isNumeric) {
      query += ` WHERE PO.PurchaseOrderID = @PurchaseOrderID`;
      request.input("PurchaseOrderID", sql.Int, parseInt(input));
    } else {
      query += ` WHERE PO.PurchaseOrderNumber = @PurchaseOrderID`;
      request.input("PurchaseOrderID", sql.VarChar(20), input);
    }
    let result = await request.query(query);
    if (result.recordset.length === 0) {
      throw new CustomError("No purchase order found with the given ID");
    }
    let PurchaseOrder = result.recordset[0];
    if (PurchaseOrder.PurchaseOrderStatus == "New") {
      PurchaseOrder.PurchaseOrderStatus = "Draft";
    }
    if (PurchaseOrder.IsDeleted) {
      throw new CustomError(
        "Purchase Order already deleted: " + PurchaseOrder?.PurchaseOrderNumber,
      );
    }
    return PurchaseOrder;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getPurchaseOrder: " + err.message,
    );
  }
}

async function getAllPurchaseOrders(pool, values) {
  try {
    let user_id = values.user_id;
    let query = `
        SELECT PO.*,
        CU.UserName AS CreatedByUserName,
        UU.UserName AS UpdatedByUserName,
        V.VendorName,
        B.BranchName,
        W.WarehouseName,
        C.CarrierName,
        PR.PackingRequirementName,
        CP.CarrierPreferenceName,
        (
            SELECT COALESCE(SUM(POP.Quantity), 0)
            FROM PurchaseOrderProducts POP
            WHERE POP.PurchaseOrderID = PO.PurchaseOrderID AND POP.IsDeleted = 0
        ) AS total_quantity
        FROM PurchaseOrders PO 
        left join Users CU ON PO.CreatedBy = CU.UserID 
        left join Users UU ON PO.UpdatedBy = UU.UserID 
        left join Vendors V ON PO.VendorID = V.VendorID
        left join Branches B ON PO.BranchID = B.BranchID
        left join Warehouses W ON PO.WarehouseID = W.WarehouseID
        left join Carriers C ON PO.CarrierID = C.CarrierID
        left join PackingRequirements PR ON PO.PackingRequirementID = PR.PackingRequirementID
        left join CarrierPreferences CP ON PO.CarrierPreferenceID = CP.CarrierPreferenceID
        WHERE PO.CreatedBy = @CreatedBy and PO.PurchaseOrderStatus != 'New' and PO.IsDeleted = 0
        `;
    if (values.PurchaseOrderStatus) {
      query += ` AND PO.PurchaseOrderStatus = @PurchaseOrderStatus`;
    }
    let request = pool.request();
    request.input("CreatedBy", sql.Int, parseInt(user_id));
    if (values.PurchaseOrderStatus) {
      request.input(
        "PurchaseOrderStatus",
        sql.VarChar(50),
        values.PurchaseOrderStatus,
      );
    }
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getAllPurchaseOrders: " + err.message,
    );
  }
}

async function updatePurchaseOrder(pool, values) {
  try {
    let requiredItems = [
      "PurchaseOrderID",
      "DeliveryDate",
      "PurchaseOrderStatus",
      "VendorID",
      "BranchID",
      "WarehouseID",
      "DeliveryAddress",
      "PersonInChargeInternal",
      "PersonInChargeVendor",
      "CarrierID",
      "Remarks",
    ];
    let PurchaseOrder;
    for (const key of requiredItems) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
      if (key == "PurchaseOrderID") {
        if (isNaN(values[key])) {
          throw new CustomError(`Invalid PurchaseOrderID: ${values[key]}`);
        }
        PurchaseOrder = await getPurchaseOrder(pool, values[key]);
      }
      if (key == "DeliveryDate") {
        let date = moment(values[key], "YYYY-MM-DD", true);
        let today = moment();
        if (!date.isValid()) {
          throw new CustomError(`Invalid DeliveryDate: ${values[key]}`);
        }
        if (date.isBefore(today)) {
          throw new CustomError(
            `DeliveryDate cannot be in the past: ${values[key]}`,
          );
        }
        if (date.isAfter(today.add(30, "days"))) {
          throw new CustomError(
            `DeliveryDate cannot be more than 30 days in the future: ${values[key]}`,
          );
        }
      }
      if (key == "PurchaseOrderStatus") {
        if (
          values[key] != "Draft" &&
          values[key] != "Open" &&
          values[key] != "Cancelled"
        ) {
          throw new CustomError(
            `Invalid Purchase Order with status: ${values.PurchaseOrderStatus}, It should be 'Draft', 'Open' or 'Cancelled'`,
          );
        }
      }
    }
    if (
      PurchaseOrder.PurchaseOrderStatus == "Completed" ||
      PurchaseOrder.PurchaseOrderStatus == "Cancelled"
    ) {
      throw new CustomError(
        `Cannot update Purchase Order with status: ${PurchaseOrder.PurchaseOrderStatus}`,
      );
    }
    let user_id = values.user_id;
    let query = `
        UPDATE PurchaseOrders
        SET 
            DeliveryDate = @DeliveryDate,
            PurchaseOrderStatus = @PurchaseOrderStatus,
            VendorID = @VendorID,
            BranchID = @BranchID,
            WarehouseID = @WarehouseID,
            DeliveryAddress = @DeliveryAddress,
            PersonInChargeInternal = @PersonInChargeInternal,
            PersonInChargeVendor = @PersonInChargeVendor,
            CarrierID = @CarrierID,
            VehicleNumber = @VehicleNumber,
            LRNumber = @LRNumber,
            PackingRequirementID = @PackingRequirementID,
            CarrierPreferenceID = @CarrierPreferenceID,
            Remarks = @Remarks,
            UpdatedBy = @UpdatedBy,
            UpdatedDate = GETDATE()
        WHERE PurchaseOrderID = @PurchaseOrderID
        `;
    let request = pool.request();
    request
      .input("PurchaseOrderID", sql.Int, parseInt(values.PurchaseOrderID))
      .input("DeliveryDate", sql.Date, values.DeliveryDate)
      .input("PurchaseOrderStatus", sql.VarChar(20), values.PurchaseOrderStatus)
      .input("VendorID", sql.Int, parseInt(values.VendorID))
      .input("BranchID", sql.Int, parseInt(values.BranchID))
      .input("WarehouseID", sql.Int, parseInt(values.WarehouseID))
      .input("DeliveryAddress", sql.VarChar(500), values.DeliveryAddress)
      .input(
        "PersonInChargeInternal",
        sql.VarChar(100),
        values.PersonInChargeInternal,
      )
      .input(
        "PersonInChargeVendor",
        sql.VarChar(100),
        values.PersonInChargeVendor,
      )
      .input("CarrierID", sql.Int, parseInt(values.CarrierID))
      .input("VehicleNumber", sql.VarChar(50), values.VehicleNumber || null)
      .input("LRNumber", sql.VarChar(50), values.LRNumber || null)
      .input("PackingRequirementID", sql.Int, values.PackingRequirementID ? parseInt(values.PackingRequirementID) : null)
      .input("CarrierPreferenceID", sql.Int, values.CarrierPreferenceID ? parseInt(values.CarrierPreferenceID) : null)
      .input("Remarks", sql.VarChar(500), values.Remarks)
      .input("UpdatedBy", sql.Int, parseInt(user_id));
    let result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      throw new CustomError("No purchase order found with the given ID");
    }
    let purchaseOrder = await getPurchaseOrder(pool, values.PurchaseOrderID);
    return purchaseOrder;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in updatePurchaseOrder: " + err.message,
    );
  }
}

async function deletePurchaseOrder(pool, values) {
  try {
    let items = ["PurchaseOrderID"];
    for (const key of items) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
      if (key == "PurchaseOrderID") {
        if (isNaN(values[key])) {
          throw new CustomError(`Invalid PurchaseOrderID: ${values[key]}`);
        }
        let PurchaseOrder = await getPurchaseOrder(pool, values[key]);
        if (PurchaseOrder.PurchaseOrderStatus !== "Draft") {
          throw new CustomError(
            `Cannot delete Purchase Order with status: ${PurchaseOrder.PurchaseOrderStatus}`,
          );
        }
        if (PurchaseOrder.IsDeleted) {
          throw new CustomError(
            `Purchase Order already deleted: ${PurchaseOrder?.PurchaseOrderNumber}`,
          );
        }
      }
    }
    let user_id = values.user_id;
    let query = `
        UPDATE PurchaseOrders
        SET 
            IsDeleted = 1,
            PurchaseOrderStatus = 'Deleted',
            UpdatedBy = @UpdatedBy,
            UpdatedDate = GETDATE()
        WHERE PurchaseOrderID = @PurchaseOrderID
        `;
    let request = pool.request();
    request
      .input("PurchaseOrderID", sql.Int, parseInt(values.PurchaseOrderID))
      .input("UpdatedBy", sql.Int, parseInt(user_id));
    let result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      throw new CustomError("No purchase order found with the given ID");
    }
    return "done";
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in deletePurchaseOrder: " + err.message,
    );
  }
}

async function addNewProductForPurchaseOrder(pool, values) {
  try {
    // Core required fields (excluding ProductID/MaterialID which are mutually exclusive)
    let items = [
      "PurchaseOrderID",
      "VendorID",
      "BranchID",
      "WarehouseID",
      "UOMID",
      "SLOCID",
      "BatchNumber",
      "Quantity",
      "MRP",
      "Discount",
    ];
    let PurchaseOrder;
    for (const key of items) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
      if (key == "PurchaseOrderID") {
        if (isNaN(values[key])) {
          throw new CustomError(`Invalid PurchaseOrderID: ${values[key]}`);
        }
        PurchaseOrder = await getPurchaseOrder(pool, values[key]);
      }
    }

    // Validate that at least ProductID OR MaterialID is provided
    if (!values.ProductID && !values.MaterialID) {
      throw new CustomError("Either ProductID or MaterialID is required");
    }
    if (values.ProductID && values.MaterialID) {
      throw new CustomError("Cannot specify both ProductID and MaterialID. Please provide only one.");
    }

    if (PurchaseOrder.PurchaseOrderStatus != "Draft") {
      throw new CustomError(
        `Cannot add Products with Purchase Order with status: ${PurchaseOrder.PurchaseOrderStatus}`,
      );
    }
    let Quantity = Number(values.Quantity);
    
    // Fetch item data (Product or Material)
    let ItemData;
    let ItemType;
    if (values.ProductID) {
      ItemData = await commonService.fetchProduct(pool, values.ProductID);
      ItemType = "Product";
    } else {
      // Fetch Material data
      const materialQuery = `SELECT * FROM Materials WHERE MaterialID = @MaterialID AND IsDeleted = 0`;
      const materialResult = await pool.request()
        .input("MaterialID", sql.Int, parseInt(values.MaterialID))
        .query(materialQuery);
      if (materialResult.recordset.length === 0) {
        throw new CustomError(`Material not found with ID: ${values.MaterialID}`);
      }
      ItemData = materialResult.recordset[0];
      ItemType = "Material";
    }
    let ProductData = ItemData; // Keep variable name for backward compatibility
    if (Quantity < ProductData.MinQty) {
      let currentProductQuantity = 0;
      let currentProductPayload = {
        PurchaseOrderID: values.PurchaseOrderID,
      };
      // Include ProductID or MaterialID in the payload
      if (values.ProductID) {
        currentProductPayload.ProductID = values.ProductID;
      }
      if (values.MaterialID) {
        currentProductPayload.MaterialID = values.MaterialID;
      }
      let currentPurchaseOrderProducts = await getPurchaseOrderAllProducts(
        pool,
        currentProductPayload,
      );
      if (currentPurchaseOrderProducts <= 0) {
        throw new CustomError(
          `Minimum Quantity for Product ${ProductData.ProductName} is ${ProductData.MinQty}, but provided quantity is ${Quantity}`,
        );
      }
      currentPurchaseOrderProducts.forEach((product) => {
        currentProductQuantity += product.Quantity;
      });
      if (currentProductQuantity + Quantity < ProductData.MinQty) {
        throw new CustomError(
          `Minimum Quantity for Product ${ProductData.ProductName} is ${ProductData.MinQty}, but provided quantity is ${Quantity} and existing quantity is ${currentProductQuantity} which makes total quantity less than minimum quantity`,
        );
      }
    }
    let user_id = values.user_id;

    let query = `
            MERGE INTO PurchaseOrderProducts AS target
            USING (SELECT 
                @PurchaseOrderID AS PurchaseOrderID, 
                @ProductID AS ProductID,
                @MaterialID AS MaterialID,
                @BatchNumber AS BatchNumber,
                @Quantity AS Quantity,
                @MRP AS MRP,
                @Discount AS Discount
            ) AS source
            ON target.PurchaseOrderID = source.PurchaseOrderID
            AND (target.ProductID = source.ProductID OR (target.ProductID IS NULL AND source.ProductID IS NULL))
            AND (target.MaterialID = source.MaterialID OR (target.MaterialID IS NULL AND source.MaterialID IS NULL))
            AND target.BatchNumber = source.BatchNumber
            AND target.IsDeleted = 0
            WHEN MATCHED THEN
                UPDATE SET 
                    VendorID = @VendorID,
                    BranchID = @BranchID,
                    WarehouseID = @WarehouseID,
                    UOMID = @UOMID,
                    SLOCID = @SLOCID,
                    Quantity = target.Quantity + source.Quantity,
                    Pending_Quantity = target.Quantity + source.Quantity,
                    Received_Quantity = 0,
                    MRP = source.MRP,
                    Discount = source.Discount,
                    Total_Product_MRP = (target.Quantity + source.Quantity) * source.MRP,
                    Total_Product_Discount = (target.Quantity + source.Quantity) * source.Discount,
                    Total_Product_Amount = ((target.Quantity + source.Quantity) * source.MRP) - ((target.Quantity + source.Quantity) * source.Discount),
                    UpdatedBy = @UpdatedBy,
                    UpdatedDate = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (
                    PurchaseOrderID,
                    VendorID,
                    BranchID,
                    WarehouseID,
                    ProductID,
                    MaterialID,
                    UOMID,
                    SLOCID,
                    BatchNumber,
                    Quantity,
                    Pending_Quantity,
                    Received_Quantity,
                    MRP,
                    Discount,
                    Total_Product_MRP,
                    Total_Product_Discount,
                    Total_Product_Amount,
                    CreatedBy,
                    UpdatedBy
                )
                VALUES (
                    @PurchaseOrderID,
                    @VendorID,
                    @BranchID,
                    @WarehouseID,
                    @ProductID,
                    @MaterialID,
                    @UOMID,
                    @SLOCID,
                    @BatchNumber,
                    @Quantity,
                    @Quantity,
                    0,
                    @MRP,
                    @Discount,
                    (@Quantity * @MRP),
                    (@Quantity * @Discount),
                    (@Quantity * @MRP) - (@Quantity * @Discount),
                    @CreatedBy,
                    @UpdatedBy
                )
            OUTPUT INSERTED.*;
        `;
    let request = pool
      .request()
      .input("PurchaseOrderID", sql.Int, parseInt(values.PurchaseOrderID))
      .input("VendorID", sql.Int, parseInt(values.VendorID))
      .input("BranchID", sql.Int, parseInt(values.BranchID))
      .input("WarehouseID", sql.Int, parseInt(values.WarehouseID))
      .input("ProductID", sql.Int, values.ProductID ? parseInt(values.ProductID) : null)
      .input("MaterialID", sql.Int, values.MaterialID ? parseInt(values.MaterialID) : null)
      .input("UOMID", sql.Int, parseInt(values.UOMID))
      .input("SLOCID", sql.Int, parseInt(values.SLOCID))
      .input("BatchNumber", sql.VarChar(50), values.BatchNumber)
      .input("Quantity", sql.Decimal(18, 2), values.Quantity)
      .input("MRP", sql.Decimal(18, 2), values.MRP)
      .input("Discount", sql.Decimal(18, 2), values.Discount)
      .input("CreatedBy", sql.Int, parseInt(user_id))
      .input("UpdatedBy", sql.Int, parseInt(user_id));

    let result = await request.query(query);
    let insertedRecordId = result.recordset[0].PurchaseOrderProductID;
    let PurchaseOrderProduct = await getPurchaseOrderProduct(
      pool,
      insertedRecordId,
    );
    return PurchaseOrderProduct;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in addNewProductForPurchaseOrder: " + err.message,
    );
  }
}

async function getPurchaseOrderProduct(pool, PurchaseOrderProductID) {
  try {
    const input = String(PurchaseOrderProductID).trim();
    let query = `
        SELECT POP.*,
        PO.PurchaseOrderNumber,
        PRD.ProductCode,
        PRD.ProductName,
        MAT.MaterialCode,
        MAT.MaterialName,
        COALESCE(PRD.ProductCode, MAT.MaterialCode) AS ItemCode,
        COALESCE(PRD.ProductName, MAT.MaterialName) AS ItemName,
        CASE 
            WHEN POP.MaterialID IS NOT NULL THEN 'Material'
            WHEN POP.ProductID IS NOT NULL THEN 'Product'
            ELSE NULL
        END AS ItemType,
        BR.BrandName,
        PCK.PackagingTypeName,
        LN.LineName,
        PC.ProductConsumeType,
        PT.ProductTypeName,
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
        left join Products PRD ON POP.ProductID = PRD.ProductID
        left join Materials MAT ON POP.MaterialID = MAT.MaterialID
        left join Brands BR ON PRD.BrandID = BR.BrandID
        left join PackagingTypes PCK ON PRD.PackagingTypeID = PCK.PackagingTypeID
        left join Lines LN ON PRD.LineID = LN.LineID
        left join ProductConsumes PC ON PRD.ProductConsumeID = PC.ProductConsumeID
        left join ProductTypes PT ON PRD.ProductTypeID = PT.ProductTypeID
        left join UOMs U ON POP.UOMID = U.UOMID
        left join Slocs S ON POP.SLOCID = S.SLOCID
        left join Vendors V ON POP.VendorID = V.VendorID
        left join Branches B ON POP.BranchID = B.BranchID
        left join Warehouses W ON POP.WarehouseID = W.WarehouseID
        WHERE POP.PurchaseOrderProductID = @PurchaseOrderProductID
        `;
    let request = pool.request();
    request.input("PurchaseOrderProductID", sql.Int, parseInt(input));
    let result = await request.query(query);
    if (result.recordset.length === 0) {
      throw new CustomError(
        `No purchase order product found with the given ID ${input}`,
      );
    }
    let PurchaseOrderProduct = result.recordset[0];
    if (PurchaseOrderProduct.IsDeleted) {
      throw new CustomError(
        "Purchase Order Product already deleted: " +
          PurchaseOrderProduct?.PurchaseOrderNumber,
      );
    }
    return PurchaseOrderProduct;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getPurchaseOrderProduct: " + err.message,
    );
  }
}

async function getPurchaseOrderAllProducts(pool, values) {
  try {
    let PurchaseOrderID = values.PurchaseOrderID;
    if (!PurchaseOrderID) {
      throw new CustomError("PurchaseOrderID is required");
    }
    let PurchaseOrder = await getPurchaseOrder(pool, PurchaseOrderID);
    let query = `
        SELECT POP.*,
        PO.PurchaseOrderNumber,
        PRD.ProductCode,
        PRD.ProductName,
        MAT.MaterialCode,
        MAT.MaterialName,
        COALESCE(PRD.ProductCode, MAT.MaterialCode) AS ItemCode,
        COALESCE(PRD.ProductName, MAT.MaterialName) AS ItemName,
        CASE 
            WHEN POP.MaterialID IS NOT NULL THEN 'Material'
            WHEN POP.ProductID IS NOT NULL THEN 'Product'
            ELSE NULL
        END AS ItemType,
        BR.BrandName,
        PCK.PackagingTypeName,
        LN.LineName,
        PC.ProductConsumeType,
        PT.ProductTypeName,
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
        left join Products PRD ON POP.ProductID = PRD.ProductID
        left join Materials MAT ON POP.MaterialID = MAT.MaterialID
        left join Brands BR ON PRD.BrandID = BR.BrandID
        left join PackagingTypes PCK ON PRD.PackagingTypeID = PCK.PackagingTypeID
        left join Lines LN ON PRD.LineID = LN.LineID
        left join ProductConsumes PC ON PRD.ProductConsumeID = PC.ProductConsumeID
        left join ProductTypes PT ON PRD.ProductTypeID = PT.ProductTypeID
        left join UOMs U ON POP.UOMID = U.UOMID
        left join Slocs S ON POP.SLOCID = S.SLOCID
        left join Vendors V ON POP.VendorID = V.VendorID
        left join Branches B ON POP.BranchID = B.BranchID
        left join Warehouses W ON POP.WarehouseID = W.WarehouseID
        WHERE POP.PurchaseOrderID = @PurchaseOrderID and POP.IsDeleted = 0
        `;
    let request = pool.request();
    request.input("PurchaseOrderID", sql.Int, parseInt(PurchaseOrderID));
    if (values.ProductID) {
      query += ` AND POP.ProductID = @ProductID`;
      request.input("ProductID", sql.Int, parseInt(values.ProductID));
    }
    if (values.MaterialID) {
      query += ` AND POP.MaterialID = @MaterialID`;
      request.input("MaterialID", sql.Int, parseInt(values.MaterialID));
    }
    query += ` ORDER BY POP.PurchaseOrderProductID`;
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getPurchaseOrderAllProducts: " + err.message,
    );
  }
}

async function updatePurchaseOrderProduct(pool, values) {
  try {
    // Core required fields (excluding ProductID/MaterialID which are mutually exclusive)
    let requiredFields = [
      "PurchaseOrderProductID",
      "PurchaseOrderID",
      "UOMID",
      "SLOCID",
      "BatchNumber",
      "Quantity",
      "MRP",
      "Discount",
    ];
    for (const key of requiredFields) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
    }
    
    // Validate that at least ProductID OR MaterialID is provided
    if (!values.ProductID && !values.MaterialID) {
      throw new CustomError("Either ProductID or MaterialID is required");
    }
    if (values.ProductID && values.MaterialID) {
      throw new CustomError("Cannot specify both ProductID and MaterialID. Please provide only one.");
    }
    if (isNaN(values.PurchaseOrderID)) {
      throw new CustomError(
        `Invalid PurchaseOrderID: ${values.PurchaseOrderID}`,
      );
    }
    const PurchaseOrder = await getPurchaseOrder(pool, values.PurchaseOrderID);
    if (PurchaseOrder.PurchaseOrderStatus !== "Draft") {
      throw new CustomError(
        `Cannot update Products with Purchase Order with status: ${PurchaseOrder.PurchaseOrderStatus}`,
      );
    }
    if (isNaN(values.PurchaseOrderProductID)) {
      throw new CustomError(
        `Invalid PurchaseOrderProductID: ${values.PurchaseOrderProductID}`,
      );
    }
    let PurchaseOrderProduct = await getPurchaseOrderProduct(
      pool,
      values.PurchaseOrderProductID,
    );
    if (PurchaseOrderProduct.IsDeleted) {
      throw new CustomError(
        "Purchase Order Product already deleted: " +
          PurchaseOrderProduct?.PurchaseOrderNumber,
      );
    }

    let Quantity = Number(values.Quantity);
    
    // Fetch item data (Product or Material)
    let ItemData;
    let ItemType;
    let ItemName;
    if (values.ProductID) {
      ItemData = await commonService.fetchProduct(pool, values.ProductID);
      ItemType = "Product";
      ItemName = ItemData.ProductName;
    } else {
      // Fetch Material data
      const materialQuery = `SELECT * FROM Materials WHERE MaterialID = @MaterialID AND IsDeleted = 0`;
      const materialResult = await pool.request()
        .input("MaterialID", sql.Int, parseInt(values.MaterialID))
        .query(materialQuery);
      if (materialResult.recordset.length === 0) {
        throw new CustomError(`Material not found with ID: ${values.MaterialID}`);
      }
      ItemData = materialResult.recordset[0];
      ItemType = "Material";
      ItemName = ItemData.MaterialName;
    }
    
    let ProductData = ItemData; // Keep variable name for backward compatibility
    if (Quantity < ProductData.MinQty) {
      let currentProductQuantity = 0;
      let currentProductPayload = {
        PurchaseOrderID: values.PurchaseOrderID,
      };
      // Include ProductID or MaterialID in the payload
      if (values.ProductID) {
        currentProductPayload.ProductID = values.ProductID;
      }
      if (values.MaterialID) {
        currentProductPayload.MaterialID = values.MaterialID;
      }
      let currentPurchaseOrderProducts = await getPurchaseOrderAllProducts(
        pool,
        currentProductPayload,
      );
      if (currentPurchaseOrderProducts <= 0) {
        throw new CustomError(
          `Minimum Quantity for ${ItemType} ${ItemName} is ${ProductData.MinQty}, but provided quantity is ${Quantity}`,
        );
      }
      currentPurchaseOrderProducts
        .filter(
          (product) =>
            product.PurchaseOrderProductID != values.PurchaseOrderProductID,
        )
        .forEach((product) => {
          currentProductQuantity += product.Quantity;
        });
      if (currentProductQuantity + Quantity < ProductData.MinQty) {
        throw new CustomError(
          `Minimum Quantity for ${ItemType} ${ItemName} is ${ProductData.MinQty}, but provided quantity is ${Quantity} and existing quantity is ${currentProductQuantity} which makes total quantity less than minimum quantity`,
        );
      }
    }

    const Total_Product_MRP = Number(values.Quantity) * Number(values.MRP) || 0;
    const Total_Product_Discount =
      Number(values.Quantity) * Number(values.Discount) || 0;
    const Total_Product_Amount = Total_Product_MRP - Total_Product_Discount;

    const query = `
            UPDATE PurchaseOrderProducts
            SET 
                ProductID = @ProductID,
                MaterialID = @MaterialID,
                UOMID = @UOMID,
                SLOCID = @SLOCID,
                BatchNumber = @BatchNumber,
                Quantity = @Quantity,
                Pending_Quantity = @Quantity,
                Received_Quantity = 0,
                MRP = @MRP,
                Discount = @Discount,
                Total_Product_MRP = @Total_Product_MRP,
                Total_Product_Discount = @Total_Product_Discount,
                Total_Product_Amount = @Total_Product_Amount,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE PurchaseOrderProductID = @PurchaseOrderProductID
        `;

    const request = pool
      .request()
      .input(
        "PurchaseOrderProductID",
        sql.Int,
        parseInt(values.PurchaseOrderProductID),
      )
      .input("ProductID", sql.Int, values.ProductID ? parseInt(values.ProductID) : null)
      .input("MaterialID", sql.Int, values.MaterialID ? parseInt(values.MaterialID) : null)
      .input("UOMID", sql.Int, parseInt(values.UOMID))
      .input("SLOCID", sql.Int, parseInt(values.SLOCID))
      .input("BatchNumber", sql.VarChar(50), values.BatchNumber)
      .input("Quantity", sql.Decimal(18, 2), values.Quantity)
      .input("MRP", sql.Decimal(18, 2), values.MRP)
      .input("Discount", sql.Decimal(18, 2), values.Discount)
      .input("Total_Product_MRP", sql.Decimal(18, 2), Total_Product_MRP)
      .input(
        "Total_Product_Discount",
        sql.Decimal(18, 2),
        Total_Product_Discount,
      )
      .input("Total_Product_Amount", sql.Decimal(18, 2), Total_Product_Amount)
      .input("UpdatedBy", sql.Int, parseInt(values.user_id));

    const result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      throw new CustomError(
        "No product found with provided PurchaseOrderProductID",
      );
    }
    PurchaseOrderProduct = await getPurchaseOrderProduct(
      pool,
      values.PurchaseOrderProductID,
    );
    return PurchaseOrderProduct;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in updateProductForPurchaseOrder: " + err.message,
    );
  }
}

async function deletePurchaseOrderProduct(pool, values) {
  try {
    if (!values.PurchaseOrderProductID) {
      throw new CustomError("Missing required field: PurchaseOrderProductID");
    }
    if (!values.PurchaseOrderID) {
      throw new CustomError("Missing required field: PurchaseOrderID");
    }
    if (isNaN(values.PurchaseOrderID)) {
      throw new CustomError(
        `Invalid PurchaseOrderID: ${values.PurchaseOrderID}`,
      );
    }
    const PurchaseOrder = await getPurchaseOrder(pool, values.PurchaseOrderID);
    if (PurchaseOrder.PurchaseOrderStatus !== "Draft") {
      throw new CustomError(
        `Cannot delete Products with Purchase Order with status: ${PurchaseOrder.PurchaseOrderStatus}`,
      );
    }
    if (isNaN(values.PurchaseOrderProductID)) {
      throw new CustomError(
        `Invalid PurchaseOrderProductID: ${values.PurchaseOrderProductID}`,
      );
    }
    let PurchaseOrderProduct = await getPurchaseOrderProduct(
      pool,
      values.PurchaseOrderProductID,
    );
    if (PurchaseOrderProduct.IsDeleted) {
      throw new CustomError(
        "Purchase Order Product already deleted: " +
          PurchaseOrderProduct?.PurchaseOrderNumber,
      );
    }
    const query = `
            UPDATE PurchaseOrderProducts
            SET 
                IsDeleted = 1,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE PurchaseOrderProductID = @PurchaseOrderProductID
        `;
    const request = pool
      .request()
      .input(
        "PurchaseOrderProductID",
        sql.Int,
        parseInt(values.PurchaseOrderProductID),
      )
      .input("UpdatedBy", sql.Int, parseInt(values.user_id));

    const result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      throw new CustomError(
        "No active product found with provided PurchaseOrderProductID",
      );
    }
    return "done";
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in deletePurchaseOrderProduct: " + err.message,
    );
  }
}

async function getNewPurchaseOrderReceiving(pool, values) {
  try {
    // Generate GSRN number with pattern: GSRN-YYYY-XXXX (e.g., GSRN-2026-0001)
    const currentYear = new Date().getFullYear();
    const countQuery = `
      SELECT COUNT(*) AS GSRNCount
      FROM PurchaseOrderReceivings
      WHERE YEAR(CreatedDate) = @CurrentYear AND IsDeleted = 0
    `;
    const countResult = await pool
      .request()
      .input("CurrentYear", sql.Int, currentYear)
      .query(countQuery);
    
    const nextSequence = (countResult.recordset[0].GSRNCount + 1).toString().padStart(4, '0');
    const generatedGSRN = `GSRN-${currentYear}-${nextSequence}`;

    let receivingOrder = {
      ReceivingDate: moment(new Date()).format("YYYY-MM-DD"),
      GSRN: generatedGSRN,
      CreatedBy: values.user_id,
      UpdatedBy: values.user_id,
    };
    let query = `
                DECLARE @OutputTable TABLE (
                        PurchaseOrderReceivingID INT
                );
                INSERT INTO PurchaseOrderReceivings (
                    ReceivingDate, GSRN, CreatedBy, UpdatedBy
                )
                OUTPUT 
                    INSERTED.PurchaseOrderReceivingID
                INTO @OutputTable
                VALUES (
                    @ReceivingDate, @GSRN, @CreatedBy, @UpdatedBy
                );
                SELECT * FROM @OutputTable;
            `;
    let request = pool
      .request()
      .input("ReceivingDate", sql.Date, receivingOrder.ReceivingDate)
      .input("GSRN", sql.VarChar(100), receivingOrder.GSRN)
      .input("CreatedBy", sql.VarChar(100), receivingOrder.CreatedBy)
      .input("UpdatedBy", sql.VarChar(100), receivingOrder.UpdatedBy);
    let result = await request.query(query);
    let insertedRecordId = result.recordset[0].PurchaseOrderReceivingID;
    let PurchaseOrderReceiving = await getPurchaseOrderReceiving(
      pool,
      insertedRecordId,
    );
    return PurchaseOrderReceiving;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getNewPurchaseOrder: " + err.message,
    );
  }
}

async function getPurchaseOrderReceiving(pool, PurchaseOrderReceivingID) {
  try {
    if (!PurchaseOrderReceivingID) {
      throw new CustomError("PurchaseOrderReceivingID is required");
    }
    const input = String(PurchaseOrderReceivingID).trim();
    const isNumeric = /^\d+$/.test(input);
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
            WHERE POP.PurchaseOrderID = POR.PurchaseOrderID AND POP.IsDeleted = 0
        ) AS total_quantity,
        CASE 
            WHEN POR.QuarantineEndDate IS NULL THEN NULL
            ELSE DATEDIFF(DAY, GETDATE(), POR.QuarantineEndDate)
        END AS DaysInQuarantine,
        CASE 
            WHEN POR.QuarantineEndDate IS NULL THEN NULL
            WHEN CAST(GETDATE() AS DATE) < CAST(POR.QuarantineEndDate AS DATE) THEN 'In Quarantine'
            ELSE 'Quarantine Completed'
        END AS QuarantineStatus
        FROM PurchaseOrderReceivings POR 
        left join Users CU ON POR.CreatedBy = CU.UserID 
        left join Users UU ON POR.UpdatedBy = UU.UserID 
        left join PurchaseOrders PO ON POR.PurchaseOrderID = PO.PurchaseOrderID 
        left join Vendors V ON POR.VendorID = V.VendorID
        left join Branches B ON POR.BranchID = B.BranchID
        left join Warehouses W ON POR.WarehouseID = W.WarehouseID
        `;
    let request = pool.request();
    if (isNumeric) {
      query += ` WHERE POR.PurchaseOrderReceivingID = @PurchaseOrderReceivingID`;
      request.input("PurchaseOrderReceivingID", sql.Int, parseInt(input));
    } else {
      query += ` WHERE POR.GSRN = @GSRN`;
      request.input("GSRN", sql.VarChar(20), input);
    }
    let result = await request.query(query);
    if (result.recordset.length === 0) {
      throw new CustomError("No purchase order found with the given ID");
    }
    let PurchaseOrderReceiving = result.recordset[0];
    if (PurchaseOrderReceiving.PurchaseOrderReceivingStatus == "New") {
      PurchaseOrderReceiving.PurchaseOrderReceivingStatus = "Draft";
    }
    if (PurchaseOrderReceiving.IsDeleted) {
      throw new CustomError(
        "Purchase Order Receiving already deleted: " +
          PurchaseOrderReceiving?.GSRN,
      );
    }
    return PurchaseOrderReceiving;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getPurchaseOrderReceiving: " + err.message,
    );
  }
}

async function getAllPurchaseOrderReceivings(pool, values) {
  try {
    let user_id = values.user_id;
    let query = `SELECT POR.*,
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
            WHERE POP.PurchaseOrderID = POR.PurchaseOrderID AND POP.IsDeleted = 0
        ) AS total_quantity,
        CASE 
            WHEN POR.QuarantineEndDate IS NULL THEN NULL
            ELSE DATEDIFF(DAY, GETDATE(), POR.QuarantineEndDate)
        END AS DaysInQuarantine,
        CASE 
            WHEN POR.QuarantineEndDate IS NULL THEN NULL
            WHEN CAST(GETDATE() AS DATE) < CAST(POR.QuarantineEndDate AS DATE) THEN 'In Quarantine'
            ELSE 'Quarantine Completed'
        END AS QuarantineStatus
        FROM PurchaseOrderReceivings POR 
        left join Users CU ON POR.CreatedBy = CU.UserID 
        left join Users UU ON POR.UpdatedBy = UU.UserID 
        left join PurchaseOrders PO ON POR.PurchaseOrderID = PO.PurchaseOrderID 
        left join Vendors V ON POR.VendorID = V.VendorID
        left join Branches B ON POR.BranchID = B.BranchID
        left join Warehouses W ON POR.WarehouseID = W.WarehouseID
        WHERE POR.CreatedBy = @CreatedBy AND POR.PurchaseOrderReceivingStatus != 'New' AND POR.IsDeleted = 0`;
    
    if (values.PurchaseOrderReceivingStatus) {
      query += ` AND POR.PurchaseOrderReceivingStatus = @PurchaseOrderReceivingStatus`;
    }
    
    query += ` ORDER BY POR.ReceivingDate DESC, POR.CreatedDate DESC`;
    
    let request = pool.request();
    request.input("CreatedBy", sql.Int, parseInt(user_id));
    if (values.PurchaseOrderReceivingStatus) {
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

async function updatePurchaseOrderReceiving(pool, values) {
  try {
    // Define required fields
    const requiredFields = [
      "PurchaseOrderReceivingID",
      "PurchaseOrderID",
      "BranchID",
      "WarehouseID",
      "InvoiceNumber",
    ];

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
    const purchaseOrderReceiving = await getPurchaseOrderReceiving(
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
    if (
      purchaseOrderReceiving.PurchaseOrderReceivingStatus !== "Open" &&
      purchaseOrderReceiving.PurchaseOrderReceivingStatus !== "Draft"
    ) {
      throw new CustomError(
        `Invalid PurchaseOrderReceivingStatus: ${purchaseOrderReceiving.PurchaseOrderReceivingStatus}. Must be 'Open'`,
      );
    }

    // Validate PurchaseOrderID
    if (isNaN(values.PurchaseOrderID)) {
      throw new CustomError(
        `Invalid PurchaseOrderID: ${values.PurchaseOrderID}`,
      );
    }
    const purchaseOrder = await getPurchaseOrder(pool, values.PurchaseOrderID);
    if (purchaseOrder.PurchaseOrderStatus !== "Open") {
      throw new CustomError(
        `Cannot update Purchase Order Receiving with Purchase Order status: ${purchaseOrder.PurchaseOrderStatus}`,
      );
    }

    // Update query
    const query = `
            UPDATE PurchaseOrderReceivings
            SET 
                GSRN = @GSRN,
                ReceivingDate = @ReceivingDate,
                InvoiceNumber = @InvoiceNumber,
                PurchaseOrderID = @PurchaseOrderID,
                VendorID = @VendorID,
                BranchID = @BranchID,
                WarehouseID = @WarehouseID,
                VehicleNumber = @VehicleNumber,
                LRNumber = @LRNumber,
                PurchaseOrderReceivingStatus = 'Open',
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE PurchaseOrderReceivingID = @PurchaseOrderReceivingID;

            UPDATE PurchaseOrders
            SET 
                PurchaseOrderStatus = 'Open',
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE PurchaseOrderID = @PurchaseOrderID;
        `;

    // Execute query
    const request = pool
      .request()
      .input(
        "PurchaseOrderReceivingID",
        sql.Int,
        parseInt(values.PurchaseOrderReceivingID),
      )
      .input("GSRN", sql.VarChar(100), values.GSRN || null)
      .input("ReceivingDate", sql.Date, values.ReceivingDate || null)
      .input("InvoiceNumber", sql.VarChar(500), values.InvoiceNumber)
      .input("PurchaseOrderID", sql.Int, parseInt(values.PurchaseOrderID))
      .input("VendorID", sql.Int, parseInt(values.VendorID))
      .input("BranchID", sql.Int, parseInt(values.BranchID))
      .input("WarehouseID", sql.Int, parseInt(values.WarehouseID))
      .input("VehicleNumber", sql.VarChar(100), values.VehicleNumber || null)
      .input("LRNumber", sql.VarChar(100), values.LRNumber || null)
      .input("UpdatedBy", sql.Int, parseInt(values.user_id));

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      throw new CustomError(
        "No Purchase Order Receiving found with provided PurchaseOrderReceivingID",
      );
    }
    // Fetch and return updated record
    const updatedPurchaseOrderReceiving = await getPurchaseOrderReceiving(
      pool,
      values.PurchaseOrderReceivingID,
    );
    return updatedPurchaseOrderReceiving;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in updatePurchaseOrderReceiving: " + err.message,
    );
  }
}

async function updatePurchaseOrderReceivingStatus(pool, values) {
  try {
    // Define required fields
    const requiredFields = [
      "PurchaseOrderReceivingID",
      "PurchaseOrderReceivingStatus",
    ];

    // Validate required fields
    for (const key of requiredFields) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
      if (
        key === "PurchaseOrderReceivingStatus" &&
        !["Received", "Rejected"].includes(values[key])
      ) {
        throw new CustomError(
          `Invalid PurchaseOrderReceivingStatus: ${values[key]}. Must be 'Received' or 'Rejected'`,
        );
      }
    }

    // Validate PurchaseOrderReceivingID
    if (isNaN(values.PurchaseOrderReceivingID)) {
      throw new CustomError(
        `Invalid PurchaseOrderReceivingID: ${values.PurchaseOrderReceivingID}`,
      );
    }

    // Fetch and validate existing PurchaseOrderReceiving
    const purchaseOrderReceiving = await getPurchaseOrderReceiving(
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
    if (purchaseOrderReceiving.PurchaseOrderReceivingStatus !== "Open") {
      throw new CustomError(
        `Invalid PurchaseOrderReceivingStatus: ${purchaseOrderReceiving.PurchaseOrderReceivingStatus}. Must be 'Open'`,
      );
    }

    // Ensure Comments column exists in PurchaseOrderReceivings
    const ensureColumnsQuery = `
      IF COL_LENGTH('PurchaseOrderReceivings','Comments') IS NULL
        ALTER TABLE PurchaseOrderReceivings ADD Comments NVARCHAR(500) NULL;
    `;
    await pool.request().query(ensureColumnsQuery);

    // Update query
    const query = `
            UPDATE PurchaseOrderReceivings
            SET 
                PurchaseOrderReceivingStatus = @PurchaseOrderReceivingStatus,
                Comments = @Comments,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE PurchaseOrderReceivingID = @PurchaseOrderReceivingID;

           IF @PurchaseOrderReceivingStatus = 'Rejected'
            BEGIN
                UPDATE PurchaseOrders
                SET 
                    PurchaseOrderStatus = 'Open',
                    UpdatedBy = @UpdatedBy,
                    UpdatedDate = GETDATE()
                WHERE PurchaseOrderID = @PurchaseOrderID;
            END
        `;

    // Execute query
    const request = pool
      .request()
      .input(
        "PurchaseOrderReceivingID",
        sql.Int,
        parseInt(values.PurchaseOrderReceivingID),
      )
      .input(
        "PurchaseOrderReceivingStatus",
        sql.VarChar(50),
        values.PurchaseOrderReceivingStatus,
      )
      .input(
        "Comments",
        sql.NVarChar(500),
        values.Comments || null,
      )
      .input(
        "PurchaseOrderID",
        sql.Int,
        parseInt(purchaseOrderReceiving.PurchaseOrderID),
      )
      .input("UpdatedBy", sql.Int, parseInt(values.user_id));

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      throw new CustomError(
        "No Purchase Order Receiving found with provided PurchaseOrderReceivingID",
      );
    }
    // Fetch and return updated record
    const updatedPurchaseOrderReceiving = await getPurchaseOrderReceiving(
      pool,
      values.PurchaseOrderReceivingID,
    );
    return updatedPurchaseOrderReceiving;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in updatePurchaseOrderReceivingStatus: " + err.message,
    );
  }
}

async function deletePurchaseOrderReceiving(pool, values) {
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
    const purchaseOrderReceiving = await getPurchaseOrderReceiving(
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
    if (
      purchaseOrderReceiving.PurchaseOrderReceivingStatus !== "Open" &&
      purchaseOrderReceiving.PurchaseOrderReceivingStatus !== "New"
    ) {
      throw new CustomError(
        `Invalid PurchaseOrderReceivingStatus: ${purchaseOrderReceiving.PurchaseOrderReceivingStatus}. Must be 'Open'`,
      );
    }
    const purchaseOrder = await getPurchaseOrder(
      pool,
      purchaseOrderReceiving.PurchaseOrderID,
    );
    // Update query
    const query = `
            UPDATE PurchaseOrderReceivings
            SET 
                IsDeleted = 1,
                PurchaseOrderReceivingStatus = 'Deleted',
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE PurchaseOrderReceivingID = @PurchaseOrderReceivingID;

            UPDATE PurchaseOrders
            SET 
                PurchaseOrderStatus = 'Open',
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE PurchaseOrderID = @PurchaseOrderID;
        `;
    // Execute query
    const request = pool
      .request()
      .input(
        "PurchaseOrderReceivingID",
        sql.Int,
        parseInt(values.PurchaseOrderReceivingID),
      )
      .input(
        "PurchaseOrderID",
        sql.Int,
        parseInt(purchaseOrder.PurchaseOrderID),
      )
      .input("UpdatedBy", sql.Int, parseInt(values.user_id));
    const result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      throw new CustomError(
        "No Purchase Order Receiving found with provided PurchaseOrderReceivingID",
      );
    }
    return "done";
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in deletePurchaseOrderReceiving: " + err.message,
    );
  }
}

async function updatePurchaseOrderReceivingQuarantine(pool, values) {
  try {
    // Define required fields
    const requiredFields = [
      "PurchaseOrderReceivingID",
      "QuarantineEndDate",
    ];

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

    // Validate date format
    const quarantineDate = new Date(values.QuarantineEndDate);
    if (isNaN(quarantineDate.getTime())) {
      throw new CustomError("Invalid QuarantineEndDate format");
    }

    // Fetch and validate existing PurchaseOrderReceiving
    const purchaseOrderReceiving = await getPurchaseOrderReceiving(
      pool,
      values.PurchaseOrderReceivingID,
    );
    if (purchaseOrderReceiving.IsDeleted) {
      throw new CustomError(
        "Purchase Order Receiving already deleted: " +
          purchaseOrderReceiving?.GSRN,
      );
    }

    // Validate that record is in Received status
    if (purchaseOrderReceiving.PurchaseOrderReceivingStatus !== "Received") {
      throw new CustomError(
        `Cannot update quarantine for status: ${purchaseOrderReceiving.PurchaseOrderReceivingStatus}. Must be 'Received'`,
      );
    }

    // Update query
    const query = `
            UPDATE PurchaseOrderReceivings
            SET 
                QuarantineEndDate = @QuarantineEndDate,
                QuarantineRemark = @QuarantineRemark,
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
      .input(
        "QuarantineEndDate",
        sql.Date,
        values.QuarantineEndDate,
      )
      .input(
        "QuarantineRemark",
        sql.VarChar(500),
        values.QuarantineRemark || null,
      )
      .input("UpdatedBy", sql.Int, parseInt(values.user_id));

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      throw new CustomError(
        "No Purchase Order Receiving found with provided PurchaseOrderReceivingID",
      );
    }

    // Fetch and return updated record
    const updatedPurchaseOrderReceiving = await getPurchaseOrderReceiving(
      pool,
      values.PurchaseOrderReceivingID,
    );
    return updatedPurchaseOrderReceiving;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in updatePurchaseOrderReceivingQuarantine: " + err.message,
    );
  }
}

async function getPurchaseOrderReceivingsForPutaway(pool, values) {
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
            WHERE POP.PurchaseOrderID = POR.PurchaseOrderID AND POP.IsDeleted = 0
        ) AS total_quantity,
        CASE 
            WHEN POR.QuarantineEndDate IS NULL THEN NULL
            ELSE DATEDIFF(DAY, GETDATE(), POR.QuarantineEndDate)
        END AS DaysInQuarantine,
        CASE 
            WHEN POR.QuarantineEndDate IS NULL THEN NULL
            WHEN CAST(GETDATE() AS DATE) < CAST(POR.QuarantineEndDate AS DATE) THEN 'In Quarantine'
            ELSE 'Quarantine Completed'
        END AS QuarantineStatus
        FROM PurchaseOrderReceivings POR 
        left join Users CU ON POR.CreatedBy = CU.UserID 
        left join Users UU ON POR.UpdatedBy = UU.UserID 
        left join PurchaseOrders PO ON POR.PurchaseOrderID = PO.PurchaseOrderID 
        left join Vendors V ON POR.VendorID = V.VendorID
        left join Branches B ON POR.BranchID = B.BranchID
        left join Warehouses W ON POR.WarehouseID = W.WarehouseID
        WHERE POR.CreatedBy = @CreatedBy 
        AND POR.PurchaseOrderReceivingStatus = 'Received'
        AND POR.IsDeleted = 0
        AND POR.QuarantineEndDate IS NOT NULL
        AND DATEDIFF(DAY, GETDATE(), POR.QuarantineEndDate) = 0
        ORDER BY POR.QuarantineEndDate ASC, POR.ReceivingDate DESC
        `;
    
    let request = pool.request();
    request.input("CreatedBy", sql.Int, parseInt(user_id));
    
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getPurchaseOrderReceivingsForPutaway: " + err.message,
    );
  }
}

module.exports.getNewPurchaseOrder = getNewPurchaseOrder;
module.exports.getPurchaseOrder = getPurchaseOrder;
module.exports.getAllPurchaseOrders = getAllPurchaseOrders;
module.exports.updatePurchaseOrder = updatePurchaseOrder;
module.exports.deletePurchaseOrder = deletePurchaseOrder;
module.exports.addNewProductForPurchaseOrder = addNewProductForPurchaseOrder;
module.exports.getPurchaseOrderProduct = getPurchaseOrderProduct;
module.exports.getPurchaseOrderAllProducts = getPurchaseOrderAllProducts;
module.exports.updatePurchaseOrderProduct = updatePurchaseOrderProduct;
module.exports.deletePurchaseOrderProduct = deletePurchaseOrderProduct;
module.exports.getNewPurchaseOrderReceiving = getNewPurchaseOrderReceiving;
module.exports.getPurchaseOrderReceiving = getPurchaseOrderReceiving;
module.exports.getAllPurchaseOrderReceivings = getAllPurchaseOrderReceivings;
module.exports.getPurchaseOrderReceivingsForPutaway = getPurchaseOrderReceivingsForPutaway;
module.exports.updatePurchaseOrderReceiving = updatePurchaseOrderReceiving;
module.exports.updatePurchaseOrderReceivingStatus =
  updatePurchaseOrderReceivingStatus;
module.exports.updatePurchaseOrderReceivingQuarantine =
  updatePurchaseOrderReceivingQuarantine;
module.exports.deletePurchaseOrderReceiving = deletePurchaseOrderReceiving;
