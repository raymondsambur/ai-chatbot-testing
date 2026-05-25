/**
 * Combined response validator orchestrator.
 * Accepts ValidationOptions specifying which assertion layers to apply,
 * evaluates them in order (structural → keywords → negative patterns → semantic),
 * and returns detailed results for each layer.
 *
 * This module is standalone with no browser/page dependency.
 */

import { ValidationResult } from './types';
import { validateStructural, StructuralValidationOptions } from './structural-validator';
import { validateKeywords } from './keyword-validator';
import { validateNegativePatterns } from './negative-pattern-validator';
import { validateSemantic } from './semantic-validator';
import { validateContradicts, validateEntails } from './nli-validator';

/**
 * Options specifying which validation layers to apply and their configuration.
 */
export interface ValidationOptions {
  semantic?: { expectedIntent: string; threshold?: number };
  keywords?: { set: string[]; minMatches?: number };
  negativePatterns?: { patterns: (string | RegExp)[] };
  structural?: {
    nonEmpty?: boolean;
    minLength?: number;
    maxLength?: number;
    completeSentence?: boolean;
  };
  nli?: {
    /** Hypothesis that should be CONTRADICTED by the response */
    contradicts?: string;
    /** Hypothesis that should be ENTAILED by the response */
    entails?: string;
    /** Minimum score threshold (default 0.5) */
    threshold?: number;
  };
}

/**
 * Evaluates all specified validation layers against a response string.
 * Layers are evaluated in order: structural → keywords → negative patterns → semantic.
 *
 * @param response - The chatbot response text to validate
 * @param options - Configuration specifying which layers to apply
 * @returns Array of ValidationResult from all specified layers
 */
export function validate(response: string, options: ValidationOptions): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Layer 1: Structural validation
  if (options.structural) {
    const structuralResults = validateStructural(response, options.structural);
    results.push(...structuralResults);
  }

  // Layer 2: Keyword validation
  if (options.keywords) {
    const keywordResult = validateKeywords(
      response,
      options.keywords.set,
      options.keywords.minMatches,
    );
    results.push(keywordResult);
  }

  // Layer 3: Negative pattern validation
  if (options.negativePatterns) {
    const negativeResult = validateNegativePatterns(response, options.negativePatterns.patterns);
    results.push(negativeResult);
  }

  // Layer 4: Semantic validation
  if (options.semantic) {
    const semanticResult = validateSemantic(
      response,
      options.semantic.expectedIntent,
      options.semantic.threshold,
    );
    results.push(semanticResult);
  }

  return results;
}

/**
 * Evaluates all specified validation layers and returns an overall pass/fail result.
 * Overall validation passes only if ALL specified layers pass.
 *
 * @param response - The chatbot response text to validate
 * @param options - Configuration specifying which layers to apply
 * @returns Object with overall passed boolean and detailed results array
 */
export function validateAll(
  response: string,
  options: ValidationOptions,
): { passed: boolean; results: ValidationResult[] } {
  const results = validate(response, options);
  const passed = results.length > 0 ? results.every((r) => r.passed) : true;

  return { passed, results };
}

/**
 * Class-based response validator providing the same functionality
 * as the standalone functions via instance methods.
 */
export class ResponseValidator {
  /**
   * Evaluates all specified validation layers against a response string.
   * Layers are evaluated in order: structural → keywords → negative patterns → semantic.
   * Note: NLI validation requires the async validateAllAsync method.
   */
  validate(response: string, options: ValidationOptions): ValidationResult[] {
    return validate(response, options);
  }

  /**
   * Evaluates all specified validation layers and returns an overall pass/fail result.
   * Overall validation passes only if ALL specified layers pass.
   * Note: NLI validation requires the async validateAllAsync method.
   */
  validateAll(
    response: string,
    options: ValidationOptions,
  ): { passed: boolean; results: ValidationResult[] } {
    return validateAll(response, options);
  }

  /**
   * Async version that includes NLI validation (Layer 5).
   * Evaluates all layers including NLI and returns an overall pass/fail result.
   */
  async validateAllAsync(
    response: string,
    options: ValidationOptions,
  ): Promise<{ passed: boolean; results: ValidationResult[] }> {
    return validateAllAsync(response, options);
  }
}

/**
 * Evaluates all specified validation layers including async NLI.
 * Layers are evaluated in order: structural → keywords → negative patterns → semantic → NLI.
 *
 * @param response - The chatbot response text to validate
 * @param options - Configuration specifying which layers to apply
 * @returns Object with overall passed boolean and detailed results array
 */
export async function validateAllAsync(
  response: string,
  options: ValidationOptions,
): Promise<{ passed: boolean; results: ValidationResult[] }> {
  // Run synchronous layers first
  const results = validate(response, options);

  // Layer 5: NLI validation (async)
  if (options.nli) {
    if (options.nli.contradicts) {
      const nliResult = await validateContradicts(
        response,
        options.nli.contradicts,
        options.nli.threshold,
      );
      results.push(nliResult);
    }
    if (options.nli.entails) {
      const nliResult = await validateEntails(response, options.nli.entails, options.nli.threshold);
      results.push(nliResult);
    }
  }

  const passed = results.length > 0 ? results.every((r) => r.passed) : true;
  return { passed, results };
}
