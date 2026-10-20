import type { TechNode } from "@/types/tech-node";
import type { TechTreeLink } from "@/types/techTreeTypes";

// The full data set is ~2.8MB, but laying out, searching and filtering the
// tree only needs a fraction of it. The initial payload carries just that;
// the fields below are only read by tooltips (and search over `details`) and
// arrive in a second request after first paint.

const NODE_DETAIL_FIELDS = [
  "dateDetails",
  "formattedLocation",
  "details",
  "naturalOrigin",
  "independentInnovations",
  "wikipedia",
] as const;

export type NodeDetails = Pick<TechNode, (typeof NODE_DETAIL_FIELDS)[number]>;
export type LinkDetails = Pick<TechTreeLink, "details" | "detailsSource">;

export interface TechTreeData {
  nodes: TechNode[];
  links: TechTreeLink[];
}

export interface TechTreeDetails {
  // Keyed by node id; nodes with no detail fields are left out
  nodes: Record<string, NodeDetails>;
  // Keyed by linkDetailsKey(link); links with no details are left out
  links: Record<string, LinkDetails>;
}

// Fields the initial render reads: layout (title, subtitle, fields), the node
// card (images), search (names, fields) and filters (locations).
const SLIM_NODE_FIELDS = [
  "id",
  "title",
  "subtitle",
  "year",
  "type",
  "fields",
  "subfields",
  "inventors",
  "organizations",
  "city",
  "countryHistorical",
  "countryModern",
  "localImage",
  "imagePosition",
] as const;

export const linkDetailsKey = (link: Pick<TechTreeLink, "source" | "target" | "type">) =>
  `${link.source}|${link.target}|${link.type}`;

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

export function toSlimData(data: TechTreeData): TechTreeData {
  return {
    nodes: data.nodes.map((node) => {
      const slim: Record<string, unknown> = { fields: node.fields ?? [] };
      for (const field of SLIM_NODE_FIELDS) {
        const value = node[field];
        if (field === "fields" || isEmpty(value)) continue;
        // "center" is what the client falls back to anyway
        if (field === "imagePosition" && value === "center") continue;
        slim[field] = value;
      }
      // The remote URL is only a fallback for the few nodes without a local
      // copy, and at ~130 bytes each it was the largest field in the payload.
      if (!node.localImage && !isEmpty(node.image)) slim.image = node.image;
      return slim as unknown as TechNode;
    }),
    links: data.links.map(({ source, target, type }) => ({ source, target, type })),
  };
}

export function toDetailsData(data: TechTreeData): TechTreeDetails {
  const details: TechTreeDetails = { nodes: {}, links: {} };

  for (const node of data.nodes) {
    const nodeDetails: Record<string, unknown> = {};
    for (const field of NODE_DETAIL_FIELDS) {
      if (!isEmpty(node[field])) nodeDetails[field] = node[field];
    }
    if (Object.keys(nodeDetails).length > 0) {
      details.nodes[node.id] = nodeDetails as NodeDetails;
    }
  }

  for (const link of data.links) {
    if (isEmpty(link.details) && isEmpty(link.detailsSource)) continue;
    details.links[linkDetailsKey(link)] = {
      ...(link.details ? { details: link.details } : {}),
      ...(link.detailsSource ? { detailsSource: link.detailsSource } : {}),
    };
  }

  return details;
}
