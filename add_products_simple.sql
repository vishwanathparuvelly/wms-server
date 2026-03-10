-- ===================================================
-- SIMPLE VERSION - Add Products, Materials & BOM
-- (Uses AUTO-INCREMENT, no IDENTITY_INSERT needed)
-- ===================================================

-- Step 1: Check what exists in your database
-- ===================================================
PRINT '>>> Checking existing data...'
SELECT 'Brands' AS TableName, COUNT(*) AS RecordCount FROM Brands WHERE IsDeleted = 0
UNION ALL
SELECT 'ProductTypes', COUNT(*) FROM ProductTypes WHERE IsDeleted = 0
UNION ALL
SELECT 'UOMs', COUNT(*) FROM UOMs WHERE IsDeleted = 0
UNION ALL
SELECT 'Products', COUNT(*) FROM Products WHERE IsDeleted = 0
UNION ALL
SELECT 'Materials', COUNT(*) FROM Materials WHERE IsDeleted = 0;

-- Check existing Brand IDs
SELECT BrandID, BrandCode, BrandName FROM Brands WHERE IsDeleted = 0;

-- Check existing ProductType IDs
SELECT ProductTypeID, ProductTypeName FROM ProductTypes WHERE IsDeleted = 0;

-- Check existing UOM IDs
SELECT UOMID, UOMCode, UOMName FROM UOMs WHERE IsDeleted = 0;

-- ===================================================
-- Step 2: Add Materials (Raw Materials)
-- ===================================================
PRINT '>>> Adding Raw Materials...'

INSERT INTO Materials (MaterialCode, MaterialName, MaterialDescription, CategoryID, UOMID, IsActive, IsDeleted, CreatedBy, UpdatedBy)
VALUES 
-- Materials for pharmaceutical products
('MAT-ASP-001', 'Aspirin Powder', 'Acetylsalicylic acid API', 1, 4, 1, 0, 1, 1),
('MAT-FIL-001', 'Microcrystalline Cellulose', 'Filler/Binder for tablets', 1, 4, 1, 0, 1, 1),
('MAT-STR-001', 'Starch', 'Disintegrant', 1, 4, 1, 0, 1, 1),
('MAT-LUB-001', 'Magnesium Stearate', 'Lubricant', 1, 4, 1, 0, 1, 1),
('MAT-PKG-001', 'PVC Blister Pack', 'Packaging material - blister', 1, 1, 1, 0, 1, 1),
('MAT-AZI-001', 'Azithromycin API', 'Active pharmaceutical ingredient', 1, 4, 1, 0, 1, 1),
('MAT-CAP-001', 'Empty Gelatin Capsules', 'Size 0 capsules', 1, 1, 1, 0, 1, 1),
('MAT-LAC-001', 'Lactose', 'Filler for capsules', 1, 4, 1, 0, 1, 1),
('MAT-CET-001', 'Cetirizine HCL', 'Active pharmaceutical ingredient', 1, 4, 1, 0, 1, 1),
('MAT-COR-001', 'Corn Starch', 'Binder/Disintegrant', 1, 4, 1, 0, 1, 1),
('MAT-POV-001', 'Povidone', 'Binder', 1, 4, 1, 0, 1, 1),
('MAT-COT-001', 'Film Coating', 'Tablet coating material', 1, 4, 1, 0, 1, 1);

PRINT '>>> Materials added! Getting Material IDs...'

-- Get the Material IDs we just created
DECLARE @AspPowder INT = (SELECT MaterialID FROM Materials WHERE MaterialCode = 'MAT-ASP-001');
DECLARE @MCC INT = (SELECT MaterialID FROM Materials WHERE MaterialCode = 'MAT-FIL-001');
DECLARE @Starch INT = (SELECT MaterialID FROM Materials WHERE MaterialCode = 'MAT-STR-001');
DECLARE @MagStearate INT = (SELECT MaterialID FROM Materials WHERE MaterialCode = 'MAT-LUB-001');
DECLARE @BlisterPack INT = (SELECT MaterialID FROM Materials WHERE MaterialCode = 'MAT-PKG-001');
DECLARE @AziAPI INT = (SELECT MaterialID FROM Materials WHERE MaterialCode = 'MAT-AZI-001');
DECLARE @Capsules INT = (SELECT MaterialID FROM Materials WHERE MaterialCode = 'MAT-CAP-001');
DECLARE @Lactose INT = (SELECT MaterialID FROM Materials WHERE MaterialCode = 'MAT-LAC-001');
DECLARE @CetAPI INT = (SELECT MaterialID FROM Materials WHERE MaterialCode = 'MAT-CET-001');
DECLARE @CornStarch INT = (SELECT MaterialID FROM Materials WHERE MaterialCode = 'MAT-COR-001');
DECLARE @Povidone INT = (SELECT MaterialID FROM Materials WHERE MaterialCode = 'MAT-POV-001');
DECLARE @Coating INT = (SELECT MaterialID FROM Materials WHERE MaterialCode = 'MAT-COT-001');

-- ===================================================
-- Step 3: Add Products
-- ===================================================
PRINT '>>> Adding Products...'

-- CHANGE THESE VALUES BASED ON YOUR DATABASE:
-- BrandID: Use existing Brand ID (check SELECT * FROM Brands)
-- ProductTypeID: 1=Tablet, 2=Capsule (check SELECT * FROM ProductTypes)
-- UOMID: 2=Strip typically (check SELECT * FROM UOMs)

INSERT INTO Products (
    ProductCode, ProductName, BrandID, ProductTypeID, UOMID,
    NetWeight, GrossWeight, ShelfLifeDays, NearExpiryDays,
    Length, Breadth, Height, MinimumQty, ReorderLevelQty,
    Category, HSNCode, IsHazmat, IsActive, IsDeleted, CreatedBy, UpdatedBy
)
VALUES 
-- Product 1: Aspirin 75mg Tablet
('PROD-ASP-075', 'Aspirin 75mg Tablet', 1, 1, 2,
 5.00, 6.50, 1095, 180,
 10.00, 5.00, 1.00, 200, 1000,
 'Analgesic', '30049099', 0, 1, 0, 1, 1),

-- Product 2: Azithromycin 500mg Capsule  
('PROD-AZI-500', 'Azithromycin 500mg Capsule', 1, 2, 2,
 10.00, 12.00, 730, 90,
 12.00, 6.00, 1.50, 100, 500,
 'Antibiotic', '30042000', 0, 1, 0, 1, 1),

-- Product 3: Cetirizine 10mg Tablet
('PROD-CET-010', 'Cetirizine 10mg Tablet', 1, 1, 2,
 4.50, 5.50, 1095, 180,
 10.00, 5.00, 1.00, 150, 750,
 'Antihistamine', '30049099', 0, 1, 0, 1, 1);

PRINT '>>> Products added! Getting Product IDs...'

-- Get the Product IDs we just created
DECLARE @ProdAspirin INT = (SELECT ProductID FROM Products WHERE ProductCode = 'PROD-ASP-075');
DECLARE @ProdAzithro INT = (SELECT ProductID FROM Products WHERE ProductCode = 'PROD-AZI-500');
DECLARE @ProdCetiri INT = (SELECT ProductID FROM Products WHERE ProductCode = 'PROD-CET-010');

-- ===================================================
-- Step 4: Add Bill of Materials (BOM)
-- ===================================================
PRINT '>>> Adding Bill of Materials (BOM)...'

-- BOM for Aspirin 75mg Tablet (per strip of 10 tablets)
INSERT INTO ProductMaterials (ProductID, MaterialID, Quantity, UOMID, IsActive, IsDeleted, CreatedBy, UpdatedBy)
VALUES 
(@ProdAspirin, @AspPowder, 750.00, 4, 1, 0, 1, 1),    -- 750mg Aspirin Powder per strip
(@ProdAspirin, @MCC, 500.00, 4, 1, 0, 1, 1),          -- 500mg Microcrystalline Cellulose
(@ProdAspirin, @Starch, 200.00, 4, 1, 0, 1, 1),       -- 200mg Starch
(@ProdAspirin, @MagStearate, 50.00, 4, 1, 0, 1, 1),   -- 50mg Magnesium Stearate
(@ProdAspirin, @BlisterPack, 1.00, 1, 1, 0, 1, 1);    -- 1 PVC Blister Pack

-- BOM for Azithromycin 500mg Capsule (per strip of 6 capsules)
INSERT INTO ProductMaterials (ProductID, MaterialID, Quantity, UOMID, IsActive, IsDeleted, CreatedBy, UpdatedBy)
VALUES 
(@ProdAzithro, @AziAPI, 3000.00, 4, 1, 0, 1, 1),      -- 3000mg Azithromycin API per strip
(@ProdAzithro, @Capsules, 6.00, 1, 1, 0, 1, 1),       -- 6 Empty Capsules
(@ProdAzithro, @Lactose, 600.00, 4, 1, 0, 1, 1),      -- 600mg Lactose filler
(@ProdAzithro, @BlisterPack, 1.00, 1, 1, 0, 1, 1);    -- 1 PVC Blister Pack

-- BOM for Cetirizine 10mg Tablet (per strip of 10 tablets)
INSERT INTO ProductMaterials (ProductID, MaterialID, Quantity, UOMID, IsActive, IsDeleted, CreatedBy, UpdatedBy)
VALUES 
(@ProdCetiri, @CetAPI, 100.00, 4, 1, 0, 1, 1),        -- 100mg Cetirizine HCL per strip
(@ProdCetiri, @CornStarch, 400.00, 4, 1, 0, 1, 1),    -- 400mg Corn Starch
(@ProdCetiri, @Povidone, 200.00, 4, 1, 0, 1, 1),      -- 200mg Povidone
(@ProdCetiri, @Coating, 100.00, 4, 1, 0, 1, 1),       -- 100mg Film Coating
(@ProdCetiri, @BlisterPack, 1.00, 1, 1, 0, 1, 1);     -- 1 PVC Blister Pack

PRINT '>>> BOM added successfully!'

-- ===================================================
-- Step 5: Add Material Stock (Example)
-- ===================================================
PRINT '>>> Adding Material Stock via Purchase Order...'

-- You need to have a PurchaseOrder first. 
-- Replace @POID with your actual Purchase Order ID
-- Replace WarehouseID=1 with your actual warehouse

DECLARE @POID INT = 1;  -- CHANGE THIS to your PO ID
DECLARE @WhID INT = 1;  -- CHANGE THIS to your Warehouse ID

-- Check if PO exists
IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PurchaseOrderID = @POID)
BEGIN
    PRINT '>>> Creating a sample Purchase Order...'
    INSERT INTO PurchaseOrders (
        PurchaseOrderNumber, VendorID, WarehouseID, BranchID,
        DeliveryDate, TransporterName, VehicleNumber, LRNumber, Remarks,
        PurchaseOrderStatus, IsActive, IsDeleted, CreatedBy, UpdatedBy
    )
    VALUES (
        'PO-MAT-' + CONVERT(VARCHAR(10), GETDATE(), 112), 
        1, @WhID, 1,
        DATEADD(DAY, 7, GETDATE()), 
        'Material Supplier', 'VEH-001', 'LR-' + CONVERT(VARCHAR(10), GETDATE(), 112), 
        'Raw materials for production',
        'APPROVED', 1, 0, 1, 1
    );
    
    SET @POID = SCOPE_IDENTITY();
END

PRINT '>>> Using Purchase Order ID: ' + CAST(@POID AS VARCHAR(10))

-- Add Material Stock
INSERT INTO PurchaseOrderProducts (
    PurchaseOrderID, MaterialID, Quantity, Received_Quantity, 
    MRP, UOMID, WarehouseID, IsDeleted, CreatedBy, UpdatedBy
)
VALUES 
-- Stock for Aspirin production (enough for ~60 strips)
(@POID, @AspPowder, 50000, 50000, 100.00, 4, @WhID, 0, 1, 1),    -- 50kg (50,000g)
(@POID, @MCC, 30000, 30000, 50.00, 4, @WhID, 0, 1, 1),           -- 30kg
(@POID, @Starch, 20000, 20000, 30.00, 4, @WhID, 0, 1, 1),        -- 20kg
(@POID, @MagStearate, 5000, 5000, 80.00, 4, @WhID, 0, 1, 1),     -- 5kg
(@POID, @BlisterPack, 500, 500, 2.00, 1, @WhID, 0, 1, 1),        -- 500 packs

-- Stock for Azithromycin production (enough for ~5 strips)
(@POID, @AziAPI, 15000, 15000, 500.00, 4, @WhID, 0, 1, 1),       -- 15kg
(@POID, @Capsules, 30, 30, 0.50, 1, @WhID, 0, 1, 1),             -- 30 capsules
(@POID, @Lactose, 10000, 10000, 20.00, 4, @WhID, 0, 1, 1),       -- 10kg

-- Stock for Cetirizine production (enough for ~20 strips) 
(@POID, @CetAPI, 2000, 2000, 300.00, 4, @WhID, 0, 1, 1),         -- 2kg
(@POID, @CornStarch, 15000, 15000, 25.00, 4, @WhID, 0, 1, 1),    -- 15kg
(@POID, @Povidone, 8000, 8000, 45.00, 4, @WhID, 0, 1, 1),        -- 8kg
(@POID, @Coating, 5000, 5000, 35.00, 4, @WhID, 0, 1, 1);         -- 5kg

PRINT '>>> Material Stock added!'

-- ===================================================
-- VERIFICATION
-- ===================================================
PRINT ''
PRINT '=============================================='
PRINT 'VERIFICATION - Products Created'
PRINT '=============================================='
SELECT 
    ProductID, 
    ProductCode, 
    ProductName, 
    Category,
    (SELECT COUNT(*) FROM ProductMaterials WHERE ProductID = P.ProductID) AS BOM_Items
FROM Products P
WHERE ProductCode IN ('PROD-ASP-075', 'PROD-AZI-500', 'PROD-CET-010')
ORDER BY ProductID;

PRINT ''
PRINT '=============================================='
PRINT 'Bill of Materials Summary'
PRINT '=============================================='
SELECT 
    P.ProductCode,
    P.ProductName,
    M.MaterialCode,
    M.MaterialName,
    PM.Quantity AS Qty_Per_Unit,
    U.UOMCode
FROM ProductMaterials PM
INNER JOIN Products P ON PM.ProductID = P.ProductID
INNER JOIN Materials M ON PM.MaterialID = M.MaterialID
LEFT JOIN UOMs U ON PM.UOMID = U.UOMID
WHERE P.ProductCode IN ('PROD-ASP-075', 'PROD-AZI-500', 'PROD-CET-010')
ORDER BY P.ProductCode, M.MaterialCode;

PRINT ''
PRINT '=============================================='
PRINT 'Material Stock Available'
PRINT '=============================================='
SELECT 
    M.MaterialCode,
    M.MaterialName,
    SUM(POP.Received_Quantity) AS Total_Stock,
    U.UOMCode
FROM PurchaseOrderProducts POP
INNER JOIN Materials M ON POP.MaterialID = M.MaterialID
LEFT JOIN UOMs U ON POP.UOMID = U.UOMID
WHERE POP.MaterialID IN (@AspPowder, @MCC, @Starch, @MagStearate, @BlisterPack, @AziAPI, @Capsules, @Lactose, @CetAPI, @CornStarch, @Povidone, @Coating)
AND POP.IsDeleted = 0
GROUP BY M.MaterialCode, M.MaterialName, U.UOMCode
ORDER BY M.MaterialCode;

PRINT ''
PRINT '=============================================='
PRINT 'SETUP COMPLETE!'
PRINT '=============================================='
PRINT 'Now you can:'
PRINT '1. Create Sales Orders with these products'
PRINT '2. Click "Check Inventory" from action menu'
PRINT '3. See material requirements with color coding'
PRINT '=============================================='
