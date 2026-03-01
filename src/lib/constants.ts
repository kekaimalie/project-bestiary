import type { SightingCategory } from './types';

export const CATEGORY_ICONS: Record<SightingCategory, string> = {
    plant: '🌿',
    bird: '🐦',
    mammal: '🦊',
    reptile: '🦎',
    amphibian: '🐸',
    fish: '🐟',
    insect: '🦋',
    arachnid: '🕷️',
    fungus: '🍄',
    other: '🔍',
};

export const CONFIDENCE_COLORS: Record<string, string> = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-red-100 text-red-700',
};
