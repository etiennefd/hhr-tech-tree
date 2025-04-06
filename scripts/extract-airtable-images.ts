import fs from "fs/promises";
import path from "path";
import Airtable from "airtable";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Log for debugging
console.log("API Key available:", !!process.env.AIRTABLE_API_KEY);
console.log("Base ID available:", !!process.env.AIRTABLE_BASE_ID);

// Constants
const FETCH_TIMEOUT = 5000;
const MAX_RETRIES = 3;
const OUTPUT_FILE = path.join(process.cwd(), "wikipedia-images.txt");
const CACHE_FILE = path.join(process.cwd(), "wikipedia-image-cache.json");

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID || ""
);

// Define a record type to store tech data
interface TechRecord {
  id: string;
  name: string;
  wikipediaUrl: string;
  imageUrl?: string;
}

/**
 * Fetch with timeout to prevent hanging requests
 */
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

/**
 * Load the image cache from disk
 */
async function loadImageCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading cache, creating new one:", error);
    return {};
  }
}

/**
 * Save the image cache to disk
 */
async function saveImageCache(cache: Record<string, any>) {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
    console.log(`Cache saved with ${Object.keys(cache).length} entries`);
  } catch (error) {
    console.error("Error saving cache:", error);
  }
}

/**
 * Get the Wikimedia image URL for a Wikipedia page
 */
async function getWikimediaImage(
  wikipediaUrl: string,
  cache: Record<string, any>,
  retryCount = 0
) {
  if (!wikipediaUrl) return null;

  // Extract title from URL
  const titleMatch = wikipediaUrl.split("/wiki/")[1];
  if (!titleMatch) return null;
  
  // Handle anchor links in the URL
  const title = titleMatch.split("#")[0];

  // Check cache first
  if (cache[title] && cache[title].url) {
    console.log(`Cache hit for ${title}`);
    return { 
      url: cache[title].url,
      fromCache: true
    };
  }

  console.log(`Fetching image for ${title}...`);

  try {
    // First, get the image URL (use a larger thumbnail size than the viewer)
    const response = await fetchWithTimeout(
      `https://en.wikipedia.org/w/api.php?` +
        `action=query&prop=pageimages&format=json&pithumbsize=500&titles=${encodeURIComponent(
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
      const imageUrl = page.thumbnail.source;
      
      // Update cache with image URL
      cache[title] = {
        url: imageUrl,
        timestamp: Date.now()
      };
      
      return { 
        url: imageUrl,
        fromCache: false
      };
    }

    console.log(`No image found for ${title}`);
    return null;
  } catch (error) {
    console.error(`Error fetching image for ${title}:`, error);

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

/**
 * Read tech records from Airtable
 */
async function fetchTechRecordsFromAirtable(): Promise<TechRecord[]> {
  console.log("Fetching tech records from Airtable...");
  
  try {
    // Get records from Airtable that have a Wikipedia URL but no Image URL
    const records = await base("Innovations")
      .select({
        view: "Used for deployment, do not edit directly",
        filterByFormula: "AND({Wikipedia}, NOT({Image URL}))",
      })
      .all();
    
    console.log(`Found ${records.length} records that need image URLs`);
    
    // Convert to TechRecord format
    return records.map(record => ({
      id: record.id,
      name: String(record.get("Name") || ""),
      wikipediaUrl: String(record.get("Wikipedia") || ""),
      imageUrl: undefined
    }));
  } catch (error) {
    console.error("Error fetching records from Airtable:", error);
    return [];
  }
}

/**
 * Fetch All Records (alternative if filterByFormula doesn't work)
 */
async function fetchAllTechRecordsFromAirtable(): Promise<TechRecord[]> {
  console.log("Fetching all tech records from Airtable...");
  
  try {
    // Get all records from Airtable
    const records = await base("Innovations")
      .select({
        view: "Used for deployment, do not edit directly",
      })
      .all();
    
    console.log(`Found ${records.length} total records`);
    
    // Filter to only include records with Wikipedia URL but no Image URL
    const filteredRecords = records.filter(record => {
      const wikipediaUrl = record.get("Wikipedia");
      const imageUrl = record.get("Image URL");
      return wikipediaUrl && !imageUrl;
    });
    
    console.log(`Filtered to ${filteredRecords.length} records that need image URLs`);
    
    // Convert to TechRecord format
    return filteredRecords.map(record => ({
      id: record.id,
      name: String(record.get("Name") || ""),
      wikipediaUrl: String(record.get("Wikipedia") || ""),
      imageUrl: undefined
    }));
  } catch (error) {
    console.error("Error fetching records from Airtable:", error);
    return [];
  }
}

/**
 * Main function to extract images and save to text file
 */
async function extractAirtableImages() {
  console.log("Welcome to the Airtable Wikipedia Image Extractor");
  console.log("This script will read from Airtable and create a text file with image URLs.");
  console.log("-----------------------------------------------------------------------");
  
  // Load cache
  const imageCache = await loadImageCache();
  
  // Fetch tech records from Airtable
  let techRecords: TechRecord[] = [];
  
  try {
    techRecords = await fetchTechRecordsFromAirtable();
  } catch (error) {
    console.error("Error with filtered fetch, trying alternative method:", error);
    techRecords = await fetchAllTechRecordsFromAirtable();
  }
  
  if (techRecords.length === 0) {
    console.log("No records found that need image URLs. Exiting.");
    return;
  }
  
  console.log(`Processing ${techRecords.length} tech records...`);
  
  // Process each tech record to get its image
  let processedCount = 0;
  for (const tech of techRecords) {
    processedCount++;
    console.log(`[${processedCount}/${techRecords.length}] Processing "${tech.name}"...`);
    
    const imageResult = await getWikimediaImage(tech.wikipediaUrl, imageCache);
    
    if (imageResult?.url) {
      tech.imageUrl = imageResult.url;
      console.log(`Found image URL: ${imageResult.url}`);
    } else {
      console.log(`No image found for "${tech.name}"`);
    }
    
    // Save cache after each item to avoid losing progress
    if (processedCount % 5 === 0) {
      await saveImageCache(imageCache);
    }
  }
  
  // Sort records alphabetically by name
  techRecords.sort((a, b) => a.name.localeCompare(b.name));
  
  // Generate output content
  const outputLines = [
    "# Wikipedia Image URLs for Airtable Import",
    "# Format: Tech Name | Airtable ID | Image URL",
    "# Generated on " + new Date().toISOString(),
    "# ------------------------------------------------------------",
    ""
  ];
  
  for (const tech of techRecords) {
    const line = tech.imageUrl 
      ? `${tech.name} | ${tech.id} | ${tech.imageUrl}`
      : `${tech.name} | ${tech.id} | NO_IMAGE_FOUND`;
    outputLines.push(line);
  }
  
  // Write to file
  const outputContent = outputLines.join('\n');
  await fs.writeFile(OUTPUT_FILE, outputContent, 'utf8');
  
  // Final stats
  const successCount = techRecords.filter(t => t.imageUrl).length;
  const failCount = techRecords.length - successCount;
  
  console.log("\n-----------------------------------------------------------------------");
  console.log(`Output saved to: ${OUTPUT_FILE}`);
  console.log(`Total records: ${techRecords.length}`);
  console.log(`Images found: ${successCount}`);
  console.log(`Images not found: ${failCount}`);
  console.log("-----------------------------------------------------------------------");
  console.log("You can now copy the image URLs from this file into your Airtable records.");
  
  // Save cache one last time
  await saveImageCache(imageCache);
}

// Run the script
extractAirtableImages().catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
}); 