/**
 * Helper function to escape regex special characters
 */
export function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Cleans location string by removing "(unspecified)" suffix
 */
export const cleanLocationForTooltip = (location: string | undefined): string | undefined => {
  if (!location) return undefined;
  return location.replace(/ \(unspecified\)/g, '');
};

/**
 * Validates image URLs and returns undefined for invalid ones
 */
export const validateImageUrl = (imageUrl: string | null | undefined): string | undefined => {
  // If imageUrl is null or undefined, return undefined
  if (imageUrl === null || imageUrl === undefined) {
    return undefined;
  }
  
  // Check if image URL is valid
  if (typeof imageUrl !== 'string' || 
      imageUrl.length < 2 || 
      (!imageUrl.startsWith('/') && 
       !imageUrl.startsWith('http://') && 
       !imageUrl.startsWith('https://'))) {
    // Invalid image URL
    console.warn(`Invalid image URL: "${imageUrl}"`);
    return undefined;
  }
  return imageUrl;
};

/**
 * Fetches a URL with retry logic for handling rate limits and temporary failures
 */
export const fetchWithRetry = async (url: string, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
      if (response.status === 429) {
        // Rate limited - wait longer before retry
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        continue;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error; // Last retry failed
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
};

/**
 * Throttles a function to limit how often it can be called
 */
export const throttle = <T extends (...args: any[]) => void>(func: T, limit: number): T => {
  let inThrottle = false;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  }) as T;
};

export const seededRandom = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) / 2147483647;
}; 