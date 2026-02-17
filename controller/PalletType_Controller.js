const palletTypeService = require("../service/PalletType_Service");

async function addPalletType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await palletTypeService.addPalletType(pool, values);
    return res
      .status(201)
      .json({ message: "Pallet Type added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getPalletType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { PalletTypeID } = req?.body;
  try {
    const result = await palletTypeService.getPalletType(pool, PalletTypeID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllPalletTypes(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await palletTypeService.getAllPalletTypes(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updatePalletType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await palletTypeService.updatePalletType(pool, values);
    return res
      .status(200)
      .json({ message: "Pallet Type updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deletePalletType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await palletTypeService.deletePalletType(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getPalletTypesLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await palletTypeService.getPalletTypesLite(pool);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addPalletType,
  getPalletType,
  getAllPalletTypes,
  updatePalletType,
  deletePalletType,
  getPalletTypesLite,
};
