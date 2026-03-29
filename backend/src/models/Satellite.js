/**
 * Satellite Mongoose model.
 *
 * Stores parsed TLE records and cached orbital data.
 * The frontend fetches raw TLEs directly from Celestrak; this model lets the
 * backend cache and serve that data without hitting the upstream source every
 * request (important for cloud deployments with rate-limited egress).
 */

const mongoose = require("mongoose");

const satelliteSchema = new mongoose.Schema(
  {
    // NORAD catalog number (unique identifier used by TLE data)
    noradId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },

    // Raw Two-Line Element strings
    tleLine1: { type: String, required: true },
    tleLine2: { type: String, required: true },

    // Last known position (updated by the position endpoint)
    lastPosition: {
      latitude: Number,
      longitude: Number,
      altitude: Number,   // km
      velocity: Number,   // km/s
      timestamp: Date,
    },

    // Metadata
    epoch: { type: Date },
    source: { type: String, default: "celestrak" },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
  }
);

// Index on name for fast search
satelliteSchema.index({ name: "text" });

module.exports = mongoose.model("Satellite", satelliteSchema);
