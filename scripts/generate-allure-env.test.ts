/**
 * Unit tests for the Allure environment metadata generation script.
 * Validates environment.properties generation and history copy behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const ROOT_DIR = path.resolve(__dirname, '..');
const ALLURE_RESULTS_DIR = path.join(ROOT_DIR, 'allure-results-test');
const ALLURE_REPORT_DIR = path.join(ROOT_DIR, 'allure-report-test');
const ENV_PROPERTIES_PATH = path.join(ALLURE_RESULTS_DIR, 'environment.properties');
const HISTORY_SOURCE = path.join(ALLURE_REPORT_DIR, 'history');
const HISTORY_DEST = path.join(ALLURE_RESULTS_DIR, 'history');

/**
 * Generates environment.properties content (mirrors script logic for testing).
 */
function generateEnvironmentProperties(resultsDir: string, envPath: string): void {
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
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

  fs.writeFileSync(envPath, properties + '\n', 'utf-8');
}

/**
 * Copies history from report dir to results dir (mirrors script logic).
 */
function copyHistory(historySource: string, historyDest: string): number {
  if (!fs.existsSync(historySource)) {
    return 0;
  }

  if (!fs.existsSync(historyDest)) {
    fs.mkdirSync(historyDest, { recursive: true });
  }

  const files = fs.readdirSync(historySource);
  let copiedCount = 0;

  for (const file of files) {
    const srcFile = path.join(historySource, file);
    const destFile = path.join(historyDest, file);
    const stat = fs.statSync(srcFile);
    if (stat.isFile()) {
      fs.copyFileSync(srcFile, destFile);
      copiedCount++;
    }
  }

  return copiedCount;
}

/**
 * Recursively removes a directory and its contents.
 */
function cleanDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('Allure environment metadata generation', () => {
  beforeEach(() => {
    cleanDir(ALLURE_RESULTS_DIR);
    cleanDir(ALLURE_REPORT_DIR);
  });

  afterEach(() => {
    cleanDir(ALLURE_RESULTS_DIR);
    cleanDir(ALLURE_REPORT_DIR);
  });

  it('creates allure-results directory if it does not exist', () => {
    expect(fs.existsSync(ALLURE_RESULTS_DIR)).toBe(false);
    generateEnvironmentProperties(ALLURE_RESULTS_DIR, ENV_PROPERTIES_PATH);
    expect(fs.existsSync(ALLURE_RESULTS_DIR)).toBe(true);
  });

  it('generates environment.properties with required metadata fields', () => {
    generateEnvironmentProperties(ALLURE_RESULTS_DIR, ENV_PROPERTIES_PATH);

    const content = fs.readFileSync(ENV_PROPERTIES_PATH, 'utf-8');
    expect(content).toContain('Browser=Chromium');
    expect(content).toContain('OS=');
    expect(content).toContain('Timestamp=');
    expect(content).toContain('Node.Version=');
    expect(content).toContain('Base.URL=');
  });

  it('includes correct OS information', () => {
    generateEnvironmentProperties(ALLURE_RESULTS_DIR, ENV_PROPERTIES_PATH);

    const content = fs.readFileSync(ENV_PROPERTIES_PATH, 'utf-8');
    const expectedOs = `${os.type()} ${os.release()}`;
    expect(content).toContain(`OS=${expectedOs}`);
  });

  it('includes correct Node version', () => {
    generateEnvironmentProperties(ALLURE_RESULTS_DIR, ENV_PROPERTIES_PATH);

    const content = fs.readFileSync(ENV_PROPERTIES_PATH, 'utf-8');
    expect(content).toContain(`Node.Version=${process.version}`);
  });

  it('includes ISO 8601 timestamp', () => {
    generateEnvironmentProperties(ALLURE_RESULTS_DIR, ENV_PROPERTIES_PATH);

    const content = fs.readFileSync(ENV_PROPERTIES_PATH, 'utf-8');
    // ISO 8601 pattern: YYYY-MM-DDTHH:mm:ss.sssZ
    const timestampMatch = content.match(/Timestamp=(\S+)/);
    expect(timestampMatch).not.toBeNull();
    const timestamp = timestampMatch![1];
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });

  it('uses BASE_URL env var when set', () => {
    const originalBaseUrl = process.env.BASE_URL;
    process.env.BASE_URL = 'https://custom.example.com/chat';

    generateEnvironmentProperties(ALLURE_RESULTS_DIR, ENV_PROPERTIES_PATH);

    const content = fs.readFileSync(ENV_PROPERTIES_PATH, 'utf-8');
    expect(content).toContain('Base.URL=https://custom.example.com/chat');

    // Restore
    if (originalBaseUrl === undefined) {
      delete process.env.BASE_URL;
    } else {
      process.env.BASE_URL = originalBaseUrl;
    }
  });

  it('uses default BASE_URL when env var is not set', () => {
    const originalBaseUrl = process.env.BASE_URL;
    delete process.env.BASE_URL;

    generateEnvironmentProperties(ALLURE_RESULTS_DIR, ENV_PROPERTIES_PATH);

    const content = fs.readFileSync(ENV_PROPERTIES_PATH, 'utf-8');
    expect(content).toContain('Base.URL=https://chatbot.ai-sdk.dev/demo');

    // Restore
    if (originalBaseUrl !== undefined) {
      process.env.BASE_URL = originalBaseUrl;
    }
  });
});

describe('Allure history copy', () => {
  beforeEach(() => {
    cleanDir(ALLURE_RESULTS_DIR);
    cleanDir(ALLURE_REPORT_DIR);
  });

  afterEach(() => {
    cleanDir(ALLURE_RESULTS_DIR);
    cleanDir(ALLURE_REPORT_DIR);
  });

  it('returns 0 when no previous history exists', () => {
    const count = copyHistory(HISTORY_SOURCE, HISTORY_DEST);
    expect(count).toBe(0);
  });

  it('copies history files from allure-report to allure-results', () => {
    // Create mock history files
    fs.mkdirSync(HISTORY_SOURCE, { recursive: true });
    fs.writeFileSync(path.join(HISTORY_SOURCE, 'history.json'), '{"items":[]}');
    fs.writeFileSync(path.join(HISTORY_SOURCE, 'history-trend.json'), '[]');

    fs.mkdirSync(ALLURE_RESULTS_DIR, { recursive: true });

    const count = copyHistory(HISTORY_SOURCE, HISTORY_DEST);

    expect(count).toBe(2);
    expect(fs.existsSync(path.join(HISTORY_DEST, 'history.json'))).toBe(true);
    expect(fs.existsSync(path.join(HISTORY_DEST, 'history-trend.json'))).toBe(true);
  });

  it('creates history destination directory if it does not exist', () => {
    fs.mkdirSync(HISTORY_SOURCE, { recursive: true });
    fs.writeFileSync(path.join(HISTORY_SOURCE, 'history.json'), '{"items":[]}');
    fs.mkdirSync(ALLURE_RESULTS_DIR, { recursive: true });

    expect(fs.existsSync(HISTORY_DEST)).toBe(false);
    copyHistory(HISTORY_SOURCE, HISTORY_DEST);
    expect(fs.existsSync(HISTORY_DEST)).toBe(true);
  });

  it('preserves file content when copying history', () => {
    const historyContent = '{"items":[{"uid":"abc","status":"passed"}]}';
    fs.mkdirSync(HISTORY_SOURCE, { recursive: true });
    fs.writeFileSync(path.join(HISTORY_SOURCE, 'history.json'), historyContent);
    fs.mkdirSync(ALLURE_RESULTS_DIR, { recursive: true });

    copyHistory(HISTORY_SOURCE, HISTORY_DEST);

    const copied = fs.readFileSync(path.join(HISTORY_DEST, 'history.json'), 'utf-8');
    expect(copied).toBe(historyContent);
  });

  it('skips subdirectories in history folder', () => {
    fs.mkdirSync(HISTORY_SOURCE, { recursive: true });
    fs.writeFileSync(path.join(HISTORY_SOURCE, 'history.json'), '{}');
    fs.mkdirSync(path.join(HISTORY_SOURCE, 'subdir'), { recursive: true });
    fs.mkdirSync(ALLURE_RESULTS_DIR, { recursive: true });

    const count = copyHistory(HISTORY_SOURCE, HISTORY_DEST);
    expect(count).toBe(1);
  });
});
