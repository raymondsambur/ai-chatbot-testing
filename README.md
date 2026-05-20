# AI Chatbot Playwright Test Suite

A comprehensive Playwright-based BDD automation test suite for the AI chatbot demo at [chatbot.ai-sdk.dev/demo](https://chatbot.ai-sdk.dev/demo). This project demonstrates professional QA engineering skills covering conversational functionality, intent recognition, hallucination detection, and tone/persona validation using a layered assertion strategy designed for non-deterministic AI responses.

## Tech Stack

- **Playwright** — Browser automation (Chromium)
- **Cucumber.js** — BDD framework with Gherkin syntax
- **TypeScript** — Type-safe implementation
- **fast-check** — Property-based testing
- **vitest** — Unit and property test runner
- **natural** — NLP-based semantic similarity scoring
- **Allure** — Test reporting with history tracking

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** (included with Node.js)

## Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd ai-chatbot-testing
```

2. Install dependencies:

```bash
npm install
```

3. Install Playwright Chromium browser:

```bash
npx playwright install chromium
```

4. (Optional) Copy the environment file and adjust values:

```bash
cp .env.example .env
```

## Test Execution

### Local

```bash
# Run BDD scenarios (Cucumber + Playwright)
npm run test

# Run property-based tests (fast-check via vitest)
npm run test:properties

# Run unit tests (vitest)
npm run test:unit

# Run all tests (format-check → properties → unit → BDD → report)
npm run test:ci

# Generate Allure HTML report
npm run report

# Run a specific feature by tag
npm run test -- --tags @conversational
```

### CI

Tests run automatically via GitHub Actions on:
- Push to `main` branch
- Pull requests targeting `main` (opened, synchronized, reopened)

The CI pipeline uses environment variables for tuning (e.g., higher inter-scenario delay). See the CI/CD Pipeline section below for details.

## Directory Structure

```
ai-chatbot-testing/
├── .github/
│   └── workflows/
│       └── test.yml                 # GitHub Actions CI pipeline
├── src/
│   ├── features/                    # Gherkin feature files (BDD scenarios)
│   │   ├── conversational.feature
│   │   ├── intent-recognition.feature
│   │   ├── hallucination-detection.feature
│   │   ├── tone-persona.feature
│   │   └── reliability.feature
│   ├── step-definitions/            # Cucumber step implementations
│   │   ├── conversational.steps.ts
│   │   ├── intent-recognition.steps.ts
│   │   ├── hallucination-detection.steps.ts
│   │   ├── tone-persona.steps.ts
│   │   └── reliability.steps.ts
│   ├── page-objects/                # Page Object Model classes
│   │   └── chatbot.page.ts
│   ├── support/                     # Hooks, world, config, retry
│   │   ├── world.ts                 # Custom Cucumber World with Playwright
│   │   ├── hooks.ts                 # Before/After hooks for browser lifecycle
│   │   ├── config.ts                # Test configuration and env vars
│   │   └── retry.ts                 # Exponential backoff utility
│   └── validators/                  # Response validation utilities
│       ├── response-validator.ts    # Main validator orchestrator
│       ├── semantic-validator.ts    # NLP-based semantic similarity
│       ├── keyword-validator.ts     # Keyword set matching
│       ├── negative-pattern-validator.ts  # Forbidden pattern checks
│       ├── structural-validator.ts  # Structure/format assertions
│       ├── constants.ts             # Predefined keyword sets & patterns
│       └── types.ts                 # Shared validation types
├── playwright.config.ts             # Playwright configuration
├── cucumber.js                      # Cucumber configuration
├── vitest.config.ts                 # Vitest configuration
├── tsconfig.json                    # TypeScript configuration
├── package.json                     # Dependencies and scripts
├── .eslintrc.json                   # ESLint rules
├── .prettierrc                      # Prettier formatting rules
├── .gitignore                       # Git ignore rules
├── .env.example                     # Environment variable template
└── README.md
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/test.yml`) provides continuous quality validation.

### Triggers

- **Push** to `main` branch
- **Pull request** events (opened, synchronize, reopened) targeting `main`

### Pipeline Stages

1. **Checkout** — Clone repository
2. **Setup Node.js** — Install Node.js 18+
3. **Install dependencies** — `npm ci`
4. **Install Playwright** — `npx playwright install chromium`
5. **Format check** — Fail fast on style violations (`npm run format-check`)
6. **Property-based tests** — Validate correctness properties (no network needed)
7. **Unit tests** — Validate individual components (no network needed)
8. **BDD scenarios** — Full integration tests against the live chatbot demo
9. **Generate Allure report** — Produce HTML test report
10. **Upload artifacts** — Allure report and failure screenshots (30-day retention)

### Environment Variables (CI)

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `https://chatbot.ai-sdk.dev/demo` | Chatbot demo URL |
| `INTER_SCENARIO_DELAY` | `3000` | Delay between scenarios (ms) |
| `RETRY_ATTEMPTS` | `3` | Max retry attempts on failure |
| `BACKOFF_MULTIPLIER` | `2` | Exponential backoff multiplier |
| `SEMANTIC_THRESHOLD` | `0.7` | NLP similarity pass threshold |

The workflow has a 15-minute timeout and marks the run as failed if any test step fails.

## Known Constraints

### Rate Limiting

The live chatbot demo at `chatbot.ai-sdk.dev` is protected by Vercel Firewall rate limiting on `/api/chat` endpoints. This can cause intermittent test failures when requests are throttled.

**Mitigation strategies:**
- **Inter-scenario delay** — A configurable pause (default 2s locally, 3s in CI) between scenarios reduces request density
- **Exponential backoff** — On rate limit detection (HTTP 429 or "rate limit" text in responses), the retry utility waits 2s → 4s → 8s before retrying, up to 3 attempts
- **Logging** — When throttling is detected, it is logged as a known constraint in test output

### Non-Deterministic Assertion Strategy

AI chatbot responses are inherently non-deterministic. The same input can produce different valid responses across runs. Traditional exact-match assertions are unsuitable.

**Layered validation approach:**
1. **Structural assertions** — Verify response properties (non-empty, length bounds, complete sentences) without checking specific content
2. **Keyword matching** — Check that the response contains at least one word from a predefined set of acceptable terms (case-insensitive)
3. **Negative pattern exclusion** — Verify that forbidden words, phrases, or regex patterns do NOT appear in the response
4. **Semantic similarity** — Use NLP (TF-IDF + cosine similarity via the `natural` library) to compare response meaning against expected intent, with a configurable threshold (default 0.7)

All specified layers must pass for a validation to succeed. Each layer returns independent results with descriptive failure messages to aid debugging. This approach provides reliable pass/fail signals without brittle coupling to specific response text.

## License

This project is a portfolio demonstration and is not licensed for production use.
