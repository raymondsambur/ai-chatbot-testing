# QA Review: Response Timeout Produces a Descriptive Error

**Feature:** Test Execution Reliability  
**Severity:** Medium  
**Verdict:** ACCEPTABLE

## Scenario (Gherkin)

```gherkin
Scenario: Response timeout produces a descriptive error
  When I send a message and the response times out
  Then a timeout error should be raised with a descriptive message
```

## Step-by-Step Execution Analysis

### Step 1: `When I send a message and the response times out`
- **Implementation:** Sends "Tell me a very long and detailed story", then calls `waitForResponseComplete(1)` with a 1ms timeout. If the wait throws (expected), stores the error message in `lastResponse`. If it doesn't throw, stores `'__NO_TIMEOUT__'`.
- **Validators used:** None (action step — forces timeout)
- **Potential issues:**
  - **This tests Playwright's timeout mechanism, not the chatbot's behavior.** A 1ms timeout will ALWAYS fail because even checking the DOM takes longer than 1ms. The test validates that `waitForResponseComplete` correctly throws on timeout — it's a unit test of the page object, not an integration test of the chatbot.
  - The message "Tell me a very long and detailed story" is irrelevant — any message would timeout at 1ms.
  - If Playwright's internal timing changes or the machine is extremely fast, the 1ms timeout might theoretically not trigger (extremely unlikely but not impossible).

### Step 2: `Then a timeout error should be raised with a descriptive message`
- **Implementation:** Asserts `lastResponse !== '__NO_TIMEOUT__'` (timeout occurred), then checks the error message matches `/timeout|did not stabilize|timed out/i`.
- **Validators used:** Custom regex assertion on error message
- **Potential issues:**
  - The regex is well-designed to match the actual error message from `waitForResponseComplete`: "Response did not stabilize within Xms."
  - If the error message format changes in the page object, this test would need updating. But the regex is broad enough to handle minor wording changes.

## Validation Coverage Matrix

| Layer | Applied? | What it checks | Sufficient? |
|-------|----------|---------------|-------------|
| Structural | No | — | N/A (tests error handling) |
| Keywords | No | — | N/A |
| Negative Patterns | No | — | N/A |
| Semantic | No | — | N/A |

## Edge Cases Analysis

- **Extremely fast response:** If the chatbot somehow responds in <1ms (impossible in practice), `__NO_TIMEOUT__` would be stored and the test would correctly fail with "Expected a timeout error to be raised."
- **Error message format change:** If `waitForResponseComplete` changes its error message to not include "timeout", "stabilize", or "timed out", the test would fail. The regex provides reasonable coverage of likely phrasings.
- **Non-Error thrown:** If `waitForResponseComplete` throws a non-Error object, the `String(error)` fallback handles it correctly.

## Data Coverage Assessment

- **Current examples:** Single timeout scenario with 1ms forced timeout
- **Missing coverage:** Realistic timeout scenarios (e.g., 5-second timeout on a slow response), partial response timeout (response starts but never completes)
- **Diversity score:** Low — single synthetic test case

## Recommendations

1. **Add a realistic timeout test** — Use a moderate timeout (e.g., 3-5 seconds) with a complex prompt that might actually take longer. This tests real chatbot behavior rather than framework mechanics.
2. **Verify error message content** — Assert the error message includes the timeout duration and possibly the last content length (which the actual error message does include).
3. **Test partial response timeout** — Verify behavior when a response starts streaming but never completes (harder to simulate but more realistic).
4. **Document test intent** — Add a comment clarifying this tests the framework's timeout handling, not the chatbot's response time.
