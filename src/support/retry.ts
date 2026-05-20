/**
 * Exponential backoff retry utility.
 * Wraps async operations with configurable retry logic to handle
 * transient failures and rate limiting (HTTP 429).
 */

import { config } from './config';

export interface RetryOptions {
  /** Maximum number of attempts before giving up (default: 3) */
  maxAttempts: number;
  /** Base delay in milliseconds before first retry (default: 2000) */
  baseDelayMs: number;
  /** Multiplier applied to delay for each successive attempt (default: 2) */
  backoffMultiplier: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: config.retryAttempts,
  baseDelayMs: config.interScenarioDelay,
  backoffMultiplier: config.backoffMultiplier,
};

/**
 * Delays execution for the specified number of milliseconds.
 * Exported separately so tests can mock it without affecting real timing.
 */
export let delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Replaces the delay function (for testing purposes).
 * Returns the previous delay function so it can be restored.
 */
export function setDelay(fn: (ms: number) => Promise<void>): (ms: number) => Promise<void> {
  const previous = delay;
  delay = fn;
  return previous;
}

/**
 * Determines whether an error is a rate limit error.
 * Checks for HTTP 429 status codes or "rate limit" text in the error message.
 */
export function isRateLimitError(error: unknown): boolean {
  if (error == null) return false;

  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;

    // Check for HTTP 429 status code in common error shapes
    if (err.status === 429 || err.statusCode === 429) return true;

    // Check response object for 429
    if (typeof err.response === 'object' && err.response != null) {
      const response = err.response as Record<string, unknown>;
      if (response.status === 429 || response.statusCode === 429) return true;
    }
  }

  // Check for "rate limit" text in the error message
  const message = error instanceof Error ? error.message : String(error);
  return /rate.?limit/i.test(message);
}

/**
 * Executes an async function with exponential backoff retry logic.
 *
 * Delay calculation: baseDelayMs × backoffMultiplier^attemptIndex
 *   - Attempt 0 failure → delay = baseDelayMs × 1
 *   - Attempt 1 failure → delay = baseDelayMs × 2
 *   - Attempt 2 failure → delay = baseDelayMs × 4
 *
 * On success after retries, logs the total number of attempts.
 * On exhaustion of all attempts, throws the last error with a descriptive message.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>,
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      const result = await fn();

      // Log success after retries
      if (attempt > 0) {
        console.log(`Succeeded after ${attempt + 1} attempts`);
      }

      return result;
    } catch (error) {
      lastError = error;

      // If we have more attempts remaining, wait with exponential backoff
      const isLastAttempt = attempt === opts.maxAttempts - 1;
      if (!isLastAttempt) {
        const delayMs = opts.baseDelayMs * Math.pow(opts.backoffMultiplier, attempt);
        const isRateLimit = isRateLimitError(error);

        console.log(
          `Retry attempt ${attempt + 1}/${opts.maxAttempts} failed` +
            (isRateLimit ? ' (rate limited)' : '') +
            `. Waiting ${delayMs}ms before next attempt.`,
        );

        await delay(delayMs);
      }
    }
  }

  // All attempts exhausted — throw descriptive error
  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`All ${opts.maxAttempts} retry attempts exhausted. Last error: ${errorMessage}`);
}
