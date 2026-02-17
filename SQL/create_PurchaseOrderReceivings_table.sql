-- SQL/create_PurchaseOrderReceivings_table.sql
-- Direct SQL script to create PurchaseOrderReceivings table
-- Run this in SQL Server Management Studio if node migrations don't work

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PurchaseOrderReceivings')
BEGIN
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
    PRINT 'Table PurchaseOrderReceivings created successfully';
END
ELSE
BEGIN
    PRINT 'Table PurchaseOrderReceivings already exists';
END

-- Create indexes for performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_POR_PurchaseOrderID')
    CREATE INDEX IX_POR_PurchaseOrderID ON PurchaseOrderReceivings(PurchaseOrderID);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_POR_BranchID')
    CREATE INDEX IX_POR_BranchID ON PurchaseOrderReceivings(BranchID);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_POR_WarehouseID')
    CREATE INDEX IX_POR_WarehouseID ON PurchaseOrderReceivings(WarehouseID);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_POR_Status')
    CREATE INDEX IX_POR_Status ON PurchaseOrderReceivings(PurchaseOrderReceivingStatus);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_POR_IsDeleted')
    CREATE INDEX IX_POR_IsDeleted ON PurchaseOrderReceivings(IsDeleted);

PRINT 'Indexes created successfully';
