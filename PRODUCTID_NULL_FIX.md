# ProductID NULL Constraint Fix

## Issue
After adding MaterialID support, trying to add materials to PO resulted in error:
```
Cannot insert the value NULL into column 'ProductID', table 'Pharma.dbo.PurchaseOrderProducts'; 
column does not allow nulls. UPDATE fails.
```

## Root Cause
Migration 006 added MaterialID column but **forgot to make ProductID nullable**. The dual-reference model requires that ProductID can be NULL when MaterialID is provided.

## Solution
Updated migration 006 to include Step 1.5:
- Check if ProductID is nullable
- If NOT NULL, alter column to allow NULL
- Temporarily drop CHECK constraint if needed before altering column

## Code Change
**File**: `migrations/006_add_material_support_to_po.js`

Added between Step 1 and Step 2:
```javascript
// Step 1.5: Make ProductID nullable to support dual-reference model
const checkProductIDNullable = await pool.request().query(`
  SELECT IS_NULLABLE 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'PurchaseOrderProducts' 
  AND COLUMN_NAME = 'ProductID'
`);

if (checkProductIDNullable.recordset[0]?.IS_NULLABLE === 'NO') {
  // Drop the check constraint temporarily if it exists
  const checkConstraintExists = await pool.request().query(`
    SELECT COUNT(*) as count
    FROM sys.check_constraints
    WHERE name = 'CHK_POP_ItemReference'
  `);
  
  if (checkConstraintExists.recordset[0].count > 0) {
    await pool.request().query(`
      ALTER TABLE PurchaseOrderProducts 
      DROP CONSTRAINT CHK_POP_ItemReference
    `);
  }

  // Alter ProductID to allow NULL
  await pool.request().query(`
    ALTER TABLE PurchaseOrderProducts 
    ALTER COLUMN ProductID INT NULL
  `);
  console.log("✓ Made ProductID column nullable");
} else {
  console.log("→ ProductID column is already nullable");
}
```

## Verification
Before fix:
```
3. ProductID    int    NOT NULL  ❌
```

After fix:
```
3. ProductID    int    NULL      ✅
```

## Testing Result
✅ Migration 006 re-run successfully  
✅ ProductID is now nullable  
✅ CHECK constraint recreated: `(ProductID IS NOT NULL OR MaterialID IS NOT NULL)`  
✅ Backend server restarted  

## Why This Matters
The dual-reference model allows:
- **Pharma domain**: Set MaterialID, leave ProductID as NULL
- **FMCG/Trading domain**: Set ProductID, leave MaterialID as NULL
- **Constraint ensures**: At least one of them must be provided

## Next Action
Try adding a material to the purchase order again. The error should now be resolved.
