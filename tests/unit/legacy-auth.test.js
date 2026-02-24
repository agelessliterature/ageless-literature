/**
 * Unit tests: Legacy WP password verification + auth window
 */

let detectLegacyHashType, verifyMd5, verifyPhpass, verifyLegacyPassword, generatePhpassHash;
let phpassTestHash; // computed from our own implementation — round-trip test

beforeAll(async () => {
  const mod = await import('../../apps/api/src/utils/legacyPassword.js');
  detectLegacyHashType = mod.detectLegacyHashType;
  verifyMd5 = mod.verifyMd5;
  verifyPhpass = mod.verifyPhpass;
  verifyLegacyPassword = mod.verifyLegacyPassword;
  generatePhpassHash = mod.generatePhpassHash;

  // Round-trip: generate a real PHPass hash then verify it
  phpassTestHash = generatePhpassHash('testpassword', 'abcdefgh', 8);
});

// ─── detectLegacyHashType ───────────────────────────────────────────────────

describe('detectLegacyHashType', () => {
  it('identifies $P$ PHPass hash', () => {
    expect(detectLegacyHashType('$P$BsomeSaltAndHash1234567890ab')).toBe('phpass');
  });

  it('identifies $H$ PHPass hash', () => {
    expect(detectLegacyHashType('$H$9someSaltAndHash1234567890ab')).toBe('phpass');
  });

  it('identifies 32-char hex as md5', () => {
    expect(detectLegacyHashType('5f4dcc3b5aa765d61d8327deb882cf99')).toBe('md5');
  });

  it('returns null for bcrypt hash', () => {
    expect(detectLegacyHashType('$2b$12$somethinglong')).toBeNull();
  });

  it('returns null for empty/null', () => {
    expect(detectLegacyHashType(null)).toBeNull();
    expect(detectLegacyHashType('')).toBeNull();
  });
});

// ─── verifyMd5 ──────────────────────────────────────────────────────────────

describe('verifyMd5', () => {
  // md5('password') = 5f4dcc3b5aa765d61d8327deb882cf99
  const stored = '5f4dcc3b5aa765d61d8327deb882cf99';

  it('returns true for correct password', () => {
    expect(verifyMd5('password', stored)).toBe(true);
  });

  it('returns false for wrong password', () => {
    expect(verifyMd5('wrongpass', stored)).toBe(false);
  });

  it('is case-insensitive for stored hash', () => {
    expect(verifyMd5('password', stored.toUpperCase())).toBe(true);
  });

  it('returns false for non-md5 hash', () => {
    expect(verifyMd5('password', '$P$BsomePHPassHash1234567890ab')).toBe(false);
  });
});

// PHPass hash generated dynamically in beforeAll for round-trip verification
describe('verifyPhpass', () => {
  it('returns true for correct password (round-trip)', () => {
    expect(verifyPhpass('testpassword', phpassTestHash)).toBe(true);
  });

  it('returns false for wrong password', () => {
    expect(verifyPhpass('wrongpassword', phpassTestHash)).toBe(false);
  });

  it('returns false for empty hash', () => {
    expect(verifyPhpass('testpassword', '')).toBe(false);
  });

  it('returns false for non-phpass hash', () => {
    expect(verifyPhpass('testpassword', '5f4dcc3b5aa765d61d8327deb882cf99')).toBe(false);
  });
});

// ─── verifyLegacyPassword (auto-dispatch) ──────────────────────────────────

describe('verifyLegacyPassword', () => {
  it('dispatches to md5 and returns true', () => {
    expect(verifyLegacyPassword('password', '5f4dcc3b5aa765d61d8327deb882cf99')).toBe(true);
  });

  it('dispatches to phpass and returns true', () => {
    expect(verifyLegacyPassword('testpassword', phpassTestHash)).toBe(true);
  });

  it('returns false for unknown hash format', () => {
    expect(verifyLegacyPassword('anything', '$2b$12$somebcrypthashvalue')).toBe(false);
  });

  it('returns false for null hash', () => {
    expect(verifyLegacyPassword('password', null)).toBe(false);
  });
});

// ─── isLegacyWindowOpen ─────────────────────────────────────────────────────

describe('isLegacyWindowOpen', () => {
  let isLegacyWindowOpen;

  // Re-import fresh each test so that process.env changes take effect
  beforeEach(async () => {
    // Clear module cache (Jest registers each import separately so we re-import)
    const mod = await import('../../apps/api/src/utils/legacyAuthWindow.js');
    isLegacyWindowOpen = mod.isLegacyWindowOpen;
  });

  afterEach(() => {
    delete process.env.AUTH_LEGACY_WP_ENABLED;
    delete process.env.AUTH_LEGACY_WP_CUTOFF_DATE;
  });

  it('returns false when AUTH_LEGACY_WP_ENABLED is not set', () => {
    // Explicitly clear in case .env loaded AUTH_LEGACY_WP_ENABLED=true at startup
    delete process.env.AUTH_LEGACY_WP_ENABLED;
    expect(isLegacyWindowOpen()).toBe(false);
  });

  it('returns false when AUTH_LEGACY_WP_ENABLED=false', () => {
    process.env.AUTH_LEGACY_WP_ENABLED = 'false';
    expect(isLegacyWindowOpen()).toBe(false);
  });

  it('returns true when enabled=true and cutoff is in the future', () => {
    process.env.AUTH_LEGACY_WP_ENABLED = 'true';
    process.env.AUTH_LEGACY_WP_CUTOFF_DATE = '2099-12-31';
    expect(isLegacyWindowOpen()).toBe(true);
  });

  it('returns false when enabled=true but cutoff date has passed', () => {
    process.env.AUTH_LEGACY_WP_ENABLED = 'true';
    process.env.AUTH_LEGACY_WP_CUTOFF_DATE = '2000-01-01';
    expect(isLegacyWindowOpen()).toBe(false);
  });

  it('returns false when date is malformed', () => {
    process.env.AUTH_LEGACY_WP_ENABLED = 'true';
    process.env.AUTH_LEGACY_WP_CUTOFF_DATE = 'not-a-date';
    expect(isLegacyWindowOpen()).toBe(false);
  });

  it('returns true when enabled=true and no cutoff date', () => {
    process.env.AUTH_LEGACY_WP_ENABLED = 'true';
    expect(isLegacyWindowOpen()).toBe(true);
  });
});
