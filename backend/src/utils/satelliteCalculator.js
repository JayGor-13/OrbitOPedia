const satellite = require("satellite.js");

/**
 * Parse TLE file format (space-separated lines)
 */
function parseTLEFile(data) {
  const lines = data
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const satellites = [];

  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i];
    const tleLine1 = lines[i + 1];
    const tleLine2 = lines[i + 2];

    if (!tleLine1.startsWith("1 ") || !tleLine2.startsWith("2 ")) {
      continue;
    }

    satellites.push({
      name,
      noradId: parseInt(tleLine1.substring(2, 7), 10),
      tleLine1,
      tleLine2,
    });
  }

  return satellites;
}

/**
 * Calculate real-time satellite position using SGP4
 */
function getSatellitePosition(tleLine1, tleLine2) {
  try {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const positionAndVelocity = satellite.propagate(satrec, new Date());

    if (positionAndVelocity.error) {
      console.error("Propagation error:", positionAndVelocity.error);
      return null;
    }

    const { position, velocity } = positionAndVelocity;
    const gmst = satellite.gstime(new Date());
    const positionEcf = satellite.eciToEcf(position, gmst);

    const latitude = Math.atan2(positionEcf.y, positionEcf.x);
    const longitude = Math.atan2(
      positionEcf.z,
      Math.sqrt(positionEcf.x * positionEcf.x + positionEcf.y * positionEcf.y)
    );

    return {
      latitude: (latitude * 180) / Math.PI,
      longitude: (longitude * 180) / Math.PI,
      altitude: Math.sqrt(
        positionEcf.x ** 2 + positionEcf.y ** 2 + positionEcf.z ** 2
      ) - 6371,
    };
  } catch (err) {
    console.error("Position calculation error:", err);
    return null;
  }
}

function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

function round(value, decimals = 6) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Extract relatively static orbital metadata from a TLE pair.
 * These values are persisted and refreshed from upstream every hour.
 */
function extractOrbitalElements(tleLine1, tleLine2) {
  try {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);

    if (!satrec || Number.isNaN(satrec.no) || satrec.no <= 0) {
      return null;
    }

    const earthRadiusKm = 6371;
    const muKm3PerSec2 = 398600.4418;
    const meanMotionRadPerMin = satrec.no;
    const meanMotionRadPerSec = meanMotionRadPerMin / 60;
    const meanMotionRevPerDay = (meanMotionRadPerMin * 1440) / (2 * Math.PI);
    const periodMinutes = (2 * Math.PI) / meanMotionRadPerMin;

    const semiMajorAxisKm = Math.cbrt(
      muKm3PerSec2 / (meanMotionRadPerSec * meanMotionRadPerSec)
    );
    const eccentricity = satrec.ecco;
    const apogeeKm = semiMajorAxisKm * (1 + eccentricity) - earthRadiusKm;
    const perigeeKm = semiMajorAxisKm * (1 - eccentricity) - earthRadiusKm;

    let epochDate = null;
    if (satrec.jdsatepoch && Number.isFinite(satrec.jdsatepoch)) {
      epochDate = satellite.jdayToDate(satrec.jdsatepoch);
    }

    return {
      epochDate,
      inclination: round(toDegrees(satrec.inclo), 6),
      eccentricity: round(eccentricity, 9),
      meanMotion: round(meanMotionRevPerDay, 8),
      semiMajorAxis: round(semiMajorAxisKm, 3),
      argumentOfPerigee: round(toDegrees(satrec.argpo), 6),
      meanAnomaly: round(toDegrees(satrec.mo), 6),
      apogee: round(apogeeKm, 3),
      perigee: round(perigeeKm, 3),
      period: round(periodMinutes, 6),
      raan: round(toDegrees(satrec.nodeo), 6),
    };
  } catch (err) {
    console.error("Orbital extraction error:", err.message);
    return null;
  }
}

module.exports = { parseTLEFile, getSatellitePosition, extractOrbitalElements };
