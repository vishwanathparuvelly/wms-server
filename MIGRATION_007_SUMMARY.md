# PurchaseOrderProducts Schema Fix - Migration 007

## Issue
Backend was failing with error: `Invalid column name 'BatchNumber'`

This occurred when trying to add materials to a purchase order because the PurchaseOrderProducts table was missing 12 required columns.

## Missing Columns Identified
1. VendorID
2. BranchID
3. WarehouseID
4. SLOCID
5. BatchNumber
6. Pending_Quantity
7. Received_Quantity
8. MRP
9. Discount
10. Total_Product_MRP
11. Total_Product_Discount
12. Total_Product_Amount

## Solution - Migration 007
Created migration `007_add_purchaseorderproducts_columns.js` to add all missing columns with:
- Proper data types (INT, DECIMAL, NVARCHAR)
- NULL/NOT NULL constraints
- Default values where appropriate
- Foreign key constraints for referential integrity

## Files Updated

### 1. Migration File
- **File**: `wms-server/migrations/007_add_purchaseorderproducts_columns.js`
- **Purpose**: Adds 12 missing columns to PurchaseOrderProducts table
- **Status**: ✅ Executed successfully

### 2. Schema Definition
- **File**: `wms-server/service/DB_Schema_Service.js`
- **Updated**: PurchaseOrderProducts schema now includes all 25 columns
- **Foreign Keys**: Added FK constraints for Vendor, Branch, Warehouse, SLOC

### 3. Migration Runner
- **File**: `wms-server/run-migrations.js`
- **Updated**: Added migration 007 to execution sequence

### 4. Verification Script
- **File**: `wms-server/check_purchaseorderproducts_schema.js`
- **Purpose**: Validates PurchaseOrderProducts table structure
- **Result**: ✅ All 23 expected columns present

## Testing Results

### Schema Verification
```
✅ All expected columns are present in the database!

Columns now in PurchaseOrderProducts table (25 total):
1. PurchaseOrderProductID (Primary Key)
2. PurchaseOrderID
3. VendorID (NEW)
4. BranchID (NEW)
5. WarehouseID (NEW)
6. ProductID (nullable)
7. MaterialID (nullable)
8. UOMID
9. SLOCID (NEW)
10. BatchNumber (NEW)
11. Quantity
12. Pending_Quantity (NEW)
13. Received_Quantity (NEW)
14. ReceivedQuantity (legacy)
15. MRP (NEW)
16. Discount (NEW)
17. Total_Product_MRP (NEW)
18. Total_Product_Discount (NEW)
19. Total_Product_Amount (NEW)
20. UnitPrice (legacy)
21. IsDeleted
22. CreatedBy
23. UpdatedBy
24. CreatedDate
25. UpdatedDate
```

## UI to Backend Parameter Mapping

### Request Body Structure
When adding a material to PO, the UI sends:
```javascript
{
  // From selectedPO (Purchase Order details)
  PurchaseOrderID: number,
  VendorID: number,
  BranchID: number,
  WarehouseID: number,
  
  // From myForm (User input)
  MaterialID: number,
  BatchNumber: string,
  Quantity: number,
  MRP: number,
  Discount: number,
  SLOCID: number,
  UOMID: number,
  
  // From auth middleware
  user_id: number
}
```

### Backend Validation
The backend validates these required fields:
- PurchaseOrderID ✓
- VendorID ✓
- BranchID ✓
- WarehouseID ✓
- UOMID ✓
- SLOCID ✓
- BatchNumber ✓
- Quantity ✓
- MRP ✓
- Discount ✓
- Either MaterialID OR ProductID (mutually exclusive) ✓

## How to Test

### Step 1: Verify Backend Server is Running
The backend has been restarted and should be running on port 7501.

### Step 2: Test Adding Material to PO
1. Navigate to Purchase Order details page (PO20260215004 from your screenshot)
2. Fill in the form:
   - **Select Material**: Choose a material (e.g., "asdf - sdfsda")
   - **BatchNumber**: Enter batch number (e.g., "sd2323")
   - **Quantity**: Enter quantity (e.g., 3223)
   - **MRP**: Enter price (e.g., 2323)
   - **Discount**: Enter discount (e.g., 3)
   - **Select SLOC**: Choose storage location (e.g., "sdfsd")
   - **UOM**: Auto-populated from material (e.g., "Pack")
3. Click **Add** button
4. Expected result: Material should be added successfully to the PO

### Step 3: Verify Data in Database
Check PurchaseOrderProducts table:
```sql
SELECT TOP 5 * 
FROM PurchaseOrderProducts 
WHERE PurchaseOrderID = (SELECT PurchaseOrderID FROM PurchaseOrders WHERE PurchaseOrderNumber = 'PO20260215004')
ORDER BY CreatedDate DESC
```

You should see:
- MaterialID populated (not null)
- ProductID = NULL
- BatchNumber = 'sd2323'
- All other fields properly populated

## Differences from Migration 005/006

### Migration 005 (PurchaseOrders table)
- Added 6 columns to PurchaseOrders table
- Issue: LRNumber column missing

### Migration 006 (Material Support)
- Added MaterialID column to PurchaseOrderProducts
- Added dual-reference model (Product OR Material)
- Issue: Schema definition incomplete

### Migration 007 (Complete PurchaseOrderProducts)
- Added 12 missing columns for full PO product tracking
- Issue: BatchNumber and other transaction columns missing
- **This migration completes the PurchaseOrderProducts schema**

## Summary
✅ Migration 007 executed successfully  
✅ All 12 missing columns added to database  
✅ DB_Schema_Service.js updated with complete schema  
✅ Backend server restarted with new code  
✅ Schema verification confirmed all columns present  

**Status**: Ready for testing. The "Invalid column name 'BatchNumber'" error should now be resolved.

## Next Steps
1. Test adding material to purchase order in UI
2. Verify material appears in PO products table
3. Test editing and deleting PO products
4. If issues persist, check browser console for any new errors
