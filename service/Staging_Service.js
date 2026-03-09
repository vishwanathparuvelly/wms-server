const sql = require("mssql");
const { CustomError } = require("../model/CustomError");

const VALID_STATUSES = ["Quarantine", "Under Test", "Released", "Rejected", "Hold"];

const ALLOWED_TRANSITIONS = {
  Quarantine: ["Under Test", "Hold"],
  "Under Test": ["Released", "Rejected", "Hold"],
  Hold: ["Quarantine", "Under Test"],
  Released: [],
  Rejected: [],
};

async function getStagingRecord(pool, stagingId) {
  if (!stagingId) {
    throw new CustomError("StagingID is required");
  }
  const request = pool.request();
  const result = await request
    .input("StagingID", sql.Int, parseInt(stagingId))
    .query(`
      SELECT S.*,
        POR.GSRN,
        POR.ReceivingDate,
        POR.PurchaseOrderReceivingStatus AS GRNStatus,
        PO.PurchaseOrderID,
        PO.PurchaseOrderNumber,
        PO.PurchaseOrderDate,
        V.VendorName
      FROM Staging S
      INNER JOIN PurchaseOrderReceivings POR ON S.PurchaseOrderReceivingID = POR.PurchaseOrderReceivingID
      INNER JOIN PurchaseOrders PO ON POR.PurchaseOrderID = PO.PurchaseOrderID
      LEFT JOIN Vendors V ON POR.VendorID = V.VendorID
      WHERE S.StagingID = @StagingID AND S.IsDeleted = 0
    `);
  if (result.recordset.length === 0) {
    throw new CustomError("Staging record not found");
  }
  return result.recordset[0];
}

async function getAllStagingRecords(pool, values) {
  try {
    let query = `
      SELECT S.StagingID, S.PurchaseOrderReceivingID, S.StagingStatus, S.Comments,
        S.CreatedBy, S.UpdatedBy, S.CreatedDate, S.UpdatedDate,
        POR.GSRN, POR.ReceivingDate,
        PO.PurchaseOrderNumber, PO.PurchaseOrderDate,
        V.VendorName
      FROM Staging S
      INNER JOIN PurchaseOrderReceivings POR ON S.PurchaseOrderReceivingID = POR.PurchaseOrderReceivingID
      INNER JOIN PurchaseOrders PO ON POR.PurchaseOrderID = PO.PurchaseOrderID
      LEFT JOIN Vendors V ON POR.VendorID = V.VendorID
      WHERE S.IsDeleted = 0
    `;
    const request = pool.request();
    if (values && values.StagingStatus) {
      query += ` AND S.StagingStatus = @StagingStatus`;
      request.input("StagingStatus", sql.NVarChar(20), values.StagingStatus);
    }
    query += ` ORDER BY S.CreatedDate DESC`;
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError("Catch Exception in getAllStagingRecords: " + err.message);
  }
}

async function getReceivingsForStaging(pool) {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT POR.PurchaseOrderReceivingID, POR.GSRN, POR.ReceivingDate,
        PO.PurchaseOrderNumber, PO.PurchaseOrderDate, V.VendorName
      FROM PurchaseOrderReceivings POR
      INNER JOIN PurchaseOrders PO ON POR.PurchaseOrderID = PO.PurchaseOrderID
      LEFT JOIN Vendors V ON POR.VendorID = V.VendorID
      WHERE POR.PurchaseOrderReceivingStatus = 'Received'
        AND POR.IsDeleted = 0
        AND NOT EXISTS (
          SELECT 1 FROM Staging S
          WHERE S.PurchaseOrderReceivingID = POR.PurchaseOrderReceivingID AND S.IsDeleted = 0
        )
      ORDER BY POR.ReceivingDate DESC
    `);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError("Catch Exception in getReceivingsForStaging: " + err.message);
  }
}

async function createStagingRecord(pool, values) {
  try {
    const PurchaseOrderReceivingID = values.PurchaseOrderReceivingID;
    const user_id = values.user_id || values.CreatedBy;

    if (!PurchaseOrderReceivingID) {
      throw new CustomError("PurchaseOrderReceivingID is required");
    }
    if (isNaN(parseInt(PurchaseOrderReceivingID))) {
      throw new CustomError("Invalid PurchaseOrderReceivingID");
    }

    const checkReceiving = await pool.request()
      .input("PurchaseOrderReceivingID", sql.Int, parseInt(PurchaseOrderReceivingID))
      .query(`
        SELECT PurchaseOrderReceivingID, PurchaseOrderReceivingStatus
        FROM PurchaseOrderReceivings
        WHERE PurchaseOrderReceivingID = @PurchaseOrderReceivingID AND IsDeleted = 0
      `);
    if (checkReceiving.recordset.length === 0) {
      throw new CustomError("GRN not found or already deleted");
    }
    if (checkReceiving.recordset[0].PurchaseOrderReceivingStatus !== "Received") {
      throw new CustomError("Only GRNs with status Received can be added to staging");
    }

    const checkStaging = await pool.request()
      .input("PurchaseOrderReceivingID", sql.Int, parseInt(PurchaseOrderReceivingID))
      .query(`
        SELECT StagingID FROM Staging
        WHERE PurchaseOrderReceivingID = @PurchaseOrderReceivingID AND IsDeleted = 0
      `);
    if (checkStaging.recordset.length > 0) {
      throw new CustomError("This GRN already has a staging record");
    }

    const insertResult = await pool.request()
      .input("PurchaseOrderReceivingID", sql.Int, parseInt(PurchaseOrderReceivingID))
      .input("CreatedBy", sql.Int, user_id ? parseInt(user_id) : null)
      .query(`
        INSERT INTO Staging (PurchaseOrderReceivingID, StagingStatus, CreatedBy)
        OUTPUT INSERTED.StagingID
        VALUES (@PurchaseOrderReceivingID, 'Quarantine', @CreatedBy)
      `);
    const StagingID = insertResult.recordset[0].StagingID;
    return await getStagingRecord(pool, StagingID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError("Catch Exception in createStagingRecord: " + err.message);
  }
}

async function updateStagingStatus(pool, values) {
  try {
    const { StagingID, NewStatus, Comments, user_id } = values;
    if (!StagingID || !NewStatus) {
      throw new CustomError("StagingID and NewStatus are required");
    }
    if (!VALID_STATUSES.includes(NewStatus)) {
      throw new CustomError(`Invalid NewStatus. Must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    const current = await getStagingRecord(pool, StagingID);
    const previousStatus = current.StagingStatus;
    const allowed = ALLOWED_TRANSITIONS[previousStatus] || [];
    if (!allowed.includes(NewStatus)) {
      throw new CustomError(
        `Transition from ${previousStatus} to ${NewStatus} is not allowed. Allowed: ${allowed.join(", ") || "none"}`
      );
    }

    const request = pool.request();
    await request
      .input("StagingID", sql.Int, parseInt(StagingID))
      .input("NewStatus", sql.NVarChar(20), NewStatus)
      .input("Comments", sql.NVarChar(1000), Comments || null)
      .input("UpdatedBy", sql.Int, user_id ? parseInt(user_id) : null)
      .input("PreviousStatus", sql.NVarChar(20), previousStatus)
      .input("ChangedBy", sql.Int, user_id ? parseInt(user_id) : null)
      .query(`
        INSERT INTO StagingStatusHistory (StagingID, PreviousStatus, NewStatus, Comments, ChangedBy)
        VALUES (@StagingID, @PreviousStatus, @NewStatus, @Comments, @ChangedBy);

        UPDATE Staging
        SET StagingStatus = @NewStatus, Comments = @Comments, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE StagingID = @StagingID;
      `);

    if (NewStatus === "Released") {
      const reqReleased = pool.request()
        .input("PurchaseOrderReceivingID", sql.Int, current.PurchaseOrderReceivingID)
        .input("UpdatedBy", sql.Int, user_id ? parseInt(user_id) : null);
      await reqReleased.query(`
          UPDATE PurchaseOrderReceivings
          SET QuarantineEndDate = CAST(GETDATE() AS DATE),
              QuarantineRemark = ISNULL(QuarantineRemark, '') + ' Released via Staging.',
              UpdatedBy = @UpdatedBy,
              UpdatedDate = GETDATE()
          WHERE PurchaseOrderReceivingID = @PurchaseOrderReceivingID
        `);
    }
    if (NewStatus === "Rejected") {
      await pool.request()
        .input("PurchaseOrderReceivingID", sql.Int, current.PurchaseOrderReceivingID)
        .input("PurchaseOrderID", sql.Int, current.PurchaseOrderID)
        .input("UpdatedBy", sql.Int, user_id ? parseInt(user_id) : null)
        .query(`
          UPDATE PurchaseOrderReceivings
          SET PurchaseOrderReceivingStatus = 'Rejected',
              Comments = ISNULL(Comments, '') + ' Rejected via Staging.',
              UpdatedBy = @UpdatedBy,
              UpdatedDate = GETDATE()
          WHERE PurchaseOrderReceivingID = @PurchaseOrderReceivingID;

          UPDATE PurchaseOrders
          SET PurchaseOrderStatus = 'Open', UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
          WHERE PurchaseOrderID = @PurchaseOrderID;
        `);
    }

    return await getStagingRecord(pool, StagingID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError("Catch Exception in updateStagingStatus: " + err.message);
  }
}

async function getStagingStatusHistory(pool, values) {
  try {
    const StagingID = values.StagingID;
    if (!StagingID) {
      throw new CustomError("StagingID is required");
    }
    const result = await pool.request()
      .input("StagingID", sql.Int, parseInt(StagingID))
      .query(`
        SELECT StagingStatusHistoryID, StagingID, PreviousStatus, NewStatus, Comments, ChangedBy, ChangedDate
        FROM StagingStatusHistory
        WHERE StagingID = @StagingID
        ORDER BY ChangedDate DESC
      `);
    return result.recordset;
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError("Catch Exception in getStagingStatusHistory: " + err.message);
  }
}

module.exports.getAllStagingRecords = getAllStagingRecords;
module.exports.getReceivingsForStaging = getReceivingsForStaging;
module.exports.createStagingRecord = createStagingRecord;
module.exports.updateStagingStatus = updateStagingStatus;
module.exports.getStagingStatusHistory = getStagingStatusHistory;
module.exports.getStagingRecord = getStagingRecord;
