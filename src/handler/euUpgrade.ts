import * as Hapi from '@hapi/hapi';
import logger from '../logger';
import { ResponseToolkit } from 'hapi';
import * as Controller from '../controllers/euUpgrade';
import { IEuUpgradeCallback } from 'mmo-shared-reference-data';
import { euUpgradeCallbackSchema } from './schema/euUpgrade.schema';

/**
 * EU Upgrade Routes
 * Implements Scenario 3 from FI0-10355
 *
 * This handler exposes the POST /eu-upgrade endpoint for BOOMI callbacks
 */
export const euUpgradeRoutes = (server: Hapi.Server) => {
  server.route([
    {
      method: 'POST',
      path: '/v1/eu-upgrade',
      handler: async (req: Hapi.Request, h: ResponseToolkit) => {
        const payload = req.payload as IEuUpgradeCallback;
        const requestId = (payload as any).Envelope.Header.Message.Message;
        try {
          await Controller.processEuUpgradeCallback(payload);
          return h.response().code(200);
        } catch (e) {
          logger.error(`[EU-UPGRADE][ENDPOINT][ERROR][REQUEST-ID:${requestId}][${e.message}]`);

          // Return 500 for processing errors
          return h.response().code(500);
        }
      },
      options: {
        auth: false, // BOOMI will call this directly - consider adding authentication
        description: 'Receive EU CATCH status callbacks from BOOMI',
        tags: ['api', 'eu-upgrade', 'catch'],
        validate: {
          payload: euUpgradeCallbackSchema,
        },
      },
    },
  ]);
};
