const _ = require('lodash');
import moment from 'moment';
import { ccQuery, imap, ifilter, mapLandingWithLandingStatus, ICcQueryResult } from 'mmo-shared-reference-data';
import { ILanding } from '../types/landing';
import { getTotalRiskScore, isHighRisk } from './isHighRisk';
import { upsertCertificate, getCertificateByDocumentNumber, Product } from '../persistence/catchCert';
import { getSpeciesAliases, getToLiveWeightFactor } from '../../data/cache';

import logger from '../../logger';

export const TOLERANCE_IN_KG = 50;

export const isValidationOveruse = (item: ICcQueryResult): boolean =>
  item.isSpeciesExists &&
  !item.isOverusedThisCert &&
  !item.isPreApproved &&
  isHighRisk(getTotalRiskScore(item.extended.pln, item.species, item.extended.exporterAccountId, item.extended.exporterContactId)) &&
  item.isOverusedAllCerts

export const isRealTimeValidationSuccessful = (item: ICcQueryResult): boolean =>
  item.weightOnAllCerts <= item.weightOnLanding + TOLERANCE_IN_KG || !isHighRisk(
    getTotalRiskScore(
      item.extended.pln,
      item.species,
      item.extended.exporterAccountId,
      item.extended.exporterContactId
    ));

export const missingLandingInvestigationRefreshQuery = (
  catchCerts: any[],
  landings: ILanding[],
  vesselsIdx: any,
  queryTime: moment.Moment): any[] => {
  const res: any[] = Array.from(
    imap(
      ifilter(
        ccQuery(catchCerts, landings, vesselsIdx, queryTime, getSpeciesAliases),
        (item: ICcQueryResult) => (!
          (
            item.isLandingExists &&
            item.isSpeciesExists &&
            isRealTimeValidationSuccessful(item)
          ) && moment.duration(queryTime.diff(item.createdAt)) < moment.duration(40, 'days'))
      ),
      ({ rssNumber, dateLanded }) => ({ rssNumber, dateLanded })
    )
  )

  return _.uniqBy(res, JSON.stringify);
}

export const runUpdateForLandings = async (rawValidatedCertificates: ICcQueryResult[], documentNumber: string): Promise<void> => {
  const certificate = await getCertificateByDocumentNumber(documentNumber);
  const { exportData = {} } = certificate;

  logger.info(`[RUN-UPDATE-FOR-LANDINGS][${documentNumber}]`);
  if (exportData.products && exportData.products.length) {
    rawValidatedCertificates
      .filter(c => c.documentNumber === documentNumber)
      .forEach((validation: ICcQueryResult) => {
        exportData.products = exportData.products.map((item: Product) => mapLandingWithLandingStatus(item, validation, getToLiveWeightFactor))
      });

    logger.info(`[RUN-UPDATE-FOR-LANDINGS][UPSERT][${documentNumber}]`);
    await upsertCertificate(documentNumber, { exportData });
  }
}