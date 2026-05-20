// Feature: ai-chatbot-playwright-tests, Property 2: Semantic similarity score bounds and identity

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateSimilarity } from './semantic-validator';

/**
 * Property-based tests for semantic similarity score bounds and identity.
 *
 * Validates: Requirements 12.1
 *
 * Property: For any two non-empty strings, the semantic similarity score
 * SHALL be a number in the range [0, 1]. For any non-empty string compared
 * to itself, the similarity score SHALL equal 1.0.
 */
describe('Semantic Validator - Property 2: Semantic similarity score bounds and identity', () => {
  it('for any two non-empty strings, the similarity score is in [0, 1]', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), (strA, strB) => {
        const score = calculateSimilarity(strA, strB);

        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
        expect(typeof score).toBe('number');
        expect(Number.isNaN(score)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('for any non-empty string compared to itself, the similarity score equals 1.0', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (str) => {
        const score = calculateSimilarity(str, str);

        expect(score).toBe(1.0);
      }),
      { numRuns: 100 },
    );
  });
});
