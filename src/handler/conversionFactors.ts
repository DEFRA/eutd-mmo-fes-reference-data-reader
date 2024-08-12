import * as Hapi from '@hapi/hapi';
import { ResponseToolkit } from 'hapi';
import logger from '../logger';
import * as qs from 'qs';

import { getConversionFactors } from '../landings/persistence/conversionFactors';

export const conversionFactorRoutes = (server: Hapi.Server) => {
    server.route([
        {
            method: 'GET',
            path: '/v1/factors',
            options: {
              security: true
            },
            handler: async (request: Hapi.Request, h: ResponseToolkit) => {
                const query = request.query;
                const products = qs.parse(query).products;

                try {
                    const conversionFactors = getConversionFactors(products);

                    logger.info(`[GET-CONVERSION-FACTORS][${conversionFactors.length} CONVERSION FACTORS FOUND][SUCCESS]`);
                    return h.response(conversionFactors).code(200);
                }
                catch (e) {
                    logger.error(`[GET-CONVERSION-FACTORS][ERROR] ${e}`);
                    return h.response().code(500);
                }
            }
          }
    ])
}
