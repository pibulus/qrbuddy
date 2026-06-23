/**
 * File Validation Utilities (Edge Function Version)
 * =================================================
 *
 * Shared validation logic for Supabase Edge Functions.
 * Matches client-side validation in utils/file-validation.ts.
 */

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "File too large (max 50MB)",
    };
  }

  // Reject control characters in the filename outright. A null byte (or other
  // control char) can truncate the name at the OS/storage layer so that
  // "evil.php\x00.jpg" passes an endsWith(".jpg") check but lands as .php.
  // deno-lint-ignore no-control-regex
  if (/[\x00-\x1f]/.test(file.name)) {
    return {
      valid: false,
      error: "Filename contains invalid characters.",
    };
  }

  // Check the LAST extension specifically (not just any-suffix match). For
  // "archive.jpg.exe" the real extension is "exe"; for "report.PDF" it's "pdf".
  const fileName = file.name.toLowerCase();
  const lastExt = fileName.includes(".") ? fileName.split(".").pop() ?? "" : "";
  if (lastExt && BLOCKED_EXTENSIONS.includes(lastExt)) {
    return {
      valid: false,
      error: `File type '.${lastExt}' is not allowed for security reasons.`,
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
