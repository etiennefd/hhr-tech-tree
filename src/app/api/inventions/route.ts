import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
// Removed Airtable and related imports as we are reading from a local file
// import Airtable from "airtable";
// import { formatLocation, cleanCommaList } from "../../utils/location";
// import { FieldSet, Record as AirtableRecord } from "airtable";

// Define the path to the pre-generated JSON data file
const DATA_FILE_PATH = path.join(
  process.cwd(),
  "src",
  "app",
  "api",
  "inventions",
  "techtree-data.json"
);

// Type for the structure of the data in techtree-data.json
// This should match the output of your fetch-and-save-inventions.ts script
interface TechTreeData {
  nodes: Array<{
    id: string;
    title: string;
    subtitle?: string;
    tier?: string;
    image?: string;
    year: number;
    dateDetails?: string;
    type?: string;
    fields: string[];
    subfields?: string[];
    inventors?: string[];
    organizations?: string[];
    city?: string;
    countryHistorical?: string;
    countryModern?: string;
    formattedLocation?: string;
    wikipedia?: string;
    details?: string;
    independentInnovations?: Array<{
      id: string;
      year: number;
      formattedLocation?: string;
      inventors?: string[];
      organizations?: string[];
      details?: string;
      detailsSource?: string;
    }>;
    // Add any other fields present in your detailed nodes
  }>;
  links: Array<{
    source: string;
    target: string;
    type: string;
    details?: string;
    detailsSource?: string;
    // Add any other fields present in your detailed links
  }>;
}

let loadedData: TechTreeData | null = null;
const CACHE_CONTROL_HEADER =
  process.env.NODE_ENV === "production"
    ? "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
    : "no-store";

async function getTechTreeData(): Promise<TechTreeData> {
  if (loadedData && process.env.NODE_ENV === 'production') {
    // In production, once loaded, reuse the data in memory
    return loadedData;
  }
  try {
    const fileContents = await readFile(DATA_FILE_PATH, "utf-8");
    const data = JSON.parse(fileContents) as TechTreeData;
    if (process.env.NODE_ENV === 'production') {
      loadedData = data; // Cache in memory for production
    }
    return data;
  } catch (error) {
    console.error("Failed to read or parse techtree-data.json:", error);
    throw new Error("Could not load tech tree data.");
  }
}

// The response doesn't depend on the request (including query params), and
// the data file only changes at build time, so the in-memory copy is never
// invalidated in production.
export async function GET() {
  try {
    const data = await getTechTreeData();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": CACHE_CONTROL_HEADER,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/inventions:", error);
    return NextResponse.json(
      { error: "Failed to fetch tech tree data" },
      { status: 500 }
    );
  }
}
