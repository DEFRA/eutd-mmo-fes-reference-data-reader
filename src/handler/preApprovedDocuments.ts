import * as Hapi from '@hapi/hapi';
import logger from '../logger';
import {
  getPreApprovedDocumentByDocumentNumber,
  preApproveDocumentFromMongo
} from '../landings/persistence/preApproved.service'

export const preApprovalDocumentRoutes = (server: Hapi.Server) =>
  server.route([
    {
      method: 'GET',
      path: '/v1/certificates/{documentNumber}/preApprove',
      options: { security: true },
      handler: async (req, h) => {
        try {
          const preApprovedDocument = await getPreApprovedDocumentByDocumentNumber(req.params.documentNumber);
          if (preApprovedDocument) {
            logger.info(`[GET-PREAPPROVED-DOCUMENT][${req.params.documentNumber}][SUCCESS]`);
            return h.response(preApprovedDocument).code(200);
          } else {
            logger.info(`[GET-PREAPPROVED-DOCUMENT][${req.params.documentNumber}][NOT-FOUND]`);
            return h.response().code(404);
          }
        } catch (e) {
          logger.error({ err: e }, `[GET-PREAPPROVED-DOCUMENT][${req.params.documentNumber}][ERROR] ${e}`);
          return h.response().code(500)
        }
      }
    },
    {
      method: 'POST',
      path: '/v1/certificates/{documentNumber}/preApprove',
      options: { security: true },
      handler: async (req, h) => {
        try {
          const user = req.headers["x-admin-user"];
          if (user) {
            await preApproveDocumentFromMongo(req.params.documentNumber, user);
            logger.info(`[PREAPPROVE-DOCUMENT][${req.params.documentNumber}][SUCCESS]`);
            return h.response().code(204);
          }

          logger.info(`[PREAPPROVE-DOCUMENT][${req.params.documentNumber}][FORBIDDEN]`);
          return h.response().code(403);
        } catch (e) {
          logger.error({ err: e }, `[PREAPPROVE-DOCUMENT][${req.params.documentNumber}][ERROR] ${e}`);
          return (e.message === "Not Found") ? h.response().code(404) : h.response().code(500);
        }
      }
    }
  ]);