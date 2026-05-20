/**
 * Keyword set matching validator.
 * Performs case-insensitive substring matching against a provided keyword array.
 * Returns pass when at least the minimum number of keywords are found in the response.
 */

export interface ValidationResult {
  passed: boolean;
  layer: string;
  message: string;
  expected?: string;
  actual?: string;
}

/**
 * Truncates a string to a maximum length, appending an ellipsis if truncated.
 */
function truncate(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
}

/**
 * Validates that a response contains at least `minMatches` keywords from the
 * provided set using case-insensitive substring matching.
 *
 * @param response - The chatbot response text to validate
 * @param keywords - Array of keywords to search for in the response
 * @param minMatches - Minimum number of keywords that must be found (default: 1)
 * @returns A ValidationResult indicating pass/fail with details
 */
export function validateKeywords(
  response: string,
  keywords: string[],
  minMatches: number = 1,
): ValidationResult {
  const responseLower = response.toLowerCase();
  const matchedKeywords = keywords.filter((keyword) =>
    responseLower.includes(keyword.toLowerCase()),
  );

  if (matchedKeywords.length >= minMatches) {
    return {
      passed: true,
      layer: 'keywords',
      message: `Found keyword(s): [${matchedKeywords.join(', ')}]`,
    };
  }

  return {
    passed: false,
    layer: 'keywords',
    message: `None of the expected keywords were found in the response`,
    expected: `At least ${minMatches} keyword(s) from: [${keywords.join(', ')}]`,
    actual: truncate(response),
  };
}
