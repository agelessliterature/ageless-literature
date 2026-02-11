/**
 * Membership Plans API Route
 * Proxies requests to backend API
 */

import { NextRequest, NextResponse } from 'next/server';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(
  /\/api\/?$/,
  '',
);

export async function GET(_request: NextRequest) {
  try {
    const response = await fetch(`${API_URL}/api/memberships/plans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch membership plans' },
      { status: 500 },
    );
  }
}
