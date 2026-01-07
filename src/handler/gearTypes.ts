import * as Hapi from '@hapi/hapi';
import logger from '../logger';
import { getGearTypes } from '../data/cache';
import { GearRecord, IGearType } from '../interfaces/gearTypes.interface';

export const gearTypeRoutes = (server: Hapi.Server) => {
  server.route([
    {
      method: 'GET',
      path: '/v1/gear-categories',
      options: {
        security: true,
      },

      handler: async (req, h) => {
        try {
          const gearTypes: GearRecord[] = getGearTypes();
          const gearCategories = [
            ...new Set(gearTypes.map((gear: GearRecord) => gear['Gear category'])),
          ];
          return h.response(gearCategories).code(200);
        } catch (e) {
          logger.error({ err: e }, `[GEAR-TYPES][GET][ERROR] ${e}`);
          return h.response().code(500);
        }
      },
    },
    {
      method: 'GET',
      path: '/v1/gear-type/{gearCategory}',
      options: {
        security: true,
      },
      handler: async (req, h) => {
        try {
          const gearTypes: GearRecord[] = getGearTypes();
          const gearCategory = req.params.gearCategory;

          const gearTypesByCategory: IGearType[] = gearTypes.reduce((acc, gear) => {
            if (gear['Gear category'] === gearCategory) {
              acc.push({
                gearName: gear['Gear name'],
                gearCode: gear['Gear code'],
              });
            }
            return acc;
          }, []);
          return h.response(gearTypesByCategory).code(200);
        } catch (e) {
          logger.error({ err: e }, `[GEAR-TYPES][GET][ERROR] ${e}`);
          return h.response().code(500);
        }
      },
    },
  ]);
};
