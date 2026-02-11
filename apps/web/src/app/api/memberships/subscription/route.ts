/**
 * User Subscription API Route
 * Proxies requests to backend API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(
  /\/api\/?$/,
  '',
);

export async function GET(_request: NextRequest) {
  try {
    // Get the session to extract the JWT token
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${API_URL}/api/memberships/subscription`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch subscription' },
      { status: 500 },
    );
  }
}
