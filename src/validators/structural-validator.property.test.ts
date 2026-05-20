// Feature: ai-chatbot-playwright-tests, Property 5: Structural assertion correctness

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  checkNonEmpty,
  checkMinLength,
  checkMaxLength,
  checkCompleteSentence,
} from './structural-validator';

/**
 * **Validates: Requirements 12.4**
 *
 * Property 5: Structural assertion correctness
 * For any string, the structural validator SHALL:
 * (a) pass the non-empty check if and only if the trimmed string has length > 0
 * (b) pass the minLength check if and only if the string length >= the specified minimum
 * (c) pass the maxLength check if and only if the string length <= the specified maximum
 * (d) pass the completeSentence check if and only if the string contains at least one
 *     sentence ending with '.', '?', or '!'
 */
describe('Property 5: Structural assertion correctness', () => {
  it('(a) checkNonEmpty passes iff trimmed string has length > 0', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = checkNonEmpty(input);
        const expectedPass = input.trim().length > 0;

        expect(result.passed).toBe(expectedPass);
        expect(result.layer).toBe('structural');
      }),
      { numRuns: 100 },
    );
  });

  it('(b) checkMinLength passes iff string length >= specified minimum', () => {
    fc.assert(
      fc.property(fc.string(), fc.integer({ min: 0, max: 1000 }), (input, minLength) => {
        const result = checkMinLength(input, minLength);
        const expectedPass = input.length >= minLength;

        expect(result.passed).toBe(expectedPass);
        expect(result.layer).toBe('structural');
      }),
      { numRuns: 100 },
    );
  });

  it('(c) checkMaxLength passes iff string length <= specified maximum', () => {
    fc.assert(
      fc.property(fc.string(), fc.integer({ min: 0, max: 1000 }), (input, maxLength) => {
        const result = checkMaxLength(input, maxLength);
        const expectedPass = input.length <= maxLength;

        expect(result.passed).toBe(expectedPass);
        expect(result.layer).toBe('structural');
      }),
      { numRuns: 100 },
    );
  });

  it("(d) checkCompleteSentence passes iff string contains at least one '.', '?', or '!'", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = checkCompleteSentence(input);
        const expectedPass = /[.?!]/.test(input);

        expect(result.passed).toBe(expectedPass);
        expect(result.layer).toBe('structural');
      }),
      { numRuns: 100 },
    );
  });
});
