import * as Hapi from '@hapi/hapi';
import logger from '../logger';
import { getRfmos } from '../data/cache';

export const rfmoRoutes = (server: Hapi.Server) => {
  server.route([
    {
      method: 'GET',
      path: '/v1/rfmo-areas',
      options: {
        security: true,
      },
      handler: async (req, h) => {
        try {
          const rfmos = getRfmos();
          const rfmoFullText = [
            ...new Set(
              rfmos
                .map((rfmo) => rfmo['Full text'])
                .filter((text) => text && text.trim() !== '')
            ),
          ];
          return h.response(rfmoFullText).code(200);
        } catch (e) {
          logger.error({ err: e }, `[RFMO-AREAS][GET][ERROR] ${e}`);
          return h.response().code(500);
        }
      },
    }
  ])
}
