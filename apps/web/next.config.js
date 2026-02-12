const withNextIntl = require('next-intl/plugin')('./i18n.ts');

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
  // Production uses /v2 since Apache reverse proxy routes /v2/* to this app
  basePath: process.env.NODE_ENV === 'production' ? '/v2' : '',

  // Asset prefix should match basePath
  assetPrefix: process.env.NODE_ENV === 'production' ? '/v2' : '',

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
  },

  // Reduce memory usage during build
  webpack: (config, { isServer }) => {
    // Reduce parallelism to save memory during Docker builds
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        // Disable minimize to save memory (still tree-shakes)
        minimize: false,
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
    API_URL: process.env.NEXT_PUBLIC_API_URL,
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
    return [
      {
        source: '/api/admin/:path*',
        destination: 'http://localhost:3001/api/admin/:path*',
      },
      {
        source: '/api/:path((?!auth).*)*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },

  // HTTPS redirect in production
  async redirects() {
    return [
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

module.exports = withNextIntl(nextConfig);
