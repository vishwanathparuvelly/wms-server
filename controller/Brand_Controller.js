// controller/Brand_Controller.js

const brandService = require("../service/Brand_Service");

async function addBrand(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await brandService.addBrand(pool, values);
    return res
      .status(201)
      .json({ message: "Brand added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getBrand(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { BrandID } = req?.body;
  try {
    const result = await brandService.getBrand(pool, BrandID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllBrands(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await brandService.getAllBrands(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getBrandsLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await brandService.getBrandsLite(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateBrand(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await brandService.updateBrand(pool, values);
    return res
      .status(200)
      .json({ message: "Brand updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteBrand(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await brandService.deleteBrand(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addBrand,
  getBrand,
  getAllBrands,
  updateBrand,
  deleteBrand,
  getBrandsLite,
};
