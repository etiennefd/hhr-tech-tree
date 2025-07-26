export interface FilterState {
  fields: Set<string>;
  subfields: Set<string>; // New filter type for subfields
  countries: Set<string>;
  cities: Set<string>;
}