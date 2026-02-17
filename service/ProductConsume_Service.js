const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");

const MODULE_NAME = "ProductConsume";

async function getProductConsume(pool, productConsumeId) {
  try {
    if (!productConsumeId || isNaN(parseInt(productConsumeId))) {
      throw new CustomError("A valid numeric ProductConsumeID is required.");
    }

    const query = `
        SELECT PC.*, CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM ProductConsumes PC
        LEFT JOIN Users CU ON PC.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON PC.UpdatedBy = UU.UserID
        WHERE PC.ProductConsumeID = @ProductConsumeID AND PC.IsDeleted = 0
    `;
    const request = pool
      .request()
      .input("ProductConsumeID", sql.Int, productConsumeId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError(
        "No active Product Consume found with the given ID."
      );
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching Product Consume: ${err.message}`);
  }
}

async function getAllProductConsumes(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "ProductConsumeType";
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC";

    const whereClauses = ["PC.IsDeleted = 0"];
    let request = pool.request();

    if (values.IsActive !== undefined) {
      whereClauses.push("PC.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (searchTerm) {
      whereClauses.push(
        "(PC.ProductConsumeType LIKE @SearchTerm OR PC.ProductConsumeDescription LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;
    const validSortColumns = [
      "ProductConsumeType",
      "ProductConsumeDescription",
      "CreatedDate",
    ];
    const safeSortBy = validSortColumns.includes(sortBy)
      ? `PC.${sortBy}`
      : "PC.ProductConsumeType";

    const countQuery = `SELECT COUNT(*) as total FROM ProductConsumes PC ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = `
        SELECT PC.*, CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM ProductConsumes PC
        LEFT JOIN Users CU ON PC.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON PC.UpdatedBy = UU.UserID
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
    throw new CustomError(
      `Error fetching all Product Consumes: ${err.message}`
    );
  }
}

async function addProductConsume(pool, values) {
  try {
    const { ProductConsumeType, ProductConsumeDescription, IsActive, user_id } =
      values;

    if (
      !ProductConsumeType ||
      !ProductConsumeDescription ||
      IsActive === undefined ||
      !user_id
    ) {
      throw new CustomError(
        "Product Consume Type, Description, and Active status are required."
      );
    }

    let duplicateCheckQuery = `SELECT COUNT(*) as TypeCount FROM ProductConsumes WHERE ProductConsumeType = @Type AND IsDeleted = 0`;
    let request = pool
      .request()
      .input("Type", sql.NVarChar(100), ProductConsumeType);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].TypeCount > 0)
      throw new CustomError(
        `Product Consume with type '${ProductConsumeType}' already exists.`
      );

    const query = `
        DECLARE @OutputTable TABLE (ProductConsumeID INT);
        INSERT INTO ProductConsumes (ProductConsumeType, ProductConsumeDescription, IsActive, CreatedBy, UpdatedBy)
        OUTPUT INSERTED.ProductConsumeID INTO @OutputTable
        VALUES (@Type, @Description, @IsActive, @UserID, @UserID);
        SELECT ProductConsumeID FROM @OutputTable;
    `;
    const insertRequest = pool
      .request()
      .input("Type", sql.NVarChar(100), ProductConsumeType)
      .input("Description", sql.NVarChar(500), ProductConsumeDescription)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await insertRequest.query(query);
    const newId = result.recordset[0].ProductConsumeID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_PRODUCT_CONSUME",
      moduleName: MODULE_NAME,
      referenceID: newId,
      details: { newData: values },
    });

    return getProductConsume(pool, newId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new Product Consume: ${err.message}`);
  }
}

async function updateProductConsume(pool, values) {
  try {
    const { ProductConsumeID, ...updateData } = values;
    if (!ProductConsumeID)
      throw new CustomError("ProductConsumeID is required for update.");

    const { ProductConsumeType, ProductConsumeDescription, IsActive, user_id } =
      updateData;
    const original = await getProductConsume(pool, ProductConsumeID);

    let duplicateCheckQuery = `SELECT COUNT(*) as TypeCount FROM ProductConsumes WHERE ProductConsumeType = @Type AND IsDeleted = 0 AND ProductConsumeID != @ID`;
    let request = pool
      .request()
      .input("Type", sql.NVarChar(100), ProductConsumeType)
      .input("ID", sql.Int, ProductConsumeID);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].TypeCount > 0)
      throw new CustomError(
        `Product Consume with type '${ProductConsumeType}' already exists.`
      );

    const query = `
        UPDATE ProductConsumes SET
            ProductConsumeType = @Type, ProductConsumeDescription = @Description, IsActive = @IsActive, 
            UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE ProductConsumeID = @ID;
    `;
    const updateRequest = pool
      .request()
      .input("Type", sql.NVarChar(100), ProductConsumeType)
      .input("Description", sql.NVarChar(500), ProductConsumeDescription)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, ProductConsumeID);
    await updateRequest.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_PRODUCT_CONSUME",
      moduleName: MODULE_NAME,
      referenceID: ProductConsumeID,
      details: { oldData: original, newData: updateData },
    });

    return getProductConsume(pool, ProductConsumeID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating Product Consume: ${err.message}`);
  }
}

async function deleteProductConsume(pool, values) {
  try {
    const { ProductConsumeID, user_id } = values;
    if (!ProductConsumeID)
      throw new CustomError("ProductConsumeID is required for deletion.");
    const toDelete = await getProductConsume(pool, ProductConsumeID);

    const query = `
        UPDATE ProductConsumes SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE ProductConsumeID = @ID;
    `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, ProductConsumeID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_PRODUCT_CONSUME",
      moduleName: MODULE_NAME,
      referenceID: ProductConsumeID,
      details: { deletedData: toDelete },
    });
    return { message: "Product Consume deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting Product Consume: ${err.message}`);
  }
}

async function getProductConsumesLite(pool) {
  try {
    let query = `
        SELECT ProductConsumeID, ProductConsumeType 
        FROM ProductConsumes 
        WHERE IsDeleted = 0 AND IsActive = 1
        ORDER BY ProductConsumeType
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(
      `Error fetching Product Consumes list: ${err.message}`
    );
  }
}

module.exports = {
  getProductConsume,
  getAllProductConsumes,
  addProductConsume,
  updateProductConsume,
  deleteProductConsume,
  getProductConsumesLite,
};
