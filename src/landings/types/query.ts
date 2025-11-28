import { model, Schema, Document } from 'mongoose';
import { ICcQueryResult, ICountry } from 'mmo-shared-reference-data';


const EmptySchema = new Schema({},{strict:false });

export const FailedOnlineCertificates  = model<ICcQueryResultModel>('failedOnlineCertificates', EmptySchema);
export const FailedOnlineSdPs  = model<ISdPsQueryResultModel>('failedOnlineCertificates', EmptySchema);


export interface ICcQueryResultModel extends ICcQueryResult, Document {}

export interface ISdPsQueryResult {
  documentNumber: string;
  catchCertificateNumber?: string;
  catchCertificateType?: string;
  issuingCountry?: ICountry;
  status: string;
  documentType: string;
  createdAt: string;
  da: string | null;
  species: string;
  scientificName?: string;
  commodityCode: string;
  weightOnDoc: number;
  extended: {
    id: string,
    exporterCompanyName?: string,
    url?: string,
    investigation?: string,
    preApprovedBy?: string,
    voidedBy?: string;
  }
  weightOnAllDocs: number;
  weightOnFCC: number;
  weightAfterProcessing?: number;
  isOverAllocated: boolean;
  overAllocatedByWeight: number;
  overUsedInfo: string[]; //Linked PS or SD
  isMismatch: boolean;
  netWeightProductArrival?: string,
  netWeightFisheryProductArrival?: string,
  netWeightProductDeparture?: string,
  netWeightFisheryProductDeparture?: string,
  supportingDocuments?: string,
  productDescription?: string,
}

export interface ISdPsQueryResultModel extends ISdPsQueryResult, Document {}

export interface IBatchReportBase {
  documentNumber: string;
  documentType: string;
  documentStatus: string;
  documentUrl: string;
  timestamp: string;
  date: string | undefined;
  time: string | undefined;
  exporter: string;
  exporterCompanyName: string;
  id: string;
  exporterName: string;
  authority: string;
  speciesCode: string;
  speciesName: string;
  weight: number;
}

export interface ICcBatchReport extends IBatchReportBase {
  directLanding: string;
  vessel: string;
  pln: string;
  rssNumber: string;
  dateLanded: string;
  productState: string;
  productPresentation: string;
  productCommodityCode: string;
  investigatedBy: string;
  investigationStatus: string;
}

export interface ISdPsBatchReport extends IBatchReportBase {
  productCommodityCode: string;
  investigatedBy: string;
  investigationStatus: string;
  voidedBy: string | undefined;
}

export interface ICcBatchValidationReport extends ICcBatchReport {
  speciesAlias: string | undefined;
  speciesAnomaly: string | undefined;
  rawLandingsUrl: string;
  salesNotesUrl: string;
  voidedBy: string | undefined;
  preApprovedBy: string | undefined;
  weightFactor: number | undefined;
  exportWeight: number | undefined;
  weightOnLandingAllSpecies: number | undefined;
  landingBreakdowns: string | undefined;
  aggregatedLandedDecWeight: number | undefined,
  aggregatedLiveWeight: number | undefined,
  aggregatedEstimateWeight: number | undefined,
  aggregatedEstimateWeightPlusTolerance: number | undefined,
  exportedWeightExceedingEstimateLandedWeight: number | undefined;
  FI0_41_unavailabilityDuration: string;
  FI0_47_unavailabilityExceeds14Days: string | undefined;
  FI0_288_numberOfLandings: number | undefined;
  FI0_289_speciesMismatch: string | undefined;
  FI0_290_exportedWeightExceedingLandedWeight: string;
  FI0_291_totalExportWeights: number;
  FI0_136_numberOfFailedValidations: number;
}

export interface ISdPsBatchValidationReport extends ISdPsBatchReport {
  inputWeightMismatch: string | undefined;
  exportWeightExceeded: number;
  preApprovedBy: string | undefined;
}