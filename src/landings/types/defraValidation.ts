import { Schema, model, Document } from 'mongoose';
import { ICountry, IDefraValidationCatchCertificate } from 'mmo-shared-reference-data';

export interface IDefraValidationReport  {
    certificateId:      string;
    status:             string;
    requestedByAdmin:   boolean;
    landingId?:         string;
    validationPass?:    boolean;
    lastUpdated?:       Date;
    isUnblocked?:       boolean;
}

export interface CertificateAddress {
    address_line?: string;
    building_number?: string | null;
    sub_building_name?: string;
    building_name?: string;
    street_name?: string;
    county?: string | null;
    country?: string;
    line1? : string;
    line2? : string;
    city : string;
    postCode?: string;
}

export interface CertificateAudit {
    auditOperation: string;
    investigationStatus?: string;
    user: string;
    auditAt: Date;
}

export interface CertificateCompany {
    companyName: string;
    address: CertificateAddress;
    contactId? : string;
    accountId?: string;
    dynamicsAddress?: any;
}

export interface CertificateExporterAndCompany {
    fullName: string;
    companyName: string;
    contactId? : string;
    accountId?: string;
    address: CertificateAddress;
    dynamicsAddress?: any;
}

export interface CertificateAuthority {
  name: string,
  companyName: string,
  address: CertificateAddress,
  tel: string,
  email:  string,
  dateIssued: string,
}

export interface ProcessingStatementReportCatch {
    species: string;
    scientificName?: string;
    catchCertificateNumber: string;
    isDocumentIssuedInUK?: boolean;
    issuingCountry?: string;
    totalWeightLanded: number;
    exportWeightBeforeProcessing: number;
    exportWeightAfterProcessing: number;
    isOverUse?: boolean;
    hasWeightMismatch?: boolean;
    importWeightExceededAmount?: number;
    cnCode?: string;
}
export interface StorageDocumentReportCatch {
    species: string;
    scientificName?: string;
    productWeight: number;
    certificateNumber: string;
    weightOnCertificate: number;
    cnCode?: string;
    isOverUse?: boolean;
    isImportWeightMismatch?: boolean;
    overUseExceededAmount?: number;
    isDocumentIssuedInUK?: boolean;
    supportingDocuments?: string;
    productDescription?: string;
    netWeightProductArrival?: string;
    netWeightFisheryProductArrival?: string;
    netWeightProductDeparture?: string;
    netWeightFisheryProductDeparture?: string;
}

export interface CertificateConsignment {
    description: string;
    personResponsible: string;
}

export interface HealthCertificate {
    number: string;
    date: string;
}

export interface CertificatePlant {
    approvalNumber: string;
    name: string;
    address: CertificateAddress;
    dateOfAcceptance: string;
}

export interface CertificateStorageFacility {
    name?: string;
    address: CertificateAddress;
    dateOfUnloading?: string,
    approvalNumber?: string,
    productHandling?: string
}

interface ModeOfTransport {
    modeofTransport: string;
    placeOfUnloading?: string,
    exportLocation?: string;
    exportDate?: string;
    freightbillNumber?: string;
    countryofDeparture?: string;
    whereDepartsFrom?: string;
    departureDate?: string;
}

export interface Truck extends ModeOfTransport {
    hasRoadTransportDocument: boolean;
    nationality?: string;
    registration?: string;
}

export interface Train extends ModeOfTransport {
    billNumber?: string;
}

export interface Plane extends ModeOfTransport {
    flightNumber?: string;
    containerId: string;
    airwaybillNumber?: string;
}

export interface Vessel extends ModeOfTransport {
    name?: string;
    flag: string;
    containerId: string;
}

type FishingVessel = ModeOfTransport;

export type CertificateTransport = Truck | Train | Plane | Vessel | FishingVessel;

export interface CertificateFish {
    name: string;
    code: string;
    scientificName?: string;
}

export interface CertificateLandingVessel {
    name: string,
    pln: string,
    length: number,
    fao?: string,
    flag: string, // the jurisdiction under whose laws the vessel is registered or licensed
    cfr: string // cost and freight (CFR)
}

interface Created {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
}

export interface IDefraValidationProcessingStatement {
    documentType:       string;
    documentNumber:     string;
    status:             string;
    devolvedAuthority?: string;
    dateCreated?:       Date;
    lastUpdated?:       Date;
    created?:           Created;
    userReference?:     string;
    audits?:            CertificateAudit[];
    exporterDetails?:   CertificateCompany;
    catches?:           ProcessingStatementReportCatch[];
    consignment?:       CertificateConsignment;
    healthCertificate?: HealthCertificate;
    plant?:             CertificatePlant;
    documentUri?:       string;
    failedSubmissions?: number;
    _correlationId:     string;
    requestedByAdmin:   boolean;
    exportedTo?:        ICountry;
    clonedFrom?:        string;
    parentDocumentVoid?: boolean;
}

export interface IDefraValidationStorageDocument {
    documentType:           string;
    documentNumber:         string;
    status:                 string;
    devolvedAuthority?:     string;
    dateCreated?:           Date;
    lastUpdated?:           Date;
    created?:               Created;
    userReference?:         string;
    audits?:                CertificateAudit[];
    exporterDetails?:       CertificateCompany;
    products?:              StorageDocumentReportCatch[];
    storageFacilities?:     CertificateStorageFacility[];
    storageFacility?:       CertificateStorageFacility;
    transportation?:        CertificateTransport;
    arrivalTransportation?: CertificateTransport;
    documentUri?:           string;
    failedSubmissions?:     number;
    _correlationId:         string;
    requestedByAdmin:       boolean;
    exportedTo?:            ICountry;
    clonedFrom?:            string;
    parentDocumentVoid?:    boolean;
}

export const countrySchema = new Schema({
  officialCountryName:  { type: String, required: true },
  isoCodeAlpha2:        { type: String, required: false },
  isoCodeAlpha3:        { type: String, required: false },
  isoNumericCode:       { type: String, required: false }
}, { _id: false });

export const DefraValidationProcessingStatementSchema = new Schema ({
    documentType:       { type: String,  required: true  },
    documentNumber:     { type: String,  required: true  },
    status:             { type: String,  required: true  },
    _correlationId:     { type: String,  required: true  },
    requestedByAdmin:   { type: Boolean, required: false, default: false },
    lastUpdated:        { type: Date,    required: false, default: Date.now },
    devolvedAuthority:  { type: String,  required: false },
    contactId:          { type: String,  required: false },
    accountId:          { type: String,  required: false },
    dateCreated:        { type: Date,    required: false },
    created:            { type: Object, required: false },
    userReference:      { type: String,  required: false },
    audits:             { type: [Schema.Types.Mixed],required: false },
    exporterDetails:    { type: Object,  required: false },
    catches:            { type: [Schema.Types.Mixed],required: false },
    consignment:        { type: Schema.Types.Mixed,  required: false },
    healthCertificate:  { type: Object,  required: false },
    plant:              { type: Schema.Types.Mixed,  required: false },
    documentUri:        { type: String,  required: false },
    exportedTo:         { type: countrySchema, required: false },
    failedSubmissions:  { type: Number,  required: false },
    _processed:         { type: Boolean, required: false, default: false },
    clonedFrom:         { type: String, required: false },
    parentDocumentVoid: { type: Boolean, required: false }
});

export const DefraValidationStorageDocumentSchema = new Schema ({
    documentType:               { type: String,  required: true  },
    documentNumber:             { type: String,  required: true  },
    status:                     { type: String,  required: true  },
    _correlationId:             { type: String,  required: true  },
    requestedByAdmin:           { type: Boolean, required: false, default: false },
    lastUpdated:                { type: Date,    required: false, default: Date.now },
    devolvedAuthority:          { type: String,  required: false },
    contactId:                  { type: String,  required: false },
    accountId:                  { type: String,  required: false },
    dateCreated:                { type: Date,    required: false },
    created:                    { type: Object,  required: false },
    userReference:              { type: String,  required: false },
    audits:                     { type: [Schema.Types.Mixed],  required: false },
    exporterDetails:            { type: Object,  required: false },
    products:                   { type: [Schema.Types.Mixed],  required: false },
    storageFacilities:          { type: [Schema.Types.Mixed],  required: false, default: undefined },
    storageFacility:            { type: Object,  required: false },
    transportation:             { type: Schema.Types.Mixed,    required: false },
    arrivalTransportation:      { type: Schema.Types.Mixed,    required: false },
    documentUri:                { type: String,  required: false },
    exportedTo:                 { type: countrySchema, required: false },
    failedSubmissions:          { type: Number,  required: false },
    _processed:                 { type: Boolean, required: false, default: false },
    clonedFrom:                 { type: String, required: false },
    parentDocumentVoid:         { type: Boolean, required: false }
});

export const DefraValidationCatchCertificateSchema = new Schema ({
    documentType:          { type: String,  required: true  },
    documentNumber:        { type: String,  required: true  },
    status:                { type: String,  required: true  },
    _correlationId:        { type: String,  required: true  },
    requestedByAdmin:      { type: Boolean, required: false, default: false },
    lastUpdated:           { type: Date,    required: false, default: Date.now },
    devolvedAuthority:     { type: String,  required: false },
    dateCreated:           { type: Date,    required: false },
    created:               { type: Object,  required: false },
    userReference:         { type: String,  required: false },
    audits:                { type: [Schema.Types.Mixed],  required: false },
    exporterDetails:       { type: Object,  required: false },
    landings:              { type: [Schema.Types.Mixed],  required: false },
    conservationReference: { type: String,  required: false },
    documentUri:           { type: String,  required: false },
    exportedFrom:          { type: String,  required: false },
    exportedTo:            { type: countrySchema, required: false },
    transportation:        { type: Object,  required: false },
    transportations:       { type: [Schema.Types.Mixed],  required: false },
    failedSubmissions:     { type: Number,  required: false },
    _processed:            { type: Boolean, required: false, default: false },
    clonedFrom:            { type: String,  required: false },
    landingsCloned:        { type: Boolean, required: false },
    parentDocumentVoid:    { type: Boolean, required: false }
});

export const DefraValidationReportSchema = new Schema({
    certificateId:      { type: String,  required: true  },
    status:             { type: String,  required: true  },
    requestedByAdmin:   { type: Boolean, required: false, default: false },
    landingId:          { type: String,  required: false },
    validationPass:     { type: Boolean, required: false },
    lastUpdated:        { type: Date,    required: false, default: Date.now },
    isUnblocked:        { type: Boolean, required: false, default: false },
    _processed:         { type: Boolean, required: false, default: false }
});

export const baseConfig = {
    discriminationKey: '_type',
    collection: 'defravalidationreports'
};

export type IDefraValidationReportData = Document
export interface IDefraValidationProcessingStatementModel extends IDefraValidationProcessingStatement, Document {}
export interface IDefraValidationStorageDocumentModel extends IDefraValidationStorageDocument, Document {}
export interface IDefraValidationCatchCertificateModel extends IDefraValidationCatchCertificate, Document {}
export interface IDefraValidationReportModel extends IDefraValidationReport, Document {}

export const DefraValidationReportData = model<IDefraValidationReportData>('DefraValidationReportData', new Schema({}, baseConfig));
export const DefraValidationReportModel = DefraValidationReportData.discriminator<IDefraValidationReportModel>('defraValidationReport', DefraValidationReportSchema);
export const DefraValidationProcessingStatementModel = DefraValidationReportData.discriminator<IDefraValidationProcessingStatementModel>('defraValidationProcessingStatement', DefraValidationProcessingStatementSchema);
export const DefraValidationStorageDocumentModel = DefraValidationReportData.discriminator<IDefraValidationStorageDocumentModel>('defraValidationStorageDocument', DefraValidationStorageDocumentSchema);
export const DefraValidationCatchCertificateModel = DefraValidationReportData.discriminator<IDefraValidationCatchCertificateModel>('defraValidationCatchCertificate', DefraValidationCatchCertificateSchema);