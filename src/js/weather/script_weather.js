const solarWindUrl = "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json";
const kpUrl = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";
const auroraUrl = "https://services.swpc.noaa.gov/products/noaa-scales.json";

const speedEl = document.getElementById("sw-speed");
const densityEl = document.getElementById("sw-density");
const swUpdatedEl = document.getElementById("sw-updated");
const kpValueEl = document.getElementById("kp-value");
const kpStatusEl = document.getElementById("kp-status");
const kpBarEl = document.getElementById("kp-bar-fill");
const kpUpdatedEl = document.getElementById("kp-updated");
const auroraEl = document.getElementById("aurora");
const errorEl = document.getElementById("weather-error");

// Multiple CORS proxies to try
const PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function fetchJson(url) {
  // Try direct first
  try {
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      return JSON.parse(text);
    }
  } catch (e) {
    // Direct failed, try proxies
  }

  // Try each proxy
  for (const makeProxy of PROXIES) {
    try {
      const proxyUrl = makeProxy(url);
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const text = await res.text();
        if (text.startsWith("<")) throw new Error("Got HTML instead of JSON");
        return JSON.parse(text);
      }
    } catch (e) {
      continue;
    }
  }
  throw new Error(`Failed to fetch data`);
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
}

function hideError() {
  errorEl.classList.add("hidden");
}

function formatTime(iso) {
  if (!iso) return "--";
  const d = new Date(iso.replace(" ", "T") + "Z");
  return isNaN(d) ? iso : d.toUTCString();
}

async function fetchSolarWind() {
  try {
    const data = await fetchJson(solarWindUrl);
    // Skip header row, get latest entry
    const rows = data.slice(1);
    const last = rows[rows.length - 1];
    if (!last) {
      speedEl.textContent = "N/A";
      densityEl.textContent = "N/A";
      swUpdatedEl.textContent = "No data";
      return;
    }
    // Format: [time_tag, density, speed, temperature]
    const [time, density, speed] = last;
    speedEl.textContent = speed ? Number(speed).toFixed(0) + " km/s" : "N/A";
    densityEl.textContent = density ? Number(density).toFixed(1) + " p/cm³" : "N/A";
    swUpdatedEl.textContent = formatTime(time);
  } catch (e) {
    speedEl.textContent = "N/A";
    densityEl.textContent = "N/A";
    swUpdatedEl.textContent = "Unavailable";
  }
}

function kpStatus(kp) {
  if (kp >= 7) return "Severe storm (Aurora likely)";
  if (kp >= 5) return "Geomagnetic storm";
  if (kp >= 4) return "Active";
  return "Quiet";
}

async function fetchKp() {
  try {
    const data = await fetchJson(kpUrl);
    // Skip header, get latest
    const rows = data.slice(1);
    const last = rows[rows.length - 1];
    if (!last) {
      kpValueEl.textContent = "N/A";
      kpStatusEl.textContent = "No data";
      kpBarEl.style.width = "0%";
      kpUpdatedEl.textContent = "--";
      return;
    }
    // Format: [time_tag, Kp, Kp_fraction, a_running, station_count]
    const [time, kp] = last;
    const kpNum = Number(kp);
    kpValueEl.textContent = isNaN(kpNum) ? "N/A" : kpNum.toFixed(1);
    kpStatusEl.textContent = isNaN(kpNum) ? "Unknown" : kpStatus(kpNum);
    kpBarEl.style.width = isNaN(kpNum) ? "0%" : `${Math.min(9, kpNum) / 9 * 100}%`;
    kpUpdatedEl.textContent = formatTime(time);
  } catch (e) {
    kpValueEl.textContent = "N/A";
    kpStatusEl.textContent = "Unavailable";
    kpBarEl.style.width = "0%";
    kpUpdatedEl.textContent = "--";
  }
}

async function fetchAurora() {
  try {
    const data = await fetchJson(auroraUrl);
    // NOAA scales format - show R, S, G scales
    if (data && typeof data === "object") {
      const items = [];
      if (data["-1"]) {
        const d = data["-1"];
        items.push(`<div class="item"><strong>Current Conditions</strong><br/>R: ${d.R?.Scale || 0} • S: ${d.S?.Scale || 0} • G: ${d.G?.Scale || 0}</div>`);
      }
      if (data["0"]) {
        const d = data["0"];
        items.push(`<div class="item"><strong>Today Forecast</strong><br/>R: ${d.R?.MinorProb || 0}% minor • S: ${d.S?.Scale || 0} • G: ${d.G?.Scale || 0}</div>`);
      }
      if (data["1"]) {
        const d = data["1"];
        items.push(`<div class="item"><strong>Tomorrow</strong><br/>R: ${d.R?.MinorProb || 0}% minor • S: ${d.S?.Scale || 0} • G: ${d.G?.Scale || 0}</div>`);
      }
      if (data["2"]) {
        const d = data["2"];
        items.push(`<div class="item"><strong>Day After</strong><br/>R: ${d.R?.MinorProb || 0}% minor • S: ${d.S?.Scale || 0} • G: ${d.G?.Scale || 0}</div>`);
      }
      auroraEl.innerHTML = items.length ? items.join("") : '<div class="item">No forecast data available</div>';
    } else {
      auroraEl.innerHTML = '<div class="item">No forecast data available</div>';
    }
  } catch (e) {
    auroraEl.innerHTML = '<div class="item">Forecast unavailable</div>';
  }
}

async function refreshWeather() {
  hideError();
  // Fetch all in parallel, each handles its own errors gracefully
  await Promise.allSettled([fetchSolarWind(), fetchKp(), fetchAurora()]);
}

refreshWeather();
setInterval(refreshWeather, 60000); // Refresh every minute
