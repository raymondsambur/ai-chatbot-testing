import { describe, it, expect } from 'vitest';
import { validateKeywords } from './keyword-validator';

describe('validateKeywords', () => {
  it('passes when response contains a keyword (exact case)', () => {
    const result = validateKeywords('Hello there!', ['hello', 'hi']);
    expect(result.passed).toBe(true);
    expect(result.layer).toBe('keywords');
    expect(result.message).toContain('hello');
  });

  it('performs case-insensitive matching', () => {
    const result = validateKeywords('HELLO WORLD', ['hello']);
    expect(result.passed).toBe(true);
    expect(result.message).toContain('hello');
  });

  it('matches keywords with mixed case in keyword array', () => {
    const result = validateKeywords('welcome to the chat', ['Welcome', 'Hi']);
    expect(result.passed).toBe(true);
    expect(result.message).toContain('Welcome');
  });

  it('performs substring matching (keyword within a word)', () => {
    const result = validateKeywords('I can assist you today', ['assist']);
    expect(result.passed).toBe(true);
  });

  it('fails when no keywords are found', () => {
    const result = validateKeywords('The weather is nice today', ['hello', 'hi', 'greetings']);
    expect(result.passed).toBe(false);
    expect(result.layer).toBe('keywords');
    expect(result.message).toContain('None of the expected keywords were found');
    expect(result.expected).toContain('hello');
    expect(result.expected).toContain('hi');
    expect(result.expected).toContain('greetings');
    expect(result.actual).toBe('The weather is nice today');
  });

  it('truncates long response text in failure actual field', () => {
    const longResponse = 'a'.repeat(200);
    const result = validateKeywords(longResponse, ['hello']);
    expect(result.passed).toBe(false);
    expect(result.actual!.length).toBeLessThan(200);
    expect(result.actual!.endsWith('...')).toBe(true);
  });

  it('passes with default minMatches of 1', () => {
    const result = validateKeywords('hello and welcome', ['hello', 'welcome', 'goodbye']);
    expect(result.passed).toBe(true);
  });

  it('respects custom minMatches parameter', () => {
    const result = validateKeywords('hello and welcome', ['hello', 'welcome', 'goodbye'], 2);
    expect(result.passed).toBe(true);
  });

  it('fails when fewer than minMatches keywords are found', () => {
    const result = validateKeywords('hello there', ['hello', 'welcome', 'goodbye'], 2);
    expect(result.passed).toBe(false);
    expect(result.expected).toContain('At least 2');
  });

  it('handles empty keyword array (always fails)', () => {
    const result = validateKeywords('hello world', []);
    expect(result.passed).toBe(false);
  });

  it('handles empty response string', () => {
    const result = validateKeywords('', ['hello']);
    expect(result.passed).toBe(false);
  });

  it('lists all matched keywords in the success message', () => {
    const result = validateKeywords('hello and welcome friend', ['hello', 'welcome']);
    expect(result.passed).toBe(true);
    expect(result.message).toContain('hello');
    expect(result.message).toContain('welcome');
  });
});
