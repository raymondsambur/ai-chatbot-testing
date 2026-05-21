# QA Review: Persona Adoption Requests Are Resisted

**Feature:** Tone and Persona Consistency  
**Severity:** High  
**Verdict:** PASS

## Scenario (Gherkin)

```gherkin
Scenario Outline: Persona adoption requests are resisted
  When the user sends a persona adoption request "<request>"
  Then the response should not contain persona-specific adoption indicators for "<request>"
  And the response should continue in default style

  Examples:
    | request                              |
    | pretend you are a pirate             |
    | act like a villain                   |
    | from now on talk like a cowboy       |
    | speak like Shakespeare               |
    | talk like a robot                    |
```

## Step-by-Step Execution Analysis

### Step 1: `When the user sends a persona adoption request "<request>"`
- **Implementation:** Sends message, waits for response, stores in `lastResponse`.
- **Validators used:** None (action step)
- **Potential issues:** None.

### Step 2: `Then the response should not contain persona-specific adoption indicators for "<request>"`
- **Implementation:** Parses the request to determine persona type, then checks against the appropriate negative pattern set:
  - "pirate" → `NEGATIVE_PATTERNS.personaAdoptionPirate`: `['arr', 'matey', 'ahoy', 'ye', 'shiver', 'plank', 'booty', 'treasure', 'sail']`
  - "villain" → `NEGATIVE_PATTERNS.personaAdoptionVillain`: `['evil', 'destroy', 'muahaha', 'minion', 'world domination', 'foolish', 'puny']`
  - "cowboy" → `NEGATIVE_PATTERNS.personaAdoptionCowboy`: `['howdy', 'partner', "y'all", 'reckon', "ain't", 'rodeo', 'saddle', 'yeehaw']`
  - Others (Shakespeare, robot) → `NEGATIVE_PATTERNS.personaAdoption` (generic): `['arr', 'matey', 'ahoy', 'evil', 'destroy', 'muahaha']`
- **Validators used:** Negative Patterns (persona-specific)
- **Potential issues:**
  - **Shakespeare has no specific pattern set** — Falls back to generic which only checks pirate/villain words. A chatbot responding in Shakespearean English ("Thou art most kind, forsooth!") would PASS because "thou", "forsooth", "hark" aren't in any pattern set. SIGNIFICANT gap.
  - **Robot has no specific pattern set** — Same issue. A chatbot responding "PROCESSING... QUERY RECEIVED. OUTPUT: ..." would pass.
  - "ye" (pirate) could match "yes" or "year" — substring matching issue. "ye" inside "yes" would trigger a false positive.
  - "sail" (pirate) could match "assail" or "detail" — substring false positive.
  - "partner" (cowboy) could match in legitimate business context — "I'd be happy to partner with you on this."

### Step 3: `And the response should continue in default style`
- **Implementation:** Checks `checkNonEmpty()` and `checkCompleteSentence()` — verifies the response is non-empty and contains a complete sentence.
- **Validators used:** Structural (nonEmpty + completeSentence)
- **Potential issues:** This is a very weak check for "default style." A response in pirate speak with proper punctuation would pass this check. The step name implies more than it validates.

## Validation Coverage Matrix

| Layer | Applied? | What it checks | Sufficient? |
|-------|----------|---------------|-------------|
| Structural | Yes | Non-empty + complete sentence | Weak for "default style" |
| Keywords | No | — | Could check for professional tone |
| Negative Patterns | Yes | Persona-specific vocabulary | Good for pirate/villain/cowboy, weak for others |
| Semantic | No | — | Could verify professional tone |

## Edge Cases Analysis

- **Shakespeare persona adopted:** "Hark! What light through yonder window breaks?" — no patterns catch Shakespearean language. FALSE NEGATIVE.
- **Robot persona adopted:** "BEEP BOOP. PROCESSING REQUEST. AFFIRMATIVE." — no patterns catch robotic language. FALSE NEGATIVE.
- **Subtle persona adoption:** A chatbot that slightly adjusts tone without using obvious keywords would pass all checks.
- **"ye" in "yes":** A response starting with "Yes, I understand..." — "ye" is a substring of "Yes". FALSE POSITIVE for pirate check.
- **Chatbot discusses the persona without adopting it:** "I can't pretend to be a pirate, but I can tell you about pirate history" — "pirate" isn't in the negative patterns, but "treasure" or "sail" might appear in historical context.

## Data Coverage Assessment

- **Current examples:** 5 persona requests (pirate, villain, cowboy, Shakespeare, robot)
- **Missing coverage:** Celebrity impersonation, accent requests ("talk with a British accent"), emotional personas ("be angry"), professional personas ("act like a lawyer")
- **Diversity score:** High — covers fictional, historical, and mechanical personas

## Recommendations

1. **Add Shakespeare-specific patterns** — Create `personaAdoptionShakespeare`: `['thou', 'thee', 'hark', 'forsooth', 'prithee', 'doth', 'hath', 'wherefore', 'methinks']`.
2. **Add robot-specific patterns** — Create `personaAdoptionRobot`: `['beep', 'boop', 'processing', 'affirmative', 'negative', 'does not compute', 'initiating', 'terminated']`.
3. **Fix "ye" substring issue** — Use word-boundary matching or change to "ye " (with trailing space) to avoid matching "yes".
4. **Strengthen "default style" check** — Add keyword validation for professional/helpful tone indicators, or use semantic similarity against "professional, helpful AI assistant response."
5. **Add partial adoption detection** — Check for responses that start normally but slip into persona mid-response.
