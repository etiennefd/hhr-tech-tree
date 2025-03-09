import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "wikipedia-image-cache.json");

type ImageCacheEntry = {
  url: string;
  timestamp: number;
  credits?: {
    title: string;
    artist?: string;
    license?: string;
    descriptionUrl?: string;
  };
};

export async function GET() {
  try {
    // Load the image cache
    const data = await fs.readFile(CACHE_FILE, "utf8");
    const cache: Record<string, ImageCacheEntry> = JSON.parse(data);
    
    // Extract only entries with credits
    const imageCredits = Object.entries(cache)
      .filter(([, entry]) => entry.credits)
      .map(([key, entry]) => ({
        title: key,
        imageUrl: entry.url,
        credits: entry.credits
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
    
    return NextResponse.json({ imageCredits });
  } catch (error) {
    console.error("Error loading image credits:", error);
    return NextResponse.json(
      { error: "Failed to load image credits" },
      { status: 500 }
    );
  }
} 