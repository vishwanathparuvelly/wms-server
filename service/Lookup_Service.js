const sql = require("mssql");

async function getPackingRequirements(pool) {
  const result = await pool.request().query(`
    SELECT PackingRequirementID, PackingRequirementName AS Name
    FROM PackingRequirements
    WHERE IsActive = 1
    ORDER BY PackingRequirementID
  `);

  return result.recordset;
}

async function getCarrierPreferences(pool) {
  const result = await pool.request().query(`
    SELECT CarrierPreferenceID, CarrierPreferenceName AS Name
    FROM CarrierPreferences
    WHERE IsActive = 1
    ORDER BY CarrierPreferenceID
  `);

  return result.recordset;
}

async function ensureLookupData(pool) {
  console.log("Seeding Lookup Tables (Carriers, PackingRequirements, CarrierPreferences)...");

  const carrierExists = await pool.request().query(`
    SELECT COUNT(*) as count FROM Carriers
  `);
  
  if (carrierExists.recordset[0].count === 0) {
    await pool.request().query(`
      INSERT INTO Carriers (CarrierName, CarrierCode, IsActive, IsDeleted, CreatedBy, UpdatedBy, CreatedDate, UpdatedDate) VALUES
      ('DHL Express', 'DHL', 1, 0, 1, 1, GETDATE(), GETDATE()),
      ('FedEx', 'FEDEX', 1, 0, 1, 1, GETDATE(), GETDATE()),
      ('UPS', 'UPS', 1, 0, 1, 1, GETDATE(), GETDATE()),
      ('Blue Dart', 'BLUEDART', 1, 0, 1, 1, GETDATE(), GETDATE()),
      ('Delhivery', 'DELHIVERY', 1, 0, 1, 1, GETDATE(), GETDATE())
    `);
    console.log(" -> Carriers seed data inserted");
  }

  const packingReqExists = await pool.request().query(`
    SELECT COUNT(*) as count FROM PackingRequirements
  `);
  
  if (packingReqExists.recordset[0].count === 0) {
    await pool.request().query(`
      INSERT INTO PackingRequirements (PackingRequirementName, IsActive) VALUES
      ('Primary Packaging', 1),
      ('Secondary Packaging', 1),
      ('Tertiary Packaging', 1)
    `);
    console.log(" -> PackingRequirements seed data inserted");
  }

  const carrierPrefExists = await pool.request().query(`
    SELECT COUNT(*) as count FROM CarrierPreferences
  `);
  
  if (carrierPrefExists.recordset[0].count === 0) {
    await pool.request().query(`
      INSERT INTO CarrierPreferences (CarrierPreferenceName, IsActive) VALUES
      ('GDP-Certified Carrier', 1),
      ('Specialized Equipment', 1)
    `);
    console.log(" -> CarrierPreferences seed data inserted");
  }

  console.log("Lookup Tables seeding complete.");
}

module.exports = {
  getPackingRequirements,
  getCarrierPreferences,
  ensureLookupData,
};
