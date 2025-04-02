import logger from "../../logger";
import { postCodeToDa } from 'mmo-shared-reference-data';

import { mapProcessingStatementToPS, mapStorageDocumentToSD } from "../transformations/transformations";
import {
    sdpsQuery,
    getForeignCatchCertificatesFromDocuments
} from "../query/sdpsQuery";
import { getAllDocuments } from "../persistence/storeDocProcStat";
import { getForeignCatchCertificateOnlineValidationReport } from "../query/onlineReports";
import { getBlockingStatus } from "../../services/systemBlock.service";
import { ValidationRules } from "../types/systemBlock";
import { FailedOnlineCertificates } from "../types/query";
import { isDocumentPreApproved } from "../persistence/preApproved.service";
import { DocumentModel, DocumentStatuses } from "../types/document";

export async function generateForeignCatchCertOnlineValidationReport(payload: any) {
    logger.info("[SDPS-ONLINE-VALIDATION-REPORT][MAPPING-TO-SDPS]");

    const mappedSDPS = payload.dataToValidate.exporter.journey === "storageNotes" ?
        mapStorageDocumentToSD(payload.dataToValidate) : mapProcessingStatementToPS(payload.dataToValidate);

    const documentNumbers = getForeignCatchCertificatesFromDocuments([mappedSDPS]);
    logger.info(`[SDPS-ONLINE-VALIDATION-REPORT][GETTING-UNIQUE-DOC-NUMBERS][${JSON.stringify(documentNumbers)}]`);

    const allDocuments: any = await getAllDocuments({fccNumbers: documentNumbers});

    logger.info(`[SDPS-ONLINE-VALIDATION-REPORT][GETTING-RELEVANT-CERTIFICATES][FOUND][${allDocuments.length}]`);

    allDocuments.push(mappedSDPS);

    const rawValidationResults = Array.from(sdpsQuery(allDocuments, postCodeToDa));
    logger.info(`[SDPS-ONLINE-VALIDATION-REPORT][EXECUTING-VALIDATION]`);

    const report = getForeignCatchCertificateOnlineValidationReport(payload.dataToValidate.documentNumber, rawValidationResults);

    const isBlocking4bEnabled : boolean = await getBlockingStatus(ValidationRules.FOUR_B);

    if(!report.isValid && isBlocking4bEnabled) {
        logger.info(`[SDPS-ONLINE-VALIDATION-REPORT[IS-BLOCKED][${mappedSDPS.documentNumber}]`);

        const certificate = await DocumentModel.findOne({
            documentNumber : mappedSDPS.documentNumber
        });

        const isDocumentApproved = await isDocumentPreApproved(mappedSDPS.documentNumber, certificate || {exportData: {}})

        logger.info(`[SDPS-ONLINE-VALIDATION-REPORT][${mappedSDPS.documentNumber}][IS-PREAPPROVED][${isDocumentApproved}]`);

        if (isDocumentApproved) {
            report.isValid = true;
            report.details = [];
            report.rawData.forEach(_ => _.status = DocumentStatuses.Complete);
        } else {
            logger.info(`[SDPS-ONLINE-VALIDATION-REPORT][${mappedSDPS.documentNumber}][SAVING-FAILED-CERTIFICATE]`);
            rawValidationResults.forEach(_ => _.status = "BLOCKED");

            await FailedOnlineCertificates.create(rawValidationResults.filter(_=>_.documentNumber === payload.dataToValidate.documentNumber));
        }
    } else {
        logger.info(`[SDPS-ONLINE-VALIDATION-REPORT][NO-FAILURE][COMPLETE][${mappedSDPS.documentNumber}]`);

        report.rawData.forEach(_ => _.status = DocumentStatuses.Complete);
    }
    return report;
}