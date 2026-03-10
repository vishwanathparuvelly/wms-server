const config = require('config');
const sql = require('mssql');

function isIpAddress(host) {
    if (!host || typeof host !== 'string') return false;
    const trimmed = host.trim();
    const ipv4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    const ipv6 = /^\[?([0-9a-fA-F:]+)\]?$/;
    return ipv4.test(trimmed) || ipv6.test(trimmed);
}

const server = config.database.DB_SERVER;
const useEncrypt = config.database.DB_ENCRYPT === 'true';
// Node TLS does not allow IP as ServerName (SNI). When server is an IP, disable encrypt to avoid TLS handshake.
const encrypt = useEncrypt && !isIpAddress(server);

const dbConfig = {
    user: config.database.DB_USER,
    password: config.database.DB_PASSWORD,
    server,
    database: config.database.DB_NAME,
    port: parseInt(config.database.DB_PORT, 10),
    options: {
        encrypt,
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