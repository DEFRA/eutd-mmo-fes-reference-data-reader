import {
  BoomiService,
  IEuUpgradeCallback,
  IEuUpgradeResponse
} from 'mmo-shared-reference-data';
import logger from '../logger';
import { updateCertificateEuCatchStatus } from '../landings/persistence/catchCert';
import { DocumentModel, DocumentStatuses } from '../landings/types/document';
import { updateEuCatchOperatorId } from '../data/euCatch';

export type euStatus = 'SUCCESS' | 'FAILURE' | 'IN_PROGRESS';
export interface ICatchStatus {
  status: euStatus;
  reference?: string;
  message?: string;
  code?: string;
  name?: string;
  uri?: string;
  timestamp?: string;
  reasonInformation?: string;
  requestId?: string;
  faultCode?: string;
  faultString?: string;
  validationErrors?: Array<{
    id: string;
    message: string;
    field: string;
  }>;
}

const hasMeaningfulValue = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const toOperatorIdentifier = (statusData: IEuUpgradeResponse): string | undefined => {
  const operatorIdentifier = (statusData as unknown as Record<string, unknown>)?.OperatorIdentifier;

  if (!hasMeaningfulValue(operatorIdentifier)) {
    return undefined;
  }

  return operatorIdentifier;
};

const tryUpdateEuCatchOperatorFromCallback = async (
  documentNumber: string,
  statusData: IEuUpgradeResponse,
): Promise<void> => {
  try {
    const document = await DocumentModel.findOne({
      documentNumber,
      status: { $in: [DocumentStatuses.Complete, DocumentStatuses.Void] }
    }).lean();

    if (!document) {
      logger.info('[EU-UPGRADE][CALLBACK][CRM-UPDATE][SKIPPED][DOCUMENT-NOT-FOUND]');
      return;
    }

    if (document.status === DocumentStatuses.Void) {
      logger.info('[EU-UPGRADE][CALLBACK][CRM-UPDATE][SKIPPED][VOID-STATUS]');
      return;
    }

    const accountId = document?.exportData?.exporterDetails?.accountId;
    const operatorIdentifier = toOperatorIdentifier(statusData);

    if (!hasMeaningfulValue(accountId) || !operatorIdentifier) {
      logger.info('[EU-UPGRADE][CALLBACK][CRM-UPDATE][SKIPPED][MISSING-DATA]');
      return;
    }

    const updated = await updateEuCatchOperatorId(accountId, operatorIdentifier);
    logger.info(`[EU-UPGRADE][CALLBACK][CRM-UPDATE][OUTCOME][${updated ? 'UPDATED' : 'NOT-UPDATED'}]`);
  } catch (error: unknown) {
    const errorCategory = error instanceof Error ? error.name : 'UnknownError';
    logger.warn(`[EU-UPGRADE][CALLBACK][CRM-UPDATE][ERROR][${errorCategory}]`);
  }
};

/**
 * Process EU upgrade callback from BOOMI
 * Implements Scenario 3 from FI0-10355
 *
 * This controller receives callbacks from BOOMI indicating whether a catch certificate
 * was successfully submitted to the EU CATCH system or if it failed.
 *
 * @returns Structured JSON object ready for database insertion
 */
export const processEuUpgradeCallback = async (
  callbackData: IEuUpgradeCallback,
): Promise<void> => {
  try {
    // Validate and process the callback data using the shared service
    const result: IEuUpgradeResponse = BoomiService.processEuUpgradeCallback(callbackData);

    // The shared service already processes and returns the structured response
    // Now just update the database based on the result
    await updateCertificateEuCatchStatus(result.documentNumber, result);
    await tryUpdateEuCatchOperatorFromCallback(result.documentNumber, result);
    logger.info(`[EU-UPGRADE][CALLBACK][SUCCESS][CERTIFICATE-ID:${result.documentNumber}][DATABASE-UPDATED]`);
  } catch (error) {
    logger.error( `[EU-UPGRADE][CALLBACK][ERROR][${error.message}]`);
    throw error;
  }
};

export const toBackEndCatchSubmission = (data: IEuUpgradeResponse): ICatchStatus => {
  return {
    status: data.euCatchStatus,
    message: data.euCatchStatusMessage,
    reference: data.euCatchReferenceNumber,
    code: data.euCatchStatusCode,
    name: data.euCatchStatusName,
    uri: data.euCatchUri,
    timestamp: data.euCatchTimestamp,
    reasonInformation: data.reasonInformation,
    faultCode: data.faultCode,
    faultString: data.faultString,
    validationErrors: Array.isArray(data.validationErrors) ? data.validationErrors.map((error: {
      errorId: string;
      errorMessage: string;
      errorField: string;
    }) => ({
      id: error.errorId,
      message: error.errorMessage,
      field: error.errorField
    })) : undefined
  }
}
