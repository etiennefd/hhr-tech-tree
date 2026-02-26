// Field colors for technology categories
// Used for consistent color-coding across the application

export const FIELD_COLORS: Record<string, string> = {
  // Food & Agriculture
  Food: "#277d1e", // deep green
  Agriculture: "#359c2c", // Fresh leaf green

  // Life Sciences
  Biology: "#2cbd00", // Bright green
  Medicine: "#00A5B3", // Medical blue
  Sanitation: "#00bdcf", // Aquamarine

  // Physical Sciences
  Physics: "#6b3ba1", // Purple
  Chemistry: "#8E4BC9", // Bright purple
  Astronomy: "#371c91", // Deep purple
  Meteorology: "#3c9cbf", // Teal
  Optics: "#5C6BC0", // Bright indigo

  // Energy & Electronics
  Electricity: "#0099FF", // Electric blue
  Electronics: "#33a371", // Circuit board green
  Energy: "#FFB627", // Amber
  Lighting: "#ffdc2b", // Yellow

  // Construction/Materials
  Construction: "#c14d17", // Brick orange
  Mining: "#B8860B", // Dark goldenrod
  Metallurgy: "#8C8C8C", // Brushed steel
  Manufacturing: "#8a5011", // Brown
  Textiles: "#b58c55", // Burlap
  Hydraulics: "#4A90B6", // Industrial blue

  // Transportation/Movement
  Transportation: "#de6f00", // Burnt orange
  Flying: "#87cfeb", // Sky blue
  Sailing: "#1C7CD5", // Ocean blue
  Diving: "#0030c2", // Deep blue
  Space: "#2C1654", // Deep space purple
  Geography: "#5ed5ff", // Map ocean blue

  // Computing/Math
  Mathematics: "#6B7B8C", // Slate blue
  Measurement: "#607D8B", // Steel blue
  Timekeeping: "#546E7A", // Clock gray
  Computing: "#435863", // Dark gray
  Commerce: "#2f6333", // Dark green

  // Safety/Weapons
  Safety: "#ff8400", // Bright orange
  Security: "#E94F37", // Alert red
  Weaponry: "#d63333", // Red

  // Culture & Communication
  Communication: "#c97fa7", // Grayish pink
  "Visual media": "#DA70D6", // Orchid
  Recreation: "#FF69B4", // Hot pink
  Music: "#C71585", // Medium violet red

  Misc: "#919191", // Gray
} as const;

// Default color for unknown fields
export const DEFAULT_FIELD_COLOR = "#2D2D2D";

// Type for valid field names
export type FieldName = keyof typeof FIELD_COLORS;

// Helper to get field color with fallback
export function getFieldColor(field: string): string {
  return FIELD_COLORS[field] ?? DEFAULT_FIELD_COLOR;
}
