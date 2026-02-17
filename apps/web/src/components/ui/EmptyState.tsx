import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: [string, string];
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon = ['fal', 'inbox'],
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <FontAwesomeIcon icon={icon} className="text-6xl text-gray-300 mb-4" />
      <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
      {description && <p className="text-gray-500 mb-6 max-w-md mx-auto">{description}</p>}
      {actionLabel &&
        (actionHref || onAction) &&
        (actionHref ? (
          <Link
            href={actionHref}
            className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {actionLabel}
          </button>
        ))}
    </div>
  );
}
