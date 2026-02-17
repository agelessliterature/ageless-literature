import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface PageLoadingProps {
  message?: string;
  fullPage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function PageLoading({ message, fullPage = true, size = 'md' }: PageLoadingProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-2xl',
    md: 'w-12 h-12 text-4xl',
    lg: 'w-16 h-16 text-5xl',
  };

  const containerClass = fullPage
    ? 'min-h-screen flex items-center justify-center'
    : 'py-12 flex items-center justify-center';

  return (
    <div className={containerClass} role="status" aria-busy="true" aria-live="polite">
      <div className="text-center">
        <div className={`${sizeClasses[size]} mx-auto mb-4 text-primary animate-spin`}>
          <FontAwesomeIcon icon={['fal', 'spinner-third']} />
        </div>
        {message && <p className="text-gray-600 text-sm font-medium">{message}</p>}
      </div>
    </div>
  );
}
