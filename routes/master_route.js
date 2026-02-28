const express = require("express");
const router = express.Router();

// --- Controllers ---
const countryController = require("../controller/Country_Controller");
const stateController = require("../controller/State_Controller");
const cityController = require("../controller/City_Controller");
const sectionController = require("../controller/Section_Controller");
const zoneController = require("../controller/Zone_Controller");
const branchController = require("../controller/Branch_Controller");
const warehouseController = require("../controller/Warehouse_Controller");
const warehouseTypeController = require("../controller/WarehouseType_Controller");
const compartmentController = require("../controller/Compartment_Controller");
const stackController = require("../controller/Stack_Controller");
const brandController = require("../controller/Brand_Controller");
const materialController = require("../controller/Material_Controller");
const uomController = require("../controller/UOM_Controller");
const lineController = require("../controller/Line_Controller");
const productTypeController = require("../controller/ProductType_Controller");
const productConsumeController = require("../controller/ProductConsume_Controller");
const packagingTypeController = require("../controller/PackagingType_Controller");
const slocController = require("../controller/Sloc_Controller");
const palletTypeController = require("../controller/PalletType_Controller");
const storageTypeController = require("../controller/StorageType_Controller");
const binController = require("../controller/Bin_Controller");
const roleController = require("../controller/Role_Controller");
const employeeController = require("../controller/Employee_Controller");
const vendorController = require("../controller/Vendor_Controller");
const customerTypeController = require("../controller/CustomerType_Controller");
const customerController = require("../controller/Customer_Controller");
const gateController = require("../controller/Gate_Controller");
const gateTypeController = require("../controller/GateType_Controller");
const vehicleTypeController = require("../controller/VehicleType_Controller");
const productController = require("../controller/Product_Controller"); // <-- NEW IMPORT
const categoryController = require("../controller/Category_Controller");
const carrierController = require("../controller/Carrier_Controller");
const lookupController = require("../controller/Lookup_Controller");

// --- PRODUCT Module Routes ---
router.route("/product/addProduct").post(productController.addProduct);
router.route("/product/getProduct").post(productController.getProduct);
router.route("/product/getAllProducts").post(productController.getAllProducts);
router.route("/product/updateProduct").post(productController.updateProduct);
router.route("/product/deleteProduct").post(productController.deleteProduct);
router.post("/product/getProductsLite", productController.getProductsLite); // <-- NEW LITE ROUTE

const laborProviderController = require("../controller/LaborProvider_Controller");
const skillController = require("../controller/Skill_Controller");
// --- Labor Provider Routes ---
router
  .route("/labor-provider/add")
  .post(laborProviderController.addLaborProvider);
router
  .route("/labor-provider/get")
  .post(laborProviderController.getLaborProvider);
router
  .route("/labor-provider/getAll")
  .post(laborProviderController.getAllLaborProviders);
router
  .route("/labor-provider/update")
  .post(laborProviderController.updateLaborProvider);
router
  .route("/labor-provider/delete")
  .post(laborProviderController.deleteLaborProvider);
router
  .route("/labor-provider/getLite")
  .post(laborProviderController.getLaborProvidersLite);

// --- Skill Routes ---
router.route("/skill/add").post(skillController.addSkill);
router.route("/skill/get").post(skillController.getSkill);
router.route("/skill/getAll").post(skillController.getAllSkills);
router.route("/skill/update").post(skillController.updateSkill);
router.route("/skill/delete").post(skillController.deleteSkill);
router.route("/skill/getLite").post(skillController.getSkillsLite);
// --- BIN Module Routes ---
router.route("/bin/addBin").post(binController.addBin);
router.route("/bin/getBin").post(binController.getBin);
router.route("/bin/getAllBins").post(binController.getAllBins);
router.route("/bin/updateBin").post(binController.updateBin);
router.route("/bin/deleteBin").post(binController.deleteBin);
router.post("/bin/getBinsLite", binController.getBinsLite);

// --- VENDOR Module Routes ---
router.route("/vendor/addVendor").post(vendorController.addVendor);
router.route("/vendor/getVendor").post(vendorController.getVendor);
router.route("/vendor/getAllVendors").post(vendorController.getAllVendors);
router.route("/vendor/updateVendor").post(vendorController.updateVendor);
router.route("/vendor/deleteVendor").post(vendorController.deleteVendor);
router.post("/vendor/getVendorsLite", vendorController.getVendorsLite);

// --- CUSTOMER TYPE Module Routes ---
router
  .route("/customer-type/addCustomerType")
  .post(customerTypeController.addCustomerType);
router
  .route("/customer-type/getCustomerType")
  .post(customerTypeController.getCustomerType);
router
  .route("/customer-type/getAllCustomerTypes")
  .post(customerTypeController.getAllCustomerTypes);
router
  .route("/customer-type/updateCustomerType")
  .post(customerTypeController.updateCustomerType);
router
  .route("/customer-type/deleteCustomerType")
  .post(customerTypeController.deleteCustomerType);
router.post(
  "/customer-type/getCustomerTypesLite",
  customerTypeController.getCustomerTypesLite,
);

// --- Role Module Routes ---
router.route("/role/getAllRoles").post(roleController.getAllRoles);

// --- Master Data Routes ---

// --- CUSTOMER Module Routes ---
router.route("/customer/addCustomer").post(customerController.addCustomer);
router.route("/customer/getCustomer").post(customerController.getCustomer);
router
  .route("/customer/getAllCustomers")
  .post(customerController.getAllCustomers);
router
  .route("/customer/updateCustomer")
  .post(customerController.updateCustomer);
router
  .route("/customer/deleteCustomer")
  .post(customerController.deleteCustomer);
router.post("/customer/getCustomersLite", customerController.getCustomersLite);

// Country Module
router.route("/country/addCountry").post(countryController.addCountry);
router.route("/country/getCountry").post(countryController.getCountry);
router
  .route("/country/getAllCountries")
  .post(countryController.getAllCountries);
router.route("/country/updateCountry").post(countryController.updateCountry);
router.route("/country/deleteCountry").post(countryController.deleteCountry);

// --- SLOC Module Routes ---
router.route("/sloc/addSloc").post(slocController.addSloc);
router.route("/sloc/getSloc").post(slocController.getSloc);
router.route("/sloc/getAllSlocs").post(slocController.getAllSlocs);
router.route("/sloc/updateSloc").post(slocController.updateSloc);
router.route("/sloc/deleteSloc").post(slocController.deleteSloc);

// --- Storage Type Module Routes ---
router
  .route("/storage-type/addStorageType")
  .post(storageTypeController.addStorageType);
router
  .route("/storage-type/getStorageType")
  .post(storageTypeController.getStorageType);
router
  .route("/storage-type/getAllStorageTypes")
  .post(storageTypeController.getAllStorageTypes);
router
  .route("/storage-type/updateStorageType")
  .post(storageTypeController.updateStorageType);
router
  .route("/storage-type/deleteStorageType")
  .post(storageTypeController.deleteStorageType);

// State Module
router.route("/state/addState").post(stateController.addState);
router.route("/state/getState").post(stateController.getState);
router.route("/state/getAllStates").post(stateController.getAllStates);
router.route("/state/updateState").post(stateController.updateState);
router.route("/state/deleteState").post(stateController.deleteState);

// City Module
router.route("/city/addCity").post(cityController.addCity);
router.route("/city/getCity").post(cityController.getCity);
router.route("/city/getAllCities").post(cityController.getAllCities);
router.route("/city/updateCity").post(cityController.updateCity);
router.route("/city/deleteCity").post(cityController.deleteCity);

// --- Product Consume Module Routes ---
router
  .route("/product-consume/addProductConsume")
  .post(productConsumeController.addProductConsume);
router
  .route("/product-consume/getProductConsume")
  .post(productConsumeController.getProductConsume);
router
  .route("/product-consume/getAllProductConsumes")
  .post(productConsumeController.getAllProductConsumes);
router
  .route("/product-consume/updateProductConsume")
  .post(productConsumeController.updateProductConsume);
router
  .route("/product-consume/deleteProductConsume")
  .post(productConsumeController.deleteProductConsume);

// --- Pallet Type Module Routes ---
router
  .route("/pallet-type/addPalletType")
  .post(palletTypeController.addPalletType);
router
  .route("/pallet-type/getPalletType")
  .post(palletTypeController.getPalletType);
router
  .route("/pallet-type/getAllPalletTypes")
  .post(palletTypeController.getAllPalletTypes);
router
  .route("/pallet-type/updatePalletType")
  .post(palletTypeController.updatePalletType);
router
  .route("/pallet-type/deletePalletType")
  .post(palletTypeController.deletePalletType);

// Zone Module
router.route("/zone/addZone").post(zoneController.addZone);
router.route("/zone/getZone").post(zoneController.getZone);
router.route("/zone/getAllZones").post(zoneController.getAllZones);
router.route("/zone/updateZone").post(zoneController.updateZone);
router.route("/zone/deleteZone").post(zoneController.deleteZone);

// Section Module
router.route("/section/addSection").post(sectionController.addSection);
router.route("/section/getSection").post(sectionController.getSection);
router.route("/section/getAllSections").post(sectionController.getAllSections);
router.route("/section/updateSection").post(sectionController.updateSection);
router.route("/section/deleteSection").post(sectionController.deleteSection);

// Branch Module
router.route("/branch/addBranch").post(branchController.addBranch);
router.route("/branch/getBranch").post(branchController.getBranch);
router.route("/branch/getAllBranches").post(branchController.getAllBranches);
router.route("/branch/updateBranch").post(branchController.updateBranch);
router.route("/branch/deleteBranch").post(branchController.deleteBranch);

// Warehouse Module
router.post("/warehouse/addWarehouse", warehouseController.addWarehouse);
router.post("/warehouse/getWarehouse", warehouseController.getWarehouse);
router.post(
  "/warehouse/getAllWarehouses",
  warehouseController.getAllWarehouses,
);
router.post("/warehouse/updateWarehouse", warehouseController.updateWarehouse);
router.post("/warehouse/deleteWarehouse", warehouseController.deleteWarehouse);

// Compartment Module
router
  .route("/compartment/addCompartment")
  .post(compartmentController.addCompartment);
router
  .route("/compartment/getCompartment")
  .post(compartmentController.getCompartment);
router
  .route("/compartment/getAllCompartments")
  .post(compartmentController.getAllCompartments);
router
  .route("/compartment/updateCompartment")
  .post(compartmentController.updateCompartment);
router
  .route("/compartment/deleteCompartment")
  .post(compartmentController.deleteCompartment);

// Stack Module
router.route("/stack/addStack").post(stackController.addStack);
router.route("/stack/getStack").post(stackController.getStack);
router.route("/stack/getAllStacks").post(stackController.getAllStacks);
router.route("/stack/updateStack").post(stackController.updateStack);
router.route("/stack/deleteStack").post(stackController.deleteStack);

// Brand Module
router.route("/brand/addBrand").post(brandController.addBrand);
router.route("/brand/getBrand").post(brandController.getBrand);
router.route("/brand/getAllBrands").post(brandController.getAllBrands);
router.route("/brand/updateBrand").post(brandController.updateBrand);
router.route("/brand/deleteBrand").post(brandController.deleteBrand);

// Material Module
router.route("/material/addMaterial").post(materialController.addMaterial);
router.route("/material/getMaterial").post(materialController.getMaterial);
router.route("/material/getAllMaterials").post(materialController.getAllMaterials);
router.route("/material/getMaterialsLite").post(materialController.getMaterialsLite);
router.route("/material/updateMaterial").post(materialController.updateMaterial);
router.route("/material/deleteMaterial").post(materialController.deleteMaterial);

// Gate Module
router.route("/gate/addGate").post(gateController.addGate);
router.route("/gate/getGate").post(gateController.getGate);
router.route("/gate/getAllGates").post(gateController.getAllGates);
router.route("/gate/updateGate").post(gateController.updateGate);
router.route("/gate/deleteGate").post(gateController.deleteGate);

// Product Type Module
router
  .route("/product-type/addProductType")
  .post(productTypeController.addProductType);
router
  .route("/product-type/getProductType")
  .post(productTypeController.getProductType);
router
  .route("/product-type/getAllProductTypes")
  .post(productTypeController.getAllProductTypes);
router
  .route("/product-type/updateProductType")
  .post(productTypeController.updateProductType);
router
  .route("/product-type/deleteProductType")
  .post(productTypeController.deleteProductType);
router
  .route("/product-type/getParentProductTypes")
  .get(productTypeController.getParentProductTypes);

// UOM Module
router.route("/uom/addUOM").post(uomController.addUOM);
router.route("/uom/getUOM").post(uomController.getUOM);
router.route("/uom/getAllUOMs").post(uomController.getAllUOMs);
router.route("/uom/updateUOM").post(uomController.updateUOM);
router.route("/uom/deleteUOM").post(uomController.deleteUOM);

// Line Module
router.route("/line/addLine").post(lineController.addLine);
router.route("/line/getLine").post(lineController.getLine);
router.route("/line/getAllLines").post(lineController.getAllLines);
router.route("/line/updateLine").post(lineController.updateLine);
router.route("/line/deleteLine").post(lineController.deleteLine);
router.route("/line/getLineTypes").get(lineController.getLineTypes);

// --- Packaging Type Module Routes ---
router
  .route("/packaging-type/addPackagingType")
  .post(packagingTypeController.addPackagingType);
router
  .route("/packaging-type/getPackagingType")
  .post(packagingTypeController.getPackagingType);
router
  .route("/packaging-type/getAllPackagingTypes")
  .post(packagingTypeController.getAllPackagingTypes);
router
  .route("/packaging-type/updatePackagingType")
  .post(packagingTypeController.updatePackagingType);
router
  .route("/packaging-type/deletePackagingType")
  .post(packagingTypeController.deletePackagingType);

// --- Lite List Routes (for dropdowns) ---
router.post("/country/getCountriesLite", countryController.getCountriesLite);
router.post("/state/getStatesLite", stateController.getStatesLite);
router.post("/city/getCitiesLite", cityController.getCitiesLite);
router.post("/section/getSectionsLite", sectionController.getSectionsLite);
router.post("/category/getCategories", categoryController.getCategories);
router.post(
  "/category/getCategoriesLite",
  categoryController.getCategoriesLite,
);
router.post("/zone/getZonesLite", zoneController.getZonesLite);
router.post("/branch/getBranchesLite", branchController.getBranchesLite);
router.post(
  "/warehouse/getWarehousesLite",
  warehouseController.getWarehousesLite,
);
router.post(
  "/compartment/getCompartmentsLite",
  compartmentController.getCompartmentsLite,
);
router.post("/stack/getStacksLite", stackController.getStacksLite);
router.post("/brand/getBrandsLite", brandController.getBrandsLite);
router.post("/uom/getUOMsLite", uomController.getUOMsLite);
router.post("/line/getLinesLite", lineController.getLinesLite);
router.post(
  "/warehouse-types/getAllWarehouseTypes",
  warehouseTypeController.getAllWarehouseTypes,
);
router.post(
  "/product-type/getProductTypesLite",
  productTypeController.getProductTypesLite,
);
router.post(
  "/product-consume/getProductConsumesLite",
  productConsumeController.getProductConsumesLite,
);

// --- Vehicle Type Module Routes ---
router
  .route("/vehicle-type/addVehicleType")
  .post(vehicleTypeController.addVehicleType);
router
  .route("/vehicle-type/getVehicleType")
  .post(vehicleTypeController.getVehicleType);
router
  .route("/vehicle-type/getAllVehicleTypes")
  .post(vehicleTypeController.getAllVehicleTypes);
router
  .route("/vehicle-type/updateVehicleType")
  .post(vehicleTypeController.updateVehicleType);
router
  .route("/vehicle-type/deleteVehicleType")
  .post(vehicleTypeController.deleteVehicleType);
router.post(
  "/packaging-type/getPackagingTypesLite",
  packagingTypeController.getPackagingTypesLite,
);
router.post("/sloc/getSlocsLite", slocController.getSlocsLite);
router.post(
  "/pallet-type/getPalletTypesLite",
  palletTypeController.getPalletTypesLite,
);
router.post(
  "/storage-type/getStorageTypesLite",
  storageTypeController.getStorageTypesLite,
);
router.post(
  "/vehicle-type/getVehicleTypesLite",
  vehicleTypeController.getVehicleTypesLite,
);

router.post("/gate-type/getGateTypesLite", gateTypeController.getGateTypesLite);

// --- Carrier Module Routes ---
router.route("/carrier/addCarrier").post(carrierController.addCarrier);
router.route("/carrier/getCarrier").post(carrierController.getCarrier);
router.route("/carrier/getAllCarriers").post(carrierController.getAllCarriers);
router.route("/carrier/updateCarrier").post(carrierController.updateCarrier);
router.route("/carrier/deleteCarrier").post(carrierController.deleteCarrier);
router.post("/carrier/getCarriersLite", carrierController.getCarriersLite);

// --- Lookup Routes (PackingRequirements, CarrierPreferences) ---
router.post("/lookup/getPackingRequirements", lookupController.getPackingRequirements);
router.post("/lookup/getCarrierPreferences", lookupController.getCarrierPreferences);

// --- Employee Module Routes ---
router.route("/employee/addEmployee").post(employeeController.addEmployee);
router.route("/employee/getEmployee").post(employeeController.getEmployee);
router
  .route("/employee/getAllEmployees")
  .post(employeeController.getAllEmployees);
router
  .route("/employee/updateEmployee")
  .post(employeeController.updateEmployee);
router
  .route("/employee/deleteEmployee")
  .post(employeeController.deleteEmployee);
router.post("/employee/getEmployeesLite", employeeController.getEmployeesLite); // <-- NEW LITE ROUTE

module.exports = router;
