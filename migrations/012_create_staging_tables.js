// Migration: Create Staging and StagingStatusHistory tables for QA/QC workflow

async function up(pool) {
  const request = pool.request();

  // 1. Staging table (one record per GRN)
  const stagingExists = await request.query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Staging'
  `);
  if (stagingExists.recordset.length === 0) {
    await request.query(`
      CREATE TABLE Staging (
        StagingID INT PRIMARY KEY IDENTITY(1,1),
        PurchaseOrderReceivingID INT NOT NULL,
        StagingStatus NVARCHAR(20) NOT NULL DEFAULT 'Quarantine',
        Comments NVARCHAR(1000) NULL,
        CreatedBy INT NULL,
        UpdatedBy INT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT UQ_Staging_PurchaseOrderReceivingID UNIQUE (PurchaseOrderReceivingID),
        CONSTRAINT FK_Staging_PurchaseOrderReceiving FOREIGN KEY (PurchaseOrderReceivingID) REFERENCES PurchaseOrderReceivings(PurchaseOrderReceivingID)
      );
    `);
    await request.query(`
      CREATE INDEX IX_Staging_StagingStatus ON Staging(StagingStatus);
      CREATE INDEX IX_Staging_IsDeleted ON Staging(IsDeleted);
    `);
    console.log("✓ Staging table created");
  }

  // 2. StagingStatusHistory table (audit trail for every status change)
  const historyExists = await request.query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'StagingStatusHistory'
  `);
  if (historyExists.recordset.length === 0) {
    await request.query(`
      CREATE TABLE StagingStatusHistory (
        StagingStatusHistoryID INT PRIMARY KEY IDENTITY(1,1),
        StagingID INT NOT NULL,
        PreviousStatus NVARCHAR(20) NULL,
        NewStatus NVARCHAR(20) NOT NULL,
        Comments NVARCHAR(1000) NULL,
        ChangedBy INT NULL,
        ChangedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_StagingStatusHistory_Staging FOREIGN KEY (StagingID) REFERENCES Staging(StagingID)
      );
    `);
    await request.query(`
      CREATE INDEX IX_StagingStatusHistory_StagingID ON StagingStatusHistory(StagingID);
    `);
    console.log("✓ StagingStatusHistory table created");
  }
}

async function down(pool) {
  const request = pool.request();
  await request.query(`
    IF OBJECT_ID('StagingStatusHistory', 'U') IS NOT NULL DROP TABLE StagingStatusHistory;
    IF OBJECT_ID('Staging', 'U') IS NOT NULL DROP TABLE Staging;
  `);
  console.log("✓ Staging and StagingStatusHistory tables dropped");
}

module.exports = { up, down };
