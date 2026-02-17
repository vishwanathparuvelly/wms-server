// run-migrations.js
const sql = require("mssql");
const config = require("config");

const {
  createPurchaseOrderReceivingsTable,
} = require("./migrations/001_create_purchaseOrderReceivings_table");
const {
  createBinProductsTables,
} = require("./migrations/002_create_bin_products_tables");
const { up: addVendorColumns } = require("./migrations/003_add_vendor_columns");
const { up: fixVendorEmailConstraint } = require("./migrations/004_fix_vendor_email_unique_constraint");
const { up: addPurchaseOrderColumns } = require("./migrations/005_add_purchase_order_columns");
const { up: addMaterialSupportToPO } = require("./migrations/006_add_material_support_to_po");
const { up: addPurchaseOrderProductsColumns } = require("./migrations/007_add_purchaseorderproducts_columns");
const { up: addQuarantineToReceiving } = require("./migrations/008_add_quarantine_to_receiving");
const { up: addMaterialSupportToBinProducts } = require("./migrations/009_add_material_support_to_bin_products");

async function runMigrations() {
  let pool;
  try {
    // Get database config
    const dbConfig = config.get("database");
    const connectionConfig = {
      user: dbConfig.DB_USER,
      password: dbConfig.DB_PASSWORD,
      server: dbConfig.DB_SERVER,
      port: dbConfig.DB_PORT ? parseInt(dbConfig.DB_PORT, 10) : undefined,
      database: dbConfig.DB_NAME,
      options: {
        encrypt: Boolean(dbConfig.DB_ENCRYPT),
        trustServerCertificate: Boolean(dbConfig.DB_TRUST_SERVER_CERT),
      },
      pool: {
        max: dbConfig.DB_POOL_MAX ?? 10,
        min: dbConfig.DB_POOL_MIN ?? 0,
        idleTimeoutMillis: dbConfig.DB_POOL_IDLE ?? 30000,
      },
    };

    // Create connection pool
    pool = new sql.ConnectionPool(connectionConfig);
    await pool.connect();

    console.log("\n🔧 Starting Database Migrations...\n");

    // Run migration 001
    console.log("📋 Migration 001: Creating PurchaseOrderReceivings table...");
    await createPurchaseOrderReceivingsTable(pool);

    console.log(
      "📋 Migration 002: Creating BinProducts and BinProductLogs tables...",
    );
    await createBinProductsTables(pool);

    console.log(
      "📋 Migration 003: Adding VendorDescription and BusinessType columns...",
    );
    await addVendorColumns(pool);

    console.log(
      "📋 Migration 004: Fixing EmailAddress UNIQUE constraint...",
    );
    await fixVendorEmailConstraint(pool);

    console.log(
      "📋 Migration 005: Adding missing PurchaseOrders columns...",
    );
    await addPurchaseOrderColumns(pool);

    console.log(
      "📋 Migration 006: Adding Material support to PurchaseOrderProducts...",
    );
    await addMaterialSupportToPO(pool);

    console.log(
      "📋 Migration 007: Adding missing columns to PurchaseOrderProducts...",
    );
    await addPurchaseOrderProductsColumns(pool);

    console.log(
      "📋 Migration 008: Adding Quarantine tracking to PurchaseOrderReceivings...",
    );
    await addQuarantineToReceiving(pool);

    console.log(
      "📋 Migration 009: Adding Material support to BinProducts and BinProductLogs...",
    );
    await addMaterialSupportToBinProducts(pool);

    console.log("\n✅ All migrations completed successfully!\n");

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Migration failed:", err.message);
    if (pool) {
      await pool.close();
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
