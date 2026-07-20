/**
 * File Validation Utilities
 * ==========================
 *
 * Client-side file validation for secure uploads to Supabase Storage.
 * Validates files BEFORE upload for better UX and security.
 *
 * Key Features:
 * - File size validation (50MB limit)
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

// CANONICAL SOURCE for the blocklists + size limit:
// supabase/functions/_shared/file-validation.ts
// Edge functions can't import from outside supabase/functions/, but the
// client can import from anywhere — so the edge copy is the single source
// of truth. Edit the lists THERE, never here.
export {
  BLOCKED_EXTENSIONS,
  BLOCKED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "../supabase/functions/_shared/file-validation.ts";
import {
  BLOCKED_EXTENSIONS,
  BLOCKED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "../supabase/functions/_shared/file-validation.ts";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file for upload
 *
 * Performs comprehensive client-side validation:
 * 1. Checks file size against MAX_FILE_SIZE (50MB)
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
      error: "File too large (max 50MB)",
    };
  }

  // Reject control characters in the filename (null byte truncation, etc.).
  // deno-lint-ignore no-control-regex
  if (/[\x00-\x1f]/.test(file.name)) {
    return {
      valid: false,
      error: "Filename contains invalid characters.",
    };
  }

  // Check the LAST extension specifically — "archive.jpg.exe" is an exe.
  const fileName = file.name.toLowerCase();
  const lastExt = fileName.includes(".") ? fileName.split(".").pop() ?? "" : "";
  if (lastExt && BLOCKED_EXTENSIONS.includes(lastExt)) {
    return {
      valid: false,
      error:
        `File type '.${lastExt}' is not allowed for security reasons. Executable files are blocked.`,
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
