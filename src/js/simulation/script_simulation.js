// Imports
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getGroundTracks, getLatLngObj, getOrbitTrack, getSatelliteInfo, getSatelliteName } from "tle.js";

// Constants
const scale = 0.02;
const radius = 6371 * scale;
const intervalTime = 1000;
const MAX_SATELLITES = 1000; // upper cap for richer live constellation view
const FALLBACK_SATELLITES_COUNT = 5000;
const REFRESH_TLE_INTERVAL_MS = 60 * 1000;
const SATELLITE_CACHE_KEY = "orbitopedia_satellite_tle_cache_v1";
const isLocalDev =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const SATELLITE_API_CANDIDATES = isLocalDev
  ? ["/api/satellites?limit=1000", "https://orbitopedia.onrender.com/api/satellites?limit=1000"]
  : ["https://orbitopedia.onrender.com/api/satellites?limit=1000", "/api/satellites?limit=1000"];
const BASE_FALLBACK_TLES = [
  `ISS (ZARYA)
1 25544U 98067A   24169.56406250  .00016717  00000+0  30259-3 0  9997
2 25544  51.6413  74.3405 0005465  54.8881  62.6016 15.49894142466761`,
  `HUBBLE SPACE TELESCOPE
1 20580U 90037B   24169.54695190  .00001093  00000+0  59807-4 0  9993
2 20580  28.4695  47.3805 0002970  60.6919  76.6243 15.09200061416251`,
  `NOAA 19
1 33591U 09005A   24169.51714222  .00000138  00000+0  11429-3 0  9990
2 33591  98.9459 159.6719 0014423 176.9155 183.2062 14.12501960908045`,
  `TERRA
1 25994U 99068A   24169.53335552  .00000083  00000+0  58625-4 0  9993
2 25994  98.2127 220.5113 0001698  93.7561  29.5647 14.57111213172570`,
];

function buildExtendedFallbackTles(targetCount = MAX_SATELLITES) {
  const extended = [];
  for (let i = 0; i < targetCount; i += 1) {
    const base = BASE_FALLBACK_TLES[i % BASE_FALLBACK_TLES.length];
    const parts = base.split("\n");
    const label = parts[0] || "SATELLITE";
    const copyIndex = Math.floor(i / BASE_FALLBACK_TLES.length) + 1;
    extended.push(`${label} [${copyIndex}]\n${parts[1]}\n${parts[2]}`);
  }
  return extended;
}

const FALLBACK_TLES = buildExtendedFallbackTles(FALLBACK_SATELLITES_COUNT);

// Global Variables
let satellites = [];
let activeSatellite = null;
let focussed = false;
let previousIntersectedObject = null;
let currentOrbitLine = null; // Global variable to store the current orbit line

const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

// Initialize Scene, Camera, Renderer, and Controls
const { scene, camera, renderer, controls } = initScene();

// Load Earth Texture and Create Earth Mesh
const earthMesh = createEarthMesh();
scene.add(earthMesh);

// Add Lighting to the Scene
addLighting(scene);

// Load and Initialize Satellites
loadSatellitesFromBackend(initializeSatellites);

// Event Listeners
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("click", onMouseClick);
window.addEventListener("resize", handleWindowResize);
document.getElementById("checkbox").addEventListener("change", toggleFocus);
document.getElementById("key").addEventListener("blur", hideSuggestions);
document.getElementById("key").addEventListener("focus", showSuggestions);
document.getElementById("key").addEventListener("input", filterSatellites);

// Animation Loop
animate();

// Function Definitions

function initScene() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 10000);
  camera.position.set(500, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  return { scene, camera, renderer, controls };
}

function createEarthMesh() {
  const geometry = new THREE.SphereGeometry(radius, 64, 32);
  const material = new THREE.MeshLambertMaterial();

  const loader = new THREE.TextureLoader();
  loader.load(
    "/earthmap_test.webp",
    (texture) => {
      material.map = texture;
      material.color = new THREE.Color("white");
      material.needsUpdate = true;
    },
    undefined,
    (error) => console.error(error)
  );

  const earthMesh = new THREE.Mesh(geometry, material);
  earthMesh.name = "EARTH";
  return earthMesh;
}

function addLighting(scene) {
  const sunLight = new THREE.AmbientLight("white", 1);
  scene.add(sunLight);
}

function toTleString(satelliteRecord) {
  if (!satelliteRecord || !satelliteRecord.tleLine1 || !satelliteRecord.tleLine2) {
    return null;
  }

  const name = satelliteRecord.name || `NORAD ${satelliteRecord.noradId || "UNKNOWN"}`;
  return `${name}\n${satelliteRecord.tleLine1}\n${satelliteRecord.tleLine2}`;
}

function saveSatelliteCache(tles) {
  try {
    if (!Array.isArray(tles) || tles.length === 0) return;
    localStorage.setItem(SATELLITE_CACHE_KEY, JSON.stringify(tles));
  } catch (error) {
    console.warn("Satellite cache save skipped:", error.message);
  }
}

function loadSatelliteCache() {
  try {
    const raw = localStorage.getItem(SATELLITE_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tle) => typeof tle === "string" && tle.includes("\n"));
  } catch (error) {
    console.warn("Satellite cache read skipped:", error.message);
    return [];
  }
}

async function fetchSatellitesFromApi() {
  let lastError = "";

  for (const url of SATELLITE_API_CANDIDATES) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) {
        lastError = `${url} returned ${response.status}`;
        continue;
      }

      const records = await response.json();
      if (!Array.isArray(records) || records.length === 0) {
        lastError = `${url} returned empty satellite list`;
        continue;
      }

      const tles = records
        .map(toTleString)
        .filter(Boolean)
        .slice(0, MAX_SATELLITES);

      if (tles.length > 0) {
        saveSatelliteCache(tles);
        return { tles, source: url };
      }
      lastError = `${url} contained no valid TLE rows`;
    } catch (error) {
      lastError = `${url} failed: ${error.message}`;
    }
  }

  throw new Error(lastError || "Satellite API unreachable");
}

function loadSatellitesFromBackend(callback) {
  setStatus("Loading satellites from backend API...");
  fetchSatellitesFromApi()
    .then(({ tles, source }) => {
      setStatus(`Loaded ${tles.length} satellites from API (${source}).`);
      callback(tles);
    })
    .catch(() => {
      const cachedTles = loadSatelliteCache();
      if (cachedTles.length > 0) {
        setStatus(
          `Live API unavailable. Using cached API snapshot (${cachedTles.length} satellites).`,
          true
        );
        callback(cachedTles);
        return;
      }
      setStatus("Live API unavailable and no cache found. Using synthetic fallback satellites.", true);
      callback(FALLBACK_TLES);
    });
}

function parseTLEList(data, limit) {
  const lines = data.split("\n");
  const tles = [];
  for (let i = 0; i < lines.length; i += 3) {
    const tle = lines.slice(i, i + 3).join("\n").trim();
    if (tle !== "" && !tle.startsWith("<")) tles.push(tle);
    if (limit && tles.length >= limit) break;
  }
  return tles;
}

function initializeSatellites(tles) {
  if (!tles || tles.length === 0) {
    setStatus("Falling back to local sample satellites.", true);
    tles = FALLBACK_TLES;
  }

  const nextSatellites = [];
  let invalidCount = 0;

  for (const tle of tles) {
    try {
      const sat = new Satellite(tle);
      nextSatellites.push(sat);
    } catch (error) {
      invalidCount += 1;
      console.warn("Skipping invalid satellite TLE:", error.message);
    }
  }

  satellites = nextSatellites;
  if (invalidCount > 0) {
    setStatus(
      `Loaded ${tles.length} from backend. Rendering ${satellites.length}, skipped ${invalidCount} invalid rows.`,
      true
    );
  } else {
    setStatus(`Loaded ${satellites.length} satellites from backend.`);
  }

  setInterval(updateAllSatellites, intervalTime);
  setInterval(updateActiveSatellite, intervalTime);
  setInterval(refreshSatellitesFromBackend, REFRESH_TLE_INTERVAL_MS);
}

async function refreshSatellitesFromBackend() {
  try {
    const { tles } = await fetchSatellitesFromApi();
    const nextByName = new Map(
      tles.map((tle) => {
        const satName = getSatelliteName(tle);
        return [satName, tle];
      })
    );

    satellites.forEach((sat) => {
      const replacement = nextByName.get(sat.satName);
      if (replacement && replacement !== sat.tle) {
        sat.tle = replacement;
      }
    });
  } catch (error) {
    console.warn("Satellite refresh skipped:", error.message);
  }
}

function setStatus(message, isError = false) {
  const el = document.getElementById("tle-status");
  if (!el) return;
  el.textContent = message;
  el.className = isError ? "status error" : "status";
}

class Satellite {
  constructor(tle) {
    this.tle = tle;
    this.satName = getSatelliteName(this.tle);
    // console.log(this.satName);
    this.updateSatelliteInfo();

    this.dotMesh = createSatelliteMesh(this);
    scene.add(this.dotMesh);
  }

  updateSatelliteInfo() {
    const _info = getSatelliteInfo(this.tle);
    if (
      !_info ||
      !Number.isFinite(_info.lat) ||
      !Number.isFinite(_info.lng) ||
      !Number.isFinite(_info.height)
    ) {
      throw new Error(`Invalid orbital solution for ${this.satName}`);
    }
    this.lat = _info.lat;
    this.lng = _info.lng;
    this.height = _info.height;
    this.velocity = _info.velocity;
    this.position = calcPosFromLatLonRad(
      this.lat,
      this.lng,
      radius + this.height * scale
    );
  }

  updateSatelliteMeshPosition() {
    this.dotMesh.position.set(...this.position);
  }

  updateSatellite() {
    this.updateSatelliteInfo();
    this.updateSatelliteMeshPosition();
  }
}

function createSatelliteMesh(satelliteInstance) {
  const dotGeo = new THREE.SphereGeometry(radius / 250, 10, 10);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const dotMesh = new THREE.Mesh(dotGeo, dotMat);
  dotMesh.visible = true;
  dotMesh.name = "SATELLITE";
  dotMesh.userData.satellite = satelliteInstance;
  // console.log(dotMesh.userData.satellite);
  return dotMesh;
}

function calcPosFromLatLonRad(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return [x, y, z];
}

function onMouseMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(scene.children);

  if (intersects.length > 0) {
    handleObjectIntersection(intersects[0].object, event);
  } else if (previousIntersectedObject) {
    resetPreviousIntersectedObject();
  }
}

function handleObjectIntersection(intersectedObject, event) {
  if (previousIntersectedObject !== intersectedObject) {
    resetPreviousIntersectedObject();

    if (intersectedObject.name === "SATELLITE") {
      highlightSatellite(intersectedObject);
      showSatelliteName(intersectedObject, event);
      document.body.style.cursor = "pointer";
    }

    previousIntersectedObject = intersectedObject;
  }
}

function resetPreviousIntersectedObject() {
  if (previousIntersectedObject) {
    const isNotActiveSatellite =
      activeSatellite == null ||
      previousIntersectedObject !== activeSatellite.dotMesh;

    if (isNotActiveSatellite) {
      previousIntersectedObject.material.color.set(0xffffff);
    }

    const oldDiv = document.querySelector(".floatingName");
    if (oldDiv) document.body.removeChild(oldDiv);
    document.body.style.cursor = "auto";
  }
  previousIntersectedObject = null;
}

function highlightSatellite(intersectedObject) {
  const isNotActiveSatellite =
    activeSatellite == null || intersectedObject !== activeSatellite.dotMesh;

  if (isNotActiveSatellite) {
    intersectedObject.material.color.set(0x00ff00);
  }
}

function showSatelliteName(intersectedObject, event) {
  const newDiv = document.createElement("div");
  newDiv.className = "floatingName";
  newDiv.innerText = intersectedObject.userData.satellite.satName;
  // newDiv.innerText = "HELLO";
  newDiv.style.left = event.clientX - 30 + "px";
  newDiv.style.top = event.clientY - 35 + "px";
  newDiv.style.zIndex = 20;
  newDiv.style.visibility = "visible";
  document.body.appendChild(newDiv);
  // console.log(newDiv);
  // console.log(`X: ${event.clientX}, Y: ${event.clientY}`);
  // console.log(newDiv.style.left);
  // console.log(newDiv.innerHTML);
}

function onMouseClick(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(scene.children);

  if (intersects.length > 0) {
    const intersectedObject = intersects[0].object;

    if (intersectedObject.name === "SATELLITE") {
      const selectedSatellite = intersectedObject.userData.satellite;
      setActiveSat(selectedSatellite);
    }
  }
}

function toggleFocus() {
  focussed = checkbox.checked;
  if (!focussed) resetCamera();
}

function resetCamera() {
  controls.target.set(0, 0, 0);
  camera.lookAt(0, 0, 0);
}

function setActiveSat(satellite) {
  // console.log(satellite.tle);
  if (activeSatellite != null) {
    activeSatellite.dotMesh.material.color.set(0xffffff);
  }

  activeSatellite = satellite;
  updateSatelliteInfoPanel(satellite);

  satellite.dotMesh.material.color.set(0xff0000);

  // Set camera position
  camera.position.set(
    satellite.position[0] + 20,
    satellite.position[1] + 20,
    satellite.position[2] + 20
  );
  focussed = true;
  checkbox.checked = true;

  // Remove previous orbit line
  if (currentOrbitLine) {
    scene.remove(currentOrbitLine);
  }

  // Calculate and create new orbit line
  getGroundTracks({tle: satellite.tle, isLngLatFormat: false})
  .then(function (orbits) {
    console.log(orbits);
    const orbitPositions = calculateOrbit(satellite, orbits[1]);
    currentOrbitLine = createOrbitLine(orbitPositions);
    scene.add(currentOrbitLine);
  });
  // const orbitPositions = calculateOrbit(satellite);
}

function updateSatelliteInfoPanel(satellite) {
  document.getElementById("name").innerText = satellite.satName;
  document.getElementById("lat").innerText = satellite.lat;
  document.getElementById("lng").innerText = satellite.lng;
  document.getElementById("height").innerText = satellite.height;
  document.getElementById("velocity").innerText = satellite.velocity;
}

function hideSuggestions() {
  const suggestionTimeout = setTimeout(() => {
    console.log("Unfocussed");
    document.getElementById("suggestions").style.display = "none";
  }, 200); // Adjust the delay time as needed
  // document.getElementById("suggestions").style.visibility = "hidden";
}

function showSuggestions() {
  console.log("Focussed");
  document.getElementById("suggestions").style.display = "block";
}

function filterSatellites(event) {
  const keyword = event.target.value.toUpperCase();
  const suggestions = document.getElementById("suggestions");
  suggestions.innerHTML = "";
  document.getElementById("suggestions").style.display = "block";
  document.getElementById("suggestions").style.height = "fit-content";
  document.getElementById("suggestions").style.padding = "10px";
  document.getElementById("suggestions").style.paddingBottom = "40px";

  satellites.forEach((selectedSatellite) => {
    if (selectedSatellite.satName.toUpperCase().includes(keyword)) {
      const itemDiv = document.createElement("div");
      itemDiv.classList.add("item");
      itemDiv.textContent = selectedSatellite.satName;
      suggestions.appendChild(itemDiv);

      // Event listener for suggestion item click
      itemDiv.addEventListener("click", function () {
        // Change color of corresponding satellite
        setActiveSat(selectedSatellite);
      });
    }
  });
}

function updateAllSatellites() {
  satellites.forEach((satellite) => satellite.updateSatellite());
}

function updateActiveSatellite() {
  if (activeSatellite != null) {
    activeSatellite.updateSatellite();
    updateSatelliteInfoPanel(activeSatellite);

    if (focussed) {
      camera.lookAt(
        activeSatellite.position[0] + 20,
        activeSatellite.position[1] + 20,
        activeSatellite.position[2] + 20
      );
      controls.target.set(...activeSatellite.position);
    }
  }
}

function calculateOrbit(satellite, orbit) {
  const positions = [];
  for(var i = 0; i < orbit.length; i++) {
    var position = calcPosFromLatLonRad(
      orbit[i][0],
      orbit[i][1],
      radius + satellite.height * scale
    );
    positions.push(new THREE.Vector3(
      position[0],
      position[1],
      position[2]
    ));
  }
  
  return positions;
}

function createOrbitLine(positions) {
  const geometry = new THREE.BufferGeometry().setFromPoints(positions);
  const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  return new THREE.Line(geometry, material);
}

function handleWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
