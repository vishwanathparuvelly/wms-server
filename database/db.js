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
    },
    pool: {
        max: parseInt(config.database.DB_POOL_MAX, 10) || 20, // Adjustable via env
        min: parseInt(config.database.DB_POOL_MIN, 10) || 2,
        idleTimeoutMillis: parseInt(config.database.DB_POOL_IDLE, 10) || 30000
    }
};


async function initializePool() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log(`SQL Server pool initialized for DB=> ${dbConfig.database}`);
        return pool;
    } catch (err) {
        console.error('Failed to initialize SQL Server pool:', err);
        throw err;
    }
}

module.exports = initializePool;