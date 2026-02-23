/**
 * Vendors API Route
 * Proxies requests to backend API
 */

import { NextRequest, NextResponse } from 'next/server';

const API_URL = (
  process.env.INTERNAL_API_URL ||
  process.env.API_URL ||
  'http://localhost:3001'
).replace(/\/api\/?$/, '');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const response = await fetch(`${API_URL}/api/vendors?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: {
        revalidate: 60, // Cache for 1 minute
      },
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('Vendors API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch vendors' },
      { status: 500 },
    );
  }
}
