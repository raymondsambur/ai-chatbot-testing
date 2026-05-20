import { describe, it, expect } from 'vitest';
import {
  checkNonEmpty,
  checkMinLength,
  checkMaxLength,
  checkCompleteSentence,
  validateStructural,
} from './structural-validator';

describe('structural-validator', () => {
  describe('checkNonEmpty', () => {
    it('passes for a non-empty string', () => {
      const result = checkNonEmpty('Hello world');
      expect(result.passed).toBe(true);
      expect(result.layer).toBe('structural');
    });

    it('fails for an empty string', () => {
      const result = checkNonEmpty('');
      expect(result.passed).toBe(false);
      expect(result.layer).toBe('structural');
    });

    it('fails for a whitespace-only string', () => {
      const result = checkNonEmpty('   \t\n  ');
      expect(result.passed).toBe(false);
    });

    it('passes for a string with leading/trailing whitespace but content', () => {
      const result = checkNonEmpty('  hello  ');
      expect(result.passed).toBe(true);
    });
  });

  describe('checkMinLength', () => {
    it('passes when string length equals the minimum', () => {
      const result = checkMinLength('abc', 3);
      expect(result.passed).toBe(true);
      expect(result.layer).toBe('structural');
    });

    it('passes when string length exceeds the minimum', () => {
      const result = checkMinLength('hello world', 5);
      expect(result.passed).toBe(true);
    });

    it('fails when string length is below the minimum', () => {
      const result = checkMinLength('hi', 10);
      expect(result.passed).toBe(false);
      expect(result.expected).toBe('length >= 10');
      expect(result.actual).toBe('length: 2');
    });
  });

  describe('checkMaxLength', () => {
    it('passes when string length equals the maximum', () => {
      const result = checkMaxLength('abc', 3);
      expect(result.passed).toBe(true);
      expect(result.layer).toBe('structural');
    });

    it('passes when string length is below the maximum', () => {
      const result = checkMaxLength('hi', 100);
      expect(result.passed).toBe(true);
    });

    it('fails when string length exceeds the maximum', () => {
      const result = checkMaxLength('hello world', 5);
      expect(result.passed).toBe(false);
      expect(result.expected).toBe('length <= 5');
      expect(result.actual).toBe('length: 11');
    });
  });

  describe('checkCompleteSentence', () => {
    it('passes when response ends with a period', () => {
      const result = checkCompleteSentence('This is a sentence.');
      expect(result.passed).toBe(true);
      expect(result.layer).toBe('structural');
    });

    it('passes when response ends with a question mark', () => {
      const result = checkCompleteSentence('Is this a question?');
      expect(result.passed).toBe(true);
    });

    it('passes when response ends with an exclamation mark', () => {
      const result = checkCompleteSentence('Wow!');
      expect(result.passed).toBe(true);
    });

    it('passes when terminal punctuation appears mid-string', () => {
      const result = checkCompleteSentence('First sentence. Second part');
      expect(result.passed).toBe(true);
    });

    it('fails when no terminal punctuation is present', () => {
      const result = checkCompleteSentence('no punctuation here');
      expect(result.passed).toBe(false);
    });
  });

  describe('validateStructural', () => {
    it('returns empty array when no options are specified', () => {
      const results = validateStructural('hello', {});
      expect(results).toHaveLength(0);
    });

    it('runs only the checks specified in options', () => {
      const results = validateStructural('Hello.', { nonEmpty: true, completeSentence: true });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.passed)).toBe(true);
    });

    it('includes failing results when checks fail', () => {
      const results = validateStructural('hi', { minLength: 10, maxLength: 100 });
      expect(results).toHaveLength(2);
      expect(results[0].passed).toBe(false); // minLength fails
      expect(results[1].passed).toBe(true); // maxLength passes
    });

    it('runs all four checks when all options are set', () => {
      const results = validateStructural('Hello world.', {
        nonEmpty: true,
        minLength: 5,
        maxLength: 100,
        completeSentence: true,
      });
      expect(results).toHaveLength(4);
      expect(results.every((r) => r.passed)).toBe(true);
      expect(results.every((r) => r.layer === 'structural')).toBe(true);
    });
  });
});
