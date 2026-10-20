import { getTechTreeDetails, respondWith } from "../data";

// Tooltip-only fields, fetched after first paint.
export async function GET() {
  return respondWith("/api/inventions/details", getTechTreeDetails);
}
