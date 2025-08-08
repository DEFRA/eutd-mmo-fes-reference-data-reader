const _ = require('lodash');
const moment = require('moment');
import { isWithinDeminimus, isElog, ICcQueryResult, isSpeciesFailure } from 'mmo-shared-reference-data';
import {
  IOnlineValidationReportItem,
  IOnlineValidationReportItemKey,
  ValidationRules
} from '../types/onlineValidationReport'
import { ISdPsQueryResult } from '../types/query'
import { AuditEventTypes, IAuditEvent } from '../types/auditEvent';
import { DocumentStatuses } from '../types/document';
import { isHighRisk, getTotalRiskScore, isRiskEnabled } from '../query/isHighRisk';
import { getToLiveWeightFactor, getDataEverExpected, getLandingDataRuleDate, getVesselsIdx } from '../../data/cache';

import logger from '../../logger';
import { ILicence } from '../types/appConfig/vessels';

export function* unwindCatchCerts(catchCerts) {
  for (const catchCert of catchCerts) {
    const exportData = catchCert.exportData;

    const voidedEvent = getLastAuditEventIfExists(catchCert.audit, AuditEventTypes.Voided);
    const preApprovedEvent = getLastAuditEventIfExists(catchCert.audit, AuditEventTypes.PreApproved);

    for (const product of exportData.products) {
      yield* processProduct(product, catchCert, voidedEvent, preApprovedEvent);
    }
  }
}

function* processProduct(product, catchCert, voidedEvent, preApprovedEvent) {
  for (const caughtBy of product.caughtBy) {
    yield mapCaughtByToResult(caughtBy, product, catchCert, voidedEvent, preApprovedEvent);
  }
}

function mapCaughtByToResult(caughtBy, product, catchCert, voidedEvent, preApprovedEvent) {
  return {
    documentNumber: catchCert.documentNumber,
    createdAt: catchCert.createdAt,
    status: catchCert.status,
    speciesCode: product.speciesCode,
    factor: getToLiveWeightFactor(product.speciesCode, product?.state?.code, product?.presentation?.code),
    pln: caughtBy.pln,
    date: moment(caughtBy.date).format('YYYY-MM-DD'),
    weight: caughtBy.weight,
    extended: mapExtendedData(caughtBy, product, catchCert, voidedEvent, preApprovedEvent),
  };
}

function mapExtendedData(caughtBy, product, catchCert, voidedEvent, preApprovedEvent) {
  const exportData = catchCert.exportData;

  return {
    exporterContactId: exportData.exporterDetails?.contactId,
    exporterAccountId: exportData.exporterDetails?.accountId,
    exporterName: exportData.exporterDetails?.exporterFullName,
    exporterCompanyName: exportData.exporterDetails?.exporterCompanyName,
    exporterPostCode: exportData.exporterDetails?.exporterPostCode,
    vessel: caughtBy.vessel,
    landingId: caughtBy.id,
    landingStatus: caughtBy._status,
    pln: caughtBy.pln,
    fao: caughtBy.faoArea,
    flag: caughtBy.flag,
    cfr: caughtBy.cfr,
    highSeasArea: caughtBy.highSeasArea,
    exclusiveEconomicZones: caughtBy.exclusiveEconomicZones,
    rfmo: caughtBy.rfmo,
    presentation: product.presentation?.code,
    presentationName: product.presentation?.name,
    presentationAdmin: product.presentation?.admin,
    species: product.species,
    speciesAdmin: product.speciesAdmin,
    scientificName: product.scientificName,
    state: product.state?.code,
    stateName: product.state?.name,
    stateAdmin: product.state?.admin,
    commodityCode: product.commodityCode,
    commodityCodeAdmin: product.commodityCodeAdmin,
    commodityCodeDescription: product.commodityCodeDescription,
    url: catchCert.documentUri,
    investigation: catchCert.investigation,
    voidedBy: voidedEvent?.triggeredBy,
    preApprovedBy: preApprovedEvent?.triggeredBy,
    transportationVehicle: exportData.transportation?.vehicle,
    numberOfSubmissions: caughtBy.numberOfSubmissions,
    vesselOverriddenByAdmin: caughtBy.vesselOverriddenByAdmin,
    speciesOverriddenByAdmin: !!product.speciesAdmin || !!product.state?.admin || !!product.presentation?.admin || !!product.commodityCodeAdmin,
    licenceHolder: caughtBy.licenceHolder,
    dataEverExpected: caughtBy.dataEverExpected,
    landingDataExpectedDate: caughtBy.landingDataExpectedDate,
    landingDataEndDate: caughtBy.landingDataEndDate,
    isLegallyDue: caughtBy.isLegallyDue,
    vesselRiskScore: caughtBy.vesselRiskScore,
    exporterRiskScore: caughtBy.exporterRiskScore,
    speciesRiskScore: caughtBy.speciesRiskScore,
    threshold: caughtBy.threshold,
    riskScore: caughtBy.riskScore,
    isSpeciesRiskEnabled: caughtBy.isSpeciesRiskEnabled,
  };
}

function getLastAuditEventIfExists(audit, eventType) {
  return audit?.length ? getLastAuditEvent(audit, eventType) : undefined;
}

export function getLastAuditEvent(events: IAuditEvent[], eventType: string) {
  const matches = events.filter(_ => _.eventType === eventType);
  return matches[matches.length - 1];
}

export function* mapCatchCerts(unwoundCatchCerts, licenceLookup) {

  /*
   * Clean up the unwould catch certificates
   */
  for (const { documentNumber, createdAt, status, speciesCode, factor, pln, date, weight, extended } of unwoundCatchCerts) {
    const licence = licenceLookup(pln, date);
    const rssNumber = licence ? licence.rssNumber : undefined
    yield {
      documentNumber,
      createdAt,
      status,
      rssNumber,
      dateLanded: date,
      species: speciesCode,
      factor: factor,
      weight,
      da: licence ? licence.da : 'England',
      extended: {
        ...extended,
        homePort: licence?.homePort,
        flag: licence?.flag,
        imoNumber: licence?.imoNumber,
        licenceNumber: licence?.licenceNumber,
        licenceValidTo: licence?.licenceValidTo,
        licenceHolder: extended.vesselOverriddenByAdmin ? extended.licenceHolder : licence?.licenceHolder
      }
    }
  }
}

export const getLandingsFromCatchCerts = (
  catchCerts,
  licenceLookup: (pln: string, dateLanded: string) => any
): { dateLanded: string, pln: string, rssNumber: string }[] =>

  _.uniqBy(
    Array.from(unwindCatchCerts(catchCerts))
      .map(({ date, pln }) => {
        const licence = licenceLookup(pln, date)
        return {
          dateLanded: date,
          pln,
          rssNumber: licence ? licence.rssNumber : undefined,
        }
      }),
    JSON.stringify
  )


export function* groupCatchCertsByLanding(unwoundCatchCerts) {

  /*
   * group by landingId:  `${rssNumber}${dateLanded}`
   */

  let group: any[] = []
  let landingId

  for (const catchCert of unwoundCatchCerts) {

    const nextLandingId = `${catchCert.rssNumber}${catchCert.dateLanded}`

    if (nextLandingId !== landingId) {

      if (group.length > 0)
        yield [landingId, group]

      group = []
      landingId = nextLandingId
    }
    group.push(catchCert)
  }

  yield [landingId, group]

}

export function rawCatchCertToOnlineValidationReport(rawCatchCerts: ICcQueryResult[]): IOnlineValidationReportItem[] {
  const isFailedCert = (cert: ICcQueryResult) => (
    cert.isLandingExists &&
    (
      isSpeciesFailure(isHighRisk)(isRiskEnabled(), cert.isSpeciesExists, getTotalRiskScore(cert.extended.pln, cert.species, cert.extended.exporterAccountId, cert.extended.exporterContactId)) && !isElog(isWithinDeminimus)(cert) ||
      cert.isOverusedThisCert && isHighRisk(getTotalRiskScore(cert.extended.pln, cert.species, cert.extended.exporterAccountId, cert.extended.exporterContactId)) ||
      cert.isOverusedAllCerts
    )
  ) || (
      !cert.isLandingExists &&
      isHighRisk(getTotalRiskScore(cert.extended.pln, cert.species, cert.extended.exporterAccountId, cert.extended.exporterContactId)) &&
      ((cert.extended.dataEverExpected !== false && moment.utc(cert.createdAt).isSameOrAfter(moment.utc(cert.extended.landingDataExpectedDate), 'day')) || cert.extended.vesselOverriddenByAdmin)
    ) || (
      _.isEmpty(cert.extended.licenceHolder)
    );

  const failedCatchCerts: ICcQueryResult[] = rawCatchCerts.filter(cert => isFailedCert(cert));
  const uniqueSpeciesAndPresentations: IOnlineValidationReportItemKey[] = [];

  _getUniqueCertificatesBySpeciesPresentationAndState(failedCatchCerts, uniqueSpeciesAndPresentations)

  return uniqueSpeciesAndPresentations.map(key => {

    const failures: string[] = [];

    const certificatesForKey = failedCatchCerts.filter((cert: ICcQueryResult) =>
      cert.species === key.species
      && cert.extended.presentation === key.presentation
      && cert.extended.state === key.state
      && moment.utc(cert.dateLanded).isSame(key.date, 'day')
      && cert.extended.vessel === key.vessel);

    const certRiskScore = (cert: ICcQueryResult) =>
      getTotalRiskScore(cert.extended.pln, cert.species, cert.extended.exporterAccountId, cert.extended.exporterContactId);

    const certIsHighRisk = (cert: ICcQueryResult) =>
      isHighRisk(certRiskScore(cert))

    if (certificatesForKey.some((cert: ICcQueryResult) => cert.isLandingExists &&
      isSpeciesFailure(isHighRisk)(isRiskEnabled(), cert.isSpeciesExists, certRiskScore(cert)) &&
      !isElog(isWithinDeminimus)(cert))) {
      failures.push(ValidationRules.THREE_C);
    }

    if (certificatesForKey.some((cert: ICcQueryResult) => cert.isLandingExists &&
      cert.isOverusedThisCert &&
      certIsHighRisk(cert))) {
      failures.push(ValidationRules.THREE_D);
    }

    if (certificatesForKey.some((cert: ICcQueryResult) => cert.isLandingExists &&
      cert.isOverusedAllCerts)) {
      failures.push(ValidationRules.FOUR_A);
    }

    if (certificatesForKey.some((cert: ICcQueryResult) =>
      !cert.isLandingExists &&
      certIsHighRisk(cert) &&
      ((cert.extended.dataEverExpected !== false && moment.utc(cert.createdAt).isSameOrAfter(moment.utc(cert.extended.landingDataExpectedDate), 'day')) || cert.extended.vesselOverriddenByAdmin))) {
      failures.push(ValidationRules.NO_DATA);
    }

    if (certificatesForKey.some((cert: ICcQueryResult) => _.isEmpty(cert.extended.licenceHolder))) {
      failures.push(ValidationRules.NO_LICENCE_HOLDER);
    }

    return {
      species: key.species,
      presentation: key.presentation,
      state: key.state,
      date: key.date,
      vessel: key.vessel,
      failures: failures
    }
  });
}

export function rawForeignCatchCertToOnlineReport(rawOnlineValidation: ISdPsQueryResult[]) {
  const failedCertificates = rawOnlineValidation.filter(_ => _.isOverAllocated || _.isMismatch);
  const result = {
    isValid: true,
    details: [],
    rawData: rawOnlineValidation
  };

  if (failedCertificates && failedCertificates.length > 0) {
    result.isValid = false;
    result.details = failedCertificates.map(cert => ({
      certificateNumber: cert.catchCertificateNumber.toUpperCase(),
      product: cert.species
    }))
  } else {
    result.rawData.forEach(_ => _.status = DocumentStatuses.Complete);
  }
  return result;
}

function _getUniqueCertificatesBySpeciesPresentationAndState(failedCatchCerts, uniqueSpeciesAndPresentations) {
  return failedCatchCerts.forEach(cert => {
    const elementIsAlreadyThere = uniqueSpeciesAndPresentations.find(element =>
      element.species === cert.species
      && element.presentation === cert.extended.presentation
      && element.state === cert.extended.state
      && element.vessel === cert.extended.vessel
      && moment.utc(element.date).isSame(moment.utc(cert.dateLanded), 'day'));

    if (!elementIsAlreadyThere)
      uniqueSpeciesAndPresentations.push({
        species: cert.species,
        presentation: cert.extended.presentation,
        state: cert.extended.state,
        date: moment.utc(cert.dateLanded).toDate(),
        vessel: cert.extended.vessel
      });
  });
}


/*
 * how to reuse this from VesselService? when this one supports injection?
 */

export function vesselLookup(vesselsIdx): (pln: string, date: string) => ILicence {

  return (pln: string, date: string) => {

    const licences = vesselsIdx(pln);

    if (!licences) {
      logger.error(`[VESSEL-LOOKUP][NOT-FOUND][${pln}:${date}]`);
      return undefined;
    }

    for (const licence of licences) {
      if (licence.validFrom <= date && date <= licence.validTo) {
        return {
          rssNumber: licence.rssNumber,
          da: licence.da,
          homePort: licence.homePort,
          flag: licence.flag,
          imoNumber: licence.imoNumber,
          licenceNumber: licence.number,
          licenceValidTo: licence.validTo,
          licenceHolder: licence.holder,
          vesselLength: licence.vesselLength
        }
      }
    }
  }
}

/*
 * exportPayload is the payload that comes from redis
*/
export function mapExportPayloadToCC(redisData) {
  const products = redisData.exportPayload.items.map(item => ({
    speciesCode: item.product.species.code,
    species: item.product.species.label,
    speciesAdmin: item.product.species.admin,
    scientificName: item.product.scientificName,
    commodityCode: item.product.commodityCode,
    commodityCodeAdmin: item.product.commodityCodeAdmin,
    commodityCodeDescription: item.product.commodityCodeDescription,
    state: {
      code: item.product.state.code,
      name: item.product.state.label,
      admin: item.product.state.admin
    },
    presentation: {
      code: item.product.presentation.code,
      name: item.product.presentation.label,
      admin: item.product.presentation.admin
    },
    factor: getToLiveWeightFactor(item.product.species.code, item.product.state.code, item.product.presentation.code),
    caughtBy: item.landings.map(landing => {
      const dateLanded = moment(landing.model.dateLanded).format('YYYY-MM-DD');
      const licenceLookup = vesselLookup(getVesselsIdx());
      const licence: ILicence = licenceLookup(landing.model.vessel.pln, dateLanded);
      const dataEverExpected = licence ? getDataEverExpected(licence) : false;
      const landingDataExpectedDate = dataEverExpected ? getLandingDataRuleDate(dateLanded, licence, 'expectedDate') : undefined;
      const landingDataEndDate = dataEverExpected ? getLandingDataRuleDate(dateLanded, licence, 'endDate', landingDataExpectedDate) : undefined;
      const numberOfSubmissions = parseInt(landing.model.numberOfSubmissions, 10) + 1;

      return {
        id: landing.model.id,
        vessel: landing.model.vessel.vesselName,
        pln: landing.model.vessel.pln,
        cfr: landing.model.vessel.cfr,
        flag: landing.model.vessel.flag,
        startDate: landing.model.startDate,
        date: dateLanded,
        weight: landing.model.exportWeight,
        gearType: landing.model.gearType,
        highSeasArea: landing.model.highSeasArea,
        exclusiveEconomicZones: landing.model.exclusiveEconomicZones,
        rfmo: landing.model.rfmo,
        faoArea: landing.model.faoArea,
        numberOfSubmissions,
        vesselOverriddenByAdmin: landing.model.vessel.vesselOverriddenByAdmin,
        licenceHolder: landing.model.vessel.licenceHolder,
        isLegallyDue: landing.model.isLegallyDue,
        vesselRiskScore: landing.model.vesselRiskScore,
        exporterRiskScore: landing.model.exporterRiskScore,
        speciesRiskScore: landing.model.speciesRiskScore,
        threshold: landing.model.threshold,
        riskScore: landing.model.riskScore,
        isSpeciesRiskEnabled: landing.model.isSpeciesRiskEnabled,
        dataEverExpected,
        landingDataExpectedDate,
        landingDataEndDate
      }
    })
  }))

  return {
    documentNumber: redisData.documentNumber,
    createdAt: moment.utc().toISOString(),
    exportData: {
      products,
      exporterDetails: {
        contactId: redisData.exporter.contactId,
        accountId: redisData.exporter.accountId,
        exporterFullName: redisData.exporter.exporterFullName,
        exporterCompanyName: redisData.exporter.exporterCompanyName,
        exporterPostCode: redisData.exporter.postcode
      },
      transportation: redisData.transport
    }
  }
}

export function mapRedisPSSDToDomainPSSD(documentType, redisPS, catches) {
  return {
    __t: documentType,
    documentNumber: redisPS.documentNumber,
    status: DocumentStatuses.Draft,
    exportData: {
      exporterDetails: {
        postcode: redisPS.exporter.postcode,
        exporterCompanyName: redisPS.exporter.exporterCompanyName
      },
      catches: catches
    }
  }
}

export function mapProcessingStatementToPS(redisPS) {
  return mapRedisPSSDToDomainPSSD("processingStatement", redisPS,
    redisPS.catches.map(_ => ({
      catchCertificateNumber: _.catchCertificateNumber.toUpperCase(),
      catchCertificateType: _.catchCertificateType,
      species: _.species,
      scientificName: _.scientificName,
      id: _.id,
      totalWeightLanded: _.totalWeightLanded,
      exportWeightBeforeProcessing: _.exportWeightBeforeProcessing,
      exportWeightAfterProcessing: _.exportWeightAfterProcessing
    })));
}

export function mapStorageDocumentToSD(redisSD) {
  return mapRedisPSSDToDomainPSSD("storageDocument", redisSD,
    redisSD.catches.map(_ => ({
      certificateNumber: _.certificateNumber.toUpperCase(),
      certificateType: _.certificateType,
      id: _.id,
      product: _.product,
      productWeight: _.productWeight,
      weightOnCC: _.weightOnCC,
      commodityCode: _.commodityCode,
      dateOfUnloading: _.dateOfUnloading,
      placeOfUnloading: _.placeOfUnloading,
      transportUnloadedFrom: _.transportUnloadedFrom,
      scientificName: _.scientificName
    })));
}

