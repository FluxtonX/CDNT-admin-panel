import { createAdminClient } from "./supabase-admin";

interface CacheEntry {
  url: string;
  expiresAt: number; // Unix timestamp in ms
}

// In-memory cache for generated signed URLs to keep URLs stable and enable HTTP caching
const signedUrlCache = new Map<string, CacheEntry>();

export interface TransformOptions {
  width?: number;
  height?: number;
  resize?: "cover" | "contain" | "fill";
  quality?: number;
}

/**
 * Extracts relative storage object path from a Supabase URL or relative string.
 * Example: "https://xyz.supabase.co/storage/v1/object/public/kyc-documents/user123/selfie.jpg" -> "user123/selfie.jpg"
 */
export function extractStoragePath(rawUrlOrPath: string | null | undefined, bucket: string = "kyc-documents"): string | null {
  if (!rawUrlOrPath) return null;
  
  // If it's already a relative path (doesn't start with http/https)
  if (!rawUrlOrPath.startsWith("http://") && !rawUrlOrPath.startsWith("https://")) {
    return rawUrlOrPath.replace(/^\/+/, "");
  }

  try {
    const url = new URL(rawUrlOrPath);
    const bucketMarker = `/${bucket}/`;
    const parts = url.pathname.split(bucketMarker);
    if (parts.length > 1) {
      return decodeURIComponent(parts[1]);
    }
  } catch {
    const bucketMarker = `${bucket}/`;
    const idx = rawUrlOrPath.indexOf(bucketMarker);
    if (idx !== -1) {
      const remaining = rawUrlOrPath.substring(idx + bucketMarker.length);
      return remaining.split("?")[0];
    }
  }

  return null;
}

/**
 * Retrieves a stable signed URL with server-side caching (default 24 hours).
 * This ensures the URL string doesn't churn on every request, allowing browser & CDN caching.
 */
export async function getCachedSignedUrl(
  bucket: string,
  rawPathOrUrl: string,
  expiresInSeconds: number = 86400, // 24 hours
  transform?: TransformOptions
): Promise<string | null> {
  const filePath = extractStoragePath(rawPathOrUrl, bucket);
  if (!filePath) return rawPathOrUrl; // If cannot extract, return original

  const cacheKey = `${bucket}:${filePath}:${JSON.stringify(transform || {})}`;
  const now = Date.now();

  const cached = signedUrlCache.get(cacheKey);
  // Return cached URL if it still has at least 5 minutes of validity remaining
  if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
    return cached.url;
  }

  try {
    const supabaseAdmin = createAdminClient();
    let signedUrl: string | null = null;

    if (transform && (transform.width || transform.height)) {
      try {
        const { data, error } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(filePath, expiresInSeconds, { transform });
        if (!error && data?.signedUrl) {
          signedUrl = data.signedUrl;
        }
      } catch (err) {
        console.warn(`[storage-cache] Transform failed for ${filePath}, falling back to standard URL`, err);
      }
    }

    // Fallback to standard signed URL if transform failed or wasn't requested
    if (!signedUrl) {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresInSeconds);
      if (error) {
        console.error(`[storage-cache] Error signing URL for ${filePath}:`, error.message);
        return rawPathOrUrl;
      }
      signedUrl = data?.signedUrl || null;
    }

    if (signedUrl) {
      signedUrlCache.set(cacheKey, {
        url: signedUrl,
        expiresAt: now + expiresInSeconds * 1000,
      });
      return signedUrl;
    }

    return rawPathOrUrl;
  } catch (e) {
    console.error(`[storage-cache] Unexpected error signing URL for ${filePath}:`, e);
    return rawPathOrUrl;
  }
}
