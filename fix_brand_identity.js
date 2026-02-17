// Fix Brands table BrandID to be IDENTITY
const sql = require("mssql");
const config = require("config");

async function fixBrandID() {
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

    console.log("Connected to database. Fixing BrandID...");

    // Check if there are any records
    const countResult = await pool
      .request()
      .query("SELECT COUNT(*) as cnt FROM Brands");
    const recordCount = countResult.recordset[0].cnt;
    console.log(`Found ${recordCount} existing records`);

    if (recordCount > 0) {
      console.log("WARNING: Table has data. Will preserve existing records.");
    }

    // Drop existing BrandID column if it's not identity
    try {
      await pool.request().query("ALTER TABLE Brands DROP COLUMN BrandID");
      console.log("✓ Dropped existing BrandID column");
    } catch (err) {
      console.log("Note: Could not drop BrandID column:", err.message);
    }

    // Add BrandID as IDENTITY PRIMARY KEY
    await pool.request().query(`
      ALTER TABLE Brands ADD BrandID INT IDENTITY(1,1) NOT NULL
    `);
    console.log("✓ Added BrandID as IDENTITY column");

    // Set as primary key
    try {
      await pool.request().query(`
        ALTER TABLE Brands ADD CONSTRAINT PK_Brands PRIMARY KEY (BrandID)
      `);
      console.log("✓ Set BrandID as PRIMARY KEY");
    } catch (err) {
      console.log("Note: Could not add primary key:", err.message);
    }

    await pool.close();
    console.log("\n✅ BrandID fixed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

fixBrandID();
