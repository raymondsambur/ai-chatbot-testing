// Feature: ai-chatbot-playwright-tests, Property 6: Combined validation is conjunction of layers with detailed failures

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validate, validateAll } from './response-validator';

/**
 * **Validates: Requirements 12.5, 12.6**
 *
 * Property 6: Combined validation is conjunction of layers with detailed failures
 * For any response string and validation options specifying multiple layers,
 * the combined validation SHALL pass if and only if ALL specified layers pass individually.
 * When any layer fails, the failure result SHALL include the layer name, the expected
 * condition, and the actual value received.
 */
describe('Property 6: Combined validation is conjunction of layers with detailed failures', () => {
  // Arbitrary for structural validation options
  const structuralOptionsArb = fc.record({
    nonEmpty: fc.constant(true),
    minLength: fc.integer({ min: 0, max: 50 }),
  });

  // Arbitrary for keyword validation options
  const keywordsOptionsArb = fc.record({
    set: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 1, maxLength: 5 }),
  });

  // Arbitrary for negative pattern validation options (string patterns only for determinism)
  const negativePatternsOptionsArb = fc.record({
    patterns: fc.array(fc.string({ minLength: 1, maxLength: 15 }), {
      minLength: 1,
      maxLength: 5,
    }),
  });

  // Combined validation options with all three deterministic layers
  const validationOptionsArb = fc.record({
    structural: structuralOptionsArb,
    keywords: keywordsOptionsArb,
    negativePatterns: negativePatternsOptionsArb,
  });

  it('validateAll passes if and only if ALL individual layers pass', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        validationOptionsArb,
        (response, options) => {
          const allResult = validateAll(response, options);
          const individualResults = validate(response, options);

          // Overall pass should be true iff every individual result passed
          const allIndividualPassed = individualResults.every((r) => r.passed);
          expect(allResult.passed).toBe(allIndividualPassed);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('validateAll results are consistent with calling validate directly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        validationOptionsArb,
        (response, options) => {
          const allResult = validateAll(response, options);
          const individualResults = validate(response, options);

          // The results array from validateAll should match validate output
          expect(allResult.results).toEqual(individualResults);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('every failed result includes layer (string) and message (string)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        validationOptionsArb,
        (response, options) => {
          const allResult = validateAll(response, options);

          for (const result of allResult.results) {
            // Every result must have layer and message as strings
            expect(typeof result.layer).toBe('string');
            expect(result.layer.length).toBeGreaterThan(0);
            expect(typeof result.message).toBe('string');
            expect(result.message.length).toBeGreaterThan(0);

            // When a layer fails, it must include expected and actual fields
            if (!result.passed) {
              expect(result).toHaveProperty('expected');
              expect(result).toHaveProperty('actual');
              expect(typeof result.expected).toBe('string');
              expect(typeof result.actual).toBe('string');
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('when any single layer fails, the overall validation fails', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        validationOptionsArb,
        (response, options) => {
          const allResult = validateAll(response, options);
          const hasAnyFailure = allResult.results.some((r) => !r.passed);

          if (hasAnyFailure) {
            expect(allResult.passed).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('when all layers pass, the overall validation passes', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        validationOptionsArb,
        (response, options) => {
          const allResult = validateAll(response, options);
          const allPassed = allResult.results.every((r) => r.passed);

          if (allPassed) {
            expect(allResult.passed).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
