// controller/Material_Controller.js

const materialService = require("../service/Material_Service");

async function addMaterial(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await materialService.addMaterial(pool, values);
    return res
      .status(201)
      .json({ message: "Material added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getMaterial(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { MaterialID } = req?.body;
  try {
    const result = await materialService.getMaterial(pool, MaterialID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllMaterials(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await materialService.getAllMaterials(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getMaterialsLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await materialService.getMaterialsLite(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateMaterial(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await materialService.updateMaterial(pool, values);
    return res
      .status(200)
      .json({ message: "Material updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteMaterial(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await materialService.deleteMaterial(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addMaterial,
  getMaterial,
  getAllMaterials,
  updateMaterial,
  deleteMaterial,
  getMaterialsLite,
};
