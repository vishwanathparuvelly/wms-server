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
        console.log('Connected to database');
        
        // Check if columns already exist
        const checkQuery = `
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'SalesOrderProducts' 
            AND COLUMN_NAME IN ('CustomerID', 'BranchID', 'WarehouseID', 'SLOCID', 'Discount', 'Pending_Quantity', 'Picked_Quantity', 'Total_Product_MRP', 'Total_Product_Discount', 'Total_Product_Amount')
        `;
        
        const existingColumns = await pool.request().query(checkQuery);
        const existing = existingColumns.recordset.map(r => r.COLUMN_NAME);
        
        console.log('Existing columns from the expected list:', existing);
        
        const alterQueries = [];
        
        if (!existing.includes('CustomerID')) {
            alterQueries.push(`ALTER TABLE SalesOrderProducts ADD CustomerID INT NULL;`);
        }
        if (!existing.includes('BranchID')) {
            alterQueries.push(`ALTER TABLE SalesOrderProducts ADD BranchID INT NULL;`);
        }
        if (!existing.includes('WarehouseID')) {
            alterQueries.push(`ALTER TABLE SalesOrderProducts ADD WarehouseID INT NULL;`);
        }
        if (!existing.includes('SLOCID')) {
            alterQueries.push(`ALTER TABLE SalesOrderProducts ADD SLOCID INT NULL;`);
        }
        if (!existing.includes('Discount')) {
            alterQueries.push(`ALTER TABLE SalesOrderProducts ADD Discount DECIMAL(10,2) DEFAULT 0;`);
        }
        if (!existing.includes('Pending_Quantity')) {
            alterQueries.push(`ALTER TABLE SalesOrderProducts ADD Pending_Quantity DECIMAL(10,2) DEFAULT 0;`);
        }
        if (!existing.includes('Picked_Quantity')) {
            alterQueries.push(`ALTER TABLE SalesOrderProducts ADD Picked_Quantity DECIMAL(10,2) DEFAULT 0;`);
        }
        if (!existing.includes('Total_Product_MRP')) {
            alterQueries.push(`ALTER TABLE SalesOrderProducts ADD Total_Product_MRP DECIMAL(18,2) DEFAULT 0;`);
        }
        if (!existing.includes('Total_Product_Discount')) {
            alterQueries.push(`ALTER TABLE SalesOrderProducts ADD Total_Product_Discount DECIMAL(18,2) DEFAULT 0;`);
        }
        if (!existing.includes('Total_Product_Amount')) {
            alterQueries.push(`ALTER TABLE SalesOrderProducts ADD Total_Product_Amount DECIMAL(18,2) DEFAULT 0;`);
        }
        
        if (alterQueries.length === 0) {
            console.log('All columns already exist. No changes needed.');
            await pool.close();
            process.exit(0);
            return;
        }
        
        console.log(`\nAdding ${alterQueries.length} missing columns...`);
        
        for (const query of alterQueries) {
            console.log(`Executing: ${query}`);
            await pool.request().query(query);
        }
        
        console.log('\n✓ Successfully added missing columns to SalesOrderProducts table');
        
        // Verify final schema
        const verifyQuery = `
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'SalesOrderProducts' 
            ORDER BY ORDINAL_POSITION
        `;
        const result = await pool.request().query(verifyQuery);
        console.log('\nFinal SalesOrderProducts schema:');
        console.table(result.recordset);
        
        await pool.close();
        process.exit(0);
    } catch(err) {
        console.error('Error:', err.message);
        console.error(err);
        process.exit(1);
    }
})();
