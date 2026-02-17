/**
 * Membership Plans API Route
 * Proxies requests to backend API with caching optimizations
 */

import { NextRequest, NextResponse } from 'next/server';

// Server-side route: use runtime env vars (not NEXT_PUBLIC_ which gets inlined as empty)
const API_URL = (
  process.env.INTERNAL_API_URL ||
  process.env.API_URL ||
  'http://localhost:3001'
).replace(/\/api\/?$/, '');

export async function GET(_request: NextRequest) {
  try {
    // Add Next.js fetch caching with 5-minute revalidation for membership plans
    // Plans don't change frequently, so this is safe to cache
    const response = await fetch(`${API_URL}/api/memberships/plans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: {
        revalidate: 300, // Cache for 5 minutes (300 seconds)
        tags: ['membership-plans'], // Enable tag-based revalidation
      },
    });

    const data = await response.json();

    // Add cache headers for browser caching
    const headers = new Headers();
    headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return NextResponse.json(data, {
      status: response.status,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch membership plans' },
      { status: 500 },
    );
  }
}
