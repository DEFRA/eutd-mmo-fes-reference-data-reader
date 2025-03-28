import { IDynamicsLanding, LevelOfRiskType, ICountry } from 'mmo-shared-reference-data';
import { CertificateExporterAndCompany, CertificateAudit } from './defraValidation';

export interface IDynamicsCatchCertificateCase {
    da: string;
    caseType1: CaseOneType;
    caseType2: CaseTwoType;
    caseRiskAtSubmission?: LevelOfRiskType;
    caseStatusAtSubmission?: CaseStatusAtSubmission;
    caseOutcomeAtSubmission?: CaseOutcomeAtSubmission;
    numberOfFailedSubmissions: number;
    isDirectLanding: boolean;
    documentNumber: string;
    documentUrl?: string;
    documentDate?: string;
    exporter: CertificateExporterAndCompany;
    exportedTo: ICountry;
    landings?: IDynamicsLanding[] | null;
    _correlationId: string;
    requestedByAdmin: boolean;
    isUnblocked?: boolean;
    vesselOverriddenByAdmin?: boolean;
    speciesOverriddenByAdmin?: boolean;
    audits?: CertificateAudit[];
    failureIrrespectiveOfRisk?: boolean;
    clonedFrom?: string;
    landingsCloned?: boolean;
    parentDocumentVoid?: boolean;
}

export interface IDynamicsLandingValidation {
    liveExportWeight: number;
    totalWeightForSpecies?: number;
    totalLiveForExportSpecies?: number;
    totalEstimatedForExportSpecies?: number;
    totalEstimatedWithTolerance?: number;
    totalRecordedAgainstLanding?: number;
    landedWeightExceededBy?: number | null;
    rawLandingsUrl: string;
    salesNoteUrl: string;
    isLegallyDue: boolean;
}

export interface IDynamicsRisk {
    vessel?: string;
    speciesRisk?: string;
    exporterRiskScore?: string;
    landingRiskScore?: string;
    highOrLowRisk?: LevelOfRiskType;
    overuseInfo?: string[];
    isSpeciesRiskEnabled?: boolean;
}

export enum CaseOneType {
    CatchCertificate = 'CC',
    ProcessingStatement = 'PS',
    StorageDocument = 'SD'
}

export enum CaseTwoType {
    RealTimeValidation_Rejected = 'Real Time Validation - Rejected',
    RealTimeValidation_NoLandingData = 'Real Time Validation - No Landing Data',
    RealTimeValidation_Overuse = 'Real Time Validation - Overuse Failure',
    PendingLandingData = 'Pending Landing Data',
    DataNeverExpected = 'Data Never Expected',
    Success = 'Real Time Validation - Successful',
    VoidByExporter = 'Void by an Exporter',
    VoidByAdmin = 'Void by SMO/PMO'
}

export enum CaseStatusAtSubmission {
    ValidationFailure_NoLandingData = 'No Landing Data Failure',
    ValidationFailure = 'Validation Failure',
    PendingLandingData_DataExpected = 'Pending Landing Data - Data Expected',
    PendingLandingData_DataNotYetExpected = 'Pending Landing Data - Data Not Yet Expected',
    DataNeverExpected = 'Data Never Expected',
    ValidationSuccess = 'Validation Success'
}

export enum CaseOutcomeAtSubmission {
    Issued = 'Issued',
    Rejected = 'Rejected'
}