import { ConsoleLogger } from '../ConsoleLogger';

describe('ConsoleLogger', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('redacts sensitive context before it reaches console.error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new ConsoleLogger();

    logger.error('login failed', new Error('boom'), { accessToken: 'secret', userId: 'u1' });

    expect(spy).toHaveBeenCalledWith('[ERROR] login failed', expect.any(Error), { accessToken: '[REDACTED]', userId: 'u1' });
  });

  it('always logs warn/error regardless of __DEV__', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = new ConsoleLogger();

    logger.warn('slow response', { durationMs: 4000 });

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
