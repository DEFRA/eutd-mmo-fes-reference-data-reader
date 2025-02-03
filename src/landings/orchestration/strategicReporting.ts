import * as DefraMapper from "../transformations/defraValidation";
import * as DefraPersistence from "../persistence/defraValidation";
import { IDocument } from "../types/document";
import { ISdPsQueryResult } from "../types/query";

import logger from "../../logger";

export const reportPs = async (sdpsValidationData: ISdPsQueryResult[], processingStatement: IDocument, correlationId: string): Promise<void> => {
  const psReport = DefraMapper.toPsDefraReport(
    processingStatement.documentNumber,
    correlationId,
    sdpsValidationData[0].status,
    processingStatement.requestByAdmin,
    processingStatement
  );

  logger.info(`[REPORTING-PS][REPORT-ID][${psReport._correlationId}]`);

  psReport.catches = DefraMapper.toCatches(sdpsValidationData);

  await DefraPersistence.insertPsDefraValidationReport(psReport);
}

export const reportSd = async (sdpsValidationData: ISdPsQueryResult[], storageDocument: IDocument, correlationId: string): Promise<void> => {
  const sdReport = DefraMapper.toSdDefraReport(
    storageDocument.documentNumber,
    correlationId,
    sdpsValidationData[0].status,
    storageDocument.requestByAdmin,
    storageDocument
  );

  logger.info(`[REPORTING-SD][REPORT-ID][${sdReport._correlationId}]`);

  sdReport.products = DefraMapper.toProducts(sdpsValidationData);

  await DefraPersistence.insertSdDefraValidationReport(sdReport);
}