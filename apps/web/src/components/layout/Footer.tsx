'use client';

import Link from 'next/link';
import Image from 'next/image';
import { withAssetPrefix } from '@/lib/basePath';
import { useTranslations } from '@/lib/clientTranslations';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { useSession, signOut } from 'next-auth/react';

export default function Footer() {
  const t = useTranslations('footer');
  const { data: session } = useSession();

  return (
    <footer className="bg-primary text-white mt-auto">
      {/* Main Footer */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Explore Column */}
          <div>
            <h4 className="text-secondary font-bold text-lg mb-6 tracking-wide">{t('explore')}</h4>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/about"
                  className="text-gray-300 hover:text-secondary transition-colors duration-300 text-sm"
                >
                  {t('aboutUs')}
                </Link>
              </li>
              <li>
                <Link
                  href="/shop"
                  className="text-gray-300 hover:text-secondary transition-colors duration-300 text-sm"
                >
                  {t('shop')}
                </Link>
              </li>
              <li>
                <Link
                  href="/booksellers"
                  className="text-gray-300 hover:text-secondary transition-colors duration-300 text-sm"
                >
                  {t('booksellers')}
                </Link>
              </li>
              <li>
                {session ? (
                  <button
                    onClick={() => signOut()}
                    className="text-gray-300 hover:text-secondary transition-colors duration-300 text-sm"
                  >
                    {t('signOut')}
                  </button>
                ) : (
                  <Link
                    href="/auth/login"
                    className="text-gray-300 hover:text-secondary transition-colors duration-300 text-sm"
                  >
                    {t('signInJoin')}
                  </Link>
                )}
              </li>
            </ul>
          </div>

          {/* Policy Column */}
          <div>
            <h4 className="text-secondary font-bold text-lg mb-6 tracking-wide">{t('policy')}</h4>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/faq"
                  className="text-gray-300 hover:text-secondary transition-colors duration-300 text-sm"
                >
                  {t('faq')}
                </Link>
              </li>
              <li>
                <Link
                  href="/refunds"
                  className="text-gray-300 hover:text-secondary transition-colors duration-300 text-sm"
                >
                  {t('refundsPolicy')}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-gray-300 hover:text-secondary transition-colors duration-300 text-sm"
                >
                  {t('termsOfUse')}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-300 hover:text-secondary transition-colors duration-300 text-sm"
                >
                  {t('privacyPolicy')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Follow Us Column */}
          <div>
            <h4 className="text-secondary font-bold text-lg mb-6 tracking-wide">{t('followUs')}</h4>
            <a
              href="https://www.instagram.com/agelessliterature?igsh=YWpmdDJpZDVpZnVo&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 text-gray-300 hover:text-secondary transition-colors duration-300 text-sm"
            >
              <FontAwesomeIcon icon={['fab', 'instagram']} className="text-xl" />
              {t('instagram')}
            </a>
          </div>

          {/* Contact Column */}
          <div>
            <Image
              src={withAssetPrefix('/ageless-literature-logo.svg')}
              alt="Ageless Literature"
              width={180}
              height={54}
              className="h-14 w-auto mb-6"
              style={{ filter: 'brightness(0) saturate(100%) invert(1)' }}
            />
            <p className="text-sm text-gray-400 mb-4">{t('tagline')}</p>
            <a
              href="mailto:support@agelessliterature.com"
              className="text-gray-300 hover:text-secondary transition-colors duration-300 text-sm block"
            >
              support@agelessliterature.com
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-secondary/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">{t('copyright')}</p>
            <div className="flex gap-6 text-sm">
              <Link
                href="/sitemap"
                className="text-gray-400 hover:text-secondary transition-colors"
              >
                {t('sitemap')}
              </Link>
              <Link
                href="/accessibility"
                className="text-gray-400 hover:text-secondary transition-colors"
              >
                {t('accessibility')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
