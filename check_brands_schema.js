// Check Brands table schema
const sql = require("mssql");
const config = require("config");

async function checkBrandsSchema() {
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

    console.log("Checking Brands table schema...\n");

    const result = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Brands'
      ORDER BY ORDINAL_POSITION
    `);

    console.table(result.recordset);

    // Check for identity column
    const identityResult = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        IDENT_SEED(TABLE_NAME) AS SEED,
        IDENT_INCR(TABLE_NAME) AS INCREMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Brands' 
        AND COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') = 1
    `);

    if (identityResult.recordset.length > 0) {
      console.log("\nIdentity Column:");
      console.table(identityResult.recordset);
    }

    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkBrandsSchema();
