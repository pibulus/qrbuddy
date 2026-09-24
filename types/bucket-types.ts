// Shared shape for what a locker (bucket) currently holds — file, text, or
// link metadata. PIN-locked buckets redact this to null until unlocked.
export interface BucketContentMetadata {
  filename?: string;
  size?: number;
  mimetype?: string;
  storage_path?: string;
  content?: string;
  [key: string]: unknown;
}
