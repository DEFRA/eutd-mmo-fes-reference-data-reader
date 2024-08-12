import * as Hapi from '@hapi/hapi';
import moment from 'moment';
import logger from '../logger';
import { getRssNumber } from '../handler/vesselService';
import { fetchLandings, fetchSalesNote } from '../landings/orchestration/landingsRefresh';
import { isLandingDataAvailable } from '../landings/persistence/eodSettings';
import { LandingsQueuePayload } from './types/landingQueue';

export const landingQueueRoutes = (server: Hapi.Server) => {

  server.route([
    {
      method: 'POST',
      path: '/v1/landings/queue',
      options: {
        security: true
      },
      handler: async (req, h) => {

        logger.info('[POST /landings/queue]');

        const payload = req.payload;

        try {

          if ((payload === null) || (payload === undefined)){
            return h.response().code(400)
          }

          const {pln, dateLanded, isLegallyDue} = payload as LandingsQueuePayload

          if ((pln === undefined) || (dateLanded === undefined)) {
            return h.response().code(400)
          }

          logger.info(`[POST /landings/queue][PLN: ${pln}][DATE-LANDED: ${dateLanded}][LEGALLY-DUE: ${isLegallyDue}]`);

          if (dateLanded.length !== 10) return h.response().code(400)

          if (!moment(dateLanded).isValid()) return h.response().code(400)

          const rssNumber = getRssNumber(pln, dateLanded);

          logger.info(`[POST /landings/queue][RSS-NUMBER][${rssNumber}]`);

          if ((rssNumber === undefined)) {
            logger.info(`[POST /landings/queue]licence not found for [${pln}][${dateLanded}]`)
            return h.response().code(400)
          }

          const landingDataExpected: boolean = await isLandingDataAvailable(rssNumber, dateLanded, isLegallyDue);

          if (!landingDataExpected) {
            logger.info(`[POST /landings/queue][FETCHING-SALES-NOTE][PLN: ${pln}][DATE-LANDED: ${dateLanded}]`);
            fetchSalesNote(rssNumber, dateLanded);

            logger.info(`[POST /landings/queue][LANDING-DATA-NOT-AVAILABLE][PLN: ${pln}][DATE-LANDED: ${dateLanded}][LEGALLY-DUE: ${isLegallyDue}]`);
            return h.response().code(400)
          }

          logger.info(`[POST /landings/queue][FETCHING-LANDINGS][PLN: ${pln}][DATE-LANDED: ${dateLanded}][LEGALLY-DUE: ${isLegallyDue}]`);

          await fetchLandings(rssNumber, dateLanded);

          logger.info(`[POST /landings/queue][FETCHING-LANDINGS][SUCCESS][PLN: ${pln}][DATE-LANDED: ${dateLanded}][LEGALLY-DUE: ${isLegallyDue}]`);

          return h.response().code(202);

        } catch(e) {
          logger.error({err:e}, `[POST /landings/queue][Error ${e}]`)
          return h.response(e.message).code(500)
        }
      }
    }
  ]);
};
