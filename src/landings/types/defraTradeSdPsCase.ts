import { ICountry } from "mmo-shared-reference-data";
import { SdPsCaseTwoType } from "./dynamicsSdPsCase";
import { CertificateAddress, CertificateAuthority, CertificateCompany, CertificateStorageFacility, CertificateTransport } from "./defraValidation";

export interface IDefraTradeProcessingStatementValidation {
  status: IDefraTradeSdPsStatus;
  totalUsedWeightAgainstCertificate: number;
  weightExceededAmount?: number;
  overuseInfo?: string[];
}

export interface IDefraTradeProcessingStatementCatch {
  foreignCatchCertificateNumber: string;
  id: string;
  species: string;
  cnCode: string;
  scientificName: string;
  importedWeight: number;
  usedWeightAgainstCertificate: number;
  processedWeight: number;
  validation: IDefraTradeProcessingStatementValidation;
  issuingCountry: string;
  productDescription: string;
}

export interface IDefraTradeProcessingStatement {
    exporter: CertificateCompany;
    documentUrl: string;
    documentDate: string;
    caseType1: string;
    caseType2: SdPsCaseTwoType;
    numberOfFailedSubmissions: number;
    documentNumber: string;
    plantName: string;
    plantAddress: CertificateAddress;
    plantApprovalNumber: string;
    plantDateOfAcceptance: string;
    personResponsible : string;
    exportedTo: ICountry;
    processedFisheryProducts: string;
    catches?: IDefraTradeProcessingStatementCatch[];
    healthCertificateNumber: string;
    healthCertificateDate: string;
    da: string;
    _correlationId: string;
    requestedByAdmin: boolean;
    authority: CertificateAuthority;
}

export interface IDefraTradeStorageDocumentValidation {
  status: IDefraTradeSdPsStatus;
  totalWeightExported: number;
  weightExceededAmount?: number;
  overuseInfo?: string[];
}

export interface IDefraTradeStorageDocumentProduct {
  foreignCatchCertificateNumber: string;
  species: string;
  id: string;
  cnCode: string;
  scientificName: string;
  importedWeight: number;
  exportedWeight: number;
  validation: IDefraTradeStorageDocumentValidation;
  issuingCountry: string;
  supportingDocuments?: string,
  productDescription?: string,
  netWeightProductArrival?: string,
  netWeightFisheryProductArrival? : string,
  netWeightProductDeparture? : string,
  netWeightFisheryProductDeparture? : string
}

export interface IDefraTradeStorageDocument {
  exporter: CertificateCompany;
  documentUrl: string;
  documentDate: string;
  caseType1: string;
  caseType2: SdPsCaseTwoType;
  numberOfFailedSubmissions: number;
  documentNumber: string;
  companyName: string;
  exportedTo: ICountry;
  products?: IDefraTradeStorageDocumentProduct[];
  _correlationId: string;
  da: string;
  requestedByAdmin: boolean;
  transportation: CertificateTransport;
  arrivalTransportation?: CertificateTransport;
  storageFacilities?: CertificateStorageFacility[];
  storageFacility: CertificateStorageFacility;
  authority: CertificateAuthority;
}

export enum IDefraTradeSdPsStatus {
  Success = 'Validation Success',
  Overuse = "Validation Failure - Overuse",
  Weight = "Validation Failure - Weight",
}