/**
 * Test MongoDB Connection - Simple Direct Test
 * No server spawning, just direct MongoDB query
 */

process.chdir('C:\\Users\\jaygo\\Desktop\\DESKTOP\\Projects\\OrbitOPedia\\backend');

// Load env
require('dotenv').config();
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in .env');
  process.exit(1);
}

console.log('\n▶ Testing MongoDB Connection\n');
console.log('MongoDB URI (first 50 chars):', MONGO_URI.substring(0, 50) + '...');
console.log('');

(async () => {
  try {
    const { MongoClient } = require('mongodb');
    
    const client = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      retryWrites: false,
      maxPoolSize: 1
    });

    console.log('[1/4] Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    const db = client.db('orbitopedia');

    console.log('[2/4] Listing collections...');
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections:`);
    collections.forEach(c => console.log(`  • ${c.name}`));
    console.log('');

    console.log('[3/4] Counting documents...');
    const rocketsCount = await db.collection('rockets').countDocuments();
    const satellitesCount = await db.collection('satellites').countDocuments();
    console.log(`Rockets:     ${rocketsCount} documents`);
    console.log(`Satellites:  ${satellitesCount} documents\n`);

    console.log('[4/4] Fetching samples...');
    const rocketSample = await db.collection('rockets').findOne();
    const satelliteSample = await db.collection('satellites').findOne();

    if (rocketSample) {
      console.log('\nRocket Sample:');
      console.log(`  Name:    ${rocketSample.name}`);
      console.log(`  Status:  ${rocketSample.status}`);
      console.log(`  Type:    ${rocketSample.type || 'N/A'}`);
      console.log(`  Fields:  ${Object.keys(rocketSample).join(', ')}`);
    }

    if (satelliteSample) {
      console.log('\nSatellite Sample:');
      console.log(`  Name:     ${satelliteSample.name}`);
      console.log(`  NORAD ID: ${satelliteSample.norad_cat_id}`);
      console.log(`  Country:  ${satelliteSample.country_of_origin || 'N/A'}`);
      console.log(`  Fields:   ${Object.keys(satelliteSample).join(', ')}`);
    }

    console.log('\n════════════════════════════════════════════');
    console.log('✅ MONGODB VERIFICATION PASSED');
    console.log('════════════════════════════════════════════\n');

    await client.close();
    process.exit(0);

  } catch (err) {
    console.error(`\n❌ ERROR: ${err.message}\n`);
    if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
      console.error('Possible causes:');
      console.error('  • No internet connection');
      console.error('  • MongoDB Atlas is unreachable');
      console.error('  • Invalid MONGO_URI in .env');
    }
    process.exit(1);
  }
})();
