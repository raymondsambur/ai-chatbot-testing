@reliability
Feature: Test Execution Reliability
  As a test engineer
  I want tests to handle timeouts, retries, and service unavailability gracefully
  So that test results are trustworthy despite the non-deterministic nature of the live demo

  Background:
    Given the chatbot is loaded

  Scenario: Response arrives within the 30 second timeout
    When I send a reliability test message "Hello, how are you?"
    Then the response should arrive within 30 seconds

  Scenario: Response timeout produces a descriptive error
    When I send a message and the response times out
    Then a timeout error should be raised with a descriptive message

  Scenario: Retry logic handles rate limiting with exponential backoff
    When I send a message that may be rate limited
    Then the response should be retrieved with retry logic
    And the retry should use exponential backoff delays

  Scenario: Scenario is skipped when page does not load within 10 seconds
    Given the chatbot page fails to load within 10 seconds
    Then the scenario should be skipped with a service unavailable message
