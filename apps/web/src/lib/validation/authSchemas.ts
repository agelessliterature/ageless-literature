import { z } from 'zod';

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
];

/**
 * Enhanced password validation for modern security standards
 */
const createPasswordSchema = () => {
  return z
    .string()
    .min(1, 'Password is required')
    .min(12, 'Password must be at least 12 characters for security')
    .max(128, 'Password is too long (max 128 characters)')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character (!@#$%^&*)')
    .regex(
      /^(?!.*(.)\1{2,})/,
      'Password cannot contain more than 2 consecutive identical characters',
    )
    .refine((password) => {
      // Check against common passwords (case insensitive)
      return !COMMON_PASSWORDS.includes(password.toLowerCase());
    }, 'This password is too common. Please choose a stronger password.')
    .refine((password) => {
      // Check password entropy - ensure it's not just repeated patterns
      const uniqueChars = new Set(password.toLowerCase()).size;
      return uniqueChars >= 8; // At least 8 unique characters
    }, 'Password must contain at least 8 different characters for security.')
    .refine((password) => {
      // Ensure no common keyboard patterns
      const patterns = ['qwerty', 'asdf', '1234', 'abcd', 'password'];
      return !patterns.some((pattern) => password.toLowerCase().includes(pattern));
    }, 'Password cannot contain common keyboard patterns or dictionary words.');
};

/**
 * Password change validation schema
 */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: createPasswordSchema(),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

/**
 * Login form validation schema (more lenient for existing accounts)
 */
export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required').max(128, 'Password is too long'),
});

/**
 * Registration form validation schema
 */
export const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name is too long')
      .trim()
      .regex(
        /^[a-zA-Z\s'-]+$/,
        'First name can only contain letters, spaces, hyphens, and apostrophes',
      ),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(50, 'Last name is too long')
      .trim()
      .regex(
        /^[a-zA-Z\s'-]+$/,
        'Last name can only contain letters, spaces, hyphens, and apostrophes',
      ),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
    phoneNumber: z
      .string()
      .optional()
      .refine((val) => !val || /^[\d\s\-+()]+$/.test(val), 'Invalid phone number format'),
    password: createPasswordSchema(),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Calculate password entropy (bits of randomness)
 */
function calculateEntropy(password: string): number {
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
function hasPatterns(password: string): boolean {
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
 * Advanced password strength indicator with modern security analysis
 */
export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  entropy: number;
  requirements: {
    length: boolean;
    lowercase: boolean;
    uppercase: boolean;
    numbers: boolean;
    special: boolean;
    noCommon: boolean;
    noPatterns: boolean;
    uniqueChars: boolean;
  };
  feedback: string[];
} {
  const feedback: string[] = [];

  if (!password) {
    return {
      score: 0,
      label: 'No Password',
      color: 'gray',
      entropy: 0,
      requirements: {
        length: false,
        lowercase: false,
        uppercase: false,
        numbers: false,
        special: false,
        noCommon: false,
        noPatterns: false,
        uniqueChars: false,
      },
      feedback: ['Enter a password to see strength analysis'],
    };
  }

  const entropy = calculateEntropy(password);
  const uniqueChars = new Set(password.toLowerCase()).size;

  // Check requirements
  const requirements = {
    length: password.length >= 12,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
    noCommon: !COMMON_PASSWORDS.includes(password.toLowerCase()),
    noPatterns: !hasPatterns(password),
    uniqueChars: uniqueChars >= 8,
  };

  // Calculate base score from requirements
  let score = Object.values(requirements).filter(Boolean).length;

  // Bonus points for higher entropy
  if (entropy >= 60) score += 2;
  else if (entropy >= 40) score += 1;

  // Penalty for short passwords
  if (password.length < 8) score = Math.max(0, score - 2);

  // Generate feedback
  if (!requirements.length) feedback.push('Use at least 12 characters');
  if (!requirements.lowercase) feedback.push('Add lowercase letters');
  if (!requirements.uppercase) feedback.push('Add uppercase letters');
  if (!requirements.numbers) feedback.push('Add numbers');
  if (!requirements.special) feedback.push('Add special characters (!@#$%^&*)');
  if (!requirements.noCommon) feedback.push('Avoid common passwords');
  if (!requirements.noPatterns) feedback.push('Avoid repetitive or sequential patterns');
  if (!requirements.uniqueChars) feedback.push('Use more diverse characters');

  // Determine strength level
  let label: string, color: string;

  if (score <= 3) {
    label = 'Very Weak';
    color = 'red';
  } else if (score <= 5) {
    label = 'Weak';
    color = 'orange';
  } else if (score <= 7) {
    label = 'Fair';
    color = 'yellow';
  } else if (score <= 9) {
    label = 'Good';
    color = 'blue';
  } else {
    label = 'Excellent';
    color = 'green';
    if (feedback.length === 0) {
      feedback.push('Password meets all security requirements');
    }
  }

  return { score, label, color, entropy, requirements, feedback };
}

/**
 * Validate password complexity for account creation/changes
 */
export function validatePasswordComplexity(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password) {
    return { isValid: false, errors: ['Password is required'] };
  }

  // Length requirement
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
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

  // Common password check
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger password');
  }

  // Unique character requirement
  const uniqueChars = new Set(password.toLowerCase()).size;
  if (uniqueChars < 8) {
    errors.push('Password must contain at least 8 different characters');
  }

  // Keyboard pattern check
  const patterns = ['qwerty', 'asdf', '1234', 'abcd', 'password'];
  if (patterns.some((pattern) => password.toLowerCase().includes(pattern))) {
    errors.push('Password cannot contain common keyboard patterns or dictionary words');
  }

  return { isValid: errors.length === 0, errors };
}

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
