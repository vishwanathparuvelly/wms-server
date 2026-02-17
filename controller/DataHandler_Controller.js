// controller/DataHandler_Controller.js

const multer = require("multer");
const { getModuleConfig } = require("../config/importExportConfig");
const dataHandlerService = require("../service/DataHandler_Service");
const { CustomError } = require("../model/CustomError");

// --- Central Service Registry ---
// This is the critical change. All services are now loaded here, in one place.
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
  bin: require("../service/Bin_Service"),
  vendor: require("../service/Vendor_Service"),
  customerType: require("../service/CustomerType_Service"),
  product: require("../service/Product_Service"),
  material: require("../service/Material_Service"),
};

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

async function handleExport(req, res) {
  const { module } = req.params;
  const pool = req?.app?.locals?.dbPool;
  try {
    const config = getModuleConfig(module);
    console.log(`[Export] Module: ${module}, ServiceKey: ${config.serviceKey}, FetchFunction: ${config.fetchFunctionName}`);
    console.log(`[Export] Config has columns: ${!!config.columns}, Column count: ${config.columns?.length}`);

    const service = services[config.serviceKey];
    if (!service || typeof service[config.fetchFunctionName] !== "function") {
      throw new CustomError(
        `Configuration error: The function '${config.fetchFunctionName}' was not found for '${config.moduleName}'.`,
      );
    }

    const result = await service[config.fetchFunctionName](pool, req.body);
    console.log(`[Export] Data fetched, type: ${typeof result}, isArray: ${Array.isArray(result)}, length: ${result?.length}`);
    
    // Handle both response formats: direct array or { data: [...] }
    const dataArray = Array.isArray(result) ? result : result.data;
    console.log(`[Export] Data array extracted, isArray: ${Array.isArray(dataArray)}, length: ${dataArray?.length}`);
    
    const csvData = await dataHandlerService.exportToCsv(config, dataArray);

    res.header("Content-Type", "text/csv");
    res.attachment(`${module}-export.csv`);
    res.send(csvData);
  } catch (e) {
    console.error(`Export Error for [${module}]:`, e.message);
    return res
      .status(400)
      .json({ error: `Export Error for [${module}]: ${e.message}` });
  }
}

async function handleImport(req, res) {
  const { module } = req.params;
  const pool = req?.app?.locals?.dbPool;
  const user_id = req.body.user_id;

  try {
    if (!req.file) throw new CustomError("No file uploaded.");

    const config = getModuleConfig(module);

    config.service = services[config.serviceKey];
    if (!config.service)
      throw new CustomError(`Service not found for module: ${module}`);

    const results = await dataHandlerService.importFromCsv(
      config,
      req.file.buffer,
      pool,
      user_id,
      req.file.originalname,
    );
    res.status(200).json(results);
  } catch (e) {
    console.error(`Import Error for [${module}]:`, e.message);
    return res
      .status(400)
      .json({ error: `Import Error for [${module}]: ${e.message}` });
  }
}

async function handleSampleDownload(req, res) {
  const { module } = req.params;
  try {
    const config = getModuleConfig(module);
    const sampleCsv = await dataHandlerService.generateSampleCsv(config);

    res.header("Content-Type", "text/csv");
    res.attachment(`${module}-sample.csv`);
    res.send(sampleCsv);
  } catch (e) {
    console.error(`Sample Download Error for [${module}]:`, e.message);
    return res
      .status(400)
      .json({ error: `Sample Download Error for [${module}]: ${e.message}` });
  }
}

module.exports = {
  handleExport,
  handleImport,
  handleSampleDownload,
  upload,
};
