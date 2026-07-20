import { useState } from "preact/hooks";
import { Signal } from "@preact/signals";
import { haptics } from "../utils/haptics.ts";
import { getApiUrl } from "../utils/api.ts";
import { saveOwnerToken } from "../utils/token-vault.ts";
import { ApiError, apiRequest } from "../utils/api-request.ts";
import { addToast } from "../islands/ToastManager.tsx";
import { reportFailure } from "../utils/report-failure.ts";

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
  const createTextBucket = async (
    text: string,
  ): Promise<
    { bucket_code: string; owner_token: string; note_url: string } | null
  > => {
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
        `${apiUrl}/upload-to-bucket?bucket_code=${bucketData.bucket_code}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner_token: bucketData.owner_token,
            type: "text",
            content: text,
          }),
        },
        "Failed to save text",
      );

      const noteUrl = bucketData.bucket_url.replace("/bucket/", "/note/");

      // 3. Update UI
      url.value = noteUrl;
      bucketUrl.value = noteUrl;

      // Save token
      await saveOwnerToken(
        "bucket",
        bucketData.bucket_code,
        bucketData.owner_token,
      );

      setIsCreatingBucket(false);
      haptics.success();
      return {
        bucket_code: bucketData.bucket_code,
        owner_token: bucketData.owner_token,
        note_url: noteUrl,
      };
    } catch (error) {
      console.error("[HOOK:useBucketCreator] Text bucket failed:", {
        error: error instanceof Error ? error.message : String(error),
        statusCode: error instanceof ApiError ? error.statusCode : undefined,
        timestamp: new Date().toISOString(),
      });
      setIsCreatingBucket(false);
      // Don't show toast/error for every keystroke, just log
      return null;
    }
  };

  // Create file locker
  const createBucket = async (
    options: CreateBucketOptions = {},
  ): Promise<{ bucket_code: string; owner_token: string } | null> => {
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
        "Failed to create locker",
      );

      // Update URL to the bucket URL
      url.value = data.bucket_url;
      bucketUrl.value = data.bucket_url;

      // Store owner token securely for future uploads
      await saveOwnerToken("bucket", data.bucket_code, data.owner_token);

      // Success feedback
      haptics.success();

      addToast("✅ File Locker created! Scan to upload/download files 🪣");

      setIsCreatingBucket(false);
      return { bucket_code: data.bucket_code, owner_token: data.owner_token };
    } catch (error) {
      setIsCreatingBucket(false);
      reportFailure(
        "[HOOK:useBucketCreator] Create bucket failed",
        error,
        "❌ Failed to create locker",
      );
      return null;
    }
  };

  // Upload file to bucket with metadata
  const uploadToBucket = async (
    bucketCode: string,
    ownerToken: string,
    file: File,
    metadata?: { title?: string; description?: string; creator?: string },
  ) => {
    try {
      setIsCreatingBucket(true);
      const apiUrl = getApiUrl();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("owner_token", ownerToken);
      if (metadata?.title) formData.append("title", metadata.title);
      if (metadata?.description) {
        formData.append("description", metadata.description);
      }
      if (metadata?.creator) formData.append("creator", metadata.creator);

      await apiRequest(
        `${apiUrl}/upload-to-bucket?bucket_code=${bucketCode}`,
        {
          method: "POST",
          headers: {
            // Content-Type is automatically set by browser for FormData
          },
          body: formData,
        },
        "Failed to upload file",
      );

      setIsCreatingBucket(false);
      return true;
    } catch (error) {
      console.error("[HOOK:useBucketCreator] Upload failed:", error);
      setIsCreatingBucket(false);
      haptics.error();
      return false;
    }
  };

  return {
    isCreatingBucket,
    createTextBucket,
    createBucket,
    uploadToBucket,
  };
}
