# Warehouse Management System - Backend Server

Node.js/Express backend for the Warehouse Management System (WMS).

## Prerequisites

- Node.js v18 or higher
- SQL Server 2016 or higher
- npm or yarn package manager

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Database

Update `config/default.json` with your database credentials:

```json
{
  "database": {
    "DB_USER": "your_username",
    "DB_PASSWORD": "your_password",
    "DB_SERVER": "your_server_address",
    "DB_PORT": "1433",
    "DB_NAME": "YourDatabaseName"
  }
}
```

### 3. Initialize Database

**For New/Fresh Database (Recommended):**

```bash
node db-setup.js
```

This creates all tables with the correct schema from scratch.

**For Existing Database (Apply Updates):**

```bash
node run-migrations.js
```

This applies incremental schema changes to existing databases.

### 4. Start Server

```bash
node index.js
```

Server will start on: `http://localhost:7501`

## 📖 Documentation

- **[Database Setup Guide](./DATABASE_SETUP.md)** - Complete guide for setting up a new database
- **[Migration Guide](./MIGRATION_GUIDE.md)** - Guide for migrating existing databases
- **[Schema Management Best Practices](./SCHEMA_MANAGEMENT.md)** - How to prevent schema mismatch errors

## Project Structure

```
wms-server/
├── config/              # Configuration files
│   ├── default.json     # Default config
│   ├── dev.json         # Development config
│   ├── prod.json        # Production config
│   ├── importExportConfig.js  # Import/Export module configs
│   └── lookupTypes.js   # Lookup definitions
├── controller/          # Request handlers
├── service/             # Business logic
│   └── DB_Schema_Service.js  # Database schema definitions
├── routes/              # API routes
├── migrations/          # Database migrations
├── model/               # Data models
├── utils/               # Utility functions
├── database/            # Database connection
└── swagger/             # API documentation
```

## API Endpoints

### Master Data
- `/api/master/vendor/*` - Vendor management
- `/api/master/material/*` - Material management
- `/api/master/product/*` - Product management
- `/api/master/uom/*` - Unit of Measurement
- `/api/master/brand/*` - Brand management
- `/api/master/customer/*` - Customer management
- And more...

### Data Import/Export
- `POST /api/data/export/{module}` - Export data to CSV
- `POST /api/data/import/{module}` - Import data from CSV/Excel

## Key Features

### Material Module ✨
- Material master data management
- Link materials to UOMs and Vendors
- Support for optional fields
- Full CRUD operations
- Import/Export functionality
- **Used in Purchase Orders for Pharma domain**

### Vendor Module ✅
- Complete vendor management
- Multiple NULL email addresses supported
- Business type categorization
- Location hierarchy (Country → State → City → Zone)
- Soft delete functionality
- Import/Export with lookup resolution

### Import/Export System
- CSV and Excel file support
- Automatic lookup resolution (e.g., CountryName → CountryID)
- Cascading lookups with parent relationships
- Validation and error reporting
- Support for all master data modules

### Purchase Order System 🏭
- **Dual-Reference Model**: Support both Materials (Pharma) and Products (FMCG/Trading)
- Materials filtered by Vendor for Pharma procurement
- Products for traditional trading/FMCG procurement
- Flexible architecture for multi-domain WMS
- At least one reference (MaterialID or ProductID) required

## Environment Variables

Create environment-specific config files:

- `config/default.json` - Default settings
- `config/dev.json` - Development overrides
- `config/prod.json` - Production settings

## Database Schema

The system uses SQL Server with the following key tables:

**Master Data:** Countries, States, Cities, Vendors, Materials, Products, UOMs, Brands

**Operations:** PurchaseOrders, SalesOrders, BinProducts, Inventory

**System:** Users, Roles, Logs

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for complete schema details.

## Migrations

Migrations are tracked and applied sequentially:

1. `001_create_purchaseOrderReceivings_table.js` - PO receiving tables
2. `002_create_bin_products_tables.js` - Bin inventory tracking
3. `003_add_vendor_columns.js` - Add VendorDescription and BusinessType
4. `004_fix_vendor_email_unique_constraint.js` - Fix email constraint for existing DBs
5. `005_add_purchase_order_columns.js` - Add 6 missing PurchaseOrders columns (DeliveryAddress, PersonInChargeInternal, PersonInChargeVendor, TransporterName, VehicleNumber, LRNumber)
6. `006_add_material_support_to_po.js` - Add MaterialID support for Pharma domain (dual-reference model)
7. `007_add_purchaseorderproducts_columns.js` - Add 12 missing PurchaseOrderProducts columns (VendorID, BranchID, WarehouseID, SLOCID, BatchNumber, Pending_Quantity, Received_Quantity, MRP, Discount, Total_Product_MRP, Total_Product_Discount, Total_Product_Amount)

**Note:** New databases don't need migrations - use `db-setup.js` instead.

## Scripts

- `node index.js` - Start the server
- `node db-setup.js` - Initialize fresh database schema
- `node run-migrations.js` - Apply migrations to existing database
- `node seed-demo-data.js` - Add demo/test data
- `node check_vendor_schema.js` - Verify vendor table schema
- `node check_purchaseorders_schema.js` - Verify purchase orders table schema
- `node check_purchaseorderproducts_schema.js` - Verify purchase order products table schema
- `node check_vendor_constraints.js` - Check database constraints

## Known Issues & Solutions

### Purchase Order LRNumber Error (Legacy Issue)

**Issue:** "Invalid column name 'LRNumber'" error when updating purchase orders in older databases.

**Root Cause:** PurchaseOrders table was missing 6 columns: DeliveryAddress, PersonInChargeInternal, PersonInChargeVendor, TransporterName, VehicleNumber, LRNumber.

**Solution:** 
- ✅ Fixed in new databases automatically (all 20 columns created)
- For existing databases, run migration 005: `node run-migrations.js`
- Verify schema: `node check_purchaseorders_schema.js`

### Vendor Email Constraint (Legacy Issue)

**Issue:** In older databases, multiple vendors with NULL email addresses caused a constraint violation.

**Solution:** 
- ✅ Fixed in new databases automatically
- For existing databases, run migration 004
- See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for details

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::7501`

**Solution:**
```powershell
# Windows PowerShell
Get-Process | Where-Object {$_.ProcessName -eq 'node'} | Where-Object {(Get-NetTCPConnection -OwningProcess $_.Id -LocalPort 7501 -ErrorAction SilentlyContinue)} | Stop-Process -Force
```

## Development

### Adding a New Module

1. Create service: `service/NewModule_Service.js`
2. Create controller: `controller/NewModule_Controller.js`
3. Create routes: Update `routes/master_route.js`
4. Add schema: Update `service/DB_Schema_Service.js`
5. Add import/export config: Update `config/importExportConfig.js`
6. Add lookup: Update `config/lookupTypes.js` (if needed)

### Database Changes

For new databases:
- Update `DB_Schema_Service.js`
- Run `node db-setup.js`

For existing databases:
- Create migration in `migrations/`
- Add to `run-migrations.js`
- Run `node run-migrations.js`

## Testing

```bash
# Test vendor creation
$body = @{VendorCode='TEST';VendorName='Test';VendorContactNumber='123';StreetAddress1='Test St';CountryID=1;StateID=1;CityID=1;IsActive=$true;user_id=1} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:7501/api/master/vendor/addVendor' -Method POST -Body $body -ContentType 'application/json'

# Test export
curl.exe -X POST http://localhost:7501/api/data/export/vendor -H "Content-Type: application/json" -d "{}"
```

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQL Server (mssql package)
- **Configuration:** node-config
- **Import/Export:** fast-csv, xlsx
- **Authentication:** JWT

## Configuration Management

The system uses environment-based configuration:

```
config/default.json      # Base config (committed)
config/dev.json          # Dev overrides (optional)
config/prod.json         # Production (not committed)
```

## License

[Your License Here]

## Support

For setup issues, refer to:
1. [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Complete database setup guide
2. [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration instructions
3. Check server logs for detailed error messages

---

**Quick Setup Summary:**
```bash
# 1. Install
npm install

# 2. Configure (edit config/default.json)

# 3. Setup database
node db-setup.js

# 4. Start
node index.js
```

Your WMS backend is ready! 🚀
