import * as Hapi from '@hapi/hapi';
import { ResponseToolkit } from 'hapi';
import Joi from 'joi';
import errorExtractor from '../utils/errorExtractor';
import { BoomiService } from 'mmo-shared-reference-data';
import logger from '../logger';

export const addressesRoutes = (server: Hapi.Server) => {
  server.route([
    {
      method: 'GET',
      path: '/v1/addresses/search',
      options: {
        security: true,
        validate: {
          query: Joi.object({
            postcode: Joi.string().pattern(/^[A-Za-z0-9 ,-]{5,8}$/).required()
          }),
          failAction: (_req, h, error) => {
            logger.error(`[GET-ADDRESS][FAIL-ACTION][ERROR][${JSON.stringify(error)}]`);
            return h
              .response(errorExtractor(error))
              .code(400)
              .takeover()
          }
        }
      },
      handler: async (request: Hapi.Request, h: ResponseToolkit) =>
        await BoomiService.getAddresses(request.query.postcode)
          .then(data => {
            logger.info(`[GET-ADDRESS][${JSON.stringify(data)}]`);
            return h.response(data)
          })
          .catch(e => {
            logger.error(`[GET-ADDRESS][${request.query.postcode}][ERROR][${e.stack ?? e}]`);
            return h.response([]);
          })
    },
  ]);
}