const customerService = require("../service/Customer_Service");

async function addCustomer(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = { ...req?.body, user_id: req.user.UserID }; // Include user_id from token
  try {
    const result = await customerService.addCustomer(pool, values);
    return res
      .status(201)
      .json({ message: "Customer added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getCustomer(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { CustomerID } = req?.body;
  try {
    const result = await customerService.getCustomer(pool, CustomerID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllCustomers(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await customerService.getAllCustomers(pool, values);
    return res.status(200).json(result); // Sends { data: [...], pagination: {...} }
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getCustomersLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await customerService.getCustomersLite(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateCustomer(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = { ...req?.body, user_id: req.user.UserID }; // Include user_id from token
  try {
    const result = await customerService.updateCustomer(pool, values);
    return res
      .status(200)
      .json({ message: "Customer updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteCustomer(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = { ...req?.body, user_id: req.user.UserID }; // Include user_id from token
  try {
    const result = await customerService.deleteCustomer(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addCustomer,
  getCustomer,
  getAllCustomers,
  updateCustomer,
  deleteCustomer,
  getCustomersLite,
};
