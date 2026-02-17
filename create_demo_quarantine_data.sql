-- Demo Data for Quarantine Testing
-- Today is Feb 15, 2026
-- Config threshold is 1 day (show through Feb 16)

-- This script inserts test PurchaseOrderReceivings with various quarantine dates

-- Demo User ID (adjust if needed)
DECLARE @UserID INT = 1;
DECLARE @CreatedDate DATETIME = GETDATE();
DECLARE @UpdatedDate DATETIME = GETDATE();

-- Insert demo PurchaseOrders
INSERT INTO PurchaseOrders (PurchaseOrderNumber, PurchaseOrderDate, PurchaseOrderStatus, CreatedBy, UpdatedBy, CreatedDate, UpdatedDate)
VALUES 
  ('PO202602150001', '2026-02-10', 'Completed', @UserID, @UserID, @CreatedDate, @UpdatedDate),
  ('PO202602150002', '2026-02-10', 'Completed', @UserID, @UserID, @CreatedDate, @UpdatedDate),
  ('PO202602150003', '2026-02-10', 'Completed', @UserID, @UserID, @CreatedDate, @UpdatedDate),
  ('PO202602150004', '2026-02-10', 'Completed', @UserID, @UserID, @CreatedDate, @UpdatedDate),
  ('PO202602150005', '2026-02-10', 'Completed', @UserID, @UserID, @CreatedDate, @UpdatedDate);

-- Get last inserted PO IDs
DECLARE @PO1 INT = IDENT_CURRENT('PurchaseOrders') - 4;
DECLARE @PO2 INT = IDENT_CURRENT('PurchaseOrders') - 3;
DECLARE @PO3 INT = IDENT_CURRENT('PurchaseOrders') - 2;
DECLARE @PO4 INT = IDENT_CURRENT('PurchaseOrders') - 1;
DECLARE @PO5 INT = IDENT_CURRENT('PurchaseOrders');

-- Insert test PurchaseOrderReceivings with various quarantine dates
INSERT INTO PurchaseOrderReceivings (
    PurchaseOrderID, 
    GSRN, 
    ReceivingDate, 
    InvoiceNumber, 
    PurchaseOrderReceivingStatus, 
    QuarantineEndDate, 
    QuarantineRemark,
    CreatedBy, 
    UpdatedBy, 
    CreatedDate, 
    UpdatedDate
)
VALUES 
  -- Record 1: Quarantine ended Feb 14 (PAST - should NOT show with 1 day config)
  (@PO1, 'GSRN001', '2026-02-10', 'INV001', 'Received', '2026-02-14', 'Demo - Completed past 1 day', @UserID, @UserID, @CreatedDate, @UpdatedDate),
  
  -- Record 2: Quarantine ends Feb 15 TODAY (SHOULD show with 1 day config)
  (@PO2, 'GSRN002', '2026-02-13', 'INV002', 'Received', '2026-02-15', 'Demo - Completed today', @UserID, @UserID, @CreatedDate, @UpdatedDate),
  
  -- Record 3: Quarantine ends Feb 16 TOMORROW (SHOULD show with 1 day config)
  (@PO3, 'GSRN003', '2026-02-13', 'INV003', 'Received', '2026-02-16', 'Demo - Completing tomorrow', @UserID, @UserID, @CreatedDate, @UpdatedDate),
  
  -- Record 4: Quarantine ends Feb 17 (SHOULD NOT show with 1 day config)
  (@PO4, 'GSRN004', '2026-02-13', 'INV004', 'Received', '2026-02-17', 'Demo - Beyond threshold', @UserID, @UserID, @CreatedDate, @UpdatedDate),
  
  -- Record 5: Still in quarantine on Feb 20 (SHOULD NOT show)
  (@PO5, 'GSRN005', '2026-02-13', 'INV005', 'Received', '2026-02-20', 'Demo - Still in quarantine', @UserID, @UserID, @CreatedDate, @UpdatedDate);

PRINT 'Demo data created successfully!';
PRINT 'TODAY = Feb 15, 2026';
PRINT 'CONFIG = 1 day threshold';
PRINT '';
PRINT 'Expected to show in getPurchaseOrderReceivingsForPutaway:';
PRINT '- INV002 (Quarantine ends Feb 15)';
PRINT '- INV003 (Quarantine ends Feb 16)';
PRINT '';
PRINT 'Should NOT show:';
PRINT '- INV001 (Quarantine ended Feb 14 - past threshold)';
PRINT '- INV004 (Quarantine ends Feb 17 - beyond threshold)';
PRINT '- INV005 (Quarantine ends Feb 20 - still in quarantine)';
