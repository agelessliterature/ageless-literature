/**
 * Test Login Endpoint
 * Tests the /api/auth/login endpoint
 */

(async () => {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@agelessliterature.local',
        password: 'password'
      })
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log('Response is not JSON');
      console.log('Status:', response.status);
      console.log('Raw response:', text.substring(0, 200));
      process.exit(1);
    }
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✓ Login successful!');
      console.log('  Token:', data.data.token.substring(0, 20) + '...');
      console.log('  User:', data.data.user.email);
    } else {
      console.log('\n✗ Login failed');
    }
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error('  The API server might not be running on http://localhost:3000');
  }
})();
