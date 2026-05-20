/**
 * Shared types for the response validation module.
 */

/** Result of a single validation layer check */
export interface ValidationResult {
  /** Whether the validation passed */
  passed: boolean;
  /** Name of the validation layer (e.g., "semantic", "keyword", "negative-pattern", "structural") */
  layer: string;
  /** Human-readable description of the result */
  message: string;
  /** What was expected (for debugging) */
  expected?: string;
  /** What was actually received (for debugging) */
  actual?: string;
}
