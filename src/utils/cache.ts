import { TechNode } from "@/types/tech-node";
import { ConnectionType } from "@/app/components/connections/CurvedConnections";

export const CACHE_VERSION = "1.0";
const CACHE_KEY = "tech-tree-cache";

// Environment-specific cache durations
const isDevelopment = process.env.NODE_ENV === 'development';
const CACHE_EXPIRY = isDevelopment 
  ? 5 * 60 * 1000        // 5 minutes for development
  : 24 * 60 * 60 * 1000; // 24 hours for production

interface Link {
  source: string;
  target: string;
  type: ConnectionType;
  details?: string;
  detailsSource?: string;
}

interface CacheData {
  version: string;
  timestamp: number;
  basicData: {
    nodes: TechNode[];
    links: Link[];
  };
  detailData?: {
    nodes: TechNode[];
    links: Link[];
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
