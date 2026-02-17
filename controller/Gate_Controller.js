const gateService = require("../service/Gate_Service");

async function addGate(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await gateService.addGate(pool, values);
    return res
      .status(201)
      .json({ message: "Gate added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getGate(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { GateID } = req?.body;
  try {
    const result = await gateService.getGate(pool, GateID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllGates(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await gateService.getAllGates(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateGate(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await gateService.updateGate(pool, values);
    return res
      .status(200)
      .json({ message: "Gate updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteGate(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await gateService.deleteGate(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getGatesLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await gateService.getGatesLite(pool);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addGate,
  getGate,
  getAllGates,
  updateGate,
  deleteGate,
  getGatesLite,
};
