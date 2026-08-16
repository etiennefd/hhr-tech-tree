/**
 * A technology independently invented again somewhere else — usually later than
 * the node's own date, but sometimes earlier — in a case where the second
 * invention does not merit a node of its own. Where both traditions merit nodes
 * on independent grounds — a different species, mechanism, or system — the
 * `Independently invented` connection type is used instead. This is the default;
 * a split is the exception.
 */
export interface IndependentInnovation {
  id: string;
  year: number;
  city?: string;
  countryHistorical?: string;
  countryModern?: string;
  formattedLocation?: string;
  inventors?: string[];
  organizations?: string[];
  /** Justification, which must name a source. Shown on hover. */
  details?: string;
  detailsSource?: string;
  dateAdded?: string;
}

export interface TechNode {
  id: string;
  title: string;
  subtitle?: string;
  year: number;
  dateDetails?: string;
  type?: string;
  fields: string[];
  subfields?: string[];
  description?: string;
  details?: string;
  naturalOrigin?: string;
  inventors?: string[];
  organizations?: string[];
  wikipedia?: string;
  image?: string;
  imagePosition?: string;
  x?: number;
  y?: number;
  
  // Location fields
  countryHistorical?: string;  // Comma-separated string from Airtable
  countryModern?: string;      // Comma-separated string from Airtable
  city?: string;
  formattedLocation?: string;

  independentInnovations?: IndependentInnovation[];
} 