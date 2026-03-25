import { BoomiService, IEuUpgradeCallback, IEuUpgradeResponse } from 'mmo-shared-reference-data';
import logger from '../logger';
import { performance } from 'node:perf_hooks';
import CatchCertificateTransformerService from '../services/catch-certificate-transformer.service';
import ProcessingStatementTransformerService from '../services/processing-statement-transformer.service';
import { updateCertificateEuCatchStatus } from '../landings/persistence/catchCert';
import { DocumentModel, DocumentStatuses, IDocument } from '../landings/types/document';
import { getDocumentType } from './dataHub';
import StorageNotesTransformerService from '../services/storage-notes-transformer.service';
import { ICatchStatus } from './euUpgrade';

// Catch Certificate payload structure
export interface ICatchSubmissionPayload {
  CreateCatchCertificateRequest: {
    SPSCertificate: any;
  };
}

// Processing Statement payload structure
export interface IProcessingStatementSubmissionPayload {
  CreateCatchProcessingStatementRequest: {
    SPSCertificate: any;
  };
}

// Storage Notes payload structure
export interface IStorageNotesSubmissionPayload {
  CreateCatchNonManipulationDocumentRequest: {
    CatchNonManipulationDocument: any;
  };
}

// Union type for all document payloads
export type IDocumentSubmissionPayload =
  | ICatchSubmissionPayload
  | IProcessingStatementSubmissionPayload
  | IStorageNotesSubmissionPayload;

// Unified payload from orchestration (only documentNumber and operation)
export interface IRawDocumentSubmissionPayload {
  documentNumber: string;
  operation: 'submit' | 'void';
}

const fetchDocumentData = async (documentNumber: string, docType: string): Promise<IDocument> => {
  try {
    logger.info(`[DOCUMENT-SUBMISSION][FETCH-DATA][${documentNumber}][TYPE:${docType}][START]`);

    const document = await DocumentModel.findOne({
      documentNumber,
      __t: docType,
      status: { $in: [DocumentStatuses.Complete, DocumentStatuses.Void] }
    }).lean();

    if (!document) {
      throw new Error(`Document not found for document number: ${documentNumber}`);
    }

    logger.info(`[DOCUMENT-SUBMISSION][FETCH-DATA][${documentNumber}][TYPE:${docType}][SUCCESS]`);
    return document;
  } catch (error) {
    logger.error(`[DOCUMENT-SUBMISSION][FETCH-DATA][${documentNumber}][TYPE:${docType}][ERROR][${error.message}]`);
    throw error;
  }
};

const getDocumentNumberForToBoomi = (rawPayload: IRawDocumentSubmissionPayload) => rawPayload.documentNumber || 'UNKNOWN';
const getOperationsForToBoomi = (rawPayload: IRawDocumentSubmissionPayload) => rawPayload.operation || 'submit';
const getResourceType = (operation: "submit" | "void") => operation === 'void' ? 'catchVoid' : 'catchSubmit';
const generateVoidCatchPayload = (documentNumber: string, key: 'CancelCatchCertificateRequest' | 'CancelProcessingStatementRequest') => {
  return {
    [key]: {
      SPSCertificate: {
        ID: {
          value: documentNumber
        }
      }
    }
  }
}


const sendPayloadAndUpdate = async (
  documentNumber: string,
  transformedPayload: any,
  params: any,
  resourceType: any,
  typeLabel: string,
  timing: { start: number; transformMs: number },
  operation: 'submit' | 'void'
) => {
  const submitStart = performance.now();
  const response: IEuUpgradeCallback = await BoomiService.sendDocumentToBoomi(transformedPayload, params, resourceType);
  const submitMs = Math.round(performance.now() - submitStart);
  const statusData: IEuUpgradeResponse = BoomiService.processEuUpgradeCallback(response);

  const updateStart = performance.now();
  await updateCertificateEuCatchStatus(documentNumber, statusData);

  const updateMs = Math.round(performance.now() - updateStart);
  const totalMs = Math.round(performance.now() - timing.start);
  logger.info(`[PERF][POST /v1/catch-submission] type=${typeLabel} transform=${timing.transformMs}ms boomi=${submitMs}ms updateStatus=${updateMs}ms total=${totalMs}ms documentNumber=${documentNumber} operation=${operation}`);
}


async function handleCatchCertificateSubmission(documentNumber: string, createdAt: Date, exportData: any, operation: 'submit' | 'void', catchSubmission: ICatchStatus | undefined) {
  const start = performance.now();
  logger.info(`[DOCUMENT-SUBMISSION][${documentNumber}][TRANSFORMING-CC-TO-UN-CEFACT]`);
  const transformStart = performance.now();
  const transformedPayload = (operation === 'void') ? generateVoidCatchPayload(catchSubmission?.reference, 'CancelCatchCertificateRequest') : CatchCertificateTransformerService.generateCatchPayload(
      documentNumber,
      createdAt,
      exportData
    );
  const transformMs = Math.round(performance.now() - transformStart);

  const resourceType = getResourceType(operation);
  const params = { documentType: "CATCHCERTIFICATE" };
  await sendPayloadAndUpdate(documentNumber, transformedPayload, params, resourceType, 'catchCert', { start, transformMs }, operation);
}

async function handleProcessingStatementSubmission(documentNumber: string, createdAt: Date, exportData: any, operation: 'submit' | 'void', catchSubmission: ICatchStatus | undefined) {
  const start = performance.now();
  const products = Array.isArray(exportData.products) ? exportData.products : [];

  const transformedExportData = {
    products: products,
    catches: exportData.catches || [],
    exporterDetails: exportData.exporterDetails,
    exportedTo: exportData.exportedTo,
    plantName: exportData.plantName,
    plantApprovalNumber: exportData.plantApprovalNumber,
    plantAddressOne: exportData.plantAddressOne,
    plantTownCity: exportData.plantTownCity,
    plantPostcode: exportData.plantPostcode,
    healthCertificateNumber: exportData.healthCertificateNumber,
    healthCertificateDate: exportData.healthCertificateDate,
    dateOfAcceptance: exportData.dateOfAcceptance,
    consignmentDescription: exportData.consignmentDescription,
    personResponsibleForConsignment: exportData.personResponsibleForConsignment,
    pointOfDestination: exportData.pointOfDestination,
  };
  logger.info(`[DOCUMENT-SUBMISSION][${documentNumber}][TRANSFORMING-PS-TO-UN-CEFACT]`);
  const transformStart = performance.now();
  const transformedPayload = (operation === 'void') ? generateVoidCatchPayload(catchSubmission?.reference, 'CancelProcessingStatementRequest') : ProcessingStatementTransformerService.generateProcessingStatementPayload(
      documentNumber,
      createdAt,
      transformedExportData
    );
  const transformMs = Math.round(performance.now() - transformStart);
  const resourceType = getResourceType(operation);
  const params = { documentType: "PROCESSINGSTATEMENT" };
  await sendPayloadAndUpdate(documentNumber, transformedPayload, params, resourceType, 'processingStatement', { start, transformMs }, operation);
}

async function handleStorageNotesSubmission(documentNumber: string, createdAt: Date, exportData: any, operation: 'submit' | 'void', catchSubmission: ICatchStatus | undefined) {
  const start = performance.now();
  const transformedExportData = {
    catches: exportData.catches || [],
    exporterDetails: exportData.exporterDetails,
    exportedTo: exportData.exportedTo,
    exportLocation: exportData.exportLocation,
    facilityName: exportData.facilityName,
    facilityApprovalNumber: exportData.facilityApprovalNumber,
    facilityAddressOne: exportData.facilityAddressOne,
    facilityTownCity: exportData.facilityTownCity,
    facilityPostcode: exportData.facilityPostcode,
    facilityArrivalDate: exportData.facilityArrivalDate,
    facilityStorage: exportData.facilityStorage,
    transport: exportData.transportation,
    arrivalTransport: exportData.arrivalTransportation
  };
  logger.info(`[DOCUMENT-SUBMISSION][${documentNumber}][TRANSFORMING-SD-TO-UN-CEFACT]`);
  const transformStart = performance.now();
  const transformedPayload = operation === 'void' ? {
    CancelCatchNonManipulationDocumentRequest: {
      CatchNonManipulationDocument: {
        ID: {
          value: catchSubmission?.reference
        }
      }
    }
  } : StorageNotesTransformerService.generateStorageNotesPayload(documentNumber, createdAt, transformedExportData);
  const transformMs = Math.round(performance.now() - transformStart);
  const resourceType = getResourceType(operation);
  const params = { documentType: operation === 'void' ? "NMDOCUMENT" : "NONMANIPULATIONDOCUMENT" };
  await sendPayloadAndUpdate(documentNumber, transformedPayload, params, resourceType, 'storageDocument', { start, transformMs }, operation);
}

export const submitDocumentToBoomi = async (
  rawPayload: IRawDocumentSubmissionPayload
): Promise<void> => {
  const totalStart = performance.now();
  const documentNumber = getDocumentNumberForToBoomi(rawPayload);
  const operation = getOperationsForToBoomi(rawPayload);

  // Determine document type from document number
  const docType = getDocumentType(documentNumber);

  logger.info(`[DOCUMENT-SUBMISSION][${documentNumber}][START][TYPE:${docType}][OPERATION:${operation}]`);

  try {
    // Fetch document data from database
    logger.info(`[DOCUMENT-SUBMISSION][${documentNumber}][FETCHING-DATA][TYPE:${docType}]`);
    const fetchStart = performance.now();
    const document = await fetchDocumentData(documentNumber, docType);
    logger.info(`[PERF][POST /v1/catch-submission] fetchDocumentData=${Math.round(performance.now() - fetchStart)}ms documentNumber=${documentNumber} type=${docType}`);

    // Extract data from document.exportData
    const { exportData, createdAt, catchSubmission } = document;

    if (!exportData) {
      throw new Error(`No exportData found for document number: ${documentNumber}`);
    }

    logger.info(`[DOCUMENT-SUBMISSION][${documentNumber}][DATA-EXTRACTED][TYPE:${docType}]`);

    if (docType === 'catchCert') {
      await handleCatchCertificateSubmission(documentNumber, createdAt, exportData, operation, catchSubmission);
    } else if (docType === 'processingStatement') {
      await handleProcessingStatementSubmission(documentNumber, createdAt, exportData, operation, catchSubmission);
    } else if (docType === 'storageDocument') {
      await handleStorageNotesSubmission(documentNumber, createdAt, exportData, operation, catchSubmission);
    }

    logger.info(`[PERF][POST /v1/catch-submission] total=${Math.round(performance.now() - totalStart)}ms documentNumber=${documentNumber} type=${docType} operation=${operation}`);

  } catch (error) {
    logger.error(`[DOCUMENT-SUBMISSION][${documentNumber}][TYPE:${docType}][ERROR][${error.message}][OPERATION:${operation}]`);

    const errorCatchApiResponse: IEuUpgradeResponse = {
      euCatchStatus: 'FAILURE',
      faultCode: 'S:Client',
      faultString: error.message,
      documentNumber
    };

    // update document with error
    await updateCertificateEuCatchStatus(documentNumber, errorCatchApiResponse);

    throw error;
  }
};
