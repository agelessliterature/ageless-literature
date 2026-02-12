/**
 * Test NextAuth Flow Directly
 * This uses fetch to simulate what the next-auth client does
 */

const testLogin = async () => {
  try {
    console.log('Testing NextAuth login flow...\n');

    // Step 1: Call the NextAuth signin endpoint
    console.log('Step 1: Posting to NextAuth signin endpoint...');
    const response = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'admin@agelessliterature.local',
        password: 'password',
        csrfToken: 'test', // This might need to come from the session
      }).toString(),
      redirect: 'manual',
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', {
      'content-type': response.headers.get('content-type'),
      'set-cookie': response.headers.get('set-cookie'),
    });

    const text = await response.text();
    console.log('Response text:', text.substring(0, 500));

    if (response.status === 302) {
      console.log('\n✓ Got redirect (302) - likely successful login');
      console.log('Redirect location:', response.headers.get('location'));
    }

    // Step 2: Try to get the session
    console.log('\nStep 2: Getting session...');
    const sessionResponse = await fetch('http://localhost:3000/api/auth/session', {
      method: 'GET',
      credentials: 'include', // Important: include cookies
    });

    const session = await sessionResponse.json();
    console.log('Session response:', JSON.stringify(session, null, 2));

    if (session.user) {
      console.log('\n✓ Session has user:', session.user.email);
      if (session.accessToken) {
        console.log('✓ accessToken present:', session.accessToken.substring(0, 20) + '...');
      } else {
        console.log('✗ accessToken MISSING from session');
      }
    } else {
      console.log('\n✗ Session has no user');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testLogin();
