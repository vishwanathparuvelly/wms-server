// config/importExportConfig.js

const { Lookups } = require("./lookupTypes");

// Services are required to link the module to its database functions.
const services = {
  country: require("../service/Country_Service"),
  state: require("../service/State_Service"),
  city: require("../service/City_Service"),
  zone: require("../service/Zone_Service"),
  branch: require("../service/Branch_Service"),
  warehouseType: require("../service/WarehouseType_Service"),
  warehouse: require("../service/Warehouse_Service"),
  compartment: require("../service/Compartment_Service"),
  stack: require("../service/Stack_Service"),
  brand: require("../service/Brand_Service"),
  uom: require("../service/UOM_Service"),
  line: require("../service/Line_Service"),
  productType: require("../service/ProductType_Service"),
  productConsume: require("../service/ProductConsume_Service"),
  packagingType: require("../service/PackagingType_Service"),
  sloc: require("../service/Sloc_Service"),
  palletType: require("../service/PalletType_Service"),
  storageType: require("../service/StorageType_Service"),
  vehicleType: require("../service/VehicleType_Service"),
  gateType: require("../service/GateType_Service"),
  gate: require("../service/Gate_Service"),
  customer: require("../service/Customer_Service"),
  laborProvider: require("../service/LaborProvider_Service"),

  bin: require("../service/Bin_Service"), // <--- VITAL FIX: Added Bin Service
  vendor: require("../service/Vendor_Service"), // <--- VITAL FIX: ADDED VENDOR SERVICE
  customerType: require("../service/CustomerType_Service"), // <--- VITAL FIX: ADD THIS LINE
  employee: require("../service/Employee_Service"), // <-- NEW EMPLOYEE SERVICE IMPORT

  // --- NEW: SKILL SERVICE ---
  skill: require("../service/Skill_Service"),
  // --- END SKILL SERVICE ---
  product: require("../service/Product_Service"), // <-- NEW PRODUCT SERVICE
  material: require("../service/Material_Service"), // <-- NEW MATERIAL SERVICE
};

/**
 * =======================================================================================
 * PROFESSIONAL CONFIGURATION
 *
 * This object is the single source of truth for both importing and exporting.
 * =======================================================================================
 */
const moduleConfigs = {
  // --- NEW: PRODUCT MASTER CONFIGURATION ---
  // config/importExportConfig.js

  // ...

  // config/importExportConfig.js -> inside the product config

  // CORRECT STRUCTURE

  product: {
    moduleName: "Product Master",
    serviceKey: "product",
    addFunctionName: "addProduct",
    fetchFunctionName: "getProductsForExport",
    fields: {
      // <-- This 'fields' key was missing
      ProductCode: { header: "Product Code", required: true },
      ProductName: { header: "Product Name", required: true },
      BrandID: {
        header: "Brand",
        required: true,
        resolvesTo: Lookups.Brand,
      },
      ProductTypeID: {
        header: "Product Type",
        required: true,
        resolvesTo: Lookups.ProductType,
      },
      UOMID: {
        header: "Base UOM",
        required: true,
        resolvesTo: Lookups.UOM,
      },
      NetWeight: { header: "Net Weight", required: true, type: "decimal" },
      GrossWeight: { header: "Gross Weight", required: true, type: "decimal" },
      ShelfLifeDays: {
        header: "Shelf Life (Days)",
        required: true,
        type: "integer",
      },
      NearExpiryDays: {
        header: "Near Expiry (Days)",
        required: true,
        type: "integer",
      },
      Length: { header: "Length", required: true, type: "decimal" },
      Breadth: { header: "Breadth", required: true, type: "decimal" },
      Height: { header: "Height", required: true, type: "decimal" },
      MinimumQty: { header: "Min Quantity", required: true, type: "decimal" },
      ReorderLevelQty: {
        header: "Reorder Level Qty",
        required: true,
        type: "decimal",
      },
      Category: { header: "Category", isOptional: true },
      HSNCode: { header: "HSN Code", isOptional: true },
      IsHazmat: {
        header: "Is Hazardous (TRUE/FALSE)",
        isOptional: true,
        type: "boolean",
      },
      IsActive: {
        header: "Active Status (TRUE/FALSE)",
        required: true,
        type: "boolean",
      },

      // Pallet Configuration Fields
      PalletName: {
        header: "Pallet Name",
        required: true,
        resolvesTo: Lookups.PalletType,
        importKey: "PalletTypeID",
      },
      MaxCapacity: {
        header: "Pallet Max Capacity",
        required: true,
        type: "integer",
      },
      IsPalletDefault: {
        header: "Is Pallet Default",
        required: true,
        type: "boolean",
      },
    },
  },

  // ...
  // --- END NEW PRODUCT MASTER CONFIGURATION ---

  country: {
    moduleName: "Country Master",
    serviceKey: "country",
    addFunctionName: "addCountry",
    fetchFunctionName: "getAllCountries",
    fields: {
      CountryName: { header: "Country Name", required: true },
      CountryCode: { header: "Country Code", required: true },
      CountryISDCode: { header: "ISD Code", required: true },
      CountryCurrency: { header: "Currency", required: true },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  state: {
    moduleName: "State Master",
    serviceKey: "state",
    addFunctionName: "addState",
    fetchFunctionName: "getAllStates",
    fields: {
      StateName: { header: "State Name", required: true },
      StateCode: { header: "State Code", required: true },
      CountryID: {
        header: "Country Name",
        required: true,
        resolvesTo: Lookups.Country,
      },
      TinNumber: { header: "TIN Number" },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  city: {
    moduleName: "City Master",
    serviceKey: "city",
    addFunctionName: "addCity",
    fetchFunctionName: "getAllCities",
    fields: {
      CityName: { header: "City Name", required: true },
      CityCode: { header: "City Code", required: true },
      CountryID: {
        header: "Country Name",
        required: true,
        resolvesTo: Lookups.Country,
      },
      StateID: {
        header: "State Name",
        required: true,
        resolvesTo: Lookups.State,
        parent: Lookups.Country.key,
      },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  zone: {
    moduleName: "Zone Master",
    serviceKey: "zone",
    addFunctionName: "addZone",
    fetchFunctionName: "getAllZones",
    fields: {
      ZoneName: { header: "Zone Name", required: true },
      ZoneCode: { header: "Zone Code", required: true },
      CountryID: {
        header: "Country Name",
        required: true,
        resolvesTo: Lookups.Country,
      },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  customer: {
    moduleName: "Customer Master",
    serviceKey: "customer",
    addFunctionName: "addCustomer",
    fetchFunctionName: "getAllCustomers",
    fields: {
      CustomerCode: { header: "Customer Code", required: true },
      CustomerName: { header: "Customer Name", required: true },
      CustomerTypeID: {
        header: "Customer Type",
        required: true,
        resolvesTo: Lookups.CustomerType,
      },
      StreetAddress1: { header: "Address 1", required: true },
      CountryID: {
        header: "Country",
        required: true,
        resolvesTo: Lookups.Country,
      },
      StateID: {
        header: "State",
        required: true,
        resolvesTo: Lookups.State,
        parent: Lookups.Country.key,
      },
      CityID: {
        header: "City",
        required: true,
        resolvesTo: Lookups.City,
        parent: Lookups.State.key,
      },
      CustomerContactNumber: { header: "Contact Number", required: true },
      EmailAddress: { header: "Email Address", required: true },

      // Optional Fields
      StreetAddress2: { header: "Address 2", isOptional: true },
      ZoneID: {
        header: "Zone",
        isOptional: true,
        resolvesTo: Lookups.Zone,
        parent: Lookups.Country.key,
      },
      WarehouseID: {
        header: "Default Warehouse",
        isOptional: true,
        resolvesTo: Lookups.Warehouse,
      },
      BusinessSize: { header: "Business Size", isOptional: true },
      Description: { header: "Description", isOptional: true },
      GSTIN: { header: "GSTIN (Tax ID)", isOptional: true },

      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  branch: {
    moduleName: "Branch Master",
    serviceKey: "branch",
    addFunctionName: "addBranch",
    fetchFunctionName: "getAllBranches",
    fields: {
      BranchCode: { header: "Branch Code", required: true },
      BranchName: { header: "Branch Name", required: true },
      StreetAddress1: { header: "Address 1", required: true },
      CountryID: {
        header: "Country",
        required: true,
        resolvesTo: Lookups.Country,
      },
      StateID: {
        header: "State",
        required: true,
        resolvesTo: Lookups.State,
        parent: Lookups.Country.key,
      },
      CityID: {
        header: "City",
        required: true,
        resolvesTo: Lookups.City,
        parent: Lookups.State.key,
      },
      ZoneID: {
        header: "Zone",
        required: true,
        resolvesTo: Lookups.Zone,
        parent: Lookups.Country.key,
      },
      StreetAddress2: { header: "Address 2" },
      BranchDescription: { header: "Description" },
      IsDefault: { header: "Is Default", type: "boolean" },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  laborProvider: {
    moduleName: "Labor Provider Master",
    service: services.laborProvider,
    addFunctionName: "addLaborProvider",
    fetchFunctionName: "getAllLaborProviders",
    fields: {
      ProviderCode: { header: "Provider Code", required: true },
      ProviderName: { header: "Provider Name", required: true },
      IsActive: {
        header: "Active Status (TRUE/FALSE)",
        required: true,
        type: "boolean",
      },
      CreatedDate: { header: "Created Date" },
    },
  },
  warehouseType: {
    moduleName: "Warehouse Type Master",
    serviceKey: "warehouseType",
    addFunctionName: "addWarehouseType",
    fetchFunctionName: "getAllWarehouseTypes",
    fields: {
      WarehouseTypeName: { header: "Warehouse Type Name", required: true },
      WarehouseTypeDescription: { header: "Description" },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
    },
  },
  warehouse: {
    moduleName: "Warehouse Master",
    serviceKey: "warehouse",
    addFunctionName: "addWarehouse",
    fetchFunctionName: "getAllWarehouses",
    fields: {
      WarehouseCode: { header: "Warehouse Code", required: true },
      WarehouseName: { header: "Warehouse Name", required: true },
      BranchID: {
        header: "Branch Name",
        required: true,
        resolvesTo: Lookups.Branch,
      },
      StreetAddress1: { header: "Address 1", required: true },
      CountryID: {
        header: "Country",
        required: true,
        resolvesTo: Lookups.Country,
      },
      StateID: {
        header: "State",
        required: true,
        resolvesTo: Lookups.State,
        parent: Lookups.Country.key,
      },
      CityID: {
        header: "City",
        required: true,
        resolvesTo: Lookups.City,
        parent: Lookups.State.key,
      },
      ZoneID: {
        header: "Zone",
        required: true,
        resolvesTo: Lookups.Zone,
        parent: Lookups.Country.key,
      },
      StreetAddress2: { header: "Address 2" },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  compartment: {
    moduleName: "Compartment Master",
    serviceKey: "compartment",
    addFunctionName: "addCompartment",
    fetchFunctionName: "getAllCompartments",
    fields: {
      CompartmentCode: { header: "Compartment Code", required: true },
      CompartmentName: { header: "Compartment Name", required: true },
      WarehouseID: {
        header: "Warehouse Name",
        required: true,
        resolvesTo: Lookups.Warehouse,
      },
      MaxStockCount: {
        header: "Max Stock Count",
        required: true,
        type: "integer",
      },
      Length: { header: "Length", required: true, type: "decimal" },
      Breadth: { header: "Breadth", required: true, type: "decimal" },
      Height: { header: "Height", required: true, type: "decimal" },
      Volume: { header: "Volume" },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  stack: {
    moduleName: "Stack Master",
    serviceKey: "stack",
    addFunctionName: "addStack",
    fetchFunctionName: "getAllStacks",
    fields: {
      StackCode: { header: "Stack Code", required: true },
      StackName: { header: "Stack Name", required: true },
      WarehouseID: {
        header: "Warehouse Name",
        required: true,
        resolvesTo: Lookups.Warehouse,
      },
      CompartmentID: {
        header: "Compartment Name",
        required: true,
        resolvesTo: Lookups.Compartment,
        parent: Lookups.Warehouse.key,
      },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  // ======================== VITAL FIX: CUSTOMER TYPE MASTER ========================
  customerType: {
    moduleName: "Customer Type Master",
    serviceKey: "customerType",
    addFunctionName: "addCustomerType",
    fetchFunctionName: "getAllCustomerTypes",
    fields: {
      CustomerTypeName: { header: "Customer Type Name", required: true },
      CustomerTypeDescription: { header: "Description", isOptional: true },
      IsActive: {
        header: "Active Status (TRUE/FALSE)",
        required: true,
        type: "boolean",
      },
      CreatedDate: { header: "Created Date" },
    },
  },

  // --- NEW: SKILL MASTER CONFIG ---
  skill: {
    moduleName: "Skill Master",
    service: services.skill,
    addFunctionName: "addSkill",
    fetchFunctionName: "getAllSkills",
    fields: {
      SkillName: { header: "Skill Name", required: true },
      SkillDescription: { header: "Description", isOptional: true },
      IsActive: {
        header: "Active Status (TRUE/FALSE)",
        required: true,
        type: "boolean",
      },
      CreatedDate: { header: "Created Date" },
    },
  },
  // --- END SKILL MASTER CONFIG ---

  vendor: {
    moduleName: "Vendor Master",
    serviceKey: "vendor",
    addFunctionName: "addVendor",
    fetchFunctionName: "getAllVendors",
    fields: {
      VendorCode: { header: "Vendor Code", required: true },
      VendorName: { header: "Vendor Name", required: true },
      VendorDescription: { header: "Vendor Description", isOptional: true },
      BusinessType: { header: "Business Type", isOptional: true },
      VendorContactNumber: { header: "Contact Number", required: true },
      StreetAddress1: { header: "Address 1", required: true },
      StreetAddress2: { header: "Address 2", isOptional: true },

      // Mandatory FKs
      CountryID: {
        header: "Country Name",
        required: true,
        resolvesTo: Lookups.Country,
      },
      StateID: {
        header: "State Name",
        required: true,
        resolvesTo: Lookups.State,
        parent: Lookups.Country.key,
      },
      CityID: {
        header: "City Name",
        required: true,
        resolvesTo: Lookups.City,
        parent: Lookups.State.key,
      },
      ZoneID: {
        header: "Zone Name",
        isOptional: true,
        resolvesTo: Lookups.Zone,
        parent: Lookups.Country.key,
      },

      // Optional Contact Fields
      PrimaryContact: { header: "Contact Person Name", isOptional: true, exportKey: "ContactPerson" },
      ContactEmail: { header: "Email Address", isOptional: true, exportKey: "EmailAddress" },
      GSTIN: { header: "GSTIN (Tax ID)", isOptional: true },

      IsActive: {
        header: "Active Status (TRUE/FALSE)",
        required: true,
        type: "boolean",
      },
      CreatedDate: { header: "Created Date" },
    },
  },
  // ======================================================================

  // ======================== VITAL FIX: BIN MASTER ========================
  bin: {
    moduleName: "Bin Master",
    serviceKey: "bin",
    addFunctionName: "addBin",
    fetchFunctionName: "getAllBins",
    fields: {
      BinNumber: { header: "Bin Number", required: true },
      WarehouseID: {
        header: "Warehouse Name",
        required: true,
        resolvesTo: Lookups.Warehouse,
      },
      CompartmentID: {
        header: "Compartment Name",
        required: true,
        resolvesTo: Lookups.Compartment,
        parent: Lookups.Warehouse.key,
      },
      StackID: {
        header: "Stack Name",
        required: true,
        resolvesTo: Lookups.Stack,
        parent: Lookups.Compartment.key,
      },
      SlocID: {
        header: "SLOC Name",
        required: true,
        resolvesTo: Lookups.Sloc,
      },
      StorageTypeID: {
        header: "Storage Type Name",
        required: true,
        resolvesTo: Lookups.StorageType,
      },
      XCoordinate: { header: "X-Coordinate", required: true, type: "integer" },
      YCoordinate: { header: "Y-Coordinate", required: true, type: "integer" },
      ZCoordinate: { header: "Z-Coordinate", required: true, type: "integer" },

      // Optional fields for import
      PalletTypeID: {
        header: "Pallet Type Name",
        isOptional: true,
        resolvesTo: Lookups.PalletType,
      },
      MaxPallets: { header: "Max Pallets", isOptional: true, type: "integer" },
      MaxWeightKG: {
        header: "Max Weight (kg)",
        isOptional: true,
        type: "decimal",
      },
      MaxVolumeM3: {
        header: "Max Volume (m³)",
        isOptional: true,
        type: "decimal",
      },
      CheckDigit: { header: "Check Digit", isOptional: true },

      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  // ======================================================================

  brand: {
    moduleName: "Brand Master",
    serviceKey: "brand",
    addFunctionName: "addBrand",
    fetchFunctionName: "getAllBrands",
    fields: {
      BrandCode: { header: "Brand Code", required: true },
      BrandName: { header: "Brand Name", required: true },
      MainBrand: { header: "Main Brand" },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  uom: {
    moduleName: "UOM Master",
    serviceKey: "uom",
    addFunctionName: "addUOM",
    fetchFunctionName: "getAllUOMs",
    fields: {
      UOMCode: { header: "UOM Code", required: true },
      UOMName: { header: "UOM Name", required: true },
      UOMDescription: { header: "Description", required: true },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  material: {
    moduleName: "Material Master",
    serviceKey: "material",
    addFunctionName: "addMaterial",
    fetchFunctionName: "getAllMaterials",
    fields: {
      MaterialCode: { header: "Material Code", required: true },
      MaterialName: { header: "Material Name", required: true },
      MaterialDescription: { header: "Description", isOptional: true },
      UOMID: {
        header: "UOM",
        isOptional: true,
        resolvesTo: Lookups.UOM,
      },
      VendorID: {
        header: "Vendor",
        isOptional: true,
        resolvesTo: Lookups.Vendor,
      },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
    },
  },
  productType: {
    moduleName: "Product Type Master",
    serviceKey: "productType",
    addFunctionName: "addProductType",
    fetchFunctionName: "getAllProductTypes",
    fields: {
      ProductTypeName: { header: "Product Type Name", required: true },
      ProductTypeDescription: { header: "Description", required: true },
      ProductColor: { header: "Product Color", required: true },
      ColorCode: { header: "Color Code" },
      ParentProduct: { header: "Parent Product" },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  productConsume: {
    moduleName: "Product Consume Master",
    serviceKey: "productConsume",
    addFunctionName: "addProductConsume",
    fetchFunctionName: "getAllProductConsumes",
    fields: {
      ProductConsumeType: { header: "Consume Type", required: true },
      ProductConsumeDescription: { header: "Description", required: true },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  packagingType: {
    moduleName: "Packaging Type Master",
    serviceKey: "packagingType",
    addFunctionName: "addPackagingType",
    fetchFunctionName: "getAllPackagingTypes",
    fields: {
      PackagingTypeName: { header: "Packaging Type Name", required: true },
      PackagingTypeDescription: { header: "Description", required: true },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  line: {
    moduleName: "Line Master",
    serviceKey: "line",
    addFunctionName: "addLine",
    fetchFunctionName: "getAllLines",
    fields: {
      LineNumber: { header: "Line Number", required: true },
      LineName: { header: "Line Name", required: true },
      WarehouseID: { header: "Warehouse Name", resolvesTo: Lookups.Warehouse },
      LineType: { header: "Line Type (Production, Packing, QA, Other)" },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  sloc: {
    moduleName: "SLOC Master",
    serviceKey: "sloc",
    addFunctionName: "addSloc",
    fetchFunctionName: "getAllSlocs",
    fields: {
      SlocName: { header: "SLOC Name", required: true },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  palletType: {
    moduleName: "Pallet Type Master",
    serviceKey: "palletType",
    addFunctionName: "addPalletType",
    fetchFunctionName: "getAllPalletTypes",
    fields: {
      PalletName: { header: "Pallet Name", required: true },
      Length: { header: "Length", required: true, type: "decimal" },
      Breadth: { header: "Breadth", required: true, type: "decimal" },
      Height: { header: "Height", required: true, type: "decimal" },
      UOMID: { header: "UOM Name", required: true, resolvesTo: Lookups.UOM },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  storageType: {
    moduleName: "Storage Type Master",
    serviceKey: "storageType",
    addFunctionName: "addStorageType",
    fetchFunctionName: "getAllStorageTypes",
    fields: {
      StorageTypeName: { header: "Storage Type Name", required: true },
      StorageTypeDescription: { header: "Description", required: true },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  vehicleType: {
    moduleName: "Vehicle Type Master",
    serviceKey: "vehicleType",
    addFunctionName: "addVehicleType",
    fetchFunctionName: "getAllVehicleTypes",
    fields: {
      VehicleTypeName: { header: "Vehicle Type Name", required: true },
      VehicleCapacityTonnes: {
        header: "Capacity (Tonnes)",
        required: true,
        type: "decimal",
      },
      Length: { header: "Length", type: "decimal" },
      Breadth: { header: "Breadth", type: "decimal" },
      Height: { header: "Height", type: "decimal" },
      UOMID: { header: "UOM Name", resolvesTo: Lookups.UOM },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  gateType: {
    moduleName: "Gate Type Master",
    serviceKey: "gateType",
    addFunctionName: "addGateType",
    fetchFunctionName: "getAllGateTypes",
    fields: {
      GateTypeName: { header: "Gate Type Name", required: true },
      GateTypeDescription: { header: "Description" },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
    },
  },
  employee: {
    moduleName: "Employee Master",
    service: services.employee,
    addFunctionName: "addEmployee",
    fetchFunctionName: "getAllEmployees",
    fields: {
      EmployeeCode: { header: "Employee Code/Short Name", required: true },
      EmployeeName: { header: "Employee Name", required: true },

      // Optional fields
      DateOfJoining: {
        header: "Date of Joining (YYYY-MM-DD)",
        isOptional: true,
        type: "date",
      },
      ContactNumber: { header: "Contact Number", isOptional: true },
      Email: { header: "Email Address", isOptional: true },
      Address: { header: "Address", isOptional: true },
      DateOfBirth: {
        header: "Date of Birth (YYYY-MM-DD)",
        isOptional: true,
        type: "date",
      },
      Designation: { header: "Designation", isOptional: true },

      // Lookups (All optional as requested)
      ProviderID: {
        header: "Labor Provider Name",
        isOptional: true,
        resolvesTo: Lookups.LaborProvider,
      },
      // Note: Skills and Warehouses are multi-select and complex; typically excluded from basic CSV import/export.
      // If needed, they require a separate sheet or custom processing. We include the simple fields only.

      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
  gate: {
    moduleName: "Gate Master",
    serviceKey: "gate",
    addFunctionName: "addGate",
    fetchFunctionName: "getAllGates",
    fields: {
      GateName: { header: "Gate Name", required: true },
      WarehouseID: { header: "Warehouse Name", resolvesTo: Lookups.Warehouse },
      GateSequenceNumber: {
        header: "Sequence Number",
        required: true,
        type: "integer",
      },
      Height: { header: "Height", required: true, type: "decimal" },
      Width: { header: "Width", required: true, type: "decimal" },
      DistanceFromLeftCornerMeters: {
        header: "Distance From Corner (Meters)",
        required: true,
        type: "decimal",
      },
      Direction: {
        header: "Direction (North, South, East, West)",
        required: true,
      },
      UOMID: { header: "UOM Name", resolvesTo: Lookups.UOM },
      GateTypeID: { header: "Gate Type Name", resolvesTo: Lookups.GateType },
      IsActive: { header: "Active Status", required: true, type: "boolean" },
      CreatedDate: { header: "Created Date" },
    },
  },
};

/**
 * =======================================================================================
 * UPGRADED PROFESSIONAL FUNCTION
 *
 * This function now automatically generates the 'exportKey' for foreign key fields,
 * following the "Convention over Configuration" principle. You do not need to edit this.
 * =======================================================================================
 * @param {string} moduleKey - The key for the module (e.g., 'zone', 'branch').
 * @returns {object} The fully processed configuration object.
 */
function getModuleConfig(moduleKey) {
  const config = moduleConfigs[moduleKey];
  if (!config) {
    throw new Error(
      `No import/export configuration found for module: ${moduleKey}`,
    );
  }

  // --- AUTOMATION LOGIC STARTS HERE ---
  // Iterate over all fields defined in the module's configuration.
  for (const key in config.fields) {
    const field = config.fields[key];

    // CONVENTION: A field is a foreign key if it ends with 'ID' and has a 'resolvesTo' property.
    // We also check that an exportKey hasn't been manually set, allowing for overrides.
    if (key.endsWith("ID") && field.resolvesTo && !field.exportKey) {
      // Automatically create the exportKey by replacing 'ID' with 'Name'.
      // For example, 'CountryID' becomes 'CountryName'.
      const exportKey = key.slice(0, -2) + "Name";
      // Handle special case for ProductConsumeType which doesn't end in Name
      if (key === "ProductConsumeID") {
        field.exportKey = "ProductConsumeType";
      } else if (key === "DefaultSlocID") {
        field.exportKey = "DefaultSlocName";
      } else {
        field.exportKey = exportKey;
      }
    }
  }
  // --- AUTOMATION LOGIC ENDS HERE ---

  // This part remains the same, creating the final 'columns' array.
  config.columns = Object.entries(config.fields).map(([key, value]) => ({
    key,
    ...value,
  }));

  return config;
}

module.exports = { getModuleConfig };
