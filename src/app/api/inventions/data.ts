import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  TechTreeData,
  TechTreeDetails,
  toDetailsData,
  toSlimData,
} from "@/utils/techTreeData";

// Shared by the /api/inventions routes. The full file is produced at build
// time by src/scripts/fetch-and-save-inventions.ts; the slim and details
// payloads are derived from it here rather than written as separate files, so
// they can't drift from it.

// Define the path to the pre-generated JSON data file
const DATA_FILE_PATH = path.join(
  process.cwd(),
  "src",
  "app",
  "api",
  "inventions",
  "techtree-data.json"
);

const isProduction = process.env.NODE_ENV === "production";

const CACHE_CONTROL_HEADER = isProduction
  ? "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
  : "no-store";

// In production the data file only changes at build time, so each view is
// computed once per instance and reused.
let loadedData: TechTreeData | null = null;
let slimData: TechTreeData | null = null;
let detailsData: TechTreeDetails | null = null;

export async function getTechTreeData(): Promise<TechTreeData> {
  if (loadedData && isProduction) return loadedData;
  try {
    const fileContents = await readFile(DATA_FILE_PATH, "utf-8");
    const data = JSON.parse(fileContents) as TechTreeData;
    if (isProduction) loadedData = data;
    return data;
  } catch (error) {
    console.error("Failed to read or parse techtree-data.json:", error);
    throw new Error("Could not load tech tree data.");
  }
}

export async function getSlimTechTreeData(): Promise<TechTreeData> {
  if (slimData && isProduction) return slimData;
  const data = toSlimData(await getTechTreeData());
  if (isProduction) slimData = data;
  return data;
}

export async function getTechTreeDetails(): Promise<TechTreeDetails> {
  if (detailsData && isProduction) return detailsData;
  const data = toDetailsData(await getTechTreeData());
  if (isProduction) detailsData = data;
  return data;
}

// The responses don't depend on the request (including query params).
export async function respondWith(label: string, load: () => Promise<unknown>) {
  try {
    return NextResponse.json(await load(), {
      headers: { "Cache-Control": CACHE_CONTROL_HEADER },
    });
  } catch (error) {
    console.error(`Error in GET ${label}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch tech tree data" },
      { status: 500 }
    );
  }
}
