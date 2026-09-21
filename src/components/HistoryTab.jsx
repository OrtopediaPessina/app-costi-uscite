import React from 'react';
import { History, FileDown, Trash2, Calendar, MapPin, Truck, ExternalLink } from 'lucide-react';
import { formatCurrency, formatKm, formatTime, formatDate } from '../utils/formatters';
import { generatePdfQuote } from '../utils/pdfGenerator';

export default function HistoryTab({ historyItems, onDeleteHistoryItem }) {
  if (!historyItems || historyItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-12 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <History className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Nessun Calcolo Salvato nello Storico</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Esegui un calcolo nella scheda "Calcolatore" e fai clic su "Salva Storico" per conservare i preventivi ed esportare rapidamente i PDF.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <History className="w-6 h-6 text-blue-600" />
            <span>Storico Uscite e Calcoli Salva</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Archivio dei preventivi generati per riconsultazione rapida o ristampa PDF.
          </p>
        </div>
        <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
          {historyItems.length} {historyItems.length === 1 ? 'elementi' : 'elementi'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {historyItems.map((item) => {
          const { calcResult, geocodeResult, patientName, createdAt, totalCost, id } = item;
          return (
            <div
              key={id}
              className="bg-white rounded-2xl shadow-md border border-slate-200 p-5 hover:border-blue-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-grow">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base text-slate-900">
                    {patientName || 'Paziente / Preventivo Senza Nome'}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">
                    • {formatDate(createdAt)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center space-x-1 font-semibold text-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>{item.destinationName || geocodeResult?.displayName}</span>
                  </span>
                  <span>•</span>
                  <span>{formatKm(calcResult?.parameters?.distanceKmAR)} A/R</span>
                  <span>•</span>
                  <span>{formatTime(calcResult?.parameters?.durationMinAR)} viaggio</span>
                  <span>•</span>
                  <span>Intervento: {formatTime(calcResult?.parameters?.interventionMin)}</span>
                </div>

                <div className="text-xs text-slate-400">
                  Personale: {calcResult?.breakdown?.staffBreakdown?.map(s => `${s.count}x ${s.name}`).join(', ')}
                </div>
              </div>

              {/* Total & Action Buttons */}
              <div className="flex items-center space-x-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 justify-between md:justify-end">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Totale Calcolato</div>
                  <div className="text-xl font-extrabold text-blue-600">
                    {formatCurrency(totalCost)}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => generatePdfQuote(calcResult, geocodeResult, patientName)}
                    className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors border border-emerald-200"
                    title="Scarica PDF"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteHistoryItem(id)}
                    className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors border border-slate-200"
                    title="Elimina dallo storico"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
