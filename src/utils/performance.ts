export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export const CACHE_KEYS = {
  DASHBOARD: 'pulse_dashboard_v1.0',
  HISTORY: 'pulse_history_v1.0',
};

export const CACHE_VERSION = '1.0';
export const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes
export const CACHE_SIZE_LIMIT = 20; // Number of items to store in local cache

