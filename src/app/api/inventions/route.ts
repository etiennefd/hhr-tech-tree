import { NextResponse } from "next/server";
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

// Constants for fetch configuration
const FETCH_TIMEOUT = 5000; // 5 seconds
const MAX_RETRIES = 2;

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

export async function GET() {
  try {
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

    console.log("Total records:", innovationRecords.length);

    // Process nodes with rate limiting
    const nodes = await Promise.all(
      innovationRecords
        .filter((record) => {
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
        })
        .map(async (record, index) => {
          // Add a small delay between requests to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, index * 100));

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
        })
    );

    // Rest of your code remains the same...
    const validNodes = nodes.filter(Boolean);
    console.log("Nodes after filtering:", validNodes.length);
    if (validNodes.length > 0) {
      console.log("Date range:", {
        min: Math.min(...validNodes.map(n => n.year)),
        max: Math.max(...validNodes.map(n => n.year))
      });
    }

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

    console.log("Sample connections:", links.slice(0, 5));
    console.log(
      "Connection types found:",
      new Set(links.map((link) => link.type))
    );
    console.log("Total connections:", links.length);

    return NextResponse.json({ nodes: validNodes, links });
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