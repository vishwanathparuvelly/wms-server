const packagingTypeService = require("../service/PackagingType_Service");

async function addPackagingType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await packagingTypeService.addPackagingType(pool, values);
    return res
      .status(201)
      .json({ message: "Packaging Type added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getPackagingType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { PackagingTypeID } = req?.body;
  try {
    const result = await packagingTypeService.getPackagingType(
      pool,
      PackagingTypeID
    );
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllPackagingTypes(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await packagingTypeService.getAllPackagingTypes(
      pool,
      values
    );
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updatePackagingType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await packagingTypeService.updatePackagingType(pool, values);
    return res
      .status(200)
      .json({ message: "Packaging Type updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deletePackagingType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await packagingTypeService.deletePackagingType(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getPackagingTypesLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await packagingTypeService.getPackagingTypesLite(pool);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addPackagingType,
  getPackagingType,
  getAllPackagingTypes,
  updatePackagingType,
  deletePackagingType,
  getPackagingTypesLite,
};
