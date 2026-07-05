// Application-wide constants
// Centralizes magic numbers for maintainability and consistency

// ============================================================================
// File Upload Constants
// ============================================================================

/**
 * Delay before resetting upload UI state (milliseconds)
 * Allows user to see 100% completion before clearing
 */
export const UPLOAD_RESET_DELAY_MS = 1000;

// ============================================================================
// Scan Limit Constants
// ============================================================================

/**
 * Sentinel value representing unlimited downloads/scans
 * Used throughout the app to indicate no scan limit
 */
export const UNLIMITED_SCANS = 999999;

/**
 * Display text for unlimited scans in UI
 */
export const UNLIMITED_SCANS_TEXT = "unlimited scans ∞";
