// controller/Stack_Controller.js

const stackService = require("../service/Stack_Service");

async function addStack(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await stackService.addStack(pool, values);
    return res
      .status(201)
      .json({ message: "Stack added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getStack(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { StackID } = req?.body;
  try {
    const result = await stackService.getStack(pool, StackID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllStacks(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await stackService.getAllStacks(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getStacksLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await stackService.getStacksLite(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateStack(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await stackService.updateStack(pool, values);
    return res
      .status(200)
      .json({ message: "Stack updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteStack(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await stackService.deleteStack(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addStack,
  getStack,
  getAllStacks,
  updateStack,
  deleteStack,
  getStacksLite,
};
