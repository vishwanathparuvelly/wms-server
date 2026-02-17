const sql = require("mssql");

/**
 * Migration 007: Add missing columns to PurchaseOrderProducts table
 * 
 * Issue: Backend code expects BatchNumber, VendorID, BranchID, WarehouseID, SLOCID,
 *        Pending_Quantity, Received_Quantity, MRP, Discount, and calculated amount fields,
 *        but these columns don't exist in the database.
 * 
 * This migration adds 12 missing columns to support complete purchase order product tracking.
 */

async function up(pool) {
  console.log("\n🔄 Migration 007: Adding missing columns to PurchaseOrderProducts table...");

  try {
    // Check if columns already exist
    const checkQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'PurchaseOrderProducts' 
      AND COLUMN_NAME IN (
        'VendorID', 'BranchID', 'WarehouseID', 'SLOCID', 'BatchNumber',
        'Pending_Quantity', 'Received_Quantity', 'MRP', 'Discount',
        'Total_Product_MRP', 'Total_Product_Discount', 'Total_Product_Amount'
      )
    `;
    const existingColumns = await pool.request().query(checkQuery);
    const existingColumnNames = existingColumns.recordset.map(row => row.COLUMN_NAME);

    // Add VendorID
    if (!existingColumnNames.includes('VendorID')) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderProducts 
        ADD VendorID INT NULL
      `);
      console.log("  ✓ Added VendorID column");
    } else {
      console.log("  ℹ VendorID column already exists");
    }

    // Add BranchID
    if (!existingColumnNames.includes('BranchID')) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderProducts 
        ADD BranchID INT NULL
      `);
      console.log("  ✓ Added BranchID column");
    } else {
      console.log("  ℹ BranchID column already exists");
    }

    // Add WarehouseID
    if (!existingColumnNames.includes('WarehouseID')) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderProducts 
        ADD WarehouseID INT NULL
      `);
      console.log("  ✓ Added WarehouseID column");
    } else {
      console.log("  ℹ WarehouseID column already exists");
    }

    // Add SLOCID
    if (!existingColumnNames.includes('SLOCID')) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderProducts 
        ADD SLOCID INT NULL
      `);
      console.log("  ✓ Added SLOCID column");
    } else {
      console.log("  ℹ SLOCID column already exists");
    }

    // Add BatchNumber
    if (!existingColumnNames.includes('BatchNumber')) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderProducts 
        ADD BatchNumber NVARCHAR(50) NULL
      `);
      console.log("  ✓ Added BatchNumber column");
    } else {
      console.log("  ℹ BatchNumber column already exists");
    }

    // Add Pending_Quantity
    if (!existingColumnNames.includes('Pending_Quantity')) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderProducts 
        ADD Pending_Quantity DECIMAL(18, 2) NOT NULL DEFAULT 0
      `);
      console.log("  ✓ Added Pending_Quantity column");
    } else {
      console.log("  ℹ Pending_Quantity column already exists");
    }

    // Add Received_Quantity (note: different from ReceivedQuantity)
    if (!existingColumnNames.includes('Received_Quantity')) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderProducts 
        ADD Received_Quantity DECIMAL(18, 2) NOT NULL DEFAULT 0
      `);
      console.log("  ✓ Added Received_Quantity column");
    } else {
      console.log("  ℹ Received_Quantity column already exists");
    }

    // Add MRP
    if (!existingColumnNames.includes('MRP')) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderProducts 
        ADD MRP DECIMAL(18, 2) NULL
      `);
      console.log("  ✓ Added MRP column");
    } else {
      console.log("  ℹ MRP column already exists");
    }

    // Add Discount
    if (!existingColumnNames.includes('Discount')) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderProducts 
        ADD Discount DECIMAL(18, 2) NULL
      `);
      console.log("  ✓ Added Discount column");
    } else {
      console.log("  ℹ Discount column already exists");
    }

    // Add Total_Product_MRP
    if (!existingColumnNames.includes('Total_Product_MRP')) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderProducts 
        ADD Total_Product_MRP DECIMAL(18, 2) NULL
      `);
      console.log("  ✓ Added Total_Product_MRP column");
    } else {
      console.log("  ℹ Total_Product_MRP column already exists");
    }

    // Add Total_Product_Discount
    if (!existingColumnNames.includes('Total_Product_Discount')) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderProducts 
        ADD Total_Product_Discount DECIMAL(18, 2) NULL
      `);
      console.log("  ✓ Added Total_Product_Discount column");
    } else {
      console.log("  ℹ Total_Product_Discount column already exists");
    }

    // Add Total_Product_Amount
    if (!existingColumnNames.includes('Total_Product_Amount')) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderProducts 
        ADD Total_Product_Amount DECIMAL(18, 2) NULL
      `);
      console.log("  ✓ Added Total_Product_Amount column");
    } else {
      console.log("  ℹ Total_Product_Amount column already exists");
    }

    // Add foreign key constraints if they don't exist
    const checkFKQuery = `
      SELECT name 
      FROM sys.foreign_keys 
      WHERE parent_object_id = OBJECT_ID('PurchaseOrderProducts')
      AND name IN ('FK_POP_Vendor', 'FK_POP_Branch', 'FK_POP_Warehouse', 'FK_POP_SLOC')
    `;
    const existingFKs = await pool.request().query(checkFKQuery);
    const existingFKNames = existingFKs.recordset.map(row => row.name);

    // Add FK for VendorID
    if (!existingFKNames.includes('FK_POP_Vendor')) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderProducts
        ADD CONSTRAINT FK_POP_Vendor 
        FOREIGN KEY (VendorID) REFERENCES Vendors(VendorID)
      `);
      console.log("  ✓ Added Foreign Key constraint to Vendors table");
    } else {
      console.log("  ℹ FK_POP_Vendor constraint already exists");
    }

    // Add FK for BranchID
    if (!existingFKNames.includes('FK_POP_Branch')) {
      try {
        await pool.request().query(`
          ALTER TABLE PurchaseOrderProducts
          ADD CONSTRAINT FK_POP_Branch 
          FOREIGN KEY (BranchID) REFERENCES Branchs(BranchID)
        `);
        console.log("  ✓ Added Foreign Key constraint to Branchs table");
      } catch (err) {
        console.log("  ⚠ Could not add FK_POP_Branch constraint (may have data integrity issues)");
      }
    } else {
      console.log("  ℹ FK_POP_Branch constraint already exists");
    }

    // Add FK for WarehouseID
    if (!existingFKNames.includes('FK_POP_Warehouse')) {
      try {
        await pool.request().query(`
          ALTER TABLE PurchaseOrderProducts
          ADD CONSTRAINT FK_POP_Warehouse 
          FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID)
        `);
        console.log("  ✓ Added Foreign Key constraint to Warehouses table");
      } catch (err) {
        console.log("  ⚠ Could not add FK_POP_Warehouse constraint (may have data integrity issues)");
      }
    } else {
      console.log("  ℹ FK_POP_Warehouse constraint already exists");
    }

    // Add FK for SLOCID
    if (!existingFKNames.includes('FK_POP_SLOC')) {
      try {
        await pool.request().query(`
          ALTER TABLE PurchaseOrderProducts
          ADD CONSTRAINT FK_POP_SLOC 
          FOREIGN KEY (SLOCID) REFERENCES SLOCs(SLOCID)
        `);
        console.log("  ✓ Added Foreign Key constraint to SLOCs table");
      } catch (err) {
        console.log("  ⚠ Could not add FK_POP_SLOC constraint (may have data integrity issues)");
      }
    } else {
      console.log("  ℹ FK_POP_SLOC constraint already exists");
    }

    console.log("\n✅ Migration 007 completed successfully!");
    console.log("\n📋 Summary:");
    console.log("   - PurchaseOrderProducts table now has all required columns");
    console.log("   - Added: VendorID, BranchID, WarehouseID, SLOCID, BatchNumber");
    console.log("   - Added: Pending_Quantity, Received_Quantity");
    console.log("   - Added: MRP, Discount, Total_Product_MRP, Total_Product_Discount, Total_Product_Amount");
    console.log("   - Added foreign key constraints for data integrity");

  } catch (error) {
    console.error("❌ Migration 007 failed:", error.message);
    throw error;
  }
}

async function down(pool) {
  console.log("\n🔄 Rolling back Migration 007...");

  try {
    // Drop foreign key constraints first
    const dropFKs = [
      "FK_POP_SLOC",
      "FK_POP_Warehouse",
      "FK_POP_Branch",
      "FK_POP_Vendor",
    ];

    for (const fkName of dropFKs) {
      const checkFK = await pool.request().query(`
        SELECT name FROM sys.foreign_keys 
        WHERE name = '${fkName}' AND parent_object_id = OBJECT_ID('PurchaseOrderProducts')
      `);
      if (checkFK.recordset.length > 0) {
        await pool.request().query(`
          ALTER TABLE PurchaseOrderProducts DROP CONSTRAINT ${fkName}
        `);
        console.log(`  ✓ Dropped constraint ${fkName}`);
      }
    }

    // Drop columns
    const columnsToRemove = [
      'Total_Product_Amount',
      'Total_Product_Discount',
      'Total_Product_MRP',
      'Discount',
      'MRP',
      'Received_Quantity',
      'Pending_Quantity',
      'BatchNumber',
      'SLOCID',
      'WarehouseID',
      'BranchID',
      'VendorID',
    ];

    for (const columnName of columnsToRemove) {
      const checkColumn = await pool.request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'PurchaseOrderProducts' AND COLUMN_NAME = '${columnName}'
      `);
      if (checkColumn.recordset.length > 0) {
        await pool.request().query(`
          ALTER TABLE PurchaseOrderProducts DROP COLUMN ${columnName}
        `);
        console.log(`  ✓ Dropped column ${columnName}`);
      }
    }

    console.log("✅ Migration 007 rollback completed");
  } catch (error) {
    console.error("❌ Rollback failed:", error.message);
    throw error;
  }
}

module.exports = { up, down };
