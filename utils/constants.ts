// Application-wide constants
// Centralizes magic numbers for maintainability and consistency

// ============================================================================
// File Upload Constants
// ============================================================================

/**
 * Upload progress simulation interval in milliseconds
 * Used to update the progress bar during file uploads
 */
export const UPLOAD_PROGRESS_INTERVAL_MS = 200;

/**
 * Upload progress increment per interval (percentage points)
 * Progress bar increases by this amount every UPLOAD_PROGRESS_INTERVAL_MS
 */
export const UPLOAD_PROGRESS_INCREMENT = 10;

/**
 * Maximum progress percentage before upload completes
 * Prevents showing 100% before server responds
 */
export const UPLOAD_PROGRESS_MAX = 90;

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
