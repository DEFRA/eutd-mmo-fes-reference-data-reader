describe('getEuCatchOperatorId', () => {
  const accountId = 'account-123';
  const clientId = 'd365-client-id';
  const clientSecret = 'd365-client-secret';
  const scope = 'd365-scope';
  const defaultTokenUrl = 'https://login.example/token';
  const defaultCrmUrl = 'https://crm.example/operator';
  const apiVersion = 'v9.2';

  const loadSut = async (overrides?: {
    tokenUrl?: string;
    crmUrl?: string;
    crmTimeoutMs?: number;
    inDev?: boolean;
    enableCrmOperatorActivityId?: boolean;
  }) => {
    jest.resetModules();

    jest.doMock('../../src/data/cache', () => ({
      getCountries: jest.fn(() => [])
    }));

    jest.doMock('../../src/controllers/species', () => ({
      getCommodities: jest.fn(() => [])
    }));

    const post = jest.fn();
    const get = jest.fn();
    jest.doMock('axios', () => ({
      __esModule: true,
      default: { post, get }
    }));

    const info = jest.fn();
    const warn = jest.fn();
    const error = jest.fn();
    jest.doMock('../../src/logger', () => ({
      __esModule: true,
      default: { info, warn, error }
    }));

    jest.doMock('../../src/config', () => ({
      __esModule: true,
      default: {
        inDev: overrides?.inDev ?? false,
        dynamics365CrmUrl: overrides?.crmUrl || defaultCrmUrl,
        dynamics365CrmApiVersion: apiVersion,
        dynamics365CrmTimeoutMs: overrides?.crmTimeoutMs || 10000,
        dynamics365CrmOauthClientId: clientId,
        dynamics365CrmOauthClientSecret: clientSecret,
        dynamics365CrmOauthScope: scope,
        dynamics365CrmOauthTokenUrl: overrides?.tokenUrl || defaultTokenUrl,
        enableCrmOperatorActivityId: overrides?.enableCrmOperatorActivityId ?? true
      }
    }));

    const sut = await import('../../src/data/euCatch');
    const axiosMock = (await import('axios')).default as unknown as {
      post: jest.Mock;
      get: jest.Mock;
    };
    const loggerMock = (await import('../../src/logger')).default as unknown as {
      info: jest.Mock;
      warn: jest.Mock;
      error: jest.Mock;
    };

    return {
      sut,
      axiosMock,
      loggerMock
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns operator id when token and CRM calls succeed', async () => {
    const { sut, axiosMock } = await loadSut();

    axiosMock.post.mockResolvedValue({
      data: {
        access_token: 'token-123',
        expires_in: 3600
      }
    });

      axiosMock.get.mockResolvedValue({
        status: 200,
        data: {
          status: 'Succeeded',
          euCatchOperatorId: 'operator-abc'
        }
      });

    const result = await sut.getEuCatchOperatorId(accountId);

    expect(result).toBe('operator-abc');
    expect(axiosMock.get).toHaveBeenCalledWith(defaultCrmUrl, expect.objectContaining({
      params: {
        'api-version': apiVersion,
        accountId
      },
      timeout: 10000
    }));
  });

  it('returns empty string and performs no token or CRM calls when feature flag is disabled', async () => {
    const { sut, axiosMock } = await loadSut({ enableCrmOperatorActivityId: false });

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('');
    expect(axiosMock.post).not.toHaveBeenCalled();
    expect(axiosMock.get).not.toHaveBeenCalled();
  });

  it('uses configured timeout for both token POST and CRM GET calls', async () => {
    const configuredTimeoutMs = 34567;
    const { sut, axiosMock } = await loadSut({ crmTimeoutMs: configuredTimeoutMs });

    axiosMock.post.mockResolvedValue({
      data: {
        access_token: 'token-123',
        expires_in: 3600
      }
    });

    axiosMock.get.mockResolvedValue({
      status: 200,
      data: {
        status: 'Succeeded',
        euCatchOperatorId: 'operator-abc'
      }
    });

    await sut.getEuCatchOperatorId(accountId);

    expect(axiosMock.post).toHaveBeenCalledWith(
      defaultTokenUrl,
      expect.any(String),
      expect.objectContaining({ timeout: configuredTimeoutMs })
    );
    expect(axiosMock.get).toHaveBeenCalledWith(
      defaultCrmUrl,
      expect.objectContaining({ timeout: configuredTimeoutMs })
    );
  });

  it('returns empty string when CRM body status is Failed', async () => {
    const { sut, axiosMock } = await loadSut();

    axiosMock.post.mockResolvedValue({ data: { access_token: 'token-123', expires_in: 3600 } });
      axiosMock.get.mockResolvedValue({ status: 200, data: { status: 'Failed', euCatchOperatorId: 'operator-abc' } });

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('');
  });

  it('returns empty string for non-200 CRM response', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut();

    axiosMock.post.mockResolvedValue({ data: { access_token: 'token-123', expires_in: 3600 } });
      axiosMock.get.mockResolvedValue({ status: 503, data: { status: 'Succeeded', euCatchOperatorId: 'operator-abc' } });

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('');
    expect(loggerMock.warn).toHaveBeenCalledWith('[EU-CATCH-CRM][GET-OPERATOR-ID][NON-200][STATUS][503]');
  });

  it('returns empty string on CRM network error', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut();

    axiosMock.post.mockResolvedValue({ data: { access_token: 'token-123', expires_in: 3600 } });
    axiosMock.get.mockRejectedValue(new Error('network down'));

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('');
    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[EU-CATCH-CRM][GET-OPERATOR-ID][ERROR][CATEGORY][GENERAL][CODE][N/A][STATUS][N/A]'
    );
  });

  it('returns empty string when token request fails', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut();

    axiosMock.post.mockRejectedValue(new Error('token failed'));

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('');
    expect(axiosMock.get).not.toHaveBeenCalled();
    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[EU-CATCH-CRM][GET-OPERATOR-ID][ERROR][CATEGORY][GENERAL][CODE][N/A][STATUS][N/A]'
    );
  });

  it('sends a form-encoded token body and does not send Authorization header to token endpoint', async () => {
    const { sut, axiosMock } = await loadSut();

    axiosMock.post.mockResolvedValue({ data: { access_token: 'token-123', expires_in: 3600 } });
    axiosMock.get.mockResolvedValue({ status: 200, data: { status: 'Succeeded', euCatchOperatorId: 'operator-abc' } });

    await sut.getEuCatchOperatorId(accountId);

    expect(axiosMock.post).toHaveBeenCalledTimes(1);
    const [, body, options] = axiosMock.post.mock.calls[0];

    expect(body).toContain('grant_type=client_credentials');
    expect(body).toContain(`client_id=${encodeURIComponent(clientId)}`);
    expect(body).toContain(`client_secret=${encodeURIComponent(clientSecret)}`);
    expect(body).toContain(`scope=${encodeURIComponent(scope)}`);
    expect(options).toEqual(expect.objectContaining({
      headers: expect.objectContaining({
        'Content-Type': 'application/x-www-form-urlencoded'
      })
    }));
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('rejects non-HTTPS token URL before making any HTTP request', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut({ tokenUrl: 'http://login.example/token' });

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('');

    expect(axiosMock.post).not.toHaveBeenCalled();
    expect(axiosMock.get).not.toHaveBeenCalled();
    expect(loggerMock.warn).toHaveBeenCalledWith('[EU-CATCH-CRM][TOKEN][INVALID-CONFIG][OAUTH-TOKEN-URL-NON-HTTPS]');
  });

  it('rejects malformed token URL before making any HTTP request', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut({ tokenUrl: 'not-a-valid-url' });

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('');

    expect(axiosMock.post).not.toHaveBeenCalled();
    expect(axiosMock.get).not.toHaveBeenCalled();
    expect(loggerMock.warn).toHaveBeenCalledWith('[EU-CATCH-CRM][TOKEN][INVALID-CONFIG][OAUTH-TOKEN-URL-NON-HTTPS]');
  });

  it('in dev mode, proceeds with HTTP token and CRM URLs', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut({
      inDev: true,
      tokenUrl: 'http://login.example/token',
      crmUrl: 'http://crm.example/operator'
    });

    axiosMock.post.mockResolvedValue({
      data: {
        access_token: 'token-123',
        expires_in: 3600
      }
    });
    axiosMock.get.mockResolvedValue({
      status: 200,
      data: {
        status: 'Succeeded',
        euCatchOperatorId: 'operator-abc'
      }
    });

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('operator-abc');

    expect(axiosMock.post).toHaveBeenCalledTimes(1);
    expect(axiosMock.get).toHaveBeenCalledTimes(1);
    expect(loggerMock.warn).not.toHaveBeenCalledWith('[EU-CATCH-CRM][TOKEN][INVALID-CONFIG][OAUTH-TOKEN-URL-NON-HTTPS]');
    expect(loggerMock.warn).not.toHaveBeenCalledWith('[EU-CATCH-CRM][GET-OPERATOR-ID][INVALID-CONFIG][CRM-URL-NON-HTTPS]');
  });

  it('in dev mode, malformed URLs bypass guard and request path handles failure', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut({
      inDev: true,
      tokenUrl: 'not-a-valid-url',
      crmUrl: 'still-not-a-url'
    });

    axiosMock.post.mockResolvedValue({ data: { access_token: 'token-123', expires_in: 3600 } });
    axiosMock.get.mockRejectedValue(new Error('network down'));

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('');

    expect(axiosMock.post).toHaveBeenCalledTimes(1);
    expect(axiosMock.get).toHaveBeenCalledTimes(1);
    expect(loggerMock.warn).not.toHaveBeenCalledWith('[EU-CATCH-CRM][TOKEN][INVALID-CONFIG][OAUTH-TOKEN-URL-NON-HTTPS]');
  });

  it('rejects non-HTTPS CRM URL before making any HTTP request', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut({ crmUrl: 'http://crm.example/operator' });

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('');

    expect(axiosMock.post).not.toHaveBeenCalled();
    expect(axiosMock.get).not.toHaveBeenCalled();
    expect(loggerMock.warn).toHaveBeenCalledWith('[EU-CATCH-CRM][GET-OPERATOR-ID][INVALID-CONFIG][CRM-URL-NON-HTTPS]');
  });

  it('reuses token before expiry and refreshes it after expiry', async () => {
    const nowSpy = jest.spyOn(Date, 'now');
    let nowValue = 1_000_000;
    nowSpy.mockImplementation(() => nowValue);

    const { sut, axiosMock } = await loadSut();

    axiosMock.post
      .mockResolvedValueOnce({ data: { access_token: 'token-1', expires_in: 120 } })
      .mockResolvedValueOnce({ data: { access_token: 'token-2', expires_in: 120 } });

    axiosMock.get.mockResolvedValue({ status: 200, data: { status: 'Succeeded', euCatchOperatorId: 'operator-abc' } });

    await sut.getEuCatchOperatorId(accountId);
    expect(axiosMock.post).toHaveBeenCalledTimes(1);

    nowValue = 1_010_000;
    await sut.getEuCatchOperatorId(accountId);
    expect(axiosMock.post).toHaveBeenCalledTimes(1);

    nowValue = 1_070_000;
    await sut.getEuCatchOperatorId(accountId);
    expect(axiosMock.post).toHaveBeenCalledTimes(2);
  });

  it('returns empty string and warns for malformed successful payload', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut();

    axiosMock.post.mockResolvedValue({ data: { access_token: 'token-123', expires_in: 3600 } });
    axiosMock.get.mockResolvedValue({ status: 200, data: { foo: 'bar' } });

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('');
    expect(loggerMock.warn).toHaveBeenCalledWith('[EU-CATCH-CRM][GET-OPERATOR-ID][MALFORMED-200-PAYLOAD]');
  });

  it('returns empty string when token response has missing access token and does not cache invalid token', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut();

    axiosMock.post
      .mockResolvedValueOnce({ data: { access_token: '   ', expires_in: 3600 } })
      .mockResolvedValueOnce({ data: { access_token: 'token-123', expires_in: 3600 } });
    axiosMock.get.mockResolvedValue({ status: 200, data: { status: 'Succeeded', euCatchOperatorId: 'operator-abc' } });

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('');
    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('operator-abc');

    expect(axiosMock.post).toHaveBeenCalledTimes(2);
    expect(axiosMock.get).toHaveBeenCalledTimes(1);
    expect(loggerMock.warn).toHaveBeenCalledWith('[EU-CATCH-CRM][TOKEN][INVALID-RESPONSE][MISSING-ACCESS-TOKEN]');
  });

  it('logs sanitised HTTP metadata when CRM request fails with axios-like error', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut();

    axiosMock.post.mockResolvedValue({ data: { access_token: 'token-123', expires_in: 3600 } });
    axiosMock.get.mockRejectedValue({ isAxiosError: true, code: 'ECONNABORTED', response: { status: 504 } });

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('');

    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[EU-CATCH-CRM][GET-OPERATOR-ID][ERROR][CATEGORY][HTTP][CODE][ECONNABORTED][STATUS][504]'
    );
  });

  it('logs UNKNOWN code and N/A status for axios-like errors without code or status', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut();

    axiosMock.post.mockResolvedValue({ data: { access_token: 'token-123', expires_in: 3600 } });
    axiosMock.get.mockRejectedValue({ isAxiosError: true });

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('');

    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[EU-CATCH-CRM][GET-OPERATOR-ID][ERROR][CATEGORY][HTTP][CODE][UNKNOWN][STATUS][N/A]'
    );
  });

  it('uses validateStatus that always returns true for representative statuses', async () => {
    const { sut, axiosMock } = await loadSut();

    axiosMock.post.mockResolvedValue({ data: { access_token: 'token-123', expires_in: 3600 } });
    axiosMock.get.mockResolvedValue({ status: 200, data: { status: 'Succeeded', euCatchOperatorId: 'operator-abc' } });

    await sut.getEuCatchOperatorId(accountId);

    const [, options] = axiosMock.get.mock.calls[0];
    expect(options.validateStatus).toEqual(expect.any(Function));
    expect(options.validateStatus(200)).toBe(true);
    expect(options.validateStatus(404)).toBe(true);
    expect(options.validateStatus(500)).toBe(true);
  });

  it('does not log secret, token, or account id', async () => {
    const sensitiveAccountId = 'sensitive-account-id';
    const sensitiveToken = 'sensitive-token-value';
    const sensitiveSecret = 'sensitive-client-secret';

    const { sut, axiosMock, loggerMock } = await loadSut();

    axiosMock.post.mockResolvedValue({ data: { access_token: sensitiveToken, expires_in: 3600 } });
    axiosMock.get.mockResolvedValue({ status: 500, data: {} });

    await sut.getEuCatchOperatorId(sensitiveAccountId);

    const allLogLines = [
      ...loggerMock.info.mock.calls.flat(),
      ...loggerMock.warn.mock.calls.flat(),
      ...loggerMock.error.mock.calls.flat()
    ].map((value: unknown) => String(value)).join(' ');

    expect(allLogLines).not.toContain(sensitiveAccountId);
    expect(allLogLines).not.toContain(sensitiveToken);
    expect(allLogLines).not.toContain(sensitiveSecret);
  });

  it('returns operator id on successful response and does not leak sensitive response payload in logs', async () => {
    const sensitiveAccountId = 'sensitive-account-id';
    const sensitiveOperatorId = 'sensitive-operator-id';
    const sensitiveToken = 'sensitive-token-value';
    const sensitiveSecret = 'sensitive-client-secret';
    const sensitiveBodyField = 'sensitive-body-value';
    const sensitiveMessage = 'sensitive-response-message';

    const { sut, axiosMock, loggerMock } = await loadSut();

    axiosMock.post.mockResolvedValue({ data: { access_token: sensitiveToken, expires_in: 3600 } });
    axiosMock.get.mockResolvedValue({
      status: 200,
      data: {
        status: 'Succeeded',
        euCatchOperatorId: sensitiveOperatorId,
        accountId: sensitiveAccountId,
        message: sensitiveMessage,
        arbitrarySensitiveField: sensitiveBodyField
      }
    });

    await expect(sut.getEuCatchOperatorId(sensitiveAccountId)).resolves.toBe(sensitiveOperatorId);

    const allLogLines = [
      ...loggerMock.info.mock.calls.flat(),
      ...loggerMock.warn.mock.calls.flat(),
      ...loggerMock.error.mock.calls.flat()
    ].map((value: unknown) => String(value)).join(' ');

    expect(allLogLines).not.toContain(sensitiveAccountId);
    expect(allLogLines).not.toContain(sensitiveOperatorId);
    expect(allLogLines).not.toContain(sensitiveToken);
    expect(allLogLines).not.toContain(sensitiveSecret);
    expect(allLogLines).not.toContain(sensitiveBodyField);
    expect(allLogLines).not.toContain(sensitiveMessage);
    expect(allLogLines).not.toContain('arbitrarySensitiveField');
    expect(allLogLines).not.toContain('euCatchOperatorId');
    expect(allLogLines).not.toContain('accountId');
    expect(allLogLines).not.toContain('RESPONSE');
  });

  it('returns empty string when successful response has empty euCatchOperatorId', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut();

    axiosMock.post.mockResolvedValue({ data: { access_token: 'token-123', expires_in: 3600 } });
    axiosMock.get.mockResolvedValue({
      status: 200,
      data: {
        status: 'Succeeded',
        euCatchOperatorId: ''
      }
    });

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('');
    expect(loggerMock.warn).toHaveBeenCalledWith('[EU-CATCH-CRM][GET-OPERATOR-ID][MALFORMED-200-PAYLOAD]');
  });

  it('prefers euCatchOperatorId when both euCatchOperatorId and obsolete id are present', async () => {
    const { sut, axiosMock } = await loadSut();

    axiosMock.post.mockResolvedValue({ data: { access_token: 'token-123', expires_in: 3600 } });
    axiosMock.get.mockResolvedValue({
      status: 200,
      data: {
        status: 'Succeeded',
        euCatchOperatorId: 'operator-eu-catch',
        id: 'operator-obsolete'
      }
    });

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('operator-eu-catch');
  });

  it('returns empty string when only obsolete id is present in successful response', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut();

    axiosMock.post.mockResolvedValue({ data: { access_token: 'token-123', expires_in: 3600 } });
    axiosMock.get.mockResolvedValue({
      status: 200,
      data: {
        status: 'Succeeded',
        id: 'operator-obsolete'
      }
    });

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('');
    expect(loggerMock.warn).toHaveBeenCalledWith('[EU-CATCH-CRM][GET-OPERATOR-ID][MALFORMED-200-PAYLOAD]');
  });
});

describe('updateEuCatchOperatorId', () => {
  const accountId = 'account-123';
  const euCatchOperatorId = 'operator-456';
  const clientId = 'd365-client-id';
  const clientSecret = 'd365-client-secret';
  const scope = 'd365-scope';
  const defaultTokenUrl = 'https://login.example/token';
  const defaultCrmUrl = 'https://crm.example/operator';
  const defaultSendUrl = 'https://crm.example/operator/update';
  const apiVersion = 'v9.2';

  const loadSut = async (overrides?: {
    tokenUrl?: string;
    crmUrl?: string;
    sendUrl?: string;
    crmTimeoutMs?: number;
    inDev?: boolean;
    enableCrmOperatorActivityId?: boolean;
  }) => {
    jest.resetModules();

    jest.doMock('../../src/data/cache', () => ({
      getCountries: jest.fn(() => [])
    }));

    jest.doMock('../../src/controllers/species', () => ({
      getCommodities: jest.fn(() => [])
    }));

    const post = jest.fn();
    const get = jest.fn();
    jest.doMock('axios', () => ({
      __esModule: true,
      default: { post, get }
    }));

    const info = jest.fn();
    const warn = jest.fn();
    const error = jest.fn();
    jest.doMock('../../src/logger', () => ({
      __esModule: true,
      default: { info, warn, error }
    }));

    jest.doMock('../../src/config', () => ({
      __esModule: true,
      default: {
        inDev: overrides?.inDev ?? false,
        dynamics365CrmUrl: overrides?.crmUrl || defaultCrmUrl,
        dynamics365CrmSendUrl: overrides?.sendUrl || defaultSendUrl,
        dynamics365CrmApiVersion: apiVersion,
        dynamics365CrmTimeoutMs: overrides?.crmTimeoutMs || 10000,
        dynamics365CrmOauthClientId: clientId,
        dynamics365CrmOauthClientSecret: clientSecret,
        dynamics365CrmOauthScope: scope,
        dynamics365CrmOauthTokenUrl: overrides?.tokenUrl || defaultTokenUrl,
        enableCrmOperatorActivityId: overrides?.enableCrmOperatorActivityId ?? true
      }
    }));

    const sut = await import('../../src/data/euCatch');
    const axiosMock = (await import('axios')).default as unknown as {
      post: jest.Mock;
      get: jest.Mock;
    };
    const loggerMock = (await import('../../src/logger')).default as unknown as {
      info: jest.Mock;
      warn: jest.Mock;
      error: jest.Mock;
    };

    return {
      sut,
      axiosMock,
      loggerMock
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns true when CRM send returns 200 Updated', async () => {
    const { sut, axiosMock } = await loadSut();

    axiosMock.post
      .mockResolvedValueOnce({ data: { access_token: 'token-123', expires_in: 3600 } })
      .mockResolvedValueOnce({ status: 200, data: { status: 'Updated' } });

    const result = await sut.updateEuCatchOperatorId(accountId, euCatchOperatorId);

    expect(result).toBe(true);
    expect(axiosMock.post).toHaveBeenCalledTimes(2);
    expect(axiosMock.post).toHaveBeenNthCalledWith(
      2,
      defaultSendUrl,
      {
        accountId,
        euCatchOperatorId
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json'
        }),
        timeout: 10000,
        validateStatus: expect.any(Function)
      })
    );
  });

  it('returns false and performs no token or CRM calls when feature flag is disabled', async () => {
    const { sut, axiosMock } = await loadSut({ enableCrmOperatorActivityId: false });

    await expect(sut.updateEuCatchOperatorId(accountId, euCatchOperatorId)).resolves.toBe(false);
    expect(axiosMock.post).not.toHaveBeenCalled();
    expect(axiosMock.get).not.toHaveBeenCalled();
  });

  it('returns false when CRM send returns 500 Failed', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut();

    axiosMock.post
      .mockResolvedValueOnce({ data: { access_token: 'token-123', expires_in: 3600 } })
      .mockResolvedValueOnce({ status: 500, data: { status: 'Failed', message: 'Unexpected error on updating organisation' } });

    await expect(sut.updateEuCatchOperatorId(accountId, euCatchOperatorId)).resolves.toBe(false);
    expect(loggerMock.warn).toHaveBeenCalledWith('[EU-CATCH-CRM][UPDATE-OPERATOR][FAILED-STATUS]');
    expect(axiosMock.post).toHaveBeenCalledTimes(2);
  });

  it('returns false for other non-200 statuses', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut();

    axiosMock.post
      .mockResolvedValueOnce({ data: { access_token: 'token-123', expires_in: 3600 } })
      .mockResolvedValueOnce({ status: 429, data: { status: 'Failed' } });

    await expect(sut.updateEuCatchOperatorId(accountId, euCatchOperatorId)).resolves.toBe(false);
    expect(loggerMock.warn).toHaveBeenCalledWith('[EU-CATCH-CRM][UPDATE-OPERATOR][NON-200][STATUS][429]');
  });

  it('returns false for malformed 200 payload', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut();

    axiosMock.post
      .mockResolvedValueOnce({ data: { access_token: 'token-123', expires_in: 3600 } })
      .mockResolvedValueOnce({ status: 200, data: { status: 'Succeeded' } });

    await expect(sut.updateEuCatchOperatorId(accountId, euCatchOperatorId)).resolves.toBe(false);
    expect(loggerMock.warn).toHaveBeenCalledWith('[EU-CATCH-CRM][UPDATE-OPERATOR][MALFORMED-200-PAYLOAD]');
  });

  it('returns false on send network error and attempts send exactly once', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut();

    axiosMock.post
      .mockResolvedValueOnce({ data: { access_token: 'token-123', expires_in: 3600 } })
      .mockRejectedValueOnce(new Error('network down'));

    await expect(sut.updateEuCatchOperatorId(accountId, euCatchOperatorId)).resolves.toBe(false);
    expect(axiosMock.post).toHaveBeenCalledTimes(2);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[EU-CATCH-CRM][UPDATE-OPERATOR][ERROR][CATEGORY][GENERAL][CODE][N/A][STATUS][N/A]'
    );
  });

  it('returns false when token request fails and does not call send URL', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut();

    axiosMock.post.mockRejectedValueOnce(new Error('token failed'));

    await expect(sut.updateEuCatchOperatorId(accountId, euCatchOperatorId)).resolves.toBe(false);
    expect(axiosMock.post).toHaveBeenCalledTimes(1);
    expect(axiosMock.post).toHaveBeenCalledWith(
      defaultTokenUrl,
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded'
        })
      })
    );
    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[EU-CATCH-CRM][UPDATE-OPERATOR][ERROR][CATEGORY][GENERAL][CODE][N/A][STATUS][N/A]'
    );
  });

  it('returns false for non-HTTPS send URL and makes no request', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut({ sendUrl: 'http://crm.example/operator/update' });

    await expect(sut.updateEuCatchOperatorId(accountId, euCatchOperatorId)).resolves.toBe(false);
    expect(axiosMock.post).not.toHaveBeenCalled();
    expect(loggerMock.warn).toHaveBeenCalledWith('[EU-CATCH-CRM][UPDATE-OPERATOR][INVALID-CONFIG][CRM-SEND-URL-NON-HTTPS]');
  });

  it('in dev mode, proceeds with HTTP send URL', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut({
      inDev: true,
      sendUrl: 'http://crm.example/operator/update'
    });

    axiosMock.post
      .mockResolvedValueOnce({ data: { access_token: 'token-123', expires_in: 3600 } })
      .mockResolvedValueOnce({ status: 200, data: { status: 'Updated' } });

    await expect(sut.updateEuCatchOperatorId(accountId, euCatchOperatorId)).resolves.toBe(true);

    expect(axiosMock.post).toHaveBeenCalledTimes(2);
    expect(loggerMock.warn).not.toHaveBeenCalledWith('[EU-CATCH-CRM][UPDATE-OPERATOR][INVALID-CONFIG][CRM-SEND-URL-NON-HTTPS]');
  });

  it('in dev mode, malformed send URL bypasses guard and request path handles failure', async () => {
    const { sut, axiosMock, loggerMock } = await loadSut({
      inDev: true,
      sendUrl: 'not-a-valid-send-url'
    });

    axiosMock.post
      .mockResolvedValueOnce({ data: { access_token: 'token-123', expires_in: 3600 } })
      .mockRejectedValueOnce(new Error('network down'));

    await expect(sut.updateEuCatchOperatorId(accountId, euCatchOperatorId)).resolves.toBe(false);

    expect(axiosMock.post).toHaveBeenCalledTimes(2);
    expect(loggerMock.warn).not.toHaveBeenCalledWith('[EU-CATCH-CRM][UPDATE-OPERATOR][INVALID-CONFIG][CRM-SEND-URL-NON-HTTPS]');
    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[EU-CATCH-CRM][UPDATE-OPERATOR][ERROR][CATEGORY][GENERAL][CODE][N/A][STATUS][N/A]'
    );
  });

  it('reuses cached token between get and update calls', async () => {
    const { sut, axiosMock } = await loadSut();

    axiosMock.post
      .mockResolvedValueOnce({ data: { access_token: 'shared-token', expires_in: 3600 } })
      .mockResolvedValueOnce({ status: 200, data: { status: 'Updated' } });

    axiosMock.get.mockResolvedValue({ status: 200, data: { status: 'Succeeded', euCatchOperatorId: 'operator-abc' } });

    await expect(sut.getEuCatchOperatorId(accountId)).resolves.toBe('operator-abc');
    await expect(sut.updateEuCatchOperatorId(accountId, euCatchOperatorId)).resolves.toBe(true);

    expect(axiosMock.post).toHaveBeenCalledTimes(2);
  });

  it('uses validateStatus that always returns true on update send call', async () => {
    const { sut, axiosMock } = await loadSut();

    axiosMock.post
      .mockResolvedValueOnce({ data: { access_token: 'token-123', expires_in: 3600 } })
      .mockResolvedValueOnce({ status: 200, data: { status: 'Updated' } });

    await sut.updateEuCatchOperatorId(accountId, euCatchOperatorId);

    const [, , options] = axiosMock.post.mock.calls[1];
    expect(options.validateStatus).toEqual(expect.any(Function));
    expect(options.validateStatus(200)).toBe(true);
    expect(options.validateStatus(404)).toBe(true);
    expect(options.validateStatus(500)).toBe(true);
  });

  it('uses configured timeout for both token POST and CRM update POST calls', async () => {
    const configuredTimeoutMs = 45678;
    const { sut, axiosMock } = await loadSut({ crmTimeoutMs: configuredTimeoutMs });

    axiosMock.post
      .mockResolvedValueOnce({ data: { access_token: 'token-123', expires_in: 3600 } })
      .mockResolvedValueOnce({ status: 200, data: { status: 'Updated' } });

    await sut.updateEuCatchOperatorId(accountId, euCatchOperatorId);

    expect(axiosMock.post).toHaveBeenNthCalledWith(
      1,
      defaultTokenUrl,
      expect.any(String),
      expect.objectContaining({ timeout: configuredTimeoutMs })
    );
    expect(axiosMock.post).toHaveBeenNthCalledWith(
      2,
      defaultSendUrl,
      expect.objectContaining({
        accountId,
        euCatchOperatorId
      }),
      expect.objectContaining({ timeout: configuredTimeoutMs })
    );
  });

  it('does not leak sensitive account, operator, token or secret in logs', async () => {
    const sensitiveAccountId = 'sensitive-account-id';
    const sensitiveOperatorId = 'sensitive-operator-id';
    const sensitiveToken = 'sensitive-token-value';
    const sensitiveSecret = 'sensitive-client-secret';

    const { sut, axiosMock, loggerMock } = await loadSut();

    axiosMock.post
      .mockResolvedValueOnce({ data: { access_token: sensitiveToken, expires_in: 3600 } })
      .mockResolvedValueOnce({ status: 500, data: { status: 'Failed', message: 'Unexpected error on updating organisation' } });

    await sut.updateEuCatchOperatorId(sensitiveAccountId, sensitiveOperatorId);

    const allLogLines = [
      ...loggerMock.info.mock.calls.flat(),
      ...loggerMock.warn.mock.calls.flat(),
      ...loggerMock.error.mock.calls.flat()
    ].map((value: unknown) => String(value)).join(' ');

    expect(allLogLines).not.toContain(sensitiveAccountId);
    expect(allLogLines).not.toContain(sensitiveOperatorId);
    expect(allLogLines).not.toContain(sensitiveToken);
    expect(allLogLines).not.toContain(sensitiveSecret);
  });
});
