const config = require("config");
const sql = require("mssql");

async function checkPurchaseOrdersSchema() {
  const dbConfig = {
    user: config.get("database.DB_USER"),
    password: config.get("database.DB_PASSWORD"),
    server: config.get("database.DB_SERVER"),
    database: config.get("database.DB_NAME"),
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  };

  let pool;
  try {
    pool = await sql.connect(dbConfig);
    console.log("\n📊 Checking PurchaseOrders Table Schema...\n");

    // Get all columns
    const result = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PurchaseOrders'
      ORDER BY ORDINAL_POSITION
    `);

    console.log(`Found ${result.recordset.length} columns:\n`);
    
    const expectedColumns = [
      'PurchaseOrderID',
      'PurchaseOrderNumber',
      'PurchaseOrderDate',
      'DeliveryDate',
      'PurchaseOrderStatus',
      'VendorID',
      'WarehouseID',
      'BranchID',
      'DeliveryAddress',
      'PersonInChargeInternal',
      'PersonInChargeVendor',
      'TransporterName',
      'VehicleNumber',
      'LRNumber',
      'Remarks',
      'IsDeleted',
      'CreatedBy',
      'UpdatedBy',
      'CreatedDate',
      'UpdatedDate'
    ];

    const foundColumns = result.recordset.map(col => col.COLUMN_NAME);
    
    result.recordset.forEach((col) => {
      const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.COLUMN_DEFAULT ? ` DEFAULT ${col.COLUMN_DEFAULT}` : '';
      console.log(`  ✓ ${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE}${length.padEnd(10)} ${nullable}${defaultVal}`);
    });

    // Check for missing columns
    console.log('\n📋 Column Status Check:\n');
    const missingColumns = [];
    
    expectedColumns.forEach(colName => {
      if (foundColumns.includes(colName)) {
        console.log(`  ✅ ${colName}`);
      } else {
        console.log(`  ❌ ${colName} - MISSING`);
        missingColumns.push(colName);
      }
    });

    if (missingColumns.length > 0) {
      console.log(`\n⚠️  WARNING: ${missingColumns.length} required columns are missing!`);
      console.log(`   Missing columns: ${missingColumns.join(', ')}`);
      console.log('\n💡 Run migration 005 to add missing columns:');
      console.log('   node run-migrations.js\n');
    } else {
      console.log('\n✅ All required columns are present!\n');
    }

  } catch (err) {
    console.error("❌ Error checking schema:", err.message);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkPurchaseOrdersSchema();
