import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { fetchLombardiaGasolioPrice } from './services/mimitService.js';
import { geocodeAddress, calculateRoute } from './services/routingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SETTINGS_FILE = path.join(__dirname, 'data/settings.json');
const HISTORY_FILE = path.join(__dirname, 'data/history.json');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper function to read settings
function getSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) {
    return {
      vehicleModel: "Ford Transit (cambio automatico)",
      fuelConsumption: 9.5,
      wearCostPerKm: 0.25,
      origins: [
        { id: "casatenovo", name: "Sede Operativa Casatenovo (LC)", address: "Via Roma, 23880 Casatenovo LC, Italia", lat: 45.6983, lon: 9.3106, isDefault: true },
        { id: "seregno", name: "Negozio di Seregno (MB)", address: "Seregno MB, Italia", lat: 45.6497, lon: 9.2054, isDefault: false }
      ],
      originName: "Sede Operativa Casatenovo (LC)",
      originAddress: "Via Roma, 23880 Casatenovo LC, Italia",
      originLat: 45.6983,
      originLon: 9.3106,
      staffRoles: [
        { id: "tecnico_ortopedico", name: "Tecnico Ortopedico", hourlyRate: 35.00, isPredefined: true },
        { id: "tecnico_ausili", name: "Tecnico degli Ausili", hourlyRate: 30.00, isPredefined: true }
      ],
      autoFetchFuelPrice: true,
      fallbackFuelPrice: 1.850,
      googleMapsApiKey: ""
    };
  }
  return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
}

// 0. Health check endpoint for Render cold-starts & keep-alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// 1. GET Settings
app.get('/api/settings', (req, res) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Errore lettura impostazioni: ' + err.message });
  }
});

// 2. POST Settings
app.post('/api/settings', (req, res) => {
  try {
    const newSettings = req.body;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(newSettings, null, 2), 'utf8');
    res.json({ message: 'Impostazioni salvate con successo!', settings: newSettings });
  } catch (err) {
    res.status(500).json({ error: 'Errore salvataggio impostazioni: ' + err.message });
  }
});

// 3. GET Fuel Price (MIMIT Open Data)
app.get('/api/fuel-price', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const fuelData = await fetchLombardiaGasolioPrice(force);
    res.json(fuelData);
  } catch (err) {
    res.status(500).json({ error: 'Errore recupero prezzo carburante: ' + err.message });
  }
});

// 4. POST Geocode
app.post('/api/geocode', async (req, res) => {
  try {
    const { query } = req.body;
    const settings = getSettings();
    const result = await geocodeAddress(query, settings.googleMapsApiKey);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. POST Route
app.post('/api/route', async (req, res) => {
  try {
    const { destLat, destLon, originLat: reqOriginLat, originLon: reqOriginLon } = req.body;
    if (!destLat || !destLon) {
      return res.status(400).json({ error: 'Coordinate destinazione mancanti.' });
    }
    const settings = getSettings();
    const originLat = reqOriginLat || settings.originLat || 45.6983;
    const originLon = reqOriginLon || settings.originLon || 9.3106;

    const routeData = await calculateRoute(originLat, originLon, destLat, destLon, settings.googleMapsApiKey);
    res.json(routeData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. POST Calculate Costs
app.post('/api/calculate', async (req, res) => {
  try {
    const {
      distanceKmAR,
      durationMinAR,
      interventionMin = 0,
      selectedStaff = [],
      manualFuelPrice = null,
      originName = 'Sede Operativa Casatenovo (LC)'
    } = req.body;

    if (distanceKmAR === undefined || distanceKmAR === null) {
      return res.status(400).json({ error: 'Distanza A/R non specificata.' });
    }

    const settings = getSettings();
    const fuelConsumption = parseFloat(settings.fuelConsumption || 9.5); // L / 100 km
    const wearCostPerKm = parseFloat(settings.wearCostPerKm || 0.25); // € / km

    // Determine fuel price
    let fuelPrice = parseFloat(manualFuelPrice);
    let fuelSource = 'Manuale (Sovrascritto)';

    if (isNaN(fuelPrice) || fuelPrice <= 0) {
      const fuelData = await fetchLombardiaGasolioPrice(false);
      fuelPrice = parseFloat(fuelData.avgPrice || 1.85);
      fuelSource = fuelData.source || 'MIMIT Open Data Lombardia';
    }

    // 1. Costo Carburante: (Distanza A/R / 100) * Consumo (9.5 l/100km) * Prezzo Gasolio
    const litersUsed = (distanceKmAR / 100) * fuelConsumption;
    const fuelCost = litersUsed * fuelPrice;

    // 2. Costo Usura Mezzo: Distanza A/R * Costo Usura (€/km)
    const wearCost = distanceKmAR * wearCostPerKm;

    // 3. Costo Tempo Personale
    const travelTimeHours = durationMinAR / 60;
    const interventionHours = interventionMin / 60;
    const totalTimeHours = travelTimeHours + interventionHours;

    let hourlyRateSum = 0;
    const staffBreakdown = selectedStaff.map(s => {
      const rate = parseFloat(s.hourlyRate || 0);
      const count = parseInt(s.count || 1, 10);
      const subtotalRate = rate * count;
      hourlyRateSum += subtotalRate;
      const staffTotalCost = subtotalRate * totalTimeHours;
      return {
        id: s.id,
        name: s.name,
        count,
        hourlyRate: rate,
        subtotalRate,
        staffTotalCost: parseFloat(staffTotalCost.toFixed(2))
      };
    });

    const staffCost = totalTimeHours * hourlyRateSum;

    // Costo Totale Uscita
    const totalCost = fuelCost + wearCost + staffCost;

    const responseData = {
      calculationDate: new Date().toISOString(),
      parameters: {
        originName,
        distanceKmAR: parseFloat(distanceKmAR.toFixed(1)),
        durationMinAR: Math.round(durationMinAR),
        travelTimeHours: parseFloat(travelTimeHours.toFixed(2)),
        interventionMin: parseInt(interventionMin, 10),
        interventionHours: parseFloat(interventionHours.toFixed(2)),
        totalTimeHours: parseFloat(totalTimeHours.toFixed(2)),
        fuelConsumption,
        wearCostPerKm,
        fuelPrice: parseFloat(fuelPrice.toFixed(3)),
        fuelSource
      },
      breakdown: {
        litersUsed: parseFloat(litersUsed.toFixed(2)),
        fuelCost: parseFloat(fuelCost.toFixed(2)),
        wearCost: parseFloat(wearCost.toFixed(2)),
        hourlyRateSum: parseFloat(hourlyRateSum.toFixed(2)),
        staffCost: parseFloat(staffCost.toFixed(2)),
        staffBreakdown
      },
      totalCost: parseFloat(totalCost.toFixed(2))
    };

    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: 'Errore durante il calcolo: ' + err.message });
  }
});

// 7. GET History
app.get('/api/history', (req, res) => {
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      return res.json([]);
    }
    const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Errore lettura storico: ' + err.message });
  }
});

// 8. POST History (Save calculation)
app.post('/api/history', (req, res) => {
  try {
    const item = req.body;
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
    item.id = 'CALC-' + Date.now();
    item.createdAt = new Date().toISOString();
    history.unshift(item); // top of list
    // Keep max 50 items
    if (history.length > 50) history = history.slice(0, 50);

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
    res.json({ message: 'Calcolo salvato nello storico!', item });
  } catch (err) {
    res.status(500).json({ error: 'Errore salvataggio storico: ' + err.message });
  }
});

// 9. DELETE History item
app.delete('/api/history/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (fs.existsSync(HISTORY_FILE)) {
      let history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      history = history.filter(h => h.id !== id);
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
    }
    res.json({ message: 'Elemento eliminato dallo storico.' });
  } catch (err) {
    res.status(500).json({ error: 'Errore eliminazione storico: ' + err.message });
  }
});

// Serve static frontend files in production
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start non-blocking background MIMIT fetch
setTimeout(() => {
  fetchLombardiaGasolioPrice(false).catch(err => console.warn('[MIMIT] Non-blocking boot fetch info:', err.message));
}, 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] App Costi Uscite server in esecuzione sulla porta ${PORT} (0.0.0.0)`);
});
