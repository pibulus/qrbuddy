/**
 * Shared API Request Utility
 * ===========================
 *
 * Centralized API request helpers that eliminate duplicate code and ensure
 * consistent error handling across all Supabase edge function calls.
 *
 * Key Features:
 * - Automatically includes Supabase authentication headers (Authorization + apikey)
 * - Consistent error handling with structured ApiError class
 * - Automatic JSON response parsing with error handling
 * - Type-safe responses with generic type parameter
 *
 * Usage Examples:
 *
 * 1. Simple GET request:
 * ```typescript
 * const data = await apiRequest<{ user: User }>(
 *   `${apiUrl}/get-user?id=123`,
 *   {},
 *   "Failed to fetch user"
 * );
 * ```
 *
 * 2. POST request with JSON body:
 * ```typescript
 * const result = await apiRequest<{ success: boolean }>(
 *   `${apiUrl}/create-qr`,
 *   {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ url: "https://example.com" })
 *   },
 *   "Failed to create QR"
 * );
 * ```
 *
 * 3. File upload with FormData:
 * ```typescript
 * const formData = new FormData();
 * formData.append("file", file);
 * const data = await apiRequestFormData<{ url: string }>(
 *   `${apiUrl}/upload`,
 *   formData,
 *   "Upload failed"
 * );
 * ```
 *
 * Error Handling:
 * ```typescript
 * try {
 *   const data = await apiRequest(url, options, "Failed");
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.error("API Error:", {
 *       message: error.message,
 *       statusCode: error.statusCode, // HTTP status or 0 for network errors
 *       timestamp: new Date().toISOString()
 *     });
 *   }
 * }
 * ```
 */

import { getAuthHeaders } from "./api.ts";

export interface ApiRequestOptions extends RequestInit {
  // Allow override of headers
  headers?: HeadersInit;
}

/**
 * Custom error class for API request failures
 *
 * Provides structured error information with HTTP status codes
 * and optional access to the raw Response object.
 *
 * @property statusCode - HTTP status code (or 0 for network errors)
 * @property response - Optional raw Response object for advanced error handling
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: Response,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Make an authenticated API request to Supabase edge functions
 * Automatically includes auth headers and handles errors consistently
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (method, body, etc)
 * @param errorMessage - Default error message if server doesn't provide one
 * @returns Promise with parsed JSON response
 * @throws ApiError with details
 */
export async function apiRequest<T = unknown>(
  url: string,
  options: ApiRequestOptions = {},
  errorMessage = "Request failed",
): Promise<T> {
  const authHeaders = getAuthHeaders();

  // Merge auth headers with any provided headers
  const headers = new Headers(options.headers);
  Object.entries(authHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-OK responses
    if (!response.ok) {
      // Try to parse error from response body
      let serverError = errorMessage;
      try {
        const errorData = await response.json();
        serverError = errorData.error || errorMessage;
      } catch {
        // If JSON parsing fails, use default error message
      }

      throw new ApiError(serverError, response.status, response);
    }

    // Parse successful response
    try {
      return await response.json();
    } catch (_parseError) {
      throw new ApiError(
        "Failed to parse server response",
        response.status,
        response,
      );
    }
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Wrap other errors (network errors, etc)
    throw new ApiError(
      error instanceof Error ? error.message : String(error),
      0, // 0 indicates network error
    );
  }
}

/**
 * Make an API request with FormData (for file uploads)
 * Auth headers are added automatically, but Content-Type is NOT set
 * to allow browser to set multipart/form-data boundary
 */
export async function apiRequestFormData<T = unknown>(
  url: string,
  formData: FormData,
  errorMessage = "Upload failed",
): Promise<T> {
  const authHeaders = getAuthHeaders();

  // For FormData, we only add auth headers, NOT Content-Type
  // Browser will automatically set Content-Type with boundary
  const headers = new Headers();
  Object.entries(authHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      let serverError = errorMessage;
      try {
        const errorData = await response.json();
        serverError = errorData.error || errorMessage;
      } catch {
        // Use default error message
      }

      throw new ApiError(serverError, response.status, response);
    }

    try {
      return await response.json();
    } catch (_parseError) {
      throw new ApiError(
        "Failed to parse server response",
        response.status,
        response,
      );
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      error instanceof Error ? error.message : String(error),
      0,
    );
  }
}
