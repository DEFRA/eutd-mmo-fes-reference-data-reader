import { ApplicationConfig } from '../src/config';

describe('ApplicationConfig.loadEnv', () => {
  const baseEnv = {
    DYNAMICS_365_CRM_API_VERSION: 'v9.2',
    DYNAMICS_365_CRM_OAUTH_CLIENT_ID: 'client-id',
    DYNAMICS_365_CRM_OAUTH_CLIENT_SECRET: 'client-secret',
    DYNAMICS_365_CRM_OAUTH_SCOPE: 'scope',
    DYNAMICS_365_CRM_OAUTH_TOKEN_URL: 'https://login.example/token',
    DYNAMICS_365_CRM_SEND_URL: 'https://crm.example/send',
    DYNAMICS_365_CRM_URL: 'https://crm.example/get'
  };

  it('uses configured DYNAMICS_365_CRM_TIMEOUT_MS when valid and positive', () => {
    ApplicationConfig.loadEnv({
      ...baseEnv,
      DYNAMICS_365_CRM_TIMEOUT_MS: '15000'
    });

    expect(ApplicationConfig.prototype.dynamics365CrmTimeoutMs).toBe(15000);
  });

  it('defaults DYNAMICS_365_CRM_TIMEOUT_MS to 10000 when unset', () => {
    ApplicationConfig.loadEnv(baseEnv);

    expect(ApplicationConfig.prototype.dynamics365CrmTimeoutMs).toBe(10000);
  });

  it('defaults DYNAMICS_365_CRM_TIMEOUT_MS to 10000 when invalid or non-positive', () => {
    ApplicationConfig.loadEnv({
      ...baseEnv,
      DYNAMICS_365_CRM_TIMEOUT_MS: 'not-a-number'
    });
    expect(ApplicationConfig.prototype.dynamics365CrmTimeoutMs).toBe(10000);

    ApplicationConfig.loadEnv({
      ...baseEnv,
      DYNAMICS_365_CRM_TIMEOUT_MS: '0'
    });
    expect(ApplicationConfig.prototype.dynamics365CrmTimeoutMs).toBe(10000);

    ApplicationConfig.loadEnv({
      ...baseEnv,
      DYNAMICS_365_CRM_TIMEOUT_MS: '-250'
    });
    expect(ApplicationConfig.prototype.dynamics365CrmTimeoutMs).toBe(10000);
  });
});
