const documentService = require("../service/Document_Service");

async function uploadDocument(req, res, pool) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const { entityType, entityID, documentType } = req.body;
    const userID = req.body.user_id || req.body.loggedInUserID;

    if (!entityType || !entityID) {
      return res.status(400).json({
        success: false,
        error: "entityType and entityID are required",
      });
    }

    const document = await documentService.uploadDocument(
      pool,
      req.file,
      entityType,
      parseInt(entityID),
      documentType,
      parseInt(userID)
    );

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: document,
    });
  } catch (error) {
    console.error("Upload document error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to upload document",
    });
  }
}

async function getDocumentsByEntity(req, res, pool) {
  try {
    const { entityType, entityID } = req.params;

    if (!entityType || !entityID) {
      return res.status(400).json({
        success: false,
        error: "entityType and entityID are required",
      });
    }

    const documents = await documentService.getDocumentsByEntity(
      pool,
      entityType,
      parseInt(entityID)
    );

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get documents",
    });
  }
}

async function getDocumentsByEntityPost(req, res, pool) {
  try {
    const { entityType, entityID } = req.body;

    if (!entityType || !entityID) {
      return res.status(400).json({
        success: false,
        error: "entityType and entityID are required",
      });
    }

    const documents = await documentService.getDocumentsByEntity(
      pool,
      entityType,
      parseInt(entityID)
    );

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get documents",
    });
  }
}

async function downloadDocument(req, res, pool) {
  try {
    const { documentID } = req.params;

    if (!documentID) {
      return res.status(400).json({
        success: false,
        error: "documentID is required",
      });
    }

    const { stream, document } = await documentService.downloadDocument(
      pool,
      parseInt(documentID)
    );

    res.setHeader("Content-Type", document.MimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(document.OriginalFileName)}"`
    );

    stream.pipe(res);
  } catch (error) {
    console.error("Download document error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to download document",
    });
  }
}

async function deleteDocument(req, res, pool) {
  try {
    const { documentID } = req.params;
    const userID = req.body.user_id || req.body.loggedInUserID || req.query.user_id;

    if (!documentID) {
      return res.status(400).json({
        success: false,
        error: "documentID is required",
      });
    }

    const result = await documentService.deleteDocument(
      pool,
      parseInt(documentID),
      parseInt(userID)
    );

    res.json(result);
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to delete document",
    });
  }
}

async function deleteDocumentPost(req, res, pool) {
  try {
    const { documentID, user_id, loggedInUserID } = req.body;
    const userID = user_id || loggedInUserID;

    if (!documentID) {
      return res.status(400).json({
        success: false,
        error: "documentID is required",
      });
    }

    const result = await documentService.deleteDocument(
      pool,
      parseInt(documentID),
      parseInt(userID)
    );

    res.json(result);
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to delete document",
    });
  }
}

module.exports = {
  uploadDocument,
  getDocumentsByEntity,
  getDocumentsByEntityPost,
  downloadDocument,
  deleteDocument,
  deleteDocumentPost,
};
