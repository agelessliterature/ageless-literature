'use server';

/**
 * Server actions for user-related operations
 * Uses fetch to call the API
 */

export async function updateUserLanguage(userId: string, language: string) {
  try {
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');
    const response = await fetch(`${baseUrl}/api/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ defaultLanguage: language }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update user language: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
