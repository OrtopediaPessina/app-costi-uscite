import React, { useState } from 'react';
import { Fuel, Wrench, Users, Clock, Navigation, FileDown, Check, Save, Sparkles, Info } from 'lucide-react';
import { formatCurrency, formatKm, formatTime } from '../utils/formatters';
import { generatePdfQuote } from '../utils/pdfGenerator';

export default function CostBreakdownCard({ calcResult, geocodeResult, settings, patientName, notes, onSaveHistory }) {
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!calcResult) return null;

  const { parameters, breakdown, totalCost } = calcResult;

  const handleExportPdf = () => {
    generatePdfQuote(calcResult, geocodeResult, patientName, notes);
  };

  const handleSave = () => {
    if (onSaveHistory) {
      onSaveHistory({
        calcResult,
        geocodeResult,
        patientName,
        notes,
        destinationName: geocodeResult?.displayName || 'Destinazione',
        totalCost
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden transition-all duration-300">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-6 text-white relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-500/30 text-blue-200 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider border border-blue-400/20">
                Riepilogo Costi Uscita
              </span>
              <span className="text-xs text-blue-200">
                • {settings.vehicleModel || 'Ford Transit'}
              </span>
            </div>
            <h2 className="text-2xl font-bold mt-1 tracking-tight">
              Totale Calcolato: {formatCurrency(totalCost)}
            </h2>
            <p className="text-sm text-blue-200 mt-0.5">
              Partenza: <strong className="text-white">{parameters.originName || 'Casatenovo'}</strong> → Destinazione: <strong className="text-white">{geocodeResult?.city || geocodeResult?.displayName}</strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md ${
                savedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{savedSuccess ? 'Salvato!' : 'Salva Storico'}</span>
            </button>

            <button
              onClick={handleExportPdf}
              className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:shadow-emerald-500/30 transition-all transform hover:-translate-y-0.5"
            >
              <FileDown className="w-5 h-5" />
              <span>Esporta PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Breakdown Content */}
      <div className="p-6 space-y-6">
        
        {/* Quick Travel Specs Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <div>
            <div className="text-xs text-slate-500 font-medium">Distanza A/R</div>
            <div className="text-lg font-bold text-slate-900">{formatKm(parameters.distanceKmAR)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Tempo Viaggio A/R</div>
            <div className="text-lg font-bold text-slate-900">{formatTime(parameters.durationMinAR)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Durata Intervento</div>
            <div className="text-lg font-bold text-slate-900">{formatTime(parameters.interventionMin)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Tempo Totale</div>
            <div className="text-lg font-bold text-blue-600">{parameters.totalTimeHours} ore</div>
          </div>
        </div>

        {/* Itemized Cost Breakdown Table / Cards */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
            <span>Dettaglio Analitico delle Componenti</span>
          </h3>

          {/* 1. Fuel Cost Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-amber-300 transition-colors shadow-sm">
            <div className="flex items-start space-x-3 mb-2 sm:mb-0">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                <Fuel className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">1. Costo Carburante (Gasolio)</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Consumo: <strong>{parameters.fuelConsumption} L/100km</strong> • Prezzo: <strong>{parameters.fuelPrice.toFixed(3)} €/L</strong> ({parameters.fuelSource})
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Carburante stimato: {breakdown.litersUsed} Litri
                </div>
              </div>
            </div>
            <div className="text-right sm:self-center">
              <div className="text-xs text-slate-400">Importo</div>
              <div className="text-lg font-bold text-slate-900">{formatCurrency(breakdown.fuelCost)}</div>
            </div>
          </div>

          {/* 2. Wear Cost Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors shadow-sm">
            <div className="flex items-start space-x-3 mb-2 sm:mb-0">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">2. Costo Usura & Ammortamento Veicolo</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Ford Transit • Tariffa Usura: <strong>{parameters.wearCostPerKm.toFixed(2)} €/km</strong> (Ammortamento, gomme, manutenzione)
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Percorso A/R: {parameters.distanceKmAR} km
                </div>
              </div>
            </div>
            <div className="text-right sm:self-center">
              <div className="text-xs text-slate-400">Importo</div>
              <div className="text-lg font-bold text-slate-900">{formatCurrency(breakdown.wearCost)}</div>
            </div>
          </div>

          {/* 3. Staff Cost Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors shadow-sm">
            <div className="flex items-start space-x-3 mb-2 sm:mb-0">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">3. Costo Tempo Personale</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Personale: {breakdown.staffBreakdown.map(s => `${s.count}x ${s.name} (${s.hourlyRate.toFixed(2)} €/h)`).join(', ')}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Somma tariffe orarie: {formatCurrency(breakdown.hourlyRateSum)}/h • Ore totali (Viaggio + Intervento): {parameters.totalTimeHours} h
                </div>
              </div>
            </div>
            <div className="text-right sm:self-center">
              <div className="text-xs text-slate-400">Importo</div>
              <div className="text-lg font-bold text-slate-900">{formatCurrency(breakdown.staffCost)}</div>
            </div>
          </div>

        </div>

        {/* Highlighted Final Invoice Summary Card */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-5 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-emerald-100 text-xs font-bold uppercase tracking-wider">
              Totale Uscita da Fatturare al Paziente
            </div>
            <div className="text-3xl font-extrabold tracking-tight mt-0.5">
              {formatCurrency(totalCost)}
            </div>
            <div className="text-xs text-emerald-100/90 mt-1">
              Partenza da: {parameters.originName || 'Casatenovo'}. Comprensivo di Carburante ({formatCurrency(breakdown.fuelCost)}), Usura Veicolo ({formatCurrency(breakdown.wearCost)}) e Ore Personale ({formatCurrency(breakdown.staffCost)}).
            </div>
          </div>
          
          <button
            onClick={handleExportPdf}
            className="w-full sm:w-auto bg-white text-emerald-800 hover:bg-emerald-50 px-6 py-3 rounded-xl font-bold shadow transition-all shrink-0 text-center"
          >
            Stampa / PDF
          </button>
        </div>

      </div>
    </div>
  );
}
