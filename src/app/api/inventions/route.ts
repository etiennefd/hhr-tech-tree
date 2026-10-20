import { getTechTreeData, respondWith } from "./data";

// The complete data set. The viewer loads /api/inventions/slim and
// /api/inventions/details instead; this stays for anything else that wants
// everything in one response.
export async function GET() {
  return respondWith("/api/inventions", getTechTreeData);
}
