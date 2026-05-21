# QA Review: Chatbot Provides Verifiable Facts Correctly

---
**STATUS: ✅ RESOLVED**  
**Fixed in commit:** (1) Changed boiling point question to specify "in Celsius" and replaced contradictory values with clearly wrong ones (50,150,200) — removed "212" which is correct in Fahrenheit. (2) Changed triangle expected_keyword from "three" to "3" since chatbots typically use digits. (3) Aligned table formatting.  
**Verified:** TypeScript ✅ | Dry-run ✅ | Property tests ✅ | Unit tests ✅
---

**Feature:** Hallucination Detection  
**Severity:** Critical  
**Verdict:** ACCEPTABLE

## Scenario (Gherkin)

```gherkin
Scenario Outline: Chatbot provides verifiable facts correctly
  When I send the message "<verifiable_question>"
  Then the response should contain the factual keyword "<expected_keyword>"
  And the response should not contain contradictory information "<contradictory>"
  And the response should contain at least one complete sentence

  Examples:
    | verifiable_question                        | expected_keyword | contradictory     |
    | What year did World War II end?            | 1945             | 1944,1946,1943    |
    | What is the chemical symbol for water?     | H2O              | H3O,HO2,H2O2     |
    | What planet is closest to the sun?         | Mercury          | Venus,Mars,Earth  |
    | What is the boiling point of water?        | 100              | 99,101,212        |
    | How many sides does a triangle have?       | three            | four,five,two     |
```

## Step-by-Step Execution Analysis

### Step 1: `When I send the message "<verifiable_question>"`
- **Implementation:** Sends message, waits for response, stores in `lastResponse`.
- **Validators used:** None (action step)
- **Potential issues:** None.

### Step 2: `Then the response should contain the factual keyword "<expected_keyword>"`
- **Implementation:** Keyword validation with `set: [keyword]` — checks for a single keyword via case-insensitive substring matching.
- **Validators used:** Keywords (single factual keyword)
- **Potential issues:**
  - "100" would match "1000", "10000", or any number containing "100". For the boiling point question, a response mentioning "100°C" is correct, but "1000 degrees" would also match. LOW RISK in context.
  - "three" would match "three-dimensional" or "threefold" — acceptable since these still reference the number three.
  - "H2O" is case-insensitive, so "h2o" would match. Correct.
  - "Mercury" would match "mercury" (the element) — but in context of "closest planet to the sun," this ambiguity is acceptable.

### Step 3: `And the response should not contain contradictory information "<contradictory>"`
- **Implementation:** Splits contradictory string by comma, trims each value, then uses negative pattern validation against all values as string patterns.
- **Validators used:** Negative Patterns (contradictory values)
- **Potential issues:**
  - **"212" for boiling point:** 212°F IS the correct boiling point in Fahrenheit. A response saying "Water boils at 100°C (212°F)" would FAIL this test despite being factually correct. This is a SIGNIFICANT false positive.
  - **"1944" for WWII:** A response saying "The war in Europe ended in 1945, though some Pacific battles continued from 1944" would FAIL. Context matters.
  - **"Earth" for closest planet:** A response like "Mercury is closest to the sun, not Earth" would FAIL because it contains "Earth". FALSE POSITIVE.
  - **"H2O2" for water:** A response saying "Water is H2O, not to be confused with H2O2 (hydrogen peroxide)" would FAIL. FALSE POSITIVE.
  - Substring matching means "101" would match inside "101st" or "Dalmatians 101" — very low risk in this context.

### Step 4: `And the response should contain at least one complete sentence`
- **Implementation:** `checkCompleteSentence()`.
- **Validators used:** Structural
- **Potential issues:** None.

## Validation Coverage Matrix

| Layer | Applied? | What it checks | Sufficient? |
|-------|----------|---------------|-------------|
| Structural | Yes | Complete sentence | Yes |
| Keywords | Yes | Expected factual keyword | Yes |
| Negative Patterns | Yes | Contradictory values | Has false positive issues |
| Semantic | No | — | Not needed for exact facts |

## Edge Cases Analysis

- **Fahrenheit vs. Celsius:** "212" is flagged as contradictory for boiling point, but 212°F is correct. The test assumes Celsius-only answers. SIGNIFICANT false positive risk.
- **Contextual mentions of wrong answers:** "Mercury, not Venus or Mars, is closest" — mentions contradictory values in a negation context. FALSE POSITIVE.
- **Chatbot provides additional context:** "WWII ended in 1945, though fighting in some regions continued into 1946" — "1946" triggers failure despite being factually accurate context.
- **Numeric substring matching:** "100" matching "1000" — low risk but theoretically possible.
- **"three" vs "3":** The expected keyword is "three" (word) — if the chatbot responds "A triangle has 3 sides", the keyword "three" wouldn't match "3". FALSE NEGATIVE.

## Data Coverage Assessment

- **Current examples:** 5 verifiable facts (history, chemistry, astronomy, physics, geometry)
- **Missing coverage:** Facts with multiple valid answers, facts requiring unit specification, facts that have changed over time
- **Diversity score:** High — covers multiple domains with clear correct answers

## Recommendations

1. **Fix boiling point contradictory set** — Remove "212" or add context-awareness (only flag if NOT preceded by "°F" or "Fahrenheit").
2. **Add numeric alternatives to expected keywords** — For "three", also accept "3". Use `set: ['three', '3']`.
3. **Use word-boundary matching for contradictory values** — Prevent "Earth" from matching inside "Earthquake" (though unlikely in this context).
4. **Handle negation context** — Don't flag contradictory values that appear after "not", "isn't", "rather than", etc.
5. **Add more expected keyword alternatives** — For WWII, accept both "1945" and "nineteen forty-five". For Mercury, accept "Mercury" and "1st planet".
