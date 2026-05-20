// Feature: ai-chatbot-playwright-tests, Property 4: Negative pattern exclusion correctness
// **Validates: Requirements 12.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateNegativePatterns } from './negative-pattern-validator';

describe('Property 4: Negative pattern exclusion correctness', () => {
  it('SHALL return pass when none of the string patterns match within the response', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
        (response, patterns) => {
          // Use patterns that are clearly not substrings of the response
          // by appending a unique suffix that cannot appear in the response
          const uniqueSuffix = '\x00NOTFOUND\x00';
          const guaranteedMissingPatterns = patterns.map((p) => p + uniqueSuffix);

          const result = validateNegativePatterns(response, guaranteedMissingPatterns);
          expect(result.passed).toBe(true);
          expect(result.layer).toBe('negativePatterns');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('SHALL return fail when a string pattern is present in the response', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 0, maxLength: 50 }),
        (prefix, pattern, suffix) => {
          // Embed the pattern in the response so we KNOW it is present
          const response = prefix + pattern + suffix;
          const result = validateNegativePatterns(response, [pattern]);
          expect(result.passed).toBe(false);
          expect(result.layer).toBe('negativePatterns');
          expect(result.message).toContain('Forbidden pattern matched');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('SHALL return pass when none of the regex patterns match within the response', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (response) => {
        // Use regex patterns that match a string impossible to find in any generated response
        const impossiblePatterns: RegExp[] = [/\x00IMPOSSIBLE_REGEX\x00/, /\x01NEVER_MATCH\x01/];

        const result = validateNegativePatterns(response, impossiblePatterns);
        expect(result.passed).toBe(true);
        expect(result.layer).toBe('negativePatterns');
      }),
      { numRuns: 100 },
    );
  });

  it('SHALL return fail when a regex pattern matches within the response', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        fc.string({ minLength: 0, maxLength: 50 }),
        (prefix, suffix) => {
          // Embed a known token that our regex will match
          const token = 'FORBIDDEN_TOKEN';
          const response = prefix + token + suffix;
          const regexPattern = /FORBIDDEN_TOKEN/;

          const result = validateNegativePatterns(response, [regexPattern]);
          expect(result.passed).toBe(false);
          expect(result.layer).toBe('negativePatterns');
          expect(result.message).toContain('Forbidden pattern matched');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('SHALL return pass if and only if none of the patterns match (bidirectional)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
        (response, patterns) => {
          const result = validateNegativePatterns(response, patterns);

          // Check if any pattern actually matches (case-insensitive substring)
          const anyMatch = patterns.some(
            (p) => response.toLowerCase().indexOf(p.toLowerCase()) !== -1,
          );

          // The validator should pass iff no pattern matches
          expect(result.passed).toBe(!anyMatch);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('SHALL return fail for the first matching pattern when multiple patterns are provided', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 0, maxLength: 30 }),
        (prefix, pattern, suffix) => {
          const response = prefix + pattern + suffix;
          // Add a non-matching pattern before and after the matching one
          const nonMatchingPattern = '\x00WILL_NOT_MATCH\x00';
          const patterns = [nonMatchingPattern, pattern, nonMatchingPattern + '2'];

          const result = validateNegativePatterns(response, patterns);
          expect(result.passed).toBe(false);
          expect(result.message).toContain(pattern);
        },
      ),
      { numRuns: 100 },
    );
  });
});
