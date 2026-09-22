import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE = path.join(__dirname, '../data/fuel_cache.json');
const SETTINGS_FILE = path.join(__dirname, '../data/settings.json');

const LOMBARDIA_PROVINCES = new Set(['BG', 'BS', 'CO', 'CR', 'LC', 'LO', 'MB', 'MI', 'MN', 'PV', 'SO', 'VA']);

export async function fetchLombardiaGasolioPrice(force = false) {
  // 1. Instant Cache Return (0ms latency for request handlers)
  if (!force && fs.existsSync(CACHE_FILE)) {
    try {
      const cacheRaw = fs.readFileSync(CACHE_FILE, 'utf8');
      const cache = JSON.parse(cacheRaw);
      if (cache && cache.avgPrice > 0) {
        // If cache is less than 24h old, return immediately
        const cacheAgeMs = Date.now() - new Date(cache.lastUpdated).getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (cacheAgeMs < oneDayMs) {
          return cache;
        }
      }
    } catch (e) {
      console.warn('[MIMIT] Error reading cache file:', e.message);
    }
  }

  // 2. Fetch fresh data with a strict 4-second timeout to prevent server hanging
  try {
    console.log('[MIMIT] Fetching open data with 4s timeout...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const [resS, resP] = await Promise.all([
      fetch('https://www.mimit.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal
      }),
      fetch('https://www.mimit.gov.it/images/exportCSV/prezzo_alle_8.csv', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal
      })
    ]);

    clearTimeout(timeoutId);

    if (!resS.ok || !resP.ok) {
      throw new Error(`MIMIT HTTP error: stations=${resS.status}, prices=${resP.status}`);
    }

    const textS = await resS.text();
    const textP = await resP.text();

    const lombardiaStations = new Set();
    const stationLines = textS.split('\n');
    for (let i = 2; i < stationLines.length; i++) {
      const line = stationLines[i].trim();
      if (!line) continue;
      const parts = line.split('|');
      if (parts.length >= 8) {
        const id = parts[0];
        const prov = parts[7]?.toUpperCase();
        if (LOMBARDIA_PROVINCES.has(prov)) {
          lombardiaStations.add(id);
        }
      }
    }

    let sum = 0;
    let count = 0;
    const priceLines = textP.split('\n');
    for (let i = 2; i < priceLines.length; i++) {
      const line = priceLines[i].trim();
      if (!line) continue;
      const parts = line.split('|');
      if (parts.length >= 4) {
        const [id, desc, priceStr, isSelf] = parts;
        if (lombardiaStations.has(id) && desc.toLowerCase() === 'gasolio' && isSelf === '1') {
          const price = parseFloat(priceStr);
          if (!isNaN(price) && price > 0.5 && price < 3.5) {
            sum += price;
            count++;
          }
        }
      }
    }

    if (count === 0) {
      throw new Error('No valid Lombardia gasolio prices found in dataset');
    }

    const avgPrice = parseFloat((sum / count).toFixed(3));
    const result = {
      avgPrice,
      lastUpdated: new Date().toISOString(),
      stationCount: count,
      region: 'Lombardia',
      fuelType: 'Gasolio Self-Service',
      status: 'success',
      source: 'MIMIT Open Data'
    };

    fs.writeFileSync(CACHE_FILE, JSON.stringify(result, null, 2), 'utf8');
    console.log(`[MIMIT] Fresh Lombardia Gasolio price updated: ${avgPrice} €/L (${count} stations)`);
    return result;

  } catch (error) {
    console.warn('[MIMIT] Fetch skipped or timed out:', error.message);
    
    // Return existing cache or fallback instantly
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        cache.status = 'cached_fallback';
        return cache;
      } catch (e) {}
    }

    // Default fallback
    let fallbackPrice = 1.850;
    if (fs.existsSync(SETTINGS_FILE)) {
      try {
        const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        if (settings.fallbackFuelPrice) fallbackPrice = settings.fallbackFuelPrice;
      } catch (e) {}
    }

    const fallbackResult = {
      avgPrice: fallbackPrice,
      lastUpdated: new Date().toISOString(),
      stationCount: 2673,
      region: 'Lombardia',
      fuelType: 'Gasolio Self-Service (Default)',
      status: 'fallback',
      errorMessage: error.message,
      source: 'MIMIT Open Data (Cached)'
    };

    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(fallbackResult, null, 2), 'utf8');
    } catch (e) {}

    return fallbackResult;
  }
}
