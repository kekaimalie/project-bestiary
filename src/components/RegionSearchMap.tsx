'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Sighting } from '@/lib/types';
import { CATEGORY_ICONS } from '@/lib/constants';
import { leafletMarkerIcon, leafletHighlightIcon } from '@/lib/leaflet-config';
import Spinner from '@/components/ui/Spinner';
import CategoryBadge from '@/components/ui/CategoryBadge';
import ConfidenceBadge from '@/components/ui/ConfidenceBadge';



// ─── Sub-component: Listen for map moves to enable the "Search This Area" button ───
function MapMoveListener({ onMoved }: { onMoved: () => void }) {
    useMapEvents({
        moveend: onMoved,
        zoomend: onMoved,
    });
    return null;
}

// ─── Sub-component: Fly to a specific position ───
// Uses a counter prop so that flying to the same position again is possible
function FlyToPosition({ position, counter }: { position: [number, number] | null; counter: number }) {
    const map = useMap();

    useEffect(() => {
        if (!position) return;
        map.flyTo(position, Math.max(map.getZoom(), 12), {
            duration: 1.2,
            easeLinearity: 0.25,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, position, counter]);

    return null;
}

// ─── Sub-component: Export map bounds for the parent ───
function BoundsExporter({ onBoundsReady }: { onBoundsReady: (getBounds: () => L.LatLngBounds) => void }) {
    const map = useMap();
    useEffect(() => {
        onBoundsReady(() => map.getBounds());
    }, [map, onBoundsReady]);
    return null;
}

interface RegionSearchMapProps {
    /** Sightings returned from region search to display as markers */
    regionResults: Sighting[];
    /** ID of a sighting to highlight (from species search click) */
    highlightedSightingId?: string | null;
    /** Species name to highlight all markers for (from region table click) */
    highlightedSpeciesName?: string | null;
    /** Position to fly to */
    flyToPosition?: [number, number] | null;
    /** Counter that increments to force re-fly even to the same position */
    flyToCounter?: number;
    /** Called when user clicks "Search This Area" with the current bounds */
    onSearchArea: (bounds: { north: number; south: number; east: number; west: number }) => void;
    /** Whether a region search is in progress */
    isSearching: boolean;
    /** Called when the map is moved (to show the search button) */
    onMapMoved: () => void;
    /** Whether the "Search This Area" button should be visible */
    showSearchButton: boolean;
    /** Export the getBounds function to the parent */
    onBoundsReady: (getBounds: () => L.LatLngBounds) => void;
}

export default function RegionSearchMap({
    regionResults,
    highlightedSightingId,
    highlightedSpeciesName,
    flyToPosition = null,
    flyToCounter = 0,
    onSearchArea,
    isSearching,
    onMapMoved,
    showSearchButton,
    onBoundsReady,
}: RegionSearchMapProps) {
    const getBoundsRef = useRef<(() => L.LatLngBounds) | null>(null);

    const handleBoundsReady = useCallback((fn: () => L.LatLngBounds) => {
        getBoundsRef.current = fn;
        onBoundsReady(fn);
    }, [onBoundsReady]);

    const handleSearchClick = useCallback(() => {
        if (!getBoundsRef.current) return;
        const bounds = getBoundsRef.current();
        onSearchArea({
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
        });
    }, [onSearchArea]);

    return (
        <div className="relative h-[500px] w-full rounded-xl overflow-hidden shadow-lg border border-slate-200">
            <MapContainer
                center={[39.8283, -98.5795]}
                zoom={4}
                scrollWheelZoom
                className="h-full w-full z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapMoveListener onMoved={onMapMoved} />
                <FlyToPosition position={flyToPosition} counter={flyToCounter} />
                <BoundsExporter onBoundsReady={handleBoundsReady} />

                {regionResults.map((s) => (
                    <Marker
                        key={s.id}
                        position={[s.latitude, s.longitude]}
                        icon={
                            s.id === highlightedSightingId ||
                                (highlightedSpeciesName && s.common_name === highlightedSpeciesName)
                                ? leafletHighlightIcon
                                : leafletMarkerIcon
                        }
                    >
                        <Popup className="max-w-xs" minWidth={220}>
                            <div className="flex flex-col gap-1">
                                <h3 className="font-bold text-base text-emerald-800 flex items-center gap-2">
                                    <span className="text-lg leading-none">{CATEGORY_ICONS[s.category] || '🔍'}</span>
                                    {s.common_name}
                                </h3>
                                <p className="text-xs italic text-gray-600">{s.scientific_name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <CategoryBadge category={s.category} />
                                    <ConfidenceBadge confidence={s.confidence} />
                                </div>
                                <time className="text-[10px] text-gray-400 mt-1 text-right block border-t pt-1 border-gray-100">
                                    {new Date(s.created_at).toLocaleDateString()}
                                </time>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* ── "Search This Area" Button ── */}
            {showSearchButton && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] animate-fadeIn">
                    <button
                        id="search-area-btn"
                        onClick={handleSearchClick}
                        disabled={isSearching}
                        className="bg-white/95 backdrop-blur-sm text-slate-700 font-semibold text-sm px-5 py-2.5 rounded-full shadow-xl border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                    >
                        {isSearching ? (
                            <>
                                <Spinner className="h-4 w-4 text-emerald-500" />
                                Searching…
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Search This Area
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* ── Result count badge ── */}
            {regionResults.length > 0 && (
                <div className="absolute bottom-4 left-4 z-[1000]">
                    <span className="bg-emerald-700/90 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
                        {regionResults.length} sighting{regionResults.length !== 1 ? 's' : ''} found
                    </span>
                </div>
            )}
        </div>
    );
}
