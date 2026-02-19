/**
 * Admin API Route - Catch-all proxy
 * Proxies all admin requests to backend API
 */

import { NextRequest, NextResponse } from 'next/server';

const API_URL = (
  process.env.INTERNAL_API_URL ||
  process.env.API_URL ||
  'http://localhost:3001'
).replace(/\/api\/?$/, '');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'DELETE');
}

async function handleRequest(request: NextRequest, path: string[], method: string) {
  try {
    const { searchParams } = new URL(request.url);
    const pathString = path.join('/');
    const queryString = searchParams.toString();
    const url = `${API_URL}/api/admin/${pathString}${queryString ? `?${queryString}` : ''}`;

    // Get auth token from request headers
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

    // Prepare request options
    const options: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };

    // Add body for POST, PUT, PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const body = await request.text();
      if (body) {
        options.body = body;
      }
    }

    const response = await fetch(url, options);
    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process admin request',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
