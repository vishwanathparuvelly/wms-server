// Migration: Add RetestDate and ExpiryDate to BinProducts for Put Away materials list

async function up(pool) {
  try {
    const request = pool.request();

    // Add RetestDate to BinProducts
    const checkRetest = await request.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'BinProducts' AND COLUMN_NAME = 'RetestDate'
    `);
    if (checkRetest.recordset[0].count === 0) {
      await request.query(`
        ALTER TABLE BinProducts ADD RetestDate DATE NULL;
      `);
      console.log("✓ Added RetestDate to BinProducts");
    }

    // Add ExpiryDate to BinProducts
    const checkExpiry = await request.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'BinProducts' AND COLUMN_NAME = 'ExpiryDate'
    `);
    if (checkExpiry.recordset[0].count === 0) {
      await request.query(`
        ALTER TABLE BinProducts ADD ExpiryDate DATE NULL;
      `);
      console.log("✓ Added ExpiryDate to BinProducts");
    }

    return true;
  } catch (err) {
    console.error("Migration 010 error:", err.message);
    throw err;
  }
}

module.exports = { up };
