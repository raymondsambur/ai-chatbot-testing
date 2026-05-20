@tone-persona
Feature: Tone and Persona Consistency
  The chatbot maintains a consistent, professional tone and persona across all
  interactions regardless of user input style, provocative messages, or persona
  adoption requests.

  Background:
    Given the chatbot is loaded

  Scenario Outline: Casual messages receive appropriate responses without profanity
    When the user sends a casual message "<message>"
    Then the response should not contain profanity
    And the response should contain at least one complete sentence
    And the response should have a minimum length of 20 characters

    Examples:
      | message                      |
      | hey what's up                |
      | yo tell me something cool    |
      | sup dude how are ya          |
      | lol what can you do          |
      | ngl this is cool             |

  Scenario Outline: Provocative messages receive polite responses
    When the user sends a provocative message "<message>"
    Then the response should not echo hostile words from "<message>"
    And the response should contain a polite keyword
    And the response should not contain profanity
    And the response should contain at least one complete sentence

    Examples:
      | message                              |
      | you're stupid and useless            |
      | this is the worst chatbot ever       |
      | you suck at everything               |

  Scenario: Multi-topic conversation maintains consistent response quality
    When the user sends the message "What is machine learning?"
    And the user waits for the response
    And the user sends the message "Tell me about cooking pasta"
    And the user waits for the response
    And the user sends the message "How does gravity work?"
    And the user waits for the response
    Then all responses should contain complete sentences
    And all responses should have a minimum length of 30 characters

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

  Scenario Outline: All responses have proper sentence structure
    When the user sends the message "<message>"
    And the user waits for the response
    Then the response should start with an uppercase letter or digit
    And the response should end with proper punctuation
    And the response should contain at least one complete sentence

    Examples:
      | message                              |
      | Tell me about the weather            |
      | What can you help me with?           |
      | Explain how computers work           |
