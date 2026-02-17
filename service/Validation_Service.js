const sql = require("mssql");
const { CustomError } = require("../model/CustomError");

/**
 * Checks if a CountryID exists and is not deleted. Throws an error if invalid.
 */
async function validateCountryExists(pool, countryId) {
  if (!countryId || isNaN(parseInt(countryId))) {
    throw new CustomError("CountryID must be a valid number.");
  }
  const request = pool.request();
  request.input("CountryID", sql.Int, countryId);
  const result = await request.query(
    `SELECT 1 FROM Countries WHERE CountryID = @CountryID AND IsDeleted = 0`,
  );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid CountryID: The country with ID '${countryId}' does not exist or has been deleted.`,
    );
  }
}

/**
 * Checks if a StateID exists and is not deleted. Throws an error if invalid.
 */
async function validateStateExists(pool, stateId) {
  if (!stateId || isNaN(parseInt(stateId))) {
    throw new CustomError("StateID must be a valid number.");
  }
  const request = pool.request();
  request.input("StateID", sql.Int, stateId);
  const result = await request.query(
    `SELECT 1 FROM States WHERE StateID = @StateID AND IsDeleted = 0`,
  );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid StateID: The state with ID '${stateId}' does not exist or has been deleted.`,
    );
  }
}

/**
 * Checks if a CityID exists and is not deleted. Throws an error if invalid.
 */
async function validateCityExists(pool, cityId) {
  if (!cityId || isNaN(parseInt(cityId))) {
    throw new CustomError(`CityID '${cityId}' must be a valid number.`);
  }
  const request = pool.request();
  request.input("CityID", sql.Int, cityId);
  const result = await request.query(
    `SELECT 1 FROM Cities WHERE CityID = @CityID AND IsDeleted = 0`,
  );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid CityID: The city with ID '${cityId}' does not exist or has been deleted.`,
    );
  }
}

/**
 * Checks if a ZoneID exists and is not deleted. Throws an error if invalid.
 */
async function validateZoneExists(pool, zoneId) {
  if (!zoneId || isNaN(parseInt(zoneId))) {
    throw new CustomError("ZoneID must be a valid number.");
  }
  const request = pool.request();
  request.input("ZoneID", sql.Int, zoneId);
  const result = await request.query(
    `SELECT 1 FROM Zones WHERE ZoneID = @ZoneID AND IsDeleted = 0`,
  );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid ZoneID: The zone with ID '${zoneId}' does not exist or has been deleted.`,
    );
  }
}

/**
 * Checks the entire location hierarchy for a new branch in a single database call.
 */
async function validateBranchLocationHierarchy(
  pool,
  { countryId, stateId, cityId, zoneId },
) {
  await validateCountryExists(pool, countryId);
  await validateStateExists(pool, stateId);
  await validateCityExists(pool, cityId);
  await validateZoneExists(pool, zoneId);

  const request = pool.request();
  request.input("CountryID", sql.Int, countryId);
  request.input("StateID", sql.Int, stateId);
  request.input("CityID", sql.Int, cityId);
  request.input("ZoneID", sql.Int, zoneId);

  const query = `
        SELECT
            (SELECT s.CountryID FROM States s WHERE s.StateID = @StateID) as StateParentCountryID,
            (SELECT c.StateID FROM Cities c WHERE c.CityID = @CityID) as CityParentStateID,
            (SELECT z.CountryID FROM Zones z WHERE z.ZoneID = @ZoneID) as ZoneParentCountryID;
    `;

  const result = await request.query(query);
  const checks = result.recordset[0];

  if (checks.StateParentCountryID !== countryId)
    throw new CustomError(
      `Validation Error: The selected State does not belong to the selected Country.`,
    );
  if (checks.CityParentStateID !== stateId)
    throw new CustomError(
      `Validation Error: The selected City does not belong to the selected State.`,
    );
  if (checks.ZoneParentCountryID !== countryId)
    throw new CustomError(
      `Validation Error: The selected Zone does not belong to the selected Country.`,
    );
}

/**
 * Checks if a WarehouseID exists and is not deleted. Throws an error if invalid.
 */
async function validateWarehouseExists(pool, warehouseId) {
  if (!warehouseId || isNaN(parseInt(warehouseId))) {
    throw new CustomError("WarehouseID must be a valid number.");
  }
  const request = pool.request();
  request.input("WarehouseID", sql.Int, warehouseId);
  const result = await request.query(
    `SELECT 1 FROM Warehouses WHERE WarehouseID = @WarehouseID AND IsDeleted = 0`,
  );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid WarehouseID: The warehouse with ID '${warehouseId}' does not exist or has been deleted.`,
    );
  }
}

/**
 * Checks the entire location hierarchy for a new warehouse in a single database call.
 */
async function validateWarehouseLocationHierarchy(
  pool,
  { countryId, stateId, cityId, zoneId, branchId },
) {
  await validateBranchLocationHierarchy(pool, {
    countryId,
    stateId,
    cityId,
    zoneId,
  });
  await validateBranchExists(pool, branchId);

  const request = pool.request();
  request.input("CountryID", sql.Int, countryId);
  request.input("StateID", sql.Int, stateId);
  request.input("CityID", sql.Int, cityId);
  request.input("ZoneID", sql.Int, zoneId);
  request.input("BranchID", sql.Int, branchId);

  const query = `
        SELECT 
            b.CountryID,
            b.StateID,
            b.CityID,
            b.ZoneID
        FROM Branches b
        WHERE b.BranchID = @BranchID AND b.IsDeleted = 0;
    `;

  const result = await request.query(query);

  if (result.recordset.length === 0) {
    throw new CustomError(
      `Validation Error: The selected Branch with ID '${branchId}' does not exist or has been deleted.`,
    );
  }

  const branchLocation = result.recordset[0];

  if (branchLocation.CountryID !== countryId)
    throw new CustomError(
      `Validation Error: The selected Branch does not belong to the selected Country.`,
    );
  if (branchLocation.StateID !== stateId)
    throw new CustomError(
      `Validation Error: The selected Branch does not belong to the selected State.`,
    );
  if (branchLocation.CityID !== cityId)
    throw new CustomError(
      `Validation Error: The selected Branch does not belong to the selected City.`,
    );
  if (branchLocation.ZoneID !== zoneId)
    throw new CustomError(
      `Validation Error: The selected Branch does not belong to the selected Zone.`,
    );
}
async function validateWarehouseTypeExists(pool, warehouseTypeId) {
  if (!warehouseTypeId || isNaN(parseInt(warehouseTypeId))) {
    throw new CustomError("WarehouseTypeID must be a valid number.");
  }
  const request = pool.request();
  request.input("WarehouseTypeID", sql.Int, warehouseTypeId);
  const result = await request.query(
    `SELECT 1 FROM WarehouseTypes WHERE WarehouseTypeID = @WarehouseTypeID AND IsActive = 1`,
  );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid WarehouseTypeID: The type with ID '${warehouseTypeId}' does not exist.`,
    );
  }
}
/**
 * Checks if a BranchID exists and is not deleted. Throws an error if invalid.
 */
async function validateBranchExists(pool, branchId) {
  if (!branchId || isNaN(parseInt(branchId))) {
    throw new CustomError("BranchID must be a valid number.");
  }
  const request = pool.request();
  request.input("BranchID", sql.Int, branchId);
  const result = await request.query(
    `SELECT 1 FROM Branches WHERE BranchID = @BranchID AND IsDeleted = 0`,
  );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid BranchID: The branch with ID '${branchId}' does not exist or has been deleted.`,
    );
  }
}
/**
 * Checks if a CompartmentID exists and is not deleted. Throws an error if invalid.
 */
async function validateCompartmentExists(pool, compartmentId) {
  if (!compartmentId || isNaN(parseInt(compartmentId))) {
    throw new CustomError("CompartmentID must be a valid number.");
  }
  const request = pool.request();
  request.input("CompartmentID", sql.Int, compartmentId);
  const result = await request.query(
    `SELECT 1 FROM Compartments WHERE CompartmentID = @CompartmentID AND IsDeleted = 0`,
  );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid CompartmentID: The compartment with ID '${compartmentId}' does not exist or has been deleted.`,
    );
  }
}
/**
 * Checks if a StackID exists and is not deleted. Throws an error if invalid.
 */

/**
 * Checks if a BrandID exists and is not deleted. Throws an error if invalid.
 */
async function validateBrandExists(pool, brandId) {
  if (!brandId || isNaN(parseInt(brandId))) {
    throw new CustomError("BrandID must be a valid number.");
  }
  const request = pool.request();
  request.input("BrandID", sql.Int, brandId);
  const result = await request.query(
    `SELECT 1 FROM Brands WHERE BrandID = @BrandID AND IsDeleted = 0`,
  );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid BrandID: The brand with ID '${brandId}' does not exist or has been deleted.`,
    );
  }
}
/**
 * Checks if a UOMID exists and is not deleted. Throws an error if invalid.
 */
async function validateUOMExists(pool, uomId) {
  if (!uomId || isNaN(parseInt(uomId))) {
    throw new CustomError("UOMID must be a valid number.");
  }
  const request = pool.request();
  request.input("UOMID", sql.Int, uomId);
  const result = await request.query(
    `SELECT 1 FROM UOMs WHERE UOMID = @UOMID AND IsDeleted = 0`,
  );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid UOMID: The UOM with ID '${uomId}' does not exist or has been deleted.`,
    );
  }
}
/**
 * Checks if a LineID exists and is not deleted. Throws an error if invalid.
 */
async function validateLineExists(pool, lineId) {
  if (!lineId || isNaN(parseInt(lineId))) {
    throw new CustomError("LineID must be a valid number.");
  }
  const request = pool.request();
  request.input("LineID", sql.Int, lineId);
  const result = await request.query(
    `SELECT 1 FROM Lines WHERE LineID = @LineID AND IsDeleted = 0`,
  );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid LineID: The line with ID '${lineId}' does not exist or has been deleted.`,
    );
  }
}

/**
 * Checks if a PalletTypeID exists and is not deleted. Throws an error if invalid.
 */
async function validatePalletTypeExists(pool, palletTypeId) {
  if (!palletTypeId || isNaN(parseInt(palletTypeId))) {
    throw new CustomError("PalletTypeID must be a valid number.");
  }
  const request = pool.request();
  request.input("PalletTypeID", sql.Int, palletTypeId);
  const result = await request.query(
    `SELECT 1 FROM PalletTypes WHERE PalletTypeID = @PalletTypeID AND IsDeleted = 0`,
  );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid PalletTypeID: The pallet type with ID '${palletTypeId}' does not exist or has been deleted.`,
    );
  }
}

// service/Validation_Service.js

// ... (keep all existing functions like validateStorageTypeExists)

/**
 * Checks if a StackID exists and is not deleted. Throws an error if invalid.
 */
async function validateStackExists(pool, stackId) {
  if (!stackId || isNaN(parseInt(stackId))) {
    throw new CustomError("StackID must be a valid number.");
  }
  const request = pool.request();
  request.input("StackID", sql.Int, stackId);
  const result = await request.query(
    `SELECT 1 FROM Stacks WHERE StackID = @StackID AND IsDeleted = 0`,
  );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid StackID: The stack with ID '${stackId}' does not exist or has been deleted.`,
    );
  }
}

/**
 * Validates all foreign key dependencies for a Bin in a single function.
 */
async function validateBinPrerequisites(
  pool,
  { stackId, palletTypeId, storageTypeId },
) {
  await validateStackExists(pool, stackId);
  if (palletTypeId) {
    await validatePalletTypeExists(pool, palletTypeId);
  }
  if (storageTypeId) {
    await validateStorageTypeExists(pool, storageTypeId);
  }
}

async function validateStorageTypeExists(pool, storageTypeId) {
  if (!storageTypeId || isNaN(parseInt(storageTypeId))) {
    throw new CustomError("StorageTypeID must be a valid number.");
  }
  const request = pool.request();
  request.input("StorageTypeID", sql.Int, storageTypeId);
  const result = await request.query(
    `SELECT 1 FROM StorageTypes WHERE StorageTypeID = @StorageTypeID AND IsDeleted = 0`,
  );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid StorageTypeID: The storage type with ID '${storageTypeId}' does not exist or has been deleted.`,
    );
  }
}

// --- NEW/UPDATED FUNCTIONS FOR BIN MODULE ---

/**
 * Checks if a StackID exists, is not deleted, and returns its parent IDs.
 * @returns {Promise<{WarehouseID: number, CompartmentID: number}>}
 */
async function validateBinLocationHierarchy(pool, { stackId }) {
  if (!stackId || isNaN(parseInt(stackId))) {
    throw new CustomError("StackID must be a valid number.");
  }
  const request = pool.request();
  request.input("StackID", sql.Int, stackId);
  const result = await request.query(`
    SELECT C.WarehouseID, S.CompartmentID 
    FROM Stacks S
    JOIN Compartments C ON S.CompartmentID = C.CompartmentID
    WHERE S.StackID = @StackID AND S.IsDeleted = 0
  `);
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid StackID: The stack with ID '${stackId}' does not exist, has been deleted, or has an invalid parent compartment.`,
    );
  }
  return result.recordset[0]; // Returns { WarehouseID, CompartmentID }
}
// service/Validation_Service.js (ADD THIS FUNCTION)

async function validateLocationHierarchy(pool, { countryId, stateId, cityId }) {
  if (!countryId || !stateId || !cityId) {
    // This case should be caught by the service's required fields check, but we keep it here as a safety measure.
    throw new CustomError(
      "Location fields (CountryID, StateID, CityID) are required.",
    );
  }

  try {
    const query = `
            SELECT 
                COUNT(CI.CityID)
            FROM Cities CI
            JOIN States S ON CI.StateID = S.StateID
            WHERE CI.CityID = @CityID 
            AND CI.StateID = @StateID 
            AND S.CountryID = @CountryID
            AND CI.IsDeleted = 0
            AND S.IsDeleted = 0
        `;
    const request = pool
      .request()
      .input("CityID", sql.Int, cityId)
      .input("StateID", sql.Int, stateId)
      .input("CountryID", sql.Int, countryId);

    const result = await request.query(query);

    if (result.recordset[0][""] === 0) {
      throw new CustomError(
        "Invalid location hierarchy: City does not belong to the specified State and/or Country.",
      );
    }
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(
      `Error validating location hierarchy: ${err.message}`,
    );
  }
}
// service/Validation_Service.js (ADD THIS FUNCTION)

async function validateCustomerTypeExists(pool, customerTypeId) {
  if (!customerTypeId) {
    throw new CustomError("CustomerTypeID is required.");
  }

  try {
    const query = `
            SELECT 1 FROM CustomerTypes 
            WHERE CustomerTypeID = @CustomerTypeID AND IsActive = 1 AND IsDeleted = 0
        `;
    const request = pool
      .request()
      .input("CustomerTypeID", sql.Int, customerTypeId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError(
        "The specified CustomerTypeID is invalid or inactive.",
      );
    }
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(
      `Error validating customer type existence: ${err.message}`,
    );
  }
}
async function validateCustomerTypeExists(pool, customerTypeId) {
  if (!customerTypeId || isNaN(parseInt(customerTypeId)))
    throw new CustomError("CustomerTypeID must be a valid number.");
  const result = await pool
    .request()
    .input("CustomerTypeID", sql.Int, customerTypeId)
    .query(
      `SELECT 1 FROM CustomerTypes WHERE CustomerTypeID = @CustomerTypeID AND IsDeleted = 0`,
    );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid CustomerTypeID: The type with ID '${customerTypeId}' does not exist.`,
    );
  }
}

async function validateRoleExists(pool, roleId) {
  if (!roleId || isNaN(parseInt(roleId)))
    throw new CustomError("RoleID must be a valid number.");
  const result = await pool
    .request()
    .input("RoleID", sql.Int, roleId)
    .query(`SELECT 1 FROM Roles WHERE RoleID = @RoleID`);
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid RoleID: The role with ID '${roleId}' does not exist.`,
    );
  }
}

async function validateEmployeeExists(pool, employeeId) {
  if (!employeeId || isNaN(parseInt(employeeId)))
    throw new CustomError("EmployeeID must be a valid number.");
  const result = await pool
    .request()
    .input("EmployeeID", sql.Int, employeeId)
    .query(
      `SELECT 1 FROM Employees WHERE EmployeeID = @EmployeeID AND IsDeleted = 0`,
    );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid EmployeeID: The employee with ID '${employeeId}' does not exist or has been deleted.`,
    );
  }
}

// --- NEW PRODUCT VALIDATION FUNCTIONS ---

/**
 * Checks if a ProductTypeID exists and is not deleted.
 */
async function validateProductTypeExists(pool, productTypeId) {
  if (productTypeId === null) return;
  if (!productTypeId || isNaN(parseInt(productTypeId))) {
    throw new CustomError("ProductTypeID must be a valid number.");
  }
  const result = await pool
    .request()
    .input("ProductTypeID", sql.Int, productTypeId)
    .query(
      `SELECT 1 FROM ProductTypes WHERE ProductTypeID = @ProductTypeID AND IsDeleted = 0`,
    );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid ProductTypeID: The product type with ID '${productTypeId}' does not exist or has been deleted.`,
    );
  }
}

/**
 * Checks if a ProductConsumeID exists and is not deleted.
 */
async function validateProductConsumeExists(pool, productConsumeId) {
  if (productConsumeId === null) return;
  if (!productConsumeId || isNaN(parseInt(productConsumeId))) {
    throw new CustomError("ProductConsumeID must be a valid number.");
  }
  const result = await pool
    .request()
    .input("ProductConsumeID", sql.Int, productConsumeId)
    .query(
      `SELECT 1 FROM ProductConsumes WHERE ProductConsumeID = @ProductConsumeID AND IsDeleted = 0`,
    );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid ProductConsumeID: The consumption type with ID '${productConsumeId}' does not exist or has been deleted.`,
    );
  }
}

/**
 * Checks if a PackagingTypeID exists and is not deleted.
 */
async function validatePackagingTypeExists(pool, packagingTypeId) {
  if (packagingTypeId === null) return;
  if (!packagingTypeId || isNaN(parseInt(packagingTypeId))) {
    throw new CustomError("PackagingTypeID must be a valid number.");
  }
  const result = await pool
    .request()
    .input("PackagingTypeID", sql.Int, packagingTypeId)
    .query(
      `SELECT 1 FROM PackagingTypes WHERE PackagingTypeID = @PackagingTypeID AND IsDeleted = 0`,
    );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid PackagingTypeID: The packaging type with ID '${packagingTypeId}' does not exist or has been deleted.`,
    );
  }
}

/**
 * Checks if a SlocID (Storage Location) exists and is not deleted.
 */
async function validateSlocExists(pool, slocId) {
  if (slocId === null) return;
  if (!slocId || isNaN(parseInt(slocId))) {
    throw new CustomError("DefaultSlocID must be a valid number.");
  }
  const result = await pool
    .request()
    .input("SlocID", sql.Int, slocId)
    .query(`SELECT 1 FROM Slocs WHERE SlocID = @SlocID AND IsDeleted = 0`);
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid DefaultSlocID: The Sloc with ID '${slocId}' does not exist or has been deleted.`,
    );
  }
}

async function validateLaborProviderExists(pool, providerId) {
  if (!providerId || isNaN(parseInt(providerId)))
    throw new CustomError("ProviderID must be a valid number.");
  const result = await pool
    .request()
    .input("ProviderID", sql.Int, providerId)
    .query(
      `SELECT 1 FROM LaborProviders WHERE ProviderID = @ProviderID AND IsDeleted = 0`,
    );
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid ProviderID: The Labor Provider with ID '${providerId}' does not exist.`,
    );
  }
}

async function validateSkillExists(pool, skillId) {
  if (!skillId || isNaN(parseInt(skillId)))
    throw new CustomError("SkillID must be a valid number.");
  const result = await pool
    .request()
    .input("SkillID", sql.Int, skillId)
    .query(`SELECT 1 FROM Skills WHERE SkillID = @SkillID AND IsDeleted = 0`);
  if (result.recordset.length === 0) {
    throw new CustomError(
      `Invalid SkillID: The Skill with ID '${skillId}' does not exist.`,
    );
  }
}

module.exports = {
  validateCountryExists,
  validateStateExists,
  validateCityExists,
  validateZoneExists,
  validateBranchLocationHierarchy,
  validateWarehouseExists,
  validateWarehouseLocationHierarchy,
  validateWarehouseTypeExists,
  validateBranchExists,
  validateCompartmentExists,
  validateBrandExists,
  validateUOMExists,
  validateLineExists,
  validatePalletTypeExists,
  validateStorageTypeExists,
  validateCustomerTypeExists,
  validateLaborProviderExists,
  validateSkillExists,

  validateStackExists,
  validateBinPrerequisites,

  validateBinLocationHierarchy,
  validateLocationHierarchy,
  validateCustomerTypeExists,
  validateRoleExists,
  validateEmployeeExists,

  // --- New Product Validations ---
  validateProductTypeExists,
  validateProductConsumeExists,
  validatePackagingTypeExists,
  validateSlocExists,
};
