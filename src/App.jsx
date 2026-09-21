import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CalculatorTab from './components/CalculatorTab';
import SettingsTab from './components/SettingsTab';
import HistoryTab from './components/HistoryTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('calculator');
  const [settings, setSettings] = useState({
    vehicleModel: "Ford Transit (cambio automatico)",
    fuelConsumption: 9.5,
    wearCostPerKm: 0.25,
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
  });

  const [fuelPriceData, setFuelPriceData] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load Settings, Fuel Price, and History on initial mount
  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, fuelRes, historyRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/fuel-price'),
          fetch('/api/history')
        ]);

        if (settingsRes.ok) {
          const s = await settingsRes.json();
          setSettings(s);
        }

        if (fuelRes.ok) {
          const f = await fuelRes.json();
          setFuelPriceData(f);
        }

        if (historyRes.ok) {
          const h = await historyRes.json();
          setHistoryItems(h);
        }
      } catch (err) {
        console.error('Error loading initial app data:', err);
      } finally {
        setLoading(false);
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
        return data;
      }
    } catch (err) {
      console.error('Error refreshing fuel price:', err);
    }
  };

  const handleSaveSettings = async (newSettings) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Errore durante il salvataggio');
    }
    const data = await res.json();
    setSettings(data.settings);
  };

  const handleSaveHistory = async (historyEntry) => {
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyEntry)
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryItems(prev => [data.item, ...prev]);
      }
    } catch (err) {
      console.error('Error saving history item:', err);
    }
  };

  const handleDeleteHistoryItem = async (id) => {
    try {
      const res = await fetch(`/api/history/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setHistoryItems(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error('Error deleting history item:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-semibold text-sm">Caricamento App Costi Uscite Casatenovo...</p>
        </div>
      </div>
    );
  }

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
          App Calcolo Costi Uscite • Partenza: Casatenovo (LC) • Ford Transit (9,5 L/100km, 0.25 €/km) • Open Data MIMIT Lombardia
        </div>
      </footer>

    </div>
  );
}
