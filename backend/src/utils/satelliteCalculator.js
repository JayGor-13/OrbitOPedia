const satellite = require("satellite.js");

/**
 * Parse TLE file format (space-separated lines)
 */
function parseTLEFile(data) {
  const lines = data.trim().split("\n");
  const satellites = [];

  for (let i = 0; i < lines.length; i += 2) {
    if (i + 1 < lines.length) {
      const name = lines[i].trim();
      const tleLine1 = lines[i + 1].trim();
      const tleLine2 = lines[i + 2]?.trim() || "";

      if (tleLine1.startsWith("1 ")) {
        satellites.push({
          name,
          noradId: parseInt(tleLine1.substring(2, 7), 10),
          tleLine1,
          tleLine2,
        });
      }
    }
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

module.exports = { parseTLEFile, getSatellitePosition };