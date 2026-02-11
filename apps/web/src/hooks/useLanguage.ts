/**
 * useLanguage Hook
 * Manages user language preference with backend persistence
 * Works with new server-side translation system
 */

'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCurrentLocale } from '@/lib/clientTranslations';
import toast from 'react-hot-toast';
import { getApiUrl } from '@/lib/api';

interface UseLanguageReturn {
  currentLanguage: string;
  isChanging: boolean;
  changeLanguage: (newLanguage: string) => Promise<void>;
  supportedLanguages: LanguageOption[];
}

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

/**
 * Hook to manage user language preference with full backend integration
 */
export function useLanguage(): UseLanguageReturn {
  const { data: session, update: updateSession } = useSession();
  const currentLocale = useCurrentLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Simplified initial state to avoid issues
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');

  // Simple effect to set initial language
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Try cookie first
    const cookieLanguage = document.cookie
      .split(';')
      .find((row) => row.trim().startsWith('NEXT_LOCALE='))
      ?.split('=')[1];

    if (cookieLanguage) {
      setCurrentLanguage(cookieLanguage);
    } else if (session?.user?.defaultLanguage) {
      setCurrentLanguage(session.user.defaultLanguage);
    } else {
      setCurrentLanguage(currentLocale);
    }
  }, [session?.user?.defaultLanguage, currentLocale]);

  // Change language with backend persistence
  const changeLanguage = useCallback(
    async (newLanguage: string) => {
      if (isPending || newLanguage === currentLanguage) return;

      if (!SUPPORTED_LANGUAGES.find((lang) => lang.code === newLanguage)) {
        toast.error('Unsupported language');
        return;
      }

      startTransition(async () => {
        try {
          // 1. Update cookie immediately for instant UI response
          document.cookie = `NEXT_LOCALE=${newLanguage}; path=/; max-age=31536000; SameSite=Lax`;
          setCurrentLanguage(newLanguage);

          // 2. Persist to backend if user is authenticated
          if (session?.user?.email) {
            try {
              // Call NextJS API route which handles NextAuth authentication
              const response = await fetch(getApiUrl('api/user/language'), {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  defaultLanguage: newLanguage,
                }),
              });

              const data = await response.json();

              if (response.ok && data?.success) {
                // 3. Update NextAuth session to reflect the change (non-blocking)
                updateSession({
                  ...session,
                  user: {
                    ...session.user,
                    defaultLanguage: newLanguage,
                  },
                }).catch(() => {
                  // Silently handle session update errors
                });

                toast.success('Language preference saved');
              } else {
                throw new Error(data?.message || 'Failed to update language');
              }
            } catch (backendError) {
              toast.error('Language updated locally, but failed to save to server');
            }
          } else {
            // For guests, just show local update
            toast.success('Language updated (login to save preference)');
          }

          // 4. Trigger Next.js to re-render with new locale
          router.refresh();
        } catch (error) {
          toast.error('Failed to change language');

          // Revert changes
          document.cookie = `NEXT_LOCALE=${currentLanguage}; path=/; max-age=31536000; SameSite=Lax`;
          setCurrentLanguage(currentLanguage);
        }
      });
    },
    [currentLanguage, isPending, router, session, updateSession],
  );

  return {
    currentLanguage,
    isChanging: isPending,
    changeLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}

/**
 * Get language display name
 * @param code - Language code
 */
export function getLanguageName(code: string): string {
  const language = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  return language?.name || code.toUpperCase();
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): LanguageOption[] {
  return SUPPORTED_LANGUAGES;
}
