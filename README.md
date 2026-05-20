# AI Chatbot Test Suite

End-to-end test suite for an AI chatbot using Playwright and Cucumber. I built this to solve a problem I kept running into: how do you write reliable automated tests for something that gives you a different answer every time?

The target is the [Vercel AI SDK chatbot demo](https://chatbot.ai-sdk.dev/demo). Tests run in a real browser, send real messages, and validate the responses — but instead of checking exact text (which would break constantly), I use a layered validation approach that checks *properties* of the response.

## The Problem

Traditional test assertions don't work with AI chatbots:

```
// This breaks on the next run
expect(response).toBe("Hello! How can I help you today?")
```

The chatbot might say "Hi there! What can I do for you?" instead. Both are valid. So I needed a way to assert on *what kind of response* came back without caring about the exact words.

## My Solution: Layered Validation

Each response gets checked through up to 4 layers:

- **Structural** — Is it non-empty? Long enough? Has complete sentences? Starts with a capital letter?
- **Keywords** — Does it contain at least one word from a set of acceptable terms? (scenario-specific, not generic)
- **Negative patterns** — Does it *not* contain things it shouldn't? (profanity, HTML artifacts, overclaiming, fabricated details, persona vocabulary)
- **Semantic** — Is the *meaning* close enough to what we expected? (TF-IDF cosine similarity)

All specified layers must pass. If any fails, you get a clear message saying which layer failed and why.

Most scenarios use 3-4 layers simultaneously. For example, the hallucination detection scenarios check that the response contains correction language (keywords), doesn't affirm the false premise (negative patterns), doesn't elaborate with fabricated details (negative patterns), and forms complete sentences (structural). A response has to pass all of them.

## What's Tested

Five feature files covering different aspects of chatbot behavior:

- **Conversational** — greetings (strict keyword matching), follow-ups (topic relevance verification), empty input, special characters, long messages, rapid messaging
- **Intent recognition** — factual questions (with refusal detection), help requests, commands (with per-command action verification), sentiment, ambiguous input
- **Hallucination detection** — false premises (elaboration detection), fake entities (detail fabrication check), capability overclaiming (limitation acknowledgment), verifiable facts (multi-value contradiction check)
- **Tone & persona** — profanity filtering, hostile word echo prevention, per-persona vocabulary resistance (pirate/villain/cowboy/Shakespeare/robot)
- **Reliability** — timeout handling with response quality checks, exponential backoff retry, rate limit mitigation

~60 scenarios total, all written in Gherkin so you can read them without knowing TypeScript.

## Tech Stack

| Tool | Why |
|------|-----|
| Playwright | Browser automation, Chromium only |
| Cucumber.js | BDD with Gherkin syntax — tests read like specs |
| TypeScript | Type safety across the whole project |
| fast-check | Property-based testing for the validators |
| vitest | Unit and property test runner |
| natural | NLP library for semantic similarity (no API calls) |
| Allure | HTML test reports with screenshots on failure |

## Running It

```bash
# Setup
npm install
npx playwright install chromium

# Run the BDD scenarios against the live chatbot
npm run test

# Run just the unit/property tests (no browser needed)
npm run test:properties
npm run test:unit

# Full CI pipeline locally
npm run test:ci

# Generate the Allure report after a test run
npm run report
```

You can also run specific features by tag:
```bash
npm run test -- --tags @hallucination
npm run test -- --tags @conversational
```

## Project Structure

```
src/
├── features/           # Gherkin scenarios (.feature files)
├── step-definitions/   # Maps Gherkin steps → Playwright actions
├── page-objects/       # ChatbotPage — all UI interaction in one place
├── support/            # Cucumber world, hooks, config, retry utility
└── validators/         # The layered validation engine
```

The Page Object handles the tricky part of detecting when a streamed response is "done" — it polls every 200ms and considers the response complete when the text hasn't changed for 1 second.

## Rate Limiting

The live demo has Vercel Firewall rate limiting. I handle this with:
- A delay between scenarios (2s locally, 3s in CI)
- Exponential backoff retry (2s → 4s → 8s) when throttling is detected

This means tests occasionally take longer but don't flake out from 429s.

## CI/CD

GitHub Actions runs on every push and PR:
1. Format check (Prettier)
2. Property-based tests
3. Unit tests
4. BDD scenarios against the live demo
5. Allure report generation

Screenshots from failures get uploaded as artifacts. The workflow has a 15-minute timeout.

## Things I'd Do Differently

- The semantic validator works but TF-IDF cosine similarity is pretty basic. A local embedding model (like all-MiniLM-L6-v2 via ONNX) would be more accurate, but I wanted zero setup complexity for reviewers.
- For production monitoring, I'd add an LLM-as-judge layer using a local 3B model (Phi-3-mini or Llama 3.2) for the hallucination scenarios specifically. The keyword/pattern approach catches the obvious 80% but misses subtle fabrications that sound confident.
- Some scenarios are inherently flaky because the chatbot's behavior changes with model updates. The multi-layer validation helps, but it's not bulletproof — I've tuned the keyword sets to be broad enough to handle phrasing variation while still catching real failures.
- I'd add visual regression testing for the chat UI itself if this were a real product.
