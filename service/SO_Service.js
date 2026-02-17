const config = require('config');
const moment = require('moment');
const sql = require('mssql');
const commonService = require('./Common_Service');
const { CustomError } = require('../model/CustomError');

async function getNewSalesOrder(pool, values) {
    try {
        let newSalesOrder = {
            SalesOrderDate: moment(new Date()).format('YYYY-MM-DD'),
            CreatedBy: values.user_id,
            UpdatedBy: values.user_id
        };
        let query = `
                DECLARE @OutputTable TABLE (
                        SalesOrderID INT
                );
                INSERT INTO SalesOrders (
                    SalesOrderDate, CreatedBy, UpdatedBy
                )
                OUTPUT 
                    INSERTED.SalesOrderID
                INTO @OutputTable
                VALUES (
                    @SalesOrderDate, @CreatedBy, @UpdatedBy
                );
                SELECT * FROM @OutputTable;
            `;
        let request = pool.request()
            .input('SalesOrderDate', sql.Date, newSalesOrder.SalesOrderDate)
            .input('CreatedBy', sql.VarChar(100), newSalesOrder.CreatedBy)
            .input('UpdatedBy', sql.VarChar(100), newSalesOrder.UpdatedBy);
        let result = await request.query(query);
        let insertedRecordId = result.recordset[0].SalesOrderID;
        let SalesOrder = await getSalesOrder(pool, insertedRecordId);
        return SalesOrder;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in getNewSalesOrder: ' + err.message);
    }
}

async function getSalesOrder(pool, SalesOrderID) {
    try {
        if (!SalesOrderID) {
            throw new CustomError('SalesOrderID is required');
        }
        const input = String(SalesOrderID).trim();
        const isNumeric = /^\d+$/.test(input);
        let query = `
        SELECT SO.*,
        CU.UserName AS CreatedByUserName,
        UU.UserName AS UpdatedByUserName,
        C.CustomerName,
        B.BranchName,
        W.WarehouseName,
        (
            SELECT COALESCE(SUM(SOP.Quantity), 0)
            FROM SalesOrderProducts SOP
            WHERE SOP.SalesOrderID = SO.SalesOrderID AND SOP.IsDeleted = 0
        ) AS total_quantity,
        (
            SELECT COALESCE(SUM(SOP.MRP), 0)
            FROM SalesOrderProducts SOP
            WHERE SOP.SalesOrderID = SO.SalesOrderID AND SOP.IsDeleted = 0
        ) AS total_MRP
        FROM SalesOrders SO 
        LEFT JOIN Users CU ON SO.CreatedBy = CU.UserID 
        LEFT JOIN Users UU ON SO.UpdatedBy = UU.UserID 
        LEFT JOIN Customers C ON SO.CustomerID = C.CustomerID
        LEFT JOIN Branches B ON SO.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON SO.WarehouseID = W.WarehouseID
        `;
        let request = pool.request();
        if (isNumeric) {
            query += ` WHERE SO.SalesOrderID = @SalesOrderID`;
            request.input('SalesOrderID', sql.Int, parseInt(input));
        } else {
            query += ` WHERE SO.SalesOrderNumber = @SalesOrderID`;
            request.input('SalesOrderID', sql.VarChar(20), input);
        }
        let result = await request.query(query);
        if (result.recordset.length === 0) {
            throw new CustomError('No sales order found with the given ID');
        }
        let SalesOrder = result.recordset[0];
        if (SalesOrder.SalesOrderStatus == 'New') {
            SalesOrder.SalesOrderStatus = 'Draft';
        }
        if (SalesOrder.IsDeleted) {
            throw new CustomError('Sales Order already deleted: ' + SalesOrder?.SalesOrderNumber);
        }
        return SalesOrder;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in getSalesOrder: ' + err.message);
    }
}

async function getAllSalesOrders(pool, values) {
    try {
        let user_id = values.user_id;
        let query = `
        SELECT SO.*,
        CU.UserName AS CreatedByUserName,
        UU.UserName AS UpdatedByUserName,
        C.CustomerName,
        B.BranchName,
        W.WarehouseName,
        (
            SELECT COALESCE(SUM(SOP.Quantity), 0)
            FROM SalesOrderProducts SOP
            WHERE SOP.SalesOrderID = SO.SalesOrderID AND SOP.IsDeleted = 0
        ) AS total_quantity,
        (
            SELECT COALESCE(SUM(SOP.MRP), 0)
            FROM SalesOrderProducts SOP
            WHERE SOP.SalesOrderID = SO.SalesOrderID AND SOP.IsDeleted = 0
        ) AS total_MRP
        FROM SalesOrders SO
        LEFT JOIN Users CU ON SO.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON SO.UpdatedBy = UU.UserID
        LEFT JOIN Customers C ON SO.CustomerID = C.CustomerID
        LEFT JOIN Branches B ON SO.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON SO.WarehouseID = W.WarehouseID
        WHERE SO.CreatedBy = @CreatedBy AND SO.SalesOrderStatus != 'New' AND SO.IsDeleted = 0
        `;
        if (values.SalesOrderStatus) {
            query += ` AND SO.SalesOrderStatus = @SalesOrderStatus`;
        }
        let request = pool.request();
        request.input('CreatedBy', sql.Int, parseInt(user_id));
        if (values.SalesOrderStatus) {
            request.input('SalesOrderStatus', sql.VarChar(50), values.SalesOrderStatus);
        }
        let result = await request.query(query);
        return result.recordset;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in getAllSalesOrders: ' + err.message);
    }
}

async function updateSalesOrder(pool, values) {
    try {
        let items = [
            "SalesOrderID",
            "DeliveryDate",
            "SalesOrderStatus",
            "CustomerID",
            "BranchID",
            "WarehouseID",
            "TransporterName",
            "VehicleNumber",
            "LRNumber",
            "Remarks"
        ];
        let SalesOrder;
        for (const key of items) {
            if (values[key] === undefined || values[key] === null) {
                throw new CustomError(`Missing required field: ${key}`);
            }
            if (key == "SalesOrderID") {
                if (isNaN(values[key])) {
                    throw new CustomError(`Invalid SalesOrderID: ${values[key]}`);
                }
                SalesOrder = await getSalesOrder(pool, values[key]);
            }
            if (key == "DeliveryDate") {
                let date = moment(values[key], 'YYYY-MM-DD', true);
                let today = moment();
                if (!date.isValid()) {
                    throw new CustomError(`Invalid DeliveryDate: ${values[key]}`);
                }
                if (date.isBefore(today)) {
                    throw new CustomError(`DeliveryDate cannot be in the past: ${values[key]}`);
                }
                if (date.isAfter(today.add(30, 'days'))) {
                    throw new CustomError(`DeliveryDate cannot be more than 30 days in the future: ${values[key]}`);
                }
            }
            if (key == 'SalesOrderStatus') {
                if (values[key] != 'Draft' && values[key] != 'Open' && values[key] != 'Cancelled') {
                    throw new CustomError(`Invalid Sales Order with status: ${values.SalesOrderStatus}, It should be 'Draft', 'Open' or 'Cancelled'`);
                }
            }
        }
        if (SalesOrder.SalesOrderStatus == 'Completed' || SalesOrder.SalesOrderStatus == 'Cancelled') {
            throw new CustomError(`Cannot update Sales Order with status: ${SalesOrder.SalesOrderStatus}`);
        }
        let user_id = values.user_id;
        let query = `
        UPDATE SalesOrders
        SET 
            DeliveryDate = @DeliveryDate,
            SalesOrderStatus = @SalesOrderStatus,
            CustomerID = @CustomerID,
            BranchID = @BranchID,
            WarehouseID = @WarehouseID,
            TransporterName = @TransporterName,
            VehicleNumber = @VehicleNumber,
            LRNumber = @LRNumber,
            Remarks = @Remarks,
            UpdatedBy = @UpdatedBy,
            UpdatedDate = GETDATE()
        WHERE SalesOrderID = @SalesOrderID
        `;
        let request = pool.request();
        request.input('SalesOrderID', sql.Int, parseInt(values.SalesOrderID))
            .input('DeliveryDate', sql.Date, values.DeliveryDate)
            .input('SalesOrderStatus', sql.VarChar(50), values.SalesOrderStatus)
            .input('CustomerID', sql.Int, parseInt(values.CustomerID))
            .input('BranchID', sql.Int, parseInt(values.BranchID))
            .input('WarehouseID', sql.Int, parseInt(values.WarehouseID))
            .input('TransporterName', sql.VarChar(100), values.TransporterName)
            .input('VehicleNumber', sql.VarChar(50), values.VehicleNumber)
            .input('LRNumber', sql.VarChar(50), values.LRNumber)
            .input('Remarks', sql.VarChar(500), values.Remarks)
            .input('UpdatedBy', sql.Int, parseInt(user_id));
        let result = await request.query(query);
        if (result.rowsAffected[0] === 0) {
            throw new CustomError('No sales order found with the given ID');
        }
        let salesOrder = await getSalesOrder(pool, values.SalesOrderID);
        return salesOrder;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in updateSalesOrder: ' + err.message);
    }
}

async function deleteSalesOrder(pool, values) {
    try {
        let items = [
            "SalesOrderID"
        ];
        for (const key of items) {
            if (!values[key]) {
                throw new CustomError(`Missing required field: ${key}`);
            }
            if (key == "SalesOrderID") {
                if (isNaN(values[key])) {
                    throw new CustomError(`Invalid SalesOrderID: ${values[key]}`);
                }
                let SalesOrder = await getSalesOrder(pool, values[key]);
                if (SalesOrder.SalesOrderStatus !== 'Draft') {
                    throw new CustomError(`Cannot delete Sales Order with status: ${SalesOrder.SalesOrderStatus}`);
                }
                if (SalesOrder.IsDeleted) {
                    throw new CustomError(`Sales Order already deleted: ${SalesOrder?.SalesOrderNumber}`);
                }
            }
        }
        let user_id = values.user_id;
        let query = `
        UPDATE SalesOrders
        SET 
            IsDeleted = 1,
            SalesOrderStatus = 'Deleted',
            UpdatedBy = @UpdatedBy,
            UpdatedDate = GETDATE()
        WHERE SalesOrderID = @SalesOrderID
        `;
        let request = pool.request();
        request.input('SalesOrderID', sql.Int, parseInt(values.SalesOrderID))
            .input('UpdatedBy', sql.Int, parseInt(user_id));
        let result = await request.query(query);
        if (result.rowsAffected[0] === 0) {
            throw new CustomError('No sales order found with the given ID');
        }
        return 'done';
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in deleteSalesOrder: ' + err.message);
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
            query = query.replace('WHERE BP.FilledQuantity > 0', 'WHERE BP.WarehouseID = @WarehouseID AND BP.FilledQuantity > 0');
            request.input('WarehouseID', sql.Int, parseInt(values.WarehouseID));
        }
        let result = await request.query(query);
        return result.recordset;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in getAllAvailableBinProducts: ' + err.message);
    }
}


async function getAllBinProductsBatchNumbers(pool, values) {
    try {
        if (!values.ProductID) {
            throw new CustomError('ProductID is required');
        }
        if (!values.ProductID) {
            throw new CustomError('ProductID is required');
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
        let request = pool.request()
            .input('ProductID', sql.Int, parseInt(values.ProductID));
        let result = await request.query(query);
        return result.recordset.map(row => row.BatchNumber);
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in getAllBinProductsBatchNumbers: ' + err.message);
    }
}



async function addNewProductForSalesOrder(pool, values) {
    try {
        let items = [
            "SalesOrderID",
            "CustomerID",
            "BranchID",
            "WarehouseID",
            "ProductID",
            "UOMID",
            "SLOCID",
            "BatchNumber",
            "Quantity",
            "MRP",
            "Discount"
        ];
        let SalesOrder;
        for (const key of items) {
            if (!values[key]) {
                throw new CustomError(`Missing required field: ${key}`);
            }
            if (key === "SalesOrderID") {
                if (isNaN(values[key])) {
                    throw new CustomError(`Invalid SalesOrderID: ${values[key]}`);
                }
                SalesOrder = await getSalesOrder(pool, values[key]);
            }
        }
        if (SalesOrder.SalesOrderStatus !== 'Draft') {
            throw new CustomError(`Cannot add products to Sales Order with status: ${SalesOrder.SalesOrderStatus}`);
        }
        let Quantity = Number(values.Quantity);
        let productData = await commonService.fetchProduct(pool, values.ProductID);
        if (Quantity < productData.MinQty) {
            let currentProductQuantity = 0;
            let currentProductPayload = {
                ProductID: values.ProductID,
                SalesOrderID: values.SalesOrderID
            };
            let currentSalesOrderProducts = await getSalesOrderAllProducts(pool, currentProductPayload);
            currentSalesOrderProducts.forEach(product => {
                currentProductQuantity += product.Quantity;
            });
            if ((currentProductQuantity + Quantity) < productData.MinQty) {
                throw new CustomError(`Minimum quantity for product ${productData.ProductName} is ${productData.MinQty}, but provided quantity is ${Quantity} and existing quantity is ${currentProductQuantity}, which makes total quantity less than minimum`);
            }
        }
        await commonService.validateBinProductAvailability(pool, values);
        let user_id = values.user_id;
        let query = `
            MERGE INTO SalesOrderProducts AS target
            USING (SELECT 
                @SalesOrderID AS SalesOrderID, 
                @ProductID AS ProductID, 
                @BatchNumber AS BatchNumber,
                @Quantity AS Quantity,
                @MRP AS MRP,
                @Discount AS Discount
            ) AS source
            ON target.SalesOrderID = source.SalesOrderID
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
                    SalesOrderID,
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
                    @SalesOrderID,
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
        let request = pool.request()
            .input('SalesOrderID', sql.Int, parseInt(values.SalesOrderID))
            .input('CustomerID', sql.Int, parseInt(values.CustomerID))
            .input('BranchID', sql.Int, parseInt(values.BranchID))
            .input('WarehouseID', sql.Int, parseInt(values.WarehouseID))
            .input('ProductID', sql.Int, parseInt(values.ProductID))
            .input('UOMID', sql.Int, parseInt(values.UOMID))
            .input('SLOCID', sql.Int, parseInt(values.SLOCID))
            .input('BatchNumber', sql.VarChar(100), values.BatchNumber)
            .input('Quantity', sql.Decimal(10, 2), Quantity)
            .input('MRP', sql.Decimal(10, 2), values.MRP)
            .input('Discount', sql.Decimal(10, 2), values.Discount)
            .input('CreatedBy', sql.Int, parseInt(user_id))
            .input('UpdatedBy', sql.Int, parseInt(user_id));
        let result = await request.query(query);
        let insertedRecordId = result.recordset[0].SalesOrderProductID;
        let SalesOrderProduct = await getSalesOrderProduct(pool, insertedRecordId);
        return SalesOrderProduct;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in addNewProductForSalesOrder: ' + err.message);
    }
}

async function getSalesOrderProduct(pool, SalesOrderProductID) {
    try {
        const input = String(SalesOrderProductID).trim();
        let query = `
        SELECT SOP.*,
        SO.SalesOrderNumber,
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
        FROM SalesOrderProducts SOP
        LEFT JOIN Users CU ON SOP.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON SOP.UpdatedBy = UU.UserID
        LEFT JOIN SalesOrders SO ON SOP.SalesOrderID = SO.SalesOrderID
        LEFT JOIN Products PRD ON SOP.ProductID = PRD.ProductID
        LEFT JOIN Brands BR ON PRD.BrandID = BR.BrandID
        LEFT JOIN PackagingTypes PCK ON PRD.PackagingTypeID = PCK.PackagingTypeID
        LEFT JOIN Lines LN ON PRD.LineID = LN.LineID
        LEFT JOIN ProductConsumes PC ON PRD.ProductConsumeID = PC.ProductConsumeID
        LEFT JOIN ProductTypes PT ON PRD.ProductTypeID = PT.ProductTypeID
        LEFT JOIN UOMs U ON SOP.UOMID = U.UOMID
        LEFT JOIN Slocs S ON SOP.SLOCID = S.SLOCID
        LEFT JOIN Customers C ON SOP.CustomerID = C.CustomerID
        LEFT JOIN Branches B ON SOP.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON SOP.WarehouseID = W.WarehouseID
        WHERE SOP.SalesOrderProductID = @SalesOrderProductID
        `;
        let request = pool.request();
        request.input('SalesOrderProductID', sql.Int, parseInt(input));
        let result = await request.query(query);
        if (result.recordset.length === 0) {
            throw new CustomError(`No sales order product found with the given ID ${input}`);
        }
        let SalesOrderProduct = result.recordset[0];
        if (SalesOrderProduct.IsDeleted) {
            throw new CustomError('Sales Order Product already deleted: ' + SalesOrderProduct?.SalesOrderNumber);
        }
        return SalesOrderProduct;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in getSalesOrderProduct: ' + err.message);
    }
}

async function getSalesOrderAllProducts(pool, values) {
    try {
        let SalesOrderID = values.SalesOrderID;
        if (!SalesOrderID) {
            throw new CustomError('SalesOrderID is required');
        }
        let SalesOrder = await getSalesOrder(pool, SalesOrderID);
        let query = `
        SELECT SOP.*,
        SO.SalesOrderNumber,
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
        FROM SalesOrderProducts SOP
        LEFT JOIN Users CU ON SOP.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON SOP.UpdatedBy = UU.UserID
        LEFT JOIN SalesOrders SO ON SOP.SalesOrderID = SO.SalesOrderID
        LEFT JOIN Products PRD ON SOP.ProductID = PRD.ProductID
        LEFT JOIN Brands BR ON PRD.BrandID = BR.BrandID
        LEFT JOIN PackagingTypes PCK ON PRD.PackagingTypeID = PCK.PackagingTypeID
        LEFT JOIN Lines LN ON PRD.LineID = LN.LineID
        LEFT JOIN ProductConsumes PC ON PRD.ProductConsumeID = PC.ProductConsumeID
        LEFT JOIN ProductTypes PT ON PRD.ProductTypeID = PT.ProductTypeID
        LEFT JOIN UOMs U ON SOP.UOMID = U.UOMID
        LEFT JOIN Slocs S ON SOP.SLOCID = S.SLOCID
        LEFT JOIN Customers C ON SOP.CustomerID = C.CustomerID
        LEFT JOIN Branches B ON SOP.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON SOP.WarehouseID = W.WarehouseID
        WHERE SOP.SalesOrderID = @SalesOrderID AND SOP.IsDeleted = 0
        `;
        let request = pool.request();
        request.input('SalesOrderID', sql.Int, parseInt(SalesOrderID));
        if (values.ProductID) {
            query += ` AND SOP.ProductID = @ProductID`;
            request.input('ProductID', sql.Int, parseInt(values.ProductID));
        }
        query += ` ORDER BY SOP.SalesOrderProductID`;
        let result = await request.query(query);
        return result.recordset;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in getSalesOrderAllProducts: ' + err.message);
    }
}

async function updateSalesOrderProduct(pool, values) {
    try {
        let requiredFields = [
            "SalesOrderProductID",
            "SalesOrderID",
            "ProductID",
            "UOMID",
            "SLOCID",
            "BatchNumber",
            "Quantity",
            "MRP",
            "Discount"
        ];
        for (const key of requiredFields) {
            if (!values[key]) {
                throw new CustomError(`Missing required field: ${key}`);
            }
        }
        if (isNaN(values.SalesOrderID)) {
            throw new CustomError(`Invalid SalesOrderID: ${values.SalesOrderID}`);
        }
        const SalesOrder = await getSalesOrder(pool, values.SalesOrderID);
        values.WarehouseID = SalesOrder.WarehouseID;
        if (SalesOrder.SalesOrderStatus !== 'Draft') {
            throw new CustomError(`Cannot update products for Sales Order with status: ${SalesOrder.SalesOrderStatus}`);
        }
        if (isNaN(values.SalesOrderProductID)) {
            throw new CustomError(`Invalid SalesOrderProductID: ${values.SalesOrderProductID}`);
        }
        let SalesOrderProduct = await getSalesOrderProduct(pool, values.SalesOrderProductID);
        if (SalesOrderProduct.IsDeleted) {
            throw new CustomError('Sales Order Product already deleted: ' + SalesOrderProduct?.SalesOrderNumber);
        }
        let Quantity = Number(values.Quantity);
        let productData = await commonService.fetchProduct(pool, values.ProductID);
        if (Quantity < productData.MinQty) {
            let currentProductQuantity = 0;
            let currentProductPayload = {
                ProductID: values.ProductID,
                SalesOrderID: values.SalesOrderID
            };
            let currentSalesOrderProducts = await getSalesOrderAllProducts(pool, currentProductPayload);
            currentSalesOrderProducts
                .filter(product => product.SalesOrderProductID != values.SalesOrderProductID)
                .forEach(product => {
                    currentProductQuantity += product.Quantity;
                });
            if ((currentProductQuantity + Quantity) < productData.MinQty) {
                throw new CustomError(`Minimum quantity for product ${productData.ProductName} is ${productData.MinQty}, but provided quantity is ${Quantity} and existing quantity is ${currentProductQuantity}, which makes total quantity less than minimum`);
            }
        }
        await commonService.validateBinProductAvailability(pool, values);
        const Total_Product_MRP = (Quantity * Number(values.MRP)) || 0;
        const Total_Product_Discount = (Quantity * Number(values.Discount)) || 0;
        const Total_Product_Amount = Total_Product_MRP - Total_Product_Discount;
        const query = `
            UPDATE SalesOrderProducts
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
            WHERE SalesOrderProductID = @SalesOrderProductID
        `;
        const request = pool.request()
            .input('SalesOrderProductID', sql.Int, parseInt(values.SalesOrderProductID))
            .input('ProductID', sql.Int, parseInt(values.ProductID))
            .input('UOMID', sql.Int, parseInt(values.UOMID))
            .input('SLOCID', sql.Int, parseInt(values.SLOCID))
            .input('BatchNumber', sql.VarChar(100), values.BatchNumber)
            .input('Quantity', sql.Decimal(10, 2), Quantity)
            .input('MRP', sql.Decimal(10, 2), values.MRP)
            .input('Discount', sql.Decimal(10, 2), values.Discount)
            .input('Total_Product_MRP', sql.Decimal(10, 2), Total_Product_MRP)
            .input('Total_Product_Discount', sql.Decimal(10, 2), Total_Product_Discount)
            .input('Total_Product_Amount', sql.Decimal(10, 2), Total_Product_Amount)
            .input('UpdatedBy', sql.Int, parseInt(values.user_id));
        const result = await request.query(query);
        if (result.rowsAffected[0] === 0) {
            throw new CustomError('No product found with provided SalesOrderProductID');
        }
        SalesOrderProduct = await getSalesOrderProduct(pool, values.SalesOrderProductID);
        return SalesOrderProduct;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in updateSalesOrderProduct: ' + err.message);
    }
}

async function deleteSalesOrderProduct(pool, values) {
    try {
        if (!values.SalesOrderProductID) {
            throw new CustomError('Missing required field: SalesOrderProductID');
        }
        if (!values.SalesOrderID) {
            throw new CustomError('Missing required field: SalesOrderID');
        }
        if (isNaN(values.SalesOrderID)) {
            throw new CustomError(`Invalid SalesOrderID: ${values.SalesOrderID}`);
        }
        const SalesOrder = await getSalesOrder(pool, values.SalesOrderID);
        if (SalesOrder.SalesOrderStatus !== 'Draft') {
            throw new CustomError(`Cannot delete products for Sales Order with status: ${SalesOrder.SalesOrderStatus}`);
        }
        if (isNaN(values.SalesOrderProductID)) {
            throw new CustomError(`Invalid SalesOrderProductID: ${values.SalesOrderProductID}`);
        }
        let SalesOrderProduct = await getSalesOrderProduct(pool, values.SalesOrderProductID);
        if (SalesOrderProduct.IsDeleted) {
            throw new CustomError('Sales Order Product already deleted: ' + SalesOrderProduct?.SalesOrderNumber);
        }
        const query = `
            UPDATE SalesOrderProducts
            SET 
                IsDeleted = 1,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE SalesOrderProductID = @SalesOrderProductID
        `;
        const request = pool.request()
            .input('SalesOrderProductID', sql.Int, parseInt(values.SalesOrderProductID))
            .input('UpdatedBy', sql.Int, parseInt(values.user_id));
        const result = await request.query(query);
        if (result.rowsAffected[0] === 0) {
            throw new CustomError('No active product found with provided SalesOrderProductID');
        }
        return 'done';
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in deleteSalesOrderProduct: ' + err.message);
    }
}

async function getAllPickListOrders(pool, values) {
    try {
        let user_id = values.user_id;
        let query = `
        SELECT SO.*,
        CU.UserName AS CreatedByUserName,
        UU.UserName AS UpdatedByUserName,
        C.CustomerName,
        B.BranchName,
        W.WarehouseName,
        (
            SELECT COALESCE(SUM(SOP.Quantity), 0)
            FROM SalesOrderProducts SOP
            WHERE SOP.SalesOrderID = SO.SalesOrderID AND SOP.IsDeleted = 0
        ) AS total_quantity,
        (
            SELECT COALESCE(SUM(SOP.MRP), 0)
            FROM SalesOrderProducts SOP
            WHERE SOP.SalesOrderID = SO.SalesOrderID AND SOP.IsDeleted = 0
        ) AS total_MRP
        FROM SalesOrders SO
        LEFT JOIN Users CU ON SO.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON SO.UpdatedBy = UU.UserID
        LEFT JOIN Customers C ON SO.CustomerID = C.CustomerID
        LEFT JOIN Branches B ON SO.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON SO.WarehouseID = W.WarehouseID
        WHERE SO.CreatedBy = @CreatedBy AND SO.SalesOrderStatus != 'New' AND SO.IsDeleted = 0
        AND SO.SalesOrderStatus IN ('Picklist Started', 'Picklist Completed')
        `;
        if (values.SalesOrderStatus) {
            query += ` AND SO.SalesOrderStatus = @SalesOrderStatus`;
        }
        let request = pool.request();
        request.input('CreatedBy', sql.Int, parseInt(user_id));
        if (values.SalesOrderStatus) {
            request.input('SalesOrderStatus', sql.VarChar(50), values.SalesOrderStatus);
        }
        let result = await request.query(query);
        return result.recordset;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in getAllSalesOrders: ' + err.message);
    }
}

async function getSalesOrderAllPendingProductsForPicklist(pool, values) {
    try {
        let SalesOrderID = values.SalesOrderID;
        if (!SalesOrderID) {
            throw new CustomError('SalesOrderID is required');
        }
        let SalesOrder = await getSalesOrder(pool, SalesOrderID);
        let query = `
        SELECT SOP.*,
        SO.SalesOrderNumber,
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
        FROM SalesOrderProducts SOP
        LEFT JOIN Users CU ON SOP.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON SOP.UpdatedBy = UU.UserID
        LEFT JOIN SalesOrders SO ON SOP.SalesOrderID = SO.SalesOrderID
        LEFT JOIN Products PRD ON SOP.ProductID = PRD.ProductID
        LEFT JOIN Brands BR ON PRD.BrandID = BR.BrandID
        LEFT JOIN PackagingTypes PCK ON PRD.PackagingTypeID = PCK.PackagingTypeID
        LEFT JOIN Lines LN ON PRD.LineID = LN.LineID
        LEFT JOIN ProductConsumes PC ON PRD.ProductConsumeID = PC.ProductConsumeID
        LEFT JOIN ProductTypes PT ON PRD.ProductTypeID = PT.ProductTypeID
        LEFT JOIN UOMs U ON SOP.UOMID = U.UOMID
        LEFT JOIN Slocs S ON SOP.SLOCID = S.SLOCID
        LEFT JOIN Customers C ON SOP.CustomerID = C.CustomerID
        LEFT JOIN Branches B ON SOP.BranchID = B.BranchID
        LEFT JOIN Warehouses W ON SOP.WarehouseID = W.WarehouseID
        WHERE SOP.SalesOrderID = @SalesOrderID AND SOP.IsDeleted = 0 AND SOP.Pending_Quantity > 0
        
        `;
        let request = pool.request();
        request.input('SalesOrderID', sql.Int, parseInt(SalesOrderID));
        if (values.ProductID) {
            query += ` AND SOP.ProductID = @ProductID`;
            request.input('ProductID', sql.Int, parseInt(values.ProductID));
        }
        query += ` ORDER BY SOP.SalesOrderProductID`;
        let result = await request.query(query);
        return result.recordset;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in getSalesOrderAllPendingProductsForPicklist: ' + err.message);
    }
}

async function getAllPicklistOrderPickedProducts(pool, values) {
    try {
        let SalesOrderID = values.SalesOrderID;
        if (!SalesOrderID) {
            throw new CustomError('SalesOrderID is required');
        }
        let SalesOrder = await getSalesOrder(pool, SalesOrderID);
        if (SalesOrder.IsDeleted) {
            throw new CustomError('Sales Order already deleted: ' + SalesOrder?.SalesOrderNumber);
        }
        if (SalesOrder.SalesOrderStatus !== 'Open' && SalesOrder.SalesOrderStatus !== 'Picklist Started' && SalesOrder.SalesOrderStatus !== 'Picklist Completed') {
            throw new CustomError(`Invalid SalesOrderStatus: ${SalesOrder.SalesOrderStatus}. Must be 'Open' or 'Picklist Started' or 'Picklist Completed'`);
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
        SOP.SalesOrderProductID,
        SO.SalesOrderNumber,
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
        JOIN SalesOrderProducts SOP ON BPL.SalesOrderProductID = SOP.SalesOrderProductID
        JOIN SalesOrders SO ON SOP.SalesOrderID = SO.SalesOrderID
        JOIN Products PRD ON BPL.ProductID = PRD.ProductID
        LEFT JOIN Users CU ON BPL.CreatedBy = CU.UserID
        LEFT JOIN Customers C ON SOP.CustomerID = C.CustomerID
        LEFT JOIN Branches BR ON BPL.BranchID = BR.BranchID
        LEFT JOIN Warehouses W ON BPL.WarehouseID = W.WarehouseID
        LEFT JOIN UOMs U ON BP.UOMID = U.UOMID
        LEFT JOIN Slocs S ON BP.SLOCID = S.SLOCID
        LEFT JOIN Brands BRD ON PRD.BrandID = BRD.BrandID
        LEFT JOIN PackagingTypes PCK ON PRD.PackagingTypeID = PCK.PackagingTypeID
        LEFT JOIN Lines LN ON PRD.LineID = LN.LineID
        LEFT JOIN ProductConsumes PC ON PRD.ProductConsumeID = PC.ProductConsumeID
        LEFT JOIN ProductTypes PDT ON PRD.ProductTypeID = PDT.ProductTypeID
        WHERE SO.SalesOrderID = @SalesOrderID
        AND BPL.ActionType = 2 -- Picked from Sales Order
        ORDER BY BPL.CreatedDate
        `;
        let request = pool.request();
        request.input('SalesOrderID', sql.Int, parseInt(SalesOrderID));
        let result = await request.query(query);
        return result.recordset;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in getAllPicklistOrderPickedProducts: ' + err.message);
    }
}


async function suggestBinForPicklist(pool, values) {
    try {
        const requiredFields = ["SalesOrderProductID"];
        for (const key of requiredFields) {
            if (!values[key]) {
                throw new CustomError(`Missing required field: ${key}`);
            }
        }

        const SalesOrderProduct = await getSalesOrderProduct(pool, values.SalesOrderProductID);
        if (SalesOrderProduct.IsDeleted) {
            throw new CustomError(`Sales Order Product already deleted: ${SalesOrderProduct.SalesOrderNumber}`);
        }
        if (SalesOrderProduct.Pending_Quantity <= 0) {
            throw new CustomError(`No quantity available for picklist: ${SalesOrderProduct.Pending_Quantity}, Product: ${SalesOrderProduct.ProductName}`);
        }

        const SalesOrder = await getSalesOrder(pool, SalesOrderProduct.SalesOrderID);
        if (SalesOrder.IsDeleted) {
            throw new CustomError(`Sales Order already deleted: ${SalesOrder.SalesOrderNumber}`);
        }
        if (SalesOrder.SalesOrderStatus !== 'Open' && SalesOrder.SalesOrderStatus !== 'Picklist Started') {
            throw new CustomError(`Invalid SalesOrderStatus: ${SalesOrder.SalesOrderStatus}. Must be 'Open' or 'Picklist Started'`);
        }

        const ProductID = SalesOrderProduct.ProductID;
        const WarehouseID = SalesOrderProduct.WarehouseID;
        const BatchNumber = SalesOrderProduct.BatchNumber;
        const UOMID = SalesOrderProduct.UOMID;
        const SLOCID = SalesOrderProduct.SLOCID;
        const Quantity = values.Quantity ? Number(values.Quantity) : SalesOrderProduct.Pending_Quantity;

        if (isNaN(Quantity) || Quantity <= 0) {
            throw new CustomError(`Invalid Quantity: ${values.Quantity}`);
        }
        if (Quantity > SalesOrderProduct.Pending_Quantity) {
            throw new CustomError(`Quantity ${Quantity} exceeds Pending Quantity ${SalesOrderProduct.Pending_Quantity}`);
        }

        // Query to find the maximum FilledQuantity
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

        const maxQuantityRequest = pool.request()
            .input('ProductID', sql.Int, ProductID)
            .input('BatchNumber', sql.VarChar(100), BatchNumber)
            .input('UOMID', sql.Int, UOMID)
            .input('SLOCID', sql.Int, SLOCID)
            .input('WarehouseID', sql.Int, WarehouseID);

        const maxQuantityResult = await maxQuantityRequest.query(maxQuantityQuery);
        const maxFilledQuantity = maxQuantityResult.recordset[0]?.MaxFilledQuantity || 0;

        let suggestedBinQuery;
        let orderByClause;

        if (maxFilledQuantity < Quantity) {
            // If Quantity exceeds max FilledQuantity, select the bin with the highest FilledQuantity
            orderByClause = `ORDER BY BP.FilledQuantity DESC`;
        } else {
            // Otherwise, select the bin with FilledQuantity closest to Quantity
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

        const suggestedBinRequest = pool.request()
            .input('ProductID', sql.Int, ProductID)
            .input('BatchNumber', sql.VarChar(100), BatchNumber)
            .input('UOMID', sql.Int, UOMID)
            .input('SLOCID', sql.Int, SLOCID)
            .input('WarehouseID', sql.Int, WarehouseID)
            .input('Quantity', sql.Decimal(10, 2), Quantity);

        const suggestedBinResult = await suggestedBinRequest.query(suggestedBinQuery);
        let suggestedBin = suggestedBinResult.recordset[0];

        if (!suggestedBin) {
            throw new CustomError(`No suitable bin found for picklist for Product: ${SalesOrderProduct.ProductName}. Please check the product details and available bins in inventory. Also validate the Batch Number, UOM, and SLOC.`);
        }

        return suggestedBin;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in suggestBinForPicklist: ' + err.message);
    }
}


async function fetchAllAvailableBinsForPicklist(pool, values) {
    try {
        const requiredFields = ["SalesOrderProductID"];
        for (const key of requiredFields) {
            if (!values[key]) {
                throw new CustomError(`Missing required field: ${key}`);
            }
        }

        const SalesOrderProduct = await getSalesOrderProduct(pool, values.SalesOrderProductID);
        if (SalesOrderProduct.IsDeleted) {
            throw new CustomError(`Sales Order Product already deleted: ${SalesOrderProduct.SalesOrderNumber}`);
        }
        if (SalesOrderProduct.Pending_Quantity <= 0) {
            throw new CustomError(`No quantity available for picklist: ${SalesOrderProduct.Pending_Quantity}, Product: ${SalesOrderProduct.ProductName}`);
        }

        const SalesOrder = await getSalesOrder(pool, SalesOrderProduct.SalesOrderID);
        if (SalesOrder.IsDeleted) {
            throw new CustomError(`Sales Order already deleted: ${SalesOrder.SalesOrderNumber}`);
        }
        if (SalesOrder.SalesOrderStatus !== 'Open' && SalesOrder.SalesOrderStatus !== 'Picklist Started') {
            throw new CustomError(`Invalid SalesOrderStatus: ${SalesOrder.SalesOrderStatus}. Must be 'Open' or 'Picklist Started'`);
        }

        const ProductID = SalesOrderProduct.ProductID;
        const WarehouseID = SalesOrderProduct.WarehouseID;
        const BatchNumber = SalesOrderProduct.BatchNumber;
        const UOMID = SalesOrderProduct.UOMID;
        const SLOCID = SalesOrderProduct.SLOCID;
        const Quantity = values.Quantity ? Number(values.Quantity) : SalesOrderProduct.Pending_Quantity;

        if (isNaN(Quantity) || Quantity <= 0) {
            throw new CustomError(`Invalid Quantity: ${values.Quantity}`);
        }
        if (Quantity > SalesOrderProduct.Pending_Quantity) {
            throw new CustomError(`Quantity ${Quantity} exceeds Pending Quantity ${SalesOrderProduct.Pending_Quantity}`);
        }

        // Query to find the maximum FilledQuantity
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

        const maxQuantityRequest = pool.request()
            .input('ProductID', sql.Int, ProductID)
            .input('BatchNumber', sql.VarChar(100), BatchNumber)
            .input('UOMID', sql.Int, UOMID)
            .input('SLOCID', sql.Int, SLOCID)
            .input('WarehouseID', sql.Int, WarehouseID);

        const maxQuantityResult = await maxQuantityRequest.query(maxQuantityQuery);
        const maxFilledQuantity = maxQuantityResult.recordset[0]?.MaxFilledQuantity || 0;

        let binsQuery;
        let orderByClause;

        if (maxFilledQuantity < Quantity) {
            // If Quantity exceeds max FilledQuantity, prioritize bins with higher FilledQuantity
            orderByClause = `ORDER BY BP.FilledQuantity DESC`;
        } else {
            // Otherwise, prioritize bins with FilledQuantity closest to Quantity
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

        const binsRequest = pool.request()
            .input('ProductID', sql.Int, ProductID)
            .input('BatchNumber', sql.VarChar(100), BatchNumber)
            .input('UOMID', sql.Int, UOMID)
            .input('SLOCID', sql.Int, SLOCID)
            .input('WarehouseID', sql.Int, WarehouseID)
            .input('Quantity', sql.Decimal(10, 2), Quantity);

        const binsResult = await binsRequest.query(binsQuery);
        const bins = binsResult.recordset;
        if (bins.length === 0) {
            throw new CustomError(`No suitable bins found for picklist for Product: ${SalesOrderProduct.ProductName}. Please check the product details and available bins in inventory. Also validate the Batch Number, UOM, and SLOC.`);
        }
        return bins;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in fetchAllAvailableBinsForPicklist: ' + err.message);
    }
}


async function validateBinNumberForPicklist(pool, values) {
    try {
        const requiredFields = ["SalesOrderProductID", "BinNumber"];
        for (const key of requiredFields) {
            if (!values[key]) {
                throw new CustomError(`Missing required field: ${key}`);
            }
        }

        const SalesOrderProduct = await getSalesOrderProduct(pool, values.SalesOrderProductID);
        if (SalesOrderProduct.IsDeleted) {
            throw new CustomError(`Sales Order Product already deleted: ${SalesOrderProduct.SalesOrderNumber}`);
        }
        if (SalesOrderProduct.Pending_Quantity <= 0) {
            throw new CustomError(`No quantity available for picklist: ${SalesOrderProduct.Pending_Quantity}, Product: ${SalesOrderProduct.ProductName}`);
        }

        const SalesOrder = await getSalesOrder(pool, SalesOrderProduct.SalesOrderID);
        if (SalesOrder.IsDeleted) {
            throw new CustomError(`Sales Order already deleted: ${SalesOrder.SalesOrderNumber}`);
        }
        if (SalesOrder.SalesOrderStatus !== 'Open' && SalesOrder.SalesOrderStatus !== 'Picklist Started') {
            throw new CustomError(`Invalid SalesOrderStatus: ${SalesOrder.SalesOrderStatus}. Must be 'Open' or 'Picklist Started'`);
        }

        const ProductID = SalesOrderProduct.ProductID;
        const WarehouseID = SalesOrderProduct.WarehouseID;
        const BatchNumber = SalesOrderProduct.BatchNumber;
        const UOMID = SalesOrderProduct.UOMID;
        const SLOCID = SalesOrderProduct.SLOCID;
        const Quantity = values.Quantity ? Number(values.Quantity) : SalesOrderProduct.Pending_Quantity;

        if (isNaN(Quantity) || Quantity <= 0) {
            throw new CustomError(`Invalid Quantity: ${values.Quantity}`);
        }
        if (Quantity > SalesOrderProduct.Pending_Quantity) {
            throw new CustomError(`Quantity ${Quantity} exceeds Pending Quantity ${SalesOrderProduct.Pending_Quantity}`);
        }

        const bin = await commonService.fetchBinDetails_BinNumber(pool, values.BinNumber, WarehouseID);
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
        const binProductRequest = pool.request()
            .input('BinID', sql.Int, parseInt(bin.BinID))
            .input('ProductID', sql.Int, ProductID)
            .input('BatchNumber', sql.VarChar(100), BatchNumber)
            .input('UOMID', sql.Int, UOMID)
            .input('SLOCID', sql.Int, SLOCID)
            .input('Quantity', sql.Decimal(10, 2), Quantity);
        const binProductResult = await binProductRequest.query(binProductQuery);

        let binProduct = binProductResult.recordset[0];
        if (!binProduct) {
            throw new CustomError(`No suitable bin found for BinNumber: ${values.BinNumber} with sufficient quantity for Product: ${SalesOrderProduct.ProductName}, please check the bin details and available quantity. Also validate the Batch Number, UOM, and SLOC.`);
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
            BinStatus: binProduct.BinStatus
        };
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in validateBinNumberForPicklist: ' + err.message);
    }
}

async function pickProductFromBinForPicklist(pool, values) {
    try {
        const requiredFields = ["SalesOrderProductID", "BinID", "Quantity"];
        for (const key of requiredFields) {
            if (!values[key]) {
                throw new CustomError(`Missing required field: ${key}`);
            }
        }

        const SalesOrderProduct = await getSalesOrderProduct(pool, values.SalesOrderProductID);
        if (SalesOrderProduct.IsDeleted) {
            throw new CustomError(`Sales Order Product already deleted: ${SalesOrderProduct.SalesOrderNumber}`);
        }
        if (SalesOrderProduct.Pending_Quantity <= 0) {
            throw new CustomError(`No quantity available for picklist: ${SalesOrderProduct.Pending_Quantity}, Product: ${SalesOrderProduct.ProductName}`);
        }

        const SalesOrder = await getSalesOrder(pool, SalesOrderProduct.SalesOrderID);
        if (SalesOrder.IsDeleted) {
            throw new CustomError(`Sales Order already deleted: ${SalesOrder.SalesOrderNumber}`);
        }
        if (SalesOrder.SalesOrderStatus !== 'Open' && SalesOrder.SalesOrderStatus !== 'Picklist Started') {
            throw new CustomError(`Invalid SalesOrderStatus: ${SalesOrder.SalesOrderStatus}. Must be 'Open' or 'Picklist Started'`);
        }

        const ProductID = SalesOrderProduct.ProductID;
        const BranchID = SalesOrderProduct.BranchID;
        const WarehouseID = SalesOrderProduct.WarehouseID;
        const BatchNumber = SalesOrderProduct.BatchNumber;
        const UOMID = SalesOrderProduct.UOMID;
        const SLOCID = SalesOrderProduct.SLOCID;

        const Quantity = Number(values.Quantity);
        if (isNaN(Quantity) || Quantity <= 0) {
            throw new CustomError(`Invalid Quantity: ${values.Quantity}`);
        }
        if (Quantity > SalesOrderProduct.Pending_Quantity) {
            throw new CustomError(`Quantity ${Quantity} exceeds Pending Quantity ${SalesOrderProduct.Pending_Quantity}`);
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
        const binProductRequest = pool.request()
            .input('BinID', sql.Int, parseInt(values.BinID))
            .input('ProductID', sql.Int, ProductID)
            .input('BatchNumber', sql.VarChar(100), BatchNumber)
            .input('UOMID', sql.Int, UOMID)
            .input('SLOCID', sql.Int, SLOCID)
            .input('Quantity', sql.Decimal(10, 2), Quantity);
        const binProductResult = await binProductRequest.query(binProductQuery);

        let binProduct = binProductResult.recordset[0];
        if (!binProduct) {
            throw new CustomError(`No suitable bin found with sufficient quantity for Product: ${SalesOrderProduct.ProductName}`);
        }
        if (binProduct.FilledQuantity < Quantity) {
            throw new CustomError(`Insufficient quantity in bin: ${bin.BinNumber} for Product: ${SalesOrderProduct.ProductName}. Available: ${binProduct.FilledQuantity}, Requested: ${Quantity}`);
        }

        const singleQuery = `
            DECLARE @BinProductID INT = ${binProduct.BinProductID};
            DECLARE @PreviousFilledQuantity DECIMAL(10,2) = ${binProduct.FilledQuantity};
            DECLARE @PreviousAvailableQuantity DECIMAL(10,2) = ${binProduct.AvailableQuantity};
            DECLARE @NewFilledQuantity DECIMAL(10,2) = @PreviousFilledQuantity - @Quantity;
            DECLARE @NewAvailableQuantity DECIMAL(10,2) = @PreviousAvailableQuantity + @Quantity;
            DECLARE @NewPickedQuantity DECIMAL(10,2) = ${SalesOrderProduct.Picked_Quantity} + @Quantity;
            DECLARE @NewPendingQuantity DECIMAL(10,2) = ${SalesOrderProduct.Pending_Quantity} - @Quantity;

            -- Step 1: Update BinProducts
            UPDATE BinProducts
            SET 
                FilledQuantity = @NewFilledQuantity,
                AvailableQuantity = @NewAvailableQuantity,
                IsActive = CASE WHEN @NewFilledQuantity = 0 THEN 0 ELSE 1 END,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE BinProductID = @BinProductID;

            -- Step 2: Update SalesOrderProducts
            UPDATE SalesOrderProducts
            SET 
                Picked_Quantity = @NewPickedQuantity,
                Pending_Quantity = @NewPendingQuantity,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE SalesOrderProductID = @SalesOrderProductID;

            -- Step 3: Insert into BinProductLogs
            INSERT INTO BinProductLogs (
                BinID, BinProductID, ProductID, PalletTypeID, StackID, BranchID, WarehouseID,
                ActionType, SalesOrderProductID,
                Quantity, PreviousFilledQuantity, NewFilledQuantity,
                PreviousAvailableQuantity, NewAvailableQuantity, CreatedBy
            )
            VALUES (
                @BinID, @BinProductID, @ProductID, @PalletTypeID, @StackID, @BranchID, @WarehouseID,
                2, @SalesOrderProductID,
                @Quantity, @PreviousFilledQuantity, @NewFilledQuantity,
                @PreviousAvailableQuantity, @NewAvailableQuantity, @CreatedBy
            );

            -- Step 4: Update SalesOrder to Completed if all SalesOrderProducts have Pending_Quantity = 0
            IF NOT EXISTS (
                SELECT 1 
                FROM SalesOrderProducts SOP
                WHERE SOP.SalesOrderID = @SalesOrderID 
                AND ROUND(SOP.Pending_Quantity, 2) > 0 
                AND SOP.IsDeleted = 0
            )
            BEGIN
                UPDATE SalesOrders
                SET 
                    SalesOrderStatus = 'Picklist Completed',
                    UpdatedBy = @UpdatedBy,
                    UpdatedDate = GETDATE()
                WHERE SalesOrderID = @SalesOrderID;
            END

            -- Step 5: Update SalesOrder to Started if any SalesOrderProducts have Pending_Quantity > 0
            IF EXISTS (
                SELECT 1 
                FROM SalesOrderProducts SOP
                WHERE SOP.SalesOrderID = @SalesOrderID 
                AND ROUND(SOP.Pending_Quantity, 2) > 0 
                AND SOP.IsDeleted = 0
            )
            BEGIN
                UPDATE SalesOrders
                SET 
                    SalesOrderStatus = 'Picklist Started',
                    UpdatedBy = @UpdatedBy,
                    UpdatedDate = GETDATE()
                WHERE SalesOrderID = @SalesOrderID;
            END

            -- Step 6: Return the updated BinProduct
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

        const singleRequest = pool.request()
            .input('BinID', sql.Int, parseInt(values.BinID))
            .input('PalletTypeID', sql.Int, PalletTypeID)
            .input('StackID', sql.Int, StackID)
            .input('BranchID', sql.Int, BranchID)
            .input('WarehouseID', sql.Int, WarehouseID)
            .input('ProductID', sql.Int, ProductID)
            .input('BatchNumber', sql.VarChar(100), BatchNumber)
            .input('UOMID', sql.Int, UOMID)
            .input('SLOCID', sql.Int, SLOCID)
            .input('Quantity', sql.Decimal(10, 2), Quantity)
            .input('CreatedBy', sql.Int, parseInt(values.user_id))
            .input('UpdatedBy', sql.Int, parseInt(values.user_id))
            .input('SalesOrderProductID', sql.Int, parseInt(values.SalesOrderProductID))
            .input('SalesOrderID', sql.Int, SalesOrderProduct.SalesOrderID);

        const singleResult = await singleRequest.query(singleQuery);

        if (!singleResult.recordset || singleResult.recordset.length === 0) {
            throw new CustomError('Failed to retrieve updated BinProduct');
        }

        return singleResult.recordset[0];
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in pickProductFromBinForPicklist: ' + err.message);
    }
}


async function getNewSalesOrderShipment(pool, values) {
    try {
        let shipmentOrder = {
            SalesOrderShipmentDate: moment(new Date()).format('YYYY-MM-DD'),
            CreatedBy: values.user_id,
            UpdatedBy: values.user_id
        };
        let query = `
            DECLARE @OutputTable TABLE (
                SalesOrderShipmentID INT
            );
            INSERT INTO SalesOrderShipments (
                SalesOrderShipmentDate, CreatedBy, UpdatedBy
            )
            OUTPUT 
                INSERTED.SalesOrderShipmentID
            INTO @OutputTable
            VALUES (
                @SalesOrderShipmentDate, @CreatedBy, @UpdatedBy
            );
            SELECT * FROM @OutputTable;
        `;
        let request = pool.request()
            .input('SalesOrderShipmentDate', sql.Date, shipmentOrder.SalesOrderShipmentDate)
            .input('CreatedBy', sql.Int, shipmentOrder.CreatedBy)
            .input('UpdatedBy', sql.Int, shipmentOrder.UpdatedBy);
        let result = await request.query(query);
        let insertedRecordId = result.recordset[0].SalesOrderShipmentID;
        let SalesOrderShipment = await getSalesOrderShipment(pool, insertedRecordId);
        return SalesOrderShipment;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in getNewSalesOrderShipment: ' + err.message);
    }
}

async function getSalesOrderShipment(pool, SalesOrderShipmentID) {
    try {
        if (!SalesOrderShipmentID) {
            throw new CustomError('SalesOrderShipmentID is required');
        }
        const input = String(SalesOrderShipmentID).trim();
        const isNumeric = /^\d+$/.test(input);
        let query = `
            SELECT SOS.*,
                SO.SalesOrderNumber,
                SO.SalesOrderDate,
                SO.VehicleNumber,
                SO.LRNumber,
                SO.TransporterName,
                CU.UserName AS CreatedByUserName,
                UU.UserName AS UpdatedByUserName,
                C.CustomerName,
                B.BranchName,
                W.WarehouseName,
                VT.vehicleTypeName,
                VT.VehicleTypeCapacityTonnes,
                (
                    SELECT COALESCE(SUM(SOP.Quantity), 0)
                    FROM SalesOrderProducts SOP
                    WHERE SOP.SalesOrderID = SOS.SalesOrderID AND SOP.IsDeleted = 0
                ) AS total_quantity,
                (
                    SELECT COALESCE(SUM(SOP.MRP), 0)
                    FROM SalesOrderProducts SOP
                    WHERE SOP.SalesOrderID = SO.SalesOrderID AND SOP.IsDeleted = 0
                ) AS total_MRP
            FROM SalesOrderShipments SOS
            LEFT JOIN Users CU ON SOS.CreatedBy = CU.UserID
            LEFT JOIN Users UU ON SOS.UpdatedBy = UU.UserID
            LEFT JOIN SalesOrders SO ON SOS.SalesOrderID = SO.SalesOrderID
            LEFT JOIN Customers C ON SOS.CustomerID = C.CustomerID
            LEFT JOIN Branches B ON SOS.BranchID = B.BranchID
            LEFT JOIN Warehouses W ON SOS.WarehouseID = W.WarehouseID
            LEFT JOIN VehicleTypes VT ON SOS.VehicleTypeID = VT.VehicleTypeID
        `;
        let request = pool.request();
        if (isNumeric) {
            query += ` WHERE SOS.SalesOrderShipmentID = @SalesOrderShipmentID`;
            request.input('SalesOrderShipmentID', sql.Int, parseInt(input));
        } else {
            query += ` WHERE SOS.SalesOrderShipmentNumber = @SalesOrderShipmentNumber`;
            request.input('SalesOrderShipmentNumber', sql.VarChar(20), input);
        }
        let result = await request.query(query);
        if (result.recordset.length === 0) {
            throw new CustomError('No sales order shipment found with the given ID');
        }
        let SalesOrderShipment = result.recordset[0];
        if (SalesOrderShipment.IsDeleted) {
            throw new CustomError('Sales Order Shipment already deleted: ' + SalesOrderShipment?.SalesOrderShipmentNumber);
        }
        return SalesOrderShipment;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in getSalesOrderShipment: ' + err.message);
    }
}

async function getAllSalesOrderShipments(pool, values) {
    try {
        let user_id = values.user_id;
        let query = `
            SELECT SOS.*,
                SO.SalesOrderNumber,
                SO.SalesOrderDate,
                SO.VehicleNumber,
                SO.LRNumber,
                SO.TransporterName,
                CU.UserName AS CreatedByUserName,
                UU.UserName AS UpdatedByUserName,
                C.CustomerName,
                B.BranchName,
                W.WarehouseName,
                VT.vehicleTypeName,
                VT.VehicleTypeCapacityTonnes,
                (
                    SELECT COALESCE(SUM(SOP.Quantity), 0)
                    FROM SalesOrderProducts SOP
                    WHERE SOP.SalesOrderID = SOS.SalesOrderID AND SOP.IsDeleted = 0
                ) AS total_quantity,
                (
                    SELECT COALESCE(SUM(SOP.MRP), 0)
                    FROM SalesOrderProducts SOP
                    WHERE SOP.SalesOrderID = SO.SalesOrderID AND SOP.IsDeleted = 0
                ) AS total_MRP
            FROM SalesOrderShipments SOS
            INNER JOIN SalesOrders SO ON SOS.SalesOrderID = SO.SalesOrderID
            LEFT JOIN Users CU ON SOS.CreatedBy = CU.UserID
            LEFT JOIN Users UU ON SOS.UpdatedBy = UU.UserID
            LEFT JOIN Customers C ON SOS.CustomerID = C.CustomerID
            LEFT JOIN Branches B ON SOS.BranchID = B.BranchID
            LEFT JOIN Warehouses W ON SOS.WarehouseID = W.WarehouseID
            LEFT JOIN VehicleTypes VT ON SOS.VehicleTypeID = VT.VehicleTypeID
            WHERE SOS.CreatedBy = @CreatedBy AND SOS.IsDeleted = 0
        `;
        let request = pool.request();
        request.input('CreatedBy', sql.Int, parseInt(user_id));
        let result = await request.query(query);
        return result.recordset;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in getAllSalesOrderShipments: ' + err.message);
    }
}

async function updateSalesOrderShipment(pool, values) {
    try {
        const requiredFields = [
            "SalesOrderShipmentID",
            "SalesOrderID",
            "CustomerID",
            "BranchID",
            "WarehouseID",
            "VehicleTypeID"
        ];

        for (const key of requiredFields) {
            if (!values[key]) {
                throw new CustomError(`Missing required field: ${key}`);
            }
        }

        if (isNaN(values.SalesOrderShipmentID)) {
            throw new CustomError(`Invalid SalesOrderShipmentID: ${values.SalesOrderShipmentID}`);
        }

        const salesOrderShipment = await getSalesOrderShipment(pool, values.SalesOrderShipmentID);
        if (salesOrderShipment.IsDeleted) {
            throw new CustomError('Sales Order Shipment already deleted: ' + salesOrderShipment?.SalesOrderShipmentNumber);
        }

        if (isNaN(values.SalesOrderID)) {
            throw new CustomError(`Invalid SalesOrderID: ${values.SalesOrderID}`);
        }
        const salesOrder = await getSalesOrder(pool, values.SalesOrderID);
        if (salesOrder.SalesOrderStatus !== 'Picklist Completed') {
            throw new CustomError(`Cannot update Sales Order Shipment with Sales Order status: ${salesOrder.SalesOrderStatus}. Must be 'Picklist Completed'`);
        }
        if (salesOrder.IsShipment != 0) {
            throw new CustomError(`Sales Order already has a shipment: IsShipment = ${salesOrder.IsShipment}`);
        }

        const query = `
            UPDATE SalesOrderShipments
            SET 
                SalesOrderID = @SalesOrderID,
                CustomerID = @CustomerID,
                BranchID = @BranchID,
                WarehouseID = @WarehouseID,
                VehicleTypeID = @VehicleTypeID,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE SalesOrderShipmentID = @SalesOrderShipmentID;

            UPDATE SalesOrders
            SET 
                IsShipment = 1,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = GETDATE()
            WHERE SalesOrderID = @SalesOrderID;
        `;

        const request = pool.request()
            .input('SalesOrderShipmentID', sql.Int, parseInt(values.SalesOrderShipmentID))
            .input('SalesOrderID', sql.Int, parseInt(values.SalesOrderID))
            .input('CustomerID', sql.Int, parseInt(values.CustomerID))
            .input('BranchID', sql.Int, parseInt(values.BranchID))
            .input('WarehouseID', sql.Int, parseInt(values.WarehouseID))
            .input('VehicleTypeID', sql.Int, parseInt(values.VehicleTypeID))
            .input('UpdatedBy', sql.Int, parseInt(values.user_id));

        const result = await request.query(query);

        if (result.rowsAffected[0] === 0) {
            throw new CustomError('No Sales Order Shipment found with provided SalesOrderShipmentID');
        }

        const updatedSalesOrderShipment = await getSalesOrderShipment(pool, values.SalesOrderShipmentID);
        return updatedSalesOrderShipment;
    } catch (err) {
        if (err instanceof CustomError) {
            throw err;
        }
        throw new CustomError('Catch Exception in updateSalesOrderShipment: ' + err.message);
    }
}

module.exports.getNewSalesOrder = getNewSalesOrder;
module.exports.getSalesOrder = getSalesOrder;
module.exports.getAllSalesOrders = getAllSalesOrders;
module.exports.updateSalesOrder = updateSalesOrder;
module.exports.deleteSalesOrder = deleteSalesOrder;
module.exports.getAllAvailableBinProducts = getAllAvailableBinProducts;
module.exports.getAllBinProductsBatchNumbers = getAllBinProductsBatchNumbers;
module.exports.addNewProductForSalesOrder = addNewProductForSalesOrder;
module.exports.getSalesOrderProduct = getSalesOrderProduct;
module.exports.getSalesOrderAllProducts = getSalesOrderAllProducts;
module.exports.updateSalesOrderProduct = updateSalesOrderProduct;
module.exports.deleteSalesOrderProduct = deleteSalesOrderProduct;
module.exports.getAllPickListOrders = getAllPickListOrders;
module.exports.getSalesOrderAllPendingProductsForPicklist = getSalesOrderAllPendingProductsForPicklist;
module.exports.getAllPicklistOrderPickedProducts = getAllPicklistOrderPickedProducts;
module.exports.suggestBinForPicklist = suggestBinForPicklist;
module.exports.fetchAllAvailableBinsForPicklist = fetchAllAvailableBinsForPicklist;
module.exports.validateBinNumberForPicklist = validateBinNumberForPicklist;
module.exports.pickProductFromBinForPicklist = pickProductFromBinForPicklist;
module.exports.getNewSalesOrderShipment = getNewSalesOrderShipment;
module.exports.getSalesOrderShipment = getSalesOrderShipment;
module.exports.getAllSalesOrderShipments = getAllSalesOrderShipments;
module.exports.updateSalesOrderShipment = updateSalesOrderShipment;