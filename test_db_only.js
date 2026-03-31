/**
 * Simplified synchronous backend test
 * No complex spawning - just direct execution
 */

const fs = require('fs');
const path = require('path');

// Change to root
process.chdir('C:\\Users\\jaygo\\Desktop\\DESKTOP\\Projects\\OrbitOPedia');

console.log('\n▶ Backend Verification Starting...\n');

// 1. Check backend exists
const backendDir = path.join(process.cwd(), 'backend');
if (!fs.existsSync(backendDir)) {
  console.error('✗ Backend directory not found');
  process.exit(1);
}

console.log('[1/3] Checking backend directory...');
console.log(`  ✓ Backend directory: ${backendDir}\n`);

// 2. Load env
console.log('[2/3] Loading environment variables...');
const envPath = path.join(backendDir, '.env');
if (!fs.existsSync(envPath)) {
  console.error('  ✗ .env file not found');
  process.exit(1);
}

require('dotenv').config({ path: envPath });
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

if (!MONGO_URI) {
  console.log('  ✗ MONGO_URI not configured');
  process.exit(1);
}

console.log('  ✓ MONGO_URI found');
console.log(`  ✓ PORT: ${PORT}\n`);

// 3. Test MongoDB connection directly (no server)
console.log('[3/3] Testing MongoDB connection...\n');

(async () => {
  try {
    const { MongoClient } = require('mongodb');
    
    console.log('  Connecting to MongoDB...');
    const client = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      retryWrites: false,
      maxPoolSize: 2
    });

    await client.connect();
    console.log('  ✓ Connected to MongoDB\n');

    const db = client.db('orbitopedia');

    // Check collections exist
    const collections = await db.listCollections().toArray();
    const hasRockets = collections.some(c => c.name === 'rockets');
    const hasSatellites = collections.some(c => c.name === 'satellites');

    console.log('  Collections found:');
    console.log(`    ${hasRockets ? '✓' : '✗'} rockets`);
    console.log(`    ${hasSatellites ? '✓' : '✗'} satellites\n`);

    // Get counts
    const rocketsCount = await db.collection('rockets').countDocuments();
    const satellitesCount = await db.collection('satellites').countDocuments();

    console.log('  Document counts:');
    console.log(`    • Rockets:     ${rocketsCount}`);
    console.log(`    • Satellites:  ${satellitesCount}\n`);

    // Get samples
    console.log('  Sample documents:\n');

    const rocketSample = await db.collection('rockets').findOne({});
    if (rocketSample) {
      console.log('    ROCKET:');
      console.log(`      Name:    ${rocketSample.name}`);
      console.log(`      Status:  ${rocketSample.status}`);
      console.log(`      Fields:  ${Object.keys(rocketSample).join(', ')}\n`);
    }

    const satelliteSample = await db.collection('satellites').findOne({});
    if (satelliteSample) {
      console.log('    SATELLITE:');
      console.log(`      Name:     ${satelliteSample.name}`);
      console.log(`      NORAD ID: ${satelliteSample.norad_cat_id}`);
      console.log(`      Fields:   ${Object.keys(satelliteSample).join(', ')}\n`);
    }

    // Check backend structure
    console.log('  Backend structure:');
    const srcDir = path.join(backendDir, 'src');
    const subdirs = fs.readdirSync(srcDir).filter(f => 
      fs.statSync(path.join(srcDir, f)).isDirectory()
    );
    subdirs.forEach(d => console.log(`      • ${d}`));
    console.log('');

    await client.close();

    // Summary
    console.log('════════════════════════════════════════════');
    const dbOk = rocketsCount > 0 && satellitesCount > 0;
    if (dbOk) {
      console.log('  ✓ MongoDB Connection: PASS');
      console.log('  ✓ Data Present: PASS');
      console.log('  ✓ Overall Status: PASS');
    } else {
      console.log('  ✓ MongoDB Connection: PASS');
      console.log('  ✗ Data Present: FAIL');
      console.log('  ⚠ Overall Status: PARTIAL');
    }
    console.log('════════════════════════════════════════════\n');

    process.exit(0);

  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
})();
