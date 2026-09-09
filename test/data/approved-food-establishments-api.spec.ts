import axios from 'axios';
import logger from '../../src/logger';
import * as SUT from '../../src/data/approved-food-establishments-api';

const tokenResponse = {
  token_type: 'Bearer',
  expires_in: 3600,
  ext_expires_in: 3600,
  access_token: 'token-123'
};

const makeEstablishment = (id: string) => ({
  id,
  tradingName: `Trading ${id}`,
  capabilities: ['processing']
});

describe('approved-food-establishments-api', () => {
  let mockAxiosPost;
  let mockAxiosGet;
  let mockLoggerInfo;
  let mockLoggerWarn;
  let mockLoggerError;

  beforeEach(() => {
    mockAxiosPost = jest.spyOn(axios, 'post');
    mockAxiosGet = jest.spyOn(axios, 'get');
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerWarn = jest.spyOn(logger, 'warn');
    mockLoggerError = jest.spyOn(logger, 'error');

    mockAxiosPost.mockResolvedValue({ status: 200, data: tokenResponse });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('fetches oauth token once and reuses it across both queries and multi-page requests', async () => {
    mockAxiosGet
      .mockResolvedValueOnce({
        status: 200,
        data: {
          content: [makeEstablishment('p1')],
          total: 2,
          limit: 500,
          offset: 0
        }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          content: [makeEstablishment('s1')],
          total: 1,
          limit: 500,
          offset: 0
        }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          content: [makeEstablishment('p2')],
          total: 2,
          limit: 500,
          offset: 500
        }
      });

    const result = await SUT.loadApprovedFoodEstablishments();
    const expectedAuthHeader = `${tokenResponse.token_type} ${tokenResponse.access_token}`;

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockAxiosGet).toHaveBeenCalledTimes(3);
    expect(result.processingPlants).toHaveLength(2);
    expect(result.storageFacilities).toHaveLength(1);

    for (const [, requestConfig] of mockAxiosGet.mock.calls) {
      expect(requestConfig.headers.Authorization).toBe(expectedAuthHeader);
    }
  });

  it('loads processing plants with pagination across multiple pages and partial last page', async () => {
    const token = tokenResponse;

    mockAxiosGet
      .mockResolvedValueOnce({
        status: 200,
        data: {
          content: [makeEstablishment('p1'), makeEstablishment('p2')],
          total: 3,
          limit: 500,
          offset: 0
        }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          content: [makeEstablishment('p3')],
          total: 3,
          limit: 500,
          offset: 500
        }
      });

    const result = await SUT.loadProcessingPlants(token);

    expect(result.map((x) => x.id)).toEqual(['p1', 'p2', 'p3']);
    expect(mockAxiosGet).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/establishments/search'),
      expect.objectContaining({
        params: expect.objectContaining({
          section: 'A.VIII',
          capability: 'processing',
          limit: 500,
          offset: 0
        })
      })
    );
    expect(mockAxiosGet).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/establishments/search'),
      expect.objectContaining({
        params: expect.objectContaining({
          section: 'A.VIII',
          capability: 'processing',
          limit: 500,
          offset: 500
        })
      })
    );
  });

  it('loads storage facilities with one page', async () => {
    const token = tokenResponse;

    mockAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: {
        content: [makeEstablishment('s1')],
        total: 1,
        limit: 500,
        offset: 0
      }
    });

    const result = await SUT.loadStorageFacilities(token);

    expect(result).toHaveLength(1);
    expect(mockAxiosGet).toHaveBeenCalledWith(
      expect.stringContaining('/establishments/search'),
      expect.objectContaining({
        params: expect.objectContaining({
          sectionActivity: 'A.0:CS',
          limit: 500,
          offset: 0
        })
      })
    );
  });

  it('breaks defensively when an empty page arrives before total is satisfied', async () => {
    const token = tokenResponse;

    mockAxiosGet
      .mockResolvedValueOnce({
        status: 200,
        data: {
          content: [makeEstablishment('p1')],
          total: 3,
          limit: 500,
          offset: 0
        }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          content: [],
          total: 3,
          limit: 500,
          offset: 500
        }
      });

    const result = await SUT.loadProcessingPlants(token);

    expect(result).toHaveLength(1);
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('[APPROVED-FOOD-ESTABLISHMENTS-API][WARN][EMPTY-PAGE][QUERY:PROCESSING-PLANTS]')
    );
  });

  it('logs and rethrows oauth token errors', async () => {
    const error = new Error('unauthorised');
    mockAxiosPost.mockRejectedValue(error);

    await expect(SUT.getApprovedFoodEstablishmentsToken()).rejects.toBe(error);
    expect(mockLoggerError).toHaveBeenCalledWith(
      `[APPROVED-FOOD-ESTABLISHMENTS-API][ERROR][UNABLE-TO-GET-OAUTH-TOKEN][${error.stack}]`
    );
  });

  it('logs load errors with no response and rethrows', async () => {
    const token = tokenResponse;
    const error = new Error('downstream failure');
    mockAxiosGet.mockRejectedValue(error);

    await expect(SUT.loadStorageFacilities(token)).rejects.toBe(error);
    expect(mockLoggerError).toHaveBeenCalledWith(
      `[APPROVED-FOOD-ESTABLISHMENTS-API][ERROR][UNABLE-TO-LOAD-STORAGE-FACILITIES][${error.stack}]`
    );
    expect(mockLoggerError).toHaveBeenCalledWith('[APPROVED-FOOD-ESTABLISHMENTS-API][ERROR][NO-RESPONSE]');
  });

  it('logs load errors with response details and rethrows', async () => {
    const token = tokenResponse;
    const error = {
      response: {
        status: 500,
        headers: { 'x-test-header': 'test' }
      }
    };

    mockAxiosGet.mockRejectedValue(error);

    await expect(SUT.loadStorageFacilities(token)).rejects.toBe(error);
    expect(mockLoggerError).toHaveBeenCalledWith(
      `[APPROVED-FOOD-ESTABLISHMENTS-API][ERROR][UNABLE-TO-LOAD-STORAGE-FACILITIES][${error}]`
    );
    expect(mockLoggerError).toHaveBeenCalledWith(
      '[APPROVED-FOOD-ESTABLISHMENTS-API][ERROR][RESPONSE][STATUS]',
      500
    );
    expect(mockLoggerError).toHaveBeenCalledWith(
      '[APPROVED-FOOD-ESTABLISHMENTS-API][ERROR][RESPONSE][HEADERS]',
      error.response.headers
    );
  });

  it('logs key info milestones', async () => {
    mockAxiosGet
      .mockResolvedValueOnce({
        status: 200,
        data: {
          content: [makeEstablishment('p1')],
          total: 1,
          limit: 500,
          offset: 0
        }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          content: [makeEstablishment('s1')],
          total: 1,
          limit: 500,
          offset: 0
        }
      });

    await SUT.loadApprovedFoodEstablishments();

    expect(mockLoggerInfo).toHaveBeenCalledWith(
      '[APPROVED-FOOD-ESTABLISHMENTS-API][LOADING-APPROVED-FOOD-ESTABLISHMENTS]'
    );
    expect(mockLoggerInfo).toHaveBeenCalledWith('[APPROVED-FOOD-ESTABLISHMENTS-API][REQUESTING-OAUTH-TOKEN]');
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      '[APPROVED-FOOD-ESTABLISHMENTS-API][PROCESSING-PLANTS-LOADED][NUMBER-OF-ESTABLISHMENTS: 1]'
    );
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      '[APPROVED-FOOD-ESTABLISHMENTS-API][STORAGE-FACILITIES-LOADED][NUMBER-OF-ESTABLISHMENTS: 1]'
    );
  });
});
