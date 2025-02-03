import * as Joi from 'joi';
import mingo from 'mingo';
import moment from 'moment';
import * as RiskingController from '../controllers/risking';
import { Server, Request } from '@hapi/hapi';
import { ResponseToolkit } from 'hapi';
import { getDevolvedAuthority } from 'mmo-shared-reference-data';
import { IVesselOfInterest, VesselOfInterest } from '../landings/types/appConfig/risking';
import { getVesselsOfInterest, createVesselOfInterest, deleteVesselOfInterest } from '../landings/persistence/risking';
import { getVesselsData } from '../data/cache';
import { IVessel } from '../landings/types/appConfig/vessels';
import { RiskSpeciesTogglePayload, RiskThresholdPayload, RiskWeightingPayload, RiskingVesselPayload } from './types/risking';
import logger from '../logger';

export const riskingRoutes = (server: Server) => {
  server.route([
    {
      method: 'POST',
      path: '/v1/risking/vessel/add',
      options: { security: true },
      handler: async (req, h) => {

        const { pln, vesselName, homePort, da } = req.payload as RiskingVesselPayload
        try {
          if (pln && vesselName && homePort && da) {
            await createVesselOfInterest({ pln, vesselName, homePort, da });

            logger.info('[RISKING][ADD-VESSELS-OF-INTEREST][SUCCESS]');
            return h.response().code(200);
          } else {

            logger.info(`[RISKING][ADD-VESSEL-OF-INTEREST][MISSING-PAYLOAD]`);
            return h.response().code(400);
          }
        } catch (e) {

          logger.error(`[RISKING][ADD-VESSEL-OF-INTEREST][ERROR][${e}]`);
          return h.response().code(500);
        }
      }
    },
    {
      method: 'GET',
      path: '/v1/risking/vessels',
      options: {
        security: true
      },
      handler: async (req: Request, h: ResponseToolkit) => {
        try {
          const vesselsOfInterest: IVesselOfInterest[] = await getVesselsOfInterest();
          const vessels: VesselOfInterest[] = vesselsOfInterest
            .map(vessel => ({
              pln: vessel.registrationNumber,
              vesselName: vessel.fishingVesselName,
              homePort: vessel.homePort,
              da: vessel.da
            }))
            .sort((a, b) => {
              if (a.vesselName < b.vesselName) return -1;
              if (a.vesselName > b.vesselName) return 1;
              return 0
            });

          logger.info(`[RISKING][GET-VESSELS-OF-INTEREST][VESSELS ${vessels.length}][SUCCESS]`);
          return h.response(vessels).code(200);
        }
        catch (e) {
          logger.error(`[RISKING][GET-VESSELS-OF-INTEREST][ERROR][${e}]`);
          return h.response().code(500);
        }
      }
    },
    {
      method: 'GET',
      path: '/v1/risking/vessels/search',
      options: {
        security: true
      },
      handler: async (request: Request, h: ResponseToolkit) => {
        try {
          const query = request.query;
          const searchTerm = query.searchTerm;

          if (searchTerm) {
            const isAlphaNumaric = /^[a-zA-Z0-9]*$/g.test(searchTerm)
            if (!isAlphaNumaric) {
              return h.response([]).code(200);
            }
            const vesselsOfInterest: VesselOfInterest[] = [];
            const validDate = moment.utc();
            const validDateISO = validDate.toISOString();
            const vessels = mingo.find(getVesselsData(), {
              "$and": [
                {
                  "$or": [
                    {
                      registrationNumber: { $regex: searchTerm, $options: 'i' }
                    },
                    {
                      fishingVesselName: { $regex: searchTerm, $options: 'i' }
                    }
                  ]
                },
                {
                  fishingLicenceValidTo: { "$gte": validDateISO.substring(0, validDateISO.length - 5) } //Minus Zulu and Miliseconds
                },
                {
                  fishingLicenceValidFrom: { "$lte": validDateISO.substring(0, validDateISO.length - 5) }
                }
              ]
            });
            vessels.sort({ fishingVesselName: 1 });
            while (vessels.hasNext()) {
              const vessel = vessels.next() as IVessel;
              vesselsOfInterest.push({
                pln: vessel.registrationNumber,
                vesselName: vessel.fishingVesselName,
                homePort: vessel.homePort,
                da: getDevolvedAuthority(vessel.flag, vessel.adminPort)
              });
            }

            logger.info(`[RISKING][SEARCH][${vesselsOfInterest.length}][FOUND]`);
            return h.response(vesselsOfInterest).code(200);
          }

          logger.info('[RISKING][SEARCH][INVALID-SEARCH-TERM]');
          return h.response([]).code(400);
        } catch (e) {
          logger.error(`[RISKING][SEARCH][ERROR][${e}]`);
          return h.response([]).code(500);
        }
      }
    },
    {
      method: 'POST',
      path: '/v1/risking/vessel/delete',
      options: {
        security: true,
      },
      handler: async (request: Request, h: ResponseToolkit) => {
        try {
          const { pln, vesselName } = request.payload  as RiskingVesselPayload;
          logger.info(`[RISKING][DELETE-VESSEL-OF-INTEREST][PLN: ${pln}][VESSEL: ${vesselName}]`);

          if (pln !== undefined && vesselName !== undefined) {
            await deleteVesselOfInterest(pln, vesselName);
            logger.info('[RISKING][DELETE-VESSEL-OF-INTEREST][SUCCESS]');
            return h.response().code(200);
          }

          logger.info('[RISKING][DELETE-VESSEL-OF-INTEREST][UNSUCCESSFUL]');
          return h.response().code(400);
        } catch (e) {
          logger.error(`[RISKING][DELETE-VESSEL-OF-INTEREST][ERROR][${e}]`);
          return h.response().code(500);
        }
      }
    },
    {
      method: 'GET',
      path: '/v1/risking/species-toggle',
      options: {
        security: true,
        description: 'Get the value of the toggle which determines if risk rating should be included in validation blocking when there is a species mismatch'
      },
      handler: async (request: Request, h: ResponseToolkit) => {
        try {
          logger.info('[RISKING][GET-SPECIES-TOGGLE]');

          const speciesToggle = await RiskingController.getSpeciesToggle();

          logger.info(`[RISKING][GET-SPECIES-TOGGLE][SUCCESS][${JSON.stringify(speciesToggle)}]`);
          return h.response(speciesToggle);
        }
        catch (err) {
          logger.error(`[RISKING][GET-SPECIES-TOGGLE][ERROR][${err}]`);
          return h.response().code(500);
        }
      }
    },
    {
      method: 'PUT',
      path: '/v1/risking/species-toggle',
      options: {
        security: true,
        description: 'Set the value of the toggle which determines if risk rating should be included in validation blocking when there is a species mismatch',
        validate: {
          payload: Joi.object({
            enabled: Joi.boolean().required()
          })
        }
      },
      handler: async (request: Request, h: ResponseToolkit) => {
        try {
          logger.info('[RISKING][SET-SPECIES-TOGGLE]')
          const {enabled} = request.payload as RiskSpeciesTogglePayload

          await RiskingController.setSpeciesToggle({ enabled });

          logger.info('[RISKING][SET-SPECIES-TOGGLE][SUCCESS]');
          return h.response();
        } catch (err) {
          logger.error(`[RISKING][SET-SPECIES-TOGGLE][ERROR][${err}]`);
          return h.response().code(500);
        }
      }
    },
    {
      method: 'GET',
      path: '/v1/risking/weightings',
      options: {
        security: true,
        description: 'Get the weighings for each aspect of risking'
      },
      handler: async (_request: Request, h: ResponseToolkit) => {
        logger.info('[RISKING][GET-WEIGHTINGS]');

        return await RiskingController.getWeighting()
          .then(data => {
            logger.info(`[RISKING][GET-WEIGHTINGS][SUCCESS][${JSON.stringify(data)}]`);
            return h.response(data);
          })
          .catch(err => {
            logger.error(`[RISKING][GET-WEIGHTINGS][ERROR][${err}]`);
            return h.response().code(500);
          });
      }
    },
    {
      method: 'PUT',
      path: '/v1/risking/weightings',
      options: {
        security: true,
        description: 'Set the weighings for each aspect of risking',
        validate: {
          payload: Joi.object({
            exporter: Joi.number().required(),
            species: Joi.number().required(),
            vessel: Joi.number().required()
          })
        }
      },
      handler: async (request: Request, h: ResponseToolkit) => {
        logger.info('[RISKING][SET-WEIGHTINGS]');

        const {exporter,species,vessel} = request.payload as RiskWeightingPayload

        return await RiskingController.setWeighting(exporter,species,vessel)
          .then(_ => {
            logger.info('[RISKING][SET-WEIGHTINGS][SUCCESS]');
            return h.response();
          })
          .catch(err => {
            logger.error(`[RISKING][SET-WEIGHTINGS][ERROR][${err}]`);
            return h.response().code(500);
          });
      }
    },
    {
      method: 'PUT',
      path: '/v1/risking/threshold',
      options: {
        security: true,
        description: 'Set the threshold for each aspect of risking',
        validate: {
          payload: Joi.object({
            threshold: Joi.number().required()
          })
        }
      },
      handler: async (request: Request, h: ResponseToolkit) => {
        logger.info('[RISKING][SET-THRESHOLD]');

        const {threshold} = request.payload as RiskThresholdPayload

        return await RiskingController.setThreshold(threshold)
          .then(_ => {
            logger.info('[RISKING][SET-THRESHOLD][SUCCESS]');
            return h.response();
          })
          .catch(err => {
            logger.error(`[RISKING][SET-THRESHOLD][ERROR][${err}]`);
            return h.response().code(500);
          });
      }
    }
  ])
}