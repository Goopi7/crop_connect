/**
 * Crop Connect Startup Script
 * 
 * This script handles the proper initialization of the Crop Connect application,
 * ensuring database connections and server startup occur in the correct sequence.
 */

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  require('dotenv').config();
}

// Import required modules
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const path = require('path');

// Database configuration
const defaultDbName = process.env.DB_NAME || "cropconnect";
const db_url = process.env.ATLASDB_URL;

/**
 * Builds MongoDB connection URI with proper database name
 */
function buildMongoUri(rawUrl) {
  if (!rawUrl) {
    return `mongodb://127.0.0.1:27017/${defaultDbName}`;
  }
  const hasDbPath = /\/[^/?]+(\?|$)/.test(rawUrl.replace(/^mongodb\+srv:\/\//, "mongodb://"));
  if (hasDbPath) return rawUrl;
  return rawUrl.replace(/\/(\?|$)/, `/${defaultDbName}$1`);
}

const mongoUri = buildMongoUri(db_url);

/**
 * Connect to MongoDB and start the application
 */
async function startApplication() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { dbName: defaultDbName });
    
    const usedDbName = mongoose.connection.name;
    console.log(`✅ Connected to MongoDB at ${mongoUri} (db: ${usedDbName})`);
    
    // Disconnect from MongoDB to avoid conflicts with the main app
    await mongoose.disconnect();
    console.log('✅ Database connection verified, starting application...');
    
    // Start the main application
    const appProcess = spawn('node', ['app.js'], { 
      stdio: 'inherit',
      shell: true
    });
    
    appProcess.on('error', (err) => {
      console.error('❌ Failed to start application:', err);
      process.exit(1);
    });
    
    console.log('✅ Application started successfully!');
    console.log('📝 Access the application at: http://localhost:8080');
    console.log('📝 Admin login: http://localhost:8080/users/loginadmin');
    console.log('📝 Farmer login: http://localhost:8080/users/loginfarmer');
    console.log('📝 Buyer login: http://localhost:8080/users/loginbuyer');
    
  } catch (error) {
    console.error('❌ Error during startup:', error);
    process.exit(1);
  }
}

// Start the application
startApplication();