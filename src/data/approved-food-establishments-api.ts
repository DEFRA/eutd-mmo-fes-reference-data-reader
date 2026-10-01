import axios, { AxiosResponse } from 'axios';
import querystring from 'node:querystring';
import https from 'node:https';
import { SSL_OP_LEGACY_SERVER_CONNECT } from 'node:constants';
import config from '../config';
import logger from '../logger';
import {
  Establishment,
  EstablishmentSearchResponse
} from '../interfaces/approvedFoodEstablishments.interface';
import { IOAuthRequest, IOAuthResponse } from './countries-api';

const PAGE_SIZE = 500;
const RESOURCE_PATH = '/establishments/search';

export const getApprovedFoodEstablishmentsToken = async (): Promise<IOAuthResponse> => {
  logger.info('[APPROVED-FOOD-ESTABLISHMENTS-API][REQUESTING-OAUTH-TOKEN]');

  const tokenRequest: IOAuthRequest = {
    client_id: config.defraTradeApiOauthClientId,
    client_secret: config.defraTradeApiOauthClientSecret,
    scope: config.defraTradeApiOauthScope,
    grant_type: 'client_credentials'
  };

  const agent = new https.Agent({
    secureOptions: SSL_OP_LEGACY_SERVER_CONNECT
  });

  const tokenResponse = await axios.post<IOAuthResponse>(
    config.defraTradeApiOauthTokenUrl,
    querystring.stringify(tokenRequest),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      httpsAgent: agent
    }
  ).catch(e => {
    logger.error(`[APPROVED-FOOD-ESTABLISHMENTS-API][ERROR][UNABLE-TO-GET-OAUTH-TOKEN][${e.stack || e}]`);
    throw e;
  });

  return tokenResponse.data;
};

const loadPagedEstablishments = async (
  token: IOAuthResponse,
  filters: Record<string, string>,
  queryName: 'PROCESSING-PLANTS' | 'STORAGE-FACILITIES'
): Promise<Establishment[]> => {
  const agent = new https.Agent({
    secureOptions: SSL_OP_LEGACY_SERVER_CONNECT
  });

  const establishments: Establishment[] = [];
  let offset = 0;
  let total = 0;

  do {
    const response: AxiosResponse<EstablishmentSearchResponse> = await axios.get<EstablishmentSearchResponse>(
      `${config.mdmApprovedFoodEstablishmentsBaseUrl}${RESOURCE_PATH}`,
      {
        params: {
          ...filters,
          limit: PAGE_SIZE,
          offset
        },
        headers: {
          Authorization: `${token.token_type} ${token.access_token}`,
          [config.defraTradeApiAPIMHeaderName]: config.defraTradeApiAPIMHeaderValue
        },
        httpsAgent: agent
      }
    ).catch(e => {
      logger.error(`[APPROVED-FOOD-ESTABLISHMENTS-API][ERROR][UNABLE-TO-LOAD-${queryName}][${e.stack || e}]`);

      if (e.response) {
        logger.error('[APPROVED-FOOD-ESTABLISHMENTS-API][ERROR][RESPONSE][STATUS]', e.response.status);
        logger.error('[APPROVED-FOOD-ESTABLISHMENTS-API][ERROR][RESPONSE][HEADERS]', e.response.headers);
      } else {
        logger.error('[APPROVED-FOOD-ESTABLISHMENTS-API][ERROR][NO-RESPONSE]');
      }

      throw e;
    });

    const page = response.data;
    total = page.total;

    if (!page.content.length && establishments.length < total) {
      // Defensive guard to avoid infinite pagination if upstream total is stale.
      logger.warn(
        `[APPROVED-FOOD-ESTABLISHMENTS-API][WARN][EMPTY-PAGE][QUERY:${queryName}]` +
        `[OFFSET:${offset}][LIMIT:${PAGE_SIZE}][TOTAL:${total}][COLLECTED:${establishments.length}]`
      );
      break;
    }

    establishments.push(...page.content);
    offset += PAGE_SIZE;
  } while (establishments.length < total);

  logger.info(
    `[APPROVED-FOOD-ESTABLISHMENTS-API][${queryName}-LOADED]` +
    `[NUMBER-OF-ESTABLISHMENTS: ${establishments.length}]`
  );

  return establishments;
};

export const loadProcessingPlants = async (token: IOAuthResponse): Promise<Establishment[]> =>
  loadPagedEstablishments(token, { section: 'A.VIII', capability: 'processing' }, 'PROCESSING-PLANTS');

export const loadStorageFacilities = async (token: IOAuthResponse): Promise<Establishment[]> =>
  loadPagedEstablishments(token, { sectionActivity: 'A.0:CS' }, 'STORAGE-FACILITIES');

export const loadApprovedFoodEstablishments = async (): Promise<{
  processingPlants: Establishment[];
  storageFacilities: Establishment[];
}> => {
  logger.info('[APPROVED-FOOD-ESTABLISHMENTS-API][LOADING-APPROVED-FOOD-ESTABLISHMENTS]');
  logger.info(
    `[APPROVED-FOOD-ESTABLISHMENTS-API][LOADED-CONFIG][BASE-URL: ${config.mdmApprovedFoodEstablishmentsBaseUrl}]`
  );

  const token = await getApprovedFoodEstablishmentsToken();
  const [processingPlants, storageFacilities] = await Promise.all([
    loadProcessingPlants(token),
    loadStorageFacilities(token)
  ]);

  return { processingPlants, storageFacilities };
};
