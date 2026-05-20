import { describe, it, expect } from 'vitest';
import { calculateSimilarity, validateSemantic } from './semantic-validator';

describe('calculateSimilarity', () => {
  it('returns 1.0 for identical non-empty strings', () => {
    const text = 'Hello, how can I help you today?';
    expect(calculateSimilarity(text, text)).toBe(1.0);
  });

  it('returns 0 when response is empty', () => {
    expect(calculateSimilarity('', 'expected intent')).toBe(0);
  });

  it('returns 0 when expectedIntent is empty', () => {
    expect(calculateSimilarity('some response', '')).toBe(0);
  });

  it('returns 0 when both strings are empty', () => {
    expect(calculateSimilarity('', '')).toBe(0);
  });

  it('returns a score between 0 and 1 for different strings', () => {
    const response = 'I can help you with programming questions';
    const intent = 'The assistant offers help with coding topics';
    const score = calculateSimilarity(response, intent);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('returns higher similarity for semantically related strings', () => {
    const response = 'Paris is the capital of France';
    const closeIntent = 'The capital city of France is Paris';
    const distantIntent = 'Dogs are popular pets around the world';

    const closeScore = calculateSimilarity(response, closeIntent);
    const distantScore = calculateSimilarity(response, distantIntent);

    expect(closeScore).toBeGreaterThan(distantScore);
  });

  it('handles single-word strings', () => {
    const score = calculateSimilarity('hello', 'hello');
    expect(score).toBe(1.0);
  });

  it('returns a score for partially overlapping content', () => {
    const response = 'I understand your frustration and want to help';
    const intent = 'Acknowledges user frustration and offers assistance';
    const score = calculateSimilarity(response, intent);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('validateSemantic', () => {
  it('returns passed=true when similarity exceeds default threshold', () => {
    const text = 'I can help you with that question';
    const result = validateSemantic(text, text);

    expect(result.passed).toBe(true);
    expect(result.layer).toBe('semantic');
    expect(result.expected).toBe(text);
    expect(result.actual).toBe(text);
  });

  it('returns passed=false when similarity is below threshold', () => {
    const response = 'The weather is nice today';
    const intent = 'Provides technical programming assistance';
    const result = validateSemantic(response, intent, 0.9);

    expect(result.passed).toBe(false);
    expect(result.layer).toBe('semantic');
    expect(result.message).toContain('below threshold');
  });

  it('uses default threshold of 0.7', () => {
    // Identical strings should always pass with any threshold
    const text = 'Hello world';
    const result = validateSemantic(text, text);

    expect(result.passed).toBe(true);
    expect(result.message).toContain('0.7');
  });

  it('respects custom threshold parameter', () => {
    const text = 'Hello world';
    const result = validateSemantic(text, text, 0.5);

    expect(result.passed).toBe(true);
    expect(result.message).toContain('0.5');
  });

  it("returns layer name as 'semantic'", () => {
    const result = validateSemantic('test', 'test');
    expect(result.layer).toBe('semantic');
  });

  it('includes score in the message', () => {
    const result = validateSemantic('hello world', 'hello world');
    expect(result.message).toMatch(/\d+\.\d+/);
  });

  it('handles empty response gracefully', () => {
    const result = validateSemantic('', 'expected intent');

    expect(result.passed).toBe(false);
    expect(result.layer).toBe('semantic');
  });

  it('handles empty expectedIntent gracefully', () => {
    const result = validateSemantic('some response', '');

    expect(result.passed).toBe(false);
    expect(result.layer).toBe('semantic');
  });
});
