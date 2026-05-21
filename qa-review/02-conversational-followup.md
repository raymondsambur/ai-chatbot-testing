# QA Review: Follow-up Question Maintains Conversational Context

**Feature:** Conversational Functionality  
**Severity:** High  
**Verdict:** ACCEPTABLE

## Scenario (Gherkin)

```gherkin
Scenario: Follow-up question maintains conversational context
  When I send the message "What is the capital of France?"
  And I wait for the response to complete
  And I send a follow-up message "Can you tell me more about it?"
  Then the response should not be empty
  And the response should not be a generic misunderstanding
  And the response should relate to the previous topic
```

## Step-by-Step Execution Analysis

### Step 1: `When I send the message "What is the capital of France?"`
- **Implementation:** Calls `chatbotPage.sendMessage(message)`, `waitForResponseComplete()`, stores response in `this.lastResponse`.
- **Validators used:** None (action step)
- **Potential issues:** The first response is captured but immediately overwritten by the next step. The test doesn't validate the first response is correct.

### Step 2: `And I wait for the response to complete`
- **Implementation:** Calls `waitForResponseComplete()` again and overwrites `this.lastResponse` with `getLatestResponse()`.
- **Validators used:** None (action step)
- **Potential issues:** This step is redundant — Step 1 already waits for response completion. It overwrites lastResponse with the same value.

### Step 3: `And I send a follow-up message "Can you tell me more about it?"`
- **Implementation:** Calls `sendMessage(followUp)`, `waitForResponseComplete()`, stores new response in `this.lastResponse`.
- **Validators used:** None (action step)
- **Potential issues:** None — correctly captures the follow-up response.

### Step 4: `Then the response should not be empty`
- **Implementation:** Structural validator checks `nonEmpty: true` on `this.lastResponse` (the follow-up response).
- **Validators used:** Structural (nonEmpty)
- **Potential issues:** None.

### Step 5: `And the response should not be a generic misunderstanding`
- **Implementation:** Checks against regex patterns: `/i don'?t understand/i`, `/could you rephrase/i`, `/i'?m not sure what you mean/i`, `/can you clarify/i`, `/i didn'?t get that/i`. Uses both structural (nonEmpty) and negativePatterns layers.
- **Validators used:** Structural + Negative Patterns
- **Potential issues:** The pattern set is limited. A chatbot saying "I'm not sure what 'it' refers to" would NOT be caught by these patterns (no exact match for "not sure what you mean" vs "not sure what 'it' refers to"). Also, "can you clarify" is in the negative patterns here but "clarify" is in the `clarificationRequest` keyword set used positively elsewhere — potential conceptual conflict.

### Step 6: `And the response should relate to the previous topic`
- **Implementation:** Keyword validation against `['Paris', 'France', 'capital', 'city', 'French', 'Europe']` with `minMatches: 1`.
- **Validators used:** Keywords (custom topic set)
- **Potential issues:** The chatbot might discuss Paris without using any of these exact words — e.g., "The Eiffel Tower is one of its most famous landmarks, attracting millions of visitors annually." This would FAIL despite being contextually relevant. The keyword set is too narrow for a "relates to topic" assertion.

## Validation Coverage Matrix

| Layer | Applied? | What it checks | Sufficient? |
|-------|----------|---------------|-------------|
| Structural | Yes | Non-empty | Yes |
| Keywords | Yes | Paris/France topic words | Borderline — too narrow |
| Negative Patterns | Yes | Misunderstanding phrases | Partially — limited set |
| Semantic | No | — | Should be used here |

## Edge Cases Analysis

- **Chatbot discusses Paris landmarks without naming "Paris":** Would fail keyword check despite being contextually correct. HIGH RISK of false positive (test fails incorrectly).
- **Chatbot asks for clarification about "it":** The negative pattern check might not catch all clarification phrasings. MEDIUM RISK of false negative.
- **Chatbot provides generic response about "telling more":** A response like "Sure, I'd be happy to tell you more! What specifically would you like to know?" would fail the topic keyword check — correctly identifying lack of context retention.
- **First response is wrong:** If the chatbot answers the first question incorrectly (not about Paris), the follow-up context check becomes meaningless.

## Data Coverage Assessment

- **Current examples:** Single test case (France/Paris)
- **Missing coverage:** Other topics (science, history, geography), multi-turn conversations (3+ messages), topic switching and returning
- **Diversity score:** Low — single hardcoded scenario

## Recommendations

1. **Add semantic validation as primary check** — Use `validateSemantic` with expectedIntent "information about Paris or France" to catch paraphrased responses.
2. **Expand topic keyword set** — Add "Eiffel", "Seine", "Louvre", "museum", "river", "population", "million", "landmark", "tower" to reduce false positives.
3. **Validate the first response** — Assert that the initial "capital of France" response mentions Paris before testing follow-up context.
4. **Convert to Scenario Outline** — Test multiple topic pairs to increase coverage diversity.
5. **Add semantic similarity threshold** — If keyword check fails, fall back to semantic similarity against "The response discusses Paris, France, or related topics."
