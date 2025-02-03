import axios from 'axios';
import logger from '../../src/logger';
import * as SUT from '../../src/data/countries-api';

describe('loadCountryData', () => {

  let mockAxiosPost;
  let mockAxiosGet;
  let mockLogInfo;
  let mockLogError;

  const mockOAuthResponse: SUT.IOAuthResponse = {
    token_type: 'Bearer',
    expires_in: 1234,
    ext_expires_in: 2345,
    access_token: 'access token 1234'
  };

  const mockGetCountriesResponse: SUT.ICountryPagedResult = {
    data: [
      { officialCountryName: 'Country 1' },
      { officialCountryName: 'Country 2' }
    ],
    records: 2,
    pageNumber: 1,
    pageSize: 1000,
    totalRecords: 2,
    totalPages: 1
  };

  beforeEach(() => {
    
    mockAxiosPost = jest.spyOn(axios, 'post');
    mockAxiosPost.mockResolvedValue({
      status: 200,
      data: mockOAuthResponse
    });

    mockAxiosGet = jest.spyOn(axios, 'get');
    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: mockGetCountriesResponse
    });

    mockLogInfo = jest.spyOn(logger, 'info');
    mockLogError = jest.spyOn(logger, 'error');
  });

  it('will attempt to generate an oauth bearer token', async () => {
    await SUT.loadCountryData();

    expect(mockAxiosPost).toHaveBeenCalled();
  });

  it('will log and return any errors from generating an oauth bearer token', async () => {
    const error = new Error('unauthorised');

    mockAxiosPost.mockRejectedValue(error);

    await expect(() => SUT.loadCountryData()).rejects.toBe(error);

    expect(mockLogError).toHaveBeenCalledWith(`[COUNTRIES-API][ERROR][UNABLE-TO-GET-OAUTH-TOKEN][${error.stack}]`);
  });


  it('will log and return any string errors from generating an oauth bearer token', async () => {
    const error = "unauthorised";

    mockAxiosPost.mockRejectedValue(error);

    await expect(() => SUT.loadCountryData()).rejects.toBe(error);

    expect(mockLogError).toHaveBeenCalledWith(`[COUNTRIES-API][ERROR][UNABLE-TO-GET-OAUTH-TOKEN][${error}]`);
  });

  it('will attempt to load countries', async () => {
    await SUT.loadCountryData();

    expect(mockAxiosGet).toHaveBeenCalled();
  });

  it('will log and return any errors from loading countries', async () => {
    const error = new Error('not found');

    mockAxiosGet.mockRejectedValue(error);

    await expect(() => SUT.loadCountryData()).rejects.toBe(error);

    expect(mockLogError).toHaveBeenCalledWith(`[COUNTRIES-API][ERROR][UNABLE-TO-LOAD-COUNTRIES][${error.stack}]`);
    expect(mockLogError).toHaveBeenCalledWith(`[COUNTRIES-API][ERROR][UNABLE-TO-LOAD-COUNTRIES][NO-RESPONSE]`);
  });

  it('will log and return any string errors from loading countries', async () => {
    const error = 'not found';

    mockAxiosGet.mockRejectedValue(error);

    await expect(() => SUT.loadCountryData()).rejects.toBe(error);

    expect(mockLogError).toHaveBeenCalledWith(`[COUNTRIES-API][ERROR][UNABLE-TO-LOAD-COUNTRIES][${error}]`);
    expect(mockLogError).toHaveBeenCalledWith(`[COUNTRIES-API][ERROR][UNABLE-TO-LOAD-COUNTRIES][NO-RESPONSE]`);
  });

  it('will log the error response if it exists', async () => {
    const error = {
      response: {
        status: 500,
        headers: {'x-test-header': 'test'},
        data: {
          error: 'something went wrong'
        }
      }
    };

    mockAxiosGet.mockRejectedValue(error);

    await expect(() => SUT.loadCountryData()).rejects.toBe(error);

    expect(mockLogError).toHaveBeenCalledWith(`[COUNTRIES-API][ERROR][UNABLE-TO-LOAD-COUNTRIES][${error}]`);
    expect(mockLogError).toHaveBeenCalledWith('[COUNTRIES-API][ERROR][UNABLE-TO-LOAD-COUNTRIES][RESPONSE][STATUS]', error.response.status);
    expect(mockLogError).toHaveBeenCalledWith('[COUNTRIES-API][ERROR][UNABLE-TO-LOAD-COUNTRIES][RESPONSE][HEADERS]', error.response.headers);
    expect(mockLogError).toHaveBeenCalledWith('[COUNTRIES-API][ERROR][UNABLE-TO-LOAD-COUNTRIES][RESPONSE][DATA]', error.response.data);
  });

  it('will return country data if everything works', async () => {
    const countries = await SUT.loadCountryData();

    expect(countries).toBe(mockGetCountriesResponse.data);
  });

  it('will add logs for each step of the process', async () => {
    await SUT.loadCountryData();

    expect(mockLogInfo).toHaveBeenCalledWith('[COUNTRIES-API][LOADING-COUNTRY-DATA]');
    expect(mockLogInfo).toHaveBeenCalled();
    expect(mockLogInfo).toHaveBeenCalledWith('[COUNTRIES-API][REQUESTING-OAUTH-TOKEN]');
    expect(mockLogInfo).toHaveBeenCalledWith('[COUNTRIES-API][LOADING-COUNTRIES]');
    expect(mockLogInfo).toHaveBeenCalledWith(
      `[COUNTRIES-API][COUNTRIES-LOADED]` +
      `[NUMBER-OF-COUNTRIES: ${mockGetCountriesResponse.data.length}]` +
      `[RECORDS: ${mockGetCountriesResponse.records}]` +
      `[TOTAL-RECORDS: ${mockGetCountriesResponse.totalRecords}]` +
      `[PAGE-SIZE: ${mockGetCountriesResponse.pageSize}]` +
      `[PAGE-NUMBER: ${mockGetCountriesResponse.pageNumber}]` +
      `[TOTAL-PAGES: ${mockGetCountriesResponse.totalPages}]`
    );
  });

});