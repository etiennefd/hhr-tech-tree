export interface TechNode {
  id: string;
  title: string;
  year: number;
  x: number;
  y: number;
  description?: string;
  details?: string;
  dateDetails?: string;
  inventors?: string[];
  organizations?: string[];
  formattedLocation?: string;
  wikipedia?: string;
  fields: string[];
  type?: string;
  subtitle?: string;
  image: string;
  historicalLocation?: string[];
  modernLocation?: string[];
  cities?: string[];
} 