/**
 * User Subscription API Route
 * Proxies requests to backend API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Server-side route: use runtime env vars (not NEXT_PUBLIC_ which gets inlined as empty)
const API_URL = (
  process.env.INTERNAL_API_URL ||
  process.env.API_URL ||
  'http://localhost:3001'
).replace(/\/api\/?$/, '');

export async function GET(_request: NextRequest) {
  try {
    // Get the session to extract the JWT token
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // User-specific data - use shorter cache with user-based tag
    // This allows per-user cache invalidation if needed
    const response = await fetch(`${API_URL}/api/memberships/subscription`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      next: {
        revalidate: 60, // Cache for 1 minute for user-specific data
        tags: [`user-subscription-${session.user?.id || session.user?.email}`], // User-specific cache tag
      },
    });

    const data = await response.json();

    // Add conservative cache headers for user-specific data
    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');

    return NextResponse.json(data, {
      status: response.status,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch subscription' },
      { status: 500 },
    );
  }
}
