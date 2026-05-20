/**
 * Test configuration module.
 * Loads values from environment variables with sensible defaults
 * for running against the AI chatbot demo.
 */

export interface TestConfig {
  /** Base URL of the chatbot demo */
  baseUrl: string;
  /** Maximum time (ms) to wait for page navigation */
  navigationTimeout: number;
  /** Maximum time (ms) to wait for UI actions */
  actionTimeout: number;
  /** Maximum time (ms) to wait for a chatbot response */
  responseTimeout: number;
  /** Delay (ms) between test scenarios to mitigate rate limiting */
  interScenarioDelay: number;
  /** Number of retry attempts for flaky assertions */
  retryAttempts: number;
  /** Multiplier for exponential backoff between retries */
  backoffMultiplier: number;
  /** Minimum similarity score (0-1) for semantic assertions to pass */
  semanticThreshold: number;
}

/**
 * Parses a numeric environment variable, returning the default if
 * the variable is unset or not a valid finite number.
 */
function parseNumericEnv(value: string | undefined, defaultValue: number): number {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

/**
 * Builds a TestConfig by reading environment variables with fallback defaults.
 */
export function loadConfig(): TestConfig {
  return {
    baseUrl: process.env.BASE_URL || 'https://chatbot.ai-sdk.dev/demo',
    navigationTimeout: parseNumericEnv(process.env.NAVIGATION_TIMEOUT, 30000),
    actionTimeout: parseNumericEnv(process.env.ACTION_TIMEOUT, 10000),
    responseTimeout: parseNumericEnv(process.env.RESPONSE_TIMEOUT, 30000),
    interScenarioDelay: parseNumericEnv(process.env.INTER_SCENARIO_DELAY, 2000),
    retryAttempts: parseNumericEnv(process.env.RETRY_ATTEMPTS, 3),
    backoffMultiplier: parseNumericEnv(process.env.BACKOFF_MULTIPLIER, 2),
    semanticThreshold: parseNumericEnv(process.env.SEMANTIC_THRESHOLD, 0.7),
  };
}

/** Singleton config instance for convenient import */
export const config: TestConfig = loadConfig();
