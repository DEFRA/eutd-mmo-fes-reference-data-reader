import { BoomiService, IEuUpgradeCallback, IEuUpgradeResponse } from 'mmo-shared-reference-data';
import logger from '../logger';
import CatchCertificateTransformerService from '../services/catch-certificate-transformer.service';
import ProcessingStatementTransformerService from '../services/processing-statement-transformer.service';
import { getCertificateByDocumentNumberWithNumberOfFailedAttempts, updateCertificateEuCatchStatus } from '../landings/persistence/catchCert';
import { IDocument } from '../landings/types/document';
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

    const document = await getCertificateByDocumentNumberWithNumberOfFailedAttempts(
      documentNumber,
      docType
    );

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


async function handleCatchCertificateSubmission(documentNumber: string, createdAt: Date, exportData: any, operation: 'submit' | 'void', catchSubmission: ICatchStatus | undefined) {
  logger.info(`[DOCUMENT-SUBMISSION][${documentNumber}][TRANSFORMING-CC-TO-UN-CEFACT]`);
  const transformedPayload = (operation === 'void') ? CatchCertificateTransformerService.generateVoidCatchPayload(catchSubmission?.reference) : CatchCertificateTransformerService.generateCatchPayload(
    documentNumber,
    createdAt,
    exportData
  );

  const resourceType = getResourceType(operation);
  const params = { documentType: "CATCHCERTIFICATE" };
  const response: IEuUpgradeCallback = await BoomiService.sendDocumentToBoomi(transformedPayload, params, resourceType);
  const statusData: IEuUpgradeResponse = BoomiService.processEuUpgradeCallback(response);
  await updateCertificateEuCatchStatus(documentNumber, statusData);
}

/**
 * Checks if a product has only description with no substantive details (catches)
 */
const isDescriptionOnlyProduct = (product: any): boolean => {
  if (!product || typeof product !== 'object') return true;

  // Check if product has catches array with content
  const catches = product.catches || product.caughtBy || [];
  const hasCatches = Array.isArray(catches) && catches.length > 0;

  // Check if product has at least a description
  const descriptionFields = ['description', 'productDescription', 'consignmentDescription'];
  const hasDescription = descriptionFields.some(field => {
    const value = product[field];
    return value && typeof value === 'string' && value.trim().length > 0;
  });

  // Product is description-only if it has description but no catches
  return hasDescription && !hasCatches;
};

async function handleProcessingStatementSubmission(documentNumber: string, createdAt: Date, exportData: any, operation: 'submit' | 'void') {
  const products = Array.isArray(exportData.products) ? exportData.products : [];

  // Validate: block products that have only description and no catches/certificates
  const descriptionOnlyProducts = products.filter(isDescriptionOnlyProduct);
  if (descriptionOnlyProducts.length > 0) {
    logger.error(`[DOCUMENT-SUBMISSION][${documentNumber}][PS][VALIDATION][DESCRIPTION-ONLY-PRODUCTS][COUNT:${descriptionOnlyProducts.length}]`);
    throw new Error('PROCESSING_STATEMENT_PRODUCT_DETAILS_REQUIRED');
  }

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
    personResponsibleForConsignment: exportData.personResponsibleForConsignment
  };
  logger.info(`[DOCUMENT-SUBMISSION][${documentNumber}][TRANSFORMING-PS-TO-UN-CEFACT]`);
  const transformedPayload = ProcessingStatementTransformerService.generateProcessingStatementPayload(
    documentNumber,
    createdAt,
    transformedExportData
  );
  const resourceType = getResourceType(operation);
  const params = { documentType: "PROCESSINGSTATEMENT" };
  const response: IEuUpgradeCallback = await BoomiService.sendDocumentToBoomi(transformedPayload, params, resourceType);
  const statusData: IEuUpgradeResponse = BoomiService.processEuUpgradeCallback(response);
  await updateCertificateEuCatchStatus(documentNumber, statusData);
}

async function handleStorageNotesSubmission(documentNumber: string, createdAt: Date, exportData: any, operation: 'submit' | 'void') {
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
    transport: exportData.transport,
    unloadingPlace: exportData.unloadingPlace
  };
  logger.info(`[DOCUMENT-SUBMISSION][${documentNumber}][TRANSFORMING-SD-TO-UN-CEFACT]`);
  const transformedPayload = StorageNotesTransformerService.generateStorageNotesPayload(documentNumber, createdAt, transformedExportData);
  const resourceType = getResourceType(operation);
  const params = { documentType: "STORAGEDOCUMENT" };
  const response: IEuUpgradeCallback = await BoomiService.sendDocumentToBoomi(transformedPayload, params, resourceType);
  const statusData: IEuUpgradeResponse = BoomiService.processEuUpgradeCallback(response);
  await updateCertificateEuCatchStatus(documentNumber, statusData);
}

export const submitDocumentToBoomi = async (
  rawPayload: IRawDocumentSubmissionPayload
): Promise<void> => {
  const documentNumber = getDocumentNumberForToBoomi(rawPayload);
  const operation = getOperationsForToBoomi(rawPayload);

  // Determine document type from document number
  const docType = getDocumentType(documentNumber);

  logger.info(`[DOCUMENT-SUBMISSION][${documentNumber}][START][TYPE:${docType}][OPERATION:${operation}]`);

  try {
    // Fetch document data from database
    logger.info(`[DOCUMENT-SUBMISSION][${documentNumber}][FETCHING-DATA][TYPE:${docType}]`);
    const document = await fetchDocumentData(documentNumber, docType);

    // Extract data from document.exportData
    const { exportData, createdAt, catchSubmission } = document;

    if (!exportData) {
      throw new Error(`No exportData found for document number: ${documentNumber}`);
    }

    logger.info(`[DOCUMENT-SUBMISSION][${documentNumber}][DATA-EXTRACTED][TYPE:${docType}]`);

    if (docType === 'catchCert') {
      await handleCatchCertificateSubmission(documentNumber, createdAt, exportData, operation, catchSubmission);
    } else if (docType === 'processingStatement') {
      await handleProcessingStatementSubmission(documentNumber, createdAt, exportData, operation);
    } else if (docType === 'storageDocument') {
      await handleStorageNotesSubmission(documentNumber, createdAt, exportData, operation);
    }

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
