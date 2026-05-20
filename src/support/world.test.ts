import { describe, it, expect, vi } from 'vitest';

// Mock setWorldConstructor since it requires a running Cucumber instance
vi.mock('@cucumber/cucumber', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    setWorldConstructor: vi.fn(),
  };
});

import { CustomWorld } from './world';
import { ResponseValidator } from '../validators/response-validator';
import { config } from './config';

describe('CustomWorld', () => {
  it('should initialize validator as a ResponseValidator instance', () => {
    const world = new CustomWorld({
      log: () => {},
      attach: async () => {},
      parameters: {},
    });

    expect(world.validator).toBeInstanceOf(ResponseValidator);
  });

  it('should initialize config from the config singleton', () => {
    const world = new CustomWorld({
      log: () => {},
      attach: async () => {},
      parameters: {},
    });

    expect(world.config).toBe(config);
    expect(world.config.baseUrl).toBeDefined();
  });

  it('should initialize lastResponse as an empty string', () => {
    const world = new CustomWorld({
      log: () => {},
      attach: async () => {},
      parameters: {},
    });

    expect(world.lastResponse).toBe('');
  });

  it('should leave page, context, and chatbotPage uninitialized', () => {
    const world = new CustomWorld({
      log: () => {},
      attach: async () => {},
      parameters: {},
    });

    // These are set by hooks, not the constructor
    expect(world.page).toBeUndefined();
    expect(world.context).toBeUndefined();
    expect(world.chatbotPage).toBeUndefined();
  });
});
