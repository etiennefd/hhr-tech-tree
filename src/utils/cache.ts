import { TechNode } from "@/types/tech-node";
import { ConnectionType } from "@/app/components/connections/CurvedConnections";

export const CACHE_VERSION = "1.0";
const CACHE_KEY = "tech-tree-cache";
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes (reduced from 24 hours)

interface Link {
  source: string;
  target: string;
  type: ConnectionType;
  details?: string;
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
