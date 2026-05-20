/**
 * Wrapper module that re-exports the CucumberJSAllureFormatter as the
 * default export, which is what Cucumber.js expects for custom formatters.
 *
 * allure-cucumberjs v2.x expects (options, allureRuntime, config) but
 * Cucumber.js v10 only passes (options). This wrapper bridges the gap.
 */
const path = require("path");
const fs = require("fs");
const { CucumberJSAllureFormatter, AllureRuntime } = require("allure-cucumberjs");

class AllureFormatter extends CucumberJSAllureFormatter {
  constructor(options) {
    const resultsDir = options.parsedArgvOptions?.resultsDir || "allure-results";
    // Ensure the results directory exists before AllureRuntime tries to write
    const absoluteDir = path.resolve(process.cwd(), resultsDir);
    fs.mkdirSync(absoluteDir, { recursive: true });

    const allureRuntime = new AllureRuntime({ resultsDir });
    const config = {
      labels: [],
      links: [],
    };
    super(options, allureRuntime, config);
  }
}

module.exports = AllureFormatter;
