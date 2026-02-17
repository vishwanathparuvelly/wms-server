const sql = require("mssql");
const { CustomError } = require("../model/CustomError");
const logService = require("./Log_Service");

const MODULE_NAME = "Gate";

async function getGate(pool, gateId) {
  try {
    if (!gateId || isNaN(parseInt(gateId))) {
      throw new CustomError("A valid numeric GateID is required.");
    }

    const query = `
        SELECT G.*, W.WarehouseName, U.UOMName, GT.GateTypeName,
               CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM Gates G
        LEFT JOIN Warehouses W ON G.WarehouseID = W.WarehouseID
        LEFT JOIN UOMs U ON G.UOMID = U.UOMID
        LEFT JOIN GateTypes GT ON G.GateTypeID = GT.GateTypeID
        LEFT JOIN Users CU ON G.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON G.UpdatedBy = UU.UserID
        WHERE G.GateID = @GateID AND G.IsDeleted = 0
    `;
    const request = pool.request().input("GateID", sql.Int, gateId);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new CustomError("No active Gate found with the given ID.");
    }
    return result.recordset[0];
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching Gate: ${err.message}`);
  }
}

async function getAllGates(pool, values) {
  try {
    const {
      page = 1,
      pageSize = 10,
      search = null,
      sortBy = "GateName",
      sortOrder = "asc",
    } = values;
    const offset = (page - 1) * pageSize;
    let request = pool.request();
    const whereClauses = ["G.IsDeleted = 0"];

    if (values.IsActive !== undefined) {
      whereClauses.push("G.IsActive = @IsActive");
      request.input("IsActive", sql.Bit, values.IsActive);
    }
    if (search) {
      whereClauses.push(
        "(G.GateName LIKE @Search OR W.WarehouseName LIKE @Search OR G.Direction LIKE @Search OR GT.GateTypeName LIKE @Search)"
      );
      request.input("Search", sql.NVarChar, `%${search}%`);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;
    const validSortColumns = [
      "GateName",
      "WarehouseName",
      "Direction",
      "GateTypeName",
    ];
    const safeSortBy = validSortColumns.includes(sortBy)
      ? `${
          sortBy.includes("Warehouse")
            ? "W"
            : sortBy.includes("GateType")
            ? "GT"
            : "G"
        }.${sortBy}`
      : "G.GateName";

    const countQuery = `SELECT COUNT(*) as total FROM Gates G LEFT JOIN Warehouses W ON G.WarehouseID = W.WarehouseID LEFT JOIN GateTypes GT ON G.GateTypeID = GT.GateTypeID ${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalItems = countResult.recordset[0].total;

    const query = `
        SELECT G.*, W.WarehouseName, U.UOMName, GT.GateTypeName,
               CU.UserName AS CreatedByUserName, UU.UserName AS UpdatedByUserName
        FROM Gates G
        LEFT JOIN Warehouses W ON G.WarehouseID = W.WarehouseID
        LEFT JOIN UOMs U ON G.UOMID = U.UOMID
        LEFT JOIN GateTypes GT ON G.GateTypeID = GT.GateTypeID
        LEFT JOIN Users CU ON G.CreatedBy = CU.UserID
        LEFT JOIN Users UU ON G.UpdatedBy = UU.UserID
        ${whereClause}
        ORDER BY ${safeSortBy} ${sortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
    `;
    const result = await request.query(query);
    return {
      data: result.recordset,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        pageSize,
      },
    };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error fetching all Gates: ${err.message}`);
  }
}

async function addGate(pool, values) {
  try {
    const {
      GateName,
      Height,
      Width,
      GateSequenceNumber,
      DistanceFromLeftCornerMeters,
      Direction,
      IsActive,
      user_id,
      WarehouseID,
      UOMID,
      GateTypeID,
    } = values;
    if (
      !GateName ||
      !Height ||
      !Width ||
      !GateSequenceNumber ||
      !DistanceFromLeftCornerMeters ||
      !Direction ||
      IsActive === undefined ||
      !user_id
    ) {
      throw new CustomError("All required Gate fields must be provided.");
    }
    const allowedDirections = ["North", "South", "East", "West"];
    if (!allowedDirections.includes(Direction)) {
      throw new CustomError(
        `Invalid Direction specified. Must be one of: ${allowedDirections.join(
          ", "
        )}.`
      );
    }

    const duplicateCheck = await pool
      .request()
      .input("Name", sql.NVarChar(100), GateName)
      .input("WarehouseID", sql.Int, WarehouseID || null)
      .query(
        "SELECT COUNT(*) as NameCount FROM Gates WHERE GateName = @Name AND (WarehouseID = @WarehouseID OR (@WarehouseID IS NULL AND WarehouseID IS NULL)) AND IsDeleted = 0"
      );
    if (duplicateCheck.recordset[0].NameCount > 0) {
      throw new CustomError(
        `A Gate with name '${GateName}' already exists in this warehouse.`
      );
    }

    const query = `
        DECLARE @OutputTable TABLE (GateID INT);
        INSERT INTO Gates (GateName, Height, Width, GateSequenceNumber, DistanceFromLeftCornerMeters, Direction, IsActive, CreatedBy, UpdatedBy, WarehouseID, UOMID, GateTypeID)
        OUTPUT INSERTED.GateID INTO @OutputTable
        VALUES (@GateName, @Height, @Width, @GateSequenceNumber, @DistanceFromLeftCornerMeters, @Direction, @IsActive, @UserID, @UserID, @WarehouseID, @UOMID, @GateTypeID);
        SELECT GateID FROM @OutputTable;
    `;
    const result = await pool
      .request()
      .input("GateName", sql.NVarChar(100), GateName)
      .input("Height", sql.Decimal(10, 2), Height)
      .input("Width", sql.Decimal(10, 2), Width)
      .input("GateSequenceNumber", sql.Int, GateSequenceNumber)
      .input(
        "DistanceFromLeftCornerMeters",
        sql.Decimal(10, 2),
        DistanceFromLeftCornerMeters
      )
      .input("Direction", sql.NVarChar(50), Direction)
      .input("IsActive", sql.Bit, IsActive)
      .input("UserID", sql.Int, user_id)
      .input("WarehouseID", sql.Int, WarehouseID || null)
      .input("UOMID", sql.Int, UOMID || null)
      .input("GateTypeID", sql.Int, GateTypeID || null)
      .query(query);
    const newId = result.recordset[0].GateID;

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "CREATE_GATE",
      moduleName: MODULE_NAME,
      referenceID: newId,
      details: { newData: values },
    });
    return getGate(pool, newId);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error adding new Gate: ${err.message}`);
  }
}

async function updateGate(pool, values) {
  try {
    const { GateID, ...updateData } = values;
    if (!GateID) throw new CustomError("GateID is required for update.");

    const {
      GateName,
      Height,
      Width,
      GateSequenceNumber,
      DistanceFromLeftCornerMeters,
      Direction,
      IsActive,
      user_id,
      WarehouseID,
      UOMID,
      GateTypeID,
    } = updateData;
    const original = await getGate(pool, GateID);

    const duplicateCheck = await pool
      .request()
      .input("Name", sql.NVarChar(100), GateName)
      .input("WarehouseID", sql.Int, WarehouseID || null)
      .input("ID", sql.Int, GateID)
      .query(
        "SELECT COUNT(*) as NameCount FROM Gates WHERE GateName = @Name AND (WarehouseID = @WarehouseID OR (@WarehouseID IS NULL AND WarehouseID IS NULL)) AND IsDeleted = 0 AND GateID != @ID"
      );
    if (duplicateCheck.recordset[0].NameCount > 0) {
      throw new CustomError(
        `A Gate with name '${GateName}' already exists in this warehouse.`
      );
    }

    const allowedDirections = ["North", "South", "East", "West"];
    if (!allowedDirections.includes(Direction)) {
      throw new CustomError(
        `Invalid Direction specified. Must be one of: ${allowedDirections.join(
          ", "
        )}.`
      );
    }
    const query = `
          UPDATE Gates SET
              GateName = @GateName, Height = @Height, Width = @Width, 
              GateSequenceNumber = @GateSequenceNumber, 
              DistanceFromLeftCornerMeters = @DistanceFromLeftCornerMeters, 
              Direction = @Direction, IsActive = @IsActive, UpdatedBy = @UpdatedBy, 
              UpdatedDate = GETDATE(), WarehouseID = @WarehouseID, UOMID = @UOMID, GateTypeID = @GateTypeID
          WHERE GateID = @ID;
      `;
    const updateRequest = pool
      .request()
      .input("ID", sql.Int, GateID)
      .input("GateName", sql.NVarChar(100), GateName)
      .input("Height", sql.Decimal(10, 2), Height)
      .input("Width", sql.Decimal(10, 2), Width)
      .input("GateSequenceNumber", sql.Int, GateSequenceNumber)
      .input(
        "DistanceFromLeftCornerMeters",
        sql.Decimal(10, 2),
        DistanceFromLeftCornerMeters
      )
      .input("Direction", sql.NVarChar(50), Direction)
      .input("IsActive", sql.Bit, IsActive)
      .input("UpdatedBy", sql.Int, user_id)
      .input("WarehouseID", sql.Int, WarehouseID || null)
      .input("UOMID", sql.Int, UOMID || null)
      .input("GateTypeID", sql.Int, GateTypeID || null);

    await updateRequest.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "UPDATE_GATE",
      moduleName: MODULE_NAME,
      referenceID: GateID,
      details: { oldData: original, newData: updateData },
    });

    return getGate(pool, GateID);
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error updating Gate: ${err.message}`);
  }
}

async function deleteGate(pool, values) {
  try {
    const { GateID, user_id } = values;
    if (!GateID) throw new CustomError("GateID is required for deletion.");
    const toDelete = await getGate(pool, GateID);

    const query = `
        UPDATE Gates SET IsDeleted = 1, IsActive = 0, UpdatedBy = @UpdatedBy, UpdatedDate = GETDATE()
        WHERE GateID = @ID;
    `;
    const request = pool
      .request()
      .input("UpdatedBy", sql.Int, user_id)
      .input("ID", sql.Int, GateID);
    await request.query(query);

    await logService.createLog(pool, {
      userID: user_id,
      actionType: "DELETE_GATE",
      moduleName: MODULE_NAME,
      referenceID: GateID,
      details: { deletedData: toDelete },
    });
    return { message: "Gate deleted successfully." };
  } catch (err) {
    if (err instanceof CustomError) throw err;
    throw new CustomError(`Error deleting Gate: ${err.message}`);
  }
}

async function getGatesLite(pool) {
  try {
    let query = `
        SELECT GateID, GateName 
        FROM Gates 
        WHERE IsDeleted = 0 AND IsActive = 1
        ORDER BY GateName
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    throw new CustomError(`Error fetching Gates list: ${err.message}`);
  }
}

module.exports = {
  getGate,
  getAllGates,
  addGate,
  updateGate,
  deleteGate,
  getGatesLite,
};
