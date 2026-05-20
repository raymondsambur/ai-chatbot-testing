import { defineConfig, devices } from 'playwright/test';

/**
 * Playwright configuration for the AI Chatbot test suite.
 *
 * Note: This project uses Cucumber.js with Playwright (not @playwright/test),
 * so this config is primarily for tooling support (e.g., VS Code Playwright extension,
 * codegen, trace viewer) rather than direct test execution.
 */
export default defineConfig({
  use: {
    baseURL: 'https://chatbot.ai-sdk.dev/demo',
    navigationTimeout: 30000,
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
