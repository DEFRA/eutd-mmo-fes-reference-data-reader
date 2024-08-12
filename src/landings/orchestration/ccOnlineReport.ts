const _ = require('lodash');
import moment from 'moment';
import { getLandingsFromCatchCertificate, ccQuery, shouldIncludeLanding, ICcQueryResult, LandingStatus } from 'mmo-shared-reference-data';
import { mapExportPayloadToCC } from '../transformations/transformations';
import { getCatchCerts } from '../persistence/catchCert';
import { getRssNumber } from '../../handler/vesselService';
import { getLandingsMultiple } from '../persistence/landing';
import { getCatchCertificateOnlineValidationReport } from '../query/onlineReports';
import { getSpeciesAliases, getVesselsIdx, refreshRiskingData } from '../../data/cache';
import { runUpdateForLandings } from "../query/ccQuery";
import { FailedOnlineCertificates } from "../types/query";
import { getBlockingStatus } from "../../services/systemBlock.service";
import { ValidationRules } from "../types/systemBlock";
import { isDocumentPreApproved } from "../persistence/preApproved.service";
import { DocumentModel, DocumentStatuses } from "../types/document";
import { IOnlineValidationReportItem } from '../types/onlineValidationReport';
import { reportCcLandingUpdate } from '../../controllers/dataHub';

import logger from '../../logger'

export async function generateOnlineValidationReport(payload: any) {
  logger.info(`[ONLINE-VALIDATION-REPORT][REFRESING-RISKING-DATA][${payload.dataToValidate.documentNumber}]`);
  await refreshRiskingData()
    .catch(e => logger.error(`[ONLINE-VALIDATION-REPORT][REFRESH-RISKING-DATA][ERROR][${e}]`));
  logger.info(`[ONLINE-VALIDATION-REPORT][MAPPING-TO-CC][${payload.dataToValidate.documentNumber}]`);
  const onlineCatchCertificate = mapExportPayloadToCC(payload.dataToValidate);
  logger.info(`[ONLINE-VALIDATION-REPORT][MAPPED-TO-CC][${onlineCatchCertificate.documentNumber}]`);
  const landingsByPln = getLandingsFromCatchCertificate(onlineCatchCertificate);
  logger.info(`[ONLINE-VALIDATION-REPORT][LANDINGS-BY-PLN][${onlineCatchCertificate.documentNumber}`);
  const catchCertificatesToValidate: any = await getCatchCerts({ landings: landingsByPln });
  logger.info(`[ONLINE-VALIDATION-REPORT][${onlineCatchCertificate.documentNumber}][GETTING-RELATED-CERTIFICATES][FOUND-${catchCertificatesToValidate.length}]`);
  catchCertificatesToValidate.push(onlineCatchCertificate);
  logger.info(`[ONLINE-VALIDATION-REPORT][${onlineCatchCertificate.documentNumber}][TOTAL-CERTIFICATES-TO-VALIDATE][${catchCertificatesToValidate.length}]`);
  const landingsByRss = mapPlnLandingsToRssLandings(landingsByPln);
  logger.info(`[ONLINE-VALIDATION-REPORT][GET-LANDINGS-MULTIPLE][${onlineCatchCertificate.documentNumber}][LANDINGS-BY-RSS]{${landingsByRss.length}`);
  const multipleLandings = await getLandingsMultiple(landingsByRss);
  logger.info(`[ONLINE-VALIDATION-REPORT][${onlineCatchCertificate.documentNumber}][GETTING-RELATED-LANDINGS][FOUND-${multipleLandings.length}]`);
  const rawValidatedCertificates: ICcQueryResult[] = Array.from(ccQuery(catchCertificatesToValidate, multipleLandings, getVesselsIdx(), moment.utc(), getSpeciesAliases));
  logger.info(`[ONLINE-VALIDATION-REPORT][VALIDATED][${onlineCatchCertificate.documentNumber}][VALIDATIONS][${rawValidatedCertificates.length}]`);
  let report = getCatchCertificateOnlineValidationReport(onlineCatchCertificate.documentNumber, rawValidatedCertificates);
  logger.info(`[ONLINE-VALIDATION-REPORT][${onlineCatchCertificate.documentNumber}][REPORTS][${report.length}]`);
  if (validationFailed(report)) {
    logger.info(`[ONLINE-VALIDATION-REPORT][IS-BLOCKED][${onlineCatchCertificate.documentNumber}]`);
    const isBlocked = await isBlocking(report);
    logger.info(`[ONLINE-VALIDATION-REPORT][BLOCKED][${onlineCatchCertificate.documentNumber}]`);
    if (isBlocked) {
      logger.info(`[ONLINE-VALIDATION-REPORT][BLOCKED][GET-DOCUMENT][${onlineCatchCertificate.documentNumber}]`);
      const certificate = await DocumentModel.findOne({
        documentNumber: onlineCatchCertificate.documentNumber
      });
      logger.info(`[ONLINE-VALIDATION-REPORT][BLOCKED][GOT-DOCUMENT][${onlineCatchCertificate.documentNumber}]`);
      const isDocumentApproved = await isDocumentPreApproved(onlineCatchCertificate.documentNumber, certificate || { exportData: {} })
      logger.info(`[ONLINE-VALIDATION-REPORT][${onlineCatchCertificate.documentNumber}][IS-PREAPPROVED][${isDocumentApproved}]`);
      rawValidatedCertificates.forEach(_ => _.isPreApproved = isDocumentApproved);
      logger.info(`[ONLINE-VALIDATION-REPORT][${onlineCatchCertificate.documentNumber}][IS-PREAPPROVED][UPDATED-VALIDATIONS]`);
      if (isDocumentApproved) {
        logger.info(`[ONLINE-VALIDATION-REPORT][PREAPPROVED][${onlineCatchCertificate.documentNumber}]`);
        report = [];
        const rawData = validateRawCertificates(rawValidatedCertificates, onlineCatchCertificate.documentNumber);
        await runUpdateForLandings(rawData, onlineCatchCertificate.documentNumber);
        await runUpdateForOtherLandings(rawValidatedCertificates, onlineCatchCertificate.documentNumber);
        return { report, rawData };
      } else {
        logger.info(`[ONLINE-VALIDATION-REPORT][${onlineCatchCertificate.documentNumber}][SAVING-FAILED-CERTIFICATE]`);
        rawValidatedCertificates.forEach(_ => _.status = "BLOCKED");
        await FailedOnlineCertificates.create(rawValidatedCertificates.filter(c => c.documentNumber === payload.dataToValidate.documentNumber));
        logger.info(`[ONLINE-VALIDATION-REPORT][${onlineCatchCertificate.documentNumber}][SAVED-FAILED-CERTIFICATE]`);
        await runUpdateForLandings(rawValidatedCertificates.filter(cert => cert.documentNumber === onlineCatchCertificate.documentNumber), onlineCatchCertificate.documentNumber);
        return {
          report,
          rawData: rawValidatedCertificates
            .filter(cert => cert.documentNumber === onlineCatchCertificate.documentNumber)
        };
      }
    } else {
      logger.info(`[ONLINE-VALIDATION-REPORT][NO-FAILURE][NO-BLOCKING][COMPLETE][${onlineCatchCertificate.documentNumber}]`);
      const rawData = validateRawCertificates(rawValidatedCertificates, onlineCatchCertificate.documentNumber);
      await runUpdateForLandings(rawData, onlineCatchCertificate.documentNumber);
      await runUpdateForOtherLandings(rawValidatedCertificates, onlineCatchCertificate.documentNumber);
      return { report, rawData };
    }
  } else {
    logger.info(`[ONLINE-VALIDATION-REPORT][NO-FAILURE][COMPLETE][${onlineCatchCertificate.documentNumber}]`);
    const rawData = validateRawCertificates(rawValidatedCertificates, onlineCatchCertificate.documentNumber);
    await runUpdateForLandings(rawData, onlineCatchCertificate.documentNumber);
    await runUpdateForOtherLandings(rawValidatedCertificates, onlineCatchCertificate.documentNumber);
    return { report, rawData };
  }
}

export function mapPlnLandingsToRssLandings(plnLandings) {
  return plnLandings.map(landing => ({
    rssNumber: getRssNumber(landing.pln, moment(landing.dateLanded).format('YYYY-MM-DD')),
    dateLanded: landing.dateLanded,
    dataEverExpected: landing.dataEverExpected,
    landingDataExpectedDate: landing.landingDataExpectedDate,
    landingDataEndDate: landing.landingDataEndDate,
    createdAt: landing.createdAt,
    isLegallyDue: landing.isLegallyDue
  })).reduceRight((rssLandings, rssLanding) => shouldIncludeLanding(rssLanding) ? [rssLanding, ...rssLandings] : [...rssLandings], [])
}

function validationFailed(report: IOnlineValidationReportItem[]) {
  return report && report.length > 0
}

function validationFailedOn(systemBlock: string, report: IOnlineValidationReportItem[]) {
  return report.find((_: IOnlineValidationReportItem) => _.failures.includes(systemBlock));
}

export function validateRawCertificates(rawValidatedCertificates: ICcQueryResult[], documentNumber: string) {
  return rawValidatedCertificates
    .filter(c => c.documentNumber === documentNumber)
    .map(_ => ({
      ..._,
      status: DocumentStatuses.Complete
    }));
}

export function findLandingsToUpdate(rawValidatedCertificates: ICcQueryResult[], documentNumber: string) {
  return rawValidatedCertificates
    .filter((c: ICcQueryResult) => c.documentNumber !== documentNumber && c.extended.landingStatus === LandingStatus.Pending && c.isLandingExists)
}

async function isBlocking(report: IOnlineValidationReportItem[]) {
  const isBlocking3CEnabled: Boolean = await getBlockingStatus(ValidationRules.THREE_C);
  const isBlocking3DEnabled: Boolean = await getBlockingStatus(ValidationRules.THREE_D);
  const isBlocking4AEnabled: Boolean = await getBlockingStatus(ValidationRules.FOUR_A);

  return (validationFailedOn("3C", report) && isBlocking3CEnabled) ||
    (validationFailedOn("3D", report) && isBlocking3DEnabled) ||
    isBlocking4AEnabled ||
    validationFailedOn("noDataSubmitted", report) ||
    validationFailedOn("noLicenceHolder", report)
}

export async function runUpdateForOtherLandings(rawValidatedCertificates: ICcQueryResult[], documentNumber: string) {
  const landingsToUpdate: ICcQueryResult[] = findLandingsToUpdate(rawValidatedCertificates, documentNumber);

  if (!Array.isArray(landingsToUpdate) || landingsToUpdate.length === 0) {
    logger.info('[ONLINE-VALIDATION-REPORT][NO-OTHER-LANDINGS-TO-UPDATE]');
    return;
  }

  logger.info(`[ONLINE-VALIDATION-REPORT][OTHER-LANDINGS-TO-UPDATE][${landingsToUpdate.length}]`);

  const validatedCertificates = _(landingsToUpdate)
    .groupBy((landingValidation: ICcQueryResult) => landingValidation.documentNumber)
    .map((validatedLanding: ICcQueryResult, documentNumber: string) => ({ documentNumber: documentNumber, landings: validatedLanding }))
    .value();

  logger.info(`[ONLINE-VALIDATION-REPORT][OTHER-CC-TO-UPDATE][${validatedCertificates.length}]`);

  for (const landing in validatedCertificates) {
    logger.info(`[ONLINE-VALIDATION-REPORT][OTHER-CC-TO-UPDATING][${validatedCertificates[landing].documentNumber}]`);
    await reportCcLandingUpdate(validatedCertificates[landing].landings);
    await runUpdateForLandings(validatedCertificates[landing].landings, validatedCertificates[landing].documentNumber);
  }
}