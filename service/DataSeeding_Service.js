const sql = require("mssql");
const bcrypt = require("bcrypt");

// Define all static warehouse types here. To add a new one, just add it to this array.
const staticWarehouseTypes = [
  { name: "Owned", description: "Warehouse is owned by the company" },
  {
    name: "Rented",
    description: "Warehouse is leased or rented from a third party",
  },
  { name: "3PL", description: "Third-Party Logistics warehouse" },
];

/**
 * Seeds the default admin user if it doesn't exist.
 */
async function seedUsers(pool) {
  console.log("Seeding Users...");
  try {
    // Check if admin user already exists
    const checkResult = await pool
      .request()
      .input("UserName", sql.NVarChar(100), "admin")
      .query("SELECT 1 FROM Users WHERE UserName = @UserName");

    if (checkResult.recordset.length === 0) {
      // Hash the password
      const hashedPassword = await bcrypt.hash("admin@123", 10);

      // Insert default admin user
      await pool
        .request()
        .input("UserName", sql.NVarChar(100), "admin")
        .input("Password", sql.NVarChar(255), hashedPassword)
        .input("Email", sql.NVarChar(100), "admin@wms.com")
        .input("FirstName", sql.NVarChar(100), "Admin")
        .input("LastName", sql.NVarChar(100), "User")
        .input("IsActive", sql.Bit, true)
        .input("IsDeleted", sql.Bit, false)
        .query(`
          INSERT INTO Users (UserName, Password, Email, FirstName, LastName, IsActive, IsDeleted)
          VALUES (@UserName, @Password, @Email, @FirstName, @LastName, @IsActive, @IsDeleted)
        `);
      console.log(
        " -> Inserted default admin user: username='admin', password='admin@123'"
      );
    } else {
      console.log(" -> Admin user already exists");
    }
  } catch (err) {
    console.error("Error seeding Users:", err.message);
  }
  console.log("Users seeding complete.");
}

/**
 * Checks for and inserts warehouse types if they don't exist.
 */
async function seedGateTypes(pool) {
  console.log("Seeding Gate Types...");
  const staticGateTypes = [
    {
      name: "Dock Door",
      description: "Standard raised dock for trucks and trailers.",
    },
    {
      name: "Drive-in Door",
      description: "Ground-level door for vans and small vehicles.",
    },
    {
      name: "Personnel Door",
      description: "Standard door for employee access.",
    },
  ];

  for (const type of staticGateTypes) {
    const checkResult = await pool
      .request()
      .input("TypeName", sql.NVarChar(100), type.name)
      .query("SELECT 1 FROM GateTypes WHERE GateTypeName = @TypeName");

    if (checkResult.recordset.length === 0) {
      await pool
        .request()
        .input("TypeName", sql.NVarChar(100), type.name)
        .input("TypeDescription", sql.NVarChar(255), type.description)
        .query(
          "INSERT INTO GateTypes (GateTypeName, GateTypeDescription, IsActive) VALUES (@TypeName, @TypeDescription, 1)",
        );
      console.log(` -> Inserted gate type: '${type.name}'`);
    }
  }
  console.log("Gate Types seeding complete.");
}
async function seedStorageTypes(pool) {
  console.log("Seeding Storage Types...");
  const staticStorageTypes = [
    {
      name: "Ambient Racking",
      description:
        "Standard racking for general, non-temperature-controlled goods.",
    },
    {
      name: "Cold Storage",
      description: "Refrigerated area for temperature-sensitive goods.",
    },
    {
      name: "Bulk Floor Storage",
      description: "Open floor space for large, stackable items.",
    },
    {
      name: "Secure Cage",
      description: "Enclosed, secure area for high-value items.",
    },
  ];

  for (const type of staticStorageTypes) {
    const checkResult = await pool
      .request()
      .input("TypeName", sql.NVarChar(100), type.name)
      .query("SELECT 1 FROM StorageTypes WHERE StorageTypeName = @TypeName");

    if (checkResult.recordset.length === 0) {
      await pool
        .request()
        .input("TypeName", sql.NVarChar(100), type.name)
        .input("TypeDescription", sql.NVarChar(500), type.description)
        .input("UserID", sql.Int, 1) // Assuming a default admin UserID of 1
        .query(`
            INSERT INTO StorageTypes (StorageTypeName, StorageTypeDescription, IsActive, CreatedBy, UpdatedBy) 
            VALUES (@TypeName, @TypeDescription, 1, @UserID, @UserID)
        `);
      console.log(` -> Inserted storage type: '${type.name}'`);
    }
  }
  console.log("Storage Types seeding complete.");
}
async function seedWarehouseTypes(pool) {
  console.log("Seeding Warehouse Types...");

  for (const type of staticWarehouseTypes) {
    // 1. Check if the type already exists using a dedicated request
    const checkRequest = pool.request();
    checkRequest.input("TypeName", sql.NVarChar(100), type.name);
    const checkResult = await checkRequest.query(
      `SELECT 1 FROM WarehouseTypes WHERE WarehouseTypeName = @TypeName`,
    );

    if (checkResult.recordset.length === 0) {
      // 2. If it doesn't exist, insert it using a new, separate request
      const insertRequest = pool.request();
      insertRequest.input("TypeName", sql.NVarChar(100), type.name);
      insertRequest.input(
        "TypeDescription",
        sql.NVarChar(255),
        type.description,
      );

      await insertRequest.query(
        `INSERT INTO WarehouseTypes (WarehouseTypeName, WarehouseTypeDescription, IsActive) VALUES (@TypeName, @TypeDescription, 1)`,
      );
      console.log(` -> Inserted warehouse type: '${type.name}'`);
    }
  }
  console.log("Warehouse Types seeding complete.");
}
async function seedLaborProviders(pool) {
  console.log("Seeding Labor Providers...");
  const inHouseProvider = { name: "In-House", code: "INTERNAL" };

  const checkResult = await pool
    .request()
    .input("ProviderName", sql.NVarChar(100), inHouseProvider.name)
    .query("SELECT 1 FROM LaborProviders WHERE ProviderName = @ProviderName");

  if (checkResult.recordset.length === 0) {
    await pool
      .request()
      .input("ProviderName", sql.NVarChar(100), inHouseProvider.name)
      .input("ProviderCode", sql.NVarChar(50), inHouseProvider.code)
      .input("UserID", sql.Int, 1) // Assuming default admin UserID of 1
      .query(`
                INSERT INTO LaborProviders (ProviderName, ProviderCode, IsActive, CreatedBy, UpdatedBy) 
                VALUES (@ProviderName, @ProviderCode, 1, @UserID, @UserID)
            `);
    console.log(` -> Inserted Labor Provider: '${inHouseProvider.name}'`);
  }
  console.log("Labor Providers seeding complete.");
}

async function seedRoles(pool) {
  console.log("Seeding Roles...");
  const staticRoles = [
    {
      name: "Admin",
      description: "Has access to all system features and data.",
    },
    {
      name: "Warehouse Manager",
      description: "Manages a specific warehouse's operations.",
    },
    {
      name: "Operator",
      description: "Performs day-to-day tasks within a warehouse.",
    },
  ];

  for (const role of staticRoles) {
    const checkResult = await pool
      .request()
      .input("RoleName", sql.NVarChar(50), role.name)
      .query("SELECT 1 FROM Roles WHERE RoleName = @RoleName");
    if (checkResult.recordset.length === 0) {
      await pool
        .request()
        .input("RoleName", sql.NVarChar(50), role.name)
        .input("RoleDescription", sql.NVarChar(255), role.description)
        .query(
          "INSERT INTO Roles (RoleName, RoleDescription) VALUES (@RoleName, @RoleDescription)",
        );
      console.log(` -> Inserted Role: '${role.name}'`);
    }
  }
  console.log("Roles seeding complete.");
}
async function seedSkills(pool) {
  console.log("Seeding Skills...");
  const staticSkills = [
    {
      name: "Forklift Operator",
      description: "Certified to operate forklifts.",
    },
    {
      name: "Hazmat Certified",
      description: "Trained to handle hazardous materials.",
    },
    { name: "Picker", description: "Trained in order picking procedures." },
    {
      name: "Packer",
      description: "Trained in packing and shipping procedures.",
    },
    {
      name: "Receiver",
      description: "Trained in inbound receiving processes.",
    },
  ];

  for (const skill of staticSkills) {
    const checkResult = await pool
      .request()
      .input("SkillName", sql.NVarChar(100), skill.name)
      .query("SELECT 1 FROM Skills WHERE SkillName = @SkillName");

    if (checkResult.recordset.length === 0) {
      await pool
        .request()
        .input("SkillName", sql.NVarChar(100), skill.name)
        .input("SkillDescription", sql.NVarChar(255), skill.description)
        .input("UserID", sql.Int, 1) // Assuming a default admin UserID
        .query(`
                    INSERT INTO Skills (SkillName, SkillDescription, IsActive, CreatedBy, UpdatedBy) 
                    VALUES (@SkillName, @SkillDescription, 1, @UserID, @UserID)
                `);
      console.log(` -> Inserted Skill: '${skill.name}'`);
    }
  }
  console.log("Skills seeding complete.");
}

async function seedPurchaseOrderReceivingDefaults(pool) {
  console.log("Seeding PurchaseOrderReceivings defaults...");
  const tableExists = await pool.request().query(`
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PurchaseOrderReceivings'
  `);
  if (tableExists.recordset.length === 0) {
    console.log("PurchaseOrderReceivings table not found. Skipping defaults.");
    return;
  }

  await pool.request().query(`
    UPDATE PurchaseOrderReceivings
    SET PurchaseOrderReceivingStatus = 'New'
    WHERE PurchaseOrderReceivingStatus IS NULL
  `);
  console.log("PurchaseOrderReceivings defaults seeding complete.");
}
/**
 * Main function to run all seeding operations.
 */
async function seedInitialData(pool) {
  await seedUsers(pool); // <-- Seed admin user FIRST (needed by other tables)
  await seedWarehouseTypes(pool);
  await seedGateTypes(pool);
  await seedStorageTypes(pool);
  await seedRoles(pool);
  await seedLaborProviders(pool);
  await seedPurchaseOrderReceivingDefaults(pool);
  // await seedSkills(pool);

  // In the future, you could add more seeders here
}

module.exports = { seedInitialData };
