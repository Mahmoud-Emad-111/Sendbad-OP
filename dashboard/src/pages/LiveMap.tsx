import { useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
// import { db } from '../services/firebase';

const containerStyle = {
  width: '100%',
  height: '80vh'
};

const defaultCenter = {
  lat: 23.5859, // Oman (Muscat approx)
  lng: 58.4059
};

const mapOptions = {
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    styles: [
        // Dark/Clean Style (Optional) - can keep default for standard view
    ]
};

export default function LiveMap() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const [, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(_map: google.maps.Map) {
    setMap(null);
  }, []);

  if (!isLoaded) return <div className="flex h-full items-center justify-center">Loading Maps...</div>;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="mb-4 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">تتبع المناديب (Live Tracking)</h3>
            <div className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                متصل بالشبكة
            </div>
        </div>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={8}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        { /* Child components, such as markers, info windows, etc. */ }
        <Marker position={defaultCenter} />
      </GoogleMap>
    </div>
  );
}
