import * as Hapi from '@hapi/hapi';
import mingo from 'mingo';
import moment from 'moment';
import { vesselSearch } from '../controllers/vessel';

import { getVesselsData } from '../data/cache';
import { IVessel } from '../interfaces/vessels.interfaces';
import logger from '../logger';
import { IVessel as IVesselRaw } from "../landings/types/appConfig/vessels";

export const vesselRoutes = (server: Hapi.Server) => {
  server.route([
    {
      method: 'GET',
      path: '/v1/vessels/search',
      options: {
        security: true
      },
      handler: async (request, h) => {
        try {
          const query = request.query;
          const searchTerm = query && query.searchTerm;

          const allVessels: IVessel[] = [];

          if (query && query.landedDate) {

            const landedDate = moment.utc(query.landedDate);
            const landedDateISO = landedDate.toISOString();

            if (!landedDate.isValid()) {
              return h.response().code(400);
            }

            return h.response(vesselSearch(searchTerm, landedDateISO))
          }

          return h.response(allVessels);

        } catch(e) {
          if (e.message.includes('Invalid regular expression')) {
            logger.error(e);
            return h.response([]).code(400);
          } else {
            logger.error(e);
            return h.response([]).code(500);
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/v1/vessels',
      options: {
        security: true
      },
      handler: async (request, h) => {
        try {
          const vessels = mingo.find(getVesselsData(), {});

          const allVessels: IVessel[] = [];
          while(vessels.hasNext()) {
            const item = vessels.next() as IVesselRaw;

            allVessels.push({
              pln: item.registrationNumber,
              vesselName: item.fishingVesselName,
              flag: item.flag,
              cfr: item.cfr,
              homePort: item.homePort,
              licenceNumber: item.fishingLicenceNumber,
              imoNumber: item.imo,
              licenceValidTo: item.fishingLicenceValidTo,
              vesselNotFound: item.vesselNotFound,
              licenceHolder: item.licenceHolderName

            } as IVessel);
          }
          return h.response(allVessels);

        } catch(e) {
          logger.error(e);
          return h.response().code(500);
        }

      }
    },
    {
      method: 'GET',
      path: '/v1/vessels/search-exact',
      options: {
        security: true
      },
      handler: async (request, h) => {
        try {
          const query = request.query;
          const vesselPln = query && query.vesselPln;
          const vesselName = query && query.vesselName;
          const vesselsData = getVesselsData();
          const vessel = mingo.find(vesselsData,
            { "registrationNumber": vesselPln, "fishingVesselName": vesselName }
          );

          if (vessel.hasNext()) {
            const item = vessel.next() as IVesselRaw;
            return h.response({
              pln: item.registrationNumber,
              vesselName: item.fishingVesselName,
              flag: item.flag,
              cfr: item.cfr,
              homePort: item.homePort,
              licenceNumber: item.fishingLicenceNumber,
              imoNumber: item.imo,
              licenceValidTo: item.fishingLicenceValidTo,
              vesselNotFound: item.vesselNotFound,
              licenceHolder: item.licenceHolderName
            });

          } else {
            return h.response(null).code(404);
          }

        } catch(e) {
          logger.error(e);
          return h.response().code(500);
        }

      }
    },
    {
      method: 'GET',
      path: '/v1/vessels/hasLicense',
      options: {
        security: true
      },
      handler: async (request, h) => {
        try {
          const query = request.query;
          const vesselPln = query && query.vesselPln;
          const vesselName = query && query.vesselName;
          const landedDate = moment.utc(query.landedDate);
          const landedDateISO = landedDate.toISOString();
          const vesselFlag = query?.flag;
          const vesselCfr = query?.cfr;
          const vesselHomePort = query?.homePort;
          const vesselNumber = query?.licenceNumber;
          const vesselImoNumber: number = (query?.imo === null || query?.imo === undefined) ? null : parseInt(query?.imo);
          const vesselLicenceValidTo = query?.licenceValidTo;

          if (!moment.utc(vesselLicenceValidTo).isValid() || vesselNumber === undefined)
            return h.response(null).code(404);

          const vessel = mingo.find(getVesselsData(), {
            registrationNumber: vesselPln,
            fishingVesselName: vesselName,
            fishingLicenceValidTo: { "$gte": landedDateISO.substring(0, landedDateISO.length - 5) },
            fishingLicenceValidFrom: { "$lte": landedDateISO.substring(0, landedDateISO.length - 5) },
            flag: vesselFlag,
            cfr: vesselCfr,
            homePort: vesselHomePort,
            imo: vesselImoNumber
          });

          if (vessel.hasNext()) {
            const item = vessel.next() as IVessel;
            return h.response(item);
          } else {
            return h.response(null).code(404);
          }

        } catch(e) {
          logger.error(e);
          return h.response().code(500);
        }

      }
    }
  ]);
}
