const sql = require("mssql");
const { CustomError } = require("../model/CustomError");

async function getAllWarehouseTypes(pool) {
  try {
    const query = `
            SELECT WarehouseTypeID, WarehouseTypeName, WarehouseTypeDescription 
            FROM WarehouseTypes 
            WHERE IsActive = 1 
            ORDER BY WarehouseTypeName
        `;
    const request = pool.request();
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching warehouse types: ${err.message}`);
  }
}

module.exports = { getAllWarehouseTypes };
