import * as Hapi from '@hapi/hapi';
import mingo from 'mingo';
import { useOperators, OperatorType } from "mingo/core";
import { $group, $match } from "mingo/operators/pipeline";
import { $push } from "mingo/operators/accumulator";
import { $concat, $first, $toUpper, $toLower, $substr } from "mingo/operators/expression";

import { commoditySearch, getCommodities } from '../controllers/species';
import { capitalize } from '../utils/string';
import { getSpeciesData } from '../data/cache';
import logger from '../logger';
import { IAllSpecies } from '../landings/types/appConfig/allSpecies';



export const speciesRoutes = (server: Hapi.Server) => {
  server.route([
    {
      method: 'GET',
      path: '/v1/species/{faoCode?}',
      options: {
        security: true
      },
      handler: async (request, h) => {
        interface Species {
          faoName: string,
          scientificName: string,
          faoCode: string,
          commonNames: string[]
        }

        const query = request.query;

        if (query.uk && (query.uk.toUpperCase() === 'Y')) {
          // TODO: handle faocode based calls - not sure where it's used as the whole journey works without this endpoint...
          const speciesCollection = getSpeciesData('uk');
          useOperators(OperatorType.PIPELINE, { $group });

          const agg = new mingo.Aggregator([
            {
              "$group": {
                "_id": {
                  faoName: "$faoName",
                  scientificName: "$scientificName",
                  faoCode: "$faoCode"
                }
              }
            }
          ]);
          let species;
          try {
            species = agg.run(speciesCollection);
          } catch (e) {
            logger.error(`[API-ENDPOINT][/v1/species/{faoCode?}] ${e}`)
            return h.response().code(500);
          }
          const ukSpecies: Species[] = species.map((item: any) => {
            return item._id
          });
          return h.response(ukSpecies);
        } else {
          const species = getSpeciesData('all');
          const allSpecies: Species[] = species.map((item: any) => {
            return item;
          });
          return h.response(allSpecies);
        }
      }
    },
    {
      method: 'GET',
      path: '/v1/presentations',
      options: {
        security: true
      },
      handler: async (request, h) => {
        const species = getSpeciesData('uk');
        const agg = new mingo.Aggregator([
          {
            "$group": {
              "_id": {
                value: "$presentationState",
                label: "$presentationDescr"
              }
            },
          }
        ]);

        interface Presentation {
          value: string,
          label: string
        }
        const presentations = agg.run(species);
        const allPresentations: Presentation[] = presentations.map((item: any) => {
          return {
            value: item._id.value,
            label: capitalize(item._id.label)
          };
        });
        return h.response(allPresentations);
      }
    },
    {
      method: 'GET',
      path: '/v1/states',
      options: {
        security: true
      },
      handler: async (request, h) => {
        const species = getSpeciesData('uk');
        useOperators(OperatorType.PIPELINE, { $group });

        const agg = new mingo.Aggregator([
          {
            "$group": {
              "_id": {
                value: "$preservationState",
                label: "$preservationDescr"
              }
            },
          }
        ]);

        interface Preservation {
          value: string,
          label: string
        }

        const preservations = agg.run(species);
        const allPreservations: Preservation[] = preservations.map((item: any) => {
          return {
            value: item._id.value,
            label: capitalize(item._id.label)
          };
        });

        return h.response(allPreservations);
      }
    },
    {
      method: 'GET',
      path: '/v1/speciesStateLookup',
      options: {
        security: true
      },
      handler: async (request, h) => {
        try {
          const query = request.query;
          const code = query && query.faoCode;
          useOperators(OperatorType.PIPELINE, { $match, $group });
          useOperators(OperatorType.EXPRESSION, { $concat, $first, $toUpper, $toLower, $substr  });
          useOperators(OperatorType.ACCUMULATOR, { $push  });

          const agg = new mingo.Aggregator([
            {
              "$match": {
                faoCode: code
              }
            },
            {
              // Mainly for making sure first character is capitalized in label (description).
              "$project": {
                preservationState: "$preservationState",
                preservationDescr: {
                  $concat: [
                    { $toUpper: { $substr: ["$preservationDescr", 0, 1] } },
                    { $toLower: { $substr: ["$preservationDescr", 1] } }
                  ]
                },
                presentationState: "$presentationState",
                presentationDescr: {
                  $concat: [
                    { $toUpper: { $substr: ["$presentationDescr", 0, 1] } },
                    { $toLower: { $substr: ["$presentationDescr", 1] } }
                  ]
                },
                scientificName: "$scientificName"
              }
            },
            {
              "$group": {
                "_id": {
                  value: "$preservationState",
                  label: "$preservationDescr"
                },
                presentations: {
                  "$push": {
                    value: "$presentationState",
                    label: "$presentationDescr"
                  }
                },
                scientificName: { $first: "$scientificName" }
              }
            },
            {
              "$project": {
                "_id": 0,
                state: "$_id",
                presentations: 1,
                scientificName: 1
              }
            }
          ]);

          interface Presentation {
            value: string,
            label: string
          }

          interface State {
            value: string,
            label: string
          }

          interface IStateWithPresentations {
            state: State,
            presentations: Presentation[],
            scientificName: string
          }

          let  stateWithPresentations : IStateWithPresentations[]
          const species = getSpeciesData('uk');

          try {
            stateWithPresentations = agg.run<{state: State,
              presentations: Presentation[],
              scientificName: string}>(species);
          } catch (e) {
            logger.error(`[API-ENDPOINT][/v1/speciesStateLookup] ${e}`)
            return h.response().code(500);
          }

          const stateWithUniquePresentations: IStateWithPresentations[] = stateWithPresentations.map((stateWithPresentation: IStateWithPresentations) => ({
            state: stateWithPresentation.state,
            presentations: stateWithPresentation.presentations.reduce((acc: Presentation[], curr: Presentation) =>
              (acc.some((presentation: Presentation) => presentation.value === curr.value)) ? acc : [...acc, curr], []),
            scientificName: stateWithPresentation.scientificName
          }));

          return h.response(stateWithUniquePresentations);
        } catch (e) {
          logger.error(e);
          return h.response().code(500);
        }
      }
    },
    {
      method: 'GET',
      path: '/v1/commodities/search',
      options: {
        security: true
      },
      handler: async (request, h) => {
        // speciesCode=COD&state=FRE&presentation=FIL
        const query = request.query;

        if (query && Object.keys(query).length) {
          const code = query.speciesCode;
          const state = query.state;
          const pres = query.presentation;

          logger.info('Running commodities search', code, state, pres);

          return h.response(commoditySearch(code, state, pres));
        }

        return h.response().code(400);
      }
    },
    {
      method: 'GET',
      path: '/v1/commodities',
      options: {
        security: true
      },
      handler: async (request, h) => {
        return h.response(getCommodities());
      }
    },
    {
      method: 'GET',
      path: '/v1/species/search-exact',
      options: {
        security: true
      },
      handler: async (request, h) => {
        try {
          ///v1/species/search-exact?faoCode=COD&faoName=Atlantic+cod&scientificName=Gadus+morhua
          const query = request.query;
          const faoCode = query && query.faoCode;
          const faoName = query && query.faoName;
          const scientificName = query && query.scientificName;
          const species = getSpeciesData('all');
          const s = mingo.find(species,
            { "faoCode": faoCode, "faoName": faoName, "scientificName": scientificName }
          );

          if (s.hasNext()) {
            const item = s.next() as IAllSpecies;
            return h.response({
              faoCode: item.faoCode,
              faoName: item.faoName,
              scientificName: item.scientificName
            });

          } else {
            return h.response(null);
          }

        } catch (e) {
          logger.error(e);
          return h.response().code(500);
        }
      }
    }
  ]);
};
