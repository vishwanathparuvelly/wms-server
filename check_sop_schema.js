const config = require('config');
const sql = require('mssql');

const dbConfig = {
    user: config.database.DB_USER,
    password: config.database.DB_PASSWORD,
    server: config.database.DB_SERVER,
    database: config.database.DB_NAME,
    port: parseInt(config.database.DB_PORT, 10),
    options: {
        encrypt: config.database.DB_ENCRYPT === 'true',
        trustServerCertificate: config.database.DB_TRUST_SERVER_CERT === 'true'
    }
};

(async () => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'SalesOrderProducts' 
            ORDER BY ORDINAL_POSITION
        `);
        console.log('SalesOrderProducts table schema:');
        console.log(JSON.stringify(result.recordset, null, 2));
        await pool.close();
        process.exit(0);
    } catch(err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
