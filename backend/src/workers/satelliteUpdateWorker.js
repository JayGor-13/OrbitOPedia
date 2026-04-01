const mongoose = require("mongoose");
const Satellite = require("../models/Satellite");
const {
  fetchTLEsFromCelestrak,
  upsertSatellites,
} = require("../controllers/satelliteController");

const UPDATE_INTERVAL_MS = parseInt(process.env.SATELLITE_REFRESH_INTERVAL_MS || "3600000", 10);

let updateTimer = null;

async function runSatelliteRefresh() {
  if (mongoose.connection.readyState !== 1) {
    console.warn("Satellite refresh skipped: MongoDB is not connected.");
    return;
  }

  const fresh = await fetchTLEsFromCelestrak();
  await upsertSatellites(fresh);
  const count = await Satellite.countDocuments();
  console.log(`Satellite refresh complete: ${fresh.length} fetched, ${count} persisted.`);
}

function startSatelliteUpdateWorker() {
  if (updateTimer) {
    return;
  }

  runSatelliteRefresh().catch((err) => {
    console.error("Initial satellite refresh failed:", err.message);
  });

  updateTimer = setInterval(() => {
    runSatelliteRefresh().catch((err) => {
      console.error("Scheduled satellite refresh failed:", err.message);
    });
  }, UPDATE_INTERVAL_MS);

  console.log(`Satellite refresh worker started (interval: ${UPDATE_INTERVAL_MS}ms).`);
}

module.exports = { startSatelliteUpdateWorker };
