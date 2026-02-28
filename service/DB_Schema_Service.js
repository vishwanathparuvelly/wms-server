// service/DB_Schema_Service.js

const sql = require("mssql");

// Define the desired schema for your application's tables
const schema = {
  Countries: {
    tableName: "Countries",
    columns: [
      {
        name: "CountryID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "CountryName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "CountryCode",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "CountryISDCode",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "CountryCurrency", type: "NVARCHAR(50)", properties: "NOT NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      // "CONSTRAINT FK_Countries_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_Countries_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },
  States: {
    tableName: "States",
    columns: [
      {
        name: "StateID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1000,1)",
      },
      { name: "StateName", type: "NVARCHAR(100)", properties: "NOT NULL" },
      { name: "StateCode", type: "NVARCHAR(50)", properties: "NOT NULL" },
      { name: "TinNumber", type: "NVARCHAR(50)", properties: "NULL" },
      { name: "CountryID", type: "INT", properties: "NOT NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_States_CountryID FOREIGN KEY (CountryID) REFERENCES Countries(CountryID)",
      "CONSTRAINT UQ_StateName_CountryID UNIQUE (StateName, CountryID)",
      "CONSTRAINT UQ_StateCode_CountryID UNIQUE (StateCode, CountryID)",
    ],
  },
  Cities: {
    tableName: "Cities",
    columns: [
      { name: "CityID", type: "INT", properties: "PRIMARY KEY IDENTITY(1,1)" },
      { name: "CityName", type: "NVARCHAR(100)", properties: "NOT NULL" },
      { name: "CityCode", type: "NVARCHAR(50)", properties: "NOT NULL" },
      { name: "StateID", type: "INT", properties: "NOT NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_Cities_StateID FOREIGN KEY (StateID) REFERENCES States(StateID)",
      "CONSTRAINT UQ_CityName_StateID UNIQUE (CityName, StateID)",
      "CONSTRAINT UQ_CityCode_StateID UNIQUE (CityCode, StateID)",
    ],
  },

  Sections: {
    tableName: "Sections",
    columns: [
      {
        name: "SectionID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "SectionCode",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "SectionName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "Description", type: "NVARCHAR(500)", properties: "NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [],
  },
  Zones: {
    tableName: "Zones",
    columns: [
      { name: "ZoneID", type: "INT", properties: "PRIMARY KEY IDENTITY(1,1)" },
      { name: "ZoneName", type: "NVARCHAR(100)", properties: "NOT NULL" },
      { name: "ZoneCode", type: "NVARCHAR(50)", properties: "NOT NULL" },
      { name: "CountryID", type: "INT", properties: "NOT NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_Zones_CountryID FOREIGN KEY (CountryID) REFERENCES Countries(CountryID)",
      "CONSTRAINT UQ_ZoneName_CountryID UNIQUE (ZoneName, CountryID)",
      "CONSTRAINT UQ_ZoneCode_CountryID UNIQUE (ZoneCode, CountryID)",
    ],
  },
  Branches: {
    tableName: "Branches",
    columns: [
      {
        name: "BranchID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "BranchCode",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "BranchName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "BranchDescription", type: "NVARCHAR(500)", properties: "NULL" },
      { name: "StreetAddress1", type: "NVARCHAR(255)", properties: "NOT NULL" },
      { name: "StreetAddress2", type: "NVARCHAR(255)", properties: "NULL" },
      { name: "CityID", type: "INT", properties: "NOT NULL" },
      { name: "StateID", type: "INT", properties: "NOT NULL" },
      { name: "ZoneID", type: "INT", properties: "NOT NULL" },
      { name: "CountryID", type: "INT", properties: "NOT NULL" },
      { name: "IsDefault", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_Branches_CountryID FOREIGN KEY (CountryID) REFERENCES Countries(CountryID)",
      "CONSTRAINT FK_Branches_StateID FOREIGN KEY (StateID) REFERENCES States(StateID)",
      "CONSTRAINT FK_Branches_CityID FOREIGN KEY (CityID) REFERENCES Cities(CityID)",
      "CONSTRAINT FK_Branches_ZoneID FOREIGN KEY (ZoneID) REFERENCES Zones(ZoneID)",
    ],
  },
  WarehouseTypes: {
    tableName: "WarehouseTypes",
    columns: [
      {
        name: "WarehouseTypeID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "WarehouseTypeName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "WarehouseTypeDescription",
        type: "NVARCHAR(255)",
        properties: "NULL",
      },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
    ],
    foreignKeys: [],
  },
  Warehouses: {
    tableName: "Warehouses",
    columns: [
      {
        name: "WarehouseID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "WarehouseCode",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "WarehouseName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "WarehouseTypeID", type: "INT", properties: "NULL" },
      { name: "ParentWarehouseID", type: "INT", properties: "NULL" },
      { name: "StreetAddress1", type: "NVARCHAR(255)", properties: "NOT NULL" },
      { name: "StreetAddress2", type: "NVARCHAR(255)", properties: "NULL" },
      { name: "Latitude", type: "DECIMAL(9, 6)", properties: "NULL" },
      { name: "Longitude", type: "DECIMAL(9, 6)", properties: "NULL" },
      { name: "MaxCapacitySQFT", type: "DECIMAL(18, 2)", properties: "NULL" },
      { name: "MaxCapacityMT", type: "DECIMAL(18, 2)", properties: "NULL" },
      { name: "CarpetArea", type: "DECIMAL(18, 2)", properties: "NULL" },
      { name: "CityID", type: "INT", properties: "NOT NULL" },
      { name: "StateID", type: "INT", properties: "NOT NULL" },
      { name: "ZoneID", type: "INT", properties: "NOT NULL" },
      { name: "CountryID", type: "INT", properties: "NOT NULL" },
      { name: "BranchID", type: "INT", properties: "NOT NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_Warehouses_WarehouseTypeID FOREIGN KEY (WarehouseTypeID) REFERENCES WarehouseTypes(WarehouseTypeID)",
      "CONSTRAINT FK_Warehouses_ParentID FOREIGN KEY (ParentWarehouseID) REFERENCES Warehouses(WarehouseID)",
      "CONSTRAINT FK_Warehouses_CountryID FOREIGN KEY (CountryID) REFERENCES Countries(CountryID)",
      "CONSTRAINT FK_Warehouses_StateID FOREIGN KEY (StateID) REFERENCES States(StateID)",
      "CONSTRAINT FK_Warehouses_CityID FOREIGN KEY (CityID) REFERENCES Cities(CityID)",
      "CONSTRAINT FK_Warehouses_ZoneID FOREIGN KEY (ZoneID) REFERENCES Zones(ZoneID)",
      "CONSTRAINT FK_Warehouses_BranchID FOREIGN KEY (BranchID) REFERENCES Branches(BranchID)",
    ],
  },
  Roles: {
    // <-- ADD THIS
    tableName: "Roles",
    columns: [
      { name: "RoleID", type: "INT", properties: "PRIMARY KEY IDENTITY(1,1)" },
      { name: "RoleName", type: "NVARCHAR(50)", properties: "NOT NULL UNIQUE" },
      { name: "RoleDescription", type: "NVARCHAR(255)", properties: "NULL" },
    ],
    foreignKeys: [],
  },
  Skills: {
    tableName: "Skills",
    columns: [
      { name: "SkillID", type: "INT", properties: "PRIMARY KEY IDENTITY(1,1)" },
      {
        name: "SkillName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "SkillDescription", type: "NVARCHAR(255)", properties: "NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [], // No external FKs
  },

  Employees: {
    tableName: "Employees",
    columns: [
      {
        name: "EmployeeID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "EmployeeCode",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      }, // From UX: Employee Code / Employee Short Name
      {
        name: "EmployeeName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL",
      }, // From UX: Employee Name
      { name: "DateOfJoining", type: "DATE", properties: "NULL" }, // Optional WMS Field
      { name: "ContactNumber", type: "NVARCHAR(50)", properties: "NULL" }, // Optional WMS Field
      { name: "Email", type: "NVARCHAR(100)", properties: "NULL" }, // Optional WMS Field
      { name: "Address", type: "NVARCHAR(255)", properties: "NULL" }, // Optional WMS Field
      { name: "DateOfBirth", type: "DATE", properties: "NULL" }, // Optional WMS Field
      { name: "Designation", type: "NVARCHAR(100)", properties: "NULL" }, // Optional WMS Field
      { name: "ProviderID", type: "INT", properties: "NULL" }, // From request: Labor Provider (Optional FK)
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" }, // From UX
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      // Temporarily commented out to avoid table ordering issues during initial schema creation
      // "CONSTRAINT FK_Employees_ProviderID FOREIGN KEY (ProviderID) REFERENCES LaborProviders(ProviderID)",
      // "CONSTRAINT FK_Employees_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_Employees_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },

  // Linking table for Employee (User) to Warehouses based on role
  EmployeeWarehouses: {
    tableName: "EmployeeWarehouses",
    columns: [
      {
        name: "EmployeeWarehouseID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      { name: "EmployeeID", type: "INT", properties: "NOT NULL" },
      { name: "WarehouseID", type: "INT", properties: "NOT NULL" },
    ],
    foreignKeys: [
      "CONSTRAINT FK_EmpWarehouses_EmployeeID FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID)",
      "CONSTRAINT FK_EmpWarehouses_WarehouseID FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID)",
      "CONSTRAINT UQ_Employee_Warehouse UNIQUE (EmployeeID, WarehouseID)",
    ],
  },

  EmployeeSkills: {
    // Linking table for multi-select skills
    tableName: "EmployeeSkills",
    columns: [
      {
        name: "EmployeeSkillID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      { name: "EmployeeID", type: "INT", properties: "NOT NULL" },
      { name: "SkillID", type: "INT", properties: "NOT NULL" },
    ],
    foreignKeys: [
      "CONSTRAINT FK_EmployeeSkills_EmployeeID FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID)",
      "CONSTRAINT FK_EmployeeSkills_SkillID FOREIGN KEY (SkillID) REFERENCES Skills(SkillID)",
      "CONSTRAINT UQ_Employee_Skill UNIQUE (EmployeeID, SkillID)", // An employee can only have a skill once
    ],
  },

  // --- EXISTING TABLES (Ensuring they are present for completeness) ---
  Users: {
    // Simplified user table without Employee dependency
    tableName: "Users",
    columns: [
      { name: "UserID", type: "INT", properties: "PRIMARY KEY IDENTITY(1,1)" },
      { name: "UserName", type: "NVARCHAR(100)", properties: "NOT NULL" },
      { name: "Password", type: "NVARCHAR(255)", properties: "NOT NULL" },
      { name: "Email", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "FirstName", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "LastName", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT UQ_Users_UserName UNIQUE (UserName)",
    ],
  },

  UserRoles: {
    // Linking table for User to Role
    tableName: "UserRoles",
    columns: [
      {
        name: "UserRoleID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      { name: "UserID", type: "INT", properties: "NOT NULL" },
      { name: "RoleID", type: "INT", properties: "NOT NULL" },
    ],
    foreignKeys: [
      "CONSTRAINT FK_UserRoles_UserID FOREIGN KEY (UserID) REFERENCES Users(UserID)",
      "CONSTRAINT FK_UserRoles_RoleID FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)",
      "CONSTRAINT UQ_User_Role UNIQUE (UserID, RoleID)",
    ],
  },
  LaborProviders: {
    tableName: "LaborProviders",
    columns: [
      {
        name: "ProviderID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "ProviderName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "ProviderCode",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [], // No external FKs, but links to Users would be standard
  },
  // service/DB_Schema_Service.js (ADD THIS BLOCK)

  Vendors: {
    tableName: "Vendors",
    columns: [
      {
        name: "VendorID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "VendorCode",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "VendorName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "VendorDescription", type: "NVARCHAR(500)", properties: "NULL" },
      { name: "BusinessType", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "ContactPerson", type: "NVARCHAR(100)", properties: "NULL" },
      {
        name: "VendorContactNumber",
        type: "NVARCHAR(50)",
        properties: "NOT NULL",
      },
      {
        name: "EmailAddress",
        type: "NVARCHAR(100)",
        properties: "NULL",
      },
      { name: "StreetAddress1", type: "NVARCHAR(255)", properties: "NOT NULL" },
      { name: "StreetAddress2", type: "NVARCHAR(255)", properties: "NULL" },
      { name: "CityID", type: "INT", properties: "NOT NULL" },
      { name: "StateID", type: "INT", properties: "NOT NULL" },
      { name: "CountryID", type: "INT", properties: "NOT NULL" },
      { name: "ZoneID", type: "INT", properties: "NULL" },
      { name: "GSTIN", type: "NVARCHAR(15)", properties: "NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_Vendors_Country FOREIGN KEY (CountryID) REFERENCES Countries(CountryID)",
      "CONSTRAINT FK_Vendors_State FOREIGN KEY (StateID) REFERENCES States(StateID)",
      "CONSTRAINT FK_Vendors_City FOREIGN KEY (CityID) REFERENCES Cities(CityID)",
      "CONSTRAINT FK_Vendors_Zone FOREIGN KEY (ZoneID) REFERENCES Zones(ZoneID)",
    ],
  },

  Categories: {
    tableName: "Categories",
    columns: [
      {
        name: "CategoryID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "CategoryCode",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "CategoryName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "CategoryDescription",
        type: "NVARCHAR(500)",
        properties: "NULL",
      },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [],
  },

  Customers: {
    tableName: "Customers",
    columns: [
      {
        name: "CustomerID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "CustomerCode",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "CustomerName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "CustomerTypeID", type: "INT", properties: "NOT NULL" },
      { name: "BusinessSize", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "Description", type: "NVARCHAR(500)", properties: "NULL" },
      {
        name: "CustomerContactNumber",
        type: "NVARCHAR(50)",
        properties: "NOT NULL",
      },
      {
        name: "EmailAddress",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "StreetAddress1", type: "NVARCHAR(255)", properties: "NOT NULL" },
      { name: "StreetAddress2", type: "NVARCHAR(255)", properties: "NULL" },
      { name: "CityID", type: "INT", properties: "NOT NULL" },
      { name: "StateID", type: "INT", properties: "NOT NULL" },
      { name: "ZoneID", type: "INT", properties: "NULL" },
      { name: "CountryID", type: "INT", properties: "NOT NULL" },
      { name: "WarehouseID", type: "INT", properties: "NULL" },
      { name: "GSTIN", type: "NVARCHAR(15)", properties: "NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_Customers_CustomerType FOREIGN KEY (CustomerTypeID) REFERENCES CustomerTypes(CustomerTypeID)",
      "CONSTRAINT FK_Customers_Country FOREIGN KEY (CountryID) REFERENCES Countries(CountryID)",
      "CONSTRAINT FK_Customers_State FOREIGN KEY (StateID) REFERENCES States(StateID)",
      "CONSTRAINT FK_Customers_City FOREIGN KEY (CityID) REFERENCES Cities(CityID)",
      "CONSTRAINT FK_Customers_Zone FOREIGN KEY (ZoneID) REFERENCES Zones(ZoneID)",
      "CONSTRAINT FK_Customers_Warehouse FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID)",
      "CONSTRAINT FK_Customers_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      "CONSTRAINT FK_Customers_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },
  // service/DB_Schema_Service.js (ADD THIS BLOCK)

  CustomerTypes: {
    tableName: "CustomerTypes",
    columns: [
      {
        name: "CustomerTypeID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "CustomerTypeName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "CustomerTypeDescription",
        type: "NVARCHAR(500)",
        properties: "NULL",
      },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_CustomerTypes_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      "CONSTRAINT FK_CustomerTypes_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },
  // --- NEW: COMPARTMENT SCHEMA DEFINITION ---
  Compartments: {
    tableName: "Compartments",
    columns: [
      {
        name: "CompartmentID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "CompartmentCode",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "CompartmentName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL",
      },
      { name: "WarehouseID", type: "INT", properties: "NOT NULL" },
      { name: "MaxStockCount", type: "INT", properties: "NOT NULL" },
      { name: "Length", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      { name: "Breadth", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      { name: "Height", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_Compartments_Warehouse FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID)",
      // "CONSTRAINT FK_Compartments_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_Compartments_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },
  // service/DB_Schema_Service.js

  // ... (keep all existing table definitions)

  // --- NEW: STACK SCHEMA DEFINITION ---
  Stacks: {
    tableName: "Stacks",
    columns: [
      {
        name: "StackID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "StackCode",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "StackName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL",
      },
      { name: "CompartmentID", type: "INT", properties: "NOT NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_Stacks_Compartment FOREIGN KEY (CompartmentID) REFERENCES Compartments(CompartmentID)",
      // "CONSTRAINT FK_Stacks_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_Stacks_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
      "CONSTRAINT UQ_StackName_CompartmentID UNIQUE (StackName, CompartmentID)",
    ],
  },
  // service/DB_Schema_Service.js

  // --- NEW: BRAND SCHEMA DEFINITION ---
  Brands: {
    tableName: "Brands",
    columns: [
      {
        name: "BrandID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "BrandCode",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "BrandName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "ParentBrandID", type: "INT", properties: "NULL" },
      { name: "MainBrand", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      // "CONSTRAINT FK_Brands_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_Brands_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },
  // service/DB_Schema_Service.js

  // ... (keep all existing table definitions, like Brands)

  // --- NEW: UOM SCHEMA DEFINITION ---
  UOMs: {
    tableName: "UOMs",
    columns: [
      {
        name: "UOMID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "UOMCode",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "UOMName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "UOMDescription",
        type: "NVARCHAR(500)",
        properties: "NOT NULL",
      },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      // "CONSTRAINT FK_UOMs_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_UOMs_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },
  // service/DB_Schema_Service.js

  // --- MATERIALS SCHEMA DEFINITION ---
  Materials: {
    tableName: "Materials",
    columns: [
      {
        name: "MaterialID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "MaterialCode",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "MaterialName",
        type: "NVARCHAR(255)",
        properties: "NOT NULL",
      },
      {
        name: "MaterialDescription",
        type: "NVARCHAR(MAX)",
        properties: "NULL",
      },
      { name: "UOMID", type: "INT", properties: "NULL" },
      { name: "VendorID", type: "INT", properties: "NULL" },
      { name: "ManufacturerName", type: "NVARCHAR(255)", properties: "NULL" },
      { name: "SupplierName", type: "NVARCHAR(255)", properties: "NULL" },
      { name: "ManufacturerMaterialReference", type: "NVARCHAR(255)", properties: "NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_Materials_UOM FOREIGN KEY (UOMID) REFERENCES UOMs(UOMID)",
      "CONSTRAINT FK_Materials_Vendor FOREIGN KEY (VendorID) REFERENCES Vendors(VendorID)",
      // "CONSTRAINT FK_Materials_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_Materials_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },

  // ... (after the UOMs object)
  Lines: {
    tableName: "Lines",
    columns: [
      {
        name: "LineID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "LineNumber",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "LineName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL",
      },
      {
        name: "LineType",
        type: "NVARCHAR(50)",
        properties:
          "NULL CHECK (LineType IN ('Production', 'Packing', 'QA', 'Other'))",
      },
      {
        name: "WarehouseID",
        type: "INT",
        properties: "NULL",
      },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_Lines_Warehouse FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID)",
      // "CONSTRAINT FK_Lines_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_Lines_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
      "CONSTRAINT UQ_LineName_WarehouseID UNIQUE (LineName, WarehouseID)",
    ],
  },
  // service/DB_Schema_Service.js

  // ... (keep all existing table definitions, like Lines)

  // --- NEW: PRODUCT TYPE SCHEMA DEFINITION ---
  ProductTypes: {
    tableName: "ProductTypes",
    columns: [
      {
        name: "ProductTypeID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "ProductTypeName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "ProductTypeDescription",
        type: "NVARCHAR(500)",
        properties: "NOT NULL",
      },
      { name: "ProductColor", type: "NVARCHAR(50)", properties: "NOT NULL" },
      { name: "ColorCode", type: "NVARCHAR(7)", properties: "NULL" },
      { name: "ParentProduct", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      // "CONSTRAINT FK_ProductTypes_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_ProductTypes_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },
  // service/DB_Schema_Service.js

  // ... (keep all existing table definitions, like ProductTypes)

  // --- NEW: PRODUCT CONSUME SCHEMA DEFINITION ---
  ProductConsumes: {
    tableName: "ProductConsumes",
    columns: [
      {
        name: "ProductConsumeID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "ProductConsumeType",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "ProductConsumeDescription",
        type: "NVARCHAR(500)",
        properties: "NOT NULL",
      },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      // "CONSTRAINT FK_ProductConsumes_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_ProductConsumes_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },
  // service/DB_Schema_Service.js

  // ... (keep all existing table definitions, like ProductConsumes)

  // --- NEW: PACKAGING TYPE SCHEMA DEFINITION ---
  PackagingTypes: {
    tableName: "PackagingTypes",
    columns: [
      {
        name: "PackagingTypeID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "PackagingTypeName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "PackagingTypeDescription",
        type: "NVARCHAR(500)",
        properties: "NOT NULL",
      },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      // "CONSTRAINT FK_PackagingTypes_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_PackagingTypes_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },
  // service/DB_Schema_Service.js

  // ... (keep all existing table definitions, like PackagingTypes)

  // --- NEW: SLOC SCHEMA DEFINITION ---
  Slocs: {
    tableName: "Slocs",
    columns: [
      {
        name: "SlocID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "SlocName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      // "CONSTRAINT FK_Slocs_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_Slocs_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },
  // service/DB_Schema_Service.js

  // ... (keep all existing table definitions, like Slocs)

  // --- NEW: PALLET TYPE SCHEMA DEFINITION ---
  PalletTypes: {
    tableName: "PalletTypes",
    columns: [
      {
        name: "PalletTypeID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "PalletName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "Length", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      { name: "Breadth", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      { name: "Height", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      { name: "UOMID", type: "INT", properties: "NOT NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_PalletTypes_UOM FOREIGN KEY (UOMID) REFERENCES UOMs(UOMID)",
      // "CONSTRAINT FK_PalletTypes_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_PalletTypes_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },
  // service/DB_Schema_Service.js

  // ... (keep all existing table definitions, like PalletTypes)

  // --- NEW: STORAGE TYPE SCHEMA DEFINITION ---
  StorageTypes: {
    tableName: "StorageTypes",
    columns: [
      {
        name: "StorageTypeID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "StorageTypeName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "StorageTypeDescription",
        type: "NVARCHAR(500)",
        properties: "NOT NULL",
      },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      // "CONSTRAINT FK_StorageTypes_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_StorageTypes_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },

  Bins: {
    tableName: "Bins",
    columns: [
      {
        name: "BinID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "BinNumber",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "WarehouseID", type: "INT", properties: "NOT NULL" },
      { name: "CompartmentID", type: "INT", properties: "NOT NULL" },
      { name: "StackID", type: "INT", properties: "NOT NULL" },
      { name: "StorageTypeID", type: "INT", properties: "NOT NULL" },
      { name: "SlocID", type: "INT", properties: "NOT NULL" },
      { name: "XCoordinate", type: "INT", properties: "NOT NULL" },
      { name: "YCoordinate", type: "INT", properties: "NOT NULL" },
      { name: "ZCoordinate", type: "INT", properties: "NOT NULL" },
      {
        name: "BinCoordinates",
        type: "NVARCHAR(50)",
        properties: "NOT NULL",
      },
      { name: "PalletTypeID", type: "INT", properties: "NULL" },
      { name: "MaxPallets", type: "INT", properties: "NULL" },
      {
        name: "MaxWeightKG",
        type: "DECIMAL(10, 2)",
        properties: "NULL",
      },
      {
        name: "MaxVolumeM3",
        type: "DECIMAL(10, 2)",
        properties: "NULL",
      },
      { name: "CheckDigit", type: "NVARCHAR(10)", properties: "NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_Bins_Warehouse FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID)",
      "CONSTRAINT FK_Bins_Compartment FOREIGN KEY (CompartmentID) REFERENCES Compartments(CompartmentID)",
      "CONSTRAINT FK_Bins_Stack FOREIGN KEY (StackID) REFERENCES Stacks(StackID)",
      "CONSTRAINT FK_Bins_StorageType FOREIGN KEY (StorageTypeID) REFERENCES StorageTypes(StorageTypeID)",
      "CONSTRAINT FK_Bins_Sloc FOREIGN KEY (SlocID) REFERENCES Slocs(SlocID)",
      "CONSTRAINT FK_Bins_PalletType FOREIGN KEY (PalletTypeID) REFERENCES PalletTypes(PalletTypeID)",
      // "CONSTRAINT FK_Bins_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_Bins_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
      "CONSTRAINT UQ_BinCoordinates_Stack UNIQUE (XCoordinate, YCoordinate, ZCoordinate, StackID)",
    ],
  },

  BinProducts: {
    tableName: "BinProducts",
    columns: [
      {
        name: "BinProductID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      { name: "BinID", type: "INT", properties: "NOT NULL" },
      { name: "PalletTypeID", type: "INT", properties: "NOT NULL" },
      { name: "StackID", type: "INT", properties: "NOT NULL" },
      { name: "VendorID", type: "INT", properties: "NULL" },
      { name: "CustomerID", type: "INT", properties: "NULL" },
      { name: "BranchID", type: "INT", properties: "NULL" },
      { name: "WarehouseID", type: "INT", properties: "NOT NULL" },
      { name: "ProductID", type: "INT", properties: "NOT NULL" },
      { name: "BatchNumber", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "ManufactureDate", type: "DATE", properties: "NULL" },
      { name: "UOMID", type: "INT", properties: "NOT NULL" },
      { name: "SLOCID", type: "INT", properties: "NOT NULL" },
      { name: "MRP", type: "DECIMAL(10, 2)", properties: "NULL" },
      { name: "MaxQuantity", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      {
        name: "FilledQuantity",
        type: "DECIMAL(10, 2)",
        properties: "NOT NULL DEFAULT 0",
      },
      {
        name: "AvailableQuantity",
        type: "DECIMAL(10, 2)",
        properties: "NOT NULL DEFAULT 0",
      },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_BinProducts_Bin FOREIGN KEY (BinID) REFERENCES Bins(BinID)",
      "CONSTRAINT FK_BinProducts_PalletType FOREIGN KEY (PalletTypeID) REFERENCES PalletTypes(PalletTypeID)",
      "CONSTRAINT FK_BinProducts_Stack FOREIGN KEY (StackID) REFERENCES Stacks(StackID)",
      "CONSTRAINT FK_BinProducts_Warehouse FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID)",
      "CONSTRAINT FK_BinProducts_Product FOREIGN KEY (ProductID) REFERENCES Products(ProductID)",
      "CONSTRAINT FK_BinProducts_UOM FOREIGN KEY (UOMID) REFERENCES UOMs(UOMID)",
      "CONSTRAINT FK_BinProducts_Sloc FOREIGN KEY (SLOCID) REFERENCES Slocs(SlocID)",
      // "CONSTRAINT FK_BinProducts_Vendor FOREIGN KEY (VendorID) REFERENCES Vendors(VendorID)",
      // "CONSTRAINT FK_BinProducts_Customer FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID)",
      // "CONSTRAINT FK_BinProducts_Branch FOREIGN KEY (BranchID) REFERENCES Branches(BranchID)",
      // "CONSTRAINT FK_BinProducts_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_BinProducts_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },

  BinProductLogs: {
    tableName: "BinProductLogs",
    columns: [
      {
        name: "BinProductLogID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      { name: "BinID", type: "INT", properties: "NOT NULL" },
      { name: "BinProductID", type: "INT", properties: "NOT NULL" },
      { name: "ProductID", type: "INT", properties: "NOT NULL" },
      { name: "BatchChangeReason", type: "NVARCHAR(200)", properties: "NULL" },
      { name: "PalletTypeID", type: "INT", properties: "NOT NULL" },
      { name: "StackID", type: "INT", properties: "NOT NULL" },
      { name: "VendorID", type: "INT", properties: "NULL" },
      { name: "CustomerID", type: "INT", properties: "NULL" },
      { name: "BranchID", type: "INT", properties: "NULL" },
      { name: "WarehouseID", type: "INT", properties: "NOT NULL" },
      { name: "ActionType", type: "INT", properties: "NOT NULL" },
      { name: "PurchaseOrderProductID", type: "INT", properties: "NULL" },
      { name: "SalesOrderProductID", type: "INT", properties: "NULL" },
      { name: "PurchaseOrderReturnProductID", type: "INT", properties: "NULL" },
      { name: "SalesOrderReturnProductID", type: "INT", properties: "NULL" },
      { name: "Quantity", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      {
        name: "PreviousFilledQuantity",
        type: "DECIMAL(10, 2)",
        properties: "NOT NULL",
      },
      {
        name: "NewFilledQuantity",
        type: "DECIMAL(10, 2)",
        properties: "NOT NULL",
      },
      {
        name: "PreviousAvailableQuantity",
        type: "DECIMAL(10, 2)",
        properties: "NOT NULL",
      },
      {
        name: "NewAvailableQuantity",
        type: "DECIMAL(10, 2)",
        properties: "NOT NULL",
      },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_BinProductLogs_Bin FOREIGN KEY (BinID) REFERENCES Bins(BinID)",
      "CONSTRAINT FK_BinProductLogs_BinProduct FOREIGN KEY (BinProductID) REFERENCES BinProducts(BinProductID)",
      "CONSTRAINT FK_BinProductLogs_Product FOREIGN KEY (ProductID) REFERENCES Products(ProductID)",
      "CONSTRAINT FK_BinProductLogs_PalletType FOREIGN KEY (PalletTypeID) REFERENCES PalletTypes(PalletTypeID)",
      "CONSTRAINT FK_BinProductLogs_Stack FOREIGN KEY (StackID) REFERENCES Stacks(StackID)",
      "CONSTRAINT FK_BinProductLogs_Warehouse FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID)",
      // "CONSTRAINT FK_BinProductLogs_Vendor FOREIGN KEY (VendorID) REFERENCES Vendors(VendorID)",
      // "CONSTRAINT FK_BinProductLogs_Customer FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID)",
      // "CONSTRAINT FK_BinProductLogs_Branch FOREIGN KEY (BranchID) REFERENCES Branches(BranchID)",
      // "CONSTRAINT FK_BinProductLogs_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
    ],
  },

  // service/DB_Schema_Service.js

  // ... (keep all existing table definitions, like StorageTypes)

  // --- NEW: VEHICLE TYPE SCHEMA DEFINITION ---
  VehicleTypes: {
    tableName: "VehicleTypes",
    columns: [
      {
        name: "VehicleTypeID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "VehicleTypeName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "VehicleCapacityTonnes",
        type: "DECIMAL(10, 2)",
        properties: "NOT NULL",
      },
      { name: "Length", type: "DECIMAL(10, 2)", properties: "NULL" },
      { name: "Breadth", type: "DECIMAL(10, 2)", properties: "NULL" },
      { name: "Height", type: "DECIMAL(10, 2)", properties: "NULL" },
      { name: "UOMID", type: "INT", properties: "NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_VehicleTypes_UOM FOREIGN KEY (UOMID) REFERENCES UOMs(UOMID)",
      // "CONSTRAINT FK_VehicleTypes_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_VehicleTypes_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },
  // Add this new table definition alongside your other tables like Slocs, PalletTypes, etc.

  // --- NEW: GATE TYPE SCHEMA DEFINITION ---
  GateTypes: {
    tableName: "GateTypes",
    columns: [
      {
        name: "GateTypeID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "GateTypeName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "GateTypeDescription",
        type: "NVARCHAR(500)",
        properties: "NULL",
      },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
    ],
    foreignKeys: [],
  },
  // Find your existing Gates schema and REPLACE it with this.

  Gates: {
    tableName: "Gates",
    columns: [
      { name: "GateID", type: "INT", properties: "PRIMARY KEY IDENTITY(1,1)" },
      { name: "GateName", type: "NVARCHAR(100)", properties: "NOT NULL" },
      { name: "WarehouseID", type: "INT", properties: "NULL" }, // Optional
      { name: "GateSequenceNumber", type: "INT", properties: "NOT NULL" },
      { name: "Height", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      { name: "Width", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      { name: "UOMID", type: "INT", properties: "NULL" }, // Optional
      {
        name: "DistanceFromLeftCornerMeters",
        type: "DECIMAL(10, 2)",
        properties: "NOT NULL",
      },
      {
        name: "Direction",
        type: "NVARCHAR(50)",
        properties:
          "NOT NULL CHECK (Direction IN ('North', 'South', 'East', 'West'))",
      },
      { name: "GateTypeID", type: "INT", properties: "NULL" }, // Changed to ID, Optional
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_Gates_Warehouse FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID)",
      "CONSTRAINT FK_Gates_UOM FOREIGN KEY (UOMID) REFERENCES UOMs(UOMID)",
      "CONSTRAINT FK_Gates_GateType FOREIGN KEY (GateTypeID) REFERENCES GateTypes(GateTypeID)", // New FK
      // "CONSTRAINT FK_Gates_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_Gates_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
      "CONSTRAINT UQ_GateName_WarehouseID UNIQUE (GateName, WarehouseID)",
    ],
  },

  // ... (rest of the file remains the same)

  // ... (rest of the file remains the same)

  // ... (rest of the file remains the same)

  // ... (rest of the file remains the same)

  // ... (rest of the file remains the same)

  // ... (rest of the file remains the same)
  //...
  //...
  //...
  // service/DB_Schema_Service.js

  // ... (keep all existing table definitions, like Gates)

  Products: {
    tableName: "Products",
    columns: [
      {
        name: "ProductID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "ProductCode",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "ProductName",
        type: "NVARCHAR(255)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "BrandID", type: "INT", properties: "NOT NULL" },
      { name: "ProductTypeID", type: "INT", properties: "NOT NULL" },
      { name: "UOMID", type: "INT", properties: "NOT NULL" },

      // --- Numeric Fields (Must be DECIMAL) ---
      { name: "NetWeight", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      { name: "GrossWeight", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      { name: "ShelfLifeDays", type: "INT", properties: "NOT NULL" },
      { name: "NearExpiryDays", type: "INT", properties: "NOT NULL" },
      { name: "Length", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      { name: "Breadth", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      { name: "Height", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      { name: "MinimumQty", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      {
        name: "ReorderLevelQty",
        type: "DECIMAL(10, 2)",
        properties: "NOT NULL",
      },

      // --- Optional Fields ---
      { name: "LineID", type: "INT", properties: "NULL" },
      { name: "ProductConsumeID", type: "INT", properties: "NULL" },
      { name: "PackagingTypeID", type: "INT", properties: "NULL" },
      { name: "Category", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "HSNCode", type: "NVARCHAR(50)", properties: "NULL" },
      { name: "DefaultSlocID", type: "INT", properties: "NULL" },
      { name: "IsHazmat", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "MasterFormulaRecord", type: "NVARCHAR(255)", properties: "NULL" },

      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      // "CONSTRAINT FK_Products_Brand FOREIGN KEY (BrandID) REFERENCES Brands(BrandID)",
      // "CONSTRAINT FK_Products_ProductType FOREIGN KEY (ProductTypeID) REFERENCES ProductTypes(ProductTypeID)",
      // "CONSTRAINT FK_Products_UOM FOREIGN KEY (UOMID) REFERENCES UOMs(UOMID)",
      // "CONSTRAINT FK_Products_Line FOREIGN KEY (LineID) REFERENCES Lines(LineID)",
      // "CONSTRAINT FK_Products_ProductConsume FOREIGN KEY (ProductConsumeID) REFERENCES ProductConsumes(ProductConsumeID)",
      // "CONSTRAINT FK_Products_PackagingType FOREIGN KEY (PackagingTypeID) REFERENCES PackagingTypes(PackagingTypeID)",
      // "CONSTRAINT FK_Products_Sloc FOREIGN KEY (DefaultSlocID) REFERENCES Slocs(SlocID)",
      // "CONSTRAINT FK_Products_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      // "CONSTRAINT FK_Products_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },

  ProductPalletConfigs: {
    tableName: "ProductPalletConfigs",
    columns: [
      {
        name: "ConfigID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      { name: "ProductID", type: "INT", properties: "NOT NULL" },
      { name: "PalletTypeID", type: "INT", properties: "NOT NULL" },
      { name: "MaxCapacity", type: "INT", properties: "NOT NULL" },
      { name: "Length", type: "DECIMAL(10, 2)", properties: "NULL" },
      { name: "Breadth", type: "DECIMAL(10, 2)", properties: "NULL" },
      { name: "Height", type: "DECIMAL(10, 2)", properties: "NULL" },
      { name: "IsDefault", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_PPC_Product FOREIGN KEY (ProductID) REFERENCES Products(ProductID)",
      "CONSTRAINT FK_PPC_PalletType FOREIGN KEY (PalletTypeID) REFERENCES PalletTypes(PalletTypeID)",
      "CONSTRAINT UQ_PPC_Product_Pallet UNIQUE (ProductID, PalletTypeID)",
    ],
  },

  // --- NEW: CARRIERS TABLE (must be before PurchaseOrders due to FK) ---
  Carriers: {
    tableName: "Carriers",
    columns: [
      {
        name: "CarrierID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "CarrierName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      {
        name: "CarrierCode",
        type: "NVARCHAR(50)",
        properties: "NULL",
      },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [],
  },

  // --- NEW: PACKING REQUIREMENTS TABLE (must be before PurchaseOrders due to FK) ---
  PackingRequirements: {
    tableName: "PackingRequirements",
    columns: [
      {
        name: "PackingRequirementID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "PackingRequirementName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
    ],
    foreignKeys: [],
  },

  // --- NEW: CARRIER PREFERENCES TABLE (must be before PurchaseOrders due to FK) ---
  CarrierPreferences: {
    tableName: "CarrierPreferences",
    columns: [
      {
        name: "CarrierPreferenceID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "CarrierPreferenceName",
        type: "NVARCHAR(100)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
    ],
    foreignKeys: [],
  },

  // --- NEW: PURCHASE ORDER SCHEMA DEFINITIONS ---
  PurchaseOrders: {
    tableName: "PurchaseOrders",
    columns: [
      {
        name: "PurchaseOrderID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "PurchaseOrderNumber",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "PurchaseOrderDate", type: "DATE", properties: "NOT NULL" },
      { name: "DeliveryDate", type: "DATE", properties: "NULL" },
      {
        name: "PurchaseOrderStatus",
        type: "NVARCHAR(50)",
        properties: "NOT NULL DEFAULT 'New'",
      },
      { name: "VendorID", type: "INT", properties: "NULL" },
      { name: "WarehouseID", type: "INT", properties: "NULL" },
      { name: "BranchID", type: "INT", properties: "NULL" },
      { name: "DeliveryAddress", type: "NVARCHAR(500)", properties: "NULL" },
      { name: "PersonInChargeInternal", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "PersonInChargeVendor", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "TransporterName", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "VehicleNumber", type: "NVARCHAR(50)", properties: "NULL" },
      { name: "LRNumber", type: "NVARCHAR(50)", properties: "NULL" },
      { name: "CarrierID", type: "INT", properties: "NULL" },
      { name: "PackingRequirementID", type: "INT", properties: "NULL" },
      { name: "CarrierPreferenceID", type: "INT", properties: "NULL" },
      { name: "Remarks", type: "NVARCHAR(500)", properties: "NULL" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_PurchaseOrders_Vendor FOREIGN KEY (VendorID) REFERENCES Vendors(VendorID)",
      "CONSTRAINT FK_PurchaseOrders_Warehouse FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID)",
      "CONSTRAINT FK_PurchaseOrders_Branch FOREIGN KEY (BranchID) REFERENCES Branches(BranchID)",
      "CONSTRAINT FK_PurchaseOrders_Carrier FOREIGN KEY (CarrierID) REFERENCES Carriers(CarrierID)",
      "CONSTRAINT FK_PurchaseOrders_PackingRequirement FOREIGN KEY (PackingRequirementID) REFERENCES PackingRequirements(PackingRequirementID)",
      "CONSTRAINT FK_PurchaseOrders_CarrierPreference FOREIGN KEY (CarrierPreferenceID) REFERENCES CarrierPreferences(CarrierPreferenceID)",
    ],
  },

  PurchaseOrderProducts: {
    tableName: "PurchaseOrderProducts",
    columns: [
      {
        name: "PurchaseOrderProductID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      { name: "PurchaseOrderID", type: "INT", properties: "NOT NULL" },
      { name: "VendorID", type: "INT", properties: "NULL" },
      { name: "BranchID", type: "INT", properties: "NULL" },
      { name: "WarehouseID", type: "INT", properties: "NULL" },
      { name: "ProductID", type: "INT", properties: "NULL" }, // Made nullable for Material support
      { name: "MaterialID", type: "INT", properties: "NULL" }, // New: Material support for Pharma domain
      { name: "UOMID", type: "INT", properties: "NULL" },
      { name: "SLOCID", type: "INT", properties: "NULL" },
      { name: "BatchNumber", type: "NVARCHAR(50)", properties: "NULL" },
      { name: "Quantity", type: "DECIMAL(18, 2)", properties: "NOT NULL" },
      { name: "Pending_Quantity", type: "DECIMAL(18, 2)", properties: "NOT NULL DEFAULT 0" },
      { name: "Received_Quantity", type: "DECIMAL(18, 2)", properties: "NOT NULL DEFAULT 0" },
      { name: "ReceivedQuantity", type: "DECIMAL(10, 2)", properties: "NOT NULL DEFAULT 0" }, // Legacy column
      { name: "MRP", type: "DECIMAL(18, 2)", properties: "NULL" },
      { name: "Discount", type: "DECIMAL(18, 2)", properties: "NULL" },
      { name: "Total_Product_MRP", type: "DECIMAL(18, 2)", properties: "NULL" },
      { name: "Total_Product_Discount", type: "DECIMAL(18, 2)", properties: "NULL" },
      { name: "Total_Product_Amount", type: "DECIMAL(18, 2)", properties: "NULL" },
      { name: "UnitPrice", type: "DECIMAL(10, 2)", properties: "NULL" }, // Legacy column
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_POP_PurchaseOrder FOREIGN KEY (PurchaseOrderID) REFERENCES PurchaseOrders(PurchaseOrderID)",
      "CONSTRAINT FK_POP_Vendor FOREIGN KEY (VendorID) REFERENCES Vendors(VendorID)",
      "CONSTRAINT FK_POP_Branch FOREIGN KEY (BranchID) REFERENCES Branchs(BranchID)",
      "CONSTRAINT FK_POP_Warehouse FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID)",
      "CONSTRAINT FK_POP_Product FOREIGN KEY (ProductID) REFERENCES Products(ProductID)",
      "CONSTRAINT FK_POP_Material FOREIGN KEY (MaterialID) REFERENCES Materials(MaterialID)",
      "CONSTRAINT FK_POP_UOM FOREIGN KEY (UOMID) REFERENCES UOMs(UOMID)",
      "CONSTRAINT FK_POP_SLOC FOREIGN KEY (SLOCID) REFERENCES SLOCs(SLOCID)",
    ],
    checkConstraints: [
      "CONSTRAINT CHK_POP_ItemReference CHECK (ProductID IS NOT NULL OR MaterialID IS NOT NULL)",
    ],
  },

  PurchaseOrderReceivings: {
    tableName: "PurchaseOrderReceivings",
    columns: [
      {
        name: "PurchaseOrderReceivingID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      { name: "PurchaseOrderID", type: "INT", properties: "NULL" },
      { name: "GSRN", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "ReceivingDate", type: "DATE", properties: "NOT NULL" },
      { name: "VendorID", type: "INT", properties: "NULL" },
      { name: "WarehouseID", type: "INT", properties: "NULL" },
      { name: "BranchID", type: "INT", properties: "NULL" },
      { name: "VehicleNumber", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "LRNumber", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "InvoiceNumber", type: "NVARCHAR(100)", properties: "NULL" },
      {
        name: "PurchaseOrderReceivingStatus",
        type: "NVARCHAR(50)",
        properties: "NOT NULL DEFAULT 'New'",
      },
      { name: "QuarantineEndDate", type: "DATE", properties: "NULL" },
      { name: "QuarantineRemark", type: "NVARCHAR(500)", properties: "NULL" },
      { name: "BatchNumber", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "LOTNumber", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_POR_PurchaseOrderID FOREIGN KEY (PurchaseOrderID) REFERENCES PurchaseOrders(PurchaseOrderID)",
      "CONSTRAINT FK_POR_VendorID FOREIGN KEY (VendorID) REFERENCES Vendors(VendorID)",
      "CONSTRAINT FK_POR_WarehouseID FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID)",
      "CONSTRAINT FK_POR_BranchID FOREIGN KEY (BranchID) REFERENCES Branches(BranchID)",
      "CONSTRAINT FK_POR_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)",
      "CONSTRAINT FK_POR_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)",
    ],
  },

  // --- NEW: SALES ORDER SCHEMA DEFINITIONS ---
  SalesOrders: {
    tableName: "SalesOrders",
    columns: [
      {
        name: "SalesOrderID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "SalesOrderNumber",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "SalesOrderDate", type: "DATE", properties: "NOT NULL" },
      { name: "DeliveryDate", type: "DATE", properties: "NULL" },
      {
        name: "SalesOrderStatus",
        type: "NVARCHAR(50)",
        properties: "NOT NULL DEFAULT 'New'",
      },
      { name: "CustomerID", type: "INT", properties: "NULL" },
      { name: "BranchID", type: "INT", properties: "NULL" },
      { name: "WarehouseID", type: "INT", properties: "NULL" },
      { name: "TransporterName", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "VehicleNumber", type: "NVARCHAR(50)", properties: "NULL" },
      { name: "LRNumber", type: "NVARCHAR(50)", properties: "NULL" },
      { name: "Remarks", type: "NVARCHAR(500)", properties: "NULL" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_SalesOrders_Customer FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID)",
      "CONSTRAINT FK_SalesOrders_Branch FOREIGN KEY (BranchID) REFERENCES Branches(BranchID)",
      "CONSTRAINT FK_SalesOrders_Warehouse FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID)",
    ],
  },

  SalesOrderProducts: {
    tableName: "SalesOrderProducts",
    columns: [
      {
        name: "SalesOrderProductID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      { name: "SalesOrderID", type: "INT", properties: "NOT NULL" },
      { name: "ProductID", type: "INT", properties: "NOT NULL" },
      { name: "Quantity", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      { name: "PickedQuantity", type: "DECIMAL(10, 2)", properties: "NOT NULL DEFAULT 0" },
      { name: "ShippedQuantity", type: "DECIMAL(10, 2)", properties: "NOT NULL DEFAULT 0" },
      { name: "MRP", type: "DECIMAL(10, 2)", properties: "NULL" },
      { name: "BatchNumber", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "ManufactureDate", type: "DATE", properties: "NULL" },
      { name: "UOMID", type: "INT", properties: "NULL" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_SOP_SalesOrder FOREIGN KEY (SalesOrderID) REFERENCES SalesOrders(SalesOrderID)",
      "CONSTRAINT FK_SOP_Product FOREIGN KEY (ProductID) REFERENCES Products(ProductID)",
      "CONSTRAINT FK_SOP_UOM FOREIGN KEY (UOMID) REFERENCES UOMs(UOMID)",
    ],
  },

  SalesOrderShipments: {
    tableName: "SalesOrderShipments",
    columns: [
      {
        name: "SalesOrderShipmentID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      { name: "SalesOrderID", type: "INT", properties: "NOT NULL" },
      { name: "ShipmentNumber", type: "NVARCHAR(50)", properties: "NOT NULL UNIQUE" },
      { name: "ShipmentDate", type: "DATE", properties: "NOT NULL" },
      {
        name: "ShipmentStatus",
        type: "NVARCHAR(50)",
        properties: "NOT NULL DEFAULT 'Pending'",
      },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_SOS_SalesOrder FOREIGN KEY (SalesOrderID) REFERENCES SalesOrders(SalesOrderID)",
    ],
  },

  SalesOrderReturns: {
    tableName: "SalesOrderReturns",
    columns: [
      {
        name: "SalesOrderReturnID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "SalesOrderReturnNumber",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "SalesOrderReturnDate", type: "DATE", properties: "NOT NULL" },
      {
        name: "SalesOrderReturnStatus",
        type: "NVARCHAR(50)",
        properties: "NOT NULL DEFAULT 'New'",
      },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [],
  },

  SalesOrderReturnProducts: {
    tableName: "SalesOrderReturnProducts",
    columns: [
      {
        name: "SalesOrderReturnProductID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      { name: "SalesOrderReturnID", type: "INT", properties: "NOT NULL" },
      { name: "ProductID", type: "INT", properties: "NOT NULL" },
      { name: "Quantity", type: "DECIMAL(10, 2)", properties: "NOT NULL" },
      { name: "Reason", type: "NVARCHAR(255)", properties: "NULL" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_SORP_SalesOrderReturn FOREIGN KEY (SalesOrderReturnID) REFERENCES SalesOrderReturns(SalesOrderReturnID)",
      "CONSTRAINT FK_SORP_Product FOREIGN KEY (ProductID) REFERENCES Products(ProductID)",
    ],
  },

  SalesOrderReturnReceivings: {
    tableName: "SalesOrderReturnReceivings",
    columns: [
      {
        name: "SalesOrderReturnReceivingID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "SalesOrderReturnReceivingNumber",
        type: "NVARCHAR(50)",
        properties: "NOT NULL UNIQUE",
      },
      { name: "SalesOrderReturnID", type: "INT", properties: "NOT NULL" },
      { name: "ReceivingDate", type: "DATE", properties: "NOT NULL" },
      {
        name: "SalesOrderReturnReceivingStatus",
        type: "NVARCHAR(50)",
        properties: "NOT NULL DEFAULT 'New'",
      },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_SORR_SalesOrderReturn FOREIGN KEY (SalesOrderReturnID) REFERENCES SalesOrderReturns(SalesOrderReturnID)",
    ],
  },

  // --- NEW: DOCUMENTS TABLE (Shared across entities) ---
  Documents: {
    tableName: "Documents",
    columns: [
      {
        name: "DocumentID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      {
        name: "EntityType",
        type: "NVARCHAR(50)",
        properties: "NOT NULL",
      },
      { name: "EntityID", type: "INT", properties: "NOT NULL" },
      {
        name: "FileName",
        type: "NVARCHAR(255)",
        properties: "NOT NULL",
      },
      {
        name: "OriginalFileName",
        type: "NVARCHAR(255)",
        properties: "NOT NULL",
      },
      {
        name: "FilePath",
        type: "NVARCHAR(500)",
        properties: "NOT NULL",
      },
      { name: "FileSize", type: "BIGINT", properties: "NULL" },
      { name: "MimeType", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "DocumentType", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [],
  },

  // --- NEW: PRODUCT MATERIALS TABLE ---
  ProductMaterials: {
    tableName: "ProductMaterials",
    columns: [
      {
        name: "ProductMaterialID",
        type: "INT",
        properties: "PRIMARY KEY IDENTITY(1,1)",
      },
      { name: "ProductID", type: "INT", properties: "NOT NULL" },
      { name: "MaterialID", type: "INT", properties: "NOT NULL" },
      { name: "Quantity", type: "DECIMAL(18, 2)", properties: "NOT NULL" },
      { name: "UOMID", type: "INT", properties: "NULL" },
      { name: "IsActive", type: "BIT", properties: "NOT NULL DEFAULT 1" },
      { name: "IsDeleted", type: "BIT", properties: "NOT NULL DEFAULT 0" },
      { name: "CreatedBy", type: "INT", properties: "NOT NULL" },
      { name: "UpdatedBy", type: "INT", properties: "NOT NULL" },
      {
        name: "CreatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
      {
        name: "UpdatedDate",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      "CONSTRAINT FK_ProductMaterials_Product FOREIGN KEY (ProductID) REFERENCES Products(ProductID)",
      "CONSTRAINT FK_ProductMaterials_Material FOREIGN KEY (MaterialID) REFERENCES Materials(MaterialID)",
      "CONSTRAINT FK_ProductMaterials_UOM FOREIGN KEY (UOMID) REFERENCES UOMs(UOMID)",
    ],
  },

  AuditLogs: {
    tableName: "AuditLogs",
    columns: [
      { name: "LogID", type: "INT", properties: "PRIMARY KEY IDENTITY(1,1)" },
      { name: "UserID", type: "INT", properties: "NULL" },
      { name: "ActionType", type: "NVARCHAR(100)", properties: "NOT NULL" },
      { name: "ModuleName", type: "NVARCHAR(50)", properties: "NOT NULL" },
      { name: "ReferenceID", type: "NVARCHAR(100)", properties: "NULL" },
      { name: "LogDetails", type: "NVARCHAR(MAX)", properties: "NULL" },
      {
        name: "LogTimestamp",
        type: "DATETIME",
        properties: "NOT NULL DEFAULT GETDATE()",
      },
    ],
    foreignKeys: [
      // "CONSTRAINT FK_AuditLogs_UserID FOREIGN KEY (UserID) REFERENCES Users(UserID)",
    ],
  },
};

/**
 * Cleans numeric columns before altering them to avoid data type conversion errors
 * @param {object} request - The database request object
 */
async function cleanNumericColumnsBeforeAlter(request) {
  console.log("Cleaning numeric columns before schema alteration...");

  const numericTables = [
    {
      table: "Products",
      columns: [
        "NetWeight",
        "GrossWeight",
        "ShelfLifeDays",
        "NearExpiryDays",
        "Length",
        "Breadth",
        "Height",
        "MinimumQty",
        "ReorderLevelQty",
      ],
    },
    {
      table: "Warehouses",
      columns: [
        "Latitude",
        "Longitude",
        "MaxCapacitySQFT",
        "MaxCapacityMT",
        "CarpetArea",
      ],
    },
    { table: "Compartments", columns: ["Length", "Breadth", "Height"] },
    { table: "PalletTypes", columns: ["Length", "Breadth", "Height"] },
    {
      table: "VehicleTypes",
      columns: ["VehicleCapacityTonnes", "Length", "Breadth", "Height"],
    },
    {
      table: "Gates",
      columns: ["Height", "Width", "DistanceFromLeftCornerMeters"],
    },
    { table: "ProductPalletConfigs", columns: ["Length", "Breadth", "Height"] },
  ];

  for (const { table, columns } of numericTables) {
    try {
      const tableExists = await request.query(`
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${table}'
      `);

      if (tableExists.recordset.length === 0) continue;

      for (const column of columns) {
        const columnExists = await request.query(`
          SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'
        `);

        if (columnExists.recordset.length === 0) continue;

        const cleanQuery = `
          UPDATE ${table} 
          SET ${column} = NULL 
          WHERE TRY_CAST(${column} AS DECIMAL) IS NULL AND ${column} IS NOT NULL;
        `;
        await request.query(cleanQuery);
      }
    } catch (err) {
      console.warn(`Warning: Could not clean ${table}:`, err.message);
    }
  }

  console.log("Numeric column cleaning complete.");
}

async function ensureNullableColumns(request, tableName, columns) {
  try {
    const tableExists = await request.query(`
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${tableName}'
    `);
    if (tableExists.recordset.length === 0) return;

    for (const column of columns) {
      const columnCheck = await request.query(`
        SELECT IS_NULLABLE, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tableName}' AND COLUMN_NAME = '${column}'
      `);
      const columnInfo = columnCheck.recordset?.[0];
      if (!columnInfo || columnInfo.IS_NULLABLE === "YES") continue;

      const dataType = columnInfo.DATA_TYPE;
      const alterQuery = `ALTER TABLE ${tableName} ALTER COLUMN ${column} ${dataType} NULL;`;
      await request.query(alterQuery);
    }
  } catch (err) {
    console.warn(
      `Warning: Could not ensure nullable columns for '${tableName}':`,
      err.message,
    );
  }
}

/**
 * UPGRADED SCHEMA SYNC FUNCTION
 * Checks tables, columns, and data types/lengths, and creates/alters the DB schema as needed.
 * @param {object} pool - The database connection pool.
 */
async function verifyAndSyncSchema(pool) {
  console.log("Verifying database schema...");
  const request = pool.request();

  // --- SPECIAL ONE-TIME FIX FOR GATES.Direction CONSTRAINT ---
  try {
    console.log("Checking for outdated Gates.Direction constraint...");
    const constraintCheckQuery = `
        SELECT name
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID('dbo.Gates')
        AND definition LIKE '%Inbound%';
    `;
    const result = await request.query(constraintCheckQuery);

    if (result.recordset.length > 0) {
      const oldConstraintName = result.recordset[0].name;
      console.log(
        `Found outdated constraint '${oldConstraintName}'. Removing it...`,
      );

      const dropConstraintQuery = `ALTER TABLE Gates DROP CONSTRAINT ${oldConstraintName};`;
      await request.query(dropConstraintQuery);

      const addConstraintQuery = `ALTER TABLE Gates ADD CONSTRAINT CK_Gates_Direction CHECK (Direction IN ('North', 'South', 'East', 'West'));`;
      await request.query(addConstraintQuery);

      console.log("Successfully replaced Gates.Direction constraint.");
    } else {
      console.log("Gates.Direction constraint is up to date.");
    }
  } catch (err) {
    // This might fail if the table doesn't exist yet, which is okay.
    if (!err.message.includes("Invalid object name 'dbo.Gates'")) {
      console.error("Could not fix Gates constraint:", err.message);
    }
  }
  // --- END OF SPECIAL FIX ---

  // --- NEW: RUN DATA CLEANUP BEFORE ALTERING TYPES ---
  await cleanNumericColumnsBeforeAlter(request);
  // --- END NEW STEP ---

  await ensureNullableColumns(request, "PurchaseOrderReceivings", [
    "PurchaseOrderID",
    "VendorID",
    "WarehouseID",
    "BranchID",
    "GSRN",
    "VehicleNumber",
    "LRNumber",
    "InvoiceNumber",
    "BatchNumber",
    "LOTNumber",
  ]);

  // TWO-PASS APPROACH: First create tables without FKs, then add FKs
  // PASS 1: Create all tables without foreign keys
  console.log("PASS 1: Creating tables without foreign keys...");
  for (const tableKey of Object.keys(schema)) {
    const { tableName, columns } = schema[tableKey];

    try {
      const tableCheckResult = await request.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${tableName}'`,
      );

      if (tableCheckResult.recordset.length === 0) {
        console.log(`Table '${tableName}' not found. Creating table...`);
        let createTableQuery = `CREATE TABLE ${tableName} (`;
        const columnDefs = columns.map(
          (c) => `${c.name} ${c.type} ${c.properties}`,
        );
        createTableQuery += columnDefs.join(", ");
        createTableQuery += ");";
        // console.log(`SQL: ${createTableQuery}`); // DEBUG: Log the SQL
        await request.query(createTableQuery);
        console.log(`Table '${tableName}' created successfully.`);
      } else {
        // Table exists, verify columns
        const existingColumnsResult = await request.query(`
                    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = '${tableName}'
                `);
        const existingColumnsMap = new Map(
          existingColumnsResult.recordset.map((c) => [
            c.COLUMN_NAME.toLowerCase(),
            { type: c.DATA_TYPE, length: c.CHARACTER_MAXIMUM_LENGTH },
          ]),
        );

        for (const column of columns) {
          const columnNameLower = column.name.toLowerCase();
          const desiredType = column.type.match(/([a-zA-Z]+)/)[0].toLowerCase();
          const lengthMatch = column.type.match(/\((\d+|MAX)\)/i);
          const desiredLength = lengthMatch
            ? lengthMatch[1].toUpperCase() === "MAX"
              ? -1
              : parseInt(lengthMatch[1])
            : null;

          if (!existingColumnsMap.has(columnNameLower)) {
            console.log(
              `Column '${column.name}' missing in '${tableName}'. Adding...`,
            );
            
            // Filter properties: Remove PRIMARY KEY, IDENTITY, UNIQUE (can't be in ALTER ADD)
            // Keep: NULL, NOT NULL, DEFAULT values
            let safeProperties = column.properties
              .replace(/PRIMARY KEY/gi, '')
              .replace(/IDENTITY\([^)]+\)/gi, '')
              .replace(/UNIQUE/gi, '')
              .trim();
            
            const addColumnQuery = `ALTER TABLE ${tableName} ADD ${column.name} ${column.type} ${safeProperties};`;
            console.log(`Executing: ${addColumnQuery}`);
            await request.query(addColumnQuery);
            console.log(`✓ Column '${column.name}' added successfully.`);
          } else {
            const existingColumn = existingColumnsMap.get(columnNameLower);
            const typeIsDifferent =
              existingColumn.type.toLowerCase() !== desiredType;
            const lengthIsDifferent =
              desiredLength !== null && existingColumn.length !== desiredLength;

            if (typeIsDifferent || lengthIsDifferent) {
              console.log(
                `Column '${column.name}' in '${tableName}' has incorrect type/length. Altering...`,
              );

              // Step 1: Drop any UNIQUE constraints on this column
              const constraintsQuery = `
                SELECT CONSTRAINT_NAME 
                FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE 
                WHERE TABLE_NAME = '${tableName}' AND COLUMN_NAME = '${column.name}'
              `;
              const constraints = await request.query(constraintsQuery);
              const droppedConstraints = [];

              for (const constraint of constraints.recordset) {
                try {
                  await request.query(
                    `ALTER TABLE ${tableName} DROP CONSTRAINT ${constraint.CONSTRAINT_NAME}`,
                  );
                  droppedConstraints.push(constraint.CONSTRAINT_NAME);
                  console.log(
                    `Dropped constraint ${constraint.CONSTRAINT_NAME}`,
                  );
                } catch (err) {
                  console.warn(
                    `Could not drop constraint ${constraint.CONSTRAINT_NAME}:`,
                    err.message,
                  );
                }
              }

              // Step 2: Alter the column
              const properties = column.properties
                .split(" ")
                .filter((p) => ["NOT NULL", "NULL"].includes(p.toUpperCase()))
                .join(" ");
              const alterColumnQuery = `ALTER TABLE ${tableName} ALTER COLUMN ${column.name} ${column.type} ${properties};`;
              await request.query(alterColumnQuery);
              console.log(`Column '${column.name}' altered successfully.`);

              // Step 3: Recreate UNIQUE constraints if they existed and are still needed
              if (
                column.properties.toUpperCase().includes("UNIQUE") &&
                droppedConstraints.length > 0
              ) {
                try {
                  await request.query(
                    `ALTER TABLE ${tableName} ADD CONSTRAINT UQ_${tableName}_${column.name} UNIQUE (${column.name})`,
                  );
                  console.log(`Recreated UNIQUE constraint on ${column.name}`);
                } catch (err) {
                  console.warn(
                    `Could not recreate UNIQUE constraint:`,
                    err.message,
                  );
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(
        `Error syncing schema for table '${tableName}' (Pass 1):`,
        err.message,
      );
      // Don't throw, continue with other tables
      console.warn(`Skipping table '${tableName}' for now...`);
    }
  }
  console.log("PASS 1 complete.");

  // PASS 2: Add foreign key constraints
  console.log("PASS 2: Adding foreign key constraints...");
  for (const tableKey of Object.keys(schema)) {
    const { tableName, foreignKeys } = schema[tableKey];
    
    if (!foreignKeys || foreignKeys.length === 0) continue;

    try {
      // Check if table exists first
      const tableCheckResult = await request.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${tableName}'`,
      );
      
      if (tableCheckResult.recordset.length === 0) {
        console.warn(`Table '${tableName}' doesn't exist, skipping FK creation.`);
        continue;
      }

      for (const fk of foreignKeys) {
        try {
          // Check if constraint already exists
          const constraintName = fk.match(/CONSTRAINT (\w+)/)?.[1];
          if (constraintName) {
            const existingFK = await request.query(`
              SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
              WHERE CONSTRAINT_NAME = '${constraintName}' AND TABLE_NAME = '${tableName}'
            `);
            
            if (existingFK.recordset.length > 0) {
              // console.log(`FK '${constraintName}' already exists on '${tableName}'.`);
              continue;
            }
          }

          // Add the foreign key
          const alterQuery = `ALTER TABLE ${tableName} ADD ${fk};`;
          await request.query(alterQuery);
          console.log(`Added FK to '${tableName}': ${constraintName || fk.substring(0, 50)}`);
        } catch (fkErr) {
          console.warn(
            `Could not add FK to '${tableName}': ${fkErr.message.substring(0, 100)}`,
          );
          // Continue with other FKs
        }
      }
    } catch (err) {
      console.warn(
        `Error adding FKs for table '${tableName}':`,
        err.message,
      );
      // Continue with other tables
    }
  }
  console.log("PASS 2 complete.");

  console.log("Database schema verification complete.");
}

module.exports = { verifyAndSyncSchema };
