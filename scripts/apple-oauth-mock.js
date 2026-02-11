/**
 * Local Apple Sign In Mock Server for Development
 * Emulates Apple OAuth flow without real Apple credentials
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.APPLE_MOCK_PORT || 3002;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store mock sessions
const sessions = new Map();

// Mock Apple authorization endpoint
app.get('/auth/authorize', (req, res) => {
  const {
    client_id,
    redirect_uri,
    state,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    response_type,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    scope,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    response_mode,
  } = req.query;

  console.log('APPLE: Mock Apple Authorization Request:');
  console.log('  Client ID:', client_id);
  console.log('  Redirect URI:', redirect_uri);
  console.log('  State:', state);

  // Generate mock authorization code
  const code = crypto.randomBytes(32).toString('hex');
  const sessionId = crypto.randomBytes(16).toString('hex');

  // Store session data
  sessions.set(code, {
    sessionId,
    client_id,
    redirect_uri,
    created: Date.now(),
  });

  // Simple HTML form for mock Apple login
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mock Apple Sign In</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: #f5f5f7;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          max-width: 400px;
          width: 100%;
        }
        h1 {
          font-size: 28px;
          font-weight: 600;
          margin: 0 0 20px 0;
          color: #1d1d1f;
        }
        .logo {
          font-size: 48px;
          text-align: center;
          margin-bottom: 20px;
        }
        p {
          color: #86868b;
          margin: 0 0 30px 0;
          line-height: 1.5;
        }
        input {
          width: 100%;
          padding: 12px;
          border: 1px solid #d2d2d7;
          border-radius: 8px;
          font-size: 16px;
          margin-bottom: 12px;
          box-sizing: border-box;
        }
        button {
          width: 100%;
          padding: 12px;
          background: #0071e3;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        button:hover {
          background: #0077ed;
        }
        .info {
          margin-top: 20px;
          padding: 12px;
          background: #f5f5f7;
          border-radius: 8px;
          font-size: 12px;
          color: #86868b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">Apple</div>
        <h1>Mock Apple Sign In</h1>
        <p><strong>Development Mode</strong><br>Enter any test credentials to simulate Apple OAuth</p>
        <form action="/auth/authorize/continue" method="POST">
          <input type="hidden" name="code" value="${code}">
          <input type="hidden" name="state" value="${state}">
          <input type="hidden" name="redirect_uri" value="${redirect_uri}">
          <input type="email" name="email" placeholder="Email (test@example.com)" value="test@agelesslit.com" required>
          <input type="text" name="firstName" placeholder="First Name" value="Test">
          <input type="text" name="lastName" placeholder="Last Name" value="User">
          <button type="submit">Continue with Mock Apple ID</button>
        </form>
        <div class="info">
          INFO: This is a local mock server for development. Real Apple Sign In will be used in production.
        </div>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

// Handle mock authorization submission
app.post('/auth/authorize/continue', (req, res) => {
  const { code, state, redirect_uri, email, firstName, lastName } = req.body;

  console.log('SUCCESS: Mock Apple Authorization Granted:');
  console.log('  Email:', email);
  console.log('  Name:', firstName, lastName);

  // Store user info with the code
  if (sessions.has(code)) {
    sessions.get(code).user = { email, firstName, lastName };
  }

  // Redirect back to NextAuth with authorization code
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', code);
  redirectUrl.searchParams.set('state', state);

  res.redirect(redirectUrl.toString());
});

// Mock token endpoint
app.post('/auth/token', (req, res) => {
  const {
    code,
    client_id,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    client_secret,
    grant_type,
  } = req.body;

  console.log('🔑 Mock Token Exchange Request:');
  console.log('  Code:', code);
  console.log('  Grant Type:', grant_type);

  const session = sessions.get(code);
  if (!session) {
    return res.status(400).json({ error: 'invalid_grant' });
  }

  const user = session.user || {
    email: 'test@agelesslit.com',
    firstName: 'Test',
    lastName: 'User',
  };

  // Generate mock tokens
  const access_token = crypto.randomBytes(32).toString('hex');
  const id_token = generateMockIdToken(user, client_id);
  const refresh_token = crypto.randomBytes(32).toString('hex');

  console.log('SUCCESS: Mock Tokens Generated');

  // Clean up used code
  sessions.delete(code);

  res.json({
    access_token,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token,
    id_token,
  });
});

// Generate mock Apple ID token (JWT)
function generateMockIdToken(user, clientId) {
  const header = Buffer.from(
    JSON.stringify({
      alg: 'RS256',
      kid: 'MOCK_KEY_ID',
    }),
  ).toString('base64url');

  const payload = Buffer.from(
    JSON.stringify({
      iss: 'http://localhost:' + PORT,
      aud: clientId,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      sub: crypto.randomBytes(16).toString('hex'),
      email: user.email,
      email_verified: true,
      is_private_email: false,
      auth_time: Math.floor(Date.now() / 1000),
    }),
  ).toString('base64url');

  // Mock signature (not cryptographically valid, but works for local testing)
  const signature = crypto.randomBytes(32).toString('base64url');

  return `${header}.${payload}.${signature}`;
}

// JWKS endpoint (for token verification)
app.get('/auth/keys', (req, res) => {
  res.json({
    keys: [
      {
        kty: 'RSA',
        kid: 'MOCK_KEY_ID',
        use: 'sig',
        alg: 'RS256',
        n: 'mock_public_key',
        e: 'AQAB',
      },
    ],
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Mock Apple OAuth Server',
    port: PORT,
    sessions: sessions.size,
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\nMock Apple OAuth Server Started');
  console.log('═══════════════════════════════════════');
  console.log(`  Authorization: http://localhost:${PORT}/auth/authorize`);
  console.log(`  Token:         http://localhost:${PORT}/auth/token`);
  console.log(`  JWKS:          http://localhost:${PORT}/auth/keys`);
  console.log(`  Health:        http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════');
  console.log('SUCCESS: Ready for development Sign in with Apple\n');
});
