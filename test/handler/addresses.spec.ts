import { BoomiService } from 'mmo-shared-reference-data';
import { addressesRoutes } from '../../src/handler/addresses';
import * as Hapi from '@hapi/hapi';
import * as Joi from 'joi';

let server;
let mockGetAddresses: jest.SpyInstance;

beforeAll(async () => {
  server = Hapi.server({
    port: 9021,
    host: 'localhost'
  });

  addressesRoutes(server);
  server.validator(Joi);

  await server.initialize();
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

beforeEach(() => {
  mockGetAddresses = jest.spyOn(BoomiService, 'getAddresses');
});

afterEach(() => {
  mockGetAddresses.mockRestore();
});

describe('GET /v1/addresses/search', () => {

  it('returns address data for a valid postcode string', async () => {
    const addressData = [{ addressLine1: '1 Test Street', postcode: 'SW1A 1AA' }];
    mockGetAddresses.mockResolvedValueOnce(addressData);

    const response = await server.inject({
      method: 'GET',
      url: '/v1/addresses/search?postcode=SW1A+1AA'
    });

    expect(response.statusCode).toBe(200);
    expect(mockGetAddresses).toHaveBeenCalledWith('SW1A 1AA');
    expect(JSON.parse(response.payload)).toEqual(addressData);
  });

  it('calls BoomiService.getAddresses with the postcode as a string value', async () => {
    mockGetAddresses.mockResolvedValueOnce([]);

    await server.inject({
      method: 'GET',
      url: '/v1/addresses/search?postcode=EC1A+1BB'
    });

    expect(mockGetAddresses).toHaveBeenCalledWith('EC1A 1BB');
    expect(typeof mockGetAddresses.mock.calls[0][0]).toBe('string');
  });

  it('returns an empty array when BoomiService throws an error', async () => {
    mockGetAddresses.mockRejectedValueOnce(new Error('Service unavailable'));

    const response = await server.inject({
      method: 'GET',
      url: '/v1/addresses/search?postcode=SW1A+1AA'
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual([]);
  });

  it('returns 400 when postcode is missing', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/addresses/search'
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 when postcode format is invalid', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/addresses/search?postcode=TOOLONGPOSTCODE'
    });

    expect(response.statusCode).toBe(400);
  });

});
