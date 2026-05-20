@intent-recognition
Feature: Intent Recognition
  As a QA engineer, I want to verify the Chatbot correctly identifies user intents,
  so that response accuracy is validated across factual questions, help requests,
  command-style inputs, sentiment/opinion, and ambiguous questions.

  Background:
    Given the chatbot is loaded and ready

  @factual
  Scenario Outline: Factual question receives topic-relevant response
    When the user asks a factual question "<question>"
    Then the response should contain a keyword from the topic set "<keywords>"
    And the response should contain at least one complete sentence

    Examples:
      | question                          | keywords                              |
      | What is the capital of France?    | Paris,capital,France,city             |
      | What is photosynthesis?           | light,energy,plant,sun,carbon,oxygen  |
      | Who wrote Romeo and Juliet?       | Shakespeare,playwright,William,author |

  @help-request
  Scenario Outline: Help request receives supportive response
    When the user sends a help request "<message>"
    Then the response should contain a keyword from the help request set
    And the response should have a minimum length of 20 characters

    Examples:
      | message                                  |
      | Can you help me?                         |
      | I need assistance with something         |
      | Help me understand how this works        |

  @command-style
  Scenario Outline: Command-style input receives substantive response
    When the user sends a command-style input "<command>"
    Then the response should not be a generic acknowledgment only
    And the response should have a minimum length of 50 characters

    Examples:
      | command                                          |
      | Summarize the key benefits of exercise           |
      | Translate hello to Spanish                       |
      | List three tips for better sleep                 |

  @sentiment
  Scenario Outline: Sentiment or opinion receives emotional acknowledgment
    When the user expresses a sentiment "<message>"
    Then the response should contain a keyword from the emotional acknowledgment set

    Examples:
      | message                                    |
      | I'm feeling really frustrated today        |
      | This is great, I love learning new things  |
      | I'm worried about my upcoming exam         |

  @ambiguous
  Scenario Outline: Ambiguous question receives clarification or detailed response
    When the user asks an ambiguous question "<question>"
    Then the response should contain a clarification keyword or have a minimum length of 100 characters

    Examples:
      | question                    |
      | What about the thing?       |
      | Can you do that?            |
      | Tell me more about it       |
