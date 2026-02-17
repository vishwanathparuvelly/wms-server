// controller/ProductType_Controller.js

const productTypeService = require("../service/ProductType_Service");

async function addProductType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await productTypeService.addProductType(pool, values);
    return res
      .status(201)
      .json({ message: "Product Type added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getProductType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { ProductTypeID } = req?.body;
  try {
    const result = await productTypeService.getProductType(pool, ProductTypeID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllProductTypes(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await productTypeService.getAllProductTypes(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateProductType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await productTypeService.updateProductType(pool, values);
    return res
      .status(200)
      .json({ message: "Product Type updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteProductType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await productTypeService.deleteProductType(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getParentProductTypes(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await productTypeService.getParentProductTypes(pool);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}
async function getProductTypesLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await productTypeService.getProductTypesLite(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addProductType,
  getProductType,
  getAllProductTypes,
  updateProductType,
  deleteProductType,
  getParentProductTypes,
  getProductTypesLite,
};
