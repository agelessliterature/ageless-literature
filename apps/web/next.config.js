const withNextIntl = require('next-intl/plugin')('./i18n.ts');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Disable ESLint and TypeScript checks during build (run separately in CI)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Base path for deployment
  // Controlled by env var: set NEXT_PUBLIC_BASE_PATH=/v2 for legacy servers, leave empty for new servers
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',

  // Asset prefix should match basePath
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',

  // SWC compiler options for modern JavaScript (swcMinify is default in Next.js 16)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Note: FontAwesome icons are loaded via Kit script tag, not npm packages
  // No modularizeImports needed for FontAwesome

  experimental: {
    // Disable package import optimization to save memory during build
    optimizePackageImports: [],
    // Disable optimizeCss during build to reduce memory usage
    optimizeCss: false,
    // Disable dev overlay in production
    disableOptimizedLoading: false,
    // Enable webpack memory optimizations (reduces peak memory at slight speed cost)
    webpackMemoryOptimizations: true,
    // Run webpack in a separate worker to isolate memory usage
    // (must be explicitly enabled when custom webpack config is present)
    webpackBuildWorker: true,
  },

  // Reduce memory usage during build
  webpack: (config, { isServer, dev }) => {
    // Reduce parallelism to save memory during Docker builds
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
          },
        },
      };
    }

    // Reduce memory usage
    config.performance = {
      ...config.performance,
      maxAssetSize: 10000000,
      maxEntrypointSize: 10000000,
    };

    // Disable source maps in production builds to save memory
    if (!isServer) {
      config.devtool = false;
    }

    return config;
  },

  // Reduce memory usage during build
  output: 'standalone', // Required for production deployment

  // Target modern browsers to reduce transpilation
  transpilePackages: [],

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'www.agelessliterature.com',
      },
      {
        protocol: 'https',
        hostname: 'agelessliterature.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year for static images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  env: {
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || 'dvohtcqvi',
  },
  poweredByHeader: false,
  compress: true,

  // Performance optimizations
  productionBrowserSourceMaps: false,

  // Security and performance headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/:path((?!_next|api|static).*)*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/css/:path*.css',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Content-Type',
            value: 'text/css; charset=utf-8',
          },
        ],
      },
    ];
  },

  // API rewrites to backend
  async rewrites() {
    // Strip trailing /api from env var if present (to match api.ts behavior)
    let apiDest = process.env.API_URL || process.env.INTERNAL_API_URL || 'http://localhost:3001';
    apiDest = apiDest.replace(/\/api\/?$/, '');

    return [
      {
        source: '/api/admin/:path*',
        destination: `${apiDest}/api/admin/:path*`,
      },
      {
        source: '/api/:path((?!auth).*)*',
        destination: `${apiDest}/api/:path*`,
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      // Redirect /books to /shop
      {
        source: '/books',
        destination: '/shop',
        permanent: true,
      },
      {
        source: '/books/:path*',
        destination: '/shop/:path*',
        permanent: true,
      },
      // Redirect /register to /auth/register
      {
        source: '/register',
        destination: '/auth/register',
        permanent: true,
      },
      // HTTPS redirect in production
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        destination: 'https://:host/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = withBundleAnalyzer(withNextIntl(nextConfig));
