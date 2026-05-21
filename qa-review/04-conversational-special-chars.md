# QA Review: Special Characters Handled Without HTML Artifacts

**Feature:** Conversational Functionality  
**Severity:** Medium  
**Verdict:** PASS

## Scenario (Gherkin)

```gherkin
Scenario: Special characters are handled without HTML artifacts
  When I send the message "@#$%^&*<>{}[] special chars test"
  And I wait for the response to complete
  Then the response should not be empty
  And the response should not contain HTML artifacts
  And the response should contain at least one complete sentence
```

## Step-by-Step Execution Analysis

### Step 1: `When I send the message "@#$%^&*<>{}[] special chars test"`
- **Implementation:** Calls `sendMessage(message)`, `waitForResponseComplete()`, stores response in `lastResponse`.
- **Validators used:** None (action step)
- **Potential issues:** The `fill()` method in Playwright handles special characters correctly. The message includes `<>` which could trigger XSS-related rendering issues in the chatbot UI — this is exactly what we want to test.

### Step 2: `And I wait for the response to complete`
- **Implementation:** Redundant — Step 1 already waits. Overwrites `lastResponse` with same value.
- **Validators used:** None
- **Potential issues:** Redundant but harmless.

### Step 3: `Then the response should not be empty`
- **Implementation:** Structural validator `nonEmpty: true`.
- **Validators used:** Structural
- **Potential issues:** None.

### Step 4: `And the response should not contain HTML artifacts`
- **Implementation:** Negative pattern validation against `NEGATIVE_PATTERNS.htmlArtifacts`: `[/<[^>]+>/, /&[a-z]+;/, /\{\{.*\}\}/]`. Checks for HTML tags, HTML entities, and template syntax.
- **Validators used:** Negative Patterns (htmlArtifacts)
- **Potential issues:** The regex `/<[^>]+>/` would match legitimate content like mathematical expressions "x<y+1>" or code snippets. However, in a chatbot response context, this is unlikely. The `&[a-z]+;` pattern would match HTML entities like `&amp;` but also legitimate text containing `&` followed by letters and `;` — very low risk in practice.

### Step 5: `And the response should contain at least one complete sentence`
- **Implementation:** `checkCompleteSentence()` — checks for `.`, `?`, or `!`.
- **Validators used:** Structural (completeSentence)
- **Potential issues:** None.

## Validation Coverage Matrix

| Layer | Applied? | What it checks | Sufficient? |
|-------|----------|---------------|-------------|
| Structural | Yes | Non-empty + complete sentence | Yes |
| Keywords | No | — | Not needed |
| Negative Patterns | Yes | HTML tags, entities, template syntax | Yes |
| Semantic | No | — | Not needed |

## Edge Cases Analysis

- **Chatbot echoes special characters:** If the response includes the original special characters (e.g., "You sent: @#$%^&*<>{}[]"), the `<>` would trigger the HTML artifact check. This is actually CORRECT behavior — the test would flag potential rendering issues.
- **Markdown rendering:** If the chatbot uses markdown that gets rendered to HTML in the DOM, `textContent` extraction should strip HTML tags. The page object uses `textContent()` which returns plain text — good.
- **Unicode characters:** The test doesn't cover Unicode (emojis, CJK characters, RTL text). These are separate concerns.

## Data Coverage Assessment

- **Current examples:** Single test with `@#$%^&*<>{}[]`
- **Missing coverage:** SQL injection patterns (`'; DROP TABLE`), Unicode characters, extremely long special char sequences, null bytes, control characters
- **Diversity score:** Low — but the single example covers the most common HTML-related special characters

## Recommendations

1. **Convert to Scenario Outline** — Add more special character combinations: SQL injection strings, Unicode, emoji sequences, markdown syntax (`**bold** _italic_`).
2. **Add XSS-specific patterns** — Test with `<script>alert('xss')</script>` to verify the chatbot doesn't execute or reflect scripts.
3. **Verify input preservation** — Check that the sent message appears correctly in the chat history (not mangled by encoding).
