# NextAuth Token Debug Guide

## The Issue

Admin dashboard shows: "Authentication token not available. Please log in again."

This means `session.accessToken` is undefined when the admin tries to create a user.

## How the Token Should Flow

```
1. Frontend → Login Form
   ↓
2. NextAuth CredentialsProvider.authorize()
   → Calls: POST http://localhost:3001/api/auth/login
   → Returns: { id, email, name, role, token, defaultLanguage }
   ↓
3. NextAuth JWT Callback
   → Takes user.token and stores as token.accessToken
   ↓
4. NextAuth Session Callback
   → Copies token.accessToken to session.accessToken
   ↓
5. Frontend getSession()
   → Returns session with accessToken
   ↓
6. Admin API Call
   → Sends: Authorization: Bearer {accessToken}
   → Success! Creates user
```

## Step-by-Step Debugging

### Step 1: Verify API Login Works

```bash
node scripts/test-api-login.cjs
```

✓ Should see: "✓ LOGIN SUCCESSFUL" with a token

### Step 2: Enable Detailed Logging

The code now has detailed logging at each step. To see it:

1. Open Browser Developer Tools (F12)
2. Go to Console tab
3. Filter for: `[NextAuth]`

The logs will show:

- `[NextAuth] Attempting login to:` - Starting login
- `[NextAuth JWT] Initial sign-in user object:` - User from authorize()
- `[NextAuth JWT] ✓ accessToken stored in token object` - Token in JWT
- `[NextAuth Session] ✓ accessToken successfully copied to session` - Token in session
- `[NextAuth Session] Final session object:` - What admin gets

### Step 3: Check Session Data

After logging in:

1. Navigate to: http://localhost:3000/debug-session
2. Check if `accessToken` is present or "MISSING"

If MISSING here, the token is being lost somewhere in callbacks.

### Step 4: Understand the Problem

If you see these errors in console, here's what they mean:

#### Error: `[NextAuth JWT] ✗ CRITICAL: user.token is missing!`

- Problem: CredentialsProvider.authorize() is not returning the token
- Solution: Check that the API login endpoint is returning `data.data.token`
- Fix: Run `node scripts/test-api-login.cjs` to verify

#### Error: `[NextAuth Session] ✗ CRITICAL ERROR: accessToken not in token!`

- Problem: JWT callback didn't set token.accessToken
- Solution: Check JWT callback logs for errors
- Fix: Likely the authorize() didn't return token (see above)

#### No `accessToken` at http://localhost:3000/debug-session

- Problem: Session callback didn't copy token to session
- Solution: Check if `token.accessToken` exists in "Token from JWT" log
- Fix: If token.accessToken exists but not in session, it's a NextAuth version issue

### Step 5: Test Admin User Creation

1. Log in with: admin@agelessliterature.local / password
2. Navigate to: /admin/users/new
3. Try creating a test user

Should work if all above steps passed.

## Common Issues & Fixes

### Issue: "Authentication token not available"

**Cause**: User.token not returned from API
**Fix**:

- Verify API returns full response: `node scripts/test-api-login.cjs`
- Check API server is running on port 3001
- Check environment: `process.env.INTERNAL_API_URL` or fallback to `http://localhost:3001`

### Issue: API returns token but session has no accessToken

**Cause**: Callback not storing token properly
**Fix**:

- Check console logs in NextAuth [JWT] callback
- Verify authorize() returns object with all properties
- Restart nextjs dev server: `npm run dev`

### Issue: Only some properties in session

**Cause**: Session callback not copying all properties
**Fix**:

- Check "Final session object" log
- Verify token object has all properties before session callback
- Make sure token is being JWT signed with all properties

## Files Modified

- `/apps/web/src/lib/auth.ts` - Added detailed logging
- `/apps/web/src/app/admin/users/new/page.tsx` - Added token validation
- `/apps/web/src/app/debug-session/page.tsx` - Debug session viewer
- `/apps/web/src/types/next-auth.d.ts` - Type definitions (no changes needed)

## Next Steps

1. **Ensure API is running**

   ```bash
   cd apps/api && npm run dev
   ```

2. **Start NextAuth debug**

   ```bash
   cd apps/web && npm run dev
   ```

3. **Test login and check console logs**
   - Open DevTools (F12)
   - Filter console for `[NextAuth]`
   - Log in
   - Watch the logs flow through the callbacks

4. **Check session state**
   - After login, go to: http://localhost:3000/debug-session
   - Confirm `accessToken` is present

5. **Report what you see**
   - Share the console output
   - Share what's shown on /debug-session
   - Specify which logs are missing

---

Good luck debugging! The detailed logs should help pinpoint exactly where the token is being lost.
