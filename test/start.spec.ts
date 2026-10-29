const flushPromises = () => new Promise(setImmediate);

describe('start', () => {

  let mockStart: jest.Mock;
  let mockLoadEnv: jest.Mock;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    mockStart = jest.fn();
    mockLoadEnv = jest.fn();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    jest.doMock('../src/server', () => ({ Server: { start: mockStart } }));
    jest.doMock('../src/config', () => ({
      __esModule: true,
      default: { port: '3000' },
      ApplicationConfig: { loadEnv: mockLoadEnv }
    }));
  });

  afterEach(() => {
    jest.dontMock('../src/server');
    jest.dontMock('../src/config');
    mockConsoleError.mockRestore();
  });

  it('will load the environment and start the server', async () => {
    mockStart.mockResolvedValue(undefined);

    require('../src/start');
    await flushPromises();

    expect(mockLoadEnv).toHaveBeenCalledWith(process.env);
    expect(mockStart).toHaveBeenCalledWith({ port: '3000' });
    expect(mockConsoleError).not.toHaveBeenCalled();
  });

  it('will log an error rather than leaving an unhandled rejection when the server fails to start', async () => {
    const error = new Error('start failed');
    mockStart.mockRejectedValue(error);

    require('../src/start');
    await flushPromises();

    expect(mockConsoleError).toHaveBeenCalledWith(error);
  });

  it('will log an error when loading the environment fails', async () => {
    const error = new Error('env failed');
    mockLoadEnv.mockImplementation(() => { throw error; });

    require('../src/start');
    await flushPromises();

    expect(mockStart).not.toHaveBeenCalled();
    expect(mockConsoleError).toHaveBeenCalledWith(error);
  });

});
