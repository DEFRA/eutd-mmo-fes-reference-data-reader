import moment from "moment";
import {
  ICcQueryResult,
  IDynamicsLanding,
  toDefraCcLandingStatus,
  IDefraTradeLanding,
  IDefraTradeCatchCertificate,
  CertificateStatus
} from 'mmo-shared-reference-data';
import { IDefraTradeProcessingStatement, IDefraTradeProcessingStatementCatch, IDefraTradeSdPsStatus, IDefraTradeStorageDocument, IDefraTradeStorageDocumentProduct } from "../types/defraTradeSdPsCase";
import { IDocument } from "../types/document";
import { IDynamicsCatchCertificateCase } from "../types/dynamicsCcCase";
import { ISdPsQueryResult } from "../types/query";
import { toDefraSdStorageFacility, toTransportation } from "./defraValidation";
import { toLanding, } from "./dynamicsValidation";
import { Catch, Product } from "../persistence/catchCert";
import { IDynamicsProcessingStatementCase, IDynamicsStorageDocumentCase } from "../types/dynamicsSdPsCase";
import { CertificateAuthority, CertificateStorageFacility, CertificateTransport } from "../types/defraValidation";
import { ApplicationConfig } from "../../config";
import { getTotalRiskScore, isHighRisk } from "../query/isHighRisk";

const createUrl = (rawDataType: string, q: ICcQueryResult) => {
  return `{BASE_URL}/reference/api/v1/extendedData/${rawDataType}?dateLanded=${q.dateLanded}&rssNumber=${q.rssNumber}`
}

const toAuthority: () => CertificateAuthority = () => ({
  name: "Illegal Unreported and Unregulated (IUU) Fishing Team",
  companyName: "Marine Management Organisation",
  address: {
    line1: "Lancaster House, Hampshire Court",
    building_name: "Lancaster House",
    street_name: "Hampshire Court",
    city: "Newcastle upon Tyne",
    postCode: "NE4 7YJ",
    country: "United Kingdom"
  },
  tel: "0300 123 1032",
  email: "ukiuuslo@marinemanagement.org.uk",
  dateIssued: moment().format('YYYY-MM-DD')
});

const isMultiVessel = (products: Product[]) => {
  const { vesselCounts, catchLength } = getVesselCount(products);
  return Object.keys(vesselCounts).length > 1 || catchLength > 6;
}

const getVesselCount = (products: Product[]) => {
  if (!Array.isArray(products) || products.length <= 0) {
    return { vesselCounts: {}, catchLength: 0 }
  }

  const vesselCounts = {};
  let catchLength = 0;    // calculate number of lines. so we can calculate number of maxPages

  products.forEach((product: Product) => {
    if (Array.isArray(product.caughtBy)) {
      product.caughtBy.forEach((landing: Catch) => {
        vesselCounts[landing.vessel + landing.pln + landing.licenceNumber] = (vesselCounts[landing.vessel + landing.pln + landing.licenceNumber] || 0) + 1;
        catchLength += 1;
      })
    }
  });

  return { vesselCounts, catchLength };
}

export const toDefraTradeLanding = (landing: ICcQueryResult): IDefraTradeLanding => {
  const dynamicsLanding: IDynamicsLanding = toLanding(landing);
  const riskScore = getTotalRiskScore(
    landing.extended.pln,
    landing.species,
    landing.extended.exporterAccountId,
    landing.extended.exporterContactId);

  delete dynamicsLanding['landingOutcomeAtSubmission'];
  delete dynamicsLanding['landingOutcomeAtRetrospectiveCheck'];
  delete dynamicsLanding['gearType'];

  return {
    ...dynamicsLanding,
    status: toDefraCcLandingStatus(landing, isHighRisk(riskScore)),
    species: landing.extended.species,
    flag: landing.extended.flag,
    catchArea: landing.extended.fao,
    highSeasArea: landing.extended.highSeasArea,
    rfmo: landing.extended.rfmo,
    homePort: landing.extended.homePort,
    fishingLicenceNumber: landing.extended.licenceNumber,
    fishingLicenceValidTo: landing.extended.licenceValidTo,
    imo: landing.extended.imoNumber,
    validation: {
      ...dynamicsLanding.validation,
      rawLandingsUrl: createUrl('rawLandings', landing).replace('{BASE_URL}', ApplicationConfig.prototype.internalAppUrl),
      salesNoteUrl: createUrl('salesNotes', landing).replace('{BASE_URL}', ApplicationConfig.prototype.internalAppUrl)
    }
  }
};

export const toDefraTradeCc = (document: IDocument, certificateCase: IDynamicsCatchCertificateCase, ccQueryResults: ICcQueryResult[] | null): IDefraTradeCatchCertificate => {
  const transportation: CertificateTransport = document.exportData?.transportation
    ? toTransportation(document.exportData?.transportation)
    : toTransportation(document.exportData?.transportations.find((t) => t.departurePlace || t.vehicle === 'truck' && t.cmr));
  Object.keys(transportation).forEach(key => transportation[key] === undefined && delete transportation[key]);

  let status: CertificateStatus;
  if (!Array.isArray(ccQueryResults)) {
    status = CertificateStatus.VOID;
  } else {
    status = ccQueryResults.some((_: ICcQueryResult) => _.status === "BLOCKED") ? CertificateStatus.BLOCKED : CertificateStatus.COMPLETE;
  }

  return {
    ...certificateCase,
    certStatus: status,
    landings: Array.isArray(ccQueryResults) ? ccQueryResults.map((_: ICcQueryResult) => toDefraTradeLanding(_)) : null,
    exportedTo: document.exportData?.transportation?.exportedTo ?? document.exportData?.exportedTo,
    transportation,
    multiVesselSchedule: isMultiVessel(document.exportData?.products)
  }
};

export function toDefraTradePsCatch(validatedPsCatches: ISdPsQueryResult): IDefraTradeProcessingStatementCatch {

  let status = IDefraTradeSdPsStatus.Success;

  if (validatedPsCatches.isMismatch) {
    status = IDefraTradeSdPsStatus.Weight
  }

  if (validatedPsCatches.isOverAllocated) {
    status = IDefraTradeSdPsStatus.Overuse
  }

  return {
    foreignCatchCertificateNumber: validatedPsCatches.catchCertificateNumber,
    species: validatedPsCatches.species,
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

export const toDefraTradePs = (document: IDocument, processingStatementCase: IDynamicsProcessingStatementCase, psQueryResults: ISdPsQueryResult[] | null): IDefraTradeProcessingStatement => ({
  ...processingStatementCase,
  catches: Array.isArray(psQueryResults) ? psQueryResults.map((_: ISdPsQueryResult) =>
    toDefraTradePsCatch(_)
  ) : null,
  exportedTo: document.exportData?.exportedTo,
  plantAddress: {
    line1: document.exportData.plantAddressOne,
    building_name: document.exportData.plantBuildingName,
    building_number: document.exportData.plantBuildingNumber,
    sub_building_name: document.exportData.plantSubBuildingName,
    street_name: document.exportData.plantStreetName,
    country: document.exportData.plantCountry,
    county: document.exportData.plantCounty,
    city: document.exportData.plantTownCity,
    postCode: document.exportData.plantPostcode
  },
  plantApprovalNumber: document.exportData.plantApprovalNumber,
  plantDateOfAcceptance: moment(document.exportData.dateOfAcceptance, 'DD/MM/YYYY').format('YYYY-MM-DD'),
  healthCertificateNumber: document.exportData.healthCertificateNumber,
  healthCertificateDate: moment(document.exportData.healthCertificateDate, ["DD/MM/YYYY", "DD/M/YYYY", "D/MM/YYYY", "D/M/YYYY"]).format('YYYY-MM-DD'),
  authority: toAuthority()
});

export function toDefraTradeSdProduct(validatedSdProducts: ISdPsQueryResult): IDefraTradeStorageDocumentProduct {

  let status = IDefraTradeSdPsStatus.Success;

  if (validatedSdProducts.isMismatch) {
    status = IDefraTradeSdPsStatus.Weight
  }

  if (validatedSdProducts.isOverAllocated) {
    status = IDefraTradeSdPsStatus.Overuse
  }

  return {
    foreignCatchCertificateNumber: validatedSdProducts.catchCertificateNumber,
    species: validatedSdProducts.species,
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
    },
    dateOfUnloading: moment(validatedSdProducts.dateOfUnloading, 'DD/MM/YYYY').format('YYYY-MM-DD'),
    placeOfUnloading: validatedSdProducts.placeOfUnloading,
    transportUnloadedFrom: validatedSdProducts.transportUnloadedFrom,
  }
}

export const toDefraTradeProduct = (product: ISdPsQueryResult): IDefraTradeStorageDocumentProduct =>
  toDefraTradeSdProduct(product);

export const toDefraTradeSd = (document: IDocument, documentCase: IDynamicsStorageDocumentCase, sdQueryResults: ISdPsQueryResult[] | null): IDefraTradeStorageDocument => {
  const transportation: CertificateTransport = toTransportation(document.exportData?.transportation);
  Object.keys(transportation).forEach(key => transportation[key] === undefined && delete transportation[key]);

  transportation.exportDate = moment(transportation.exportDate, ['DD/MM/YYYY', 'DD/M/YYYY', 'D/MM/YYYY']).isValid() ? moment(transportation.exportDate, ['DD/MM/YYYY', 'DD/M/YYYY', 'D/MM/YYYY']).format('YYYY-MM-DD') : moment.utc().format('YYYY-MM-DD');

  return {
    ...documentCase,
    products: Array.isArray(sdQueryResults) ? sdQueryResults.map((_: ISdPsQueryResult) => toDefraTradeProduct(_)) : null,
    storageFacilities: document?.exportData.storageFacilities.map((_: CertificateStorageFacility) => toDefraSdStorageFacility(_)),
    exportedTo: document.exportData?.exportedTo,
    transportation,
    authority: toAuthority()
  }
};