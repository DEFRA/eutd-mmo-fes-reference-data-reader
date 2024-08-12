import * as Hapi from '@hapi/hapi';
import logger from '../logger';
import { getSeasonalFish } from '../data/cache'

export const seasonalFishRoutes = (server: Hapi.Server) => {
  server.route([
    {
      method: 'GET',
      path: '/v1/seasonalFish',
      options: {
        security: true
      },

      handler: async (req, h) => {
        try {
          const seasonalFish = getSeasonalFish()
          return h.response(seasonalFish).code(200)
        } catch(e)  {
          logger.error({err:e}, `[SEASONAL-FISH][GET][ERROR] ${e}`)
          return h.response().code(500)
        }
      }
    }
  ])
};
