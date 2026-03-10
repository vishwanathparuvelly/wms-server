#!/usr/bin/env node

/**
 * ============================================================================
 * ADD SAMPLE PRODUCTS WITH BILL OF MATERIALS (BOM)
 * ============================================================================
 * 
 * Purpose: Add 3 pharmaceutical products with complete BOM and material stock
 * 
 * What it adds:
 *   1. 12 Raw Materials (APIs, fillers, packaging)
 *   2. 3 Finished Products (Aspirin, Azithromycin, Cetirizine)
 *   3. Bill of Materials (BOM) linking products to materials
 *   4. Material stock via Purchase Order
 * 
 * Usage:
 *   node add_sample_products.js
 * 
 * ============================================================================
 */

const initializePool = require("./database/db");
const sql = require("mssql");

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function separator() {
  log('='.repeat(70), colors.blue);
}

// Sample data
const materials = [
  { code: 'MAT-ASP-001', name: 'Aspirin Powder', desc: 'Acetylsalicylic acid API' },
  { code: 'MAT-FIL-001', name: 'Microcrystalline Cellulose', desc: 'Filler/Binder for tablets' },
  { code: 'MAT-STR-001', name: 'Starch', desc: 'Disintegrant' },
  { code: 'MAT-LUB-001', name: 'Magnesium Stearate', desc: 'Lubricant' },
  { code: 'MAT-PKG-001', name: 'PVC Blister Pack', desc: 'Packaging material - blister' },
  { code: 'MAT-AZI-001', name: 'Azithromycin API', desc: 'Active pharmaceutical ingredient' },
  { code: 'MAT-CAP-001', name: 'Empty Gelatin Capsules', desc: 'Size 0 capsules' },
  { code: 'MAT-LAC-001', name: 'Lactose', desc: 'Filler for capsules' },
  { code: 'MAT-CET-001', name: 'Cetirizine HCL', desc: 'Active pharmaceutical ingredient' },
  { code: 'MAT-COR-001', name: 'Corn Starch', desc: 'Binder/Disintegrant' },
  { code: 'MAT-POV-001', name: 'Povidone', desc: 'Binder' },
  { code: 'MAT-COT-001', name: 'Film Coating', desc: 'Tablet coating material' },
];

const products = [
  {
    code: 'PROD-ASP-075',
    name: 'Aspirin 75mg Tablet',
    category: 'Analgesic',
    hsnCode: '30049099',
    bomMaterials: [
      { materialCode: 'MAT-ASP-001', quantity: 750.00, uomId: 4 },  // 750mg per strip
      { materialCode: 'MAT-FIL-001', quantity: 500.00, uomId: 4 },
      { materialCode: 'MAT-STR-001', quantity: 200.00, uomId: 4 },
      { materialCode: 'MAT-LUB-001', quantity: 50.00, uomId: 4 },
      { materialCode: 'MAT-PKG-001', quantity: 1.00, uomId: 1 },
    ]
  },
  {
    code: 'PROD-AZI-500',
    name: 'Azithromycin 500mg Capsule',
    category: 'Antibiotic',
    hsnCode: '30042000',
    bomMaterials: [
      { materialCode: 'MAT-AZI-001', quantity: 3000.00, uomId: 4 },  // 3000mg per strip (6 caps)
      { materialCode: 'MAT-CAP-001', quantity: 6.00, uomId: 1 },
      { materialCode: 'MAT-LAC-001', quantity: 600.00, uomId: 4 },
      { materialCode: 'MAT-PKG-001', quantity: 1.00, uomId: 1 },
    ]
  },
  {
    code: 'PROD-CET-010',
    name: 'Cetirizine 10mg Tablet',
    category: 'Antihistamine',
    hsnCode: '30049099',
    bomMaterials: [
      { materialCode: 'MAT-CET-001', quantity: 100.00, uomId: 4 },  // 100mg per strip
      { materialCode: 'MAT-COR-001', quantity: 400.00, uomId: 4 },
      { materialCode: 'MAT-POV-001', quantity: 200.00, uomId: 4 },
      { materialCode: 'MAT-COT-001', quantity: 100.00, uomId: 4 },
      { materialCode: 'MAT-PKG-001', quantity: 1.00, uomId: 1 },
    ]
  }
];

const materialStock = [
  { code: 'MAT-ASP-001', quantity: 50000, mrp: 100.00 },  // 50kg
  { code: 'MAT-FIL-001', quantity: 30000, mrp: 50.00 },
  { code: 'MAT-STR-001', quantity: 20000, mrp: 30.00 },
  { code: 'MAT-LUB-001', quantity: 5000, mrp: 80.00 },
  { code: 'MAT-PKG-001', quantity: 500, mrp: 2.00 },
  { code: 'MAT-AZI-001', quantity: 15000, mrp: 500.00 },
  { code: 'MAT-CAP-001', quantity: 30, mrp: 0.50 },
  { code: 'MAT-LAC-001', quantity: 10000, mrp: 20.00 },
  { code: 'MAT-CET-001', quantity: 2000, mrp: 300.00 },
  { code: 'MAT-COR-001', quantity: 15000, mrp: 25.00 },
  { code: 'MAT-POV-001', quantity: 8000, mrp: 45.00 },
  { code: 'MAT-COT-001', quantity: 5000, mrp: 35.00 },
];

async function addSampleProducts() {
  let pool;
  
  try {
    separator();
    log('ADDING SAMPLE PRODUCTS WITH BOM', colors.bright + colors.blue);
    separator();

    pool = await initializePool();
    
    // Step 1: Check existing data
    log('\n>>> Checking existing data...', colors.yellow);
    const existingCheck = await pool.request().query(`
      SELECT 'Brands' AS TableName, COUNT(*) AS RecordCount FROM Brands WHERE IsDeleted = 0
      UNION ALL
      SELECT 'ProductTypes', COUNT(*) FROM ProductTypes WHERE IsDeleted = 0
      UNION ALL
      SELECT 'UOMs', COUNT(*) FROM UOMs WHERE IsDeleted = 0
      UNION ALL
      SELECT 'Products', COUNT(*) FROM Products WHERE IsDeleted = 0
    `);
    console.table(existingCheck.recordset);

    // Step 2: Add Materials
    log('\n>>> Adding Materials...', colors.yellow);
    const materialIds = {};
    
    for (const mat of materials) {
      try {
        const result = await pool.request()
          .input('MaterialCode', sql.NVarChar(50), mat.code)
          .input('MaterialName', sql.NVarChar(255), mat.name)
          .input('MaterialDescription', sql.NVarChar(sql.MAX), mat.desc)
          .input('UOMID', sql.Int, mat.code.includes('PKG') || mat.code.includes('CAP') ? 1 : 4)
          .input('IsActive', sql.Bit, 1)
          .input('IsDeleted', sql.Bit, 0)
          .input('CreatedBy', sql.Int, 1)
          .input('UpdatedBy', sql.Int, 1)
          .query(`
            INSERT INTO Materials (MaterialCode, MaterialName, MaterialDescription, UOMID, IsActive, IsDeleted, CreatedBy, UpdatedBy)
            VALUES (@MaterialCode, @MaterialName, @MaterialDescription, @UOMID, @IsActive, @IsDeleted, @CreatedBy, @UpdatedBy);
            SELECT SCOPE_IDENTITY() AS MaterialID;
          `);
        
        materialIds[mat.code] = result.recordset[0].MaterialID;
        log(`   ✓ ${mat.code}: ${mat.name} (ID: ${materialIds[mat.code]})`, colors.green);
      } catch (err) {
        if (err.message.includes('duplicate') || err.message.includes('UNIQUE')) {
          log(`   ⚠ ${mat.code} already exists, fetching ID...`, colors.yellow);
          const existing = await pool.request()
            .input('MaterialCode', sql.NVarChar(50), mat.code)
            .query(`SELECT MaterialID FROM Materials WHERE MaterialCode = @MaterialCode`);
          if (existing.recordset.length > 0) {
            materialIds[mat.code] = existing.recordset[0].MaterialID;
          }
        } else {
          throw err;
        }
      }
    }

    // Step 3: Add Products
    log('\n>>> Adding Products...', colors.yellow);
    const productIds = {};
    
    for (const prod of products) {
      try {
        const result = await pool.request()
          .input('ProductCode', sql.NVarChar(50), prod.code)
          .input('ProductName', sql.NVarChar(255), prod.name)
          .input('BrandID', sql.Int, 1)  // Use first brand
          .input('ProductTypeID', sql.Int, prod.name.includes('Capsule') ? 2 : 1)  // 1=Tablet, 2=Capsule
          .input('UOMID', sql.Int, 2)  // 2=Strip
          .input('NetWeight', sql.Decimal(10, 2), 5.00)
          .input('GrossWeight', sql.Decimal(10, 2), 6.50)
          .input('ShelfLifeDays', sql.Int, 1095)
          .input('NearExpiryDays', sql.Int, 180)
          .input('Length', sql.Decimal(10, 2), 10.00)
          .input('Breadth', sql.Decimal(10, 2), 5.00)
          .input('Height', sql.Decimal(10, 2), 1.00)
          .input('MinimumQty', sql.Decimal(10, 2), 100)
          .input('ReorderLevelQty', sql.Decimal(10, 2), 500)
          .input('Category', sql.NVarChar(100), prod.category)
          .input('HSNCode', sql.NVarChar(50), prod.hsnCode)
          .input('IsHazmat', sql.Bit, 0)
          .input('IsActive', sql.Bit, 1)
          .input('IsDeleted', sql.Bit, 0)
          .input('CreatedBy', sql.Int, 1)
          .input('UpdatedBy', sql.Int, 1)
          .query(`
            INSERT INTO Products (
              ProductCode, ProductName, BrandID, ProductTypeID, UOMID,
              NetWeight, GrossWeight, ShelfLifeDays, NearExpiryDays,
              Length, Breadth, Height, MinimumQty, ReorderLevelQty,
              Category, HSNCode, IsHazmat, IsActive, IsDeleted, CreatedBy, UpdatedBy
            )
            VALUES (
              @ProductCode, @ProductName, @BrandID, @ProductTypeID, @UOMID,
              @NetWeight, @GrossWeight, @ShelfLifeDays, @NearExpiryDays,
              @Length, @Breadth, @Height, @MinimumQty, @ReorderLevelQty,
              @Category, @HSNCode, @IsHazmat, @IsActive, @IsDeleted, @CreatedBy, @UpdatedBy
            );
            SELECT SCOPE_IDENTITY() AS ProductID;
          `);
        
        productIds[prod.code] = result.recordset[0].ProductID;
        log(`   ✓ ${prod.code}: ${prod.name} (ID: ${productIds[prod.code]})`, colors.green);
      } catch (err) {
        if (err.message.includes('duplicate') || err.message.includes('UNIQUE')) {
          log(`   ⚠ ${prod.code} might already exist, fetching ID...`, colors.yellow);
          // Try by ProductCode first
          let existing = await pool.request()
            .input('ProductCode', sql.NVarChar(50), prod.code)
            .query(`SELECT ProductID FROM Products WHERE ProductCode = @ProductCode`);
          
          // If not found by code, try by name (since ProductName is also UNIQUE)
          if (existing.recordset.length === 0) {
            existing = await pool.request()
              .input('ProductName', sql.NVarChar(255), prod.name)
              .query(`SELECT ProductID, ProductCode FROM Products WHERE ProductName = @ProductName`);
            
            if (existing.recordset.length > 0) {
              log(`   ⚠ Product with name "${prod.name}" exists as ${existing.recordset[0].ProductCode}`, colors.yellow);
              log(`   ⚠ Skipping ${prod.code}`, colors.yellow);
              productIds[prod.code] = null; // Mark as skipped
              continue;
            }
          }
          
          if (existing.recordset.length > 0) {
            productIds[prod.code] = existing.recordset[0].ProductID;
            log(`   ✓ ${prod.code}: ID = ${productIds[prod.code]}`, colors.green);
          } else {
            log(`   ✗ ${prod.code}: Could not fetch ID`, colors.red);
            productIds[prod.code] = null; // Mark as skipped
            continue;
          }
        } else {
          throw err;
        }
      }
    }

    // Step 4: Add Bill of Materials (BOM)
    log('\n>>> Adding Bill of Materials (BOM)...', colors.yellow);
    
    for (const prod of products) {
      const productId = productIds[prod.code];
      
      // Skip if product was not added (null ID)
      if (!productId) {
        log(`   Skipping BOM for ${prod.name} (not added)`, colors.yellow);
        continue;
      }
      
      log(`   Adding BOM for ${prod.name}:`, colors.blue);
      
      for (const bom of prod.bomMaterials) {
        const materialId = materialIds[bom.materialCode];
        
        try {
          await pool.request()
            .input('ProductID', sql.Int, productId)
            .input('MaterialID', sql.Int, materialId)
            .input('Quantity', sql.Decimal(18, 2), bom.quantity)
            .input('UOMID', sql.Int, bom.uomId)
            .input('IsActive', sql.Bit, 1)
            .input('IsDeleted', sql.Bit, 0)
            .input('CreatedBy', sql.Int, 1)
            .input('UpdatedBy', sql.Int, 1)
            .query(`
              INSERT INTO ProductMaterials (ProductID, MaterialID, Quantity, UOMID, IsActive, IsDeleted, CreatedBy, UpdatedBy)
              VALUES (@ProductID, @MaterialID, @Quantity, @UOMID, @IsActive, @IsDeleted, @CreatedBy, @UpdatedBy)
            `);
          
          log(`      ✓ ${bom.materialCode}: ${bom.quantity}`, colors.green);
        } catch (err) {
          if (err.message.includes('duplicate') || err.message.includes('PRIMARY KEY')) {
            log(`      ⚠ BOM already exists for ${bom.materialCode}`, colors.yellow);
          } else {
            throw err;
          }
        }
      }
    }

    // Step 5: Add Material Stock via Purchase Order
    log('\n>>> Adding Material Stock...', colors.yellow);
    
    // Check if we have a PO, if not create one
    let poId;
    const existingPO = await pool.request().query(`
      SELECT TOP 1 PurchaseOrderID FROM PurchaseOrders WHERE IsDeleted = 0 ORDER BY PurchaseOrderID DESC
    `);
    
    if (existingPO.recordset.length > 0) {
      poId = existingPO.recordset[0].PurchaseOrderID;
      log(`   Using existing PO ID: ${poId}`, colors.blue);
    } else {
      const poNumber = `PO-MAT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
      const poResult = await pool.request()
        .input('PurchaseOrderNumber', sql.NVarChar(50), poNumber)
        .input('VendorID', sql.Int, 1)
        .input('WarehouseID', sql.Int, 1)
        .input('BranchID', sql.Int, 1)
        .input('DeliveryDate', sql.DateTime, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
        .input('TransporterName', sql.NVarChar(255), 'Material Supplier')
        .input('VehicleNumber', sql.NVarChar(50), 'VEH-001')
        .input('LRNumber', sql.NVarChar(50), `LR-${Date.now()}`)
        .input('Remarks', sql.NVarChar(500), 'Raw materials for production')
        .input('PurchaseOrderStatus', sql.NVarChar(50), 'APPROVED')
        .input('IsActive', sql.Bit, 1)
        .input('IsDeleted', sql.Bit, 0)
        .input('CreatedBy', sql.Int, 1)
        .input('UpdatedBy', sql.Int, 1)
        .query(`
          INSERT INTO PurchaseOrders (
            PurchaseOrderNumber, VendorID, WarehouseID, BranchID,
            DeliveryDate, TransporterName, VehicleNumber, LRNumber, Remarks,
            PurchaseOrderStatus, IsActive, IsDeleted, CreatedBy, UpdatedBy
          )
          VALUES (
            @PurchaseOrderNumber, @VendorID, @WarehouseID, @BranchID,
            @DeliveryDate, @TransporterName, @VehicleNumber, @LRNumber, @Remarks,
            @PurchaseOrderStatus, @IsActive, @IsDeleted, @CreatedBy, @UpdatedBy
          );
          SELECT SCOPE_IDENTITY() AS PurchaseOrderID;
        `);
      poId = poResult.recordset[0].PurchaseOrderID;
      log(`   Created new PO: ${poNumber} (ID: ${poId})`, colors.green);
    }

    // Add material stock
    for (const stock of materialStock) {
      const materialId = materialIds[stock.code];
      const uomId = stock.code.includes('PKG') || stock.code.includes('CAP') ? 1 : 4;
      
      try {
        await pool.request()
          .input('PurchaseOrderID', sql.Int, poId)
          .input('MaterialID', sql.Int, materialId)
          .input('Quantity', sql.Decimal(18, 2), stock.quantity)
          .input('Received_Quantity', sql.Decimal(18, 2), stock.quantity)
          .input('MRP', sql.Decimal(18, 2), stock.mrp)
          .input('UOMID', sql.Int, uomId)
          .input('WarehouseID', sql.Int, 1)
          .input('IsDeleted', sql.Bit, 0)
          .input('CreatedBy', sql.Int, 1)
          .input('UpdatedBy', sql.Int, 1)
          .query(`
            INSERT INTO PurchaseOrderProducts (
              PurchaseOrderID, MaterialID, Quantity, Received_Quantity, MRP, UOMID, WarehouseID, IsDeleted, CreatedBy, UpdatedBy
            )
            VALUES (
              @PurchaseOrderID, @MaterialID, @Quantity, @Received_Quantity, @MRP, @UOMID, @WarehouseID, @IsDeleted, @CreatedBy, @UpdatedBy
            )
          `);
        
        log(`   ✓ Stock added for ${stock.code}: ${stock.quantity}`, colors.green);
      } catch (err) {
        log(`   ⚠ Error adding stock for ${stock.code}: ${err.message}`, colors.yellow);
      }
    }

    // Verification
    log('\n>>> VERIFICATION', colors.bright + colors.magenta);
    separator();
    
    const verifyProducts = await pool.request().query(`
      SELECT 
        ProductID, 
        ProductCode, 
        ProductName, 
        Category,
        (SELECT COUNT(*) FROM ProductMaterials WHERE ProductID = P.ProductID AND IsDeleted = 0) AS BOM_Items
      FROM Products P
      WHERE ProductCode IN ('PROD-ASP-075', 'PROD-AZI-500', 'PROD-CET-010')
      ORDER BY ProductID
    `);
    
    log('\nProducts Created:', colors.bright);
    console.table(verifyProducts.recordset);

    const verifyBOM = await pool.request().query(`
      SELECT 
        P.ProductCode,
        M.MaterialCode,
        M.MaterialName,
        PM.Quantity AS Qty_Per_Unit,
        U.UOMCode
      FROM ProductMaterials PM
      INNER JOIN Products P ON PM.ProductID = P.ProductID
      INNER JOIN Materials M ON PM.MaterialID = M.MaterialID
      LEFT JOIN UOMs U ON PM.UOMID = U.UOMID
      WHERE P.ProductCode IN ('PROD-ASP-075', 'PROD-AZI-500', 'PROD-CET-010')
      AND PM.IsDeleted = 0
      ORDER BY P.ProductCode, M.MaterialCode
    `);
    
    log('\nBill of Materials:', colors.bright);
    console.table(verifyBOM.recordset);

    const verifyStock = await pool.request().query(`
      SELECT 
        M.MaterialCode,
        M.MaterialName,
        SUM(POP.Received_Quantity) AS Total_Stock,
        U.UOMCode
      FROM PurchaseOrderProducts POP
      INNER JOIN Materials M ON POP.MaterialID = M.MaterialID
      LEFT JOIN UOMs U ON POP.UOMID = U.UOMID
      WHERE POP.MaterialID IS NOT NULL
      AND POP.IsDeleted = 0
      AND M.MaterialCode LIKE 'MAT-%'
      GROUP BY M.MaterialCode, M.MaterialName, U.UOMCode
      ORDER BY M.MaterialCode
    `);
    
    log('\nMaterial Stock:', colors.bright);
    console.table(verifyStock.recordset);

    separator();
    log('✓ SETUP COMPLETE!', colors.bright + colors.green);
    separator();
    log('\nNow you can:', colors.bright);
    log('1. Create Sales Orders with these products', colors.green);
    log('2. Click "Check Inventory" from action menu', colors.green);
    log('3. See material requirements with color coding', colors.green);
    separator();

  } catch (err) {
    log('\n✗ ERROR: ' + err.message, colors.red);
    console.error(err);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Run the script
addSampleProducts()
  .then(() => {
    log('\n✓ Script completed successfully!', colors.green);
    process.exit(0);
  })
  .catch((err) => {
    log('\n✗ Script failed: ' + err.message, colors.red);
    console.error(err);
    process.exit(1);
  });
