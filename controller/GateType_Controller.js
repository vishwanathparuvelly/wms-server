const gateTypeService = require("../service/GateType_Service");

async function getGateTypesLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await gateTypeService.getGateTypesLite(pool);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  getGateTypesLite,
};
