import * as Hapi from '@hapi/hapi';
import { loadExporterBehaviour, loadFishCountriesAndSpecies } from '../data/cache';
import logger from '../logger';
import { ResponseToolkit } from 'hapi';

export const purgeRoutes = (server: Hapi.Server) => {
    server.route([
      {
        method: 'POST',
        path: '/v1/jobs/purge',
        options: {
          auth: false,
          description: 'To reload fish countries and species into cache',
        },
        handler: async (request: Hapi.Request, h: ResponseToolkit) => {
          try {
            logger.info('[LOAD-FISH-COUNTRIES-SPECIES][POST][START]');
            await loadFishCountriesAndSpecies();
            await loadExporterBehaviour();
            logger.info('[LOAD-FISH-COUNTRIES-SPECIES][POST][SUCCESS]');
            return h.response().code(200);
          } catch (e) {
            logger.error({ err: e }, `[LOAD-FISH-COUNTRIES-SPECIES][POST][ERROR] ${e}`);
            return h.response().code(500);
          }
        },
      },
    ]);
}
