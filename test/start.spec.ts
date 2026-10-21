describe('application startup', () => {
  let startServer: jest.Mock;
  let loadEnvironment: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    startServer = jest.fn().mockResolvedValue(undefined);
    loadEnvironment = jest.fn();

    jest.doMock('../src/server', () => ({
      Server: { start: startServer },
    }));
    jest.doMock('../src/config', () => ({
      __esModule: true,
      default: { port: '3000' },
      ApplicationConfig: { loadEnv: loadEnvironment },
    }));
  });

  afterEach(() => {
    jest.dontMock('../src/server');
    jest.dontMock('../src/config');
  });

  it('loads the environment and starts the server', () => {
    jest.isolateModules(() => {
      require('../src/start');
    });

    expect(loadEnvironment).toHaveBeenCalledWith(process.env);
    expect(startServer).toHaveBeenCalledWith({ port: '3000' });
  });

  it('logs startup failures', async () => {
    const startupError = new Error('Startup failed');
    startServer.mockRejectedValue(startupError);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    jest.isolateModules(() => {
      require('../src/start');
    });
    await new Promise<void>(resolve => setImmediate(resolve));

    expect(consoleError).toHaveBeenCalledWith(startupError);
    consoleError.mockRestore();
  });
});