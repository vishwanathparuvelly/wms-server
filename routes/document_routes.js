const express = require("express");
const documentController = require("../controller/Document_Controller");
const { uploadSingle, handleUploadError } = require("../middleware/fileUpload");
const { authenticateJWT } = require("../validation");

function createDocumentRoutes(pool) {
  const router = express.Router();

  router.post(
    "/upload",
    authenticateJWT,
    uploadSingle,
    handleUploadError,
    (req, res) => documentController.uploadDocument(req, res, pool)
  );

  router.get(
    "/list/:entityType/:entityID",
    authenticateJWT,
    (req, res) => documentController.getDocumentsByEntity(req, res, pool)
  );

  router.post(
    "/list",
    authenticateJWT,
    (req, res) => documentController.getDocumentsByEntityPost(req, res, pool)
  );

  router.get(
    "/download/:documentID",
    authenticateJWT,
    (req, res) => documentController.downloadDocument(req, res, pool)
  );

  router.delete(
    "/delete/:documentID",
    authenticateJWT,
    (req, res) => documentController.deleteDocument(req, res, pool)
  );

  router.post(
    "/delete",
    authenticateJWT,
    (req, res) => documentController.deleteDocumentPost(req, res, pool)
  );

  return router;
}

module.exports = createDocumentRoutes;
