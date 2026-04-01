/**
 * OrbitOPedia Backend - Entry Point
 *
 * Cloud Computing course project.
 * Starts the Express HTTP server and connects to MongoDB Atlas.
 */

// Load environment variables FIRST, before any other imports
require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const app = require("./src/app");
const connectDB = require("./src/config/db");
const { startSatelliteUpdateWorker } = require("./src/workers/satelliteUpdateWorker");

const PORT = process.env.PORT || 5000;

console.log("🔍 Checking MONGO_URI:", process.env.MONGO_URI ? "✅ Found" : "❌ Not found");

// Connect to MongoDB Atlas, then start the server.
// When MONGO_URI is not set we still start the server so that
// the health-check and static data endpoints work without a database.
connectDB().finally(() => {
  startSatelliteUpdateWorker();
  app.listen(PORT, () => {
    console.log(`OrbitOPedia API server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
});
