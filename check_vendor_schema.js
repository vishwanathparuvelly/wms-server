// check_vendor_schema.js
const sql = require('mssql');
const config = require('config');

async function checkVendorSchema() {
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
    
    const query = `
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Vendors' 
      ORDER BY ORDINAL_POSITION
    `;
    
    const result = await pool.request().query(query);
    
    console.log('\n=== Vendors Table Schema ===\n');
    result.recordset.forEach(col => {
      const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`${col.COLUMN_NAME.padEnd(25)} ${col.DATA_TYPE.padEnd(15)}${length.padEnd(10)} ${nullable}`);
    });
    
    await pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkVendorSchema();
