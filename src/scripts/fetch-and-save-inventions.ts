import Airtable from "airtable";
import { FieldSet, Record as AirtableRecord } from "airtable";
import { writeFile } from "fs/promises";
import path from "path";

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
  // Clean and split the input strings
  const cleanList = (str: string): string[] => 
    str.split(',')
       .map(item => item.trim())
       .filter(Boolean);

  const cities = cleanList(city);
  const countries = cleanList(countryHistorical);

  // If no valid data, return empty string
  if (!cities.length && !countries.length) {
    return '';
  }

  // If only countries are present, join them with semicolons
  if (!cities.length) {
    return countries.join('; ');
  }

  // If only one country, show all cities with that country
  if (countries.length === 1) {
    const country = countries[0];
    if (cities.length === 1) {
      return `${cities[0]}, ${country}`;
    } else {
      const citiesString = cities.join(', ');
      return `${citiesString}, ${country}`;
    }
  }

  // If multiple countries, only show countries
  return countries.join('; ');
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

// Main logic wrapped in an async IIFE
(async () => {
  // Conditionally import and configure dotenv only if not in production
  if (process.env.NODE_ENV !== 'production') {
    // Dynamically import dotenv to avoid issues if it's not installed in production
    try {
      const dotenv = await import('dotenv');
      dotenv.config({ path: path.resolve(process.cwd(), '.env.local') }); // Ensure it loads .env.local if you use that
      console.log("Loaded .env.local for development");
    } catch (e) {
      console.warn("dotenv not found or failed to load, proceeding without it.");
    }
  }

  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID ?? ""
  );

  async function fetchAndSaveData() {
    console.log("Starting to fetch data from Airtable...");
    try {
      // 1. Fetch all records from Airtable (detailed)
      console.time("AirtableFetch");
      const [innovationRecords, connectionRecords, laterIndependentRecords] =
        (await Promise.all([
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
        base("Later independent innovations")
          .select({
            view: "Used for deployment, do not edit directly", // Ensure this view contains ALL necessary fields
          })
          .all(),
      ])) as [
        CustomAirtableRecord[],
        CustomAirtableRecord[],
        CustomAirtableRecord[]
      ];
      console.timeEnd("AirtableFetch");
      console.log(
        `Fetched ${innovationRecords.length} innovations, ${connectionRecords.length} connections and ${laterIndependentRecords.length} later independent innovations from Airtable.`
      );

      // 2. Filter and Process Innovation Records
      console.log("Processing innovation records...");
      console.time("ProcessInnovations");
      const validInnovationRecords = innovationRecords.filter((record) => {
        const dateValue = record.get("Date");
        const year = Number(dateValue);
        return dateValue && !isNaN(year) && year !== 9999;
      });

      const processedNodes = await processBatch(
        validInnovationRecords,
        async (record) => {
          const year = Number(record.get("Date"));
          const nodeTitle = String(record.get("Name") || "");
          let imageUrl = "/placeholder-invention.jpg";

          if (nodeTitle.toLowerCase() === "stone tool") {
            imageUrl = "/tool-in-situ-being-unearthed-at-excavation_3_edit.jpg";
          } else {
            imageUrl = String(record.get("Image URL") || "/placeholder-invention.jpg");
          }

          try {
            return {
              id: record.id,
              title: String(record.get("Name") || ""),
              subtitle: String(record.get("Secondary name") || ""),
              tier: String(record.get("Tier") || ""),
              image: imageUrl,
              localImage: String(record.get("Local image") || ""),
              year,
              dateDetails: String(record.get("Date details") || ""),
              type: String(record.get("Type of innovation") || ""),
              fields: String(record.get("Field(s)") || "")
                .split(",")
                .filter(Boolean)
                .map((f) => f.trim()),
              subfields: String(record.get("Subfield(s)") || "")
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
              naturalOrigin: String(record.get("Natural origin") || ""),
              imagePosition: String(record.get("Image position") || 'center'),
              dateAdded: String(record.get("Date added") || ""),
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

      // 3. Process Later Independent Innovation Records
      //
      // These record that a technology was independently invented again, later,
      // somewhere else, in cases where the second invention does not merit a node
      // of its own. They attach to their primary innovation rather than sitting in
      // the graph, so they carry no connections.
      //
      // Two rules are enforced here:
      //   1. A specific year is required. No "antiquity", no "c. 12th century".
      //      Dropped if missing, since there is nothing to display.
      //   2. The year must be later than the primary innovation's own date — the
      //      whole point is that this is a *later* invention. Warns but keeps the
      //      record, because a violation usually means the primary innovation is
      //      misdated, which is the more interesting problem.
      // Deliberately not enforced: that the justification name a source. Nothing
      // else in the tree is held to that standard — 70% of innovations have no
      // "Date details" at all, and most connections with details carry no source
      // URL — so requiring it here would be an outlier rather than a floor.
      console.log("Processing later independent innovation records...");
      console.time("ProcessLaterIndependent");
      const nodesById = new Map(validNodes.map((node) => [node.id, node]));
      const laterIndependentWarnings: string[] = [];
      let droppedLaterIndependent = 0;

      for (const record of laterIndependentRecords) {
        const label = `Later independent innovation ${String(
          record.get("ID") ?? record.id
        )}`;

        const primaryValue = record.get("Primary innovation");
        const primaryId =
          Array.isArray(primaryValue) && primaryValue.length > 0
            ? String(primaryValue[0])
            : "";
        const node = primaryId ? nodesById.get(primaryId) : undefined;

        if (!node) {
          laterIndependentWarnings.push(
            `${label}: "Primary innovation" is empty or does not point at a dated innovation. Dropped.`
          );
          droppedLaterIndependent++;
          continue;
        }

        const dateValue = record.get("Date");
        const year = Number(dateValue);
        if (dateValue === undefined || dateValue === null || dateValue === "" || isNaN(year)) {
          laterIndependentWarnings.push(
            `${label} (${node.title}): no specific year in "Date". Dropped — rule 1 requires a year, not an era.`
          );
          droppedLaterIndependent++;
          continue;
        }

        const justification = String(record.get("Date details") || "").trim();
        const source = String(record.get("Source") || "").trim();

        if (year <= node.year) {
          laterIndependentWarnings.push(
            `${label} (${node.title}): year ${year} is not later than the innovation's own date of ${node.year}. Check whether "${node.title}" is misdated.`
          );
        }

        const city = String(record.get("City") || "");
        const countryHistorical = cleanCommaList(
          String(record.get("Country (historical)") || "")
        );

        const entry = {
          id: record.id,
          year,
          city,
          countryHistorical,
          countryModern: cleanCommaList(
            String(record.get("Country (modern borders)") || "")
          ),
          formattedLocation: formatLocation(
            city,
            String(record.get("Country (historical)") || "")
          ),
          inventors: String(record.get("Inventor(s)") || "")
            .split(",")
            .filter(Boolean)
            .map((i) => i.trim()),
          organizations: cleanCommaList(String(record.get("Organization") || ""))
            .split(",")
            .filter(Boolean)
            .map((org) => org.trim()),
          // "Parallel" for two cultures arriving at something separately,
          // "After loss" for a technology developed, lost, then redeveloped.
          type: String(record.get("Independent invention type") || ""),
          details: justification,
          detailsSource: source,
          dateAdded: String(record.get("Date added") || ""),
        };

        const target = node as typeof node & {
          laterIndependentInnovations?: Array<typeof entry>;
        };
        target.laterIndependentInnovations = [
          ...(target.laterIndependentInnovations ?? []),
          entry,
        ];
      }

      // Oldest first, so multiple entries read as a sequence.
      for (const node of validNodes) {
        const target = node as typeof node & {
          laterIndependentInnovations?: Array<{ year: number }>;
        };
        target.laterIndependentInnovations?.sort((a, b) => a.year - b.year);
      }
      console.timeEnd("ProcessLaterIndependent");
      console.log(
        `Attached ${
          laterIndependentRecords.length - droppedLaterIndependent
        } later independent innovations (${droppedLaterIndependent} dropped).`
      );
      if (laterIndependentWarnings.length > 0) {
        console.warn(
          `\n⚠️  ${laterIndependentWarnings.length} problem(s) in the Later independent innovations table:`
        );
        for (const warning of laterIndependentWarnings) {
          console.warn(`  - ${warning}`);
        }
        console.warn("");
      }

      // 4. Process Connection Records
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
            detailsSource: String(record.get("Details source") || ""),
            dateAdded: String(record.get("Date added") || ""),
            // Add any other fields for links
          };
        });
      console.timeEnd("ProcessConnections");
      console.log(`Successfully processed ${links.length} valid links.`);

      // 5. Prepare final data structure
      const finalData = {
        nodes: validNodes,
        links: links,
      };

      // 6. Write to JSON file
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

  await fetchAndSaveData();

})(); 