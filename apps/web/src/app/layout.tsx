import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { Montserrat } from 'next/font/google';
import Script from 'next/script';
import { Providers } from '@/components/Providers';
import ConditionalLayout from '@/components/layout/ConditionalLayout';
import { FontAwesomeConfig } from '@/lib/fontawesome';
// FontAwesome CSS is handled by the kit loaded via script tag
import './globals.css';

// Load Montserrat font from Google Fonts
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Ageless Literature - Rare Book Marketplace',
    template: '%s | Ageless Literature',
  },
  description:
    'Discover and purchase rare books from trusted vendors worldwide. Multi-vendor marketplace featuring wishlists, reservations, memberships, and real-time messaging.',
  keywords:
    'rare books, antique books, book marketplace, used books, vintage books, book collectors',
  authors: [{ name: 'Ageless Literature' }],
  metadataBase: new URL('https://ageless-literature.com'),
  alternates: {
    canonical: '/',
  },
  manifest: process.env.NEXT_PUBLIC_BASE_PATH
    ? `${process.env.NEXT_PUBLIC_BASE_PATH}/manifest.json`
    : '/manifest.json',
  icons: {
    icon: [
      {
        url: process.env.NEXT_PUBLIC_BASE_PATH
          ? `${process.env.NEXT_PUBLIC_BASE_PATH}/favicon.ico`
          : '/favicon.ico',
        sizes: 'any',
      },
      {
        url: process.env.NEXT_PUBLIC_BASE_PATH
          ? `${process.env.NEXT_PUBLIC_BASE_PATH}/icon.svg`
          : '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: process.env.NEXT_PUBLIC_BASE_PATH
      ? `${process.env.NEXT_PUBLIC_BASE_PATH}/apple-touch-icon.png`
      : '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ageless-literature.com',
    siteName: 'Ageless Literature',
    title: 'Ageless Literature - Rare Book Marketplace',
    description: 'Discover and purchase rare books from trusted vendors worldwide',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Ageless Literature',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ageless Literature - Rare Book Marketplace',
    description: 'Discover and purchase rare books from trusted vendors worldwide',
    images: ['/og-image.jpg'],
    creator: '@AgelessLit',
  },
  verification: {
    google: 'google-site-verification-code',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  // Use NEXT_PUBLIC_BASE_PATH env var to match next.config.js basePath setting
  // If not set, defaults to empty string (no base path)
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  return (
    <html lang={locale} className={`${montserrat.variable} ${montserrat.className}`}>
      <head>
        {/* Google Tag Manager */}
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TDZ2DTDX');`}
        </Script>

        {/* Critical inline CSS to prevent render-blocking */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @font-face {
            font-family: 'Lora';
            src: url('${basePath}/fonts/Lora-Regular.woff2') format('woff2'),
                 url('${basePath}/fonts/Lora-Regular.woff') format('woff'),
                 url('${basePath}/fonts/Lora-Regular.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
          :root {
            --foreground-rgb: 0, 4, 30;
            --background-start-rgb: 255, 255, 255;
            --primary: #000000;
            --secondary: #d4af37;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html { overflow-x: hidden; }
          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background: rgb(var(--background-start-rgb));
            color: rgb(var(--foreground-rgb));
            font-family: var(--font-montserrat), system-ui, -apple-system, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            overflow-x: hidden;
            width: 100%;
          }
          .flex-grow { flex-grow: 1; }
          header { position: fixed; top: 0; left: 0; right: 0; z-index: 40; }
          .hidden { display: none; }
          /* Hide header and footer for admin pages */
          body:has(main[data-admin="true"]) header,
          body:has(main[data-admin="true"]) footer {
            display: none !important;
          }
          /* Responsive breakpoints for Tailwind classes used before CSS loads */
          @media (min-width: 640px) { .sm\\:block { display: block; } .sm\\:hidden { display: none; } }
          @media (min-width: 768px) { .md\\:block { display: block; } .md\\:hidden { display: none; } }
          @media (min-width: 1024px) { .lg\\:block { display: block; } .lg\\:hidden { display: none; } }
        `,
          }}
        />

        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://www.agelessliterature.com" />

        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="https://www.agelessliterature.com" />

        {/* Theme Color */}
        <meta name="theme-color" content="#1a2332" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* FontAwesome Kit - Loads all icons via class names */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://kit.fontawesome.com/02ac40efc4.js" crossOrigin="anonymous"></script>
      </head>
      <body className={`min-h-screen flex flex-col bg-gray-50 ${montserrat.className}`}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-TDZ2DTDX"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          ></iframe>
        </noscript>

        <FontAwesomeConfig />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <ConditionalLayout>{children}</ConditionalLayout>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
