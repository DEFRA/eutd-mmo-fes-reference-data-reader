import * as Hapi from '@hapi/hapi';
import logger from '../logger';
import {
  getApprovedProcessingPlants,
  getApprovedStorageFacilities,
} from '../controllers/approvedFoodEstablishments';

export const approvedFoodEstablishmentsRoutes = (server: Hapi.Server) => {
  server.route([
    {
      method: 'GET',
      path: '/v1/processing-plants',
      options: {
        security: true,
      },

      handler: async (_req, h) => {
        try {
          const processingPlants = getApprovedProcessingPlants();
          return h.response(processingPlants).code(200);
        } catch (e) {
          logger.error({ err: e }, `[PROCESSING-PLANTS][GET][ERROR] ${e}`);
          return h.response().code(500);
        }
      },
    },
    {
      method: 'GET',
      path: '/v1/storage-facilities',
      options: {
        security: true,
      },

      handler: async (_req, h) => {
        try {
          const storageFacilities = getApprovedStorageFacilities();
          return h.response(storageFacilities).code(200);
        } catch (e) {
          logger.error({ err: e }, `[STORAGE-FACILITIES][GET][ERROR] ${e}`);
          return h.response().code(500);
        }
      },
    },
  ]);
};
