import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import createIntlMiddleware from 'next-intl/middleware';

// Create i18n middleware
const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'fr', 'es', 'de'],
  defaultLocale: 'en',
  localePrefix: 'never',
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if accessing admin routes
  if (pathname.startsWith('/admin')) {
    // Allow access to login page without authentication
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }

    // Get authentication token
    const token = await getToken({
      req: request as any,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // No token - redirect to login
    if (!token) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user has admin role
    const role = token.role as string;
    if (role !== 'admin') {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // For non-admin routes, apply i18n middleware
  return intlMiddleware(request as any);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/admin/:path*'],
};
