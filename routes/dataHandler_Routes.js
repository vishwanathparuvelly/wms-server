// routes/dataHandler_Routes.js

const express = require("express");
const router = express.Router();
const dataHandlerController = require("../controller/DataHandler_Controller");

// Route for exporting filtered data to CSV
router.post("/export/:module", dataHandlerController.handleExport);

// Route for importing data from a CSV
router.post(
  "/import/:module",
  dataHandlerController.upload.single("file"),
  dataHandlerController.handleImport
);

// Route for downloading a sample CSV template
router.get("/sample/:module", dataHandlerController.handleSampleDownload);

module.exports = router;
