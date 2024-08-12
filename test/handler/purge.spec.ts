import * as Hapi from '@hapi/hapi';
import logger from '../../src/logger';
import * as Cache from '../../src/data/cache';

describe('POST /v1/jobs/purge', () => {
  let server: Hapi.Server<Hapi.ServerApplicationState>;
  let mockLoadFishCountriesAndSpecies: jest.SpyInstance;
  let mockLoadExporterBehaviour: jest.SpyInstance;
  let mockLoggerInfo: jest.SpyInstance;
  let mockLoggerError: jest.SpyInstance;

  beforeAll(async () => {

    const { purgeRoutes } = require('../../src/handler/purge');

    server = Hapi.server({
      port: 9018,
      host: 'localhost',
    });

    purgeRoutes(server);

    await server.initialize();
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    mockLoadFishCountriesAndSpecies = jest.spyOn(Cache, 'loadFishCountriesAndSpecies');
    mockLoadFishCountriesAndSpecies.mockResolvedValue(undefined);

    mockLoadExporterBehaviour = jest.spyOn(Cache, 'loadExporterBehaviour');
    mockLoadExporterBehaviour.mockResolvedValue(undefined);

    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    mockLoadFishCountriesAndSpecies.mockRestore();
    mockLoadExporterBehaviour.mockRestore();
    mockLoggerInfo.mockRestore();
    mockLoggerError.mockRestore();
  });

  it('will always return a status of 200 to acknowledge the request', async () => {
    const req = {
      method: 'POST',
      url: '/v1/jobs/purge',
    };

    const response = await server.inject(req);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[LOAD-FISH-COUNTRIES-SPECIES][POST][START]');
    expect(mockLoadFishCountriesAndSpecies).toHaveBeenCalled()
    expect(mockLoggerInfo).toHaveBeenCalledWith('[LOAD-FISH-COUNTRIES-SPECIES][POST][SUCCESS]');
    expect(response.statusCode).toBe(200);
  });

  it('will return a status of 500 if something goes wrong when trying to load data', async () => {
    mockLoadFishCountriesAndSpecies.mockRejectedValue(new Error('something has gone wrong'));

    const req = {
      method: 'POST',
      url: '/v1/jobs/purge',
    }

    const response = await server.inject(req);

    expect(mockLoggerError).toHaveBeenCalled();

    expect(response.statusCode).toBe(500);
  });

});
