// controller/Vendor_Controller.js

const vendorService = require("../service/Vendor_Service");

async function addVendor(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await vendorService.addVendor(pool, values);
    return res
      .status(201)
      .json({ message: "Vendor added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getVendor(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { VendorID } = req?.body;
  try {
    const result = await vendorService.getVendor(pool, VendorID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllVendors(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await vendorService.getAllVendors(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getVendorsLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await vendorService.getVendorsLite(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateVendor(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await vendorService.updateVendor(pool, values);
    return res
      .status(200)
      .json({ message: "Vendor updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteVendor(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await vendorService.deleteVendor(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addVendor,
  getVendor,
  getAllVendors,
  updateVendor,
  deleteVendor,
  getVendorsLite,
};
