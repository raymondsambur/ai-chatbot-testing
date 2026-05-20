/**
 * Step definitions for intent recognition feature scenarios.
 * Validates that the chatbot correctly identifies user intents including
 * factual questions, help requests, command-style inputs, sentiment/opinion,
 * and ambiguous questions using layered validation with keyword sets
 * and structural assertions.
 */

import { When, Then } from '@cucumber/cucumber';
import assert from 'node:assert';
import { CustomWorld } from '../support/world';
import { KEYWORD_SETS, NEGATIVE_PATTERNS } from '../validators/constants';

/**
 * Shared precondition: ensures the chatbot page is loaded and the
 * chat input is interactive before each scenario.
 * NOTE: This step is now defined in hallucination-detection.steps.ts
 * as the canonical location. Removed from here to avoid duplicate.
 */

// --- Factual Questions (Requirement 4.1) ---

When(
  'the user asks a factual question {string}',
  async function (this: CustomWorld, question: string) {
    await this.chatbotPage.sendMessage(question);
    await this.chatbotPage.waitForResponseComplete();
    this.lastResponse = await this.chatbotPage.getLatestResponse();
  },
);

Then(
  'the response should contain a keyword from the topic set {string}',
  async function (this: CustomWorld, keywordsCsv: string) {
    const keywords = keywordsCsv.split(',').map((k) => k.trim());
    const result = this.validator.validateAll(this.lastResponse, {
      keywords: { set: keywords, minMatches: 1 },
    });
    assert.ok(
      result.passed,
      `Response should contain a keyword from topic set [${keywordsCsv}]: ${result.results.map((r) => r.message).join('; ')}`,
    );
  },
);

// NOTE: "the response should contain at least one complete sentence" step
// is defined in tone-persona.steps.ts as the canonical location.

// --- Help Requests (Requirement 4.2) ---

When('the user sends a help request {string}', async function (this: CustomWorld, message: string) {
  await this.chatbotPage.sendMessage(message);
  await this.chatbotPage.waitForResponseComplete();
  this.lastResponse = await this.chatbotPage.getLatestResponse();
});

Then(
  'the response should contain a keyword from the help request set',
  async function (this: CustomWorld) {
    const result = this.validator.validateAll(this.lastResponse, {
      keywords: { set: [...KEYWORD_SETS.helpRequest], minMatches: 1 },
    });
    assert.ok(
      result.passed,
      `Response should contain a help request keyword: ${result.results.map((r) => r.message).join('; ')}`,
    );
  },
);

Then(
  'the response should have a minimum length of {int} characters',
  async function (this: CustomWorld, minLength: number) {
    const result = this.validator.validateAll(this.lastResponse, {
      structural: { minLength },
    });
    assert.ok(
      result.passed,
      `Response should have minimum length of ${minLength} characters: ${result.results.map((r) => r.message).join('; ')}`,
    );
  },
);

// --- Command-Style Inputs (Requirement 4.3) ---

When(
  'the user sends a command-style input {string}',
  async function (this: CustomWorld, command: string) {
    this.lastResponse = command; // Store the command for later reference
    await this.chatbotPage.sendMessage(command);
    await this.chatbotPage.waitForResponseComplete();
    this.lastResponse = await this.chatbotPage.getLatestResponse();
    // Store the original command in a custom property for the action step
    (this as CustomWorld & { lastCommand?: string }).lastCommand = command;
  },
);

Then(
  'the response should not be a generic acknowledgment only',
  async function (this: CustomWorld) {
    const result = this.validator.validateAll(this.lastResponse, {
      negativePatterns: {
        patterns: [...NEGATIVE_PATTERNS.genericAcknowledgmentOnly],
      },
    });
    assert.ok(
      result.passed,
      `Response should not be a generic acknowledgment only: ${result.results.map((r) => r.message).join('; ')}`,
    );
  },
);

/**
 * Validates that the response demonstrates action on the command.
 * Per-command validation:
 * - translate: check for target language word
 * - list: check for numbered items or bullet points
 * - summarize: check min 100 chars
 * - explain/define: check for substantive explanation
 */
Then('the response should demonstrate action on the command', async function (this: CustomWorld) {
  const command = (
    (this as CustomWorld & { lastCommand?: string }).lastCommand || ''
  ).toLowerCase();
  const response = this.lastResponse;

  if (command.includes('translate')) {
    // For translate commands, check that the response contains a translated word
    // or mentions the target language
    const translateKeywords = [
      'spanish',
      'french',
      'german',
      'hola',
      'bonjour',
      'translation',
      'means',
    ];
    const result = this.validator.validateAll(response, {
      keywords: { set: translateKeywords, minMatches: 1 },
    });
    assert.ok(
      result.passed,
      `Translation response should contain target language content: ${result.results.map((r) => r.message).join('; ')}`,
    );
  } else if (command.includes('list')) {
    // For list commands, check for numbered items or bullet points
    const hasNumberedItems = /\d+[.)]\s/.test(response) || /[-•*]\s/.test(response);
    assert.ok(
      hasNumberedItems,
      `List response should contain numbered items or bullet points, got: "${response.slice(0, 100)}"`,
    );
  } else if (command.includes('summarize') || command.includes('summary')) {
    // For summarize commands, check minimum length
    assert.ok(
      response.length >= 100,
      `Summary response should be at least 100 characters, got ${response.length}`,
    );
  } else if (command.includes('explain') || command.includes('define')) {
    // For explain/define commands, check for substantive explanation
    assert.ok(
      response.length >= 80,
      `Explanation response should be at least 80 characters, got ${response.length}`,
    );
    const result = this.validator.validateAll(response, {
      structural: { completeSentence: true },
    });
    assert.ok(
      result.passed,
      `Explanation should contain complete sentences: ${result.results.map((r) => r.message).join('; ')}`,
    );
  } else {
    // Generic: just verify it's substantive
    assert.ok(
      response.length >= 50,
      `Command response should be substantive (at least 50 chars), got ${response.length}`,
    );
  }
});

/**
 * Validates that the response is not a refusal.
 * Checks against refusalPatterns to ensure the chatbot actually answers.
 */
Then('the response should not be a refusal', async function (this: CustomWorld) {
  const result = this.validator.validateAll(this.lastResponse, {
    negativePatterns: {
      patterns: [...NEGATIVE_PATTERNS.refusalPatterns],
    },
  });
  assert.ok(
    result.passed,
    `Response should not be a refusal: ${result.results.map((r) => r.message).join('; ')}`,
  );
});

// --- Sentiment/Opinion (Requirement 4.4) ---

When(
  'the user expresses a sentiment {string}',
  async function (this: CustomWorld, message: string) {
    await this.chatbotPage.sendMessage(message);
    await this.chatbotPage.waitForResponseComplete();
    this.lastResponse = await this.chatbotPage.getLatestResponse();
  },
);

Then(
  'the response should contain a keyword from the emotional acknowledgment set',
  async function (this: CustomWorld) {
    const result = this.validator.validateAll(this.lastResponse, {
      keywords: {
        set: [...KEYWORD_SETS.emotionalAcknowledgment],
        minMatches: 1,
      },
    });
    assert.ok(
      result.passed,
      `Response should contain an emotional acknowledgment keyword: ${result.results.map((r) => r.message).join('; ')}`,
    );
  },
);

// --- Ambiguous Questions (Requirement 4.5) ---

When(
  'the user asks an ambiguous question {string}',
  async function (this: CustomWorld, question: string) {
    await this.chatbotPage.sendMessage(question);
    await this.chatbotPage.waitForResponseComplete();
    this.lastResponse = await this.chatbotPage.getLatestResponse();
  },
);

/**
 * Validates ambiguous question handling: the response should either contain
 * a clarification keyword OR be at least 100 characters long (indicating
 * the chatbot interpreted and provided a detailed response).
 */
Then(
  'the response should contain a clarification keyword or have a minimum length of {int} characters',
  async function (this: CustomWorld, minLength: number) {
    const keywordResult = this.validator.validateAll(this.lastResponse, {
      keywords: {
        set: [...KEYWORD_SETS.clarificationRequest],
        minMatches: 1,
      },
    });

    const lengthResult = this.validator.validateAll(this.lastResponse, {
      structural: { minLength },
    });

    // Requirement 4.5: passes if EITHER condition is met (OR logic)
    const passed = keywordResult.passed || lengthResult.passed;
    assert.ok(
      passed,
      `Response should contain a clarification keyword or have minimum length of ${minLength} characters`,
    );
  },
);
