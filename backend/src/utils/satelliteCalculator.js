/**
 * Satellite position calculation utilities.
 *
 * Uses the satellite.js library (via the "satellite.js" npm package) to
 * propagate TLE orbital elements and compute the current ground-track
 * position of a satellite.
 *
 * This mirrors the position-calculation logic already used on the frontend
 * (via tle.js / Three.js) so both sides stay consistent.
 */

/**
 * Parse a two-line element set and return the satellite record needed for
 * SGP4/SDP4 propagation.
 *
 * @param {string} tleLine1  - TLE line 1 (69 characters)
 * @param {string} tleLine2  - TLE line 2 (69 characters)
 * @returns {{ satrec: object }|null}
 */
function parseTLE(tleLine1, tleLine2) {
  try {
    // Lazy-require so the module loads without satellite.js installed
    const satellite = require("satellite.js");
    const satrec = satellite.twoline2satrec(tleLine1.trim(), tleLine2.trim());
    return { satrec };
  } catch {
    return null;
  }
}

/**
 * Compute the current geographic position of a satellite.
 *
 * @param {string} tleLine1
 * @param {string} tleLine2
 * @param {Date}   [date]  - Defaults to now.
 * @returns {{ latitude: number, longitude: number, altitude: number, velocity: number }|null}
 */
function getSatellitePosition(tleLine1, tleLine2, date = new Date()) {
  try {
    const satellite = require("satellite.js");
    const parsed = parseTLE(tleLine1, tleLine2);
    if (!parsed) return null;

    const { satrec } = parsed;
    const posVel = satellite.propagate(satrec, date);

    if (!posVel.position || posVel.position === false) return null;

    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(posVel.position, gmst);

    const latitude = satellite.degreesLat(geodetic.latitude);
    const longitude = satellite.degreesLong(geodetic.longitude);
    const altitude = geodetic.height; // km

    // Speed = magnitude of velocity vector (km/s)
    const { x: vx, y: vy, z: vz } = posVel.velocity;
    const velocity = Math.sqrt(vx * vx + vy * vy + vz * vz);

    return { latitude, longitude, altitude, velocity };
  } catch {
    return null;
  }
}

/**
 * Extract the NORAD catalog number from TLE line 1.
 *
 * @param {string} tleLine1
 * @returns {string}
 */
function extractNoradId(tleLine1) {
  return tleLine1.substring(2, 7).trim();
}

/**
 * Parse a plain-text TLE file (name / line1 / line2 triplets) into an array
 * of satellite objects.
 *
 * @param {string} tleText  - Raw TLE file content
 * @returns {Array<{ name: string, noradId: string, tleLine1: string, tleLine2: string }>}
 */
function parseTLEFile(tleText) {
  const lines = tleText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const satellites = [];

  for (let i = 0; i < lines.length; i++) {
    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];

    // TLE lines always start with "1 " and "2 " respectively
    if (i + 2 < lines.length && line1.startsWith("1 ") && line2.startsWith("2 ")) {
      satellites.push({
        name: name.replace(/^0 /, "").trim(), // strip leading "0 " if present
        noradId: extractNoradId(line1),
        tleLine1: line1,
        tleLine2: line2,
      });
      i += 2; // skip the two TLE lines we just consumed
    }
  }

  return satellites;
}

module.exports = { parseTLE, getSatellitePosition, parseTLEFile, extractNoradId };
