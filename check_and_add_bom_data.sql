-- ===================================================
-- Check and Add Bill of Materials (BOM) Data
-- ===================================================

-- 1. Check if ProductMaterials table has data for ProductID = 2
SELECT * FROM ProductMaterials WHERE ProductID = 2 AND IsDeleted = 0;

-- 2. Check all available Materials
SELECT MaterialID, MaterialCode, MaterialName FROM Materials WHERE IsActive = 1 AND IsDeleted = 0;

-- 3. Check all available Products
SELECT ProductID, ProductCode, ProductName FROM Products WHERE IsActive = 1 AND IsDeleted = 0;

-- 4. Check UOMs
SELECT UOMID, UOMCode, UOMName FROM UOMs WHERE IsActive = 1 AND IsDeleted = 0;

-- ===================================================
-- SAMPLE: Add BOM for Product ID = 2 (Amoxicillin 250mg Capsule)
-- ===================================================
-- Example: To make 1 strip of Amoxicillin capsules, you need:
-- - 250 grams of Amoxicillin powder
-- - 10 capsules (empty)
-- - 1 blister pack

-- STEP 1: Make sure you have Materials in the Materials table
-- Run this to add sample materials if they don't exist:
/*
INSERT INTO Materials (MaterialCode, MaterialName, MaterialDescription, CategoryID, UOMID, IsActive, IsDeleted, CreatedBy, UpdatedBy)
VALUES 
('MAT-001', 'Amoxicillin Powder', 'Active pharmaceutical ingredient', 1, 4, 1, 0, 1, 1),
('MAT-002', 'Empty Capsules', 'Gelatin capsules', 1, 1, 1, 0, 1, 1),
('MAT-003', 'Blister Pack', 'Plastic blister packaging', 1, 1, 1, 0, 1, 1);
*/

-- STEP 2: Add BOM (Bill of Materials) for Product
-- Replace MaterialIDs with actual IDs from your Materials table
/*
INSERT INTO ProductMaterials (ProductID, MaterialID, Quantity, UOMID, IsActive, IsDeleted, CreatedBy, UpdatedBy)
VALUES 
-- For Product 2 (Amoxicillin), you need:
(2, 1, 250.00, 4, 1, 0, 1, 1),  -- 250 gm of Amoxicillin Powder per strip
(2, 2, 10.00, 1, 1, 0, 1, 1),   -- 10 empty capsules per strip
(2, 3, 1.00, 1, 1, 0, 1, 1);    -- 1 blister pack per strip
*/

-- ===================================================
-- STEP 3: Add Material Stock (Receive materials via Purchase Order)
-- ===================================================
-- You need to receive materials through PurchaseOrderProducts
-- Check if you have any purchase orders:
SELECT * FROM PurchaseOrders WHERE IsDeleted = 0 ORDER BY PurchaseOrderID DESC;

-- Check materials received in purchase orders:
SELECT 
    POP.PurchaseOrderProductID,
    POP.PurchaseOrderID,
    POP.MaterialID,
    M.MaterialName,
    POP.Received_Quantity,
    POP.WarehouseID,
    W.WarehouseName
FROM PurchaseOrderProducts POP
LEFT JOIN Materials M ON POP.MaterialID = M.MaterialID
LEFT JOIN Warehouses W ON POP.WarehouseID = W.WarehouseID
WHERE POP.MaterialID IS NOT NULL 
AND POP.IsDeleted = 0
ORDER BY POP.PurchaseOrderProductID DESC;

-- ===================================================
-- SAMPLE: Receive Materials via Purchase Order
-- ===================================================
-- If you have a Purchase Order, update the products to include materials:
/*
-- Example: Receive materials for Warehouse ID = 1
UPDATE PurchaseOrderProducts 
SET 
    MaterialID = 1,  -- Amoxicillin Powder
    Received_Quantity = 10000.00,  -- 10 kg received
    UOMID = 4  -- Gram
WHERE PurchaseOrderProductID = [YOUR_PO_PRODUCT_ID]
AND WarehouseID = 1;
*/

-- ===================================================
-- VERIFY THE COMPLETE DATA
-- ===================================================
-- Run this query to see if Material Requirements will work:
SELECT 
    P.ProductID,
    P.ProductName,
    M.MaterialID,
    M.MaterialName,
    PM.Quantity AS MaterialPerUnit,
    U.UOMName,
    ISNULL(Stock.TotalStock, 0) AS AvailableStock
FROM Products P
INNER JOIN ProductMaterials PM ON P.ProductID = PM.ProductID AND PM.IsActive = 1 AND PM.IsDeleted = 0
INNER JOIN Materials M ON PM.MaterialID = M.MaterialID AND M.IsActive = 1 AND M.IsDeleted = 0
LEFT JOIN UOMs U ON PM.UOMID = U.UOMID
LEFT JOIN (
    SELECT MaterialID, SUM(Received_Quantity) AS TotalStock
    FROM PurchaseOrderProducts
    WHERE MaterialID IS NOT NULL AND IsDeleted = 0 AND WarehouseID = 1
    GROUP BY MaterialID
) Stock ON M.MaterialID = Stock.MaterialID
WHERE P.ProductID = 2;
