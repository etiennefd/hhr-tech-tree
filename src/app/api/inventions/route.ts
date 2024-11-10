import { NextResponse } from "next/server";
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

export async function GET() {
  try {
    const records = await base("Innovations") // Replace with your table name
      .select({
        view: "Grid view",
        maxRecords: 500,
        sort: [{ field: "Date", direction: "desc" }],
      })
      .all();


    const nodes = records.map((record) => {

      // Return the node object
      return {
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
        firstInstance: String(record.get("Name of first instance") || ""),
        otherNames: String(record.get("Other names") || ""),
        details: String(record.get("Details") || ""),
        serendipity: String(record.get("Serendipity") || ""),
        connections2: String(record.get("Connections 2") || ""),
        connectionsFrom: String(record.get("From (from Connections 2)") || "")
          .split(",")
          .filter(Boolean)
          .map((c) => c.trim()),
        connections: String(record.get("Connections") || ""),
        connectionsTo: String(record.get("To (from Connections)") || "")
          .split(",")
          .filter(Boolean)
          .map((c) => c.trim()),
        otherLinks: String(record.get("Other links") || ""),
        notes: String(record.get("Notes for later") || ""),
      };
    });

    // Process connections
    // Create a Set of valid node IDs for quick lookup
    const validNodeIds = new Set(nodes.map((node) => node.id));

    const links = records
      .filter(
        (record) =>
          record.get("From (from Connections 2)") ||
          record.get("To (from Connections)")
      )
      .flatMap((record) => {
        const recordId = record.id;
        const fromConnections = String(
          record.get("From (from Connections 2)") || ""
        );
        const toConnections = String(record.get("To (from Connections)") || "");

        const fromLinks = fromConnections
          .split(",")
          .filter(Boolean)
          .map((id) => id.trim())
          .filter((targetId) => validNodeIds.has(targetId))
          .map((targetId) => ({
            source: targetId,
            target: recordId,
            description: "",
          }));

        const toLinks = toConnections
          .split(",")
          .filter(Boolean)
          .map((id) => id.trim())
          .filter((targetId) => validNodeIds.has(targetId))
          .map((targetId) => ({
            source: recordId,
            target: targetId,
            description: "",
          }));

        const allLinks = [...fromLinks, ...toLinks];
        return allLinks;
      });

    return NextResponse.json({ nodes, links });
  } catch (error) {
    console.error("Error details:", {
      message: error.message,
      statusCode: error.statusCode,
      error: error,
    });
  }
}
