const carrierService = require("../service/Carrier_Service");

async function addCarrier(req, res) {
  try {
    const pool = req.app.locals.dbPool;
    const carrierData = {
      CarrierName: req.body.CarrierName,
      CarrierCode: req.body.CarrierCode,
      CreatedBy: req.body.loggedInUserID || req.body.user_id,
      UpdatedBy: req.body.loggedInUserID || req.body.user_id,
    };

    const carrier = await carrierService.addCarrier(pool, carrierData);
    res.status(201).json({ success: true, data: carrier });
  } catch (error) {
    console.error("Add carrier error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getCarrier(req, res) {
  try {
    const pool = req.app.locals.dbPool;
    const { CarrierID } = req.body;

    const carrier = await carrierService.getCarrier(pool, CarrierID);
    if (!carrier) {
      return res.status(404).json({ success: false, error: "Carrier not found" });
    }
    res.json({ success: true, data: carrier });
  } catch (error) {
    console.error("Get carrier error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getAllCarriers(req, res) {
  try {
    const pool = req.app.locals.dbPool;
    const carriers = await carrierService.getAllCarriers(pool);
    res.json({ success: true, data: carriers });
  } catch (error) {
    console.error("Get all carriers error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getCarriersLite(req, res) {
  try {
    const pool = req.app.locals.dbPool;
    const carriers = await carrierService.getCarriersLite(pool);
    res.json({ success: true, data: carriers });
  } catch (error) {
    console.error("Get carriers lite error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function updateCarrier(req, res) {
  try {
    const pool = req.app.locals.dbPool;
    const carrierData = {
      CarrierID: req.body.CarrierID,
      CarrierName: req.body.CarrierName,
      CarrierCode: req.body.CarrierCode,
      IsActive: req.body.IsActive,
      UpdatedBy: req.body.loggedInUserID || req.body.user_id,
    };

    const carrier = await carrierService.updateCarrier(pool, carrierData);
    if (!carrier) {
      return res.status(404).json({ success: false, error: "Carrier not found" });
    }
    res.json({ success: true, data: carrier });
  } catch (error) {
    console.error("Update carrier error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function deleteCarrier(req, res) {
  try {
    const pool = req.app.locals.dbPool;
    const { CarrierID, loggedInUserID, user_id } = req.body;

    const result = await carrierService.deleteCarrier(pool, CarrierID, loggedInUserID || user_id);
    res.json(result);
  } catch (error) {
    console.error("Delete carrier error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  addCarrier,
  getCarrier,
  getAllCarriers,
  getCarriersLite,
  updateCarrier,
  deleteCarrier,
};
