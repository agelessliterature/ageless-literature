import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  showIcon?: boolean;
}

export default function InlineError({ message, onRetry, showIcon = true }: InlineErrorProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
      <div className="flex items-start gap-3">
        {showIcon && (
          <FontAwesomeIcon
            icon={['fal', 'exclamation-circle']}
            className="text-red-500 text-xl mt-0.5"
          />
        )}
        <div className="flex-1">
          <p className="text-red-700 text-sm">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium underline"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
