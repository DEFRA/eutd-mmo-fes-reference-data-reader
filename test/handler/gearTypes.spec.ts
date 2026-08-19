import * as cache from '../../src/data/cache';
import * as Hapi from '@hapi/hapi';
import { gearTypeRoutes } from '../../src/handler/gearTypes';
import { mockGearTypesData } from '../mockData';

const moment = require('moment');
moment.suppressDeprecationWarnings = true;
const gearCategory = 'Surrounding nets';

const gearTypesMock = jest.spyOn(cache, 'getGearTypes');

let server;

beforeAll(async () => {
  server = Hapi.server({
    port: 9016,
    host: 'localhost',
  });

  gearTypeRoutes(server);

  await server.initialize();
  await server.start();
});

afterAll(async () => {
  await server.stop();
});
beforeEach(() => {
  jest.clearAllMocks();
});

describe('When retrieving gear categories', () => {
  it('will return 200 if all goes OK', async () => {
    const mockData = mockGearTypesData;
    const mockResponse = [
      'Traps',
      'Trawls',
      'Dredges',
      'Hooks and lines',
      'Gillnets and entangling nets',
      'Miscellaneous gear',
      'Surrounding nets',
      'Seine nets',
      'Lift nets',
      'Falling gear',
    ];
    gearTypesMock.mockReturnValue(mockData);

    const req = {
      method: 'GET',
      url: '/v1/gear-categories',
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual(mockResponse);
  });

  it('will throw an internal server error when something unexpected happens', async () => {
    gearTypesMock.mockReset();
    gearTypesMock.mockImplementation(() => {
      throw new Error('something has gone wrong');
    });

    const req = {
      method: 'GET',
      url: '/v1/gear-categories',
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(500);
  });
});

describe('When retrieving gear types for a category', () => {
  it('will return 200 if all goes OK', async () => {
    const mockData = mockGearTypesData;
    const mockResponse = [
      {
        gearName: 'Purse seines',
        gearCode: 'PS',
      },
      {
        gearName: 'Surrounding nets without purse lines',
        gearCode: 'LA',
      },
      {
        gearName: 'Surrounding nets (nei)',
        gearCode: 'SUX',
      },
    ];
    gearTypesMock.mockReturnValue(mockData);

    const req = {
      method: 'GET',
      url: `/v1/gear-type/${gearCategory}`,
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual(mockResponse);
  });

  it('will throw an internal server error when something unexpected happens', async () => {
    gearTypesMock.mockReset();
    gearTypesMock.mockImplementation(() => {
      throw new Error('something has gone wrong');
    });

    const req = {
      method: 'GET',
      url: `/v1/gear-type/${gearCategory}`,
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(500);
  });
});
