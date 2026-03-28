const positionUrl = "https://api.wheretheiss.at/v1/satellites/25544";
const apodUrl = "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&count=1";

const latEl = document.getElementById("iss-lat");
const lonEl = document.getElementById("iss-lon");
const altEl = document.getElementById("iss-altitude");
const speedEl = document.getElementById("iss-speed");
const updatedEl = document.getElementById("iss-updated");
const crewListEl = document.getElementById("crew-list");
const crewUpdatedEl = document.getElementById("crew-updated");
const errorEl = document.getElementById("iss-error");
const historyEl = document.getElementById("history");
const apodImg = document.getElementById("apod-img");
const apodTitle = document.getElementById("photo-title");
const apodDate = document.getElementById("photo-date");

const history = [];

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
      if (text.startsWith("<")) throw new Error("Got HTML");
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
        if (text.startsWith("<")) continue; // Got HTML, try next proxy
        return JSON.parse(text);
      }
    } catch (e) {
      continue;
    }
  }
  throw new Error(`Failed to fetch data`);
}

function formatCoord(value, suffixPositive, suffixNegative) {
  const num = Number(value);
  if (Number.isNaN(num)) return "--";
  const suffix = num >= 0 ? suffixPositive : suffixNegative;
  return `${Math.abs(num).toFixed(2)}° ${suffix}`;
}

async function fetchPosition() {
  try {
    const data = await fetchJson(positionUrl);

    latEl.textContent = formatCoord(data.latitude, "N", "S");
    lonEl.textContent = formatCoord(data.longitude, "E", "W");
    altEl.textContent = `${(data.altitude || 0).toFixed(1)} km`;
    speedEl.textContent = `${(data.velocity || 0).toFixed(0)} km/h`;
    updatedEl.textContent = new Date().toLocaleTimeString();

    history.unshift({
      time: updatedEl.textContent,
      lat: latEl.textContent,
      lon: lonEl.textContent,
      alt: altEl.textContent,
      speed: speedEl.textContent,
    });
    if (history.length > 8) history.pop();
    renderHistory();
  } catch (e) {
    latEl.textContent = "N/A";
    lonEl.textContent = "N/A";
    altEl.textContent = "N/A";
    speedEl.textContent = "N/A";
    updatedEl.textContent = "Unavailable";
  }
}

function renderHistory() {
  historyEl.innerHTML = history
    .map(
      (item) => `<div class="history-item">
        <strong>${item.time}</strong><br/>
        Lat: ${item.lat}<br/>
        Lon: ${item.lon}<br/>
        Alt: ${item.alt}<br/>
        Speed: ${item.speed}
      </div>`
    )
    .join("");
}

// Current ISS crew with images (Expedition 71 - updated data)
const CREW_DATA = [
  { 
    name: "Oleg Kononenko", 
    role: "Commander",
    country: "Russia",
    agency: "Roscosmos",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Oleg_Kononenko_2019.jpg/220px-Oleg_Kononenko_2019.jpg"
  },
  { 
    name: "Nikolai Chub", 
    role: "Flight Engineer",
    country: "Russia",
    agency: "Roscosmos",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Nikolai_Chub_official_portrait.jpg/220px-Nikolai_Chub_official_portrait.jpg"
  },
  { 
    name: "Tracy C. Dyson", 
    role: "Flight Engineer",
    country: "USA",
    agency: "NASA",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Tracy_Caldwell_Dyson.jpg/220px-Tracy_Caldwell_Dyson.jpg"
  },
  { 
    name: "Matthew Dominick", 
    role: "Flight Engineer",
    country: "USA",
    agency: "NASA",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Matthew_Dominick_official_portrait.jpg/220px-Matthew_Dominick_official_portrait.jpg"
  },
  { 
    name: "Michael Barratt", 
    role: "Flight Engineer",
    country: "USA",
    agency: "NASA",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Michael_R._Barratt_2008.jpg/220px-Michael_R._Barratt_2008.jpg"
  },
  { 
    name: "Jeanette Epps", 
    role: "Flight Engineer",
    country: "USA",
    agency: "NASA",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Jeanette_Epps_official_portrait.jpg/220px-Jeanette_Epps_official_portrait.jpg"
  },
];

function renderCrew() {
  crewListEl.innerHTML = CREW_DATA
    .map((p) => `
      <li class="crew-card">
        <div class="crew-avatar">
          <img src="${p.image}" alt="${p.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=3bc9db&color=fff&size=80'"/>
        </div>
        <div class="crew-info">
          <strong>${p.name}</strong>
          <span class="crew-role">${p.role}</span>
          <span class="crew-agency">${p.agency} • ${p.country}</span>
        </div>
      </li>
    `)
    .join("");
  crewUpdatedEl.textContent = "Expedition 71";
}

async function fetchApod() {
  try {
    const data = await fetchJson(apodUrl);
    const item = Array.isArray(data) ? data[0] : data;
    if (item.media_type !== "image") {
      apodImg.src = "/Homepage/galaxy.jpg";
      apodTitle.textContent = "Galaxy";
      apodDate.textContent = "";
      return;
    }
    apodImg.src = item.url;
    apodImg.alt = item.title || "Astronomy Photo";
    apodTitle.textContent = item.title || "";
    apodDate.textContent = item.date || "";
  } catch (e) {
    // Fallback image
    apodImg.src = "/Homepage/galaxy.jpg";
    apodTitle.textContent = "Cosmic View";
    apodDate.textContent = "";
  }
}

async function refreshAll() {
  errorEl.classList.add("hidden");
  await fetchPosition();
  renderCrew();
}

// Initial load
refreshAll();
fetchApod();

// Auto-refresh position every 10 seconds
setInterval(fetchPosition, 10000);
