import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { withRetry, isRateLimitError, setDelay } from './retry';

describe('retry utility', () => {
  let originalDelay: (ms: number) => Promise<void>;

  beforeEach(() => {
    // Replace delay with a no-op for fast tests
    originalDelay = setDelay(async () => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    setDelay(originalDelay);
    vi.restoreAllMocks();
  });

  describe('withRetry', () => {
    it('returns the result on first attempt success', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxAttempts: 3,
        baseDelayMs: 100,
        backoffMultiplier: 2,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and returns result on eventual success', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxAttempts: 4,
        baseDelayMs: 100,
        backoffMultiplier: 2,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('logs success message when succeeding after retries', async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('ok');

      await withRetry(fn, { maxAttempts: 3, baseDelayMs: 100, backoffMultiplier: 2 });

      expect(console.log).toHaveBeenCalledWith('Succeeded after 2 attempts');
    });

    it('does not log success message on first attempt success', async () => {
      const fn = vi.fn().mockResolvedValue('ok');

      await withRetry(fn, { maxAttempts: 3, baseDelayMs: 100, backoffMultiplier: 2 });

      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('Succeeded after'));
    });

    it('throws descriptive error after exhausting all attempts', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));

      await expect(
        withRetry(fn, { maxAttempts: 3, baseDelayMs: 100, backoffMultiplier: 2 }),
      ).rejects.toThrow('All 3 retry attempts exhausted. Last error: persistent failure');

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('calculates exponential backoff delays correctly', async () => {
      const delays: number[] = [];
      setDelay(async (ms) => {
        delays.push(ms);
      });

      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(
        withRetry(fn, { maxAttempts: 4, baseDelayMs: 1000, backoffMultiplier: 2 }),
      ).rejects.toThrow();

      // Delays: 1000*2^0=1000, 1000*2^1=2000, 1000*2^2=4000
      // (no delay after last attempt since it throws immediately)
      expect(delays).toEqual([1000, 2000, 4000]);
    });

    it('logs retry attempts with rate limit indicator when applicable', async () => {
      const rateLimitError = new Error('rate limit exceeded');
      const fn = vi.fn().mockRejectedValueOnce(rateLimitError).mockResolvedValue('ok');

      await withRetry(fn, { maxAttempts: 3, baseDelayMs: 100, backoffMultiplier: 2 });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('(rate limited)'));
    });

    it('handles non-Error thrown values in exhaustion message', async () => {
      const fn = vi.fn().mockRejectedValue('string error');

      await expect(
        withRetry(fn, { maxAttempts: 2, baseDelayMs: 100, backoffMultiplier: 2 }),
      ).rejects.toThrow('All 2 retry attempts exhausted. Last error: string error');
    });

    it('uses partial options merged with defaults', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(withRetry(fn, { maxAttempts: 2 })).rejects.toThrow(
        'All 2 retry attempts exhausted',
      );

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('isRateLimitError', () => {
    it('returns true for error with status 429', () => {
      expect(isRateLimitError({ status: 429 })).toBe(true);
    });

    it('returns true for error with statusCode 429', () => {
      expect(isRateLimitError({ statusCode: 429 })).toBe(true);
    });

    it('returns true for error with response.status 429', () => {
      expect(isRateLimitError({ response: { status: 429 } })).toBe(true);
    });

    it('returns true for error with response.statusCode 429', () => {
      expect(isRateLimitError({ response: { statusCode: 429 } })).toBe(true);
    });

    it("returns true for Error with 'rate limit' in message", () => {
      expect(isRateLimitError(new Error('rate limit exceeded'))).toBe(true);
    });

    it("returns true for Error with 'Rate Limit' in message (case-insensitive)", () => {
      expect(isRateLimitError(new Error('Rate Limit reached'))).toBe(true);
    });

    it("returns true for Error with 'rate-limit' in message", () => {
      expect(isRateLimitError(new Error('rate-limit error'))).toBe(true);
    });

    it('returns false for null', () => {
      expect(isRateLimitError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isRateLimitError(undefined)).toBe(false);
    });

    it('returns false for a generic error', () => {
      expect(isRateLimitError(new Error('network timeout'))).toBe(false);
    });

    it('returns false for error with non-429 status', () => {
      expect(isRateLimitError({ status: 500 })).toBe(false);
    });
  });
});
