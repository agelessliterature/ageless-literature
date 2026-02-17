import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function PATCH(request: NextRequest) {
  try {
    // Verify NextAuth session
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { defaultLanguage, language } = body;
    const newLanguage = language || defaultLanguage;

    if (!newLanguage) {
      return NextResponse.json(
        { success: false, message: 'Language is required' },
        { status: 400 },
      );
    }

    // Validate language code
    const validLanguages = ['en', 'es', 'fr', 'de'];
    if (!validLanguages.includes(newLanguage)) {
      return NextResponse.json(
        { success: false, message: 'Invalid language code' },
        { status: 400 },
      );
    }

    // Call backend API to persist language preference
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const backendResponse = await fetch(`${apiUrl}/api/users/${token.id}/language`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.accessToken}`,
      },
      body: JSON.stringify({ defaultLanguage: newLanguage }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          message: errorData.message || 'Failed to update language on backend',
        },
        { status: backendResponse.status },
      );
    }

    // Successfully updated on backend
    await backendResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Language preference updated',
      data: {
        id: token.id,
        defaultLanguage: newLanguage,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
