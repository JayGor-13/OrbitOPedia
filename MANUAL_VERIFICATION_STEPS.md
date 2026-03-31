# OrbitOPedia Backend Verification - Manual Steps

Since the environment doesn't have a traditional shell, follow these steps manually in cmd.exe or PowerShell:

## Step 1: Open Command Prompt
```bash
cd C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia\backend
```

## Step 2: Install Dependencies
```bash
npm install
```

Expected output: 
- Should show packages being installed
- Final line should show number of added packages (e.g., "added 150 packages")

## Step 3: Start Backend Server (in new terminal/tab)
```bash
npm start
```

Expected output:
```
🔍 Checking MONGO_URI: ✅ Found
OrbitOPedia API server running on port 5000
Environment: development
Health check: http://localhost:5000/api/health
```

## Step 4: Test Endpoints (in another terminal/tab)

### 4a) Health Check
```bash
curl http://localhost:5000/api/health
```

Expected:
```json
{
  "status": "ok",
  "timestamp": "2024-01-...",
  "environment": "development",
  "database": "connected",
  "version": "1.0.0"
}
```

### 4b) Rockets List
```bash
curl http://localhost:5000/api/rockets
```

Expected: Array of rocket objects with `name`, `status`, `type` fields

### 4c) Satellites List
```bash
curl http://localhost:5000/api/satellites
```

Expected: Array of satellite objects with `name`, `norad_cat_id`, `country_of_origin`

### 4d) Search ISS
```bash
curl "http://localhost:5000/api/satellites/search?q=ISS"
```

Expected: Results containing ISS satellite(s)

### 4e) Specific Satellite (replace 25544 with actual NORAD ID from list)
```bash
curl http://localhost:5000/api/satellites/25544
```

Expected: Single satellite object

## Step 5: Query MongoDB Directly (in new terminal)

```bash
cd C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia\backend

node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 8000,
  socketTimeoutMS: 8000,
  retryWrites: false
});

client.connect().then(async (c) => {
  const db = c.db('orbitopedia');
  
  const rocketsCount = await db.collection('rockets').countDocuments();
  const satellitesCount = await db.collection('satellites').countDocuments();
  const rocketSample = await db.collection('rockets').findOne();
  const satelliteSample = await db.collection('satellites').findOne();
  
  console.log('=== Database Counts ===');
  console.log('Rockets:     ', rocketsCount);
  console.log('Satellites:  ', satellitesCount);
  
  console.log('\n=== Rocket Sample ===');
  console.log('Name:   ', rocketSample?.name);
  console.log('Status: ', rocketSample?.status);
  console.log('Type:   ', rocketSample?.type);
  
  console.log('\n=== Satellite Sample ===');
  console.log('Name:     ', satelliteSample?.name);
  console.log('NORAD ID: ', satelliteSample?.norad_cat_id);
  console.log('Country:  ', satelliteSample?.country_of_origin);
  
  await c.close();
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
"
```

Expected output:
```
=== Database Counts ===
Rockets:      50
Satellites:   10000

=== Rocket Sample ===
Name:    Falcon 9
Status:  active
Type:    launch_vehicle

=== Satellite Sample ===
Name:      ISS (ZARYA)
NORAD ID:  25544
Country:   Russia/USA
```

## Step 6: Stop Backend Server

In the terminal where you ran `npm start`:
- Press `Ctrl+C` to stop the server

Or in a new terminal:
```bash
taskkill /IM node.exe /T /F
```

## Expected Success Criteria

✓ **Health endpoint responds** with status "ok"
✓ **Rockets endpoint returns data** with count > 0
✓ **Satellites endpoint returns data** with count > 0  
✓ **Search endpoint works** and returns filtered results
✓ **Specific satellite endpoint works** and returns single object
✓ **MongoDB connection successful** via Node script
✓ **Database has documents** in both collections
✓ **Sample documents contain expected fields**

## Troubleshooting

If endpoints don't respond:
1. Verify server started successfully (check console for errors)
2. Verify port 5000 is available (`netstat -ano | find ":5000"`)
3. Check `.env` has valid MONGO_URI

If MongoDB connection fails:
1. Verify internet connection (it's a cloud service)
2. Check MONGO_URI in `.env` is correct
3. Verify MongoDB Atlas IP whitelist includes your machine
4. Try connection from MongoDB Compass with same URI

