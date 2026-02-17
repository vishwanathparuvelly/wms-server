// Migration: Add MaterialID support to BinProducts and BinProductLogs for Pharma materials putaway

async function up(pool) {
  try {
    const request = pool.request();

    // Step 1: Add MaterialID to BinProducts, make ProductID nullable
    const checkBP = await request.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'BinProducts' AND COLUMN_NAME = 'MaterialID'
    `);
    if (checkBP.recordset[0].count === 0) {
      await request.query(`
        ALTER TABLE BinProducts ADD MaterialID INT NULL;
      `);
      console.log("✓ Added MaterialID to BinProducts");
    }

    const checkBPProductID = await request.query(`
      SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'BinProducts' AND COLUMN_NAME = 'ProductID'
    `);
    if (checkBPProductID.recordset[0]?.IS_NULLABLE === "NO") {
      await request.query(`ALTER TABLE BinProducts DROP CONSTRAINT FK_BinProducts_Product`);
      await request.query(`ALTER TABLE BinProducts ALTER COLUMN ProductID INT NULL`);
      await request.query(`ALTER TABLE BinProducts ADD CONSTRAINT FK_BinProducts_Product FOREIGN KEY (ProductID) REFERENCES Products(ProductID)`);
      console.log("✓ Made BinProducts.ProductID nullable");
    }

    const checkBPMaterialFK = await request.query(`
      SELECT COUNT(*) as count FROM sys.foreign_keys
      WHERE name = 'FK_BinProducts_Material'
    `);
    if (checkBPMaterialFK.recordset[0].count === 0) {
      await request.query(`
        ALTER TABLE BinProducts ADD CONSTRAINT FK_BinProducts_Material FOREIGN KEY (MaterialID) REFERENCES Materials(MaterialID);
      `);
      console.log("✓ Added FK_BinProducts_Material");
    }

    const checkBPChk = await request.query(`
      SELECT COUNT(*) as count FROM sys.check_constraints
      WHERE name = 'CHK_BinProducts_ItemReference'
    `);
    if (checkBPChk.recordset[0].count === 0) {
      await request.query(`
        ALTER TABLE BinProducts ADD CONSTRAINT CHK_BinProducts_ItemReference
        CHECK (ProductID IS NOT NULL OR MaterialID IS NOT NULL);
      `);
      console.log("✓ Added CHK_BinProducts_ItemReference");
    }

    // Step 2: Add MaterialID to BinProductLogs, make ProductID nullable
    const checkBPL = await request.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'BinProductLogs' AND COLUMN_NAME = 'MaterialID'
    `);
    if (checkBPL.recordset[0].count === 0) {
      await request.query(`
        ALTER TABLE BinProductLogs ADD MaterialID INT NULL;
      `);
      console.log("✓ Added MaterialID to BinProductLogs");
    }

    const checkBPLProductID = await request.query(`
      SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'BinProductLogs' AND COLUMN_NAME = 'ProductID'
    `);
    if (checkBPLProductID.recordset[0]?.IS_NULLABLE === "NO") {
      await request.query(`ALTER TABLE BinProductLogs DROP CONSTRAINT FK_BinProductLogs_Product`);
      await request.query(`ALTER TABLE BinProductLogs ALTER COLUMN ProductID INT NULL`);
      await request.query(`ALTER TABLE BinProductLogs ADD CONSTRAINT FK_BinProductLogs_Product FOREIGN KEY (ProductID) REFERENCES Products(ProductID)`);
      console.log("✓ Made BinProductLogs.ProductID nullable");
    }

    const checkBPLMaterialFK = await request.query(`
      SELECT COUNT(*) as count FROM sys.foreign_keys
      WHERE name = 'FK_BinProductLogs_Material'
    `);
    if (checkBPLMaterialFK.recordset[0].count === 0) {
      await request.query(`
        ALTER TABLE BinProductLogs ADD CONSTRAINT FK_BinProductLogs_Material FOREIGN KEY (MaterialID) REFERENCES Materials(MaterialID);
      `);
      console.log("✓ Added FK_BinProductLogs_Material");
    }

    const checkBPLChk = await request.query(`
      SELECT COUNT(*) as count FROM sys.check_constraints
      WHERE name = 'CHK_BinProductLogs_ItemReference'
    `);
    if (checkBPLChk.recordset[0].count === 0) {
      await request.query(`
        ALTER TABLE BinProductLogs ADD CONSTRAINT CHK_BinProductLogs_ItemReference
        CHECK (ProductID IS NOT NULL OR MaterialID IS NOT NULL);
      `);
      console.log("✓ Added CHK_BinProductLogs_ItemReference");
    }

    return true;
  } catch (err) {
    console.error("Migration 009 error:", err.message);
    throw err;
  }
}

module.exports = { up };
