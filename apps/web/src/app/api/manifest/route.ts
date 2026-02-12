import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  const basePath = process.env.NODE_ENV === 'production' ? '/v2' : '';
  const manifest = {
    name: 'Ageless Literature',
    short_name: 'Ageless Lit',
    description: 'Discover rare books and original artworks that transcend time',
    start_url: '/',
    display: 'standalone',
    background_color: '#1a1a1a',
    theme_color: '#d4af37',
    orientation: 'portrait-primary',
    icons: [
      {
        src: `${basePath}/icon-192x192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: `${basePath}/icon-512x512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: `${basePath}/icon.svg`,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
