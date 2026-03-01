import type { SightingCategory } from '@/lib/types';
import { CATEGORY_ICONS } from '@/lib/constants';

interface CategoryBadgeProps {
    category: SightingCategory;
    className?: string;
    showIcon?: boolean;
}

export default function CategoryBadge({ category, className = '', showIcon = false }: CategoryBadgeProps) {
    const icon = CATEGORY_ICONS[category] || '🔍';

    return (
        <span className={`px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium capitalize flex items-center gap-1.5 w-fit ${className}`}>
            {showIcon && <span>{icon}</span>}
            {category}
        </span>
    );
}
