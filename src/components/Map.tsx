'use client';

import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Sighting } from '@/lib/types';
import { leafletMarkerIcon, getCategoryMapIcon } from '@/lib/leaflet-config';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { GeminiIcon } from '@/components/ui/GeminiIcon';
import Spinner from '@/components/ui/Spinner';
import CategoryBadge from '@/components/ui/CategoryBadge';
import ConfidenceBadge from '@/components/ui/ConfidenceBadge';


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
                        icon={getCategoryMapIcon(s.category)}
                        eventHandlers={{
                            click: () => onMarkerClick?.(s)
                        }}
                    >
                        <Popup className="max-w-xs" minWidth={240}>
                            <div className="flex flex-col gap-1">
                                <h3 className="font-bold text-lg text-emerald-800 flex items-center gap-2">
                                    <span className="text-xl leading-none flex items-center justify-center"><CategoryIcon category={s.category} /></span>
                                    {s.common_name}
                                </h3>
                                <p className="text-sm italic text-gray-600">{s.scientific_name}</p>

                                <div className="flex items-center gap-2 mt-1">
                                    <CategoryBadge category={s.category} />
                                    <ConfidenceBadge confidence={s.confidence} showLabel />
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
                                                <Spinner className="h-3.5 w-3.5 text-emerald-600" />
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
                                            <><GeminiIcon className="w-4 h-4 flex-shrink-0" /> Learn more with Gemini</>
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
