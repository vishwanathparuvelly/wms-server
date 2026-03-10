-- ===================================================
-- ADD 3 NEW PHARMACEUTICAL PRODUCTS WITH BOM
-- ===================================================
-- This script adds:
-- 1. Three new products (Aspirin, Azithromycin, Cetirizine)
-- 2. Materials (raw materials)
-- 3. Bill of Materials (BOM) for each product
-- 4. Material stock via Purchase Order
-- ===================================================

-- Step 1: Add Materials (Raw Materials)
-- ===================================================
PRINT '>>> Adding Raw Materials...'

SET IDENTITY_INSERT Materials ON;

INSERT INTO Materials (MaterialID, MaterialCode, MaterialName, MaterialDescription, CategoryID, UOMID, IsActive, IsDeleted, CreatedBy, UpdatedBy, CreatedDate, UpdatedDate)
VALUES 
-- Materials for Aspirin Tablet
(1, 'MAT-001', 'Aspirin Powder', 'Acetylsalicylic acid API', 1, 4, 1, 0, 1, 1, GETDATE(), GETDATE()),
(2, 'MAT-002', 'Microcrystalline Cellulose', 'Filler/Binder for tablets', 1, 4, 1, 0, 1, 1, GETDATE(), GETDATE()),
(3, 'MAT-003', 'Starch', 'Disintegrant', 1, 4, 1, 0, 1, 1, GETDATE(), GETDATE()),
(4, 'MAT-004', 'Magnesium Stearate', 'Lubricant', 1, 4, 1, 0, 1, 1, GETDATE(), GETDATE()),
(5, 'MAT-005', 'PVC Blister Pack', 'Packaging material', 1, 1, 1, 0, 1, 1, GETDATE(), GETDATE()),

-- Materials for Azithromycin Capsule
(6, 'MAT-006', 'Azithromycin API', 'Active pharmaceutical ingredient', 1, 4, 1, 0, 1, 1, GETDATE(), GETDATE()),
(7, 'MAT-007', 'Empty Gelatin Capsules', 'Size 0 capsules', 1, 1, 1, 0, 1, 1, GETDATE(), GETDATE()),
(8, 'MAT-008', 'Lactose', 'Filler', 1, 4, 1, 0, 1, 1, GETDATE(), GETDATE()),

-- Materials for Cetirizine Tablet
(9, 'MAT-009', 'Cetirizine HCL', 'Active pharmaceutical ingredient', 1, 4, 1, 0, 1, 1, GETDATE(), GETDATE()),
(10, 'MAT-010', 'Corn Starch', 'Binder/Disintegrant', 1, 4, 1, 0, 1, 1, GETDATE(), GETDATE()),
(11, 'MAT-011', 'Povidone', 'Binder', 1, 4, 1, 0, 1, 1, GETDATE(), GETDATE()),
(12, 'MAT-012', 'Film Coating', 'Tablet coating', 1, 4, 1, 0, 1, 1, GETDATE(), GETDATE());

SET IDENTITY_INSERT Materials OFF;

PRINT '>>> Materials added successfully!'

-- Step 2: Add Products
-- ===================================================
PRINT '>>> Adding Products...'

-- First, let's check the next available ProductID
-- Assuming ProductID 1 and 2 might already exist

SET IDENTITY_INSERT Products ON;

INSERT INTO Products (
    ProductID, ProductCode, ProductName, BrandID, ProductTypeID, UOMID,
    NetWeight, GrossWeight, ShelfLifeDays, NearExpiryDays,
    Length, Breadth, Height, MinimumQty, ReorderLevelQty,
    Category, HSNCode, IsHazmat, IsActive, IsDeleted, CreatedBy, UpdatedBy
)
VALUES 
-- Product 1: Aspirin 75mg Tablet
(3, 'PROD-003', 'Aspirin 75mg Tablet', 1, 1, 2,
 5.00, 6.50, 1095, 180,
 10.00, 5.00, 1.00, 200, 1000,
 'Analgesic', '30049099', 0, 1, 0, 1, 1),

-- Product 2: Azithromycin 500mg Capsule
(4, 'PROD-004', 'Azithromycin 500mg Capsule', 4, 2, 2,
 10.00, 12.00, 730, 90,
 12.00, 6.00, 1.50, 100, 500,
 'Antibiotic', '30042000', 0, 1, 0, 1, 1),

-- Product 3: Cetirizine 10mg Tablet
(5, 'PROD-005', 'Cetirizine 10mg Tablet', 2, 1, 2,
 4.50, 5.50, 1095, 180,
 10.00, 5.00, 1.00, 150, 750,
 'Antihistamine', '30049099', 0, 1, 0, 1, 1);

SET IDENTITY_INSERT Products OFF;

PRINT '>>> Products added successfully!'

-- Step 3: Add Bill of Materials (BOM)
-- ===================================================
PRINT '>>> Adding Bill of Materials (BOM)...'

INSERT INTO ProductMaterials (ProductID, MaterialID, Quantity, UOMID, IsActive, IsDeleted, CreatedBy, UpdatedBy)
VALUES 
-- BOM for Product 3: Aspirin 75mg Tablet (per strip of 10 tablets)
(3, 1, 750.00, 4, 1, 0, 1, 1),  -- 750mg Aspirin Powder per strip
(3, 2, 500.00, 4, 1, 0, 1, 1),  -- 500mg Microcrystalline Cellulose
(3, 3, 200.00, 4, 1, 0, 1, 1),  -- 200mg Starch
(3, 4, 50.00, 4, 1, 0, 1, 1),   -- 50mg Magnesium Stearate
(3, 5, 1.00, 1, 1, 0, 1, 1),    -- 1 PVC Blister Pack

-- BOM for Product 4: Azithromycin 500mg Capsule (per strip of 6 capsules)
(4, 6, 3000.00, 4, 1, 0, 1, 1), -- 3000mg (3g) Azithromycin API per strip
(4, 7, 6.00, 1, 1, 0, 1, 1),    -- 6 Empty Capsules
(4, 8, 600.00, 4, 1, 0, 1, 1),  -- 600mg Lactose filler
(4, 5, 1.00, 1, 1, 0, 1, 1),    -- 1 PVC Blister Pack

-- BOM for Product 5: Cetirizine 10mg Tablet (per strip of 10 tablets)
(5, 9, 100.00, 4, 1, 0, 1, 1),  -- 100mg Cetirizine HCL per strip
(5, 10, 400.00, 4, 1, 0, 1, 1), -- 400mg Corn Starch
(5, 11, 200.00, 4, 1, 0, 1, 1), -- 200mg Povidone
(5, 12, 100.00, 4, 1, 0, 1, 1), -- 100mg Film Coating
(5, 5, 1.00, 1, 1, 0, 1, 1);    -- 1 PVC Blister Pack

PRINT '>>> BOM added successfully!'

-- Step 4: Add Material Stock via Purchase Order
-- ===================================================
PRINT '>>> Adding Material Stock...'

-- First, create a Purchase Order if needed
-- Check if PO exists, if not create one
DECLARE @POID INT;

-- Get or create Purchase Order
IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PurchaseOrderID = 1)
BEGIN
    SET IDENTITY_INSERT PurchaseOrders ON;
    
    INSERT INTO PurchaseOrders (
        PurchaseOrderID, PurchaseOrderNumber, VendorID, WarehouseID, BranchID,
        DeliveryDate, TransporterName, VehicleNumber, LRNumber, Remarks,
        PurchaseOrderStatus, IsActive, IsDeleted, CreatedBy, UpdatedBy
    )
    VALUES (
        1, 'PO-2026-001', 1, 1, 1,
        DATEADD(DAY, 7, GETDATE()), 'DHL Express', 'TRUCK-001', 'LR-2026-001', 'Material Stock for Production',
        'APPROVED', 1, 0, 1, 1
    );
    
    SET IDENTITY_INSERT PurchaseOrders OFF;
    SET @POID = 1;
    PRINT '>>> Purchase Order created!'
END
ELSE
BEGIN
    SET @POID = 1;
    PRINT '>>> Using existing Purchase Order!'
END

-- Add Material Receipts (Stock) to PurchaseOrderProducts
INSERT INTO PurchaseOrderProducts (
    PurchaseOrderID, MaterialID, Quantity, Received_Quantity, 
    MRP, UOMID, WarehouseID, IsDeleted, CreatedBy, UpdatedBy
)
VALUES 
-- Stock for Aspirin production
(@POID, 1, 50000, 50000, 100.00, 4, 1, 0, 1, 1),  -- 50kg Aspirin Powder
(@POID, 2, 30000, 30000, 50.00, 4, 1, 0, 1, 1),   -- 30kg Microcrystalline Cellulose
(@POID, 3, 20000, 20000, 30.00, 4, 1, 0, 1, 1),   -- 20kg Starch
(@POID, 4, 5000, 5000, 80.00, 4, 1, 0, 1, 1),     -- 5kg Magnesium Stearate
(@POID, 5, 10000, 10000, 2.00, 1, 1, 0, 1, 1),    -- 10000 PVC Blister Packs

-- Stock for Azithromycin production
(@POID, 6, 15000, 15000, 500.00, 4, 1, 0, 1, 1),  -- 15kg Azithromycin API
(@POID, 7, 8000, 8000, 0.50, 1, 1, 0, 1, 1),      -- 8000 Empty Capsules
(@POID, 8, 10000, 10000, 20.00, 4, 1, 0, 1, 1),   -- 10kg Lactose

-- Stock for Cetirizine production
(@POID, 9, 5000, 5000, 300.00, 4, 1, 0, 1, 1),    -- 5kg Cetirizine HCL
(@POID, 10, 15000, 15000, 25.00, 4, 1, 0, 1, 1),  -- 15kg Corn Starch
(@POID, 11, 8000, 8000, 45.00, 4, 1, 0, 1, 1),    -- 8kg Povidone
(@POID, 12, 5000, 5000, 35.00, 4, 1, 0, 1, 1);    -- 5kg Film Coating

PRINT '>>> Material Stock added successfully!'

-- ===================================================
-- Step 5: Verification
-- ===================================================
PRINT ''
PRINT '>>> VERIFICATION'
PRINT '===================================================='

-- Check Products
PRINT '>>> Products Added:'
SELECT ProductID, ProductCode, ProductName, Category
FROM Products 
WHERE ProductID IN (3, 4, 5)
ORDER BY ProductID;

-- Check Materials
PRINT ''
PRINT '>>> Materials Added:'
SELECT MaterialID, MaterialCode, MaterialName
FROM Materials 
WHERE MaterialID BETWEEN 1 AND 12
ORDER BY MaterialID;

-- Check BOM
PRINT ''
PRINT '>>> Bill of Materials (BOM):'
SELECT 
    P.ProductCode,
    P.ProductName,
    M.MaterialCode,
    M.MaterialName,
    PM.Quantity,
    U.UOMCode
FROM ProductMaterials PM
INNER JOIN Products P ON PM.ProductID = P.ProductID
INNER JOIN Materials M ON PM.MaterialID = M.MaterialID
LEFT JOIN UOMs U ON PM.UOMID = U.UOMID
WHERE PM.ProductID IN (3, 4, 5)
ORDER BY P.ProductID, M.MaterialID;

-- Check Material Stock
PRINT ''
PRINT '>>> Material Stock Available:'
SELECT 
    M.MaterialCode,
    M.MaterialName,
    SUM(POP.Received_Quantity) AS TotalStock,
    U.UOMCode
FROM PurchaseOrderProducts POP
INNER JOIN Materials M ON POP.MaterialID = M.MaterialID
LEFT JOIN UOMs U ON POP.UOMID = U.UOMID
WHERE POP.MaterialID IS NOT NULL AND POP.IsDeleted = 0
GROUP BY M.MaterialCode, M.MaterialName, U.UOMCode
ORDER BY M.MaterialCode;

-- Calculate Possible Production Quantity
PRINT ''
PRINT '>>> Production Capacity (based on available stock):'
SELECT 
    P.ProductCode,
    P.ProductName,
    M.MaterialName,
    PM.Quantity AS RequiredPerUnit,
    ISNULL(Stock.TotalStock, 0) AS AvailableStock,
    CASE 
        WHEN PM.Quantity > 0 THEN FLOOR(ISNULL(Stock.TotalStock, 0) / PM.Quantity)
        ELSE 0 
    END AS CanProduceUnits
FROM Products P
INNER JOIN ProductMaterials PM ON P.ProductID = PM.ProductID
INNER JOIN Materials M ON PM.MaterialID = M.MaterialID
LEFT JOIN (
    SELECT MaterialID, SUM(Received_Quantity) AS TotalStock
    FROM PurchaseOrderProducts
    WHERE MaterialID IS NOT NULL AND IsDeleted = 0 AND WarehouseID = 1
    GROUP BY MaterialID
) Stock ON M.MaterialID = Stock.MaterialID
WHERE P.ProductID IN (3, 4, 5)
ORDER BY P.ProductID, M.MaterialID;

PRINT ''
PRINT '===================================================='
PRINT '>>> SETUP COMPLETE!'
PRINT '>>> You can now:'
PRINT '>>> 1. Create Sales Orders with these products'
PRINT '>>> 2. Use Check Inventory to see material requirements'
PRINT '>>> 3. View color-coded availability (Green/Red)'
PRINT '===================================================='
