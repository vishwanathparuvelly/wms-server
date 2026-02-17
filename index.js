global.APP_ENV = process.env.NODE_ENV || "dev";
const config = require("config");
const express = require("express");
require("express-async-errors");
const cors = require("cors");
const fs = require("fs");
const yaml = require("js-yaml");
const swaggerUi = require("swagger-ui-express");

// --- Services and Validation ---
const validation = require("./validation");
const dbPool = require("./database/db");

// --- Routers ---
const mainApiRoutes = require("./routes/route");

const app = express();

// --- Top-level Middleware ---
app.use(cors());
app.use(express.json()); // CRITICAL: This MUST be at the top to parse the body for ALL routes.

// Simple request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// --- Server Startup Logic ---
const APP_NAME = config.get("server.name") || "Warehouse Inventory";
const PORT = config.get("server.port") || 7501;
let pool;

async function startServer() {
  try {
    pool = await dbPool();
    app.locals.dbPool = pool;
    
    app.listen(PORT, () => console.log(`${APP_NAME} running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}
startServer();

// --- Routes & Middleware ---
app.post("/api/Auth/login", validation.performLogin);
app.use(validation.verifyToken);
app.use(validation.validateUserId);

const routes = require("./routes/route");
app.use("/api", routes);

app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// --- Swagger Documentation Setup (remains unchanged) ---
const swaggerDocuments = {
  country: yaml.load(fs.readFileSync("./swagger/country.yaml", "utf8")),
  state: yaml.load(fs.readFileSync("./swagger/state.yaml", "utf8")),
  city: yaml.load(fs.readFileSync("./swagger/city.yaml", "utf8")),
  zone: yaml.load(fs.readFileSync("./swagger/zone.yaml", "utf8")),
  branch: yaml.load(fs.readFileSync("./swagger/branch.yaml", "utf8")),
  warehouse: yaml.load(fs.readFileSync("./swagger/warehouse.yaml", "utf8")),
  compartment: yaml.load(fs.readFileSync("./swagger/compartment.yaml", "utf8")),
  stack: yaml.load(fs.readFileSync("./swagger/stack.yaml", "utf8")),
  brand: yaml.load(fs.readFileSync("./swagger/brand.yaml", "utf8")),
  uom: yaml.load(fs.readFileSync("./swagger/uom.yaml", "utf8")),
  line: yaml.load(fs.readFileSync("./swagger/line.yaml", "utf8")),
  bin: yaml.load(fs.readFileSync("./swagger/bin.yaml", "utf8")), // <-- NEW SWAGGER ENTRY

  product_type: yaml.load(
    fs.readFileSync("./swagger/product_type.yaml", "utf8"),
  ),
  product_consume: yaml.load(
    fs.readFileSync("./swagger/product_consume.yaml", "utf8"),
  ),
  packaging_type: yaml.load(
    fs.readFileSync("./swagger/packaging_type.yaml", "utf8"),
  ),
  sloc: yaml.load(fs.readFileSync("./swagger/sloc.yaml", "utf8")),
  pallet_type: yaml.load(fs.readFileSync("./swagger/pallet_type.yaml", "utf8")),
  storage_type: yaml.load(
    fs.readFileSync("./swagger/storage_type.yaml", "utf8"),
  ),
  vehicle_type: yaml.load(
    fs.readFileSync("./swagger/vehicle_type.yaml", "utf8"),
  ),
  gate: yaml.load(fs.readFileSync("./swagger/gate.yaml", "utf8")),
  gate_type: yaml.load(fs.readFileSync("./swagger/gate_type.yaml", "utf8")),
  vendor: yaml.load(fs.readFileSync("./swagger/vendor.yaml", "utf8")), // <-- NEW SWAGGER ENTRY
};

const setupSwagger = (app, docs, path) =>
  app.use(path, swaggerUi.serveFiles(docs, {}), swaggerUi.setup(docs));

Object.keys(swaggerDocuments).forEach((key) => {
  const path = `/api-docs/master-${key.replace(/_/g, "-")}`;
  setupSwagger(app, swaggerDocuments[key], path);
});

app.get("/api-docs", (req, res) => {
  let links = "";
  Object.keys(swaggerDocuments).forEach((key) => {
    const path = `/api-docs/master-${key.replace(/_/g, "-")}`;
    const title = key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    links += `<li><a href="${path}">${title} API</a></li>`;
  });
  res.send(`<h1>API Documentation</h1><ul>${links}</ul>`);
});
