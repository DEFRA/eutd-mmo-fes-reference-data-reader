import { ServiceBusMessage } from "@azure/service-bus";
import { toDynamicsCcCase, toDynamicsLandingDetails, toDynamicsPs, toDynamicsSd } from "../transformations/dynamicsValidation";
import { addToReportQueue, MessageLabel, ICcQueryResult, IDynamicsLandingCase } from "mmo-shared-reference-data";
import { IDocument } from "../types/document";
import { ISdPsQueryResult } from "../types/query";
import { IDynamicsProcessingStatementCase, IDynamicsStorageDocumentCase, SdPsCaseTwoType } from "../types/dynamicsSdPsCase";
import { CaseTwoType, IDynamicsCatchCertificateCase } from "../types/dynamicsCcCase";
import config from "../../config";
import logger from "../../logger";

export const reportPs = async (
  sdpsValidationData: ISdPsQueryResult[] | null,
  processingStatement: IDocument,
  correlationId: string,
  caselabel: MessageLabel,
  caseTypeTwo?: SdPsCaseTwoType): Promise<IDynamicsProcessingStatementCase> => {
  const psCase: IDynamicsProcessingStatementCase = toDynamicsPs(
    sdpsValidationData,
    processingStatement,
    correlationId,
    caseTypeTwo
  );

  if (!psCase.clonedFrom) {
    delete psCase.clonedFrom;
    delete psCase.parentDocumentVoid;
  }

  logger.info(`[CASE-MANAGEMENT-PS][DOCUMENT-NUMBER][${processingStatement.documentNumber}][CORRELATION-ID][${correlationId}]`);

  const message: ServiceBusMessage = {
    body: psCase,
    subject: `${caselabel}-${processingStatement.documentNumber}`,
    sessionId: correlationId
  };

  await addToReportQueue(
    processingStatement.documentNumber,
    message,
    config.azureQueueUrl,
    config.azureReportQueueName,
    config.enableReportToQueue
  );

  return psCase;
};

export const reportSd = async (
  sdpsValidationData: ISdPsQueryResult[] | null,
  storageDocument: IDocument,
  correlationId: string,
  caselabel: MessageLabel,
  caseTypeTwo?: SdPsCaseTwoType): Promise<IDynamicsStorageDocumentCase> => {
  const sdCase: IDynamicsStorageDocumentCase = toDynamicsSd(
    sdpsValidationData,
    storageDocument,
    correlationId,
    caseTypeTwo
  );

  if (!sdCase.clonedFrom) {
    delete sdCase.clonedFrom;
    delete sdCase.parentDocumentVoid;
  }

  logger.info(`[CASE-MANAGEMENT-SD][DOCUMENT-NUMBER][${storageDocument.documentNumber}][CORRELATION-ID][${correlationId}]`);

  const message: ServiceBusMessage = {
    body: sdCase,
    subject: `${caselabel}-${storageDocument.documentNumber}`,
    sessionId: correlationId
  };

  await addToReportQueue(
    storageDocument.documentNumber,
    message,
    config.azureQueueUrl,
    config.azureReportQueueName,
    config.enableReportToQueue
  );

  return sdCase;
};

export const reportCc = async (
  ccValidationData: ICcQueryResult[],
  certificate: IDocument,
  correlationId: string,
  caselabel: MessageLabel,
  caseType2?: CaseTwoType
): Promise<IDynamicsCatchCertificateCase> => {

  const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = toDynamicsCcCase(
    ccValidationData,
    certificate,
    correlationId,
    caseType2
  );

  if (!dynamicsCatchCertificateCase.clonedFrom) {
    delete dynamicsCatchCertificateCase.clonedFrom;
    delete dynamicsCatchCertificateCase.landingsCloned;
    delete dynamicsCatchCertificateCase.parentDocumentVoid;
  }

  logger.info(`[CASE-MANAGEMENT-CC][DOCUMENT-NUMBER][${certificate.documentNumber}][CORRELATION-ID][${correlationId}]`);

  const message: ServiceBusMessage = {
    body: dynamicsCatchCertificateCase,
    subject: `${caselabel}-${certificate.documentNumber}`,
    sessionId: correlationId
  };

  await addToReportQueue(
    certificate.documentNumber,
    message,
    config.azureQueueUrl,
    config.azureReportQueueName,
    config.enableReportToQueue
  );

  return dynamicsCatchCertificateCase;
}

export const reportCcLandingUpdate = async (
  ccValidationData: ICcQueryResult[],
  certificate: IDocument,
  correlationId: string,
  caselabel: MessageLabel
): Promise<void> => {

  const dynamicsLandingsCase: IDynamicsLandingCase[] = toDynamicsLandingDetails(ccValidationData, certificate, correlationId);

  if (!Array.isArray(dynamicsLandingsCase) || dynamicsLandingsCase.length === 0) {
    logger.error(`[LANDING-DETAIL-CC][DOCUMENT-NUMBER][${certificate.documentNumber}][CORRELATION-ID][${correlationId}][NO-LANDING-UPDATES]`);
    return;
  }

  logger.info(`[LANDING-DETAIL-CC][DOCUMENT-NUMBER][${certificate.documentNumber}][CORRELATION-ID][${correlationId}][NUMBER-OF-LANDINGS][${dynamicsLandingsCase.length}]`);

  const message: ServiceBusMessage = {
    body: dynamicsLandingsCase,
    subject: `${caselabel}-${certificate.documentNumber}`,
    sessionId: correlationId
  };

  await addToReportQueue(
    certificate.documentNumber,
    message,
    config.azureQueueUrl,
    config.azureReportQueueName,
    config.enableReportToQueue
  );
}