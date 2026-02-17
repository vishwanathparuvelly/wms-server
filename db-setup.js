#!/usr/bin/env node

/**
 * ============================================================================
 * DATABASE SETUP & MIGRATION SCRIPT
 * ============================================================================
 * 
 * Purpose: One-time database initialization and migration
 * Run this script when:
 *   - Setting up a fresh database
 *   - Switching to a new database
 *   - After schema changes in DB_Schema_Service.js
 * 
 * What it does:
 *   1. Creates/updates all tables and columns
 *   2. Adds foreign key constraints
 *   3. Seeds initial data (admin user, lookups)
 * 
 * Usage:
 *   npm run db:setup
 *   OR
 *   node db-setup.js
 * 
 * ============================================================================
 */

const dbPool = require("./database/db");
const schemaService = require("./service/DB_Schema_Service");
const dataSeedingService = require("./service/DataSeeding_Service");

// ANSI color codes for better terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function separator() {
  log('='.repeat(70), colors.blue);
}

async function setupDatabase() {
  separator();
  log('  DATABASE SETUP & MIGRATION', colors.bright);
  separator();
  
  let pool;
  const startTime = Date.now();

  try {
    // Step 1: Connect to database
    log('\n📡 Connecting to database...', colors.yellow);
    pool = await dbPool();
    log('✓ Database connection established', colors.green);

    // Step 2: Sync schema (tables, columns, foreign keys)
    separator();
    log('\n🗂️  STEP 1: Schema Synchronization', colors.bright);
    separator();
    await schemaService.verifyAndSyncSchema(pool);
    log('\n✓ Schema synchronization complete', colors.green);

    // Step 3: Seed initial data
    separator();
    log('\n🌱 STEP 2: Data Seeding', colors.bright);
    separator();
    await dataSeedingService.seedInitialData(pool);
    log('\n✓ Data seeding complete', colors.green);

    // Success summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    separator();
    log('\n🎉 DATABASE SETUP COMPLETED SUCCESSFULLY!', colors.green + colors.bright);
    separator();
    log(`\n⏱️  Total time: ${duration}s`, colors.blue);
    log('\n📋 Summary:', colors.bright);
    log('   ✓ All tables created/updated', colors.green);
    log('   ✓ All foreign keys added', colors.green);
    log('   ✓ Admin user created (admin/admin@123)', colors.green);
    log('   ✓ Initial lookup data seeded', colors.green);
    log('\n🚀 You can now start your application:', colors.yellow);
    log('   npm start', colors.blue);
    separator();

    process.exit(0);
  } catch (error) {
    // Error handling
    separator();
    log('\n❌ DATABASE SETUP FAILED', colors.red + colors.bright);
    separator();
    log(`\nError: ${error.message}`, colors.red);
    
    if (error.stack) {
      log('\nStack trace:', colors.red);
      log(error.stack, colors.reset);
    }
    
    log('\n💡 Troubleshooting tips:', colors.yellow);
    log('   1. Check database connection settings in config/*.json', colors.reset);
    log('   2. Ensure SQL Server is running', colors.reset);
    log('   3. Verify database exists', colors.reset);
    log('   4. Check SQL Server login permissions', colors.reset);
    separator();

    process.exit(1);
  }
}

// Run the setup
setupDatabase();
