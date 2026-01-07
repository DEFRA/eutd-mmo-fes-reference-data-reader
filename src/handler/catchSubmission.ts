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