/**
 * Cucumber.js configuration for the AI Chatbot BDD test suite.
 *
 * Maps feature file globs to step definition globs and configures
 * the allure-cucumberjs formatter for test reporting.
 */
module.exports = {
  default: {
    paths: ['src/features/**/*.feature'],
    require: [
      'src/step-definitions/**/*.steps.ts',
      'src/support/world.ts',
      'src/support/hooks.ts',
      'src/support/config.ts',
      'src/support/retry.ts',
    ],
    requireModule: ['ts-node/register'],
    format: ['progress-bar', './src/support/allure-formatter.js'],
    formatOptions: {
      resultsDir: 'allure-results',
    },
  },
};
