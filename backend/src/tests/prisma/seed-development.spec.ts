import bcrypt from 'bcryptjs';

const { DEVELOPMENT_USERS, assertDevelopmentSeedAllowed, upsertDevelopmentUsers } = require('../../../prisma/seed-development');

describe('development user seed', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalRuntimeEnvironment = process.env.MSPL_RUNTIME_ENV;
  const originalSeedFlag = process.env.DEVELOPMENT_TEST_SEED;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalRuntimeEnvironment === undefined) delete process.env.MSPL_RUNTIME_ENV;
    else process.env.MSPL_RUNTIME_ENV = originalRuntimeEnvironment;
    if (originalSeedFlag === undefined) delete process.env.DEVELOPMENT_TEST_SEED;
    else process.env.DEVELOPMENT_TEST_SEED = originalSeedFlag;
  });

  it('permits the explicitly flagged Training environment', () => {
    process.env.NODE_ENV = 'production';
    process.env.MSPL_RUNTIME_ENV = 'training';
    process.env.DEVELOPMENT_TEST_SEED = 'true';

    expect(assertDevelopmentSeedAllowed).not.toThrow();
  });

  it('creates the default Coordinator and Technician with bcrypt hashes', async () => {
    const client = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const results = await upsertDevelopmentUsers(client);

    expect(results).toEqual([
      { email: 'coordinator@msplassist.local', result: 'created' },
      { email: 'technician@msplassist.local', result: 'created' },
    ]);
    expect(client.user.create).toHaveBeenCalledTimes(2);

    for (const [index, user] of DEVELOPMENT_USERS.entries()) {
      const input = client.user.create.mock.calls[index][0].data;
      expect(input).toMatchObject({ name: user.name, email: user.email, role: user.role, active: true });
      expect(input.passwordHash).not.toBe(user.password);
      await expect(bcrypt.compare(user.password, input.passwordHash)).resolves.toBe(true);
    }
  });

  it('does not overwrite or duplicate existing development users', async () => {
    const client = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing-user' }),
        create: jest.fn(),
      },
    };

    await expect(upsertDevelopmentUsers(client)).resolves.toEqual([
      { email: 'coordinator@msplassist.local', result: 'already-exists' },
      { email: 'technician@msplassist.local', result: 'already-exists' },
    ]);
    expect(client.user.create).not.toHaveBeenCalled();
  });
});
