// controller/Compartment_Controller.js

const compartmentService = require("../service/Compartment_Service");

async function addCompartment(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await compartmentService.addCompartment(pool, values);
    return res
      .status(201)
      .json({ message: "Compartment added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getCompartment(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { CompartmentID } = req?.body;
  try {
    const result = await compartmentService.getCompartment(pool, CompartmentID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllCompartments(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await compartmentService.getAllCompartments(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}
async function getCompartmentsLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await compartmentService.getCompartmentsLite(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateCompartment(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await compartmentService.updateCompartment(pool, values);
    return res
      .status(200)
      .json({ message: "Compartment updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteCompartment(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await compartmentService.deleteCompartment(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addCompartment,
  getCompartment,
  getAllCompartments,
  updateCompartment,
  deleteCompartment,
  getCompartmentsLite,
};
