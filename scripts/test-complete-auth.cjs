#!/usr/bin/env node

/**
 * Complete Auth Flow Test
 * This script verifies the entire authentication pipeline
 */

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    COMPLETE AUTH FLOW TEST                                 ║
║                                                                             ║
║  This test verifies that you can log in and create admin users             ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

const runTests = async () => {
  const results = {
    apiLogin: false,
    sessionAccess: false,
    sessionToken: false,
  };

  // Test 1: API Login
  console.log('\n📝 Test 1: API Login Endpoint');
  console.log('   Testing: POST http://localhost:3001/api/auth/login\n');

  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@agelessliterature.local',
        password: 'password',
      }),
    });

    const data = await response.json();

    if (data.success && data.data?.token) {
      results.apiLogin = true;
      console.log('   ✅ API returns valid token');
      console.log('      Token:', data.data.token.substring(0, 30) + '...\n');
    } else {
      console.log('   ❌ API did not return token');
      console.log('      Response:', JSON.stringify(data, null, 2) + '\n');
    }
  } catch (error) {
    console.log('   ❌ API is not responding');
    console.log('      Error:', error.message);
    console.log('      Make sure API server is running: cd apps/api && npm run dev\n');
  }

  // Wait for user to log in
  console.log('⏳ Test 2: NextAuth Session (requires manual login)');
  console.log('   Steps:');
  console.log('   1. Open http://localhost:3000/admin in your browser');
  console.log('   2. Log in with:');
  console.log('      Email: admin@agelessliterature.local');
  console.log('      Password: password');
  console.log('   3. After login, this test will check your session\n');

  console.log('   Waiting 5 seconds, then checking session...');
  await sleep(5000);

  try {
    const response = await fetch('http://localhost:3000/api/auth/session');
    const session = await response.json();

    if (session.user) {
      results.sessionAccess = true;
      console.log('   ✅ NextAuth session is active');
      console.log('      User:', session.user.email, `(${session.user.role})\n`);

      if (session.accessToken) {
        results.sessionToken = true;
        console.log('   ✅ accessToken is present in session');
        console.log('      Token:', session.accessToken.substring(0, 30) + '...\n');
      } else {
        console.log('   ❌ accessToken is MISSING from session');
        console.log('      This is the problem! The token is not being passed through.\n');
      }
    } else {
      console.log('   ❌ Not logged in yet (session.user empty)\n');
    }
  } catch (error) {
    console.log('   ❌ Could not check session');
    console.log('      Error:', error.message + '\n');
  }

  // Summary
  console.log('════════════════════════════════════════════════════════════════════════════\n');
  console.log('TEST SUMMARY:\n');

  console.log(`  API Login Endpoint:          ${results.apiLogin ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  NextAuth Session Active:     ${results.sessionAccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  accessToken in Session:      ${results.sessionToken ? '✅ PASS' : '❌ FAIL'}\n`);

  if (results.apiLogin && results.sessionToken) {
    console.log('🎉 ALL TESTS PASSED! You should now be able to create users in admin.\n');
  } else if (results.apiLogin && !results.sessionToken) {
    console.log('⚠️  API is working but token is not in session.');
    console.log('    This might be because:');
    console.log('    1. You haven\'t logged in yet (try again after login)');
    console.log('    2. The NextAuth server needs to be restarted');
    console.log('    3. There\'s a session/JWT configuration issue\n');
    console.log('    Try restarting the web server:');
    console.log('    $ cd apps/web && npm run dev\n');
  } else {
    console.log('❌ Tests failed. Check the errors above.\n');
  }
};

runTests();
