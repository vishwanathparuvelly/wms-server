const sql = require('mssql');
const { CustomError } = require('../model/CustomError');

const MODULE_NAME = 'Role';

async function getAllRoles(pool) {
    try {
        const query = `SELECT RoleID, RoleName, RoleDescription FROM Roles ORDER BY RoleName`;
        const result = await pool.request().query(query);
        return result.recordset;
    } catch (err) {
        throw new CustomError(`Error fetching all roles: ${err.message}`);
    }
}

module.exports = {
    getAllRoles
};