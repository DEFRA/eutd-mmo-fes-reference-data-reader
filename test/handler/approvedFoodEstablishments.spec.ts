import * as cache from '../../src/data/cache';
import * as Hapi from '@hapi/hapi';
import { approvedFoodEstablishmentsRoutes } from '../../src/handler/approvedFoodEstablishments';

const moment = require('moment');
moment.suppressDeprecationWarnings = true;

const processingPlantsMock = jest.spyOn(cache, 'getProcessingPlants');
const storageFacilitiesMock = jest.spyOn(cache, 'getStorageFacilities');

let server;

beforeAll(async () => {
  server = Hapi.server({
    port: 9017,
    host: 'localhost',
  });

  approvedFoodEstablishmentsRoutes(server);

  await server.initialize();
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('When retrieving processing plants', () => {
  it('will return 200 if all goes OK', async () => {
    const mockData = [{ id: 'processing-1', tradingName: 'Plant 1' }];
    processingPlantsMock.mockReturnValue(mockData);

    const req = {
      method: 'GET',
      url: '/v1/processing-plants',
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual(mockData);
  });

  it('will throw an internal server error when something unexpected happens', async () => {
    processingPlantsMock.mockReset();
    processingPlantsMock.mockImplementation(() => {
      throw new Error('something has gone wrong');
    });

    const req = {
      method: 'GET',
      url: '/v1/processing-plants',
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(500);
  });
});

describe('When retrieving storage facilities', () => {
  it('will return 200 if all goes OK', async () => {
    const mockData = [{ id: 'storage-1', tradingName: 'Storage 1' }];
    storageFacilitiesMock.mockReturnValue(mockData);

    const req = {
      method: 'GET',
      url: '/v1/storage-facilities',
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual(mockData);
  });

  it('will throw an internal server error when something unexpected happens', async () => {
    storageFacilitiesMock.mockReset();
    storageFacilitiesMock.mockImplementation(() => {
      throw new Error('something has gone wrong');
    });

    const req = {
      method: 'GET',
      url: '/v1/storage-facilities',
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(500);
  });
});
