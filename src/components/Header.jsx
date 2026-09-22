import React from 'react';
import { Truck, Calculator, Settings, History, Fuel } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, fuelPriceData, onRefreshFuel }) {
  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg tracking-tight">Costi Uscite & Interventi</h1>
                <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full font-medium border border-blue-500/30">
                  Casatenovo (LC)
                </span>
              </div>
              <p className="text-xs text-slate-400">Ford Transit Automatico • Calcolo Automatico A/R</p>
            </div>
          </div>

          {/* Fuel Price Live Badge */}
          {fuelPriceData && (
            <div className="hidden md:flex items-center bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 space-x-2 text-xs">
              <Fuel className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-slate-400">Gasolio Lombardia MIMIT: </span>
                <span className="font-bold text-amber-300">{fuelPriceData.avgPrice ? `${fuelPriceData.avgPrice.toFixed(3)} €/L` : 'In caricamento...'}</span>
              </div>
              <button
                onClick={onRefreshFuel}
                title="Aggiorna da Open Data MIMIT"
                className="ml-2 text-slate-400 hover:text-white transition-colors"
              >
                🔄
              </button>
            </div>
          )}

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'calculator'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Calcolatore</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Impostazioni</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Storico</span>
            </button>
          </nav>

        </div>
      </div>
    </header>
  );
}
