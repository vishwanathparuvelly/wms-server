const sql = require("mssql");

/**
 * Migration 008: Add Quarantine tracking to PurchaseOrderReceivings
 * 
 * Use Case: Pharma materials need quarantine period after receiving
 * - QuarantineEndDate: When quarantine expires (MANDATORY when received)
 * - QuarantineRemark: Optional notes about quarantine
 * 
 * Business Logic:
 * - When status changes to "Received", QuarantineEndDate is mandatory
 * - Shows "Still X days in quarantine" before end date
 * - Shows "Quarantine Completed" on/after end date
 * - Quarantine date is editable (mistakes can happen)
 */

async function up(pool) {
  console.log("\n🔄 Migration 008: Adding Quarantine tracking to PurchaseOrderReceivings...");

  try {
    // Check if columns already exist
    const checkQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'PurchaseOrderReceivings' 
      AND COLUMN_NAME IN ('QuarantineEndDate', 'QuarantineRemark')
    `;
    const existingColumns = await pool.request().query(checkQuery);
    const existingColumnNames = existingColumns.recordset.map(row => row.COLUMN_NAME);

    // Add QuarantineEndDate
    if (!existingColumnNames.includes('QuarantineEndDate')) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderReceivings 
        ADD QuarantineEndDate DATE NULL
      `);
      console.log("  ✓ Added QuarantineEndDate column");
    } else {
      console.log("  ℹ QuarantineEndDate column already exists");
    }

    // Add QuarantineRemark
    if (!existingColumnNames.includes('QuarantineRemark')) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderReceivings 
        ADD QuarantineRemark NVARCHAR(500) NULL
      `);
      console.log("  ✓ Added QuarantineRemark column");
    } else {
      console.log("  ℹ QuarantineRemark column already exists");
    }

    console.log("\n✅ Migration 008 completed successfully!");
    console.log("\n📋 Summary:");
    console.log("   - PurchaseOrderReceivings now tracks quarantine periods");
    console.log("   - QuarantineEndDate stores when materials can be released");
    console.log("   - QuarantineRemark for optional notes");
    console.log("   - Supports Pharma quality control requirements");

  } catch (error) {
    console.error("❌ Migration 008 failed:", error.message);
    throw error;
  }
}

async function down(pool) {
  console.log("\n🔄 Rolling back Migration 008...");

  try {
    // Drop columns in reverse order
    const columnsToRemove = ['QuarantineRemark', 'QuarantineEndDate'];

    for (const columnName of columnsToRemove) {
      const checkColumn = await pool.request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'PurchaseOrderReceivings' AND COLUMN_NAME = '${columnName}'
      `);
      if (checkColumn.recordset.length > 0) {
        await pool.request().query(`
          ALTER TABLE PurchaseOrderReceivings DROP COLUMN ${columnName}
        `);
        console.log(`  ✓ Dropped column ${columnName}`);
      }
    }

    console.log("✅ Migration 008 rollback completed");
  } catch (error) {
    console.error("❌ Rollback failed:", error.message);
    throw error;
  }
}

module.exports = { up, down };
