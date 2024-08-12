import * as Hapi from '@hapi/hapi';
import { getCountries } from '../data/cache';
import logger from '../logger';
import { ResponseToolkit } from 'hapi';

export const countriesRoutes = (server: Hapi.Server) => {
    server.route([
      {
        method: 'GET',
        path: '/v1/countries',
        options: {
          security: true,
        },
        handler: async (request: Hapi.Request, h: ResponseToolkit) => {
          try {
            return h.response(getCountries()).code(200);
          } catch (e) {
            logger.error({ err: e }, `[COUNTRIES][GET][ERROR] ${e}`);
            return h.response().code(500);
          }
        },
      },
    ]);
}

