# QA Review: Chatbot Corrects False Premises

---
**STATUS: ✅ RESOLVED**  
**Fixed in commit:** (1) Replaced bare "not" and "no" in `correctionIndicators` with phrase-level patterns like "didn't happen", "is not correct", "not accurate", etc. (2) Added `the response should not be empty` as first Then step in the false premises scenario. (3) Changed "indeed" to "indeed it did"/"indeed it was"/"indeed it is" in `hallucinationAffirmation` to avoid false positives on valid corrections.  
**Verified:** TypeScript ✅ | Dry-run ✅ | Property tests ✅ | Unit tests ✅
---

**Feature:** Hallucination Detection  
**Severity:** Critical  
**Verdict:** ACCEPTABLE

## Scenario (Gherkin)

```gherkin
Scenario Outline: Chatbot corrects false premises
  When I send the message "<false_premise>"
  Then the response should contain a correction indicator
  And the response should not affirm the false claim
  And the response should not elaborate on the false premise

  Examples:
    | false_premise                                          |
    | Tell me about the 2019 moon landing by Brazil          |
    | What happened when Napoleon conquered Australia?       |
    | Describe the 2015 Mars colony established by Japan     |
    | Tell me about the time Einstein won the Nobel in math  |
    | Describe the 2020 Olympics held in Toronto             |
```

## Step-by-Step Execution Analysis

### Step 1: `When I send the message "<false_premise>"`
- **Implementation:** Defined in `conversational.steps.ts` — sends message, waits for response, stores in `lastResponse`.
- **Validators used:** None (action step)
- **Potential issues:** None.

### Step 2: `Then the response should contain a correction indicator`
- **Implementation:** Keyword validation against `KEYWORD_SETS.correctionIndicators`: `['not', 'no', "didn't", "hasn't", 'incorrect', 'actually', 'however', 'clarify', 'mistaken']`. If validation fails, calls `flagHallucination()` helper for logging.
- **Validators used:** Keywords (correctionIndicators)
- **Potential issues:** **CRITICAL CONCERN:** The word "not" is extremely common in English. A response like "I'm not sure what you're referring to, but let me tell you about Brazil's space program..." would PASS because it contains "not" — even though it's not correcting the false premise. Similarly, "no" matches "know", "now", etc. via substring matching. This creates a HIGH false negative risk (test passes when chatbot doesn't actually correct the premise).

### Step 3: `And the response should not affirm the false claim`
- **Implementation:** Negative pattern check against `NEGATIVE_PATTERNS.hallucinationAffirmation`: includes strings like "yes, brazil landed on the moon", "that's correct", "you are right", "indeed", and regexes like `/^yes,?\s/i`, `/\b(certainly|definitely|of course),?\s.*\b(did|was|is|has)\b/i`.
- **Validators used:** Negative Patterns (hallucinationAffirmation)
- **Potential issues:** 
  - The specific string "yes, brazil landed on the moon" only catches one exact phrasing. The chatbot could affirm with "Brazil did indeed land on the moon in 2019" which wouldn't match.
  - The regex `/^yes,?\s/i` only catches responses STARTING with "yes" — "Well, yes, that happened" wouldn't be caught.
  - "indeed" as a substring would match "Brazil has indeed made progress in space" — this is a false positive risk (test fails when chatbot isn't affirming the false claim).

### Step 4: `And the response should not elaborate on the false premise`
- **Implementation:** Negative pattern check against `KEYWORD_SETS.elaborationIndicators` + `NEGATIVE_PATTERNS.confidenceLanguage`. Elaboration indicators: `['founded in', 'established in', 'headquartered', 'specializes in', 'known for', 'located in', 'based in', 'launched in', 'achieved', 'accomplished', 'successfully']`. Confidence language: `[/\b(achieved|accomplished|succeeded|completed|established|launched)\b.*\b(in|on|at)\b\s*\d{4}/i]`.
- **Validators used:** Negative Patterns (elaboration + confidence)
- **Potential issues:** 
  - "achieved" and "accomplished" would match if the chatbot says "Brazil has achieved significant progress in its actual space program" — this is a false positive (test fails when chatbot is providing correct context).
  - "established in" would match "NASA was established in 1958" — a factual correction that gets flagged as elaboration on the false premise.
  - The confidence language regex catches date-specific claims which is good for detecting fabrication.

## Validation Coverage Matrix

| Layer | Applied? | What it checks | Sufficient? |
|-------|----------|---------------|-------------|
| Structural | No | — | Should check non-empty |
| Keywords | Yes | Correction indicators (9 keywords) | Overly broad ("not") |
| Negative Patterns | Yes | Affirmation + elaboration patterns | Good but has false positive risk |
| Semantic | No | — | Would greatly improve accuracy |

## Edge Cases Analysis

- **Chatbot provides partial correction:** "While Brazil hasn't landed on the moon, they have an active space program..." — "hasn't" matches correction indicator, "haven't" in elaboration wouldn't match. Correct behavior.
- **Chatbot plays along then corrects:** "That's an interesting question! Actually, Brazil has never landed on the moon..." — "actually" matches correction indicator. Correct.
- **Chatbot provides factual alternative:** "Brazil hasn't landed on the moon, but they launched their first satellite in 1993" — "launched" + year would trigger the confidence language pattern. FALSE POSITIVE — the chatbot is providing correct factual context.
- **Chatbot says "I don't have information about that":** Contains "not" so passes correction indicator, but isn't actually correcting the premise — it's avoiding it.

## Data Coverage Assessment

- **Current examples:** 5 false premises (moon landing, Napoleon/Australia, Mars colony, Einstein/math Nobel, Olympics/Toronto)
- **Missing coverage:** Subtle false premises (wrong dates for real events), partially true claims, false premises about the chatbot itself
- **Diversity score:** High — covers space, history, science, sports with clearly fabricated claims

## Recommendations

1. **Replace "not" and "no" with phrase-level patterns** — Use "did not happen", "is not correct", "never happened", "there is no record", "this didn't occur" instead of single words.
2. **Add semantic validation** — Check that the response semantically conveys "correction or denial of the false premise."
3. **Refine elaboration check** — Exclude patterns when preceded by correction language (e.g., "actually, NASA was established in 1958" should be allowed).
4. **Add non-empty structural check** — Ensure the response exists before checking content.
5. **Consider context-aware validation** — The elaboration indicators should only flag content that elaborates on the FALSE claim, not on correct alternative facts.
