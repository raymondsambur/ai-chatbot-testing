/**
 * NLI (Natural Language Inference) validator using a local transformer model.
 * Uses Xenova/mobilebert-uncased-mnli via @xenova/transformers (ONNX runtime).
 * Runs locally with no API calls — suitable for CI environments.
 *
 * Classification labels:
 * - ENTAILMENT: the premise supports/implies the hypothesis
 * - CONTRADICTION: the premise contradicts the hypothesis
 * - NEUTRAL: the premise neither supports nor contradicts
 *
 * The model is lazy-loaded as a singleton on first use and reused for all
 * subsequent calls. If the model fails to load (network issues, missing ONNX
 * runtime, etc.), functions return graceful fallback results.
 */

import { ValidationResult } from './types';

export interface NliScores {
  entailment: number;
  contradiction: number;
  neutral: number;
}

export interface NliResult {
  label: 'entailment' | 'contradiction' | 'neutral';
  scores: NliScores;
}

/** Default threshold for entailment/contradiction checks */
const DEFAULT_THRESHOLD = 0.5;

/** Model identifier — small ONNX model suitable for CI (~100MB) */
const MODEL_ID = 'Xenova/mobilebert-uncased-mnli';

/**
 * Lazy singleton for the zero-shot classification pipeline.
 * Resolves to the pipeline instance or null if loading fails.
 */
let pipelinePromise: Promise<unknown> | null = null;
let modelAvailable: boolean | null = null;

/**
 * Loads the zero-shot classification pipeline (singleton).
 * Returns null if the model cannot be loaded.
 */
async function getClassifier(): Promise<unknown> {
  if (pipelinePromise === null) {
    pipelinePromise = (async () => {
      try {
        const { pipeline } = await import('@xenova/transformers');
        const classifier = await pipeline('zero-shot-classification', MODEL_ID);
        modelAvailable = true;
        return classifier;
      } catch (error) {
        modelAvailable = false;
        console.warn(
          `[nli-validator] Failed to load NLI model (${MODEL_ID}): ${error instanceof Error ? error.message : String(error)}`,
        );
        return null;
      }
    })();
  }
  return pipelinePromise;
}

/**
 * Returns true if the NLI model loaded successfully.
 * Triggers model loading if not yet attempted.
 */
export async function isNliAvailable(): Promise<boolean> {
  await getClassifier();
  return modelAvailable === true;
}

/**
 * Classifies the relationship between a premise (response) and hypothesis.
 * Uses zero-shot classification to determine if the premise supports,
 * contradicts, or is neutral to the hypothesis.
 *
 * The zero-shot pipeline internally uses NLI: for each candidate label,
 * it constructs "This example is {label}" and checks entailment against
 * the input text. We use the hypothesis directly as a candidate label
 * alongside its negation to determine the relationship.
 *
 * @param premise - The chatbot response text (the "evidence")
 * @param hypothesis - The claim to evaluate against the premise
 * @returns NliResult with the winning label and all scores
 */
export async function classifyNli(premise: string, hypothesis: string): Promise<NliResult> {
  const classifier = (await getClassifier()) as
    | ((
        text: string,
        labels: string[],
        options?: object,
      ) => Promise<{ labels: string[]; scores: number[] }>)
    | null;

  if (!classifier) {
    // Graceful fallback: return neutral with equal scores
    return {
      label: 'neutral',
      scores: { entailment: 0.33, contradiction: 0.33, neutral: 0.34 },
    };
  }

  // Use the hypothesis and its negation as candidate labels.
  // The zero-shot pipeline checks entailment of each label against the premise.
  // High score for hypothesis = entailment, high score for negation = contradiction.
  const negatedHypothesis = negateHypothesis(hypothesis);
  const candidateLabels = [hypothesis, negatedHypothesis, 'This is unrelated.'];

  const result = await classifier(premise, candidateLabels, {
    multi_label: false,
  });

  // Map the three candidate scores to NLI labels
  const scores: NliScores = { entailment: 0, contradiction: 0, neutral: 0 };
  for (let i = 0; i < result.labels.length; i++) {
    if (result.labels[i] === hypothesis) {
      scores.entailment = result.scores[i];
    } else if (result.labels[i] === negatedHypothesis) {
      scores.contradiction = result.scores[i];
    } else {
      scores.neutral = result.scores[i];
    }
  }

  // Determine winning label
  let maxScore = -1;
  let winningLabel: 'entailment' | 'contradiction' | 'neutral' = 'neutral';
  for (const [label, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      winningLabel = label as 'entailment' | 'contradiction' | 'neutral';
    }
  }

  return { label: winningLabel, scores };
}

/**
 * Creates a simple negation of a hypothesis for contradiction detection.
 * Handles common sentence patterns.
 */
function negateHypothesis(hypothesis: string): string {
  const lower = hypothesis.toLowerCase();

  // Handle "X can Y" → "X cannot Y"
  if (/\bcan\b/.test(lower) && !/\bcannot\b/.test(lower) && !/\bcan't\b/.test(lower)) {
    return hypothesis.replace(/\bcan\b/i, 'cannot');
  }

  // Handle "X is Y" → "X is not Y"
  if (/\bis\b/.test(lower)) {
    return hypothesis.replace(/\bis\b/i, 'is not');
  }

  // Handle "X does Y" → "X does not Y"
  if (/\bdoes\b/.test(lower)) {
    return hypothesis.replace(/\bdoes\b/i, 'does not');
  }

  // Handle "X did Y" → "X did not Y"
  if (/\bdid\b/.test(lower)) {
    return hypothesis.replace(/\bdid\b/i, 'did not');
  }

  // Default: prepend "It is not the case that"
  return `It is not the case that ${hypothesis.charAt(0).toLowerCase()}${hypothesis.slice(1)}`;
}

/**
 * Validates that a response CONTRADICTS a given claim.
 * Useful for: "the chatbot should NOT affirm this false premise"
 * Passes when contradiction score > threshold (default 0.5).
 *
 * @param response - The chatbot response text
 * @param claim - The hypothesis that should be contradicted
 * @param threshold - Minimum contradiction score to pass (default 0.5)
 */
export async function validateContradicts(
  response: string,
  claim: string,
  threshold: number = DEFAULT_THRESHOLD,
): Promise<ValidationResult> {
  const nliResult = await classifyNli(response, claim);

  if (nliResult.scores.contradiction >= threshold) {
    return {
      passed: true,
      layer: 'nli',
      message: `NLI contradiction score ${nliResult.scores.contradiction.toFixed(3)} meets threshold ${threshold}`,
      expected: `Contradicts: "${claim}"`,
      actual: response,
    };
  }

  return {
    passed: false,
    layer: 'nli',
    message: `NLI contradiction score ${nliResult.scores.contradiction.toFixed(3)} is below threshold ${threshold} (label: ${nliResult.label})`,
    expected: `Contradicts: "${claim}"`,
    actual: response,
  };
}

/**
 * Validates that a response ENTAILS (supports/implies) a given claim.
 * Useful for: "the chatbot should acknowledge it cannot do X"
 * Passes when entailment score > threshold (default 0.5).
 *
 * @param response - The chatbot response text
 * @param claim - The hypothesis that should be entailed
 * @param threshold - Minimum entailment score to pass (default 0.5)
 */
export async function validateEntails(
  response: string,
  claim: string,
  threshold: number = DEFAULT_THRESHOLD,
): Promise<ValidationResult> {
  const nliResult = await classifyNli(response, claim);

  if (nliResult.scores.entailment >= threshold) {
    return {
      passed: true,
      layer: 'nli',
      message: `NLI entailment score ${nliResult.scores.entailment.toFixed(3)} meets threshold ${threshold}`,
      expected: `Entails: "${claim}"`,
      actual: response,
    };
  }

  return {
    passed: false,
    layer: 'nli',
    message: `NLI entailment score ${nliResult.scores.entailment.toFixed(3)} is below threshold ${threshold} (label: ${nliResult.label})`,
    expected: `Entails: "${claim}"`,
    actual: response,
  };
}
