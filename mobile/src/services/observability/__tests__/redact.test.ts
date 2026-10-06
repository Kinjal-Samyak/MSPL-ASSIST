import { redactContext } from '../redact';

describe('redactContext', () => {
  it('redacts values whose key looks sensitive', () => {
    const result = redactContext({
      accessToken: 'abc123',
      refreshToken: 'def456',
      password: 'hunter2',
      mobile: '9999999999',
      email: 'user@example.com',
      jobId: 'job-1',
    });

    expect(result).toEqual({
      accessToken: '[REDACTED]',
      refreshToken: '[REDACTED]',
      password: '[REDACTED]',
      mobile: '[REDACTED]',
      email: '[REDACTED]',
      jobId: 'job-1',
    });
  });

  it('passes through undefined unchanged', () => {
    expect(redactContext(undefined)).toBeUndefined();
  });

  it('leaves an empty context as an empty object', () => {
    expect(redactContext({})).toEqual({});
  });
});
