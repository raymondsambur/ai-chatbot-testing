/**
 * ChatbotPage — Page Object Model for the AI chatbot demo.
 * Encapsulates all UI interactions with the chatbot interface at
 * https://chatbot.ai-sdk.dev/demo, following the locator priority:
 * 1. Accessibility roles/labels
 * 2. data-testid attributes
 * 3. CSS selectors (last resort)
 */

import { Page, Locator } from 'playwright';
import { config } from '../support/config';

/** Maximum time (ms) to wait for an element before throwing */
const ELEMENT_TIMEOUT = config.actionTimeout; // 10s default

/** Maximum time (ms) to wait for response completion */
const RESPONSE_TIMEOUT = config.responseTimeout; // 30s default

/** Polling interval (ms) for response completion detection */
const POLL_INTERVAL_MS = 200;

/**
 * Number of consecutive identical polls required to consider
 * the response complete. 5 polls × 200ms = 1000ms of stability.
 */
const STABLE_POLL_COUNT = 5;

export class ChatbotPage {
  private readonly page: Page;

  // --- Locators ---

  /** The chat message input textarea */
  private get chatInput(): Locator {
    return this.page.getByRole('textbox', { name: /message/i });
  }

  /** The send/submit button */
  private get sendButton(): Locator {
    return this.page.getByRole('button', { name: /send/i });
  }

  /**
   * All assistant response message elements.
   * Uses data-role attribute commonly used in AI SDK chat UIs,
   * falling back to a CSS selector for assistant message containers.
   */
  private get responseMessages(): Locator {
    return this.page.locator('[data-role="assistant"]');
  }

  /** The "New chat" sidebar control */
  private get newChatButton(): Locator {
    return this.page.getByRole('button', { name: /new chat/i });
  }

  /** Suggested prompt buttons displayed in the chat interface */
  private get suggestedPromptButtons(): Locator {
    return this.page.getByRole('button').filter({ hasText: /\?$|\.{3}$|!$/ });
  }

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigates to the chatbot demo URL and waits for the page to be ready.
   */
  async navigateTo(): Promise<void> {
    await this.page.goto(config.baseUrl, {
      timeout: config.navigationTimeout,
      waitUntil: 'domcontentloaded',
    });
    // Wait for the chat input to be visible, confirming the page loaded
    await this.chatInput.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
  }

  /**
   * Sends a message to the chatbot by typing into the input and clicking send.
   * Waits for the input to be ready before typing.
   */
  async sendMessage(text: string): Promise<void> {
    const input = this.chatInput;
    await input.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
    await input.fill(text);

    const submitBtn = this.sendButton;
    await submitBtn.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
    await submitBtn.click();
  }

  /**
   * Returns the text content of the most recent assistant response element.
   * Throws a descriptive error if no response element is found within timeout.
   */
  async getLatestResponse(): Promise<string> {
    // Wait for at least one response to exist
    const firstResponse = this.responseMessages.first();
    await firstResponse.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT }).catch(() => {
      throw new Error(
        `ChatbotPage: No assistant response element found within ${ELEMENT_TIMEOUT}ms. ` +
          `Locator: [data-role="assistant"]`,
      );
    });

    const count = await this.responseMessages.count();
    if (count === 0) {
      throw new Error(
        `ChatbotPage: No assistant response elements found. ` + `Locator: [data-role="assistant"]`,
      );
    }

    const lastResponse = this.responseMessages.nth(count - 1);
    const text = await lastResponse.textContent();
    return text?.trim() ?? '';
  }

  /**
   * Waits for the streamed response to finish loading.
   * Uses a polling strategy: checks response text every 200ms.
   * If content hasn't changed for 1000ms (5 consecutive identical polls),
   * the response is considered complete.
   *
   * @param timeoutMs - Maximum wait time in ms (default: 30000)
   * @throws Error if response doesn't stabilize within the timeout
   */
  async waitForResponseComplete(timeoutMs: number = RESPONSE_TIMEOUT): Promise<void> {
    const startTime = Date.now();
    let previousContent = '';
    let stableCount = 0;

    while (Date.now() - startTime < timeoutMs) {
      await this.page.waitForTimeout(POLL_INTERVAL_MS);

      const currentContent = await this.getLatestResponseContent();

      if (currentContent === previousContent && currentContent.length > 0) {
        stableCount++;
      } else {
        stableCount = 0;
        previousContent = currentContent;
      }

      // 5 consecutive identical polls = 1000ms of stability
      if (stableCount >= STABLE_POLL_COUNT) {
        return;
      }
    }

    throw new Error(
      `ChatbotPage: Response did not stabilize within ${timeoutMs}ms. ` +
        `Content was still changing after ${STABLE_POLL_COUNT} stability checks. ` +
        `Last content length: ${previousContent.length} characters.`,
    );
  }

  /**
   * Starts a new chat conversation by clicking the "New chat" sidebar control.
   * Ensures test isolation between scenarios.
   */
  async startNewChat(): Promise<void> {
    const btn = this.newChatButton;
    await btn.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT }).catch(() => {
      throw new Error(
        `ChatbotPage: "New chat" button not found within ${ELEMENT_TIMEOUT}ms. ` +
          `Locator: button with name matching /new chat/i`,
      );
    });
    await btn.click();
    // Wait for the chat input to reappear, confirming new chat is ready
    await this.chatInput.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
  }

  /**
   * Checks whether the chat input is interactive (visible and enabled).
   */
  async isChatInputInteractive(): Promise<boolean> {
    try {
      const input = this.chatInput;
      await input.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
      return await input.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Checks whether the submit/send button is currently enabled.
   */
  async isSubmitEnabled(): Promise<boolean> {
    try {
      const btn = this.sendButton;
      await btn.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
      return await btn.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Returns the text content of all visible suggested prompt buttons.
   */
  async getSuggestedPrompts(): Promise<string[]> {
    try {
      // Give a short wait for prompts to appear, but don't fail if none exist
      await this.suggestedPromptButtons.first().waitFor({
        state: 'visible',
        timeout: 3000,
      });
    } catch {
      // No suggested prompts visible — return empty array
      return [];
    }

    const count = await this.suggestedPromptButtons.count();
    const prompts: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await this.suggestedPromptButtons.nth(i).textContent();
      if (text?.trim()) {
        prompts.push(text.trim());
      }
    }

    return prompts;
  }

  /**
   * Detects whether the chatbot is currently rate limited.
   * Checks for HTTP 429 indicators or "rate limit" text in the page.
   */
  async isRateLimited(): Promise<boolean> {
    // Check for rate limit text in the page body
    const bodyText = await this.page.locator('body').textContent();
    if (bodyText && /rate.?limit|429|too many requests/i.test(bodyText)) {
      return true;
    }

    // Check for error elements that might indicate rate limiting
    const errorElements = this.page.locator('[role="alert"], .error, [data-testid="error"]');
    const errorCount = await errorElements.count();

    for (let i = 0; i < errorCount; i++) {
      const text = await errorElements.nth(i).textContent();
      if (text && /rate.?limit|429|too many requests|throttl/i.test(text)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Internal helper to get the latest response content without throwing
   * if no response exists yet (returns empty string).
   */
  private async getLatestResponseContent(): Promise<string> {
    const count = await this.responseMessages.count();
    if (count === 0) {
      return '';
    }
    const lastResponse = this.responseMessages.nth(count - 1);
    const text = await lastResponse.textContent();
    return text?.trim() ?? '';
  }
}
