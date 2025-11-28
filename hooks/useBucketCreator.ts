import { useState } from "preact/hooks";
import { Signal } from "@preact/signals";
import { haptics } from "../utils/haptics.ts";
import { getApiUrl, getAuthHeaders } from "../utils/api.ts";
import { saveOwnerToken } from "../utils/token-vault.ts";

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
      const authHeaders = getAuthHeaders();

      // 1. Create Bucket
      const createRes = await fetch(`${apiUrl}/create-bucket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          bucket_type: "text",
          style: "sunset",
          is_reusable: true,
        }),
      });

      if (!createRes.ok) throw new Error("Failed to create text bucket");
      const bucketData = await createRes.json();

      // 2. Upload Text
      const uploadRes = await fetch(
        `${apiUrl}/upload-to-bucket?bucket_code=${bucketData.bucket_code}&owner_token=${bucketData.owner_token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            type: "text",
            content: text,
          }),
        }
      );

      if (!uploadRes.ok) throw new Error("Failed to save text");

      // 3. Update UI
      url.value = bucketData.bucket_url;
      bucketUrl.value = bucketData.bucket_url;
      
      // Save token
      await saveOwnerToken("bucket", bucketData.bucket_code, bucketData.owner_token);

      setIsCreatingBucket(false);
      haptics.success();

    } catch (error) {
      console.error("Text bucket error:", error);
      setIsCreatingBucket(false);
      // Don't show toast/error for every keystroke, just log
    }
  };

  // Create file bucket
  const createBucket = async () => {
    try {
      setIsCreatingBucket(true);
      haptics.medium();

      const apiUrl = getApiUrl();
      const authHeaders = getAuthHeaders();

      const response = await fetch(
        `${apiUrl}/create-bucket`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            bucket_type: "file",
            style: "sunset", // Use current style
            is_reusable: true,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create bucket");
      }

      const data = await response.json();

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
    } catch (error) {
      console.error("Create bucket error:", error);
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
    }
  };

  return {
    isCreatingBucket,
    createTextBucket,
    createBucket
  };
}
