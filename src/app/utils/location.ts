/**
 * Types for location data processing
 */
type LocationData = {
    cities: string[];
    countries: string[];
  };
  
  /**
   * Formats location data according to these rules:
   * 1. Single country: Show all cities with country: "London and Cambridge, UK"
   * 2. Multiple countries with cities: Only show countries: "UK; Sweden"
   * 3. Multiple cities in same country: Show all: "London and Oxford, UK"
   * 4. Single city and country: Standard format: "London, UK"
   * 
   * @param cities - Comma-separated string of cities
   * @param countries - Comma-separated string of countries
   * @returns Formatted location string
   */
  export const formatLocation = (cities: string, countries: string): string => {
    // Clean and split the input strings
    const cleanList = (str: string): string[] => 
      str.split(',')
         .map(item => item.trim())
         .filter(Boolean);
  
    const locationData: LocationData = {
      cities: cleanList(cities),
      countries: cleanList(countries)
    };
  
    // If no valid data, return empty string
    if (!locationData.cities.length && !locationData.countries.length) {
      return '';
    }
  
    // If only countries are present, join them with semicolons
    if (!locationData.cities.length) {
      return locationData.countries.join('; ');
    }
  
    // If only one country, show all cities with that country
    if (locationData.countries.length === 1) {
      const country = locationData.countries[0];
      if (locationData.cities.length === 1) {
        return `${locationData.cities[0]}, ${country}`;
      } else {
        const citiesString = locationData.cities.join(', ');
        return `${citiesString}, ${country}`;
      }
    }
  
    // If multiple countries, only show countries
    return locationData.countries.join('; ');
  };
  
  /**
   * Cleans up a comma-separated list by trimming whitespace and ensuring proper spacing
   * @param value - Raw comma-separated string
   * @returns Cleaned string with proper spacing
   */
  export const cleanCommaList = (value: string): string => {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .join(', ');
  };