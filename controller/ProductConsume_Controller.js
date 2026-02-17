const productConsumeService = require("../service/ProductConsume_Service");

async function addProductConsume(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await productConsumeService.addProductConsume(pool, values);
    return res
      .status(201)
      .json({ message: "Product Consume added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getProductConsume(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { ProductConsumeID } = req?.body;
  try {
    const result = await productConsumeService.getProductConsume(
      pool,
      ProductConsumeID
    );
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllProductConsumes(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await productConsumeService.getAllProductConsumes(
      pool,
      values
    );
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateProductConsume(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await productConsumeService.updateProductConsume(
      pool,
      values
    );
    return res
      .status(200)
      .json({ message: "Product Consume updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteProductConsume(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await productConsumeService.deleteProductConsume(
      pool,
      values
    );
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getProductConsumesLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await productConsumeService.getProductConsumesLite(pool);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addProductConsume,
  getProductConsume,
  getAllProductConsumes,
  updateProductConsume,
  deleteProductConsume,
  getProductConsumesLite,
};
