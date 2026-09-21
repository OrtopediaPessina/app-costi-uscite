import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icon issues with Leaflet in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icon for Origin
const originIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom Icon for Destination (Patient)
const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapBoundsFitter({ originLat, originLon, destLat, destLon }) {
  const map = useMap();
  useEffect(() => {
    if (originLat && originLon && destLat && destLon) {
      const bounds = L.latLngBounds(
        [originLat, originLon],
        [destLat, destLon]
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [originLat, originLon, destLat, destLon, map]);
  return null;
}

export default function RouteMap({ originLat, originLon, originName, destLat, destLon, destinationName, geometry }) {
  const defaultCenter = [originLat || 45.6983, originLon || 9.3106];

  let polylineCoords = [];
  if (geometry && geometry.coordinates) {
    // GeoJSON coordinates are [lon, lat], Leaflet needs [lat, lon]
    polylineCoords = geometry.coordinates.map(coord => [coord[1], coord[0]]);
  } else if (destLat && destLon) {
    // Straight line fallback
    polylineCoords = [[originLat, originLon], [destLat, destLon]];
  }

  return (
    <div className="relative w-full h-80 rounded-xl overflow-hidden shadow-inner border border-slate-200">
      <MapContainer
        center={defaultCenter}
        zoom={11}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Origin Marker */}
        <Marker position={[originLat, originLon]} icon={originIcon}>
          <Popup>
            <div className="text-xs">
              <strong className="text-blue-600 font-bold block">Punto di Partenza</strong>
              <span>{originName || 'Sede Operativa'}</span>
            </div>
          </Popup>
        </Marker>

        {/* Destination Marker */}
        {destLat && destLon && (
          <Marker position={[destLat, destLon]} icon={destIcon}>
            <Popup>
              <div className="text-xs">
                <strong className="text-red-600 font-bold block">Destinazione Intervento</strong>
                <span>{destinationName || 'Paziente'}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Line */}
        {polylineCoords.length > 0 && (
          <Polyline
            positions={polylineCoords}
            color="#2563eb"
            weight={5}
            opacity={0.8}
          />
        )}

        {destLat && destLon && (
          <MapBoundsFitter
            originLat={originLat}
            originLon={originLon}
            destLat={destLat}
            destLon={destLon}
          />
        )}
      </MapContainer>
    </div>
  );
}
