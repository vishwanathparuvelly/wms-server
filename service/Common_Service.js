const config = require("config");
const moment = require("moment");
const sql = require("mssql");
const { CustomError } = require("../model/CustomError");

async function validateBinProductAvailability(pool, values) {
  try {
    values.Quantity = Number(values.Quantity);
    const {
      SalesOrderID,
      ProductID,
      WarehouseID,
      BatchNumber,
      UOMID,
      SLOCID,
      Quantity,
    } = values;
    let productData = await fetchProduct(pool, ProductID);
    let query = `
            SELECT SUM(BP.FilledQuantity) AS TotalFilledQuantity
            FROM BinProducts BP
            WHERE BP.ProductID = @ProductID
            AND BP.WarehouseID = @WarehouseID
            AND BP.BatchNumber = @BatchNumber
            AND BP.UOMID = @UOMID
            AND BP.SLOCID = @SLOCID
            AND BP.FilledQuantity > 0
            AND BP.IsActive = 1
        `;
    let request = pool
      .request()
      .input("ProductID", sql.Int, parseInt(ProductID))
      .input("WarehouseID", sql.Int, parseInt(WarehouseID))
      .input("BatchNumber", sql.VarChar(100), BatchNumber)
      .input("UOMID", sql.Int, parseInt(UOMID))
      .input("SLOCID", sql.Int, parseInt(SLOCID));
    let result = await request.query(query);
    let totalFilledQuantity = result.recordset[0].TotalFilledQuantity || 0;
    if (totalFilledQuantity < Quantity) {
      throw new CustomError(
        `Insufficient stock for product ${productData.ProductName}. Requested: ${Quantity}, Available: ${totalFilledQuantity}. Please check the warehouse inventory with the Batch Number: ${BatchNumber} and UOMID: ${UOMID} and SLOCID: ${SLOCID}.`,
      );
    }
    // Query SalesOrderProducts for filled quantity
    let sopQuery = `
            SELECT COALESCE(SUM(SOP.Quantity), 0) AS SalesOrderPickedQuantity
            FROM SalesOrderProducts SOP
            WHERE SOP.SalesOrderID = @SalesOrderID
            AND SOP.ProductID = @ProductID
            AND SOP.BatchNumber = @BatchNumber
            AND SOP.UOMID = @UOMID
            AND SOP.SLOCID = @SLOCID
            AND SOP.IsDeleted = 0
        `;
    let sopRequest = pool
      .request()
      .input("SalesOrderID", sql.Int, parseInt(SalesOrderID))
      .input("ProductID", sql.Int, parseInt(ProductID))
      .input("BatchNumber", sql.VarChar(100), BatchNumber)
      .input("UOMID", sql.Int, parseInt(UOMID))
      .input("SLOCID", sql.Int, parseInt(SLOCID));
    if (values.SalesOrderProductID) {
      sopRequest.input(
        "SalesOrderProductID",
        sql.Int,
        parseInt(values.SalesOrderProductID),
      );
      sopQuery += ` AND SOP.SalesOrderProductID <> @SalesOrderProductID`;
    }
    let sopResult = await sopRequest.query(sopQuery);
    let salesOrderPickedQuantity =
      sopResult.recordset[0].SalesOrderPickedQuantity || 0;
    if (totalFilledQuantity < Quantity + salesOrderPickedQuantity) {
      throw new CustomError(
        `Insufficient stock for product ${productData.ProductName}. Requested: ${Quantity}, Available: ${totalFilledQuantity}. Sales Order already picked quantity: ${salesOrderPickedQuantity}. Please check the warehouse inventory with the Batch Number: ${BatchNumber} and UOMID: ${UOMID} and SLOCID: ${SLOCID}.`,
      );
    }
    return true;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in validateBinProductAvailability: " + err.message,
    );
  }
}

async function fetchProduct(pool, ProductID) {
  try {
    let query = `
            SELECT PRD.*,
            BR.BrandName,
            PCK.PackagingTypeName,
            LN.LineName,
            PC.ProductConsumeType,
            PT.ProductTypeName
            FROM Products PRD
            left join Brands BR ON PRD.BrandID = BR.BrandID
            left join PackagingTypes PCK ON PRD.PackagingTypeID = PCK.PackagingTypeID
            left join Lines LN ON PRD.LineID = LN.LineID
            left join ProductConsumes PC ON PRD.ProductConsumeID = PC.ProductConsumeID
            left join ProductTypes PT ON PRD.ProductTypeID = PT.ProductTypeID
            WHERE ProductID = @ProductID
        `;
    let request = pool.request();
    request.input("ProductID", sql.Int, parseInt(ProductID));
    let result = await request.query(query);
    if (result.recordset.length === 0) {
      throw new CustomError("Product not found");
    }
    if (!result.recordset[0].IsActive) {
      throw new CustomError("Product is not active");
    }
    let ProductData = result.recordset[0];
    return ProductData;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError("Catch Exception in fetchProduct: " + err.message);
  }
}

async function fetchPalletDetails(pool, palletTypeId) {
  try {
    const query = `
            SELECT *
            FROM PalletTypes
            WHERE PalletTypeID = @PalletTypeID
        `;
    const request = pool
      .request()
      .input("PalletTypeID", sql.Int, parseInt(palletTypeId));
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError(
        `No pallet type found with PalletTypeID: ${palletTypeId}`,
      );
    }
    let PalletDetails = result.recordset[0];
    if (!PalletDetails.IsActive) {
      throw new CustomError(
        `Pallet type is not active: ${PalletDetails.PalletName}`,
      );
    }
    return PalletDetails;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in fetchPalletDetails: " + err.message,
    );
  }
}

async function fetchBinDetails(pool, BinID) {
  try {
    const query = `
            SELECT B.*, 
            ST.StackCode,
            ST.StackName,
            PT.PalletName,
            STT.StorageTypeName
            FROM Bins B
            LEFT JOIN Stacks ST ON B.StackID = ST.StackID
            LEFT JOIN PalletTypes PT ON B.PalletTypeID = PT.PalletTypeID
            LEFT JOIN StorageTypes STT ON B.StorageTypeID = STT.StorageTypeID
            WHERE B.BinID = @BinID
        `;
    const request = pool.request().input("BinID", sql.Int, parseInt(BinID));
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError(`No bin found with BinID: ${BinID}`);
    }
    let BinDetails = result.recordset[0];
    if (!BinDetails.IsActive) {
      throw new CustomError(`Bin is not active: ${BinDetails.BinNumber}`);
    }
    return BinDetails;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError("Catch Exception in fetchBinDetails: " + err.message);
  }
}

async function fetchBinDetails_BinNumber(pool, BinNumber, WarehouseID) {
  try {
    const query = `
            SELECT B.*, 
            ST.StackCode,
            ST.StackName,
            PT.PalletName,
            STT.StorageTypeName
            FROM Bins B
            LEFT JOIN Stacks ST ON B.StackID = ST.StackID
            LEFT JOIN PalletTypes PT ON B.PalletTypeID = PT.PalletTypeID
            LEFT JOIN StorageTypes STT ON B.StorageTypeID = STT.StorageTypeID
            WHERE B.BinNumber = @BinNumber
            AND B.WarehouseID = @WarehouseID
        `;
    const request = pool
      .request()
      .input("BinNumber", sql.VarChar(50), String(BinNumber))
      .input("WarehouseID", sql.Int, parseInt(WarehouseID));
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError(`No bin found with BinNumber: ${BinNumber}`);
    }
    let BinDetails = result.recordset[0];
    if (!BinDetails.IsActive) {
      throw new CustomError(`Bin is not active: ${BinDetails.BinNumber}`);
    }
    return BinDetails;
  } catch (err) {
    if (err instanceof CustomError) {
      throw err;
    }
    throw new CustomError(
      "Catch Exception in fetchBinDetails_BinName: " + err.message,
    );
  }
}

module.exports.fetchProduct = fetchProduct;
module.exports.fetchPalletDetails = fetchPalletDetails;
module.exports.fetchBinDetails = fetchBinDetails;
module.exports.fetchBinDetails_BinNumber = fetchBinDetails_BinNumber;
module.exports.validateBinProductAvailability = validateBinProductAvailability;
