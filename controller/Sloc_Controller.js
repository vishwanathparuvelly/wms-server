const slocService = require("../service/Sloc_Service");

async function addSloc(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await slocService.addSloc(pool, values);
    return res
      .status(201)
      .json({ message: "SLOC added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getSloc(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { SlocID } = req?.body;
  try {
    const result = await slocService.getSloc(pool, SlocID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllSlocs(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await slocService.getAllSlocs(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateSloc(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await slocService.updateSloc(pool, values);
    return res
      .status(200)
      .json({ message: "SLOC updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteSloc(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await slocService.deleteSloc(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getSlocsLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await slocService.getSlocsLite(pool);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addSloc,
  getSloc,
  getAllSlocs,
  updateSloc,
  deleteSloc,
  getSlocsLite,
};
