import { useState } from "preact/hooks";
import { fetchWithTimeout, getAuthHeaders } from "../utils/api.ts";
import { getOwnerToken } from "../utils/token-vault.ts";
import type { BucketContentMetadata } from "../types/bucket-types.ts";

interface BucketStatusResponse {
  success: boolean;
  bucket?: {
    is_empty: boolean;
    content_type: string | null;
    content_metadata: BucketContentMetadata | null;
  };
}

interface UseBucketStatusInitial {
  isEmpty: boolean;
  contentType: string | null;
  contentMetadata: BucketContentMetadata | null;
}

/**
 * Owns the locker's live is_empty/content_type/content_metadata state and
 * the poll that refreshes it from the server. Upload and download both call
 * refreshBucketStatus after they mutate the bucket; the setters are exposed
 * too because both flows also apply optimistic local updates before that
 * network round-trip lands.
 */
export function useBucketStatus(
  bucketCode: string,
  apiUrl: string,
  initial: UseBucketStatusInitial,
) {
  const [isEmpty, setIsEmpty] = useState(initial.isEmpty);
  const [contentType, setContentType] = useState(initial.contentType);
  const [contentMetadata, setContentMetadata] = useState<
    BucketContentMetadata | null
  >(initial.contentMetadata);

  const refreshBucketStatus = async (
    options: { preserveLocalMetadata?: boolean } = {},
  ): Promise<boolean> => {
    try {
      const ownerToken = await getOwnerToken("bucket", bucketCode);
      const statusUrl = new URL(`${apiUrl}/get-bucket-status`);
      statusUrl.searchParams.set("bucket_code", bucketCode);
      if (ownerToken) {
        statusUrl.searchParams.set("owner_token", ownerToken);
      }

      // Small JSON status check, not a file transfer — bound it so a dead
      // connection resolves to "poll failed" instead of a spinner that never
      // returns.
      const response = await fetchWithTimeout(statusUrl.toString(), {
        headers: getAuthHeaders(),
      });

      if (!response.ok) return false;

      const statusPayload = await response.json() as BucketStatusResponse;
      if (!statusPayload.success || !statusPayload.bucket) return false;

      setIsEmpty(statusPayload.bucket.is_empty);
      setContentType(statusPayload.bucket.content_type);
      setContentMetadata((currentMetadata) => {
        if (
          options.preserveLocalMetadata &&
          !statusPayload.bucket?.content_metadata &&
          currentMetadata
        ) {
          return currentMetadata;
        }
        return statusPayload.bucket?.content_metadata ?? null;
      });

      return true;
    } catch (err) {
      console.warn("Failed to refresh bucket status:", err);
      return false;
    }
  };

  return {
    isEmpty,
    setIsEmpty,
    contentType,
    setContentType,
    contentMetadata,
    setContentMetadata,
    refreshBucketStatus,
  };
}
