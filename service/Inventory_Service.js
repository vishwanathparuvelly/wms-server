const sql = require('mssql');
const { CustomError } = require("../model/CustomError");

/**
 * ============================================================================
 * INVENTORY SERVICE
 * ============================================================================
 * Purpose: Comprehensive inventory management for materials and products
 * Features:
 *   - Material stock tracking (location, quantity, value)
 *   - Product stock tracking (batch, expiry, location)
 *   - Near expiry alerts
 *   - Low stock alerts
 *   - Stock statistics
 * ============================================================================
 */

/**
 * Get Material Inventory with Location and Stock Status
 * @param {Object} pool - Database connection pool
 * @param {Object} filters - { WarehouseID?, SearchTerm? }
 * @returns {Array} - Material inventory with locations
 */
async function getMaterialInventory(pool, filters = {}) {
    try {
        const { WarehouseID, SearchTerm } = filters;

        const query = `
            SELECT 
                M.MaterialID,
                M.MaterialCode,
                M.MaterialName,
                M.MaterialDescription,
                U.UOMCode,
                U.UOMName,
                V.VendorName,
                V.VendorCode,
                
                -- Total stock across all locations
                ISNULL(Stock.TotalQuantity, 0) AS TotalQuantity,
                ISNULL(Stock.TotalValue, 0) AS TotalValue,
                
                -- Location breakdown (concatenated)
                STUFF((
                    SELECT DISTINCT ', ' + W.WarehouseName + ':' + CAST(POP.Received_Quantity AS VARCHAR(20))
                    FROM PurchaseOrderProducts POP
                    INNER JOIN Warehouses W ON POP.WarehouseID = W.WarehouseID
                    WHERE POP.MaterialID = M.MaterialID 
                    AND POP.IsDeleted = 0
                    AND POP.Received_Quantity > 0
                    ${WarehouseID ? 'AND POP.WarehouseID = @WarehouseID' : ''}
                    FOR XML PATH('')
                ), 1, 2, '') AS Locations,
                
                -- Last received date
                (
                    SELECT TOP 1 POP.CreatedDate
                    FROM PurchaseOrderProducts POP
                    WHERE POP.MaterialID = M.MaterialID AND POP.IsDeleted = 0
                    ORDER BY POP.CreatedDate DESC
                ) AS LastReceivedDate,
                
                -- Stock status (based on hypothetical reorder level)
                CASE 
                    WHEN ISNULL(Stock.TotalQuantity, 0) = 0 THEN 'Out of Stock'
                    WHEN ISNULL(Stock.TotalQuantity, 0) < 1000 THEN 'Critical'
                    WHEN ISNULL(Stock.TotalQuantity, 0) < 5000 THEN 'Low'
                    ELSE 'Sufficient'
                END AS StockStatus,
                
                M.IsActive,
                M.CreatedDate,
                M.UpdatedDate
                
            FROM Materials M
            LEFT JOIN UOMs U ON M.UOMID = U.UOMID
            LEFT JOIN Vendors V ON M.VendorID = V.VendorID
            LEFT JOIN (
                SELECT 
                    MaterialID,
                    SUM(Received_Quantity) AS TotalQuantity,
                    SUM(Received_Quantity * MRP) AS TotalValue
                FROM PurchaseOrderProducts
                WHERE MaterialID IS NOT NULL 
                AND IsDeleted = 0
                ${WarehouseID ? 'AND WarehouseID = @WarehouseID' : ''}
                GROUP BY MaterialID
            ) Stock ON M.MaterialID = Stock.MaterialID
            
            WHERE M.IsDeleted = 0 AND M.IsActive = 1
            ${SearchTerm ? 'AND (M.MaterialCode LIKE @SearchTerm OR M.MaterialName LIKE @SearchTerm)' : ''}
            
            ORDER BY 
                CASE 
                    WHEN ISNULL(Stock.TotalQuantity, 0) = 0 THEN 1
                    WHEN ISNULL(Stock.TotalQuantity, 0) < 1000 THEN 2
                    WHEN ISNULL(Stock.TotalQuantity, 0) < 5000 THEN 3
                    ELSE 4
                END,
                M.MaterialName;
        `;

        const request = pool.request();
        
        if (WarehouseID) {
            request.input('WarehouseID', sql.Int, parseInt(WarehouseID));
        }
        
        if (SearchTerm) {
            request.input('SearchTerm', sql.NVarChar, `%${SearchTerm}%`);
        }

        const result = await request.query(query);
        return result.recordset;
    } catch (err) {
        throw new CustomError('Error fetching material inventory: ' + err.message);
    }
}

/**
 * Get Product Inventory with Batch, Expiry, and Location
 * @param {Object} pool - Database connection pool
 * @param {Object} filters - { WarehouseID?, SearchTerm?, ShowNearExpiry? }
 * @returns {Array} - Product inventory with batch and expiry details
 */
async function getProductInventory(pool, filters = {}) {
    try {
        const { WarehouseID, SearchTerm, ShowNearExpiry } = filters;

        const query = `
            SELECT 
                P.ProductID,
                P.ProductCode,
                P.ProductName,
                P.Category,
                B.BrandName,
                PT.ProductTypeName,
                U.UOMCode,
                U.UOMName,
                
                -- Bin product details (batch, expiry, location)
                BP.BinProductID,
                BP.BatchNumber,
                BP.ManufactureDate,
                BP.ExpiryDate,
                BP.AvailableQuantity,
                BP.ReservedQuantity,
                BP.MRP,
                (BP.AvailableQuantity * BP.MRP) AS TotalValue,
                
                -- Location details
                W.WarehouseName,
                W.WarehouseCode,
                Bin.BinNumber,
                Z.ZoneName,
                ST.StorageTypeName,
                
                -- Expiry status
                DATEDIFF(DAY, GETDATE(), BP.ExpiryDate) AS DaysToExpiry,
                CASE 
                    WHEN BP.ExpiryDate IS NULL THEN 'No Expiry'
                    WHEN DATEDIFF(DAY, GETDATE(), BP.ExpiryDate) < 0 THEN 'Expired'
                    WHEN DATEDIFF(DAY, GETDATE(), BP.ExpiryDate) <= 30 THEN 'Critical'
                    WHEN DATEDIFF(DAY, GETDATE(), BP.ExpiryDate) <= 90 THEN 'Near Expiry'
                    ELSE 'Good'
                END AS ExpiryStatus,
                
                -- Stock status
                CASE 
                    WHEN BP.AvailableQuantity = 0 THEN 'Out of Stock'
                    WHEN BP.AvailableQuantity < P.MinimumQty THEN 'Low Stock'
                    ELSE 'In Stock'
                END AS StockStatus,
                
                BP.CreatedDate,
                BP.UpdatedDate
                
            FROM Products P
            LEFT JOIN Brands B ON P.BrandID = B.BrandID
            LEFT JOIN ProductTypes PT ON P.ProductTypeID = PT.ProductTypeID
            LEFT JOIN UOMs U ON P.UOMID = U.UOMID
            LEFT JOIN BinProducts BP ON P.ProductID = BP.ProductID AND BP.IsDeleted = 0
            LEFT JOIN Bins Bin ON BP.BinID = Bin.BinID
            LEFT JOIN Zones Z ON Bin.ZoneID = Z.ZoneID
            LEFT JOIN Warehouses W ON Bin.WarehouseID = W.WarehouseID
            LEFT JOIN StorageTypes ST ON Bin.StorageTypeID = ST.StorageTypeID
            
            WHERE P.IsDeleted = 0 AND P.IsActive = 1
            ${WarehouseID ? 'AND W.WarehouseID = @WarehouseID' : ''}
            ${SearchTerm ? 'AND (P.ProductCode LIKE @SearchTerm OR P.ProductName LIKE @SearchTerm)' : ''}
            ${ShowNearExpiry === 'true' ? 'AND DATEDIFF(DAY, GETDATE(), BP.ExpiryDate) <= 90 AND DATEDIFF(DAY, GETDATE(), BP.ExpiryDate) >= 0' : ''}
            
            ORDER BY 
                CASE 
                    WHEN BP.ExpiryDate IS NOT NULL AND DATEDIFF(DAY, GETDATE(), BP.ExpiryDate) < 0 THEN 1
                    WHEN BP.ExpiryDate IS NOT NULL AND DATEDIFF(DAY, GETDATE(), BP.ExpiryDate) <= 30 THEN 2
                    WHEN BP.ExpiryDate IS NOT NULL AND DATEDIFF(DAY, GETDATE(), BP.ExpiryDate) <= 90 THEN 3
                    ELSE 4
                END,
                BP.ExpiryDate ASC,
                P.ProductName;
        `;

        const request = pool.request();
        
        if (WarehouseID) {
            request.input('WarehouseID', sql.Int, parseInt(WarehouseID));
        }
        
        if (SearchTerm) {
            request.input('SearchTerm', sql.NVarChar, `%${SearchTerm}%`);
        }

        const result = await request.query(query);
        return result.recordset;
    } catch (err) {
        throw new CustomError('Error fetching product inventory: ' + err.message);
    }
}

/**
 * Get Inventory Statistics
 * @param {Object} pool - Database connection pool
 * @param {Object} filters - { WarehouseID? }
 * @returns {Object} - Inventory statistics
 */
async function getInventoryStats(pool, filters = {}) {
    try {
        const { WarehouseID } = filters;

        const query = `
            -- Material Stats
            SELECT 
                'Materials' AS Category,
                COUNT(DISTINCT M.MaterialID) AS TotalItems,
                SUM(ISNULL(POP.Received_Quantity, 0)) AS TotalQuantity,
                SUM(ISNULL(POP.Received_Quantity * POP.MRP, 0)) AS TotalValue,
                COUNT(CASE WHEN ISNULL(Stock.TotalQty, 0) < 1000 THEN 1 END) AS LowStockCount,
                0 AS NearExpiryCount,
                0 AS ExpiredCount
            FROM Materials M
            LEFT JOIN PurchaseOrderProducts POP ON M.MaterialID = POP.MaterialID AND POP.IsDeleted = 0
                ${WarehouseID ? 'AND POP.WarehouseID = @WarehouseID' : ''}
            LEFT JOIN (
                SELECT MaterialID, SUM(Received_Quantity) AS TotalQty
                FROM PurchaseOrderProducts
                WHERE MaterialID IS NOT NULL AND IsDeleted = 0
                ${WarehouseID ? 'AND WarehouseID = @WarehouseID' : ''}
                GROUP BY MaterialID
            ) Stock ON M.MaterialID = Stock.MaterialID
            WHERE M.IsDeleted = 0 AND M.IsActive = 1
            
            UNION ALL
            
            -- Product Stats
            SELECT 
                'Products' AS Category,
                COUNT(DISTINCT P.ProductID) AS TotalItems,
                SUM(ISNULL(BP.AvailableQuantity, 0)) AS TotalQuantity,
                SUM(ISNULL(BP.AvailableQuantity * BP.MRP, 0)) AS TotalValue,
                COUNT(CASE WHEN BP.AvailableQuantity > 0 AND BP.AvailableQuantity < P.MinimumQty THEN 1 END) AS LowStockCount,
                COUNT(CASE WHEN DATEDIFF(DAY, GETDATE(), BP.ExpiryDate) BETWEEN 0 AND 90 THEN 1 END) AS NearExpiryCount,
                COUNT(CASE WHEN DATEDIFF(DAY, GETDATE(), BP.ExpiryDate) < 0 THEN 1 END) AS ExpiredCount
            FROM Products P
            LEFT JOIN BinProducts BP ON P.ProductID = BP.ProductID AND BP.IsDeleted = 0
            LEFT JOIN Bins Bin ON BP.BinID = Bin.BinID
            ${WarehouseID ? 'AND Bin.WarehouseID = @WarehouseID' : ''}
            WHERE P.IsDeleted = 0 AND P.IsActive = 1;
        `;

        const request = pool.request();
        
        if (WarehouseID) {
            request.input('WarehouseID', sql.Int, parseInt(WarehouseID));
        }

        const result = await request.query(query);
        
        // Transform to object format
        const stats = {
            materials: result.recordset[0] || {},
            products: result.recordset[1] || {},
            summary: {
                totalValue: (result.recordset[0]?.TotalValue || 0) + (result.recordset[1]?.TotalValue || 0),
                totalLowStock: (result.recordset[0]?.LowStockCount || 0) + (result.recordset[1]?.LowStockCount || 0),
                totalNearExpiry: result.recordset[1]?.NearExpiryCount || 0,
                totalExpired: result.recordset[1]?.ExpiredCount || 0
            }
        };
        
        return stats;
    } catch (err) {
        throw new CustomError('Error fetching inventory stats: ' + err.message);
    }
}

module.exports = {
    getMaterialInventory,
    getProductInventory,
    getInventoryStats
};
