# Schema Management Best Practices

This guide explains how to properly manage database schema changes in the WMS to prevent "Invalid column name" errors and schema mismatches.

## Problem Overview

**Issue:** Code references database columns that don't exist in the database schema, causing runtime errors like:
- `Invalid column name 'LRNumber'`
- `Invalid column name 'ContactEmail'`

**Root Cause:** Mismatch between:
1. Code (Service layer) - tries to INSERT/UPDATE columns
2. Database Schema - actual table structure
3. Schema Definition (`DB_Schema_Service.js`) - schema template

## Prevention Strategy

### 1. The Three-Way Sync Rule

Whenever you add/modify a database column, you MUST update **all three locations**:

#### a) Service Layer (Business Logic)
File: `service/*_Service.js`

```javascript
// Example: PO_Service.js
async function updatePurchaseOrder(pool, values) {
  let query = `
    UPDATE PurchaseOrders
    SET 
      LRNumber = @LRNumber,  // ← New column here
      ...
  `;
  request.input("LRNumber", sql.VarChar(50), values.LRNumber);  // ← And here
}
```

#### b) Schema Definition
File: `service/DB_Schema_Service.js`

```javascript
PurchaseOrders: {
  tableName: "PurchaseOrders",
  columns: [
    { name: "LRNumber", type: "NVARCHAR(50)", properties: "NULL" },  // ← Add here
    // ... other columns
  ],
}
```

#### c) Database Migration
File: `migrations/00X_add_column_name.js`

```javascript
async function up() {
  // Check if column exists
  const checkColumn = await pool.request().query(`
    SELECT COUNT(*) as count 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'PurchaseOrders' 
    AND COLUMN_NAME = 'LRNumber'
  `);

  if (checkColumn.recordset[0].count === 0) {
    await pool.request().query(`
      ALTER TABLE PurchaseOrders 
      ADD LRNumber NVARCHAR(50) NULL
    `);
    console.log("✓ Added LRNumber column");
  }
}
```

### 2. Migration Workflow

When adding a new column to an **existing table**:

#### Step 1: Create Migration File
```bash
# Create new migration with sequential number
touch migrations/00X_add_your_feature.js
```

#### Step 2: Write Migration Code
```javascript
const config = require("config");
const sql = require("mssql");

async function up() {
  const dbConfig = { /* db config */ };
  let pool = await sql.connect(dbConfig);
  
  // Always check before adding
  const checkColumn = await pool.request().query(`
    SELECT COUNT(*) as count 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'YourTable' 
    AND COLUMN_NAME = 'YourNewColumn'
  `);

  if (checkColumn.recordset[0].count === 0) {
    await pool.request().query(`
      ALTER TABLE YourTable 
      ADD YourNewColumn NVARCHAR(100) NULL
    `);
    console.log("✓ Added YourNewColumn");
  } else {
    console.log("→ YourNewColumn already exists");
  }
  
  await pool.close();
}

async function down() {
  // Rollback logic
  const dbConfig = { /* db config */ };
  let pool = await sql.connect(dbConfig);
  
  await pool.request().query(`
    ALTER TABLE YourTable DROP COLUMN IF EXISTS YourNewColumn
  `);
  
  await pool.close();
}

module.exports = { up, down };
```

#### Step 3: Register Migration
File: `run-migrations.js`

```javascript
const { up: addYourFeature } = require("./migrations/00X_add_your_feature");

async function runMigrations() {
  // ... existing migrations
  
  console.log("📋 Migration 00X: Adding YourFeature columns...");
  await addYourFeature(pool);
  
  // ... rest of code
}
```

#### Step 4: Update Schema Service
File: `service/DB_Schema_Service.js`

Add the column to the appropriate table definition.

#### Step 5: Test Migration
```bash
# Check current schema
node check_yourmodule_schema.js

# Run migration
node run-migrations.js

# Verify it worked
node check_yourmodule_schema.js
```

### 3. New Table Workflow

When creating a **brand new table**:

#### Step 1: Define in DB_Schema_Service.js
```javascript
YourNewTable: {
  tableName: "YourNewTable",
  columns: [
    { name: "ID", type: "INT", properties: "PRIMARY KEY IDENTITY(1,1)" },
    { name: "Name", type: "NVARCHAR(100)", properties: "NOT NULL" },
    // ... all columns
  ],
  foreignKeys: [
    "CONSTRAINT FK_YourTable_OtherTable FOREIGN KEY (OtherID) REFERENCES OtherTable(ID)"
  ]
}
```

#### Step 2: Create Migration
```javascript
async function createYourNewTable(pool) {
  const checkTable = await pool.request().query(`
    SELECT COUNT(*) as count 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_NAME = 'YourNewTable'
  `);

  if (checkTable.recordset[0].count === 0) {
    await pool.request().query(`
      CREATE TABLE YourNewTable (
        ID INT PRIMARY KEY IDENTITY(1,1),
        Name NVARCHAR(100) NOT NULL,
        -- ... all columns matching DB_Schema_Service.js
      )
    `);
    console.log("✓ Created YourNewTable");
  }
}
```

#### Step 3: Update db-setup.js
Ensure `db-setup.js` includes your table so fresh installs get it automatically.

### 4. Verification Tools

Create schema check utilities for critical modules:

#### Template: `check_modulename_schema.js`
```javascript
const config = require("config");
const sql = require("mssql");

async function checkSchema() {
  const dbConfig = { /* config */ };
  let pool = await sql.connect(dbConfig);
  
  console.log("\n📊 Checking YourTable Schema...\n");

  const result = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'YourTable'
    ORDER BY ORDINAL_POSITION
  `);

  const expectedColumns = ['Column1', 'Column2', 'Column3'];
  const foundColumns = result.recordset.map(col => col.COLUMN_NAME);
  
  console.log('📋 Column Status:\n');
  expectedColumns.forEach(colName => {
    if (foundColumns.includes(colName)) {
      console.log(`  ✅ ${colName}`);
    } else {
      console.log(`  ❌ ${colName} - MISSING`);
    }
  });
  
  await pool.close();
}

checkSchema();
```

Run this after every migration to verify success.

### 5. Common Pitfalls to Avoid

❌ **DON'T:**
- Add columns directly in production via SQL Management Studio
- Update only the service layer without migration
- Assume existing databases have the same schema as dev
- Skip the idempotency check (if column exists)

✅ **DO:**
- Always create a migration for schema changes
- Update all three locations (code, schema definition, migration)
- Test migrations on a copy of production data
- Make migrations idempotent (safe to run multiple times)
- Document breaking changes in migration comments

### 6. Emergency Fix Procedure

If you encounter a "column not found" error in production:

#### Immediate Fix (Existing Database):
```bash
# 1. Identify missing columns
node check_modulename_schema.js

# 2. Run all migrations
node run-migrations.js

# 3. Verify fix
node check_modulename_schema.js

# 4. Restart application
node index.js
```

#### Long-term Solution:
1. Ensure migration exists for the missing column
2. Update documentation
3. Communicate to team about running migrations before deployment
4. Consider CI/CD automation to run migrations

### 7. CI/CD Integration

Recommended deployment workflow:

```bash
#!/bin/bash
# deploy.sh

# 1. Stop application
pm2 stop wms-server

# 2. Pull latest code
git pull origin main

# 3. Install dependencies
npm install

# 4. Run migrations (safe for existing databases)
node run-migrations.js

# 5. Start application
pm2 start wms-server
```

### 8. Documentation Checklist

When adding a new feature with schema changes:

- [ ] Create migration file (`migrations/00X_*.js`)
- [ ] Update `DB_Schema_Service.js`
- [ ] Update service layer (`service/*_Service.js`)
- [ ] Register migration in `run-migrations.js`
- [ ] Create/update schema check utility (`check_*_schema.js`)
- [ ] Test on clean database
- [ ] Test on existing database
- [ ] Update README.md migrations list
- [ ] Update DATABASE_SETUP.md if needed

## Real-World Examples

### Example 1: Purchase Order LRNumber Fix (Migration 005)

**Problem:** 6 columns missing from PurchaseOrders table

**Solution:**
1. ✅ Created `migrations/005_add_purchase_order_columns.js`
2. ✅ Updated `DB_Schema_Service.js` PurchaseOrders definition
3. ✅ Registered in `run-migrations.js`
4. ✅ Created `check_purchaseorders_schema.js`
5. ✅ Tested migration on existing database
6. ✅ Documented in README.md and DATABASE_SETUP.md

**Files Changed:**
- `migrations/005_add_purchase_order_columns.js` (new)
- `service/DB_Schema_Service.js` (updated)
- `run-migrations.js` (updated)
- `check_purchaseorders_schema.js` (new)
- `README.md` (documented)
- `DATABASE_SETUP.md` (explained)

### Example 2: Vendor Email Constraint Fix (Migration 004)

**Problem:** UNIQUE constraint prevented multiple NULL emails

**Solution:**
1. ✅ Created `migrations/004_fix_vendor_email_unique_constraint.js`
2. ✅ Updated `DB_Schema_Service.js` (removed UNIQUE from EmailAddress)
3. ✅ Created filtered unique index allowing NULL values
4. ✅ Tested with multiple NULL email vendors

## Summary

**Golden Rule:** Always keep code, schema definition, and database structure in sync through proper migrations.

**Quick Checklist:**
1. Add column to `DB_Schema_Service.js`
2. Create migration in `migrations/`
3. Register in `run-migrations.js`
4. Update service layer code
5. Create/update schema check utility
6. Test thoroughly
7. Document changes

Following these practices ensures schema consistency across all environments and prevents runtime errors.

---

**Last Updated:** February 2026  
**Related Docs:** 
- [DATABASE_SETUP.md](./DATABASE_SETUP.md)
- [README.md](./README.md)
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
