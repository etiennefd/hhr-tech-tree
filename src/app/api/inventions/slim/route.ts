import { getSlimTechTreeData, respondWith } from "../data";

// What the tree needs for first paint: layout, node cards, search, filters.
export async function GET() {
  return respondWith("/api/inventions/slim", getSlimTechTreeData);
}
