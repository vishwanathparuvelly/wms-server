// config/lookupTypes.js

/**
 * This is the single source of truth for all dependency lookups, generated from your DB schema.
 * Using these objects prevents typos and makes the main configuration file self-documenting.
 */
const Lookups = {
  Employee: {
    key: "Employee",
    tableName: "Employees",
    idColumn: "EmployeeID",
    nameColumn: "EmployeeName",
  },
  User: {
    key: "User",
    tableName: "Users",
    idColumn: "UserID",
    nameColumn: "UserName",
  },
  Country: {
    key: "Country",
    tableName: "Countries",
    idColumn: "CountryID",
    nameColumn: "CountryName",
  },
  State: {
    key: "State",
    tableName: "States",
    idColumn: "StateID",
    nameColumn: "StateName",
  },
  City: {
    key: "City",
    tableName: "Cities",
    idColumn: "CityID",
    nameColumn: "CityName",
  },
  Zone: {
    key: "Zone",
    tableName: "Zones",
    idColumn: "ZoneID",
    nameColumn: "ZoneName",
  },
  Branch: {
    key: "Branch",
    tableName: "Branches",
    idColumn: "BranchID",
    nameColumn: "BranchName",
  },
  Warehouse: {
    key: "Warehouse",
    tableName: "Warehouses",
    idColumn: "WarehouseID",
    nameColumn: "WarehouseName",
  },
  Compartment: {
    key: "Compartment",
    tableName: "Compartments",
    idColumn: "CompartmentID",
    nameColumn: "CompartmentName",
  },
  Stack: {
    key: "Stack",
    tableName: "Stacks",
    idColumn: "StackID",
    nameColumn: "StackName",
  },
  Bin: {
    // <--- VITAL FIX: ADDED BIN LOOKUP
    key: "Bin",
    tableName: "Bins",
    idColumn: "BinID",
    nameColumn: "BinNumber", // Use BinNumber for the human-readable lookup name
  },
  Brand: {
    key: "Brand",
    tableName: "Brands",
    idColumn: "BrandID",
    nameColumn: "BrandName",
  },
  UOM: {
    key: "UOM",
    tableName: "UOMs",
    idColumn: "UOMID",
    nameColumn: "UOMName",
  },
  Line: {
    key: "Line",
    tableName: "Lines",
    idColumn: "LineID",
    nameColumn: "LineName",
  },
  ProductType: {
    key: "ProductType",
    tableName: "ProductTypes",
    idColumn: "ProductTypeID",
    nameColumn: "ProductTypeName",
  },
  ProductConsume: {
    key: "ProductConsume",
    tableName: "ProductConsumes",
    idColumn: "ProductConsumeID",
    nameColumn: "ProductConsumeType",
  },
  PackagingType: {
    key: "PackagingType",
    tableName: "PackagingTypes",
    idColumn: "PackagingTypeID",
    nameColumn: "PackagingTypeName",
  },
  Sloc: {
    key: "Sloc",
    tableName: "Slocs",
    idColumn: "SlocID",
    nameColumn: "SlocName",
  },
  PalletType: {
    key: "PalletType",
    tableName: "PalletTypes",
    idColumn: "PalletTypeID",
    nameColumn: "PalletName",
  },
  StorageType: {
    key: "StorageType",
    tableName: "StorageTypes",
    idColumn: "StorageTypeID",
    nameColumn: "StorageTypeName",
  },
  // --- NEW: PRODUCT LOOKUP ---
  Product: {
    key: "Product",
    tableName: "Products",
    idColumn: "ProductID",
    nameColumn: "ProductName", // Use ProductName for lookup
  },
  Skill: {
    key: "Skill",
    tableName: "Skills", // Based on Skill_Service.js
    idColumn: "SkillID",
    nameColumn: "SkillName",
  },
  LaborProvider: {
    key: "LaborProvider",
    tableName: "LaborProviders", // Based on LaborProvider_Service.js
    idColumn: "ProviderID",
    nameColumn: "ProviderName",
  },
  // --- NEW: CUSTOMER LOOKUP ---
  Customer: {
    key: "Customer",
    tableName: "Customers",
    idColumn: "CustomerID",
    nameColumn: "CustomerName",
  },
  CustomerType: {
    // <--- VITAL FIX: Added CustomerType
    key: "CustomerType",
    tableName: "CustomerTypes",
    idColumn: "CustomerTypeID",
    nameColumn: "CustomerTypeName",
  },
  VehicleType: {
    key: "VehicleType",
    tableName: "VehicleTypes",
    idColumn: "VehicleTypeID",
    nameColumn: "VehicleTypeName",
  },
  GateType: {
    key: "GateType",
    tableName: "GateTypes",
    idColumn: "GateTypeID",
    nameColumn: "GateTypeName",
  },
  Gate: {
    key: "Gate",
    tableName: "Gates",
    idColumn: "GateID",
    nameColumn: "GateName",
  },
  Vendor: {
    key: "Vendor",
    tableName: "Vendors",
    idColumn: "VendorID",
    nameColumn: "VendorName",
  },
};

module.exports = { Lookups };
