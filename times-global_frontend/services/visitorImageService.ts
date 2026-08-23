import { apiService } from './apiService';
import { ApiResponse, unwrapList } from './apiUtils';

interface StoredImage {
  id: string;
  fullName: string;
  imageFile: string;
  idType: string;
}

const imageCache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();

const fetchImageForName = async (fullName: string, signal?: AbortSignal): Promise<string | null> => {
  try {
    const data = await apiService.get<StoredImage[] | ApiResponse<StoredImage>>(
      `/images/?search=${encodeURIComponent(fullName)}`,
      signal ? { signal } : undefined
    );
    const images = unwrapList(data);
    return images.length > 0 && images[0].imageFile ? images[0].imageFile : null;
  } catch (err) {
    if (signal?.aborted) throw err;
    console.warn(`Could not fetch image for ${fullName}:`, err);
    return null;
  }
};

/**
 * Resolves visitor profile images by full name with an in-memory cache and
 * per-name request deduplication, so repeated list renders and shared names
 * trigger at most one network call each. Returns a map of fullName -> imageUrl.
 */
export const fetchVisitorImages = async (
  visitorNames: string[],
  signal?: AbortSignal
): Promise<Map<string, string>> => {
  const uniqueNames = Array.from(new Set(visitorNames.filter(Boolean)));

  const lookups = uniqueNames.map(async (name) => {
    if (imageCache.has(name)) {
      return [name, imageCache.get(name)] as const;
    }
    let pending = inFlight.get(name);
    if (!pending) {
      pending = fetchImageForName(name, signal);
      inFlight.set(name, pending);
    }
    try {
      const result = await pending;
      if (!signal?.aborted) imageCache.set(name, result);
      return [name, result] as const;
    } finally {
      inFlight.delete(name);
    }
  });

  const settled = await Promise.all(lookups);
  const resolved = new Map<string, string>();
  for (const [name, url] of settled) {
    if (url) resolved.set(name, url);
  }
  return resolved;
};

export interface ImageBearingVisitor {
  fullName: string;
  visitorImage?: string;
}

/** Attaches cached/fetched images onto a copy of the visitor list. */
export const enrichVisitorsWithImages = async <T extends ImageBearingVisitor>(
  visitors: T[],
  signal?: AbortSignal
): Promise<T[]> => {
  const needingImages = visitors.filter((v) => !v.visitorImage && v.fullName).map((v) => v.fullName);
  if (needingImages.length === 0) return visitors;

  const imagesByName = await fetchVisitorImages(needingImages, signal);
  if (signal?.aborted) return visitors;

  return visitors.map((visitor) => {
    const found = !visitor.visitorImage && imagesByName.get(visitor.fullName);
    return found ? { ...visitor, visitorImage: found } : visitor;
  });
};
