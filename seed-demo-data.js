#!/usr/bin/env node

/**
 * ============================================================================
 * PHARMACEUTICAL DEMO DATA SEEDING SCRIPT
 * ============================================================================
 * 
 * Purpose: Create realistic pharmaceutical industry demo data
 * Use case: Demonstrations, testing, training
 * 
 * What it does:
 *   1. Clears existing data (keeps admin user + system lookups)
 *   2. Seeds pharmaceutical industry demo data:
 *      - Global locations (US, EU, Asia)
 *      - Pharma vendors (finished goods manufacturers)
 *      - Warehouse infrastructure (bins, compartments, stacks)
 *      - Brands, Product Types, UOMs
 *      - Products (tablets, syrups, injections, capsules)
 *      - Product-Bin relationships
 * 
 * Usage:
 *   npm run seed:demo
 *   OR
 *   node seed-demo-data.js
 * 
 * WARNING: This will DELETE existing master data!
 * ============================================================================
 */

const dbPool = require("./database/db");
const sql = require("mssql");

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function separator() {
  log('='.repeat(70), colors.blue);
}

// Demo data structure
const demoData = {
  countries: [
    { name: 'United States', code: 'US', isdCode: '+1', currency: 'USD' },
    { name: 'Germany', code: 'DE', isdCode: '+49', currency: 'EUR' },
    { name: 'India', code: 'IN', isdCode: '+91', currency: 'INR' },
    { name: 'China', code: 'CN', isdCode: '+86', currency: 'CNY' },
    { name: 'United Kingdom', code: 'GB', isdCode: '+44', currency: 'GBP' },
  ],

  states: [
    // US States
    { name: 'New Jersey', code: 'NJ', country: 'US', tin: 'USNJTIN001' },
    { name: 'California', code: 'CA', country: 'US', tin: 'USCATIN002' },
    // German States
    { name: 'Bavaria', code: 'BY', country: 'DE', tin: 'DEBYTIN001' },
    { name: 'Hesse', code: 'HE', country: 'DE', tin: 'DEHETIN002' },
    // Indian States
    { name: 'Maharashtra', code: 'MH', country: 'IN', tin: 'INMHTIN001' },
    { name: 'Karnataka', code: 'KA', country: 'IN', tin: 'INKATIN002' },
    { name: 'Gujarat', code: 'GJ', country: 'IN', tin: 'INGJTIN003' },
    // Chinese Provinces
    { name: 'Shanghai', code: 'SH', country: 'CN', tin: 'CNSHTIN001' },
    { name: 'Beijing', code: 'BJ', country: 'CN', tin: 'CNBJTIN002' },
    // UK
    { name: 'England', code: 'ENG', country: 'GB', tin: 'GBENGTIN001' },
  ],

  cities: [
    // US Cities
    { name: 'Princeton', code: 'PRI', state: 'NJ' },
    { name: 'Bridgewater', code: 'BRW', state: 'NJ' },
    { name: 'San Francisco', code: 'SFO', state: 'CA' },
    { name: 'Los Angeles', code: 'LAX', state: 'CA' },
    // German Cities
    { name: 'Munich', code: 'MUC', state: 'BY' },
    { name: 'Frankfurt', code: 'FRA', state: 'HE' },
    // Indian Cities
    { name: 'Mumbai', code: 'BOM', state: 'MH' },
    { name: 'Pune', code: 'PNQ', state: 'MH' },
    { name: 'Bangalore', code: 'BLR', state: 'KA' },
    { name: 'Ahmedabad', code: 'AMD', state: 'GJ' },
    // Chinese Cities
    { name: 'Shanghai City', code: 'SHA', state: 'SH' },
    { name: 'Beijing City', code: 'BEI', state: 'BJ' },
    // UK Cities
    { name: 'London', code: 'LON', state: 'ENG' },
    { name: 'Manchester', code: 'MAN', state: 'ENG' },
  ],

  zones: [
    { name: 'North America - East', code: 'NA-EAST', country: 'US' },
    { name: 'North America - West', code: 'NA-WEST', country: 'US' },
    { name: 'Europe - Central', code: 'EU-CENTRAL', country: 'DE' },
    { name: 'Europe - West', code: 'EU-WEST', country: 'GB' },
    { name: 'Asia - South', code: 'ASIA-SOUTH', country: 'IN' },
    { name: 'Asia - East', code: 'ASIA-EAST', country: 'CN' },
  ],

  branches: [
    { name: 'US East Coast Distribution', code: 'USEC-DC', country: 'US', state: 'NJ', city: 'Princeton', zone: 'NA-EAST' },
    { name: 'US West Coast Distribution', code: 'USWC-DC', country: 'US', state: 'CA', city: 'San Francisco', zone: 'NA-WEST' },
    { name: 'Germany Central Hub', code: 'DE-CENTRAL', country: 'DE', state: 'HE', city: 'Frankfurt', zone: 'EU-CENTRAL' },
    { name: 'UK Distribution Center', code: 'UK-DC', country: 'GB', state: 'ENG', city: 'London', zone: 'EU-WEST' },
    { name: 'India West Region', code: 'IN-WEST', country: 'IN', state: 'MH', city: 'Mumbai', zone: 'ASIA-SOUTH' },
    { name: 'India South Region', code: 'IN-SOUTH', country: 'IN', state: 'KA', city: 'Bangalore', zone: 'ASIA-SOUTH' },
    { name: 'China East Hub', code: 'CN-EAST', country: 'CN', state: 'SH', city: 'Shanghai City', zone: 'ASIA-EAST' },
  ],

  warehouses: [
    { name: 'Princeton Pharma Warehouse', code: 'PPW-001', branch: 'USEC-DC', type: 'Cold Storage Warehouse' },
    { name: 'SF Medical Storage', code: 'SFMS-001', branch: 'USWC-DC', type: 'General Warehouse' },
    { name: 'Frankfurt Pharma Hub', code: 'FPH-001', branch: 'DE-CENTRAL', type: 'Cold Storage Warehouse' },
    { name: 'London Medical Depot', code: 'LMD-001', branch: 'UK-DC', type: 'General Warehouse' },
    { name: 'Mumbai Pharma Complex', code: 'MPC-001', branch: 'IN-WEST', type: 'Cold Storage Warehouse' },
    { name: 'Bangalore Distribution Center', code: 'BDC-001', branch: 'IN-SOUTH', type: 'General Warehouse' },
    { name: 'Shanghai Medical Storage', code: 'SMS-001', branch: 'CN-EAST', type: 'Cold Storage Warehouse' },
  ],

  vendors: [
    { 
      name: 'MediPharm Manufacturing Inc',
      code: 'VEN-001',
      contact: 'John Mitchell',
      phone: '+1-732-555-0101',
      email: 'procurement@medipharm.com',
      address1: '125 Pharma Drive',
      address2: 'Suite 300',
      country: 'US',
      state: 'NJ',
      city: 'Princeton',
      zone: 'NA-EAST',
      gstin: null
    },
    {
      name: 'GlobalMed Pharmaceuticals',
      code: 'VEN-002',
      contact: 'Sarah Chen',
      phone: '+1-415-555-0202',
      email: 'orders@globalmed.com',
      address1: '5000 Medical Plaza',
      address2: 'Tower B',
      country: 'US',
      state: 'CA',
      city: 'San Francisco',
      zone: 'NA-WEST',
      gstin: null
    },
    {
      name: 'EuroPharma GmbH',
      code: 'VEN-003',
      contact: 'Klaus Schmidt',
      phone: '+49-69-555-0303',
      email: 'supply@europharma.de',
      address1: 'Industriestrasse 45',
      address2: null,
      country: 'DE',
      state: 'HE',
      city: 'Frankfurt',
      zone: 'EU-CENTRAL',
      gstin: null
    },
    {
      name: 'BritMed Pharmaceuticals Ltd',
      code: 'VEN-004',
      contact: 'James Williams',
      phone: '+44-20-555-0404',
      email: 'procurement@britmed.co.uk',
      address1: '88 Thames Street',
      address2: 'Floor 12',
      country: 'GB',
      state: 'ENG',
      city: 'London',
      zone: 'EU-WEST',
      gstin: null
    },
    {
      name: 'Sun Pharmaceutical Industries',
      code: 'VEN-005',
      contact: 'Rajesh Kumar',
      phone: '+91-22-555-0505',
      email: 'vendor@sunpharma.in',
      address1: 'Acme Plaza, Andheri East',
      address2: null,
      country: 'IN',
      state: 'MH',
      city: 'Mumbai',
      zone: 'ASIA-SOUTH',
      gstin: '27AABCS1234F1Z5'
    },
    {
      name: 'Biocon Limited',
      code: 'VEN-006',
      contact: 'Priya Sharma',
      phone: '+91-80-555-0606',
      email: 'supply@biocon.com',
      address1: 'Biocon House, Electronic City',
      address2: 'Phase II',
      country: 'IN',
      state: 'KA',
      city: 'Bangalore',
      zone: 'ASIA-SOUTH',
      gstin: '29AABCS5678G1Z3'
    },
    {
      name: 'Shanghai Pharma Group',
      code: 'VEN-007',
      contact: 'Li Wei',
      phone: '+86-21-555-0707',
      email: 'export@shanghipharma.cn',
      address1: '1000 Pudong Avenue',
      address2: null,
      country: 'CN',
      state: 'SH',
      city: 'Shanghai City',
      zone: 'ASIA-EAST',
      gstin: null
    },
  ],

  compartments: [
    { name: 'Zone A - Refrigerated', code: 'COMP-A-R', warehouse: 'PPW-001', tempMin: 2, tempMax: 8 },
    { name: 'Zone B - Ambient', code: 'COMP-B-A', warehouse: 'PPW-001', tempMin: 15, tempMax: 25 },
    { name: 'Zone C - Controlled', code: 'COMP-C-C', warehouse: 'PPW-001', tempMin: 20, tempMax: 25 },
    { name: 'General Storage A', code: 'COMP-GS-A', warehouse: 'SFMS-001', tempMin: 15, tempMax: 30 },
    { name: 'General Storage B', code: 'COMP-GS-B', warehouse: 'SFMS-001', tempMin: 15, tempMax: 30 },
    { name: 'Cold Zone 1', code: 'COMP-CZ-1', warehouse: 'FPH-001', tempMin: 2, tempMax: 8 },
    { name: 'Cold Zone 2', code: 'COMP-CZ-2', warehouse: 'MPC-001', tempMin: 2, tempMax: 8 },
    { name: 'Ambient Zone', code: 'COMP-AZ-1', warehouse: 'BDC-001', tempMin: 20, tempMax: 25 },
  ],

  stacks: [
    { name: 'Stack A1', code: 'STK-A1', compartment: 'COMP-A-R' },
    { name: 'Stack A2', code: 'STK-A2', compartment: 'COMP-A-R' },
    { name: 'Stack B1', code: 'STK-B1', compartment: 'COMP-B-A' },
    { name: 'Stack B2', code: 'STK-B2', compartment: 'COMP-B-A' },
    { name: 'Stack C1', code: 'STK-C1', compartment: 'COMP-C-C' },
    { name: 'Stack GS-A1', code: 'STK-GSA1', compartment: 'COMP-GS-A' },
    { name: 'Stack GS-A2', code: 'STK-GSA2', compartment: 'COMP-GS-A' },
    { name: 'Stack GS-B1', code: 'STK-GSB1', compartment: 'COMP-GS-B' },
    { name: 'Stack CZ1-1', code: 'STK-CZ11', compartment: 'COMP-CZ-1' },
    { name: 'Stack CZ2-1', code: 'STK-CZ21', compartment: 'COMP-CZ-2' },
  ],

  bins: [
    { name: 'Bin A1-001', code: 'BIN-A1-001', stack: 'STK-A1', capacity: 1000 },
    { name: 'Bin A1-002', code: 'BIN-A1-002', stack: 'STK-A1', capacity: 1000 },
    { name: 'Bin A1-003', code: 'BIN-A1-003', stack: 'STK-A1', capacity: 1000 },
    { name: 'Bin A2-001', code: 'BIN-A2-001', stack: 'STK-A2', capacity: 1500 },
    { name: 'Bin A2-002', code: 'BIN-A2-002', stack: 'STK-A2', capacity: 1500 },
    { name: 'Bin B1-001', code: 'BIN-B1-001', stack: 'STK-B1', capacity: 2000 },
    { name: 'Bin B1-002', code: 'BIN-B1-002', stack: 'STK-B1', capacity: 2000 },
    { name: 'Bin B1-003', code: 'BIN-B1-003', stack: 'STK-B1', capacity: 2000 },
    { name: 'Bin B2-001', code: 'BIN-B2-001', stack: 'STK-B2', capacity: 2500 },
    { name: 'Bin B2-002', code: 'BIN-B2-002', stack: 'STK-B2', capacity: 2500 },
    { name: 'Bin C1-001', code: 'BIN-C1-001', stack: 'STK-C1', capacity: 1800 },
    { name: 'Bin C1-002', code: 'BIN-C1-002', stack: 'STK-C1', capacity: 1800 },
    { name: 'Bin GSA1-001', code: 'BIN-GSA1-001', stack: 'STK-GSA1', capacity: 3000 },
    { name: 'Bin GSA1-002', code: 'BIN-GSA1-002', stack: 'STK-GSA1', capacity: 3000 },
    { name: 'Bin GSA2-001', code: 'BIN-GSA2-001', stack: 'STK-GSA2', capacity: 3000 },
    { name: 'Bin GSA2-002', code: 'BIN-GSA2-002', stack: 'STK-GSA2', capacity: 3000 },
    { name: 'Bin GSB1-001', code: 'BIN-GSB1-001', stack: 'STK-GSB1', capacity: 2800 },
    { name: 'Bin GSB1-002', code: 'BIN-GSB1-002', stack: 'STK-GSB1', capacity: 2800 },
    { name: 'Bin CZ11-001', code: 'BIN-CZ11-001', stack: 'STK-CZ11', capacity: 1200 },
    { name: 'Bin CZ11-002', code: 'BIN-CZ11-002', stack: 'STK-CZ11', capacity: 1200 },
    { name: 'Bin CZ21-001', code: 'BIN-CZ21-001', stack: 'STK-CZ21', capacity: 1500 },
    { name: 'Bin CZ21-002', code: 'BIN-CZ21-002', stack: 'STK-CZ21', capacity: 1500 },
  ],

  brands: [
    { name: 'MediCare', code: 'BRD-001', mainBrand: 'MediCare' },
    { name: 'HealthPlus', code: 'BRD-002', mainBrand: 'HealthPlus' },
    { name: 'VitaLife', code: 'BRD-003', mainBrand: 'VitaLife' },
    { name: 'PharmaCure', code: 'BRD-004', mainBrand: 'PharmaCure' },
    { name: 'WellBeing', code: 'BRD-005', mainBrand: 'WellBeing' },
  ],

  productTypes: [
    { name: 'Tablet', description: 'Solid oral dosage form', color: 'White', colorCode: '#FFFFFF' },
    { name: 'Capsule', description: 'Gelatin-coated dosage form', color: 'Blue', colorCode: '#3B82F6' },
    { name: 'Syrup', description: 'Liquid oral dosage form', color: 'Red', colorCode: '#EF4444' },
    { name: 'Injection', description: 'Injectable solution', color: 'Green', colorCode: '#10B981' },
    { name: 'Ointment', description: 'Topical application', color: 'Yellow', colorCode: '#F59E0B' },
    { name: 'Drops', description: 'Liquid drops', color: 'Cyan', colorCode: '#06B6D4' },
  ],

  uoms: [
    { code: 'BOX', name: 'Box', description: 'Box of units' },
    { code: 'STRIP', name: 'Strip', description: 'Strip of tablets/capsules' },
    { code: 'BOTTLE', name: 'Bottle', description: 'Bottle container' },
    { code: 'VIAL', name: 'Vial', description: 'Glass vial' },
    { code: 'TUBE', name: 'Tube', description: 'Tube container' },
    { code: 'PACK', name: 'Pack', description: 'Package unit' },
  ],

  products: [
    { 
      code: 'PROD-001', 
      name: 'Paracetamol 500mg Tablet', 
      brand: 'MediCare', 
      productType: 'Tablet', 
      uom: 'STRIP',
      netWeight: 5.0,
      grossWeight: 6.0,
      shelfLifeDays: 730,
      nearExpiryDays: 90,
      length: 10.0,
      breadth: 5.0,
      height: 1.0,
      minimumQty: 100,
      reorderLevelQty: 500,
      category: 'Antipyretic',
      hsnCode: '30049099',
      isHazmat: false
    },
    { 
      code: 'PROD-002', 
      name: 'Amoxicillin 250mg Capsule', 
      brand: 'PharmaCure', 
      productType: 'Capsule', 
      uom: 'STRIP',
      netWeight: 8.0,
      grossWeight: 9.5,
      shelfLifeDays: 1095,
      nearExpiryDays: 180,
      length: 12.0,
      breadth: 6.0,
      height: 1.5,
      minimumQty: 50,
      reorderLevelQty: 250,
      category: 'Antibiotic',
      hsnCode: '30042000',
      isHazmat: false
    },
    { 
      code: 'PROD-003', 
      name: 'Cough Syrup 100ml', 
      brand: 'HealthPlus', 
      productType: 'Syrup', 
      uom: 'BOTTLE',
      netWeight: 120.0,
      grossWeight: 150.0,
      shelfLifeDays: 730,
      nearExpiryDays: 90,
      length: 5.0,
      breadth: 5.0,
      height: 12.0,
      minimumQty: 200,
      reorderLevelQty: 1000,
      category: 'Cough & Cold',
      hsnCode: '30049011',
      isHazmat: false
    },
    { 
      code: 'PROD-004', 
      name: 'Insulin Injection 10ml', 
      brand: 'VitaLife', 
      productType: 'Injection', 
      uom: 'VIAL',
      netWeight: 15.0,
      grossWeight: 20.0,
      shelfLifeDays: 730,
      nearExpiryDays: 180,
      length: 3.0,
      breadth: 3.0,
      height: 8.0,
      minimumQty: 20,
      reorderLevelQty: 100,
      category: 'Antidiabetic',
      hsnCode: '30043100',
      isHazmat: false
    },
    { 
      code: 'PROD-005', 
      name: 'Ibuprofen 400mg Tablet', 
      brand: 'MediCare', 
      productType: 'Tablet', 
      uom: 'STRIP',
      netWeight: 6.0,
      grossWeight: 7.0,
      shelfLifeDays: 1095,
      nearExpiryDays: 180,
      length: 10.0,
      breadth: 5.0,
      height: 1.0,
      minimumQty: 150,
      reorderLevelQty: 750,
      category: 'Anti-inflammatory',
      hsnCode: '30049099',
      isHazmat: false
    },
    { 
      code: 'PROD-006', 
      name: 'Vitamin C 500mg Capsule', 
      brand: 'WellBeing', 
      productType: 'Capsule', 
      uom: 'BOTTLE',
      netWeight: 50.0,
      grossWeight: 65.0,
      shelfLifeDays: 730,
      nearExpiryDays: 90,
      length: 6.0,
      breadth: 6.0,
      height: 10.0,
      minimumQty: 100,
      reorderLevelQty: 500,
      category: 'Vitamin Supplement',
      hsnCode: '30049070',
      isHazmat: false
    },
    { 
      code: 'PROD-007', 
      name: 'Antiseptic Ointment 25g', 
      brand: 'PharmaCure', 
      productType: 'Ointment', 
      uom: 'TUBE',
      netWeight: 25.0,
      grossWeight: 30.0,
      shelfLifeDays: 1095,
      nearExpiryDays: 180,
      length: 12.0,
      breadth: 3.0,
      height: 3.0,
      minimumQty: 200,
      reorderLevelQty: 1000,
      category: 'Topical',
      hsnCode: '30049060',
      isHazmat: false
    },
    { 
      code: 'PROD-008', 
      name: 'Eye Drops 10ml', 
      brand: 'HealthPlus', 
      productType: 'Drops', 
      uom: 'BOTTLE',
      netWeight: 12.0,
      grossWeight: 18.0,
      shelfLifeDays: 730,
      nearExpiryDays: 90,
      length: 3.0,
      breadth: 3.0,
      height: 7.0,
      minimumQty: 50,
      reorderLevelQty: 250,
      category: 'Ophthalmic',
      hsnCode: '30049040',
      isHazmat: false
    },
    { 
      code: 'PROD-009', 
      name: 'Azithromycin 500mg Tablet', 
      brand: 'PharmaCure', 
      productType: 'Tablet', 
      uom: 'STRIP',
      netWeight: 7.0,
      grossWeight: 8.5,
      shelfLifeDays: 1095,
      nearExpiryDays: 180,
      length: 10.0,
      breadth: 5.0,
      height: 1.0,
      minimumQty: 50,
      reorderLevelQty: 300,
      category: 'Antibiotic',
      hsnCode: '30042000',
      isHazmat: false
    },
    { 
      code: 'PROD-010', 
      name: 'Multivitamin Syrup 200ml', 
      brand: 'WellBeing', 
      productType: 'Syrup', 
      uom: 'BOTTLE',
      netWeight: 220.0,
      grossWeight: 260.0,
      shelfLifeDays: 730,
      nearExpiryDays: 90,
      length: 6.0,
      breadth: 6.0,
      height: 15.0,
      minimumQty: 100,
      reorderLevelQty: 500,
      category: 'Vitamin Supplement',
      hsnCode: '30049070',
      isHazmat: false
    },
    { 
      code: 'PROD-011', 
      name: 'Omeprazole 20mg Capsule', 
      brand: 'MediCare', 
      productType: 'Capsule', 
      uom: 'STRIP',
      netWeight: 6.5,
      grossWeight: 7.5,
      shelfLifeDays: 1095,
      nearExpiryDays: 180,
      length: 10.0,
      breadth: 5.0,
      height: 1.5,
      minimumQty: 100,
      reorderLevelQty: 500,
      category: 'Antacid',
      hsnCode: '30049050',
      isHazmat: false
    },
    { 
      code: 'PROD-012', 
      name: 'Cetirizine 10mg Tablet', 
      brand: 'HealthPlus', 
      productType: 'Tablet', 
      uom: 'STRIP',
      netWeight: 5.5,
      grossWeight: 6.5,
      shelfLifeDays: 1095,
      nearExpiryDays: 180,
      length: 10.0,
      breadth: 5.0,
      height: 1.0,
      minimumQty: 150,
      reorderLevelQty: 750,
      category: 'Antihistamine',
      hsnCode: '30049099',
      isHazmat: false
    },
  ],
};

async function clearExistingData(pool) {
  log('\n🗑️  Clearing existing data...', colors.yellow);
  
  const tables = [
    'BinProducts',
    'Products',
    'Bins',
    'Stacks',
    'Compartments',
    'Warehouses',
    'Branches',
    'Zones',
    'Vendors',
    'Cities',
    'States',
    'Countries',
    'Brands',
    'ProductTypes',
    'UOMs',
  ];

  for (const table of tables) {
    try {
      await pool.request().query(`DELETE FROM ${table} WHERE 1=1`);
      log(`  ✓ Cleared ${table}`, colors.green);
    } catch (err) {
      log(`  ⚠ Warning: Could not clear ${table}: ${err.message}`, colors.yellow);
    }
  }
}

async function seedCountries(pool) {
  log('\n🌍 Seeding Countries...', colors.blue);
  const countryMap = {};
  
  for (const country of demoData.countries) {
    try {
      const result = await pool.request()
        .input('CountryName', sql.NVarChar(100), country.name)
        .input('CountryCode', sql.NVarChar(10), country.code)
        .input('CountryISDCode', sql.NVarChar(10), country.isdCode)
        .input('CountryCurrency', sql.NVarChar(50), country.currency)
        .input('IsActive', sql.Bit, true)
        .input('UserID', sql.Int, 1)
        .query(`
          INSERT INTO Countries (CountryName, CountryCode, CountryISDCode, CountryCurrency, IsActive, CreatedBy, UpdatedBy)
          OUTPUT INSERTED.CountryID
          VALUES (@CountryName, @CountryCode, @CountryISDCode, @CountryCurrency, @IsActive, @UserID, @UserID)
        `);
      
      countryMap[country.code] = result.recordset[0].CountryID;
      log(`  ✓ ${country.name} (${country.code})`, colors.green);
    } catch (err) {
      log(`  ✗ Failed: ${country.name} - ${err.message}`, colors.red);
    }
  }
  
  return countryMap;
}

async function seedStates(pool, countryMap) {
  log('\n🗺️  Seeding States...', colors.blue);
  const stateMap = {};
  
  for (const state of demoData.states) {
    try {
      const countryID = countryMap[state.country];
      if (!countryID) continue;
      
      const result = await pool.request()
        .input('StateName', sql.NVarChar(100), state.name)
        .input('StateCode', sql.NVarChar(50), state.code)
        .input('TinNumber', sql.NVarChar(50), state.tin)
        .input('CountryID', sql.Int, countryID)
        .input('IsActive', sql.Bit, true)
        .input('UserID', sql.Int, 1)
        .query(`
          INSERT INTO States (StateName, StateCode, TinNumber, CountryID, IsActive, CreatedBy, UpdatedBy)
          OUTPUT INSERTED.StateID
          VALUES (@StateName, @StateCode, @TinNumber, @CountryID, @IsActive, @UserID, @UserID)
        `);
      
      stateMap[state.code] = result.recordset[0].StateID;
      log(`  ✓ ${state.name} (${state.code})`, colors.green);
    } catch (err) {
      log(`  ✗ Failed: ${state.name} - ${err.message}`, colors.red);
    }
  }
  
  return stateMap;
}

async function seedCities(pool, stateMap) {
  log('\n🏙️  Seeding Cities...', colors.blue);
  const cityMap = {};
  
  for (const city of demoData.cities) {
    try {
      const stateID = stateMap[city.state];
      if (!stateID) continue;
      
      const result = await pool.request()
        .input('CityName', sql.NVarChar(100), city.name)
        .input('CityCode', sql.NVarChar(50), city.code)
        .input('StateID', sql.Int, stateID)
        .input('IsActive', sql.Bit, true)
        .input('UserID', sql.Int, 1)
        .query(`
          INSERT INTO Cities (CityName, CityCode, StateID, IsActive, CreatedBy, UpdatedBy)
          OUTPUT INSERTED.CityID
          VALUES (@CityName, @CityCode, @StateID, @IsActive, @UserID, @UserID)
        `);
      
      cityMap[city.code] = result.recordset[0].CityID;
      log(`  ✓ ${city.name} (${city.code})`, colors.green);
    } catch (err) {
      log(`  ✗ Failed: ${city.name} - ${err.message}`, colors.red);
    }
  }
  
  return cityMap;
}

async function seedZones(pool, countryMap) {
  log('\n📍 Seeding Zones...', colors.blue);
  const zoneMap = {};
  
  for (const zone of demoData.zones) {
    try {
      const countryID = countryMap[zone.country];
      if (!countryID) continue;
      
      const result = await pool.request()
        .input('ZoneName', sql.NVarChar(100), zone.name)
        .input('ZoneCode', sql.NVarChar(50), zone.code)
        .input('CountryID', sql.Int, countryID)
        .input('IsActive', sql.Bit, true)
        .input('UserID', sql.Int, 1)
        .query(`
          INSERT INTO Zones (ZoneName, ZoneCode, CountryID, IsActive, CreatedBy, UpdatedBy)
          OUTPUT INSERTED.ZoneID
          VALUES (@ZoneName, @ZoneCode, @CountryID, @IsActive, @UserID, @UserID)
        `);
      
      zoneMap[zone.code] = result.recordset[0].ZoneID;
      log(`  ✓ ${zone.name} (${zone.code})`, colors.green);
    } catch (err) {
      log(`  ✗ Failed: ${zone.name} - ${err.message}`, colors.red);
    }
  }
  
  return zoneMap;
}

async function seedBranches(pool, countryMap, stateMap, cityMap, zoneMap) {
  log('\n🏢 Seeding Branches...', colors.blue);
  const branchMap = {};
  
  for (const branch of demoData.branches) {
    try {
      const countryID = countryMap[branch.country];
      const stateID = stateMap[branch.state];
      const cityID = cityMap[branch.city];
      const zoneID = zoneMap[branch.zone];
      
      if (!countryID || !stateID || !cityID || !zoneID) continue;
      
      const result = await pool.request()
        .input('BranchName', sql.NVarChar(100), branch.name)
        .input('BranchCode', sql.NVarChar(50), branch.code)
        .input('CountryID', sql.Int, countryID)
        .input('StateID', sql.Int, stateID)
        .input('CityID', sql.Int, cityID)
        .input('ZoneID', sql.Int, zoneID)
        .input('IsActive', sql.Bit, true)
        .input('UserID', sql.Int, 1)
        .query(`
          INSERT INTO Branches (BranchName, BranchCode, CountryID, StateID, CityID, ZoneID, IsActive, CreatedBy, UpdatedBy)
          OUTPUT INSERTED.BranchID
          VALUES (@BranchName, @BranchCode, @CountryID, @StateID, @CityID, @ZoneID, @IsActive, @UserID, @UserID)
        `);
      
      branchMap[branch.code] = result.recordset[0].BranchID;
      log(`  ✓ ${branch.name} (${branch.code})`, colors.green);
    } catch (err) {
      log(`  ✗ Failed: ${branch.name} - ${err.message}`, colors.red);
    }
  }
  
  return branchMap;
}

async function seedWarehouses(pool, branchMap) {
  log('\n🏭 Seeding Warehouses...', colors.blue);
  const warehouseMap = {};
  
  // Get warehouse type IDs
  const typeResult = await pool.request().query('SELECT WarehouseTypeID, WarehouseTypeName FROM WarehouseTypes');
  const typeMap = {};
  typeResult.recordset.forEach(t => { typeMap[t.WarehouseTypeName] = t.WarehouseTypeID; });
  
  for (const warehouse of demoData.warehouses) {
    try {
      const branchID = branchMap[warehouse.branch];
      const typeID = typeMap[warehouse.type];
      
      if (!branchID || !typeID) continue;
      
      const result = await pool.request()
        .input('WarehouseName', sql.NVarChar(100), warehouse.name)
        .input('WarehouseCode', sql.NVarChar(50), warehouse.code)
        .input('BranchID', sql.Int, branchID)
        .input('WarehouseTypeID', sql.Int, typeID)
        .input('IsActive', sql.Bit, true)
        .input('UserID', sql.Int, 1)
        .query(`
          INSERT INTO Warehouses (WarehouseName, WarehouseCode, BranchID, WarehouseTypeID, IsActive, CreatedBy, UpdatedBy)
          OUTPUT INSERTED.WarehouseID
          VALUES (@WarehouseName, @WarehouseCode, @BranchID, @WarehouseTypeID, @IsActive, @UserID, @UserID)
        `);
      
      warehouseMap[warehouse.code] = result.recordset[0].WarehouseID;
      log(`  ✓ ${warehouse.name} (${warehouse.code})`, colors.green);
    } catch (err) {
      log(`  ✗ Failed: ${warehouse.name} - ${err.message}`, colors.red);
    }
  }
  
  return warehouseMap;
}

async function seedVendors(pool, countryMap, stateMap, cityMap, zoneMap) {
  log('\n🏭 Seeding Pharmaceutical Vendors...', colors.blue);
  
  for (const vendor of demoData.vendors) {
    try {
      const countryID = countryMap[vendor.country];
      const stateID = stateMap[vendor.state];
      const cityID = cityMap[vendor.city];
      const zoneID = zoneMap[vendor.zone];
      
      if (!countryID || !stateID || !cityID) continue;
      
      await pool.request()
        .input('VendorName', sql.NVarChar(100), vendor.name)
        .input('VendorCode', sql.NVarChar(50), vendor.code)
        .input('ContactPerson', sql.NVarChar(100), vendor.contact)
        .input('VendorContactNumber', sql.NVarChar(50), vendor.phone)
        .input('EmailAddress', sql.NVarChar(100), vendor.email)
        .input('StreetAddress1', sql.NVarChar(255), vendor.address1)
        .input('StreetAddress2', sql.NVarChar(255), vendor.address2)
        .input('CountryID', sql.Int, countryID)
        .input('StateID', sql.Int, stateID)
        .input('CityID', sql.Int, cityID)
        .input('ZoneID', sql.Int, zoneID)
        .input('GSTIN', sql.NVarChar(15), vendor.gstin)
        .input('IsActive', sql.Bit, true)
        .input('UserID', sql.Int, 1)
        .query(`
          INSERT INTO Vendors (VendorName, VendorCode, ContactPerson, VendorContactNumber, EmailAddress,
                              StreetAddress1, StreetAddress2, CountryID, StateID, CityID, ZoneID, GSTIN,
                              IsActive, CreatedBy, UpdatedBy)
          VALUES (@VendorName, @VendorCode, @ContactPerson, @VendorContactNumber, @EmailAddress,
                  @StreetAddress1, @StreetAddress2, @CountryID, @StateID, @CityID, @ZoneID, @GSTIN,
                  @IsActive, @UserID, @UserID)
        `);
      
      log(`  ✓ ${vendor.name} (${vendor.code})`, colors.green);
    } catch (err) {
      log(`  ✗ Failed: ${vendor.name} - ${err.message}`, colors.red);
    }
  }
}

async function seedCompartments(pool, warehouseMap) {
  log('\n📦 Seeding Compartments...', colors.blue);
  const compartmentMap = {};
  
  for (const comp of demoData.compartments) {
    try {
      const warehouseID = warehouseMap[comp.warehouse];
      if (!warehouseID) continue;
      
      const result = await pool.request()
        .input('CompartmentName', sql.NVarChar(100), comp.name)
        .input('CompartmentCode', sql.NVarChar(50), comp.code)
        .input('WarehouseID', sql.Int, warehouseID)
        .input('TemperatureMin', sql.Decimal(5, 2), comp.tempMin)
        .input('TemperatureMax', sql.Decimal(5, 2), comp.tempMax)
        .input('IsActive', sql.Bit, true)
        .input('UserID', sql.Int, 1)
        .query(`
          INSERT INTO Compartments (CompartmentName, CompartmentCode, WarehouseID, TemperatureMin, TemperatureMax, IsActive, CreatedBy, UpdatedBy)
          OUTPUT INSERTED.CompartmentID
          VALUES (@CompartmentName, @CompartmentCode, @WarehouseID, @TemperatureMin, @TemperatureMax, @IsActive, @UserID, @UserID)
        `);
      
      compartmentMap[comp.code] = result.recordset[0].CompartmentID;
      log(`  ✓ ${comp.name} (${comp.code})`, colors.green);
    } catch (err) {
      log(`  ✗ Failed: ${comp.name} - ${err.message}`, colors.red);
    }
  }
  
  return compartmentMap;
}

async function seedStacks(pool, compartmentMap) {
  log('\n📚 Seeding Stacks...', colors.blue);
  const stackMap = {};
  
  for (const stack of demoData.stacks) {
    try {
      const compartmentID = compartmentMap[stack.compartment];
      if (!compartmentID) continue;
      
      const result = await pool.request()
        .input('StackName', sql.NVarChar(100), stack.name)
        .input('StackCode', sql.NVarChar(50), stack.code)
        .input('CompartmentID', sql.Int, compartmentID)
        .input('IsActive', sql.Bit, true)
        .input('UserID', sql.Int, 1)
        .query(`
          INSERT INTO Stacks (StackName, StackCode, CompartmentID, IsActive, CreatedBy, UpdatedBy)
          OUTPUT INSERTED.StackID
          VALUES (@StackName, @StackCode, @CompartmentID, @IsActive, @UserID, @UserID)
        `);
      
      stackMap[stack.code] = result.recordset[0].StackID;
      log(`  ✓ ${stack.name} (${stack.code})`, colors.green);
    } catch (err) {
      log(`  ✗ Failed: ${stack.name} - ${err.message}`, colors.red);
    }
  }
  
  return stackMap;
}

async function seedBins(pool, stackMap) {
  log('\n🗃️  Seeding Bins...', colors.blue);
  const binMap = {};
  
  for (const bin of demoData.bins) {
    try {
      const stackID = stackMap[bin.stack];
      if (!stackID) continue;
      
      const result = await pool.request()
        .input('BinName', sql.NVarChar(100), bin.name)
        .input('BinCode', sql.NVarChar(50), bin.code)
        .input('StackID', sql.Int, stackID)
        .input('Capacity', sql.Int, bin.capacity)
        .input('IsActive', sql.Bit, true)
        .input('UserID', sql.Int, 1)
        .query(`
          INSERT INTO Bins (BinName, BinCode, StackID, Capacity, IsActive, CreatedBy, UpdatedBy)
          OUTPUT INSERTED.BinID
          VALUES (@BinName, @BinCode, @StackID, @Capacity, @IsActive, @UserID, @UserID)
        `);
      
      binMap[bin.code] = result.recordset[0].BinID;
      log(`  ✓ ${bin.name} (${bin.code})`, colors.green);
    } catch (err) {
      log(`  ✗ Failed: ${bin.name} - ${err.message}`, colors.red);
    }
  }
  
  return binMap;
}

async function seedBrands(pool) {
  log('\n🏷️  Seeding Pharmaceutical Brands...', colors.blue);
  const brandMap = {};
  
  for (const brand of demoData.brands) {
    try {
      const result = await pool.request()
        .input('BrandCode', sql.NVarChar(50), brand.code)
        .input('BrandName', sql.NVarChar(100), brand.name)
        .input('MainBrand', sql.NVarChar(100), brand.mainBrand)
        .input('IsActive', sql.Bit, true)
        .input('UserID', sql.Int, 1)
        .query(`
          INSERT INTO Brands (BrandCode, BrandName, MainBrand, IsActive, CreatedBy, UpdatedBy)
          OUTPUT INSERTED.BrandID
          VALUES (@BrandCode, @BrandName, @MainBrand, @IsActive, @UserID, @UserID)
        `);
      
      brandMap[brand.name] = result.recordset[0].BrandID;
      log(`  ✓ ${brand.name} (${brand.code})`, colors.green);
    } catch (err) {
      log(`  ✗ Failed: ${brand.name} - ${err.message}`, colors.red);
    }
  }
  
  return brandMap;
}

async function seedProductTypes(pool) {
  log('\n💊 Seeding Product Types...', colors.blue);
  const productTypeMap = {};
  
  for (const prodType of demoData.productTypes) {
    try {
      const result = await pool.request()
        .input('ProductTypeName', sql.NVarChar(100), prodType.name)
        .input('ProductTypeDescription', sql.NVarChar(255), prodType.description)
        .input('ProductColor', sql.NVarChar(50), prodType.color)
        .input('ColorCode', sql.NVarChar(20), prodType.colorCode)
        .input('IsActive', sql.Bit, true)
        .input('UserID', sql.Int, 1)
        .query(`
          INSERT INTO ProductTypes (ProductTypeName, ProductTypeDescription, ProductColor, ColorCode, IsActive, CreatedBy, UpdatedBy)
          OUTPUT INSERTED.ProductTypeID
          VALUES (@ProductTypeName, @ProductTypeDescription, @ProductColor, @ColorCode, @IsActive, @UserID, @UserID)
        `);
      
      productTypeMap[prodType.name] = result.recordset[0].ProductTypeID;
      log(`  ✓ ${prodType.name}`, colors.green);
    } catch (err) {
      log(`  ✗ Failed: ${prodType.name} - ${err.message}`, colors.red);
    }
  }
  
  return productTypeMap;
}

async function seedUOMs(pool) {
  log('\n📏 Seeding UOMs...', colors.blue);
  const uomMap = {};
  
  for (const uom of demoData.uoms) {
    try {
      const result = await pool.request()
        .input('UOMCode', sql.NVarChar(50), uom.code)
        .input('UOMName', sql.NVarChar(100), uom.name)
        .input('UOMDescription', sql.NVarChar(255), uom.description)
        .input('IsActive', sql.Bit, true)
        .input('UserID', sql.Int, 1)
        .query(`
          INSERT INTO UOMs (UOMCode, UOMName, UOMDescription, IsActive, CreatedBy, UpdatedBy)
          OUTPUT INSERTED.UOMID
          VALUES (@UOMCode, @UOMName, @UOMDescription, @IsActive, @UserID, @UserID)
        `);
      
      uomMap[uom.code] = result.recordset[0].UOMID;
      log(`  ✓ ${uom.name} (${uom.code})`, colors.green);
    } catch (err) {
      log(`  ✗ Failed: ${uom.name} - ${err.message}`, colors.red);
    }
  }
  
  return uomMap;
}

async function seedProducts(pool, brandMap, productTypeMap, uomMap) {
  log('\n💊 Seeding Pharmaceutical Products...', colors.blue);
  const productMap = {};
  
  for (const product of demoData.products) {
    try {
      const brandID = brandMap[product.brand];
      const productTypeID = productTypeMap[product.productType];
      const uomID = uomMap[product.uom];
      
      if (!brandID || !productTypeID || !uomID) {
        log(`  ⚠ Skipping ${product.name} - missing dependencies`, colors.yellow);
        continue;
      }
      
      const result = await pool.request()
        .input('ProductCode', sql.NVarChar(50), product.code)
        .input('ProductName', sql.NVarChar(255), product.name)
        .input('BrandID', sql.Int, brandID)
        .input('ProductTypeID', sql.Int, productTypeID)
        .input('UOMID', sql.Int, uomID)
        .input('NetWeight', sql.Decimal(10, 2), product.netWeight)
        .input('GrossWeight', sql.Decimal(10, 2), product.grossWeight)
        .input('ShelfLifeDays', sql.Int, product.shelfLifeDays)
        .input('NearExpiryDays', sql.Int, product.nearExpiryDays)
        .input('Length', sql.Decimal(10, 2), product.length)
        .input('Breadth', sql.Decimal(10, 2), product.breadth)
        .input('Height', sql.Decimal(10, 2), product.height)
        .input('MinimumQty', sql.Decimal(10, 2), product.minimumQty)
        .input('ReorderLevelQty', sql.Decimal(10, 2), product.reorderLevelQty)
        .input('Category', sql.NVarChar(100), product.category)
        .input('HSNCode', sql.NVarChar(50), product.hsnCode)
        .input('IsHazmat', sql.Bit, product.isHazmat)
        .input('IsActive', sql.Bit, true)
        .input('UserID', sql.Int, 1)
        .query(`
          INSERT INTO Products (
            ProductCode, ProductName, BrandID, ProductTypeID, UOMID,
            NetWeight, GrossWeight, ShelfLifeDays, NearExpiryDays,
            Length, Breadth, Height, MinimumQty, ReorderLevelQty,
            Category, HSNCode, IsHazmat, IsActive, CreatedBy, UpdatedBy
          )
          OUTPUT INSERTED.ProductID
          VALUES (
            @ProductCode, @ProductName, @BrandID, @ProductTypeID, @UOMID,
            @NetWeight, @GrossWeight, @ShelfLifeDays, @NearExpiryDays,
            @Length, @Breadth, @Height, @MinimumQty, @ReorderLevelQty,
            @Category, @HSNCode, @IsHazmat, @IsActive, @UserID, @UserID
          )
        `);
      
      productMap[product.code] = result.recordset[0].ProductID;
      log(`  ✓ ${product.name} (${product.code})`, colors.green);
    } catch (err) {
      log(`  ✗ Failed: ${product.name} - ${err.message}`, colors.red);
    }
  }
  
  return productMap;
}

async function seedDemoData() {
  separator();
  log('  PHARMACEUTICAL DEMO DATA SEEDING', colors.bright + colors.magenta);
  separator();
  
  let pool;
  const startTime = Date.now();

  try {
    // Connect
    log('\n📡 Connecting to database...', colors.yellow);
    pool = await dbPool();
    log('✓ Database connection established', colors.green);

    // Clear existing data
    await clearExistingData(pool);

    // Seed in order (respecting foreign keys)
    const countryMap = await seedCountries(pool);
    const stateMap = await seedStates(pool, countryMap);
    const cityMap = await seedCities(pool, stateMap);
    const zoneMap = await seedZones(pool, countryMap);
    const branchMap = await seedBranches(pool, countryMap, stateMap, cityMap, zoneMap);
    const warehouseMap = await seedWarehouses(pool, branchMap);
    await seedVendors(pool, countryMap, stateMap, cityMap, zoneMap);
    const compartmentMap = await seedCompartments(pool, warehouseMap);
    const stackMap = await seedStacks(pool, compartmentMap);
    const binMap = await seedBins(pool, stackMap);
    
    // Seed product-related data
    const brandMap = await seedBrands(pool);
    const productTypeMap = await seedProductTypes(pool);
    const uomMap = await seedUOMs(pool);
    const productMap = await seedProducts(pool, brandMap, productTypeMap, uomMap);

    // Success summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    separator();
    log('\n🎉 DEMO DATA SEEDING COMPLETED!', colors.green + colors.bright);
    separator();
    log(`\n⏱️  Total time: ${duration}s`, colors.blue);
    log('\n📊 Data Summary:', colors.bright);
    log(`   ✓ ${Object.keys(countryMap).length} Countries (Global: US, DE, IN, CN, GB)`, colors.green);
    log(`   ✓ ${Object.keys(stateMap).length} States/Provinces`, colors.green);
    log(`   ✓ ${Object.keys(cityMap).length} Cities`, colors.green);
    log(`   ✓ ${Object.keys(zoneMap).length} Distribution Zones`, colors.green);
    log(`   ✓ ${Object.keys(branchMap).length} Branch Offices`, colors.green);
    log(`   ✓ ${Object.keys(warehouseMap).length} Pharmaceutical Warehouses`, colors.green);
    log(`   ✓ ${demoData.vendors.length} Pharma Vendors (Finished Goods)`, colors.green);
    log(`   ✓ ${Object.keys(compartmentMap).length} Storage Compartments`, colors.green);
    log(`   ✓ ${Object.keys(stackMap).length} Storage Stacks`, colors.green);
    log(`   ✓ ${Object.keys(binMap).length} Storage Bins`, colors.green);
    log(`   ✓ ${Object.keys(brandMap).length} Pharmaceutical Brands`, colors.green);
    log(`   ✓ ${Object.keys(productTypeMap).length} Product Types`, colors.green);
    log(`   ✓ ${Object.keys(uomMap).length} UOMs`, colors.green);
    log(`   ✓ ${Object.keys(productMap).length} Products`, colors.green);
    
    log('\n🚀 Your pharma demo is ready!', colors.yellow);
    log('   Start the application: npm start', colors.blue);
    separator();

    process.exit(0);
  } catch (error) {
    // Error handling
    separator();
    log('\n❌ DEMO DATA SEEDING FAILED', colors.red + colors.bright);
    separator();
    log(`\nError: ${error.message}`, colors.red);
    
    if (error.stack) {
      log('\nStack trace:', colors.red);
      log(error.stack, colors.reset);
    }
    
    separator();
    process.exit(1);
  }
}

// Run the seeding
seedDemoData();
