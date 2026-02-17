const config = require("config");
const moment = require("moment");
const sql = require("mssql");
const commonService = require("./Common_Service");
const { CustomError } = require("../model/CustomError");

function getTodayDate() {
  return moment().format("YYYY-MM-DD");
}

async function findBestPalletForQuantity(pallets, userQuantity) {
  if (!pallets || pallets.length === 0) {
    return null;
  }
  const sortedPallets = [...pallets].sort(
    (a, b) => a.MaxCapacity - b.MaxCapacity,
  );
  const lowestMax = sortedPallets[0].MaxCapacity;
  const highestMax = sortedPallets[sortedPallets.length - 1].MaxCapacity;
  if (userQuantity > highestMax) {
    return sortedPallets[sortedPallets.length - 1];
  }
  if (userQuantity < lowestMax) {
    return sortedPallets[0];
  }
  for (let pallet of sortedPallets) {
    if (pallet.MaxCapacity >= userQuantity) {
      return pallet;
    }
  }
  return sortedPallets[0];
}

async function getNewSalesOrderReturn(pool, values) {
  try {
    let newSalesOrderReturn = {
      SalesOrderReturnDate: moment(new Date()).format("YYYY-MM-DD"),
      CreatedBy: values.user_id,
      UpdatedBy: values.user_id,
    };
    let query = `
                DECLARE @OutputTable TABLE (
                        SalesOrderReturnID INT
                );
                INSERT INTO SalesOrderReturns (
                    SalesOrderReturnDate, CreatedBy, UpdatedBy
                )
                OUTPUT
                    INSERTED.SalesOrderReturnID
                INTO @OutputTable
                VALUES (
                    @SalesOrderReturnDate, @CreatedBy, @UpdatedBy
                );
                SELECT * FROM @OutputTable;
            `;
    let request = pool
      .request()
      .input(
        "SalesOrderReturnDate",
        sql.Date,
        newSalesOrderReturn.SalesOrderReturnDate,
      )
      .input("CreatedBy", sql.Int, newSalesOrderReturn.CreatedBy)
      .input("UpdatedBy", sql.Int, newSalesOrderReturn.UpdatedBy);
    let result = await request.query(query);
    let insertedRecordId = result.recordset[0].SalesOrderReturnID;
    let SalesOrderReturn = await getSalesOrderReturn(pool, insertedRecordId);
    return SalesOrderReturn;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getNewSalesOrderReturn: " + err.message,
    );
  }
}

async function getSalesOrderReturn(pool, SalesOrderReturnID) {
  try {
    if (!SalesOrderReturnID) {
      throw new CustomError("SalesOrderReturnID is required");
    }
    const input = String(SalesOrderReturnID).trim();
    const isNumeric = /^\d+$/.test(input);
    let query = `
        SELECT SOR.*,
        CU.UserName AS CreatedByUserName,
        UU.UserName AS UpdatedByUserName,
        C.CustomerName,
        B.BranchName,
        W.WarehouseName,
        (
            SELECT COALESCE(SUM(SORP.Quantity), 0)
            FROM SalesOrderReturnProducts SORP
            WHERE SORP.SalesOrderReturnID = SOR.SalesOrderReturnID AND SORP.IsDeleted = 0
        ) AS total_quantity,
        (
            SELECT COALESCE(SUM(SORP.MRP), 0)
            FROM SalesOrderReturnProducts SORP
            WHERE SORP.SalesOrderReturnID = SOR.SalesOrderReturnID AND SORP.IsDeleted = 0
        ) AS total_MRP
        FROM SalesOrderReturns SOR
        LEFT JOIN Users CU ON SOR.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON SOR.UpdatedBy = UU.UserID
        LEFT JOIN Customers C ON SOR.CustomerID = C.CustomerID
        LEFT JOIN Branches B ON SOR.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON SOR.WarehouseID = W.WarehouseID
        `;
    let request = pool.request();
    if (isNumeric) {
      query += ` WHERE SOR.SalesOrderReturnID = @SalesOrderReturnID`;
      request.input("SalesOrderReturnID", sql.Int, parseInt(input));
    } else {
      query += ` WHERE SOR.SalesOrderReturnNumber = @SalesOrderReturnNumber`;
      request.input("SalesOrderReturnNumber", sql.VarChar(20), input);
    }
    let result = await request.query(query);
    if (result.recordset.length === 0) {
      throw new CustomError("No sales order return found with the given ID");
    }
    let SalesOrderReturn = result.recordset[0];
    if (SalesOrderReturn.SalesOrderReturnStatus == "New") {
      SalesOrderReturn.SalesOrderReturnStatus = "Draft";
    }
    if (SalesOrderReturn.IsDeleted) {
      throw new CustomError(
        "Sales Order Return already deleted: " +
          SalesOrderReturn?.SalesOrderReturnNumber,
      );
    }
    return SalesOrderReturn;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getSalesOrderReturn: " + err.message,
    );
  }
}

async function getAllSalesOrderReturns(pool, values) {
  try {
    let user_id = values.user_id;
    let query = `
        SELECT SOR.*,
        CU.UserName AS CreatedByUserName,
        UU.UserName AS UpdatedByUserName,
        C.CustomerName,
        B.BranchName,
        W.WarehouseName,
        (
            SELECT COALESCE(SUM(SORP.Quantity), 0)
            FROM SalesOrderReturnProducts SORP
            WHERE SORP.SalesOrderReturnID = SOR.SalesOrderReturnID AND SORP.IsDeleted = 0
        ) AS total_quantity,
        (
            SELECT COALESCE(SUM(SORP.MRP), 0)
            FROM SalesOrderReturnProducts SORP
            WHERE SORP.SalesOrderReturnID = SOR.SalesOrderReturnID AND SORP.IsDeleted = 0
        ) AS total_MRP
        FROM SalesOrderReturns SOR
        LEFT JOIN Users CU ON SOR.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON SOR.UpdatedBy = UU.UserID
        LEFT JOIN Customers C ON SOR.CustomerID = C.CustomerID
        LEFT JOIN Branches B ON SOR.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON SOR.WarehouseID = W.WarehouseID
        WHERE SOR.CreatedBy = @CreatedBy AND SOR.SalesOrderReturnStatus != 'New' AND SOR.IsDeleted = 0
        `;
    if (values.SalesOrderReturnStatus) {
      query += ` AND SOR.SalesOrderReturnStatus = @SalesOrderReturnStatus`;
    }
    let request = pool.request();
    request.input("CreatedBy", sql.Int, parseInt(user_id));
    if (values.SalesOrderReturnStatus) {
      request.input(
        "SalesOrderReturnStatus",
        sql.VarChar(50),
        values.SalesOrderReturnStatus,
      );
    }
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getAllSalesOrderReturns: " + err.message,
    );
  }
}

async function updateSalesOrderReturn(pool, values) {
  try {
    let items = [
      "SalesOrderReturnID",
      "DeliveryDate",
      "SalesOrderReturnStatus",
      "CustomerID",
      "BranchID",
      "WarehouseID",
    ];
    let SalesOrderReturn;
    for (const key of items) {
      if (values[key] === undefined || values[key] === null) {
        throw new CustomError(`Missing required field: ${key}`);
      }
      if (key == "SalesOrderReturnID") {
        if (isNaN(values[key])) {
          throw new CustomError(`Invalid SalesOrderReturnID: ${values[key]}`);
        }
        SalesOrderReturn = await getSalesOrderReturn(pool, values[key]);
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
      if (key == "SalesOrderReturnStatus") {
        if (
          values[key] != "Draft" &&
          values[key] != "Open" &&
          values[key] != "Cancelled"
        ) {
          throw new CustomError(
            `Invalid Sales Order Return with status: ${values.SalesOrderReturnStatus}, It should be 'Draft', 'Open' or 'Cancelled'`,
          );
        }
      }
    }
    if (
      SalesOrderReturn.SalesOrderReturnStatus == "Completed" ||
      SalesOrderReturn.SalesOrderReturnStatus == "Cancelled"
    ) {
      throw new CustomError(
        `Cannot update Sales Order Return with status: ${SalesOrderReturn.SalesOrderReturnStatus}`,
      );
    }
    let user_id = values.user_id;
    let query = `
        UPDATE SalesOrderReturns
        SET
            DeliveryDate = @DeliveryDate,
            SalesOrderReturnStatus = @SalesOrderReturnStatus,
            CustomerID = @CustomerID,
            BranchID = @BranchID,
            WarehouseID = @WarehouseID,
            UpdatedBy = @UpdatedBy,
            UpdatedDate = GETDATE()
        WHERE SalesOrderReturnID = @SalesOrderReturnID
        `;
    let request = pool
      .request()
      .input("SalesOrderReturnID", sql.Int, parseInt(values.SalesOrderReturnID))
      .input("DeliveryDate", sql.Date, values.DeliveryDate)
      .input(
        "SalesOrderReturnStatus",
        sql.VarChar(50),
        values.SalesOrderReturnStatus,
      )
      .input("CustomerID", sql.Int, parseInt(values.CustomerID))
      .input("BranchID", sql.Int, parseInt(values.BranchID))
      .input("WarehouseID", sql.Int, parseInt(values.WarehouseID))
      .input("UpdatedBy", sql.Int, parseInt(user_id));
    let result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      throw new CustomError("No sales order return found with the given ID");
    }
    let salesOrderReturn = await getSalesOrderReturn(
      pool,
      values.SalesOrderReturnID,
    );
    return salesOrderReturn;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in updateSalesOrderReturn: " + err.message,
    );
  }
}

async function deleteSalesOrderReturn(pool, values) {
  try {
    let items = ["SalesOrderReturnID"];
    for (const key of items) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
      if (key == "SalesOrderReturnID") {
        if (isNaN(values[key])) {
          throw new CustomError(`Invalid SalesOrderReturnID: ${values[key]}`);
        }
        let SalesOrderReturn = await getSalesOrderReturn(pool, values[key]);
        if (SalesOrderReturn.SalesOrderReturnStatus !== "Draft") {
          throw new CustomError(
            `Cannot delete Sales Order Return with status: ${SalesOrderReturn.SalesOrderReturnStatus}`,
          );
        }
        if (SalesOrderReturn.IsDeleted) {
          throw new CustomError(
            `Sales Order Return already deleted: ${SalesOrderReturn?.SalesOrderReturnNumber}`,
          );
        }
      }
    }
    let user_id = values.user_id;
    let query = `
        UPDATE SalesOrderReturns
        SET
            IsDeleted = 1,
            SalesOrderReturnStatus = 'Deleted',
            UpdatedBy = @UpdatedBy,
            UpdatedDate = GETDATE()
        WHERE SalesOrderReturnID = @SalesOrderReturnID
        `;
    let request = pool
      .request()
      .input("SalesOrderReturnID", sql.Int, parseInt(values.SalesOrderReturnID))
      .input("UpdatedBy", sql.Int, parseInt(user_id));
    let result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      throw new CustomError("No sales order return found with the given ID");
    }
    return "done";
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in deleteSalesOrderReturn: " + err.message,
    );
  }
}

async function addNewProductForSalesOrderReturn(pool, values) {
  try {
    let items = [
      "SalesOrderReturnID",
      "CustomerID",
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
    let SalesOrderReturn;
    for (const key of items) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
      if (key === "SalesOrderReturnID") {
        if (isNaN(values[key])) {
          throw new CustomError(`Invalid SalesOrderReturnID: ${values[key]}`);
        }
        SalesOrderReturn = await getSalesOrderReturn(pool, values[key]);
      }
    }
    if (SalesOrderReturn.SalesOrderReturnStatus != "Draft") {
      throw new CustomError(
        `Cannot add Products with Sales Order Return with status: ${SalesOrderReturn.SalesOrderReturnStatus}`,
      );
    }
    let Quantity = Number(values.Quantity);
    let ProductData = await commonService.fetchProduct(pool, values.ProductID);
    if (Quantity < ProductData.MinQty) {
      let currentProductQuantity = 0;
      let currentProductPayload = {
        ProductID: values.ProductID,
        SalesOrderReturnID: values.SalesOrderReturnID,
      };
      let currentSalesOrderReturnProducts =
        await getSalesOrderReturnAllProducts(pool, currentProductPayload);
      if (currentSalesOrderReturnProducts <= 0) {
        throw new CustomError(
          `Minimum Quantity for Product ${ProductData.ProductName} is ${ProductData.MinQty}, but provided quantity is ${Quantity}`,
        );
      }
      currentSalesOrderReturnProducts.forEach((product) => {
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
            MERGE INTO SalesOrderReturnProducts AS target
            USING (SELECT
                @SalesOrderReturnID AS SalesOrderReturnID,
                @ProductID AS ProductID,
                @BatchNumber AS BatchNumber,
                @Quantity AS Quantity,
                @MRP AS MRP,
                @Discount AS Discount
            ) AS source
            ON target.SalesOrderReturnID = source.SalesOrderReturnID
            AND target.ProductID = source.ProductID
            AND target.BatchNumber = source.BatchNumber
            AND target.IsDeleted = 0
            WHEN MATCHED THEN
                UPDATE SET
                    CustomerID = @CustomerID,
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
                    SalesOrderReturnID,
                    CustomerID,
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
                    @SalesOrderReturnID,
                    @CustomerID,
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
      .input("SalesOrderReturnID", sql.Int, parseInt(values.SalesOrderReturnID))
      .input("CustomerID", sql.Int, parseInt(values.CustomerID))
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
    let insertedRecordId = result.recordset[0].SalesOrderReturnProductID;
    let SalesOrderReturnProduct = await getSalesOrderReturnProduct(
      pool,
      insertedRecordId,
    );
    return SalesOrderReturnProduct;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in addNewProductForSalesOrderReturn: " + err.message,
    );
  }
}

async function getSalesOrderReturnProduct(pool, SalesOrderReturnProductID) {
  try {
    const input = String(SalesOrderReturnProductID).trim();
    let query = `
        SELECT SORP.*,
        SOR.SalesOrderReturnNumber,
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
        C.CustomerName,
        B.BranchName,
        W.WarehouseName
        FROM SalesOrderReturnProducts SORP
        LEFT JOIN Users CU ON SORP.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON SORP.UpdatedBy = UU.UserID
        LEFT JOIN SalesOrderReturns SOR ON SORP.SalesOrderReturnID = SOR.SalesOrderReturnID
        LEFT JOIN Products PRD ON SORP.ProductID = PRD.ProductID
        LEFT JOIN Brands BR ON PRD.BrandID = BR.BrandID
        LEFT JOIN PackagingTypes PCK ON PRD.PackagingTypeID = PCK.PackagingTypeID
        LEFT JOIN Lines LN ON PRD.LineID = LN.LineID
        LEFT JOIN ProductConsumes PC ON PRD.ProductConsumeID = PC.ProductConsumeID
        LEFT JOIN ProductTypes PT ON PRD.ProductTypeID = PT.ProductTypeID
        LEFT JOIN UOMs U ON SORP.UOMID = U.UOMID
        LEFT JOIN Slocs S ON SORP.SLOCID = S.SLOCID
        LEFT JOIN Customers C ON SORP.CustomerID = C.CustomerID
        LEFT JOIN Branches B ON SORP.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON SORP.WarehouseID = W.WarehouseID
        WHERE SORP.SalesOrderReturnProductID = @SalesOrderReturnProductID
        `;
    let request = pool.request();
    request.input("SalesOrderReturnProductID", sql.Int, parseInt(input));
    let result = await request.query(query);
    if (result.recordset.length === 0) {
      throw new CustomError(
        `No sales order return product found with the given ID ${input}`,
      );
    }
    let SalesOrderReturnProduct = result.recordset[0];
    if (SalesOrderReturnProduct.IsDeleted) {
      throw new CustomError(
        "Sales Order Return Product already deleted: " +
          SalesOrderReturnProduct?.SalesOrderReturnNumber,
      );
    }
    return SalesOrderReturnProduct;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getSalesOrderReturnProduct: " + err.message,
    );
  }
}

async function getSalesOrderReturnAllProducts(pool, values) {
  try {
    let SalesOrderReturnID = values.SalesOrderReturnID;
    if (!SalesOrderReturnID) {
      throw new CustomError("SalesOrderReturnID is required");
    }
    let SalesOrderReturn = await getSalesOrderReturn(pool, SalesOrderReturnID);
    let query = `
        SELECT SORP.*,
        SOR.SalesOrderReturnNumber,
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
        C.CustomerName,
        B.BranchName,
        W.WarehouseName
        FROM SalesOrderReturnProducts SORP
        LEFT JOIN Users CU ON SORP.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON SORP.UpdatedBy = UU.UserID
        LEFT JOIN SalesOrderReturns SOR ON SORP.SalesOrderReturnID = SOR.SalesOrderReturnID
        LEFT JOIN Products PRD ON SORP.ProductID = PRD.ProductID
        LEFT JOIN Brands BR ON PRD.BrandID = BR.BrandID
        LEFT JOIN PackagingTypes PCK ON PRD.PackagingTypeID = PCK.PackagingTypeID
        LEFT JOIN Lines LN ON PRD.LineID = LN.LineID
        LEFT JOIN ProductConsumes PC ON PRD.ProductConsumeID = PC.ProductConsumeID
        LEFT JOIN ProductTypes PT ON PRD.ProductTypeID = PT.ProductTypeID
        LEFT JOIN UOMs U ON SORP.UOMID = U.UOMID
        LEFT JOIN Slocs S ON SORP.SLOCID = S.SLOCID
        LEFT JOIN Customers C ON SORP.CustomerID = C.CustomerID
        LEFT JOIN Branches B ON SORP.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON SORP.WarehouseID = W.WarehouseID
        WHERE SORP.SalesOrderReturnID = @SalesOrderReturnID AND SORP.IsDeleted = 0
        `;
    let request = pool.request();
    request.input("SalesOrderReturnID", sql.Int, parseInt(SalesOrderReturnID));
    if (values.ProductID) {
      query += ` AND SORP.ProductID = @ProductID`;
      request.input("ProductID", sql.Int, parseInt(values.ProductID));
    }
    query += ` ORDER BY SORP.SalesOrderReturnProductID`;
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getSalesOrderReturnAllProducts: " + err.message,
    );
  }
}

async function updateSalesOrderReturnProduct(pool, values) {
  try {
    let requiredFields = [
      "SalesOrderReturnProductID",
      "SalesOrderReturnID",
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
    if (isNaN(values.SalesOrderReturnID)) {
      throw new CustomError(
        `Invalid SalesOrderReturnID: ${values.SalesOrderReturnID}`,
      );
    }
    const SalesOrderReturn = await getSalesOrderReturn(
      pool,
      values.SalesOrderReturnID,
    );
    if (SalesOrderReturn.SalesOrderReturnStatus !== "Draft") {
      throw new CustomError(
        `Cannot update Products with Sales Order Return with status: ${SalesOrderReturn.SalesOrderReturnStatus}`,
      );
    }
    if (isNaN(values.SalesOrderReturnProductID)) {
      throw new CustomError(
        `Invalid SalesOrderReturnProductID: ${values.SalesOrderReturnProductID}`,
      );
    }
    let SalesOrderReturnProduct = await getSalesOrderReturnProduct(
      pool,
      values.SalesOrderReturnProductID,
    );
    if (SalesOrderReturnProduct.IsDeleted) {
      throw new CustomError(
        "Sales Order Return Product already deleted: " +
          SalesOrderReturnProduct?.SalesOrderReturnNumber,
      );
    }
    let Quantity = Number(values.Quantity);
    let ProductData = await commonService.fetchProduct(pool, values.ProductID);
    if (Quantity < ProductData.MinQty) {
      let currentProductQuantity = 0;
      let currentProductPayload = {
        ProductID: values.ProductID,
        SalesOrderReturnID: values.SalesOrderReturnID,
      };
      let currentSalesOrderReturnProducts =
        await getSalesOrderReturnAllProducts(pool, currentProductPayload);
      if (currentSalesOrderReturnProducts <= 0) {
        throw new CustomError(
          `Minimum Quantity for Product ${ProductData.ProductName} is ${ProductData.MinQty}, but provided quantity is ${Quantity}`,
        );
      }
      currentSalesOrderReturnProducts
        .filter(
          (product) =>
            product.SalesOrderReturnProductID !=
            values.SalesOrderReturnProductID,
        )
        .forEach((product) => {
          currentProductQuantity += product.Quantity;
        });
      if (currentProductQuantity + Quantity < ProductData.MinQty) {
        throw new CustomError(
          `Minimum Quantity for Product ${ProductData.ProductName} is ${ProductData.MinQty}, but provided quantity is ${Quantity} and existing quantity is ${currentProductQuantity} which makes total quantity less than minimum quantity`,
        );
      }
    }
    const Total_Product_MRP = Number(values.Quantity) * Number(values.MRP) || 0;
    const Total_Product_Discount =
      Number(values.Quantity) * Number(values.Discount) || 0;
    const Total_Product_Amount = Total_Product_MRP - Total_Product_Discount;
    const query = `
            UPDATE SalesOrderReturnProducts
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
            WHERE SalesOrderReturnProductID = @SalesOrderReturnProductID
        `;
    const request = pool
      .request()
      .input(
        "SalesOrderReturnProductID",
        sql.Int,
        parseInt(values.SalesOrderReturnProductID),
      )
      .input("ProductID", sql.Int, parseInt(values.ProductID))
      .input("UOMID", sql.Int, parseInt(values.UOMID))
      .input("SLOCID", sql.Int, parseInt(values.SLOCID))
      .input("BatchNumber", sql.VarChar(100), values.BatchNumber)
      .input("Quantity", sql.Decimal(10, 2), values.Quantity)
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
        "No product found with provided SalesOrderReturnProductID",
      );
    }
    SalesOrderReturnProduct = await getSalesOrderReturnProduct(
      pool,
      values.SalesOrderReturnProductID,
    );
    return SalesOrderReturnProduct;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in updateSalesOrderReturnProduct: " + err.message,
    );
  }
}

async function deleteSalesOrderReturnProduct(pool, values) {
  try {
    if (!values.SalesOrderReturnProductID) {
      throw new CustomError(
        "Missing required field: SalesOrderReturnProductID",
      );
    }
    if (!values.SalesOrderReturnID) {
      throw new CustomError("Missing required field: SalesOrderReturnID");
    }
    if (isNaN(values.SalesOrderReturnID)) {
      throw new CustomError(
        `Invalid SalesOrderReturnID: ${values.SalesOrderReturnID}`,
      );
    }
    const SalesOrderReturn = await getSalesOrderReturn(
      pool,
      values.SalesOrderReturnID,
    );
    if (SalesOrderReturn.SalesOrderReturnStatus !== "Draft") {
      throw new CustomError(
        `Cannot delete Products with Sales Order Return with status: ${SalesOrderReturn.SalesOrderReturnStatus}`,
      );
    }
    if (isNaN(values.SalesOrderReturnProductID)) {
      throw new CustomError(
        `Invalid SalesOrderReturnProductID: ${values.SalesOrderReturnProductID}`,
      );
    }
    let SalesOrderReturnProduct = await getSalesOrderReturnProduct(
      pool,
      values.SalesOrderReturnProductID,
    );
    if (SalesOrderReturnProduct.IsDeleted) {
      throw new CustomError(
        "Sales Order Return Product already deleted: " +
          SalesOrderReturnProduct?.SalesOrderReturnNumber,
      );
    }
    const query = `
            UPDATE SalesOrderReturnProducts
            SET
                IsDeleted = 1,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE SalesOrderReturnProductID = @SalesOrderReturnProductID
        `;
    const request = pool
      .request()
      .input(
        "SalesOrderReturnProductID",
        sql.Int,
        parseInt(values.SalesOrderReturnProductID),
      )
      .input("UpdatedBy", sql.Int, parseInt(values.user_id));
    const result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      throw new CustomError(
        "No active product found with provided SalesOrderReturnProductID",
      );
    }
    return "done";
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in deleteSalesOrderReturnProduct: " + err.message,
    );
  }
}

async function getNewSalesOrderReturnReceiving(pool, values) {
  try {
    let receivingOrder = {
      ReceivingDate: moment(new Date()).format("YYYY-MM-DD"),
      CreatedBy: values.user_id,
      UpdatedBy: values.user_id,
    };
    let query = `
                DECLARE @OutputTable TABLE (
                        SalesOrderReturnReceivingID INT
                );
                INSERT INTO SalesOrderReturnReceivings (
                    ReceivingDate, CreatedBy, UpdatedBy
                )
                OUTPUT
                    INSERTED.SalesOrderReturnReceivingID
                INTO @OutputTable
                VALUES (
                    @ReceivingDate, @CreatedBy, @UpdatedBy
                );
                SELECT * FROM @OutputTable;
            `;
    let request = pool
      .request()
      .input("ReceivingDate", sql.Date, receivingOrder.ReceivingDate)
      .input("CreatedBy", sql.Int, receivingOrder.CreatedBy)
      .input("UpdatedBy", sql.Int, receivingOrder.UpdatedBy);
    let result = await request.query(query);
    let insertedRecordId = result.recordset[0].SalesOrderReturnReceivingID;
    let SalesOrderReturnReceiving = await getSalesOrderReturnReceiving(
      pool,
      insertedRecordId,
    );
    return SalesOrderReturnReceiving;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getNewSalesOrderReturnReceiving: " + err.message,
    );
  }
}

async function getSalesOrderReturnReceiving(pool, SalesOrderReturnReceivingID) {
  try {
    if (!SalesOrderReturnReceivingID) {
      throw new CustomError("SalesOrderReturnReceivingID is required");
    }
    const input = String(SalesOrderReturnReceivingID).trim();
    const isNumeric = /^\d+$/.test(input);
    let query = `
        SELECT SORR.*,
        SOR.SalesOrderReturnNumber,
        SOR.SalesOrderReturnDate,
        CU.UserName AS CreatedByUserName,
        UU.UserName AS UpdatedByUserName,
        C.CustomerName,
        B.BranchName,
        W.WarehouseName,
        (
            SELECT COALESCE(SUM(SORP.Quantity), 0)
            FROM SalesOrderReturnProducts SORP
            WHERE SORP.SalesOrderReturnID = SORR.SalesOrderReturnID AND SORP.IsDeleted = 0
        ) AS total_quantity
        FROM SalesOrderReturnReceivings SORR
        LEFT JOIN Users CU ON SORR.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON SORR.UpdatedBy = UU.UserID
        LEFT JOIN SalesOrderReturns SOR ON SORR.SalesOrderReturnID = SOR.SalesOrderReturnID
        LEFT JOIN Customers C ON SORR.CustomerID = C.CustomerID
        LEFT JOIN Branches B ON SORR.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON SORR.WarehouseID = W.WarehouseID
        `;
    let request = pool.request();
    if (isNumeric) {
      query += ` WHERE SORR.SalesOrderReturnReceivingID = @SalesOrderReturnReceivingID`;
      request.input("SalesOrderReturnReceivingID", sql.Int, parseInt(input));
    } else {
      query += ` WHERE SORR.SalesOrderReturnReceivingNumber = @SalesOrderReturnReceivingNumber`;
      request.input("SalesOrderReturnReceivingNumber", sql.VarChar(20), input);
    }
    let result = await request.query(query);
    if (result.recordset.length === 0) {
      throw new CustomError(
        "No sales order return receiving found with the given ID",
      );
    }
    let SalesOrderReturnReceiving = result.recordset[0];
    if (SalesOrderReturnReceiving.SalesOrderReturnReceivingStatus == "New") {
      SalesOrderReturnReceiving.SalesOrderReturnReceivingStatus = "Draft";
    }
    if (SalesOrderReturnReceiving.IsDeleted) {
      throw new CustomError(
        "Sales Order Return Receiving already deleted: " +
          SalesOrderReturnReceiving?.SalesOrderReturnReceivingNumber,
      );
    }
    return SalesOrderReturnReceiving;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getSalesOrderReturnReceiving: " + err.message,
    );
  }
}

async function getAllSalesOrderReturnReceivings(pool, values) {
  try {
    let user_id = values.user_id;
    let query = `
        SELECT SORR.*,
        SOR.SalesOrderReturnNumber,
        SOR.SalesOrderReturnDate,
        CU.UserName AS CreatedByUserName,
        UU.UserName AS UpdatedByUserName,
        C.CustomerName,
        B.BranchName,
        W.WarehouseName,
        (
            SELECT COALESCE(SUM(SORP.Quantity), 0)
            FROM SalesOrderReturnProducts SORP
            WHERE SORP.SalesOrderReturnID = SORR.SalesOrderReturnID AND SORP.IsDeleted = 0
        ) AS total_quantity
        FROM SalesOrderReturnReceivings SORR
        LEFT JOIN Users CU ON SORR.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON SORR.UpdatedBy = UU.UserID
        LEFT JOIN SalesOrderReturns SOR ON SORR.SalesOrderReturnID = SOR.SalesOrderReturnID
        LEFT JOIN Customers C ON SORR.CustomerID = C.CustomerID
        LEFT JOIN Branches B ON SORR.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON SORR.WarehouseID = W.WarehouseID
        WHERE SORR.CreatedBy = @CreatedBy AND SORR.SalesOrderReturnReceivingStatus != 'New' AND SORR.IsDeleted = 0
        `;
    let request = pool.request();
    request.input("CreatedBy", sql.Int, parseInt(user_id));
    if (values.SalesOrderReturnReceivingStatus) {
      query += ` AND SORR.SalesOrderReturnReceivingStatus = @SalesOrderReturnReceivingStatus`;
      request.input(
        "SalesOrderReturnReceivingStatus",
        sql.VarChar(50),
        values.SalesOrderReturnReceivingStatus,
      );
    }
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getAllSalesOrderReturnReceivings: " + err.message,
    );
  }
}

async function updateSalesOrderReturnReceiving(pool, values) {
  try {
    const requiredFields = [
      "SalesOrderReturnReceivingID",
      "SalesOrderReturnID",
      "CustomerID",
      "BranchID",
      "WarehouseID",
      "InvoiceNumber",
    ];
    for (const key of requiredFields) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
    }
    if (isNaN(values.SalesOrderReturnReceivingID)) {
      throw new CustomError(
        `Invalid SalesOrderReturnReceivingID: ${values.SalesOrderReturnReceivingID}`,
      );
    }
    const salesOrderReturnReceiving = await getSalesOrderReturnReceiving(
      pool,
      values.SalesOrderReturnReceivingID,
    );
    if (salesOrderReturnReceiving.IsDeleted) {
      throw new CustomError(
        "Sales Order Return Receiving already deleted: " +
          salesOrderReturnReceiving?.SalesOrderReturnReceivingNumber,
      );
    }
    if (
      salesOrderReturnReceiving.SalesOrderReturnReceivingStatus !== "Open" &&
      salesOrderReturnReceiving.SalesOrderReturnReceivingStatus !== "Draft"
    ) {
      throw new CustomError(
        `Invalid SalesOrderReturnReceivingStatus: ${salesOrderReturnReceiving.SalesOrderReturnReceivingStatus}. Must be 'Open'`,
      );
    }
    if (isNaN(values.SalesOrderReturnID)) {
      throw new CustomError(
        `Invalid SalesOrderReturnID: ${values.SalesOrderReturnID}`,
      );
    }
    const salesOrderReturn = await getSalesOrderReturn(
      pool,
      values.SalesOrderReturnID,
    );
    if (salesOrderReturn.SalesOrderReturnStatus !== "Open") {
      throw new CustomError(
        `Cannot update Sales Order Return Receiving with Sales Order Return status: ${salesOrderReturn.SalesOrderReturnStatus}`,
      );
    }
    const query = `
            UPDATE SalesOrderReturnReceivings
            SET
                InvoiceNumber = @InvoiceNumber,
                SalesOrderReturnID = @SalesOrderReturnID,
                CustomerID = @CustomerID,
                BranchID = @BranchID,
                WarehouseID = @WarehouseID,
                SalesOrderReturnReceivingStatus = 'Open',
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE SalesOrderReturnReceivingID = @SalesOrderReturnReceivingID;
            UPDATE SalesOrderReturns
            SET
                SalesOrderReturnStatus = 'Completed',
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE SalesOrderReturnID = @SalesOrderReturnID;
        `;
    const request = pool
      .request()
      .input(
        "SalesOrderReturnReceivingID",
        sql.Int,
        parseInt(values.SalesOrderReturnReceivingID),
      )
      .input("InvoiceNumber", sql.VarChar(500), values.InvoiceNumber)
      .input("SalesOrderReturnID", sql.Int, parseInt(values.SalesOrderReturnID))
      .input("CustomerID", sql.Int, parseInt(values.CustomerID))
      .input("BranchID", sql.Int, parseInt(values.BranchID))
      .input("WarehouseID", sql.Int, parseInt(values.WarehouseID))
      .input("UpdatedBy", sql.Int, parseInt(values.user_id));
    const result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      throw new CustomError(
        "No Sales Order Return Receiving found with provided SalesOrderReturnReceivingID",
      );
    }
    const updatedSalesOrderReturnReceiving = await getSalesOrderReturnReceiving(
      pool,
      values.SalesOrderReturnReceivingID,
    );
    return updatedSalesOrderReturnReceiving;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in updateSalesOrderReturnReceiving: " + err.message,
    );
  }
}

async function updateSalesOrderReturnReceivingStatus(pool, values) {
  try {
    const requiredFields = [
      "SalesOrderReturnReceivingID",
      "SalesOrderReturnReceivingStatus",
    ];
    for (const key of requiredFields) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
      if (
        key === "SalesOrderReturnReceivingStatus" &&
        !["Received", "Rejected"].includes(values[key])
      ) {
        throw new CustomError(
          `Invalid SalesOrderReturnReceivingStatus: ${values[key]}. Must be 'Received' or 'Rejected'`,
        );
      }
    }
    if (isNaN(values.SalesOrderReturnReceivingID)) {
      throw new CustomError(
        `Invalid SalesOrderReturnReceivingID: ${values.SalesOrderReturnReceivingID}`,
      );
    }
    const salesOrderReturnReceiving = await getSalesOrderReturnReceiving(
      pool,
      values.SalesOrderReturnReceivingID,
    );
    if (salesOrderReturnReceiving.IsDeleted) {
      throw new CustomError(
        "Sales Order Return Receiving already deleted: " +
          salesOrderReturnReceiving?.SalesOrderReturnReceivingNumber,
      );
    }
    if (salesOrderReturnReceiving.SalesOrderReturnReceivingStatus !== "Open") {
      throw new CustomError(
        `Invalid SalesOrderReturnReceivingStatus: ${salesOrderReturnReceiving.SalesOrderReturnReceivingStatus}. Must be 'Open'`,
      );
    }
    const query = `
            UPDATE SalesOrderReturnReceivings
            SET
                SalesOrderReturnReceivingStatus = @SalesOrderReturnReceivingStatus,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE SalesOrderReturnReceivingID = @SalesOrderReturnReceivingID;
            IF @SalesOrderReturnReceivingStatus = 'Rejected'
            BEGIN
                UPDATE SalesOrderReturns
                SET
                    SalesOrderReturnStatus = 'Open',
                    UpdatedBy = @UpdatedBy,
                    UpdatedDate = GETDATE()
                WHERE SalesOrderReturnID = @SalesOrderReturnID;
            END
        `;
    const request = pool
      .request()
      .input(
        "SalesOrderReturnReceivingID",
        sql.Int,
        parseInt(values.SalesOrderReturnReceivingID),
      )
      .input(
        "SalesOrderReturnReceivingStatus",
        sql.VarChar(50),
        values.SalesOrderReturnReceivingStatus,
      )
      .input(
        "SalesOrderReturnID",
        sql.Int,
        parseInt(salesOrderReturnReceiving.SalesOrderReturnID),
      )
      .input("UpdatedBy", sql.Int, parseInt(values.user_id));
    const result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      throw new CustomError(
        "No Sales Order Return Receiving found with provided SalesOrderReturnReceivingID",
      );
    }
    const updatedSalesOrderReturnReceiving = await getSalesOrderReturnReceiving(
      pool,
      values.SalesOrderReturnReceivingID,
    );
    return updatedSalesOrderReturnReceiving;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in updateSalesOrderReturnReceivingStatus: " +
        err.message,
    );
  }
}

async function deleteSalesOrderReturnReceiving(pool, values) {
  try {
    const requiredFields = ["SalesOrderReturnReceivingID"];
    for (const key of requiredFields) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
    }
    if (isNaN(values.SalesOrderReturnReceivingID)) {
      throw new CustomError(
        `Invalid SalesOrderReturnReceivingID: ${values.SalesOrderReturnReceivingID}`,
      );
    }
    const salesOrderReturnReceiving = await getSalesOrderReturnReceiving(
      pool,
      values.SalesOrderReturnReceivingID,
    );
    if (salesOrderReturnReceiving.IsDeleted) {
      throw new CustomError(
        "Sales Order Return Receiving already deleted: " +
          salesOrderReturnReceiving?.SalesOrderReturnReceivingNumber,
      );
    }
    if (
      salesOrderReturnReceiving.SalesOrderReturnReceivingStatus !== "Open" &&
      salesOrderReturnReceiving.SalesOrderReturnReceivingStatus !== "New"
    ) {
      throw new CustomError(
        `Invalid SalesOrderReturnReceivingStatus: ${salesOrderReturnReceiving.SalesOrderReturnReceivingStatus}. Must be 'Open'`,
      );
    }
    const salesOrderReturn = await getSalesOrderReturn(
      pool,
      salesOrderReturnReceiving.SalesOrderReturnID,
    );
    const query = `
            UPDATE SalesOrderReturnReceivings
            SET
                IsDeleted = 1,
                SalesOrderReturnReceivingStatus = 'Deleted',
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE SalesOrderReturnReceivingID = @SalesOrderReturnReceivingID;
            UPDATE SalesOrderReturns
            SET
                SalesOrderReturnStatus = 'Open',
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE SalesOrderReturnID = @SalesOrderReturnID;
        `;
    const request = pool
      .request()
      .input(
        "SalesOrderReturnReceivingID",
        sql.Int,
        parseInt(values.SalesOrderReturnReceivingID),
      )
      .input(
        "SalesOrderReturnID",
        sql.Int,
        parseInt(salesOrderReturn.SalesOrderReturnID),
      )
      .input("UpdatedBy", sql.Int, parseInt(values.user_id));
    const result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      throw new CustomError(
        "No Sales Order Return Receiving found with provided SalesOrderReturnReceivingID",
      );
    }
    return "done";
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in deleteSalesOrderReturnReceiving: " + err.message,
    );
  }
}

async function getAllSalesOrderReturnPutawayOrders(pool, values) {
  try {
    let user_id = values.user_id;
    let query = `
        SELECT SORR.*,
        SOR.SalesOrderReturnNumber,
        SOR.SalesOrderReturnDate,
        CU.UserName AS CreatedByUserName,
        UU.UserName AS UpdatedByUserName,
        C.CustomerName,
        B.BranchName,
        W.WarehouseName,
        (
            SELECT COALESCE(SUM(SORP.Quantity), 0)
            FROM SalesOrderReturnProducts SORP
            WHERE SORP.SalesOrderReturnID = SORR.SalesOrderReturnID AND SORP.IsDeleted = 0
        ) AS total_quantity
        FROM SalesOrderReturnReceivings SORR
        LEFT JOIN Users CU ON SORR.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON SORR.UpdatedBy = UU.UserID
        LEFT JOIN SalesOrderReturns SOR ON SORR.SalesOrderReturnID = SOR.SalesOrderReturnID
        LEFT JOIN Customers C ON SORR.CustomerID = C.CustomerID
        LEFT JOIN Branches B ON SORR.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON SORR.WarehouseID = W.WarehouseID
        WHERE SORR.CreatedBy = @CreatedBy AND SORR.SalesOrderReturnReceivingStatus IN ('PutAway Started', 'PutAway Completed') AND SORR.IsDeleted = 0
        `;
    let request = pool.request();
    request.input("CreatedBy", sql.Int, parseInt(user_id));
    if (values.SalesOrderReturnReceivingStatus) {
      query += ` AND SORR.SalesOrderReturnReceivingStatus = @SalesOrderReturnReceivingStatus`;
      request.input(
        "SalesOrderReturnReceivingStatus",
        sql.VarChar(50),
        values.SalesOrderReturnReceivingStatus,
      );
    }
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getAllSalesOrderReturnPutawayOrders: " + err.message,
    );
  }
}

async function updateNewSalesOrderReturnPutawayOrder(pool, values) {
  try {
    const requiredFields = ["SalesOrderReturnReceivingID"];
    for (const key of requiredFields) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
    }
    if (isNaN(values.SalesOrderReturnReceivingID)) {
      throw new CustomError(
        `Invalid SalesOrderReturnReceivingID: ${values.SalesOrderReturnReceivingID}`,
      );
    }
    const salesOrderReturnReceiving = await getSalesOrderReturnReceiving(
      pool,
      values.SalesOrderReturnReceivingID,
    );
    if (salesOrderReturnReceiving.IsDeleted) {
      throw new CustomError(
        "Sales Order Return Receiving already deleted: " +
          salesOrderReturnReceiving?.SalesOrderReturnReceivingNumber,
      );
    }
    if (
      salesOrderReturnReceiving.SalesOrderReturnReceivingStatus !== "Received"
    ) {
      throw new CustomError(
        `Invalid SalesOrderReturnReceivingStatus: ${salesOrderReturnReceiving.SalesOrderReturnReceivingStatus}. Must be 'Received'`,
      );
    }
    const query = `
            UPDATE SalesOrderReturnReceivings
            SET
                SalesOrderReturnReceivingStatus = 'PutAway Started',
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE SalesOrderReturnReceivingID = @SalesOrderReturnReceivingID;
        `;
    const request = pool
      .request()
      .input(
        "SalesOrderReturnReceivingID",
        sql.Int,
        parseInt(values.SalesOrderReturnReceivingID),
      )
      .input("UpdatedBy", sql.Int, parseInt(values.user_id));
    const result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      throw new CustomError(
        "No Sales Order Return Receiving found with provided SalesOrderReturnReceivingID",
      );
    }
    const updatedSalesOrderReturnReceiving = await getSalesOrderReturnReceiving(
      pool,
      values.SalesOrderReturnReceivingID,
    );
    return updatedSalesOrderReturnReceiving;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in updateNewSalesOrderReturnPutawayOrder: " +
        err.message,
    );
  }
}

async function getSalesOrderReturnAllPendingProductsForPutaway(pool, values) {
  try {
    let SalesOrderReturnID = values.SalesOrderReturnID;
    if (!SalesOrderReturnID) {
      throw new CustomError("SalesOrderReturnID is required");
    }
    let SalesOrderReturn = await getSalesOrderReturn(pool, SalesOrderReturnID);
    let query = `
        SELECT SORP.*,
        SOR.SalesOrderReturnNumber,
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
        C.CustomerName,
        B.BranchName,
        W.WarehouseName
        FROM SalesOrderReturnProducts SORP
        LEFT JOIN Users CU ON SORP.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON SORP.UpdatedBy = UU.UserID
        LEFT JOIN SalesOrderReturns SOR ON SORP.SalesOrderReturnID = SOR.SalesOrderReturnID
        LEFT JOIN Products PRD ON SORP.ProductID = PRD.ProductID
        LEFT JOIN Brands BR ON PRD.BrandID = BR.BrandID
        LEFT JOIN PackagingTypes PCK ON PRD.PackagingTypeID = PCK.PackagingTypeID
        LEFT JOIN Lines LN ON PRD.LineID = LN.LineID
        LEFT JOIN ProductConsumes PC ON PRD.ProductConsumeID = PC.ProductConsumeID
        LEFT JOIN ProductTypes PT ON PRD.ProductTypeID = PT.ProductTypeID
        LEFT JOIN UOMs U ON SORP.UOMID = U.UOMID
        LEFT JOIN Slocs S ON SORP.SLOCID = S.SLOCID
        LEFT JOIN Customers C ON SORP.CustomerID = C.CustomerID
        LEFT JOIN Branches B ON SORP.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON SORP.WarehouseID = W.WarehouseID
        WHERE SORP.SalesOrderReturnID = @SalesOrderReturnID AND SORP.IsDeleted = 0 AND SORP.Pending_Quantity > 0
        ORDER BY SORP.SalesOrderReturnProductID
        `;
    let request = pool.request();
    request.input("SalesOrderReturnID", sql.Int, parseInt(SalesOrderReturnID));
    if (values.ProductID) {
      query += ` AND SORP.ProductID = @ProductID`;
      request.input("ProductID", sql.Int, parseInt(values.ProductID));
    }
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getSalesOrderReturnAllPendingProductsForPutaway: " +
        err.message,
    );
  }
}

async function getAllAvailablePalletTypesForSalesOrderReturnProduct(
  pool,
  values,
) {
  try {
    let SalesOrderReturnProductID = values.SalesOrderReturnProductID;
    if (!SalesOrderReturnProductID) {
      throw new CustomError("SalesOrderReturnProductID is required");
    }
    let SalesOrderReturnProduct = await getSalesOrderReturnProduct(
      pool,
      SalesOrderReturnProductID,
    );
    let query = `
        SELECT PT.*, PPT.MaxCapacity FROM PalletTypes PT
        JOIN ProductPalletConfigs PPT ON PPT.PalletTypeID = PT.PalletTypeID
        JOIN SalesOrderReturnProducts SORP ON SORP.ProductID = PPT.ProductId
        WHERE SORP.SalesOrderReturnProductID = @SalesOrderReturnProductID AND PT.IsActive = 1 AND PPT.IsActive = 1
        `;
    let request = pool.request();
    request.input(
      "SalesOrderReturnProductID",
      sql.Int,
      parseInt(SalesOrderReturnProductID),
    );
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getAllAvailablePalletTypesForSalesOrderReturnProduct: " +
        err.message,
    );
  }
}

async function getAllSalesOrderReturnPutawayOrderAllocatedProducts(
  pool,
  values,
) {
  try {
    let SalesOrderReturnReceivingID = values.SalesOrderReturnReceivingID;
    if (!SalesOrderReturnReceivingID) {
      throw new CustomError("SalesOrderReturnReceivingID is required");
    }
    let SalesOrderReturnReceiving = await getSalesOrderReturnReceiving(
      pool,
      SalesOrderReturnReceivingID,
    );
    if (SalesOrderReturnReceiving.IsDeleted) {
      throw new CustomError(
        "Sales Order Return Receiving already deleted: " +
          SalesOrderReturnReceiving?.SalesOrderReturnReceivingNumber,
      );
    }
    if (
      SalesOrderReturnReceiving.SalesOrderReturnReceivingStatus !==
        "PutAway Started" &&
      SalesOrderReturnReceiving.SalesOrderReturnReceivingStatus !==
        "PutAway Completed"
    ) {
      throw new CustomError(
        `Invalid SalesOrderReturnReceivingStatus: ${SalesOrderReturnReceiving.SalesOrderReturnReceivingStatus}. Must be 'PutAway Started' or 'PutAway Completed'`,
      );
    }
    let SalesOrderReturnID = SalesOrderReturnReceiving.SalesOrderReturnID;
    if (!SalesOrderReturnID) {
      throw new CustomError("SalesOrderReturnID is required");
    }
    let SalesOrderReturn = await getSalesOrderReturn(pool, SalesOrderReturnID);
    let query = `
        SELECT
        BPL.BinProductLogID,
        BPL.ActionType,
        BPL.CreatedDate AS AllocatedDate,
        BPL.Quantity AS AllocatedQuantity,
        BPL.BatchChangeReason,
        BP.*,
        B.BinNumber,
        ST.StackCode,
        ST.StackName,
        PT.PalletName,
        SORP.SalesOrderReturnProductID,
        SOR.SalesOrderReturnNumber,
        SORR.SalesOrderReturnReceivingID,
        SORR.SalesOrderReturnReceivingNumber,
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
        C.CustomerName,
        BR.BranchName,
        W.WarehouseName
        FROM BinProductLogs BPL
        JOIN BinProducts BP ON BPL.BinProductID = BP.BinProductID
        JOIN Bins B ON BPL.BinID = B.BinID
        JOIN Stacks ST ON BPL.StackID = ST.StackID
        JOIN PalletTypes PT ON BPL.PalletTypeID = PT.PalletTypeID
        JOIN SalesOrderReturnProducts SORP ON BPL.SalesOrderReturnProductID = SORP.SalesOrderReturnProductID
        JOIN SalesOrderReturns SOR ON SORP.SalesOrderReturnID = SOR.SalesOrderReturnID
        JOIN SalesOrderReturnReceivings SORR ON SOR.SalesOrderReturnID = SORR.SalesOrderReturnID
        JOIN Products PRD ON BPL.ProductID = PRD.ProductID
        LEFT JOIN Users CU ON BPL.CreatedBy = CU.UserID
        LEFT JOIN Customers C ON BPL.CustomerID = C.CustomerID
        LEFT JOIN Branches BR ON BPL.BranchID = BR.BranchID
        LEFT JOIN Warehouses W ON BPL.WarehouseID = W.WarehouseID
        LEFT JOIN UOMs U ON BP.UOMID = U.UOMID
        LEFT JOIN Slocs S ON BP.SLOCID = S.SLOCID
        LEFT JOIN Brands BRD ON PRD.BrandID = BRD.BrandID
        LEFT JOIN PackagingTypes PCK ON PRD.PackagingTypeID = PCK.PackagingTypeID
        LEFT JOIN Lines LN ON PRD.LineID = LN.LineID
        LEFT JOIN ProductConsumes PC ON PRD.ProductConsumeID = PC.ProductConsumeID
        LEFT JOIN ProductTypes PDT ON PRD.ProductTypeID = PDT.ProductTypeID
        WHERE SOR.SalesOrderReturnID = @SalesOrderReturnID
        AND BPL.ActionType = 4 -- Received from Putaway for Sales Order Return
        ORDER BY BPL.CreatedDate
        `;
    let request = pool.request();
    request.input("SalesOrderReturnID", sql.Int, parseInt(SalesOrderReturnID));
    let result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in getAllSalesOrderReturnPutawayOrderAllocatedProducts: " +
        err.message,
    );
  }
}

async function suggestBinForPutawaySalesOrderReturn(pool, values) {
  try {
    const requiredFields = [
      "SalesOrderReturnProductID",
      "ManufactureDate",
      "SalesOrderReturnReceivingID",
    ];
    for (const key of requiredFields) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
    }
    const SalesOrderReturnProduct = await getSalesOrderReturnProduct(
      pool,
      values.SalesOrderReturnProductID,
    );
    if (SalesOrderReturnProduct.IsDeleted) {
      throw new CustomError(
        `Sales Order Return Product already deleted: ${SalesOrderReturnProduct.SalesOrderReturnNumber}`,
      );
    }
    if (SalesOrderReturnProduct.Pending_Quantity <= 0) {
      throw new CustomError(
        `Product no quantity available for putaway: ${SalesOrderReturnProduct.Pending_Quantity}, Product: ${SalesOrderReturnProduct.ProductName}`,
      );
    }
    const SalesOrderReturn = await getSalesOrderReturn(
      pool,
      SalesOrderReturnProduct.SalesOrderReturnID,
    );
    if (SalesOrderReturn.IsDeleted) {
      throw new CustomError(
        `Sales Order Return already deleted: ${SalesOrderReturn.SalesOrderReturnNumber}`,
      );
    }
    let SalesOrderReturnReceiving = await getSalesOrderReturnReceiving(
      pool,
      values.SalesOrderReturnReceivingID,
    );
    if (SalesOrderReturnReceiving.IsDeleted) {
      throw new CustomError(
        `Sales Order Return Receiving already deleted: ${SalesOrderReturnReceiving.SalesOrderReturnReceivingNumber}`,
      );
    }
    if (
      SalesOrderReturn.SalesOrderReturnID !=
      SalesOrderReturnReceiving.SalesOrderReturnID
    ) {
      throw new CustomError(
        `Invalid SalesOrderReturnReceiving: ${SalesOrderReturnReceiving.SalesOrderReturnReceivingNumber}. It does not match the SalesOrderReturnID of the Sales Order Return Product.`,
      );
    }
    if (
      SalesOrderReturnReceiving.SalesOrderReturnReceivingStatus !==
        "Received" &&
      SalesOrderReturnReceiving.SalesOrderReturnReceivingStatus !==
        "PutAway Started"
    ) {
      throw new CustomError(
        `Invalid SalesOrderReturnReceivingStatus: ${SalesOrderReturnReceiving.SalesOrderReturnReceivingStatus}. Must be 'Received' or 'PutAway Started'`,
      );
    }
    const ProductID = SalesOrderReturnProduct.ProductID;
    const WarehouseID = SalesOrderReturnProduct.WarehouseID;
    const BatchNumber =
      values.BatchNumber || SalesOrderReturnProduct.BatchNumber;
    const UOMID = parseInt(values.UOMID) || SalesOrderReturnProduct.UOMID;
    const SLOCID = parseInt(values.SLOCID) || SalesOrderReturnProduct.SLOCID;
    const MRP = Number(values.MRP) || SalesOrderReturnProduct.MRP;
    if (BatchNumber !== SalesOrderReturnProduct.BatchNumber) {
      if (!values.BatchChangeReason) {
        throw new CustomError(`Missing required field: BatchChangeReason`);
      }
    }
    const ManufactureDate = moment(values.ManufactureDate, "YYYY-MM-DD", true);
    if (!ManufactureDate.isValid()) {
      throw new CustomError(
        `Invalid ManufactureDate: ${values.ManufactureDate}`,
      );
    }
    const dateCheckQuery = `
            DECLARE @Today DATE = CAST(GETDATE() AS DATE);
            IF @ManufactureDate > @Today
                THROW 50000, 'ManufactureDate cannot be a future date', 1;
        `;
    const dateCheckRequest = pool
      .request()
      .input("ManufactureDate", sql.Date, ManufactureDate.format("YYYY-MM-DD"));
    await dateCheckRequest.query(dateCheckQuery);
    let Quantity = SalesOrderReturnProduct.Pending_Quantity;
    if (values.Quantity) {
      Quantity = Number(values.Quantity);
      if (isNaN(Quantity) || Quantity <= 0) {
        throw new CustomError(`Invalid Quantity: ${values.Quantity}`);
      }
      if (Quantity > SalesOrderReturnProduct.Pending_Quantity) {
        throw new CustomError(
          `Quantity ${Quantity} exceeds Pending Quantity ${SalesOrderReturnProduct.Pending_Quantity}`,
        );
      }
    }
    let palletQuery = `
            SELECT PPT.*, PT.PalletName
            FROM ProductPalletConfigs PPT
            JOIN PalletTypes PT ON PPT.PalletTypeID = PT.PalletTypeID
            WHERE PPT.ProductID = @ProductID AND PPT.IsActive = 1 AND PT.IsActive = 1
        `;
    const palletRequest = pool.request().input("ProductID", sql.Int, ProductID);
    if (values.PalletTypeID) {
      palletQuery += ` AND PPT.PalletTypeID = @PalletTypeID`;
      palletRequest.input(
        "PalletTypeID",
        sql.Int,
        parseInt(values.PalletTypeID),
      );
    }
    palletQuery += ` ORDER BY PPT.MaxCapacity`;
    const palletResult = await palletRequest.query(palletQuery);
    const palletTypes = palletResult.recordset;
    if (palletTypes.length === 0) {
      let errorMessage = `No active pallet types found for Product: ${SalesOrderReturnProduct.ProductName}`;
      if (values.PalletTypeID) {
        const palletDetails = await commonService.fetchPalletDetails(
          pool,
          parseInt(values.PalletTypeID),
        );
        errorMessage += ` with PalletName: ${palletDetails.PalletName}`;
      }
      throw new CustomError(errorMessage);
    }
    let suitablePallet = await findBestPalletForQuantity(palletTypes, Quantity);
    if (suitablePallet.MaxCapacity <= Quantity) {
      Quantity = suitablePallet.MaxCapacity;
    }
    let suggestedBinQuery = `
            SELECT TOP 1
                BP.BinID,
                B.BinNumber,
                BP.PalletTypeID,
                PT.PalletName,
                BP.MaxQuantity,
                BP.FilledQuantity,
                BP.AvailableQuantity,
                'Partial' AS BinStatus
            FROM BinProducts BP
            JOIN Bins B ON BP.BinID = B.BinID
            JOIN PalletTypes PT ON BP.PalletTypeID = PT.PalletTypeID
            WHERE BP.ProductID = @ProductID
            AND BP.BatchNumber = @BatchNumber
            AND BP.ManufactureDate = @ManufactureDate
            AND BP.UOMID = @UOMID
            AND BP.SLOCID = @SLOCID
            AND BP.MRP = @MRP
            AND BP.IsActive = 1
            AND B.IsActive = 1
            AND B.WarehouseID = @WarehouseID
            AND BP.AvailableQuantity >= @Quantity
            AND BP.PalletTypeID IN (
                SELECT PPT.PalletTypeID
                FROM ProductPalletConfigs PPT
                JOIN PalletTypes PT ON PPT.PalletTypeID = PT.PalletTypeID
                WHERE PPT.ProductID = @ProductID AND PPT.IsActive = 1 AND PT.IsActive = 1
            `;
    if (values.PalletTypeID) {
      suggestedBinQuery += ` AND BP.PalletTypeID = @PalletTypeID`;
    }
    suggestedBinQuery += `) ORDER BY BP.AvailableQuantity;`;
    const suggestedBinRequest = pool
      .request()
      .input("ProductID", sql.Int, ProductID)
      .input("BatchNumber", sql.VarChar(100), BatchNumber)
      .input("ManufactureDate", sql.Date, ManufactureDate.format("YYYY-MM-DD"))
      .input("UOMID", sql.Int, UOMID)
      .input("SLOCID", sql.Int, SLOCID)
      .input("MRP", sql.Decimal(10, 2), MRP)
      .input("WarehouseID", sql.Int, WarehouseID)
      .input("Quantity", sql.Decimal(10, 2), Quantity);
    if (values.PalletTypeID) {
      suggestedBinRequest.input(
        "PalletTypeID",
        sql.Int,
        parseInt(values.PalletTypeID),
      );
    }
    const suggestedBinResult =
      await suggestedBinRequest.query(suggestedBinQuery);
    let suggestedBin = suggestedBinResult.recordset[0];
    if (!suggestedBin) {
      let newBinQuery = `
                SELECT TOP 1
                    B.BinID,
                    B.BinNumber,
                    B.PalletTypeID,
                    PT.PalletName,
                    PPT.MaxCapacity AS MaxQuantity,
                    CAST(0 AS DECIMAL(10,2)) AS FilledQuantity,
                    PPT.MaxCapacity AS AvailableQuantity,
                    'New' AS BinStatus
                FROM Bins B
                LEFT JOIN BinProducts BP ON B.BinID = BP.BinID
                JOIN ProductPalletConfigs PPT ON B.PalletTypeID = PPT.PalletTypeID
                JOIN PalletTypes PT ON PPT.PalletTypeID = PT.PalletTypeID
                WHERE (BP.BinID IS NULL OR (BP.IsActive = 1 AND BP.FilledQuantity = 0 AND BP.ProductID IS NULL))
                AND B.IsActive = 1
                AND B.WarehouseID = @WarehouseID
                AND PPT.ProductID = @ProductID
                AND PPT.IsActive = 1
                AND PT.IsActive = 1
                AND PPT.MaxCapacity >= @Quantity
            `;
      if (values.PalletTypeID) {
        newBinQuery += ` AND B.PalletTypeID = @PalletTypeID`;
      }
      newBinQuery += ` ORDER BY PPT.MaxCapacity;`;
      const newBinRequest = pool
        .request()
        .input("ProductID", sql.Int, ProductID)
        .input("WarehouseID", sql.Int, WarehouseID)
        .input("Quantity", sql.Decimal(10, 2), Quantity);
      if (values.PalletTypeID) {
        newBinRequest.input(
          "PalletTypeID",
          sql.Int,
          parseInt(values.PalletTypeID),
        );
      }
      const newBinResult = await newBinRequest.query(newBinQuery);
      suggestedBin = newBinResult.recordset[0];
    }
    if (!suggestedBin) {
      let errorMessage = `No suitable bin found for putaway for Product: ${SalesOrderReturnProduct.ProductName}. Please check the product details and available bins in inventory.`;
      if (values.PalletTypeID) {
        const palletDetails = await commonService.fetchPalletDetails(
          pool,
          parseInt(values.PalletTypeID),
        );
        errorMessage += ` with PalletName: ${palletDetails.PalletName}`;
      }
      throw new CustomError(errorMessage);
    }
    return suggestedBin;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in suggestBinForPutawaySalesOrderReturn: " + err.message,
    );
  }
}

async function fetchAllAvailableBinsForPutawaySalesOrderReturn(pool, values) {
  try {
    const requiredFields = [
      "SalesOrderReturnProductID",
      "ManufactureDate",
      "SalesOrderReturnReceivingID",
    ];
    for (const key of requiredFields) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
    }
    const SalesOrderReturnProduct = await getSalesOrderReturnProduct(
      pool,
      values.SalesOrderReturnProductID,
    );
    if (SalesOrderReturnProduct.IsDeleted) {
      throw new CustomError(
        `Sales Order Return Product already deleted: ${SalesOrderReturnProduct.SalesOrderReturnNumber}`,
      );
    }
    if (SalesOrderReturnProduct.Pending_Quantity <= 0) {
      throw new CustomError(
        `Product no quantity available for putaway: ${SalesOrderReturnProduct.Pending_Quantity}, Product: ${SalesOrderReturnProduct.ProductName}`,
      );
    }
    const SalesOrderReturn = await getSalesOrderReturn(
      pool,
      SalesOrderReturnProduct.SalesOrderReturnID,
    );
    if (SalesOrderReturn.IsDeleted) {
      throw new CustomError(
        `Sales Order Return already deleted: ${SalesOrderReturn.SalesOrderReturnNumber}`,
      );
    }
    let SalesOrderReturnReceiving = await getSalesOrderReturnReceiving(
      pool,
      values.SalesOrderReturnReceivingID,
    );
    if (SalesOrderReturnReceiving.IsDeleted) {
      throw new CustomError(
        `Sales Order Return Receiving already deleted: ${SalesOrderReturnReceiving.SalesOrderReturnReceivingNumber}`,
      );
    }
    if (
      SalesOrderReturn.SalesOrderReturnID !=
      SalesOrderReturnReceiving.SalesOrderReturnID
    ) {
      throw new CustomError(
        `Invalid SalesOrderReturnReceiving: ${SalesOrderReturnReceiving.SalesOrderReturnReceivingNumber}. It does not match the SalesOrderReturnID of the Sales Order Return Product.`,
      );
    }
    if (
      SalesOrderReturnReceiving.SalesOrderReturnReceivingStatus !==
        "Received" &&
      SalesOrderReturnReceiving.SalesOrderReturnReceivingStatus !==
        "PutAway Started"
    ) {
      throw new CustomError(
        `Invalid SalesOrderReturnReceivingStatus: ${SalesOrderReturnReceiving.SalesOrderReturnReceivingStatus}. Must be 'Received' or 'PutAway Started'`,
      );
    }
    const ProductID = SalesOrderReturnProduct.ProductID;
    const WarehouseID = SalesOrderReturnProduct.WarehouseID;
    const BatchNumber =
      values.BatchNumber || SalesOrderReturnProduct.BatchNumber;
    const UOMID = parseInt(values.UOMID) || SalesOrderReturnProduct.UOMID;
    const SLOCID = parseInt(values.SLOCID) || SalesOrderReturnProduct.SLOCID;
    const MRP = Number(values.MRP) || SalesOrderReturnProduct.MRP;
    if (BatchNumber !== SalesOrderReturnProduct.BatchNumber) {
      if (!values.BatchChangeReason) {
        throw new CustomError(`Missing required field: BatchChangeReason`);
      }
    }
    const ManufactureDate = moment(values.ManufactureDate, "YYYY-MM-DD", true);
    if (!ManufactureDate.isValid()) {
      throw new CustomError(
        `Invalid ManufactureDate: ${values.ManufactureDate}`,
      );
    }
    const dateCheckQuery = `
            DECLARE @Today DATE = CAST(GETDATE() AS DATE);
            IF @ManufactureDate > @Today
                THROW 50000, 'ManufactureDate cannot be a future date', 1;
        `;
    const dateCheckRequest = pool
      .request()
      .input("ManufactureDate", sql.Date, ManufactureDate.format("YYYY-MM-DD"));
    await dateCheckRequest.query(dateCheckQuery);
    let Quantity = SalesOrderReturnProduct.Pending_Quantity;
    if (values.Quantity) {
      Quantity = Number(values.Quantity);
      if (isNaN(Quantity) || Quantity <= 0) {
        throw new CustomError(`Invalid Quantity: ${values.Quantity}`);
      }
      if (Quantity > SalesOrderReturnProduct.Pending_Quantity) {
        throw new CustomError(
          `Quantity ${Quantity} exceeds Pending Quantity ${SalesOrderReturnProduct.Pending_Quantity}`,
        );
      }
    }
    let palletQuery = `
            SELECT PPT.*, PT.PalletName
            FROM ProductPalletConfigs PPT
            JOIN PalletTypes PT ON PPT.PalletTypeID = PT.PalletTypeID
            WHERE PPT.ProductID = @ProductID AND PPT.IsActive = 1 AND PT.IsActive = 1
        `;
    const palletRequest = pool.request().input("ProductID", sql.Int, ProductID);
    if (values.PalletTypeID) {
      palletQuery += ` AND PPT.PalletTypeID = @PalletTypeID`;
      palletRequest.input(
        "PalletTypeID",
        sql.Int,
        parseInt(values.PalletTypeID),
      );
    }
    const palletResult = await palletRequest.query(palletQuery);
    const palletTypes = palletResult.recordset;
    if (palletTypes.length === 0) {
      let errorMessage = `No active pallet types found for Product: ${SalesOrderReturnProduct.ProductName}`;
      if (values.PalletTypeID) {
        const palletDetails = await commonService.fetchPalletDetails(
          pool,
          parseInt(values.PalletTypeID),
        );
        errorMessage += ` with PalletName: ${palletDetails.PalletName}`;
      }
      throw new CustomError(errorMessage);
    }
    let suitablePallet = await findBestPalletForQuantity(palletTypes, Quantity);
    if (suitablePallet.MaxCapacity <= Quantity) {
      Quantity = suitablePallet.MaxCapacity;
    }
    let binsQuery = `
            SELECT
                BP.BinID,
                B.BinNumber,
                BP.PalletTypeID,
                PT.PalletName,
                BP.MaxQuantity,
                BP.FilledQuantity,
                BP.AvailableQuantity,
                'Partial' AS BinStatus
            FROM BinProducts BP
            JOIN Bins B ON BP.BinID = B.BinID
            JOIN PalletTypes PT ON BP.PalletTypeID = PT.PalletTypeID
            WHERE BP.ProductID = @ProductID
            AND BP.BatchNumber = @BatchNumber
            AND BP.ManufactureDate = @ManufactureDate
            AND BP.UOMID = @UOMID
            AND BP.SLOCID = @SLOCID
            AND BP.MRP = @MRP
            AND BP.IsActive = 1
            AND B.IsActive = 1
            AND B.WarehouseID = @WarehouseID
            AND BP.AvailableQuantity >= @Quantity
            AND BP.PalletTypeID IN (
                SELECT PPT.PalletTypeID
                FROM ProductPalletConfigs PPT
                JOIN PalletTypes PT ON PPT.PalletTypeID = PT.PalletTypeID
                WHERE PPT.ProductID = @ProductID AND PPT.IsActive = 1 AND PT.IsActive = 1
            `;
    if (values.PalletTypeID) {
      binsQuery += ` AND BP.PalletTypeID = @PalletTypeID`;
    }
    binsQuery += `)
            UNION
            SELECT
                B.BinID,
                B.BinNumber,
                B.PalletTypeID,
                PT.PalletName,
                PPT.MaxCapacity AS MaxQuantity,
                CAST(0 AS DECIMAL(10,2)) AS FilledQuantity,
                PPT.MaxCapacity AS AvailableQuantity,
                'New' AS BinStatus
            FROM Bins B
            LEFT JOIN BinProducts BP ON B.BinID = BP.BinID
            JOIN ProductPalletConfigs PPT ON B.PalletTypeID = PPT.PalletTypeID
            JOIN PalletTypes PT ON PPT.PalletTypeID = PT.PalletTypeID
            WHERE (BP.BinID IS NULL OR (BP.IsActive = 1 AND BP.FilledQuantity = 0 AND BP.ProductID IS NULL))
            AND B.IsActive = 1
            AND B.WarehouseID = @WarehouseID
            AND PPT.ProductID = @ProductID
            AND PPT.IsActive = 1
            AND PT.IsActive = 1
            AND PPT.MaxCapacity >= @Quantity
        `;
    if (values.PalletTypeID) {
      binsQuery += ` AND B.PalletTypeID = @PalletTypeID`;
    }
    binsQuery += ` ORDER BY BinStatus DESC, AvailableQuantity ASC`;
    const binsRequest = pool
      .request()
      .input("ProductID", sql.Int, ProductID)
      .input("BatchNumber", sql.VarChar(100), BatchNumber)
      .input("ManufactureDate", sql.Date, ManufactureDate.format("YYYY-MM-DD"))
      .input("UOMID", sql.Int, UOMID)
      .input("SLOCID", sql.Int, SLOCID)
      .input("MRP", sql.Decimal(10, 2), MRP)
      .input("WarehouseID", sql.Int, WarehouseID)
      .input("Quantity", sql.Decimal(10, 2), Quantity);
    if (values.PalletTypeID) {
      binsRequest.input("PalletTypeID", sql.Int, parseInt(values.PalletTypeID));
    }
    const binsResult = await binsRequest.query(binsQuery);
    return binsResult.recordset;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in fetchAllAvailableBinsForPutawaySalesOrderReturn: " +
        err.message,
    );
  }
}

async function validateBinNumberForPutawaySalesOrderReturn(pool, values) {
  try {
    const requiredFields = [
      "SalesOrderReturnProductID",
      "BinNumber",
      "ManufactureDate",
      "SalesOrderReturnReceivingID",
    ];
    for (const key of requiredFields) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
    }
    const SalesOrderReturnProduct = await getSalesOrderReturnProduct(
      pool,
      values.SalesOrderReturnProductID,
    );
    if (SalesOrderReturnProduct.IsDeleted) {
      throw new CustomError(
        `Sales Order Return Product already deleted: ${SalesOrderReturnProduct.SalesOrderReturnNumber}`,
      );
    }
    if (SalesOrderReturnProduct.Pending_Quantity <= 0) {
      throw new CustomError(
        `Product no quantity available for putaway: ${SalesOrderReturnProduct.Pending_Quantity}, Product: ${SalesOrderReturnProduct.ProductName}`,
      );
    }
    const SalesOrderReturn = await getSalesOrderReturn(
      pool,
      SalesOrderReturnProduct.SalesOrderReturnID,
    );
    if (SalesOrderReturn.IsDeleted) {
      throw new CustomError(
        `Sales Order Return already deleted: ${SalesOrderReturn.SalesOrderReturnNumber}`,
      );
    }
    let SalesOrderReturnReceiving = await getSalesOrderReturnReceiving(
      pool,
      values.SalesOrderReturnReceivingID,
    );
    if (SalesOrderReturnReceiving.IsDeleted) {
      throw new CustomError(
        `Sales Order Return Receiving already deleted: ${SalesOrderReturnReceiving.SalesOrderReturnReceivingNumber}`,
      );
    }
    if (
      SalesOrderReturn.SalesOrderReturnID !=
      SalesOrderReturnReceiving.SalesOrderReturnID
    ) {
      throw new CustomError(
        `Invalid SalesOrderReturnReceiving: ${SalesOrderReturnReceiving.SalesOrderReturnReceivingNumber}. It does not match the SalesOrderReturnID of the Sales Order Return Product.`,
      );
    }
    if (
      SalesOrderReturnReceiving.SalesOrderReturnReceivingStatus !==
        "Received" &&
      SalesOrderReturnReceiving.SalesOrderReturnReceivingStatus !==
        "PutAway Started"
    ) {
      throw new CustomError(
        `Invalid SalesOrderReturnReceivingStatus: ${SalesOrderReturnReceiving.SalesOrderReturnReceivingStatus}. Must be 'Received' or 'PutAway Started'`,
      );
    }
    const ProductID = SalesOrderReturnProduct.ProductID;
    const CustomerID = SalesOrderReturnProduct.CustomerID;
    const BranchID = SalesOrderReturnProduct.BranchID;
    const WarehouseID = SalesOrderReturnProduct.WarehouseID;
    const BatchNumber =
      values.BatchNumber || SalesOrderReturnProduct.BatchNumber;
    const UOMID = parseInt(values.UOMID) || SalesOrderReturnProduct.UOMID;
    const SLOCID = parseInt(values.SLOCID) || SalesOrderReturnProduct.SLOCID;
    const MRP = Number(values.MRP) || SalesOrderReturnProduct.MRP;
    if (BatchNumber !== SalesOrderReturnProduct.BatchNumber) {
      if (!values.BatchChangeReason) {
        throw new CustomError(`Missing required field: BatchChangeReason`);
      }
    }
    let Quantity = SalesOrderReturnProduct.Pending_Quantity;
    if (values.Quantity) {
      Quantity = Number(values.Quantity);
      if (isNaN(Quantity) || Quantity <= 0) {
        throw new CustomError(`Invalid Quantity: ${values.Quantity}`);
      }
      if (Quantity > SalesOrderReturnProduct.Pending_Quantity) {
        throw new CustomError(
          `Quantity ${Quantity} exceeds Pending Quantity ${SalesOrderReturnProduct.Pending_Quantity}`,
        );
      }
    }
    const ManufactureDate = moment(values.ManufactureDate, "YYYY-MM-DD", true);
    if (!ManufactureDate.isValid()) {
      throw new CustomError(
        `Invalid ManufactureDate: ${values.ManufactureDate}`,
      );
    }
    const dateCheckQuery = `
            DECLARE @Today DATE = CAST(GETDATE() AS DATE);
            IF @ManufactureDate > @Today
                THROW 50000, 'ManufactureDate cannot be a future date', 1;
        `;
    const dateCheckRequest = pool
      .request()
      .input("ManufactureDate", sql.Date, ManufactureDate.format("YYYY-MM-DD"));
    await dateCheckRequest.query(dateCheckQuery);
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
        `No active pallet type found for Product: ${SalesOrderReturnProduct.ProductName} and PalletName: ${palletDetails.PalletName}`,
      );
    }
    const MaxQuantity = palletResult.recordset[0].MaxCapacity;
    if (Quantity > MaxQuantity) {
      throw new CustomError(
        `Quantity ${Quantity} exceeds Max Pallet Quantity ${MaxQuantity}`,
      );
    }
    const binStatusQuery = `
            SELECT
                BP.BinID AS BinID,
                B.BinNumber AS BinNumber,
                BP.PalletTypeID AS PalletTypeID,
                PT.PalletName AS PalletName,
                BP.MaxQuantity AS MaxQuantity,
                BP.FilledQuantity AS FilledQuantity,
                BP.AvailableQuantity AS AvailableQuantity,
                'Partial' AS BinStatus
            FROM BinProducts BP
            JOIN Bins B ON BP.BinID = B.BinID
            JOIN PalletTypes PT ON BP.PalletTypeID = PT.PalletTypeID
            WHERE BP.BinID = @BinID
            UNION
            SELECT
                B.BinID AS BinID,
                B.BinNumber AS BinNumber,
                B.PalletTypeID AS PalletTypeID,
                PT.PalletName AS PalletName,
                PPT.MaxCapacity AS MaxQuantity,
                CAST(0 AS DECIMAL(10,2)) AS FilledQuantity,
                PPT.MaxCapacity AS AvailableQuantity,
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
      "Catch Exception in validateBinNumberForPutawaySalesOrderReturn: " +
        err.message,
    );
  }
}

async function putProductIntoBinForPutawaySalesOrderReturn(pool, values) {
  try {
    const requiredFields = [
      "SalesOrderReturnProductID",
      "BinID",
      "ManufactureDate",
      "Quantity",
      "SalesOrderReturnReceivingID",
      "SLOCID",
      "UOMID",
      "MRP",
    ];
    for (const key of requiredFields) {
      if (!values[key]) {
        throw new CustomError(`Missing required field: ${key}`);
      }
    }
    const SalesOrderReturnProduct = await getSalesOrderReturnProduct(
      pool,
      values.SalesOrderReturnProductID,
    );
    if (SalesOrderReturnProduct.IsDeleted) {
      throw new CustomError(
        `Sales Order Return Product already deleted: ${SalesOrderReturnProduct.SalesOrderReturnNumber}`,
      );
    }
    if (SalesOrderReturnProduct.Pending_Quantity <= 0) {
      throw new CustomError(
        `Product no quantity available for putaway: ${SalesOrderReturnProduct.Pending_Quantity}, Product: ${SalesOrderReturnProduct.ProductName}`,
      );
    }
    const SalesOrderReturn = await getSalesOrderReturn(
      pool,
      SalesOrderReturnProduct.SalesOrderReturnID,
    );
    if (SalesOrderReturn.IsDeleted) {
      throw new CustomError(
        `Sales Order Return already deleted: ${SalesOrderReturn.SalesOrderReturnNumber}`,
      );
    }
    let SalesOrderReturnReceiving = await getSalesOrderReturnReceiving(
      pool,
      values.SalesOrderReturnReceivingID,
    );
    if (SalesOrderReturnReceiving.IsDeleted) {
      throw new CustomError(
        `Sales Order Return Receiving already deleted: ${SalesOrderReturnReceiving.SalesOrderReturnReceivingNumber}`,
      );
    }
    if (
      SalesOrderReturn.SalesOrderReturnID !=
      SalesOrderReturnReceiving.SalesOrderReturnID
    ) {
      throw new CustomError(
        `Invalid SalesOrderReturnReceiving: ${SalesOrderReturnReceiving.SalesOrderReturnReceivingNumber}. It does not match the SalesOrderReturnID of the Sales Order Return Product.`,
      );
    }
    if (
      SalesOrderReturnReceiving.SalesOrderReturnReceivingStatus !==
        "Received" &&
      SalesOrderReturnReceiving.SalesOrderReturnReceivingStatus !==
        "PutAway Started"
    ) {
      throw new CustomError(
        `Invalid SalesOrderReturnReceivingStatus: ${SalesOrderReturnReceiving.SalesOrderReturnReceivingStatus}. Must be 'Received' or 'PutAway Started'`,
      );
    }
    const ProductID = SalesOrderReturnProduct.ProductID;
    const CustomerID = SalesOrderReturnProduct.CustomerID;
    const BranchID = SalesOrderReturnProduct.BranchID;
    const WarehouseID = SalesOrderReturnProduct.WarehouseID;
    const BatchNumber =
      values.BatchNumber || SalesOrderReturnProduct.BatchNumber;
    const UOMID = parseInt(values.UOMID) || SalesOrderReturnProduct.UOMID;
    const SLOCID = parseInt(values.SLOCID) || SalesOrderReturnProduct.SLOCID;
    const MRP = Number(values.MRP) || SalesOrderReturnProduct.MRP;
    let BatchChangeReason = "";
    if (BatchNumber !== SalesOrderReturnProduct.BatchNumber) {
      if (!values.BatchChangeReason) {
        throw new CustomError(`Missing required field: BatchChangeReason`);
      }
      BatchChangeReason = values.BatchChangeReason;
    }
    const Quantity = Number(values.Quantity);
    if (isNaN(Quantity) || Quantity <= 0) {
      throw new CustomError(`Invalid Quantity: ${values.Quantity}`);
    }
    if (Quantity > SalesOrderReturnProduct.Pending_Quantity) {
      throw new CustomError(
        `Quantity ${Quantity} exceeds Pending Quantity ${SalesOrderReturnProduct.Pending_Quantity}`,
      );
    }
    const ManufactureDate = moment(values.ManufactureDate, "YYYY-MM-DD", true);
    if (!ManufactureDate.isValid()) {
      throw new CustomError(
        `Invalid ManufactureDate: ${values.ManufactureDate}`,
      );
    }
    const dateCheckQuery = `
            DECLARE @Today DATE = CAST(GETDATE() AS DATE);
            IF @ManufactureDate > @Today
                THROW 50000, 'ManufactureDate cannot be a future date', 1;
        `;
    const dateCheckRequest = pool
      .request()
      .input("ManufactureDate", sql.Date, ManufactureDate.format("YYYY-MM-DD"));
    await dateCheckRequest.query(dateCheckQuery);
    const bin = await commonService.fetchBinDetails(pool, values.BinID);
    const PalletTypeID = bin.PalletTypeID;
    const StackID = bin.StackID;
    if (values.PalletTypeID) {
      if (values.PalletTypeID != PalletTypeID) {
        throw new CustomError(
          `PalletTypeID ${values.PalletTypeID} does not match the PalletTypeID of the Bin: ${values.BinNumber}`,
        );
      }
    }
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
        `No active pallet type found for Product: ${SalesOrderReturnProduct.ProductName} and PalletName: ${palletDetails.PalletName}`,
      );
    }
    const MaxQuantity = palletResult.recordset[0].MaxCapacity;
    if (Quantity > MaxQuantity) {
      throw new CustomError(
        `Quantity ${Quantity} exceeds Max Pallet Quantity ${MaxQuantity}`,
      );
    }
    const binProductQuery = `
            SELECT *
            FROM BinProducts
            WHERE BinID = @BinID AND IsActive = 1
        `;
    const binProductRequest = pool
      .request()
      .input("BinID", sql.Int, parseInt(values.BinID));
    const binProductResult = await binProductRequest.query(binProductQuery);
    let binProduct = binProductResult.recordset[0];
    let isNewBin =
      !binProduct ||
      (binProduct && binProduct.FilledQuantity === 0 && !binProduct.ProductID);
    if (!isNewBin) {
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
    const singleQuery = `
            DECLARE @BinProductID INT;
            DECLARE @OutputTable TABLE (BinProductID INT);
            DECLARE @PreviousFilledQuantity DECIMAL(10,2) = ${isNewBin ? 0 : binProduct.FilledQuantity};
            DECLARE @PreviousAvailableQuantity DECIMAL(10,2) = ${isNewBin ? MaxQuantity : binProduct.AvailableQuantity};
            DECLARE @NewFilledQuantity DECIMAL(10,2) = @PreviousFilledQuantity + @Quantity;
            DECLARE @NewAvailableQuantity DECIMAL(10,2) = @PreviousAvailableQuantity - @Quantity;
            DECLARE @NewPickedQuantity DECIMAL(10,2) = ${SalesOrderReturnProduct.Picked_Quantity} + @Quantity;
            DECLARE @NewPendingQuantity DECIMAL(10,2) = ${SalesOrderReturnProduct.Pending_Quantity} - @Quantity;
            MERGE INTO BinProducts AS target
            USING (SELECT
                @BinID AS BinID,
                @PalletTypeID AS PalletTypeID,
                @StackID AS StackID,
                @CustomerID AS CustomerID,
                @BranchID AS BranchID,
                @WarehouseID AS WarehouseID,
                @ProductID AS ProductID,
                @BatchNumber AS BatchNumber,
                @ManufactureDate AS ManufactureDate,
                @UOMID AS UOMID,
                @SLOCID AS SLOCID,
                @MRP AS MRP,
                @MaxQuantity AS MaxQuantity,
                @Quantity AS Quantity
            ) AS source
            ON target.BinID = source.BinID AND target.IsActive = 1
            WHEN MATCHED THEN
                UPDATE SET
                    FilledQuantity = @NewFilledQuantity,
                    AvailableQuantity = @NewAvailableQuantity,
                    UpdatedBy = @UpdatedBy,
                    UpdatedDate = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (
                    BinID, PalletTypeID, StackID, CustomerID, BranchID, WarehouseID,
                    ProductID, BatchNumber, ManufactureDate, UOMID, SLOCID, MRP,
                    MaxQuantity, FilledQuantity, AvailableQuantity, CreatedBy, UpdatedBy
                )
                VALUES (
                    source.BinID, source.PalletTypeID, source.StackID, source.CustomerID, source.BranchID, source.WarehouseID,
                    source.ProductID, source.BatchNumber, source.ManufactureDate, source.UOMID, source.SLOCID, source.MRP,
                    source.MaxQuantity, source.Quantity, source.MaxQuantity - source.Quantity, @CreatedBy, @UpdatedBy
                )
            OUTPUT INSERTED.BinProductID INTO @OutputTable(BinProductID);
            SELECT @BinProductID = BinProductID FROM @OutputTable;
            UPDATE SalesOrderReturnProducts
            SET
                Picked_Quantity = @NewPickedQuantity,
                Pending_Quantity = @NewPendingQuantity,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE SalesOrderReturnProductID = @SalesOrderReturnProductID;
            INSERT INTO BinProductLogs (
                BinID, BinProductID, ProductID, BatchChangeReason, PalletTypeID, StackID, CustomerID, BranchID, WarehouseID,
                ActionType, SalesOrderReturnProductID,
                Quantity, PreviousFilledQuantity, NewFilledQuantity,
                PreviousAvailableQuantity, NewAvailableQuantity, CreatedBy
            )
            VALUES (
                @BinID, @BinProductID, @ProductID, @BatchChangeReason, @PalletTypeID, @StackID, @CustomerID, @BranchID, @WarehouseID,
                4, @SalesOrderReturnProductID,
                @Quantity, @PreviousFilledQuantity, @NewFilledQuantity,
                @PreviousAvailableQuantity, @NewAvailableQuantity, @CreatedBy
            );
            IF NOT EXISTS (
                SELECT 1
                FROM SalesOrderReturnProducts SORP
                WHERE SORP.SalesOrderReturnID = @SalesOrderReturnID
                AND ROUND(SORP.Pending_Quantity, 2) > 0
                AND SORP.IsDeleted = 0
            )
            BEGIN
                UPDATE SalesOrderReturnReceivings
                SET
                    SalesOrderReturnReceivingStatus = 'PutAway Completed',
                    UpdatedBy = @UpdatedBy,
                    UpdatedDate = GETDATE()
                WHERE SalesOrderReturnReceivingID = @SalesOrderReturnReceivingID;
            END
            IF EXISTS (
                SELECT 1
                FROM SalesOrderReturnProducts SORP
                WHERE SORP.SalesOrderReturnID = @SalesOrderReturnID
                AND ROUND(SORP.Pending_Quantity, 2) > 0
                AND SORP.IsDeleted = 0
            )
            BEGIN
                UPDATE SalesOrderReturnReceivings
                SET
                    SalesOrderReturnReceivingStatus = 'PutAway Started',
                    UpdatedBy = @UpdatedBy,
                    UpdatedDate = GETDATE()
                WHERE SalesOrderReturnReceivingID = @SalesOrderReturnReceivingID;
            END
            SELECT BP.*, B.BinNumber, PT.PalletName
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
      .input("CustomerID", sql.Int, CustomerID)
      .input("BranchID", sql.Int, BranchID)
      .input("WarehouseID", sql.Int, WarehouseID)
      .input("ProductID", sql.Int, ProductID)
      .input("BatchNumber", sql.VarChar(100), BatchNumber)
      .input("BatchChangeReason", sql.VarChar(100), BatchChangeReason)
      .input("ManufactureDate", sql.Date, ManufactureDate.format("YYYY-MM-DD"))
      .input("UOMID", sql.Int, UOMID)
      .input("SLOCID", sql.Int, SLOCID)
      .input("MRP", sql.Decimal(10, 2), MRP)
      .input("MaxQuantity", sql.Decimal(10, 2), MaxQuantity)
      .input("Quantity", sql.Decimal(10, 2), Quantity)
      .input("CreatedBy", sql.Int, parseInt(values.user_id))
      .input("UpdatedBy", sql.Int, parseInt(values.user_id))
      .input(
        "SalesOrderReturnProductID",
        sql.Int,
        parseInt(values.SalesOrderReturnProductID),
      )
      .input(
        "SalesOrderReturnID",
        sql.Int,
        SalesOrderReturnProduct.SalesOrderReturnID,
      )
      .input(
        "SalesOrderReturnReceivingID",
        sql.Int,
        parseInt(values.SalesOrderReturnReceivingID),
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
      "Catch Exception in putProductIntoBinForPutaway: " + err.message,
    );
  }
}

module.exports.getNewSalesOrderReturn = getNewSalesOrderReturn;
module.exports.getSalesOrderReturn = getSalesOrderReturn;
module.exports.getAllSalesOrderReturns = getAllSalesOrderReturns;
module.exports.updateSalesOrderReturn = updateSalesOrderReturn;
module.exports.deleteSalesOrderReturn = deleteSalesOrderReturn;
module.exports.addNewProductForSalesOrderReturn =
  addNewProductForSalesOrderReturn;
module.exports.getSalesOrderReturnProduct = getSalesOrderReturnProduct;
module.exports.getSalesOrderReturnAllProducts = getSalesOrderReturnAllProducts;
module.exports.updateSalesOrderReturnProduct = updateSalesOrderReturnProduct;
module.exports.deleteSalesOrderReturnProduct = deleteSalesOrderReturnProduct;
module.exports.getNewSalesOrderReturnReceiving =
  getNewSalesOrderReturnReceiving;
module.exports.getSalesOrderReturnReceiving = getSalesOrderReturnReceiving;
module.exports.getAllSalesOrderReturnReceivings =
  getAllSalesOrderReturnReceivings;
module.exports.updateSalesOrderReturnReceiving =
  updateSalesOrderReturnReceiving;
module.exports.updateSalesOrderReturnReceivingStatus =
  updateSalesOrderReturnReceivingStatus;
module.exports.deleteSalesOrderReturnReceiving =
  deleteSalesOrderReturnReceiving;
module.exports.getAllSalesOrderReturnPutawayOrders =
  getAllSalesOrderReturnPutawayOrders;
module.exports.updateNewSalesOrderReturnPutawayOrder =
  updateNewSalesOrderReturnPutawayOrder;
module.exports.getSalesOrderReturnAllPendingProductsForPutaway =
  getSalesOrderReturnAllPendingProductsForPutaway;
module.exports.getAllAvailablePalletTypesForSalesOrderReturnProduct =
  getAllAvailablePalletTypesForSalesOrderReturnProduct;
module.exports.getAllSalesOrderReturnPutawayOrderAllocatedProducts =
  getAllSalesOrderReturnPutawayOrderAllocatedProducts;
module.exports.suggestBinForPutawaySalesOrderReturn =
  suggestBinForPutawaySalesOrderReturn;
module.exports.fetchAllAvailableBinsForPutawaySalesOrderReturn =
  fetchAllAvailableBinsForPutawaySalesOrderReturn;
module.exports.validateBinNumberForPutawaySalesOrderReturn =
  validateBinNumberForPutawaySalesOrderReturn;
module.exports.putProductIntoBinForPutawaySalesOrderReturn =
  putProductIntoBinForPutawaySalesOrderReturn;
