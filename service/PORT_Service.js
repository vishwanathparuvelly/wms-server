const config = require("config");
const moment = require("moment");
const sql = require("mssql");
const commonService = require("./Common_Service");
const { CustomError } = require("../model/CustomError");

async function getNewPurchaseOrderReturn(pool, values) {
  try {
    let newPurchaseOrderReturn = {
      PurchaseOrderReturnDate: moment(new Date()).format("YYYY-MM-DD"),
      CreatedBy: values.user_id,
      UpdatedBy: values.user_id,
    };
    let query = `
                DECLARE @OutputTable TABLE (
                        PurchaseOrderReturnID INT
                );
                INSERT INTO PurchaseOrderReturns (
                    PurchaseOrderReturnDate, CreatedBy, UpdatedBy
                )
                OUTPUT 
                    INSERTED.PurchaseOrderReturnID
                INTO @OutputTable
                VALUES (
                    @PurchaseOrderReturnDate, @CreatedBy, @UpdatedBy
                );
                SELECT * FROM @OutputTable;
            `;
    let request = pool
      .request()
      .input(
        "PurchaseOrderReturnDate",
        sql.Date,
        newPurchaseOrderReturn.PurchaseOrderReturnDate,
      )
      .input("CreatedBy", sql.Int, newPurchaseOrderReturn.CreatedBy)
      .input("UpdatedBy", sql.Int, newPurchaseOrderReturn.UpdatedBy);
    let result = await request.query(query);
    let insertedRecordId = result.recordset[0].PurchaseOrderReturnID;
    let PurchaseOrderReturn = await getPurchaseOrderReturn(
      pool,
      insertedRecordId,
    );
    return PurchaseOrderReturn;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getNewPurchaseOrderReturn: " + err.message,
    );
  }
}

async function getPurchaseOrderReturn(pool, PurchaseOrderReturnID) {
  try {
    if (!PurchaseOrderReturnID) {
      throw new CustomError("PurchaseOrderReturnID is required");
    }
    const input = String(PurchaseOrderReturnID).trim();
    const isNumeric = /^\d+$/.test(input);
    let query = `
        SELECT POR.*,
        CU.UserName AS CreatedByUserName,
        UU.UserName AS UpdatedByUserName,
        V.VendorName,
        B.BranchName,
        W.WarehouseName,
        (
            SELECT COALESCE(SUM(PORP.Quantity), 0)
            FROM PurchaseOrderReturnProducts PORP
            WHERE PORP.PurchaseOrderReturnID = POR.PurchaseOrderReturnID AND PORP.IsDeleted = 0
        ) AS total_quantity,
        (
            SELECT COALESCE(SUM(PORP.MRP), 0)
            FROM PurchaseOrderReturnProducts PORP
            WHERE PORP.PurchaseOrderReturnID = POR.PurchaseOrderReturnID AND PORP.IsDeleted = 0
        ) AS total_MRP
        FROM PurchaseOrderReturns POR 
        LEFT JOIN Users CU ON POR.CreatedBy = CU.UserID 
        LEFT JOIN Users UU ON POR.UpdatedBy = UU.UserID 
        LEFT JOIN Vendors V ON POR.VendorID = V.VendorID
        LEFT JOIN Branches B ON POR.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON POR.WarehouseID = W.WarehouseID
        `;
    let request = pool.request();
    if (isNumeric) {
      query += ` WHERE POR.PurchaseOrderReturnID = @PurchaseOrderReturnID`;
      request.input("PurchaseOrderReturnID", sql.Int, parseInt(input));
    } else {
      query += ` WHERE POR.PurchaseOrderReturnNumber = @PurchaseOrderReturnNumber`;
      request.input("PurchaseOrderReturnNumber", sql.VarChar(20), input);
    }
    let result = await request.query(query);
    if (result.recordset.length === 0) {
      throw new CustomError("No purchase order return found with the given ID");
    }
    let PurchaseOrderReturn = result.recordset[0];
    if (PurchaseOrderReturn.PurchaseOrderReturnStatus == "New") {
      PurchaseOrderReturn.PurchaseOrderReturnStatus = "Draft";
    }
    if (PurchaseOrderReturn.IsDeleted) {
      throw new CustomError(
        "Purchase Order Return already deleted: " +
          PurchaseOrderReturn?.PurchaseOrderReturnNumber,
      );
    }
    return PurchaseOrderReturn;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getPurchaseOrderReturn: " + err.message,
    );
  }
}

async function getAllPurchaseOrderReturns(pool, values) {
  try {
    let user_id = values.user_id;
    let query = `
        SELECT POR.*,
        CU.UserName AS CreatedByUserName,
        UU.UserName AS UpdatedByUserName,
        V.VendorName,
        B.BranchName,
        W.WarehouseName,
        (
            SELECT COALESCE(SUM(PORP.Quantity), 0)
            FROM PurchaseOrderReturnProducts PORP
            WHERE PORP.PurchaseOrderReturnID = POR.PurchaseOrderReturnID AND PORP.IsDeleted = 0
        ) AS total_quantity,
        (
            SELECT COALESCE(SUM(PORP.MRP), 0)
            FROM PurchaseOrderReturnProducts PORP
            WHERE PORP.PurchaseOrderReturnID = POR.PurchaseOrderReturnID AND PORP.IsDeleted = 0
        ) AS total_MRP
        FROM PurchaseOrderReturns POR
        LEFT JOIN Users CU ON POR.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON POR.UpdatedBy = UU.UserID
        LEFT JOIN Vendors V ON POR.VendorID = V.VendorID
        LEFT JOIN Branches B ON POR.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON POR.WarehouseID = W.WarehouseID
        WHERE POR.CreatedBy = @CreatedBy AND POR.PurchaseOrderReturnStatus != 'New' AND POR.IsDeleted = 0
        `;
    if (values.PurchaseOrderReturnStatus) {
      query += ` AND POR.PurchaseOrderReturnStatus = @PurchaseOrderReturnStatus`;
    }
    let request = pool.request();
    request.input("CreatedBy", sql.Int, parseInt(user_id));
    if (values.PurchaseOrderReturnStatus) {
      request.input(
        "PurchaseOrderReturnStatus",
        sql.VarChar(50),
        values.PurchaseOrderReturnStatus,
      );
    }
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getAllPurchaseOrderReturns: " + err.message,
    );
  }
}

async function updatePurchaseOrderReturn(pool, values) {
  try {
    let items = [
      "PurchaseOrderReturnID",
      "DeliveryDate",
      "PurchaseOrderReturnStatus",
      "VendorID",
      "BranchID",
      "WarehouseID",
      "DeliveryAddress",
      "PersonInChargeInternal",
      "PersonInChargeCustomer",
      "PersonInChargeVendor",
      "Remarks",
    ];
    let PurchaseOrderReturn;
    for (const key of items) {
      if (values[key] === undefined || values[key] === null) {
        throw new CustomError(`Missing required field: ${key}`);
      }
      if (key == "PurchaseOrderReturnID") {
        if (isNaN(values[key])) {
          throw new CustomError(
            `Invalid PurchaseOrderReturnID: ${values[key]}`,
          );
        }
        PurchaseOrderReturn = await getPurchaseOrderReturn(pool, values[key]);
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
      if (key == "PurchaseOrderReturnStatus") {
        if (
          values[key] != "Draft" &&
          values[key] != "Open" &&
          values[key] != "Cancelled"
        ) {
          throw new CustomError(
            `Invalid Purchase Order Return with status: ${values.PurchaseOrderReturnStatus}, It should be 'Draft', 'Open' or 'Cancelled'`,
          );
        }
      }
    }
    if (
      PurchaseOrderReturn.PurchaseOrderReturnStatus == "Completed" ||
      PurchaseOrderReturn.PurchaseOrderReturnStatus == "Cancelled"
    ) {
      throw new CustomError(
        `Cannot update Purchase Order Return with status: ${PurchaseOrderReturn.PurchaseOrderReturnStatus}`,
      );
    }
    let user_id = values.user_id;
    let query = `
        UPDATE PurchaseOrderReturns
        SET 
            DeliveryDate = @DeliveryDate,
            PurchaseOrderReturnStatus = @PurchaseOrderReturnStatus,
            VendorID = @VendorID,
            BranchID = @BranchID,
            WarehouseID = @WarehouseID,
            DeliveryAddress = @DeliveryAddress,
            PersonInChargeInternal = @PersonInChargeInternal,
            PersonInChargeCustomer = @PersonInChargeCustomer,
            PersonInChargeVendor = @PersonInChargeVendor,
            Remarks = @Remarks,
            UpdatedBy = @UpdatedBy,
            UpdatedDate = GETDATE()
        WHERE PurchaseOrderReturnID = @PurchaseOrderReturnID
        `;
    let request = pool
      .request()
      .input(
        "PurchaseOrderReturnID",
        sql.Int,
        parseInt(values.PurchaseOrderReturnID),
      )
      .input("DeliveryDate", sql.Date, values.DeliveryDate)
      .input(
        "PurchaseOrderReturnStatus",
        sql.VarChar(50),
        values.PurchaseOrderReturnStatus,
      )
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
        "PersonInChargeCustomer",
        sql.VarChar(100),
        values.PersonInChargeCustomer,
      )
      .input(
        "PersonInChargeVendor",
        sql.VarChar(100),
        values.PersonInChargeVendor,
      )
      .input("Remarks", sql.VarChar(500), values.Remarks)
      .input("UpdatedBy", sql.Int, parseInt(user_id));
    let result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      throw new CustomError("No purchase order return found with the given ID");
    }
    let purchaseOrderReturn = await getPurchaseOrderReturn(
      pool,
      values.PurchaseOrderReturnID,
    );
    return purchaseOrderReturn;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in updatePurchaseOrderReturn: " + err.message,
    );
  }
}

async function deletePurchaseOrderReturn(pool, values) {
  try {
    let items = ["PurchaseOrderReturnID"];
    for (const key of items) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
      if (key == "PurchaseOrderReturnID") {
        if (isNaN(values[key])) {
          throw new CustomError(
            `Invalid PurchaseOrderReturnID: ${values[key]}`,
          );
        }
        let PurchaseOrderReturn = await getPurchaseOrderReturn(
          pool,
          values[key],
        );
        if (PurchaseOrderReturn.PurchaseOrderReturnStatus !== "Draft") {
          throw new CustomError(
            `Cannot delete Purchase Order Return with status: ${PurchaseOrderReturn.PurchaseOrderReturnStatus}`,
          );
        }
        if (PurchaseOrderReturn.IsDeleted) {
          throw new CustomError(
            `Purchase Order Return already deleted: ${PurchaseOrderReturn?.PurchaseOrderReturnNumber}`,
          );
        }
      }
    }
    let user_id = values.user_id;
    let query = `
        UPDATE PurchaseOrderReturns
        SET 
            IsDeleted = 1,
            PurchaseOrderReturnStatus = 'Deleted',
            UpdatedBy = @UpdatedBy,
            UpdatedDate = GETDATE()
        WHERE PurchaseOrderReturnID = @PurchaseOrderReturnID
        `;
    let request = pool
      .request()
      .input(
        "PurchaseOrderReturnID",
        sql.Int,
        parseInt(values.PurchaseOrderReturnID),
      )
      .input("UpdatedBy", sql.Int, parseInt(user_id));
    let result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      throw new CustomError("No purchase order return found with the given ID");
    }
    return "done";
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in deletePurchaseOrderReturn: " + err.message,
    );
  }
}

async function getAllAvailableBinProducts(pool, values) {
  try {
    let query = `
        SELECT DISTINCT
            PRD.ProductID,
            PRD.ProductCode,
            PRD.ProductName,
            BR.BrandName,
            PCK.PackagingTypeName,
            LN.LineName,
            PC.ProductConsumeType,
            PT.ProductTypeName,
            U.UOMID,
            U.UOMCode,
            U.UOMCode,
            U.UOMName,
            U.UOMDescription
        FROM BinProducts BP
        INNER JOIN Products PRD ON BP.ProductID = PRD.ProductID
        LEFT JOIN Brands BR ON PRD.BrandID = BR.BrandID
        LEFT JOIN PackagingTypes PCK ON PRD.PackagingTypeID = PCK.PackagingTypeID
        LEFT JOIN Lines LN ON PRD.LineID = LN.LineID
        LEFT JOIN ProductConsumes PC ON PRD.ProductConsumeID = PC.ProductConsumeID
        LEFT JOIN ProductTypes PT ON PRD.ProductTypeID = PT.ProductTypeID
        LEFT JOIN UOMs U ON BP.UOMID = U.UOMID
        WHERE BP.FilledQuantity > 0
        AND BP.IsActive = 1
        ORDER BY PRD.ProductName
        `;
    let request = pool.request();
    if (values.WarehouseID) {
      query = query.replace(
        "WHERE BP.FilledQuantity > 0",
        "WHERE BP.WarehouseID = @WarehouseID AND BP.FilledQuantity > 0",
      );
      request.input("WarehouseID", sql.Int, parseInt(values.WarehouseID));
    }
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getAllAvailableBinProducts: " + err.message,
    );
  }
}

async function getAllBinProductsBatchNumbers(pool, values) {
  try {
    if (!values.ProductID) {
      throw new CustomError("ProductID is required");
    }
    if (!values.ProductID) {
      throw new CustomError("ProductID is required");
    }
    let productData = await commonService.fetchProduct(pool, values.ProductID);
    let query = `
            SELECT DISTINCT BP.BatchNumber
            FROM BinProducts BP
            WHERE BP.ProductID = @ProductID
            AND BP.FilledQuantity > 0
            AND BP.IsActive = 1
            ORDER BY BP.BatchNumber
        `;
    let request = pool
      .request()
      .input("ProductID", sql.Int, parseInt(values.ProductID));
    let result = await request.query(query);
    return result.recordset.map((row) => row.BatchNumber);
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getAllBinProductsBatchNumbers: " + err.message,
    );
  }
}

async function addNewProductForPurchaseOrderReturn(pool, values) {
  try {
    let items = [
      "PurchaseOrderReturnID",
      "VendorID",
      "BranchID",
      "WarehouseID",
      "ProductID",
      "UOMID",
      "SLOCID",
      "BatchNumber",
      "Quantity",
      "MRP",
      "Discount",
    ];
    let PurchaseOrderReturn;
    for (const key of items) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
      if (key === "PurchaseOrderReturnID") {
        if (isNaN(values[key])) {
          throw new CustomError(
            `Invalid PurchaseOrderReturnID: ${values[key]}`,
          );
        }
        PurchaseOrderReturn = await getPurchaseOrderReturn(pool, values[key]);
      }
    }
    if (PurchaseOrderReturn.PurchaseOrderReturnStatus !== "Draft") {
      throw new CustomError(
        `Cannot add products to Purchase Order Return with status: ${PurchaseOrderReturn.PurchaseOrderReturnStatus}`,
      );
    }
    let Quantity = Number(values.Quantity);
    let productData = await commonService.fetchProduct(pool, values.ProductID);
    if (Quantity < productData.MinQty) {
      let currentProductQuantity = 0;
      let currentProductPayload = {
        ProductID: values.ProductID,
        PurchaseOrderReturnID: values.PurchaseOrderReturnID,
      };
      let currentPurchaseOrderReturnProducts =
        await getPurchaseOrderReturnAllProducts(pool, currentProductPayload);
      currentPurchaseOrderReturnProducts.forEach((product) => {
        currentProductQuantity += product.Quantity;
      });
      if (currentProductQuantity + Quantity < productData.MinQty) {
        throw new CustomError(
          `Minimum quantity for product ${productData.ProductName} is ${productData.MinQty}, but provided quantity is ${Quantity} and existing quantity is ${currentProductQuantity}, which makes total quantity less than minimum`,
        );
      }
    }
    await commonService.validateBinProductAvailability(pool, values);
    let user_id = values.user_id;
    let query = `
            MERGE INTO PurchaseOrderReturnProducts AS target
            USING (SELECT 
                @PurchaseOrderReturnID AS PurchaseOrderReturnID, 
                @ProductID AS ProductID, 
                @BatchNumber AS BatchNumber,
                @Quantity AS Quantity,
                @MRP AS MRP,
                @Discount AS Discount
            ) AS source
            ON target.PurchaseOrderReturnID = source.PurchaseOrderReturnID
            AND target.ProductID = source.ProductID
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
                    Picked_Quantity = 0,
                    MRP = source.MRP,
                    Discount = source.Discount,
                    Total_Product_MRP = (target.Quantity + source.Quantity) * source.MRP,
                    Total_Product_Discount = (target.Quantity + source.Quantity) * source.Discount,
                    Total_Product_Amount = ((target.Quantity + source.Quantity) * source.MRP) - ((target.Quantity + source.Quantity) * source.Discount),
                    UpdatedBy = @UpdatedBy,
                    UpdatedDate = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (
                    PurchaseOrderReturnID,
                    VendorID,
                    BranchID,
                    WarehouseID,
                    ProductID,
                    UOMID,
                    SLOCID,
                    BatchNumber,
                    Quantity,
                    Pending_Quantity,
                    Picked_Quantity,
                    MRP,
                    Discount,
                    Total_Product_MRP,
                    Total_Product_Discount,
                    Total_Product_Amount,
                    CreatedBy,
                    UpdatedBy
                )
                VALUES (
                    @PurchaseOrderReturnID,
                    @VendorID,
                    @BranchID,
                    @WarehouseID,
                    @ProductID,
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
      .input(
        "PurchaseOrderReturnID",
        sql.Int,
        parseInt(values.PurchaseOrderReturnID),
      )
      .input("VendorID", sql.Int, parseInt(values.VendorID))
      .input("BranchID", sql.Int, parseInt(values.BranchID))
      .input("WarehouseID", sql.Int, parseInt(values.WarehouseID))
      .input("ProductID", sql.Int, parseInt(values.ProductID))
      .input("UOMID", sql.Int, parseInt(values.UOMID))
      .input("SLOCID", sql.Int, parseInt(values.SLOCID))
      .input("BatchNumber", sql.VarChar(100), values.BatchNumber)
      .input("Quantity", sql.Decimal(10, 2), Quantity)
      .input("MRP", sql.Decimal(10, 2), values.MRP)
      .input("Discount", sql.Decimal(10, 2), values.Discount)
      .input("CreatedBy", sql.Int, parseInt(user_id))
      .input("UpdatedBy", sql.Int, parseInt(user_id));
    let result = await request.query(query);
    let insertedRecordId = result.recordset[0].PurchaseOrderReturnProductID;
    let PurchaseOrderReturnProduct = await getPurchaseOrderReturnProduct(
      pool,
      insertedRecordId,
    );
    return PurchaseOrderReturnProduct;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in addNewProductForPurchaseOrderReturn: " + err.message,
    );
  }
}

async function getPurchaseOrderReturnProduct(
  pool,
  PurchaseOrderReturnProductID,
) {
  try {
    const input = String(PurchaseOrderReturnProductID).trim();
    let query = `
        SELECT PORP.*,
        POR.PurchaseOrderReturnNumber,
        PRD.ProductCode,
        PRD.ProductName,
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
        FROM PurchaseOrderReturnProducts PORP
        LEFT JOIN Users CU ON PORP.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON PORP.UpdatedBy = UU.UserID
        LEFT JOIN PurchaseOrderReturns POR ON PORP.PurchaseOrderReturnID = POR.PurchaseOrderReturnID
        LEFT JOIN Products PRD ON PORP.ProductID = PRD.ProductID
        LEFT JOIN Brands BR ON PRD.BrandID = BR.BrandID
        LEFT JOIN PackagingTypes PCK ON PRD.PackagingTypeID = PCK.PackagingTypeID
        LEFT JOIN Lines LN ON PRD.LineID = LN.LineID
        LEFT JOIN ProductConsumes PC ON PRD.ProductConsumeID = PC.ProductConsumeID
        LEFT JOIN ProductTypes PT ON PRD.ProductTypeID = PT.ProductTypeID
        LEFT JOIN UOMs U ON PORP.UOMID = U.UOMID
        LEFT JOIN Slocs S ON PORP.SLOCID = S.SLOCID
        LEFT JOIN Vendors V ON PORP.VendorID = V.VendorID
        LEFT JOIN Branches B ON PORP.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON PORP.WarehouseID = W.WarehouseID
        WHERE PORP.PurchaseOrderReturnProductID = @PurchaseOrderReturnProductID
        `;
    let request = pool.request();
    request.input("PurchaseOrderReturnProductID", sql.Int, parseInt(input));
    let result = await request.query(query);
    if (result.recordset.length === 0) {
      throw new CustomError(
        `No purchase order return product found with the given ID ${input}`,
      );
    }
    let PurchaseOrderReturnProduct = result.recordset[0];
    if (PurchaseOrderReturnProduct.IsDeleted) {
      throw new CustomError(
        "Purchase Order Return Product already deleted: " +
          PurchaseOrderReturnProduct?.PurchaseOrderReturnNumber,
      );
    }
    return PurchaseOrderReturnProduct;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getPurchaseOrderReturnProduct: " + err.message,
    );
  }
}

async function getPurchaseOrderReturnAllProducts(pool, values) {
  try {
    let PurchaseOrderReturnID = values.PurchaseOrderReturnID;
    if (!PurchaseOrderReturnID) {
      throw new CustomError("PurchaseOrderReturnID is required");
    }
    let PurchaseOrderReturn = await getPurchaseOrderReturn(
      pool,
      PurchaseOrderReturnID,
    );
    let query = `
        SELECT PORP.*,
        POR.PurchaseOrderReturnNumber,
        PRD.ProductCode,
        PRD.ProductName,
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
        FROM PurchaseOrderReturnProducts PORP
        LEFT JOIN Users CU ON PORP.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON PORP.UpdatedBy = UU.UserID
        LEFT JOIN PurchaseOrderReturns POR ON PORP.PurchaseOrderReturnID = POR.PurchaseOrderReturnID
        LEFT JOIN Products PRD ON PORP.ProductID = PRD.ProductID
        LEFT JOIN Brands BR ON PRD.BrandID = BR.BrandID
        LEFT JOIN PackagingTypes PCK ON PRD.PackagingTypeID = PCK.PackagingTypeID
        LEFT JOIN Lines LN ON PRD.LineID = LN.LineID
        LEFT JOIN ProductConsumes PC ON PRD.ProductConsumeID = PC.ProductConsumeID
        LEFT JOIN ProductTypes PT ON PRD.ProductTypeID = PT.ProductTypeID
        LEFT JOIN UOMs U ON PORP.UOMID = U.UOMID
        LEFT JOIN Slocs S ON PORP.SLOCID = S.SLOCID
        LEFT JOIN Vendors V ON PORP.VendorID = V.VendorID
        LEFT JOIN Branches B ON PORP.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON PORP.WarehouseID = W.WarehouseID
        WHERE PORP.PurchaseOrderReturnID = @PurchaseOrderReturnID AND PORP.IsDeleted = 0
        `;
    let request = pool.request();
    request.input(
      "PurchaseOrderReturnID",
      sql.Int,
      parseInt(PurchaseOrderReturnID),
    );
    if (values.ProductID) {
      query += ` AND PORP.ProductID = @ProductID`;
      request.input("ProductID", sql.Int, parseInt(values.ProductID));
    }
    query += ` ORDER BY PORP.PurchaseOrderReturnProductID`;
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getPurchaseOrderReturnAllProducts: " + err.message,
    );
  }
}

async function updatePurchaseOrderReturnProduct(pool, values) {
  try {
    let requiredFields = [
      "PurchaseOrderReturnProductID",
      "PurchaseOrderReturnID",
      "ProductID",
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
    if (isNaN(values.PurchaseOrderReturnID)) {
      throw new CustomError(
        `Invalid PurchaseOrderReturnID: ${values.PurchaseOrderReturnID}`,
      );
    }
    const PurchaseOrderReturn = await getPurchaseOrderReturn(
      pool,
      values.PurchaseOrderReturnID,
    );
    values.WarehouseID = PurchaseOrderReturn.WarehouseID;
    if (PurchaseOrderReturn.PurchaseOrderReturnStatus !== "Draft") {
      throw new CustomError(
        `Cannot update products for Purchase Order Return with status: ${PurchaseOrderReturn.PurchaseOrderReturnStatus}`,
      );
    }
    if (isNaN(values.PurchaseOrderReturnProductID)) {
      throw new CustomError(
        `Invalid PurchaseOrderReturnProductID: ${values.PurchaseOrderReturnProductID}`,
      );
    }
    let PurchaseOrderReturnProduct = await getPurchaseOrderReturnProduct(
      pool,
      values.PurchaseOrderReturnProductID,
    );
    if (PurchaseOrderReturnProduct.IsDeleted) {
      throw new CustomError(
        "Purchase Order Return Product already deleted: " +
          PurchaseOrderReturnProduct?.PurchaseOrderReturnNumber,
      );
    }
    let Quantity = Number(values.Quantity);
    let productData = await commonService.fetchProduct(pool, values.ProductID);
    if (Quantity < productData.MinQty) {
      let currentProductQuantity = 0;
      let currentProductPayload = {
        ProductID: values.ProductID,
        PurchaseOrderReturnID: values.PurchaseOrderReturnID,
      };
      let currentPurchaseOrderReturnProducts =
        await getPurchaseOrderReturnAllProducts(pool, currentProductPayload);
      currentPurchaseOrderReturnProducts
        .filter(
          (product) =>
            product.PurchaseOrderReturnProductID !=
            values.PurchaseOrderReturnProductID,
        )
        .forEach((product) => {
          currentProductQuantity += product.Quantity;
        });
      if (currentProductQuantity + Quantity < productData.MinQty) {
        throw new CustomError(
          `Minimum quantity for product ${productData.ProductName} is ${productData.MinQty}, but provided quantity is ${Quantity} and existing quantity is ${currentProductQuantity}, which makes total quantity less than minimum`,
        );
      }
    }
    await commonService.validateBinProductAvailability(pool, values);
    const Total_Product_MRP = Quantity * Number(values.MRP) || 0;
    const Total_Product_Discount = Quantity * Number(values.Discount) || 0;
    const Total_Product_Amount = Total_Product_MRP - Total_Product_Discount;
    const query = `
            UPDATE PurchaseOrderReturnProducts
            SET 
                ProductID = @ProductID,
                UOMID = @UOMID,
                SLOCID = @SLOCID,
                BatchNumber = @BatchNumber,
                Quantity = @Quantity,
                Pending_Quantity = @Quantity,
                Picked_Quantity = 0,
                MRP = @MRP,
                Discount = @Discount,
                Total_Product_MRP = @Total_Product_MRP,
                Total_Product_Discount = @Total_Product_Discount,
                Total_Product_Amount = @Total_Product_Amount,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE PurchaseOrderReturnProductID = @PurchaseOrderReturnProductID
        `;
    const request = pool
      .request()
      .input(
        "PurchaseOrderReturnProductID",
        sql.Int,
        parseInt(values.PurchaseOrderReturnProductID),
      )
      .input("ProductID", sql.Int, parseInt(values.ProductID))
      .input("UOMID", sql.Int, parseInt(values.UOMID))
      .input("SLOCID", sql.Int, parseInt(values.SLOCID))
      .input("BatchNumber", sql.VarChar(100), values.BatchNumber)
      .input("Quantity", sql.Decimal(10, 2), Quantity)
      .input("MRP", sql.Decimal(10, 2), values.MRP)
      .input("Discount", sql.Decimal(10, 2), values.Discount)
      .input("Total_Product_MRP", sql.Decimal(10, 2), Total_Product_MRP)
      .input(
        "Total_Product_Discount",
        sql.Decimal(10, 2),
        Total_Product_Discount,
      )
      .input("Total_Product_Amount", sql.Decimal(10, 2), Total_Product_Amount)
      .input("UpdatedBy", sql.Int, parseInt(values.user_id));
    const result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      throw new CustomError(
        "No product found with provided PurchaseOrderReturnProductID",
      );
    }
    PurchaseOrderReturnProduct = await getPurchaseOrderReturnProduct(
      pool,
      values.PurchaseOrderReturnProductID,
    );
    return PurchaseOrderReturnProduct;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in updatePurchaseOrderReturnProduct: " + err.message,
    );
  }
}

async function deletePurchaseOrderReturnProduct(pool, values) {
  try {
    if (!values.PurchaseOrderReturnProductID) {
      throw new CustomError(
        "Missing required field: PurchaseOrderReturnProductID",
      );
    }
    if (!values.PurchaseOrderReturnID) {
      throw new CustomError("Missing required field: PurchaseOrderReturnID");
    }
    if (isNaN(values.PurchaseOrderReturnID)) {
      throw new CustomError(
        `Invalid PurchaseOrderReturnID: ${values.PurchaseOrderReturnID}`,
      );
    }
    const PurchaseOrderReturn = await getPurchaseOrderReturn(
      pool,
      values.PurchaseOrderReturnID,
    );
    if (PurchaseOrderReturn.PurchaseOrderReturnStatus !== "Draft") {
      throw new CustomError(
        `Cannot delete products for Purchase Order Return with status: ${PurchaseOrderReturn.PurchaseOrderReturnStatus}`,
      );
    }
    if (isNaN(values.PurchaseOrderReturnProductID)) {
      throw new CustomError(
        `Invalid PurchaseOrderReturnProductID: ${values.PurchaseOrderReturnProductID}`,
      );
    }
    let PurchaseOrderReturnProduct = await getPurchaseOrderReturnProduct(
      pool,
      values.PurchaseOrderReturnProductID,
    );
    if (PurchaseOrderReturnProduct.IsDeleted) {
      throw new CustomError(
        "Purchase Order Return Product already deleted: " +
          PurchaseOrderReturnProduct?.PurchaseOrderReturnNumber,
      );
    }
    const query = `
            UPDATE PurchaseOrderReturnProducts
            SET 
                IsDeleted = 1,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE PurchaseOrderReturnProductID = @PurchaseOrderReturnProductID
        `;
    const request = pool
      .request()
      .input(
        "PurchaseOrderReturnProductID",
        sql.Int,
        parseInt(values.PurchaseOrderReturnProductID),
      )
      .input("UpdatedBy", sql.Int, parseInt(values.user_id));
    const result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      throw new CustomError(
        "No active product found with provided PurchaseOrderReturnProductID",
      );
    }
    return "done";
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in deletePurchaseOrderReturnProduct: " + err.message,
    );
  }
}

async function getAllPickListOrdersPurchaseOrderReturn(pool, values) {
  try {
    let user_id = values.user_id;
    let query = `
        SELECT POR.*,
        CU.UserName AS CreatedByUserName,
        UU.UserName AS UpdatedByUserName,
        V.VendorName,
        B.BranchName,
        W.WarehouseName,
        (
            SELECT COALESCE(SUM(PORP.Quantity), 0)
            FROM PurchaseOrderReturnProducts PORP
            WHERE PORP.PurchaseOrderReturnID = POR.PurchaseOrderReturnID AND PORP.IsDeleted = 0
        ) AS total_quantity,
        (
            SELECT COALESCE(SUM(PORP.MRP), 0)
            FROM PurchaseOrderReturnProducts PORP
            WHERE PORP.PurchaseOrderReturnID = POR.PurchaseOrderReturnID AND PORP.IsDeleted = 0
        ) AS total_MRP
        FROM PurchaseOrderReturns POR
        LEFT JOIN Users CU ON POR.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON POR.UpdatedBy = UU.UserID
        LEFT JOIN Vendors V ON POR.VendorID = V.VendorID
        LEFT JOIN Branches B ON POR.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON POR.WarehouseID = W.WarehouseID
        WHERE POR.CreatedBy = @CreatedBy AND POR.PurchaseOrderReturnStatus != 'New' AND POR.IsDeleted = 0
        AND POR.PurchaseOrderReturnStatus IN ('Picklist Started', 'Picklist Completed')
        `;
    if (values.PurchaseOrderReturnStatus) {
      query += ` AND POR.PurchaseOrderReturnStatus = @PurchaseOrderReturnStatus`;
    }
    let request = pool.request();
    request.input("CreatedBy", sql.Int, parseInt(user_id));
    if (values.PurchaseOrderReturnStatus) {
      request.input(
        "PurchaseOrderReturnStatus",
        sql.VarChar(50),
        values.PurchaseOrderReturnStatus,
      );
    }
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getAllPickListOrdersPurchaseOrderReturn: " +
        err.message,
    );
  }
}

async function getPurchaseOrderReturnAllPendingProductsForPicklist(
  pool,
  values,
) {
  try {
    let PurchaseOrderReturnID = values.PurchaseOrderReturnID;
    if (!PurchaseOrderReturnID) {
      throw new CustomError("PurchaseOrderReturnID is required");
    }
    let PurchaseOrderReturn = await getPurchaseOrderReturn(
      pool,
      PurchaseOrderReturnID,
    );
    let query = `
        SELECT PORP.*,
        POR.PurchaseOrderReturnNumber,
        PRD.ProductCode,
        PRD.ProductName,
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
        FROM PurchaseOrderReturnProducts PORP
        LEFT JOIN Users CU ON PORP.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON PORP.UpdatedBy = UU.UserID
        LEFT JOIN PurchaseOrderReturns POR ON PORP.PurchaseOrderReturnID = POR.PurchaseOrderReturnID
        LEFT JOIN Products PRD ON PORP.ProductID = PRD.ProductID
        LEFT JOIN Brands BR ON PRD.BrandID = BR.BrandID
        LEFT JOIN PackagingTypes PCK ON PRD.PackagingTypeID = PCK.PackagingTypeID
        LEFT JOIN Lines LN ON PRD.LineID = LN.LineID
        LEFT JOIN ProductConsumes PC ON PRD.ProductConsumeID = PC.ProductConsumeID
        LEFT JOIN ProductTypes PT ON PRD.ProductTypeID = PT.ProductTypeID
        LEFT JOIN UOMs U ON PORP.UOMID = U.UOMID
        LEFT JOIN Slocs S ON PORP.SLOCID = S.SLOCID
        LEFT JOIN Vendors V ON PORP.VendorID = V.VendorID
        LEFT JOIN Branches B ON PORP.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON PORP.WarehouseID = W.WarehouseID
        WHERE PORP.PurchaseOrderReturnID = @PurchaseOrderReturnID AND PORP.IsDeleted = 0 AND PORP.Pending_Quantity > 0
        `;
    let request = pool.request();
    request.input(
      "PurchaseOrderReturnID",
      sql.Int,
      parseInt(PurchaseOrderReturnID),
    );
    if (values.ProductID) {
      query += ` AND PORP.ProductID = @ProductID`;
      request.input("ProductID", sql.Int, parseInt(values.ProductID));
    }
    query += ` ORDER BY PORP.PurchaseOrderReturnProductID`;
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getPurchaseOrderReturnAllPendingProductsForPicklist: " +
        err.message,
    );
  }
}

async function getAllPicklistOrderPickedProductsPurchaseOrderReturn(
  pool,
  values,
) {
  try {
    let PurchaseOrderReturnID = values.PurchaseOrderReturnID;
    if (!PurchaseOrderReturnID) {
      throw new CustomError("PurchaseOrderReturnID is required");
    }
    let PurchaseOrderReturn = await getPurchaseOrderReturn(
      pool,
      PurchaseOrderReturnID,
    );
    if (PurchaseOrderReturn.IsDeleted) {
      throw new CustomError(
        "Purchase Order Return already deleted: " +
          PurchaseOrderReturn?.PurchaseOrderReturnNumber,
      );
    }
    if (
      PurchaseOrderReturn.PurchaseOrderReturnStatus !== "Open" &&
      PurchaseOrderReturn.PurchaseOrderReturnStatus !== "Picklist Started" &&
      PurchaseOrderReturn.PurchaseOrderReturnStatus !== "Picklist Completed"
    ) {
      throw new CustomError(
        `Invalid PurchaseOrderReturnStatus: ${PurchaseOrderReturn.PurchaseOrderReturnStatus}. Must be 'Open' or 'Picklist Started' or 'Picklist Completed'`,
      );
    }
    let query = `
        SELECT 
        BPL.BinProductLogID,
        BPL.ActionType,
        BPL.CreatedDate AS PickedDate,
        BPL.Quantity AS PickedQuantity,
        BP.*,
        B.BinNumber,
        ST.StackNumber,
        ST.StackName,
        PT.PalletName,
        PORP.PurchaseOrderReturnProductID,
        POR.PurchaseOrderReturnNumber,
        PRD.ProductCode,
        PRD.ProductName,
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
        JOIN PurchaseOrderReturnProducts PORP ON BPL.PurchaseOrderReturnProductID = PORP.PurchaseOrderReturnProductID
        JOIN PurchaseOrderReturns POR ON PORP.PurchaseOrderReturnID = POR.PurchaseOrderReturnID
        JOIN Products PRD ON BPL.ProductID = PRD.ProductID
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
        WHERE POR.PurchaseOrderReturnID = @PurchaseOrderReturnID
        AND BPL.ActionType = 3 -- Picked from Purchase Order Return
        ORDER BY BPL.CreatedDate
        `;
    let request = pool.request();
    request.input(
      "PurchaseOrderReturnID",
      sql.Int,
      parseInt(PurchaseOrderReturnID),
    );
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getAllPicklistOrderPickedProductsPurchaseOrderReturn: " +
        err.message,
    );
  }
}

async function suggestBinForPicklistPurchaseOrderReturn(pool, values) {
  try {
    const requiredFields = ["PurchaseOrderReturnProductID"];
    for (const key of requiredFields) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
    }
    const PurchaseOrderReturnProduct = await getPurchaseOrderReturnProduct(
      pool,
      values.PurchaseOrderReturnProductID,
    );
    if (PurchaseOrderReturnProduct.IsDeleted) {
      throw new CustomError(
        `Purchase Order Return Product already deleted: ${PurchaseOrderReturnProduct.PurchaseOrderReturnNumber}`,
      );
    }
    if (PurchaseOrderReturnProduct.Pending_Quantity <= 0) {
      throw new CustomError(
        `No quantity available for picklist: ${PurchaseOrderReturnProduct.Pending_Quantity}, Product: ${PurchaseOrderReturnProduct.ProductName}`,
      );
    }
    const PurchaseOrderReturn = await getPurchaseOrderReturn(
      pool,
      PurchaseOrderReturnProduct.PurchaseOrderReturnID,
    );
    if (PurchaseOrderReturn.IsDeleted) {
      throw new CustomError(
        `Purchase Order Return already deleted: ${PurchaseOrderReturn.PurchaseOrderReturnNumber}`,
      );
    }
    if (
      PurchaseOrderReturn.PurchaseOrderReturnStatus !== "Open" &&
      PurchaseOrderReturn.PurchaseOrderReturnStatus !== "Picklist Started"
    ) {
      throw new CustomError(
        `Invalid PurchaseOrderReturnStatus: ${PurchaseOrderReturn.PurchaseOrderReturnStatus}. Must be 'Open' or 'Picklist Started'`,
      );
    }
    const ProductID = PurchaseOrderReturnProduct.ProductID;
    const WarehouseID = PurchaseOrderReturnProduct.WarehouseID;
    const BatchNumber = PurchaseOrderReturnProduct.BatchNumber;
    const UOMID = PurchaseOrderReturnProduct.UOMID;
    const SLOCID = PurchaseOrderReturnProduct.SLOCID;
    const Quantity = values.Quantity
      ? Number(values.Quantity)
      : PurchaseOrderReturnProduct.Pending_Quantity;
    if (isNaN(Quantity) || Quantity <= 0) {
      throw new CustomError(`Invalid Quantity: ${values.Quantity}`);
    }
    if (Quantity > PurchaseOrderReturnProduct.Pending_Quantity) {
      throw new CustomError(
        `Quantity ${Quantity} exceeds Pending Quantity ${PurchaseOrderReturnProduct.Pending_Quantity}`,
      );
    }
    let maxQuantityQuery = `
            SELECT MAX(BP.FilledQuantity) AS MaxFilledQuantity
            FROM BinProducts BP
            JOIN Bins B ON BP.BinID = B.BinID
            WHERE BP.ProductID = @ProductID
            AND BP.BatchNumber = @BatchNumber
            AND BP.UOMID = @UOMID
            AND BP.SLOCID = @SLOCID
            AND BP.IsActive = 1
            AND B.IsActive = 1
            AND B.WarehouseID = @WarehouseID
            AND BP.FilledQuantity > 0;
        `;
    const maxQuantityRequest = pool
      .request()
      .input("ProductID", sql.Int, ProductID)
      .input("BatchNumber", sql.VarChar(100), BatchNumber)
      .input("UOMID", sql.Int, UOMID)
      .input("SLOCID", sql.Int, SLOCID)
      .input("WarehouseID", sql.Int, WarehouseID);
    const maxQuantityResult = await maxQuantityRequest.query(maxQuantityQuery);
    const maxFilledQuantity =
      maxQuantityResult.recordset[0]?.MaxFilledQuantity || 0;
    let suggestedBinQuery;
    let orderByClause;
    if (maxFilledQuantity < Quantity) {
      orderByClause = `ORDER BY BP.FilledQuantity DESC`;
    } else {
      orderByClause = `ORDER BY ABS(BP.FilledQuantity - @Quantity) ASC, BP.FilledQuantity ASC`;
    }
    suggestedBinQuery = `
            SELECT TOP 1
                BP.BinID,
                B.BinNumber,
                BP.PalletTypeID,
                PT.PalletName,
                BP.MaxQuantity,
                BP.FilledQuantity,
                BP.AvailableQuantity,
                BP.ManufactureDate,
                CASE 
                    WHEN BP.FilledQuantity = BP.MaxQuantity THEN 'Full'
                    WHEN BP.FilledQuantity > 0 AND BP.FilledQuantity < BP.MaxQuantity THEN 'Partial'
                    ELSE 'New'
                END AS BinStatus
            FROM BinProducts BP
            JOIN Bins B ON BP.BinID = B.BinID
            JOIN PalletTypes PT ON BP.PalletTypeID = PT.PalletTypeID
            WHERE BP.ProductID = @ProductID
            AND BP.BatchNumber = @BatchNumber
            AND BP.UOMID = @UOMID
            AND BP.SLOCID = @SLOCID
            AND BP.IsActive = 1
            AND B.IsActive = 1
            AND B.WarehouseID = @WarehouseID
            AND BP.FilledQuantity > 0
            ${orderByClause};
        `;
    const suggestedBinRequest = pool
      .request()
      .input("ProductID", sql.Int, ProductID)
      .input("BatchNumber", sql.VarChar(100), BatchNumber)
      .input("UOMID", sql.Int, UOMID)
      .input("SLOCID", sql.Int, SLOCID)
      .input("WarehouseID", sql.Int, WarehouseID)
      .input("Quantity", sql.Decimal(10, 2), Quantity);
    const suggestedBinResult =
      await suggestedBinRequest.query(suggestedBinQuery);
    let suggestedBin = suggestedBinResult.recordset[0];
    if (!suggestedBin) {
      throw new CustomError(
        `No suitable bin found for picklist for Product: ${PurchaseOrderReturnProduct.ProductName}. Please check the product details and available bins in inventory. Also validate the Batch Number, UOM, and SLOC.`,
      );
    }
    return suggestedBin;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in suggestBinForPicklistPurchaseOrderReturn: " +
        err.message,
    );
  }
}

async function fetchAllAvailableBinsForPicklistPurchaseOrderReturn(
  pool,
  values,
) {
  try {
    const requiredFields = ["PurchaseOrderReturnProductID"];
    for (const key of requiredFields) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
    }
    const PurchaseOrderReturnProduct = await getPurchaseOrderReturnProduct(
      pool,
      values.PurchaseOrderReturnProductID,
    );
    if (PurchaseOrderReturnProduct.IsDeleted) {
      throw new CustomError(
        `Purchase Order Return Product already deleted: ${PurchaseOrderReturnProduct.PurchaseOrderReturnNumber}`,
      );
    }
    if (PurchaseOrderReturnProduct.Pending_Quantity <= 0) {
      throw new CustomError(
        `No quantity available for picklist: ${PurchaseOrderReturnProduct.Pending_Quantity}, Product: ${PurchaseOrderReturnProduct.ProductName}`,
      );
    }
    const PurchaseOrderReturn = await getPurchaseOrderReturn(
      pool,
      PurchaseOrderReturnProduct.PurchaseOrderReturnID,
    );
    if (PurchaseOrderReturn.IsDeleted) {
      throw new CustomError(
        `Purchase Order Return already deleted: ${PurchaseOrderReturn.PurchaseOrderReturnNumber}`,
      );
    }
    if (
      PurchaseOrderReturn.PurchaseOrderReturnStatus !== "Open" &&
      PurchaseOrderReturn.PurchaseOrderReturnStatus !== "Picklist Started"
    ) {
      throw new CustomError(
        `Invalid PurchaseOrderReturnStatus: ${PurchaseOrderReturn.PurchaseOrderReturnStatus}. Must be 'Open' or 'Picklist Started'`,
      );
    }
    const ProductID = PurchaseOrderReturnProduct.ProductID;
    const WarehouseID = PurchaseOrderReturnProduct.WarehouseID;
    const BatchNumber = PurchaseOrderReturnProduct.BatchNumber;
    const UOMID = PurchaseOrderReturnProduct.UOMID;
    const SLOCID = PurchaseOrderReturnProduct.SLOCID;
    const Quantity = values.Quantity
      ? Number(values.Quantity)
      : PurchaseOrderReturnProduct.Pending_Quantity;
    if (isNaN(Quantity) || Quantity <= 0) {
      throw new CustomError(`Invalid Quantity: ${values.Quantity}`);
    }
    if (Quantity > PurchaseOrderReturnProduct.Pending_Quantity) {
      throw new CustomError(
        `Quantity ${Quantity} exceeds Pending Quantity ${PurchaseOrderReturnProduct.Pending_Quantity}`,
      );
    }
    let maxQuantityQuery = `
            SELECT MAX(BP.FilledQuantity) AS MaxFilledQuantity
            FROM BinProducts BP
            JOIN Bins B ON BP.BinID = B.BinID
            WHERE BP.ProductID = @ProductID
            AND BP.BatchNumber = @BatchNumber
            AND BP.UOMID = @UOMID
            AND BP.SLOCID = @SLOCID
            AND BP.IsActive = 1
            AND B.IsActive = 1
            AND B.WarehouseID = @WarehouseID
            AND BP.FilledQuantity > 0;
        `;
    const maxQuantityRequest = pool
      .request()
      .input("ProductID", sql.Int, ProductID)
      .input("BatchNumber", sql.VarChar(100), BatchNumber)
      .input("UOMID", sql.Int, UOMID)
      .input("SLOCID", sql.Int, SLOCID)
      .input("WarehouseID", sql.Int, WarehouseID);
    const maxQuantityResult = await maxQuantityRequest.query(maxQuantityQuery);
    const maxFilledQuantity =
      maxQuantityResult.recordset[0]?.MaxFilledQuantity || 0;
    let binsQuery;
    let orderByClause;
    if (maxFilledQuantity < Quantity) {
      orderByClause = `ORDER BY BP.FilledQuantity DESC`;
    } else {
      orderByClause = `ORDER BY ABS(BP.FilledQuantity - @Quantity) ASC, BP.FilledQuantity ASC`;
    }
    binsQuery = `
            SELECT
                BP.BinID,
                B.BinNumber,
                BP.PalletTypeID,
                PT.PalletName,
                BP.MaxQuantity,
                BP.FilledQuantity,
                BP.AvailableQuantity,
                BP.ManufactureDate,
                CASE 
                    WHEN BP.FilledQuantity = BP.MaxQuantity THEN 'Full'
                    WHEN BP.FilledQuantity > 0 AND BP.FilledQuantity < BP.MaxQuantity THEN 'Partial'
                    ELSE 'New'
                END AS BinStatus
            FROM BinProducts BP
            JOIN Bins B ON BP.BinID = B.BinID
            JOIN PalletTypes PT ON BP.PalletTypeID = PT.PalletTypeID
            WHERE BP.ProductID = @ProductID
            AND BP.BatchNumber = @BatchNumber
            AND BP.UOMID = @UOMID
            AND BP.SLOCID = @SLOCID
            AND BP.IsActive = 1
            AND B.IsActive = 1
            AND B.WarehouseID = @WarehouseID
            AND BP.FilledQuantity > 0
            ${orderByClause};
        `;
    const binsRequest = pool
      .request()
      .input("ProductID", sql.Int, ProductID)
      .input("BatchNumber", sql.VarChar(100), BatchNumber)
      .input("UOMID", sql.Int, UOMID)
      .input("SLOCID", sql.Int, SLOCID)
      .input("WarehouseID", sql.Int, WarehouseID)
      .input("Quantity", sql.Decimal(10, 2), Quantity);
    const binsResult = await binsRequest.query(binsQuery);
    const bins = binsResult.recordset;
    if (bins.length === 0) {
      throw new CustomError(
        `No suitable bins found for picklist for Product: ${PurchaseOrderReturnProduct.ProductName}. Please check the product details and available bins in inventory. Also validate the Batch Number, UOM, and SLOC.`,
      );
    }
    return bins;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in fetchAllAvailableBinsForPicklistPurchaseOrderReturn: " +
        err.message,
    );
  }
}

async function validateBinNumberForPicklistPurchaseOrderReturn(pool, values) {
  try {
    const requiredFields = ["PurchaseOrderReturnProductID", "BinNumber"];
    for (const key of requiredFields) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
    }
    const PurchaseOrderReturnProduct = await getPurchaseOrderReturnProduct(
      pool,
      values.PurchaseOrderReturnProductID,
    );
    if (PurchaseOrderReturnProduct.IsDeleted) {
      throw new CustomError(
        `Purchase Order Return Product already deleted: ${PurchaseOrderReturnProduct.PurchaseOrderReturnNumber}`,
      );
    }
    if (PurchaseOrderReturnProduct.Pending_Quantity <= 0) {
      throw new CustomError(
        `No quantity available for picklist: ${PurchaseOrderReturnProduct.Pending_Quantity}, Product: ${PurchaseOrderReturnProduct.ProductName}`,
      );
    }
    const PurchaseOrderReturn = await getPurchaseOrderReturn(
      pool,
      PurchaseOrderReturnProduct.PurchaseOrderReturnID,
    );
    if (PurchaseOrderReturn.IsDeleted) {
      throw new CustomError(
        `Purchase Order Return already deleted: ${PurchaseOrderReturn.PurchaseOrderReturnNumber}`,
      );
    }
    if (
      PurchaseOrderReturn.PurchaseOrderReturnStatus !== "Open" &&
      PurchaseOrderReturn.PurchaseOrderReturnStatus !== "Picklist Started"
    ) {
      throw new CustomError(
        `Invalid PurchaseOrderReturnStatus: ${PurchaseOrderReturn.PurchaseOrderReturnStatus}. Must be 'Open' or 'Picklist Started'`,
      );
    }
    const ProductID = PurchaseOrderReturnProduct.ProductID;
    const WarehouseID = PurchaseOrderReturnProduct.WarehouseID;
    const BatchNumber = PurchaseOrderReturnProduct.BatchNumber;
    const UOMID = PurchaseOrderReturnProduct.UOMID;
    const SLOCID = PurchaseOrderReturnProduct.SLOCID;
    const Quantity = values.Quantity
      ? Number(values.Quantity)
      : PurchaseOrderReturnProduct.Pending_Quantity;
    if (isNaN(Quantity) || Quantity <= 0) {
      throw new CustomError(`Invalid Quantity: ${values.Quantity}`);
    }
    if (Quantity > PurchaseOrderReturnProduct.Pending_Quantity) {
      throw new CustomError(
        `Quantity ${Quantity} exceeds Pending Quantity ${PurchaseOrderReturnProduct.Pending_Quantity}`,
      );
    }
    const bin = await commonService.fetchBinDetails_BinNumber(
      pool,
      values.BinNumber,
      WarehouseID,
    );
    const binProductQuery = `
            SELECT BP.*, B.BinNumber, PT.PalletName,
                CASE 
                    WHEN BP.FilledQuantity = BP.MaxQuantity THEN 'Full'
                    WHEN BP.FilledQuantity > 0 AND BP.FilledQuantity < BP.MaxQuantity THEN 'Partial'
                    ELSE 'New'
                END AS BinStatus
            FROM BinProducts BP
            JOIN Bins B ON BP.BinID = B.BinID
            JOIN PalletTypes PT ON BP.PalletTypeID = PT.PalletTypeID
            WHERE BP.BinID = @BinID
            AND BP.ProductID = @ProductID
            AND BP.BatchNumber = @BatchNumber
            AND BP.UOMID = @UOMID
            AND BP.SLOCID = @SLOCID
            AND BP.IsActive = 1
            AND BP.FilledQuantity > 0;
        `;
    const binProductRequest = pool
      .request()
      .input("BinID", sql.Int, parseInt(bin.BinID))
      .input("ProductID", sql.Int, ProductID)
      .input("BatchNumber", sql.VarChar(100), BatchNumber)
      .input("UOMID", sql.Int, UOMID)
      .input("SLOCID", sql.Int, SLOCID)
      .input("Quantity", sql.Decimal(10, 2), Quantity);
    const binProductResult = await binProductRequest.query(binProductQuery);
    let binProduct = binProductResult.recordset[0];
    if (!binProduct) {
      throw new CustomError(
        `No suitable bin found for BinNumber: ${values.BinNumber} with sufficient quantity for Product: ${PurchaseOrderReturnProduct.ProductName}, please check the bin details and available quantity. Also validate the Batch Number, UOM, and SLOC.`,
      );
    }
    return {
      BinID: binProduct.BinID,
      BinNumber: binProduct.BinNumber,
      PalletTypeID: binProduct.PalletTypeID,
      PalletName: binProduct.PalletName,
      MaxQuantity: binProduct.MaxQuantity,
      FilledQuantity: binProduct.FilledQuantity,
      AvailableQuantity: binProduct.AvailableQuantity,
      ManufactureDate: binProduct.ManufactureDate,
      BinStatus: binProduct.BinStatus,
    };
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in validateBinNumberForPicklistPurchaseOrderReturn: " +
        err.message,
    );
  }
}

async function pickProductFromBinForPicklistPurchaseOrderReturn(pool, values) {
  try {
    const requiredFields = [
      "PurchaseOrderReturnProductID",
      "BinID",
      "Quantity",
    ];
    for (const key of requiredFields) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
    }
    const PurchaseOrderReturnProduct = await getPurchaseOrderReturnProduct(
      pool,
      values.PurchaseOrderReturnProductID,
    );
    if (PurchaseOrderReturnProduct.IsDeleted) {
      throw new CustomError(
        `Purchase Order Return Product already deleted: ${PurchaseOrderReturnProduct.PurchaseOrderReturnNumber}`,
      );
    }
    if (PurchaseOrderReturnProduct.Pending_Quantity <= 0) {
      throw new CustomError(
        `No quantity available for picklist: ${PurchaseOrderReturnProduct.Pending_Quantity}, Product: ${PurchaseOrderReturnProduct.ProductName}`,
      );
    }
    const PurchaseOrderReturn = await getPurchaseOrderReturn(
      pool,
      PurchaseOrderReturnProduct.PurchaseOrderReturnID,
    );
    if (PurchaseOrderReturn.IsDeleted) {
      throw new CustomError(
        `Purchase Order Return already deleted: ${PurchaseOrderReturn.PurchaseOrderReturnNumber}`,
      );
    }
    if (
      PurchaseOrderReturn.PurchaseOrderReturnStatus !== "Open" &&
      PurchaseOrderReturn.PurchaseOrderReturnStatus !== "Picklist Started"
    ) {
      throw new CustomError(
        `Invalid PurchaseOrderReturnStatus: ${PurchaseOrderReturn.PurchaseOrderReturnStatus}. Must be 'Open' or 'Picklist Started'`,
      );
    }
    const ProductID = PurchaseOrderReturnProduct.ProductID;
    const VendorID = PurchaseOrderReturnProduct.VendorID;
    const BranchID = PurchaseOrderReturnProduct.BranchID;
    const WarehouseID = PurchaseOrderReturnProduct.WarehouseID;
    const BatchNumber = PurchaseOrderReturnProduct.BatchNumber;
    const UOMID = PurchaseOrderReturnProduct.UOMID;
    const SLOCID = PurchaseOrderReturnProduct.SLOCID;
    const Quantity = Number(values.Quantity);
    if (isNaN(Quantity) || Quantity <= 0) {
      throw new CustomError(`Invalid Quantity: ${values.Quantity}`);
    }
    if (Quantity > PurchaseOrderReturnProduct.Pending_Quantity) {
      throw new CustomError(
        `Quantity ${Quantity} exceeds Pending Quantity ${PurchaseOrderReturnProduct.Pending_Quantity}`,
      );
    }
    const bin = await commonService.fetchBinDetails(pool, values.BinID);
    const PalletTypeID = bin.PalletTypeID;
    const StackID = bin.StacktID;
    const binProductQuery = `
            SELECT *
            FROM BinProducts
            WHERE BinID = @BinID
            AND ProductID = @ProductID
            AND BatchNumber = @BatchNumber
            AND UOMID = @UOMID
            AND SLOCID = @SLOCID
            AND IsActive = 1
            AND FilledQuantity > 0;
        `;
    const binProductRequest = pool
      .request()
      .input("BinID", sql.Int, parseInt(values.BinID))
      .input("ProductID", sql.Int, ProductID)
      .input("BatchNumber", sql.VarChar(100), BatchNumber)
      .input("UOMID", sql.Int, UOMID)
      .input("SLOCID", sql.Int, SLOCID)
      .input("Quantity", sql.Decimal(10, 2), Quantity);
    const binProductResult = await binProductRequest.query(binProductQuery);
    let binProduct = binProductResult.recordset[0];
    if (!binProduct) {
      throw new CustomError(
        `No suitable bin found with sufficient quantity for Product: ${PurchaseOrderReturnProduct.ProductName}`,
      );
    }
    if (binProduct.FilledQuantity < Quantity) {
      throw new CustomError(
        `Insufficient quantity in bin: ${bin.BinNumber} for Product: ${PurchaseOrderReturnProduct.ProductName}. Available: ${binProduct.FilledQuantity}, Requested: ${Quantity}`,
      );
    }
    const singleQuery = `
            DECLARE @BinProductID INT = ${binProduct.BinProductID};
            DECLARE @PreviousFilledQuantity DECIMAL(10,2) = ${binProduct.FilledQuantity};
            DECLARE @PreviousAvailableQuantity DECIMAL(10,2) = ${binProduct.AvailableQuantity};
            DECLARE @NewFilledQuantity DECIMAL(10,2) = @PreviousFilledQuantity - @Quantity;
            DECLARE @NewAvailableQuantity DECIMAL(10,2) = @PreviousAvailableQuantity + @Quantity;
            DECLARE @NewPickedQuantity DECIMAL(10,2) = ${PurchaseOrderReturnProduct.Picked_Quantity} + @Quantity;
            DECLARE @NewPendingQuantity DECIMAL(10,2) = ${PurchaseOrderReturnProduct.Pending_Quantity} - @Quantity;
            UPDATE BinProducts
            SET 
                FilledQuantity = @NewFilledQuantity,
                AvailableQuantity = @NewAvailableQuantity,
                IsActive = CASE WHEN @NewFilledQuantity = 0 THEN 0 ELSE 1 END,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE BinProductID = @BinProductID;
            UPDATE PurchaseOrderReturnProducts
            SET 
                Picked_Quantity = @NewPickedQuantity,
                Pending_Quantity = @NewPendingQuantity,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE PurchaseOrderReturnProductID = @PurchaseOrderReturnProductID;
            INSERT INTO BinProductLogs (
                BinID, BinProductID, ProductID, PalletTypeID, StackID, VendorID, BranchID, WarehouseID,
                ActionType, PurchaseOrderReturnProductID,
                Quantity, PreviousFilledQuantity, NewFilledQuantity,
                PreviousAvailableQuantity, NewAvailableQuantity, CreatedBy
            )
            VALUES (
                @BinID, @BinProductID, @ProductID, @PalletTypeID, @StackID, @VendorID, @BranchID, @WarehouseID,
                3, @PurchaseOrderReturnProductID,
                @Quantity, @PreviousFilledQuantity, @NewFilledQuantity,
                @PreviousAvailableQuantity, @NewAvailableQuantity, @CreatedBy
            );
            IF NOT EXISTS (
                SELECT 1 
                FROM PurchaseOrderReturnProducts PORP
                WHERE PORP.PurchaseOrderReturnID = @PurchaseOrderReturnID 
                AND ROUND(PORP.Pending_Quantity, 2) > 0 
                AND PORP.IsDeleted = 0
            )
            BEGIN
                UPDATE PurchaseOrderReturns
                SET 
                    PurchaseOrderReturnStatus = 'Picklist Completed',
                    UpdatedBy = @UpdatedBy,
                    UpdatedDate = GETDATE()
                WHERE PurchaseOrderReturnID = @PurchaseOrderReturnID;
            END
            IF EXISTS (
                SELECT 1 
                FROM PurchaseOrderReturnProducts PORP
                WHERE PORP.PurchaseOrderReturnID = @PurchaseOrderReturnID 
                AND ROUND(PORP.Pending_Quantity, 2) > 0 
                AND PORP.IsDeleted = 0
            )
            BEGIN
                UPDATE PurchaseOrderReturns
                SET 
                    PurchaseOrderReturnStatus = 'Picklist Started',
                    UpdatedBy = @UpdatedBy,
                    UpdatedDate = GETDATE()
                WHERE PurchaseOrderReturnID = @PurchaseOrderReturnID;
            END
            SELECT BP.*, B.BinNumber, PT.PalletName,
                CASE 
                    WHEN BP.FilledQuantity = BP.MaxQuantity THEN 'Full'
                    WHEN BP.FilledQuantity > 0 AND BP.FilledQuantity < BP.MaxQuantity THEN 'Partial'
                    ELSE 'New'
                END AS BinStatus
            FROM BinProducts BP
            JOIN Bins B ON BP.BinID = B.BinID
            JOIN PalletTypes PT ON BP.PalletTypeID = PT.PalletTypeID
            WHERE BP.BinProductID = @BinProductID;
        `;
    const singleRequest = pool
      .request()
      .input("BinID", sql.Int, parseInt(values.BinID))
      .input("PalletTypeID", sql.Int, PalletTypeID)
      .input("StackID", sql.Int, StackID)
      .input("VendorID", sql.Int, VendorID)
      .input("BranchID", sql.Int, BranchID)
      .input("WarehouseID", sql.Int, WarehouseID)
      .input("ProductID", sql.Int, ProductID)
      .input("BatchNumber", sql.VarChar(100), BatchNumber)
      .input("UOMID", sql.Int, UOMID)
      .input("SLOCID", sql.Int, SLOCID)
      .input("Quantity", sql.Decimal(10, 2), Quantity)
      .input("CreatedBy", sql.Int, parseInt(values.user_id))
      .input("UpdatedBy", sql.Int, parseInt(values.user_id))
      .input(
        "PurchaseOrderReturnProductID",
        sql.Int,
        parseInt(values.PurchaseOrderReturnProductID),
      )
      .input(
        "PurchaseOrderReturnID",
        sql.Int,
        PurchaseOrderReturnProduct.PurchaseOrderReturnID,
      );
    const singleResult = await singleRequest.query(singleQuery);
    if (!singleResult.recordset || singleResult.recordset.length === 0) {
      throw new CustomError("Failed to retrieve updated BinProduct");
    }
    return singleResult.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in pickProductFromBinForPicklistPurchaseOrderReturn: " +
        err.message,
    );
  }
}

async function getNewPurchaseOrderReturnShipment(pool, values) {
  try {
    let shipmentOrder = {
      PurchaseOrderReturnShipmentDate: moment(new Date()).format("YYYY-MM-DD"),
      CreatedBy: values.user_id,
      UpdatedBy: values.user_id,
    };
    let query = `
            DECLARE @OutputTable TABLE (
                PurchaseOrderReturnShipmentID INT
            );
            INSERT INTO PurchaseOrderReturnShipments (
                PurchaseOrderReturnShipmentDate, CreatedBy, UpdatedBy
            )
            OUTPUT 
                INSERTED.PurchaseOrderReturnShipmentID
            INTO @OutputTable
            VALUES (
                @PurchaseOrderReturnShipmentDate, @CreatedBy, @UpdatedBy
            );
            SELECT * FROM @OutputTable;
        `;
    let request = pool
      .request()
      .input(
        "PurchaseOrderReturnShipmentDate",
        sql.Date,
        shipmentOrder.PurchaseOrderReturnShipmentDate,
      )
      .input("CreatedBy", sql.Int, shipmentOrder.CreatedBy)
      .input("UpdatedBy", sql.Int, shipmentOrder.UpdatedBy);
    let result = await request.query(query);
    let insertedRecordId = result.recordset[0].PurchaseOrderReturnShipmentID;
    let PurchaseOrderReturnShipment = await getPurchaseOrderReturnShipment(
      pool,
      insertedRecordId,
    );
    return PurchaseOrderReturnShipment;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getNewPurchaseOrderReturnShipment: " + err.message,
    );
  }
}

async function getPurchaseOrderReturnShipment(
  pool,
  PurchaseOrderReturnShipmentID,
) {
  try {
    if (!PurchaseOrderReturnShipmentID) {
      throw new CustomError("PurchaseOrderReturnShipmentID is required");
    }
    const input = String(PurchaseOrderReturnShipmentID).trim();
    const isNumeric = /^\d+$/.test(input);
    let query = `
            SELECT PORS.*,
                POR.PurchaseOrderReturnNumber,
                POR.PurchaseOrderReturnDate,
                POR.DeliveryDate,
                POR.DeliveryAddress,
                POR.PersonInChargeInternal,
                POR.PersonInChargeVendor,
                POR.PersonInChargeCustomer,
                CU.UserName AS CreatedByUserName,
                UU.UserName AS UpdatedByUserName,
                V.VendorName,
                B.BranchName,
                W.WarehouseName,
                VT.vehicleTypeName,
                VT.VehicleTypeCapacityTonnes,
                (
                    SELECT COALESCE(SUM(PORP.Quantity), 0)
                    FROM PurchaseOrderReturnProducts PORP
                    WHERE PORP.PurchaseOrderReturnID = PORS.PurchaseOrderReturnID AND PORP.IsDeleted = 0
                ) AS total_quantity,
                (
                    SELECT COALESCE(SUM(PORP.MRP), 0)
                    FROM PurchaseOrderReturnProducts PORP
                    WHERE PORP.PurchaseOrderReturnID = POR.PurchaseOrderReturnID AND PORP.IsDeleted = 0
                ) AS total_MRP
            FROM PurchaseOrderReturnShipments PORS
            LEFT JOIN Users CU ON PORS.CreatedBy = CU.UserID
            LEFT JOIN Users UU ON PORS.UpdatedBy = UU.UserID
            LEFT JOIN PurchaseOrderReturns POR ON PORS.PurchaseOrderReturnID = POR.PurchaseOrderReturnID
            LEFT JOIN Vendors V ON PORS.VendorID = V.VendorID
            LEFT JOIN Branches B ON PORS.BranchID = B.BranchID
            LEFT JOIN Warehouses W ON PORS.WarehouseID = W.WarehouseID
            LEFT JOIN VehicleTypes VT ON PORS.VehicleTypeID = VT.VehicleTypeID
        `;
    let request = pool.request();
    if (isNumeric) {
      query += ` WHERE PORS.PurchaseOrderReturnShipmentID = @PurchaseOrderReturnShipmentID`;
      request.input("PurchaseOrderReturnShipmentID", sql.Int, parseInt(input));
    } else {
      query += ` WHERE PORS.PurchaseOrderReturnShipmentNumber = @PurchaseOrderReturnShipmentNumber`;
      request.input(
        "PurchaseOrderReturnShipmentNumber",
        sql.VarChar(20),
        input,
      );
    }
    let result = await request.query(query);
    if (result.recordset.length === 0) {
      throw new CustomError(
        "No purchase order return shipment found with the given ID",
      );
    }
    let PurchaseOrderReturnShipment = result.recordset[0];
    if (PurchaseOrderReturnShipment.IsDeleted) {
      throw new CustomError(
        "Purchase Order Return Shipment already deleted: " +
          PurchaseOrderReturnShipment?.PurchaseOrderReturnShipmentNumber,
      );
    }
    return PurchaseOrderReturnShipment;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getPurchaseOrderReturnShipment: " + err.message,
    );
  }
}

async function getAllPurchaseOrderReturnShipments(pool, values) {
  try {
    let user_id = values.user_id;
    let query = `
            SELECT PORS.*,
                POR.PurchaseOrderReturnNumber,
                POR.PurchaseOrderReturnDate,
                POR.DeliveryDate,
                POR.DeliveryAddress,
                POR.PersonInChargeInternal,
                POR.PersonInChargeVendor,
                POR.PersonInChargeCustomer,
                CU.UserName AS CreatedByUserName,
                UU.UserName AS UpdatedByUserName,
                V.VendorName,
                B.BranchName,
                W.WarehouseName,
                VT.vehicleTypeName,
                VT.VehicleTypeCapacityTonnes,
                (
                    SELECT COALESCE(SUM(PORP.Quantity), 0)
                    FROM PurchaseOrderReturnProducts PORP
                    WHERE PORP.PurchaseOrderReturnID = PORS.PurchaseOrderReturnID AND PORP.IsDeleted = 0
                ) AS total_quantity,
                (
                    SELECT COALESCE(SUM(PORP.MRP), 0)
                    FROM PurchaseOrderReturnProducts PORP
                    WHERE PORP.PurchaseOrderReturnID = POR.PurchaseOrderReturnID AND PORP.IsDeleted = 0
                ) AS total_MRP
            FROM PurchaseOrderReturnShipments PORS
            INNER JOIN PurchaseOrderReturns POR ON PORS.PurchaseOrderReturnID = POR.PurchaseOrderReturnID
            LEFT JOIN Users CU ON PORS.CreatedBy = CU.UserID
            LEFT JOIN Users UU ON PORS.UpdatedBy = UU.UserID
            LEFT JOIN Vendors V ON PORS.VendorID = V.VendorID
            LEFT JOIN Branches B ON PORS.BranchID = B.BranchID
            LEFT JOIN Warehouses W ON PORS.WarehouseID = W.WarehouseID
            LEFT JOIN VehicleTypes VT ON PORS.VehicleTypeID = VT.VehicleTypeID
            WHERE PORS.CreatedBy = @CreatedBy AND PORS.IsDeleted = 0
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
      "Catch Exception in getAllPurchaseOrderReturnShipments: " + err.message,
    );
  }
}
async function updatePurchaseOrderReturnShipment(pool, values) {
  try {
    const requiredFields = [
      "PurchaseOrderReturnShipmentID",
      "PurchaseOrderReturnID",
      "VendorID",
      "BranchID",
      "WarehouseID",
      "VehicleTypeID",
    ];
    for (const key of requiredFields) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
    }
    if (isNaN(values.PurchaseOrderReturnShipmentID)) {
      throw new CustomError(
        `Invalid PurchaseOrderReturnShipmentID: ${values.PurchaseOrderReturnShipmentID}`,
      );
    }
    const purchaseOrderReturnShipment = await getPurchaseOrderReturnShipment(
      pool,
      values.PurchaseOrderReturnShipmentID,
    );
    if (purchaseOrderReturnShipment.IsDeleted) {
      throw new CustomError(
        "Purchase Order Return Shipment already deleted: " +
          purchaseOrderReturnShipment?.PurchaseOrderReturnShipmentNumber,
      );
    }
    if (isNaN(values.PurchaseOrderReturnID)) {
      throw new CustomError(
        `Invalid PurchaseOrderReturnID: ${values.PurchaseOrderReturnID}`,
      );
    }
    const purchaseOrderReturn = await getPurchaseOrderReturn(
      pool,
      values.PurchaseOrderReturnID,
    );
    if (
      purchaseOrderReturn.PurchaseOrderReturnStatus !== "Picklist Completed"
    ) {
      throw new CustomError(
        `Cannot update Purchase Order Return Shipment with Purchase Order Return status: ${purchaseOrderReturn.PurchaseOrderReturnStatus}. Must be 'Picklist Completed'`,
      );
    }
    if (purchaseOrderReturn.IsShipment != 0) {
      throw new CustomError(
        `Purchase Order Return already has a shipment: IsShipment = ${purchaseOrderReturn.IsShipment}`,
      );
    }
    const query = `
            UPDATE PurchaseOrderReturnShipments
            SET 
                PurchaseOrderReturnID = @PurchaseOrderReturnID,
                VendorID = @VendorID,
                BranchID = @BranchID,
                WarehouseID = @WarehouseID,
                VehicleTypeID = @VehicleTypeID,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE PurchaseOrderReturnShipmentID = @PurchaseOrderReturnShipmentID;
            UPDATE PurchaseOrderReturns
            SET 
                IsShipment = 1,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE PurchaseOrderReturnID = @PurchaseOrderReturnID;
        `;
    const request = pool
      .request()
      .input(
        "PurchaseOrderReturnShipmentID",
        sql.Int,
        parseInt(values.PurchaseOrderReturnShipmentID),
      )
      .input(
        "PurchaseOrderReturnID",
        sql.Int,
        parseInt(values.PurchaseOrderReturnID),
      )
      .input("VendorID", sql.Int, parseInt(values.VendorID))
      .input("BranchID", sql.Int, parseInt(values.BranchID))
      .input("WarehouseID", sql.Int, parseInt(values.WarehouseID))
      .input("VehicleTypeID", sql.Int, parseInt(values.VehicleTypeID))
      .input("UpdatedBy", sql.Int, parseInt(values.user_id));
    const result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      throw new CustomError(
        "No Purchase Order Return Shipment found with provided PurchaseOrderReturnShipmentID",
      );
    }
    const updatedPurchaseOrderReturnShipment =
      await getPurchaseOrderReturnShipment(
        pool,
        values.PurchaseOrderReturnShipmentID,
      );
    return updatedPurchaseOrderReturnShipment;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in updatePurchaseOrderReturnShipment: " + err.message,
    );
  }
}

module.exports.getNewPurchaseOrderReturn = getNewPurchaseOrderReturn;
module.exports.getPurchaseOrderReturn = getPurchaseOrderReturn;
module.exports.getAllPurchaseOrderReturns = getAllPurchaseOrderReturns;
module.exports.updatePurchaseOrderReturn = updatePurchaseOrderReturn;
module.exports.deletePurchaseOrderReturn = deletePurchaseOrderReturn;
module.exports.getAllAvailableBinProducts = getAllAvailableBinProducts;
module.exports.getAllBinProductsBatchNumbers = getAllBinProductsBatchNumbers;
module.exports.addNewProductForPurchaseOrderReturn =
  addNewProductForPurchaseOrderReturn;
module.exports.getPurchaseOrderReturnProduct = getPurchaseOrderReturnProduct;
module.exports.getPurchaseOrderReturnAllProducts =
  getPurchaseOrderReturnAllProducts;
module.exports.updatePurchaseOrderReturnProduct =
  updatePurchaseOrderReturnProduct;
module.exports.deletePurchaseOrderReturnProduct =
  deletePurchaseOrderReturnProduct;
module.exports.getAllPickListOrdersPurchaseOrderReturn =
  getAllPickListOrdersPurchaseOrderReturn;
module.exports.getPurchaseOrderReturnAllPendingProductsForPicklist =
  getPurchaseOrderReturnAllPendingProductsForPicklist;
module.exports.getAllPicklistOrderPickedProductsPurchaseOrderReturn =
  getAllPicklistOrderPickedProductsPurchaseOrderReturn;
module.exports.suggestBinForPicklistPurchaseOrderReturn =
  suggestBinForPicklistPurchaseOrderReturn;
module.exports.fetchAllAvailableBinsForPicklistPurchaseOrderReturn =
  fetchAllAvailableBinsForPicklistPurchaseOrderReturn;
module.exports.validateBinNumberForPicklistPurchaseOrderReturn =
  validateBinNumberForPicklistPurchaseOrderReturn;
module.exports.pickProductFromBinForPicklistPurchaseOrderReturn =
  pickProductFromBinForPicklistPurchaseOrderReturn;
module.exports.getNewPurchaseOrderReturnShipment =
  getNewPurchaseOrderReturnShipment;
module.exports.getPurchaseOrderReturnShipment = getPurchaseOrderReturnShipment;
module.exports.getAllPurchaseOrderReturnShipments =
  getAllPurchaseOrderReturnShipments;
module.exports.updatePurchaseOrderReturnShipment =
  updatePurchaseOrderReturnShipment;
