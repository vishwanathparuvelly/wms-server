const sql = require("mssql");
const bcrypt = require("bcrypt");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");
const validationService = require("./Validation_Service"); // <-- Import for reusability

const MODULE_NAME = "Employee";

// Hardcoding Role IDs as per standard WMS structure and user request for logic enforcement
const ROLE_ADMIN_ID = 1;
const ROLE_OPERATOR_ID = 2;
const ROLE_WAREHOUSE_MANAGER_ID = 3;

/**
 * Validates if an EmployeeCode is unique (not already used by another active employee).
 * @param {object} pool - The database connection pool.
 * @param {string} employeeCode - The code to check.
 * @param {number} [employeeId=null] - Employee ID to exclude from the check (for update operations).
 */
async function validateEmployeeCodeIsUnique(
  pool,
  employeeCode,
  employeeId = null
) {
  let query = `
    SELECT COUNT(*) as Count
    FROM Employees
    WHERE EmployeeCode = @EmployeeCode 
    AND IsDeleted = 0
  `;
  const request = pool
    .request()
    .input("EmployeeCode", sql.NVarChar(50), employeeCode);

  if (employeeId) {
    query += " AND EmployeeID != @EmployeeID";
    request.input("EmployeeID", sql.Int, employeeId);
  }

  const result = await request.query(query);
  if (result.recordset[0].Count > 0) {
    throw new CustomError(
      `Employee with code '${employeeCode}' already exists.`
    );
  }
}

// Helper function to fetch a single employee with all related data
async function getEmployee(pool, employeeId) {
  try {
    if (!employeeId || isNaN(parseInt(employeeId))) {
      throw new CustomError("A valid numeric EmployeeID is required.");
    }

    const query = `
            SELECT
                E.EmployeeID, E.EmployeeCode, E.EmployeeName, E.DateOfJoining, E.ContactNumber, E.Email, 
                E.Address, E.DateOfBirth, E.Designation,
                E.IsActive, E.IsDeleted, E.CreatedBy, E.UpdatedBy, E.CreatedDate, E.UpdatedDate,
                LP.ProviderName AS LaborProviderName,
                U.UserID, U.UserName,
                R.RoleID, R.RoleName,
                (
                    SELECT W.WarehouseID, W.WarehouseName
                    FROM EmployeeWarehouses EW
                    JOIN Warehouses W ON EW.WarehouseID = W.WarehouseID
                    WHERE EW.EmployeeID = E.EmployeeID
                    FOR JSON PATH
                ) AS AssignedWarehouses,
                (
                    SELECT S.SkillID, S.SkillName
                    FROM EmployeeSkills ES
                    JOIN Skills S ON ES.SkillID = S.SkillID
                    WHERE ES.EmployeeID = E.EmployeeID
                    FOR JSON PATH
                ) AS AssignedSkills
            FROM Employees E
            LEFT JOIN LaborProviders LP ON E.ProviderID = LP.ProviderID
            LEFT JOIN Users U ON E.EmployeeID = U.EmployeeID AND U.IsDeleted = 0
            LEFT JOIN UserRoles UR ON U.UserID = UR.UserID
            LEFT JOIN Roles R ON UR.RoleID = R.RoleID
            WHERE E.EmployeeID = @EmployeeID AND E.IsDeleted = 0;
        `;
    const request = pool.request().input("EmployeeID", sql.Int, employeeId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError(
        "No active employee found with the given EmployeeID."
      );
    }

    // Process JSON data from subqueries
    const employee = result.recordset[0];
    employee.AssignedWarehouses = employee.AssignedWarehouses
      ? JSON.parse(employee.AssignedWarehouses)
      : [];
    employee.AssignedSkills = employee.AssignedSkills
      ? JSON.parse(employee.AssignedSkills)
      : [];

    return employee;
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching employee: ${err.message}`);
  }
}

async function addEmployee(pool, values) {
  const transaction = new sql.Transaction(pool);
  let transactionBegun = false;

  try {
    const {
      EmployeeCode,
      EmployeeName,
      IsActive,
      user_id,
      create_user,
      UserName,
      Password,
      RoleID,
      warehouse_ids,
      ProviderID,
      skill_ids,
      DateOfJoining,
      ContactNumber,
      Email,
      Address,
      DateOfBirth,
      Designation,
    } = values;

    // 1. Basic Validation
    if (!EmployeeCode || !EmployeeName || IsActive === undefined || !user_id) {
      throw new CustomError(
        "EmployeeCode, EmployeeName, IsActive, and user_id are required fields."
      );
    }

    const parsedRoleID = parseInt(RoleID);
    const parsedProviderID = ProviderID ? parseInt(ProviderID) : null;
    const parsedWarehouseIDs = Array.isArray(warehouse_ids)
      ? warehouse_ids.map((id) => parseInt(id)).filter((id) => !isNaN(id))
      : [];
    const parsedSkillIDs = Array.isArray(skill_ids)
      ? skill_ids.map((id) => parseInt(id)).filter((id) => !isNaN(id))
      : [];

    // Validate FKs if provided
    if (parsedProviderID)
      await validationService.validateLaborProviderExists(
        pool,
        parsedProviderID
      );
    if (parsedRoleID)
      await validationService.validateRoleExists(pool, parsedRoleID);

    for (const wid of parsedWarehouseIDs) {
      await validationService.validateWarehouseExists(pool, wid);
    }
    for (const sid of parsedSkillIDs) {
      await validationService.validateSkillExists(pool, sid);
    }

    // 2. Conditional User Validation
    if (create_user) {
      if (!UserName || !Password || !parsedRoleID) {
        throw new CustomError(
          "Username, Password, and Role are required for user creation."
        );
      }
      if (Password.length < 8) {
        throw new CustomError("Password must be at least 8 characters long.");
      }
    }

    // 3. Role-based Warehouse Assignment Validation
    if (parsedRoleID === ROLE_OPERATOR_ID && parsedWarehouseIDs.length > 1) {
      throw new CustomError(
        "Operator can only be assigned to a single warehouse (or none)."
      );
    }
    if (parsedRoleID === ROLE_ADMIN_ID && parsedWarehouseIDs.length > 0) {
      throw new CustomError(
        "Admin users cannot have explicit warehouse assignments."
      );
    }

    // 4. Duplicate Check (using the new validation function)
    await validateEmployeeCodeIsUnique(pool, EmployeeCode);

    let duplicateUserEmailCheck = pool.request();
    let userEmailClauses = [];

    if (create_user) {
      userEmailClauses.push(
        "(SELECT COUNT(*) FROM Users WHERE UserName = @UserName AND IsDeleted = 0) as UserCount"
      );
      duplicateUserEmailCheck.input("UserName", sql.NVarChar(50), UserName);
    } else {
      userEmailClauses.push("0 as UserCount");
    }

    if (Email) {
      userEmailClauses.push(
        "(SELECT COUNT(*) FROM Employees WHERE Email = @Email AND IsDeleted = 0) as EmailCount"
      );
      duplicateUserEmailCheck.input("Email", sql.NVarChar(100), Email);
    } else {
      userEmailClauses.push("0 as EmailCount");
    }

    const duplicateResult = await duplicateUserEmailCheck.query(
      `SELECT ${userEmailClauses.join(", ")}`
    );

    if (create_user && duplicateResult.recordset[0].UserCount > 0)
      throw new CustomError(`Username '${UserName}' is already taken.`);
    if (Email && duplicateResult.recordset[0].EmailCount > 0)
      throw new CustomError(`Employee with email '${Email}' already exists.`);

    await transaction.begin();
    transactionBegun = true;

    // --- 5. Insert Employee ---
    const insertEmployeeRequest = new sql.Request(transaction);
    const employeeQuery = `
      DECLARE @OutputTable TABLE (EmployeeID INT);
      INSERT INTO Employees (EmployeeCode, EmployeeName, ProviderID, DateOfJoining, ContactNumber, Email, Address, DateOfBirth, Designation, IsActive, CreatedBy, UpdatedBy)
      OUTPUT INSERTED.EmployeeID INTO @OutputTable
      VALUES (@EmployeeCode, @EmployeeName, @ProviderID, @DateOfJoining, @ContactNumber, @Email, @Address, @DateOfBirth, @Designation, @IsActive, @UserID, @UserID);
      SELECT EmployeeID FROM @OutputTable;
    `;

    insertEmployeeRequest
      .input("EmployeeCode", sql.NVarChar(50), EmployeeCode)
      .input("EmployeeName", sql.NVarChar(100), EmployeeName)
      .input("ProviderID", sql.Int, parsedProviderID)
      .input("DateOfJoining", sql.Date, DateOfJoining || null)
      .input("ContactNumber", sql.NVarChar(50), ContactNumber || null)
      .input("Email", sql.NVarChar(100), Email || null)
      .input("Address", sql.NVarChar(255), Address || null)
      .input("DateOfBirth", sql.Date, DateOfBirth || null)
      .input("Designation", sql.NVarChar(100), Designation || null)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id);

    const employeeResult = await insertEmployeeRequest.query(employeeQuery);
    const newEmployeeId = employeeResult.recordset[0].EmployeeID;

    // --- 6. Handle User Creation (if requested) ---
    let newUserId = null;
    if (create_user) {
      const hashedPassword = await bcrypt.hash(Password, 10);

      const insertUserRequest = new sql.Request(transaction);
      const userQuery = `
            DECLARE @OutputTable TABLE (UserID INT);
            INSERT INTO Users (EmployeeID, UserName, PasswordHash, IsActive, CreatedBy, UpdatedBy)
            OUTPUT INSERTED.UserID INTO @OutputTable
            VALUES (@EmployeeID, @UserName, @PasswordHash, @IsActive, @UserID, @UserID);
            SELECT UserID FROM @OutputTable;
        `;

      insertUserRequest
        .input("EmployeeID", sql.Int, newEmployeeId)
        .input("UserName", sql.NVarChar(50), UserName)
        .input("PasswordHash", sql.NVarChar(255), hashedPassword)
        .input("IsActive", sql.Bit, IsActive)
        .input("UserID", sql.Int, user_id);

      const userResult = await insertUserRequest.query(userQuery);
      newUserId = userResult.recordset[0].UserID;

      // Insert User Role
      const insertRoleRequest = new sql.Request(transaction);
      const roleQuery = `
            INSERT INTO UserRoles (UserID, RoleID) VALUES (@UserID, @RoleID);
        `;
      insertRoleRequest
        .input("UserID", sql.Int, newUserId)
        .input("RoleID", sql.Int, parsedRoleID);
      await insertRoleRequest.query(roleQuery);
    }

    // --- 7. Handle Warehouse Assignment (if applicable) ---
    if (parsedRoleID !== ROLE_ADMIN_ID && parsedWarehouseIDs.length > 0) {
      const insertWarehouseRequest = new sql.Request(transaction);
      const warehouseValues = parsedWarehouseIDs
        .map((id) => `(${newEmployeeId}, ${id})`)
        .join(", ");
      const warehouseQuery = `
            INSERT INTO EmployeeWarehouses (EmployeeID, WarehouseID) VALUES ${warehouseValues};
        `;
      await insertWarehouseRequest.query(warehouseQuery);
    }

    // --- 8. Handle Skill Assignment (if provided) ---
    if (parsedSkillIDs.length > 0) {
      const insertSkillsRequest = new sql.Request(transaction);
      const skillValues = parsedSkillIDs
        .map((id) => `(${newEmployeeId}, ${id})`)
        .join(", ");
      const skillQuery = `
            INSERT INTO EmployeeSkills (EmployeeID, SkillID) VALUES ${skillValues};
        `;
      await insertSkillsRequest.query(skillQuery);
    }

    await transaction.commit();

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_EMPLOYEE",
      moduleName: MODULE_NAME,
      referenceID: newEmployeeId,
      details: { newData: values, newUserId: newUserId },
    });

    return getEmployee(pool, newEmployeeId);
  } catch (err) {
    if (transactionBegun) {
      await transaction.rollback();
    }
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new employee: ${err.message}`);
  }
}

async function getAllEmployees(pool, values) {
  try {
    const page = parseInt(values.page) || 1;
    const pageSize = parseInt(values.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const searchTerm = values.search || null;
    const sortBy = values.sortBy || "EmployeeName";
    const sortOrder = values.sortOrder === "desc" ? "DESC" : "ASC";

    const whereClauses = [];
    let request = pool.request();

    whereClauses.push("E.IsDeleted = 0");
    if (values.IsActive !== undefined) {
      whereClauses.push("E.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (values.RoleID) {
      whereClauses.push("R.RoleID = @RoleID");
      request.input("RoleID", sql.Int, values.RoleID);
    }

    // Server-side search logic
    if (searchTerm) {
      whereClauses.push(
        "(E.EmployeeName LIKE @SearchTerm OR E.EmployeeCode LIKE @SearchTerm OR E.Email LIKE @SearchTerm)"
      );
      request.input("SearchTerm", sql.NVarChar, `%${searchTerm}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;

    // Validate sortBy column to prevent SQL injection
    const validSortColumns = [
      "EmployeeName",
      "EmployeeCode",
      "IsActive",
      "CreatedDate",
    ];
    const safeSortBy = validSortColumns.includes(sortBy)
      ? `E.${sortBy}`
      : "E.EmployeeName";

    const countQuery = `
        SELECT COUNT(*) as total 
        FROM Employees E
        LEFT JOIN Users U ON E.EmployeeID = U.EmployeeID AND U.IsDeleted = 0
        LEFT JOIN UserRoles UR ON U.UserID = UR.UserID
        LEFT JOIN Roles R ON UR.RoleID = R.RoleID
        ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = `
            SELECT 
                E.*,
                LP.ProviderName AS LaborProviderName,
                U.UserName,
                R.RoleName,
                (
                    SELECT COUNT(*)
                    FROM EmployeeWarehouses EW
                    WHERE EW.EmployeeID = E.EmployeeID
                ) AS AssignedWarehouseCount
            FROM Employees E
            LEFT JOIN LaborProviders LP ON E.ProviderID = LP.ProviderID
            LEFT JOIN Users U ON E.EmployeeID = U.EmployeeID AND U.IsDeleted = 0
            LEFT JOIN UserRoles UR ON U.UserID = UR.UserID
            LEFT JOIN Roles R ON UR.RoleID = R.RoleID
            ${whereClause}
            ORDER BY ${safeSortBy} ${sortOrder}
            OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY;
        `;

    const result = await request.query(query);

    return {
      data: result.recordset,
      pagination: { totalItems, totalPages, currentPage: page, pageSize },
    };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching all employees: ${err.message}`);
  }
}

async function updateEmployee(pool, values) {
  const transaction = new sql.Transaction(pool);
  let transactionBegun = false;

  try {
    const {
      EmployeeID,
      EmployeeCode,
      EmployeeName,
      IsActive,
      user_id,
      update_user_credentials,
      UserName,
      Password,
      RoleID,
      warehouse_ids,
      ProviderID,
      skill_ids,
      DateOfJoining,
      ContactNumber,
      Email,
      Address,
      DateOfBirth,
      Designation,
    } = values;

    if (!EmployeeID)
      throw new CustomError("EmployeeID is required for update.");

    const parsedEmployeeID = parseInt(EmployeeID);
    const parsedRoleID = RoleID ? parseInt(RoleID) : null;
    const parsedProviderID = ProviderID ? parseInt(ProviderID) : null;
    const parsedWarehouseIDs = Array.isArray(warehouse_ids)
      ? warehouse_ids.map((id) => parseInt(id)).filter((id) => !isNaN(id))
      : [];
    const parsedSkillIDs = Array.isArray(skill_ids)
      ? skill_ids.map((id) => parseInt(id)).filter((id) => !isNaN(id))
      : [];

    // Fetch current employee data for audit log and validation
    const originalEmployee = await getEmployee(pool, parsedEmployeeID);

    // Validate FKs if provided
    if (parsedProviderID)
      await validationService.validateLaborProviderExists(
        pool,
        parsedProviderID
      );
    if (parsedRoleID)
      await validationService.validateRoleExists(pool, parsedRoleID);

    for (const wid of parsedWarehouseIDs) {
      await validationService.validateWarehouseExists(pool, wid);
    }
    for (const sid of parsedSkillIDs) {
      await validationService.validateSkillExists(pool, sid);
    }

    // 1. Conditional User Update Validation
    let existingUser = null;
    if (originalEmployee.UserID) {
      existingUser = true;
    }

    if (update_user_credentials) {
      if (parsedRoleID === null) {
        throw new CustomError("Role is required if updating user credentials.");
      }
      if (Password && Password.length < 8) {
        throw new CustomError(
          "New Password must be at least 8 characters long."
        );
      }
    }

    // 2. Role-based Warehouse Assignment Validation (if role is being updated or re-validated)
    const effectiveRoleID = parsedRoleID || originalEmployee.RoleID; // Use new role or current role

    if (effectiveRoleID === ROLE_OPERATOR_ID && parsedWarehouseIDs.length > 1) {
      throw new CustomError(
        "Operator can only be assigned to a single warehouse (or none)."
      );
    }
    if (effectiveRoleID === ROLE_ADMIN_ID && parsedWarehouseIDs.length > 0) {
      throw new CustomError(
        "Admin users cannot have explicit warehouse assignments."
      );
    }

    // 3. Duplicate Check
    await validateEmployeeCodeIsUnique(pool, EmployeeCode, parsedEmployeeID);

    let duplicateUserEmailCheck = pool.request();
    let userEmailClauses = [];

    if (UserName) {
      userEmailClauses.push(
        "(SELECT COUNT(*) FROM Users WHERE UserName = @UserName AND IsDeleted = 0 AND EmployeeID != @EmployeeID) as UserCount"
      );
      duplicateUserEmailCheck.input("UserName", sql.NVarChar(50), UserName);
    } else {
      userEmailClauses.push("0 as UserCount");
    }

    if (Email) {
      userEmailClauses.push(
        "(SELECT COUNT(*) FROM Employees WHERE Email = @Email AND IsDeleted = 0 AND EmployeeID != @EmployeeID) as EmailCount"
      );
      duplicateUserEmailCheck.input("Email", sql.NVarChar(100), Email);
    } else {
      userEmailClauses.push("0 as EmailCount");
    }
    duplicateUserEmailCheck.input("EmployeeID", sql.Int, parsedEmployeeID);

    const duplicateResult = await duplicateUserEmailCheck.query(
      `SELECT ${userEmailClauses.join(", ")}`
    );

    if (UserName && duplicateResult.recordset[0].UserCount > 0)
      throw new CustomError(`Username '${UserName}' is already taken.`);
    if (Email && duplicateResult.recordset[0].EmailCount > 0)
      throw new CustomError(`Employee with email '${Email}' already exists.`);

    await transaction.begin();
    transactionBegun = true;

    // --- 4. Update Employee Main Record ---
    const updateEmployeeRequest = new sql.Request(transaction);
    const employeeQuery = `
            UPDATE Employees SET
                EmployeeCode = @EmployeeCode, 
                EmployeeName = @EmployeeName, 
                ProviderID = @ProviderID, 
                DateOfJoining = @DateOfJoining, 
                ContactNumber = @ContactNumber, 
                Email = @Email, 
                Address = @Address, 
                DateOfBirth = @DateOfBirth, 
                Designation = @Designation, 
                IsActive = @IsActive, 
                UpdatedBy = @UpdatedBy, 
                UpdatedDate = GETDATE()
            WHERE EmployeeID = @EmployeeID;
        `;

    updateEmployeeRequest
      .input("EmployeeID", sql.Int, parsedEmployeeID)
      .input("EmployeeCode", sql.NVarChar(50), EmployeeCode)
      .input("EmployeeName", sql.NVarChar(100), EmployeeName)
      .input("ProviderID", sql.Int, parsedProviderID)
      .input("DateOfJoining", sql.Date, DateOfJoining || null)
      .input("ContactNumber", sql.NVarChar(50), ContactNumber || null)
      .input("Email", sql.NVarChar(100), Email || null)
      .input("Address", sql.NVarChar(255), Address || null)
      .input("DateOfBirth", sql.Date, DateOfBirth || null)
      .input("Designation", sql.NVarChar(100), Designation || null)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id);

    await updateEmployeeRequest.query(employeeQuery);

    // --- 5. Update User Credentials/Role (if requested and user exists) ---
    if (update_user_credentials && existingUser) {
      const updateUserRequest = new sql.Request(transaction);
      let userUpdateQuery =
        "UPDATE Users SET UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()";

      if (Password) {
        const hashedPassword = await bcrypt.hash(Password, 10);
        userUpdateQuery += ", PasswordHash = @PasswordHash";
        updateUserRequest.input(
          "PasswordHash",
          sql.NVarChar(255),
          hashedPassword
        );
      }
      if (UserName) {
        userUpdateQuery += ", UserName = @UserName";
        updateUserRequest.input("UserName", sql.NVarChar(50), UserName);
      }
      if (IsActive !== undefined) {
        userUpdateQuery += ", IsActive = @IsActive";
      }

      userUpdateQuery += " WHERE EmployeeID = @EmployeeID";

      updateUserRequest
        .input("EmployeeID", sql.Int, parsedEmployeeID)
        .input("UpdatedBy", sql.Int, user_id)
        .input("IsActive", sql.Bit, IsActive);

      await updateUserRequest.query(userUpdateQuery);

      // Update Role (always replace for simplicity in this structure)
      if (parsedRoleID) {
        const updateRoleRequest = new sql.Request(transaction);
        await updateRoleRequest.query(
          `DELETE FROM UserRoles WHERE UserID = ${originalEmployee.UserID}`
        );
        await updateRoleRequest.query(
          `INSERT INTO UserRoles (UserID, RoleID) VALUES (${originalEmployee.UserID}, ${parsedRoleID})`
        );
      }
    }

    // --- 6. Update Warehouse Assignment ---
    // 6.1 Clear existing assignments
    const clearWarehouseRequest = new sql.Request(transaction);
    clearWarehouseRequest.input("EmployeeID", sql.Int, parsedEmployeeID);
    await clearWarehouseRequest.query(
      `DELETE FROM EmployeeWarehouses WHERE EmployeeID = @EmployeeID`
    );

    // 6.2 Insert new assignments (only if not Admin and assignments exist)
    if (effectiveRoleID !== ROLE_ADMIN_ID && parsedWarehouseIDs.length > 0) {
      const insertWarehouseRequest = new sql.Request(transaction);
      const warehouseValues = parsedWarehouseIDs
        .map((id) => `(${parsedEmployeeID}, ${id})`)
        .join(", ");
      const warehouseQuery = `
                INSERT INTO EmployeeWarehouses (EmployeeID, WarehouseID) VALUES ${warehouseValues};
            `;
      await insertWarehouseRequest.query(warehouseQuery);
    }

    // --- 7. Update Skill Assignment ---
    // 7.1 Clear existing skills
    const clearSkillsRequest = new sql.Request(transaction);
    clearSkillsRequest.input("EmployeeID", sql.Int, parsedEmployeeID);
    await clearSkillsRequest.query(
      `DELETE FROM EmployeeSkills WHERE EmployeeID = @EmployeeID`
    );

    // 7.2 Insert new skills
    if (parsedSkillIDs.length > 0) {
      const insertSkillsRequest = new sql.Request(transaction);
      const skillValues = parsedSkillIDs
        .map((id) => `(${parsedEmployeeID}, ${id})`)
        .join(", ");
      const skillQuery = `
                INSERT INTO EmployeeSkills (EmployeeID, SkillID) VALUES ${skillValues};
            `;
      await insertSkillsRequest.query(skillQuery);
    }

    await transaction.commit();

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_EMPLOYEE",
      moduleName: MODULE_NAME,
      referenceID: parsedEmployeeID,
      details: { oldData: originalEmployee, newData: values },
    });

    return getEmployee(pool, parsedEmployeeID);
  } catch (err) {
    if (transactionBegun) {
      await transaction.rollback();
    }
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating employee: ${err.message}`);
  }
}

async function deleteEmployee(pool, values) {
  const transaction = new sql.Transaction(pool);
  let transactionBegun = false;
  try {
    const { EmployeeID, user_id } = values;
    if (!EmployeeID)
      throw new CustomError("EmployeeID is required for deletion.");
    const parsedEmployeeID = parseInt(EmployeeID);

    const employeeToDelete = await getEmployee(pool, parsedEmployeeID);

    await transaction.begin();
    transactionBegun = true;

    // Soft delete the Employee
    const employeeQuery = `
      UPDATE Employees SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
      WHERE EmployeeID = @EmployeeID;
    `;
    const employeeRequest = pool
      .request(transaction)
      .input("UpdatedBy", sql.Int, user_id)
      .input("EmployeeID", sql.Int, parsedEmployeeID);
    await employeeRequest.query(employeeQuery);

    // If a user exists, soft delete the User record as well
    if (employeeToDelete.UserID) {
      const userQuery = `
            UPDATE Users SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
            WHERE UserID = @UserID;
        `;
      const userRequest = pool
        .request(transaction)
        .input("UpdatedBy", sql.Int, user_id)
        .input("UserID", sql.Int, employeeToDelete.UserID);
      await userRequest.query(userQuery);

      // Note: No need to delete UserRoles, EmployeeWarehouses, EmployeeSkills as FKs are handled
      // by cascades or will be ignored due to soft deletion of parent records.
    }

    await transaction.commit();

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_EMPLOYEE",
      moduleName: MODULE_NAME,
      referenceID: parsedEmployeeID,
      details: { deletedData: employeeToDelete },
    });

    return { message: "Employee deleted successfully." };
  } catch (err) {
    if (transactionBegun) {
      await transaction.rollback();
    }
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting employee: ${err.message}`);
  }
}

/**
 * Fetches a lite list of employees for use in dropdowns/lookups.
 * @param {object} pool - The database connection pool.
 * @param {object} values - Optional filter values (e.g., RoleID, IsActive).
 */
async function getEmployeesLite(pool, values) {
  try {
    let query = `
        SELECT 
            E.EmployeeID, 
            E.EmployeeName,
            E.EmployeeCode,
            R.RoleID,
            R.RoleName
        FROM Employees E
        LEFT JOIN Users U ON E.EmployeeID = U.EmployeeID AND U.IsDeleted = 0
        LEFT JOIN UserRoles UR ON U.UserID = UR.UserID
        LEFT JOIN Roles R ON UR.RoleID = R.RoleID
        WHERE E.IsDeleted = 0 AND E.IsActive = 1
    `;
    const request = pool.request();

    // Optional filter for RoleID
    if (values && values.RoleID) {
      query += " AND R.RoleID = @RoleID";
      request.input("RoleID", sql.Int, values.RoleID);
    }

    query += " ORDER BY E.EmployeeName";
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching employees list: ${err.message}`);
  }
}

module.exports = {
  addEmployee,
  getEmployee,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
  getEmployeesLite, // <-- Export new lite API
};
