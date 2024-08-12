import moment from 'moment';
import Joi from 'joi';
import errorExtractor from '../utils/errorExtractor';
import { Request, Server } from '@hapi/hapi';
import { getDevolvedAuthority } from 'mmo-shared-reference-data';
import { ResponseToolkit } from 'hapi';
import { isQuotaSpecies } from '../data/cache';
import { isLegallyDue } from '../landings/query/isLegallyDue';
import { Catch, Product, getCertificateByDocumentNumber, upsertCertificate } from '../landings/persistence/catchCert';
import { getRssNumber, getVesselDetails } from './vesselService';
import { IsLegallyDuePayload } from './types/isLegallyDue';
import logger from '../logger';

export const isLegallyDueRoute = (server: Server) => {
    server.route([
      {
        method: 'POST',
        path: '/v1/isLegallyDue',
        options: {
          security: true,
          validate: {
            payload: Joi.object({
              documentNumber: Joi.string().required()
            }),
            failAction: function (_req, h, error) {
              logger.error('[RUN-UPDATE-FOR-LEGALLY-DUE][NO DOCUMENT NUMBER]');
              return h.response(errorExtractor(error)).code(400).takeover();
            },
          }
        },
        handler: async (request: Request, h: ResponseToolkit) => {
          try {
            const { documentNumber } = request.payload as IsLegallyDuePayload;

            const certificate = await getCertificateByDocumentNumber(documentNumber);
            const { exportData = {} } = certificate;

            logger.info(`[RUN-UPDATE-FOR-LEGALLY-DUE][${documentNumber}]`);

            if (exportData.products && exportData.products.length) {

              exportData.products = exportData.products.map((product: Product) => (
                  {
                    ...product,
                    caughtBy: product.caughtBy?.map((landing: Catch) => {
                      const rssNumber = getRssNumber(landing.pln, landing.date);
                      const vesselDetails = getVesselDetails(rssNumber);

                      return ({
                        ...landing,
                        isLegallyDue: vesselDetails ? isLegallyDue(
                          vesselDetails.vesselLength,
                          getDevolvedAuthority(vesselDetails.flag, vesselDetails.adminPort),
                          moment.utc(certificate.createdAt),
                          moment.utc(landing.date),
                          isQuotaSpecies(product.speciesCode),
                          landing.weight
                        ) : false
                      });
                    })
                  }
              ))

              logger.info(`[RUN-UPDATE-FOR-LEGALLY-DUE][UPSERT][${documentNumber}]`);
              await upsertCertificate(documentNumber, { exportData });
              return h.response().code(200);
            }

            logger.info(`[RUN-UPDATE-FOR-LEGALLY-DUE][${documentNumber}][NO-PRODUCTS-FOUND]`);

            return h.response().code(404);
          } catch (e) {
            logger.error({ err: e }, `[RUN-UPDATE-FOR-LEGALLY-DUE][ERROR] ${e}`);
            return h.response().code(500);
          }
        },
      },
    ]);
}

