// Property: Exponential backoff retry correctness
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { withRetry, setDelay } from './retry';

/**
 * Property 1: Exponential backoff retry correctness
 *
 * For any sequence of N consecutive failures (where N < maxAttempts) followed by a success,
 * the retry utility SHALL return the successful result and SHALL have waited a total delay
 * equal to the sum of baseDelay × backoffMultiplier^i for i = 0 to N-1.
 *
 * For any sequence of maxAttempts consecutive failures, the retry utility SHALL throw the
 * last error after exhausting all attempts.
 */
describe('Property 1: Exponential backoff retry correctness', () => {
  let originalDelay: (ms: number) => Promise<void>;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('N failures then success → returns result, total delay = sum of baseDelay × backoffMultiplier^i for i=0..N-1', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // maxAttempts
        fc.integer({ min: 100, max: 5000 }), // baseDelayMs
        fc.integer({ min: 1, max: 5 }), // backoffMultiplier
        fc.integer({ min: 1, max: 9 }), // failuresBeforeSuccess (will be clamped to < maxAttempts)
        async (maxAttempts, baseDelayMs, backoffMultiplier, rawFailures) => {
          // Ensure failures < maxAttempts so we eventually succeed
          const failuresBeforeSuccess = Math.min(rawFailures, maxAttempts - 1);

          // Track delays
          const recordedDelays: number[] = [];
          const prevDelay = setDelay(async (ms: number) => {
            recordedDelays.push(ms);
          });

          try {
            let callCount = 0;
            const successValue = `result-${maxAttempts}-${failuresBeforeSuccess}`;

            const fn = async (): Promise<string> => {
              callCount++;
              if (callCount <= failuresBeforeSuccess) {
                throw new Error(`failure ${callCount}`);
              }
              return successValue;
            };

            const result = await withRetry(fn, { maxAttempts, baseDelayMs, backoffMultiplier });

            // Should return the successful result
            expect(result).toBe(successValue);

            // Should have recorded exactly failuresBeforeSuccess delays
            expect(recordedDelays.length).toBe(failuresBeforeSuccess);

            // Total delay should equal sum of baseDelay × backoffMultiplier^i for i=0..N-1
            let expectedTotalDelay = 0;
            for (let i = 0; i < failuresBeforeSuccess; i++) {
              const expectedIndividualDelay = baseDelayMs * Math.pow(backoffMultiplier, i);
              expect(recordedDelays[i]).toBe(expectedIndividualDelay);
              expectedTotalDelay += expectedIndividualDelay;
            }

            const actualTotalDelay = recordedDelays.reduce((sum, d) => sum + d, 0);
            expect(actualTotalDelay).toBe(expectedTotalDelay);
          } finally {
            setDelay(prevDelay);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('maxAttempts failures → throws with descriptive message containing "All N retry attempts exhausted"', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // maxAttempts
        fc.integer({ min: 100, max: 5000 }), // baseDelayMs
        fc.integer({ min: 1, max: 5 }), // backoffMultiplier
        async (maxAttempts, baseDelayMs, backoffMultiplier) => {
          const prevDelay = setDelay(async () => {});

          try {
            let callCount = 0;
            const lastErrorMessage = `persistent-error-${maxAttempts}`;

            const fn = async (): Promise<string> => {
              callCount++;
              throw new Error(lastErrorMessage);
            };

            let thrownError: Error | undefined;
            try {
              await withRetry(fn, { maxAttempts, baseDelayMs, backoffMultiplier });
            } catch (error) {
              thrownError = error as Error;
            }

            // Should have thrown
            expect(thrownError).toBeDefined();

            // Error message should contain "All N retry attempts exhausted"
            expect(thrownError!.message).toContain(`All ${maxAttempts} retry attempts exhausted`);

            // Error message should contain the last error message
            expect(thrownError!.message).toContain(lastErrorMessage);

            // Should have called the function exactly maxAttempts times
            expect(callCount).toBe(maxAttempts);
          } finally {
            setDelay(prevDelay);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
