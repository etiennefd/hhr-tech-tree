import { NextResponse } from "next/server";
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

async function getWikimediaImage(wikipediaUrl: string) {
  if (!wikipediaUrl) return null;

  // Extract title from URL like https://en.wikipedia.org/wiki/Uranium
  const title = wikipediaUrl.split("/wiki/")[1];

  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?` +
        `action=query&prop=pageimages&format=json&pithumbsize=300&titles=${title}&origin=*`
    );

    const data = await response.json();
    const page = Object.values(data.query.pages)[0] as any;

    if (page?.thumbnail?.source) {
      return page.thumbnail.source;
    }

    return null;
  } catch (error) {
    console.error("Error fetching Wikimedia image:", error);
    return null;
  }
}

export async function GET() {
  try {
    const innovationRecords = await base("Innovations")
      .select({
        view: "Grid view",
        maxRecords: 700,
        sort: [{ field: "Date", direction: "desc" }],
      })
      .all();

    const connectionRecords = await base("Connections")
      .select({
        view: "Grid view",
        maxRecords: 700,
      })
      .all();

    console.log("Total records:", innovationRecords.length);

    const nodes = (
      await Promise.all(
        innovationRecords
          .filter((record) => {
            const dateValue = record.get("Date");
            if (!dateValue) {
              console.log(
                `Skipping node "${record.get("Name")}" - missing date`
              );
              return false;
            }
            const year = Number(dateValue);
            if (isNaN(year)) {
              console.log(
                `Skipping node "${record.get(
                  "Name"
                )}" - invalid date format: ${dateValue}`
              );
              return false;
            }
            return true;
          })
          .map(async (record) => {
            const year = Number(record.get("Date"));
            return {
              id: record.id,
              title: String(record.get("Name") || ""),
              tier: String(record.get("Tier") || ""),
              image:
                String(record.get("Image URL") || "") || // Check custom image first
                (await getWikimediaImage(
                  String(record.get("Wikipedia") || "")
                )) ||
                "/api/placeholder/100/100",
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
              countryHistorical: String(
                record.get("Country (historical)") || ""
              ),
              countryModern: String(
                record.get("Country (modern borders)") || ""
              ),
              wikipedia: String(record.get("Wikipedia") || ""),
              details: String(record.get("Details") || ""),
            };
          })
      )
    ).filter(Boolean); // Remove null entries

    console.log("Nodes after filtering:", nodes.length);
    if (nodes.length > 0) {
      console.log("Date range:", {
        min: Math.min(...nodes.map(n => n.year)),
        max: Math.max(...nodes.map(n => n.year))
      });
    }

    // Create a Set of valid node IDs for quick lookup
    const validNodeIds = new Set(nodes.map((node) => node.id));

    // Process connections
    const links = connectionRecords
      .filter((record) => {
        const fromId = record.get("From")?.[0]; // Airtable returns linked records as arrays
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

    console.log("Sample connections:", links.slice(0, 5)); // Show first 5 connections
    console.log(
      "Connection types found:",
      new Set(links.map((link) => link.type))
    ); // Show unique types
    console.log("Total connections:", links.length);

    return NextResponse.json({ nodes, links });
  } catch (error) {
    console.error("Error details:", {
      message: error.message,
      statusCode: error.statusCode,
      error: error,
    });
  }
}
