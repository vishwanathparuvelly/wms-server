// migrations/002_create_bin_products_tables.js
const sql = require("mssql");

async function createBinProductsTables(pool) {
  try {
    const request = pool.request();

    const binProductsExists = await request.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'BinProducts'
    `);

    if (binProductsExists.recordset.length === 0) {
      console.log("Creating BinProducts table...");
      await request.query(`
        CREATE TABLE BinProducts (
          BinProductID INT PRIMARY KEY IDENTITY(1,1),
          BinID INT NOT NULL,
          PalletTypeID INT NOT NULL,
          StackID INT NOT NULL,
          VendorID INT NULL,
          CustomerID INT NULL,
          BranchID INT NULL,
          WarehouseID INT NOT NULL,
          ProductID INT NOT NULL,
          BatchNumber NVARCHAR(100) NULL,
          ManufactureDate DATE NULL,
          UOMID INT NOT NULL,
          SLOCID INT NOT NULL,
          MRP DECIMAL(10, 2) NULL,
          MaxQuantity DECIMAL(10, 2) NOT NULL,
          FilledQuantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
          AvailableQuantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
          IsActive BIT NOT NULL DEFAULT 1,
          IsDeleted BIT NOT NULL DEFAULT 0,
          CreatedBy INT NOT NULL,
          UpdatedBy INT NOT NULL,
          CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
          UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
          CONSTRAINT FK_BinProducts_Bin FOREIGN KEY (BinID) REFERENCES Bins(BinID),
          CONSTRAINT FK_BinProducts_PalletType FOREIGN KEY (PalletTypeID) REFERENCES PalletTypes(PalletTypeID),
          CONSTRAINT FK_BinProducts_Stack FOREIGN KEY (StackID) REFERENCES Stacks(StackID),
          CONSTRAINT FK_BinProducts_Warehouse FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID),
          CONSTRAINT FK_BinProducts_Product FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
          CONSTRAINT FK_BinProducts_UOM FOREIGN KEY (UOMID) REFERENCES UOMs(UOMID),
          CONSTRAINT FK_BinProducts_Sloc FOREIGN KEY (SLOCID) REFERENCES Slocs(SlocID)
        );
      `);

      await request.query(`
        CREATE INDEX IX_BinProducts_ProductID ON BinProducts(ProductID);
        CREATE INDEX IX_BinProducts_BinID ON BinProducts(BinID);
        CREATE INDEX IX_BinProducts_WarehouseID ON BinProducts(WarehouseID);
        CREATE INDEX IX_BinProducts_IsActive ON BinProducts(IsActive);
        CREATE INDEX IX_BinProducts_BatchNumber ON BinProducts(BatchNumber);
      `);

      console.log("✓ BinProducts table created successfully");
    } else {
      console.log("✓ BinProducts table already exists");
    }

    const binProductLogsExists = await request.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'BinProductLogs'
    `);

    if (binProductLogsExists.recordset.length === 0) {
      console.log("Creating BinProductLogs table...");
      await request.query(`
        CREATE TABLE BinProductLogs (
          BinProductLogID INT PRIMARY KEY IDENTITY(1,1),
          BinID INT NOT NULL,
          BinProductID INT NOT NULL,
          ProductID INT NOT NULL,
          BatchChangeReason NVARCHAR(200) NULL,
          PalletTypeID INT NOT NULL,
          StackID INT NOT NULL,
          VendorID INT NULL,
          CustomerID INT NULL,
          BranchID INT NULL,
          WarehouseID INT NOT NULL,
          ActionType INT NOT NULL,
          PurchaseOrderProductID INT NULL,
          SalesOrderProductID INT NULL,
          PurchaseOrderReturnProductID INT NULL,
          SalesOrderReturnProductID INT NULL,
          Quantity DECIMAL(10, 2) NOT NULL,
          PreviousFilledQuantity DECIMAL(10, 2) NOT NULL,
          NewFilledQuantity DECIMAL(10, 2) NOT NULL,
          PreviousAvailableQuantity DECIMAL(10, 2) NOT NULL,
          NewAvailableQuantity DECIMAL(10, 2) NOT NULL,
          CreatedBy INT NOT NULL,
          CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
          CONSTRAINT FK_BinProductLogs_Bin FOREIGN KEY (BinID) REFERENCES Bins(BinID),
          CONSTRAINT FK_BinProductLogs_BinProduct FOREIGN KEY (BinProductID) REFERENCES BinProducts(BinProductID),
          CONSTRAINT FK_BinProductLogs_Product FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
          CONSTRAINT FK_BinProductLogs_PalletType FOREIGN KEY (PalletTypeID) REFERENCES PalletTypes(PalletTypeID),
          CONSTRAINT FK_BinProductLogs_Stack FOREIGN KEY (StackID) REFERENCES Stacks(StackID),
          CONSTRAINT FK_BinProductLogs_Warehouse FOREIGN KEY (WarehouseID) REFERENCES Warehouses(WarehouseID)
        );
      `);

      await request.query(`
        CREATE INDEX IX_BinProductLogs_BinProductID ON BinProductLogs(BinProductID);
        CREATE INDEX IX_BinProductLogs_ProductID ON BinProductLogs(ProductID);
        CREATE INDEX IX_BinProductLogs_ActionType ON BinProductLogs(ActionType);
        CREATE INDEX IX_BinProductLogs_CreatedDate ON BinProductLogs(CreatedDate);
      `);

      console.log("✓ BinProductLogs table created successfully");
    } else {
      console.log("✓ BinProductLogs table already exists");
    }

    return true;
  } catch (err) {
    console.error(
      "Error creating BinProducts/BinProductLogs tables:",
      err.message,
    );
    throw err;
  }
}

module.exports = { createBinProductsTables };
