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
  IDynamicsLandingCase,
  LandingOutcomeType,
  isSpeciesFailure,
  has14DayLimitReached,
  toFailureIrrespectiveOfRisk,
  ICountry,
  LandingRetrospectiveOutcomeType
} from "mmo-shared-reference-data";
import {
  CaseOneType,
  CaseOutcomeAtSubmission,
  CaseStatusAtSubmission,
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
import { CertificateCompany, CertificateAudit } from "../types/defraValidation";
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
  isRiskEnabled
} from "../query/isHighRisk";
import { IAuditEvent } from "../types/auditEvent";
import { isValidationOveruse } from "../query/ccQuery";

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

const pendingLandingDataRetrospectiveTransformation = (status: LandingStatusType) => {
  if (status === LandingStatusType.PendingLandingData_ElogSpecies) {
    return LandingStatusType.PendingLandingData
  } else if (status === LandingStatusType.PendingLandingData_DataExpected) {
    return LandingStatusType.PendingLandingData
  } else if (status === LandingStatusType.PendingLandingData_DataNotYetExpected) {
    return LandingStatusType.PendingLandingData
  } else {
    return status;
  }
}

export const isRejectedLanding = (ccQuery: ICcQueryResult): boolean => (isFailedWeightCheck(ccQuery)
  || isFailedSpeciesCheck(ccQuery)
  || isFailedNoLandingDataCheck(ccQuery)
  || isEmpty(ccQuery.extended.licenceHolder)) && !ccQuery.isPreApproved

export const daLookUp = postCodeDaLookup(postCodeToDa);

const getLegalTimeLimitStatus = (validatedLanding: ICcQueryResult) => {
  return validatedLanding.extended.vesselOverriddenByAdmin &&
    !validatedLanding.rssNumber
    ? false
    : validatedLanding.extended.isLegallyDue;
};

const isLandingRejectedOrVoided = (case2Type?: CaseTwoType): boolean => {
  return (
    case2Type === CaseTwoType.RealTimeValidation_Rejected ||
    case2Type === CaseTwoType.VoidByAdmin ||
    case2Type === CaseTwoType.VoidByExporter
  );
};

const buildValidationSection = (
  validatedLanding: ICcQueryResult,
  report: ICcBatchValidationReport,
  isLegallyDue: boolean,
  isDataNeverExpected: boolean,
): IDynamicsLanding['validation'] => {
  return {
    liveExportWeight: validatedLanding.weightOnCert,
    totalWeightForSpecies: report.aggregatedLandedDecWeight,
    totalLiveForExportSpecies:
      validatedLanding.isSpeciesExists &&
      validatedLanding.source === LandingSources.LandingDeclaration
        ? validatedLanding.weightOnLanding
        : undefined,
    totalEstimatedForExportSpecies: report.aggregatedEstimateWeight,
    totalEstimatedWithTolerance: report.aggregatedEstimateWeightPlusTolerance,
    totalRecordedAgainstLanding: validatedLanding.weightOnAllCerts,
    landedWeightExceededBy: report.exportedWeightExceedingEstimateLandedWeight
      ? Number(report.exportedWeightExceedingEstimateLandedWeight ?? 0)
      : Number(report.FI0_290_exportedWeightExceedingLandedWeight ?? 0),
    rawLandingsUrl:
      validatedLanding.isLandingExists && !isDataNeverExpected
        ? report.rawLandingsUrl.replace(
            '{BASE_URL}',
            ApplicationConfig.prototype.internalAppUrl,
          )
        : undefined,
    salesNoteUrl: validatedLanding.hasSalesNote
      ? report.salesNotesUrl.replace(
          '{BASE_URL}',
          ApplicationConfig.prototype.internalAppUrl,
        )
      : undefined,
    isLegallyDue: isLegallyDue,
  };
};

const buildRiskingSection = (
  validatedLanding: ICcQueryResult,
  riskScore: number,
): IDynamicsLanding['risking'] => {
  return {
    overuseInfo: validatedLanding.overUsedInfo.some(
      (_) => _ !== validatedLanding.documentNumber,
    )
      ? validatedLanding.overUsedInfo.filter(
          (_) => _ !== validatedLanding.documentNumber,
        )
      : undefined,
    vessel: getVesselOfInterestRiskScore(
      validatedLanding.extended.pln,
    ).toString(),
    speciesRisk: getExportedSpeciesRiskScore(
      validatedLanding.species,
    ).toString(),
    exporterRiskScore: getExporterBehaviourRiskScore(
      validatedLanding.extended.exporterAccountId,
      validatedLanding.extended.exporterContactId,
    ).toString(),
    landingRiskScore: riskScore.toString(),
    highOrLowRisk: isHighRisk(riskScore)
      ? LevelOfRiskType.High
      : LevelOfRiskType.Low,
    isSpeciesRiskEnabled: isRiskEnabled(),
  };
};

const addEEZCode = (acc: string, code: string) => acc ? `${acc},${code}` : code;
const buildEEZ = (countries: ICountry): string | undefined  => {
  if (!Array.isArray(countries) || countries.length === 0)
    return;

  return countries.reduce((acc: string, zone: ICountry) => {
    const code = zone.isoCodeAlpha3 ?? zone.isoCodeAlpha2;
    return code ?  addEEZCode(acc, code): acc;
  }, '');
}

export function toLanding(validatedLanding: ICcQueryResult, case2Type?: CaseTwoType): IDynamicsLanding {
  const ccBatchReportForLanding: ICcBatchValidationReport = Array.from(ccBatchReport([validatedLanding][Symbol.iterator]()))[0];
  const hasLegalTimeLimitPassed = getLegalTimeLimitStatus(validatedLanding);
  const riskScore = getTotalRiskScore(
    validatedLanding.extended.pln,
    validatedLanding.species,
    validatedLanding.extended.exporterAccountId,
    validatedLanding.extended.exporterContactId
  );

  const isDataNeverExpected = validatedLanding.extended.dataEverExpected === false;
  const isRejectedOrVoided = isLandingRejectedOrVoided(case2Type);
  return {
    status: toLandingStatus(validatedLanding, isHighRisk(riskScore)),
    id: validatedLanding.extended.landingId,
    startDate: validatedLanding.startDate,
    landingDate: validatedLanding.dateLanded,
    species: validatedLanding.species,
    cnCode: validatedLanding.extended.commodityCode,
    commodityCodeDescription: validatedLanding.extended.commodityCodeDescription,
    scientificName: validatedLanding.extended.scientificName,
    is14DayLimitReached: isRejectedOrVoided || has14DayLimitReached(validatedLanding, isDataNeverExpected) ? true : ccBatchReportForLanding.FI0_47_unavailabilityExceeds14Days === 'Fail',
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
    gearType: validatedLanding.gearType,
    highSeasArea: validatedLanding.extended.highSeasArea,
    exclusiveEconomicZones: buildEEZ(validatedLanding.extended.exclusiveEconomicZones),
    rfmo: validatedLanding.extended.rfmo,
    numberOfTotalSubmissions: validatedLanding.extended.numberOfSubmissions,
    vesselOverriddenByAdmin: validatedLanding.extended.vesselOverriddenByAdmin === true,
    speciesOverriddenByAdmin: validatedLanding.extended.speciesOverriddenByAdmin === true,
    dataEverExpected: !isDataNeverExpected,
    landingDataExpectedDate: validatedLanding.extended.landingDataExpectedDate,
    landingDataEndDate: validatedLanding.extended.landingDataEndDate,
    landingDataExpectedAtSubmission: !isDataNeverExpected ? isLandingDataExpectedAtSubmission(validatedLanding.createdAt, validatedLanding.extended.landingDataExpectedDate) : undefined,
    landingOutcomeAtSubmission: isRejectedLanding(validatedLanding) ? LandingOutcomeType.Rejected : LandingOutcomeType.Success,
    isLate: !isDataNeverExpected ? isLandingDataLate(validatedLanding.firstDateTimeLandingDataRetrieved, validatedLanding.extended.landingDataExpectedDate) : undefined,
    dateDataReceived: validatedLanding.firstDateTimeLandingDataRetrieved,
    validation: buildValidationSection(
      validatedLanding,
      ccBatchReportForLanding,
      hasLegalTimeLimitPassed,
      isDataNeverExpected,
    ),
    risking: buildRiskingSection(validatedLanding, riskScore),
    adminSpecies: validatedLanding.extended.speciesAdmin,
    adminState: validatedLanding.extended.stateAdmin,
    adminPresentation: validatedLanding.extended.presentationAdmin,
    adminCommodityCode: validatedLanding.extended.commodityCodeAdmin,
  };
}

function toLandingStatusAtSubmissionWithLandings(landings: IDynamicsLanding[]): CaseStatusAtSubmission {

  const isNoLandingData = landings.some((landing: IDynamicsLanding) => landing.status === LandingStatusType.ValidationFailure_NoLandingData);
  if (isNoLandingData) {
    return CaseStatusAtSubmission.ValidationFailure_NoLandingData;
  }

  const isValidationFailure = landings.some((landing: IDynamicsLanding) =>
    landing.status === LandingStatusType.ValidationFailure_Weight ||
    landing.status === LandingStatusType.ValidationFailure_Overuse ||
    landing.status === LandingStatusType.ValidationFailure_WeightAndOveruse ||
    landing.status === LandingStatusType.ValidationFailure_Species
  );

  if (isValidationFailure) {
    return CaseStatusAtSubmission.ValidationFailure;
  }

  const isPendingLandingData_DataExpected = landings.some((landing: IDynamicsLanding) => landing.status === LandingStatusType.PendingLandingData_DataExpected || landing.status === LandingStatusType.PendingLandingData_ElogSpecies);
  if (isPendingLandingData_DataExpected) {
    return CaseStatusAtSubmission.PendingLandingData_DataExpected;
  }

  const isPendingLandingData_DataNotYetExpected = landings.some((landing: IDynamicsLanding) => landing.status === LandingStatusType.PendingLandingData_DataNotYetExpected);
  if (isPendingLandingData_DataNotYetExpected) {
    return CaseStatusAtSubmission.PendingLandingData_DataNotYetExpected;
  }

  const isDataNeverExpected = landings.some((landing: IDynamicsLanding) => landing.status === LandingStatusType.DataNeverExpected);
  if (isDataNeverExpected) {
    return CaseStatusAtSubmission.DataNeverExpected;
  }

  return CaseStatusAtSubmission.ValidationSuccess;
}

function toLandingStatusAtSubmissionWithHighOrLowLandings(landings: IDynamicsLanding[]): CaseStatusAtSubmission {
  if (landings.some((_landing: IDynamicsLanding) => _landing.risking?.highOrLowRisk === LevelOfRiskType.High)) {
    return toLandingStatusAtSubmissionWithLandings(landings.filter((_landing: IDynamicsLanding) => _landing.risking?.highOrLowRisk === LevelOfRiskType.High));
  } else {
    return toLandingStatusAtSubmissionWithLandings(landings);
  }
}

export function toCaseStatusAtSubmission(landings: IDynamicsLanding[]): CaseStatusAtSubmission {
  if (landings.some((_landing: IDynamicsLanding) => _landing.landingOutcomeAtSubmission === LandingOutcomeType.Rejected)) {
    return toLandingStatusAtSubmissionWithHighOrLowLandings(landings.filter((_landing: IDynamicsLanding) => _landing.landingOutcomeAtSubmission === LandingOutcomeType.Rejected));
  } else {
    return toLandingStatusAtSubmissionWithHighOrLowLandings(landings);
  }
}

export function toCaseOutcomeAtSubmission(landings: IDynamicsLanding[]): CaseOutcomeAtSubmission {
  const isRejectedLandings = landings.some((landing: IDynamicsLanding) => landing.landingOutcomeAtSubmission === LandingOutcomeType.Rejected);
  return isRejectedLandings ? CaseOutcomeAtSubmission.Rejected : CaseOutcomeAtSubmission.Issued;
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

  const isRejected = validatedLandings.some((landing: ICcQueryResult) => isRejectedLanding(landing));

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
  const caseType2: CaseTwoType = liveReportType || toDynamicsCase2(validatedLandings)
  const landings: IDynamicsLanding[] = validatedLandings ? validatedLandings.map((validatedLanding: ICcQueryResult) => toLanding(validatedLanding, caseType2)) : null;

  const dynamicsCase: IDynamicsCatchCertificateCase = {
    documentNumber: catchCertificate.documentNumber,
    clonedFrom: catchCertificate.clonedFrom,
    landingsCloned: catchCertificate.landingsCloned,
    parentDocumentVoid: catchCertificate.parentDocumentVoid,
    caseType1: CaseOneType.CatchCertificate,
    caseType2,
    caseRiskAtSubmission: landings ? toCaseRisk(landings) : undefined,
    caseStatusAtSubmission: landings ? toCaseStatusAtSubmission(landings) : undefined,
    caseOutcomeAtSubmission: landings ? toCaseOutcomeAtSubmission(landings) : undefined,
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
  const landing: IDynamicsLanding = toLanding(validatedLanding);
  delete landing['landingOutcomeAtSubmission'];

  return {
    ...landing,
    status: pendingLandingDataRetrospectiveTransformation(landing.status),
    exporter: toExporter(catchCertificate),
    documentNumber: catchCertificate.documentNumber,
    documentDate: moment.utc(catchCertificate.createdAt).toISOString(),
    documentUrl: `${ApplicationConfig.prototype.externalAppUrl}/qr/export-certificates/${catchCertificate.documentUri}`,
    _correlationId: correlationId,
    requestedByAdmin: catchCertificate.requestByAdmin,
    numberOfFailedSubmissions: catchCertificate.numberOfFailedAttempts,
    exportedTo: toExportedTo(catchCertificate),
    landingOutcomeAtRetrospectiveCheck: isRejectedLanding(validatedLanding) ? LandingRetrospectiveOutcomeType.Failure : LandingRetrospectiveOutcomeType.Success
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
    id: validatedPsCatches.extended.id,
    foreignCatchCertificateNumber: validatedPsCatches.catchCertificateNumber,
    isDocumentIssuedInUK: validatedPsCatches.catchCertificateType === 'uk',
    issuingCountry: validatedPsCatches.catchCertificateType === 'uk' ? 'United Kingdom' : validatedPsCatches.issuingCountry?.officialCountryName,
    species: toSpeciesCode(validatedPsCatches.species),
    productDescription: validatedPsCatches.productDescription,
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
  const useProductsDescritpion = Array.isArray(processingStatement.exportData.products) && processingStatement.exportData.products.length > 0;
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
    numberOfFailedSubmissions: processingStatement.numberOfFailedAttempts ? processingStatement.numberOfFailedAttempts : 0,
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
    isDocumentIssuedInUK: validatedSdProducts.catchCertificateType === 'uk',
    species: toSpeciesCode(validatedSdProducts.species),
    id: validatedSdProducts.extended.id,
    cnCode: validatedSdProducts.commodityCode,
    scientificName: validatedSdProducts.scientificName,
    importedWeight: validatedSdProducts.weightOnFCC,
    exportedWeight: validatedSdProducts.weightOnDoc,
    productDescription: validatedSdProducts.productDescription,
    supportingDocuments: validatedSdProducts.supportingDocuments,
    netWeightProductArrival: validatedSdProducts.netWeightProductArrival ? parseInt(validatedSdProducts.netWeightProductArrival, 10) : undefined,
    netWeightFisheryProductArrival: validatedSdProducts.netWeightFisheryProductArrival ? parseInt(validatedSdProducts.netWeightFisheryProductArrival, 10) : undefined,
    netWeightProductDeparture: validatedSdProducts.netWeightProductDeparture ? parseInt(validatedSdProducts.netWeightProductDeparture, 10) : undefined,
    netWeightFisheryProductDeparture: validatedSdProducts.netWeightFisheryProductDeparture ? parseInt(validatedSdProducts.netWeightFisheryProductDeparture, 10) : undefined,
    validation: {
      totalWeightExported: validatedSdProducts.weightOnAllDocs,
      status: status,
      weightExceededAmount: validatedSdProducts.overAllocatedByWeight,
      overuseInfo: validatedSdProducts.overUsedInfo.some(_ => _ !== validatedSdProducts.documentNumber)
        ? validatedSdProducts.overUsedInfo.filter(_ => _ !== validatedSdProducts.documentNumber) : undefined
    },
    issuingCountry: validatedSdProducts.catchCertificateType === 'uk' ? 'United Kingdom' : validatedSdProducts.issuingCountry?.officialCountryName
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
    numberOfFailedSubmissions: storageDocument.numberOfFailedAttempts ? storageDocument.numberOfFailedAttempts : 0,
    documentNumber: storageDocument.documentNumber,
    clonedFrom: storageDocument.clonedFrom,
    parentDocumentVoid: storageDocument.parentDocumentVoid,
    companyName: storageDocument.exportData.exporterDetails.exporterCompanyName,
    products: validatedSdProducts ? validatedSdProducts.map(_ => toSdProduct(_)) : undefined,
    da: daLookUp(storageDocument.exportData.exporterDetails.postcode),
    _correlationId: correlationId,
    requestedByAdmin: storageDocument.requestByAdmin,
    exportedTo: storageDocument.exportData?.exportedTo ? toExportedToPsSd(storageDocument) : undefined,
    placeOfUnloading: storageDocument.exportData?.arrivalTransportation?.placeOfUnloading
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
    investigationStatus: systemAudit.data?.investigationStatus ?? undefined
  }

  return result;
}

export function toCaseRisk(landings: IDynamicsLanding[]): LevelOfRiskType {
  return landings.some((landing: IDynamicsLanding) => landing.risking.highOrLowRisk === LevelOfRiskType.High) ? LevelOfRiskType.High : LevelOfRiskType.Low;
}