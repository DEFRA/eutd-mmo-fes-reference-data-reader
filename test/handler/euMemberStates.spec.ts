import * as cache from '../../src/data/cache';
import * as Hapi from '@hapi/hapi';
import { euMemberStatesRoutes } from '../../src/handler/euMemberStates';

const moment = require('moment');
moment.suppressDeprecationWarnings = true;

const euMemberStatesMock = jest.spyOn(cache, 'getEuMemberStates');

let server;

beforeAll(async () => {
  server = Hapi.server({
    port: 9017,
    host: 'localhost',
  });

  euMemberStatesRoutes(server);

  await server.initialize();
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('When retrieving EU member states', () => {
  it('will return 200 if all goes OK', async () => {
    const mockData = [
      'Austria',
      'Belgium',
      'Bulgaria',
      'Croatia',
      'Cyprus',
      'Czech Republic',
      'Denmark',
      'Estonia',
      'Finland',
      'France',
      'Germany',
      'Greece',
      'Hungary',
      'Ireland',
      'Italy',
      'Latvia',
      'Lithuania',
      'Luxembourg',
      'Malta',
      'Netherlands',
      'Poland',
      'Portugal',
      'Romania',
      'Slovakia',
      'Slovenia',
      'Spain',
      'Sweden',
    ];
    euMemberStatesMock.mockReturnValue(mockData);

    const req = {
      method: 'GET',
      url: '/v1/eu-member-states',
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual(mockData);
  });

  it('will throw an internal server error when something unexpected happens', async () => {
    euMemberStatesMock.mockReset();
    euMemberStatesMock.mockImplementation(() => {
      throw new Error('something has gone wrong');
    });

    const req = {
      method: 'GET',
      url: '/v1/eu-member-states',
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(500);
  });
});
