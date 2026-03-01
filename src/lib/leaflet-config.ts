import L from 'leaflet';

/**
 * Standard Leaflet marker icon configuration.
 * Webpack/Next.js breaks the default image paths, so we point them to a reliable CDN.
 */
export const leafletMarkerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

/**
 * Highlighted Leaflet marker icon.
 * Includes a custom CSS class for pulse animations and color shifts.
 */
export const leafletHighlightIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: 'highlighted-marker',
});

import type { SightingCategory } from '@/lib/types';

function getSvgPathContent(category: SightingCategory): string {
    if (category === 'plant' || category === 'fungus') {
        return '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 22l10-10"/><path d="M12 12l.5-4.5"/><path d="M12 12l4.5-.5"/>';
    }
    if (category === 'insect' || category === 'arachnid') {
        return '<path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c-2 .2-3.53 1.9-3.53 3.9"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>';
    }
    if (category === 'bird' || category === 'mammal' || category === 'reptile' || category === 'amphibian' || category === 'fish') {
        return '<path d="M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z"/>';
    }
    return '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>';
}

export function getCategoryMapIcon(category: SightingCategory, isHighlighted: boolean = false): L.DivIcon {
    const svgContent = getSvgPathContent(category);

    // Base styles
    const bgColor = isHighlighted ? '#10b981' : '#047857'; // emerald-500 vs emerald-700
    const borderColor = isHighlighted ? '#a7f3d0' : '#ffffff'; // emerald-200 vs white
    const scale = isHighlighted ? 'scale(1.15)' : 'scale(1)';
    const animation = isHighlighted ? 'animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;' : '';

    const html = `
      <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid ${bgColor}; z-index: 0;"></div>
      <div style="background-color: ${bgColor}; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid ${borderColor}; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); transition: all 0.2s ease; position: relative; z-index: 1;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: white;">
          ${svgContent}
        </svg>
      </div>
    `;

    return new L.DivIcon({
        html: `<div style="position: relative; display: flex; align-items: center; justify-content: center; flex-direction: column; transform: translateY(-16px) ${scale}; ${animation}">${html}</div>`,
        className: isHighlighted ? 'custom-category-icon highlighted-marker' : 'custom-category-icon',
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40],
    });
}

