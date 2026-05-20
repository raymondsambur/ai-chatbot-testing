/**
 * Cucumber hooks for browser lifecycle management.
 *
 * BeforeAll/AfterAll: Launch and close the shared Chromium browser instance.
 * Before: Create a fresh browser context and page per scenario, navigate to
 *   the chatbot URL, and wait for the page to load.
 * After: Capture a screenshot on failure (attached to Allure), close the
 *   browser context, and apply an inter-scenario delay to mitigate rate limiting.
 *
 * If the initial page load exceeds 10 seconds, the scenario is skipped with
 * a "service unavailable" message (Requirement 11.6).
 */

import { Before, After, BeforeAll, AfterAll, Status } from '@cucumber/cucumber';
import { chromium, Browser } from 'playwright';
import { ChatbotPage } from '../page-objects/chatbot.page';
import { config } from './config';

/** Module-level browser instance shared across all scenarios. */
let browser: Browser;

/**
 * Launch the Chromium browser once before all scenarios.
 */
BeforeAll(async function () {
  browser = await chromium.launch({ headless: true });
});

/**
 * Close the browser after all scenarios have completed.
 */
AfterAll(async function () {
  if (browser) {
    await browser.close();
  }
});

/**
 * Before each scenario:
 * 1. Create a new browser context (clean state, no cookies/storage).
 * 2. Create a new page within that context.
 * 3. Initialize the ChatbotPage page object.
 * 4. Navigate to the chatbot URL.
 * 5. Wait for the page to load within 10 seconds.
 *
 * If navigation times out (>10s), the scenario is skipped with a
 * "service unavailable" message per Requirement 11.6.
 */
Before(async function () {
  this.context = await browser.newContext();
  this.page = await this.context.newPage();
  this.chatbotPage = new ChatbotPage(this.page);

  try {
    await this.page.goto(config.baseUrl, { timeout: 10000 });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 });
  } catch (error: unknown) {
    // Page load exceeded 10s — skip scenario as service unavailable
    await this.context.close();
    return 'skipped';
  }
});

/**
 * After each scenario:
 * 1. If the scenario failed, capture a full-page screenshot and attach
 *    it to the Allure report via this.attach().
 * 2. Close the browser context to ensure clean state for the next scenario.
 * 3. Apply the configured inter-scenario delay to mitigate rate limiting.
 */
After(async function (scenario) {
  // Capture screenshot on failure and attach to Allure report
  if (scenario.result?.status === Status.FAILED) {
    try {
      const screenshot = await this.page.screenshot({ fullPage: true });
      this.attach(screenshot, 'image/png');
    } catch {
      // If screenshot capture fails, log warning but don't fail the scenario
      console.warn('Warning: Failed to capture screenshot for failed scenario.');
    }
  }

  // Close the browser context
  if (this.context) {
    await this.context.close();
  }

  // Apply inter-scenario delay to mitigate rate limiting
  await new Promise<void>((resolve) => setTimeout(resolve, config.interScenarioDelay));
});
