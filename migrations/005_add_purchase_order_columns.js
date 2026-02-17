const config = require("config");
const sql = require("mssql");

// Migration: Add missing columns to PurchaseOrders table
// These columns are required by the PO update functionality

async function up() {
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
    console.log("Migration 005: Adding missing columns to PurchaseOrders table...");

    // Check and add DeliveryAddress column
    const checkDeliveryAddress = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'PurchaseOrders' 
      AND COLUMN_NAME = 'DeliveryAddress'
    `);

    if (checkDeliveryAddress.recordset[0].count === 0) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrders 
        ADD DeliveryAddress NVARCHAR(500) NULL
      `);
      console.log("✓ Added DeliveryAddress column");
    } else {
      console.log("→ DeliveryAddress column already exists");
    }

    // Check and add PersonInChargeInternal column
    const checkPersonInternal = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'PurchaseOrders' 
      AND COLUMN_NAME = 'PersonInChargeInternal'
    `);

    if (checkPersonInternal.recordset[0].count === 0) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrders 
        ADD PersonInChargeInternal NVARCHAR(100) NULL
      `);
      console.log("✓ Added PersonInChargeInternal column");
    } else {
      console.log("→ PersonInChargeInternal column already exists");
    }

    // Check and add PersonInChargeVendor column
    const checkPersonVendor = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'PurchaseOrders' 
      AND COLUMN_NAME = 'PersonInChargeVendor'
    `);

    if (checkPersonVendor.recordset[0].count === 0) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrders 
        ADD PersonInChargeVendor NVARCHAR(100) NULL
      `);
      console.log("✓ Added PersonInChargeVendor column");
    } else {
      console.log("→ PersonInChargeVendor column already exists");
    }

    // Check and add TransporterName column
    const checkTransporter = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'PurchaseOrders' 
      AND COLUMN_NAME = 'TransporterName'
    `);

    if (checkTransporter.recordset[0].count === 0) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrders 
        ADD TransporterName NVARCHAR(100) NULL
      `);
      console.log("✓ Added TransporterName column");
    } else {
      console.log("→ TransporterName column already exists");
    }

    // Check and add VehicleNumber column
    const checkVehicle = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'PurchaseOrders' 
      AND COLUMN_NAME = 'VehicleNumber'
    `);

    if (checkVehicle.recordset[0].count === 0) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrders 
        ADD VehicleNumber NVARCHAR(50) NULL
      `);
      console.log("✓ Added VehicleNumber column");
    } else {
      console.log("→ VehicleNumber column already exists");
    }

    // Check and add LRNumber column
    const checkLRNumber = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'PurchaseOrders' 
      AND COLUMN_NAME = 'LRNumber'
    `);

    if (checkLRNumber.recordset[0].count === 0) {
      await pool.request().query(`
        ALTER TABLE PurchaseOrders 
        ADD LRNumber NVARCHAR(50) NULL
      `);
      console.log("✓ Added LRNumber column");
    } else {
      console.log("→ LRNumber column already exists");
    }

    console.log("✓ Migration 005 completed successfully");
  } catch (err) {
    console.error("✗ Migration 005 failed:", err.message);
    throw err;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

async function down() {
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
    console.log("Rolling back migration 005...");

    // Drop columns in reverse order
    await pool.request().query(`
      ALTER TABLE PurchaseOrders DROP COLUMN IF EXISTS LRNumber
    `);
    await pool.request().query(`
      ALTER TABLE PurchaseOrders DROP COLUMN IF EXISTS VehicleNumber
    `);
    await pool.request().query(`
      ALTER TABLE PurchaseOrders DROP COLUMN IF EXISTS TransporterName
    `);
    await pool.request().query(`
      ALTER TABLE PurchaseOrders DROP COLUMN IF EXISTS PersonInChargeVendor
    `);
    await pool.request().query(`
      ALTER TABLE PurchaseOrders DROP COLUMN IF EXISTS PersonInChargeInternal
    `);
    await pool.request().query(`
      ALTER TABLE PurchaseOrders DROP COLUMN IF EXISTS DeliveryAddress
    `);

    console.log("✓ Migration 005 rolled back successfully");
  } catch (err) {
    console.error("✗ Rollback failed:", err.message);
    throw err;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

module.exports = { up, down };
