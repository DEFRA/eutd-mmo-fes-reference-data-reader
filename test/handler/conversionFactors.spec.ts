import * as conversionFactorService from '../../src/landings/persistence/conversionFactors';
import logger from '../../src/logger';
import { conversionFactorRoutes } from '../../src/handler/conversionFactors';
import * as Hapi from '@hapi/hapi';

let server;

beforeAll(async () => {
  server = Hapi.server({
    port: 9010,
    host: 'localhost'
  });

  conversionFactorRoutes(server);

  await server.initialize();
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

describe('When retrieving conversion factors from mongo', () => {
    let getConversionFactorsStub: jest.SpyInstance;
    let mockLoggerInfo: jest.SpyInstance;
    let mockLoggerError: jest.SpyInstance;

    beforeEach(() => {
        getConversionFactorsStub = jest.spyOn(conversionFactorService, 'getConversionFactors');
        mockLoggerInfo = jest.spyOn(logger, 'info');
        mockLoggerError = jest.spyOn(logger, 'error');
    });

    afterEach(() => {
        getConversionFactorsStub.mockRestore();
        mockLoggerInfo.mockRestore();
        mockLoggerError.mockRestore();
    });

    it('will a 200 OK all factors are found', async () => {
        const conversionFactorData: number[] = [1.39, 1];
        const testQueryData: any[] = [
            {
                presentation: "WHL",
                species: "MAS",
                state: "FRO"
            },
            {
                presentation: "GUT",
                species: "BSF",
                state: "FRO"
            }
        ];

        getConversionFactorsStub.mockReturnValueOnce(conversionFactorData);

        const request = {
            method: 'GET',
            url: '/v1/factors?products[0][presentation]=WHL&products[0][species]=MAS&products[0][state]=FRO&products[1][presentation]=GUT&products[1][species]=BSF&products[1][state]=FRO'
        };

        const response = await server.inject(request);
        const payload = JSON.parse(response.payload);

        expect(getConversionFactorsStub).toHaveBeenNthCalledWith(1, testQueryData);
        expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, '[GET-CONVERSION-FACTORS][2 CONVERSION FACTORS FOUND][SUCCESS]');
        expect(response.statusCode).toBe(200);
        expect(payload.length).toEqual(2);
    });

    it('will return a 200 OK if only some factors are found', async () => {
        const conversionFactorData: number[] = [1.39];
        const testQueryData: any[] = [
            {
                presentation: "WHL",
                species: "MAS",
                state: "FRO"
            },
            {
                presentation: "GUT",
                species: "BSF",
                state: "FRA"
            }
        ];

        getConversionFactorsStub.mockReturnValueOnce(conversionFactorData);

        const request = {
            method: 'GET',
            url: '/v1/factors?products[0][presentation]=WHL&products[0][species]=MAS&products[0][state]=FRO&products[1][presentation]=GUT&products[1][species]=BSF&products[1][state]=FRA'
        };

        const response = await server.inject(request);
        const payload = JSON.parse(response.payload);

        expect(getConversionFactorsStub).toHaveBeenNthCalledWith(1, testQueryData);
        expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, '[GET-CONVERSION-FACTORS][1 CONVERSION FACTORS FOUND][SUCCESS]');
        expect(response.statusCode).toBe(200);
        expect(payload.length).toEqual(1);
    });

    it('will return a 200 OK if no factors are found', async () => {
        getConversionFactorsStub.mockReturnValueOnce([]);

        const queryData: any[] = [{
            presentation: "WHL",
            species: "MAS",
            state: "FRA"
        }];

        const request = {
            method: 'GET',
            url: '/v1/factors?products[0][presentation]=WHL&products[0][species]=MAS&products[0][state]=FRA'
        };

        const response = await server.inject(request);
        const payload = JSON.parse(response.payload);

        expect(getConversionFactorsStub).toHaveBeenNthCalledWith(1, queryData);
        expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, '[GET-CONVERSION-FACTORS][0 CONVERSION FACTORS FOUND][SUCCESS]');
        expect(response.statusCode).toBe(200);
        expect(payload).toEqual([]);
    });

    it('will return a 500 error if any errors are thrown', async () => {
        getConversionFactorsStub.mockImplementationOnce(() => {
          throw 'Error';
        })

        const testQueryData: any[] = [{
            presentation: "WHL",
            species: "MAS",
            state: "FRA"
        }];

        const request = {
            method: 'GET',
            url: '/v1/factors?products[0][presentation]=WHL&products[0][species]=MAS&products[0][state]=FRA'
        };

        const response = await server.inject(request);
        const payload = response.payload;

        expect(getConversionFactorsStub).toHaveBeenNthCalledWith(1, testQueryData);
        expect(mockLoggerError).toHaveBeenNthCalledWith(1, '[GET-CONVERSION-FACTORS][ERROR] Error');
        expect(response.statusCode).toBe(500);
        expect(payload).toEqual("");
    });
});