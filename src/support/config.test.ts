import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, TestConfig } from './config';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns default values when no environment variables are set', () => {
    delete process.env.BASE_URL;
    delete process.env.NAVIGATION_TIMEOUT;
    delete process.env.ACTION_TIMEOUT;
    delete process.env.RESPONSE_TIMEOUT;
    delete process.env.INTER_SCENARIO_DELAY;
    delete process.env.RETRY_ATTEMPTS;
    delete process.env.BACKOFF_MULTIPLIER;
    delete process.env.SEMANTIC_THRESHOLD;

    const cfg: TestConfig = loadConfig();

    expect(cfg.baseUrl).toBe('https://chatbot.ai-sdk.dev/demo');
    expect(cfg.navigationTimeout).toBe(30000);
    expect(cfg.actionTimeout).toBe(10000);
    expect(cfg.responseTimeout).toBe(30000);
    expect(cfg.interScenarioDelay).toBe(2000);
    expect(cfg.retryAttempts).toBe(3);
    expect(cfg.backoffMultiplier).toBe(2);
    expect(cfg.semanticThreshold).toBe(0.7);
  });

  it('reads values from environment variables', () => {
    process.env.BASE_URL = 'http://localhost:3000';
    process.env.NAVIGATION_TIMEOUT = '15000';
    process.env.ACTION_TIMEOUT = '5000';
    process.env.RESPONSE_TIMEOUT = '20000';
    process.env.INTER_SCENARIO_DELAY = '3000';
    process.env.RETRY_ATTEMPTS = '5';
    process.env.BACKOFF_MULTIPLIER = '3';
    process.env.SEMANTIC_THRESHOLD = '0.8';

    const cfg = loadConfig();

    expect(cfg.baseUrl).toBe('http://localhost:3000');
    expect(cfg.navigationTimeout).toBe(15000);
    expect(cfg.actionTimeout).toBe(5000);
    expect(cfg.responseTimeout).toBe(20000);
    expect(cfg.interScenarioDelay).toBe(3000);
    expect(cfg.retryAttempts).toBe(5);
    expect(cfg.backoffMultiplier).toBe(3);
    expect(cfg.semanticThreshold).toBe(0.8);
  });

  it('falls back to defaults for invalid numeric values', () => {
    process.env.NAVIGATION_TIMEOUT = 'not-a-number';
    process.env.ACTION_TIMEOUT = '';
    process.env.RETRY_ATTEMPTS = 'NaN';
    process.env.BACKOFF_MULTIPLIER = 'Infinity';

    const cfg = loadConfig();

    expect(cfg.navigationTimeout).toBe(30000);
    expect(cfg.actionTimeout).toBe(10000);
    expect(cfg.retryAttempts).toBe(3);
    // Infinity is not finite, so it should fall back to default
    expect(cfg.backoffMultiplier).toBe(2);
  });

  it('handles partial environment variable overrides', () => {
    process.env.BASE_URL = 'https://custom.example.com';
    process.env.RETRY_ATTEMPTS = '10';
    delete process.env.NAVIGATION_TIMEOUT;
    delete process.env.ACTION_TIMEOUT;

    const cfg = loadConfig();

    expect(cfg.baseUrl).toBe('https://custom.example.com');
    expect(cfg.retryAttempts).toBe(10);
    expect(cfg.navigationTimeout).toBe(30000);
    expect(cfg.actionTimeout).toBe(10000);
  });
});
