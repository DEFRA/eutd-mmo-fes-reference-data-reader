import axios, { AxiosResponse } from 'axios';
import querystring from 'querystring';
import config from "../config";
import logger from '../logger';
import { ICountry } from '../landings/types/appConfig/countries';
import { SSL_OP_LEGACY_SERVER_CONNECT } from "constants";

const https = require('https');

export type IOAuthRequest = {
  client_id: string,
  client_secret: string,
  scope: string,
  grant_type: string
}

export interface IOAuthResponse {
  token_type: string,
  expires_in: number,
  ext_expires_in: number,
  access_token: string
}

export interface ICountryPagedResult {
  data: ICountry[],
  records: number,
  pageNumber: number,
  pageSize: number,
  totalRecords: number,
  totalPages: number
}

export const loadCountryData = async () => {

  logger.info('[COUNTRIES-API][LOADING-COUNTRY-DATA]');

  const baseUrl = config.defraTradeApiBaseUrl;
  const getCountriesUri = config.defraTradeApiGetCountriesUri;
  const clientId = config.defraTradeApiOauthClientId;
  const clientSecret = config.defraTradeApiOauthClientSecret;
  const scope = config.defraTradeApiOauthScope;
  const tokenUrl = config.defraTradeApiOauthTokenUrl;
  const apimHeaderName = config.defraTradeApiAPIMHeaderName;
  const apimHeaderValue = config.defraTradeApiAPIMHeaderValue;

  logger.info(`[COUNTRIES-API][LOADED-CONFIG][BASE-URL: ${baseUrl}][GET-COUNTRIES-URI: ${getCountriesUri}]`);

  logger.info('[COUNTRIES-API][REQUESTING-OAUTH-TOKEN]');

  const tokenRequest: IOAuthRequest = {
    client_id: clientId,
    client_secret: clientSecret,
    scope: scope,
    grant_type: 'client_credentials'
  };

  const agent = new https.Agent({
    secureOptions: SSL_OP_LEGACY_SERVER_CONNECT
  });

  const tokenResponse: AxiosResponse<IOAuthResponse> = await axios.post<IOAuthResponse>(
    tokenUrl,
    querystring.stringify(tokenRequest),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      httpsAgent: agent
    }
  ).catch(e => {
    logger.error(`[COUNTRIES-API][ERROR][UNABLE-TO-GET-OAUTH-TOKEN][${e.stack || e}]`);
    throw e;
  });

  logger.info('[COUNTRIES-API][LOADING-COUNTRIES]');

  const res: AxiosResponse<ICountryPagedResult> = await axios.get<ICountryPagedResult>(
    `${baseUrl}${getCountriesUri}`,
    {
      headers: {
        Authorization: `${tokenResponse.data.token_type} ${tokenResponse.data.access_token}`,
        [apimHeaderName]: apimHeaderValue
      },
      httpsAgent: agent
    }
  ).catch(e => {
    logger.error(`[COUNTRIES-API][ERROR][UNABLE-TO-LOAD-COUNTRIES][${e.stack || e}]`);

    if (e.response) {
      logger.error('[COUNTRIES-API][ERROR][UNABLE-TO-LOAD-COUNTRIES][RESPONSE][STATUS]', e.response.status);
      logger.error('[COUNTRIES-API][ERROR][UNABLE-TO-LOAD-COUNTRIES][RESPONSE][HEADERS]', e.response.headers);
      logger.error('[COUNTRIES-API][ERROR][UNABLE-TO-LOAD-COUNTRIES][RESPONSE][DATA]', e.response.data);
    }
    else {
      logger.error('[COUNTRIES-API][ERROR][UNABLE-TO-LOAD-COUNTRIES][NO-RESPONSE]');
    }

    throw e;
  });

  const countries = res.data.data;

  logger.info(
    `[COUNTRIES-API][COUNTRIES-LOADED]` +
    `[NUMBER-OF-COUNTRIES: ${countries.length}]` +
    `[RECORDS: ${res.data.records}]` +
    `[TOTAL-RECORDS: ${res.data.totalRecords}]` +
    `[PAGE-SIZE: ${res.data.pageSize}]` +
    `[PAGE-NUMBER: ${res.data.pageNumber}]` +
    `[TOTAL-PAGES: ${res.data.totalPages}]`
  );

  return countries;

}