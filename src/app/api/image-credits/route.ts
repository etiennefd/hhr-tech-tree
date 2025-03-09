import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import Airtable from "airtable";

const CACHE_FILE = path.join(process.cwd(), "wikipedia-image-cache.json");

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID ?? ""
);

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
    
    // Fetch tech tree nodes from Airtable to get proper names
    const innovationRecords = await base("Innovations")
      .select({
        view: "Used for deployment, do not edit directly",
        fields: ["Name", "Wikipedia"]
      })
      .all();
    
    // Create a mapping from Wikipedia URL to tech tree node name
    const wikiToNodeName = new Map();
    innovationRecords.forEach(record => {
      const wikipediaUrl = record.get("Wikipedia") as string;
      const nodeName = record.get("Name") as string;
      
      if (wikipediaUrl) {
        // Extract the title part from the Wikipedia URL
        const titleMatch = wikipediaUrl.match(/\/wiki\/([^#]+)(#.*)?$/);
        if (titleMatch) {
          const wikiTitle = titleMatch[1];
          wikiToNodeName.set(wikiTitle, nodeName);
          
          // Also handle the case with section
          if (titleMatch[2]) {
            wikiToNodeName.set(wikiTitle + titleMatch[2], nodeName);
          }
        }
      }
    });
    
    // Extract only entries with credits and match with tech tree node names
    const imageCredits = Object.entries(cache)
      .filter(([, entry]) => entry.credits)
      .map(([key, entry]) => ({
        title: key,
        nodeName: wikiToNodeName.get(key) || key.replace(/_/g, ' '),
        imageUrl: entry.url,
        credits: entry.credits
      }))
      .sort((a, b) => a.nodeName.localeCompare(b.nodeName));
    
    return NextResponse.json({ imageCredits });
  } catch (error) {
    console.error("Error loading image credits:", error);
    return NextResponse.json(
      { error: "Failed to load image credits" },
      { status: 500 }
    );
  }
} 