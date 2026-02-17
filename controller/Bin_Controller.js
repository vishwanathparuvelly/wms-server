// controller/Bin_Controller.js

const binService = require("../service/Bin_Service");

async function addBin(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await binService.addBin(pool, values);
    return res
      .status(201)
      .json({ message: "Bin added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getBin(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { BinID } = req?.body;
  try {
    const result = await binService.getBin(pool, BinID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllBins(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await binService.getAllBins(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getBinsLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await binService.getBinsLite(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateBin(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await binService.updateBin(pool, values);
    return res
      .status(200)
      .json({ message: "Bin updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteBin(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await binService.deleteBin(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addBin,
  getBin,
  getAllBins,
  updateBin,
  deleteBin,
  getBinsLite,
};
