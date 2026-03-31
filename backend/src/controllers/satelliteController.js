/**
 * Satellite Controller
 *
 * Handles all satellite-related API logic:
 *  - Fetching / caching TLE data from Celestrak
 *  - Searching satellites by name
 *  - Computing real-time satellite positions
 *
 * Data flow:
 *   Request → Route → Controller → (DB cache / upstream API) → Response
 */

const axios = require("axios");
const Satellite = require("../models/Satellite");
const { getSatellitePosition: calcPosition, parseTLEFile } = require("../utils/satelliteCalculator");
const mongoose = require("mongoose");

// ── In-memory TLE cache (used when MongoDB is unavailable) ───────────────────
let tleCache = {
  data: [],
  fetchedAt: null,
};

const MAX_SATELLITE_LIMIT = 300;

const TLE_SOURCE_URL =
  process.env.TLE_SOURCE_URL ||
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle";

const TLE_CACHE_TTL = parseInt(process.env.TLE_CACHE_TTL || "3600", 10) * 1000;

// Fallback TLEs – identical to those used by the frontend (script_simulation.js)
const FALLBACK_TLES = [
  {
    name: "ISS (ZARYA)",
    noradId: "25544",
    tleLine1: "1 25544U 98067A   24169.56406250  .00016717  00000+0  30259-3 0  9997",
    tleLine2: "2 25544  51.6413  74.3405 0005465  54.8881  62.6016 15.49894142466761",
  },
  {
    name: "HUBBLE SPACE TELESCOPE",
    noradId: "20580",
    tleLine1: "1 20580U 90037B   24169.54695190  .00001093  00000+0  59807-4 0  9993",
    tleLine2: "2 20580  28.4695  47.3805 0002970  60.6919  76.6243 15.09200061416251",
  },
  {
    name: "NOAA 19",
    noradId: "33591",
    tleLine1: "1 33591U 09005A   24169.51714222  .00000138  00000+0  11429-3 0  9990",
    tleLine2: "2 33591  98.9459 159.6719 0014423 176.9155 183.2062 14.12501960908045",
  },
  {
    name: "TERRA",
    noradId: "25994",
    tleLine1: "1 25994U 99068A   24169.53335552  .00000083  00000+0  58625-4 0  9993",
    tleLine2: "2 25994  98.2127 220.5113 0001698  93.7561  29.5647 14.57111213172570",
  },
];

// ── Helper: fetch TLE data from Celestrak ────────────────────────────────────

async function fetchTLEsFromCelestrak() {
  const response = await axios.get(TLE_SOURCE_URL, { timeout: 10000 });
  return parseTLEFile(response.data);
}

async function upsertSatellites(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return;
  }

  const now = new Date();
  const ops = records
    .filter(
      (sat) =>
        sat &&
        sat.name &&
        sat.tleLine1 &&
        sat.tleLine2 &&
        sat.noradId !== null &&
        sat.noradId !== undefined
    )
    .map((sat) => ({
      updateOne: {
        filter: { noradId: Number(sat.noradId) },
        update: {
          $set: {
            name: sat.name,
            tleLine1: sat.tleLine1,
            tleLine2: sat.tleLine2,
            lastUpdated: now,
          },
        },
        upsert: true,
      },
    }));

  if (ops.length > 0) {
    await Satellite.bulkWrite(ops, { ordered: false });
  }
}

// ── Helper: get satellites from cache / DB ────────────────────────────────────

async function getSatellites() {
  const dbConnected = mongoose.connection.readyState === 1;

  if (dbConnected) {
    // Keep DB-backed satellites refreshed on a TTL schedule.
    const now = Date.now();
    const latest = await Satellite.findOne().sort({ lastUpdated: -1 }).select("lastUpdated").lean();
    const hasFreshData =
      latest &&
      latest.lastUpdated &&
      now - new Date(latest.lastUpdated).getTime() < TLE_CACHE_TTL;

    if (hasFreshData) {
      return Satellite.find().lean();
    }

    try {
      const fresh = await fetchTLEsFromCelestrak();
      await upsertSatellites(fresh);
      return fresh;
    } catch (err) {
      console.error("Celestrak refresh failed, checking existing DB cache:", err.message);
      const existing = await Satellite.find().lean();
      if (existing.length > 0) {
        return existing;
      }

      console.log("No cached DB satellites found, storing fallback TLEs.");
      await upsertSatellites(FALLBACK_TLES);
      return FALLBACK_TLES;
    }
  }

  // No DB – use in-memory cache
  const now = Date.now();
  if (tleCache.data.length && tleCache.fetchedAt && now - tleCache.fetchedAt < TLE_CACHE_TTL) {
    return tleCache.data;
  }

  try {
    const fresh = await fetchTLEsFromCelestrak();
    tleCache = { data: fresh, fetchedAt: now };
    return fresh;
  } catch (err) {
    console.error("Celestrak fetch failed, using cached/fallback TLEs:", err.message);
    return tleCache.data.length ? tleCache.data : FALLBACK_TLES;
  }
}

// ── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/satellites
 * Returns all satellite TLE records (capped at 300 for performance,
 * matching the frontend limit in script_simulation.js).
 */
async function getAllSatellites(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit || String(MAX_SATELLITE_LIMIT), 10), MAX_SATELLITE_LIMIT);
    const satellites = await getSatellites();
    res.json(satellites.slice(0, limit));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/satellites/search?q=<name>
 * Search satellites by name (case-insensitive substring match).
 */
async function searchSatellites(req, res, next) {
  try {
    const query = (req.query.q || "").trim();
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const satellites = await getSatellites();
    const lower = query.toLowerCase();
    const results = satellites.filter((s) =>
      s.name.toLowerCase().includes(lower)
    );

    res.json(results);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/satellites/:id
 * Get a single satellite by NORAD catalog number.
 */
async function getSatelliteById(req, res, next) {
  try {
    const { id } = req.params;
    const satellites = await getSatellites();
    const sat = satellites.find((s) => String(s.noradId) === String(id));

    if (!sat) {
      return res.status(404).json({ error: `Satellite with NORAD ID ${id} not found` });
    }

    res.json(sat);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/satellites/position/:id
 * Compute the real-time ground-track position of a satellite using SGP4.
 *
 * Falls back to a basic position object when the satellite.js package is not
 * installed (the package is an optional dependency).
 */
async function getSatellitePosition(req, res, next) {
  try {
    const { id } = req.params;
    const satellites = await getSatellites();
    const sat = satellites.find((s) => String(s.noradId) === String(id));

    if (!sat) {
      return res.status(404).json({ error: `Satellite with NORAD ID ${id} not found` });
    }

    const position = calcPosition(sat.tleLine1, sat.tleLine2);
    if (!position) {
      return res.status(422).json({
        error: "Could not compute position – satellite.js may not be installed.",
        hint: "Run: npm install satellite.js",
      });
    }

    res.json({
      noradId: sat.noradId,
      name: sat.name,
      timestamp: new Date().toISOString(),
      ...position,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllSatellites,
  searchSatellites,
  getSatelliteById,
  getSatellitePosition,
};
