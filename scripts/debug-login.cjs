/**
 * Debug Login Script
 * Tests if the admin account can be authenticated
 * Usage: node scripts/debug-login.cjs
 */

(async () => {
  try {
    const { default: db } = await import('../apps/api/src/models/index.js');
    
    const adminEmail = 'admin@agelessliterature.local';
    const adminPassword = 'password';
    
    const { User } = db;
    
    // Fetch the admin user
    console.log('Fetching admin user...');
    const user = await User.findByEmail(adminEmail);
    
    if (!user) {
      console.error('✗ User not found!');
      process.exit(1);
    }
    
    console.log('✓ User found:', {
      id: user.id,
      email: user.email,
      role: user.role
    });
    
    // Check password hash
    console.log('Checking password hash...');
    console.log('  passwordHash exists:', !!user.passwordHash);
    console.log('  passwordHash preview:', user.passwordHash ? user.passwordHash.substring(0, 20) + '...' : 'null');
    
    // Try comparing password
    console.log('Comparing password...');
    const isMatch = await user.comparePassword(adminPassword);
    
    if (isMatch) {
      console.log('✓ Password matches!');
    } else {
      console.log('✗ Password does NOT match!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
