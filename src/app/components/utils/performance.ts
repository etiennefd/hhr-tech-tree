/**
 * Performance measurement utilities
 */
export const performanceMarks = {
  start: (name: string) => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${name}-start`);
    }
  },
  end: (name: string) => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }
  },
  log: (name: string) => {
    if (process.env.NODE_ENV === 'development') {
      const entries = performance.getEntriesByName(name);
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        console.log(`[Performance] ${name}: ${lastEntry.duration.toFixed(2)}ms`);
      }
    }
  },
  clear: (name: string) => {
    if (process.env.NODE_ENV === 'development') {
      performance.clearMarks(`${name}-start`);
      performance.clearMarks(`${name}-end`);
      performance.clearMeasures(name);
    }
  }
};

/**
 * Render counter for tracking component re-renders
 */
export const renderCounter = {
  count: 0,
  increment: () => {
    if (process.env.NODE_ENV === 'development') {
      renderCounter.count++;
      console.log(`[Performance] Render count: ${renderCounter.count}`);
    }
  },
  reset: () => {
    if (process.env.NODE_ENV === 'development') {
      renderCounter.count = 0;
    }
  }
};

/**
 * Memoization effectiveness tracker
 */
export const memoEffectiveness = {
  hits: 0,
  misses: 0,
  track: (hit: boolean) => {
    if (process.env.NODE_ENV === 'development') {
      if (hit) memoEffectiveness.hits++;
      else memoEffectiveness.misses++;
    }
  },
  log: () => {
    if (process.env.NODE_ENV === 'development') {
      const total = memoEffectiveness.hits + memoEffectiveness.misses;
      const hitRate = total > 0 ? (memoEffectiveness.hits / total) * 100 : 0;
      console.log(
        `[Performance] Memo hit rate: ${hitRate.toFixed(1)}% (${memoEffectiveness.hits}/${total})`
      );
    }
  },
  reset: () => {
    memoEffectiveness.hits = 0;
    memoEffectiveness.misses = 0;
  }
};

/**
 * Logs performance metrics with additional data
 */
export function logPerformance(operation: string, data: Record<string, any>) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${operation}:`, data);
  }
} 