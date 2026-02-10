import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { subscribeToLocations } from '../services/firebase';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';


// Custom Technician Icon
const TechnicianIcon = L.divIcon({
    className: 'custom-tech-icon',
    html: `<div style="
        background-color: #2563eb;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    ">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
        </svg>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
});

import { MapPin } from 'lucide-react';

interface LiveTrackingMapProps {
    technicians: any[];
    focusTechId?: number | null;
}

// Helper component to update map center
function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, zoom, { duration: 1.5 });
    }, [center, zoom, map]);
    return null;
}

export default function LiveTrackingMap({ technicians, focusTechId }: LiveTrackingMapProps) {
    const { t } = useTranslation();
    const [locations, setLocations] = useState<Record<string, any>>({});

    // Default center (Muscat, Oman) - can be adjusted
    const [viewState, setViewState] = useState<{ center: [number, number], zoom: number }>({
        center: [23.5880, 58.3829],
        zoom: 10
    });

    useEffect(() => {
        const unsubscribe = subscribeToLocations((data) => {
            setLocations(data);
        });
        return () => unsubscribe();
    }, []);

    // Update view when focusTechId or their location changes
    useEffect(() => {
        if (focusTechId) {
            const loc = locations[focusTechId] || locations[String(focusTechId)];
            if (loc && loc.lat && loc.lng) {
                setViewState({
                    center: [loc.lat, loc.lng],
                    zoom: 15 // Closer zoom for specific tech
                });
            }
        }
    }, [focusTechId, locations]);

    // Filter technicians: if focusTechId is set, only show that one. Otherwise show all.
    const targetTechnicians = focusTechId
        ? technicians.filter(t => t.id === focusTechId)
        : technicians;

    // Merge locations with technician info
    const activeTechnicians = targetTechnicians.filter(tech => {
        const hasLoc = locations[tech.id] || locations[String(tech.id)];
        return hasLoc;
    });

    // If focusing on a specific tech and they are offline
    if (focusTechId && activeTechnicians.length === 0) {
        return (
            <div className="h-[400px] flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                <div className="bg-slate-200 p-4 rounded-full mb-3">
                    <MapPin className="text-slate-400" size={32} />
                </div>
                <p className="font-medium">{t('tracking.technician_offline')}</p>
                <p className="text-sm mt-1">{t('tracking.no_location_data')}</p>
            </div>
        );
    }

    return (
        <div className="h-[500px] w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner relative z-0">
             <MapContainer
                center={viewState.center}
                zoom={viewState.zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <MapController center={viewState.center} zoom={viewState.zoom} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {activeTechnicians.map(tech => {
                    const loc = locations[tech.id];
                    if (!loc || !loc.lat || !loc.lng) return null;

                    return (
                        <Marker key={tech.id} position={[loc.lat, loc.lng]} icon={TechnicianIcon}>
                            <Popup>
                                <div className="p-2">
                                    <h3 className="font-bold text-slate-900">{tech.name}</h3>
                                    <p className="text-xs text-slate-500 m-0">{tech.phone}</p>
                                    <div className="mt-2 text-[10px] text-slate-400">
                                        Last update: {new Date(loc.timestamp).toLocaleTimeString()}
                                    </div>
                                    <a
                                        href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 text-xs mt-1 block"
                                    >
                                        Open in Google Maps
                                    </a>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Status Overlay */}
            <div className="absolute top-4 right-4 z-[400] bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg border border-slate-200">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                        {activeTechnicians.length} {t('tracking.technicians_online')}
                    </span>
                </div>
            </div>
        </div>
    );
}
