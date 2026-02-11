import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async ({ locale }) => {
  // i18n: language-preference fix - Get locale from cookie or fallback
  let resolvedLocale = locale || 'en';

  // Check for user language preference in cookie
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE');

  if (localeCookie?.value && ['en', 'es', 'fr', 'de'].includes(localeCookie.value)) {
    resolvedLocale = localeCookie.value;
  }

  return {
    locale: resolvedLocale,
    messages: (await import(`./messages/${resolvedLocale}.json`)).default,
  };
});
