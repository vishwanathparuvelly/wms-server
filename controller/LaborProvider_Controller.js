const laborProviderService = require("../service/LaborProvider_Service");

async function addLaborProvider(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await laborProviderService.addLaborProvider(pool, req.body);
    return res
      .status(201)
      .json({ message: "Labor Provider added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getLaborProvider(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await laborProviderService.getLaborProvider(
      pool,
      req.body.ProviderID
    );
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllLaborProviders(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await laborProviderService.getAllLaborProviders(
      pool,
      req.body
    );
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getLaborProvidersLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await laborProviderService.getLaborProvidersLite(pool);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateLaborProvider(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await laborProviderService.updateLaborProvider(
      pool,
      req.body
    );
    return res
      .status(200)
      .json({ message: "Labor Provider updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteLaborProvider(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await laborProviderService.deleteLaborProvider(
      pool,
      req.body
    );
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addLaborProvider,
  getLaborProvider,
  getAllLaborProviders,
  updateLaborProvider,
  deleteLaborProvider,
  getLaborProvidersLite,
};
