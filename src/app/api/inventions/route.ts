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
    inventors?: string[];
    organizations?: string[];
    city?: string;
    countryHistorical?: string;
    countryModern?: string;
    formattedLocation?: string;
    wikipedia?: string;
    details?: string;
    // Add any other fields present in your detailed nodes
  }>;
  links: Array<{
    source: string;
    target: string;
    type: string;
    details?: string;
    // Add any other fields present in your detailed links
  }>;
}

let loadedData: TechTreeData | null = null;

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const detail = searchParams.get("detail") === "true";

  try {
    const allData = await getTechTreeData();

    if (detail) {
      // For detailed requests, return all data
      return NextResponse.json(allData);
    }

    // For basic data, derive it from the full data
    const basicNodes = allData.nodes.map((node) => ({
      id: node.id,
      title: node.title,
      year: node.year,
      fields: node.fields || [], // Ensure fields is always an array
      type: node.type || "",
      // Add other minimal fields if your frontend expects them for basic view
      // e.g., image: node.image for placeholder rendering if needed
    }));

    const basicLinks = allData.links.map((link) => ({
      source: link.source,
      target: link.target,
      type: link.type,
      // Do not include link.details for basic view
    }));

    return NextResponse.json({
      nodes: basicNodes,
      links: basicLinks,
    });
  } catch (error) {
    console.error("Error in API route /api/inventions:", error);
    return NextResponse.json(
      { error: "Internal Server Error retrieving tech tree data" },
      { status: 500 }
    );
  }
}
