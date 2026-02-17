const roleService = require("../service/Role_Service");

async function getAllRoles(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await roleService.getAllRoles(pool);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  getAllRoles,
};
