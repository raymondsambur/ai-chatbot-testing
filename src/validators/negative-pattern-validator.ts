/**
 * Negative pattern exclusion validator.
 * Checks that a response does NOT contain any forbidden patterns.
 * Supports both string patterns (case-insensitive substring match)
 * and RegExp patterns (tested directly against the response).
 */

export interface ValidationResult {
  passed: boolean;
  layer: string;
  message: string;
  expected?: string;
  actual?: string;
}

/**
 * Validates that a response does not match any of the provided forbidden patterns.
 * Returns pass when none of the patterns match, fail with the first matched pattern.
 *
 * @param response - The chatbot response text to validate
 * @param patterns - Array of forbidden patterns (strings or RegExp)
 * @returns ValidationResult indicating pass/fail with details
 */
export function validateNegativePatterns(
  response: string,
  patterns: (string | RegExp)[],
): ValidationResult {
  for (const pattern of patterns) {
    if (typeof pattern === 'string') {
      // Case-insensitive substring match for string patterns
      const index = response.toLowerCase().indexOf(pattern.toLowerCase());
      if (index !== -1) {
        const matchContext = extractContext(response, index, pattern.length);
        return {
          passed: false,
          layer: 'negativePatterns',
          message: `Forbidden pattern matched: "${pattern}"`,
          expected: 'none of the forbidden patterns',
          actual: `matched "${pattern}" in context: "${matchContext}"`,
        };
      }
    } else {
      // RegExp pattern test
      const match = pattern.exec(response);
      if (match) {
        return {
          passed: false,
          layer: 'negativePatterns',
          message: `Forbidden pattern matched: ${pattern.toString()}`,
          expected: 'none of the forbidden patterns',
          actual: `matched ${pattern.toString()} in context: "${match[0]}"`,
        };
      }
    }
  }

  return {
    passed: true,
    layer: 'negativePatterns',
    message: 'No forbidden patterns found',
  };
}

/**
 * Extracts a snippet of context around a match position for readable error messages.
 * Shows up to 10 characters before and after the matched text.
 */
function extractContext(text: string, matchIndex: number, matchLength: number): string {
  const contextPadding = 10;
  const start = Math.max(0, matchIndex - contextPadding);
  const end = Math.min(text.length, matchIndex + matchLength + contextPadding);
  let context = text.slice(start, end);
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';
  return context;
}
