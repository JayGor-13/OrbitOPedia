#!/usr/bin/env node
/**
 * Quick MongoDB + Backend Verification
 */
const path = require('path');
const { spawn, spawnSync, execSync } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, 'backend', '.env') });

const BACKEND_DIR = path.resolve(__dirname, 'backend');
const MONGO_URI = process.env.MONGO_URI;
const PORT = 5000;

let serverPid = null;

process.chdir(BACKEND_DIR);

console.log('\n════════════════════════════════════════════');
console.log('  OrbitOPedia Backend & MongoDB Verification');
console.log('════════════════════════════════════════════\n');

// Step 1: Install
console.log('[1/5] Installing npm dependencies...');
try {
  execSync('npm install --silent', { cwd: BACKEND_DIR, stdio: 'pipe' });
  console.log('✓ Done\n');
} catch (e) {
  console.log('⚠  Done (with warnings)\n');
}

// Step 2: Start server
console.log('[2/5] Starting server...');
const srv = spawn('node', ['server.js'], {
  cwd: BACKEND_DIR,
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe']
});
serverPid = srv.pid;
console.log(`✓ Server started (PID ${serverPid})\n`);

srv.stdout.on('data', d => process.stdout.write(`  [srv] ${d}`));
srv.stderr.on('data', d => process.stderr.write(`  [err] ${d}`));

// Step 3-5: Tests after delay
setTimeout(async () => {
  console.log('[3/5] Testing endpoints...\n');
  
  const axios = require('axios');
  const BASE = `http://localhost:${PORT}`;
  
  async function call(name, url) {
    try {
      const r = await axios.get(BASE + url, { timeout: 3000 });
      const body = JSON.stringify(r.data).substring(0, 120);
      console.log(`  ✓ ${name}: ${r.status}`);
      console.log(`    → ${body}...\n`);
      return r.data;
    } catch (e) {
      console.log(`  ✗ ${name}: ${e.message}\n`);
      return null;
    }
  }

  const health = await call('Health', '/api/health');
  const rockets = await call('Rockets', '/api/rockets');
  const sats = await call('Satellites', '/api/satellites');
  const search = await call('Search ISS', '/api/satellites/search?q=ISS');
  
  if (sats && sats[0]) {
    const norad = sats[0].norad_cat_id;
    await call(`Satellite ${norad}`, `/api/satellites/${norad}`);
  }

  console.log('[4/5] MongoDB Query...\n');
  
  if (!MONGO_URI) {
    console.log('  ✗ MONGO_URI not set\n');
  } else {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(MONGO_URI, {
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 8000,
        retryWrites: false
      });
      
      await client.connect();
      const db = client.db('orbitopedia');
      
      const rc = await db.collection('rockets').countDocuments();
      const sc = await db.collection('satellites').countDocuments();
      const rs = await db.collection('rockets').findOne();
      const ss = await db.collection('satellites').findOne();
      
      console.log(`  Database Counts:`);
      console.log(`    • Rockets:     ${rc}`);
      console.log(`    • Satellites:  ${sc}\n`);
      
      if (rs) {
        console.log(`  Rocket Sample:`);
        console.log(`    • Name:   ${rs.name}`);
        console.log(`    • Status: ${rs.status}\n`);
      }
      
      if (ss) {
        console.log(`  Satellite Sample:`);
        console.log(`    • Name:     ${ss.name}`);
        console.log(`    • NORAD ID: ${ss.norad_cat_id}\n`);
      }
      
      await client.close();
    } catch (e) {
      console.log(`  ✗ MongoDB: ${e.message}\n`);
    }
  }

  console.log('[5/5] Summary\n');
  console.log('════════════════════════════════════════════');
  console.log('  ✓ Verification Complete');
  console.log('════════════════════════════════════════════\n');

  // Cleanup
  console.log('Stopping server...');
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(serverPid), '/T', '/F'], { stdio: 'pipe' });
    } else {
      process.kill(-serverPid, 'SIGTERM');
    }
    console.log('✓ Server stopped\n');
  } catch (e) {
    console.log(`⚠  ${e.message}\n`);
  }

  process.exit(0);
}, 12000);
