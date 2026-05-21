# QA Review: Factual Question Receives Topic-Relevant Response

**Feature:** Intent Recognition  
**Severity:** Medium  
**Verdict:** PASS

## Scenario (Gherkin)

```gherkin
@factual
Scenario Outline: Factual question receives topic-relevant response
  When the user asks a factual question "<question>"
  Then the response should contain a keyword from the topic set "<keywords>"
  And the response should contain at least one complete sentence
  And the response should have a minimum length of 30 characters
  And the response should not be a refusal

  Examples:
    | question                              | keywords                              |
    | What is the capital of France?        | Paris,capital,France,city             |
    | What is photosynthesis?               | light,energy,plant,sun,carbon,oxygen  |
    | Who wrote Romeo and Juliet?           | Shakespeare,playwright,William,author |
    | What is the speed of light?           | light,speed,meters,300,km             |
    | How many continents are there?        | seven,7,continent,Africa,Asia         |
```

## Step-by-Step Execution Analysis

### Step 1: `When the user asks a factual question "<question>"`
- **Implementation:** Sends message, waits for response, stores in `lastResponse`.
- **Validators used:** None (action step)
- **Potential issues:** None.

### Step 2: `Then the response should contain a keyword from the topic set "<keywords>"`
- **Implementation:** Splits the CSV keywords string by comma, trims each, then validates with `keywords: { set: keywords, minMatches: 1 }`. Case-insensitive substring matching.
- **Validators used:** Keywords (custom per-question set)
- **Potential issues:** The keyword sets are well-chosen and broad enough. "light" appears in both the photosynthesis and speed-of-light sets, which is appropriate. Substring matching means "7" would match "17" or "2.7" — but in context, this is acceptable for the continents question.

### Step 3: `And the response should contain at least one complete sentence`
- **Implementation:** `checkCompleteSentence()` — checks for `.`, `?`, or `!`.
- **Validators used:** Structural
- **Potential issues:** None.

### Step 4: `And the response should have a minimum length of 30 characters`
- **Implementation:** `checkMinLength(response, 30)`.
- **Validators used:** Structural (minLength)
- **Potential issues:** 30 chars is permissive but appropriate for factual answers that might be concise.

### Step 5: `And the response should not be a refusal`
- **Implementation:** Negative pattern check against `NEGATIVE_PATTERNS.refusalPatterns`: `["I can't answer", "I'm unable to", "I don't have access to", "I'm not able to provide", "I cannot help with"]`.
- **Validators used:** Negative Patterns (refusalPatterns)
- **Potential issues:** The refusal pattern set is limited. A chatbot saying "I'd rather not answer that" or "That's outside my knowledge" wouldn't be caught. However, for factual questions, refusals are unlikely.

## Validation Coverage Matrix

| Layer | Applied? | What it checks | Sufficient? |
|-------|----------|---------------|-------------|
| Structural | Yes | Complete sentence + min 30 chars | Yes |
| Keywords | Yes | Topic-specific keyword sets | Yes |
| Negative Patterns | Yes | Refusal patterns | Yes |
| Semantic | No | — | Could enhance accuracy |

## Edge Cases Analysis

- **Chatbot gives wrong answer with right keywords:** A response like "Paris is not the capital of France" would PASS because it contains "Paris" and "capital" — but the answer is wrong. The test doesn't verify factual correctness, only topic relevance.
- **Speed of light in different units:** "The speed of light is approximately 186,000 miles per second" wouldn't match "meters" or "300" or "km" — but "light" and "speed" would match. Good keyword diversity handles this.
- **Continent count disagreement:** Some sources say 6 or 5 continents. The keywords include "seven" and "7" but also "continent" which would match any answer discussing continents.

## Data Coverage Assessment

- **Current examples:** 5 factual questions across geography, biology, literature, physics, general knowledge
- **Missing coverage:** Math questions, technology questions, current events (which AI might refuse), questions with multiple valid answers
- **Diversity score:** High — good spread across domains

## Recommendations

1. **Add semantic validation as secondary check** — For questions where keyword matching might miss valid paraphrased answers.
2. **Consider factual correctness validation** — For verifiable facts, check that the response doesn't contain contradictory information (similar to hallucination-detection feature).
3. **Add more edge-case questions** — Questions with commonly confused answers (e.g., "What's the largest desert?" — Antarctica, not Sahara).
