export interface TechNode {
  id: string;
  title: string;
  subtitle?: string;
  year: number;
  dateDetails?: string;
  type?: string;
  fields: string[];
  description?: string;
  details?: string;
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
} 