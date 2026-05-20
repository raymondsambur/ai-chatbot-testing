/**
 * Semantic similarity validator using TF-IDF cosine similarity.
 * Compares a chatbot response against an expected intent description
 * to determine if the response semantically matches the expectation.
 *
 * Uses the `natural` library's TfIdf class to compute term vectors
 * and calculates cosine similarity between them.
 */

import { ValidationResult } from './types';

/** Default similarity threshold for passing validation */
const DEFAULT_THRESHOLD = 0.7;

/**
 * Calculates cosine similarity between two TF-IDF term vectors.
 * Vectors are represented as Maps of term -> tfidf score.
 */
function cosineSimilarity(vectorA: Map<string, number>, vectorB: Map<string, number>): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (const [term, scoreA] of vectorA) {
    magnitudeA += scoreA * scoreA;
    const scoreB = vectorB.get(term);
    if (scoreB !== undefined) {
      dotProduct += scoreA * scoreB;
    }
  }

  for (const [, scoreB] of vectorB) {
    magnitudeB += scoreB * scoreB;
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

/**
 * Calculates semantic similarity between a response and an expected intent.
 * Returns a score in the range [0, 1] where 1.0 means identical content.
 *
 * For identical non-empty strings, returns 1.0.
 * If the natural library fails, returns 0.
 */
export function calculateSimilarity(response: string, expectedIntent: string): number {
  // Handle edge cases
  if (!response || !expectedIntent) {
    return 0;
  }

  // Identical strings always have similarity 1.0
  if (response === expectedIntent) {
    return 1.0;
  }

  try {
    // Dynamic import workaround: use require for natural since it's a CJS module
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const natural = require('natural');
    const TfIdf = natural.TfIdf;

    const tfidf = new TfIdf();

    // Add both documents to the TF-IDF corpus
    tfidf.addDocument(response);
    tfidf.addDocument(expectedIntent);

    // Build term vectors for each document
    const vectorA = new Map<string, number>();
    const vectorB = new Map<string, number>();

    // Get terms and their TF-IDF scores for document 0 (response)
    const termsA = tfidf.listTerms(0) as Array<{ term: string; tfidf: number }>;
    for (const item of termsA) {
      vectorA.set(item.term, item.tfidf);
    }

    // Get terms and their TF-IDF scores for document 1 (expectedIntent)
    const termsB = tfidf.listTerms(1) as Array<{ term: string; tfidf: number }>;
    for (const item of termsB) {
      vectorB.set(item.term, item.tfidf);
    }

    // If either vector is empty, no meaningful comparison can be made
    if (vectorA.size === 0 || vectorB.size === 0) {
      return 0;
    }

    const similarity = cosineSimilarity(vectorA, vectorB);

    // Clamp result to [0, 1] to handle floating point edge cases
    return Math.max(0, Math.min(1, similarity));
  } catch {
    // Graceful fallback if NLP library fails to load or throws
    return 0;
  }
}

/**
 * Validates a response against an expected intent using semantic similarity.
 * Returns a ValidationResult indicating pass/fail with details.
 *
 * @param response - The chatbot response text to validate
 * @param expectedIntent - The expected intent description to compare against
 * @param threshold - Minimum similarity score to pass (default 0.7)
 */
export function validateSemantic(
  response: string,
  expectedIntent: string,
  threshold: number = DEFAULT_THRESHOLD,
): ValidationResult {
  try {
    const score = calculateSimilarity(response, expectedIntent);

    if (score >= threshold) {
      return {
        passed: true,
        layer: 'semantic',
        message: `Semantic similarity score ${score.toFixed(3)} meets threshold ${threshold}`,
        expected: expectedIntent,
        actual: response,
      };
    }

    return {
      passed: false,
      layer: 'semantic',
      message: `Semantic similarity score ${score.toFixed(3)} is below threshold ${threshold}`,
      expected: expectedIntent,
      actual: response,
    };
  } catch {
    // Graceful fallback: if anything goes wrong, report failure with context
    return {
      passed: false,
      layer: 'semantic',
      message: 'Semantic validation failed: NLP library unavailable or encountered an error',
      expected: expectedIntent,
      actual: response,
    };
  }
}
