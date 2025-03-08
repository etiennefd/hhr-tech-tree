import { NextResponse } from "next/server";
import Airtable from "airtable";
import fs from "fs/promises";
import path from "path";
import { formatLocation, cleanCommaList } from "../../utils/location";
import { FieldSet, Record as AirtableRecord } from "airtable";
import placeholderImage from "@/assets/placeholder-invention.png";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID ?? ""
);

// Constants
const FETCH_TIMEOUT = 5000;
const MAX_RETRIES = 2;
const CONCURRENT_REQUESTS = 10;
const CACHE_FILE = path.join(process.cwd(), "wikipedia-image-cache.json");
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Cache management functions
async function loadImageCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, "utf8");
    const cache = JSON.parse(data);

    // Filter out expired entries
    const now = Date.now();
    const validCache: Record<string, { url: string; timestamp: number }> = {};
    for (const [key, entry] of Object.entries(cache) as [
      string,
      { url: string; timestamp: number }
    ][]) {
      if (now - entry.timestamp < CACHE_DURATION) {
        validCache[key] = entry;
      }
    }
    return validCache;
  } catch (error) {
    // If file doesn't exist or is invalid, return empty cache
    console.error("Error loading cache:", error);
    return {};
  }
}

async function saveImageCache(
  cache: Record<string, { url: string; timestamp: number }>
) {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error("Error saving cache:", error);
  }
}

async function fetchWithTimeout(url: string, timeout: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TechTreeViewer/1.0 (educational project)",
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function getWikimediaImage(
  wikipediaUrl: string,
  cache: Record<string, { url: string; timestamp: number }>,
  retryCount = 0
) {
  if (!wikipediaUrl) return null;

  // Extract title from URL
  const title = wikipediaUrl.split("/wiki/")[1];
  if (!title) return null;

  // Check cache first
  if (cache[title]) {
    return cache[title].url;
  }

  try {
    const response = await fetchWithTimeout(
      `https://en.wikipedia.org/w/api.php?` +
        `action=query&prop=pageimages&format=json&pithumbsize=300&titles=${encodeURIComponent(
          title
        )}&origin=*`,
      FETCH_TIMEOUT
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const page = Object.values(data.query.pages)[0] as {
      thumbnail?: {
        source: string;
      };
    };

    if (page?.thumbnail?.source) {
      // Update cache
      cache[title] = {
        url: page.thumbnail.source,
        timestamp: Date.now(),
      };
      return page.thumbnail.source;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching Wikimedia image for ${title}:`, error);

    if (retryCount < MAX_RETRIES) {
      console.log(
        `Retrying fetch for ${title} (attempt ${retryCount + 1}/${MAX_RETRIES})`
      );
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, retryCount))
      );
      return getWikimediaImage(wikipediaUrl, cache, retryCount + 1);
    }

    return null;
  }
}

// Helper function to process items in parallel with controlled concurrency
async function processBatch<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processFn));
    results.push(...batchResults);
  }
  return results;
}

// Update the type to extend Airtable's Record type
type CustomAirtableRecord = AirtableRecord<FieldSet>;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const detail = searchParams.get("detail") === "true";

  try {
    // Load cache
    const imageCache = await loadImageCache();

    // Fetch records from Airtable
    const [innovationRecords, connectionRecords] = (await Promise.all([
      base("Innovations")
        .select({
          view: "Grid view",
          sort: [{ field: "Date", direction: "desc" }],
        })
        .all(),
      base("Connections")
        .select({
          view: "Grid view",
        })
        .all(),
    ])) as [CustomAirtableRecord[], CustomAirtableRecord[]];

    const validRecords = innovationRecords.filter((record) => {
      const dateValue = record.get("Date");
      return dateValue && !isNaN(Number(dateValue));
    });

    // For basic data, return minimal information needed for initial render
    if (!detail) {
      const basicNodes = validRecords.map((record) => ({
        id: record.id,
        title: String(record.get("Name") || ""),
        year: Number(record.get("Date")),
        fields: String(record.get("Field(s)") || "")
          .split(",")
          .filter(Boolean)
          .map((f) => f.trim()),
        type: String(record.get("Type of innovation") || ""),
      }));

      const basicLinks = connectionRecords
        .filter((record) => {
          const fromId = record.get("From");
          const toId = record.get("To");
          return fromId && toId;
        })
        .map((record) => {
          const fromValue = record.get("From");
          const toValue = record.get("To");
          return {
            source:
              Array.isArray(fromValue) && fromValue.length > 0
                ? fromValue[0]
                : String(fromValue ?? ""),
            target:
              Array.isArray(toValue) && toValue.length > 0
                ? toValue[0]
                : String(toValue ?? ""),
            type: String(record.get("Type") || "default"),
          };
        });

      return NextResponse.json({
        nodes: basicNodes,
        links: basicLinks,
      });
    }

    // For detailed data, process everything as before
    const nodes = await processBatch(
      validRecords,
      async (record) => {
        const year = Number(record.get("Date"));
        try {
          return {
            id: record.id,
            title: String(record.get("Name") || ""),
            subtitle: String(record.get("Secondary name") || ""),
            tier: String(record.get("Tier") || ""),
            image:
              String(record.get("Image URL") || "") ||
              (await getWikimediaImage(
                String(record.get("Wikipedia") || ""),
                imageCache
              )) ||
              placeholderImage.src,
            year,
            dateDetails: String(record.get("Date details") || ""),
            type: String(record.get("Type of innovation") || ""),
            fields: String(record.get("Field(s)") || "")
              .split(",")
              .filter(Boolean)
              .map((f) => f.trim()),
            inventors: String(record.get("Inventor(s)") || "")
              .split(",")
              .filter(Boolean)
              .map((i) => i.trim()),
            organizations: cleanCommaList(
              String(record.get("Organization") || "")
            )
              .split(",")
              .filter(Boolean)
              .map((org) => org.trim()),
            city: String(record.get("City") || ""),
            countryHistorical: cleanCommaList(
              String(record.get("Country (historical)") || "")
            ),
            countryModern: cleanCommaList(
              String(record.get("Country (modern borders)") || "")
            ),
            // Add formatted location
            formattedLocation: formatLocation(
              String(record.get("City") || ""),
              String(record.get("Country (historical)") || "")
            ),
            wikipedia: String(record.get("Wikipedia") || ""),
            details: String(record.get("Details") || ""),
          };
        } catch (error) {
          console.error(`Error processing node ${record.get("Name")}:`, error);
          return null;
        }
      },
      CONCURRENT_REQUESTS
    );

    const validNodes = nodes.filter(Boolean);

    // Process full connection data
    const links = connectionRecords
      .filter((record) => {
        const fromId = record.get("From");
        const toId = record.get("To");
        const fromIdStr =
          Array.isArray(fromId) && fromId.length > 0
            ? fromId[0]
            : String(fromId ?? "");
        const toIdStr =
          Array.isArray(toId) && toId.length > 0 ? toId[0] : String(toId ?? "");
        return (
          fromIdStr &&
          toIdStr &&
          validNodes.some((node) => node?.id === fromIdStr) &&
          validNodes.some((node) => node?.id === toIdStr)
        );
      })
      .map((record) => {
        const fromValue = record.get("From");
        const toValue = record.get("To");
        return {
          source:
            Array.isArray(fromValue) && fromValue.length > 0
              ? fromValue[0]
              : String(fromValue ?? ""),
          target:
            Array.isArray(toValue) && toValue.length > 0
              ? toValue[0]
              : String(toValue ?? ""),
          type: String(record.get("Type") || "default"),
          details: String(record.get("Details") || ""),
        };
      });

    await saveImageCache(imageCache);

    return NextResponse.json({
      nodes: validNodes,
      links,
      _debug: {
        timing: {
          airtableFetch: 0,
          cacheLoad: 0,
          nodeProcessing: 0,
          connectionProcessing: 0,
          cacheSave: 0,
          total: 0,
        },
        counts: {
          totalRecords: innovationRecords.length,
          validNodes: validNodes.length,
          connections: links.length,
          cachedImages: Object.keys(imageCache).length,
        },
      },
    });
  } catch (error) {
    console.error("Error details:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
