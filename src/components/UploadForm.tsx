'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import exifr from 'exifr';
import type { Sighting, IdentifyRequestBody } from '@/lib/types';

// Dynamically import LocationPicker (uses Leaflet → needs window)
const LocationPickerWithNoSSR = dynamic(() => import('@/components/LocationPicker'), {
    ssr: false,
    loading: () => (
        <div className="h-48 w-full rounded-lg flex items-center justify-center bg-amber-50 border border-amber-200 animate-pulse">
            <p className="text-amber-700 text-sm font-medium">Loading location picker...</p>
        </div>
    ),
});

interface UploadFormProps {
    onUploadSuccess: (sighting: Sighting, description: string) => void;
}

type Coordinates = { latitude: number; longitude: number } | null;

export default function UploadForm({ onUploadSuccess }: UploadFormProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState('');
    const [isMobile, setIsMobile] = useState(false);

    // Location state
    const [coords, setCoords] = useState<Coordinates>(null);
    const [needsManualLocation, setNeedsManualLocation] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // ─── Detect mobile / touch device ───
    useEffect(() => {
        const check = () => {
            const coarse = window.matchMedia('(pointer: coarse)').matches;
            const narrow = window.innerWidth < 640;
            setIsMobile(coarse || narrow);
        };
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // ─── Revoke old object URLs to prevent memory leaks ───
    const clearPreview = useCallback(() => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setFile(null);
        setCoords(null);
        setNeedsManualLocation(false);
        setPendingFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [previewUrl]);

    // ─── File selection handler ───
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;

        // Revoke previous preview URL if one exists
        if (previewUrl) URL.revokeObjectURL(previewUrl);

        setFile(selected);
        setPreviewUrl(URL.createObjectURL(selected));
        setError(null);
        setStatus('');
        setNeedsManualLocation(false);
        setCoords(null);

        // Try to extract GPS from EXIF
        setStatus('Checking photo for GPS data...');
        try {
            const gps = await exifr.gps(selected);
            if (gps?.latitude != null && gps?.longitude != null) {
                setStatus('📍 GPS data found in photo!');
                setCoords({ latitude: gps.latitude, longitude: gps.longitude });
                return;
            }
        } catch {
            // EXIF parsing can fail on some formats — that's okay
        }

        // No GPS found — prompt for manual location
        setStatus('');
        setNeedsManualLocation(true);
        setPendingFile(selected);
    };

    // ─── Manual location selected callback ───
    const handleLocationSelected = useCallback((lat: number, lng: number) => {
        setCoords({ latitude: lat, longitude: lng });
        setNeedsManualLocation(false);
        setStatus('📍 Location set manually.');
    }, []);

    // ─── Cancel manual location ───
    const handleLocationCancel = useCallback(() => {
        setNeedsManualLocation(false);
        clearPreview();
        setStatus('');
    }, [clearPreview]);

    // ─── Convert file to base64 data URL ───
    const toBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read file.'));
            reader.readAsDataURL(file);
        });

    // ─── Submit handler ───
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const activeFile = file || pendingFile;
        if (!activeFile || !coords) return;

        setIsProcessing(true);
        setError(null);

        try {
            setStatus('Converting image...');
            const base64Image = await toBase64(activeFile);

            setStatus('🤖 Identifying species with Gemini AI...');
            const payload: IdentifyRequestBody = {
                image: base64Image,
                latitude: coords.latitude,
                longitude: coords.longitude,
                mimeType: activeFile.type || 'image/jpeg',
            };

            const res = await fetch('/api/identify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to identify image.');

            setStatus('✅ Success!');
            clearPreview();
            onUploadSuccess(data.sighting, data.description ?? '');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
            setError(message);
            setStatus('');
        } finally {
            setIsProcessing(false);
        }
    };

    const canSubmit = (file || pendingFile) && coords && !isProcessing;

    const isUnsupportedImage = file
        ? file.type.toLowerCase().includes('heic') || file.type.toLowerCase().includes('heif') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
        : false;

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-emerald-800 mb-4">Record a Sighting</h2>
            <p className="text-gray-600 mb-6 text-sm">
                Upload a photo of a plant or animal. We&apos;ll identify it using AI and map it!
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* ── File input: mobile = plain button, desktop = drop zone ── */}
                {isMobile ? (
                    /* ── MOBILE: Simple button ── */
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                            className="w-full py-4 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-md flex items-center justify-center gap-3 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                            </svg>
                            {previewUrl ? 'Change Photo' : 'Take or Upload Photo'}
                        </button>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            disabled={isProcessing}
                        />

                        {/* Mobile preview */}
                        {previewUrl && (
                            <div className="relative rounded-xl overflow-hidden border border-gray-200">
                                {isUnsupportedImage && file ? (
                                    <div className="w-full h-48 bg-gray-100 flex flex-col items-center justify-center p-4">
                                        <svg className="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                        </svg>
                                        <span className="text-sm text-gray-700 font-medium text-center break-all">{file.name}</span>
                                        <span className="text-xs text-gray-500 mt-1">Preview not available</span>
                                    </div>
                                ) : (
                                    <img
                                        src={previewUrl}
                                        alt="Selected photo preview"
                                        className="w-full h-48 object-cover"
                                    />
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); clearPreview(); }}
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                                    aria-label="Remove image"
                                >
                                    &times;
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── DESKTOP: Drop zone / preview ── */
                    <div className="border-2 border-dashed border-emerald-300 rounded-xl p-4 text-center hover:bg-emerald-50 transition-colors cursor-pointer relative overflow-hidden">
                        {previewUrl ? (
                            <div
                                className="relative w-full h-48 rounded-lg overflow-hidden border border-emerald-200 shadow-inner cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {isUnsupportedImage && file ? (
                                    <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center p-4">
                                        <svg className="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                        </svg>
                                        <span className="text-sm text-gray-700 font-medium text-center break-all">{file.name}</span>
                                        <span className="text-xs text-gray-500 mt-1">Preview not available</span>
                                    </div>
                                ) : (
                                    <img
                                        src={previewUrl}
                                        alt="Selected photo preview"
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); clearPreview(); }}
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors shadow-md z-10"
                                    aria-label="Remove image"
                                >
                                    &times;
                                </button>
                                {/* Hidden file input for re-selection */}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    ref={fileInputRef}
                                    disabled={isProcessing}
                                />
                            </div>
                        ) : (
                            <div className="py-8 relative">
                                {/* Camera / upload icon */}
                                <svg className="mx-auto h-12 w-12 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                                </svg>
                                <p className="mt-2 text-sm text-gray-600">Click to capture or upload a photo</p>
                                <p className="mt-1 text-xs text-gray-400">JPG, PNG, WebP, HEIC</p>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                    ref={fileInputRef}
                                    disabled={isProcessing}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* ── Location picker (shown when no EXIF GPS) ── */}
                {needsManualLocation && (
                    <LocationPickerWithNoSSR
                        onLocationSelected={handleLocationSelected}
                        onCancel={handleLocationCancel}
                    />
                )}

                {/* ── Coords confirmed badge ── */}
                {coords && !needsManualLocation && (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                        <span>📍</span>
                        <span className="font-mono">{coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}</span>
                    </div>
                )}

                {/* ── Status indicator ── */}
                {status && (
                    <p className="text-sm font-medium text-emerald-600 animate-pulse">{status}</p>
                )}

                {/* ── Error display ── */}
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600" role="alert">
                        {error}
                    </div>
                )}

                {/* ── Submit button ── */}
                <button
                    type="submit"
                    disabled={!canSubmit}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all shadow-md ${!canSubmit
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg transform hover:-translate-y-0.5'
                        }`}
                >
                    {isProcessing ? 'Processing...' : 'Identify & Map It'}
                </button>
            </form>
        </div>
    );
}
