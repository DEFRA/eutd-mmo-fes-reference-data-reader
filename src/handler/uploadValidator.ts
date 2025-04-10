import * as Hapi from '@hapi/hapi';
import * as Joi from "joi";
import { ResponseToolkit } from 'hapi';
import { validateLandings } from '../services/uploadValidation.service';
import logger from '../logger';
import errorExtractor from '../utils/errorExtractor';
import { UploadValidatorPayload } from './types/uploadValidator';

export const uploadValidatorRoutes = (server : Hapi.Server) => {
  server.route([
    {
      method: 'POST',
      path: '/v1/upload/landings/validate',
      handler : async (req: Hapi.Request, h: ResponseToolkit) => {
        logger.info('[UPLOAD-LANDINGS][VALIDATE]');

        try {
          const { landings, products, landingLimitDaysInFuture } = req.payload as UploadValidatorPayload

          const result = validateLandings(landings, products, landingLimitDaysInFuture);

          return h.response(result);
        }
        catch (e) {
          logger.error(`[UPLOAD-LANDINGS][VALIDATE][ERROR][${e.message}]`);

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
          payload: landingValidationSchema,
        }
      },
    }
  ]);
};

export const landingValidationSchema = Joi.object().keys({
  landings: Joi.array().required().items(Joi.object()),
  products: Joi.array().required().items(Joi.object()),
  landingLimitDaysInFuture: Joi.number().min(0).required()
});