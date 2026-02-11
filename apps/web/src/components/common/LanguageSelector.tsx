/**
 * Language Selector Component
 */

'use client';

import { useLanguage } from '@/hooks/useLanguage';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'dropdown' | 'buttons';
}

export default function LanguageSelector({
  className = '',
  variant = 'dropdown',
}: LanguageSelectorProps) {
  // i18n: language-preference fix - Use enhanced useLanguage hook
  const { currentLanguage, isChanging, changeLanguage, supportedLanguages } = useLanguage();

  if (variant === 'buttons') {
    return (
      <div className={`flex gap-2 ${className}`} role="group" aria-label="Language selection">
        {supportedLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            disabled={isChanging || currentLanguage === lang.code}
            className={`px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 ${
              currentLanguage === lang.code
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'
            } ${isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label={`Switch to ${lang.name}`}
            aria-pressed={currentLanguage === lang.code}
          >
            {lang.flag} {lang.name}
          </button>
        ))}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div className={className}>
      <select
        value={currentLanguage}
        onChange={(e) => changeLanguage(e.target.value)}
        disabled={isChanging}
        className="border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm hover:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Select language"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
      {isChanging && <div className="mt-1 text-xs text-gray-500">Updating language...</div>}
    </div>
  );
}
