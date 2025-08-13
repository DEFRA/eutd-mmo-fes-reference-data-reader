import path from "path";
import Ajv from 'ajv';
import  addFormats from "ajv-formats";
import { readFileSync } from "fs";
import { v4 as uuidv4 } from 'uuid';
import { ServiceBusMessage } from "@azure/service-bus";
import { MessageLabel, addToReportQueue, ICcQueryResult, IDefraTradeCatchCertificate, CertificateStatus } from "mmo-shared-reference-data";
import { IDefraTradeProcessingStatement, IDefraTradeStorageDocument } from "../types/defraTradeSdPsCase";
import { IDocument } from "../types/document";
import { toDefraTradeCc, toDefraTradePs, toDefraTradeSd } from "../transformations/defraTradeValidation";
import { IDynamicsCatchCertificateCase } from "../types/dynamicsCcCase";
import { ISdPsQueryResult } from "../types/query";
import { IDynamicsStorageDocumentCase, IDynamicsProcessingStatementCase, IDynamicsProcessingStatementCatch, IDynamicsStorageDocumentProduct } from "../types/dynamicsSdPsCase";

import config from "../../config";
import logger from "../../logger";
import moment from "moment";

const Type = Object.freeze({
  GLOBAL: 'Global',
  INTERNAL: 'Internal',
  INFO: 'Info'
});

const getValidator = (schema: string): any => {
  const ajv = new Ajv();
  ajv.addKeyword("definition")
  addFormats(ajv)
  const schemaData = readFileSync(path.join(__dirname + '../../../../data/schemas/Defra Trade Reporting/', schema), { encoding: 'utf8' });
  const schemaJson = JSON.parse(schemaData);
  return ajv.compile(schemaJson);
}

export const reportCcToTrade = async (
  certificate: IDocument,
  caselabel: MessageLabel,
  certificateCase: IDynamicsCatchCertificateCase,
  ccQueryResults: ICcQueryResult[] | null
): Promise<void> => {

  const catchCertificateCase = {...certificateCase}

  delete catchCertificateCase.clonedFrom;
  delete catchCertificateCase.landingsCloned;
  delete catchCertificateCase.parentDocumentVoid;
  delete catchCertificateCase.caseRiskAtSubmission;
  delete catchCertificateCase.caseStatusAtSubmission;
  delete catchCertificateCase.caseOutcomeAtSubmission;

  if (!config.azureTradeQueueEnabled) {
    logger.info(`[DEFRA-TRADE-CC][DOCUMENT-NUMBER][${certificate.documentNumber}][CHIP-DISABLED]`);

    const message: ServiceBusMessage = {
      body: catchCertificateCase,
      subject: `${caselabel}-${certificate.documentNumber}`,
      sessionId: catchCertificateCase._correlationId
    };

    await addToReportQueue(
      certificate.documentNumber,
      message,
      config.azureTradeQueueUrl,
      config.azureReportTradeQueueName,
      config.enableReportToQueue
    );

    return;
  }

  const ccDefraTrade: IDefraTradeCatchCertificate = toDefraTradeCc(certificate, catchCertificateCase, ccQueryResults);

  const validate_cc_defra_trade = getValidator('CatchCertificateCase.json')
  const valid: boolean = validate_cc_defra_trade(ccDefraTrade);

  if (!valid) {
    logger.error(`[DEFRA-TRADE-CC][DOCUMENT-NUMBER][${certificate.documentNumber}][INVALID-PAYLOAD][${JSON.stringify(validate_cc_defra_trade.errors)}]`);
    return;
  }

  const messageId = uuidv4();
  const message: ServiceBusMessage = {
    body: ccDefraTrade,
    messageId,
    correlationId: ccDefraTrade._correlationId,
    contentType: 'application/json',
    applicationProperties: {
      EntityKey: certificate.documentNumber,
      PublisherId: 'FES',
      OrganisationId: ccDefraTrade.exporter.accountId ?? null,
      UserId: ccDefraTrade.exporter.contactId ?? null,
      SchemaVersion: parseInt(validate_cc_defra_trade.schema.properties.version.const, 10),
      Type: Type.INTERNAL,
      Status: ccDefraTrade.certStatus,
      TimestampUtc: moment.utc().toISOString()
    },
    subject: `${caselabel}-${certificate.documentNumber}`,
  };

  await addToReportQueue(
    certificate.documentNumber,
    message,
    config.azureTradeQueueUrl,
    config.azureReportTradeQueueName,
    config.enableReportToQueue
  );
}

export const reportPsToTrade = async (processingStatement: IDocument, caselabel: MessageLabel, processingStatementCase: IDynamicsProcessingStatementCase, psQueryResults: ISdPsQueryResult[] | null): Promise<void> => {

  delete processingStatementCase.clonedFrom;
  delete processingStatementCase.parentDocumentVoid;

  if (!config.azureTradeQueueEnabled) {
    logger.info(`[DEFRA-TRADE-PS][DOCUMENT-NUMBER][${processingStatement.documentNumber}][CHIP-DISABLED]`);

    const message: ServiceBusMessage = {
      body: {
        ...processingStatementCase,
        catches: processingStatementCase.catches ? processingStatementCase.catches.map((_: IDynamicsProcessingStatementCatch) => {
          delete _['isDocumentIssuedInUK'];
          return {
            ..._,
          }
        }) : undefined,
      },
      subject: `${caselabel}-${processingStatement.documentNumber}`,
      sessionId: processingStatementCase._correlationId
    };

    await addToReportQueue(
      processingStatement.documentNumber,
      message,
      config.azureTradeQueueUrl,
      config.azureReportTradeQueueName,
      config.enableReportToQueue
    );

    return;
  }

  const psDefraTrade: IDefraTradeProcessingStatement = toDefraTradePs(processingStatement, processingStatementCase, psQueryResults);

  const validate_ps_defra_trade = getValidator('ProcessingStatement.json')
  const valid: boolean = validate_ps_defra_trade(psDefraTrade);
  if (!valid) {
    logger.error(`[DEFRA-TRADE-PS][DOCUMENT-NUMBER][${processingStatement.documentNumber}][INVALID-PAYLOAD][${JSON.stringify(validate_ps_defra_trade.errors)}]`);
    return;
  }

  let status: CertificateStatus;
  if (!Array.isArray(psQueryResults)) {
    status = CertificateStatus.VOID
  } else {
    status = psQueryResults?.some((_: ISdPsQueryResult) => _.status === CertificateStatus.BLOCKED) ? CertificateStatus.BLOCKED : CertificateStatus.COMPLETE
  }

  const messageId = uuidv4();
  const message: ServiceBusMessage = {
    body: psDefraTrade,
    messageId,
    correlationId: psDefraTrade._correlationId,
    contentType: 'application/json',
    applicationProperties: {
      EntityKey: processingStatement.documentNumber,
      PublisherId: 'FES',
      OrganisationId: psDefraTrade.exporter.accountId ?? null,
      UserId: psDefraTrade.exporter.contactId ?? null,
      SchemaVersion: parseInt(validate_ps_defra_trade.schema.properties.version.const),
      Type: Type.INTERNAL,
      Status: status,
      TimestampUtc: moment.utc().toISOString()
    },
    subject: `${caselabel}-${processingStatement.documentNumber}`,
  };

  await addToReportQueue(
    processingStatement.documentNumber,
    message,
    config.azureTradeQueueUrl,
    config.azureReportTradeQueueName,
    config.enableReportToQueue
  );
};

export const reportSdToTrade = async (storageDocument: IDocument, caselabel: MessageLabel, storageDocumentCase: IDynamicsStorageDocumentCase, sdQueryResults: ISdPsQueryResult[] | null): Promise<void> => {

  delete storageDocumentCase.clonedFrom;
  delete storageDocumentCase.parentDocumentVoid;

  if (!config.azureTradeQueueEnabled) {
    logger.info(`[DEFRA-TRADE-SD][DOCUMENT-NUMBER][${storageDocument.documentNumber}][CHIP-DISABLED]`);
    const message: ServiceBusMessage = {
      body: {
        ...storageDocumentCase,
        products: storageDocumentCase.products ? storageDocumentCase.products.map((_: IDynamicsStorageDocumentProduct) => {
          delete _['isDocumentIssuedInUK'];
          return {
            ..._,
          }
        }) : undefined
      },
      subject: `${caselabel}-${storageDocument.documentNumber}`,
      sessionId: storageDocumentCase._correlationId
    };

    await addToReportQueue(
      storageDocument.documentNumber,
      message,
      config.azureTradeQueueUrl,
      config.azureReportTradeQueueName,
      config.enableReportToQueue
    );

    return;
  }

  const sdDefraTrade: IDefraTradeStorageDocument = toDefraTradeSd(storageDocument, storageDocumentCase, sdQueryResults);

  logger.info(`[DEFRA-TRADE-SD][DOCUMENT-NUMBER][${storageDocument.documentNumber}][PAYLOAD][${JSON.stringify(sdDefraTrade)}]`);

  const validate_sd_defra_trade = getValidator('StorageDocument.json')
  const valid: boolean = validate_sd_defra_trade(sdDefraTrade);
  if (!valid) {
    logger.error(`[DEFRA-TRADE-SD][DOCUMENT-NUMBER][${storageDocument.documentNumber}][INVALID-PAYLOAD][${JSON.stringify(validate_sd_defra_trade.errors)}]`);
    return;
  }

  let status: CertificateStatus;
  if (!Array.isArray(sdQueryResults)) {
    status = CertificateStatus.VOID
  } else {
    status = sdQueryResults?.some((_: ISdPsQueryResult) => _.status === CertificateStatus.BLOCKED) ? CertificateStatus.BLOCKED : CertificateStatus.COMPLETE
  }

  const messageId = uuidv4();
  const message: ServiceBusMessage = {
    body: sdDefraTrade,
    messageId,
    correlationId: sdDefraTrade._correlationId,
    contentType: 'application/json',
    applicationProperties: {
      EntityKey: storageDocument.documentNumber,
      PublisherId: 'FES',
      OrganisationId: sdDefraTrade.exporter.accountId ?? null,
      UserId: sdDefraTrade.exporter.contactId ?? null,
      SchemaVersion: parseInt(validate_sd_defra_trade.schema.properties.version.const),
      Type: Type.INTERNAL,
      Status: status,
      TimestampUtc: moment.utc().toISOString()
    },
    subject: `${caselabel}-${storageDocument.documentNumber}`,
  };

  await addToReportQueue(
    storageDocument.documentNumber,
    message,
    config.azureTradeQueueUrl,
    config.azureReportTradeQueueName,
    config.enableReportToQueue
  );
};