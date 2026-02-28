const sql = require("mssql");
const { v4: uuidv4 } = require("uuid");
const { minioClient, bucketName, ensureBucket } = require("../config/minioClient");
const path = require("path");

async function uploadDocument(pool, file, entityType, entityID, documentType, userID) {
  await ensureBucket();
  
  const fileName = `${entityType.toLowerCase()}/${entityID}/${uuidv4()}${path.extname(file.originalname)}`;
  
  await minioClient.putObject(bucketName, fileName, file.buffer, file.size, {
    "Content-Type": file.mimetype,
    "x-amz-meta-original-name": file.originalname,
  });

  const request = pool.request();
  request.input("EntityType", sql.NVarChar(50), entityType);
  request.input("EntityID", sql.Int, entityID);
  request.input("FileName", sql.NVarChar(255), fileName);
  request.input("OriginalFileName", sql.NVarChar(255), file.originalname);
  request.input("FilePath", sql.NVarChar(500), `${bucketName}/${fileName}`);
  request.input("FileSize", sql.BigInt, file.size);
  request.input("MimeType", sql.NVarChar(100), file.mimetype);
  request.input("DocumentType", sql.NVarChar(100), documentType || null);
  request.input("CreatedBy", sql.Int, userID);
  request.input("UpdatedBy", sql.Int, userID);

  const result = await request.query(`
    INSERT INTO Documents (
      EntityType, EntityID, FileName, OriginalFileName, FilePath,
      FileSize, MimeType, DocumentType, IsActive, IsDeleted,
      CreatedBy, UpdatedBy, CreatedDate, UpdatedDate
    )
    OUTPUT INSERTED.*
    VALUES (
      @EntityType, @EntityID, @FileName, @OriginalFileName, @FilePath,
      @FileSize, @MimeType, @DocumentType, 1, 0,
      @CreatedBy, @UpdatedBy, GETDATE(), GETDATE()
    )
  `);

  return result.recordset[0];
}

async function getDocumentsByEntity(pool, entityType, entityID) {
  const request = pool.request();
  request.input("EntityType", sql.NVarChar(50), entityType);
  request.input("EntityID", sql.Int, entityID);

  const result = await request.query(`
    SELECT 
      DocumentID, EntityType, EntityID, FileName, OriginalFileName,
      FilePath, FileSize, MimeType, DocumentType, IsActive,
      CreatedBy, CreatedDate, UpdatedDate
    FROM Documents
    WHERE EntityType = @EntityType 
      AND EntityID = @EntityID 
      AND IsDeleted = 0
    ORDER BY CreatedDate DESC
  `);

  return result.recordset;
}

async function getDocumentById(pool, documentID) {
  const request = pool.request();
  request.input("DocumentID", sql.Int, documentID);

  const result = await request.query(`
    SELECT 
      DocumentID, EntityType, EntityID, FileName, OriginalFileName,
      FilePath, FileSize, MimeType, DocumentType, IsActive,
      CreatedBy, CreatedDate, UpdatedDate
    FROM Documents
    WHERE DocumentID = @DocumentID AND IsDeleted = 0
  `);

  return result.recordset[0];
}

async function downloadDocument(pool, documentID) {
  const document = await getDocumentById(pool, documentID);
  if (!document) {
    throw new Error("Document not found");
  }

  const stream = await minioClient.getObject(bucketName, document.FileName);
  return { stream, document };
}

async function deleteDocument(pool, documentID, userID) {
  const document = await getDocumentById(pool, documentID);
  if (!document) {
    throw new Error("Document not found");
  }

  try {
    await minioClient.removeObject(bucketName, document.FileName);
  } catch (err) {
    console.warn("Could not delete file from MinIO:", err.message);
  }

  const request = pool.request();
  request.input("DocumentID", sql.Int, documentID);
  request.input("UpdatedBy", sql.Int, userID);

  await request.query(`
    UPDATE Documents
    SET IsDeleted = 1, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
    WHERE DocumentID = @DocumentID
  `);

  return { success: true, message: "Document deleted successfully" };
}

async function getDocumentsByEntityBatch(pool, entityType, entityIDs) {
  if (!entityIDs || entityIDs.length === 0) {
    return [];
  }

  const request = pool.request();
  request.input("EntityType", sql.NVarChar(50), entityType);

  const idList = entityIDs.join(",");
  const result = await request.query(`
    SELECT 
      DocumentID, EntityType, EntityID, FileName, OriginalFileName,
      FilePath, FileSize, MimeType, DocumentType, IsActive,
      CreatedBy, CreatedDate, UpdatedDate
    FROM Documents
    WHERE EntityType = @EntityType 
      AND EntityID IN (${idList})
      AND IsDeleted = 0
    ORDER BY EntityID, CreatedDate DESC
  `);

  return result.recordset;
}

module.exports = {
  uploadDocument,
  getDocumentsByEntity,
  getDocumentById,
  downloadDocument,
  deleteDocument,
  getDocumentsByEntityBatch,
};
