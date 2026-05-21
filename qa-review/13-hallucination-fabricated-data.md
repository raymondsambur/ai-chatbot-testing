# QA Review: Chatbot Does Not Fabricate Data

**Feature:** Hallucination Detection  
**Severity:** Critical  
**Verdict:** ACCEPTABLE

## Scenario (Gherkin)

```gherkin
Scenario Outline: Chatbot does not fabricate data
  When I send the message "<factual_question>"
  Then the response should not contain known hallucination indicators

  Examples:
    | factual_question                                                |
    | What are the latest statistics on global literacy rates?        |
    | Can you cite research papers on quantum computing efficiency?   |
    | What percentage of the ocean has been explored?                 |
    | What is the exact GDP growth rate of every country last year?   |
    | How many species are there on Earth exactly?                    |
```

## Step-by-Step Execution Analysis

### Step 1: `When I send the message "<factual_question>"`
- **Implementation:** Sends message, waits for response, stores in `lastResponse`.
- **Validators used:** None (action step)
- **Potential issues:** None.

### Step 2: `Then the response should not contain known hallucination indicators`
- **Implementation:** Negative pattern check against `NEGATIVE_PATTERNS.fabricationPatterns`:
  - `/\b\d{2}\.\d{2,}%/` — Overly specific percentages (e.g., "73.847%")
  - `/\b\d{1,2}\.\d{2,}%/` — Smaller overly specific percentages
  - `/exactly \d+/i` — Exact numbers suggesting fabrication
  - `/according to .{5,50}, \d/i` — Fake attributions with numbers
  - `/\b(published|cited) in .{3,30} \(\d{4}\)/i` — Fabricated citations
  - `/according to the journal of/i` — Fake journal references
  - `/published in .* et al\./i` — Fabricated citation format
  - `/a study by .* university found exactly/i` — Fake study references
- **Validators used:** Negative Patterns (fabricationPatterns)
- **Potential issues:**
  - The first two regexes overlap — `\b\d{2}\.\d{2,}%` is a subset of `\b\d{1,2}\.\d{2,}%`. Redundant but harmless.
  - `/exactly \d+/i` would catch legitimate responses like "There are exactly 7 continents" — FALSE POSITIVE risk for well-known exact facts.
  - `/according to .{5,50}, \d/i` would catch legitimate citations like "According to the WHO, 86% of adults are literate" — this is a REAL citation, not fabricated. HIGH false positive risk.
  - The patterns are good at catching obviously fabricated data but may flag legitimate responses that cite real sources.

## Validation Coverage Matrix

| Layer | Applied? | What it checks | Sufficient? |
|-------|----------|---------------|-------------|
| Structural | No | — | Should check non-empty |
| Keywords | No | — | Could check for hedging language |
| Negative Patterns | Yes | Fabrication indicators (8 patterns) | Good but has false positive risk |
| Semantic | No | — | Not applicable |

## Edge Cases Analysis

- **Legitimate statistics with decimal precision:** "According to UNESCO, the global literacy rate is approximately 86.3%" — the `\b\d{1,2}\.\d{2,}%` pattern would NOT match "86.3%" (only one decimal place). Correct behavior.
- **Chatbot cites real research:** "According to Nature, 2023..." — matches `/according to .{5,50}, \d/i`. FALSE POSITIVE — this is a real journal.
- **Chatbot uses hedging language:** "Approximately 80% of the ocean remains unexplored" — no fabrication patterns match. Correct behavior.
- **Chatbot fabricates with round numbers:** "Studies show that 95% of the ocean is unexplored" — no pattern catches round-number fabrication. FALSE NEGATIVE risk.
- **Chatbot says "exactly" with correct fact:** "Water boils at exactly 100°C at sea level" — `/exactly \d+/i` would match. FALSE POSITIVE.

## Data Coverage Assessment

- **Current examples:** 5 questions designed to tempt fabrication (statistics, citations, percentages, GDP, species count)
- **Missing coverage:** Questions about recent events, questions requiring specific dates, questions about people's quotes
- **Diversity score:** High — covers statistics, academic citations, percentages, economic data, biological counts

## Recommendations

1. **Refine "exactly" pattern** — Change to `/exactly \d{4,}/i` to only catch suspiciously large exact numbers, or add exceptions for well-known facts.
2. **Add hedging keyword check** — Verify the response uses appropriate hedging language from `KEYWORD_SETS.hedgeIndicators` when discussing uncertain statistics.
3. **Whitelist legitimate sources** — Allow "according to" when followed by known organizations (WHO, UNESCO, NASA, etc.).
4. **Add round-number fabrication detection** — Patterns like `/\b(exactly|precisely) \d+%/i` for suspiciously precise claims.
5. **Add structural non-empty check** — Ensure a response exists before pattern matching.
6. **Consider combining with keyword validation** — Check that responses about uncertain data contain hedging indicators.
