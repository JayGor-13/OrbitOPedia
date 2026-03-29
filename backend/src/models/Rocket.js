/**
 * Rocket Mongoose model.
 *
 * Mirrors the rocket data structure used by the frontend (script_rockets.js)
 * so the same JSON shape is returned whether data comes from the database or
 * from the bundled seed data.
 */

const mongoose = require("mongoose");

const rocketSchema = new mongoose.Schema(
  {
    // Matches the "id" field used by the frontend (e.g. "001")
    rocketId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    org: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Active", "Retired", "In Development"], default: "Active" },
    content: { type: String, default: "" },

    // Images
    image: { type: String, default: "" },
    images: { type: [String], default: [] },

    // Mission statistics
    missions: { type: Number, default: 0 },
    successes: { type: Number, default: 0 },
    partialFailures: { type: Number, default: 0 },
    failures: { type: Number, default: 0 },
    successStreak: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },

    // Pricing (USD millions)
    price: { type: Number, default: 0 },

    // Physical / performance specs
    height: { type: Number, default: 0 },         // metres
    thrust: { type: Number, default: 0 },         // kN
    stages: { type: Number, default: 0 },
    strapOns: { type: Number, default: 0 },
    fairingDiameter: { type: mongoose.Schema.Types.Mixed, default: 0 }, // metres (or "No Data")
    fairingHeight: { type: mongoose.Schema.Types.Mixed, default: 0 },   // metres

    // Payload capacity
    leo: { type: Number, default: 0 },  // kg
    gto: { type: Number, default: 0 },  // kg
  },
  {
    timestamps: true,
    // Return a plain object shape that matches the frontend data structure
    toJSON: { virtuals: true, versionKey: false },
  }
);

// Virtual to expose rocketId as "id" for frontend compatibility
rocketSchema.virtual("id").get(function () {
  return this.rocketId;
});

module.exports = mongoose.model("Rocket", rocketSchema);
