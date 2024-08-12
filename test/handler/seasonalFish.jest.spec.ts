import * as cache from '../../src/data/cache';
import * as Hapi from '@hapi/hapi';
import { seasonalFishRoutes } from '../../src/handler/seasonalFish';

const moment = require('moment')
moment.suppressDeprecationWarnings = true

const sinon = require('sinon');

const seasonalFishMock = sinon.stub(cache, 'getSeasonalFish')

let server;

beforeAll(async () => {
  server = Hapi.server({
    port: 9016,
    host: 'localhost'
  });

  seasonalFishRoutes(server);

  await server.initialize();
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

describe('When retrieving seasonal fish', () => {

  it('will return 200 if all goes OK', async () => {
    seasonalFishMock.returns([])

    const req = {
        method: 'GET',
        url: '/v1/seasonalFish'
      };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);


  });

  it('will throw an internal server error when something unexpected happens', async () => {
    seasonalFishMock.reset()
    seasonalFishMock.throws()

    const req = {
      method: 'GET',
      url: '/v1/seasonalFish'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(500);


  })

})


