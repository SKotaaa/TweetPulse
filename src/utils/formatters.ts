/**
 * Safe formatter for confidence scores.
 * Ensures the value is normalized to a 0-100 percentage.
 */
export function formatConfidence(value: number): number {
  if (value === undefined || value === null) return 0;
  
  // If the value is already likely a percentage (e.g., 95)
  if (value > 1) {
    return Math.min(100, Math.round(value));
  }
  
  // If the value is a decimal (e.g., 0.95)
  return Math.min(100, Math.round(value * 100));
}
