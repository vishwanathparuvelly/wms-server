const stagingService = require("../service/Staging_Service");

async function getAllStagingRecords(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body || {};
  try {
    const result = await stagingService.getAllStagingRecords(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getReceivingsForStaging(req, res) {
  const pool = req?.app?.locals?.dbPool;
  try {
    const result = await stagingService.getReceivingsForStaging(pool);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function createStagingRecord(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body || {};
  values.user_id = values.user_id || req?.user?.id;
  try {
    const result = await stagingService.createStagingRecord(pool, values);
    return res.status(200).json({ message: "Staging record created successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function updateStagingStatus(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body || {};
  values.user_id = values.user_id || req?.user?.id;
  try {
    const result = await stagingService.updateStagingStatus(pool, values);
    return res.status(200).json({ message: "Staging status updated successfully", data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getStagingStatusHistory(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const values = req?.body || {};
  try {
    const result = await stagingService.getStagingStatusHistory(pool, values);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getStagingRecord(req, res) {
  const pool = req?.app?.locals?.dbPool;
  const stagingId = req?.body?.StagingID;
  try {
    const result = await stagingService.getStagingRecord(pool, stagingId);
    return res.status(200).json({ data: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

module.exports.getAllStagingRecords = getAllStagingRecords;
module.exports.getReceivingsForStaging = getReceivingsForStaging;
module.exports.createStagingRecord = createStagingRecord;
module.exports.updateStagingStatus = updateStagingStatus;
module.exports.getStagingStatusHistory = getStagingStatusHistory;
module.exports.getStagingRecord = getStagingRecord;
