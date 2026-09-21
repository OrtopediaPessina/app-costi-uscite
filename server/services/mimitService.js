import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE = path.join(__dirname, '../data/fuel_cache.json');
const SETTINGS_FILE = path.join(__dirname, '../data/settings.json');

const LOMBARDIA_PROVINCES = new Set(['BG', 'BS', 'CO', 'CR', 'LC', 'LO', 'MB', 'MI', 'MN', 'PV', 'SO', 'VA']);

export async function fetchLombardiaGasolioPrice(force = false) {
  try {
    // Check cache freshness (cached if less than 6 hours old and not forced)
    if (!force && fs.existsSync(CACHE_FILE)) {
      const cacheRaw = fs.readFileSync(CACHE_FILE, 'utf8');
      const cache = JSON.parse(cacheRaw);
      const cacheAgeMs = Date.now() - new Date(cache.lastUpdated).getTime();
      const sixHoursMs = 6 * 60 * 60 * 1000;
      if (cacheAgeMs < sixHoursMs && cache.avgPrice > 0) {
        console.log(`[MIMIT] Using cached Lombardia Gasolio price: ${cache.avgPrice} €/L`);
        return cache;
      }
    }

    console.log('[MIMIT] Fetching fresh open data from MIMIT...');
    const [resS, resP] = await Promise.all([
      fetch('https://www.mimit.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }),
      fetch('https://www.mimit.gov.it/images/exportCSV/prezzo_alle_8.csv', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
    ]);

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
    console.log(`[MIMIT] Calculated fresh Lombardia Gasolio price: ${avgPrice} €/L (${count} stations)`);
    return result;

  } catch (error) {
    console.error('[MIMIT] Error fetching fuel data:', error.message);
    
    // Read fallback or existing cache
    if (fs.existsSync(CACHE_FILE)) {
      const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      cache.status = 'warning_stale';
      cache.errorMessage = error.message;
      return cache;
    }

    // Read settings fallback price
    let fallbackPrice = 1.850;
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      if (settings.fallbackFuelPrice) fallbackPrice = settings.fallbackFuelPrice;
    }

    return {
      avgPrice: fallbackPrice,
      lastUpdated: new Date().toISOString(),
      stationCount: 0,
      region: 'Lombardia',
      fuelType: 'Gasolio Self-Service (Fallback)',
      status: 'fallback',
      errorMessage: error.message,
      source: 'Impostazioni Fallback'
    };
  }
}
