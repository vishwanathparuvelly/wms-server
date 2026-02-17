// service/ProductType_Service.js

const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");

const MODULE_NAME = "ProductType";

async function getProductType(pool, productTypeId) {
  try {
    if (!productTypeId || isNaN(parseInt(productTypeId))) {
      throw new CustomError("A valid numeric ProductTypeID is required.");
    }

    const query = `
        SELECT PT.*, CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM ProductTypes PT
        LEFT JOIN Users CU ON PT.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON PT.UpdatedBy = UU.UserID
        WHERE PT.ProductTypeID = @ProductTypeID AND PT.IsDeleted = 0
    `;
    const request = pool
      .request()
      .input("ProductTypeID", sql.Int, productTypeId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError("No active Product Type found with the given ID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching Product Type: ${err.message}`);
  }
}

async function getAllProductTypes(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "ProductTypeName";
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC";

    const whereClauses = ["PT.IsDeleted = 0"];
    let request = pool.request();

    if (values.IsActive !== undefined) {
      whereClauses.push("PT.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (searchTerm) {
      whereClauses.push(
        "(PT.ProductTypeName LIKE @SearchTerm OR PT.ParentProduct LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;
    const validSortColumns = [
      "ProductTypeName",
      "ParentProduct",
      "ProductColor",
      "CreatedDate",
    ];
    const safeSortBy = validSortColumns.includes(sortBy)
      ? `PT.${sortBy}`
      : "PT.ProductTypeName";

    const countQuery = `SELECT COUNT(*) as total FROM ProductTypes PT ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = `
        SELECT PT.*, CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM ProductTypes PT
        LEFT JOIN Users CU ON PT.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON PT.UpdatedBy = UU.UserID
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
    throw new CustomError(`Error fetching all Product Types: ${err.message}`);
  }
}

async function addProductType(pool, values) {
  try {
    const {
      ProductTypeName,
      ProductTypeDescription,
      ProductColor,
      ColorCode,
      ParentProduct,
      IsActive,
      user_id,
    } = values;

    if (
      !ProductTypeName ||
      !ProductTypeDescription ||
      !ProductColor ||
      IsActive === undefined ||
      !user_id
    ) {
      throw new CustomError(
        "Product Type Name, Description, Color, and Active status are required."
      );
    }

    let duplicateCheckQuery = `SELECT COUNT(*) as NameCount FROM ProductTypes WHERE ProductTypeName = @Name AND IsDeleted = 0`;
    let request = pool
      .request()
      .input("Name", sql.NVarChar(100), ProductTypeName);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Product Type with name '${ProductTypeName}' already exists.`
      );

    const query = `
        DECLARE @OutputTable TABLE (ProductTypeID INT);
        INSERT INTO ProductTypes (ProductTypeName, ProductTypeDescription, ProductColor, ColorCode, ParentProduct, IsActive, CreatedBy, UpdatedBy)
        OUTPUT INSERTED.ProductTypeID INTO @OutputTable
        VALUES (@Name, @Description, @Color, @ColorCode, @Parent, @IsActive, @UserID, @UserID);
        SELECT ProductTypeID FROM @OutputTable;
    `;
    const insertRequest = pool
      .request()
      .input("Name", sql.NVarChar(100), ProductTypeName)
      .input("Description", sql.NVarChar(500), ProductTypeDescription)
      .input("Color", sql.NVarChar(50), ProductColor)
      .input("ColorCode", sql.NVarChar(7), ColorCode)
      .input("Parent", sql.NVarChar(100), ParentProduct)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await insertRequest.query(query);
    const newId = result.recordset[0].ProductTypeID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_PRODUCT_TYPE",
      moduleName: MODULE_NAME,
      referenceID: newId,
      details: { newData: values },
    });

    return getProductType(pool, newId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new Product Type: ${err.message}`);
  }
}

async function updateProductType(pool, values) {
  try {
    const { ProductTypeID, ...updateData } = values;
    if (!ProductTypeID)
      throw new CustomError("ProductTypeID is required for update.");

    const {
      ProductTypeName,
      ProductTypeDescription,
      ProductColor,
      ColorCode,
      ParentProduct,
      IsActive,
      user_id,
    } = updateData;
    const original = await getProductType(pool, ProductTypeID);

    let duplicateCheckQuery = `SELECT COUNT(*) as NameCount FROM ProductTypes WHERE ProductTypeName = @Name AND IsDeleted = 0 AND ProductTypeID != @ID`;
    let request = pool
      .request()
      .input("Name", sql.NVarChar(100), ProductTypeName)
      .input("ID", sql.Int, ProductTypeID);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(
        `Product Type with name '${ProductTypeName}' already exists.`
      );

    const query = `
        UPDATE ProductTypes SET
            ProductTypeName = @Name, ProductTypeDescription = @Description, ProductColor = @Color, 
            ColorCode = @ColorCode, ParentProduct = @Parent, IsActive = @IsActive, 
            UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE ProductTypeID = @ID;
    `;
    const updateRequest = pool
      .request()
      .input("Name", sql.NVarChar(100), ProductTypeName)
      .input("Description", sql.NVarChar(500), ProductTypeDescription)
      .input("Color", sql.NVarChar(50), ProductColor)
      .input("ColorCode", sql.NVarChar(7), ColorCode)
      .input("Parent", sql.NVarChar(100), ParentProduct)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, ProductTypeID);
    await updateRequest.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_PRODUCT_TYPE",
      moduleName: MODULE_NAME,
      referenceID: ProductTypeID,
      details: { oldData: original, newData: updateData },
    });

    return getProductType(pool, ProductTypeID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating Product Type: ${err.message}`);
  }
}

async function deleteProductType(pool, values) {
  try {
    const { ProductTypeID, user_id } = values;
    if (!ProductTypeID)
      throw new CustomError("ProductTypeID is required for deletion.");
    const toDelete = await getProductType(pool, ProductTypeID);

    const query = `
        UPDATE ProductTypes SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE ProductTypeID = @ID;
    `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, ProductTypeID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_PRODUCT_TYPE",
      moduleName: MODULE_NAME,
      referenceID: ProductTypeID,
      details: { deletedData: toDelete },
    });
    return { message: "Product Type deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting Product Type: ${err.message}`);
  }
}

async function getParentProductTypes(pool) {
  try {
    const parentTypes = [
      "Smartphone",
      "Electronics",
      "Clothing",
      "Raw Material",
    ];
    return parentTypes;
  } catch (err) {
    throw new CustomError(
      `Error fetching parent product types: ${err.message}`
    );
  }
}
async function getProductTypesLite(pool, values) {
  try {
    let query = `
        SELECT ProductTypeID, ProductTypeName 
        FROM ProductTypes 
        WHERE IsDeleted = 0 AND IsActive = 1
        ORDER BY ProductTypeName
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching Product Types list: ${err.message}`);
  }
}

module.exports = {
  getProductType,
  getAllProductTypes,
  addProductType,
  updateProductType,
  deleteProductType,
  getParentProductTypes,
  getProductTypesLite,
};
