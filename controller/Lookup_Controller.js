const lookupService = require("../service/Lookup_Service");

async function getPackingRequirements(req, res) {
  try {
    const pool = req.app.locals.dbPool;
    const data = await lookupService.getPackingRequirements(pool);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Get packing requirements error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getCarrierPreferences(req, res) {
  try {
    const pool = req.app.locals.dbPool;
    const data = await lookupService.getCarrierPreferences(pool);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Get carrier preferences error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getPackingRequirements,
  getCarrierPreferences,
};
