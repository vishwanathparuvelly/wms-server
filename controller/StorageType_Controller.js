const storageTypeService = require("../service/StorageType_Service");

async function addStorageType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await storageTypeService.addStorageType(pool, values);
    return res
      .status(201)
      .json({ message: "Storage Type added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getStorageType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { StorageTypeID } = req?.body;
  try {
    const result = await storageTypeService.getStorageType(pool, StorageTypeID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllStorageTypes(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await storageTypeService.getAllStorageTypes(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateStorageType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await storageTypeService.updateStorageType(pool, values);
    return res
      .status(200)
      .json({ message: "Storage Type updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteStorageType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await storageTypeService.deleteStorageType(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getStorageTypesLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await storageTypeService.getStorageTypesLite(pool);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addStorageType,
  getStorageType,
  getAllStorageTypes,
  updateStorageType,
  deleteStorageType,
  getStorageTypesLite,
};
