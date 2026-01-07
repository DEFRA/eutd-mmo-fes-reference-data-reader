import * as Hapi from '@hapi/hapi';
import logger from '../logger';
import { getEuMemberStates } from '../data/cache';

export const euMemberStatesRoutes = (server: Hapi.Server) => {
  server.route([
    {
      method: 'GET',
      path: '/v1/eu-member-states',
      options: {
        security: true,
      },

      handler: async (req, h) => {
        try {
          const euMemberStates = getEuMemberStates();
          return h.response(euMemberStates).code(200);
        } catch (e) {
          logger.error({ err: e }, `[EU-MEMBER-STATES][GET][ERROR] ${e}`);
          return h.response().code(500);
        }
      },
    },
  ]);
};
