# OrbitOPedia Backend Verification Guide

## Quick Start (Easiest Method)

### Option A: Test MongoDB Only (No Server Needed)
Double-click: `TEST_MONGODB.bat`

Or from command line:
```bash
cd C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia
node test_mongodb_only.js
```

### Option B: Full Verification (Server + Endpoints + MongoDB)
Double-click: `VERIFY.bat`

Or run the Node.js script directly:
```bash
cd C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia
node final_verify.js
```

---

## Manual Verification Steps

### Step 1: Install Dependencies
```bash
cd C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia\backend
npm install
```

### Step 2: Start Backend Server
```bash
npm start
```

Watch for these startup messages:
```
🔍 Checking MONGO_URI: ✅ Found
OrbitOPedia API server running on port 5000
Environment: development
Health check: http://localhost:5000/api/health
```

### Step 3: Test API Endpoints (New Terminal/Tab)

#### 3a. Health Check
```bash
curl http://localhost:5000/api/health
```
Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "environment": "development",
  "database": "connected",
  "version": "1.0.0"
}
```

#### 3b. Get Rockets
```bash
curl http://localhost:5000/api/rockets | jq .
```
Expected: Array of rocket objects with fields: `name`, `status`, `type`

#### 3c. Get Satellites
```bash
curl http://localhost:5000/api/satellites | jq .
```
Expected: Array of satellite objects with fields: `name`, `norad_cat_id`, `country_of_origin`

#### 3d. Search Satellites
```bash
curl "http://localhost:5000/api/satellites/search?q=ISS"
```
Expected: Filtered results containing ISS

#### 3e. Get Specific Satellite
First get a NORAD ID from the satellites list (typically 25544 for ISS):
```bash
curl http://localhost:5000/api/satellites/25544
```
Expected: Single satellite object with all fields

### Step 4: Query MongoDB Directly (New Terminal)

```bash
cd C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia\backend
node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

client.connect().then(async (c) => {
  const db = c.db('orbitopedia');
  
  console.log('=== Counts ===');
  console.log('Rockets:    ', await db.collection('rockets').countDocuments());
  console.log('Satellites: ', await db.collection('satellites').countDocuments());
  
  console.log('\n=== Rocket Sample ===');
  const rocket = await db.collection('rockets').findOne();
  console.log('Name:   ', rocket?.name);
  console.log('Status: ', rocket?.status);
  
  console.log('\n=== Satellite Sample ===');
  const sat = await db.collection('satellites').findOne();
  console.log('Name:     ', sat?.name);
  console.log('NORAD ID: ', sat?.norad_cat_id);
  
  await c.close();
}).catch(err => console.error('Error:', err.message));
"
```

### Step 5: Stop Server
In the terminal running `npm start`, press `Ctrl+C`

Or from another terminal:
```bash
taskkill /IM node.exe /T /F
```

---

## Expected Results

### ✅ Success Criteria
- [x] `npm install` completes without critical errors
- [x] Server starts and outputs ready message
- [x] Health endpoint responds with `"status": "ok"`
- [x] Rockets endpoint returns array with multiple items
- [x] Satellites endpoint returns array with multiple items
- [x] Search endpoint returns filtered results
- [x] Specific satellite endpoint returns single object
- [x] MongoDB connection successful
- [x] Database has documents in rockets collection
- [x] Database has documents in satellites collection
- [x] Sample documents have expected fields

### 📊 Expected Numbers
- **Rockets**: 50+ documents
- **Satellites**: 10,000+ documents

### 📄 Expected Fields

**Rocket Document:**
```json
{
  "_id": "...",
  "name": "Falcon 9",
  "status": "active",
  "type": "launch_vehicle",
  "country": "USA",
  ...
}
```

**Satellite Document:**
```json
{
  "_id": "...",
  "name": "ISS (ZARYA)",
  "norad_cat_id": 25544,
  "country_of_origin": "Russia/USA",
  "object_type": "Payload",
  ...
}
```

---

## Troubleshooting

### Server Won't Start
1. Check port 5000 is available
2. Verify Node.js is installed: `node --version`
3. Check for dependency errors in npm install output
4. Look for error messages in console

### Endpoints Return 404
1. Verify server is actually running (check console output)
2. Verify URL is exactly correct (including `/api/` prefix)
3. Try health check first: `curl http://localhost:5000/api/health`

### MongoDB Connection Fails
1. Check internet connection (MongoDB Atlas is cloud-based)
2. Verify MONGO_URI in `.env` is correct
3. Check MongoDB Atlas IP whitelist includes your machine
4. Try with longer timeout if network is slow

### Port 5000 Already in Use
```bash
REM Find process using port 5000
netstat -ano | findstr :5000

REM Kill process (replace XXXX with PID)
taskkill /PID XXXX /F
```

### npm install Fails
```bash
REM Clear npm cache
npm cache clean --force

REM Retry
npm install
```

---

## Files Provided

| File | Purpose |
|------|---------|
| `test_mongodb_only.js` | Test MongoDB connection only (fastest) |
| `TEST_MONGODB.bat` | Batch wrapper for MongoDB test |
| `final_verify.js` | Full verification (server + endpoints + DB) |
| `VERIFY.bat` | Batch wrapper for full verification |
| `MANUAL_VERIFICATION_STEPS.md` | Detailed manual steps |
| `backend/server.js` | Main backend entry point |
| `backend/package.json` | Dependencies list |
| `backend/.env` | Environment configuration |

---

## Backend Structure

```
backend/
├── server.js                 # Entry point
├── package.json             # Dependencies
├── .env                      # Configuration
├── src/
│   ├── app.js               # Express app setup
│   ├── config/
│   │   └── db.js            # MongoDB connection
│   ├── models/              # Mongoose schemas
│   ├── controllers/         # Route handlers
│   ├── routes/              # API routes
│   │   ├── rocketRoutes.js
│   │   └── satelliteRoutes.js
│   ├── middleware/          # Custom middleware
│   └── utils/               # Helper functions
└── node_modules/            # Dependencies
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/rockets` | List all rockets |
| POST | `/api/rockets` | Create rocket (admin only) |
| GET | `/api/satellites` | List all satellites |
| GET | `/api/satellites/search?q=` | Search satellites |
| GET | `/api/satellites/:norad_id` | Get satellite by NORAD ID |
| POST | `/api/satellites` | Create satellite (admin only) |

---

## Environment Variables

Configured in `backend/.env`:

```
MONGO_URI=mongodb+srv://...           # MongoDB Atlas connection
PORT=5000                               # Server port
NODE_ENV=development                    # Node environment
CORS_ORIGINS=...                       # Allowed origins
NASA_API_KEY=DEMO_KEY                  # NASA API key
TLE_SOURCE_URL=...                    # TLE data source
TLE_CACHE_TTL=3600                    # Cache timeout (seconds)
```

---

## Database

**MongoDB Atlas**: `orbitopedia` database

**Collections:**
- `rockets` - Rocket information
- `satellites` - Satellite information

---

## Support

If verification fails, check:
1. All startup logs for errors
2. MongoDB connection credentials
3. Network connectivity
4. Port availability
5. Environment variables
6. Node.js version compatibility

