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
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch {
        // No matching start mark; nothing to measure
      }
      // The measure still shows in the DevTools Performance timeline; clear
      // the entries so they don't accumulate in the buffer on every call
      performanceMarks.clear(name);
    }
  },
  // Kept as a call-site hook for reporting; measures are cleared in end()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  log: (name: string) => {},
  clear: (name: string) => {
    if (process.env.NODE_ENV === 'development') {
      performance.clearMarks(`${name}-start`);
      performance.clearMarks(`${name}-end`);
      performance.clearMeasures(name);
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
    }
  },
  reset: () => {
    memoEffectiveness.hits = 0;
    memoEffectiveness.misses = 0;
  }
};
