# Database Setup Guide

This guide explains how to set up a new database for the Warehouse Management System (WMS).

## Prerequisites

- SQL Server instance (2016 or higher recommended)
- Node.js (v18 or higher)
- Database credentials with CREATE TABLE permissions

## Quick Start for New Database

### 1. Create Empty Database

Create a new empty database in SQL Server:

```sql
CREATE DATABASE YourDatabaseName;
```

### 2. Configure Database Connection

Update the database configuration in `config/default.json` or your environment-specific config file:

```json
{
  "database": {
    "DB_USER": "your_username",
    "DB_PASSWORD": "your_password",
    "DB_SERVER": "your_server_address",
    "DB_PORT": "1433",
    "DB_NAME": "YourDatabaseName",
    "DB_ENCRYPT": true,
    "DB_TRUST_SERVER_CERT": true,
    "DB_POOL_MAX": 20,
    "DB_POOL_MIN": 2,
    "DB_POOL_IDLE": 30000
  }
}
```

### 3. Initialize Database Schema

Run the database initialization script to create all tables:

```bash
cd wms-server
node db-setup.js
```

This will:
- Create all required tables (Countries, States, Cities, Vendors, Products, etc.)
- Set up foreign key relationships
- Apply proper constraints and indexes

### 4. Run Migrations (Optional)

If you need to apply additional migrations:

```bash
node run-migrations.js
```

**Note:** For a **fresh/new database**, migrations are optional since `db-setup.js` already creates the schema with all fixes applied.

### 5. Seed Initial Data (Optional)

If you need demo/test data:

```bash
node seed-demo-data.js
```

## Important Notes for New Databases

### ✅ Vendor EmailAddress Constraint

**You will NOT face the vendor email unique constraint issue** in a new database because:

1. The schema in `DB_Schema_Service.js` is already configured correctly
2. The filtered unique index is created during initial setup
3. The schema allows multiple NULL email addresses while enforcing uniqueness for non-NULL values

**Issue Context (Historical):**
- In existing databases, the EmailAddress field had a standard UNIQUE constraint
- This prevented multiple vendors with NULL email addresses
- Migration `004_fix_vendor_email_unique_constraint.js` was created to fix this
- **New databases don't need this migration** - the correct schema is applied from the start

### Schema Features

The Vendors table schema includes:

```sql
-- EmailAddress allows multiple NULLs but enforces uniqueness for non-NULL values
CREATE UNIQUE NONCLUSTERED INDEX UQ_Vendors_EmailAddress
ON Vendors(EmailAddress)
WHERE EmailAddress IS NOT NULL;
```

This means:
- ✅ Multiple vendors can have NULL email
- ✅ Email uniqueness is enforced only for non-NULL values
- ✅ No duplicate email addresses for active vendors

### Why the Purchase Order LRNumber Issue Won't Occur

**Background:** In older database versions, the PurchaseOrders table was missing 6 columns that the application code tried to update:
- `DeliveryAddress`
- `PersonInChargeInternal`
- `PersonInChargeVendor`
- `TransporterName`
- `VehicleNumber`
- `LRNumber`

This caused "Invalid column name 'LRNumber'" errors when updating purchase orders.

**For New Databases:** The `db-setup.js` script creates the PurchaseOrders table with all 20 required columns from the start, including the 6 columns listed above. You won't encounter this issue.

**For Existing Databases:** If you're migrating an existing database, run `node run-migrations.js` which includes migration 005 to add these missing columns automatically.

**Verify Purchase Order Schema:** You can verify your PurchaseOrders table has all required columns:

```bash
node check_purchaseorders_schema.js
```

This will show all 20 columns and highlight any missing ones.

## Verification Steps

After setup, verify your database is working correctly:

### 1. Check Server Connection

```bash
node index.js
```

You should see:
```
SQL Server pool initialized for DB=> YourDatabaseName
Warehouse Inventory running on http://localhost:7501
```

### 2. Test Vendor Creation

Test creating vendors with NULL emails:

```bash
# PowerShell
$body = @{
    VendorCode='TEST001'
    VendorName='Test Vendor'
    VendorContactNumber='1234567890'
    StreetAddress1='123 Test St'
    CountryID=1
    StateID=1
    CityID=1
    ContactEmail=$null
    IsActive=$true
    user_id=1
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:7501/api/master/vendor/addVendor' -Method POST -Body $body -ContentType 'application/json'
```

### 3. Verify Schema

Check the Vendors table schema:

```bash
node check_vendor_schema.js
```

Check the PurchaseOrders table schema:

```bash
node check_purchaseorders_schema.js
```

Both should show "All required columns are present!"

## Troubleshooting

### Connection Issues

**Error:** "Login failed for user"
- Verify database credentials in config file
- Ensure SQL Server allows remote connections
- Check firewall settings

**Error:** "Database does not exist"
- Create the database manually first
- Verify DB_NAME in config matches the created database

### Schema Issues

**Error:** "Invalid object name 'TableName'"
- Run `node db-setup.js` to create all tables
- Check database connection configuration

### Migration Issues

**Error:** "Migration failed"
- For new databases, you can skip migrations
- Migrations are only needed for upgrading existing databases
- Use `db-setup.js` for fresh installations

## Migration vs Fresh Setup

| Scenario | Use | Command |
|----------|-----|---------|
| **New Database** | Fresh schema creation | `node db-setup.js` |
| **Existing Database** | Apply schema updates | `node run-migrations.js` |
| **Testing/Demo** | Sample data | `node seed-demo-data.js` |

## Module-Specific Setup

### Material Module

The Material module requires:
- UOMs table (for units of measurement)
- Vendors table (for material suppliers)

Both are created automatically by `db-setup.js`.

### Vendor Module

The Vendor module requires:
- Countries table
- States table  
- Cities table
- Zones table (optional)

All location tables are created automatically by `db-setup.js`.

## Database Schema Overview

Core tables created by `db-setup.js`:

**Master Data:**
- Countries, States, Cities, Zones
- Branches, Warehouses, WarehouseTypes
- Zones, Compartments, Stacks, Bins
- StorageTypes, PalletTypes

**Product Management:**
- Brands, ProductTypes, PackagingTypes
- Products, UOMs
- Materials

**Business Partners:**
- Vendors
- Customers, CustomerTypes
- LaborProviders

**Users & Permissions:**
- Users, Roles
- Employees, Skills

**Operations:**
- PurchaseOrders, SalesOrders
- BinProducts, BinProductLogs
- Gates, GateTypes

## Configuration Files

- `config/default.json` - Default configuration
- `config/dev.json` - Development environment
- `config/prod.json` - Production environment
- `service/DB_Schema_Service.js` - Complete schema definitions

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify database connection settings
3. Ensure all prerequisites are installed
4. Review this guide for common solutions

## Summary

For a **new database setup**:

```bash
# 1. Create database in SQL Server
# 2. Update config/default.json with credentials
# 3. Initialize schema
node db-setup.js

# 4. Start server
node index.js

# 5. (Optional) Add demo data
node seed-demo-data.js
```

That's it! Your WMS database is ready to use. 🚀

---

**Important:** The vendor email unique constraint issue only affected existing databases. With a fresh database setup, the correct schema is applied from the start, so you won't encounter this issue.
