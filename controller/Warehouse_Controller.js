const warehouseService = require("../service/Warehouse_Service");

async function addWarehouse(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await warehouseService.addWarehouse(pool, values);
    return res
      .status(201)
      .json({ message: "Warehouse added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getWarehouse(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { WarehouseID } = req?.body;
  try {
    const result = await warehouseService.getWarehouse(pool, WarehouseID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllWarehouses(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await warehouseService.getAllWarehouses(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}
async function getWarehousesLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await warehouseService.getWarehousesLite(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateWarehouse(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await warehouseService.updateWarehouse(pool, values);
    return res
      .status(200)
      .json({ message: "Warehouse updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteWarehouse(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await warehouseService.deleteWarehouse(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addWarehouse,
  getWarehouse,
  getAllWarehouses,
  updateWarehouse,
  deleteWarehouse,
  getWarehousesLite,
};
