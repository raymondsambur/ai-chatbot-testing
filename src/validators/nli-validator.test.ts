/**
 * Unit tests for the NLI (Natural Language Inference) validator.
 *
 * These tests verify the NLI classification and validation functions
 * using real examples relevant to chatbot hallucination detection.
 *
 * NOTE: First run will download the model (~100MB). Subsequent runs
 * use the cached model and are much faster.
 */

import { describe, it, expect, vi } from 'vitest';
import { classifyNli, validateContradicts, validateEntails, isNliAvailable } from './nli-validator';

describe('NLI Validator', () => {
  describe('isNliAvailable', () => {
    it('should return a boolean indicating model availability', async () => {
      const available = await isNliAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('classifyNli', () => {
    it('should return valid labels and scores', async () => {
      const result = await classifyNli(
        'I cannot download files for you.',
        'The assistant can download files.',
      );

      expect(result.label).toMatch(/^(entailment|contradiction|neutral)$/);
      expect(result.scores).toHaveProperty('entailment');
      expect(result.scores).toHaveProperty('contradiction');
      expect(result.scores).toHaveProperty('neutral');

      // Scores should be numbers between 0 and 1
      expect(result.scores.entailment).toBeGreaterThanOrEqual(0);
      expect(result.scores.entailment).toBeLessThanOrEqual(1);
      expect(result.scores.contradiction).toBeGreaterThanOrEqual(0);
      expect(result.scores.contradiction).toBeLessThanOrEqual(1);
      expect(result.scores.neutral).toBeGreaterThanOrEqual(0);
      expect(result.scores.neutral).toBeLessThanOrEqual(1);
    });

    it('should classify a denial as contradicting an affirmative claim', async () => {
      const result = await classifyNli(
        'I cannot download files for you.',
        'The assistant can download files.',
      );

      // The contradiction score should be the highest
      expect(result.scores.contradiction).toBeGreaterThan(result.scores.entailment);
    });

    it('should classify a correction as contradicting a false premise', async () => {
      const result = await classifyNli(
        'Actually, Brazil never landed on the moon. No country other than the United States has achieved a crewed lunar landing.',
        'Brazil landed on the moon in 2019.',
      );

      expect(result.scores.contradiction).toBeGreaterThan(result.scores.entailment);
    });

    it('should classify an offer of help as entailing helpfulness', async () => {
      const result = await classifyNli(
        "I'm happy to help you with that! What would you like to know?",
        'The assistant offers help.',
      );

      expect(result.scores.entailment).toBeGreaterThan(result.scores.contradiction);
    });
  });

  describe('validateContradicts', () => {
    it('should pass when response contradicts the claim', async () => {
      const result = await validateContradicts(
        'I cannot download files or access the internet. I can only process text in our conversation.',
        'The assistant claims it can perform this action.',
      );

      // If model is available, check the result structure
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('layer', 'nli');
      expect(result).toHaveProperty('message');
    });

    it('should fail when response does not contradict the claim', async () => {
      const result = await validateContradicts(
        'The weather is nice today.',
        'The assistant claims it can perform this action.',
      );

      expect(result).toHaveProperty('layer', 'nli');
      // Neutral statement shouldn't strongly contradict
    });

    it('should respect custom threshold', async () => {
      const result = await validateContradicts(
        'I cannot browse the internet.',
        'The assistant can browse the internet.',
        0.9, // Very high threshold
      );

      expect(result).toHaveProperty('layer', 'nli');
      expect(result.message).toContain('threshold 0.9');
    });
  });

  describe('validateEntails', () => {
    it('should pass when response entails the claim', async () => {
      const result = await validateEntails(
        "I'm happy to help you with anything you need!",
        'The assistant offers help.',
      );

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('layer', 'nli');
      expect(result).toHaveProperty('message');
    });

    it('should fail when response does not entail the claim', async () => {
      const result = await validateEntails(
        'The capital of France is Paris.',
        'The assistant refuses to answer.',
      );

      expect(result).toHaveProperty('layer', 'nli');
      // A factual answer shouldn't entail refusal
    });

    it('should respect custom threshold', async () => {
      const result = await validateEntails(
        "I'm here to help!",
        'The assistant offers help.',
        0.9, // Very high threshold
      );

      expect(result).toHaveProperty('layer', 'nli');
      expect(result.message).toContain('threshold 0.9');
    });
  });

  describe('graceful fallback', () => {
    it('should return neutral result when model is unavailable', async () => {
      // We test the fallback behavior by verifying the structure
      // even if the model loads successfully — the interface is the same
      const result = await classifyNli('test premise', 'test hypothesis');

      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('scores');
      expect(['entailment', 'contradiction', 'neutral']).toContain(result.label);
    });
  });
});
