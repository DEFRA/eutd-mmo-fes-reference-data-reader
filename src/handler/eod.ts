import { Server, Request } from '@hapi/hapi';
import { ResponseToolkit } from 'hapi';
import { IEodAdminAudit, IEodSetting } from '../landings/types/appConfig/eodSettings';
import { createEodRules, getEodAudits, getEodSettings } from '../landings/persistence/eodSettings';
import logger from '../logger';
import { EodAddRulesPayload } from './types/eod';

export const eodRoutes = (server: Server) => {
  server.route([
    {
      method: 'POST',
      path: '/v1/eod/rules/add',
      options: { security: true },
      handler: async (req, h) => {
        const { da, vesselSizes, user, rule } = req.payload as EodAddRulesPayload;
        try {
          if (da) {
            await createEodRules(user, da, vesselSizes, rule);

            logger.info('[EOD][ADD-EOD-RULES][SUCCESS]');
            return h.response().code(200);
          } else {
            logger.error(`[EOD][ADD-EOD-RULES][MISSING-PAYLOAD]`);
            return h.response().code(400);
          }
        } catch (e) {
          logger.error(`[EOD][ADD-EOD-RULES][ERROR][${e}]`);
          return h.response().code(500);
        }
      }
    },
    {
      method: 'GET',
      path: '/v1/eod/rules',
      options: {
        security: true
      },
      handler: async (req: Request, h: ResponseToolkit) => {
        try {
          const getEODRules: IEodSetting[] = await getEodSettings();

          logger.info('[EOD][GET-EOD-RULES][SUCCESS]');
          return h.response(getEODRules).code(200);
        }
        catch (e) {
          logger.error(`[EOD][ADD-EOD-RULES][ERROR][${e}]`);
          return h.response().code(500);
        }
      }
    },
    {
      method: 'GET',
      path: '/v1/eod/audit',
      options: {
        security: true
      },
      handler: async (req: Request, h: ResponseToolkit) => {
        try {
          const getEODAudits: IEodAdminAudit[] = await getEodAudits();
          logger.info('[EOD][GET-EOD-AUDITS][SUCCESS]');
          return h.response(getEODAudits).code(200);
        }
        catch (e) {
          logger.error(`[EOD][ADD-EOD-AUDITS][ERROR][${e.stack || e}]`);
          return h.response().code(500);
        }
      }
    },
  ])
}