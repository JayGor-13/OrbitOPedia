# OrbitOPedia E2E Test Report
## MongoDB Integration Verification

**Test Date:** Run this test manually using the instructions below
**Project:** C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia
**Backend:** C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia\backend

---

## How to Execute Tests

Since your environment doesn't have PowerShell 6+ available, follow these manual steps:

### Option 1: Using Batch File (Simplest)
```cmd
cd C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia
run_e2e_manual.bat
```

### Option 2: Manual Start + Testing

#### Step 1: Start Backend Server
```cmd
cd C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia\backend
npm start
```

Expected output within 3-5 seconds:
```
🔍 Checking MONGO_URI: ✅ Found
[MongoDB connection attempt...]
OrbitOPedia API server running on port 5000
Environment: development
Health check: http://localhost:5000/api/health
```

#### Step 2: Test API Endpoints (in separate terminal)

**2a. Health Check**
```cmd
curl http://localhost:5000/api/health
```
Expected: `{"status":"ok"}` or similar health response

**2b. Rockets List**
```cmd
curl http://localhost:5000/api/rockets
```
Expected: JSON array of rocket objects with fields: `_id`, `name`, `agency`, `country`, `status`

**2c. Satellites List**
```cmd
curl http://localhost:5000/api/satellites
```
Expected: JSON array of satellite objects with fields: `_id`, `name`, `noradId`, `country`, `launchDate`

**2d. Search Satellites**
```cmd
curl http://localhost:5000/api/satellites/search?q=ISS
```
Expected: Filtered array containing ISS and related satellites

**2e. Get Satellite by ID** (replace NORAD_ID with actual value from response)
```cmd
curl http://localhost:5000/api/satellites/25544
```
Expected: Single satellite object for the given NORAD ID

#### Step 3: Verify Data in MongoDB

Open a new terminal and install mongosh if needed:
```cmd
npm install -g mongosh
```

Then connect and query:
```cmd
mongosh "mongodb+srv://jgor280505_db_user:cnktgLpVFI3ysqQW@orbitopedia.a8aqhsr.mongodb.net/orbitopedia?retryWrites=true&w=majority&tls=true&appName=OrbitOPedia"
```

In mongosh shell, run:
```javascript
use orbitopedia

// Count documents
db.rockets.countDocuments()
// Expected: Integer > 0 if seeded

db.satellites.countDocuments()
// Expected: Integer > 0 if seeded

// Sample documents
db.rockets.findOne()
// Expected output structure:
// {
//   _id: ObjectId(...),
//   name: "Falcon 9",
//   agency: "SpaceX",
//   country: "United States",
//   status: "Active",
//   ...
// }

db.satellites.findOne()
// Expected output structure:
// {
//   _id: ObjectId(...),
//   name: "ISS",
//   noradId: 25544,
//   country: "USA",
//   launchDate: "1998-11-20",
//   ...
// }
```

#### Step 4: Stop Server

In the terminal where server is running, press `Ctrl+C`.

Expected output:
```
[Signal] Server shutting down...
Process terminated
```

---

## Expected Results

### If Tests PASS:
- ✅ Server starts without errors
- ✅ All 5 endpoints return HTTP 200
- ✅ Rockets collection has documents (count > 0)
- ✅ Satellites collection has documents (count > 0)
- ✅ Sample documents show expected fields
- ✅ Server stops cleanly

### If Tests FAIL:

**Symptom:** Server won't start / "MONGO_URI not found"
- **Cause:** Environment variable not loaded
- **Solution:** Verify .env file exists at `backend/.env` with MONGO_URI value

**Symptom:** Server starts but endpoints return 500 errors
- **Cause:** MongoDB connection failed
- **Solution:** 
  - Check MONGO_URI is correct
  - Verify MongoDB Atlas cluster is online
  - Check IP whitelist allows your IP

**Symptom:** "Cannot GET /api/rockets"
- **Cause:** Routes not registered or server not fully started
- **Solution:** Wait 2-3 seconds after server starts, then try again

**Symptom:** MongoDB query "ECONNREFUSED"
- **Cause:** Cannot reach MongoDB
- **Solution:** 
  - Test connection: `mongosh --eval "db.version()"` with full URI
  - Check firewall/network access
  - Verify MONGO_URI has correct credentials

**Symptom:** Collections empty (count = 0)
- **Cause:** Lazy seed hasn't run yet or failed
- **Solution:** Trigger lazy seed by calling `/api/rockets` or `/api/satellites` endpoint
  - Server should automatically seed on first request if collections empty

---

## Verification Checklist

Copy and fill this out as you run tests:

### Environment & Setup
- [ ] .env file exists at `backend/.env`
- [ ] MONGO_URI is present in .env
- [ ] Node.js and npm are installed
- [ ] MongoDB driver (mongoose) is installed

### Server Startup
- [ ] `npm start` completes without errors
- [ ] Server logs show "running on port 5000"
- [ ] Server logs show MONGO_URI status (✅ or error)
- [ ] Server responds within 5 seconds

### API Endpoint Tests
- [ ] GET /api/health returns 200
- [ ] GET /api/rockets returns 200 with data
- [ ] GET /api/satellites returns 200 with data
- [ ] GET /api/satellites/search?q=ISS returns 200
- [ ] GET /api/satellites/{NORAD_ID} returns 200

### MongoDB Verification
- [ ] Can connect to MongoDB with mongosh
- [ ] Database `orbitopedia` exists
- [ ] `rockets` collection has > 0 documents
- [ ] `satellites` collection has > 0 documents
- [ ] Sample documents have expected fields
- [ ] No connection errors

### Server Cleanup
- [ ] Ctrl+C stops server cleanly
- [ ] No hanging processes remain
- [ ] Can restart server immediately

---

## Sample Test Output Reference

### Successful Server Startup
```
🔍 Checking MONGO_URI: ✅ Found
Mongoose connecting to: mongodb+srv://...
✅ Database connected successfully
OrbitOPedia API server running on port 5000
Environment: development
Health check: http://localhost:5000/api/health
```

### Successful Health Check
```
$ curl http://localhost:5000/api/health
{"status":"ok","uptime":12.345}
```

### Successful Rockets List
```
$ curl http://localhost:5000/api/rockets
[
  {
    "_id": "...",
    "name": "Falcon 9",
    "agency": "SpaceX",
    "country": "United States",
    "status": "Active",
    "createdAt": "2024-...",
    "updatedAt": "2024-..."
  },
  ...
]
```

### Successful MongoDB Count
```
orbitopedia> db.rockets.countDocuments()
15
orbitopedia> db.satellites.countDocuments()
3000
```

---

## Troubleshooting Commands

If you encounter issues, try these diagnostic commands:

```bash
# Check Node.js version
node --version

# Check npm packages are installed
cd backend && npm list

# Test MongoDB connection directly
mongosh "mongodb+srv://jgor280505_db_user:cnktgLpVFI3ysqQW@orbitopedia.a8aqhsr.mongodb.net/orbitopedia?retryWrites=true&w=majority&tls=true&appName=OrbitOPedia" --eval "db.version()"

# Test HTTP endpoint with verbose output
curl -v http://localhost:5000/api/health

# View server logs for errors (if using separate log file)
# tail -f backend/server.log (if logging is implemented)
```

---

## Summary

This E2E test suite verifies:
1. ✅ Backend server starts and connects to MongoDB
2. ✅ All critical API endpoints are functional
3. ✅ Data is persisted and retrievable from MongoDB
4. ✅ Lazy seeding works (collections populated on first access)
5. ✅ Server can be shut down cleanly

**Expected Duration:** 5-10 minutes including MongoDB connection time

**Next Steps After Passing:**
- Proceed to production deployment
- Monitor MongoDB connection metrics
- Set up alerting for connection failures
