const sql = require('mssql');
const initializePool = require('./database/db');

async function addSampleBinProducts() {
    let pool;
    
    try {
        console.log('Starting to add sample products with expiry dates...\n');

        pool = await initializePool();

        // Get existing products, bins, and warehouses
        const productsResult = await pool.request().query(`
            SELECT TOP 5 ProductID, ProductCode, ProductName, UOMID 
            FROM Products 
            WHERE IsActive = 1 
            ORDER BY ProductID
        `);

        if (!productsResult.recordset || productsResult.recordset.length === 0) {
            console.log('No products found. Please add products first using add_sample_products.js');
            return;
        }

        const binsResult = await pool.request().query(`
            SELECT TOP 5 
                b.BinID, b.BinNumber, b.StackID, b.WarehouseID, b.SLOCID, b.PalletTypeID,
                w.WarehouseName 
            FROM Bins b
            INNER JOIN Warehouses w ON b.WarehouseID = w.WarehouseID
            WHERE b.IsDeleted = 0 AND b.StackID IS NOT NULL AND b.PalletTypeID IS NOT NULL
            ORDER BY b.BinID
        `);

        if (!binsResult.recordset || binsResult.recordset.length === 0) {
            console.log('No bins found. Please create bins in the Bins master.');
            return;
        }

        console.log('Found Products:');
        productsResult.recordset.forEach(p => {
            console.log(`  - ${p.ProductCode}: ${p.ProductName}`);
        });
        console.log();

        console.log('Found Bins:');
        binsResult.recordset.forEach(b => {
            console.log(`  - ${b.BinNumber} (${b.WarehouseName})`);
        });
        console.log();

        const today = new Date();
        
        // Helper function to add days to date
        const addDays = (date, days) => {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return result.toISOString().split('T')[0];
        };

        // Prepare sample batch data with various expiry statuses
        const sampleBatches = [
            // Expired products (negative days)
            {
                productIndex: 0,
                binIndex: 0,
                batchNumber: 'BATCH-EXP-001',
                manufactureDate: addDays(today, -400),
                expiryDate: addDays(today, -30), // Expired 30 days ago
                availableQuantity: 500,
                status: 'Expired'
            },
            {
                productIndex: 1,
                binIndex: 1,
                batchNumber: 'BATCH-EXP-002',
                manufactureDate: addDays(today, -380),
                expiryDate: addDays(today, -15), // Expired 15 days ago
                availableQuantity: 250,
                status: 'Expired'
            },
            // Critical - expiring within 30 days
            {
                productIndex: 0,
                binIndex: 2,
                batchNumber: 'BATCH-CRIT-001',
                manufactureDate: addDays(today, -340),
                expiryDate: addDays(today, 15), // Expires in 15 days
                availableQuantity: 1000,
                status: 'Critical'
            },
            {
                productIndex: 1,
                binIndex: 0,
                batchNumber: 'BATCH-CRIT-002',
                manufactureDate: addDays(today, -350),
                expiryDate: addDays(today, 25), // Expires in 25 days
                availableQuantity: 800,
                status: 'Critical'
            },
            {
                productIndex: 2,
                binIndex: 1,
                batchNumber: 'BATCH-CRIT-003',
                manufactureDate: addDays(today, -360),
                expiryDate: addDays(today, 10), // Expires in 10 days
                availableQuantity: 600,
                status: 'Critical'
            },
            // Near Expiry - 31 to 90 days
            {
                productIndex: 0,
                binIndex: 1,
                batchNumber: 'BATCH-NEAR-001',
                manufactureDate: addDays(today, -290),
                expiryDate: addDays(today, 45), // Expires in 45 days
                availableQuantity: 2000,
                status: 'Near Expiry'
            },
            {
                productIndex: 1,
                binIndex: 2,
                batchNumber: 'BATCH-NEAR-002',
                manufactureDate: addDays(today, -280),
                expiryDate: addDays(today, 60), // Expires in 60 days
                availableQuantity: 1500,
                status: 'Near Expiry'
            },
            {
                productIndex: 2,
                binIndex: 0,
                batchNumber: 'BATCH-NEAR-003',
                manufactureDate: addDays(today, -270),
                expiryDate: addDays(today, 75), // Expires in 75 days
                availableQuantity: 1800,
                status: 'Near Expiry'
            },
            {
                productIndex: 3,
                binIndex: 1,
                batchNumber: 'BATCH-NEAR-004',
                manufactureDate: addDays(today, -260),
                expiryDate: addDays(today, 85), // Expires in 85 days
                availableQuantity: 1200,
                status: 'Near Expiry'
            },
            // Good - more than 90 days
            {
                productIndex: 0,
                binIndex: 3,
                batchNumber: 'BATCH-GOOD-001',
                manufactureDate: addDays(today, -100),
                expiryDate: addDays(today, 180), // Expires in 180 days
                availableQuantity: 5000,
                status: 'Good'
            },
            {
                productIndex: 1,
                binIndex: 3,
                batchNumber: 'BATCH-GOOD-002',
                manufactureDate: addDays(today, -90),
                expiryDate: addDays(today, 270), // Expires in 270 days
                availableQuantity: 4500,
                status: 'Good'
            },
            {
                productIndex: 2,
                binIndex: 2,
                batchNumber: 'BATCH-GOOD-003',
                manufactureDate: addDays(today, -80),
                expiryDate: addDays(today, 300), // Expires in 300 days
                availableQuantity: 3500,
                status: 'Good'
            },
            {
                productIndex: 3,
                binIndex: 3,
                batchNumber: 'BATCH-GOOD-004',
                manufactureDate: addDays(today, -70),
                expiryDate: addDays(today, 320), // Expires in 320 days
                availableQuantity: 4000,
                status: 'Good'
            },
            {
                productIndex: 4,
                binIndex: 4,
                batchNumber: 'BATCH-GOOD-005',
                manufactureDate: addDays(today, -60),
                expiryDate: addDays(today, 340), // Expires in 340 days
                availableQuantity: 5500,
                status: 'Good'
            },
        ];

        console.log(`Adding ${sampleBatches.length} sample batch entries to BinProducts...\n`);

        let successCount = 0;
        let skipCount = 0;

        for (const batch of sampleBatches) {
            const product = productsResult.recordset[batch.productIndex];
            const bin = binsResult.recordset[batch.binIndex];

            if (!product || !bin) {
                console.log(`⚠ Skipping batch ${batch.batchNumber} - Product or Bin not found`);
                skipCount++;
                continue;
            }

            try {
                // Check if batch already exists
                const checkResult = await pool.request().query(`
                    SELECT BinProductID 
                    FROM BinProducts 
                    WHERE ProductID = ${product.ProductID} 
                    AND BinID = ${bin.BinID} 
                    AND BatchNumber = '${batch.batchNumber}'
                `);

                if (checkResult.recordset && checkResult.recordset.length > 0) {
                    console.log(`⚠ Skipping ${batch.batchNumber} - Already exists`);
                    skipCount++;
                    continue;
                }

                // Insert into BinProducts
                await pool.request().query(`
                    INSERT INTO BinProducts (
                        BinID, PalletTypeID, StackID, VendorID, WarehouseID,
                        ProductID, BatchNumber, ManufactureDate, RetestDate, ExpiryDate, UOMID, SLOCID, MRP,
                        MaxQuantity, FilledQuantity, AvailableQuantity, CreatedBy, UpdatedBy, IsActive,CreatedDate
                    ) VALUES (
                        ${bin.BinID}, 
                        ${bin.PalletTypeID}, 
                        ${bin.StackID}, 
                        1, 
                        ${bin.WarehouseID}, 
                        ${product.ProductID},
                        '${batch.batchNumber}', 
                        '${batch.manufactureDate}', 
                        NULL,
                        '${batch.expiryDate}', 
                        ${product.UOMID || 1}, 
                        ${bin.SLOCID || 1}, 
                        100.00,
                        ${batch.availableQuantity},
                        ${batch.availableQuantity},
                        0,
                        1, 
                        1, 
                        1,
                        GETDATE()
                    )
                `);

                console.log(`✓ Added ${batch.status} batch: ${batch.batchNumber}`);
                console.log(`  Product: ${product.ProductCode} - ${product.ProductName}`);
                console.log(`  Bin: ${bin.BinNumber}`);
                console.log(`  Quantity: ${batch.availableQuantity}`);
                console.log(`  Manufacture Date: ${batch.manufactureDate}`);
                console.log(`  Expiry Date: ${batch.expiryDate}`);
                console.log();

                successCount++;
            } catch (error) {
                console.error(`✗ Error adding batch ${batch.batchNumber}:`, error.message);
                skipCount++;
            }
        }

        console.log('='.repeat(80));
        console.log(`Summary:\n  ✓ Successfully added: ${successCount} batches\n  ⚠ Skipped: ${skipCount} batches`);
        console.log('='.repeat(80));

        // Display summary by status
        console.log('\nSample Data Summary by Expiry Status:');
        console.log('─'.repeat(80));
        
        const summary = await pool.request().query(`
            SELECT 
                CASE 
                    WHEN DATEDIFF(DAY, GETDATE(), ExpiryDate) < 0 THEN 'Expired'
                    WHEN DATEDIFF(DAY, GETDATE(), ExpiryDate) BETWEEN 0 AND 30 THEN 'Critical (0-30 days)'
                    WHEN DATEDIFF(DAY, GETDATE(), ExpiryDate) BETWEEN 31 AND 90 THEN 'Near Expiry (31-90 days)'
                    ELSE 'Good (90+ days)'
                END AS ExpiryStatus,
                CASE 
                    WHEN DATEDIFF(DAY, GETDATE(), ExpiryDate) < 0 THEN 1
                    WHEN DATEDIFF(DAY, GETDATE(), ExpiryDate) BETWEEN 0 AND 30 THEN 2
                    WHEN DATEDIFF(DAY, GETDATE(), ExpiryDate) BETWEEN 31 AND 90 THEN 3
                    ELSE 4
                END AS StatusOrder,
                COUNT(*) AS BatchCount,
                SUM(AvailableQuantity) AS TotalQuantity,
                MIN(ExpiryDate) AS EarliestExpiry,
                MAX(ExpiryDate) AS LatestExpiry
            FROM BinProducts
            GROUP BY 
                CASE 
                    WHEN DATEDIFF(DAY, GETDATE(), ExpiryDate) < 0 THEN 'Expired'
                    WHEN DATEDIFF(DAY, GETDATE(), ExpiryDate) BETWEEN 0 AND 30 THEN 'Critical (0-30 days)'
                    WHEN DATEDIFF(DAY, GETDATE(), ExpiryDate) BETWEEN 31 AND 90 THEN 'Near Expiry (31-90 days)'
                    ELSE 'Good (90+ days)'
                END,
                CASE 
                    WHEN DATEDIFF(DAY, GETDATE(), ExpiryDate) < 0 THEN 1
                    WHEN DATEDIFF(DAY, GETDATE(), ExpiryDate) BETWEEN 0 AND 30 THEN 2
                    WHEN DATEDIFF(DAY, GETDATE(), ExpiryDate) BETWEEN 31 AND 90 THEN 3
                    ELSE 4
                END
            ORDER BY StatusOrder
        `);

        if (summary.recordset && summary.recordset.length > 0) {
            summary.recordset.forEach(row => {
                console.log(`\n${row.ExpiryStatus}:`);
                console.log(`  Batches: ${row.BatchCount}`);
                console.log(`  Total Quantity: ${row.TotalQuantity}`);
                console.log(`  Earliest Expiry: ${new Date(row.EarliestExpiry).toISOString().split('T')[0]}`);
                console.log(`  Latest Expiry: ${new Date(row.LatestExpiry).toISOString().split('T')[0]}`);
            });
        }

        console.log('\n' + '='.repeat(80));
        console.log('✓ Sample data added successfully!');
        console.log('  You can now view this data in the Inventory Dashboard at /inventory');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sql.close();
        process.exit(0);
    }
}

// Run the script
addSampleBinProducts();
