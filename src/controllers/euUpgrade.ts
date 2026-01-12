import {
  BoomiService,
  IEuUpgradeCallback,
  IEuUpgradeResponse
} from 'mmo-shared-reference-data';
import logger from '../logger';
import { updateCertificateEuCatchStatus } from '../landings/persistence/catchCert';

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
    const result = BoomiService.processEuUpgradeCallback(callbackData);

    // The shared service already processes and returns the structured response
    // Now just update the database based on the result
    await updateCertificateEuCatchStatus(result.documentNumber, result);
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
