const lineService = require("../service/Line_Service");

async function addLine(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await lineService.addLine(pool, values);
    return res
      .status(201)
      .json({ message: "Line added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getLine(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { LineID } = req?.body;
  try {
    const result = await lineService.getLine(pool, LineID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllLines(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await lineService.getAllLines(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getLinesLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await lineService.getLinesLite(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateLine(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await lineService.updateLine(pool, values);
    return res
      .status(200)
      .json({ message: "Line updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteLine(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await lineService.deleteLine(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getLineTypes(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await lineService.getLineTypes(pool);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addLine,
  getLine,
  getAllLines,
  updateLine,
  deleteLine,
  getLinesLite,
  getLineTypes,
};
