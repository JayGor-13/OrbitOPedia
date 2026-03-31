#!/usr/bin/env node
/**
 * E2E Test - Simplified version
 * Runs synchronously to work within constraints
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n' + '='.repeat(60));
console.log('OrbitOPedia E2E Test Suite - MongoDB Integration Check');
console.log('='.repeat(60) + '\n');

const backendDir = path.join(__dirname, 'backend');
const envPath = path.join(backendDir, '.env');

// 1. Verify .env exists
console.log('CHECK 1: Environment Configuration');
console.log('─'.repeat(60));

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found');
  process.exit(1);
}
console.log('✓ .env file exists');

// Parse .env
const envContent = fs.readFileSync(envPath, 'utf8');
const mongoUriMatch = envContent.match(/MONGO_URI=(.+)/);
const mongoUri = mongoUriMatch ? mongoUriMatch[1].trim() : null;

if (!mongoUri) {
  console.error('❌ MONGO_URI not found in .env');
  process.exit(1);
}

const isSensitiveUri = mongoUri.includes('@');
console.log(`✓ MONGO_URI configured: ${isSensitiveUri ? mongoUri.substring(0, 50) + '...' : mongoUri}`);

// 2. Start server with timeout
console.log('\nCHECK 2: Server Startup');
console.log('─'.repeat(60));

let serverPid = null;
let startupLog = '';

try {
  console.log('Starting backend server (timeout: 15 seconds)...');
  
  // Use Node to start the server in background
  const { spawn } = require('child_process');
  const server = spawn('node', ['server.js'], {
    cwd: backendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });

  serverPid = server.pid;
  console.log(`  Process ID: ${serverPid}`);

  let serverReady = false;
  let hasError = false;
  
  const onData = (data) => {
    startupLog += data.toString();
    const output = data.toString();
    
    if (output.includes('running on port')) {
      serverReady = true;
      console.log('✓ Server started successfully');
      console.log('  Output: ' + output.split('\n')[0]);
    }
    if (output.includes('MONGO_URI') && output.includes('✅')) {
      console.log('✓ MongoDB URI detected');
    }
    if (output.includes('connected')) {
      console.log('✓ MongoDB connection successful');
    }
    if (output.includes('ERR!') || output.includes('error')) {
      hasError = true;
      console.log('⚠ Error in logs: ' + output.substring(0, 100));
    }
  };

  server.stdout.on('data', onData);
  server.stderr.on('data', onData);

  // Wait for server to be ready
  const startTime = Date.now();
  while (!serverReady && Date.now() - startTime < 15000) {
    require('child_process').spawnSync('timeout', ['1'], { shell: true, stdio: 'ignore' });
  }

  if (!serverReady) {
    console.error('❌ Server did not start within 15 seconds');
    console.error('Startup log:', startupLog);
    try { process.kill(-serverPid); } catch(e) {}
    process.exit(1);
  }

  // 3. Test endpoints
  console.log('\nCHECK 3: API Endpoints');
  console.log('─'.repeat(60));

  const http = require('http');
  const endpoints = [
    '/api/health',
    '/api/rockets',
    '/api/satellites',
    '/api/satellites/search?q=ISS'
  ];

  const testEndpoint = (path) => {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:5000${path}`, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });
      req.on('error', (err) => {
        resolve({ error: err.message });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ error: 'timeout' });
      });
    });
  };

  (async () => {
    for (const endpoint of endpoints) {
      try {
        const result = await testEndpoint(endpoint);
        if (result.error) {
          console.log(`✗ ${endpoint}: ${result.error}`);
        } else if (result.status === 200) {
          const count = Array.isArray(result.data) ? result.data.length : 
                       (result.data && result.data.count) ? result.data.count : '?';
          console.log(`✓ ${endpoint} (HTTP 200) - Items: ${count}`);
        } else {
          console.log(`✗ ${endpoint} (HTTP ${result.status})`);
        }
      } catch (err) {
        console.log(`✗ ${endpoint}: ${err.message}`);
      }
    }

    // 4. Test DB directly
    console.log('\nCHECK 4: MongoDB Direct Query');
    console.log('─'.repeat(60));

    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(mongoUri);
      await client.connect();
      console.log('✓ Connected to MongoDB');

      const db = client.db('orbitopedia');
      
      const rocketsCount = await db.collection('rockets').countDocuments();
      const satellitesCount = await db.collection('satellites').countDocuments();

      console.log(`✓ Rockets collection: ${rocketsCount} documents`);
      console.log(`✓ Satellites collection: ${satellitesCount} documents`);

      if (rocketsCount > 0) {
        const rocketSample = await db.collection('rockets').findOne({});
        if (rocketSample) {
          console.log('  Sample rocket: ' + JSON.stringify({
            name: rocketSample.name,
            country: rocketSample.country
          }));
        }
      }

      if (satellitesCount > 0) {
        const satSample = await db.collection('satellites').findOne({});
        if (satSample) {
          console.log('  Sample satellite: ' + JSON.stringify({
            name: satSample.name,
            noradId: satSample.noradId
          }));
        }
      }

      await client.close();
      console.log('✓ Disconnected from MongoDB');
    } catch (err) {
      console.log(`✗ MongoDB query failed: ${err.message}`);
      if (err.message.includes('ECONNREFUSED')) {
        console.log('  Hint: MongoDB Atlas may be offline or MONGO_URI is incorrect');
      }
    }

    // 5. Clean up
    console.log('\nCHECK 5: Server Cleanup');
    console.log('─'.repeat(60));
    try {
      process.kill(-serverPid);
      console.log(`✓ Server process ${serverPid} terminated`);
    } catch (err) {
      console.log(`⚠ Could not terminate server: ${err.message}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('E2E Test Suite Complete');
    console.log('='.repeat(60) + '\n');
    process.exit(0);
  })();

} catch (err) {
  console.error(`❌ Error: ${err.message}`);
  if (serverPid) {
    try { process.kill(-serverPid); } catch(e) {}
  }
  process.exit(1);
}
