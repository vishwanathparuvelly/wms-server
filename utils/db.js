// utils/db.js

const sql = require("mssql");
// Use the 'config' package to read configuration files
const config = require("config");

/**
 * This module reads DB configuration from your `config/default.json`,
 * creates a single connection pool, and exports it for the entire application to use.
 */

// Get the database configuration object from default.json
// The string 'database' must match the key in your JSON file.
const dbConfig = config.get("database");

if (!dbConfig) {
  throw new Error(
    "FATAL ERROR: Database configuration not found in config file. Make sure 'database' object exists in your default.json."
  );
}

// Create a new connection pool with the loaded configuration.
const pool = new sql.ConnectionPool(dbConfig);
const poolConnect = pool.connect();

// Handle connection errors
pool.on("error", (err) => {
  console.error("Database Pool Error:", err);
});

// We export the pool object itself.
// Other modules (like controllers and services) can now import this
// to query the database without needing to manage connections.
module.exports = {
  pool,
  poolConnect, // You can await this in your server's startup file to ensure DB is connected before listening.
};
