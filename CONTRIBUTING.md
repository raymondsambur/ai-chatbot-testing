# Contributing

This guide explains how to add new test scenarios to the AI chatbot test suite.

## Adding a New Feature File

Feature files live in `src/features/` and use Gherkin syntax with the `.feature` extension.

### Structure

```gherkin
@your-tag
Feature: Feature Name
  As a user interacting with the AI chatbot
  I want [capability]
  So that [value]

  Background:
    Given the chatbot is loaded

  Scenario Outline: Descriptive scenario name
    When I send the message "<input>"
    Then the response should not be empty

    Examples:
      | input          |
      | First variant  |
      | Second variant |

  Scenario: Specific behavior being verified
    When I send the message "some input"
    And I wait for the response to complete
    Then the response should not be empty
```

### Guidelines

- Use a `Background` section for shared preconditions (e.g., `Given the chatbot is loaded`)
- Use `Scenario Outline` with `Examples` tables for data-driven tests
- Keep Feature names under 120 characters describing the capability under test
- Keep Scenario names under 120 characters describing the specific behavior
- Tag features with `@your-tag` for selective execution (`npm run test -- --tags @your-tag`)

## Implementing Step Definitions

Step definitions go in `src/step-definitions/` with a `.steps.ts` extension. Each feature file typically has a matching step definitions file.

### Basic Pattern

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world.js';
import { KEYWORD_SETS, NEGATIVE_PATTERNS } from '../validators/constants.js';

When('I send the message {string}', async function (this: CustomWorld, message: string) {
  await this.chatbotPage.sendMessage(message);
  await this.chatbotPage.waitForResponseComplete();
  this.lastResponse = await this.chatbotPage.getLatestResponse();
});

Then('the response should contain a help keyword', async function (this: CustomWorld) {
  const result = this.validator.validateAll(this.lastResponse, {
    keywords: { set: [...KEYWORD_SETS.helpRequest] },
  });
  expect(result.passed).toBe(true);
});
```

### Key Conventions

- Type `this` as `CustomWorld` for access to `chatbotPage`, `validator`, `config`, and `lastResponse`
- Use `this.chatbotPage` for all page interactions (send messages, get responses)
- Use `this.validator.validateAll()` for layered response assertions
- Use parameterized Cucumber expressions (`{string}`, `{int}`) for variable step text
- Reuse existing steps from other files when possible — avoid duplicating step definitions
- Add JSDoc comments on functions that exceed 10 lines or contain non-obvious logic

### Available World Properties

| Property | Description |
|----------|-------------|
| `this.chatbotPage` | Page object for chatbot interactions |
| `this.validator` | ResponseValidator for layered assertions |
| `this.config` | Test configuration (timeouts, thresholds) |
| `this.lastResponse` | Stores the most recent chatbot response |
| `this.page` | Raw Playwright Page instance |
| `this.context` | Playwright BrowserContext |

## Defining Keyword Sets and Negative Patterns

Keyword sets and negative patterns are defined in `src/validators/constants.ts`. These provide reusable assertion data for validating non-deterministic chatbot responses.

### Adding a Keyword Set

Add a new entry to the `KEYWORD_SETS` object:

```typescript
export const KEYWORD_SETS = {
  // ... existing sets ...
  yourCategory: ['keyword1', 'keyword2', 'phrase with spaces'],
} as const;
```

Keyword matching is case-insensitive substring matching. Include variations the chatbot might use.

### Adding Negative Patterns

Add a new entry to the `NEGATIVE_PATTERNS` object:

```typescript
export const NEGATIVE_PATTERNS = {
  // ... existing patterns ...
  yourCategory: ['forbidden phrase', /regex-pattern/i] as (string | RegExp)[],
} as const;
```

Negative patterns can be plain strings (case-insensitive substring match) or RegExp objects for complex matching. A response fails validation if any pattern in the set matches.

### Using in Step Definitions

```typescript
// Keyword validation — passes if at least one keyword is found
const result = this.validator.validateAll(this.lastResponse, {
  keywords: { set: [...KEYWORD_SETS.yourCategory] },
});

// Negative pattern validation — passes if none of the patterns match
const result = this.validator.validateAll(this.lastResponse, {
  negativePatterns: { patterns: [...NEGATIVE_PATTERNS.yourCategory] },
});

// Combined validation — all specified layers must pass
const result = this.validator.validateAll(this.lastResponse, {
  structural: { nonEmpty: true, minLength: 50 },
  keywords: { set: [...KEYWORD_SETS.helpRequest] },
  negativePatterns: { patterns: [...NEGATIVE_PATTERNS.profanity] },
});
```

### Validation Layers

| Layer | Purpose | Options |
|-------|---------|---------|
| `structural` | Format checks | `nonEmpty`, `minLength`, `maxLength`, `completeSentence` |
| `keywords` | Must contain at least one | `set` (string array), `minMatches` |
| `negativePatterns` | Must not contain any | `patterns` (string or RegExp array) |
| `semantic` | NLP similarity scoring | `expectedIntent`, `threshold` (default 0.7) |

## Running Tests Locally

```bash
# Run all BDD scenarios
npm run test

# Run a specific feature by tag
npm run test -- --tags @conversational

# Run property-based tests (validators and retry logic)
npm run test:properties

# Run unit tests
npm run test:unit

# Run format check
npm run format-check

# Full CI pipeline locally (format + properties + unit + BDD + report)
npm run test:ci

# Generate Allure report after a test run
npm run report
```

### Prerequisites

- Node.js >= 18.0.0
- npm (comes with Node.js)
- Playwright Chromium (`npx playwright install chromium`)

### Environment Variables

Copy `.env.example` and adjust as needed. All variables have sensible defaults:

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `https://chatbot.ai-sdk.dev/demo` | Chatbot URL |
| `INTER_SCENARIO_DELAY` | `2000` | Delay between scenarios (ms) |
| `RETRY_ATTEMPTS` | `3` | Max retry attempts on failure |
| `BACKOFF_MULTIPLIER` | `2` | Exponential backoff multiplier |
| `SEMANTIC_THRESHOLD` | `0.7` | NLP similarity threshold |

## Commit Conventions

This project uses conventional commits:

```
type(scope): description
```

| Type | Use for |
|------|---------|
| `feat` | New test scenarios or features |
| `fix` | Bug fixes in tests or utilities |
| `docs` | Documentation changes |
| `test` | Adding or updating tests |
| `chore` | Dependency updates, config changes |
| `refactor` | Code restructuring without behavior change |

Examples:

```
feat(hallucination): add scenario for date-based false premises
fix(validators): correct case-insensitive matching for multi-word keywords
docs(contributing): add section on semantic validation
test(properties): add edge case for empty keyword sets
chore(deps): update playwright to 1.50.0
```

## Code Style

- **Variables and functions**: camelCase
- **Classes**: PascalCase
- **Files**: kebab-case (e.g., `keyword-validator.ts`)
- Run `npm run format-check` before committing to verify formatting
- Prettier handles formatting automatically — configure your editor to format on save
