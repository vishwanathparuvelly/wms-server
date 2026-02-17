// Add DEFAULT constraints to Brands table columns
const sql = require("mssql");
const config = require("config");

async function addDefaults() {
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

    console.log("Adding DEFAULT constraints to Brands table...");

    // Add default for IsDeleted
    try {
      await pool.request().query(`
        ALTER TABLE Brands ADD CONSTRAINT DF_Brands_IsDeleted DEFAULT 0 FOR IsDeleted
      `);
      console.log("✓ Added DEFAULT 0 for IsDeleted");
    } catch (err) {
      console.log("Note: IsDeleted default -", err.message);
    }

    // Add default for CreatedDate
    try {
      await pool.request().query(`
        ALTER TABLE Brands ADD CONSTRAINT DF_Brands_CreatedDate DEFAULT GETDATE() FOR CreatedDate
      `);
      console.log("✓ Added DEFAULT GETDATE() for CreatedDate");
    } catch (err) {
      console.log("Note: CreatedDate default -", err.message);
    }

    // Add default for UpdatedDate
    try {
      await pool.request().query(`
        ALTER TABLE Brands ADD CONSTRAINT DF_Brands_UpdatedDate DEFAULT GETDATE() FOR UpdatedDate
      `);
      console.log("✓ Added DEFAULT GETDATE() for UpdatedDate");
    } catch (err) {
      console.log("Note: UpdatedDate default -", err.message);
    }

    await pool.close();
    console.log("\n✅ Defaults added successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed:", error.message);
    process.exit(1);
  }
}

addDefaults();
