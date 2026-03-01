'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Sighting, SightingCategory } from '@/lib/types';

// ─── Category Emoji Map ───
const categoryIcons: Record<SightingCategory, string> = {
    plant: '🌿', bird: '🐦', mammal: '🦊', reptile: '🦎',
    amphibian: '🐸', fish: '🐟', insect: '🦋', arachnid: '🕷️',
    fungus: '🍄', other: '🔍',
};

interface Suggestion {
    common_name: string;
    scientific_name: string;
    category: string;
    count: number;
}

interface SpeciesSearchProps {
    /** Called when the user clicks a specific occurrence to fly the map there */
    onFlyTo: (lat: number, lng: number, sighting: Sighting) => void;
    /** Counter from parent to force re-fly (optional) */
    flyToCounter?: number;
}

export default function SpeciesSearch({ onFlyTo }: SpeciesSearchProps) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Selected species state
    const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
    const [occurrences, setOccurrences] = useState<Sighting[]>([]);
    const [isLoadingOccurrences, setIsLoadingOccurrences] = useState(false);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    // Inline prediction ghost text
    const [prediction, setPrediction] = useState('');

    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // ─── Close dropdown on outside click ───
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ─── Debounced autocomplete ───
    const handleInputChange = useCallback((value: string) => {
        setQuery(value);
        setSelectedSpecies(null);
        setPrediction('');

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (value.trim().length < 2) {
            setSuggestions([]);
            setShowDropdown(false);
            setPrediction('');
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/search-species?q=${encodeURIComponent(value.trim())}`);
                const data = await res.json();
                const results: Suggestion[] = data.suggestions ?? [];
                setSuggestions(results);
                setShowDropdown(true);

                // Set inline prediction from the first suggestion
                if (results.length > 0 && value.trim().length > 0) {
                    const topName = results[0].common_name;
                    // Show prediction only if the suggestion starts with what the user typed
                    if (topName.toLowerCase().startsWith(value.toLowerCase())) {
                        setPrediction(topName);
                    } else {
                        setPrediction('');
                    }
                } else {
                    setPrediction('');
                }
            } catch (err) {
                console.error('Autocomplete error:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    }, []);

    // ─── Select a species → load all occurrences ───
    const handleSelectSpecies = useCallback(async (species: Suggestion) => {
        setQuery(species.common_name);
        setSelectedSpecies(species.common_name);
        setShowDropdown(false);
        setPrediction('');
        setIsLoadingOccurrences(true);

        try {
            const res = await fetch(`/api/search-species?name=${encodeURIComponent(species.common_name)}`);
            const data = await res.json();
            setOccurrences(data.occurrences ?? []);
        } catch (err) {
            console.error('Occurrence fetch error:', err);
        } finally {
            setIsLoadingOccurrences(false);
        }
    }, []);

    // ─── Accept Tab key to accept prediction ───
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Tab' && prediction && !selectedSpecies) {
            e.preventDefault();
            setQuery(prediction);
            setPrediction('');
            // Find the matching suggestion and select it
            const match = suggestions.find(s => s.common_name === prediction);
            if (match) handleSelectSpecies(match);
        }
    }, [prediction, selectedSpecies, suggestions, handleSelectSpecies]);

    // ─── Click an occurrence → fly the map (always, even same one) ───
    const handleOccurrenceClick = useCallback((sighting: Sighting) => {
        setHighlightedId(sighting.id);
        onFlyTo(sighting.latitude, sighting.longitude, sighting);
    }, [onFlyTo]);

    return (
        <div className="flex flex-col h-full" ref={wrapperRef}>
            {/* ── Search Input ── */}
            <div className="relative">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:border-emerald-400 transition-all">
                    <svg className="h-5 w-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <div className="relative flex-1">
                        {/* Ghost prediction text behind the real input */}
                        {prediction && !selectedSpecies && query.length > 0 && (
                            <span className="absolute inset-0 flex items-center text-sm pointer-events-none select-none">
                                <span className="invisible">{query}</span>
                                <span className="text-slate-300">{prediction.slice(query.length)}</span>
                            </span>
                        )}
                        <input
                            ref={inputRef}
                            id="species-search-input"
                            type="text"
                            value={query}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                            placeholder="Search by species name…"
                            className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400 text-sm relative z-10"
                        />
                    </div>
                    {isSearching && (
                        <svg className="animate-spin h-4 w-4 text-emerald-500 flex-shrink-0" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    )}
                    {query && !isSearching && (
                        <button
                            onClick={() => {
                                setQuery('');
                                setSuggestions([]);
                                setSelectedSpecies(null);
                                setOccurrences([]);
                                setShowDropdown(false);
                                setPrediction('');
                            }}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* ── Autocomplete Dropdown ── */}
                {showDropdown && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto animate-fadeIn">
                        {suggestions.map((s, i) => (
                            <button
                                key={`${s.common_name}-${i}`}
                                onClick={() => handleSelectSpecies(s)}
                                className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-b-0"
                            >
                                <span className="text-xl leading-none">
                                    {categoryIcons[s.category as SightingCategory] || '🔍'}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{s.common_name}</p>
                                    <p className="text-xs text-slate-500 italic truncate">{s.scientific_name}</p>
                                </div>
                                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                                    {s.count} {s.count === 1 ? 'sighting' : 'sightings'}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* ── No Results ── */}
                {showDropdown && suggestions.length === 0 && !isSearching && query.trim().length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 px-4 py-6 text-center animate-fadeIn">
                        <p className="text-slate-500 text-sm">No species found matching &ldquo;{query}&rdquo;</p>
                    </div>
                )}
            </div>

            {/* ── Occurrence List ── */}
            {selectedSpecies && (
                <div className="mt-4 flex-1 min-h-0 flex flex-col animate-fadeIn">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-700">
                            Sightings of <span className="text-emerald-700">{selectedSpecies}</span>
                        </h3>
                        <span className="text-xs text-slate-400">
                            {occurrences.length} {occurrences.length === 1 ? 'result' : 'results'}
                        </span>
                    </div>

                    {isLoadingOccurrences ? (
                        <div className="flex items-center justify-center py-8">
                            <svg className="animate-spin h-6 w-6 text-emerald-500" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        </div>
                    ) : occurrences.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-6">No sightings found.</p>
                    ) : (
                        <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-1">
                            {occurrences.map((occ) => (
                                <button
                                    key={occ.id}
                                    onClick={() => handleOccurrenceClick(occ)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 hover:shadow-md group ${highlightedId === occ.id
                                        ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                                        : 'bg-white border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${occ.confidence === 'high' ? 'bg-green-400' :
                                                occ.confidence === 'medium' ? 'bg-yellow-400' : 'bg-red-400'
                                                }`} />
                                            <span className="text-xs text-slate-600 truncate">
                                                {new Date(occ.created_at).toLocaleDateString('en-US', {
                                                    year: 'numeric', month: 'short', day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <svg className={`h-4 w-4 transition-transform duration-200 ${highlightedId === occ.id ? 'text-emerald-600 translate-x-0' : 'text-slate-300 -translate-x-1 group-hover:translate-x-0 group-hover:text-emerald-500'
                                            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                                        <span>{occ.latitude.toFixed(4)}°, {occ.longitude.toFixed(4)}°</span>
                                        <span className="text-slate-200">•</span>
                                        <span className="capitalize">{occ.confidence} conf.</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Empty state ── */}
            {!selectedSpecies && (
                <div className="flex-1 flex items-center justify-center py-8">
                    <div className="text-center">
                        <div className="text-4xl mb-3">🔬</div>
                        <p className="text-sm text-slate-500 max-w-[200px]">
                            Search for a species to view all recorded sightings
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
