/**
 * Enhanced Password Validation Utility
 * Implements modern password security standards for backend validation
 */

/**
 * Common weak passwords list (top 100 most common passwords)
 */
const COMMON_PASSWORDS = [
  'password',
  '123456',
  '123456789',
  'welcome',
  'admin',
  'password123',
  'letmein',
  'monkey',
  '1234567890',
  'qwerty',
  'abc123',
  '111111',
  'dragon',
  'master',
  '666666',
  'login',
  'admin123',
  'sunshine',
  'princess',
  'azerty',
  '654321',
  'superman',
  '123123',
  'solo',
  'qwertyuiop',
  'freedom',
  'whatever',
  'iloveyou',
  'trustno1',
  'batman',
  'zaq1zaq1',
  'password1',
  'Football',
  'password!',
  'welcome123',
  'hello123',
  'charlie',
  'aa123456',
  'donald',
  'password12',
  'passw0rd',
  '123qwe',
  'q1w2e3r4',
  'admin1234',
  'root123',
  'user123',
  'test123',
  'guest123',
  'demo123',
  'temp123',
  'public123',
  'secret123',
];

/**
 * Calculate password entropy (bits of randomness)
 */
function calculateEntropy(password) {
  let charsetSize = 0;

  // Count different character types
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32; // Common special chars

  // Calculate entropy in bits
  return password.length * Math.log2(charsetSize);
}

/**
 * Check for password patterns and repeated elements
 */
function hasPatterns(password) {
  // Check for repeated sequences (e.g., "aaa", "111")
  if (/(.)\1{2,}/.test(password)) return true;

  // Check for sequential patterns (e.g., "123", "abc")
  for (let i = 0; i < password.length - 2; i++) {
    const char1 = password.charCodeAt(i);
    const char2 = password.charCodeAt(i + 1);
    const char3 = password.charCodeAt(i + 2);

    if (char2 === char1 + 1 && char3 === char2 + 1) return true;
    if (char2 === char1 - 1 && char3 === char2 - 1) return true;
  }

  return false;
}

/**
 * Comprehensive password validation for modern security standards
 * @param {string} password - The password to validate
 * @returns {Object} - Validation result with isValid boolean and errors array
 */
export function validatePasswordComplexity(password) {
  const errors = [];

  if (!password) {
    return { isValid: false, errors: ['Password is required'] };
  }

  // Length requirements
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long for security');
  }

  if (password.length > 128) {
    errors.push('Password must be no more than 128 characters long');
  }

  // Character class requirements
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  // Pattern checks
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password cannot contain more than 2 consecutive identical characters');
  }

  // Common password check (case insensitive)
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger password');
  }

  // Unique character requirement
  const uniqueChars = new Set(password.toLowerCase()).size;
  if (uniqueChars < 8) {
    errors.push('Password must contain at least 8 different characters for security');
  }

  // Keyboard pattern check
  const patterns = ['qwerty', 'asdf', '1234', 'abcd', 'password', 'login', 'admin'];
  if (patterns.some((pattern) => password.toLowerCase().includes(pattern))) {
    errors.push('Password cannot contain common keyboard patterns or dictionary words');
  }

  // Entropy check
  const entropy = calculateEntropy(password);
  if (entropy < 40) {
    errors.push('Password complexity is too low. Use a more diverse mix of characters');
  }

  // Pattern analysis
  if (hasPatterns(password)) {
    errors.push(
      'Password contains predictable patterns. Avoid sequential or repetitive characters',
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    entropy: Math.round(entropy),
    score: calculatePasswordScore(password),
  };
}

/**
 * Calculate password strength score (0-10)
 */
function calculatePasswordScore(password) {
  let score = 0;

  if (!password) return 0;

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character type scoring
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // Complexity scoring
  const uniqueChars = new Set(password.toLowerCase()).size;
  if (uniqueChars >= 8) score += 1;
  if (!hasPatterns(password)) score += 1;
  if (!COMMON_PASSWORDS.includes(password.toLowerCase())) score += 1;

  return Math.min(score, 10);
}

/**
 * Express validator middleware for password complexity
 */
export function passwordComplexityValidator() {
  return (value) => {
    const validation = validatePasswordComplexity(value);
    if (!validation.isValid) {
      throw new Error(validation.errors[0]); // Return first error for express-validator
    }
    return true;
  };
}

/**
 * Check if password meets minimum security requirements for login
 * (More lenient for existing accounts)
 */
export function validatePasswordForLogin(password) {
  if (!password) {
    return { isValid: false, errors: ['Password is required'] };
  }

  if (password.length > 128) {
    return { isValid: false, errors: ['Password is too long'] };
  }

  return { isValid: true, errors: [] };
}
