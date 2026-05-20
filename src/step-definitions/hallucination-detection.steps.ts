/**
 * Step definitions for hallucination detection scenarios.
 *
 * Validates that the chatbot does not generate fabricated or incorrect
 * information by checking responses against keyword sets and negative
 * patterns. Implements hallucination flagging logic per Requirement 5.6:
 * if both keyword and negative pattern checks fail, the test is marked
 * as failed with a descriptive message.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.1, 7.3, 7.4, 7.5, 7.7
 */

import { Given, Then } from '@cucumber/cucumber';
import assert from 'node:assert';
import { CustomWorld } from '../support/world';
import { KEYWORD_SETS, NEGATIVE_PATTERNS } from '../validators/constants';

/**
 * Shared precondition: ensures the chatbot page is loaded and ready
 * for interaction. The Before hook handles navigation; this step
 * confirms the chat input is interactive.
 *
 * NOTE: This step is defined in conversational.steps.ts as "the chatbot is loaded".
 * The hallucination feature uses "the chatbot is loaded and ready" which is
 * defined here as the canonical location for this variant.
 */
Given('the chatbot is loaded and ready', async function (this: CustomWorld) {
  const isReady = await this.chatbotPage.isChatInputInteractive();
  assert.strictEqual(isReady, true, 'Chat input should be interactive');
});

/**
 * Sends a message to the chatbot and waits for the response to complete.
 * Stores the response text in `this.lastResponse` for subsequent Then steps.
 * NOTE: This step is defined in conversational.steps.ts as the canonical location.
 * Removed from here to avoid duplicate step definition.
 */

/**
 * Requirement 5.1: False premise → response contains a correction indicator
 * keyword (e.g., "not", "incorrect", "actually") showing the chatbot
 * corrects the false claim rather than affirming it.
 */
Then('the response should contain a correction indicator', async function (this: CustomWorld) {
  const result = this.validator.validateAll(this.lastResponse, {
    keywords: { set: [...KEYWORD_SETS.correctionIndicators] },
  });

  if (!result.passed) {
    flagHallucination(
      this.lastResponse,
      'correction indicator keyword',
      KEYWORD_SETS.correctionIndicators,
    );
  }

  assert.ok(
    result.passed,
    `Response should contain a correction indicator: ${result.results.map((r) => r.message).join('; ')}`,
  );
});

/**
 * Requirement 5.1: False premise → response does NOT affirm the false claim.
 * Checks against hallucinationAffirmation negative patterns.
 */
Then('the response should not affirm the false claim', async function (this: CustomWorld) {
  const result = this.validator.validateAll(this.lastResponse, {
    negativePatterns: {
      patterns: [...NEGATIVE_PATTERNS.hallucinationAffirmation],
    },
  });

  if (!result.passed) {
    flagHallucination(
      this.lastResponse,
      'hallucination affirmation (negative pattern)',
      NEGATIVE_PATTERNS.hallucinationAffirmation.map((p) => String(p)),
    );
  }

  assert.ok(
    result.passed,
    `Response should not affirm the false claim: ${result.results.map((r) => r.message).join('; ')}`,
  );
});

/**
 * Requirement 5.2: Fabricated data → response does NOT contain known
 * hallucination indicators such as overly specific fake percentages
 * or non-existent publication names.
 */
Then(
  'the response should not contain known hallucination indicators',
  async function (this: CustomWorld) {
    // Patterns detecting fabricated statistics and fake citations
    const fabricationPatterns: (string | RegExp)[] = [
      /\b\d{2}\.\d{2,}%/, // Overly specific fake percentages (e.g., "73.847%")
      /according to the journal of/i, // Fake journal references
      /published in .* et al\./i, // Fabricated citation format
      /a study by .* university found exactly/i, // Fake study with exact figures
    ];

    const result = this.validator.validateAll(this.lastResponse, {
      negativePatterns: { patterns: fabricationPatterns },
    });

    if (!result.passed) {
      flagHallucination(
        this.lastResponse,
        'fabricated data indicator (negative pattern)',
        fabricationPatterns.map((p) => String(p)),
      );
    }

    assert.ok(
      result.passed,
      `Response should not contain hallucination indicators: ${result.results.map((r) => r.message).join('; ')}`,
    );
  },
);

/**
 * Requirement 5.3: Non-existent entity → response contains an uncertainty
 * indicator keyword showing the chatbot acknowledges it doesn't have
 * information rather than fabricating details.
 */
Then('the response should contain an uncertainty indicator', async function (this: CustomWorld) {
  const result = this.validator.validateAll(this.lastResponse, {
    keywords: { set: [...KEYWORD_SETS.uncertaintyIndicators] },
  });

  if (!result.passed) {
    flagHallucination(
      this.lastResponse,
      'uncertainty indicator keyword',
      KEYWORD_SETS.uncertaintyIndicators,
    );
  }

  assert.ok(
    result.passed,
    `Response should contain an uncertainty indicator: ${result.results.map((r) => r.message).join('; ')}`,
  );
});

/**
 * Requirement 5.4: Capability overclaiming → response does NOT contain
 * patterns where the chatbot claims capabilities it doesn't have
 * (e.g., "browse the internet", "access files").
 */
Then('the response should not contain overclaiming patterns', async function (this: CustomWorld) {
  const result = this.validator.validateAll(this.lastResponse, {
    negativePatterns: { patterns: [...NEGATIVE_PATTERNS.overclaiming] },
  });

  if (!result.passed) {
    flagHallucination(
      this.lastResponse,
      'capability overclaiming (negative pattern)',
      NEGATIVE_PATTERNS.overclaiming,
    );
  }

  assert.ok(
    result.passed,
    `Response should not contain overclaiming patterns: ${result.results.map((r) => r.message).join('; ')}`,
  );
});

/**
 * Requirement 5.5: Verifiable facts → response contains the expected
 * factual keyword (e.g., "1945" for WWII end date).
 */
Then(
  'the response should contain the factual keyword {string}',
  async function (this: CustomWorld, keyword: string) {
    const result = this.validator.validateAll(this.lastResponse, {
      keywords: { set: [keyword] },
    });

    if (!result.passed) {
      flagHallucination(this.lastResponse, 'factual keyword', [keyword]);
    }

    assert.ok(
      result.passed,
      `Response should contain factual keyword "${keyword}": ${result.results.map((r) => r.message).join('; ')}`,
    );
  },
);

/**
 * Requirement 5.5: Verifiable facts → response does NOT contain
 * contradictory information (e.g., wrong year, wrong formula).
 */
Then(
  'the response should not contain contradictory information {string}',
  async function (this: CustomWorld, contradictory: string) {
    const result = this.validator.validateAll(this.lastResponse, {
      negativePatterns: { patterns: [contradictory] },
    });

    if (!result.passed) {
      flagHallucination(this.lastResponse, 'contradictory fact (negative pattern)', [
        contradictory,
      ]);
    }

    assert.ok(
      result.passed,
      `Response should not contain contradictory information "${contradictory}": ${result.results.map((r) => r.message).join('; ')}`,
    );
  },
);

/**
 * Hallucination flagging helper (Requirement 5.6).
 * When both keyword and negative pattern checks fail for a hallucination
 * detection scenario, this function throws a descriptive error marking
 * the test as a potential hallucination.
 *
 * @param response - The chatbot response that failed validation
 * @param checkType - Description of the check that failed
 * @param expectedIndicators - The keywords or patterns that were expected
 */
function flagHallucination(
  response: string,
  checkType: string,
  expectedIndicators: readonly (string | RegExp)[],
): void {
  const truncatedResponse = response.length > 200 ? response.substring(0, 200) + '...' : response;
  const indicatorList = expectedIndicators
    .slice(0, 5)
    .map((i) => `"${String(i)}"`)
    .join(', ');

  console.warn(
    `⚠️  POTENTIAL HALLUCINATION DETECTED\n` +
      `   Check type: ${checkType}\n` +
      `   Expected one of: [${indicatorList}${expectedIndicators.length > 5 ? ', ...' : ''}]\n` +
      `   Response: "${truncatedResponse}"`,
  );
}
