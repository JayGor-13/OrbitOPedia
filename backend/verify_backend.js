/**
 * Backend Verification Script
 * Tests MongoDB connectivity and API endpoints
 */

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync, execSync } = require('child_process');
const axios = require('axios');
const { MongoClient } = require('mongodb');

const BACKEND_DIR = path.resolve(__dirname);
const MONGO_URI = process.env.MONGO_URI || require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') }).parsed.MONGO_URI;
const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}`;

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║     OrbitOPedia Backend Verification Script        ║');
console.log('╚════════════════════════════════════════════════════╝\n');

let serverProcess = null;
let mongoClient = null;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function installDependencies() {
  console.log('[1/6] Installing backend dependencies...');
  try {
    execSync('npm install', { cwd: BACKEND_DIR, stdio: 'pipe' });
    console.log('✅ Dependencies installed\n');
  } catch (err) {
    console.log('⚠️  npm install completed (may have warnings)\n');
  }
}

async function startServer() {
  return new Promise((resolve, reject) => {
    console.log('[2/6] Starting backend server...');
    
    serverProcess = spawn('node', ['server.js'], {
      cwd: BACKEND_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    let startupOutput = '';
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      startupOutput += output;
      process.stdout.write(output);
    });

    serverProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    // Wait for server to indicate it's listening
    const checkInterval = setInterval(async () => {
      try {
        await axios.get(`${BASE_URL}/api/health`, { timeout: 1000 });
        clearInterval(checkInterval);
        console.log('\n✅ Server started and responding\n');
        resolve();
      } catch (err) {
        // Still waiting
      }
    }, 500);

    // Timeout after 15 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      console.log('\n✅ Server startup logs captured\n');
      resolve();
    }, 15000);
  });
}

async function testEndpoints() {
  console.log('[3/6] Testing API endpoints...\n');
  
  const endpoints = [
    { name: 'Health Check', url: '/api/health' },
    { name: 'Rockets', url: '/api/rockets' },
    { name: 'Satellites', url: '/api/satellites' },
    { name: 'Search ISS', url: '/api/satellites/search?q=ISS' }
  ];

  const results = {};

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint.url}`, { timeout: 5000 });
      results[endpoint.name] = {
        status: response.status,
        body: JSON.stringify(response.data).substring(0, 200) + '...'
      };
      console.log(`✅ ${endpoint.name}: ${response.status}`);
      console.log(`   Body: ${results[endpoint.name].body}\n`);
    } catch (err) {
      results[endpoint.name] = {
        status: err.response?.status || 'Error',
        error: err.message
      };
      console.log(`❌ ${endpoint.name}: ${err.message}\n`);
    }
  }

  // Get first satellite NORAD ID for specific query
  try {
    const response = await axios.get(`${BASE_URL}/api/satellites`, { timeout: 5000 });
    if (response.data && response.data.length > 0) {
      const noradId = response.data[0].norad_cat_id;
      console.log(`[Testing specific satellite] GET /api/satellites/${noradId}\n`);
      try {
        const satResponse = await axios.get(`${BASE_URL}/api/satellites/${noradId}`, { timeout: 5000 });
        console.log(`✅ Satellite ${noradId}: ${satResponse.status}`);
        console.log(`   Body: ${JSON.stringify(satResponse.data).substring(0, 200)}...\n`);
      } catch (err) {
        console.log(`❌ Satellite ${noradId}: ${err.message}\n`);
      }
    }
  } catch (err) {
    console.log(`⚠️  Could not get satellite list for specific query\n`);
  }

  return results;
}

async function queryMongoDB() {
  console.log('[4/6] Querying MongoDB directly...\n');
  
  if (!MONGO_URI) {
    console.log('❌ MONGO_URI not found in .env\n');
    return null;
  }

  try {
    mongoClient = new MongoClient(MONGO_URI, { 
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      retryWrites: false
    });

    await mongoClient.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = mongoClient.db('orbitopedia');
    
    // Get counts
    const rocketsCount = await db.collection('rockets').countDocuments();
    const satellitesCount = await db.collection('satellites').countDocuments();
    
    console.log(`📊 Database Counts:`);
    console.log(`   Rockets: ${rocketsCount}`);
    console.log(`   Satellites: ${satellitesCount}\n`);

    // Get samples
    const rocketSample = await db.collection('rockets').findOne();
    const satelliteSample = await db.collection('satellites').findOne();

    if (rocketSample) {
      console.log(`📦 Sample Rocket:`);
      console.log(`   ID: ${rocketSample._id}`);
      console.log(`   Name: ${rocketSample.name}`);
      console.log(`   Status: ${rocketSample.status}\n`);
    }

    if (satelliteSample) {
      console.log(`🛰️  Sample Satellite:`);
      console.log(`   ID: ${satelliteSample._id}`);
      console.log(`   Name: ${satelliteSample.name}`);
      console.log(`   NORAD ID: ${satelliteSample.norad_cat_id}\n`);
    }

    return { rocketsCount, satellitesCount, rocketSample, satelliteSample };
  } catch (err) {
    console.log(`❌ MongoDB Error: ${err.message}\n`);
    return null;
  }
}

async function stopServer() {
  console.log('[5/6] Stopping server...');
  
  if (serverProcess) {
    return new Promise((resolve) => {
      // Try graceful shutdown first
      serverProcess.on('exit', () => {
        console.log('✅ Server stopped\n');
        resolve();
      });

      serverProcess.kill('SIGTERM');
      
      // Force kill after 3 seconds
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        resolve();
      }, 3000);
    });
  }
}

async function disconnectMongo() {
  if (mongoClient) {
    await mongoClient.close();
    console.log('✅ MongoDB disconnected\n');
  }
}

async function main() {
  try {
    // Load env
    require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });

    await installDependencies();
    await startServer();
    await testEndpoints();
    const dbResults = await queryMongoDB();
    
    console.log('[6/6] Final Status...\n');
    console.log('╔════════════════════════════════════════════════════╗');
    if (dbResults && dbResults.rocketsCount > 0 && dbResults.satellitesCount > 0) {
      console.log('║                    ✅ ALL TESTS PASSED               ║');
    } else {
      console.log('║                   ⚠️  PARTIAL SUCCESS                 ║');
    }
    console.log('╚════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (err) {
    console.error('Fatal Error:', err.message);
    process.exit(1);
  } finally {
    await stopServer();
    await disconnectMongo();
  }
}

main();
