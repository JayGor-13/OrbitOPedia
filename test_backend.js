/**
 * OrbitOPedia Backend Verification Script
 * Direct Node.js execution - no shell dependencies
 */

const path = require('path');
const fs = require('fs');
const { spawn, spawnSync, execSync } = require('child_process');

const BACKEND_DIR = path.resolve('C:\\Users\\jaygo\\Desktop\\DESKTOP\\Projects\\OrbitOPedia\\backend');
process.chdir(BACKEND_DIR);

// Load environment
require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

console.log('\n▶  OrbitOPedia Backend Verification Script\n');
console.log(`   Backend Directory: ${BACKEND_DIR}`);
console.log(`   MONGO_URI: ${MONGO_URI ? '✓ Configured' : '✗ Missing'}`);
console.log(`   PORT: ${PORT}\n`);

// ============================================================================
// STEP 1: Install Dependencies
// ============================================================================

console.log('─'.repeat(60));
console.log('[1/5] Installing backend dependencies...');
console.log('─'.repeat(60));

try {
  const result = spawnSync('npm', ['install'], {
    cwd: BACKEND_DIR,
    stdio: 'pipe',
    encoding: 'utf-8'
  });
  
  if (result.status === 0) {
    console.log('✓ Dependencies installed successfully\n');
  } else {
    console.log('⚠  npm install completed with warnings\n');
    if (result.stderr) console.log(result.stderr);
  }
} catch (err) {
  console.error('✗ Failed to install dependencies:', err.message);
  process.exit(1);
}

// ============================================================================
// STEP 2: Start Backend Server
// ============================================================================

console.log('─'.repeat(60));
console.log('[2/5] Starting backend server...');
console.log('─'.repeat(60));

let serverProcess;
let serverPid;
let serverOutput = [];

try {
  serverProcess = spawn('node', ['server.js'], {
    cwd: BACKEND_DIR,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  serverPid = serverProcess.pid;
  console.log(`✓ Server process spawned (PID: ${serverPid})\n`);

  serverProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => {
      serverOutput.push(line);
      console.log(`  [STDOUT] ${line}`);
    });
  });

  serverProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => {
      console.log(`  [STDERR] ${line}`);
    });
  });

  serverProcess.on('error', (err) => {
    console.error(`✗ Server process error: ${err.message}`);
  });

  serverProcess.on('exit', (code, signal) => {
    console.log(`\n⚠  Server exited with code ${code}, signal ${signal}`);
  });
} catch (err) {
  console.error('✗ Failed to start server:', err.message);
  process.exit(1);
}

// ============================================================================
// STEP 3: Wait for Server and Test Endpoints
// ============================================================================

console.log('─'.repeat(60));
console.log('[3/5] Waiting for server startup (max 15 seconds)...');
console.log('─'.repeat(60) + '\n');

setTimeout(async () => {
  const axios = require('axios');
  const BASE_URL = `http://localhost:${PORT}`;

  // Helper function to test endpoint
  async function testEndpoint(name, path) {
    try {
      const response = await axios.get(`${BASE_URL}${path}`, { timeout: 5000 });
      const data = response.data;
      let summary = '';

      if (typeof data === 'object' && data !== null) {
        if (Array.isArray(data)) {
          summary = `${data.length} items, first: "${data[0]?.name || data[0]?.status || 'N/A'}"`;
        } else if (typeof data === 'object') {
          summary = JSON.stringify(data).substring(0, 80) + '...';
        }
      } else {
        summary = String(data).substring(0, 80);
      }

      console.log(`✓ ${name.padEnd(25)} [${response.status}] ${summary}`);
      return { success: true, status: response.status, data };
    } catch (err) {
      console.log(`✗ ${name.padEnd(25)} [ERROR] ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  console.log('ENDPOINT TESTS:');
  console.log('─'.repeat(60));

  // Test endpoints
  const healthResult = await testEndpoint('Health Check', '/api/health');
  const rocketsResult = await testEndpoint('Rockets List', '/api/rockets');
  const satellitesResult = await testEndpoint('Satellites List', '/api/satellites');
  const searchResult = await testEndpoint('Search ISS', '/api/satellites/search?q=ISS');

  // Test specific satellite
  let specificSatResult = { success: false };
  if (satellitesResult.success && satellitesResult.data && satellitesResult.data.length > 0) {
    const noradId = satellitesResult.data[0].norad_cat_id;
    specificSatResult = await testEndpoint(
      `Satellite ${noradId}`,
      `/api/satellites/${noradId}`
    );
  }

  console.log('');

  // ========================================================================
  // STEP 4: Query MongoDB
  // ========================================================================

  console.log('─'.repeat(60));
  console.log('[4/5] Querying MongoDB directly...');
  console.log('─'.repeat(60) + '\n');

  if (!MONGO_URI) {
    console.log('✗ MONGO_URI not configured in .env\n');
  } else {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        retryWrites: false
      });

      console.log('Connecting to MongoDB...');
      await client.connect();
      console.log('✓ Connected to MongoDB\n');

      const db = client.db('orbitopedia');

      // Get collection counts
      const rocketsCount = await db.collection('rockets').countDocuments();
      const satellitesCount = await db.collection('satellites').countDocuments();

      console.log('DATABASE COUNTS:');
      console.log('─'.repeat(60));
      console.log(`  Rockets:    ${rocketsCount.toString().padStart(10)} documents`);
      console.log(`  Satellites: ${satellitesCount.toString().padStart(10)} documents`);
      console.log('');

      // Get sample documents
      console.log('SAMPLE DOCUMENTS:');
      console.log('─'.repeat(60));

      const rocketSample = await db.collection('rockets').findOne();
      if (rocketSample) {
        console.log(`\n  ROCKET SAMPLE:`);
        console.log(`    Name:   ${rocketSample.name}`);
        console.log(`    Status: ${rocketSample.status}`);
        console.log(`    Type:   ${rocketSample.type || 'N/A'}`);
        console.log(`    _id:    ${rocketSample._id}`);
      }

      const satelliteSample = await db.collection('satellites').findOne();
      if (satelliteSample) {
        console.log(`\n  SATELLITE SAMPLE:`);
        console.log(`    Name:     ${satelliteSample.name}`);
        console.log(`    NORAD ID: ${satelliteSample.norad_cat_id}`);
        console.log(`    Country:  ${satelliteSample.country_of_origin || 'N/A'}`);
        console.log(`    _id:      ${satelliteSample._id}`);
      }

      console.log('');
      await client.close();

      // ====================================================================
      // STEP 5: Final Summary
      // ====================================================================

      console.log('─'.repeat(60));
      console.log('[5/5] FINAL STATUS');
      console.log('─'.repeat(60) + '\n');

      const allTestsPassed =
        healthResult.success &&
        rocketsResult.success &&
        satellitesResult.success &&
        searchResult.success &&
        rocketsCount > 0 &&
        satellitesCount > 0;

      if (allTestsPassed) {
        console.log('  ✓ ALL TESTS PASSED\n');
      } else if (
        (healthResult.success || rocketsResult.success || satellitesResult.success) &&
        (rocketsCount > 0 || satellitesCount > 0)
      ) {
        console.log('  ⚠  PARTIAL SUCCESS (Some endpoints or DB collections failed)\n');
      } else {
        console.log('  ✗ CRITICAL FAILURES DETECTED\n');
      }

      console.log('SUMMARY:');
      console.log(`  API Endpoints:     ${healthResult.success ? '✓' : '✗'}`);
      console.log(`  Database:          ${rocketsCount > 0 && satellitesCount > 0 ? '✓' : '✗'}`);
      console.log(`  Rockets:           ${rocketsCount} documents`);
      console.log(`  Satellites:        ${satellitesCount} documents`);
      console.log('');

      // ====================================================================
      // CLEANUP
      // ====================================================================

      console.log('─'.repeat(60));
      console.log('[CLEANUP] Terminating server process...');
      console.log('─'.repeat(60) + '\n');

      try {
        if (process.platform === 'win32') {
          // Windows
          spawnSync('taskkill', ['/PID', String(serverPid), '/T', '/F'], {
            stdio: 'pipe'
          });
        } else {
          // Unix
          process.kill(-serverPid, 'SIGTERM');
        }
        console.log(`✓ Server process ${serverPid} terminated\n`);
      } catch (err) {
        console.log(`⚠  Could not cleanly terminate server: ${err.message}\n`);
      }

      process.exit(0);
    } catch (mongoErr) {
      console.error(`✗ MongoDB Error: ${mongoErr.message}\n`);

      console.log('─'.repeat(60));
      console.log('[CLEANUP] Terminating server process...');
      console.log('─'.repeat(60) + '\n');

      try {
        if (process.platform === 'win32') {
          spawnSync('taskkill', ['/PID', String(serverPid), '/T', '/F'], {
            stdio: 'pipe'
          });
        } else {
          process.kill(-serverPid, 'SIGTERM');
        }
        console.log(`✓ Server process ${serverPid} terminated\n`);
      } catch (err) {
        console.log(`⚠  Could not cleanly terminate server: ${err.message}\n`);
      }

      process.exit(1);
    }
  }
}, 15000);

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n\n✗ Script interrupted by user\n');
  if (serverProcess) {
    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(serverPid), '/T', '/F'], {
          stdio: 'pipe'
        });
      } else {
        process.kill(-serverPid, 'SIGTERM');
      }
    } catch (e) {}
  }
  process.exit(1);
});
