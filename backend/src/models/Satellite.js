const mongoose = require("mongoose");

const satelliteSchema = new mongoose.Schema({
  noradId: {
    type: Number,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    index: true,
  },
  tleLine1: String,
  tleLine2: String,
  epochDate: Date,
  inclination: Number,
  eccentricity: Number,
  meanMotion: Number,
  lastUpdated: { type: Date, default: Date.now },
  country: String,
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true });

module.exports = mongoose.model("Satellite", satelliteSchema);