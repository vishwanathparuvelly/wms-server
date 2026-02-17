const zoneService = require("../service/Zone_Service");

async function addZone(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await zoneService.addZone(pool, values);
    return res
      .status(201)
      .json({ message: "Zone added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getZone(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { ZoneID } = req?.body;
  try {
    const result = await zoneService.getZone(pool, ZoneID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllZones(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await zoneService.getAllZones(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}
async function getZonesLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await zoneService.getZonesLite(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateZone(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await zoneService.updateZone(pool, values);
    return res
      .status(200)
      .json({ message: "Zone updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteZone(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await zoneService.deleteZone(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addZone,
  getZone,
  getZonesLite,
  getAllZones,
  updateZone,
  deleteZone,
};
