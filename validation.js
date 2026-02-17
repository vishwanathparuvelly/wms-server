const config = require("config");
const jwt = require("jsonwebtoken");
const sql = require("mssql");
const bcrypt = require("bcrypt");

const SECRET_KEY = config.jwt.SECRET_KEY;

async function performLogin(req, res) {
  try {
    let pool = req?.app?.locals?.dbPool;
    let values = req?.body;
    if (!pool) {
      return res.status(400).json({ error: "DB Pool not Initialize" });
    }

    // Accept both lowercase (username/password) and PascalCase (UserName/Password)
    const username = values?.UserName || values?.username;
    const password = values?.Password || values?.password;

    if (!username) {
      return res.status(400).json({ error: "UserName is required" });
    }
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    // Get user by username only
    let query = `SELECT * FROM Users WHERE UserName = @UserName`;
    let request = pool.request().input("UserName", sql.VarChar, username);
    let result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    let user = result?.recordset[0];

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.Password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    if (!user.IsActive) {
      return res.status(403).json({ error: "User is not active" });
    }

    let payload = {
      unique_name: user.UserName,
      aud: user.Email || "admin@wms.com",
      nbf: Math.floor(Date.now() / 1000),
      iat: Math.floor(Date.now() / 1000),
    };
    const options = {
      expiresIn: config.jwt.EXPIRATION_TIME,
      algorithm: config.jwt.ALGORITHM,
      issuer: config.jwt.ISSUER,
    };
    const token = jwt.sign(payload, SECRET_KEY, options);
    return res.status(200).json({
      token: {
        token: token,
        userID: String(user.UserID),
      },
    });
  } catch (e) {
    return res.status(400).json({ error: e?.message });
  }
}

/**
 * Verifies the JWT on incoming requests and attaches auth data.
 */
async function verifyToken(req, res, next) {
  try {
    let pool = req?.app?.locals?.dbPool;
    if (!pool) {
      return res.status(400).json({ error: "DB Pool not Initialize" });
    }
    if (global.APP_ENV == "dev") {
      let query = `SELECT * FROM Users WHERE UserName = 'admin'`;
      let request = pool.request();
      let result = await request.query(query);
      if (result.recordset.length === 0) {
        return res.status(401).json({ error: "Please check user details" });
      }
      let user = result.recordset[0];
      if (!user.IsActive) {
        return res.status(403).json({ error: "User is not active" });
      }
      req.user = user;
      req.body.user_id = String(user.UserID);
      next();
    } else {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>
      if (!token) {
        return res.status(401).json({ error: "Token missing" });
      }
      const decode = jwt.verify(token, SECRET_KEY, {
        algorithms: [config.jwt.ALGORITHM],
      });
      if (!decode) {
        return res.status(401).json({ error: "Token invalid" });
      }
      let query = `SELECT * FROM Users WHERE UserName = @UserName`;
      let request = pool
        .request()
        .input("UserName", sql.VarChar, decode?.unique_name);
      let result = await request.query(query);
      if (result.recordset.length === 0) {
        return res
          .status(401)
          .json({ error: "Token invalid, please check user details" });
      }
      let user = result.recordset[0];
      if (!user.IsActive) {
        return res.status(403).json({ error: "User is not active" });
      }
      req.user = user;
      req.body.user_id = String(user.UserID);
      next();
    }
  } catch (e) {
    return res.status(400).json({ error: e?.message });
  }
}

async function validateUserId(req, res, next) {
  const allowedMethods = ["POST", "PUT", "DELETE"];
  if (allowedMethods.includes(req.method)) {
    if (!req.body.user_id) {
      return res
        .status(400)
        .json({ error: "user_id is required in request body" });
    }
    if (isNaN(req.body.user_id)) {
      return res.status(400).json({ error: "user_id must be a number" });
    }
    if (req.body.user_id <= 0) {
      return res.status(400).json({ error: "user_id must be greater than 0" });
    }
    let pool = req?.app?.locals?.dbPool;
    let userId = req.body.user_id;
    if (!pool) {
      return res.status(400).json({ error: "DB Pool not Initialize" });
    }

    let query = `SELECT * FROM Users WHERE UserID = @UserID `;
    let request = pool.request().input("UserID", sql.Int, parseInt(userId));
    let result = await request.query(query);
    if (result.recordset.length === 0) {
      return res.status(400).json({ error: "user_id not found" });
    }
    let user = result.recordset[0];
    if (!user.IsActive) {
      return res.status(400).json({ error: "user_id is not active" });
    }
  }
  next();
}

module.exports.performLogin = performLogin;
module.exports.verifyToken = verifyToken;
module.exports.validateUserId = validateUserId;
