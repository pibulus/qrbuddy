// File validation utilities
// Centralizes file type and size validation logic

// Maximum file size: 25MB
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Blocked file extensions for security
// Prevents executable files and scripts from being uploaded
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

// Blocked MIME types for additional security
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
 * Checks file size and type for security
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
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
