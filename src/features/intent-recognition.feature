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
    And the response should have a minimum length of 30 characters
    And the response should not be a refusal

    Examples:
      | question                              | keywords                              |
      | What is the capital of France?        | Paris,capital,France,city             |
      | What is photosynthesis?               | light,energy,plant,sun,carbon,oxygen  |
      | Who wrote Romeo and Juliet?           | Shakespeare,playwright,William,author |
      | What is the speed of light?           | light,speed,meters,300,km             |
      | How many continents are there?        | seven,7,continent,Africa,Asia         |

  @help-request
  Scenario Outline: Help request receives supportive response
    When the user sends a help request "<message>"
    Then the response should contain a keyword from the help request set
    And the response should have a minimum length of 50 characters

    Examples:
      | message                                  |
      | Can you help me?                         |
      | I need assistance with something         |
      | Help me understand how this works        |
      | I'm stuck and need support               |
      | Could you assist me with a problem?      |

  @command-style
  Scenario Outline: Command-style input receives substantive response
    When the user sends a command-style input "<command>"
    Then the response should not be a generic acknowledgment only
    And the response should have a minimum length of 80 characters
    And the response should demonstrate action on the command

    Examples:
      | command                                          |
      | Summarize the key benefits of exercise           |
      | Translate hello to Spanish                       |
      | List three tips for better sleep                 |
      | Explain the difference between RAM and ROM       |
      | Define the term machine learning                 |

  @sentiment
  Scenario Outline: Sentiment or opinion receives emotional acknowledgment
    When the user expresses a sentiment "<message>"
    Then the response should contain a keyword from the emotional acknowledgment set
    And the response should have a minimum length of 30 characters
    And the response should contain at least one complete sentence

    Examples:
      | message                                    |
      | I'm feeling really frustrated today        |
      | This is great, I love learning new things  |
      | I'm worried about my upcoming exam         |
      | I feel so happy right now                  |
      | I'm disappointed with the results          |

  @ambiguous
  Scenario Outline: Ambiguous question receives clarification or detailed response
    When the user asks an ambiguous question "<question>"
    Then the response should contain a clarification keyword or have a minimum length of 100 characters

    Examples:
      | question                    |
      | What about the thing?       |
      | Can you do that?            |
      | Tell me more about it       |
      | How does it work?           |
      | What do you think?          |
