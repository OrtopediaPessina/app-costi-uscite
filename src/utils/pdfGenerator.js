import { jsPDF } from 'jspdf';
import { formatCurrency, formatKm, formatTime, formatDate } from './formatters';

export function generatePdfQuote(calcData, destinationInfo, patientName = '', notes = '') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 15;

  // Header Banner
  doc.setFillColor(30, 58, 138); // Deep Blue #1e3a8a
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PREVENTIVO COSTO USCITA E INTERVENTO', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Partenza: ${calcData.parameters.originName || 'Casatenovo'} | Veicolo: Ford Transit (Cambio Automatico)`, margin, 20);

  y = 38;

  // Title Section
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RIEPILOGO DETTAGLIATO ITINERARIO E COSTI', margin, y);
  
  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  y += 8;

  // Patient & Trip Info Box
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, pageWidth - (margin * 2), 34, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, pageWidth - (margin * 2), 34, 'S');

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  const col1X = margin + 5;
  const col2X = margin + 95;
  let boxY = y + 7;

  doc.setFont('helvetica', 'bold');
  doc.text('Paziente / Riferimento:', col1X, boxY);
  doc.setFont('helvetica', 'normal');
  doc.text(patientName || 'Non specificato', col1X + 40, boxY);

  doc.setFont('helvetica', 'bold');
  doc.text('Data Calcolo:', col2X, boxY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(calcData.calculationDate), col2X + 25, boxY);

  boxY += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Punto di Partenza:', col1X, boxY);
  doc.setFont('helvetica', 'normal');
  const originDisplay = calcData.parameters.originName || 'Casatenovo';
  doc.text(originDisplay.length > 30 ? originDisplay.substring(0, 28) + '...' : originDisplay, col1X + 40, boxY);

  doc.setFont('helvetica', 'bold');
  doc.text('Destinazione:', col2X, boxY);
  doc.setFont('helvetica', 'normal');
  const destDisplay = destinationInfo?.displayName || 'Destinazione Paziente';
  const truncatedDest = destDisplay.length > 35 ? destDisplay.substring(0, 32) + '...' : destDisplay;
  doc.text(truncatedDest, col2X + 25, boxY);

  boxY += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Distanza Totale A/R:', col1X, boxY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatKm(calcData.parameters.distanceKmAR), col1X + 40, boxY);

  doc.setFont('helvetica', 'bold');
  doc.text('Tempo Viaggio A/R:', col2X, boxY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatTime(calcData.parameters.durationMinAR), col2X + 25, boxY);

  boxY += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Durata Intervento:', col1X, boxY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatTime(calcData.parameters.interventionMin), col1X + 40, boxY);

  doc.setFont('helvetica', 'bold');
  doc.text('Tempo Totale Impegnato:', col2X, boxY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${calcData.parameters.totalTimeHours} ore`, col2X + 38, boxY);

  y += 42;

  // Cost Breakdown Table Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('DETTAGLIO COMPONENTI DI COSTO', margin, y);

  y += 5;

  // Table Columns Header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('Voci di Costo & Dettagli Parametri', margin + 4, y + 5.5);
  doc.text('Quantità / Base', margin + 115, y + 5.5);
  doc.text('Importo Parziale', pageWidth - margin - 4, y + 5.5, { align: 'right' });

  y += 8;

  const drawTableRow = (label, details, qty, amount, isAlternate = false) => {
    if (isAlternate) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - (margin * 2), 12, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 12, pageWidth - margin, y + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(label, margin + 4, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(details, margin + 4, y + 9);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8.5);
    doc.text(qty, margin + 115, y + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(amount), pageWidth - margin - 4, y + 6.5, { align: 'right' });

    y += 12;
  };

  // Row 1: Fuel Cost
  const fuelDetails = `Ford Transit (Consumo: ${calcData.parameters.fuelConsumption} L/100km | Fonte: ${calcData.parameters.fuelSource})`;
  const fuelQty = `${calcData.breakdown.litersUsed} Litri @ ${calcData.parameters.fuelPrice.toFixed(3)} €/L`;
  drawTableRow('1. Costo Carburante (Gasolio Lombardia)', fuelDetails, fuelQty, calcData.breakdown.fuelCost, false);

  // Row 2: Wear Cost
  const wearDetails = `Ammortamento, pneumatici, manutenzione ordinaria/straordinaria (${calcData.parameters.wearCostPerKm.toFixed(2)} €/km)`;
  const wearQty = `${calcData.parameters.distanceKmAR} km A/R`;
  drawTableRow('2. Costo Usura & Ammortamento Veicolo', wearDetails, wearQty, calcData.breakdown.wearCost, true);

  // Row 3: Staff Cost
  const staffList = calcData.breakdown.staffBreakdown.map(s => `${s.count}x ${s.name} (${s.hourlyRate.toFixed(2)} €/h)`).join(', ');
  const staffQty = `${calcData.parameters.totalTimeHours} ore totali`;
  drawTableRow('3. Costo Ore Personale Assegnato', staffList, staffQty, calcData.breakdown.staffCost, false);

  y += 6;

  // Total Box
  doc.setFillColor(37, 99, 235); // Blue 600
  doc.rect(margin, y, pageWidth - (margin * 2), 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTALE COSTO USCITA DA FATTURARE:', margin + 6, y + 11);

  doc.setFontSize(16);
  doc.text(formatCurrency(calcData.totalCost), pageWidth - margin - 6, y + 12, { align: 'right' });

  y += 24;

  // Notes & Disclaimer
  if (notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text('Note Aggiuntive:', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const splitNotes = doc.splitTextToSize(notes, pageWidth - (margin * 2));
    doc.text(splitNotes, margin, y);
    y += (splitNotes.length * 4) + 6;
  }

  // Footer / Signatures
  const footerY = Math.max(y + 10, 250);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, footerY, margin + 60, footerY);
  doc.line(pageWidth - margin - 60, footerY, pageWidth - margin, footerY);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Firma Operatore / Tecnico', margin, footerY + 5);
  doc.text('Firma Paziente per Accettazione', pageWidth - margin - 60, footerY + 5);

  doc.text('Documento generato automaticamente dall\'App Costi Uscite.', pageWidth / 2, 285, { align: 'center' });

  // Save / Download PDF
  const filename = `Preventivo_Uscita_${(patientName || 'Paziente').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
  doc.save(filename);
}
