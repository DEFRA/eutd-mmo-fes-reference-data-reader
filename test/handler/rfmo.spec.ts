import * as cache from '../../src/data/cache';
import * as Hapi from '@hapi/hapi';
import { rfmoRoutes } from '../../src/handler/rfmo';
import { mockRfmosData } from '../mockData';

const rfmosMock = jest.spyOn(cache, 'getRfmos');

let server;

beforeAll(async () => {
    server = Hapi.server({
        port: 9016,
        host: 'localhost',
    });

    rfmoRoutes(server);

    await server.initialize();
    await server.start();
});

afterAll(async () => {
    await server.stop();
});
beforeEach(() => {
    jest.clearAllMocks();
});

describe('When getting all rfmos', () => {
    it('will return 200 if all goes OK', async () => {
        const mockData = mockRfmosData;
        const mockResponse = [
            'Commission for the Conservation of Antarctic Marine Living Resources (CCAMLR)',
            'General Fisheries Commission for the Mediterranean (GFCM)',
            'North East Atlantic Fisheries Commission (NEAFC)',
            'Northwest Atlantic Fisheries Organization (NAFO)',
            'North Pacific Fisheries Commission (NPFC)',
            'South East Atlantic Fisheries Organisation (SEAFO)',
            'South Pacific Regional Fisheries Management Organisation (SPRFMO)',
            'Southern Indian Ocean Fisheries Agreement (SIOFA)',
            'Western and Central Pacific Fisheries Commission (WCPFC)',
            'Commission for the Conservation of Southern Bluefin Tuna (CCSBT)',
            'International Commission for the Conservation of Atlantic Tunas (ICCAT)',
            'Indian Ocean Tuna Commission (IOTC)',
            'Inter-American Tropical Tuna Commission (IATTC)',
            'North Atlantic Salmon Conservation Organization (NASCO)',
        ];
        rfmosMock.mockReturnValue(mockData);

        const req = {
            method: 'GET',
            url: '/v1/rfmo-areas',
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.payload)).toEqual(mockResponse);
    });

    it('will throw an internal server error when something unexpected happens', async () => {
        rfmosMock.mockReset();
        rfmosMock.mockImplementation(() => {
            throw new Error('something has gone wrong');
        });

        const req = {
            method: 'GET',
            url: '/v1/rfmo-areas',
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(500);
    });
});
