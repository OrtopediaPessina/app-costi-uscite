export async function geocodeAddress(query, googleApiKey = '') {
  if (!query || !query.trim()) {
    throw new Error('Indirizzo o comune di destinazione non specificato.');
  }

  // 1. Try Google Maps if API key is provided
  if (googleApiKey && googleApiKey.trim()) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:IT&key=${googleApiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const item = data.results[0];
        return {
          displayName: item.formatted_address,
          lat: item.geometry.location.lat,
          lon: item.geometry.location.lng,
          source: 'Google Maps'
        };
      }
    } catch (e) {
      console.warn('[Geocode] Google Maps failed, falling back to Nominatim:', e.message);
    }
  }

  // 2. Default: OpenStreetMap Nominatim
  const searchString = query.toLowerCase().includes('italia') || query.toLowerCase().includes('italy')
    ? query
    : `${query}, Lombardia, Italia`;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchString)}&limit=5&addressdetails=1`;
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'AppCostiUsciteCasatenovo/1.0 (contact@azienda.it)'
    }
  });

  if (!res.ok) {
    throw new Error(`Errore servizio di geocodifica: ${res.status}`);
  }

  const results = await res.json();
  if (!results || results.length === 0) {
    throw new Error(`Nessun risultato trovato per '${query}'. Riprova specificando il comune o la provincia (es. 'Merate', 'Monza').`);
  }

  const item = results[0];
  return {
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    city: item.address?.city || item.address?.town || item.address?.village || item.address?.county || query,
    source: 'OpenStreetMap Nominatim'
  };
}

export async function calculateRoute(originLat, originLon, destLat, destLon, googleApiKey = '') {
  // 1. Try Google Maps Distance Matrix / Directions if API key provided
  if (googleApiKey && googleApiKey.trim()) {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLon}&destination=${destLat},${destLon}&key=${googleApiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const leg = data.routes[0].legs[0];
        const distanceOneWayKm = leg.distance.value / 1000;
        const durationOneWayMin = leg.duration.value / 60;
        return {
          distanceKmOneWay: parseFloat(distanceOneWayKm.toFixed(1)),
          distanceKmAR: parseFloat((distanceOneWayKm * 2).toFixed(1)),
          durationMinOneWay: Math.round(durationOneWayMin),
          durationMinAR: Math.round(durationOneWayMin * 2),
          durationHoursAR: parseFloat(((durationOneWayMin * 2) / 60).toFixed(2)),
          geometry: null, // Google encoded polyline can be added if needed
          source: 'Google Maps Directions'
        };
      }
    } catch (e) {
      console.warn('[Route] Google Directions failed, falling back to OSRM:', e.message);
    }
  }

  // 2. Default: OSRM Driving Router
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson`;

  const res = await fetch(osrmUrl);
  if (!res.ok) {
    throw new Error(`Errore calcolo percorso OSRM: ${res.status}`);
  }

  const data = await res.json();
  if (!data.routes || data.routes.length === 0) {
    throw new Error('Impossibile calcolare il percorso stradale verso la destinazione.');
  }

  const route = data.routes[0];
  const distanceOneWayKm = route.distance / 1000;
  const durationOneWayMin = route.duration / 60;

  const distanceKmAR = parseFloat((distanceOneWayKm * 2).toFixed(1));
  const durationMinAR = Math.round(durationOneWayMin * 2);
  const durationHoursAR = parseFloat((durationMinAR / 60).toFixed(2));

  return {
    distanceKmOneWay: parseFloat(distanceOneWayKm.toFixed(1)),
    distanceKmAR,
    durationMinOneWay: Math.round(durationOneWayMin),
    durationMinAR,
    durationHoursAR,
    geometry: route.geometry, // GeoJSON LineString coordinates [[lon, lat], ...]
    source: 'OSRM Driving Engine'
  };
}
