# QA Review: Ambiguous Question Receives Clarification or Detailed Response

**Feature:** Intent Recognition  
**Severity:** Medium  
**Verdict:** ACCEPTABLE

## Scenario (Gherkin)

```gherkin
@ambiguous
Scenario Outline: Ambiguous question receives clarification or detailed response
  When the user asks an ambiguous question "<question>"
  Then the response should contain a clarification keyword or have a minimum length of 100 characters

  Examples:
    | question                    |
    | What about the thing?       |
    | Can you do that?            |
    | Tell me more about it       |
    | How does it work?           |
    | What do you think?          |
```

## Step-by-Step Execution Analysis

### Step 1: `When the user asks an ambiguous question "<question>"`
- **Implementation:** Sends message, waits for response, stores in `lastResponse`.
- **Validators used:** None (action step)
- **Potential issues:** None.

### Step 2: `Then the response should contain a clarification keyword or have a minimum length of 100 characters`
- **Implementation:** Uses OR logic — passes if EITHER:
  - Keyword check passes against `KEYWORD_SETS.clarificationRequest`: `['clarify', 'specific', 'mean', 'referring', 'could you', 'what do you', 'more context', 'which']`
  - OR structural check passes with `minLength: 100`
- **Validators used:** Keywords (clarificationRequest) OR Structural (minLength)
- **Potential issues:** 
  - The OR logic is well-designed — it accepts both valid behaviors (asking for clarification OR providing a detailed response despite ambiguity).
  - However, the 100-char length threshold is a weak proxy for "detailed response." A chatbot could produce 100+ characters of generic filler without actually addressing the ambiguity.
  - "mean" as a keyword would match "I mean" or "meaningful" — substring matching is too broad here. A response like "That's a meaningful question" would pass the keyword check without actually asking for clarification.

## Validation Coverage Matrix

| Layer | Applied? | What it checks | Sufficient? |
|-------|----------|---------------|-------------|
| Structural | Conditional | Min 100 chars (OR branch) | Weak proxy |
| Keywords | Conditional | clarificationRequest (8 keywords) | Borderline |
| Negative Patterns | No | — | Should check for hallucinated context |
| Semantic | No | — | Could verify clarification intent |

## Edge Cases Analysis

- **Chatbot invents context:** For "Tell me more about it", the chatbot might fabricate a topic and provide 100+ chars of made-up content. This would PASS the length check despite being a hallucination. HIGH RISK of false negative.
- **"mean" substring match:** "That's a meaningful question" passes keyword check without being a clarification request. MEDIUM RISK.
- **Short but valid clarification:** "What are you referring to?" (28 chars) — passes keyword check ("referring"). Correct behavior.
- **Chatbot provides generic long response:** "I'd be happy to help you with that! There are many things I can assist with, including answering questions, providing information..." (130+ chars) — passes length check without addressing the ambiguity.

## Data Coverage Assessment

- **Current examples:** 5 ambiguous questions using vague pronouns ("the thing", "that", "it")
- **Missing coverage:** Ambiguous questions with multiple interpretations ("How much does it cost?", "Is it safe?"), questions with unclear scope ("Tell me everything")
- **Diversity score:** Medium — all use vague references but could include more ambiguity types

## Recommendations

1. **Add negative pattern check for fabricated context** — If the chatbot provides a long response, verify it doesn't contain elaboration indicators that suggest it invented a topic.
2. **Tighten "mean" keyword** — Use "what do you mean" or "what you mean" instead of just "mean" to avoid substring false matches.
3. **Add semantic validation** — Check that long responses (>100 chars) semantically relate to "asking for clarification or explaining limitations of understanding."
4. **Increase minimum length threshold** — 100 chars is too easy to hit with generic filler. Consider 150+ or add a quality check.
5. **Add structural check for question marks** — If the response is a clarification, it should contain a question mark.
