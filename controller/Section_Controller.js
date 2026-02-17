const sectionService = require("../service/Section_Service");
const { CustomError } = require("../model/CustomError");

async function addSection(req, res) {
  try {
    const pool = req?.app?.locals?.dbPool;
    const data = req.body;
    const result = await sectionService.addSection(pool, data);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err instanceof CustomError) {
      res.json({
        success: false,
        message: err.message,
        statusCode: 400,
      });
    } else {
      res.json({
        success: false,
        message: err.message,
        statusCode: 500,
      });
    }
  }
}

async function getSection(req, res) {
  try {
    const pool = req?.app?.locals?.dbPool;
    const { SectionID } = req.body;
    const result = await sectionService.getSection(pool, SectionID);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err instanceof CustomError) {
      res.json({
        success: false,
        message: err.message,
        statusCode: 400,
      });
    } else {
      res.json({
        success: false,
        message: err.message,
        statusCode: 500,
      });
    }
  }
}

async function getAllSections(req, res) {
  try {
    const pool = req?.app?.locals?.dbPool;
    const data = req.body;
    const result = await sectionService.getAllSections(pool, data);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    if (err instanceof CustomError) {
      res.json({
        success: false,
        message: err.message,
        statusCode: 400,
      });
    } else {
      res.json({
        success: false,
        message: err.message,
        statusCode: 500,
      });
    }
  }
}

async function updateSection(req, res) {
  try {
    const pool = req?.app?.locals?.dbPool;
    const data = req.body;
    const result = await sectionService.updateSection(pool, data);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err instanceof CustomError) {
      res.json({
        success: false,
        message: err.message,
        statusCode: 400,
      });
    } else {
      res.json({
        success: false,
        message: err.message,
        statusCode: 500,
      });
    }
  }
}

async function deleteSection(req, res) {
  try {
    const pool = req?.app?.locals?.dbPool;
    const data = req.body;
    const result = await sectionService.deleteSection(pool, data);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    if (err instanceof CustomError) {
      res.json({
        success: false,
        message: err.message,
        statusCode: 400,
      });
    } else {
      res.json({
        success: false,
        message: err.message,
        statusCode: 500,
      });
    }
  }
}

async function getSectionsLite(req, res) {
  try {
    const pool = req?.app?.locals?.dbPool;
    const data = await sectionService.getSectionsLite(pool, req.body);
    res.json({
      success: true,
      data: data,
    });
  } catch (err) {
    if (err instanceof CustomError) {
      res.json({
        success: false,
        message: err.message,
        statusCode: 400,
      });
    } else {
      res.json({
        success: false,
        message: err.message,
        statusCode: 500,
      });
    }
  }
}

module.exports.addSection = addSection;
module.exports.getSection = getSection;
module.exports.getAllSections = getAllSections;
module.exports.updateSection = updateSection;
module.exports.deleteSection = deleteSection;
module.exports.getSectionsLite = getSectionsLite;
