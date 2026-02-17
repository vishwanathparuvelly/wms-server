const sql = require("mssql");
const { CustomError } = require("../model/CustomError");

// This is a minimal service for the lookup table. Full CRUD can be added if a UI is built for it.
async function getGateTypesLite(pool) {
  try {
    let query = `
        SELECT GateTypeID, GateTypeName 
        FROM GateTypes 
        WHERE IsActive = 1
        ORDER BY GateTypeName
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching Gate Types list: ${err.message}`);
  }
}

module.exports = {
  getGateTypesLite,
};
