import moment = require('moment');
import { isEmpty } from "lodash";
import {
  ccBatchReport,
  isElog,
  isWithinDeminimus,
  isInRetrospectivePeriod,
  toLandingStatus,
  toExporter,
  isLandingDataLate,
  toExportedTo,
  isLandingDataExpectedAtSubmission,
  postCodeDaLookup,
  postCodeToDa,
  TRANSPORT_VEHICLE_DIRECT,
  ICcQueryResult,
  IDynamicsLanding,
  LandingStatusType,
  LevelOfRiskType,
  IDynamicsLandingCase
} from "mmo-shared-reference-data";
import {
  CaseOneType,
  CaseTwoType,
  IDynamicsCatchCertificateCase
} from "../types/dynamicsCcCase";
import {
  IDynamicsProcessingStatementCase,
  IDynamicsProcessingStatementCatch,
  IDynamicsStorageDocumentCase,
  IDynamicsStorageDocumentProduct,
  SdPsCaseTwoType,
  SdPsStatus
} from "../types/dynamicsSdPsCase";
import { ICcBatchValidationReport, ISdPsQueryResult } from "../types/query";
import { CertificateCompany } from "../types/defraValidation";
import { LandingSources } from "../types/landing";
import { ApplicationConfig } from "../../config";
import { DocumentStatuses, IDocument } from "../types/document";
import { getVesselLength } from "../../handler/vesselService";
import {
  getExportedSpeciesRiskScore,
  getExporterBehaviourRiskScore,
  getTotalRiskScore,
  getVesselOfInterestRiskScore,
  isHighRisk,
  isRiskEnabled,
  isSpeciesFailure
} from "../query/isHighRisk";
import { IAuditEvent } from "../types/auditEvent";
import { CertificateAudit } from "../types/defraValidation";
import { ICountry } from "../types/appConfig/countries";
import { isValidationOveruse } from "../query/ccQuery";

export function toLanding(validatedLanding: ICcQueryResult): IDynamicsLanding {
  const ccBatchReportForLanding: ICcBatchValidationReport = Array.from(ccBatchReport([validatedLanding][Symbol.iterator]()))[0];
  const hasLegalTimeLimitPassed = (validatedLanding.extended.vesselOverriddenByAdmin && !validatedLanding.rssNumber) ? false : validatedLanding.extended.isLegallyDue;

  const riskScore = getTotalRiskScore(
    validatedLanding.extended.pln,
    validatedLanding.species,
    validatedLanding.extended.exporterAccountId,
    validatedLanding.extended.exporterContactId);


  const has14DayLimitReached: (item: ICcQueryResult, landingDataNotExpected: boolean) => boolean = (item: ICcQueryResult, landingDataNotExpected: boolean) =>
    landingDataNotExpected || !isInRetrospectivePeriod(moment.utc(), item) ? true : item.isLandingExists;

  const isDataNeverExpected = validatedLanding.extended.dataEverExpected === false;
  const landingStatus = toLandingStatus(validatedLanding, isHighRisk(riskScore));
  return {
    status: landingStatus,
    id: validatedLanding.extended.landingId,
    landingDate: validatedLanding.dateLanded,
    species: validatedLanding.species,
    cnCode: validatedLanding.extended.commodityCode,
    commodityCodeDescription: validatedLanding.extended.commodityCodeDescription,
    scientificName: validatedLanding.extended.scientificName,
    is14DayLimitReached: has14DayLimitReached(validatedLanding, isDataNeverExpected) ? true : ccBatchReportForLanding.FI0_47_unavailabilityExceeds14Days === 'Fail',
    state: validatedLanding.extended.state,
    presentation: validatedLanding.extended.presentation,
    vesselName: validatedLanding.extended.vessel,
    vesselPln: validatedLanding.extended.pln,
    vesselLength: getVesselLength(validatedLanding.extended.pln, validatedLanding.dateLanded),
    vesselAdministration: validatedLanding.da,
    licenceHolder: validatedLanding.extended.licenceHolder,
    source: validatedLanding.isLandingExists ? validatedLanding.source : undefined,
    speciesAlias: validatedLanding.speciesAlias,
    speciesAnomaly: validatedLanding.speciesAnomaly,
    weight: validatedLanding.rawWeightOnCert,
    numberOfTotalSubmissions: validatedLanding.extended.numberOfSubmissions,
    vesselOverriddenByAdmin: validatedLanding.extended.vesselOverriddenByAdmin === true,
    speciesOverriddenByAdmin: validatedLanding.extended.speciesOverriddenByAdmin === true,
    dataEverExpected: !isDataNeverExpected,
    landingDataExpectedDate: validatedLanding.extended.landingDataExpectedDate,
    landingDataEndDate: validatedLanding.extended.landingDataEndDate,
    landingDataExpectedAtSubmission: !isDataNeverExpected ? isLandingDataExpectedAtSubmission(validatedLanding.createdAt, validatedLanding.extended.landingDataExpectedDate) : undefined,
    isLate: !isDataNeverExpected ? isLandingDataLate(validatedLanding.firstDateTimeLandingDataRetrieved, validatedLanding.extended.landingDataExpectedDate) : undefined,
    dateDataReceived: validatedLanding.firstDateTimeLandingDataRetrieved,
    validation: {
      liveExportWeight: validatedLanding.weightOnCert,
      totalWeightForSpecies: ccBatchReportForLanding.aggregatedLandedDecWeight,
      totalLiveForExportSpecies: validatedLanding.isSpeciesExists && validatedLanding.source === LandingSources.LandingDeclaration
        ? validatedLanding.weightOnLanding : undefined,
      totalEstimatedForExportSpecies: ccBatchReportForLanding.aggregatedEstimateWeight,
      totalEstimatedWithTolerance: ccBatchReportForLanding.aggregatedEstimateWeightPlusTolerance,
      totalRecordedAgainstLanding: validatedLanding.weightOnAllCerts,
      landedWeightExceededBy: ccBatchReportForLanding.exportedWeightExceedingEstimateLandedWeight ? Number(ccBatchReportForLanding.exportedWeightExceedingEstimateLandedWeight ?? 0) : Number(ccBatchReportForLanding.FI0_290_exportedWeightExceedingLandedWeight ?? 0),
      rawLandingsUrl: validatedLanding.isLandingExists && !isDataNeverExpected ? ccBatchReportForLanding.rawLandingsUrl.replace('{BASE_URL}', ApplicationConfig.prototype.internalAppUrl) : undefined,
      salesNoteUrl: validatedLanding.hasSalesNote ? ccBatchReportForLanding.salesNotesUrl.replace('{BASE_URL}', ApplicationConfig.prototype.internalAppUrl) : undefined,
      isLegallyDue: hasLegalTimeLimitPassed
    },
    risking: {
      overuseInfo: validatedLanding.overUsedInfo.some(_ => _ !== validatedLanding.documentNumber)
        ? validatedLanding.overUsedInfo.filter(_ => _ !== validatedLanding.documentNumber) : undefined,
      vessel: getVesselOfInterestRiskScore(validatedLanding.extended.pln).toString(),
      speciesRisk: getExportedSpeciesRiskScore(validatedLanding.species).toString(),
      exporterRiskScore: getExporterBehaviourRiskScore(validatedLanding.extended.exporterAccountId, validatedLanding.extended.exporterContactId).toString(),
      landingRiskScore: riskScore.toString(),
      highOrLowRisk: isHighRisk(riskScore) ? LevelOfRiskType.High : LevelOfRiskType.Low,
      isSpeciesRiskEnabled: isRiskEnabled()
    },
    adminSpecies: validatedLanding.extended.speciesAdmin,
    adminState: validatedLanding.extended.stateAdmin,
    adminPresentation: validatedLanding.extended.presentationAdmin,
    adminCommodityCode: validatedLanding.extended.commodityCodeAdmin,
  };
}

export function toDynamicsCase2(validatedLandings: ICcQueryResult[]): CaseTwoType {
  let caseType2Status: CaseTwoType = CaseTwoType.Success;

  const dataNeverExpected = validatedLandings.some((landing: ICcQueryResult) => landing.extended.dataEverExpected === false &&
    isHighRisk(getTotalRiskScore(landing.extended.pln, landing.species, landing.extended.exporterAccountId, landing.extended.exporterContactId)));

  if (dataNeverExpected) {
    caseType2Status = CaseTwoType.DataNeverExpected;
  }

  const isPendingLandingData = validatedLandings.some((landing: ICcQueryResult) =>
    (landing.extended.dataEverExpected !== false && !landing.isLandingExists) || isElog(isWithinDeminimus)(landing) && isInRetrospectivePeriod(moment.utc(), landing));

  if (isPendingLandingData) {
    caseType2Status = CaseTwoType.PendingLandingData;
  }

  const isOveruseFailure = validatedLandings.some((landing: ICcQueryResult) => isValidationOveruse(landing));

  if (isOveruseFailure) {
    caseType2Status = CaseTwoType.RealTimeValidation_Overuse;
  }

  const isNoLandingDataAvailable = (ccQuery: ICcQueryResult) =>
    ccQuery.extended.dataEverExpected !== false &&
    moment.utc(ccQuery.createdAt).isAfter(moment.utc(ccQuery.extended.landingDataEndDate), 'day')

  const isNoLandingData = validatedLandings.some((landing: ICcQueryResult) =>
    !landing.isLandingExists && isNoLandingDataAvailable(landing))

  if (isNoLandingData) {
    caseType2Status = CaseTwoType.RealTimeValidation_NoLandingData;
  }

  const isFailedWeightCheck = (ccQueryLanding: ICcQueryResult) =>
    ccQueryLanding.isSpeciesExists &&
    ccQueryLanding.isOverusedThisCert &&
    isHighRisk(getTotalRiskScore(ccQueryLanding.extended.pln, ccQueryLanding.species, ccQueryLanding.extended.exporterAccountId, ccQueryLanding.extended.exporterContactId))

  const isFailedSpeciesCheck = (ccQueryLanding: ICcQueryResult) =>
    isSpeciesFailure(isHighRisk)(isRiskEnabled(), ccQueryLanding.isSpeciesExists, getTotalRiskScore(ccQueryLanding.extended.pln, ccQueryLanding.species, ccQueryLanding.extended.exporterAccountId, ccQueryLanding.extended.exporterContactId)) &&
    !isElog(isWithinDeminimus)(ccQueryLanding) &&
    ccQueryLanding.isLandingExists

  const isFailedNoLandingDataCheck = (ccQueryLanding: ICcQueryResult) =>
    !ccQueryLanding.isLandingExists &&
    isHighRisk(getTotalRiskScore(ccQueryLanding.extended.pln, ccQueryLanding.species, ccQueryLanding.extended.exporterAccountId, ccQueryLanding.extended.exporterContactId)) &&
    ((ccQueryLanding.extended.dataEverExpected !== false && isLandingDataExpectedAtSubmission(ccQueryLanding.createdAt, ccQueryLanding.extended.landingDataExpectedDate)) || ccQueryLanding.extended.vesselOverriddenByAdmin)

  const isRejected = validatedLandings.some((landing: ICcQueryResult) => isFailedWeightCheck(landing))
    || validatedLandings.some((landing: ICcQueryResult) => isFailedSpeciesCheck(landing))
    || validatedLandings.some((landing: ICcQueryResult) => isFailedNoLandingDataCheck(landing))
    || validatedLandings.some((landing: ICcQueryResult) => isEmpty(landing.extended.licenceHolder));

  const isDocumentPreApproved = validatedLandings.some(landing => landing.isPreApproved);

  if (isRejected && !isDocumentPreApproved) {
    caseType2Status = CaseTwoType.RealTimeValidation_Rejected;
  }

  return caseType2Status;
}

export function toExporterPsSd(psSdCertificate: any): CertificateCompany {
  return {
    companyName: psSdCertificate.exportData.exporterDetails.exporterCompanyName,
    contactId: psSdCertificate.exportData.exporterDetails.contactId,
    accountId: psSdCertificate.exportData.exporterDetails.accountId,
    address: {
      building_number: psSdCertificate.exportData.exporterDetails.buildingNumber,
      sub_building_name: psSdCertificate.exportData.exporterDetails.subBuildingName,
      building_name: psSdCertificate.exportData.exporterDetails.buildingName,
      street_name: psSdCertificate.exportData.exporterDetails.streetName,
      county: psSdCertificate.exportData.exporterDetails.county,
      country: psSdCertificate.exportData.exporterDetails.country,
      line1: psSdCertificate.exportData.exporterDetails.addressOne,
      city: psSdCertificate.exportData.exporterDetails.townCity,
      postCode: psSdCertificate.exportData.exporterDetails.postcode
    },
    dynamicsAddress: psSdCertificate.exportData.exporterDetails._dynamicsAddress
  };
}

export function toExportedToPsSd(psSdCertificate: IDocument): ICountry {
  return {
    officialCountryName: psSdCertificate.exportData?.exportedTo?.officialCountryName,
    isoCodeAlpha2: psSdCertificate.exportData?.exportedTo?.isoCodeAlpha2,
    isoCodeAlpha3: psSdCertificate.exportData?.exportedTo?.isoCodeAlpha3
  }
}

export function toDynamicsCcCase(
  validatedLandings: ICcQueryResult[] | null,
  catchCertificate: IDocument,
  correlationId: string,
  liveReportType?: CaseTwoType
): IDynamicsCatchCertificateCase {
  const daLookUp = postCodeDaLookup(postCodeToDa);
  const landings: IDynamicsLanding[] = validatedLandings ? validatedLandings.map(_ => toLanding(_)) : null;

  const dynamicsCase: IDynamicsCatchCertificateCase = {
    documentNumber: catchCertificate.documentNumber,
    clonedFrom: catchCertificate.clonedFrom,
    landingsCloned: catchCertificate.landingsCloned,
    parentDocumentVoid: catchCertificate.parentDocumentVoid,
    caseType1: CaseOneType.CatchCertificate,
    caseType2: liveReportType || toDynamicsCase2(validatedLandings),
    numberOfFailedSubmissions: catchCertificate.numberOfFailedAttempts,
    isDirectLanding: validatedLandings ? validatedLandings.some(landing => landing.extended.transportationVehicle === TRANSPORT_VEHICLE_DIRECT) : false,
    documentUrl: catchCertificate.status === DocumentStatuses.Complete ? `${ApplicationConfig.prototype.externalAppUrl}/qr/export-certificates/${catchCertificate.documentUri}` : undefined,
    documentDate: moment.utc(catchCertificate.createdAt).toISOString(),
    exporter: toExporter(catchCertificate),
    landings: landings,
    _correlationId: correlationId,
    requestedByAdmin: catchCertificate.requestByAdmin,
    isUnblocked: validatedLandings ? validatedLandings.some(landing => landing.isPreApproved) : undefined,
    audits: catchCertificate.audit.length ? catchCertificate.audit.map(_ => toAudit(_)) : undefined,
    da: daLookUp(catchCertificate.exportData.exporterDetails.postcode),
    vesselOverriddenByAdmin: validatedLandings ? validatedLandings.some((landing: ICcQueryResult) => landing.extended.vesselOverriddenByAdmin) : undefined,
    speciesOverriddenByAdmin: validatedLandings ? validatedLandings.some((landing: ICcQueryResult) => landing.extended.speciesOverriddenByAdmin) : undefined,
    failureIrrespectiveOfRisk: landings ? toFailureIrrespectiveOfRisk(landings) : false,
    exportedTo: toExportedTo(catchCertificate)
  };

  return dynamicsCase;

}

export function toDynamicsLandingCase(
  validatedLanding: ICcQueryResult,
  catchCertificate: IDocument,
  correlationId: string
): IDynamicsLandingCase {
  const landing = toLanding(validatedLanding);

  return {
    ...landing,
    exporter: toExporter(catchCertificate),
    documentNumber: catchCertificate.documentNumber,
    documentDate: moment.utc(catchCertificate.createdAt).toISOString(),
    documentUrl: `${ApplicationConfig.prototype.externalAppUrl}/qr/export-certificates/${catchCertificate.documentUri}`,
    _correlationId: correlationId,
    requestedByAdmin: catchCertificate.requestByAdmin,
    numberOfFailedSubmissions: catchCertificate.numberOfFailedAttempts,
    exportedTo: toExportedTo(catchCertificate)
  };
}

export function toDynamicsLandingDetails(
  validatedLandings: ICcQueryResult[],
  catchCertificate: IDocument,
  correlationId: string
): IDynamicsLandingCase[] {
  return validatedLandings.map((queryRes: ICcQueryResult) =>
    toDynamicsLandingCase(
      queryRes,
      catchCertificate,
      correlationId
    )
  );
}

export function toPsCatch(validatedPsCatches: ISdPsQueryResult): IDynamicsProcessingStatementCatch {

  let status = SdPsStatus.Success;

  if (validatedPsCatches.isMismatch) {
    status = SdPsStatus.Weight
  }

  if (validatedPsCatches.isOverAllocated) {
    status = SdPsStatus.Overuse
  }

  return {
    foreignCatchCertificateNumber: validatedPsCatches.catchCertificateNumber,
    isDocumentIssuedInUK: validatedPsCatches.catchCertificateType === 'uk',
    species: toSpeciesCode(validatedPsCatches.species),
    id: validatedPsCatches.extended.id,
    cnCode: validatedPsCatches.commodityCode,
    scientificName: validatedPsCatches.scientificName,
    importedWeight: validatedPsCatches.weightOnFCC,
    usedWeightAgainstCertificate: validatedPsCatches.weightOnDoc,
    processedWeight: validatedPsCatches.weightAfterProcessing,
    validation: {
      status: status,
      totalUsedWeightAgainstCertificate: validatedPsCatches.weightOnAllDocs,
      weightExceededAmount: validatedPsCatches.overAllocatedByWeight,
      overuseInfo: validatedPsCatches.overUsedInfo.some(_ => _ !== validatedPsCatches.documentNumber)
        ? validatedPsCatches.overUsedInfo.filter(_ => _ !== validatedPsCatches.documentNumber) : undefined
    }
  }
}

export function toSdPsCaseTwoType(validatedSdPsCatches: ISdPsQueryResult[]) {
  let output = SdPsCaseTwoType.RealTimeValidation_Success;

  const isMisMatch = validatedSdPsCatches.filter(_ => _.isMismatch).length > 0;
  const isOverUse = validatedSdPsCatches.filter(_ => _.isOverAllocated).length > 0;

  if (isMisMatch) output = SdPsCaseTwoType.RealTimeValidation_Weight;
  if (isOverUse) output = SdPsCaseTwoType.RealTimeValidation_Overuse;

  return output;
}

export function toDynamicsPs(
  validatedPsCatches: ISdPsQueryResult[] | null,
  processingStatement: IDocument,
  correlationId: string,
  caseTypeTwo?: SdPsCaseTwoType
): IDynamicsProcessingStatementCase {
  const daLookUp = postCodeDaLookup(postCodeToDa);
  const useProductsDescritpion = Array.isArray(processingStatement.exportData.products) &&  processingStatement.exportData.products.length > 0;
  const productDescription = useProductsDescritpion
    ? processingStatement.exportData.products.reduce((accumulator, currentValue, currentIndex) => {
        if (currentIndex === processingStatement.exportData.products.length - 1) {
          return (
            accumulator +
            `${currentValue.commodityCode} ${currentValue.description}`
          );
        }
        return (
          accumulator +
          `${currentValue.commodityCode} ${currentValue.description}, `
        );
      }, "")
    : null;

  return {
    exporter: toExporterPsSd(processingStatement),
    documentUrl: `${ApplicationConfig.prototype.externalAppUrl}/qr/export-certificates/${processingStatement.documentUri}`,
    documentDate: moment.utc(processingStatement.createdAt).toISOString(),
    caseType1: CaseOneType.ProcessingStatement,
    caseType2: caseTypeTwo || toSdPsCaseTwoType(validatedPsCatches),
    numberOfFailedSubmissions: processingStatement.numberOfFailedAttempts,
    documentNumber: processingStatement.documentNumber,
    plantName: processingStatement.exportData.plantName,
    personResponsible: processingStatement.exportData.personResponsibleForConsignment,
    processedFisheryProducts: useProductsDescritpion ? productDescription : processingStatement.exportData.consignmentDescription,
    catches: validatedPsCatches ? validatedPsCatches.map(_ => toPsCatch(_)) : undefined,
    da: daLookUp(processingStatement.exportData.exporterDetails.postcode),
    _correlationId: correlationId,
    requestedByAdmin: processingStatement.requestByAdmin,
    exportedTo: toExportedToPsSd(processingStatement),
    clonedFrom: processingStatement.clonedFrom,
    parentDocumentVoid: processingStatement.parentDocumentVoid
  };
}

export function toSdProduct(validatedSdProducts: ISdPsQueryResult): IDynamicsStorageDocumentProduct {

  let status = SdPsStatus.Success;

  if (validatedSdProducts.isMismatch) {
    status = SdPsStatus.Weight
  }

  if (validatedSdProducts.isOverAllocated) {
    status = SdPsStatus.Overuse
  }

  return {
    foreignCatchCertificateNumber: validatedSdProducts.catchCertificateNumber,
    isDocumentIssuedInUK: validatedSdProducts.catchCertificateType  === 'uk',
    species: toSpeciesCode(validatedSdProducts.species),
    id: validatedSdProducts.extended.id,
    cnCode: validatedSdProducts.commodityCode,
    scientificName: validatedSdProducts.scientificName,
    importedWeight: validatedSdProducts.weightOnFCC,
    exportedWeight: validatedSdProducts.weightOnDoc,
    validation: {
      totalWeightExported: validatedSdProducts.weightOnAllDocs,
      status: status,
      weightExceededAmount: validatedSdProducts.overAllocatedByWeight,
      overuseInfo: validatedSdProducts.overUsedInfo.some(_ => _ !== validatedSdProducts.documentNumber)
        ? validatedSdProducts.overUsedInfo.filter(_ => _ !== validatedSdProducts.documentNumber) : undefined
    }
  }
}

export function toDynamicsSd(
  validatedSdProducts: ISdPsQueryResult[] | null,
  storageDocument: IDocument,
  correlationId: string,
  caseTypeTwo?: SdPsCaseTwoType
): IDynamicsStorageDocumentCase {
  const daLookUp = postCodeDaLookup(postCodeToDa);

  return {
    exporter: toExporterPsSd(storageDocument),
    documentUrl: `${ApplicationConfig.prototype.externalAppUrl}/qr/export-certificates/${storageDocument.documentUri}`,
    documentDate: moment.utc(storageDocument.createdAt).toISOString(),
    caseType1: CaseOneType.StorageDocument,
    caseType2: caseTypeTwo || toSdPsCaseTwoType(validatedSdProducts),
    numberOfFailedSubmissions: storageDocument.numberOfFailedAttempts,
    documentNumber: storageDocument.documentNumber,
    clonedFrom: storageDocument.clonedFrom,
    parentDocumentVoid: storageDocument.parentDocumentVoid,
    companyName: storageDocument.exportData.exporterDetails.exporterCompanyName,
    products: validatedSdProducts ? validatedSdProducts.map(_ => toSdProduct(_)) : undefined,
    da: daLookUp(storageDocument.exportData.exporterDetails.postcode),
    _correlationId: correlationId,
    requestedByAdmin: storageDocument.requestByAdmin,
    exportedTo: toExportedToPsSd(storageDocument)
  };
}

export function toSpeciesCode(speciesWithCode: string | undefined): string | undefined {
  if (speciesWithCode) {
    const regex = /(.*) \((.*)\)/g;
    const matches = regex.exec(speciesWithCode);
    if (matches && matches.length >= 3) {
      return matches[2];
    }
  }
}

export function toAudit(systemAudit: IAuditEvent): CertificateAudit {
  const result: CertificateAudit = {
    auditOperation: systemAudit.eventType,
    user: systemAudit.triggeredBy,
    auditAt: systemAudit.timestamp,
    investigationStatus: systemAudit.data && systemAudit.data.investigationStatus ? systemAudit.data.investigationStatus : undefined
  }

  return result;
}

export function toFailureIrrespectiveOfRisk(landings: IDynamicsLanding[]): boolean {
  return landings.some(landing => [
    LandingStatusType.ValidationFailure_Weight,
    LandingStatusType.ValidationFailure_Species,
    LandingStatusType.ValidationFailure_NoLandingData,
    LandingStatusType.ValidationFailure_NoLicenceHolder
  ].includes(landing.status));
}