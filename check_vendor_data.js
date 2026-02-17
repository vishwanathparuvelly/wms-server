// check_vendor_data.js
const sql = require('mssql');
const config = require('config');

async function checkVendorData() {
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
        VendorID,
        VendorCode,
        VendorName,
        VendorDescription,
        BusinessType,
        ContactPerson,
        EmailAddress
      FROM Vendors 
      WHERE VendorCode = 'TEST002'
    `;
    
    const result = await pool.request().query(query);
    
    console.log('\n=== Vendor TEST002 Data ===\n');
    if (result.recordset.length > 0) {
      const vendor = result.recordset[0];
      console.log('VendorID:', vendor.VendorID);
      console.log('VendorCode:', vendor.VendorCode);
      console.log('VendorName:', vendor.VendorName);
      console.log('VendorDescription:', vendor.VendorDescription);
      console.log('BusinessType:', vendor.BusinessType);
      console.log('ContactPerson:', vendor.ContactPerson);
      console.log('EmailAddress:', vendor.EmailAddress);
    } else {
      console.log('No vendor found with code TEST002');
    }
    
    await pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkVendorData();
