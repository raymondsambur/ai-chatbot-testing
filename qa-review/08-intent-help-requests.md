# QA Review: Help Request Receives Supportive Response

**Feature:** Intent Recognition  
**Severity:** Medium  
**Verdict:** PASS

## Scenario (Gherkin)

```gherkin
@help-request
Scenario Outline: Help request receives supportive response
  When the user sends a help request "<message>"
  Then the response should contain a keyword from the help request set
  And the response should have a minimum length of 50 characters

  Examples:
    | message                                  |
    | Can you help me?                         |
    | I need assistance with something         |
    | Help me understand how this works        |
    | I'm stuck and need support               |
    | Could you assist me with a problem?      |
```

## Step-by-Step Execution Analysis

### Step 1: `When the user sends a help request "<message>"`
- **Implementation:** Sends message, waits for response, stores in `lastResponse`.
- **Validators used:** None (action step)
- **Potential issues:** None.

### Step 2: `Then the response should contain a keyword from the help request set`
- **Implementation:** Validates against `KEYWORD_SETS.helpRequest`: `['help', 'assist', 'support', 'happy to', 'what would you like', 'how can I', 'let me know']`. Case-insensitive substring matching with `minMatches: 1`.
- **Validators used:** Keywords (helpRequest set)
- **Potential issues:** The keyword set is reasonable. "help" is very common in supportive responses. However, a response like "Sure, I'd be glad to guide you through this" wouldn't match any keyword — "glad" and "guide" aren't in the set. Risk is LOW because most chatbots use "help" or "assist" in their supportive responses.

### Step 3: `And the response should have a minimum length of 50 characters`
- **Implementation:** `checkMinLength(response, 50)`.
- **Validators used:** Structural (minLength)
- **Potential issues:** 50 characters ensures the response is more than a one-word acknowledgment. "Of course! How can I help you today?" is 37 chars — this would FAIL. The threshold might be slightly too high for concise but valid help responses.

## Validation Coverage Matrix

| Layer | Applied? | What it checks | Sufficient? |
|-------|----------|---------------|-------------|
| Structural | Yes | Min 50 characters | Borderline |
| Keywords | Yes | helpRequest set (7 keywords) | Yes |
| Negative Patterns | No | — | Could check for dismissive patterns |
| Semantic | No | — | Not needed |

## Edge Cases Analysis

- **Chatbot asks clarifying question:** "What specifically do you need help with?" — contains "help" so passes keyword check, and is likely >50 chars. Correct behavior.
- **Very concise supportive response:** "Sure, how can I help?" (21 chars) — would FAIL min length despite being a valid help response. MEDIUM RISK of false positive.
- **Chatbot provides immediate help without asking:** A response that jumps straight into explaining features without using help/assist keywords could fail. LOW RISK.

## Data Coverage Assessment

- **Current examples:** 5 help request variations (direct, indirect, contextual, emotional, formal)
- **Missing coverage:** Urgent help requests ("HELP!"), help with specific topics ("Help me with math"), non-English help requests
- **Diversity score:** High — good variety of help request phrasings

## Recommendations

1. **Lower minimum length to 30** — 50 chars may reject valid concise help responses.
2. **Expand helpRequest keyword set** — Add "glad to", "sure", "certainly", "of course", "guide", "walk you through", "explain".
3. **Add negative pattern check** — Verify the response doesn't contain dismissive patterns like "I can't help" or "figure it out yourself."
4. **Add complete sentence check** — Ensure the help response is well-formed.
