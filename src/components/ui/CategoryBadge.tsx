import type { SightingCategory } from '@/lib/types';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

interface CategoryBadgeProps {
    category: SightingCategory;
    className?: string;
    showIcon?: boolean;
}

export default function CategoryBadge({ category, className = '', showIcon = false }: CategoryBadgeProps) {


    return (
        <span className={`px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium capitalize flex items-center gap-1.5 w-fit ${className}`}>
            {showIcon && <span className="flex items-center justify-center"><CategoryIcon category={category} className="w-3.5 h-3.5" /></span>}
            {category}
        </span>
    );
}
