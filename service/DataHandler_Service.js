// service/DataHandler_Service.js

const csv = require("fast-csv");
const xlsx = require("xlsx");
const { Readable } = require("stream");
const { CustomError } = require("../model/CustomError");

/**
 * Generates a CSV string from an array of data based on a module configuration.
 * @param {object} config - The module-specific configuration object.
 * @param {Array<object>} data - The array of data to be exported.
 * @returns {Promise<string>} A promise that resolves with the CSV data as a string.
 */
async function exportToCsv(config, data) {
  if (!config) {
    throw new CustomError("Export failed: No configuration provided.");
  }
  if (!config.columns) {
    throw new CustomError(`Export failed: Configuration has no columns. Config keys: ${Object.keys(config).join(', ')}`);
  }
  if (!Array.isArray(data)) {
    throw new CustomError(`Export failed: Data is not an array. Type: ${typeof data}, Value: ${JSON.stringify(data)?.substring(0, 100)}`);
  }

  // Define headers based on the 'header' property in the config
  const headers = config.columns.map((col) => col.header);

  return new Promise((resolve, reject) => {
    const csvRows = [];
    const stream = csv.format({ headers, writeHeaders: true });

    stream.on("data", (chunk) => csvRows.push(chunk));
    stream.on("error", (err) =>
      reject(new CustomError(`Failed to generate CSV: ${err.message}`)),
    );
    stream.on("end", () => resolve(csvRows.join("")));

    data.forEach((row) => {
      const csvRow = {};
      // Map data to the correct header using the key-header mapping from config
      config.columns.forEach((col) => {
        // 1. Use the `exportKey` if it exists, otherwise fall back to the default `key`.
        const dataKey = col.exportKey || col.key;
        let value = row[dataKey];

        // 2. Add user-friendly formatting for boolean types.
        if (col.type === "boolean" && typeof value === "boolean") {
          value = value ? "Active" : "Inactive";
        }

        // 3. Ensure null or undefined values are written as empty strings.
        csvRow[col.header] = value !== null && value !== undefined ? value : "";
      });
      stream.write(csvRow);
    });

    stream.end();
  });
}

/**
 * Parses, validates, and imports data from a CSV file buffer.
 * @param {object} config - The module-specific configuration object.
 * @param {Buffer} fileBuffer - The buffer containing the uploaded CSV file.
 * @param {object} pool - The database connection pool.
 * @param {number} userId - The ID of the user performing the import.
 * @param {string} filename - The original filename (optional, for detecting Excel files).
 * @returns {Promise<object>} A promise that resolves with a report of the import process.
 */
// service/DataHandler_Service.js (REPLACE THIS ENTIRE FUNCTION)

async function importFromCsv(config, fileBuffer, pool, userId, filename) {
  const results = { successCount: 0, errorCount: 0, errors: [] };

  const rows = [];

  // Check if file is Excel based on extension
  const isExcel =
    filename && (filename.endsWith(".xlsx") || filename.endsWith(".xls"));

  if (isExcel) {
    // Parse Excel file
    try {
      const workbook = xlsx.read(fileBuffer, { type: "buffer" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = xlsx.utils.sheet_to_json(firstSheet, { raw: false });
      rows.push(...jsonData);
    } catch (error) {
      throw new CustomError(`Excel parsing error: ${error.message}`);
    }
  } else {
    // Parse CSV file
    await new Promise((resolve, reject) => {
      Readable.from(fileBuffer.toString("utf8"))
        .pipe(csv.parse({ headers: true, trim: true }))
        .on("error", (error) =>
          reject(new CustomError(`CSV parsing error: ${error.message}`)),
        )
        .on("data", (row) => rows.push(row))
        .on("end", () => resolve());
    });
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;
    try {
      const resolvedData = {};

      // Step 1: Resolve Dependencies
      for (const col of config.columns) {
        let augmentedHeader = col.header;
        if (col.required) augmentedHeader += " (REQUIRED)";
        else if (col.isOptional || !col.required)
          augmentedHeader += " (Optional)";

        const userValue = row[augmentedHeader];

        if (col.resolvesTo) {
          if (!userValue) {
            resolvedData[col.key] = null;
            continue;
          }
          const { tableName, idColumn, nameColumn } = col.resolvesTo;
          let query = `SELECT ${idColumn} FROM ${tableName} WHERE ${nameColumn} = @lookupValue AND IsDeleted = 0`;
          const request = pool.request();
          request.input("lookupValue", userValue);
          if (col.parent && resolvedData[col.parent]) {
            query += ` AND ${col.parent} = @parentValue`;
            request.input("parentValue", resolvedData[col.parent]);
          }
          const result = await request.query(query);
          if (result.recordset.length === 0) {
            let errorMsg = `Could not find a match for '${userValue}' in ${tableName}.`;
            if (col.parent) errorMsg += ` (within the specified parent)`;
            throw new Error(errorMsg);
          }
          resolvedData[col.key] = result.recordset[0][idColumn];
        } else if (col.key) {
          resolvedData[col.key] = userValue;
        }
      }

      // Step 2: Validate Data
      for (const col of config.columns) {
        const value = resolvedData[col.key];
        if (
          col.required &&
          (value === null || value === undefined || String(value).trim() === "")
        ) {
          throw new Error(`Missing required value for column '${col.header}'.`);
        }
        if (value != null) {
          if (col.type === "boolean")
            resolvedData[col.key] = ["true", "1", "yes", "active"].includes(
              String(value).toLowerCase(),
            );
          else if (col.type === "integer" && isNaN(parseInt(value, 10)))
            throw new Error(
              `Value for '${col.header}' must be a whole number.`,
            );
          else if (col.type === "decimal" && isNaN(parseFloat(value)))
            throw new Error(`Value for '${col.header}' must be a number.`);
        }
      }

      // Step 3: Insert Data
      const payload = { ...resolvedData, user_id: userId };

      // Correctly call the specific add function (e.g., 'addBrand', 'addCountry') from the service object.
      const functionName = config.addFunctionName;
      if (
        !config.service ||
        typeof config.service[functionName] !== "function"
      ) {
        throw new Error(
          `Configuration error: The function '${functionName}' was not found on the provided service for '${config.moduleName}'.`,
        );
      }
      await config.service[functionName](pool, payload);

      results.successCount++;
    } catch (err) {
      results.errorCount++;
      results.errors.push(`Row ${rowNumber}: ${err.message}`);
    }
  }
  return results;
}

/**
 * Generates a sample CSV string based on the configuration,
 * including guidance for required/optional fields.
 * @param {object} config - The module-specific configuration object.
 * @returns {Promise<string>} A promise that resolves with the CSV data as a string.
 */
async function generateSampleCsv(config) {
  if (!config || !config.columns) {
    throw new CustomError(
      "Invalid configuration provided for sample generation.",
      500,
    );
  }

  // Row 1: Headers (with Optional/Required distinction in the text)
  const headers = config.columns.map((col) => {
    // Augment header name to indicate if it's optional
    let headerText = col.header;
    if (col.required) {
      headerText += " (REQUIRED)";
    } else if (col.isOptional || !col.required) {
      // Assuming fields are optional if not explicitly required
      headerText += " (Optional)";
    }
    return headerText;
  });

  // Row 2: Example/Guidance row
  const guidanceRow = config.columns.map((col) => {
    if (col.required) {
      // Suggest a value for required fields, especially lookup values
      if (col.resolvesTo) {
        return `e.g., A valid ${col.header}`;
      }
      return `(Required value)`;
    } else {
      return `(Leave blank or use 'N/A')`;
    }
  });

  // The first array is the Header Row, the second is the Guidance Row
  const csvData = [headers, guidanceRow];

  return new Promise((resolve, reject) => {
    csv
      // Write the array of arrays (headers + guidance) to a CSV string
      .writeToString(csvData, { headers: false })
      .then((csvString) => resolve(csvString))
      .catch((err) =>
        reject(new CustomError(`Sample CSV Generation Error: ${err.message}`)),
      );
  });
}

module.exports = {
  exportToCsv,
  importFromCsv,
  generateSampleCsv,
};
