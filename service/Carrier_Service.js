const sql = require("mssql");

async function addCarrier(pool, carrierData) {
  const request = pool.request();
  request.input("CarrierName", sql.NVarChar(100), carrierData.CarrierName);
  request.input("CarrierCode", sql.NVarChar(50), carrierData.CarrierCode || null);
  request.input("CreatedBy", sql.Int, carrierData.CreatedBy);
  request.input("UpdatedBy", sql.Int, carrierData.UpdatedBy);

  const result = await request.query(`
    INSERT INTO Carriers (CarrierName, CarrierCode, IsActive, IsDeleted, CreatedBy, UpdatedBy, CreatedDate, UpdatedDate)
    OUTPUT INSERTED.*
    VALUES (@CarrierName, @CarrierCode, 1, 0, @CreatedBy, @UpdatedBy, GETDATE(), GETDATE())
  `);

  return result.recordset[0];
}

async function getCarrier(pool, carrierID) {
  const request = pool.request();
  request.input("CarrierID", sql.Int, carrierID);

  const result = await request.query(`
    SELECT CarrierID, CarrierName, CarrierCode, IsActive, CreatedBy, UpdatedBy, CreatedDate, UpdatedDate
    FROM Carriers
    WHERE CarrierID = @CarrierID AND IsDeleted = 0
  `);

  return result.recordset[0];
}

async function getAllCarriers(pool) {
  const result = await pool.request().query(`
    SELECT CarrierID, CarrierName, CarrierCode, IsActive, CreatedBy, UpdatedBy, CreatedDate, UpdatedDate
    FROM Carriers
    WHERE IsDeleted = 0
    ORDER BY CarrierName
  `);

  return result.recordset;
}

async function getCarriersLite(pool) {
  const result = await pool.request().query(`
    SELECT CarrierID, CarrierName
    FROM Carriers
    WHERE IsDeleted = 0 AND IsActive = 1
    ORDER BY CarrierName
  `);

  return result.recordset;
}

async function updateCarrier(pool, carrierData) {
  const request = pool.request();
  request.input("CarrierID", sql.Int, carrierData.CarrierID);
  request.input("CarrierName", sql.NVarChar(100), carrierData.CarrierName);
  request.input("CarrierCode", sql.NVarChar(50), carrierData.CarrierCode || null);
  request.input("IsActive", sql.Bit, carrierData.IsActive !== undefined ? carrierData.IsActive : 1);
  request.input("UpdatedBy", sql.Int, carrierData.UpdatedBy);

  const result = await request.query(`
    UPDATE Carriers
    SET CarrierName = @CarrierName,
        CarrierCode = @CarrierCode,
        IsActive = @IsActive,
        UpdatedBy = @UpdatedBy,
        UpdatedDate = GETDATE()
    OUTPUT INSERTED.*
    WHERE CarrierID = @CarrierID AND IsDeleted = 0
  `);

  return result.recordset[0];
}

async function deleteCarrier(pool, carrierID, userID) {
  const request = pool.request();
  request.input("CarrierID", sql.Int, carrierID);
  request.input("UpdatedBy", sql.Int, userID);

  await request.query(`
    UPDATE Carriers
    SET IsDeleted = 1, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
    WHERE CarrierID = @CarrierID
  `);

  return { success: true, message: "Carrier deleted successfully" };
}

module.exports = {
  addCarrier,
  getCarrier,
  getAllCarriers,
  getCarriersLite,
  updateCarrier,
  deleteCarrier,
};
