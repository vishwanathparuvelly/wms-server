// check_vendor_constraints.js
const sql = require('mssql');
const config = require('config');

async function checkVendorConstraints() {
  try {
    const dbSettings = config.get('database');
    const dbConfig = {
      user: dbSettings.DB_USER,
      password: dbSettings.DB_PASSWORD,
      server: dbSettings.DB_SERVER,
      port: parseInt(dbSettings.DB_PORT),
      database: dbSettings.DB_NAME,
      options: {
        encrypt: dbSettings.DB_ENCRYPT,
        trustServerCertificate: dbSettings.DB_TRUST_SERVER_CERT,
      },
    };
    
    const pool = await sql.connect(dbConfig);
    
    // Check indexes and constraints
    const query = `
      SELECT 
        i.name AS IndexName,
        i.is_unique AS IsUnique,
        i.is_primary_key AS IsPrimaryKey,
        COL_NAME(ic.object_id, ic.column_id) AS ColumnName,
        i.type_desc AS IndexType
      FROM sys.indexes i
      INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      WHERE i.object_id = OBJECT_ID('Vendors')
      ORDER BY i.name, ic.key_ordinal
    `;
    
    const result = await pool.request().query(query);
    
    console.log('\n=== Vendors Table Indexes and Constraints ===\n');
    result.recordset.forEach(row => {
      console.log(`Index: ${row.IndexName}`);
      console.log(`  Column: ${row.ColumnName}`);
      console.log(`  Unique: ${row.IsUnique ? 'YES' : 'NO'}`);
      console.log(`  Primary Key: ${row.IsPrimaryKey ? 'YES' : 'NO'}`);
      console.log(`  Type: ${row.IndexType}`);
      console.log('');
    });
    
    // Check for existing NULL EmailAddress values
    const nullCheckQuery = `
      SELECT COUNT(*) as NullCount 
      FROM Vendors 
      WHERE EmailAddress IS NULL AND IsDeleted = 0
    `;
    
    const nullResult = await pool.request().query(nullCheckQuery);
    console.log(`\nVendors with NULL EmailAddress: ${nullResult.recordset[0].NullCount}`);
    
    await pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkVendorConstraints();
