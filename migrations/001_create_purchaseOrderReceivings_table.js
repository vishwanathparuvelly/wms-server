// migrations/001_create_purchaseOrderReceivings_table.js
const sql = require("mssql");

async function createPurchaseOrderReceivingsTable(pool) {
  try {
    const request = pool.request();

    // Check if table already exists
    const tableExists = await request.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'PurchaseOrderReceivings'
    `);

    if (tableExists.recordset.length > 0) {
      console.log("✓ PurchaseOrderReceivings table already exists");
      return true;
    }

    console.log("Creating PurchaseOrderReceivings table...");

    const createTableQuery = `
      CREATE TABLE PurchaseOrderReceivings (
        PurchaseOrderReceivingID INT PRIMARY KEY IDENTITY(1,1),
        PurchaseOrderID INT NOT NULL,
        GSRN NVARCHAR(100) NULL,
        ReceivingDate DATE NOT NULL,
        VendorID INT NOT NULL,
        WarehouseID INT NOT NULL,
        BranchID INT NOT NULL,
        VehicleNumber NVARCHAR(100) NULL,
        LRNumber NVARCHAR(100) NULL,
        InvoiceNumber NVARCHAR(100) NULL,
        PurchaseOrderReceivingStatus NVARCHAR(50) NOT NULL DEFAULT 'New',
        CreatedBy INT NOT NULL,
        UpdatedBy INT NOT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_POR_PurchaseOrderID FOREIGN KEY (PurchaseOrderID) REFERENCES PurchaseOrders(PurchaseOrderID),
        CONSTRAINT FK_POR_VendorID FOREIGN KEY (VendorID) REFERENCES Vendors(VendorID),
        CONSTRAINT FK_POR_WarehouseID FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID),
        CONSTRAINT FK_POR_BranchID FOREIGN KEY (BranchID) REFERENCES Branches(BranchID),
        CONSTRAINT FK_POR_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID),
        CONSTRAINT FK_POR_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)
      );
    `;

    await request.query(createTableQuery);
    console.log("✓ PurchaseOrderReceivings table created successfully");

    // Create indexes for performance
    const createIndexes = `
      CREATE INDEX IX_POR_PurchaseOrderID ON PurchaseOrderReceivings(PurchaseOrderID);
      CREATE INDEX IX_POR_BranchID ON PurchaseOrderReceivings(BranchID);
      CREATE INDEX IX_POR_WarehouseID ON PurchaseOrderReceivings(WarehouseID);
      CREATE INDEX IX_POR_Status ON PurchaseOrderReceivings(PurchaseOrderReceivingStatus);
      CREATE INDEX IX_POR_IsDeleted ON PurchaseOrderReceivings(IsDeleted);
    `;

    await request.query(createIndexes);
    console.log("✓ Indexes created successfully");

    return true;
  } catch (err) {
    console.error("Error creating PurchaseOrderReceivings table:", err.message);
    throw err;
  }
}

module.exports = { createPurchaseOrderReceivingsTable };
