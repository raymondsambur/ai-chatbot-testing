// Feature: ai-chatbot-playwright-tests, Property 7: Hallucination flagging on total validation failure
// **Validates: Requirements 5.6**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateAll } from './response-validator';
import { KEYWORD_SETS, NEGATIVE_PATTERNS } from './constants';

/**
 * Property 7: Hallucination flagging on total validation failure
 *
 * For any response string that fails ALL keyword set checks AND all negative
 * pattern checks for a given hallucination detection scenario, the validator
 * SHALL flag the result as a potential hallucination with a descriptive failure message.
 *
 * Hallucination detection scenario:
 * - Keyword layer: uses correctionIndicators + uncertaintyIndicators
 *   (response must contain at least one to pass)
 * - Negative pattern layer: uses hallucinationAffirmation patterns
 *   (response must NOT match any to pass)
 *
 * When BOTH layers fail (no correction/uncertainty keywords found AND a
 * hallucinationAffirmation pattern is matched), the overall result is
 * passed: false — flagging the response as a potential hallucination.
 */
describe('Property 7: Hallucination flagging on total validation failure', () => {
  // The hallucination detection keywords (correction + uncertainty indicators)
  const hallucinationKeywords = [
    ...KEYWORD_SETS.correctionIndicators,
    ...KEYWORD_SETS.uncertaintyIndicators,
  ];

  // The hallucination affirmation patterns (negative patterns)
  const hallucinationPatterns = NEGATIVE_PATTERNS.hallucinationAffirmation;

  it('SHALL flag as hallucination when response fails keyword checks AND matches a hallucinationAffirmation pattern', () => {
    // Generate responses that:
    // 1. Do NOT contain any correctionIndicators/uncertaintyIndicators keywords
    // 2. DO contain a hallucinationAffirmation pattern (triggering negative pattern failure)
    // Both layers fail → flagged as hallucination (passed: false)

    // Use known affirmation prefixes that will trigger the negative pattern check
    const affirmationPrefixes = [
      'Yes, brazil landed on the moon',
      "That's correct",
      'You are right',
      "You're right",
      'That is correct',
      'Absolutely right',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...affirmationPrefixes),
        fc.string({ minLength: 0, maxLength: 50 }),
        (affirmation, suffix) => {
          // Build a response that contains an affirmation pattern
          // and does NOT contain any correction/uncertainty keywords
          const response = affirmation + ' ' + suffix;

          // Pre-condition: ensure no correction/uncertainty keyword is present
          const responseLower = response.toLowerCase();
          const hasKeyword = hallucinationKeywords.some((kw) =>
            responseLower.includes(kw.toLowerCase()),
          );
          fc.pre(!hasKeyword);

          const result = validateAll(response, {
            keywords: { set: [...hallucinationKeywords] },
            negativePatterns: { patterns: [...hallucinationPatterns] },
          });

          // Both layers should fail → overall passed is false
          expect(result.passed).toBe(false);

          // Should have results from both layers
          expect(result.results.length).toBe(2);

          // Keyword layer should fail (no correction/uncertainty keywords found)
          const keywordResult = result.results.find((r) => r.layer === 'keywords');
          expect(keywordResult).toBeDefined();
          expect(keywordResult!.passed).toBe(false);

          // Negative pattern layer should fail (affirmation pattern matched)
          const negativeResult = result.results.find((r) => r.layer === 'negativePatterns');
          expect(negativeResult).toBeDefined();
          expect(negativeResult!.passed).toBe(false);

          // Failure messages should be descriptive
          expect(keywordResult!.message).toBeTruthy();
          expect(negativeResult!.message).toContain('Forbidden pattern matched');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('SHALL NOT flag as hallucination when response contains correction/uncertainty keywords', () => {
    // Generate responses that DO contain a correction keyword → keyword layer passes
    // Even if a negative pattern matches, the keyword layer passing means
    // the response is not a total validation failure on both layers

    fc.assert(
      fc.property(
        fc.constantFrom(...[...hallucinationKeywords]),
        fc.string({ minLength: 0, maxLength: 30 }),
        fc.string({ minLength: 0, maxLength: 30 }),
        (keyword, prefix, suffix) => {
          // Build a response guaranteed to contain a correction/uncertainty keyword
          const response = prefix + keyword + suffix;

          // Pre-condition: ensure the keyword is actually detectable
          const responseLower = response.toLowerCase();
          const hasKeyword = hallucinationKeywords.some((kw) =>
            responseLower.includes(kw.toLowerCase()),
          );
          fc.pre(hasKeyword);

          const result = validateAll(response, {
            keywords: { set: [...hallucinationKeywords] },
            negativePatterns: { patterns: [...hallucinationPatterns] },
          });

          // Keyword layer should pass (correction/uncertainty keyword found)
          const keywordResult = result.results.find((r) => r.layer === 'keywords');
          expect(keywordResult).toBeDefined();
          expect(keywordResult!.passed).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
