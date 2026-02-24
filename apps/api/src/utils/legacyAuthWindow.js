/**
 * Legacy Auth Window Utility
 *
 * Controls the time-boxed window during which WP legacy passwords are accepted.
 * Governed by two env vars:
 *   AUTH_LEGACY_WP_ENABLED      = 'true' | 'false'  (default: false)
 *   AUTH_LEGACY_WP_CUTOFF_DATE  = 'YYYY-MM-DD'       (date in UTC)
 *
 * When the window is closed, users with no bcrypt hash must reset their password.
 */

/**
 * @returns {boolean} true if legacy WP password verification is currently permitted
 */
export function isLegacyWindowOpen() {
  const enabled = process.env.AUTH_LEGACY_WP_ENABLED === 'true';
  if (!enabled) return false;

  const cutoffStr = process.env.AUTH_LEGACY_WP_CUTOFF_DATE;
  if (!cutoffStr) {
    // Enabled but no cutoff date set — open indefinitely (dev convenience only)
    return true;
  }

  const cutoff = new Date(cutoffStr + 'T23:59:59.999Z');
  if (isNaN(cutoff.getTime())) {
    // Malformed date — fail closed
    console.warn(
      '[legacyAuthWindow] AUTH_LEGACY_WP_CUTOFF_DATE is not a valid YYYY-MM-DD date — window treated as closed',
    );
    return false;
  }

  return Date.now() <= cutoff.getTime();
}
