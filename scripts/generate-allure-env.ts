/**
 * Generates Allure environment metadata and preserves history for trend charts.
 *
 * This script is run before `allure generate` to:
 * 1. Write `allure-results/environment.properties` with runtime metadata
 *    (browser, OS, timestamp, Node version, base URL).
 * 2. Copy `allure-report/history/` into `allure-results/history/` so that
 *    Allure can render trend charts across multiple runs.
 *
 * Handles missing or corrupted allure-results gracefully — if the directory
 * does not exist it is created; if history is missing it is silently skipped.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const ROOT_DIR = path.resolve(__dirname, '..');
const ALLURE_RESULTS_DIR = path.join(ROOT_DIR, 'allure-results');
const ALLURE_REPORT_DIR = path.join(ROOT_DIR, 'allure-report');
const ENV_PROPERTIES_PATH = path.join(ALLURE_RESULTS_DIR, 'environment.properties');
const HISTORY_SOURCE = path.join(ALLURE_REPORT_DIR, 'history');
const HISTORY_DEST = path.join(ALLURE_RESULTS_DIR, 'history');

/**
 * Writes the environment.properties file with runtime metadata.
 * Creates the allure-results directory if it does not exist.
 */
function generateEnvironmentProperties(): void {
  // Ensure allure-results directory exists
  if (!fs.existsSync(ALLURE_RESULTS_DIR)) {
    fs.mkdirSync(ALLURE_RESULTS_DIR, { recursive: true });
    console.log('Created allure-results directory.');
  }

  const baseUrl = process.env.BASE_URL || 'https://chatbot.ai-sdk.dev/demo';
  const timestamp = new Date().toISOString();
  const osInfo = `${os.type()} ${os.release()}`;
  const nodeVersion = process.version;

  const properties = [
    `Browser=Chromium`,
    `OS=${osInfo}`,
    `Timestamp=${timestamp}`,
    `Node.Version=${nodeVersion}`,
    `Base.URL=${baseUrl}`,
  ].join('\n');

  fs.writeFileSync(ENV_PROPERTIES_PATH, properties + '\n', 'utf-8');
  console.log(`Generated ${ENV_PROPERTIES_PATH}`);
}

/**
 * Copies the history directory from a previous allure-report into
 * allure-results so that Allure can display trend charts.
 *
 * If no previous report or history exists, this step is silently skipped.
 * If the history directory is corrupted (unreadable), a warning is logged.
 */
function copyHistory(): void {
  if (!fs.existsSync(HISTORY_SOURCE)) {
    console.log('No previous allure-report/history found — skipping history copy.');
    return;
  }

  try {
    // Create destination history directory
    if (!fs.existsSync(HISTORY_DEST)) {
      fs.mkdirSync(HISTORY_DEST, { recursive: true });
    }

    // Copy all files from history source to destination
    const files = fs.readdirSync(HISTORY_SOURCE);
    let copiedCount = 0;

    for (const file of files) {
      const srcFile = path.join(HISTORY_SOURCE, file);
      const destFile = path.join(HISTORY_DEST, file);

      try {
        const stat = fs.statSync(srcFile);
        if (stat.isFile()) {
          fs.copyFileSync(srcFile, destFile);
          copiedCount++;
        }
      } catch (fileError: unknown) {
        const message = fileError instanceof Error ? fileError.message : String(fileError);
        console.warn(`Warning: Could not copy history file ${file}: ${message}`);
      }
    }

    console.log(`Copied ${copiedCount} history file(s) to allure-results/history.`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Failed to copy history — ${message}`);
    console.warn('Report will be generated without historical trend data.');
  }
}

// Main execution
try {
  generateEnvironmentProperties();
  copyHistory();
  console.log('Allure pre-report setup complete.');
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error during Allure setup: ${message}`);
  // Exit gracefully — report generation can still proceed without env metadata
  process.exit(0);
}
