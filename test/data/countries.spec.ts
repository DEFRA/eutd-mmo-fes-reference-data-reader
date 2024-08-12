import * as CountriesApi from '../../src/data/countries-api';
import { getCountriesDataFromFile } from '../../src/data/local-file';
import * as Cache from '../../src/data/cache';
import { ICountry } from '../../src/landings/types/appConfig/countries';
import logger from '../../src/logger';

const sinon = require('sinon');
const path = `${__dirname}/../../data/countries.json`;
const expected: ICountry[] = [
  {
    officialCountryName: 'Spain',
    isoCodeAlpha2: 'ES',
    isoCodeAlpha3: 'ESP',
    isoNumericCode: '724',
  },
  {
    officialCountryName: 'Greece',
    isoCodeAlpha2: 'GR',
    isoCodeAlpha3: 'GRC',
    isoNumericCode: '300',
  },
  {
    officialCountryName: 'United Kingdom of Great Britain and Northern Ireland',
    isoCodeAlpha2: 'GB',
    isoCodeAlpha3: 'GBR',
    isoNumericCode: '826',
  },
  {
    officialCountryName: 'Brazil',
    isoCodeAlpha2: 'BR',
    isoCodeAlpha3: 'BRA',
    isoNumericCode: '076',
  }
];


describe('When getting countries data', () => {
    let mockLoggerInfo;
    let mockLoggerError;

    beforeEach(() => {
        mockLoggerInfo = sinon.spy(logger, 'info');
        mockLoggerError = sinon.spy(logger, 'error');
    });

    afterEach(() => {
        mockLoggerInfo.restore();
        mockLoggerError.restore();

        sinon.restore();
    });

    describe('When getting countries from a local file', () => {
      it('will return the data for export countries from file', () => {
            const countries = getCountriesDataFromFile(path);
            expect(countries.length).toBe(249);
      });

      it('will return an error if getCountriesFromLocalFile throws a parse error', () => {
          const fake = sinon.fake.throws('parse error');
          sinon.replace(JSON, 'parse', fake);

          expect(() => getCountriesDataFromFile(path)).toThrow('parse error');
          expect(mockLoggerError.getCall(0).args[0]).toEqual('Could not load countries data from file');
      });

      it('will return an error if getCountriesFromLocalFile throws a parse error', () => {
          expect(() => getCountriesDataFromFile('/incorrectFilename.json')).toThrow('Error: ENOENT: no such file or directory, open');
          expect(mockLoggerError.getCall(0).args[0]).toEqual('Could not load countries data from file');
      });

      it('will countries from loadCountriesDataFromLocalFile', () => {
          const countries = Cache.loadCountriesDataFromLocalFile();

          expect(countries.filter(country => country.officialCountryName === "Spain")[0]).toEqual(expected[0]);
          expect(countries.filter(country => country.officialCountryName === "Greece")[0]).toEqual(expected[1]);
          expect(countries.filter(country => country.officialCountryName === "United Kingdom of Great Britain and Northern Ireland")[0]).toEqual(expected[2]);
          expect(countries.filter(country => country.officialCountryName === "Brazil")[0]).toEqual(expected[3]);
      });
    });

    describe('When getting countries for prod', () => {

      let mockLoadCountriesApi;
      let mockLoggerError;

      beforeEach(() => {
        mockLoadCountriesApi = jest.spyOn(CountriesApi, 'loadCountryData');

        mockLoggerError = jest.spyOn(logger, 'error');
      });

      it('will return data from the countries api', async () => {
        const apiResponse = [ {officialCountryName: 'UK'} ];

        mockLoadCountriesApi.mockResolvedValue(apiResponse);

        const countries = await Cache.loadCountriesData();

        expect(countries).toStrictEqual(apiResponse);
      });

      it('will log an error if the countries api fails', async () => {
        const error = new Error('failure');

        mockLoadCountriesApi.mockRejectedValue(error);

        await Cache.loadCountriesData();

        expect(mockLoggerError).toHaveBeenCalledWith(`[LOAD-COUNTRIES-DATA][COUNTRIES-API][ERROR][${error.stack}]`);
      });

      it('will log an error if the countries api fails when error is string', async () => {

        mockLoadCountriesApi.mockRejectedValue('error');

        await Cache.loadCountriesData();

        expect(mockLoggerError).toHaveBeenCalledWith('[LOAD-COUNTRIES-DATA][COUNTRIES-API][ERROR][error]');
      });

      it('will return undefined if the api fails', async () => {
        const apiError = new Error('api failure');
        mockLoadCountriesApi.mockRejectedValue(apiError);
        const result = await Cache.loadCountriesData();
        expect(result).toBeUndefined();
      });

    });

});