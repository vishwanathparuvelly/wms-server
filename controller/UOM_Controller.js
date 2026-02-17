// controller/UOM_Controller.js

const uomService = require("../service/UOM_Service");

async function addUOM(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await uomService.addUOM(pool, values);
    return res
      .status(201)
      .json({ message: "UOM added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getUOM(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { UOMID } = req?.body;
  try {
    const result = await uomService.getUOM(pool, UOMID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllUOMs(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await uomService.getAllUOMs(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getUOMsLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await uomService.getUOMsLite(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateUOM(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await uomService.updateUOM(pool, values);
    return res
      .status(200)
      .json({ message: "UOM updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteUOM(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await uomService.deleteUOM(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addUOM,
  getUOM,
  getAllUOMs,
  updateUOM,
  deleteUOM,
  getUOMsLite,
};
