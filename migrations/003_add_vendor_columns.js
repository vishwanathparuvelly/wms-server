// migrations/003_add_vendor_columns.js

async function up(pool) {
  console.log('Running migration: Add VendorDescription and BusinessType columns to Vendors table');
  
  try {
    // Check if columns already exist
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Vendors' 
      AND COLUMN_NAME IN ('VendorDescription', 'BusinessType')
    `;
    
    const checkResult = await pool.request().query(checkQuery);
    const existingColumns = checkResult.recordset[0].count;
    
    if (existingColumns === 2) {
      console.log('Columns already exist, skipping migration');
      return;
    }
    
    // Add VendorDescription column if it doesn't exist
    const addDescriptionQuery = `
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Vendors' AND COLUMN_NAME = 'VendorDescription'
      )
      BEGIN
        ALTER TABLE Vendors ADD VendorDescription NVARCHAR(500) NULL;
        PRINT 'Added VendorDescription column';
      END
    `;
    
    await pool.request().query(addDescriptionQuery);
    
    // Add BusinessType column if it doesn't exist
    const addBusinessTypeQuery = `
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Vendors' AND COLUMN_NAME = 'BusinessType'
      )
      BEGIN
        ALTER TABLE Vendors ADD BusinessType NVARCHAR(100) NULL;
        PRINT 'Added BusinessType column';
      END
    `;
    
    await pool.request().query(addBusinessTypeQuery);
    
    console.log('✓ Migration completed: Added vendor columns');
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  }
}

async function down(pool) {
  console.log('Rolling back migration: Remove VendorDescription and BusinessType columns');
  
  try {
    // Remove BusinessType column if it exists
    const dropBusinessTypeQuery = `
      IF EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Vendors' AND COLUMN_NAME = 'BusinessType'
      )
      BEGIN
        ALTER TABLE Vendors DROP COLUMN BusinessType;
        PRINT 'Dropped BusinessType column';
      END
    `;
    
    await pool.request().query(dropBusinessTypeQuery);
    
    // Remove VendorDescription column if it exists
    const dropDescriptionQuery = `
      IF EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Vendors' AND COLUMN_NAME = 'VendorDescription'
      )
      BEGIN
        ALTER TABLE Vendors DROP COLUMN VendorDescription;
        PRINT 'Dropped VendorDescription column';
      END
    `;
    
    await pool.request().query(dropDescriptionQuery);
    
    console.log('✓ Rollback completed');
  } catch (error) {
    console.error('Rollback failed:', error.message);
    throw error;
  }
}

module.exports = { up, down };
