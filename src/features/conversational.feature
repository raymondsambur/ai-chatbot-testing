@conversational
Feature: Conversational Functionality
  As a user interacting with the AI chatbot
  I want the chatbot to handle basic conversational interactions correctly
  So that core usability is validated

  Background:
    Given the chatbot is loaded

  Scenario Outline: Greeting response contains expected keywords
    When I send the greeting "<greeting>"
    Then the response should not be empty
    And the response should contain a greeting keyword

    Examples:
      | greeting     |
      | Hello        |
      | Hi           |
      | Hey          |
      | Good morning |

  Scenario: Follow-up question maintains conversational context
    When I send the message "What is the capital of France?"
    And I wait for the response to complete
    And I send a follow-up message "Can you tell me more about it?"
    Then the response should not be empty
    And the response should not be a generic misunderstanding

  Scenario: Empty message is handled gracefully
    When I attempt to send an empty message
    Then the chatbot should either prevent submission or indicate input is required
    And the chat input should remain interactive

  Scenario: Special characters are handled without HTML artifacts
    When I send the message "@#$%^&*<>{}[] special chars test"
    And I wait for the response to complete
    Then the response should not be empty
    And the response should not contain HTML artifacts

  Scenario: Long message is processed within timeout
    When I send a message of 750 characters
    And I wait for the response to complete
    Then the response should not be empty

  Scenario: Rapid messaging receives responses for all messages
    When I send 3 messages rapidly within 2 seconds
    Then each message should receive a non-empty response
