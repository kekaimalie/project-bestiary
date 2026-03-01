'use client';

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { leafletMarkerIcon } from '@/lib/leaflet-config';

interface LocationPickerProps {
    onLocationSelected: (lat: number, lng: number) => void;
    onCancel: () => void;
}

// ─── Click-to-place marker sub-component ───
function ClickableMarker({
    position,
    setPosition,
}: {
    position: [number, number];
    setPosition: (pos: [number, number]) => void;
}) {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        },
    });

    return <Marker position={position} icon={leafletMarkerIcon} />;
}

export default function LocationPicker({ onLocationSelected, onCancel }: LocationPickerProps) {
    const [position, setPosition] = useState<[number, number]>([39.8283, -98.5795]); // center of USA
    const [address, setAddress] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clean up debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    // ─── Geocode an address using Nominatim (free, no API key) ───
    const searchAddress = useCallback(async () => {
        if (!address.trim()) return;
        setIsSearching(true);
        setSearchError(null);

        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address.trim())}&limit=1`,
                { headers: { 'User-Agent': 'EcoMap/1.0' } }
            );
            const data = await res.json();
            if (data.length === 0) {
                setSearchError('No results found. Try a different address or place a pin on the map.');
                return;
            }
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            setPosition([lat, lon]);
        } catch {
            setSearchError('Search failed. Please place a pin on the map instead.');
        } finally {
            setIsSearching(false);
        }
    }, [address]);

    // Format position for display
    const posLabel = useMemo(
        () => `${position[0].toFixed(4)}, ${position[1].toFixed(4)}`,
        [position]
    );

    return (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2">
                <span className="text-xl">📍</span>
                <div>
                    <h3 className="font-bold text-amber-800 text-sm">No GPS data found in photo</h3>
                    <p className="text-xs text-amber-700 mt-0.5">
                        Search for an address or click the map to place a pin where you saw this species.
                    </p>
                </div>
            </div>

            {/* Address search */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            searchAddress();
                        }
                    }}
                    placeholder="Search address or place name..."
                    className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
                <button
                    type="button"
                    onClick={searchAddress}
                    disabled={isSearching || !address.trim()}
                    className="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    {isSearching ? '...' : 'Search'}
                </button>
            </div>

            {searchError && (
                <p className="text-xs text-red-600">{searchError}</p>
            )}

            {/* Mini map for pin placement */}
            <div className="h-48 w-full rounded-lg overflow-hidden border border-amber-200">
                <MapContainer
                    center={position}
                    zoom={4}
                    scrollWheelZoom
                    className="h-full w-full z-0"
                    key={`${position[0]}-${position[1]}`}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ClickableMarker position={position} setPosition={setPosition} />
                </MapContainer>
            </div>

            <p className="text-xs text-amber-700 text-center">
                📌 Selected: <span className="font-mono font-medium">{posLabel}</span>
            </p>

            {/* Action buttons */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => onLocationSelected(position[0], position[1])}
                    className="flex-1 py-2 px-4 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors shadow-sm"
                >
                    Use This Location
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="py-2 px-4 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
