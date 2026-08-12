// Presigned R2 upload flow (supporter big files).
// create-upload-url → XHR PUT straight to R2 (real progress, no edge-function
// body limit) → finalize-upload (server verifies the object landed).
// Callers gate on: pass present AND file.size > MAX_FILE_SIZE.

import { getApiUrl } from "./api.ts";
import { ApiError, apiRequest } from "./api-request.ts";

interface UploadGrant {
  upload_id: string;
  upload_url: string;
  storage_key: string;
}

export interface R2UploadParams {
  kind: "destructible" | "bucket";
  // destructible
  max_downloads?: number;
  theme?: string;
  // bucket
  bucket_code?: string;
  owner_token?: string;
  password?: string;
  title?: string;
  description?: string;
  creator?: string;
}

/** PUT the raw file to a presigned URL. No Supabase auth headers — the
 * signature in the URL is the authorization. Progress maps 0–99; the caller
 * hits 100 when finalize succeeds. */
function putToPresignedUrl(
  url: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    if (file.type) {
      request.setRequestHeader("Content-Type", file.type);
    }

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      onProgress(Math.min(progress, 99));
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
      } else {
        reject(
          new ApiError("Upload to storage failed", request.status),
        );
      }
    };
    request.onerror = () => reject(new ApiError("Network error", 0));
    request.onabort = () => reject(new ApiError("Upload cancelled", 0));

    request.send(file);
  });
}

/** Full presigned flow. Returns finalize-upload's response, which mirrors the
 * shape of the classic upload endpoint for the same kind. */
export async function uploadViaR2<T = unknown>(
  params: R2UploadParams,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<T> {
  const apiUrl = getApiUrl();

  const grant = await apiRequest<UploadGrant>(
    `${apiUrl}/create-upload-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
        filename: file.name,
        size: file.size,
        mimetype: file.type,
      }),
    },
    "Couldn't start the upload",
  );

  await putToPresignedUrl(grant.upload_url, file, onProgress);

  const result = await apiRequest<T>(
    `${apiUrl}/finalize-upload`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_id: grant.upload_id }),
    },
    "Couldn't finish the upload",
  );

  onProgress?.(100);
  return result;
}
