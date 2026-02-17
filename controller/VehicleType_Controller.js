const vehicleTypeService = require("../service/VehicleType_Service");

async function addVehicleType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await vehicleTypeService.addVehicleType(pool, values);
    return res
      .status(201)
      .json({ message: "Vehicle Type added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getVehicleType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { VehicleTypeID } = req?.body;
  try {
    const result = await vehicleTypeService.getVehicleType(pool, VehicleTypeID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllVehicleTypes(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await vehicleTypeService.getAllVehicleTypes(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateVehicleType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await vehicleTypeService.updateVehicleType(pool, values);
    return res
      .status(200)
      .json({ message: "Vehicle Type updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteVehicleType(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await vehicleTypeService.deleteVehicleType(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getVehicleTypesLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await vehicleTypeService.getVehicleTypesLite(pool);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addVehicleType,
  getVehicleType,
  getAllVehicleTypes,
  updateVehicleType,
  deleteVehicleType,
  getVehicleTypesLite,
};
