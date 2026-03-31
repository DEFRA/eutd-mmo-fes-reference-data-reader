const moment = require('moment')
import logger from '../../logger'
import { ILanding, ILandingQuery, LandingModel, LandingSources } from '../types/landing'


export const getLandings = async (rssNumber: string, dateLanded: string): Promise<ILanding[]> => {

  const theDay = moment.utc(dateLanded);

  const documents: any = await LandingModel.find({
    rssNumber: rssNumber,
    dateTimeLanded: {
      $gte: theDay.clone().startOf('day').toDate(),
      $lte: theDay.clone().endOf('day').toDate()
    }
  }).sort({ dateTimeLanded: 1 }).lean()

  return documents

}

export const getLandingsMultiple =
  async (landings: ILandingQuery[]): Promise<ILanding[]> => {

  logger.info(`[LANDINGS][GET-MULTIPLE-LANDINGS][LENGTH][${landings.length}]`);

  if (landings.length === 0) return []

  const orClauses = landings.map((landing) => {
    const theDay = moment.utc(landing.dateLanded);
    logger.info(`[LANDINGS][GET-MULTIPLE-LANDINGS][LANDING][RSS-NUMBER][${landing.rssNumber}]`);
    return {
      rssNumber: landing.rssNumber,
      dateTimeLanded: {
        $gte: theDay.clone().startOf('day').toDate(),
        $lte: theDay.clone().endOf('day').toDate()
      }
    };
  });

  const query = { $or: orClauses };
  logger.info(`[LANDINGS][GET-MULTIPLE-LANDINGS][QUERY][${JSON.stringify(query)}]`);

  const docs: ILanding[] = await LandingModel.find(query).lean();
  logger.info(`[LANDINGS][GET-MULTIPLE-LANDINGS][LANDING-FROM-MONGO][${JSON.stringify(docs)}]`);

  const seen = new Map<string, ILanding>();
  for (const doc of docs) {
    const key = `${doc.rssNumber}|${doc.dateTimeLanded}`;
    if (!seen.has(key)) seen.set(key, doc);
  }
  return Array.from(seen.values());

}


export const getAllLandings = async (): Promise<ILanding[]> =>
  await LandingModel.find({}).lean() // when retrieving all landings how far back should we go, currently we have 103k+ landings excluding ELOGs in this collection?

const updateLanding = async (landing: ILanding) => {

  await LandingModel.findOneAndUpdate(
    {
      rssNumber: landing.rssNumber,
      dateTimeLanded: landing.dateTimeLanded
    },
    landing,
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true    // create the dateTimeRetrieved the first time we see this landing
    }
  )

};

export const updateLandings = async (landings: ILanding[]) => {

  const isMultipleWithDateOnly = (landings.length > 1) && landings.every(landing =>
      moment.utc(landing.dateTimeLanded).format('HH:mm:ss.SSS ZZ') === '00:00:00.000 +0000')

  await Promise.all(
    landings.map((landing, i) => {
      let landingToUpdate = landing;
      if (isMultipleWithDateOnly) {
        logger.info(`[LANDINGS][UPDATE-LANDINGS] landings on the same day all at midnight. Adding ${i} milliseconds to create a key`);
        landingToUpdate = { ...landing, dateTimeLanded: moment.utc(landing.dateTimeLanded).add(i, 'milliseconds').toISOString() };
      }
      return updateLanding(landingToUpdate)
        .catch(e => logger.error(`[LANDINGS][UPDATE-LANDINGS][ERROR][${e}]`));
    })
  );

}

export const clearElogs = async (landings: ILanding[]) => {
  const landingDecs = landings.filter((l: ILanding) => l.source === LandingSources.LandingDeclaration);

  await Promise.all(
    landingDecs.map(async (landing) => {
      const searchDate = landing.dateTimeLanded;

      return LandingModel.deleteMany(
        {
          rssNumber: landing.rssNumber,
          dateTimeLanded: {
            $gte: moment(searchDate).startOf('day').toDate(),
            $lte: moment(searchDate).endOf('day').toDate()
          },
          source: LandingSources.ELog
        }
      );
    })
  );
}
