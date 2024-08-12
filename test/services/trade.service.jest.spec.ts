import axios from 'axios';
import logger from '../../src/logger';
import * as TS from '../../src/services/trade.service'
import querystring from "querystring";
import appConfig, { ApplicationConfig } from '../../src/config';


describe('trade service', () => {

  ApplicationConfig.loadEnv({});

  let mockAxiosPost;
  let mockLogInfo;
  let mockLogError;

  const mockOAuthResponse: TS.IAuthResponse = {
    token_type: 'Bearer',
    expires_in: 1234,
    ext_expires_in: 2345,
    access_token: 'access token 1234'
  };


  beforeEach(()=> {

    mockAxiosPost = jest.spyOn(axios, 'post');
    mockAxiosPost.mockResolvedValue({
      status: 200,
      data: mockOAuthResponse
    });

    mockLogInfo = jest.spyOn(logger, 'info');
    mockLogError = jest.spyOn(logger, 'error');
  });

  afterEach(()=>{
    jest.restoreAllMocks();
  });

  describe('get trade service auth', ()=> {

    it('should return valid trade service auth and log and info message', async () => {
      const expected : TS.ITradeServiceAuth = await TS.getTradeServiceAuth();

      expect(expected).toEqual({
        accessToken : 'access token 1234',
        tokenType : 'Bearer',
        apimHeaderName : ApplicationConfig.prototype.defraTradeApiAPIMHeaderName ,
        apimHeaderValue : ApplicationConfig.prototype.defraTradeApiAPIMHeaderValue
      });
      
      expect(mockLogInfo).toHaveBeenCalledWith(`[TRADE-API][REQUESTING-OAUTH-TOKEN]`);
    });

    it('will attempt to generate an oauth bearer token', async () => {
      await TS.getTradeServiceAuth();
  
      expect(mockAxiosPost).toHaveBeenCalledWith( 
        ApplicationConfig.prototype.defraTradeApiOauthTokenUrl,
        querystring.stringify({
          client_id: ApplicationConfig.prototype.defraTradeApiOauthClientId ,
          client_secret: ApplicationConfig.prototype.defraTradeApiOauthClientSecret ,
          scope: ApplicationConfig.prototype.defraTradeApiOauthScope ,
          grant_type: 'client_credentials'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }

      );
    });

    it('will log and return any errors from generating an oauth bearer token', async () => {
      const error = new Error('unauthorised');

      mockAxiosPost.mockRejectedValue(error);

      await expect(() => TS.getTradeServiceAuth()).rejects.toBe(error);

      expect(mockLogError).toHaveBeenCalledWith(`[TRADE-API][ERROR][UNABLE-TO-GET-OAUTH-TOKEN][${error.stack}]`);
    });
  });

  describe('get AV service conf', () =>{

    let mockGetTradeServiceAuth;
    let avBaseUrlOriginalValue;

    const mockTSAuth : TS.ITradeServiceAuth = {
      accessToken : 'anAccessToken',
      tokenType : 'ATokenType',
      apimHeaderName : 'anAPIMHeaderName',
      apimHeaderValue : 'anAPIHeaderValue'
    };

    beforeEach(() => {
      mockGetTradeServiceAuth = jest.spyOn(TS,'getTradeServiceAuth');
      mockGetTradeServiceAuth.mockResolvedValue(mockTSAuth);

      avBaseUrlOriginalValue = appConfig.avBaseUrl;
      appConfig.avBaseUrl = 'https://avApiBaseUlr'
    });

    afterEach(()=>{
      jest.restoreAllMocks();
      appConfig.avBaseUrl = avBaseUrlOriginalValue;
    });

    it('should return av service configuration', async () => {
      const expected : TS.IAvConfig = await TS.getAvServiceConf();

      expect(expected).toEqual({
        ...mockTSAuth,
        baseUrl : appConfig.avBaseUrl,
        avUri : '/trade-file-store/v1/syncAv/'
      })
    });

    it('should return a error if it fail',async () => {
      const error = new Error('trade service auth fail');

      mockGetTradeServiceAuth.mockRejectedValue(error);

      await expect(() => TS.getAvServiceConf()).rejects.toBe(error);

    });
  });
});