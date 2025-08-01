import { NextResponse } from "next/server";
import Airtable from "airtable";
import { formatLocation, cleanCommaList } from "../../../../app/utils/location";

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID ?? ""
);

export async function GET(request: Request) {
  // Extract the id from the URL path
  const { pathname } = new URL(request.url);
  const id = pathname.split('/').pop();

  if (!id) {
    return NextResponse.json(
      { error: "Invalid ID" },
      { status: 400 }
    );
  }

  try {
    // Fetch the specific record from Airtable
    const record = await base("Innovations").find(id);

    if (!record) {
      return NextResponse.json(
        { error: "Invention not found" },
        { status: 404 }
      );
    }

    // Process the record
    const year = Number(record.get("Date"));
    
    // Return the processed node data
    const node = {
      id: record.id,
      title: String(record.get("Name") || ""),
      subtitle: String(record.get("Secondary name") || ""),
      tier: String(record.get("Tier") || ""),
      image: String(record.get("Image URL") || "") || "/placeholder-invention.jpg",
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
      organizations: cleanCommaList(String(record.get("Organization") || ""))
        .split(",")
        .filter(Boolean)
        .map((o: string) => o.trim()),
      location: formatLocation(
        String(record.get("City") || ""), 
        String(record.get("Country") || "")
      ),
      description: String(record.get("Description") || ""),
      impact: String(record.get("Impact") || ""),
      wikipedia: String(record.get("Wikipedia") || ""),
      sources: String(record.get("Sources") || ""),
    };

    const response = NextResponse.json(node);
    
    // Add more aggressive caching headers since data is static
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=31536000, stale-while-revalidate=31536000' // Cache for 1 year
    );

    return response;
  } catch (error) {
    console.error(`Error fetching invention with ID ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch invention" },
      { status: 500 }
    );
  }
} 