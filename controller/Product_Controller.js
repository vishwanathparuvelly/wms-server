// controller/Product_Controller.js

const productService = require("../service/Product_Service");

async function addProduct(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await productService.addProduct(pool, values);
    return res
      .status(201)
      .json({ message: "Product added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getProduct(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { ProductID } = req?.body;
  try {
    const result = await productService.getProduct(pool, ProductID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllProducts(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await productService.getAllProducts(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getProductsLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await productService.getProductsLite(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateProduct(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await productService.updateProduct(pool, values);
    return res
      .status(200)
      .json({ message: "Product updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteProduct(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await productService.deleteProduct(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addProduct,
  getProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  getProductsLite,
};
