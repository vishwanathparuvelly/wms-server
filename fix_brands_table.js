// Fix Brands table to add missing columns
const sql = require("mssql");
const config = require("config");

async function fixBrandsTable() {
  try {
    const dbConfig = {
      user: config.database.DB_USER,
      password: config.database.DB_PASSWORD,
      server: config.database.DB_SERVER,
      database: config.database.DB_NAME,
      port: parseInt(config.database.DB_PORT, 10),
      options: {
        encrypt: config.database.DB_ENCRYPT === "true",
        trustServerCertificate: config.database.DB_TRUST_SERVER_CERT === "true",
      },
    };

    const pool = await sql.connect(dbConfig);

    console.log("Connected to database. Updating Brands table...");

    // Check and add IsDeleted column
    const checkIsDeleted = await pool.request().query(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Brands' AND COLUMN_NAME = 'IsDeleted'
    `);

    if (checkIsDeleted.recordset.length === 0) {
      await pool.request().query(`
        ALTER TABLE Brands ADD IsDeleted BIT NOT NULL DEFAULT 0
      `);
      console.log("✓ Added IsDeleted column");
    } else {
      console.log("✓ IsDeleted column already exists");
    }

    // Check and add BrandID column if missing
    const checkBrandID = await pool.request().query(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Brands' AND COLUMN_NAME = 'BrandID'
    `);

    if (checkBrandID.recordset.length === 0) {
      await pool.request().query(`
        ALTER TABLE Brands ADD BrandID INT IDENTITY(1,1) PRIMARY KEY
      `);
      console.log("✓ Added BrandID column");
    }

    // Check and add BrandCode column if missing
    const checkBrandCode = await pool.request().query(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Brands' AND COLUMN_NAME = 'BrandCode'
    `);

    if (checkBrandCode.recordset.length === 0) {
      await pool.request().query(`
        ALTER TABLE Brands ADD BrandCode NVARCHAR(50) NULL
      `);
      console.log("✓ Added BrandCode column");
    }

    // Check and add CreatedBy column if missing
    const checkCreatedBy = await pool.request().query(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Brands' AND COLUMN_NAME = 'CreatedBy'
    `);

    if (checkCreatedBy.recordset.length === 0) {
      await pool.request().query(`
        ALTER TABLE Brands ADD CreatedBy INT NOT NULL DEFAULT 1
      `);
      console.log("✓ Added CreatedBy column");
    }

    // Check and add UpdatedBy column if missing
    const checkUpdatedBy = await pool.request().query(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Brands' AND COLUMN_NAME = 'UpdatedBy'
    `);

    if (checkUpdatedBy.recordset.length === 0) {
      await pool.request().query(`
        ALTER TABLE Brands ADD UpdatedBy INT NOT NULL DEFAULT 1
      `);
      console.log("✓ Added UpdatedBy column");
    }

    // Check and add CreatedDate column if missing
    const checkCreatedDate = await pool.request().query(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Brands' AND COLUMN_NAME = 'CreatedDate'
    `);

    if (checkCreatedDate.recordset.length === 0) {
      await pool.request().query(`
        ALTER TABLE Brands ADD CreatedDate DATETIME NOT NULL DEFAULT GETDATE()
      `);
      console.log("✓ Added CreatedDate column");
    }

    // Check and add UpdatedDate column if missing
    const checkUpdatedDate = await pool.request().query(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Brands' AND COLUMN_NAME = 'UpdatedDate'
    `);

    if (checkUpdatedDate.recordset.length === 0) {
      await pool.request().query(`
        ALTER TABLE Brands ADD UpdatedDate DATETIME NOT NULL DEFAULT GETDATE()
      `);
      console.log("✓ Added UpdatedDate column");
    }

    await pool.close();
    console.log("\n✅ Brands table updated successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

fixBrandsTable();
