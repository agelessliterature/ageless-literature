/**
 * Check NextAuth Configuration
 * Verifies that NextAuth is properly configured
 */

(async () => {
  try {
    console.log('Checking NextAuth Configuration...\n');

    // Check if NextAuth server is responding
    console.log('1. Testing NextAuth health...');
    const healthResponse = await fetch('http://localhost:3000/api/auth/providers', {
      method: 'GET',
    });

    const providers = await healthResponse.json();
    console.log('   Available providers:', Object.keys(providers).join(', '));

    if (providers.Credentials) {
      console.log('   ✓ Credentials provider is configured');
    } else {
      console.log('   ✗ Credentials provider NOT found');
    }

    // Check CSRF token endpoint
    console.log('\n2. Getting CSRF token...');
    const csrfResponse = await fetch('http://localhost:3000/api/auth/csrf', {
      method: 'GET',
    });

    const csrf = await csrfResponse.json();
    console.log('   CSRF token received:', !!csrf.csrfToken);

    if (csrf.csrfToken) {
      console.log('   ✓ CSRF token available:', csrf.csrfToken.substring(0, 20) + '...');
    } else {
      console.log('   ✗ No CSRF token returned');
      console.log('   Response:', csrf);
    }

    // Check environment
    console.log('\n3. NextAuth environment variables:');
    console.log('   NEXTAUTH_URL:', process.env.NEXTAUTH_URL ? '✓ Set' : '✗ Missing');
    console.log('   NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✓ Set' : '✗ Missing');

    console.log('\n4. Environment file check:');
    const fs = await import('fs');
    const envContent = fs.readFileSync('.env', 'utf-8');
    const hasNextAuthUrl = envContent.includes('NEXTAUTH_URL');
    const hasNextAuthSecret = envContent.includes('NEXTAUTH_SECRET');
    console.log('   .env has NEXTAUTH_URL:', hasNextAuthUrl ? '✓' : '✗');
    console.log('   .env has NEXTAUTH_SECRET:', hasNextAuthSecret ? '✓' : '✗');

  } catch (error) {
    console.error('Error:', error.message);
  }
})();
