import { ReactNode } from 'react';

export interface MobileCardAction {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

export interface MobileCardProps {
  /** Click handler for the whole card (navigation) */
  onClick?: () => void;
  /** Thumbnail element (image, avatar, icon) — rendered on the left */
  thumbnail?: ReactNode;
  /** Primary title text */
  title: string;
  /** Secondary subtitle text */
  subtitle?: string;
  /** Status badge — rendered top-right */
  badge?: ReactNode;
  /** Key-value detail rows shown in the card body */
  details?: { label: string; value: ReactNode }[];
  /** Primary highlighted metric (price, total, etc.) */
  primaryMetric?: { label: string; value: ReactNode };
  /** Action buttons rendered at the card bottom */
  actions?: MobileCardAction[];
  /** Extra content rendered after details */
  children?: ReactNode;
  /** Optional checkbox for multi-select */
  checkbox?: ReactNode;
  className?: string;
}

export default function MobileCard({
  onClick,
  thumbnail,
  title,
  subtitle,
  badge,
  details,
  primaryMetric,
  actions,
  children,
  checkbox,
  className = '',
}: MobileCardProps) {
  const Wrapper = onClick ? 'button' : 'div';
  const wrapperProps = onClick
    ? { onClick, type: 'button' as const, className: `w-full text-left ${className}` }
    : { className };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${onClick ? 'active:bg-gray-50 transition-colors cursor-pointer' : ''} ${className}`}
    >
      {/* Top row: thumbnail + title/subtitle + badge */}
      <div
        className="flex items-start gap-3 p-4 pb-2"
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {checkbox && (
          <div className="flex-shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
            {checkbox}
          </div>
        )}
        {thumbnail && <div className="flex-shrink-0">{thumbnail}</div>}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
              {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
            </div>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </div>
        </div>
      </div>

      {/* Details grid */}
      {details && details.length > 0 && (
        <div className="px-4 py-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {details.map((detail, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
                {detail.label}
              </span>
              <span className="text-sm text-gray-900">{detail.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Primary metric highlight */}
      {primaryMetric && (
        <div className="mx-4 my-2 bg-gray-50 rounded-md px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">{primaryMetric.label}</span>
          <span className="text-sm font-bold text-gray-900">{primaryMetric.value}</span>
        </div>
      )}

      {/* Extra content */}
      {children && <div className="px-4 py-2">{children}</div>}

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-3 border-t border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((action, i) => {
            const base =
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors min-h-[36px]';
            const variants: Record<string, string> = {
              primary: 'bg-primary text-white hover:bg-opacity-90',
              secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              danger: 'bg-red-50 text-red-700 hover:bg-red-100',
              ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
            };
            const cls = `${base} ${variants[action.variant || 'secondary']}`;

            if (action.href) {
              return (
                <a key={i} href={action.href} className={cls}>
                  {action.icon}
                  {action.label}
                </a>
              );
            }
            return (
              <button key={i} onClick={action.onClick} className={cls}>
                {action.icon}
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
