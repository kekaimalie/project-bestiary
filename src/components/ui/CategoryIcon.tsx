import React from 'react';
import type { SightingCategory } from '@/lib/types';

export function getCategorySVG(category: SightingCategory, className: string = 'w-5 h-5', fill: boolean = false) {
    const defaultStrokeInfo = fill ? { fill: 'currentColor', stroke: 'currentColor' } : { fill: 'none', stroke: 'currentColor' };

    // Plant / Fungus -> Leaf Replace leaf with green icons or just use the color from the current context.
    if (category === 'plant' || category === 'fungus') {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...defaultStrokeInfo}>
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                <path d="M2 22l10-10" />
                <path d="M12 12l.5-4.5" />
                <path d="M12 12l4.5-.5" />
            </svg>
        );
    }

    // Insect / Arachnid -> Bug
    if (category === 'insect' || category === 'arachnid') {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...defaultStrokeInfo}>
                <path d="m8 2 1.88 1.88" />
                <path d="M14.12 3.88 16 2" />
                <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
                <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
                <path d="M12 20v-9" />
                <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
                <path d="M6 13H2" />
                <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
                <path d="M20.97 5c-2 .2-3.53 1.9-3.53 3.9" />
                <path d="M22 13h-4" />
                <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
            </svg>
        );
    }

    // Animal / Bird / Mammal / Reptile / Amphibian / Fish -> Bone
    if (category === 'bird' || category === 'mammal' || category === 'reptile' || category === 'amphibian' || category === 'fish') {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...defaultStrokeInfo}>
                <path d="M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z" />
            </svg>
        );
    }

    // Other -> Search magnifier or standard circle point
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...defaultStrokeInfo}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </svg>
    );
}

export function CategoryIcon({ category, className = 'w-5 h-5', fill = false }: { category: SightingCategory, className?: string, fill?: boolean }) {
    return getCategorySVG(category, className, fill);
}
