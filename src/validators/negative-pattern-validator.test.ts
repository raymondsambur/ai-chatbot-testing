import { describe, it, expect } from 'vitest';
import { validateNegativePatterns } from './negative-pattern-validator';

describe('validateNegativePatterns', () => {
  describe('passing cases', () => {
    it('passes when response contains none of the forbidden string patterns', () => {
      const result = validateNegativePatterns('Hello, how can I help you today?', [
        'profanity',
        'badword',
        'forbidden',
      ]);

      expect(result.passed).toBe(true);
      expect(result.layer).toBe('negativePatterns');
      expect(result.message).toBe('No forbidden patterns found');
    });

    it('passes when response contains none of the forbidden regex patterns', () => {
      const result = validateNegativePatterns('I can assist you with that question.', [
        /<[^>]+>/,
        /\{\{.*\}\}/,
      ]);

      expect(result.passed).toBe(true);
      expect(result.layer).toBe('negativePatterns');
    });

    it('passes with an empty patterns array', () => {
      const result = validateNegativePatterns('Any response text here.', []);

      expect(result.passed).toBe(true);
      expect(result.layer).toBe('negativePatterns');
    });

    it('passes with an empty response and non-matching patterns', () => {
      const result = validateNegativePatterns('', ['hello', /world/]);

      expect(result.passed).toBe(true);
    });
  });

  describe('failing cases - string patterns', () => {
    it('fails when response contains a forbidden string pattern', () => {
      const result = validateNegativePatterns('I can browse the internet for you.', [
        'browse the internet',
      ]);

      expect(result.passed).toBe(false);
      expect(result.layer).toBe('negativePatterns');
      expect(result.message).toContain('browse the internet');
      expect(result.expected).toBe('none of the forbidden patterns');
      expect(result.actual).toContain('browse the internet');
    });

    it('performs case-insensitive matching for string patterns', () => {
      const result = validateNegativePatterns('I can BROWSE THE INTERNET for you.', [
        'browse the internet',
      ]);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('browse the internet');
    });

    it('returns the first matched pattern when multiple match', () => {
      const result = validateNegativePatterns('I can browse the internet and execute code.', [
        'browse the internet',
        'execute code',
      ]);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('browse the internet');
    });
  });

  describe('failing cases - regex patterns', () => {
    it('fails when response matches a forbidden regex pattern', () => {
      const result = validateNegativePatterns('Here is some <b>bold</b> text.', [/<[^>]+>/]);

      expect(result.passed).toBe(false);
      expect(result.layer).toBe('negativePatterns');
      expect(result.expected).toBe('none of the forbidden patterns');
      expect(result.actual).toContain('<b>');
    });

    it('fails when response matches a template pattern', () => {
      const result = validateNegativePatterns('Hello {{username}}, welcome!', [/\{\{.*\}\}/]);

      expect(result.passed).toBe(false);
      expect(result.actual).toContain('{{username}}');
    });
  });

  describe('mixed patterns', () => {
    it('checks string patterns before regex patterns in order', () => {
      const result = validateNegativePatterns('arr matey, let me help!', ['arr', /matey/]);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('"arr"');
    });

    it('fails on regex if string patterns do not match first', () => {
      const result = validateNegativePatterns("Hello <script>alert('xss')</script>", [
        'forbidden',
        /<script>/,
      ]);

      expect(result.passed).toBe(false);
      expect(result.actual).toContain('<script>');
    });
  });

  describe('context in error messages', () => {
    it('includes surrounding context for string matches', () => {
      const result = validateNegativePatterns('The quick brown fox jumps over the lazy dog', [
        'brown fox',
      ]);

      expect(result.passed).toBe(false);
      expect(result.actual).toContain('brown fox');
    });

    it('includes matched text for regex matches', () => {
      const result = validateNegativePatterns('Error code: 429', [/\d{3}/]);

      expect(result.passed).toBe(false);
      expect(result.actual).toContain('429');
    });
  });
});
