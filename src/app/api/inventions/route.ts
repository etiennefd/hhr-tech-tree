import { NextResponse } from "next/server";
import Airtable from "airtable";
import fs from 'fs/promises';
import path from 'path';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

// Constants
const FETCH_TIMEOUT = 5000;
const MAX_RETRIES = 2;
const CONCURRENT_REQUESTS = 10;
const CACHE_FILE = path.join(process.cwd(), 'wikipedia-image-cache.json');
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Cache management functions
async function loadImageCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf8');
    const cache = JSON.parse(data);
    
    // Filter out expired entries
    const now = Date.now();
    const validCache: Record<string, { url: string; timestamp: number }> = {};
    
    for (const [key, entry] of Object.entries(cache)) {
      if (now - entry.timestamp < CACHE_DURATION) {
        validCache[key] = entry;
      }
    }
    
    return validCache;
  } catch (error) {
    // If file doesn't exist or is invalid, return empty cache
    return {};
  }
}

async function saveImageCache(cache: Record<string, { url: string; timestamp: number }>) {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('Error saving cache:', error);
  }
}

async function fetchWithTimeout(url: string, timeout: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'TechTreeViewer/1.0 (educational project)'
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function getWikimediaImage(wikipediaUrl: string, cache: Record<string, { url: string; timestamp: number }>, retryCount = 0) {
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
      `action=query&prop=pageimages&format=json&pithumbsize=300&titles=${encodeURIComponent(title)}&origin=*`,
      FETCH_TIMEOUT
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const page = Object.values(data.query.pages)[0] as any;

    if (page?.thumbnail?.source) {
      // Update cache
      cache[title] = {
        url: page.thumbnail.source,
        timestamp: Date.now()
      };
      return page.thumbnail.source;
    }

    return null;

  } catch (error) {
    console.error(`Error fetching Wikimedia image for ${title}:`, error);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying fetch for ${title} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
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

export async function GET() {
  const startTime = Date.now();
  let timeMarkers = {
    airtableFetch: 0,
    cacheLoad: 0,
    nodeProcessing: 0,
    connectionProcessing: 0,
    cacheSave: 0
  };

  try {
    // Load cache
    console.log("Loading image cache...");
    const cacheLoadStart = Date.now();
    const imageCache = await loadImageCache();
    timeMarkers.cacheLoad = Date.now() - cacheLoadStart;
    console.log(`Cache loaded: ${Object.keys(imageCache).length} entries`);

    // Fetch records
    console.log("Starting Airtable fetch...");
    const fetchStart = Date.now();

    const [innovationRecords, connectionRecords] = await Promise.all([
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
        .all()
    ]);

    timeMarkers.airtableFetch = Date.now() - fetchStart;
    console.log(`Airtable fetch complete: ${timeMarkers.airtableFetch}ms`);

    // Filter valid records
    const validRecords = innovationRecords.filter((record) => {
      const dateValue = record.get("Date");
      if (!dateValue) {
        return false;
      }
      const year = Number(dateValue);
      if (isNaN(year)) {
        return false;
      }
      return true;
    });

    // Process nodes
    console.log("Starting node processing...");
    const nodeStart = Date.now();

    const nodes = await processBatch(
      validRecords,
      async (record) => {
        const year = Number(record.get("Date"));
        try {
          return {
            id: record.id,
            title: String(record.get("Name") || ""),
            tier: String(record.get("Tier") || ""),
            image:
              String(record.get("Image URL") || "") || 
              (await getWikimediaImage(String(record.get("Wikipedia") || ""), imageCache)) ||
              "/placeholder-invention.png",
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
            organization: String(record.get("Organization") || ""),
            city: String(record.get("City") || ""),
            countryHistorical: String(record.get("Country (historical)") || ""),
            countryModern: String(record.get("Country (modern borders)") || ""),
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

    timeMarkers.nodeProcessing = Date.now() - nodeStart;

    // Save updated cache
    console.log("Saving updated cache...");
    const cacheSaveStart = Date.now();
    await saveImageCache(imageCache);
    timeMarkers.cacheSave = Date.now() - cacheSaveStart;

    const validNodes = nodes.filter(Boolean);

    // Process connections
    console.log("Processing connections...");
    const connectionStart = Date.now();

    const validNodeIds = new Set(validNodes.map((node) => node.id));
    const links = connectionRecords
      .filter((record) => {
        const fromId = record.get("From")?.[0];
        const toId = record.get("To")?.[0];
        return (
          fromId && toId && validNodeIds.has(fromId) && validNodeIds.has(toId)
        );
      })
      .map((record) => ({
        source: record.get("From")?.[0],
        target: record.get("To")?.[0],
        type: String(record.get("Type") || "default"),
        details: String(record.get("Details") || ""),
      }));

    timeMarkers.connectionProcessing = Date.now() - connectionStart;

    // Log summary
    const totalTime = Date.now() - startTime;
    console.log("\nPerformance Summary:");
    console.log("-------------------");
    console.log(`Cache Load:         ${timeMarkers.cacheLoad}ms (${(timeMarkers.cacheLoad/totalTime*100).toFixed(1)}%)`);
    console.log(`Airtable Fetch:     ${timeMarkers.airtableFetch}ms (${(timeMarkers.airtableFetch/totalTime*100).toFixed(1)}%)`);
    console.log(`Node Processing:    ${timeMarkers.nodeProcessing}ms (${(timeMarkers.nodeProcessing/totalTime*100).toFixed(1)}%)`);
    console.log(`Cache Save:         ${timeMarkers.cacheSave}ms (${(timeMarkers.cacheSave/totalTime*100).toFixed(1)}%)`);
    console.log(`Connection Process: ${timeMarkers.connectionProcessing}ms (${(timeMarkers.connectionProcessing/totalTime*100).toFixed(1)}%)`);
    console.log(`Total Time:         ${totalTime}ms`);
    console.log("-------------------");

    return NextResponse.json({ 
      nodes: validNodes, 
      links,
      _debug: {
        timing: {
          ...timeMarkers,
          total: totalTime
        },
        counts: {
          totalRecords: innovationRecords.length,
          validNodes: validNodes.length,
          connections: links.length,
          cachedImages: Object.keys(imageCache).length
        }
      }
    });
  } catch (error) {
    console.error("Error details:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}