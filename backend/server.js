/**
 * OrbitOPedia Backend - Entry Point
 *
 * Cloud Computing course project.
 * Starts the Express HTTP server and connects to MongoDB Atlas.
 */

require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas, then start the server.
// When MONGO_URI is not set we still start the server so that
// the health-check and static data endpoints work without a database.
connectDB().finally(() => {
  app.listen(PORT, () => {
    console.log(`OrbitOPedia API server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
});
