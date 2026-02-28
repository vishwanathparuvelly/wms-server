const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");

const MODULE_NAME = "Material";

async function getMaterial(pool, materialId) {
  try {
    if (!materialId || isNaN(parseInt(materialId))) {
      throw new CustomError("A valid numeric MaterialID is required.");
    }

    const query = `
        SELECT 
            M.*,
            U.UOMName, U.UOMCode,
            V.VendorName, V.VendorCode,
            CU.UserName AS CreatedByUserName,
            UU.UserName AS UpdatedByUserName
        FROM Materials M
        LEFT JOIN UOMs U ON M.UOMID = U.UOMID
        LEFT JOIN Vendors V ON M.VendorID = V.VendorID
        LEFT JOIN Users CU ON M.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON M.UpdatedBy = UU.UserID
        WHERE M.MaterialID = @MaterialID AND M.IsDeleted = 0
    `;
    const request = pool.request().input("MaterialID", sql.Int, materialId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError("No active material found with the given ID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching material: ${err.message}`);
  }
}

async function getAllMaterials(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "MaterialName";
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC";

    const whereClauses = ["M.IsDeleted = 0"];
    let request = pool.request();

    if (values.IsActive !== undefined) {
      whereClauses.push("M.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (values.VendorID) {
      whereClauses.push("M.VendorID = @VendorID");
      request.input("VendorID", sql.Int, values.VendorID);
    }
    if (values.UOMID) {
      whereClauses.push("M.UOMID = @UOMID");
      request.input("UOMID", sql.Int, values.UOMID);
    }
    if (searchTerm) {
      whereClauses.push(
        "(M.MaterialName LIKE @SearchTerm OR M.MaterialCode LIKE @SearchTerm OR M.MaterialDescription LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;
    const validSortColumns = [
      "MaterialName",
      "MaterialCode",
      "MaterialDescription",
      "CreatedDate",
    ];
    const safeSortBy = validSortColumns.includes(sortBy)
      ? `M.${sortBy}`
      : "M.MaterialName";

    const countQuery = `SELECT COUNT(*) as total FROM Materials M ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = `
        SELECT 
            M.*,
            U.UOMName, U.UOMCode,
            V.VendorName, V.VendorCode,
            CU.UserName AS CreatedByUserName,
            UU.UserName AS UpdatedByUserName
        FROM Materials M
        LEFT JOIN UOMs U ON M.UOMID = U.UOMID
        LEFT JOIN Vendors V ON M.VendorID = V.VendorID
        LEFT JOIN Users CU ON M.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON M.UpdatedBy = UU.UserID
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
    throw new CustomError(`Error fetching all materials: ${err.message}`);
  }
}

async function addMaterial(pool, values) {
  try {
    const { 
      MaterialCode, MaterialName, MaterialDescription, UOMID, VendorID, 
      ManufacturerName, SupplierName, ManufacturerMaterialReference,
      IsActive, user_id 
    } = values;

    if (!MaterialCode || !MaterialName || IsActive === undefined || !user_id) {
      throw new CustomError(
        "Material Code, Material Name, and Active status are required."
      );
    }

    // Check for duplicate code
    let duplicateCheckQuery = `
        SELECT 
            (SELECT COUNT(*) FROM Materials WHERE MaterialCode = @MaterialCode AND IsDeleted = 0) as CodeCount
    `;
    let request = pool
      .request()
      .input("MaterialCode", sql.NVarChar(50), MaterialCode);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(`Material with code '${MaterialCode}' already exists.`);

    const query = `
        DECLARE @OutputTable TABLE (MaterialID INT);
        INSERT INTO Materials (
          MaterialCode, MaterialName, MaterialDescription, UOMID, VendorID, 
          ManufacturerName, SupplierName, ManufacturerMaterialReference,
          IsActive, CreatedBy, UpdatedBy
        )
        OUTPUT INSERTED.MaterialID INTO @OutputTable
        VALUES (
          @MaterialCode, @MaterialName, @MaterialDescription, @UOMID, @VendorID, 
          @ManufacturerName, @SupplierName, @ManufacturerMaterialReference,
          @IsActive, @UserID, @UserID
        );
        SELECT MaterialID FROM @OutputTable;
    `;
    const insertRequest = pool
      .request()
      .input("MaterialCode", sql.NVarChar(50), MaterialCode)
      .input("MaterialName", sql.NVarChar(255), MaterialName)
      .input("MaterialDescription", sql.NVarChar(sql.MAX), MaterialDescription || null)
      .input("UOMID", sql.Int, UOMID || null)
      .input("VendorID", sql.Int, VendorID || null)
      .input("ManufacturerName", sql.NVarChar(255), ManufacturerName || null)
      .input("SupplierName", sql.NVarChar(255), SupplierName || null)
      .input("ManufacturerMaterialReference", sql.NVarChar(255), ManufacturerMaterialReference || null)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const result = await insertRequest.query(query);
    const newMaterialId = result.recordset[0].MaterialID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_MATERIAL",
      moduleName: MODULE_NAME,
      referenceID: newMaterialId,
      details: { newData: values },
    });

    return getMaterial(pool, newMaterialId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new material: ${err.message}`);
  }
}

async function updateMaterial(pool, values) {
  try {
    const { MaterialID, ...updateData } = values;
    if (!MaterialID) throw new CustomError("MaterialID is required for update.");

    const { 
      MaterialCode, MaterialName, MaterialDescription, UOMID, VendorID, 
      ManufacturerName, SupplierName, ManufacturerMaterialReference,
      IsActive, user_id 
    } = updateData;
    const originalMaterial = await getMaterial(pool, MaterialID);

    // Check for duplicate code
    let duplicateCheckQuery = `
        SELECT 
            (SELECT COUNT(*) FROM Materials WHERE MaterialCode = @MaterialCode AND IsDeleted = 0 AND MaterialID != @MaterialID) as CodeCount
    `;
    let request = pool
      .request()
      .input("MaterialCode", sql.NVarChar(50), MaterialCode)
      .input("MaterialID", sql.Int, MaterialID);
    const duplicateResult = await request.query(duplicateCheckQuery);
    if (duplicateResult.recordset[0].CodeCount > 0)
      throw new CustomError(`Material with code '${MaterialCode}' already exists.`);

    const query = `
        UPDATE Materials SET
            MaterialCode = @MaterialCode, 
            MaterialName = @MaterialName, 
            MaterialDescription = @MaterialDescription,
            UOMID = @UOMID,
            VendorID = @VendorID,
            ManufacturerName = @ManufacturerName,
            SupplierName = @SupplierName,
            ManufacturerMaterialReference = @ManufacturerMaterialReference,
            IsActive = @IsActive, 
            UpdatedBy = @UpdatedBy, 
            UpdatedDate = GETDATE()
        WHERE MaterialID = @MaterialID;
    `;
    const updateRequest = pool
      .request()
      .input("MaterialCode", sql.NVarChar(50), MaterialCode)
      .input("MaterialName", sql.NVarChar(255), MaterialName)
      .input("MaterialDescription", sql.NVarChar(sql.MAX), MaterialDescription || null)
      .input("UOMID", sql.Int, UOMID || null)
      .input("VendorID", sql.Int, VendorID || null)
      .input("ManufacturerName", sql.NVarChar(255), ManufacturerName || null)
      .input("SupplierName", sql.NVarChar(255), SupplierName || null)
      .input("ManufacturerMaterialReference", sql.NVarChar(255), ManufacturerMaterialReference || null)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id)
      .input("MaterialID", sql.Int, MaterialID);
    await updateRequest.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_MATERIAL",
      moduleName: MODULE_NAME,
      referenceID: MaterialID,
      details: { oldData: originalMaterial, newData: updateData },
    });

    return getMaterial(pool, MaterialID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating material: ${err.message}`);
  }
}

async function deleteMaterial(pool, values) {
  try {
    const { MaterialID, user_id } = values;
    if (!MaterialID) throw new CustomError("MaterialID is required for deletion.");
    const materialToDelete = await getMaterial(pool, MaterialID);

    const query = `
        UPDATE Materials SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE MaterialID = @MaterialID;
    `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("MaterialID", sql.Int, MaterialID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_MATERIAL",
      moduleName: MODULE_NAME,
      referenceID: MaterialID,
      details: { deletedData: materialToDelete },
    });

    return { message: "Material deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting material: ${err.message}`);
  }
}

async function getMaterialsLite(pool, values) {
  try {
    let query = `
        SELECT M.MaterialID, M.MaterialCode, M.MaterialName, M.UOMID, M.VendorID,
               U.UOMName, U.UOMCode,
               V.VendorName, V.VendorCode
        FROM Materials M
        LEFT JOIN UOMs U ON M.UOMID = U.UOMID
        LEFT JOIN Vendors V ON M.VendorID = V.VendorID
        WHERE M.IsDeleted = 0 AND M.IsActive = 1
    `;
    const request = pool.request();
    
    // Optional filter by VendorID
    if (values.VendorID) {
      query += " AND M.VendorID = @VendorID";
      request.input("VendorID", sql.Int, values.VendorID);
    }
    
    query += " ORDER BY M.MaterialName";
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching materials list: ${err.message}`);
  }
}

module.exports = {
  getMaterial,
  getAllMaterials,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterialsLite,
};
