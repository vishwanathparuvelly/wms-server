// Migration: Add MaterialID support to PurchaseOrderProducts
// This enables dual-reference model: Materials (Pharma) OR Products (FMCG/Trading)
// Uses the pool passed by run-migrations.js (no separate connection).

async function up(pool) {
  if (!pool) {
    throw new Error("Migration 006 requires a pool from run-migrations");
  }
  try {
    console.log("Migration 006: Adding Material support to PurchaseOrderProducts table...");

    // Step 1: Check and add MaterialID column
    const checkMaterialID = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'PurchaseOrderProducts' 
      AND COLUMN_NAME = 'MaterialID'
    `);

    if (checkMaterialID.recordset[0].count === 0) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderProducts 
        ADD MaterialID INT NULL
      `);
      console.log("✓ Added MaterialID column");
    } else {
      console.log("→ MaterialID column already exists");
    }

    // Step 1.5: Make ProductID nullable to support dual-reference model
    const checkProductIDNullable = await pool.request().query(`
      SELECT IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'PurchaseOrderProducts' 
      AND COLUMN_NAME = 'ProductID'
    `);

    if (checkProductIDNullable.recordset[0]?.IS_NULLABLE === 'NO') {
      // Drop the check constraint temporarily if it exists
      const checkConstraintExists = await pool.request().query(`
        SELECT COUNT(*) as count
        FROM sys.check_constraints
        WHERE name = 'CHK_POP_ItemReference'
      `);
      
      if (checkConstraintExists.recordset[0].count > 0) {
        await pool.request().query(`
          ALTER TABLE PurchaseOrderProducts 
          DROP CONSTRAINT CHK_POP_ItemReference
        `);
      }

      // Alter ProductID to allow NULL
      await pool.request().query(`
        ALTER TABLE PurchaseOrderProducts 
        ALTER COLUMN ProductID INT NULL
      `);
      console.log("✓ Made ProductID column nullable");
    } else {
      console.log("→ ProductID column is already nullable");
    }

    // Step 2: Add Foreign Key constraint to Materials table
    const checkFK = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM sys.foreign_keys
      WHERE name = 'FK_PurchaseOrderProducts_Material'
    `);

    if (checkFK.recordset[0].count === 0) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderProducts
        ADD CONSTRAINT FK_PurchaseOrderProducts_Material 
        FOREIGN KEY (MaterialID) REFERENCES Materials(MaterialID)
      `);
      console.log("✓ Added Foreign Key constraint to Materials table");
    } else {
      console.log("→ Foreign Key constraint already exists");
    }

    // Step 3: Add Check Constraint (at least ProductID OR MaterialID must exist)
    const checkConstraint = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM sys.check_constraints
      WHERE name = 'CHK_POP_ItemReference'
    `);

    if (checkConstraint.recordset[0].count === 0) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderProducts
        ADD CONSTRAINT CHK_POP_ItemReference 
        CHECK (ProductID IS NOT NULL OR MaterialID IS NOT NULL)
      `);
      console.log("✓ Added Check constraint (ProductID OR MaterialID required)");
    } else {
      console.log("→ Check constraint already exists");
    }

    // Step 4: Update existing NULL ProductID rows if any (data integrity)
    const nullCheck = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM PurchaseOrderProducts
      WHERE ProductID IS NULL AND MaterialID IS NULL
    `);

    if (nullCheck.recordset[0].count > 0) {
      console.log(`⚠️  WARNING: Found ${nullCheck.recordset[0].count} rows with NULL ProductID and MaterialID`);
      console.log("   Please manually fix these rows or they will violate the check constraint");
    } else {
      console.log("✓ No data integrity issues found");
    }

    console.log("✓ Migration 006 completed successfully");
    console.log("\n📋 Summary:");
    console.log("   - PurchaseOrderProducts now supports both Materials and Products");
    console.log("   - Pharma domain can use MaterialID");
    console.log("   - FMCG/Trading domains can continue using ProductID");
    console.log("   - At least one reference (ProductID or MaterialID) is required\n");

  } catch (err) {
    console.error("✗ Migration 006 failed:", err.message);
    throw err;
  }
}

async function down(pool) {
  if (!pool) {
    throw new Error("Migration 006 down() requires a pool");
  }
  try {
    console.log("Rolling back migration 006...");

    // Drop constraints and column in reverse order
    await pool.request().query(`
      ALTER TABLE PurchaseOrderProducts 
      DROP CONSTRAINT IF EXISTS CHK_POP_ItemReference
    `);
    console.log("✓ Dropped Check constraint");

    await pool.request().query(`
      ALTER TABLE PurchaseOrderProducts 
      DROP CONSTRAINT IF EXISTS FK_PurchaseOrderProducts_Material
    `);
    console.log("✓ Dropped Foreign Key constraint");

    await pool.request().query(`
      ALTER TABLE PurchaseOrderProducts 
      DROP COLUMN IF EXISTS MaterialID
    `);
    console.log("✓ Dropped MaterialID column");

    console.log("✓ Migration 006 rolled back successfully");
  } catch (err) {
    console.error("✗ Rollback failed:", err.message);
    throw err;
  }
}

module.exports = { up, down };
