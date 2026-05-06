import * as Hapi from '@hapi/hapi';
import logger from '../logger';
import { ResponseToolkit } from 'hapi';
import * as Controller from '../controllers/catchSubmission';
import Joi from 'joi';

// Raw payload from orchestration (simplified)
interface IRawDocumentSubmissionPayload {
  documentNumber: string;
  operation: 'submit' | 'void';
}

export const catchSubmissionRoutes = (server: Hapi.Server) => {
  server.route([
    {
      method: 'GET',
      path: '/v1/catch-submission/payload',
      handler: async (req: Hapi.Request, h: ResponseToolkit) => {
        const { documentNumber } = req.query as { documentNumber: string };

        logger.info(`[DOCUMENT-SUBMISSION][PAYLOAD-INSPECT][ENDPOINT][RECEIVED][DOCUMENT:${documentNumber}]`);

        try {
          const payload = await Controller.buildDocumentPayload(documentNumber);

          logger.info(`[DOCUMENT-SUBMISSION][PAYLOAD-INSPECT][ENDPOINT][SUCCESS][DOCUMENT:${documentNumber}]`);

          return h.response(payload).code(200);
        } catch (e) {
          if (e.message?.startsWith('Document not found')) {
            logger.warn(`[DOCUMENT-SUBMISSION][PAYLOAD-INSPECT][ENDPOINT][NOT-FOUND][DOCUMENT:${documentNumber}][${e.message}]`);
            return h.response({ error: e.message }).code(404);
          }

          if (e.message?.startsWith('Document not valid for EU Catch')) {
            logger.warn(`[DOCUMENT-SUBMISSION][PAYLOAD-INSPECT][ENDPOINT][INVALID][DOCUMENT:${documentNumber}][${e.message}]`);
            return h.response({ error: e.message }).code(422);
          }

          logger.error(`[DOCUMENT-SUBMISSION][PAYLOAD-INSPECT][ENDPOINT][ERROR][DOCUMENT:${documentNumber}][${e.message}][${e.stack}]`);

          return h.response({ error: e.message }).code(500);
        }
      },
      options: {
        auth: false,
        description: 'Fetch and transform a document to its Boomi payload without forwarding to Boomi',
        tags: ['api', 'catch-submission', 'payload-inspector'],
        validate: {
          query: Joi.object({
            documentNumber: Joi.string().required()
          })
        },
      },
    },
    {
      method: 'POST',
      path: '/v1/catch-submission',
      handler: async (req: Hapi.Request, h: ResponseToolkit) => {
        const payload = req.payload as IRawDocumentSubmissionPayload;
        // Joi validation ensures documentNumber is required and operation defaults to 'submit'
        const documentNumber = payload.documentNumber;
        const operation = payload.operation;

        logger.info(
          `[DOCUMENT-SUBMISSION][ENDPOINT][RECEIVED][DOCUMENT:${documentNumber}][OPERATION:${operation}]`
        );

        try {
          await Controller.submitDocumentToBoomi(payload);

          logger.info(`[DOCUMENT-SUBMISSION][ENDPOINT][SUCCESS][DOCUMENT:${documentNumber}][OPERATION:${operation}]`);

          return h.response().code(200);
        } catch (e) {
          logger.error(
            `[DOCUMENT-SUBMISSION][ENDPOINT][ERROR][DOCUMENT:${documentNumber}][${e.message}][${e.stack}]`
          );

          return h.response().code(500);
        }
      },
      options: {
        auth: false,
        description:
          'Receive document number and operation from orchestration, fetch document data (CC/PS/SN), transform to UN/CEFACT format, and forward to Boomi',
        tags: ['api', 'document-submission', 'catch-certificate', 'processing-statement', 'storage-notes'],
        validate: {
          payload: Joi.object({
            documentNumber: Joi.string().required(),
            operation: Joi.string().valid('submit', 'void').default('submit')
          })
        },
      },
    },
  ]);
};