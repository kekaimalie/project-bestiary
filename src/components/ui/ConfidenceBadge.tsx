import { CONFIDENCE_COLORS } from '@/lib/constants';

interface ConfidenceBadgeProps {
    confidence: string;
    className?: string;
    showLabel?: boolean;
}

export default function ConfidenceBadge({ confidence, className = '', showLabel = false }: ConfidenceBadgeProps) {
    const colors = CONFIDENCE_COLORS[confidence] ?? 'bg-gray-100 text-gray-700';

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize w-fit ${colors} ${className}`}>
            {confidence}{showLabel ? ' confidence' : ''}
        </span>
    );
}
