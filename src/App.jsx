import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CalculatorTab from './components/CalculatorTab';
import SettingsTab from './components/SettingsTab';
import HistoryTab from './components/HistoryTab';

const DEFAULT_SETTINGS = {
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

const DEFAULT_FUEL = {
  avgPrice: 1.850,
  lastUpdated: new Date().toISOString(),
  stationCount: 2673,
  region: "Lombardia",
  fuelType: "Gasolio Self-Service",
  status: "success",
  source: "MIMIT Open Data (Predefinito)"
};

export default function App() {
  const [activeTab, setActiveTab] = useState('calculator');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [fuelPriceData, setFuelPriceData] = useState(DEFAULT_FUEL);
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(false); // Immediate 0ms UI load!

  // Load Settings, Fuel Price, and History asynchronously without blocking the UI
  useEffect(() => {
    async function loadData() {
      // 1. Load from localStorage first if available
      try {
        const localS = localStorage.getItem('app_settings');
        if (localS) setSettings(JSON.parse(localS));
        const localF = localStorage.getItem('app_fuel');
        if (localF) setFuelPriceData(JSON.parse(localF));
        const localH = localStorage.getItem('app_history');
        if (localH) setHistoryItems(JSON.parse(localH));
      } catch (e) {}

      // 2. Fetch API with 2.5s timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const [settingsRes, fuelRes, historyRes] = await Promise.allSettled([
          fetch('/api/settings', { signal: controller.signal }),
          fetch('/api/fuel-price', { signal: controller.signal }),
          fetch('/api/history', { signal: controller.signal })
        ]);

        clearTimeout(timeoutId);

        if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
          const s = await settingsRes.value.json();
          setSettings(s);
          try { localStorage.setItem('app_settings', JSON.stringify(s)); } catch (e) {}
        }

        if (fuelRes.status === 'fulfilled' && fuelRes.value.ok) {
          const f = await fuelRes.value.json();
          setFuelPriceData(f);
          try { localStorage.setItem('app_fuel', JSON.stringify(f)); } catch (e) {}
        }

        if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
          const h = await historyRes.value.json();
          setHistoryItems(h);
          try { localStorage.setItem('app_history', JSON.stringify(h)); } catch (e) {}
        }
      } catch (err) {
        console.warn('Background API sync info:', err.message);
      }
    }

    loadData();
  }, []);

  const handleRefreshFuel = async (force = false) => {
    try {
      const res = await fetch(`/api/fuel-price?force=${force}`);
      if (res.ok) {
        const data = await res.json();
        setFuelPriceData(data);
        try { localStorage.setItem('app_fuel', JSON.stringify(data)); } catch (e) {}
        return data;
      }
    } catch (err) {
      console.error('Error refreshing fuel price:', err);
    }
  };

  const handleSaveSettings = async (newSettings) => {
    setSettings(newSettings);
    try { localStorage.setItem('app_settings', JSON.stringify(newSettings)); } catch (e) {}
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSettings(data.settings);
      }
    } catch (err) {
      console.warn('Saved settings to local storage only:', err.message);
    }
  };

  const handleSaveHistory = async (historyEntry) => {
    const item = {
      ...historyEntry,
      id: 'CALC-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setHistoryItems(prev => {
      const updated = [item, ...prev].slice(0, 50);
      try { localStorage.setItem('app_history', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyEntry)
      });
    } catch (err) {
      console.warn('Saved history to local storage:', err.message);
    }
  };

  const handleDeleteHistoryItem = async (id) => {
    setHistoryItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      try { localStorage.setItem('app_history', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    try {
      await fetch(`/api/history/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Deleted from local storage:', err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      
      {/* Navbar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fuelPriceData={fuelPriceData}
        onRefreshFuel={() => handleRefreshFuel(true)}
      />

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeTab === 'calculator' && (
          <CalculatorTab
            settings={settings}
            fuelPriceData={fuelPriceData}
            onSaveHistory={handleSaveHistory}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onSaveSettings={handleSaveSettings}
            fuelPriceData={fuelPriceData}
            onRefreshFuel={handleRefreshFuel}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            historyItems={historyItems}
            onDeleteHistoryItem={handleDeleteHistoryItem}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          App Calcolo Costi Uscite • Partenza: Casatenovo (LC) / Seregno (MB) • Ford Transit • Open Data MIMIT Lombardia
        </div>
      </footer>

    </div>
  );
}
