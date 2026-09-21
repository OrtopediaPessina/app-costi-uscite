import React, { useState, useEffect } from 'react';
import { Search, MapPin, Users, Clock, Fuel, Sparkles, AlertCircle, Loader2, Navigation, CheckSquare, Building2, Store } from 'lucide-react';
import RouteMap from './RouteMap';
import CostBreakdownCard from './CostBreakdownCard';
import { formatCurrency } from '../utils/formatters';

const QUICK_CITIES = ['Merate', 'Lecco', 'Monza', 'Bellano', 'Como', 'Milano', 'Sondrio', 'Varese'];

export default function CalculatorTab({ settings, fuelPriceData, onSaveHistory }) {
  const [destinationInput, setDestinationInput] = useState('');
  const [patientName, setPatientName] = useState('');
  const [notes, setNotes] = useState('');
  const [interventionMin, setInterventionMin] = useState(60); // default 60 min
  
  // Selection of origin / departure point
  const origins = settings.origins && settings.origins.length > 0 ? settings.origins : [
    { id: 'casatenovo', name: 'Sede Operativa Casatenovo (LC)', address: 'Via Roma, 23880 Casatenovo LC', lat: 45.6983, lon: 9.3106 },
    { id: 'seregno', name: 'Negozio di Seregno (MB)', address: 'Seregno MB', lat: 45.6497, lon: 9.2054 }
  ];

  const [selectedOriginId, setSelectedOriginId] = useState(origins[0]?.id || 'casatenovo');

  const selectedOrigin = origins.find(o => o.id === selectedOriginId) || origins[0];

  // Selection of staff roles
  // State maps roleId -> { selected: boolean, count: number }
  const [staffSelection, setStaffSelection] = useState({});
  
  // Fuel overwrite state
  const [useManualFuelPrice, setUseManualFuelPrice] = useState(false);
  const [manualFuelPrice, setManualFuelPrice] = useState('');

  // Results state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geocodeResult, setGeocodeResult] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [calcResult, setCalcResult] = useState(null);

  // Initialize staff selection when settings load
  useEffect(() => {
    if (settings && settings.staffRoles) {
      const initial = {};
      settings.staffRoles.forEach((role, idx) => {
        // By default select Tecnico Ortopedico (first one)
        initial[role.id] = {
          selected: idx === 0,
          count: 1
        };
      });
      setStaffSelection(initial);
    }
  }, [settings]);

  // Update manual fuel price default when fuelPriceData loads
  useEffect(() => {
    if (fuelPriceData && fuelPriceData.avgPrice) {
      setManualFuelPrice(fuelPriceData.avgPrice.toFixed(3));
    }
  }, [fuelPriceData]);

  const toggleStaffRole = (roleId) => {
    setStaffSelection(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        selected: !prev[roleId]?.selected
      }
    }));
  };

  const updateStaffCount = (roleId, delta) => {
    setStaffSelection(prev => {
      const current = prev[roleId]?.count || 1;
      const newCount = Math.max(1, current + delta);
      return {
        ...prev,
        [roleId]: {
          ...prev[roleId],
          count: newCount
        }
      };
    });
  };

  const handleCalculate = async (e) => {
    if (e) e.preventDefault();
    if (!destinationInput.trim()) {
      setError('Inserisci un indirizzo o un comune di destinazione (es. Merate, Monza).');
      return;
    }

    // Ensure at least one staff member is selected
    const selectedStaffList = [];
    if (settings && settings.staffRoles) {
      settings.staffRoles.forEach(role => {
        const sel = staffSelection[role.id];
        if (sel && sel.selected) {
          selectedStaffList.push({
            id: role.id,
            name: role.name,
            hourlyRate: role.hourlyRate,
            count: sel.count || 1
          });
        }
      });
    }

    if (selectedStaffList.length === 0) {
      setError('Seleziona almeno una figura professionale per l\'uscita (es. Tecnico Ortopedico).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Geocode Destination
      const geoRes = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: destinationInput })
      });
      const geoData = await geoRes.json();
      if (!geoRes.ok) throw new Error(geoData.error || 'Errore durante la geocodifica');
      setGeocodeResult(geoData);

      // 2. Route from selected Origin to Destination
      const routeRes = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat: selectedOrigin.lat,
          originLon: selectedOrigin.lon,
          destLat: geoData.lat,
          destLon: geoData.lon
        })
      });
      const routeData = await routeRes.json();
      if (!routeRes.ok) throw new Error(routeData.error || 'Errore durante il calcolo del percorso');
      setRouteResult(routeData);

      // 3. Calculate Cost
      const calcRes = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originName: selectedOrigin.name,
          distanceKmAR: routeData.distanceKmAR,
          durationMinAR: routeData.durationMinAR,
          interventionMin: parseInt(interventionMin, 10) || 0,
          selectedStaff: selectedStaffList,
          manualFuelPrice: useManualFuelPrice ? parseFloat(manualFuelPrice) : null
        })
      });
      const calcData = await calcRes.json();
      if (!calcRes.ok) throw new Error(calcData.error || 'Errore durante il calcolo dei costi');
      setCalcResult(calcData);

    } catch (err) {
      setError(err.message || 'Si è verificato un errore imprevisto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Search & Calculation Input Panel */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 transition-all">
        <form onSubmit={handleCalculate} className="space-y-6">
          
          {/* Header & Origin Display */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                <Navigation className="w-5 h-5 text-blue-600" />
                <span>Calcolo Uscita e Intervento Domiciliare</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Seleziona la sede di partenza e la destinazione del paziente ({settings.vehicleModel || 'Ford Transit'})
              </p>
            </div>
            
            <div className="inline-flex items-center space-x-1 text-xs bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600">
              <span>Consumo: <strong>{settings.fuelConsumption || 9.5} L/100km</strong></span>
              <span>•</span>
              <span>Usura: <strong>{settings.wearCostPerKm || 0.25} €/km</strong></span>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start space-x-3 text-sm">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Attenzione: </strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Origin / Departure Selection Box */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-2">
            <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center space-x-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Sede / Punto di Partenza dell'Uscita *</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {origins.map(origin => {
                const isSelected = origin.id === selectedOriginId;
                return (
                  <div
                    key={origin.id}
                    onClick={() => setSelectedOriginId(origin.id)}
                    className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {origin.id === 'seregno' ? <Store className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                    </div>

                    <div className="flex-grow">
                      <div className="text-sm font-bold">{origin.name}</div>
                      <div className={`text-xs ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {origin.address}
                      </div>
                    </div>

                    <input
                      type="radio"
                      name="originSelect"
                      checked={isSelected}
                      onChange={() => setSelectedOriginId(origin.id)}
                      className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Destination & Patient */}
            <div className="space-y-4">
              
              {/* Destination Search */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Destinazione (Comune o Indirizzo Paziente) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={destinationInput}
                    onChange={(e) => setDestinationInput(e.target.value)}
                    placeholder="Es. Merate, Monza, Lecco, Bellano..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 text-sm font-medium transition-all"
                  />
                </div>

                {/* Quick Cities Buttons */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs text-slate-400 self-center mr-1">Comuni rapidi:</span>
                  {QUICK_CITIES.map(city => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setDestinationInput(city)}
                      className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 px-2.5 py-1 rounded-md transition-colors border border-slate-200"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Patient Name / Ref (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Riferimento / Nome Paziente (Opzionale per PDF)
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Es. Mario Rossi / Pratica 1234"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 text-sm font-medium transition-all"
                />
              </div>

              {/* Intervention Duration */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Durata Stimata Intervento sul Posto</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      min="0"
                      step="15"
                      value={interventionMin}
                      onChange={(e) => setInterventionMin(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 text-sm font-medium transition-all"
                    />
                    <span className="text-xs text-slate-400 mt-1 block">Minuti sul posto</span>
                  </div>
                  <div className="flex items-center bg-slate-100 rounded-xl px-4 text-xs font-medium text-slate-600 border border-slate-200">
                    Eq: {(interventionMin / 60).toFixed(2)} ore
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Staff & Fuel Overwrite */}
            <div className="space-y-4">
              
              {/* Staff Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Personale Assegnato all'Uscita *</span>
                </label>

                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  {settings.staffRoles && settings.staffRoles.map(role => {
                    const sel = staffSelection[role.id] || { selected: false, count: 1 };
                    return (
                      <div
                        key={role.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                          sel.selected
                            ? 'bg-blue-50/80 border-blue-300 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className="flex items-center space-x-3 cursor-pointer flex-grow select-none"
                          onClick={() => toggleStaffRole(role.id)}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                            sel.selected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {sel.selected && <CheckSquare className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-sm font-bold">{role.name}</div>
                            <div className="text-xs text-slate-500">{formatCurrency(role.hourlyRate)} / ora</div>
                          </div>
                        </div>

                        {/* Count counter */}
                        {sel.selected && (
                          <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-md border border-blue-200">
                            <span className="text-xs text-slate-400">Qtà:</span>
                            <button
                              type="button"
                              onClick={() => updateStaffCount(role.id, -1)}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold w-4 text-center">{sel.count}</span>
                            <button
                              type="button"
                              onClick={() => updateStaffCount(role.id, 1)}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fuel Price Fallback Overwrite */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                    <Fuel className="w-4 h-4 text-amber-500" />
                    <span>Prezzo Gasolio (€/L)</span>
                  </span>
                  
                  <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useManualFuelPrice}
                      onChange={(e) => setUseManualFuelPrice(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Sovrascrivi manualmente</span>
                  </label>
                </div>

                {!useManualFuelPrice ? (
                  <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400">Automatico MIMIT Lombardia: </span>
                      <strong className="text-amber-600 font-bold text-sm">
                        {fuelPriceData?.avgPrice ? `${fuelPriceData.avgPrice.toFixed(3)} €/L` : 'In recupero...'}
                      </strong>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-medium">
                      Live Open Data
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.001"
                      min="0.5"
                      max="3.5"
                      value={manualFuelPrice}
                      onChange={(e) => setManualFuelPrice(e.target.value)}
                      placeholder="Es. 1.850"
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm font-bold text-slate-900"
                    />
                    <span className="text-xs font-bold text-slate-500 shrink-0">€ / Litro</span>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center space-x-2 text-base transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Geocodifica e Calcolo Percorso A/R in corso...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Calcola Costo Uscita Totale</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* Results Section (Map + Detailed Breakdown Card) */}
      {calcResult && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Detailed Breakdown Card */}
          <CostBreakdownCard
            calcResult={calcResult}
            geocodeResult={geocodeResult}
            settings={settings}
            patientName={patientName}
            notes={notes}
            onSaveHistory={onSaveHistory}
          />

          {/* Interactive Map */}
          {geocodeResult && (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span>Tracciato del Percorso da {selectedOrigin.name}</span>
              </h3>
              <RouteMap
                originLat={selectedOrigin.lat}
                originLon={selectedOrigin.lon}
                originName={selectedOrigin.name}
                destLat={geocodeResult.lat}
                destLon={geocodeResult.lon}
                destinationName={geocodeResult.displayName}
                geometry={routeResult?.geometry}
              />
            </div>
          )}

        </div>
      )}

    </div>
  );
}
