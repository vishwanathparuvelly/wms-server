const config = require("config");
const sql = require("mssql");

async function checkPurchaseOrderProductsSchema() {
  try {
    const dbConfig = {
      user: config.database.DB_USER,
      password: config.database.DB_PASSWORD,
      server: config.database.DB_SERVER,
      database: config.database.DB_NAME,
      port: parseInt(config.database.DB_PORT),
      options: {
        encrypt: config.database.DB_ENCRYPT,
        trustServerCertificate: config.database.DB_TRUST_SERVER_CERT,
      },
      pool: {
        max: config.database.DB_POOL_MAX,
        min: config.database.DB_POOL_MIN,
        idleTimeoutMillis: config.database.DB_POOL_IDLE,
      },
    };
    const pool = await sql.connect(dbConfig);
    console.log("\n📋 Checking PurchaseOrderProducts table schema...\n");

    // Get all columns from the table
    const query = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        CHARACTER_MAXIMUM_LENGTH,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PurchaseOrderProducts'
      ORDER BY ORDINAL_POSITION
    `;

    const result = await pool.request().query(query);

    console.log("Columns found in database:");
    console.log("=" .repeat(80));
    result.recordset.forEach((col, index) => {
      const nullable = col.IS_NULLABLE === "YES" ? "NULL" : "NOT NULL";
      const length = col.CHARACTER_MAXIMUM_LENGTH
        ? `(${col.CHARACTER_MAXIMUM_LENGTH})`
        : "";
      console.log(
        `${(index + 1).toString().padStart(2)}. ${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE.padEnd(15)}${length.padEnd(8)} ${nullable}`,
      );
    });

    // Expected columns based on PO_Service.js code
    const expectedColumns = [
      "PurchaseOrderProductID",
      "PurchaseOrderID",
      "VendorID",
      "BranchID",
      "WarehouseID",
      "ProductID",
      "MaterialID",
      "UOMID",
      "SLOCID",
      "BatchNumber",
      "Quantity",
      "Pending_Quantity",
      "Received_Quantity",
      "MRP",
      "Discount",
      "Total_Product_MRP",
      "Total_Product_Discount",
      "Total_Product_Amount",
      "IsDeleted",
      "CreatedBy",
      "UpdatedBy",
      "CreatedDate",
      "UpdatedDate",
    ];

    console.log("\n\n📊 Column Status Verification:");
    console.log("=" .repeat(80));

    const existingColumns = result.recordset.map((col) => col.COLUMN_NAME);

    expectedColumns.forEach((colName) => {
      const exists = existingColumns.includes(colName);
      const status = exists ? "✅ Present" : "❌ Missing";
      console.log(`${status.padEnd(15)} ${colName}`);
    });

    const missingColumns = expectedColumns.filter(
      (col) => !existingColumns.includes(col),
    );

    if (missingColumns.length > 0) {
      console.log("\n\n⚠️  MISSING COLUMNS:");
      console.log("These columns are required by the backend code but missing from database:");
      missingColumns.forEach((col) => {
        console.log(`   - ${col}`);
      });
      console.log(
        "\n💡 You need to create a migration to add these missing columns.",
      );
    } else {
      console.log(
        "\n\n✅ All expected columns are present in the database!",
      );
    }

    await pool.close();
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

checkPurchaseOrderProductsSchema();
