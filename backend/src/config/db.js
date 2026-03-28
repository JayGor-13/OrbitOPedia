/**
 * MongoDB Atlas connection helper.
 *
 * Uses MONGO_URI from the environment.  When no URI is provided the
 * application still runs – only database-backed features are unavailable.
 */

const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn(
      "MONGO_URI not set – running without database. " +
        "Set MONGO_URI in .env to enable persistence."
    );
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("MongoDB Atlas connected successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    // Do not crash the process – the server still starts.
  }
}

module.exports = connectDB;
