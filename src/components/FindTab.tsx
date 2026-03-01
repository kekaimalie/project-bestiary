'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import SpeciesSearch from './SpeciesSearch';
import type { Sighting, SightingCategory } from '@/lib/types';
import type L from 'leaflet';
import { CATEGORY_ICONS } from '@/lib/constants';
import Spinner from '@/components/ui/Spinner';
import CategoryBadge from '@/components/ui/CategoryBadge';
import ConfidenceBadge from '@/components/ui/ConfidenceBadge';

// Dynamically import RegionSearchMap (Leaflet requires browser APIs)
const RegionSearchMapNoSSR = dynamic(() => import('./RegionSearchMap'), {
    ssr: false,
    loading: () => (
        <div className="h-[500px] w-full rounded-xl flex items-center justify-center bg-emerald-50 border border-emerald-100 animate-pulse">
            <p className="text-emerald-800 font-medium">Loading map…</p>
        </div>
    ),
});



export default function FindTab() {
    // ── Region search state ──
    const [regionResults, setRegionResults] = useState<Sighting[]>([]);
    const [isRegionSearching, setIsRegionSearching] = useState(false);
    const [showSearchButton, setShowSearchButton] = useState(true);
    const [hasSearched, setHasSearched] = useState(false);

    // ── Biosphere insight state ──
    const [biosphereInsight, setBiosphereInsight] = useState<{ summary: string; highlights: string[] } | null>(null);
    const [isBiosphereLoading, setIsBiosphereLoading] = useState(false);
    const [biosphereError, setBiosphereError] = useState<string | null>(null);
    const lastSearchBoundsRef = useRef<{ north: number; south: number; east: number; west: number } | null>(null);
    const getBoundsRef = useRef<(() => L.LatLngBounds) | null>(null);

    // ── Map interaction state ──
    const [flyToPosition, setFlyToPosition] = useState<[number, number] | null>(null);
    const [flyToCounter, setFlyToCounter] = useState(0); // incremented to force re-fly even to same position
    const [highlightedSightingId, setHighlightedSightingId] = useState<string | null>(null);
    const [highlightedSpeciesName, setHighlightedSpeciesName] = useState<string | null>(null);

    // ── Region search handler ──
    const handleSearchArea = useCallback(async (bounds: { north: number; south: number; east: number; west: number }) => {
        setIsRegionSearching(true);
        setShowSearchButton(false);
        // Clear previous biosphere insight on new search
        setBiosphereInsight(null);
        setBiosphereError(null);

        // Store the bounds used for this search
        lastSearchBoundsRef.current = bounds;

        try {
            const params = new URLSearchParams({
                north: bounds.north.toString(),
                south: bounds.south.toString(),
                east: bounds.east.toString(),
                west: bounds.west.toString(),
            });

            const res = await fetch(`/api/search-region?${params}`);
            const data = await res.json();
            setRegionResults(data.results ?? []);
            setHasSearched(true);
        } catch (err) {
            console.error('Region search error:', err);
        } finally {
            setIsRegionSearching(false);
        }
    }, []);

    // ── Species search "fly to" handler ──
    const handleFlyTo = useCallback((lat: number, lng: number, sighting: Sighting) => {
        setFlyToPosition([lat, lng]);
        setFlyToCounter(c => c + 1); // always force re-fly
        setHighlightedSightingId(sighting.id);
        setHighlightedSpeciesName(null); // clear region highlight

        // Also add this sighting to regionResults if not already present so it shows on the map
        setRegionResults(prev => {
            if (prev.some(s => s.id === sighting.id)) return prev;
            return [...prev, sighting];
        });
    }, []);

    // ── Region table row click → highlight all markers for that species ──
    const handleSpeciesRowClick = useCallback((speciesName: string) => {
        // Toggle: click same row again to deselect
        setHighlightedSpeciesName(prev => prev === speciesName ? null : speciesName);
        setHighlightedSightingId(null); // clear single-sighting highlight
    }, []);

    // ── Aggregate region results into a table ──
    const speciesTable = useMemo(() => {
        const map = new Map<string, {
            common_name: string;
            scientific_name: string;
            category: SightingCategory;
            count: number;
            latestDate: string;
            confidences: Record<string, number>;
        }>();

        for (const s of regionResults) {
            const key = s.common_name.toLowerCase();
            if (map.has(key)) {
                const entry = map.get(key)!;
                entry.count += 1;
                entry.confidences[s.confidence] = (entry.confidences[s.confidence] || 0) + 1;
                if (new Date(s.created_at) > new Date(entry.latestDate)) {
                    entry.latestDate = s.created_at;
                }
            } else {
                map.set(key, {
                    common_name: s.common_name,
                    scientific_name: s.scientific_name,
                    category: s.category,
                    count: 1,
                    latestDate: s.created_at,
                    confidences: { [s.confidence]: 1 },
                });
            }
        }

        return Array.from(map.values()).sort((a, b) => a.common_name.localeCompare(b.common_name));
    }, [regionResults]);

    // ── Store the getBounds function from the map ──
    const handleBoundsReady = useCallback((fn: () => L.LatLngBounds) => {
        getBoundsRef.current = fn;
    }, []);

    // ── Biosphere insight handler ──
    const handleGetBiosphereInsight = useCallback(async () => {
        if (!lastSearchBoundsRef.current || speciesTable.length === 0) return;
        setIsBiosphereLoading(true);
        setBiosphereError(null);

        try {
            const res = await fetch('/api/biosphere-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bounds: lastSearchBoundsRef.current,
                    species: speciesTable.map(s => ({
                        common_name: s.common_name,
                        scientific_name: s.scientific_name,
                        category: s.category,
                        count: s.count,
                    })),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to get biosphere insight.');
            setBiosphereInsight({ summary: data.summary, highlights: data.highlights });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Something went wrong.';
            setBiosphereError(msg);
        } finally {
            setIsBiosphereLoading(false);
        }
    }, [speciesTable]);

    return (
        <div className="space-y-6">
            {/* ── Top Section: Search + Map ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Species Search */}
                <div className="lg:col-span-4">
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 lg:sticky lg:top-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-800">Species Search</h2>
                                <p className="text-xs text-slate-500">Find a species by name</p>
                            </div>
                        </div>
                        <SpeciesSearch onFlyTo={handleFlyTo} />
                    </div>
                </div>

                {/* Right: Map */}
                <div className="lg:col-span-8">
                    <div className="bg-white p-2 rounded-xl shadow-xl border border-slate-200 relative overflow-hidden">
                        <RegionSearchMapNoSSR
                            regionResults={regionResults}
                            highlightedSightingId={highlightedSightingId}
                            highlightedSpeciesName={highlightedSpeciesName}
                            flyToPosition={flyToPosition}
                            flyToCounter={flyToCounter}
                            onSearchArea={handleSearchArea}
                            isSearching={isRegionSearching}
                            onMapMoved={() => setShowSearchButton(true)}
                            showSearchButton={showSearchButton}
                            onBoundsReady={handleBoundsReady}
                        />
                    </div>
                </div>
            </div>

            {/* ── Region Results Table ── */}
            {hasSearched && (
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fadeIn">
                    {/* Table Header */}
                    <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h14v2H3zM3 7h14v2H3zM3 11h14v2H3zM3 15h14v2H3z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-base">Region Results</h2>
                                <p className="text-emerald-200 text-xs">
                                    {speciesTable.length} species • {regionResults.length} total sightings
                                </p>
                            </div>
                        </div>
                        {regionResults.length > 0 && (
                            <button
                                onClick={() => { setRegionResults([]); setHasSearched(false); setBiosphereInsight(null); setBiosphereError(null); }}
                                className="text-emerald-200 hover:text-white text-xs font-medium transition-colors"
                            >
                                Clear results
                            </button>
                        )}
                    </div>

                    {speciesTable.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <div className="text-4xl mb-3">🗺️</div>
                            <p className="text-slate-500 text-sm">No sightings found in this area.</p>
                            <p className="text-slate-400 text-xs mt-1">Try zooming out or searching a different region.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="text-left px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Species</th>
                                        <th className="text-left px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider hidden md:table-cell">Scientific Name</th>
                                        <th className="text-center px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Category</th>
                                        <th className="text-center px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Sightings</th>
                                        <th className="text-center px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider hidden sm:table-cell">Confidence</th>
                                        <th className="text-right px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider hidden lg:table-cell">Last Seen</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {speciesTable.map((species, i) => {
                                        // Determine dominant confidence
                                        const topConfidence = Object.entries(species.confidences)
                                            .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'medium';

                                        const isRowActive = highlightedSpeciesName === species.common_name;

                                        return (
                                            <tr
                                                key={species.common_name}
                                                onClick={() => handleSpeciesRowClick(species.common_name)}
                                                className={`cursor-pointer transition-colors ${isRowActive
                                                    ? 'bg-emerald-100/70 hover:bg-emerald-100'
                                                    : 'hover:bg-emerald-50/50'
                                                    }`}
                                                style={{ animationDelay: `${i * 30}ms` }}
                                            >
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-lg leading-none">
                                                            {CATEGORY_ICONS[species.category] || '🔍'}
                                                        </span>
                                                        <span className="font-semibold text-slate-800">{species.common_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5 text-slate-500 italic hidden md:table-cell">
                                                    {species.scientific_name}
                                                </td>
                                                <td className="px-6 py-3.5 text-center">
                                                    <CategoryBadge category={species.category} className="mx-auto" />
                                                </td>
                                                <td className="px-6 py-3.5 text-center">
                                                    <span className="inline-flex items-center justify-center min-w-[28px] h-7 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold">
                                                        {species.count}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5 text-center hidden sm:table-cell">
                                                    <ConfidenceBadge confidence={topConfidence} className="mx-auto" />
                                                </td>
                                                <td className="px-6 py-3.5 text-right text-slate-500 text-xs hidden lg:table-cell">
                                                    {new Date(species.latestDate).toLocaleDateString('en-US', {
                                                        year: 'numeric', month: 'short', day: 'numeric'
                                                    })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── Biosphere Insight Section ── */}
                    {speciesTable.length > 0 && (
                        <div className="border-t border-slate-200">
                            {biosphereInsight ? (
                                /* ── Rendered insight ── */
                                <div className="p-6 space-y-4 animate-fadeIn">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                            <span className="text-white text-sm">🌐</span>
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-base">Biosphere Insight</h3>
                                    </div>

                                    <p className="text-slate-700 leading-relaxed text-sm bg-gradient-to-br from-violet-50 to-indigo-50 p-4 rounded-lg border border-violet-100">
                                        {biosphereInsight.summary}
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {biosphereInsight.highlights.map((h, i) => {
                                            const themes = [
                                                { icon: '🌱', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-800' },
                                                { icon: '🦅', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-800' },
                                                { icon: '💧', bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-800' },
                                                { icon: '🔬', bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-800' },
                                            ];
                                            const theme = themes[i % themes.length];
                                            return (
                                                <div key={i} className={`${theme.bg} border ${theme.border} rounded-lg p-3 flex items-start gap-2.5 text-sm`}>
                                                    <span className="text-base leading-none mt-0.5">{theme.icon}</span>
                                                    <p className={`${theme.text} leading-relaxed`}>{h}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                /* ── Button to request insight ── */
                                <div className="p-6 flex flex-col items-center gap-2">
                                    <button
                                        onClick={handleGetBiosphereInsight}
                                        disabled={isBiosphereLoading}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-75 disabled:cursor-wait"
                                    >
                                        {isBiosphereLoading ? (
                                            <>
                                                <Spinner className="h-4 w-4" />
                                                Analyzing ecosystem…
                                            </>
                                        ) : (
                                            <>✨ Get Biosphere Insight</>
                                        )}
                                    </button>
                                    {biosphereError && <p className="text-xs text-red-500">{biosphereError}</p>}
                                    <p className="text-xs text-slate-400">AI-powered ecological summary of this region</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
