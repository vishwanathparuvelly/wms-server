const branchService = require("../service/Branch_Service");

async function addBranch(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await branchService.addBranch(pool, values);
    return res
      .status(201)
      .json({ message: "Branch added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getBranch(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const { BranchID } = req?.body;
  try {
    const result = await branchService.getBranch(pool, BranchID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllBranches(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await branchService.getAllBranches(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}
async function getBranchesLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await branchService.getBranchesLite(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateBranch(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await branchService.updateBranch(pool, values);
    return res
      .status(200)
      .json({ message: "Branch updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteBranch(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body;
  try {
    const result = await branchService.deleteBranch(pool, values);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addBranch,
  getBranch,
  getAllBranches,
  updateBranch,
  deleteBranch,
  getBranchesLite,
};
