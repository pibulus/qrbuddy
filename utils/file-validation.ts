/**
 * File Validation Utilities
 * ==========================
 *
 * Client-side file validation for secure uploads to Supabase Storage.
 * Validates files BEFORE upload for better UX and security.
 *
 * Key Features:
 * - File size validation (25MB limit)
 * - File extension blocking (prevents executable files)
 * - MIME type validation (additional security layer)
 * - User-friendly error messages
 *
 * Usage Example:
 * ```typescript
 * const validation = validateFile(file);
 * if (!validation.valid) {
 *   throw new Error(validation.error);
 * }
 * // Proceed with upload...
 * ```
 *
 * Security Notes:
 * - This is CLIENT-SIDE validation only - always validate on server too
 * - Blocks executable files, scripts, and installers
 * - Uses both extension and MIME type checks for defense in depth
 */

/**
 * Maximum allowed file size: 25MB
 * Matches Supabase edge function limit
 */
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Blocked file extensions for security
 * Prevents executable files, scripts, and installers from being uploaded
 *
 * Includes:
 * - Windows executables (.exe, .bat, .cmd, .msi, .scr)
 * - Scripts (.js, .vbs, .ps1, .sh)
 * - Mobile apps (.apk, .ipa)
 * - System files (.sys, .dll via other patterns)
 */
export const BLOCKED_EXTENSIONS = [
  "exe",
  "bat",
  "cmd",
  "sh",
  "app",
  "dmg",
  "pkg",
  "deb",
  "rpm",
  "msi",
  "scr",
  "vbs",
  "js",
  "jar",
  "apk",
  "ipa",
  "com",
  "pif",
  "application",
  "gadget",
  "msp",
  "cpl",
  "hta",
  "inf",
  "ins",
  "isp",
  "jse",
  "lnk",
  "msc",
  "psc1",
  "reg",
  "scf",
  "vb",
  "vbe",
  "wsf",
  "wsh",
  "ps1",
  "ps1xml",
  "ps2",
  "ps2xml",
  "psc2",
  "msh",
  "msh1",
  "msh2",
  "mshxml",
  "msh1xml",
  "msh2xml",
];

/**
 * Blocked MIME types for additional security
 * Provides a second layer of validation beyond file extensions
 *
 * Note: Attackers can spoof MIME types, so this is used in combination
 * with extension checking for defense in depth
 */
export const BLOCKED_MIME_TYPES = [
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-executable",
  "application/x-sh",
  "application/x-bat",
  "application/x-ms-application",
  "application/vnd.microsoft.portable-executable",
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file for upload
 *
 * Performs comprehensive client-side validation:
 * 1. Checks file size against MAX_FILE_SIZE (25MB)
 * 2. Checks file extension against BLOCKED_EXTENSIONS
 * 3. Checks MIME type against BLOCKED_MIME_TYPES
 *
 * @param file - File object from input or drop event
 * @returns FileValidationResult with valid flag and optional error message
 *
 * @example
 * ```typescript
 * const validation = validateFile(selectedFile);
 * if (!validation.valid) {
 *   alert(validation.error);
 *   return;
 * }
 * // Safe to upload
 * ```
 */
export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "File too large (max 25MB)",
    };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const blockedExt = BLOCKED_EXTENSIONS.find((ext) =>
    fileName.endsWith(`.${ext}`)
  );

  if (blockedExt) {
    return {
      valid: false,
      error:
        `File type '.${blockedExt}' is not allowed for security reasons. Executable files are blocked.`,
    };
  }

  // Check MIME type if available
  if (file.type && BLOCKED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "This file type is not allowed for security reasons.",
    };
  }

  return { valid: true };
}

/**
 * Format file size for human-readable display
 *
 * Converts bytes to appropriate unit (Bytes, KB, MB, GB)
 * with proper rounding for readability.
 *
 * @param bytes - File size in bytes
 * @returns Formatted string like "1.5 MB" or "250 KB"
 *
 * @example
 * ```typescript
 * formatFileSize(1500000) // "1.43 MB"
 * formatFileSize(2500)    // "2.44 KB"
 * formatFileSize(0)       // "0 Bytes"
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
