/**
 * Custom Cucumber World with Playwright integration.
 * Extends the default Cucumber World to provide browser automation context,
 * page objects, and validation utilities to all step definitions.
 *
 * Properties `page`, `context`, and `chatbotPage` are initialized by
 * Before hooks (see hooks.ts) to ensure fresh browser state per scenario.
 */

import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import { Page, BrowserContext } from 'playwright';
import { ResponseValidator } from '../validators/response-validator';
import { TestConfig, config } from './config';

/**
 * ChatbotPage interface — defines the contract for page interactions.
 */
export interface ChatbotPage {
  navigateTo(): Promise<void>;
  startNewChat(): Promise<void>;
  sendMessage(text: string): Promise<void>;
  getLatestResponse(): Promise<string>;
  waitForResponseComplete(timeoutMs?: number): Promise<void>;
  isChatInputInteractive(): Promise<boolean>;
  isSubmitEnabled(): Promise<boolean>;
  getSuggestedPrompts(): Promise<string[]>;
  isRateLimited(): Promise<boolean>;
}

/**
 * Custom Cucumber World bridging Cucumber.js with Playwright.
 * Manages browser lifecycle references and provides shared utilities
 * for step definitions across all feature files.
 */
export class CustomWorld extends World {
  /** Playwright page instance — set by Before hook */
  page!: Page;

  /** Playwright browser context — set by Before hook */
  context!: BrowserContext;

  /** Page object for chatbot interactions — set by Before hook */
  chatbotPage!: ChatbotPage;

  /** Response validator for layered assertion strategy */
  validator: ResponseValidator;

  /** Test configuration loaded from environment variables */
  config: TestConfig;

  /** Last chatbot response text captured during the scenario */
  lastResponse: string;

  constructor(options: IWorldOptions) {
    super(options);
    this.validator = new ResponseValidator();
    this.config = config;
    this.lastResponse = '';
  }
}

setWorldConstructor(CustomWorld);
