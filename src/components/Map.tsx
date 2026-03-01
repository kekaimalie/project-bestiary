'use client';

import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Sighting, SightingCategory } from '@/lib/types';

// ─── Fix default Leaflet marker icons (broken by Webpack chunking) ───
const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// ─── Helper: fly the map to a sighting and center the popup ───
function FlyToLatest({ position }: { position: [number, number] | null }) {
    const map = useMap();
    useMemo(() => {
        if (position) {
            // Use flyToBounds with padding so the popup is visually centered
            const offset = 0.002; // small bounds box around the point
            const bounds: L.LatLngBoundsExpression = [
                [position[0] - offset, position[1] - offset],
                [position[0] + offset, position[1] + offset],
            ];
            map.flyToBounds(bounds, {
                maxZoom: Math.max(map.getZoom(), 10),
                duration: 1.2,
                easeLinearity: 0.25,
                paddingTopLeft: [0, 80],
                paddingBottomRight: [0, 0],
            });
        }
    }, [map, position]);
    return null;
}

// ─── Helper: color badge by confidence level ───
const confidenceColors: Record<string, string> = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-red-100 text-red-700',
};

// ─── Map Category to Emoji Icon ───
const categoryIcons: Record<SightingCategory, string> = {
    plant: '🌿',
    bird: '🐦',
    mammal: '🦊',
    reptile: '🦎',
    amphibian: '🐸',
    fish: '🐟',
    insect: '🦋',
    arachnid: '🕷️',
    fungus: '🍄',
    other: '🔍',
};

interface MapProps {
    sightings: Sighting[];
    flyToPosition?: [number, number] | null;
    onMarkerClick?: (sighting: Sighting) => void;
    onLearnMoreClick?: (sighting: Sighting) => void;
    // Map of sighting IDs that are currently fetching their description
    loadingDescriptions: Record<string, boolean>;
    // Map of sighting IDs that already have a fetched description
    loadedDescriptions: Record<string, string>;
}

export default function Map({
    sightings,
    flyToPosition = null,
    onMarkerClick,
    onLearnMoreClick,
    loadingDescriptions = {},
    loadedDescriptions = {}
}: MapProps) {
    // Center on first sighting if available, otherwise center of USA
    const center: [number, number] = sightings.length > 0
        ? [sightings[0].latitude, sightings[0].longitude]
        : [39.8283, -98.5795];

    const zoom = sightings.length > 0 ? 5 : 4;

    return (
        <div className="h-[500px] w-full rounded-xl overflow-hidden shadow-lg border border-gray-200">
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom
                className="h-full w-full z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Smoothly fly to newly added sighting */}
                <FlyToLatest position={flyToPosition} />

                {sightings.map((s) => (
                    <Marker
                        key={s.id}
                        position={[s.latitude, s.longitude]}
                        icon={markerIcon}
                        eventHandlers={{
                            click: () => onMarkerClick?.(s)
                        }}
                    >
                        <Popup className="max-w-xs" minWidth={240}>
                            <div className="flex flex-col gap-1">
                                <h3 className="font-bold text-lg text-emerald-800 flex items-center gap-2">
                                    <span className="text-xl leading-none">{categoryIcons[s.category] || '🔍'}</span>
                                    {s.common_name}
                                </h3>
                                <p className="text-sm italic text-gray-600">{s.scientific_name}</p>

                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium capitalize">
                                        {s.category}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${confidenceColors[s.confidence] ?? 'bg-gray-100 text-gray-700'}`}>
                                        {s.confidence} confidence
                                    </span>
                                </div>

                                <div className="mt-2 pt-2 border-t border-gray-100">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onLearnMoreClick?.(s);
                                        }}
                                        disabled={loadingDescriptions[s.id]}
                                        className="w-full text-xs font-semibold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-75 disabled:cursor-wait"
                                    >
                                        {loadingDescriptions[s.id] ? (
                                            <>
                                                <svg className="animate-spin h-3.5 w-3.5 text-emerald-600" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Fetching info...
                                            </>
                                        ) : loadedDescriptions[s.id] ? (
                                            <>
                                                <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                                Details Loaded!
                                            </>
                                        ) : (
                                            <>✨ Learn more with Gemini</>
                                        )}
                                    </button>
                                </div>

                                <time className="text-[10px] text-gray-400 mt-2 text-right block border-t pt-2 border-gray-100">
                                    {new Date(s.created_at).toLocaleDateString()}
                                </time>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
