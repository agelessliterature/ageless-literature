/**
 * Admin Users API Route
 * Proxy for /api/admin/users
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
    const queryString = searchParams.toString();
    const url = `${API_URL}/api/admin/users${queryString ? `?${queryString}` : ''}`;
    // Forward auth headers
    const authHeader = request.headers.get('authorization');
    const cookie = request.headers.get('cookie');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    let data;
    const responseText = await response.text();

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Failed to parse backend response as JSON');
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch users from proxy',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
