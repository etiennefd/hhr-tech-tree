import { NextResponse } from "next/server";
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

export async function GET() {
  try {
    const innovationRecords = await base("Innovations")
      .select({
        view: "Grid view",
        maxRecords: 500,
        sort: [{ field: "Date", direction: "desc" }],
      })
      .all();

      const connectionRecords = await base("Connections")
      .select({
        view: "Grid view",
        maxRecords: 500,
      })
      .all();

      const nodes = innovationRecords.map((record) => ({
        id: record.id,
        title: String(record.get("Name") || ""),
        tier: String(record.get("Tier") || ""),
        image: "/api/placeholder/100/100",
        year: Number(record.get("Date")) || 0,
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
        countryHistorical: String(record.get("Country (historical)") || ""),
        countryModern: String(record.get("Country (modern borders)") || ""),
        wikipedia: String(record.get("Wikipedia") || ""),
        details: String(record.get("Details") || ""),
      }));

    // Create a Set of valid node IDs for quick lookup
    const validNodeIds = new Set(nodes.map((node) => node.id));

    // Process connections
    const links = connectionRecords
      .filter((record) => {
        const fromId = record.get("From")?.[0]; // Airtable returns linked records as arrays
        const toId = record.get("To")?.[0];
        return (
          fromId && 
          toId && 
          validNodeIds.has(fromId) && 
          validNodeIds.has(toId)
        );
      })
      .map((record) => ({
        source: record.get("From")?.[0],
        target: record.get("To")?.[0],
        type: String(record.get("Type") || "default"),
        details: String(record.get("Details") || ""),
      }));

      console.log('Sample connections:', links.slice(0, 5)); // Show first 5 connections
      console.log('Connection types found:', new Set(links.map(link => link.type))); // Show unique types
      console.log('Total connections:', links.length);

    return NextResponse.json({ nodes, links });
  } catch (error) {
    console.error("Error details:", {
      message: error.message,
      statusCode: error.statusCode,
      error: error,
    });
  }
}