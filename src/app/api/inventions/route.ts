import { NextResponse } from "next/server";
import Airtable from "airtable";
import { formatLocation, cleanCommaList } from "../../utils/location";
import { FieldSet, Record as AirtableRecord } from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID ?? ""
);

// Constants
const CONCURRENT_REQUESTS = 10;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Cache storage
let basicDataCache: { data: any | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};
let detailedDataCache: { data: any | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

// Helper function to process items in parallel with controlled concurrency
async function processBatch<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processFn));
    results.push(...batchResults);
  }
  return results;
}

// Update the type to extend Airtable's Record type
type CustomAirtableRecord = AirtableRecord<FieldSet>;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const detail = searchParams.get("detail") === "true";
  const now = Date.now();

  // Try to serve from cache first
  if (detail) {
    if (
      detailedDataCache.data &&
      now - detailedDataCache.timestamp < CACHE_DURATION_MS
    ) {
      console.log("[API Cache] Serving detailed data from cache.");
      return NextResponse.json(detailedDataCache.data);
    }
  } else {
    if (
      basicDataCache.data &&
      now - basicDataCache.timestamp < CACHE_DURATION_MS
    ) {
      console.log("[API Cache] Serving basic data from cache.");
      return NextResponse.json(basicDataCache.data);
    }
  }

  console.log(
    `[API Cache] ${
      detail ? "Detailed" : "Basic"
    } data cache miss or expired. Fetching fresh data from Airtable.`
  );

  try {
    let innovationRecords: CustomAirtableRecord[];
    let connectionRecords: CustomAirtableRecord[];

    if (!detail) {
      // Fetch only necessary fields for basic data
      console.log("[API Airtable] Fetching basic data fields from Airtable.");
      [innovationRecords, connectionRecords] = (await Promise.all([
        base("Innovations")
          .select({
            view: "Used for deployment, do not edit directly",
            sort: [{ field: "Date", direction: "desc" }],
            fields: ["Name", "Date", "Field(s)", "Type of innovation"], // Minimal fields for basic nodes
          })
          .all(),
        base("Connections")
          .select({
            view: "Used for deployment, do not edit directly",
            fields: ["From", "To", "Type"], // Minimal fields for basic links
          })
          .all(),
      ])) as [CustomAirtableRecord[], CustomAirtableRecord[]];
    } else {
      // Fetch all fields for detailed data
      console.log("[API Airtable] Fetching all fields for detailed data from Airtable.");
      [innovationRecords, connectionRecords] = (await Promise.all([
        base("Innovations")
          .select({
            view: "Used for deployment, do not edit directly",
            sort: [{ field: "Date", direction: "desc" }],
          })
          .all(),
        base("Connections")
          .select({
            view: "Used for deployment, do not edit directly",
          })
          .all(),
      ])) as [CustomAirtableRecord[], CustomAirtableRecord[]];
    }

    const validRecords = innovationRecords.filter((record) => {
      const dateValue = record.get("Date");
      return dateValue && !isNaN(Number(dateValue));
    });

    // For basic data, return minimal information needed for initial render
    if (!detail) {
      const basicNodes = validRecords.map((record) => ({
        id: record.id,
        title: String(record.get("Name") || ""),
        year: Number(record.get("Date")),
        fields: String(record.get("Field(s)") || "")
          .split(",")
          .filter(Boolean)
          .map((f) => f.trim()),
        type: String(record.get("Type of innovation") || ""),
      }));

      const basicLinks = connectionRecords
        .filter((record) => {
          const fromId = record.get("From");
          const toId = record.get("To");
          return fromId && toId;
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
          };
        });
      
      const responseData = {
        nodes: basicNodes,
        links: basicLinks,
      };
      basicDataCache = { data: responseData, timestamp: now };
      console.log("[API Cache] Basic data cached.");
      return NextResponse.json(responseData);
    }

    // For detailed data, process everything as before
    console.log("[API Processing] Processing detailed nodes.");
    const nodes = await processBatch(
      validRecords,
      async (record) => {
        const year = Number(record.get("Date"));
        const nodeTitle = String(record.get("Name") || "");
        let imageUrl = "/placeholder-invention.png";

        if (nodeTitle.toLowerCase() === "stone tool") {
          imageUrl = "/tool-in-situ-being-unearthed-at-excavation_3_edit.jpg";
        } else {
          imageUrl = String(record.get("Image URL") || "/placeholder-invention.png");
        }

        try {
          return {
            id: record.id,
            title: String(record.get("Name") || ""),
            subtitle: String(record.get("Secondary name") || ""),
            tier: String(record.get("Tier") || ""),
            image: imageUrl,
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
            organizations: cleanCommaList(
              String(record.get("Organization") || "")
            )
              .split(",")
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
          };
        } catch (error) {
          console.error(`Error processing node ${record.get("Name")}:`, error);
          return null;
        }
      },
      CONCURRENT_REQUESTS
    );

    const validNodes = nodes.filter(Boolean);

    // Process full connection data
    console.log("[API Processing] Processing detailed connections.");
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
        return (
          fromIdStr &&
          toIdStr &&
          validNodes.some((node) => node?.id === fromIdStr) &&
          validNodes.some((node) => node?.id === toIdStr)
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
        };
      });

    const responseData = {
      nodes: validNodes,
      links,
      _debug: {
        counts: {
          totalRecords: innovationRecords.length, // This will reflect the number of records fetched (selective or all)
          validNodes: validNodes.length,
          connections: links.length,
        },
      },
    };
    detailedDataCache = { data: responseData, timestamp: now };
    console.log("[API Cache] Detailed data cached.");
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error details:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
