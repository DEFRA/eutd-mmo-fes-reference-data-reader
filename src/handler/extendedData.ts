import * as Hapi from '@hapi/hapi';
import logger from '../logger';
import {getExtendedValidationData} from '../landings/extendedValidationDataService';

import moment from 'moment';

export const extendedDataRoutes = (server: Hapi.Server) => {
  server.route([
    {
      method: 'GET',
      path: '/v1/extendedData/rawLandings',
      options: {
        security: true
      },

      handler: async (req, h) => {
        const query = req.query;
        const dateLanded = query.dateLanded;
        const rssNumber = query.rssNumber;

        return await _executeExtendedDataRequest('rawLandings',dateLanded,rssNumber,h)
      }
    },
    {
      method: 'GET',
      path: '/v1/extendedData/salesNotes',
      options: {
        security: true
      },

      handler: async (req, h) => {

        const query = req.query;
        const dateLanded = query.dateLanded;
        const rssNumber = query.rssNumber;

        return await _executeExtendedDataRequest('salesNotes', dateLanded,rssNumber,h)
      }
    }
  ]);
};

async function _executeExtendedDataRequest(typeOfExtendedData,dateLanded,rssNumber,h) {
    try {
        if (dateLanded && rssNumber) {
            const requestedDate = moment.utc(dateLanded);
            const requestedDateISO = requestedDate.format('YYYY-MM-DD')

            if (!requestedDate.isValid() || rssNumber === "") return h.response().code(400);

            const payload = await getExtendedValidationData(requestedDateISO,rssNumber,typeOfExtendedData)

            return h.response(payload).code(200)
        } else {
            return h.response().code(400)
        }
    } catch(e) {
        logger.info(`[EXTENDED-DATA][GET][${typeOfExtendedData}][ERROR][${e.stack || e}]`)
        return h.response(e.message).code(500)
    }
}
