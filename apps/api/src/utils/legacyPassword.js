/**
 * Legacy Password Utility
 *
 * Verifies WP password hashes without any PHP runtime.
 * Supports:
 *   - PHPass ($P$ / $H$) — WordPress default since 2008
 *   - Plain MD5          — very old WP installs / some migrations
 *
 * NEVER log or expose the raw hash in production.
 */
import crypto from 'node:crypto';

const ITOA64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Detect which kind of legacy hash is stored.
 * @param {string|null} hash
 * @returns {'phpass'|'md5'|null}
 */
export function detectLegacyHashType(hash) {
  if (!hash) return null;
  if (/^\$[PH]\$/.test(hash)) return 'phpass';
  if (/^[0-9a-f]{32}$/i.test(hash)) return 'md5';
  return null;
}

/**
 * Port of PHPass::encode64() from portable-md5 implementation.
 * @param {Buffer} buf
 * @param {number} count  number of bytes to encode
 * @returns {string}
 */
function _encode64(buf, count) {
  let output = '';
  let i = 0;
  do {
    let value = buf[i++];
    output += ITOA64[value & 0x3f];
    if (i < count) value |= buf[i] << 8;
    output += ITOA64[(value >> 6) & 0x3f];
    if (i++ >= count) break;
    if (i < count) value |= buf[i] << 8;
    output += ITOA64[(value >> 12) & 0x3f];
    if (i++ >= count) break;
    output += ITOA64[(value >> 18) & 0x3f];
  } while (i < count);
  return output;
}

/**
 * Verify a PHPass hash (WordPress $P$ or $H$ format).
 * @param {string} password  plaintext candidate
 * @param {string} storedHash
 * @returns {boolean}
 */
export function verifyPhpass(password, storedHash) {
  if (!storedHash || !/^\$[PH]\$/.test(storedHash)) return false;

  const countLog2 = ITOA64.indexOf(storedHash[3]);
  if (countLog2 < 7 || countLog2 > 30) return false;

  const count = 1 << countLog2;
  const salt = storedHash.substring(4, 12);
  if (salt.length < 8) return false;

  const passBuf = Buffer.from(password, 'utf8');
  const saltBuf = Buffer.from(salt, 'utf8');

  let digest = crypto
    .createHash('md5')
    .update(Buffer.concat([saltBuf, passBuf]))
    .digest();

  for (let i = 0; i < count; i++) {
    digest = crypto
      .createHash('md5')
      .update(Buffer.concat([digest, passBuf]))
      .digest();
  }

  const computed = storedHash.substring(0, 12) + _encode64(digest, 16);

  // Length mismatch means corrupted stored hash — fail gracefully
  if (computed.length !== storedHash.length) return false;

  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
}

/**
 * Verify a plain MD5 hash (32-char hex, no salt).
 * @param {string} password  plaintext candidate
 * @param {string} storedHash
 * @returns {boolean}
 */
export function verifyMd5(password, storedHash) {
  if (!storedHash || !/^[0-9a-f]{32}$/i.test(storedHash)) return false;
  const computed = crypto.createHash('md5').update(password, 'utf8').digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(computed.toLowerCase()),
    Buffer.from(storedHash.toLowerCase()),
  );
}

/**
 * Generate a PHPass hash (for testing only — not needed in production).
 * @param {string} password
 * @param {string} salt      must be exactly 8 chars
 * @param {number} costLog2  7-30 (default 8 = 256 iterations, same as WP)
 * @returns {string}
 */
export function generatePhpassHash(password, salt = 'testSalt', costLog2 = 8) {
  if (salt.length !== 8) throw new Error('PHPass salt must be exactly 8 characters');
  if (costLog2 < 7 || costLog2 > 30) throw new Error('costLog2 must be 7-30');

  const count = 1 << costLog2;
  const prefix = '$P$' + ITOA64[costLog2] + salt;
  const passBuf = Buffer.from(password, 'utf8');
  const saltBuf = Buffer.from(salt, 'utf8');

  let digest = crypto
    .createHash('md5')
    .update(Buffer.concat([saltBuf, passBuf]))
    .digest();
  for (let i = 0; i < count; i++) {
    digest = crypto
      .createHash('md5')
      .update(Buffer.concat([digest, passBuf]))
      .digest();
  }
  return prefix + _encode64(digest, 16);
}

/**
 * Auto-detect hash type and verify.
 * Returns false for any unrecognised format (safe default).
 * @param {string} password
 * @param {string|null} storedHash
 * @returns {boolean}
 */
export function verifyLegacyPassword(password, storedHash) {
  const type = detectLegacyHashType(storedHash);
  if (type === 'phpass') return verifyPhpass(password, storedHash);
  if (type === 'md5') return verifyMd5(password, storedHash);
  return false;
}
