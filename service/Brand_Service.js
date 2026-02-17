const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");

const MODULE_NAME = "Brand";

async function getBrand(pool, brandId) {
  try {
    if (!brandId || isNaN(parseInt(brandId))) {
      throw new CustomError("A valid numeric BrandID is required.");
    }

    const query = `
        SELECT 
            B.*,
            CU.UserName AS CreatedByUserName,
            UU.UserName AS UpdatedByUserName
        FROM Brands B
        LEFT JOIN Users CU ON B.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON B.UpdatedBy = UU.UserID
        WHERE B.BrandID = @BrandID AND B.IsDeleted = 0
    `;
    const request = pool.request().input("BrandID", sql.Int, brandId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError("No active brand found with the given ID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching brand: ${err.message}`);
  }
}

async function getAllBrands(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "BrandName";
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC";

    const whereClauses = ["B.IsDeleted = 0"];
    let request = pool.request();

    if (values.IsActive !== undefined) {
      whereClauses.push("B.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (searchTerm) {
      whereClauses.push(
        "(B.BrandName LIKE @SearchTerm OR B.BrandCode LIKE @SearchTerm OR B.MainBrand LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;
    const validSortColumns = [
      "BrandName",
      "BrandCode",
      "MainBrand",
      "CreatedDate",
    ];
    const safeSortBy = validSortColumns.includes(sortBy)
      ? `B.${sortBy}`
      : "B.BrandName";

    const countQuery = `SELECT COUNT(*) as total FROM Brands B ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = `
        SELECT 
            B.*,
            CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM Brands B
        LEFT JOIN Users CU ON B.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON B.UpdatedBy = UU.UserID
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
    throw new CustomError(`Error fetching all brands: ${err.message}`);
  }
}

async function addBrand(pool, values) {
  try {
    const { BrandCode, BrandName, MainBrand, IsActive, user_id } = values;

    if (!BrandCode || !BrandName || IsActive === undefined || !user_id) {
      throw new CustomError(
        "Brand Code, Brand Name, and Active status are required."
      );
    }

    let duplicateCheckQuery = `
        SELECT 
            (SELECT COUNT(*) FROM Brands WHERE BrandCode = @BrandCode AND IsDeleted = 0) as CodeCount,
            (SELECT COUNT(*) FROM Brands WHERE BrandName = @BrandName AND IsDeleted = 0) as NameCount
    `;
    let request = pool
      .request()
      .input("BrandCode", sql.NVarChar(50), BrandCode)
      .input("BrandName", sql.NVarChar(100), BrandName);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(`Brand with code '${BrandCode}' already exists.`);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(`Brand with name '${BrandName}' already exists.`);

    const query = `
        DECLARE @OutputTable TABLE (BrandID INT);
        INSERT INTO Brands (BrandCode, BrandName, MainBrand, IsActive, CreatedBy, UpdatedBy)
        OUTPUT INSERTED.BrandID INTO @OutputTable
        VALUES (@BrandCode, @BrandName, @MainBrand, @IsActive, @UserID, @UserID);
        SELECT BrandID FROM @OutputTable;
    `;
    const insertRequest = pool
      .request()
      .input("BrandCode", sql.NVarChar(50), BrandCode)
      .input("BrandName", sql.NVarChar(100), BrandName)
      .input("MainBrand", sql.NVarChar(100), MainBrand)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await insertRequest.query(query);
    const newBrandId = result.recordset[0].BrandID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_BRAND",
      moduleName: MODULE_NAME,
      referenceID: newBrandId,
      details: { newData: values },
    });

    return getBrand(pool, newBrandId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new brand: ${err.message}`);
  }
}

async function updateBrand(pool, values) {
  try {
    const { BrandID, ...updateData } = values;
    if (!BrandID) throw new CustomError("BrandID is required for update.");

    const { BrandCode, BrandName, MainBrand, IsActive, user_id } = updateData;
    const originalBrand = await getBrand(pool, BrandID);

    let duplicateCheckQuery = `
        SELECT 
            (SELECT COUNT(*) FROM Brands WHERE BrandCode = @BrandCode AND IsDeleted = 0 AND BrandID != @BrandID) as CodeCount,
            (SELECT COUNT(*) FROM Brands WHERE BrandName = @BrandName AND IsDeleted = 0 AND BrandID != @BrandID) as NameCount
    `;
    let request = pool
      .request()
      .input("BrandCode", sql.NVarChar(50), BrandCode)
      .input("BrandName", sql.NVarChar(100), BrandName)
      .input("BrandID", sql.Int, BrandID);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(`Brand with code '${BrandCode}' already exists.`);
    if (duplicateResult.recordset[0].NameCount > 0)
      throw new CustomError(`Brand with name '${BrandName}' already exists.`);

    const query = `
        UPDATE Brands SET
            BrandCode = @BrandCode, BrandName = @BrandName, MainBrand = @MainBrand,
            IsActive = @IsActive, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE BrandID = @BrandID;
    `;
    const updateRequest = pool
      .request()
      .input("BrandCode", sql.NVarChar(50), BrandCode)
      .input("BrandName", sql.NVarChar(100), BrandName)
      .input("MainBrand", sql.NVarChar(100), MainBrand)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id)
      .input("BrandID", sql.Int, BrandID);
    await updateRequest.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_BRAND",
      moduleName: MODULE_NAME,
      referenceID: BrandID,
      details: { oldData: originalBrand, newData: updateData },
    });

    return getBrand(pool, BrandID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating brand: ${err.message}`);
  }
}

async function deleteBrand(pool, values) {
  try {
    const { BrandID, user_id } = values;
    if (!BrandID) throw new CustomError("BrandID is required for deletion.");
    const brandToDelete = await getBrand(pool, BrandID);

    const query = `
        UPDATE Brands SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE BrandID = @BrandID;
    `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("BrandID", sql.Int, BrandID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_BRAND",
      moduleName: MODULE_NAME,
      referenceID: BrandID,
      details: { deletedData: brandToDelete },
    });

    return { message: "Brand deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting brand: ${err.message}`);
  }
}

async function getBrandsLite(pool, values) {
  // This function is no longer needed for parent selection but is kept for consistency
  try {
    let query = `
        SELECT BrandID, BrandName 
        FROM Brands 
        WHERE IsDeleted = 0 AND IsActive = 1
    `;
    const request = pool.request();
    query += " ORDER BY BrandName";
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching brands list: ${err.message}`);
  }
}

module.exports = {
  getBrand,
  getAllBrands,
  addBrand,
  updateBrand,
  deleteBrand,
  getBrandsLite,
};
