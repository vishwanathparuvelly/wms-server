// migrations/004_fix_vendor_email_unique_constraint.js

async function up(pool) {
  console.log('Running migration: Fix Vendor EmailAddress UNIQUE constraint to allow multiple NULLs');
  
  try {
    // Drop existing UNIQUE constraint on EmailAddress
    const dropConstraintQuery = `
      IF EXISTS (
        SELECT * FROM sys.indexes 
        WHERE object_id = OBJECT_ID('Vendors') 
        AND name = 'UQ__Vendors__49A14740D4471102'
      )
      BEGIN
        ALTER TABLE Vendors DROP CONSTRAINT UQ__Vendors__49A14740D4471102;
        PRINT 'Dropped old EmailAddress UNIQUE constraint';
      END
    `;
    
    await pool.request().query(dropConstraintQuery);
    
    // Create filtered unique index that only applies to non-NULL values
    // This allows multiple NULL values but ensures uniqueness for non-NULL values
    const createFilteredIndexQuery = `
      IF NOT EXISTS (
        SELECT * FROM sys.indexes 
        WHERE object_id = OBJECT_ID('Vendors') 
        AND name = 'UQ_Vendors_EmailAddress'
      )
      BEGIN
        CREATE UNIQUE NONCLUSTERED INDEX UQ_Vendors_EmailAddress
        ON Vendors(EmailAddress)
        WHERE EmailAddress IS NOT NULL;
        PRINT 'Created filtered unique index on EmailAddress (allows multiple NULLs)';
      END
    `;
    
    await pool.request().query(createFilteredIndexQuery);
    
    console.log('✓ Migration completed: Fixed EmailAddress UNIQUE constraint');
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  }
}

async function down(pool) {
  console.log('Rolling back migration: Restore original EmailAddress UNIQUE constraint');
  
  try {
    // Drop filtered unique index
    const dropFilteredIndexQuery = `
      IF EXISTS (
        SELECT * FROM sys.indexes 
        WHERE object_id = OBJECT_ID('Vendors') 
        AND name = 'UQ_Vendors_EmailAddress'
      )
      BEGIN
        DROP INDEX UQ_Vendors_EmailAddress ON Vendors;
        PRINT 'Dropped filtered unique index on EmailAddress';
      END
    `;
    
    await pool.request().query(dropFilteredIndexQuery);
    
    // Recreate original constraint (this will fail if there are multiple NULLs)
    const createOriginalConstraintQuery = `
      IF NOT EXISTS (
        SELECT * FROM sys.indexes 
        WHERE object_id = OBJECT_ID('Vendors') 
        AND name LIKE 'UQ__Vendors__49A147%'
      )
      BEGIN
        ALTER TABLE Vendors ADD CONSTRAINT UQ_Vendors_EmailAddress_Original UNIQUE (EmailAddress);
        PRINT 'Recreated original UNIQUE constraint on EmailAddress';
      END
    `;
    
    await pool.request().query(createOriginalConstraintQuery);
    
    console.log('✓ Rollback completed');
  } catch (error) {
    console.error('Rollback failed:', error.message);
    throw error;
  }
}

module.exports = { up, down };
