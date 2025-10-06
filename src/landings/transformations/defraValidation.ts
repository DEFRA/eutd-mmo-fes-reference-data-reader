import moment from 'moment';
import { isEmpty } from 'lodash';
import {
   ccBatchReport,
   isLandingDataLate,
   postCodeToDa,
   postCodeDaLookup,
   getIsLegallyDue,
   ICcQueryResult,
   LevelOfRiskType,
   LandingOutcomeType,
   toDefraCcLandingStatus,
   CertificateLanding
} from 'mmo-shared-reference-data';
import {
   IDefraValidationReport,
   IDefraValidationProcessingStatement,
   CertificateAudit,
   ProcessingStatementReportCatch,
   StorageDocumentReportCatch,
   CertificatePlant,
   IDefraValidationStorageDocument,
   CertificateCompany,
   CertificateStorageFacility,
   CertificateTransport,
} from '../types/defraValidation';
import {
   ISdPsQueryResult,
   ICcBatchValidationReport
} from "../types/query";
import { IAuditEvent } from '../types/auditEvent';
import { ApplicationConfig } from '../../config';
import { getVesselsIdx } from '../../data/cache';
import { IDocument } from '../types/document';
import { vesselLookup } from './transformations';
import { ILicence } from '../types/appConfig/vessels';
import { isRejectedLanding } from '../transformations/dynamicsValidation';
import {
   getExportedSpeciesRiskScore,
   getExporterBehaviourRiskScore,
   getTotalRiskScore,
   getVesselOfInterestRiskScore,
   isHighRisk,
   isRiskEnabled,
} from "../query/isHighRisk";

const TRANSPORT_VEHICLE_TRUCK = 'truck';
const TRANSPORT_VEHICLE_TRAIN = 'train';
const TRANSPORT_VEHICLE_PLANE = 'plane';
const TRANSPORT_VEHICLE_VESSEL = 'vessel';
const TRANSPORT_VEHICLE_CONTAINER_VESSEL = 'containerVessel';

export const daLookUp = postCodeDaLookup(postCodeToDa);

const baseTransformation = (queryResult) => {
   const defraValidationReport = {
      certificateId: queryResult.documentNumber,
      status: queryResult.status,
      lastUpdated: new Date(),
      requestedByAdmin: false
   };

   defraValidationReport['landingId'] = queryResult.extended.landingId;
   defraValidationReport['isUnblocked'] = (queryResult.extended.PreApprovedBy !== undefined);

   return defraValidationReport;
};

export function ccQueryResultToDefraValidationReport(ccQueryResult: ICcQueryResult): IDefraValidationReport {

   return baseTransformation(ccQueryResult);

}

export function toPsPlant(processingStatement: IDocument): CertificatePlant {
   return {
      approvalNumber: processingStatement.exportData.plantApprovalNumber,
      name: processingStatement.exportData.plantName,
      address: {
         line1: processingStatement.exportData.plantAddressOne,
         building_name: processingStatement.exportData.plantBuildingName,
         building_number: processingStatement.exportData.plantBuildingNumber,
         sub_building_name: processingStatement.exportData.plantSubBuildingName,
         street_name: processingStatement.exportData.plantStreetName,
         country: processingStatement.exportData.plantCountry,
         county: processingStatement.exportData.plantCounty,
         city: processingStatement.exportData.plantTownCity,
         postCode: processingStatement.exportData.plantPostcode
      },
      dateOfAcceptance: processingStatement.exportData.dateOfAcceptance
   }
}

export function toPsDefraReport(
  documentNumber: string,
  correlationId: string,
  status: string,
  requestByAdmin: boolean,
  processingStatement?: IDocument
): IDefraValidationProcessingStatement {
  const result: IDefraValidationProcessingStatement = providePsResult(documentNumber, correlationId, status, requestByAdmin);

  if (processingStatement) {
    addAuditsToResult(result, processingStatement);
    addCatchesToResult(result, processingStatement);
    addPlantDetailsToResult(result, processingStatement);
    addHealthCertificateToResult(result, processingStatement);
    addConsignmentDetailsToResult(result, processingStatement);
    addExporterDetailsToResult(result, processingStatement);
    addAdditionalDetailsToResult(result, processingStatement);
  }

  return result;
}

function addAuditsToResult(result: IDefraValidationProcessingStatement, processingStatement: IDocument): void {
  if (processingStatement.audit && processingStatement.audit.length > 0) {
    result.audits = processingStatement.audit.map(toDefraAudit);
  }
}

function addCatchesToResult(result: IDefraValidationProcessingStatement, processingStatement: IDocument): void {
  if (processingStatement.exportData.catches && processingStatement.exportData.catches.length > 0) {
    result.catches = processingStatement.exportData.catches.map(toDefraPsCatch);
  }
}

function addPlantDetailsToResult(result: IDefraValidationProcessingStatement, processingStatement: IDocument): void {
  result.plant = toPsPlant(processingStatement);
}

function addHealthCertificateToResult(result: IDefraValidationProcessingStatement, processingStatement: IDocument): void {
  result.healthCertificate = {
    number: processingStatement.exportData.healthCertificateNumber,
    date: processingStatement.exportData.healthCertificateDate,
  };
}

function addConsignmentDetailsToResult(result: IDefraValidationProcessingStatement, processingStatement: IDocument): void {
  result.consignment = {
    description: processingStatement.exportData.consignmentDescription,
    personResponsible: processingStatement.exportData.personResponsibleForConsignment,
  };
}

function addExporterDetailsToResult(result: IDefraValidationProcessingStatement, processingStatement: IDocument): void {
  if (processingStatement.exportData.exporterDetails) {
    result.exporterDetails = providePsExportDetails(processingStatement);
    result.devolvedAuthority = daLookUp(processingStatement.exportData.exporterDetails.postcode);

    const userDetails = processingStatement.exportData.exporterDetails._dynamicsUser ?? {};
    const { firstName, lastName } = userDetails;

    result.created = {
      id: processingStatement.createdBy,
      email: processingStatement.createdByEmail,
      firstName,
      lastName,
    };
  }
}

function addAdditionalDetailsToResult(result: IDefraValidationProcessingStatement, processingStatement: IDocument): void {
  result.failedSubmissions = processingStatement.numberOfFailedAttempts || 0;

  if (processingStatement.documentUri) {
    result.documentUri = `${ApplicationConfig.prototype.externalAppUrl}/qr/export-certificates/${processingStatement.documentUri}`;
  }

  if (processingStatement.exportData) {
    result.exportedTo = processingStatement.exportData.exportedTo;
  }

  result.userReference = processingStatement.userReference;
  result.dateCreated = processingStatement.createdAt;
  result.clonedFrom = processingStatement.clonedFrom;
  result.parentDocumentVoid = processingStatement.parentDocumentVoid;
}

export function providePsResult(documentNumber, correlationId, status, requestByAdmin): IDefraValidationProcessingStatement {
   return {
      documentType: "ProcessingStatement",
      documentNumber: documentNumber,
      status: status,
      _correlationId: correlationId,
      requestedByAdmin: requestByAdmin
   }
}

export function toSdDefraReport(documentNumber: string, correlationId: string, status: string, requestByAdmin: boolean, storageDocument?: IDocument): IDefraValidationStorageDocument {
   const result: IDefraValidationStorageDocument = provideResult(documentNumber, correlationId, status, requestByAdmin);

   if (!isEmpty(storageDocument)) {
      populateBasicDetails(result, storageDocument);
      populateExportData(result, storageDocument);
   }

   return result;
}

function providePsExportDetails(processingStatement): CertificateCompany {
   return {
      companyName: processingStatement.exportData.exporterDetails.exporterCompanyName,
      address: {
         building_number: processingStatement.exportData.exporterDetails.buildingNumber,
         sub_building_name: processingStatement.exportData.exporterDetails.subBuildingName,
         building_name: processingStatement.exportData.exporterDetails.buildingName,
         street_name: processingStatement.exportData.exporterDetails.streetName,
         county: processingStatement.exportData.exporterDetails.county,
         country: processingStatement.exportData.exporterDetails.country,
         line1: processingStatement.exportData.exporterDetails.addressOne,
         city: processingStatement.exportData.exporterDetails.townCity,
         postCode: processingStatement.exportData.exporterDetails.postcode
      },
      contactId: processingStatement.exportData.exporterDetails.contactId,
      accountId: processingStatement.exportData.exporterDetails.accountId,
      dynamicsAddress: processingStatement.exportData.exporterDetails._dynamicsAddress
   }
}

function populateBasicDetails(result: IDefraValidationStorageDocument, storageDocument: IDocument): void {
   result.userReference = storageDocument.userReference;
   result.dateCreated = storageDocument.createdAt;
   result.failedSubmissions = storageDocument.numberOfFailedAttempts || 0;
   result.clonedFrom = storageDocument.clonedFrom;
   result.parentDocumentVoid = storageDocument.parentDocumentVoid;

   if (storageDocument.documentUri) {
      result.documentUri = `${ApplicationConfig.prototype.externalAppUrl}/qr/export-certificates/${storageDocument.documentUri}`;
   }

   if (storageDocument.audit && storageDocument.audit.length > 0) {
      result.audits = storageDocument.audit.map(toDefraAudit);
   }
}

function populateExportData(result: IDefraValidationStorageDocument, storageDocument: IDocument): void {
   const exportData = storageDocument.exportData;
   if (!exportData) return;

   if (exportData.exporterDetails) {
      populateExporterDetails(result, exportData, storageDocument);
   }

   if (exportData.catches && exportData.catches.length > 0) {
      result.products = exportData.catches.map(toDefraSdProduct);
   }

   if (exportData.storageFacilities && exportData.storageFacilities.length > 0) {
      result.storageFacilities = exportData.storageFacilities.map(toDefraSdStorageFacility);
   }

   if (exportData.transportation) {
      result.transportation = toTransportation(exportData.transportation);
   }

   if (exportData.arrivalTransportation) {
      result.arrivalTransportation = toTransportation(exportData.arrivalTransportation);
   }

   if (exportData.exportedTo) {
      result.exportedTo = exportData.exportedTo;
   }
}

function populateExporterDetails(result: IDefraValidationStorageDocument, exportData: any, storageDocument: IDocument): void {
   const exporterDetails: CertificateCompany = provideExportDetails(exportData.exporterDetails);
   result.exporterDetails = exporterDetails;
   result.devolvedAuthority = daLookUp(exportData.exporterDetails.postcode);

   const userDetails = exportData.exporterDetails._dynamicsUser ?? {};
   const { firstName, lastName } = userDetails;
   result.created = {
      id: storageDocument.createdBy,
      email: storageDocument.createdByEmail,
      firstName,
      lastName
   };
}
function provideResult(documentNumber: string, correlationId: string, status: string, requestByAdmin: boolean): IDefraValidationStorageDocument {
   return {
      documentType: "StorageDocument",
      documentNumber: documentNumber,
      status: status,
      _correlationId: correlationId,
      requestedByAdmin: requestByAdmin
   }
}
export function provideExportDetails(exporterDetails): CertificateCompany {

   return {
      companyName: exporterDetails.exporterCompanyName,
      address: {
         building_number: exporterDetails.buildingNumber,
         sub_building_name: exporterDetails.subBuildingName,
         building_name: exporterDetails.buildingName,
         street_name: exporterDetails.streetName,
         county: exporterDetails.county,
         country: exporterDetails.country,
         line1: exporterDetails.addressOne,
         city: exporterDetails.townCity,
         postCode: exporterDetails.postcode
      },
      contactId: exporterDetails.contactId,
      accountId: exporterDetails.accountId,
      dynamicsAddress: exporterDetails._dynamicsAddress
   }
}

export function toDefraAudit(systemAudit: IAuditEvent): CertificateAudit {
   const result: CertificateAudit = {
      auditOperation: systemAudit.eventType,
      user: systemAudit.triggeredBy,
      auditAt: systemAudit.timestamp,
      investigationStatus: systemAudit.data?.investigationStatus ?? undefined
   }

   return result;
}

export function toDefraPsCatch(psCatch): ProcessingStatementReportCatch {
   psCatch.isDocumentIssuedInUK = (psCatch.catchCertificateType === "uk");
   delete psCatch.catchCertificateType;
   return psCatch;
}

export function toDefraSdProduct(sdCatch): StorageDocumentReportCatch {
   return sdCatch ? {
      species: sdCatch.product,
      scientificName: sdCatch.scientificName,
      productWeight: parseInt(sdCatch.productWeight, 10),
      dateOfUnloading: sdCatch.dateOfUnloading,
      placeOfUnloading: sdCatch.placeOfUnloading,
      transportUnloadedFrom: sdCatch.transportUnloadedFrom,
      certificateNumber: sdCatch.certificateNumber,
      weightOnCertificate: parseInt(sdCatch.weightOnCC, 10),
      cnCode: sdCatch.commodityCode,
      isDocumentIssuedInUK: sdCatch.certificateType === 'uk',
   } : undefined;
}

export function toDefraSdStorageFacility(sdStorageFacility): CertificateStorageFacility {
   return sdStorageFacility ? {
      name: sdStorageFacility.facilityName,
      address: {
         building_number: sdStorageFacility.facilityBuildingNumber,
         sub_building_name: sdStorageFacility.facilitySubBuildingName,
         building_name: sdStorageFacility.facilityBuildingName,
         street_name: sdStorageFacility.facilityStreetName,
         county: sdStorageFacility.facilityCounty,
         country: sdStorageFacility.facilityCountry,
         line1: sdStorageFacility.facilityAddressOne,
         city: sdStorageFacility.facilityTownCity,
         postCode: sdStorageFacility.facilityPostcode
      },
      arrivalDate: sdStorageFacility.facilityArrivalDate,
      approvalNumber: !isEmpty(sdStorageFacility.facilityApprovalNumber) ? sdStorageFacility.facilityApprovalNumber : undefined,
      productHandling: !isEmpty(sdStorageFacility.facilityStorage) ? sdStorageFacility.facilityStorage : undefined,
   } : undefined;
}

export function toTransportation(transportation): CertificateTransport {
   if (transportation === undefined)
      return undefined;

   switch (transportation.vehicle) {
      case TRANSPORT_VEHICLE_TRUCK:
         return {
            modeofTransport: transportation.vehicle,
            hasRoadTransportDocument: transportation.cmr === undefined ? false : transportation.cmr,
            nationality: transportation.nationalityOfVehicle,
            registration: transportation.registrationNumber,
            exportLocation: transportation.departurePlace,
            exportDate: transportation.exportDate,
            freightbillNumber: transportation.freightBillNumber,
            countryofDeparture: transportation.departureCountry,
            whereDepartsFrom: transportation.departurePort,
            departureDate: transportation.departureDate
         }
      case TRANSPORT_VEHICLE_TRAIN:
         return {
            modeofTransport: transportation.vehicle,
            billNumber: transportation.railwayBillNumber,
            exportLocation: transportation.departurePlace,
            exportDate: transportation.exportDate,
            freightbillNumber: transportation.freightBillNumber,
            countryofDeparture: transportation.departureCountry,
            whereDepartsFrom: transportation.departurePort,
            departureDate: transportation.departureDate
         }
      case TRANSPORT_VEHICLE_PLANE:
         return {
            modeofTransport: transportation.vehicle,
            flightNumber: transportation.flightNumber,
            containerId: transportation.containerNumbers ? transportation.containerNumbers : transportation.containerNumber,
            exportLocation: transportation.departurePlace,
            exportDate: transportation.exportDate,
            freightbillNumber: transportation.freightBillNumber,
            airwaybillNumber: transportation.airwayBillNumber,
            countryofDeparture: transportation.departureCountry,
            whereDepartsFrom: transportation.departurePort,
            departureDate: transportation.departureDate
         }
      case TRANSPORT_VEHICLE_CONTAINER_VESSEL:
         return {
            modeofTransport: TRANSPORT_VEHICLE_VESSEL,
            name: transportation.vesselName,
            flag: transportation.flagState,
            containerId: transportation.containerNumbers ? transportation.containerNumbers : transportation.containerNumber,
            exportLocation: transportation.departurePlace,
            exportDate: transportation.exportDate,
            freightbillNumber: transportation.freightBillNumber,
            countryofDeparture: transportation.departureCountry,
            whereDepartsFrom: transportation.departurePort,
            departureDate: transportation.departureDate
         }
      default:
         return {
            modeofTransport: transportation.vehicle,
            exportLocation: transportation.departurePlace,
            exportDate: transportation.exportDate,
            freightbillNumber: transportation.freightBillNumber,
            countryofDeparture: transportation.countryofDeparture,
            whereDepartsFrom: transportation.departurePort,
            departureDate: transportation.departureDate
         }
   }
}

export function toLandings(queryRes: ICcQueryResult[]): CertificateLanding[] {
   return queryRes.map((rawValidatedLanding: ICcQueryResult) => {

      const ccBatchReportForLanding: ICcBatchValidationReport = Array.from(ccBatchReport([rawValidatedLanding][Symbol.iterator]()))[0]
      const licenceLookup = vesselLookup(getVesselsIdx());
      const licence: ILicence = licenceLookup(rawValidatedLanding.extended.pln, rawValidatedLanding.dateLanded);
      const isDataNeverExpected = rawValidatedLanding.extended.dataEverExpected === false;
      const riskScore = getTotalRiskScore(
         rawValidatedLanding.extended.pln,
         rawValidatedLanding.species,
         rawValidatedLanding.extended.exporterAccountId,
         rawValidatedLanding.extended.exporterContactId);

      return {
         startDate: rawValidatedLanding.startDate,
         date: rawValidatedLanding.dateLanded,
         species: {
            name: rawValidatedLanding.extended.species,
            code: rawValidatedLanding.species,
            scientificName: rawValidatedLanding.extended.scientificName
         },
         state: {
            name: rawValidatedLanding.extended.stateName,
            code: rawValidatedLanding.extended.state
         },
         presentation: {
            name: rawValidatedLanding.extended.presentationName,
            code: rawValidatedLanding.extended.presentation
         },
         cnCode: rawValidatedLanding.extended.commodityCode,
         cnCodeDesc: rawValidatedLanding.extended.commodityCodeDescription,
         vessel: {
            name: rawValidatedLanding.extended.vessel,
            pln: rawValidatedLanding.extended.pln,
            length: licence ? licence.vesselLength : null,
            fao: rawValidatedLanding.extended.fao,
            flag: rawValidatedLanding.extended.flag,
            cfr: rawValidatedLanding.extended.cfr
         },
         exportWeight: rawValidatedLanding.weightOnCert,
         exportWeightFactor: rawValidatedLanding.weightFactor,
         gearType: rawValidatedLanding.gearType,
         highSeasArea: rawValidatedLanding.extended.highSeasArea,
         exclusiveEconomicZones: rawValidatedLanding.extended.exclusiveEconomicZones,
         rfmo: rawValidatedLanding.extended.rfmo,
         isLandingDataAvailable: rawValidatedLanding.numberOfLandingsOnDay > 0,
         isDirectLanding: ccBatchReportForLanding.directLanding === 'Y',
         isValidationFailed: ccBatchReportForLanding.FI0_136_numberOfFailedValidations > 0,
         isSpeciesMisMatch: rawValidatedLanding.isLandingExists ? ccBatchReportForLanding.FI0_289_speciesMismatch === 'Fail' : false,
         isExporterLandingOveruse: rawValidatedLanding.isOverusedThisCert,
         isOveruse: rawValidatedLanding.isOverusedAllCerts,
         rss: rawValidatedLanding.rssNumber,
         isNoLandingDataTimeExceeded: ccBatchReportForLanding.FI0_47_unavailabilityExceeds14Days === 'Fail',
         landingBreakdown: rawValidatedLanding.landingTotalBreakdown,
         totalWeightRecordedAgainstLanding: rawValidatedLanding.weightOnLanding,
         daysWithNoLandingData: ccBatchReportForLanding.FI0_41_unavailabilityDuration,
         landedWeightExceededAmount: ccBatchReportForLanding.exportedWeightExceedingEstimateLandedWeight ? Number(ccBatchReportForLanding.exportedWeightExceedingEstimateLandedWeight ?? 0) : Number(ccBatchReportForLanding.FI0_290_exportedWeightExceedingLandedWeight ?? 0),
         totalWeightExported: rawValidatedLanding.weightOnAllCerts,
         rawLandingsDataUrl: ccBatchReportForLanding.rawLandingsUrl.replace('{BASE_URL}', ApplicationConfig.prototype.internalAppUrl),
         rawSalesNotesDataUrl: ccBatchReportForLanding.salesNotesUrl.replace('{BASE_URL}', ApplicationConfig.prototype.internalAppUrl),
         isLegallyDue: getIsLegallyDue(rawValidatedLanding),
         vesselAdministration: rawValidatedLanding.da,
         dataEverExpected: !isDataNeverExpected,
         landingDataExpectedDate: rawValidatedLanding.extended.landingDataExpectedDate,
         landingDataEndDate: rawValidatedLanding.extended.landingDataEndDate,
         landingDataExpectedAtSubmission: (rawValidatedLanding.createdAt !== undefined && rawValidatedLanding.extended.landingDataExpectedDate !== undefined) ? moment.utc(rawValidatedLanding.createdAt).isSameOrAfter(moment.utc(rawValidatedLanding.extended.landingDataExpectedDate), 'day') : undefined,
         isLate: !isDataNeverExpected ? isLandingDataLate(rawValidatedLanding.firstDateTimeLandingDataRetrieved, rawValidatedLanding.extended.landingDataExpectedDate) : undefined,
         dateDataReceived: rawValidatedLanding.firstDateTimeLandingDataRetrieved,
         adminSpecies: rawValidatedLanding.extended.speciesAdmin,
         adminPresentation: rawValidatedLanding.extended.presentationAdmin,
         adminState: rawValidatedLanding.extended.stateAdmin,
         adminCommodityCode: rawValidatedLanding.extended.commodityCodeAdmin,
         speciesOverriddenByAdmin: rawValidatedLanding.extended.speciesOverriddenByAdmin,
         risking: {
            vessel: getVesselOfInterestRiskScore(rawValidatedLanding.extended.pln).toString(),
            speciesRisk: getExportedSpeciesRiskScore(rawValidatedLanding.species).toString(),
            exporterRiskScore: getExporterBehaviourRiskScore(rawValidatedLanding.extended.exporterAccountId, rawValidatedLanding.extended.exporterContactId).toString(),
            landingRiskScore: riskScore.toString(),
            highOrLowRisk: isHighRisk(riskScore) ? LevelOfRiskType.High : LevelOfRiskType.Low,
            isSpeciesRiskEnabled: isRiskEnabled()
         },
         landingValidationstatusAtSubmission: toDefraCcLandingStatus(rawValidatedLanding, isHighRisk(riskScore)),
         landingOutcomeAtSubmission: isRejectedLanding(rawValidatedLanding) ? LandingOutcomeType.Rejected : LandingOutcomeType.Success,
      }
   });
}

export function toCatches(queryRes: ISdPsQueryResult[]): ProcessingStatementReportCatch[] {
   return queryRes.map(row => {
      return {
         species: row.species,
         scientificName: row.scientificName,
         catchCertificateNumber: row.catchCertificateNumber,
         totalWeightLanded: row.weightOnFCC,
         exportWeightBeforeProcessing: row.weightOnDoc,
         exportWeightAfterProcessing: row.weightAfterProcessing,
         isOverUse: row.isOverAllocated,
         hasWeightMismatch: row.isMismatch,
         importWeightExceededAmount: row.overAllocatedByWeight,
         cnCode: row.commodityCode,
         isDocumentIssuedInUK: row.catchCertificateType === 'uk'
      }
   });
}

export function toProducts(queryRes: ISdPsQueryResult[]): StorageDocumentReportCatch[] {
   return queryRes.map(row => {
      return {
         species: row.species,
         scientificName: row.scientificName,
         productWeight: row.weightOnDoc,
         dateOfUnloading: row.dateOfUnloading,
         placeOfUnloading: row.placeOfUnloading,
         transportUnloadedFrom: row.transportUnloadedFrom,
         certificateNumber: row.catchCertificateNumber,
         weightOnCertificate: row.weightOnFCC,
         cnCode: row.commodityCode,
         isOverUse: row.isOverAllocated,
         isImportWeightMismatch: row.isMismatch,
         overUseExceededAmount: row.overAllocatedByWeight,
         isDocumentIssuedInUK: row.catchCertificateType === 'uk',
         productDescription: row.productDescription,
         netWeightProductArrival: row.netWeightProductArrival,
         netWeightFisheryProductArrival: row.netWeightFisheryProductArrival,
         netWeightProductDeparture: row.netWeightProductDeparture,
         netWeightFisheryProductDeparture: row.netWeightFisheryProductDeparture,
         supportingDocuments: row.supportingDocuments,
      }
   })
}