import moment from "moment";
import { ICcQueryResult, IDynamicsLanding } from 'mmo-shared-reference-data';
import { CertificateStatus, IDefraTradeCatchCertificate, IDefraTradeLanding } from "../types/defraTradeCatchCertificate"
import { IDefraTradeProcessingStatement, IDefraTradeStorageDocument, IDefraTradeStorageDocumentProduct } from "../types/defraTradeSdPsCase";
import { IDocument } from "../types/document";
import { IDynamicsCatchCertificateCase } from "../types/dynamicsCcCase";
import { ISdPsQueryResult } from "../types/query";
import { toDefraSdStorageFacility, toTransportation } from "./defraValidation";
import { toLanding, toPsCatch, toSdProduct } from "./dynamicsValidation";
import { Catch, Product } from "../persistence/catchCert";
import { IDynamicsProcessingStatementCase, IDynamicsProcessingStatementCatch, IDynamicsStorageDocumentCase, IDynamicsStorageDocumentProduct } from "../types/dynamicsSdPsCase";
import { CertificateAuthority, CertificateStorageFacility, CertificateTransport } from "../types/defraValidation";
import { ApplicationConfig } from "../../config";

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

  return {
    ...dynamicsLanding,
    species: landing.extended.species,
    flag: landing.extended.flag,
    catchArea: landing.extended.fao,
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
  const transportation: CertificateTransport = toTransportation(document.exportData?.transportation);
  Object.keys(transportation).forEach(key => transportation[key] === undefined && delete transportation[key]);

  return {
    ...certificateCase,
    certStatus: Array.isArray(ccQueryResults) ? ccQueryResults.some((_: ICcQueryResult) => _.status === "BLOCKED") ? CertificateStatus.BLOCKED : CertificateStatus.COMPLETE : CertificateStatus.VOID,
    landings: Array.isArray(ccQueryResults) ? ccQueryResults.map((_: ICcQueryResult) => toDefraTradeLanding(_)) : null,
    exportedTo: document.exportData?.transportation?.exportedTo,
    transportation,
    multiVesselSchedule: isMultiVessel(document.exportData?.products)
  }
};

export const toDefraTradePs = (document: IDocument, processingStatementCase: IDynamicsProcessingStatementCase, psQueryResults: ISdPsQueryResult[] | null): IDefraTradeProcessingStatement => ({
  ...processingStatementCase,
  catches: Array.isArray(psQueryResults) ? psQueryResults.map((_: ISdPsQueryResult) => {
    const psCatch: IDynamicsProcessingStatementCatch = toPsCatch(_);

    delete psCatch['isDocumentIssuedInUK'];

    return {
      ...psCatch,
      species: _.species
    }
  }) : null,
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

export const toDefraTradeProduct = (product: ISdPsQueryResult): IDefraTradeStorageDocumentProduct => {
  const sdProduct: IDynamicsStorageDocumentProduct = toSdProduct(product);

  delete sdProduct['isDocumentIssuedInUK'];

  return {
    ...sdProduct,
    species: product.species,
    dateOfUnloading: moment(product.dateOfUnloading, 'DD/MM/YYYY').format('YYYY-MM-DD'),
    placeOfUnloading: product.placeOfUnloading,
    transportUnloadedFrom: product.transportUnloadedFrom,
  }
};

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