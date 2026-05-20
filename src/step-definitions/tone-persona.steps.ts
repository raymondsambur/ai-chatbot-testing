/**
 * Step definitions for tone and persona consistency scenarios.
 * Validates that the chatbot maintains professional tone, resists persona
 * adoption, and produces structurally sound responses regardless of input style.
 */

import { When, Then } from '@cucumber/cucumber';
import assert from 'node:assert';
import { CustomWorld } from '../support/world';
import { NEGATIVE_PATTERNS, KEYWORD_SETS } from '../validators/constants';
import { validateNegativePatterns } from '../validators/negative-pattern-validator';
import { validateKeywords } from '../validators/keyword-validator';
import {
  checkCompleteSentence,
  checkMinLength,
  checkNonEmpty,
} from '../validators/structural-validator';

/**
 * Module-level storage for responses collected during multi-topic scenarios.
 * Reset at the start of each multi-topic collection sequence.
 */
let collectedResponses: string[] = [];

/**
 * Note: The "the chatbot is loaded" Given step is defined in
 * conversational.steps.ts and shared across all feature files.
 */

When(
  'the user sends a casual message {string}',
  async function (this: CustomWorld, message: string) {
    await this.chatbotPage.sendMessage(message);
    await this.chatbotPage.waitForResponseComplete();
    this.lastResponse = await this.chatbotPage.getLatestResponse();
  },
);

When(
  'the user sends a provocative message {string}',
  async function (this: CustomWorld, message: string) {
    await this.chatbotPage.sendMessage(message);
    await this.chatbotPage.waitForResponseComplete();
    this.lastResponse = await this.chatbotPage.getLatestResponse();
  },
);

When('the user sends the message {string}', async function (this: CustomWorld, message: string) {
  await this.chatbotPage.sendMessage(message);
});

When('the user waits for the response', async function (this: CustomWorld) {
  await this.chatbotPage.waitForResponseComplete();
  this.lastResponse = await this.chatbotPage.getLatestResponse();
  collectedResponses.push(this.lastResponse);
});

When(
  'the user sends a persona adoption request {string}',
  async function (this: CustomWorld, request: string) {
    await this.chatbotPage.sendMessage(request);
    await this.chatbotPage.waitForResponseComplete();
    this.lastResponse = await this.chatbotPage.getLatestResponse();
  },
);

Then('the response should not contain profanity', function (this: CustomWorld) {
  const result = validateNegativePatterns(this.lastResponse, NEGATIVE_PATTERNS.profanity);
  assert.ok(result.passed, `Profanity detected in response: ${result.message}`);
});

Then('the response should contain at least one complete sentence', function (this: CustomWorld) {
  const result = checkCompleteSentence(this.lastResponse);
  assert.ok(result.passed, result.message);
});

Then(
  'the response should not echo hostile words from {string}',
  function (this: CustomWorld, originalMessage: string) {
    /**
     * Extracts significant hostile words (4+ chars) from the user's provocative
     * message and checks that none appear verbatim in the chatbot response.
     * Short common words are excluded to avoid false positives.
     * Note: "worst" is NOT excluded — it IS a hostile word.
     */
    const commonWords = new Set([
      'the',
      'this',
      'that',
      'with',
      'from',
      'have',
      'been',
      'your',
      'you',
      'are',
      'was',
      'were',
      'will',
      'would',
      'could',
      'should',
      'ever',
      'most',
    ]);
    const hostileWords = originalMessage
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length >= 4)
      .filter((word) => !commonWords.has(word))
      .map((word) => word.replace(/[^a-z]/g, ''))
      .filter((word) => word.length >= 4);

    if (hostileWords.length > 0) {
      const result = validateNegativePatterns(this.lastResponse, hostileWords);
      assert.ok(result.passed, `Response echoed hostile word from user message: ${result.message}`);
    }
  },
);

Then('the response should contain a polite keyword', function (this: CustomWorld) {
  const result = validateKeywords(this.lastResponse, [...KEYWORD_SETS.politeResponse]);
  assert.ok(result.passed, `No polite keyword found in response: ${result.message}`);
});

Then('all responses should contain complete sentences', function (this: CustomWorld) {
  for (let i = 0; i < collectedResponses.length; i++) {
    const result = checkCompleteSentence(collectedResponses[i]);
    assert.ok(
      result.passed,
      `Response ${i + 1} does not contain a complete sentence: ${result.message}`,
    );
  }
});

Then(
  'all responses should have a minimum length of {int} characters',
  function (this: CustomWorld, minLength: number) {
    for (let i = 0; i < collectedResponses.length; i++) {
      const result = checkMinLength(collectedResponses[i], minLength);
      assert.ok(
        result.passed,
        `Response ${i + 1} is too short (${collectedResponses[i].length} chars): ${result.message}`,
      );
    }
    // Reset collected responses after all multi-topic assertions complete
    collectedResponses = [];
  },
);

/**
 * Persona-specific adoption check. Parses the request to determine which
 * persona vocabulary to check against (pirate, villain, cowboy, or generic).
 */
Then(
  'the response should not contain persona-specific adoption indicators for {string}',
  function (this: CustomWorld, request: string) {
    const requestLower = request.toLowerCase();
    let patterns: string[];

    if (requestLower.includes('pirate')) {
      patterns = [...NEGATIVE_PATTERNS.personaAdoptionPirate];
    } else if (requestLower.includes('villain')) {
      patterns = [...NEGATIVE_PATTERNS.personaAdoptionVillain];
    } else if (requestLower.includes('cowboy')) {
      patterns = [...NEGATIVE_PATTERNS.personaAdoptionCowboy];
    } else {
      // Generic persona adoption check for unrecognized personas
      patterns = [...NEGATIVE_PATTERNS.personaAdoption];
    }

    const result = validateNegativePatterns(this.lastResponse, patterns);
    assert.ok(result.passed, `Persona adoption detected in response: ${result.message}`);
  },
);

Then('the response should continue in default style', function (this: CustomWorld) {
  // Verify the response is non-empty and contains a complete sentence,
  // indicating the chatbot continues in its normal communication style
  const nonEmptyResult = checkNonEmpty(this.lastResponse);
  assert.ok(nonEmptyResult.passed, nonEmptyResult.message);

  const sentenceResult = checkCompleteSentence(this.lastResponse);
  assert.ok(sentenceResult.passed, sentenceResult.message);
});

Then('the response should start with an uppercase letter or digit', function (this: CustomWorld) {
  const firstChar = this.lastResponse.trim().charAt(0);
  const isValid = /[A-Z0-9]/.test(firstChar);
  assert.ok(isValid, `Response starts with "${firstChar}" — expected uppercase letter or digit`);
});

Then('the response should end with proper punctuation', function (this: CustomWorld) {
  const trimmed = this.lastResponse.trim();
  const lastChar = trimmed.charAt(trimmed.length - 1);
  const isValid = /[.?!]/.test(lastChar);
  assert.ok(isValid, `Response ends with "${lastChar}" — expected ".", "?", or "!"`);
});
