import { useState } from "preact/hooks";
import { Signal } from "@preact/signals";
import { haptics } from "../utils/haptics.ts";
import { getApiUrl } from "../utils/api.ts";
import { saveOwnerToken } from "../utils/token-vault.ts";
import { ApiError, apiRequest } from "../utils/api-request.ts";

export interface CreateBucketOptions {
  bucketType?: "file" | "text" | "link";
  style?: string;
  isReusable?: boolean;
  deleteOnDownload?: boolean;
  password?: string;
}

interface UseBucketCreatorProps {
  url: Signal<string>;
  bucketUrl: Signal<string>;
}

export function useBucketCreator({ url, bucketUrl }: UseBucketCreatorProps) {
  const [isCreatingBucket, setIsCreatingBucket] = useState(false);

  // Create text bucket (Smart Dynamic for text)
  const createTextBucket = async (text: string) => {
    try {
      setIsCreatingBucket(true);
      // haptics.medium(); // reduce noise

      const apiUrl = getApiUrl();

      // 1. Create Bucket (use shared API helper)
      const bucketData = await apiRequest<{
        bucket_code: string;
        bucket_url: string;
        owner_token: string;
      }>(
        `${apiUrl}/create-bucket`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucket_type: "text",
            style: "sunset",
            is_reusable: true,
          }),
        },
        "Failed to create text bucket",
      );

      // 2. Upload Text
      await apiRequest(
        `${apiUrl}/upload-to-bucket?bucket_code=${bucketData.bucket_code}&owner_token=${bucketData.owner_token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "text",
            content: text,
          }),
        },
        "Failed to save text",
      );

      // 3. Update UI
      url.value = bucketData.bucket_url;
      bucketUrl.value = bucketData.bucket_url;

      // Save token
      await saveOwnerToken(
        "bucket",
        bucketData.bucket_code,
        bucketData.owner_token,
      );

      setIsCreatingBucket(false);
      haptics.success();
    } catch (error) {
      console.error("[HOOK:useBucketCreator] Text bucket failed:", {
        error: error instanceof Error ? error.message : String(error),
        statusCode: error instanceof ApiError ? error.statusCode : undefined,
        timestamp: new Date().toISOString(),
      });
      setIsCreatingBucket(false);
      // Don't show toast/error for every keystroke, just log
    }
  };

  // Create file bucket
  const createBucket = async (
    options: CreateBucketOptions = {},
  ): Promise<boolean> => {
    try {
      setIsCreatingBucket(true);
      haptics.medium();

      const apiUrl = getApiUrl();
      const {
        bucketType = "file",
        style = "sunset",
        isReusable = true,
        deleteOnDownload = false,
        password,
      } = options;

      // Use shared API helper (automatically includes auth headers)
      const data = await apiRequest<{
        bucket_code: string;
        bucket_url: string;
        owner_token: string;
      }>(
        `${apiUrl}/create-bucket`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucket_type: bucketType,
            style,
            is_reusable: isReusable,
            delete_on_download: deleteOnDownload,
            ...(password ? { password } : {}),
          }),
        },
        "Failed to create bucket",
      );

      // Update URL to the bucket URL
      url.value = data.bucket_url;
      bucketUrl.value = data.bucket_url;

      // Store owner token securely for future uploads
      await saveOwnerToken("bucket", data.bucket_code, data.owner_token);

      // Success feedback
      haptics.success();

      const event = new CustomEvent("show-toast", {
        detail: {
          message: `✅ File Bucket created! Scan to upload/download files 🪣`,
          type: "success",
        },
      });
      globalThis.dispatchEvent(event);

      setIsCreatingBucket(false);
      return true;
    } catch (error) {
      console.error("[HOOK:useBucketCreator] Create bucket failed:", {
        error: error instanceof Error ? error.message : String(error),
        statusCode: error instanceof ApiError ? error.statusCode : undefined,
        timestamp: new Date().toISOString(),
      });

      setIsCreatingBucket(false);
      haptics.error();

      const event = new CustomEvent("show-toast", {
        detail: {
          message: `❌ Failed to create bucket: ${
            error instanceof Error ? error.message : String(error)
          }`,
          type: "error",
        },
      });
      globalThis.dispatchEvent(event);
      return false;
    }
  };

  return {
    isCreatingBucket,
    createTextBucket,
    createBucket,
  };
}
