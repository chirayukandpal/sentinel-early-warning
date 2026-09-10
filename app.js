// Spatial boundaries and physical parameters for Silchar, Assam wards
const WARDS = [
  {
    id: "ward-07",
    name: "Ward 7 - Bethukandi Basin",
    coords: [[24.832, 92.795], [24.839, 92.815], [24.820, 92.825], [24.815, 92.802]],
    elevation: 19.8,
    drainage: 0.22,
    sensitivity: 1.9
  },
  {
    id: "ward-04",
    name: "Ward 4 - Tarapur / Railway Stn",
    coords: [[24.838, 92.765], [24.845, 92.782], [24.832, 92.795], [24.825, 92.775]],
    elevation: 22.4,
    drainage: 0.38,
    sensitivity: 1.4
  },
  {
    id: "ward-12",
    name: "Ward 12 - Rangirkhari Corridor",
    coords: [[24.825, 92.775], [24.815, 92.802], [24.798, 92.792], [24.805, 92.768]],
    elevation: 25.1,
    drainage: 0.55,
    sensitivity: 1.1
  },
  {
    id: "ward-02",
    name: "Ward 2 - Malugram Riverfront",
    coords: [[24.848, 92.750], [24.855, 92.770], [24.845, 92.782], [24.838, 92.765]],
    elevation: 21.0,
    drainage: 0.30,
    sensitivity: 1.6
  }
];

const TIMESTEP_DATA = {
  // T+0: Completely calm / normal pre-monsoon conditions (Zero risk, gauges calm)
  "T+0": { rain: 2.0, tempShift: 20, cape: 650 }, 
  // T+2: Convective cloud-top cooling starts aloft (Warning stage)
  "T+2": { rain: 42.0, tempShift: -18, cape: 2900 },
  // T+4: Peak cloudburst & flash flood failure (Critical disaster stage)
  "T+4": { rain: 95.0, tempShift: -34, cape: 4100 },
  // T+6: Storm dissipates but low basins remain submerged
  "T+6": { rain: 35.0, tempShift: -15, cape: 2400 }
};

let currentStep = "T+2";
let activeLayer = "ALL";
let selectedWard = WARDS[0];
let polygonLayers = {};

// Initialize Leaflet Map centered on Silchar, Assam
const map = L.map('map', { zoomControl: false }).setView([24.825, 92.790], 13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CARTO'
}).addTo(map);

function calculateMetrics(ward, step) {
  const cfg = TIMESTEP_DATA[step];
  const rain = (cfg.rain * ward.sensitivity).toFixed(1);
  const temp = -45 + cfg.tempShift;
  const cape = Math.round(cfg.cape * ward.sensitivity * 0.8);
  const inundation = Math.max(0, (((rain * (1 - ward.drainage)) / 26.0) * (26.0 / ward.elevation))).toFixed(2);
  
  let risk = "LOW";
  if (inundation > 1.2 || rain > 80) risk = "CRITICAL";
  else if (inundation > 0.6 || rain > 45) risk = "HIGH";
  else if (inundation > 0.2) risk = "MODERATE";

  const confidence = (94.2 - (["T+0","T+2","T+4","T+6"].indexOf(step) * 2.8)).toFixed(1);

  return { rain, temp, cape, inundation, risk, confidence };
}

function getColor(metrics) {
  if (activeLayer === "FLOOD") {
    if (metrics.inundation > 1.0) return "#EF4444";
    if (metrics.inundation > 0.5) return "#F97316";
    return "#3B82F6";
  }
  if (metrics.risk === "CRITICAL") return "#EF4444";
  if (metrics.risk === "HIGH") return "#F97316";
  if (metrics.risk === "MODERATE") return "#FBBF24";
  return "#10B981";
}

function updateMap() {
  WARDS.forEach(ward => {
    const metrics = calculateMetrics(ward, currentStep);
    const color = getColor(metrics);
    const isSelected = selectedWard.id === ward.id;

    if (polygonLayers[ward.id]) {
      map.removeLayer(polygonLayers[ward.id]);
    }

    const poly = L.polygon(ward.coords, {
      color: color,
      fillColor: color,
      fillOpacity: isSelected ? 0.65 : 0.4,
      weight: isSelected ? 3 : 1.5,
      dashArray: isSelected ? "4" : null
    }).addTo(map);

    poly.bindTooltip(ward.name, { direction: 'center', opacity: 0.9 });
    poly.on('click', () => {
      selectedWard = ward;
      updateMap();
      updateInspector();
    });

    polygonLayers[ward.id] = poly;
  });
}

function updateInspector() {
  const metrics = calculateMetrics(selectedWard, currentStep);
  document.getElementById('ward-name').innerHTML = `<i data-lucide="map-pin" class="w-4 h-4 text-red-400"></i> ${selectedWard.name}`;
  document.getElementById('val-rain').innerText = metrics.rain;
  document.getElementById('val-flood').innerText = metrics.inundation;
  document.getElementById('val-temp').innerText = metrics.temp;
  document.getElementById('val-cape').innerText = metrics.cape;
  document.getElementById('val-elevation').innerText = selectedWard.elevation + 'm';
  document.getElementById('val-confidence').innerText = metrics.confidence + '%';
  
  const riskPill = document.getElementById('ward-risk-pill');
  riskPill.innerText = `${metrics.risk} RISK`;
  riskPill.className = `text-[10px] font-bold px-2 py-0.5 rounded-full border ${
    metrics.risk === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
    metrics.risk === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' :
    'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
  }`;

  lucide.createIcons();
}

function setTimestep(step) {
  currentStep = step;
  document.getElementById('lead-time-pill').innerText = `Horizon: ${step} hours`;
  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.className = "step-btn py-2 text-xs font-bold rounded-lg border bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-700/50 hover:text-white";
  });
  document.getElementById(`step-${step}`).className = "step-btn py-2 text-xs font-bold rounded-lg border bg-indigo-600 border-indigo-400 text-white shadow-lg";
  updateMap();
  updateInspector();
}

function setLayer(layer) {
  activeLayer = layer;
  ['ALL', 'RAIN', 'FLOOD'].forEach(l => {
    const btn = document.getElementById(`btn-${l}`);
    btn.className = (l === layer)
      ? "px-3 py-1.5 rounded-lg font-medium bg-indigo-600 text-white transition"
      : "px-3 py-1.5 rounded-lg font-medium text-slate-400 hover:text-white transition";
  });
  updateMap();
}

function triggerCapModal() {
  const now = new Date();
  document.getElementById('modal-id').innerText = `Identifier: NDMA-CAP-AS-${now.getTime()}-01`;
  document.getElementById('modal-headline').innerText = `FLASH FLOOD NOWCAST: 3h Lead Time for ${selectedWard.name}`;
  document.getElementById('modal-target').innerText = `Assam, Cachar District, ${selectedWard.name}`;
  const modal = document.getElementById('cap-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeCapModal() {
  const modal = document.getElementById('cap-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// Initial setup on load
updateMap();
updateInspector();
lucide.createIcons();
