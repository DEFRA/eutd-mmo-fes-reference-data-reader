import * as Hapi from '@hapi/hapi';
import errorExtractor from '../utils/errorExtractor';
import * as Joi from "joi";
import { ResponseToolkit } from 'hapi';
import logger from '../logger';
import { ScanData, scanFile } from '../services/antiVirus.service';
import { VirusCheckerPayload } from './types/virusChecker';

export const virusCheckerRoutes = (server: Hapi.Server) => {
  server.route([
    {
      method: 'POST',
      path: '/v1/virusChecker/csv',
      handler : async (req: Hapi.Request, h: ResponseToolkit) => {
        const scanData: ScanData = {
          ...req.payload as VirusCheckerPayload,
          extension: 'csv'
        };
        logger.info(`[VIRUS-CHECKER][CSV][${scanData.documentNumber}][START][${scanData.key}]`);
        try {
          return await scanFile(scanData);
        } catch (e) {
          logger.error(`[VIRUS-CHECKER][CSV][${scanData.documentNumber}][ERROR][${scanData.key}][${e}]`);
          return h.response().code(500);
        }
      },
      options: {
        security: true,
        validate: {
          options: { abortEarly: false },
          failAction: function (_req, h, error) {
            return h.response(errorExtractor(error)).code(400).takeover();
          },
          payload: Joi.object().keys({
            fileName: Joi.string().trim().required(),
            content: Joi.string().trim().required(),
            documentNumber: Joi.string().trim().required(),
            key: Joi.string().trim().required()
          }),
        }
      },
    }
  ]);
};