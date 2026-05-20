/**
 * Structural validator module.
 * Provides assertion methods that verify response structure and format
 * without checking specific content. All checks operate on plain strings
 * and return a ValidationResult with the "structural" layer name.
 */

export interface ValidationResult {
  passed: boolean;
  layer: string;
  message: string;
  expected?: string;
  actual?: string;
}

const LAYER = 'structural';

/**
 * Checks that the response is non-empty after trimming whitespace.
 */
export function checkNonEmpty(response: string): ValidationResult {
  const trimmed = response.trim();
  const passed = trimmed.length > 0;

  return {
    passed,
    layer: LAYER,
    message: passed ? 'Response is non-empty' : 'Response is empty after trimming whitespace',
    expected: 'non-empty string (trimmed length > 0)',
    actual: `trimmed length: ${trimmed.length}`,
  };
}

/**
 * Checks that the response length meets a minimum character count.
 */
export function checkMinLength(response: string, minLength: number): ValidationResult {
  const passed = response.length >= minLength;

  return {
    passed,
    layer: LAYER,
    message: passed
      ? `Response meets minimum length of ${minLength}`
      : `Response is shorter than minimum length of ${minLength}`,
    expected: `length >= ${minLength}`,
    actual: `length: ${response.length}`,
  };
}

/**
 * Checks that the response length does not exceed a maximum character count.
 */
export function checkMaxLength(response: string, maxLength: number): ValidationResult {
  const passed = response.length <= maxLength;

  return {
    passed,
    layer: LAYER,
    message: passed
      ? `Response is within maximum length of ${maxLength}`
      : `Response exceeds maximum length of ${maxLength}`,
    expected: `length <= ${maxLength}`,
    actual: `length: ${response.length}`,
  };
}

/**
 * Checks that the response contains at least one complete sentence
 * ending with terminal punctuation: '.', '?', or '!'.
 */
export function checkCompleteSentence(response: string): ValidationResult {
  const passed = /[.?!]/.test(response);

  return {
    passed,
    layer: LAYER,
    message: passed
      ? 'Response contains at least one complete sentence'
      : 'Response does not contain a complete sentence (no terminal punctuation found)',
    expected: "at least one sentence ending with '.', '?', or '!'",
    actual: `response: "${response.length > 80 ? response.slice(0, 80) + '...' : response}"`,
  };
}

/**
 * Options for the combined structural validation.
 */
export interface StructuralValidationOptions {
  nonEmpty?: boolean;
  minLength?: number;
  maxLength?: number;
  completeSentence?: boolean;
}

/**
 * Runs all specified structural checks and returns an array of results.
 * Only checks whose corresponding option is set will be evaluated.
 */
export function validateStructural(
  response: string,
  options: StructuralValidationOptions,
): ValidationResult[] {
  const results: ValidationResult[] = [];

  if (options.nonEmpty) {
    results.push(checkNonEmpty(response));
  }

  if (options.minLength !== undefined) {
    results.push(checkMinLength(response, options.minLength));
  }

  if (options.maxLength !== undefined) {
    results.push(checkMaxLength(response, options.maxLength));
  }

  if (options.completeSentence) {
    results.push(checkCompleteSentence(response));
  }

  return results;
}
