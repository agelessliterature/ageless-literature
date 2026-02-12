/**
 * Comprehensive NextAuth Token Flow Test
 * This script enables debug logging in your browser dev tools
 */

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                  NEXTAUTH TOKEN FLOW DEBUGGING GUIDE                       ║
╚════════════════════════════════════════════════════════════════════════════╝

To debug the token flow in your admin dashboard:

1. OPEN BROWSER DEVELOPER TOOLS:
   - Right-click on the admin page → Inspect
   - Go to Console tab

2. TRIGGER LOGIN:
   - Log in to the admin dashboard with:
     Email: admin@agelessliterature.local
     Password: password

3. LOOK FOR THESE LOGS IN CONSOLE:
   - [NextAuth] Attempting login to: http://localhost:3001/api/auth/login
   - [NextAuth] Returning user object from authorize() 
   - [NextAuth JWT] User object received
   - [NextAuth JWT] Token object after initial sign-in
   - [NextAuth Session] Building session from token
   - [NextAuth Session] Final session object

4. KEY THINGS TO CHECK:
   ✓ Is "token" property present in the user object?
   ✓ Does JWT callback receive user.token?
   ✓ Is accessToken present in final session?

5. AFTER LOGGING IN:
   - Navigate to: http://localhost:3000/debug-session
   - Check if accessToken is present or MISSING

═════════════════════════════════════════════════════════════════════════════
`);

console.log('Waiting for frontend server to be running...');
console.log('Then check http://localhost:3000/debug-session after login');
