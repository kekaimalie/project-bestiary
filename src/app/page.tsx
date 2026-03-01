'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import UploadForm from '@/components/UploadForm';
import SpeciesDetailsPanel from '@/components/SpeciesDetailsPanel';
import FindTab from '@/components/FindTab';
import { supabase } from '@/lib/supabase';
import type { Sighting } from '@/lib/types';

// Dynamically import Map (Leaflet requires the `window` object)
const MapWithNoSSR = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full rounded-xl flex items-center justify-center bg-emerald-50 border border-emerald-100 animate-pulse">
      <p className="text-emerald-800 font-medium">Loading map...</p>
    </div>
  ),
});

type TabId = 'explore' | 'find';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('explore');
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);

  // ─── Selected Sighting State (replaces auto-dismissing banner) ───
  // This state now drives the persistent Details Panel next to the map
  const [selectedSighting, setSelectedSighting] = useState<{
    sighting: Sighting;
    initialDescription?: string;
    autoFetchToggle?: boolean;
  } | null>(null);

  // States to track which IDs are loading or have loaded descriptions (for Map button feedback)
  const [loadingDescriptions, setLoadingDescriptions] = useState<Record<string, boolean>>({});
  const [loadedDescriptions, setLoadedDescriptions] = useState<Record<string, string>>({});

  // Ref for the details panel to auto-scroll into view
  const detailsPanelRef = useRef<HTMLDivElement>(null);

  // ─── Fetch all sightings from Supabase ───
  const fetchSightings = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('sightings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSightings(data ?? []);
    } catch (err) {
      console.error('Error fetching sightings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSightings();
  }, [fetchSightings]);

  // ─── Handle a successful upload ───
  const handleUploadSuccess = useCallback((sighting: Sighting, description: string) => {
    // Show the new upload in the details panel (persistent)
    setSelectedSighting({ sighting, initialDescription: description });

    // Prepend to the sightings list (no re-fetch needed)
    setSightings((prev) => [sighting, ...prev]);

    // Fly the map to the new sighting
    setFlyTo([sighting.latitude, sighting.longitude]);
  }, []);

  // ─── Handle Map Pin Click ───
  const handleMarkerClick = useCallback((sighting: Sighting) => {
    // When a user clicks a pin, show that sighting in the details panel
    // Pass cached description so it doesn't need to be re-fetched
    const cached = loadedDescriptions[sighting.id];
    setSelectedSighting({ sighting, initialDescription: cached });
    setFlyTo([sighting.latitude, sighting.longitude]);
    // Smooth scroll to details panel
    setTimeout(() => {
      detailsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 200);
  }, [loadedDescriptions]);

  // ─── Handle "Learn More" Click from Map Popup ───
  const handleLearnMoreClick = useCallback((sighting: Sighting) => {
    // If it's already loaded, just show it, don't trigger fetch again
    if (loadedDescriptions[sighting.id]) {
      setSelectedSighting({ sighting, initialDescription: loadedDescriptions[sighting.id] });
      setFlyTo([sighting.latitude, sighting.longitude]);
      return;
    }

    // Show sighting AND trigger the fetch in the side panel
    setSelectedSighting(prev => ({
      sighting,
      autoFetchToggle: prev?.sighting.id === sighting.id ? !prev.autoFetchToggle : true
    }));
    setFlyTo([sighting.latitude, sighting.longitude]);
  }, [loadedDescriptions]);

  // ─── Callback for SpeciesDetailsPanel to report fetch status ───
  const handleDescriptionStatusChange = useCallback((sightingId: string, isFetching: boolean, hasLoaded: boolean, description?: string) => {
    setLoadingDescriptions(prev => ({ ...prev, [sightingId]: isFetching }));
    if (hasLoaded && description) {
      setLoadedDescriptions(prev => ({ ...prev, [sightingId]: description }));
      // Auto-scroll to details panel when info finishes loading
      setTimeout(() => {
        detailsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, []);

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-emerald-50 text-slate-800">
      {/* ── Header ── */}
      <header className="bg-gradient-to-r from-emerald-800 to-emerald-700 text-white py-5 px-6 shadow-lg flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
              🌿 EcoMap
            </h1>
            <p className="text-emerald-200 mt-1 text-sm md:text-base max-w-xl">
              Snap a photo, ID the species with AI, and map biodiversity in real-time.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="bg-emerald-900/40 px-4 py-2 rounded-lg backdrop-blur-sm border border-emerald-600">
              <span className="text-emerald-200 text-sm font-medium mr-2">Total Sightings</span>
              <span className="text-white font-bold text-xl">{isLoading ? '…' : sightings.length}</span>
            </div>
            <svg className="h-10 w-10 opacity-80 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </header>

      {/* ── Tab Navigation ── */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-[900]">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <nav className="flex gap-1" role="tablist">
            <button
              id="tab-explore"
              role="tab"
              aria-selected={activeTab === 'explore'}
              onClick={() => setActiveTab('explore')}
              className={`relative px-5 py-3.5 text-sm font-semibold transition-all duration-200 rounded-t-lg ${activeTab === 'explore'
                  ? 'text-emerald-700 bg-emerald-50/80'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upload &amp; Explore
              </span>
              {activeTab === 'explore' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full tab-indicator" />
              )}
            </button>
            <button
              id="tab-find"
              role="tab"
              aria-selected={activeTab === 'find'}
              onClick={() => setActiveTab('find')}
              className={`relative px-5 py-3.5 text-sm font-semibold transition-all duration-200 rounded-t-lg ${activeTab === 'find'
                  ? 'text-emerald-700 bg-emerald-50/80'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
                Find
              </span>
              {activeTab === 'find' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full tab-indicator" />
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto p-4 md:p-6 flex-1 w-full">
        {/* ─── Upload & Explore Tab ─── */}
        {activeTab === 'explore' && (
          <div className="animate-fadeIn">
            {/* Upload + Map side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* Left Column (Upload) */}
              <div className="lg:col-span-4">
                <UploadForm onUploadSuccess={handleUploadSuccess} />
              </div>

              {/* Right Column (Map) */}
              <div className="lg:col-span-8 sticky top-6">
                <div className="bg-white p-2 rounded-xl shadow-xl border border-slate-200 relative overflow-hidden group">
                  {/* Optional overlay hint before first interaction */}
                  {!selectedSighting && sightings.length > 0 && (
                    <div className="absolute top-4 inset-x-0 flex justify-center z-[1000] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <span className="bg-slate-800/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full shadow-md">
                        Click any marker to view species details
                      </span>
                    </div>
                  )}

                  <MapWithNoSSR
                    sightings={sightings}
                    flyToPosition={flyTo}
                    onMarkerClick={handleMarkerClick}
                    onLearnMoreClick={handleLearnMoreClick}
                    loadingDescriptions={loadingDescriptions}
                    loadedDescriptions={loadedDescriptions}
                  />
                </div>
              </div>

            </div>

            {/* Details Panel (below map, full width) */}
            {selectedSighting && (
              <div ref={detailsPanelRef} className="mt-6 transition-all duration-300 transform origin-top">
                <SpeciesDetailsPanel
                  key={selectedSighting.sighting.id}
                  sighting={selectedSighting.sighting}
                  initialDescription={selectedSighting.initialDescription}
                  autoFetchToggle={selectedSighting.autoFetchToggle}
                  onStatusChange={(isFetching, hasLoaded, description) =>
                    handleDescriptionStatusChange(selectedSighting.sighting.id, isFetching, hasLoaded, description)
                  }
                  onDismiss={() => setSelectedSighting(null)}
                />
              </div>
            )}
          </div>
        )}

        {/* ─── Find Tab ─── */}
        {activeTab === 'find' && (
          <div className="animate-fadeIn">
            <FindTab />
          </div>
        )}
      </div>
    </main>
  );
}
