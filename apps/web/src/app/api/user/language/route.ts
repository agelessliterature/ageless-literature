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

    // For now, return success without actually updating backend
    // This simulates the update until backend API is fully implemented

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
