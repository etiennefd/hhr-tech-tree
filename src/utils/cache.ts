import { TechNode } from "@/types/tech-node";
import { ConnectionType } from "@/app/components/connections/CurvedConnections";

export const CACHE_VERSION = "1.1";
const CACHE_KEY = "tech-tree-cache";
const CACHE_EXPIRY = 1 * 60 * 60 * 1000; // Reduce to 1 hour

interface Link {
  source: string;
  target: string;
  type: ConnectionType;
  details?: string;
}

interface CacheData {
  version: string;
  timestamp: number;
  dataHash?: string;
  basicData: {
    nodes: TechNode[];
    links: Link[];
  };
  detailData?: {
    nodes: TechNode[];
    links: Link[];
  };
}

// Helper function to generate a hash of the data
function generateDataHash(data: { nodes: TechNode[]; links: Link[] }): string {
  const nodesHash = data.nodes
    .map(n => `${n.id}:${n.title}:${n.year}:${n.fields.join(",")}:${n.image || ""}:${n.wikipedia || ""}:${n.subtitle || ""}:${n.details || ""}:${(n.inventors || []).join(",")}:${(n.organizations || []).join(",")}`)
    .join("|");
  const linksHash = data.links
    .map(l => `${l.source}:${l.target}:${l.type}:${l.details || ""}`)
    .join("|");
  return `${nodesHash}|${linksHash}`;
}

export const cacheManager = {
  async set(data: CacheData) {
    try {
      // Add hash before saving
      const newData = {
        ...data,
        dataHash: generateDataHash(data.detailData || data.basicData),
      };
      await localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
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

      // If expired or outdated, clear cache
      if (isExpired || isOutdated) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return data;
    } catch (error) {
      console.warn("Failed to retrieve cached data:", error);
      localStorage.removeItem(CACHE_KEY); // Clear cache on error
      return null;
    }
  },
};
