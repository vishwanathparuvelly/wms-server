// controller/CustomerType_Controller.js

const customerTypeService = require("../service/CustomerType_Service");

async function addCustomerType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await customerTypeService.addCustomerType(pool, values);
    return res
      .status(201)
      .json({ message: "Customer Type added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getCustomerType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { CustomerTypeID } = req?.body;
  try {
    const result = await customerTypeService.getCustomerType(
      pool,
      CustomerTypeID
    );
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllCustomerTypes(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await customerTypeService.getAllCustomerTypes(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getCustomerTypesLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await customerTypeService.getCustomerTypesLite(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateCustomerType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await customerTypeService.updateCustomerType(pool, values);
    return res
      .status(200)
      .json({ message: "Customer Type updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteCustomerType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await customerTypeService.deleteCustomerType(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addCustomerType,
  getCustomerType,
  getAllCustomerTypes,
  updateCustomerType,
  deleteCustomerType,
  getCustomerTypesLite,
};
