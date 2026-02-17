const sql = require("mssql");

/**
 * Creates an audit log entry for a specific action.
 * @param {object} pool - The database connection pool.
 * @param {object} logData - The data for the log entry.
 */
async function createLog(pool, logData) {
  try {
    // The check for the table's existence is now done at startup.
    const { userID, actionType, moduleName, referenceID, details } = logData;
    const logDetails = JSON.stringify(details);

    const query = `
            INSERT INTO AuditLogs (UserID, ActionType, ModuleName, ReferenceID, LogDetails)
            VALUES (@UserID, @ActionType, @ModuleName, @ReferenceID, @LogDetails)
        `;

    const request = pool
      .request()
      .input("UserID", sql.Int, userID)
      .input("ActionType", sql.NVarChar(100), actionType)
      .input("ModuleName", sql.NVarChar(50), moduleName)
      .input("ReferenceID", sql.NVarChar(100), String(referenceID))
      .input("LogDetails", sql.NVarChar(sql.MAX), logDetails);

    await request.query(query);
    console.log(
      `Log created: ${actionType} by UserID ${userID} for ${moduleName} ${referenceID}`
    );
  } catch (err) {
    console.error("CRITICAL: Failed to create audit log:", err.message);
  }
}

module.exports.createLog = createLog;
