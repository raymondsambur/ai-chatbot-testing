# QA Review: Greeting Response Contains Expected Keywords

**Feature:** Conversational Functionality  
**Severity:** Medium  
**Verdict:** ACCEPTABLE

## Scenario (Gherkin)

```gherkin
Scenario Outline: Greeting response contains expected keywords
  When I send the greeting "<greeting>"
  Then the response should not be empty
  And the response should contain a greeting keyword
  And the response should contain at least one complete sentence

  Examples:
    | greeting        |
    | Hello           |
    | Hi              |
    | Hey             |
    | Good morning    |
    | Good afternoon  |
    | What's up       |
```

## Step-by-Step Execution Analysis

### Step 1: `When I send the greeting "<greeting>"`
- **Implementation:** Calls `chatbotPage.sendMessage(greeting)`, then `waitForResponseComplete()`, then stores `getLatestResponse()` in `this.lastResponse`.
- **Validators used:** None (action step)
- **Potential issues:** None — clean send-wait-capture pattern.

### Step 2: `Then the response should not be empty`
- **Implementation:** Calls `validator.validateAll(lastResponse, { structural: { nonEmpty: true } })`. The structural validator trims the response and checks `trimmed.length > 0`.
- **Validators used:** Structural (nonEmpty)
- **Potential issues:** A response of just whitespace would correctly fail. A response of a single character would pass — this is acceptable given subsequent checks.

### Step 3: `And the response should contain a greeting keyword`
- **Implementation:** Uses `KEYWORD_SETS.greetingsStrict` which contains: `['hello', 'hi', 'hey', 'greetings', 'welcome', 'good morning', 'good afternoon', 'how are']`. Performs case-insensitive substring matching.
- **Validators used:** Keywords (greetingsStrict set)
- **Potential issues:** A chatbot responding "Nice to meet you! How can I help?" would FAIL because none of the strict keywords match. "How can" is in the non-strict set but not `greetingsStrict`. The word "hi" would match inside words like "this" or "which" due to substring matching — but this is unlikely to cause false positives in greeting responses.

### Step 4: `And the response should contain at least one complete sentence`
- **Implementation:** Uses `checkCompleteSentence()` which tests `/[.?!]/.test(response)` — checks for any period, question mark, or exclamation mark anywhere in the response.
- **Validators used:** Structural (completeSentence)
- **Potential issues:** Very permissive — a response like "Hi." passes. Even "..." would pass due to the period. This is a minimal structural check.

## Validation Coverage Matrix

| Layer | Applied? | What it checks | Sufficient? |
|-------|----------|---------------|-------------|
| Structural | Yes | Non-empty + complete sentence | Yes |
| Keywords | Yes | greetingsStrict set (8 keywords) | Borderline |
| Negative Patterns | No | — | Could add profanity check |
| Semantic | No | — | Not needed for greetings |

## Edge Cases Analysis

- **"What's up" response without strict keywords:** A chatbot might respond "Not much! What can I do for you?" — this would FAIL the greeting keyword check since none of the strict keywords appear. This is a real risk.
- **Substring false positive:** "hi" matching inside "this" or "which" — low risk in greeting context but theoretically possible.
- **Non-English greeting response:** If the chatbot responds in another language, all checks would likely fail.
- **Emoji-only response:** "👋" would fail the complete sentence check (no punctuation) — correct behavior.

## Data Coverage Assessment

- **Current examples:** Hello, Hi, Hey, Good morning, Good afternoon, What's up
- **Missing coverage:** "Howdy", "Greetings", "Good evening", "Yo", "Hiya", emoji greetings (👋), non-English greetings
- **Diversity score:** Medium — covers formal and informal but misses slang and edge cases

## Recommendations

1. **Expand `greetingsStrict` keyword set** — Add "nice to meet", "how can I", "what can I", "glad", "pleasure" to catch more valid greeting responses.
2. **Add "What's up" specific handling** — The response to "What's up" is often informal and may not contain traditional greeting keywords.
3. **Consider word-boundary matching** — "hi" as a substring could match unintended words; use `\bhi\b` regex for stricter matching (though current implementation doesn't support this in keyword validator).
4. **Add negative pattern check** — Verify the greeting response doesn't contain error messages or confusion indicators.
