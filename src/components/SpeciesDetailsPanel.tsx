'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Sighting } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';
import { GeminiIcon } from '@/components/ui/GeminiIcon';

interface DynamicSection {
    header: string;
    content: string;
    icon: string;
}

interface DescriptionSections {
    appearance?: string;
    habitat?: string;
    behavior?: string;
    conservation?: string;
}

interface SpeciesDetailsPanelProps {
    sighting: Sighting;
    initialDescription?: string;
    autoFetchToggle?: boolean;
    onStatusChange?: (isFetching: boolean, hasLoaded: boolean, description?: string) => void;
    onDismiss: () => void;
}

export default function SpeciesDetailsPanel({
    sighting,
    initialDescription = '',
    autoFetchToggle,
    onStatusChange,
    onDismiss
}: SpeciesDetailsPanelProps) {
    // Treat the initial description (if passed from upload success) as pre-fetched
    const [fetchedDescription, setFetchedDescription] = useState<string | null>(initialDescription || null);
    const [sections, setSections] = useState<DescriptionSections | DynamicSection[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ─── Wikipedia species image state ───
    const [speciesImageUrl, setSpeciesImageUrl] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState(true);

    // ─── Lightbox state ───
    const [lightboxOpen, setLightboxOpen] = useState(false);

    // Close lightbox on Escape key
    useEffect(() => {
        if (!lightboxOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setLightboxOpen(false);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [lightboxOpen]);

    const handleLearnMore = useCallback(async () => {
        if (fetchedDescription) return;
        setIsLoading(true);
        setError(null);
        onStatusChange?.(true, false);

        try {
            const res = await fetch('/api/learn-more', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    common_name: sighting.common_name,
                    scientific_name: sighting.scientific_name
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to get info.');
            setFetchedDescription(data.description);
            if (data.sections) {
                setSections(data.sections);
            }
            onStatusChange?.(false, true, data.description);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Something went wrong.';
            setError(msg);
            onStatusChange?.(false, false);
        } finally {
            setIsLoading(false);
        }
    }, [fetchedDescription, onStatusChange, sighting.common_name, sighting.scientific_name]);

    // Auto-fetch when triggered from map popup
    useEffect(() => {
        if (autoFetchToggle !== undefined && !fetchedDescription && !isLoading) {
            handleLearnMore();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoFetchToggle]);

    // ─── Fetch Wikipedia species image on mount ───
    useEffect(() => {
        let cancelled = false;
        setImageLoading(true);
        setSpeciesImageUrl(null);

        fetch('/api/species-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                common_name: sighting.common_name,
                scientific_name: sighting.scientific_name,
            }),
        })
            .then(res => res.json())
            .then(data => {
                if (!cancelled && data.imageUrl) {
                    setSpeciesImageUrl(data.imageUrl);
                }
            })
            .catch(() => { /* silently ignore — image is optional */ })
            .finally(() => {
                if (!cancelled) setImageLoading(false);
            });

        return () => { cancelled = true; };
    }, [sighting.common_name, sighting.scientific_name]);

    // ─── Section config for structured descriptions ───
    const sectionConfig = [
        { key: 'appearance' as const, label: 'Appearance', icon: '🔍', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-100' },
        { key: 'habitat' as const, label: 'Habitat', icon: '🌍', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
        { key: 'behavior' as const, label: 'Behavior', icon: '🦜', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
        { key: 'conservation' as const, label: 'Conservation', icon: '🛡️', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    ];

    return (
        <>
            <div className="bg-white rounded-xl shadow-lg border border-emerald-100 overflow-hidden relative">
                {/* ── Header with optional thumbnail ── */}
                <div className="bg-emerald-50 px-5 py-4 border-b border-emerald-100 flex justify-between items-start gap-4">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                        {/* Thumbnail */}
                        {imageLoading ? (
                            <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gradient-to-br from-emerald-100 to-slate-100 animate-pulse flex items-center justify-center">
                                <svg className="w-6 h-6 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg>
                            </div>
                        ) : speciesImageUrl ? (
                            <button
                                onClick={() => setLightboxOpen(true)}
                                className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 border-emerald-200 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all cursor-zoom-in group relative"
                                aria-label="View full image"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={speciesImageUrl}
                                    alt={`Photo of ${sighting.common_name}`}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                                    </svg>
                                </div>
                            </button>
                        ) : null}

                        {/* Species info */}
                        <div className="min-w-0">
                            <h2 className="text-xl font-bold text-emerald-800 capitalize truncate">
                                {sighting.common_name}
                            </h2>
                            <p className="italic text-slate-600 text-sm">{sighting.scientific_name}</p>
                            {speciesImageUrl && !imageLoading && (
                                <span className="text-[10px] text-slate-400 mt-1 block">📷 Click image to enlarge</span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={onDismiss}
                        className="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100 rounded-full w-8 h-8 flex items-center justify-center transition-colors -mr-2 flex-shrink-0"
                        aria-label="Dismiss details"
                    >
                        &times;
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">
                    {/* Meta details */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
                            {sighting.category}
                        </span>
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(sighting.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {sighting.latitude.toFixed(3)}, {sighting.longitude.toFixed(3)}
                        </span>
                    </div>

                    {/* Fun Fact */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
                        <span className="font-bold block mb-1 text-slate-700">Did you know?</span>
                        <p className="text-slate-600 leading-relaxed">{sighting.fun_fact}</p>
                    </div>

                    {/* Learn More section */}
                    <div className="pt-2">
                        {fetchedDescription ? (
                            <div className="space-y-3">
                                <h3 className="font-bold text-emerald-800 flex items-center gap-2 text-base">
                                    <GeminiIcon className="w-5 h-5 flex-shrink-0" /> About this species
                                </h3>

                                {Array.isArray(sections) ? (
                                    /* ── Dynamic sections with icons ── */
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {sections.map((section, idx) => {
                                            const colors = [
                                                { color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-100' },
                                                { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
                                                { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
                                                { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                                                { color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100' },
                                            ];
                                            const theme = colors[idx % colors.length];
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`${theme.bg} p-3.5 rounded-lg border ${theme.border} text-sm`}
                                                >
                                                    <span className={`font-semibold ${theme.color} flex items-center gap-1.5 mb-1.5 text-xs uppercase tracking-wider`}>
                                                        <span className="text-base leading-none flex items-center justify-center" style={{ fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif" }}>{section.icon || <GeminiIcon className="w-4 h-4" />}</span>
                                                        {section.header}
                                                    </span>
                                                    <p className="text-slate-700 leading-relaxed">{section.content}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : sections ? (
                                    /* ── Structured sections with icons (Old Format Fallback) ── */
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {sectionConfig.map(({ key, label, icon, color, bg, border }) => {
                                            const text = (sections as DescriptionSections)[key];
                                            if (!text) return null;
                                            return (
                                                <div
                                                    key={key}
                                                    className={`${bg} p-3.5 rounded-lg border ${border} text-sm`}
                                                >
                                                    <span className={`font-semibold ${color} flex items-center gap-1.5 mb-1.5 text-xs uppercase tracking-wider`}>
                                                        <span className="text-base leading-none">{icon}</span>
                                                        {label}
                                                    </span>
                                                    <p className="text-slate-700 leading-relaxed">{text}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    /* ── Fallback: plain paragraph (cached / old-format data) ── */
                                    <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 text-sm">
                                        <p className="text-emerald-900 leading-relaxed">{fetchedDescription}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-start gap-2">
                                <button
                                    onClick={handleLearnMore}
                                    disabled={isLoading}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-75 disabled:cursor-wait"
                                >
                                    {isLoading ? (
                                        <>
                                            <Spinner className="h-4 w-4" />
                                            Asking Gemini...
                                        </>
                                    ) : <>
                                        <GeminiIcon className="w-4 h-4 flex-shrink-0 text-white" /> Learn more with Gemini
                                    </>
                                    }
                                </button>
                                {error && <p className="text-xs text-red-500">{error}</p>}
                            </div>
                        )}
                    </div>
                </div>
            </div >

            {/* ── Lightbox Modal ── */}
            {
                lightboxOpen && speciesImageUrl && (
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn cursor-zoom-out"
                        onClick={() => setLightboxOpen(false)}
                        role="dialog"
                        aria-label="Image viewer"
                    >
                        <button
                            onClick={() => setLightboxOpen(false)}
                            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center text-2xl transition-colors z-10"
                            aria-label="Close image viewer"
                        >
                            &times;
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={speciesImageUrl}
                            alt={`Full view of ${sighting.common_name}`}
                            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl animate-scaleIn"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <span className="absolute bottom-6 text-white/60 text-xs">Image via Wikipedia • Click outside or press Esc to close</span>
                    </div>
                )
            }
        </>
    );
}
