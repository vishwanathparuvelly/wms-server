const skillService = require("../service/Skill_Service");

async function addSkill(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await skillService.addSkill(pool, req.body);
    return res
      .status(201)
      .json({ message: "Skill added successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getSkill(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await skillService.getSkill(pool, req.body.SkillID);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getAllSkills(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await skillService.getAllSkills(pool, req.body);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getSkillsLite(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await skillService.getSkillsLite(pool);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateSkill(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await skillService.updateSkill(pool, req.body);
    return res
      .status(200)
      .json({ message: "Skill updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteSkill(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await skillService.deleteSkill(pool, req.body);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports = {
  addSkill,
  getSkill,
  getAllSkills,
  updateSkill,
  deleteSkill,
  getSkillsLite,
};
