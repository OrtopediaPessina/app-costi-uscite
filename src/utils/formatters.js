export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '€ 0,00';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatKm(km) {
  if (km === undefined || km === null || isNaN(km)) return '0 km';
  return `${parseFloat(km).toLocaleString('it-IT', { maximumFractionDigits: 1 })} km`;
}

export function formatTime(minutes) {
  if (!minutes || isNaN(minutes)) return '0 min';
  const mins = Math.round(minutes);
  if (mins < 60) {
    return `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const remMin = mins % 60;
  if (remMin === 0) {
    return `${hours} ${hours === 1 ? 'ora' : 'ore'}`;
  }
  return `${hours} ${hours === 1 ? 'ora' : 'ore'} e ${remMin} min`;
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
