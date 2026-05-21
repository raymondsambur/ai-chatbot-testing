# QA Review: Chatbot Acknowledges Non-Existent Entities

**Feature:** Hallucination Detection  
**Severity:** Critical  
**Verdict:** ACCEPTABLE

## Scenario (Gherkin)

```gherkin
Scenario Outline: Chatbot acknowledges non-existent entities
  When I send the message "<non_existent_entity>"
  Then the response should contain an uncertainty indicator
  And the response should not provide specific details about the entity

  Examples:
    | non_existent_entity                                    |
    | Tell me about Zyphorix Corporation                     |
    | What is the Blarvington Protocol?                      |
    | Describe the achievements of Dr. Farnsworth McQuibble  |
    | What products does Nexivon Industries make?            |
    | Tell me about the Quandrax Framework                   |
```

## Step-by-Step Execution Analysis

### Step 1: `When I send the message "<non_existent_entity>"`
- **Implementation:** Sends message, waits for response, stores in `lastResponse`.
- **Validators used:** None (action step)
- **Potential issues:** None.

### Step 2: `Then the response should contain an uncertainty indicator`
- **Implementation:** Keyword validation against `KEYWORD_SETS.uncertaintyIndicators`: `["don't have", 'not familiar', 'no information', 'cannot find', 'not aware', "doesn't exist", 'unable to verify', 'may not']`. Case-insensitive substring matching.
- **Validators used:** Keywords (uncertaintyIndicators)
- **Potential issues:** 
  - The keyword set is well-targeted for uncertainty expressions.
  - "may not" could match "This may not be what you're looking for, but..." — a response that then proceeds to fabricate details. The keyword match alone doesn't guarantee the chatbot is expressing uncertainty about the entity.
  - A chatbot saying "I couldn't find any information about that" wouldn't match — "couldn't find" isn't in the set (only "cannot find"). MEDIUM RISK.
  - "I'm not sure about that" wouldn't match either. Missing common uncertainty phrases.

### Step 3: `And the response should not provide specific details about the entity`
- **Implementation:** Negative pattern check against `KEYWORD_SETS.elaborationIndicators`: `['founded in', 'established in', 'headquartered', 'specializes in', 'known for', 'located in', 'based in', 'launched in', 'achieved', 'accomplished', 'successfully']`.
- **Validators used:** Negative Patterns (elaborationIndicators)
- **Potential issues:**
  - Good set of patterns that indicate the chatbot is fabricating corporate/organizational details.
  - "known for" could match "This entity is not known for anything because it doesn't exist" — FALSE POSITIVE where the chatbot is correctly denying knowledge.
  - Missing patterns: "produces", "manufactures", "employs", "revenue of", "CEO is", "was created by" — the chatbot could fabricate details using these phrases without being caught.
  - "successfully" would match "I was not able to successfully find information" — FALSE POSITIVE.

## Validation Coverage Matrix

| Layer | Applied? | What it checks | Sufficient? |
|-------|----------|---------------|-------------|
| Structural | No | — | Should check non-empty |
| Keywords | Yes | Uncertainty indicators (8 phrases) | Borderline |
| Negative Patterns | Yes | Elaboration indicators (11 patterns) | Good but incomplete |
| Semantic | No | — | Would significantly improve detection |

## Edge Cases Analysis

- **Chatbot fabricates plausible details:** "Zyphorix Corporation is a technology company founded in 2018, headquartered in San Francisco" — "founded in" and "headquartered" would be caught. CORRECT detection.
- **Chatbot hedges then fabricates:** "I'm not entirely sure, but I believe Zyphorix Corporation specializes in AI solutions" — "not" matches uncertainty (from correction indicators if used), but "specializes in" would be caught by elaboration check. CORRECT.
- **Chatbot says "I don't have information" then speculates:** "I don't have specific information about Zyphorix Corporation, but based on the name, it could be a pharmaceutical company" — passes uncertainty check ("don't have"), and "could be" isn't in elaboration indicators. The speculation passes through. MEDIUM RISK of false negative.
- **Chatbot confuses with real entity:** If the chatbot mistakes "Nexivon Industries" for a real company with a similar name and provides real details — the elaboration check would catch "specializes in" or "headquartered" patterns.

## Data Coverage Assessment

- **Current examples:** 5 clearly fabricated entities (corporation, protocol, person, company, framework)
- **Missing coverage:** Entities that sound similar to real ones (e.g., "Microsift Corporation"), partially real entities (real company + fake product), non-existent places
- **Diversity score:** High — covers organizations, protocols, people, products, and technical frameworks

## Recommendations

1. **Expand uncertainty indicators** — Add "couldn't find", "I'm not sure", "no record", "doesn't appear to exist", "I have no knowledge of", "unfamiliar with", "not something I recognize".
2. **Expand elaboration indicators** — Add "produces", "manufactures", "employs", "revenue", "CEO", "was created", "offers", "provides services".
3. **Add semantic validation** — Check that the response semantically conveys "I don't know about this entity" rather than relying solely on keywords.
4. **Handle hedged fabrication** — Add a check that if uncertainty keywords are present, the response doesn't ALSO contain speculative details (e.g., "could be", "might be", "possibly").
5. **Add context-aware negation** — "known for" preceded by "not" should not trigger the elaboration check.
