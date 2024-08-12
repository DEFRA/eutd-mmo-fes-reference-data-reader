import logger from '../logger';
import axios, { AxiosResponse } from 'axios';
import querystring from "querystring";
import appConfig from '../config';
import { IOAuthResponse } from '../data/countries-api';

export type IAuthRequest = {
  client_id: string,
  client_secret: string,
  scope: string,
  grant_type: string
}

export interface IAuthResponse {
  token_type: string,
  expires_in: number,
  ext_expires_in: number,
  access_token: string
}

export interface IAvConfig {
  baseUrl : string,
  avUri : string,
  tokenType : string,
  accessToken : string,
  apimHeaderName : string;
  apimHeaderValue : string;
}

export interface ITradeServiceAuth {
  tokenType : string,
  accessToken : string,
  apimHeaderName : string,
  apimHeaderValue : string
}


export const getTradeServiceAuth = async (): Promise<ITradeServiceAuth> => {

  const clientId = appConfig.defraTradeApiOauthClientId;
  const clientSecret = appConfig.defraTradeApiOauthClientSecret;
  const scope = appConfig.defraTradeApiOauthScope;
  const tokenUrl = appConfig.defraTradeApiOauthTokenUrl;
  const apimHeaderName = appConfig.defraTradeApiAPIMHeaderName;
  const apimHeaderValue = appConfig.defraTradeApiAPIMHeaderValue

  logger.info('[TRADE-API][REQUESTING-OAUTH-TOKEN]');

  const tokenRequest: IAuthRequest = {
    client_id: clientId,
    client_secret: clientSecret,
    scope: scope,
    grant_type: 'client_credentials'
  };

  const tokenResponse: AxiosResponse<IOAuthResponse> = await axios.post<IAuthResponse>(
    tokenUrl,
    querystring.stringify(tokenRequest),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  ).catch(e => {
    logger.error(`[TRADE-API][ERROR][UNABLE-TO-GET-OAUTH-TOKEN][${e.stack || e}]`);
    throw e;
  });

  return {
    accessToken : tokenResponse.data.access_token,
    tokenType : tokenResponse.data.token_type,
    apimHeaderName : apimHeaderName,
    apimHeaderValue : apimHeaderValue
  };
};

export const getAvServiceConf = async (): Promise<IAvConfig> => {
  const serviceAuth : ITradeServiceAuth = await getTradeServiceAuth();
  return {
    avUri : '/trade-file-store/v1/syncAv/',
    baseUrl : appConfig.avBaseUrl,
    tokenType : serviceAuth.tokenType,
    accessToken : serviceAuth.accessToken,
    apimHeaderName : serviceAuth.apimHeaderName,
    apimHeaderValue : serviceAuth.apimHeaderValue
  };

};