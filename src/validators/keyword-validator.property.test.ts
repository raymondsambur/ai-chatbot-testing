// Feature: ai-chatbot-playwright-tests, Property 3: Keyword set matching correctness

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateKeywords } from './keyword-validator';

/**
 * Validates: Requirements 12.2
 *
 * Property: For any response string and keyword set, the keyword matcher SHALL
 * return true if and only if the response contains at least one keyword from the
 * set (case-insensitive substring match). For any response that contains none of
 * the keywords, the matcher SHALL return false.
 */
describe('Property 3: Keyword set matching correctness', () => {
  it('returns true when the response contains at least one keyword (constructed inclusion)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 0, maxLength: 50 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
        (prefix, keyword, suffix, otherKeywords) => {
          // Construct a response that is guaranteed to contain the keyword
          const response = prefix + keyword + suffix;
          const keywords = [keyword, ...otherKeywords];

          const result = validateKeywords(response, keywords);
          expect(result.passed).toBe(true);
          expect(result.layer).toBe('keywords');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when the response contains none of the keywords', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        (response, keywords) => {
          // Only test cases where no keyword is actually present in the response
          const responseLower = response.toLowerCase();
          const nonePresent = keywords.every((kw) => !responseLower.includes(kw.toLowerCase()));

          fc.pre(nonePresent);

          const result = validateKeywords(response, keywords);
          expect(result.passed).toBe(false);
          expect(result.layer).toBe('keywords');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('performs case-insensitive matching for any keyword casing', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 30 }),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), {
          minLength: 1,
          maxLength: 15,
        }),
        fc.string({ minLength: 0, maxLength: 30 }),
        (prefix, baseKeyword, suffix) => {
          // Construct response with the keyword in uppercase
          const response = prefix + baseKeyword.toUpperCase() + suffix;
          // Provide keyword in lowercase
          const keywords = [baseKeyword.toLowerCase()];

          const result = validateKeywords(response, keywords);
          expect(result.passed).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('the result is consistent: passes iff at least one keyword is a substring of the response', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        (response, keywords) => {
          const responseLower = response.toLowerCase();
          const expectedPass = keywords.some((kw) => responseLower.includes(kw.toLowerCase()));

          const result = validateKeywords(response, keywords);
          expect(result.passed).toBe(expectedPass);
        },
      ),
      { numRuns: 100 },
    );
  });
});
