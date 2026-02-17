# Database Migration: PurchaseOrderReceivings Table

## Overview

The `PurchaseOrderReceivings` table is required by the Inbound/Receiving Report module to store purchase order receiving data (GSRN, receiving date, vendor info, etc.).

## Problem

- Backend is trying to insert into `PurchaseOrderReceivings` table
- Table doesn't exist in SQL Server database
- Error: "Invalid object name 'PurchaseOrderReceivings'"

## Solution

Three approaches to create the table:

---

## **Option 1: Node.js Migration (Recommended for Production)**

### Step 1: Run the migration via npm script

```bash
cd softsol-server
npm run migrate
```

This will:

- Connect to your SQL Server database (using config settings)
- Create `PurchaseOrderReceivings` table
- Create performance indexes automatically
- Handle errors gracefully

### Step 2: Verify table creation

```bash
npm run dev  # Start the server
```

---

## **Option 2: SQL Server Management Studio (Quickest)**

### Step 1: Open SQL Server Management Studio

1. Connect to your SQL Server database
2. Open a New Query window

### Step 2: Copy and paste the SQL script

Open: `softsol-server/SQL/create_PurchaseOrderReceivings_table.sql`

Copy all content and paste into the query window

### Step 3: Execute the query

Click `Execute` or press `F5`

You should see:

```
Table PurchaseOrderReceivings created successfully
Indexes created successfully
```

---

## **Option 3: PowerShell (If you have SQL Tools)**

```powershell
cd D:\vishwanath\ramana\wms\softsol-server
sqlcmd -S localhost -U username -P password -i .\SQL\create_PurchaseOrderReceivings_table.sql -d your_database_name
```

Replace:

- `localhost` with your server name
- `username` with your SQL Server username
- `password` with your SQL Server password
- `your_database_name` with your actual database name

---

## Table Schema

| Column                         | Type          | Constraint          |
| ------------------------------ | ------------- | ------------------- |
| `PurchaseOrderReceivingID`     | INT           | PK, Identity(1,1)   |
| `PurchaseOrderID`              | INT           | FK → PurchaseOrders |
| `GSRN`                         | NVARCHAR(100) | Nullable            |
| `ReceivingDate`                | DATE          | Required            |
| `VendorID`                     | INT           | FK → Vendors        |
| `WarehouseID`                  | INT           | FK → Warehouses     |
| `BranchID`                     | INT           | FK → Branches       |
| `VehicleNumber`                | NVARCHAR(100) | Nullable            |
| `LRNumber`                     | NVARCHAR(100) | Nullable            |
| `InvoiceNumber`                | NVARCHAR(100) | Nullable            |
| `PurchaseOrderReceivingStatus` | NVARCHAR(50)  | Default: 'New'      |
| `CreatedBy`                    | INT           | FK → Users          |
| `UpdatedBy`                    | INT           | FK → Users          |
| `CreatedDate`                  | DATETIME      | Default: GETDATE()  |
| `UpdatedDate`                  | DATETIME      | Default: GETDATE()  |
| `IsDeleted`                    | BIT           | Default: 0          |

---

## Indexes Created

- `IX_POR_PurchaseOrderID` - For joining with PurchaseOrders
- `IX_POR_BranchID` - For filtering by branch
- `IX_POR_WarehouseID` - For filtering by warehouse
- `IX_POR_Status` - For filtering by receiving status
- `IX_POR_IsDeleted` - For soft delete queries

---

## Verification

After creating the table, test the API:

```bash
# Start backend
npm run dev

# Now create a new receiving report in the UI
# Endpoint: POST /api/purchase_order/getNewPurchaseOrderReceiving

# Should return: { data: { PurchaseOrderReceivingID: 1, GSRN: "GSRN001", ... } }
# Instead of: { error: "Invalid object name 'PurchaseOrderReceivings'." }
```

---

## Next Steps

1. **Create the table** using one of the options above
2. **Restart the backend** server
3. **Test the UI** - Try creating a new Receiving Report
4. **Verify in SQL Server** - Check that data is being inserted

```sql
-- Verify data was inserted
SELECT TOP 10 * FROM PurchaseOrderReceivings ORDER BY CreatedDate DESC;
```

---

## Troubleshooting

| Error                              | Solution                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| "Cannot add or update a child row" | Parent record doesn't exist. Ensure PurchaseOrder, Vendor, Warehouse, Branch exist first |
| "Invalid login" (sqlcmd)           | Check SQL Server username/password                                                       |
| "Database not found"               | Check correct database name in config file                                               |
| Table still not created            | Verify you ran the migration with correct database connection                            |

---

## Architecture Note

This migration follows your existing database schema patterns:

- Proper foreign keys to related tables
- Standard audit fields (CreatedBy, UpdatedBy, CreatedDate, UpdatedDate)
- Soft delete support (IsDeleted column)
- Performance indexes on frequently queried fields
- Follows naming conventions (PascalCase for table/column names)

**Created:** 2026-02-08
**By:** Senior MERN Stack Review
