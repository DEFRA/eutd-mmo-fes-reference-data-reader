import { CertificateCompany } from "./defraValidation";
import { ICountry } from './appConfig/countries';
export interface IDynamicsProcessingStatementCase {
    exporter: CertificateCompany;
    documentUrl: string;
    documentDate: string;
    caseType1: string;
    caseType2: SdPsCaseTwoType;
    numberOfFailedSubmissions: number;
    documentNumber: string;
    plantName: string;
    personResponsible: string;
    exportedTo: ICountry;
    processedFisheryProducts: string;
    catches?: IDynamicsProcessingStatementCatch[];
    da: string;
    _correlationId: string;
    requestedByAdmin: boolean;
    clonedFrom?: string;
    parentDocumentVoid?: boolean;
}

export interface IDynamicsProcessingStatementCatch {
    foreignCatchCertificateNumber: string;
    isDocumentIssuedInUK?: boolean;
    id: string;
    species: string;
    cnCode: string;
    scientificName: string;
    importedWeight: number;
    usedWeightAgainstCertificate: number;
    processedWeight: number;
    validation: IDynamicsProcessingStatementValidation;
}

export interface IDynamicsProcessingStatementValidation {
    status: SdPsStatus;
    totalUsedWeightAgainstCertificate: number;
    weightExceededAmount?: number;
    overuseInfo?: string[];
}

export interface IDynamicsStorageDocumentCase {
    exporter: CertificateCompany;
    documentUrl: string | undefined;
    documentDate: string;
    caseType1: string;
    caseType2: SdPsCaseTwoType;
    numberOfFailedSubmissions: number;
    documentNumber: string;
    companyName: string;
    exportedTo: ICountry;
    products?: IDynamicsStorageDocumentProduct[];
    _correlationId: string;
    da: string;
    requestedByAdmin: boolean;
    clonedFrom?: string;
    parentDocumentVoid?: boolean;
}

export interface IDynamicsStorageDocumentProduct {
    foreignCatchCertificateNumber: string;
    isDocumentIssuedInUK?: boolean;
    species: string;
    id: string;
    cnCode: string;
    scientificName: string;
    importedWeight: number;
    exportedWeight: number;
    validation: IDynamicsStorageDocumentValidation;
}

export interface IDynamicsStorageDocumentValidation {
    status: SdPsStatus;
    totalWeightExported: number;
    weightExceededAmount?: number;
    overuseInfo?: string[];
}

export enum SdPsCaseTwoType {
    RealTimeValidation_Success = 'Real Time Validation - Successful',
    RealTimeValidation_Overuse = 'Real Time Validation - Overuse Failure',
    RealTimeValidation_Weight = 'Real Time Validation - Weight Failure',
    VoidByExporter = 'Void by an Exporter',
    VoidByAdmin = 'Void by SMO/PMO'
}

export enum SdPsStatus {
    Success = 'Validation Success',
    Overuse = 'Validation Failure - Overuse',
    Weight = 'Validation Failure - Weight'
}