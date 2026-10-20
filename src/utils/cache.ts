import { TechNode } from "@/types/tech-node";
import { ConnectionType } from "@/app/components/connections/CurvedConnections";
import type { TechTreeDetails } from "@/utils/techTreeData";

// Bumped when the cache shape changes so older entries are discarded rather
// than misread.
export const CACHE_VERSION = "3.0";
const CACHE_KEY = "tech-tree-cache";

// Environment-specific cache durations
const isDevelopment = process.env.NODE_ENV === 'development';
const CACHE_EXPIRY = isDevelopment 
  ? 5 * 60 * 1000        // 5 minutes for development
  : 24 * 60 * 60 * 1000; // 24 hours for production

// Link notes live in `details` since 3.0
interface Link {
  source: string;
  target: string;
  type: ConnectionType;
}

interface CacheData {
  version: string;
  timestamp: number;
  // Previously stored twice, as `basicData` and `detailData`, with only the
  // latter ever read back. One copy halves what we take from the origin's
  // storage quota, which matters most on Safari's ~5MB cap.
  // The slim payload, plus the tooltip details once they've loaded
  data: {
    nodes: TechNode[];
    links: Link[];
    details?: TechTreeDetails;
  };
}

export const cacheManager = {
  async set(data: CacheData) {
    try {
      await localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to cache data:", error);
    }
  },

  async get(): Promise<CacheData | null> {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const data = JSON.parse(cached) as CacheData;
      const isExpired = Date.now() - data.timestamp > CACHE_EXPIRY;
      const isOutdated = data.version !== CACHE_VERSION;

      if (isExpired || isOutdated) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return data;
    } catch (error) {
      console.warn("Failed to retrieve cached data:", error);
      return null;
    }
  },
};
