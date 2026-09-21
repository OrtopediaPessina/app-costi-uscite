import React, { useState } from 'react';
import { Settings, Save, Plus, Trash2, Fuel, RefreshCw, Truck, Users, MapPin, Check, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function SettingsTab({ settings, onSaveSettings, fuelPriceData, onRefreshFuel }) {
  const [formState, setFormState] = useState({ ...settings });
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleRate, setNewRoleRate] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [refreshingFuel, setRefreshingFuel] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, val) => {
    setFormState(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleRoleRateChange = (roleId, newRate) => {
    setFormState(prev => ({
      ...prev,
      staffRoles: prev.staffRoles.map(r => r.id === roleId ? { ...r, hourlyRate: parseFloat(newRate) || 0 } : r)
    }));
  };

  const handleAddRole = (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    const rate = parseFloat(newRoleRate) || 0;
    const newRole = {
      id: 'custom_' + Date.now(),
      name: newRoleName.trim(),
      hourlyRate: rate,
      isPredefined: false
    };

    setFormState(prev => ({
      ...prev,
      staffRoles: [...prev.staffRoles, newRole]
    }));

    setNewRoleName('');
    setNewRoleRate('');
  };

  const handleDeleteRole = (roleId) => {
    setFormState(prev => ({
      ...prev,
      staffRoles: prev.staffRoles.filter(r => r.id !== roleId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await onSaveSettings(formState);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Errore salvataggio impostazioni.');
    }
  };

  const handleForceFuelRefresh = async () => {
    setRefreshingFuel(true);
    try {
      await onRefreshFuel(true);
    } finally {
      setRefreshingFuel(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <Settings className="w-6 h-6 text-blue-600" />
              <span>Impostazioni di Calcolo e Parametri Aziendali</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Modifica i parametri del veicolo, i consumi, l'usura e i costi orari del personale senza toccare il codice.
            </p>
          </div>

          {savedSuccess && (
            <div className="flex items-center space-x-1.5 bg-emerald-100 text-emerald-800 px-3.5 py-1.5 rounded-lg text-xs font-bold animate-fadeIn">
              <Check className="w-4 h-4" />
              <span>Impostazioni Salvate!</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-8">
          
          {/* 1. Vehicle Specs */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>1. Modello Veicolo, Consumi e Usura</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Modello Veicolo
                </label>
                <input
                  type="text"
                  value={formState.vehicleModel || ''}
                  onChange={(e) => handleChange('vehicleModel', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Consumo Medio (L / 100 km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formState.fuelConsumption || 9.5}
                  onChange={(e) => handleChange('fuelConsumption', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">Default: 9,5 litri per 100 km</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Costo Usura Veicolo (€ / km)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formState.wearCostPerKm || 0.25}
                  onChange={(e) => handleChange('wearCostPerKm', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">Default: 0,25 €/km (Ammortamento/gomme)</span>
              </div>

            </div>
          </div>

          {/* 2. Staff Professional Roles */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>2. Figure Professionali e Costi Orari (€ / Ora)</span>
            </h3>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              
              {formState.staffRoles && formState.staffRoles.map(role => (
                <div key={role.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm gap-4">
                  <div className="flex-grow">
                    <span className="font-bold text-sm text-slate-900">{role.name}</span>
                    {role.isPredefined && (
                      <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                        Predefinita
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Tariffa Oraria:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={role.hourlyRate}
                      onChange={(e) => handleRoleRateChange(role.id, e.target.value)}
                      className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-sm font-bold text-slate-900 text-right focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-600">€ / h</span>

                    {!role.isPredefined && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                        title="Elimina figura custom"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add New Custom Role Form */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Nome nuova figura professionale..."
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="flex-grow w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                />
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <input
                    type="number"
                    step="0.5"
                    placeholder="€/ora"
                    value={newRoleRate}
                    onChange={(e) => setNewRoleRate(e.target.value)}
                    className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 text-right"
                  />
                  <button
                    type="button"
                    onClick={handleAddRole}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Aggiungi</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* 3. MIMIT Fuel Price Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <Fuel className="w-4 h-4 text-amber-500" />
              <span>3. Dati Carburante MIMIT Open Data (Lombardia)</span>
            </h3>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200">
                <div>
                  <div className="font-bold text-sm text-slate-900">Prezzo Medio Attuale Gasolio Lombardia</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Fonte: {fuelPriceData?.source || 'MIMIT Open Data'} • Impianti scansionati: {fuelPriceData?.stationCount || 0}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Ultimo aggiornamento: {fuelPriceData?.lastUpdated ? new Date(fuelPriceData.lastUpdated).toLocaleString('it-IT') : 'N/A'}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-xl font-extrabold text-amber-600 bg-amber-50 px-3.5 py-1.5 rounded-lg border border-amber-200">
                    {fuelPriceData?.avgPrice ? `${fuelPriceData.avgPrice.toFixed(3)} €/L` : 'N/A'}
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleForceFuelRefresh}
                    disabled={refreshingFuel}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshingFuel ? 'animate-spin' : ''}`} />
                    <span>Aggiorna Ora</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Prezzo Gasolio Fallback (€ / Litro)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={formState.fallbackFuelPrice || 1.850}
                  onChange={(e) => handleChange('fallbackFuelPrice', parseFloat(e.target.value) || 1.85)}
                  className="w-64 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">Usato in caso di assenza di connessione internet per scaricare gli open data MIMIT</span>
              </div>

            </div>
          </div>

          {/* 4. Origin Sede Operativa Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>4. Indirizzo Sede Operativa (Partenza)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Sede Operativa
                </label>
                <input
                  type="text"
                  value={formState.originName || 'Sede Operativa Casatenovo (LC)'}
                  onChange={(e) => handleChange('originName', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Indirizzo Completo
                </label>
                <input
                  type="text"
                  value={formState.originAddress || 'Via Roma, 23880 Casatenovo LC, Italia'}
                  onChange={(e) => handleChange('originAddress', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-slate-200">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all flex items-center space-x-2 text-sm"
            >
              <Save className="w-5 h-5" />
              <span>Salva Impostazioni Aziendali</span>
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}
