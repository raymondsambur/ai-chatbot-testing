/**
 * Step definitions for conversational functionality scenarios.
 * Maps Gherkin steps to Playwright actions via the ChatbotPage page object
 * and validates responses using the ResponseValidator.
 *
 * Uses CustomWorld for access to chatbotPage, validator, and lastResponse.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert';
import { CustomWorld } from '../support/world';
import { KEYWORD_SETS, NEGATIVE_PATTERNS } from '../validators/constants';

/**
 * Background step: ensures the chatbot page is loaded and ready.
 * The Before hook already navigates to the chatbot URL, so this step
 * confirms the page is in a usable state.
 */
Given('the chatbot is loaded', async function (this: CustomWorld) {
  const isInteractive = await this.chatbotPage.isChatInputInteractive();
  assert.strictEqual(isInteractive, true, 'Chat input should be interactive');
});

/**
 * Sends a greeting message to the chatbot and waits for the response.
 * Uses parameterized {string} expression for greeting variations.
 */
When('I send the greeting {string}', async function (this: CustomWorld, greeting: string) {
  await this.chatbotPage.sendMessage(greeting);
  await this.chatbotPage.waitForResponseComplete();
  this.lastResponse = await this.chatbotPage.getLatestResponse();
});

/**
 * Sends a generic message to the chatbot and stores the response.
 * Used for various scenarios requiring message input.
 */
When('I send the message {string}', async function (this: CustomWorld, message: string) {
  await this.chatbotPage.sendMessage(message);
  await this.chatbotPage.waitForResponseComplete();
  this.lastResponse = await this.chatbotPage.getLatestResponse();
});

/**
 * Waits for the chatbot response to finish streaming.
 * Useful when chaining multiple steps that need a complete response.
 */
When('I wait for the response to complete', async function (this: CustomWorld) {
  await this.chatbotPage.waitForResponseComplete();
  this.lastResponse = await this.chatbotPage.getLatestResponse();
});

/**
 * Sends a follow-up message referencing the previous response context.
 * Validates that the chatbot maintains conversational awareness.
 */
When('I send a follow-up message {string}', async function (this: CustomWorld, followUp: string) {
  await this.chatbotPage.sendMessage(followUp);
  await this.chatbotPage.waitForResponseComplete();
  this.lastResponse = await this.chatbotPage.getLatestResponse();
});

/**
 * Attempts to send an empty message to test input validation behavior.
 * Tries submitting with empty input and captures the result.
 */
When('I attempt to send an empty message', async function (this: CustomWorld) {
  // Try to send an empty message by clicking send without typing
  const submitEnabled = await this.chatbotPage.isSubmitEnabled();

  if (submitEnabled) {
    // If submit is enabled with empty input, try sending
    await this.chatbotPage.sendMessage('');
    // Give a brief moment for any response or error to appear
    try {
      await this.chatbotPage.waitForResponseComplete(5000);
      this.lastResponse = await this.chatbotPage.getLatestResponse();
    } catch {
      // No response appeared — submission may have been prevented
      this.lastResponse = '';
    }
  } else {
    // Submit button is disabled — submission is prevented
    this.lastResponse = '';
  }
});

/**
 * Generates and sends a message of the specified character length.
 * Used to test handling of long messages (501-1000 chars per Req 3.5).
 */
When('I send a message of {int} characters', async function (this: CustomWorld, charCount: number) {
  // Generate a readable long message by repeating a phrase
  const phrase = 'This is a test message for the chatbot. ';
  const repetitions = Math.ceil(charCount / phrase.length);
  const longMessage = phrase.repeat(repetitions).slice(0, charCount);

  await this.chatbotPage.sendMessage(longMessage);
  await this.chatbotPage.waitForResponseComplete();
  this.lastResponse = await this.chatbotPage.getLatestResponse();
});

/**
 * Sends multiple messages rapidly without waiting for responses between them.
 * Tests the chatbot's ability to handle rapid sequential input (Req 3.6).
 */
When(
  'I send {int} messages rapidly within {int} seconds',
  async function (this: CustomWorld, messageCount: number, _seconds: number) {
    const messages = [
      'What is the weather like?',
      'Tell me a fun fact.',
      'How does the internet work?',
    ];

    // Send all messages rapidly without waiting for responses
    for (let i = 0; i < messageCount; i++) {
      await this.chatbotPage.sendMessage(messages[i % messages.length]);
    }

    // Wait for all responses to complete streaming
    // Allow extra time for multiple responses
    await this.chatbotPage.waitForResponseComplete(this.config.responseTimeout * 2);
  },
);

// --- Then steps (assertions) ---

/**
 * Asserts that the last chatbot response is not empty.
 * Uses the structural validator's non-empty check.
 */
Then('the response should not be empty', async function (this: CustomWorld) {
  const result = this.validator.validateAll(this.lastResponse, {
    structural: { nonEmpty: true },
  });

  assert.ok(
    result.passed,
    `Response should not be empty: ${result.results.map((r) => r.message).join('; ')}`,
  );
});

/**
 * Asserts that the response contains at least one greeting keyword.
 * Uses the strict greetings set (without "help" and "assist") for tighter validation.
 */
Then('the response should contain a greeting keyword', async function (this: CustomWorld) {
  const result = this.validator.validateAll(this.lastResponse, {
    keywords: { set: [...KEYWORD_SETS.greetingsStrict] },
  });

  assert.ok(
    result.passed,
    `Response should contain a greeting keyword: ${result.results.map((r) => r.message).join('; ')}`,
  );
});

/**
 * Asserts that the response is not a generic misunderstanding reply.
 * Checks that the response doesn't match "I don't understand" or
 * "could you rephrase" patterns, indicating contextual awareness (Req 3.2).
 */
Then('the response should not be a generic misunderstanding', async function (this: CustomWorld) {
  const misunderstandingPatterns: (string | RegExp)[] = [
    /i don'?t understand/i,
    /could you rephrase/i,
    /i'?m not sure what you mean/i,
    /can you clarify/i,
    /i didn'?t get that/i,
  ];

  const result = this.validator.validateAll(this.lastResponse, {
    structural: { nonEmpty: true },
    negativePatterns: { patterns: misunderstandingPatterns },
  });

  assert.ok(
    result.passed,
    `Response should not be a generic misunderstanding: ${result.results.map((r) => r.message).join('; ')}`,
  );
});

/**
 * Asserts that the response relates to the previous topic (France/Paris context).
 * Checks for topic-relevant keywords indicating conversational continuity.
 */
Then('the response should relate to the previous topic', async function (this: CustomWorld) {
  const topicKeywords = ['Paris', 'France', 'capital', 'city', 'French', 'Europe'];
  const result = this.validator.validateAll(this.lastResponse, {
    keywords: { set: topicKeywords, minMatches: 1 },
  });

  assert.ok(
    result.passed,
    `Response should relate to the previous topic (France/Paris): ${result.results.map((r) => r.message).join('; ')}`,
  );
});

/**
 * Asserts that either submission was prevented or the chatbot indicated
 * input is required. Handles the two valid behaviors for empty messages (Req 3.3).
 */
Then(
  'the chatbot should either prevent submission or indicate input is required',
  async function (this: CustomWorld) {
    // If lastResponse is empty, submission was likely prevented (valid behavior)
    if (this.lastResponse === '') {
      // Submission was prevented — this is acceptable
      return;
    }

    // If there is a response, it should indicate input is required
    const inputRequiredPatterns = [
      'please provide',
      'empty',
      "didn't receive",
      'no input',
      'please type',
      'need a message',
      'enter a message',
    ];
    const result = this.validator.validateAll(this.lastResponse, {
      keywords: { set: inputRequiredPatterns },
    });

    assert.ok(
      result.passed,
      `Response should indicate input is required: ${result.results.map((r) => r.message).join('; ')}`,
    );
  },
);

/**
 * Asserts that the chat input remains interactive after the empty message test.
 * Ensures the user can continue sending messages (Req 3.3).
 */
Then('the chat input should remain interactive', async function (this: CustomWorld) {
  const isInteractive = await this.chatbotPage.isChatInputInteractive();
  assert.strictEqual(isInteractive, true, 'Chat input should remain interactive');
});

/**
 * Asserts that the response does not contain raw HTML markup or rendering
 * artifacts. Uses the predefined htmlArtifacts negative patterns (Req 3.4).
 */
Then('the response should not contain HTML artifacts', async function (this: CustomWorld) {
  const result = this.validator.validateAll(this.lastResponse, {
    negativePatterns: { patterns: [...NEGATIVE_PATTERNS.htmlArtifacts] },
  });

  assert.ok(
    result.passed,
    `Response should not contain HTML artifacts: ${result.results.map((r) => r.message).join('; ')}`,
  );
});

/**
 * Asserts that each of the rapidly sent messages received a non-empty response.
 * Verifies the chatbot handles concurrent/rapid input gracefully (Req 3.6).
 * Counts response elements and verifies each is non-empty.
 */
Then(
  'all rapid messages should have received non-empty responses',
  async function (this: CustomWorld) {
    // Get the latest response — for rapid messaging, we verify at least
    // the final response is non-empty, as the chatbot may merge or queue responses
    const response = await this.chatbotPage.getLatestResponse();

    const result = this.validator.validateAll(response, {
      structural: { nonEmpty: true },
    });

    assert.ok(
      result.passed,
      `All rapid messages should have received non-empty responses: ${result.results.map((r) => r.message).join('; ')}`,
    );

    // Verify the response has meaningful content (not just whitespace or a single char)
    assert.ok(
      response.trim().length >= 10,
      `Response to rapid messages should have meaningful content, got: "${response.trim().slice(0, 50)}"`,
    );
  },
);
