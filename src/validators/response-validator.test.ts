import { describe, it, expect } from 'vitest';
import { validate, validateAll, ResponseValidator, ValidationOptions } from './response-validator';

describe('response-validator', () => {
  describe('validate()', () => {
    it('returns empty array when no layers are specified', () => {
      const results = validate('Hello world.', {});
      expect(results).toEqual([]);
    });

    it('evaluates structural layer only when specified', () => {
      const options: ValidationOptions = {
        structural: { nonEmpty: true, minLength: 5 },
      };
      const results = validate('Hello world.', options);
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.layer === 'structural')).toBe(true);
      expect(results.every((r) => r.passed)).toBe(true);
    });

    it('evaluates keywords layer only when specified', () => {
      const options: ValidationOptions = {
        keywords: { set: ['hello', 'world'], minMatches: 1 },
      };
      const results = validate('Hello there!', options);
      expect(results).toHaveLength(1);
      expect(results[0].layer).toBe('keywords');
      expect(results[0].passed).toBe(true);
    });

    it('evaluates negative patterns layer only when specified', () => {
      const options: ValidationOptions = {
        negativePatterns: { patterns: ['forbidden', /bad/i] },
      };
      const results = validate('This is a clean response.', options);
      expect(results).toHaveLength(1);
      expect(results[0].layer).toBe('negativePatterns');
      expect(results[0].passed).toBe(true);
    });

    it('evaluates semantic layer only when specified', () => {
      const options: ValidationOptions = {
        semantic: { expectedIntent: 'greeting response', threshold: 0.3 },
      };
      const results = validate('Hello! How can I help you today?', options);
      expect(results).toHaveLength(1);
      expect(results[0].layer).toBe('semantic');
    });

    it('evaluates layers in order: structural → keywords → negativePatterns → semantic', () => {
      const options: ValidationOptions = {
        structural: { nonEmpty: true },
        keywords: { set: ['hello'] },
        negativePatterns: { patterns: ['forbidden'] },
        semantic: { expectedIntent: 'greeting', threshold: 0.1 },
      };
      const results = validate('Hello there!', options);
      expect(results.length).toBeGreaterThanOrEqual(4);
      expect(results[0].layer).toBe('structural');
      expect(results[1].layer).toBe('keywords');
      expect(results[2].layer).toBe('negativePatterns');
      expect(results[3].layer).toBe('semantic');
    });

    it('returns failure details when a layer fails', () => {
      const options: ValidationOptions = {
        keywords: { set: ['missing', 'absent'], minMatches: 1 },
      };
      const results = validate('Hello world.', options);
      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(false);
      expect(results[0].layer).toBe('keywords');
      expect(results[0].message).toBeDefined();
      expect(results[0].expected).toBeDefined();
      expect(results[0].actual).toBeDefined();
    });

    it('returns failure for negative pattern match', () => {
      const options: ValidationOptions = {
        negativePatterns: { patterns: ['world'] },
      };
      const results = validate('Hello world.', options);
      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(false);
      expect(results[0].layer).toBe('negativePatterns');
    });
  });

  describe('validateAll()', () => {
    it('returns passed=true when all specified layers pass', () => {
      const options: ValidationOptions = {
        structural: { nonEmpty: true },
        keywords: { set: ['hello'] },
        negativePatterns: { patterns: ['forbidden'] },
      };
      const result = validateAll('Hello there!', options);
      expect(result.passed).toBe(true);
      expect(result.results.every((r) => r.passed)).toBe(true);
    });

    it('returns passed=false when any layer fails', () => {
      const options: ValidationOptions = {
        structural: { nonEmpty: true },
        keywords: { set: ['missing'] },
      };
      const result = validateAll('Hello there!', options);
      expect(result.passed).toBe(false);
    });

    it('returns passed=true when no layers are specified (vacuous truth)', () => {
      const result = validateAll('anything', {});
      expect(result.passed).toBe(true);
      expect(result.results).toEqual([]);
    });

    it('includes detailed results for each layer', () => {
      const options: ValidationOptions = {
        structural: { nonEmpty: true, minLength: 100 },
        keywords: { set: ['hello'] },
      };
      const result = validateAll('Hello!', options);
      expect(result.passed).toBe(false);
      // structural nonEmpty passes, structural minLength fails, keywords passes
      expect(result.results).toHaveLength(3);
      const failedResults = result.results.filter((r) => !r.passed);
      expect(failedResults.length).toBeGreaterThan(0);
      expect(failedResults[0].layer).toBe('structural');
    });

    it('returns passed=false when structural layer fails on empty response', () => {
      const options: ValidationOptions = {
        structural: { nonEmpty: true },
        keywords: { set: ['hello'] },
      };
      const result = validateAll('   ', options);
      expect(result.passed).toBe(false);
    });
  });

  describe('ResponseValidator class', () => {
    const validator = new ResponseValidator();

    it('validate() returns same results as standalone function', () => {
      const options: ValidationOptions = {
        structural: { nonEmpty: true },
        keywords: { set: ['hello'] },
      };
      const classResults = validator.validate('Hello!', options);
      const fnResults = validate('Hello!', options);
      expect(classResults).toEqual(fnResults);
    });

    it('validateAll() returns same results as standalone function', () => {
      const options: ValidationOptions = {
        structural: { nonEmpty: true },
        keywords: { set: ['hello'] },
      };
      const classResult = validator.validateAll('Hello!', options);
      const fnResult = validateAll('Hello!', options);
      expect(classResult).toEqual(fnResult);
    });

    it('validateAll() passes when all layers pass', () => {
      const options: ValidationOptions = {
        structural: { nonEmpty: true, completeSentence: true },
        keywords: { set: ['help', 'assist'] },
        negativePatterns: { patterns: ['error', 'crash'] },
      };
      const result = validator.validateAll('I can help you with that.', options);
      expect(result.passed).toBe(true);
    });

    it('validateAll() fails with detailed messages when a layer fails', () => {
      const options: ValidationOptions = {
        structural: { nonEmpty: true },
        negativePatterns: { patterns: ['crash'] },
      };
      const result = validator.validateAll('The system will crash now.', options);
      expect(result.passed).toBe(false);
      const failed = result.results.filter((r) => !r.passed);
      expect(failed).toHaveLength(1);
      expect(failed[0].layer).toBe('negativePatterns');
      expect(failed[0].message).toContain('crash');
    });
  });
});
