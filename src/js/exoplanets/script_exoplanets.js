// NASA Exoplanet Archive - simplified query for faster load
const endpoint =
  "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+top+500+pl_name,disc_year,pl_orbper,pl_rade,pl_masse,sy_dist,pl_eqt+from+pscomppars+order+by+disc_year+desc&format=json";

const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sort");
const gridEl = document.getElementById("planets");
const statsEl = document.getElementById("stats");
const errorEl = document.getElementById("exo-error");

let planets = [];
let filtered = [];

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
      if (text.startsWith("<") || text.startsWith("<!")) throw new Error("Got HTML");
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
        if (text.startsWith("<") || text.startsWith("<!")) continue;
        return JSON.parse(text);
      }
    } catch (e) {
      continue;
    }
  }
  throw new Error("Unable to load exoplanet data");
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
}

function hideError() {
  errorEl.classList.add("hidden");
}

function loadSkeleton() {
  gridEl.innerHTML = '<p class="muted" style="padding:20px;">Loading exoplanets from NASA database...</p>';
}

// Fallback exoplanet data (notable exoplanets)
const FALLBACK_PLANETS = [
  { pl_name: "Proxima Centauri b", disc_year: 2016, sy_dist: 1.3, pl_rade: 1.08, pl_masse: 1.27, pl_orbper: 11.2, pl_eqt: 234 },
  { pl_name: "TRAPPIST-1e", disc_year: 2017, sy_dist: 12.1, pl_rade: 0.92, pl_masse: 0.77, pl_orbper: 6.1, pl_eqt: 251 },
  { pl_name: "TRAPPIST-1f", disc_year: 2017, sy_dist: 12.1, pl_rade: 1.04, pl_masse: 0.93, pl_orbper: 9.2, pl_eqt: 219 },
  { pl_name: "TRAPPIST-1g", disc_year: 2017, sy_dist: 12.1, pl_rade: 1.13, pl_masse: 1.15, pl_orbper: 12.4, pl_eqt: 199 },
  { pl_name: "Kepler-442b", disc_year: 2015, sy_dist: 342, pl_rade: 1.34, pl_masse: 2.34, pl_orbper: 112.3, pl_eqt: 233 },
  { pl_name: "Kepler-452b", disc_year: 2015, sy_dist: 430, pl_rade: 1.63, pl_masse: 5.0, pl_orbper: 384.8, pl_eqt: 265 },
  { pl_name: "LHS 1140 b", disc_year: 2017, sy_dist: 12.5, pl_rade: 1.73, pl_masse: 6.98, pl_orbper: 24.7, pl_eqt: 230 },
  { pl_name: "TOI-700 d", disc_year: 2020, sy_dist: 31.1, pl_rade: 1.19, pl_masse: 1.72, pl_orbper: 37.4, pl_eqt: 269 },
  { pl_name: "Kepler-1649c", disc_year: 2020, sy_dist: 91, pl_rade: 1.06, pl_masse: 1.2, pl_orbper: 19.5, pl_eqt: 234 },
  { pl_name: "K2-18b", disc_year: 2015, sy_dist: 38, pl_rade: 2.61, pl_masse: 8.63, pl_orbper: 32.9, pl_eqt: 284 },
  { pl_name: "Gliese 667 Cc", disc_year: 2011, sy_dist: 6.8, pl_rade: 1.5, pl_masse: 3.8, pl_orbper: 28.1, pl_eqt: 277 },
  { pl_name: "Ross 128 b", disc_year: 2017, sy_dist: 3.37, pl_rade: 1.1, pl_masse: 1.35, pl_orbper: 9.9, pl_eqt: 280 },
  { pl_name: "Wolf 1061c", disc_year: 2015, sy_dist: 4.31, pl_rade: 1.64, pl_masse: 3.41, pl_orbper: 17.9, pl_eqt: 223 },
  { pl_name: "Tau Ceti e", disc_year: 2017, sy_dist: 3.65, pl_rade: 1.59, pl_masse: 3.93, pl_orbper: 162.9, pl_eqt: 270 },
  { pl_name: "HD 40307 g", disc_year: 2012, sy_dist: 12.8, pl_rade: 2.4, pl_masse: 7.1, pl_orbper: 197.8, pl_eqt: 250 },
  { pl_name: "55 Cancri e", disc_year: 2004, sy_dist: 12.6, pl_rade: 1.88, pl_masse: 8.08, pl_orbper: 0.74, pl_eqt: 2573 },
  { pl_name: "HD 209458 b", disc_year: 1999, sy_dist: 48, pl_rade: 15.1, pl_masse: 220, pl_orbper: 3.5, pl_eqt: 1449 },
  { pl_name: "Kepler-22b", disc_year: 2011, sy_dist: 189, pl_rade: 2.38, pl_masse: 9.1, pl_orbper: 289.9, pl_eqt: 295 },
  { pl_name: "GJ 1214 b", disc_year: 2009, sy_dist: 14.6, pl_rade: 2.68, pl_masse: 6.26, pl_orbper: 1.58, pl_eqt: 596 },
  { pl_name: "WASP-121b", disc_year: 2015, sy_dist: 270, pl_rade: 20.4, pl_masse: 383, pl_orbper: 1.27, pl_eqt: 2358 },
];

function planetBadge(planet) {
  const radius = planet.pl_rade || 0;
  const temp = planet.pl_eqt || 0;
  const dist = planet.sy_dist || 0;
  const inHabitable = radius > 0.5 && radius < 2.5 && temp > 180 && temp < 320;
  if (inHabitable) return `<span class="pill">Potentially Habitable</span>`;
  if (dist < 20) return `<span class="pill nearby">Nearby Star</span>`;
  return "";
}

function render() {
  const query = searchInput.value.toLowerCase();
  filtered = planets.filter((p) => p.pl_name?.toLowerCase().includes(query));

  const sortBy = sortSelect.value;
  if (sortBy === "disc_year") {
    filtered.sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0)); // Newest first
  } else {
    filtered.sort((a, b) => {
      const av = a[sortBy] ?? Infinity;
      const bv = b[sortBy] ?? Infinity;
      return av - bv;
    });
  }

  statsEl.textContent = `Showing ${Math.min(filtered.length, 100)} of ${filtered.length} planets | ${planets.length} total in database`;

  if (filtered.length === 0) {
    gridEl.innerHTML = '<p class="muted" style="padding:20px;">No planets found matching your search.</p>';
    return;
  }

  gridEl.innerHTML = filtered
    .slice(0, 100)
    .map((p) => {
      const badge = planetBadge(p);
      return `<article class="card">
        <div class="planet-header">
          <h3>${p.pl_name}</h3>
          <p class="muted">Discovered ${p.disc_year || "—"}</p>
        </div>
        ${badge}
        <ul>
          <li><strong>Distance:</strong> ${p.sy_dist ? p.sy_dist.toFixed(1) + " parsecs" : "Unknown"}</li>
          <li><strong>Radius:</strong> ${p.pl_rade ? p.pl_rade.toFixed(2) + " × Earth" : "Unknown"}</li>
          <li><strong>Mass:</strong> ${p.pl_masse ? p.pl_masse.toFixed(2) + " × Earth" : "Unknown"}</li>
          <li><strong>Orbital Period:</strong> ${p.pl_orbper ? p.pl_orbper.toFixed(1) + " days" : "Unknown"}</li>
          <li><strong>Temperature:</strong> ${p.pl_eqt ? p.pl_eqt.toFixed(0) + " K" : "Unknown"}</li>
        </ul>
      </article>`;
    })
    .join("");
}

async function fetchPlanets() {
  loadSkeleton();
  hideError();
  
  try {
    const data = await fetchJson(endpoint);
    if (Array.isArray(data) && data.length > 0) {
      planets = data;
      render();
      return;
    }
  } catch (err) {
    console.log("NASA API failed, using fallback data");
  }
  
  // Use fallback data
  planets = FALLBACK_PLANETS;
  statsEl.textContent = `Showing ${planets.length} notable exoplanets (offline mode)`;
  render();
}

searchInput.addEventListener("input", render);
sortSelect.addEventListener("change", render);

fetchPlanets();
