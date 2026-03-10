// Migration: Create PurchaseOrderReturns, PurchaseOrderReturnProducts, PurchaseOrderReturnShipments

async function up(pool) {
  const request = pool.request();

  // 1. PurchaseOrderReturns
  const porExists = await request.query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PurchaseOrderReturns'
  `);
  if (porExists.recordset.length === 0) {
    await request.query(`
      CREATE TABLE PurchaseOrderReturns (
        PurchaseOrderReturnID INT PRIMARY KEY IDENTITY(1,1),
        PurchaseOrderReturnNumber NVARCHAR(50) NOT NULL,
        PurchaseOrderReturnDate DATE NOT NULL,
        PurchaseOrderReturnStatus NVARCHAR(50) NOT NULL DEFAULT 'New',
        VendorID INT NULL,
        BranchID INT NULL,
        WarehouseID INT NULL,
        DeliveryDate DATE NULL,
        DeliveryAddress NVARCHAR(500) NULL,
        PersonInChargeInternal NVARCHAR(100) NULL,
        PersonInChargeCustomer NVARCHAR(100) NULL,
        PersonInChargeVendor NVARCHAR(100) NULL,
        Remarks NVARCHAR(500) NULL,
        IsShipment BIT NOT NULL DEFAULT 0,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CreatedBy INT NOT NULL,
        UpdatedBy INT NOT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_PurchaseOrderReturns_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID),
        CONSTRAINT FK_PurchaseOrderReturns_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID),
        CONSTRAINT FK_PurchaseOrderReturns_VendorID FOREIGN KEY (VendorID) REFERENCES Vendors(VendorID),
        CONSTRAINT FK_PurchaseOrderReturns_BranchID FOREIGN KEY (BranchID) REFERENCES Branches(BranchID),
        CONSTRAINT FK_PurchaseOrderReturns_WarehouseID FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID)
      );
    `);
    await request.query(`
      CREATE INDEX IX_PurchaseOrderReturns_CreatedBy ON PurchaseOrderReturns(CreatedBy);
      CREATE INDEX IX_PurchaseOrderReturns_Status ON PurchaseOrderReturns(PurchaseOrderReturnStatus);
      CREATE INDEX IX_PurchaseOrderReturns_IsDeleted ON PurchaseOrderReturns(IsDeleted);
    `);
    console.log("✓ PurchaseOrderReturns table created");
  }

  // 2. PurchaseOrderReturnProducts
  const porpExists = await request.query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PurchaseOrderReturnProducts'
  `);
  if (porpExists.recordset.length === 0) {
    await request.query(`
      CREATE TABLE PurchaseOrderReturnProducts (
        PurchaseOrderReturnProductID INT PRIMARY KEY IDENTITY(1,1),
        PurchaseOrderReturnID INT NOT NULL,
        VendorID INT NULL,
        BranchID INT NULL,
        WarehouseID INT NULL,
        ProductID INT NOT NULL,
        UOMID INT NULL,
        SLOCID INT NULL,
        BatchNumber NVARCHAR(100) NULL,
        Quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
        Pending_Quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
        Picked_Quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
        MRP DECIMAL(10, 2) NULL,
        Discount DECIMAL(10, 2) NULL,
        Total_Product_MRP DECIMAL(10, 2) NULL,
        Total_Product_Discount DECIMAL(10, 2) NULL,
        Total_Product_Amount DECIMAL(10, 2) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CreatedBy INT NOT NULL,
        UpdatedBy INT NOT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_PurchaseOrderReturnProducts_Return FOREIGN KEY (PurchaseOrderReturnID) REFERENCES PurchaseOrderReturns(PurchaseOrderReturnID),
        CONSTRAINT FK_PurchaseOrderReturnProducts_Product FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
        CONSTRAINT FK_PurchaseOrderReturnProducts_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID),
        CONSTRAINT FK_PurchaseOrderReturnProducts_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID),
        CONSTRAINT FK_PurchaseOrderReturnProducts_VendorID FOREIGN KEY (VendorID) REFERENCES Vendors(VendorID),
        CONSTRAINT FK_PurchaseOrderReturnProducts_BranchID FOREIGN KEY (BranchID) REFERENCES Branches(BranchID),
        CONSTRAINT FK_PurchaseOrderReturnProducts_WarehouseID FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID),
        CONSTRAINT FK_PurchaseOrderReturnProducts_UOMID FOREIGN KEY (UOMID) REFERENCES UOMs(UOMID),
        CONSTRAINT FK_PurchaseOrderReturnProducts_SLOCID FOREIGN KEY (SLOCID) REFERENCES Slocs(SlocID)
      );
    `);
    await request.query(`
      CREATE INDEX IX_PurchaseOrderReturnProducts_ReturnID ON PurchaseOrderReturnProducts(PurchaseOrderReturnID);
      CREATE INDEX IX_PurchaseOrderReturnProducts_ProductID ON PurchaseOrderReturnProducts(ProductID);
      CREATE INDEX IX_PurchaseOrderReturnProducts_IsDeleted ON PurchaseOrderReturnProducts(IsDeleted);
    `);
    console.log("✓ PurchaseOrderReturnProducts table created");
  }

  // 3. PurchaseOrderReturnShipments
  const porsExists = await request.query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PurchaseOrderReturnShipments'
  `);
  if (porsExists.recordset.length === 0) {
    await request.query(`
      CREATE TABLE PurchaseOrderReturnShipments (
        PurchaseOrderReturnShipmentID INT PRIMARY KEY IDENTITY(1,1),
        PurchaseOrderReturnShipmentNumber NVARCHAR(50) NULL,
        PurchaseOrderReturnShipmentDate DATE NOT NULL,
        PurchaseOrderReturnID INT NULL,
        VendorID INT NULL,
        BranchID INT NULL,
        WarehouseID INT NULL,
        VehicleTypeID INT NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CreatedBy INT NOT NULL,
        UpdatedBy INT NOT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_PurchaseOrderReturnShipments_Return FOREIGN KEY (PurchaseOrderReturnID) REFERENCES PurchaseOrderReturns(PurchaseOrderReturnID),
        CONSTRAINT FK_PurchaseOrderReturnShipments_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(UserID),
        CONSTRAINT FK_PurchaseOrderReturnShipments_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID),
        CONSTRAINT FK_PurchaseOrderReturnShipments_VendorID FOREIGN KEY (VendorID) REFERENCES Vendors(VendorID),
        CONSTRAINT FK_PurchaseOrderReturnShipments_BranchID FOREIGN KEY (BranchID) REFERENCES Branches(BranchID),
        CONSTRAINT FK_PurchaseOrderReturnShipments_WarehouseID FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID),
        CONSTRAINT FK_PurchaseOrderReturnShipments_VehicleTypeID FOREIGN KEY (VehicleTypeID) REFERENCES VehicleTypes(VehicleTypeID)
      );
    `);
    await request.query(`
      CREATE INDEX IX_PurchaseOrderReturnShipments_ReturnID ON PurchaseOrderReturnShipments(PurchaseOrderReturnID);
      CREATE INDEX IX_PurchaseOrderReturnShipments_CreatedBy ON PurchaseOrderReturnShipments(CreatedBy);
      CREATE INDEX IX_PurchaseOrderReturnShipments_IsDeleted ON PurchaseOrderReturnShipments(IsDeleted);
    `);
    console.log("✓ PurchaseOrderReturnShipments table created");
  }

  return true;
}

module.exports = { up };
