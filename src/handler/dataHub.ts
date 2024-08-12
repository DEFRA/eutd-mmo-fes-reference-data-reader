import * as Hapi from '@hapi/hapi';
import * as Joi from 'joi';
import logger from '../logger';
import { getDefraValidationReportsCount } from '../landings/persistence/defraValidation';
import { ResponseToolkit } from 'hapi';
import * as Controller from '../controllers/dataHub'
import { DataHubPayloadCertificateIdOnly, DataHubPayloadVoid, DataHubPayloadValidationDataCC, DataHubPayloadValidationDataSDPS } from './types/dataHub';

export const dataHubRoutes = (server: Hapi.Server) => {

  server.route([
    {
      method: 'GET',
      path: '/v1/data-hub/data',
      options: {
        security: true
      },
      handler: async (req: Hapi.Request, h: ResponseToolkit) => {
        try {
          const reports = await getDefraValidationReportsCount();
          logger.info('[DATA-HUB][GET-VALIDATION-REPORTS][SUCCESS]');
          return h.response(reports);
        }
        catch (e) {
          logger.error(`[DATA-HUB][GET-VALIDATION-REPORT][ERROR][${e}]`);
          return h.response().code(500);
        }
      }
    },
    {
      method: 'POST',
      path: '/v1/data-hub/draft',
      handler: async (req: Hapi.Request, h: ResponseToolkit) => {

        const payload = req.payload as DataHubPayloadCertificateIdOnly

        try {
          await Controller.reportDraft(payload.certificateId);

          logger.info(`[DATA-HUB][CREATE-DRAFT][SUCCESS][${payload.certificateId}]`);
          return h.response().code(204);
        }
        catch (e) {
          logger.error(`[DATA-HUB][CREATE-DRAFT][ERROR][${e}]`);
          return h.response().code(500);
        }
      },
      options: {
        security: true,
        validate: {
          payload: Joi.object({
            certificateId: Joi.string().required()
          })
        }
      }
    },
    {
      method: 'POST',
      path: '/v1/data-hub/delete',
      handler: async (req: Hapi.Request, h: ResponseToolkit) => {
        try {
          const payload = req.payload as DataHubPayloadCertificateIdOnly
          await Controller.reportDelete(payload.certificateId);

          logger.info(`[DATA-HUB][DELETE-DOCUMENT][SUCCESS][${payload.certificateId}]`);
          return h.response().code(204);
        }
        catch (e) {
          logger.error(`[DATA-HUB][DELETE-DOCUMENT][ERROR][${e}]`);
          return h.response().code(500);
        }
      },
      options: {
        security: true,
        validate: {
          payload: Joi.object({
            certificateId: Joi.string().required()
          })
        }
      }
    },
    {
      method: 'POST',
      path: '/v1/data-hub/void',
      handler: async (req: Hapi.Request, h: ResponseToolkit) => {
        try {
          const payload = req.payload as DataHubPayloadVoid
          await Controller.reportVoid(payload.certificateId,payload.isFromExporter);

          logger.info(`[DATA-HUB][VOID-DOCUMENT][SUCCESS][${payload.certificateId}]`);
          return h.response().code(204);
        }
        catch (e){
          logger.error(`[DATA-HUB][VOID-DOCUMENT][ERROR][${e}]`);
          return h.response().code(500);
        }
      },
      options: {
        security: true,
        validate: {
          payload: Joi.object({
            certificateId: Joi.string().required(),
            isFromExporter: Joi.boolean()
          })
        }
      }
    },
    {
      method: 'POST',
      path: '/v1/sdps/data-hub/submit',
      handler: async (req: Hapi.Request, h: ResponseToolkit) => {
        try {
          const payload = req.payload as DataHubPayloadValidationDataSDPS
          await Controller.reportSdPsSubmitted(payload.validationData)

          logger.info(`[DATA-HUB][SUBMIT-DOCUMENT][SD-PS][SUCCESS]`);
          return h.response().code(204);
        }
        catch (e) {
          logger.error(`[DATA-HUB][SUBMIT-DOCUMENT][SD-PS][ERROR][${e}]`);
          return h.response().code(500);
        }
      },
        options: {
          security: true,
          validate: {
            payload: Joi.object({
              validationData: Joi.array().min(1).required()
            })
          }
        }
    },
    {
      method: 'POST',
      path: '/v1/catchcertificates/data-hub/submit',
      handler: async (req: Hapi.Request, h: ResponseToolkit) => {
        try {
          const payload = req.payload as DataHubPayloadValidationDataCC
          await Controller.reportCcSubmitted(payload.validationData)

          logger.info(`[DATA-HUB][SUBMIT-DOCUMENT][CC][SUCCESS]`);
          return h.response().code(204);
        }
        catch (e) {
          logger.error(`[DATA-HUB][SUBMIT-DOCUMENT][CC][ERROR][${e}]`);
          return h.response().code(500);
        }
      },
        options: {
          security: true,
          validate: {
            payload: Joi.object({
              validationData: Joi.array().min(1).required()
            })
          }
        }
    },
    {
      method: 'POST',
      path: '/v1/catchcertificates/data-hub/resubmit',
      handler: async (req: Hapi.Request, h: ResponseToolkit) => {
        try {
          const payload = req.payload as DataHubPayloadValidationDataCC
          await Controller.resendCcToTrade(payload.validationData)

          logger.info(`[DATA-HUB][RESUBMIT-DOCUMENT][CC][SUCCESS]`);
          return h.response().code(204);
        }
        catch (e) {
          logger.error(`[DATA-HUB][RESUBMIT-DOCUMENT][CC][ERROR][${e}]`);
          return h.response().code(500);
        }
      },
        options: {
          security: true,
          validate: {
            payload: Joi.object({
              validationData: Joi.array().min(1).required()
            })
          }
        }
    }
  ]);
};