import Airtable from "airtable";
import { FieldSet, Record as AirtableRecord } from "airtable";
import { writeFile } from "fs/promises";
import path from "path";

// Load environment variables if using dotenv
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') }); // Adjust path if your .env is elsewhere

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID ?? ""
);

// Constants
const CONCURRENT_REQUESTS = 5; // Adjusted for a script that runs less frequently
const OUTPUT_FILE_PATH = path.join(
  process.cwd(),
  "src",
  "app",
  "api",
  "inventions",
  "techtree-data.json"
);

// --- Placeholder Helper Functions ---
// You NEED to import these from your actual utils/location.ts file or define them here.
// Example: import { formatLocation, cleanCommaList } from '../app/utils/location'; 
// Adjust the import path based on your project structure.

function formatLocation(city: string, countryHistorical: string): string {
  // Placeholder - replace with your actual implementation
  if (city && countryHistorical) return `${city}, ${countryHistorical}`;
  if (city) return city;
  if (countryHistorical) return countryHistorical;
  return ""; // Ensure all paths return a value
}

function cleanCommaList(listString: string): string {
  // Placeholder - replace with your actual implementation
  return listString
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .join(', '); // Example: re-joins with comma-space, ensure this matches your needs
}
// --- End Placeholder Helper Functions ---

// Helper function to process items in parallel with controlled concurrency
async function processBatch<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    console.log(`Processing batch: items ${i} to ${Math.min(i + concurrency - 1, items.length - 1)} of ${items.length}`);
    const batchResults = await Promise.all(batch.map(processFn));
    results.push(...batchResults);
  }
  return results;
}

type CustomAirtableRecord = AirtableRecord<FieldSet>;

async function fetchAndSaveData() {
  console.log("Starting to fetch data from Airtable...");
  try {
    // 1. Fetch all records from Airtable (detailed)
    console.time("AirtableFetch");
    const [innovationRecords, connectionRecords] = (await Promise.all([
      base("Innovations")
        .select({
          view: "Used for deployment, do not edit directly", // Ensure this view contains ALL necessary fields
          sort: [{ field: "Date", direction: "desc" }],
        })
        .all(),
      base("Connections")
        .select({
          view: "Used for deployment, do not edit directly", // Ensure this view contains ALL necessary fields
        })
        .all(),
    ])) as [CustomAirtableRecord[], CustomAirtableRecord[]];
    console.timeEnd("AirtableFetch");
    console.log(
      `Fetched ${innovationRecords.length} innovations and ${connectionRecords.length} connections from Airtable.`
    );

    // 2. Filter and Process Innovation Records
    console.log("Processing innovation records...");
    console.time("ProcessInnovations");
    const validInnovationRecords = innovationRecords.filter((record) => {
      const dateValue = record.get("Date");
      return dateValue && !isNaN(Number(dateValue));
    });

    const processedNodes = await processBatch(
      validInnovationRecords,
      async (record) => {
        const year = Number(record.get("Date"));
        const nodeTitle = String(record.get("Name") || "");
        let imageUrl = "/placeholder-invention.png";

        if (nodeTitle.toLowerCase() === "stone tool") {
          imageUrl = "/tool-in-situ-being-unearthed-at-excavation_3_edit.jpg";
        } else {
          imageUrl = String(record.get("Image URL") || "/placeholder-invention.png");
        }

        try {
          return {
            id: record.id,
            title: String(record.get("Name") || ""),
            subtitle: String(record.get("Secondary name") || ""),
            tier: String(record.get("Tier") || ""),
            image: imageUrl,
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
              .split(",") // This might need adjustment if cleanCommaList already returns an array
              .filter(Boolean)
              .map((org) => org.trim()),
            city: String(record.get("City") || ""),
            countryHistorical: cleanCommaList(
              String(record.get("Country (historical)") || "")
            ),
            countryModern: cleanCommaList(
              String(record.get("Country (modern borders)") || "")
            ),
            formattedLocation: formatLocation(
              String(record.get("City") || ""),
              String(record.get("Country (historical)") || "")
            ),
            wikipedia: String(record.get("Wikipedia") || ""),
            details: String(record.get("Details") || ""),
            // Add any other fields that are part of your detailed node structure
          };
        } catch (error) {
          console.error(`Error processing node ${record.get("Name")}:`, error);
          return null; // Allows batch processing to continue
        }
      },
      CONCURRENT_REQUESTS
    );
    console.timeEnd("ProcessInnovations");

    const validNodes = processedNodes.filter(Boolean) as Array<NonNullable<typeof processedNodes[0]>>;
    console.log(`Successfully processed ${validNodes.length} valid nodes.`);

    // 3. Process Connection Records
    console.log("Processing connection records...");
    console.time("ProcessConnections");
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
        
        // Ensure linked nodes exist in our processed validNodes set
        return (
          fromIdStr &&
          toIdStr &&
          validNodes.some((node) => node.id === fromIdStr) &&
          validNodes.some((node) => node.id === toIdStr)
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
          // Add any other fields for links
        };
      });
    console.timeEnd("ProcessConnections");
    console.log(`Successfully processed ${links.length} valid links.`);

    // 4. Prepare final data structure
    const finalData = {
      nodes: validNodes,
      links: links,
    };

    // 5. Write to JSON file
    console.log(`Writing data to ${OUTPUT_FILE_PATH}...`);
    console.time("WriteFile");
    await writeFile(OUTPUT_FILE_PATH, JSON.stringify(finalData, null, 2));
    console.timeEnd("WriteFile");
    console.log("Successfully fetched and saved data!");

  } catch (error) {
    console.error("Failed to fetch and save Airtable data:", error);
    process.exit(1); // Exit with error code
  }
}

fetchAndSaveData(); 