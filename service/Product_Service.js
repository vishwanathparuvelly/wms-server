// service/Product_Service.js

const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");
const validationService = require("./Validation_Service");

const MODULE_NAME = "Product";

/**
 * Shared validation logic for add and update.
 * It now uses the central Validation_Service for all foreign key checks.
 */
async function validateProductInput(pool, values, isUpdate = false) {
  const requiredFields = [
    "ProductCode",
    "ProductName",
    "BrandID",
    "ProductTypeID",
    "UOMID",
    "NetWeight",
    "GrossWeight",
    "ShelfLifeDays",
    "NearExpiryDays",
    "Length",
    "Breadth",
    "Height",
    "MinimumQty",
    "ReorderLevelQty",
    "IsActive",
    "user_id",
  ];

  for (const field of requiredFields) {
    const value = values[field];
    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "")
    ) {
      throw new CustomError(`${field} is required.`);
    }
  }

  // 1. Foreign Key Validation (using Validation_Service)
  await validationService.validateBrandExists(pool, values.BrandID);
  await validationService.validateProductTypeExists(pool, values.ProductTypeID);
  await validationService.validateUOMExists(pool, values.UOMID);

  // UPDATED: Conditional validation for optional fields
  if (values.LineID) {
    await validationService.validateLineExists(pool, values.LineID);
  }
  if (values.ProductConsumeID) {
    await validationService.validateProductConsumeExists(
      pool,
      values.ProductConsumeID
    );
  }
  if (values.PackagingTypeID) {
    await validationService.validatePackagingTypeExists(
      pool,
      values.PackagingTypeID
    );
  }
  if (values.DefaultSlocID) {
    await validationService.validateSlocExists(pool, values.DefaultSlocID);
  }

  // 2. Numeric and Range Validation
  const numericFields = [
    "NetWeight",
    "GrossWeight",
    "Length",
    "Breadth",
    "Height",
    "MinimumQty",
    "ReorderLevelQty",
  ];
  for (const field of numericFields) {
    if (isNaN(parseFloat(values[field])) || parseFloat(values[field]) <= 0) {
      throw new CustomError(`${field} must be a positive number.`);
    }
  }
  const intFields = ["ShelfLifeDays", "NearExpiryDays"];
  for (const field of intFields) {
    if (isNaN(parseInt(values[field])) || parseInt(values[field]) < 1) {
      throw new CustomError(`${field} must be a positive integer.`);
    }
  }

  // 3. Uniqueness Check (Code and Name)
  const duplicateCheckQuery = `
        SELECT 
            (SELECT COUNT(*) FROM Products WHERE ProductCode = @ProductCode AND IsDeleted = 0 ${
              isUpdate ? "AND ProductID != @ProductID" : ""
            }) as CodeCount,
            (SELECT COUNT(*) FROM Products WHERE ProductName = @ProductName AND IsDeleted = 0 ${
              isUpdate ? "AND ProductID != @ProductID" : ""
            }) as NameCount
    `;
  let request = pool
    .request()
    .input("ProductCode", sql.NVarChar(50), values.ProductCode)
    .input("ProductName", sql.NVarChar(255), values.ProductName);

  if (isUpdate) {
    request.input("ProductID", sql.Int, values.ProductID);
  }
  const duplicateResult = await request.query(duplicateCheckQuery);
  if (duplicateResult.recordset[0].CodeCount > 0)
    throw new CustomError(
      `Product with code '${values.ProductCode}' already exists.`
    );
  if (duplicateResult.recordset[0].NameCount > 0)
    throw new CustomError(
      `Product with name '${values.ProductName}' already exists.`
    );

  // 4. Pallet Config Validation
  const palletConfigs = values.PalletConfigs || [];
  if (palletConfigs.length === 0)
    throw new CustomError("At least one Pallet Configuration is required.");
  const activeConfigs = palletConfigs.filter((c) => c.IsActive);
  if (activeConfigs.length === 0)
    throw new CustomError("At least one Pallet Configuration must be active.");
  if (activeConfigs.filter((c) => c.IsDefault).length !== 1)
    throw new CustomError(
      "Exactly one active Pallet Configuration must be set as Default."
    );

  const usedPalletIds = new Set();
  for (const config of palletConfigs) {
    if (!config.PalletTypeID)
      throw new CustomError(
        "All Pallet Configurations must specify a PalletTypeID."
      );
    if (usedPalletIds.has(config.PalletTypeID))
      throw new CustomError(
        `Duplicate Pallet Type ID found in configuration: ${config.PalletTypeID}`
      );
    usedPalletIds.add(config.PalletTypeID);

    const capacity = parseInt(config.MaxCapacity);
    if (isNaN(capacity) || capacity <= 0)
      throw new CustomError(
        `Max Capacity for Pallet ID ${config.PalletTypeID} must be a positive integer.`
      );
  }
}

/**
 * Fetches a single product by its ID.
 */
async function getProduct(pool, productId) {
  try {
    if (!productId || isNaN(parseInt(productId))) {
      throw new CustomError("A valid numeric ProductID is required.");
    }

    const query = `
            SELECT 
                P.*,
                B.BrandName, PT.ProductTypeName, U.UOMName AS BaseUOMName,
                L.LineName, PC.ProductConsumeType, PKG.PackagingTypeName, S.SlocName AS DefaultSlocName,
                CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
            FROM Products P
            LEFT JOIN Brands B ON P.BrandID = B.BrandID
            LEFT JOIN ProductTypes PT ON P.ProductTypeID = PT.ProductTypeID
            LEFT JOIN UOMs U ON P.UOMID = U.UOMID
            LEFT JOIN Lines L ON P.LineID = L.LineID
            LEFT JOIN ProductConsumes PC ON P.ProductConsumeID = PC.ProductConsumeID
            LEFT JOIN PackagingTypes PKG ON P.PackagingTypeID = PKG.PackagingTypeID
            LEFT JOIN Slocs S ON P.DefaultSlocID = S.SlocID
            LEFT JOIN Users CU ON P.CreatedBy = CU.UserID
            LEFT JOIN Users UU ON P.UpdatedBy = UU.UserID
            WHERE P.ProductID = @ProductID AND P.IsDeleted = 0;

            SELECT PPC.*, PT.PalletName
            FROM ProductPalletConfigs PPC
            LEFT JOIN PalletTypes PT ON PPC.PalletTypeID = PT.PalletTypeID
            WHERE PPC.ProductID = @ProductID AND PPC.IsDeleted = 0;
        `;
    const request = pool.request().input("ProductID", sql.Int, productId);
    const result = await request.query(query);

    if (result.recordsets[0].length === 0) {
      throw new CustomError("No active product found with the given ID.");
    }
    const product = result.recordsets[0][0];
    product.PalletConfigs = result.recordsets[1] || [];

    return product;
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching product: ${err.message}`);
  }
}

/**
 * Fetches a paginated, searchable, and sortable list of all products.
 */
// service/Product_Service.js (REPLACE THIS FUNCTION)

async function getAllProducts(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "ProductName";
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC";

    let request = pool.request();
    const whereClauses = ["P.IsDeleted = 0"];

    if (values.IsActive !== undefined) {
      whereClauses.push("P.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (searchTerm) {
      whereClauses.push(
        "(P.ProductName LIKE @SearchTerm OR P.ProductCode LIKE @SearchTerm OR B.BrandName LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;

    const sortColumnMap = {
      ProductName: "P.ProductName",
      ProductCode: "P.ProductCode",
      BrandName: "B.BrandName",
      NetWeight: "P.NetWeight",
      UOMName: "U.UOMName",
      CreatedDate: "P.CreatedDate",
    };
    const safeSortBy = sortColumnMap[sortBy] || "P.ProductName";

    const countQuery = `SELECT COUNT(*) as total FROM Products P LEFT JOIN Brands B ON P.BrandID = B.BrandID ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    // FIXED: Changed the SELECT statement to fetch all columns from the Products table (P.*)
    const query = `
            SELECT 
                P.*,
                B.BrandName, 
                PT.ProductTypeName, 
                U.UOMName,
                CU.UserName AS CreatedByUserName, 
                UU.UserName AS UpdatedByUserName
            FROM Products P
            LEFT JOIN Brands B ON P.BrandID = B.BrandID
            LEFT JOIN ProductTypes PT ON P.ProductTypeID = PT.ProductTypeID
            LEFT JOIN UOMs U ON P.UOMID = U.UOMID
            LEFT JOIN Users CU ON P.CreatedBy = CU.UserID
            LEFT JOIN Users UU ON P.UpdatedBy = UU.UserID
            ${whereClause}
            ORDER BY ${safeSortBy} ${sortOrder}
            OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
        `;
    const result = await request.query(query);

    return {
      data: result.recordset,
      pagination: { totalItems, totalPages, currentPage: page, pageSize },
    };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching all products: ${err.message}`);
  }
}

/**
 * Adds a new product to the database.
 */
async function addProduct(pool, values) {
  const transaction = new sql.Transaction(pool);
  let transactionBegun = false;
  try {
    await validateProductInput(pool, values, false);

    const { PalletConfigs, user_id, ...productData } = values;

    await transaction.begin();
    transactionBegun = true;

    const insertRequest = new sql.Request(transaction);
    const query = `
            DECLARE @OutputTable TABLE (ProductID INT);
            INSERT INTO Products (
                ProductCode, ProductName, BrandID, ProductTypeID, UOMID, NetWeight, GrossWeight, ShelfLifeDays,
                NearExpiryDays, Length, Breadth, Height, MinimumQty, ReorderLevelQty, LineID, ProductConsumeID,
                PackagingTypeID, Category, HSNCode, DefaultSlocID, IsHazmat, IsActive, CreatedBy, UpdatedBy
            )
            OUTPUT INSERTED.ProductID INTO @OutputTable
            VALUES (
                @ProductCode, @ProductName, @BrandID, @ProductTypeID, @UOMID, @NetWeight, @GrossWeight, @ShelfLifeDays,
                @NearExpiryDays, @Length, @Breadth, @Height, @MinimumQty, @ReorderLevelQty, @LineID, @ProductConsumeID,
                @PackagingTypeID, @Category, @HSNCode, @DefaultSlocID, @IsHazmat, @IsActive, @UserID, @UserID
            );
            SELECT ProductID FROM @OutputTable;
        `;

    insertRequest
      .input("ProductCode", sql.NVarChar(50), productData.ProductCode)
      .input("ProductName", sql.NVarChar(255), productData.ProductName)
      .input("BrandID", sql.Int, productData.BrandID)
      .input("ProductTypeID", sql.Int, productData.ProductTypeID)
      .input("UOMID", sql.Int, productData.UOMID)
      .input("NetWeight", sql.Decimal(10, 2), productData.NetWeight)
      .input("GrossWeight", sql.Decimal(10, 2), productData.GrossWeight)
      .input("ShelfLifeDays", sql.Int, productData.ShelfLifeDays)
      .input("NearExpiryDays", sql.Int, productData.NearExpiryDays)
      .input("Length", sql.Decimal(10, 2), productData.Length)
      .input("Breadth", sql.Decimal(10, 2), productData.Breadth)
      .input("Height", sql.Decimal(10, 2), productData.Height)
      .input("MinimumQty", sql.Decimal(10, 2), productData.MinimumQty)
      .input("ReorderLevelQty", sql.Decimal(10, 2), productData.ReorderLevelQty)
      .input("LineID", sql.Int, productData.LineID)
      .input("ProductConsumeID", sql.Int, productData.ProductConsumeID)
      .input("PackagingTypeID", sql.Int, productData.PackagingTypeID)
      .input("Category", sql.NVarChar(100), productData.Category)
      .input("HSNCode", sql.NVarChar(50), productData.HSNCode)
      .input("DefaultSlocID", sql.Int, productData.DefaultSlocID)
      .input("IsHazmat", sql.Bit, productData.IsHazmat || false)
      .input("IsActive", sql.Bit, productData.IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await insertRequest.query(query);
    const newProductID = result.recordset[0].ProductID;

    // Bulk Insert ProductPalletConfigs
    const table = new sql.Table("ProductPalletConfigs");
    table.columns.add("ProductID", sql.Int, { nullable: false });
    table.columns.add("PalletTypeID", sql.Int, { nullable: false });
    table.columns.add("MaxCapacity", sql.Int, { nullable: false });
    table.columns.add("IsDefault", sql.Bit, { nullable: false });
    table.columns.add("IsActive", sql.Bit, { nullable: false });
    table.columns.add("CreatedBy", sql.Int, { nullable: false });
    table.columns.add("UpdatedBy", sql.Int, { nullable: false });

    PalletConfigs.forEach((config) => {
      table.rows.add(
        newProductID,
        config.PalletTypeID,
        config.MaxCapacity,
        config.IsDefault,
        config.IsActive,
        user_id,
        user_id
      );
    });

    const bulkInsertRequest = new sql.Request(transaction);
    await bulkInsertRequest.bulk(table);

    await transaction.commit();

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_PRODUCT",
      moduleName: MODULE_NAME,
      referenceID: newProductID,
      details: { newData: values },
    });

    return { message: "Product created successfully", ProductID: newProductID };
  } catch (err) {
    if (transactionBegun) {
      await transaction.rollback();
    }
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new product: ${err.message}`);
  }
}

/**
 * Updates an existing product.
 */
async function updateProduct(pool, values) {
  const transaction = new sql.Transaction(pool);
  let transactionBegun = false;
  try {
    const { ProductID, PalletConfigs, user_id, ...productData } = values;
    if (!ProductID) throw new CustomError("ProductID is required for update.");

    await validateProductInput(pool, values, true);
    const originalProduct = await getProduct(pool, ProductID);

    await transaction.begin();
    transactionBegun = true;

    // 1. Update main Products table
    const updateRequest = new sql.Request(transaction);
    const updateQuery = `
            UPDATE Products SET
                ProductCode = @ProductCode, ProductName = @ProductName, BrandID = @BrandID, ProductTypeID = @ProductTypeID, 
                UOMID = @UOMID, NetWeight = @NetWeight, GrossWeight = @GrossWeight, ShelfLifeDays = @ShelfLifeDays,
                NearExpiryDays = @NearExpiryDays, Length = @Length, Breadth = @Breadth, Height = @Height,
                MinimumQty = @MinimumQty, ReorderLevelQty = @ReorderLevelQty, LineID = @LineID, 
                ProductConsumeID = @ProductConsumeID, PackagingTypeID = @PackagingTypeID, Category = @Category, 
                HSNCode = @HSNCode, DefaultSlocID = @DefaultSlocID, IsHazmat = @IsHazmat, IsActive = @IsActive, 
                UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
            WHERE ProductID = @ProductID;
        `;
    updateRequest
      .input("ProductID", sql.Int, ProductID)
      .input("ProductCode", sql.NVarChar(50), productData.ProductCode)
      .input("ProductName", sql.NVarChar(255), productData.ProductName)
      .input("BrandID", sql.Int, productData.BrandID)
      .input("ProductTypeID", sql.Int, productData.ProductTypeID)
      .input("UOMID", sql.Int, productData.UOMID)
      .input("NetWeight", sql.Decimal(10, 2), productData.NetWeight)
      .input("GrossWeight", sql.Decimal(10, 2), productData.GrossWeight)
      .input("ShelfLifeDays", sql.Int, productData.ShelfLifeDays)
      .input("NearExpiryDays", sql.Int, productData.NearExpiryDays)
      .input("Length", sql.Decimal(10, 2), productData.Length)
      .input("Breadth", sql.Decimal(10, 2), productData.Breadth)
      .input("Height", sql.Decimal(10, 2), productData.Height)
      .input("MinimumQty", sql.Decimal(10, 2), productData.MinimumQty)
      .input("ReorderLevelQty", sql.Decimal(10, 2), productData.ReorderLevelQty)
      .input("LineID", sql.Int, productData.LineID)
      .input("ProductConsumeID", sql.Int, productData.ProductConsumeID)
      .input("PackagingTypeID", sql.Int, productData.PackagingTypeID)
      .input("Category", sql.NVarChar(100), productData.Category)
      .input("HSNCode", sql.NVarChar(50), productData.HSNCode)
      .input("DefaultSlocID", sql.Int, productData.DefaultSlocID)
      .input("IsHazmat", sql.Bit, productData.IsHazmat || false)
      .input("IsActive", sql.Bit, productData.IsActive)
      .input("UpdatedBy", sql.Int, user_id);

    await updateRequest.query(updateQuery);

    // 2. Manage ProductPalletConfigs
    const existingConfigIDs = originalProduct.PalletConfigs.map(
      (c) => c.ConfigID
    );
    const newConfigIDs = PalletConfigs.map((c) => c.ConfigID).filter(
      (id) => id
    );
    const idsToDelete = existingConfigIDs.filter(
      (id) => !newConfigIDs.includes(id)
    );

    if (idsToDelete.length > 0) {
      await new sql.Request(transaction)
        .input("UpdatedBy", sql.Int, user_id)
        .input("ProductID", sql.Int, ProductID)
        .query(
          `UPDATE ProductPalletConfigs SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE() WHERE ProductID = @ProductID AND ConfigID IN (${idsToDelete.join(
            ","
          )})`
        );
    }

    for (const config of PalletConfigs) {
      if (config.ConfigID) {
        // Update existing config
        await new sql.Request(transaction)
          .input("ConfigID", sql.Int, config.ConfigID)
          .input("MaxCapacity", sql.Int, config.MaxCapacity)
          .input("IsDefault", sql.Bit, config.IsDefault)
          .input("IsActive", sql.Bit, config.IsActive)
          .input("UpdatedBy", sql.Int, user_id)
          .query(
            `UPDATE ProductPalletConfigs SET MaxCapacity = @MaxCapacity, IsDefault = @IsDefault, IsActive = @IsActive, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE() WHERE ConfigID = @ConfigID`
          );
      }
    }

    const configsToInsert = PalletConfigs.filter((c) => !c.ConfigID);
    if (configsToInsert.length > 0) {
      const table = new sql.Table("ProductPalletConfigs");
      table.columns.add("ProductID", sql.Int, { nullable: false });
      table.columns.add("PalletTypeID", sql.Int, { nullable: false });
      table.columns.add("MaxCapacity", sql.Int, { nullable: false });
      table.columns.add("IsDefault", sql.Bit, { nullable: false });
      table.columns.add("IsActive", sql.Bit, { nullable: false });
      table.columns.add("CreatedBy", sql.Int, { nullable: false });
      table.columns.add("UpdatedBy", sql.Int, { nullable: false });

      configsToInsert.forEach((config) => {
        table.rows.add(
          ProductID,
          config.PalletTypeID,
          config.MaxCapacity,
          config.IsDefault,
          config.IsActive,
          user_id,
          user_id
        );
      });
      await new sql.Request(transaction).bulk(table);
    }

    await transaction.commit();

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_PRODUCT",
      moduleName: MODULE_NAME,
      referenceID: ProductID,
      details: { oldData: originalProduct, newData: values },
    });

    return getProduct(pool, ProductID);
  } catch (err) {
    if (transactionBegun) {
      await transaction.rollback();
    }
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating product: ${err.message}`);
  }
}

/**
 * Soft-deletes a product. Includes a dependency check.
 */
// service/Product_Service.js

// service/Product_Service.js

/**
 * Soft-deletes a product. Includes a dependency check against the correct inventory table.
 */
async function deleteProduct(pool, values) {
  try {
    const { ProductID, user_id } = values;
    if (!ProductID)
      throw new CustomError("ProductID is required for deletion.");

    const productToDelete = await getProduct(pool, ProductID);

    // Dependency Check: Prevent deletion if product has active stock in any bin.
    // This now correctly points to the 'BinProducts' table and 'FilledQuantity' column.
    const dependencyCheckRequest = pool.request();
    dependencyCheckRequest.input("ProductID", sql.Int, ProductID);
    const dependencyResult = await dependencyCheckRequest.query(
      `SELECT SUM(FilledQuantity) as totalStock FROM BinProducts WHERE ProductID = @ProductID`
    );

    if (
      dependencyResult.recordset.length > 0 &&
      dependencyResult.recordset[0].totalStock > 0
    ) {
      // This is the user-friendly error message we discussed.
      throw new CustomError(
        "Cannot delete this product because it has active stock in the warehouse. To proceed, please ensure the inventory for this product is zero."
      );
    }

    const query = `
            UPDATE Products SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
            WHERE ProductID = @ProductID;
        `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("ProductID", sql.Int, ProductID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_PRODUCT",
      moduleName: MODULE_NAME,
      referenceID: ProductID,
      details: { deletedData: productToDelete },
    });

    return { message: "Product deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting product: ${err.message}`);
  }
}

/**
 * Fetches a simplified list of products for dropdowns.
 */
async function getProductsLite(pool, values) {
  try {
    let query = `
            SELECT ProductID, ProductName, ProductCode
            FROM Products 
            WHERE IsDeleted = 0 AND IsActive = 1
        `;
    const request = pool.request();

    query += " ORDER BY ProductName";
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching products list: ${err.message}`);
  }
}
// service/Product_Service.js (ADD THIS NEW FUNCTION)

/**
 * Fetches a flattened list of all products joined with their pallet configurations for exporting.
 * This is separate from getAllProducts to avoid sending unnecessary data to the UI.
 */
async function getProductsForExport(pool) {
  try {
    const query = `
            SELECT 
                P.*,
                B.BrandName, 
                PT.ProductTypeName, 
                U.UOMName,
                PLT.PalletName,
                PPC.MaxCapacity,
                PPC.IsDefault AS IsPalletDefault,
                PPC.IsActive AS IsPalletActive
            FROM Products P
            LEFT JOIN Brands B ON P.BrandID = B.BrandID
            LEFT JOIN ProductTypes PT ON P.ProductTypeID = PT.ProductTypeID
            LEFT JOIN UOMs U ON P.UOMID = U.UOMID
            LEFT JOIN ProductPalletConfigs PPC ON P.ProductID = PPC.ProductID AND PPC.IsDeleted = 0
            LEFT JOIN PalletTypes PLT ON PPC.PalletTypeID = PLT.PalletTypeID
            WHERE P.IsDeleted = 0
            ORDER BY P.ProductID, PLT.PalletName;
        `;
    const result = await pool.request().query(query);
    return { data: result.recordset }; // Return in the expected format { data: [...] }
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching products for export: ${err.message}`);
  }
}
// service/Product_Service.js (ADD THIS NEW FUNCTION)

/**
 * Adds or updates a single pallet configuration for an existing product.
 * Uses a MERGE statement for robustness.
 */
async function addPalletConfigToProduct(pool, values) {
  try {
    const {
      ProductID,
      PalletTypeID,
      MaxCapacity,
      IsDefault,
      IsActive,
      user_id,
    } = values;

    // Basic validation for the payload
    if (!ProductID || !PalletTypeID || !MaxCapacity) {
      throw new CustomError(
        "ProductID, PalletTypeID, and MaxCapacity are required to add a pallet config."
      );
    }

    const query = `
            MERGE INTO ProductPalletConfigs AS Target
            USING (VALUES (@ProductID, @PalletTypeID)) AS Source (ProductID, PalletTypeID)
            ON Target.ProductID = Source.ProductID AND Target.PalletTypeID = Source.PalletTypeID
            WHEN MATCHED THEN
                UPDATE SET
                    MaxCapacity = @MaxCapacity,
                    IsDefault = @IsDefault,
                    IsActive = @IsActive,
                    IsDeleted = 0, -- Reactivate if it was soft-deleted
                    UpdatedBy = @UserID,
                    UpdatedDate = GETDATE()
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (ProductID, PalletTypeID, MaxCapacity, IsDefault, IsActive, CreatedBy, UpdatedBy)
                VALUES (@ProductID, @PalletTypeID, @MaxCapacity, @IsDefault, @IsActive, @UserID, @UserID);
        `;

    const request = pool
      .request()
      .input("ProductID", sql.Int, ProductID)
      .input("PalletTypeID", sql.Int, PalletTypeID)
      .input("MaxCapacity", sql.Int, MaxCapacity)
      .input("IsDefault", sql.Bit, IsDefault || false)
      .input("IsActive", sql.Bit, IsActive === undefined ? true : IsActive)
      .input("UserID", sql.Int, user_id);

    await request.query(query);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error in addPalletConfigToProduct: ${err.message}`);
  }
}

console.log("--- Loading Product_Service.js ---");
console.log(
  "Is getProductsForExport a function?",
  typeof getProductsForExport === "function"
);

module.exports = {
  getProduct,
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getProductsLite,
  getProductsForExport,
  addPalletConfigToProduct,
};
