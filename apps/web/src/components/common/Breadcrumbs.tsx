'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { useTranslations } from '@/lib/clientTranslations';

interface BreadcrumbItem {
  label: string;
  href: string;
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations('breadcrumbs');

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (!pathname) return [];

    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ label: t('home'), href: '/' }];

    let currentPath = '';
    paths.forEach((path) => {
      currentPath += `/${path}`;

      // Try to get translation first, fallback to formatted path
      const translationKey = path.toLowerCase().replace(/-/g, '');
      let label: string;

      try {
        label = t(translationKey);
      } catch {
        // Fallback: Format the label (capitalize and replace hyphens)
        label = path
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }

      breadcrumbs.push({
        label,
        href: currentPath,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (!pathname || breadcrumbs.length <= 1) {
    return null; // Don't show breadcrumbs on home page or if no pathname
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isFirst = index === 0;

          return (
            <li key={crumb.href} className="flex items-center">
              {index > 0 && (
                <FontAwesomeIcon
                  icon={['fal', 'chevron-right']}
                  className="text-sm text-gray-400 mx-2"
                />
              )}

              {isLast ? (
                <span className="text-secondary font-medium">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-gray-600 hover:text-secondary transition-colors duration-200 flex items-center gap-1.5"
                >
                  {isFirst && <FontAwesomeIcon icon={['fal', 'home']} className="text-sm" />}
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
