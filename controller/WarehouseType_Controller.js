const warehouseTypeService = require("../service/WarehouseType_Service");

async function getAllWarehouseTypes(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await warehouseTypeService.getAllWarehouseTypes(pool);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = { getAllWarehouseTypes };
