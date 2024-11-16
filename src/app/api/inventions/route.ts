import { NextResponse } from "next/server";
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

// Constants
const FETCH_TIMEOUT = 5000;
const MAX_RETRIES = 2;
const CONCURRENT_REQUESTS = 10; // Process 5 items at a time

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

async function getWikimediaImage(wikipediaUrl: string, retryCount = 0) {
  if (!wikipediaUrl) return null;

  // Extract title from URL like https://en.wikipedia.org/wiki/Uranium
  const title = wikipediaUrl.split("/wiki/")[1];
  if (!title) return null;

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
      return page.thumbnail.source;
    }

    return null;

  } catch (error) {
    console.error(`Error fetching Wikimedia image for ${title}:`, error);
    
    // Retry logic
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying fetch for ${title} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      // Exponential backoff: wait longer between each retry
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
      return getWikimediaImage(wikipediaUrl, retryCount + 1);
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
    nodeProcessing: 0,
    connectionProcessing: 0
  };

  try {
    // Fetch records
    console.log("Starting Airtable fetch...");
    const fetchStart = Date.now();

    const innovationRecords = await base("Innovations")
      .select({
        view: "Grid view",
        sort: [{ field: "Date", direction: "desc" }],
      })
      .all();

    const connectionRecords = await base("Connections")
      .select({
        view: "Grid view",
      })
      .all();

    timeMarkers.airtableFetch = Date.now() - fetchStart;
    console.log(`Airtable fetch complete: ${timeMarkers.airtableFetch}ms`);
    console.log(`Found ${innovationRecords.length} innovations and ${connectionRecords.length} connections`);

    // Filter valid records first
    const validRecords = innovationRecords.filter((record) => {
      const dateValue = record.get("Date");
      if (!dateValue) {
        console.log(`Skipping node "${record.get("Name")}" - missing date`);
        return false;
      }
      const year = Number(dateValue);
      if (isNaN(year)) {
        console.log(
          `Skipping node "${record.get("Name")}" - invalid date format: ${dateValue}`
        );
        return false;
      }
      return true;
    });

    // Process nodes in parallel batches
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
              String(record.get("Image URL") || "") || // Check custom image first
              (await getWikimediaImage(String(record.get("Wikipedia") || ""))) ||
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
    console.log(`Node processing complete: ${timeMarkers.nodeProcessing}ms`);

    const validNodes = nodes.filter(Boolean);
    console.log(`Successfully processed ${validNodes.length} nodes out of ${nodes.length} total`);

    // Process connections
    console.log("Starting connection processing...");
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
    console.log(`Connection processing complete: ${timeMarkers.connectionProcessing}ms`);

    // Log summary
    const totalTime = Date.now() - startTime;
    console.log("\nPerformance Summary:");
    console.log("-------------------");
    console.log(`Airtable Fetch:      ${timeMarkers.airtableFetch}ms (${(timeMarkers.airtableFetch/totalTime*100).toFixed(1)}%)`);
    console.log(`Node Processing:     ${timeMarkers.nodeProcessing}ms (${(timeMarkers.nodeProcessing/totalTime*100).toFixed(1)}%)`);
    console.log(`Connection Process:  ${timeMarkers.connectionProcessing}ms (${(timeMarkers.connectionProcessing/totalTime*100).toFixed(1)}%)`);
    console.log(`Total Time:          ${totalTime}ms`);
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
          connections: links.length
        }
      }
    });
  } catch (error) {
    console.error("Error details:", {
      message: error.message,
      statusCode: error.statusCode,
      error: error,
    });
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}