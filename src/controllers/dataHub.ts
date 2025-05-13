import * as DefraMapper from "../landings/transformations/defraValidation";
import * as CaseManagement from "../landings/orchestration/caseManagement";
import * as StrategicReporting from "../landings/orchestration/strategicReporting";
import * as DefraTrade from "../landings/orchestration/defraTrade";
import {
  insertPsDefraValidationReport,
  insertSdDefraValidationReport,
  insertCcDefraValidationReport
} from "../landings/persistence/defraValidation";
import { CaseTwoType, IDynamicsCatchCertificateCase } from "../landings/types/dynamicsCcCase";
import { IDynamicsStorageDocumentCase, SdPsCaseTwoType, IDynamicsProcessingStatementCase } from "../landings/types/dynamicsSdPsCase";
import { DocumentStatuses } from "../landings/types/document";
import { getCertificateByDocumentNumberWithNumberOfFailedAttempts } from "../landings/persistence/catchCert";
import { getExtendedValidationData } from "../landings/extendedValidationDataService";
import { ISdPsQueryResult } from "../landings/types/query";
import { MessageLabel, ICcQueryResult, toCcDefraReport } from "mmo-shared-reference-data";
import { getVesselsIdx, refreshRiskingData } from "../data/cache";
import { v4 as uuidv4 } from 'uuid';
import { isEmpty } from 'lodash';

import logger from "../logger";
import moment from "moment";

export const getDocumentType = (documentNumber: string) => {
  if (documentNumber.toUpperCase().includes('-PS-')) {
    return "processingStatement";
  } else if (documentNumber.toUpperCase().includes('-SD-')) {
    return "storageDocument";
  } else {
    return "catchCert";
  }
}

export const reportDraft = async (certificateId: string) => {
  const correlationId = uuidv4();
  logger.info(`[REPORTING-DRAFT][Getting certificate with number of failed attempts]`);
  const certificate = await getCertificateByDocumentNumberWithNumberOfFailedAttempts(certificateId, getDocumentType(certificateId));
  logger.info(`[REPORTING-DRAFT][Getting certificate with number of failed attempts][COMPLETE]`);

  if (certificate) {
    if (certificateId.toUpperCase().includes('-PS-')) {
      logger.info(`[REPORTING-PS-DRAFT][${certificateId}][Getting report]`);
      const requestByAdmin = certificate.requestByAdmin;
      const processingStatementReport = DefraMapper.toPsDefraReport(certificateId, correlationId, DocumentStatuses.Draft, requestByAdmin);

      logger.info(`[REPORTING-PS-DRAFT][${certificateId}][REPORT-ID][${processingStatementReport._correlationId}]`);
      await insertPsDefraValidationReport(processingStatementReport);
      logger.info(`[REPORTING-PS-DRAFT][${certificateId}][REPORT-ID][${processingStatementReport._correlationId}][REPORT SAVED]`);
    }
    else if (certificateId.toUpperCase().includes('-SD-')) {
      logger.info(`[REPORTING-SD-DRAFT][${certificateId}][Getting report]`);
      const requestByAdmin = certificate.requestByAdmin;
      const storageDocumentReport = DefraMapper.toSdDefraReport(certificateId, correlationId, DocumentStatuses.Draft, requestByAdmin);

      logger.info(`[REPORTING-SD-DRAFT][${certificateId}][REPORT-ID][${storageDocumentReport._correlationId}]`);
      await insertSdDefraValidationReport(storageDocumentReport);
      logger.info(`[REPORTING-SD-DRAFT][${certificateId}][REPORT-ID][${storageDocumentReport._correlationId}][REPORT SAVED]`);
    }
    else {
      logger.info(`[REPORTING-CC-DRAFT][${certificateId}][Getting report]`);
      const requestByAdmin = certificate.requestByAdmin;
      const catchCertificateReport = toCcDefraReport(certificateId, correlationId, DocumentStatuses.Draft, requestByAdmin);

      logger.info(`[REPORTING-CC-DRAFT][${certificateId}][REPORT-ID][${catchCertificateReport._correlationId}]`);
      await insertCcDefraValidationReport(catchCertificateReport);
      logger.info(`[REPORTING-CC-DRAFT][${certificateId}][REPORT-ID][${catchCertificateReport._correlationId}][REPORT SAVED]`);
    }
  }

  return null;
}

/**
 * @method reportDelete
 * @param certificateId
 * DELETE has been intentionally hardcoded because this status is not applicable in the application
 * however it is for Strategic Reporting
 */
export const reportDelete = async (certificateId: string) => {
  const correlationId = uuidv4();
  const certificate = await getCertificateByDocumentNumberWithNumberOfFailedAttempts(certificateId,  getDocumentType(certificateId));

  if (certificate) {
    if (certificateId.toUpperCase().includes('-PS-')) {
      const requestByAdmin = certificate.requestByAdmin;
      const processingStatementReport = DefraMapper.toPsDefraReport(certificateId, correlationId, 'DELETE', requestByAdmin);

      if (certificate.exportData?.exporterDetails)
        processingStatementReport.devolvedAuthority = DefraMapper.daLookUp(certificate.exportData.exporterDetails.postcode);

      logger.info(`[REPORTING-PS-DELETE][${certificateId}][REPORT-ID][${processingStatementReport._correlationId}]`);
      await insertPsDefraValidationReport(processingStatementReport);
    }
    else if (certificateId.toUpperCase().includes('-SD-')) {
      const requestByAdmin = certificate.requestByAdmin;
      const storageDocumentReport = DefraMapper.toSdDefraReport(certificateId, correlationId, 'DELETE', requestByAdmin);

      if (certificate.exportData?.exporterDetails)
        storageDocumentReport.devolvedAuthority = DefraMapper.daLookUp(certificate.exportData.exporterDetails.postcode);

      logger.info(`[REPORTING-SD-DELETE][${certificateId}][REPORT-ID][${storageDocumentReport._correlationId}]`);
      await insertSdDefraValidationReport(storageDocumentReport);
    }
    else {
      const requestByAdmin = certificate.requestByAdmin;
      const catchCertificateReport = toCcDefraReport(certificateId, correlationId, 'DELETE', requestByAdmin);

      if (certificate.exportData?.exporterDetails)
        catchCertificateReport.devolvedAuthority = DefraMapper.daLookUp(certificate.exportData.exporterDetails.postcode);

      logger.info(`[REPORTING-CC-DELETE][${certificateId}][REPORT-ID][${catchCertificateReport._correlationId}]`);
      await insertCcDefraValidationReport(catchCertificateReport);
    }
  }
}

export const reportVoid = async (certificateId: string, isFromExporter = false) => {
  const correlationId = uuidv4();
  const certificate = await getCertificateByDocumentNumberWithNumberOfFailedAttempts(certificateId,  getDocumentType(certificateId));

  if (certificate) {
    if (certificateId.toUpperCase().includes('-PS-')) {
      const requestByAdmin = certificate.requestByAdmin;
      const psReport = DefraMapper.toPsDefraReport(
        certificateId,
        correlationId,
        DocumentStatuses.Void,
        requestByAdmin,
        certificate
      );

      logger.info(`[REPORTING-PS-VOID][${certificateId}][REPORT-ID][${psReport._correlationId}]`);
      await insertPsDefraValidationReport(psReport);

      logger.info(`[REPORTING-PS-VOID][CASE-MANAGEMENT][${certificateId}][REPORT-ID][${psReport._correlationId}]`);
      const processingStatementCase: IDynamicsProcessingStatementCase = await CaseManagement.reportPs(
        null,
        certificate,
        correlationId,
        MessageLabel.PROCESSING_STATEMENT_VOIDED,
        isFromExporter ? SdPsCaseTwoType.VoidByExporter : SdPsCaseTwoType.VoidByAdmin
      );
      await DefraTrade.reportPsToTrade(certificate, MessageLabel.PROCESSING_STATEMENT_VOIDED, processingStatementCase, null);
    }
    else if (certificateId.toUpperCase().includes('-SD-')) {
      const requestByAdmin = certificate.requestByAdmin;
      const sdReport = DefraMapper.toSdDefraReport(
        certificateId,
        correlationId,
        DocumentStatuses.Void,
        requestByAdmin,
        certificate
      );

      logger.info(`[REPORTING-SD-VOID][${certificateId}][REPORT-ID][${sdReport._correlationId}]`);
      await insertSdDefraValidationReport(sdReport);

      logger.info(`[REPORTING-SD-VOID][CASE-MANAGEMENT][${certificateId}][REPORT-ID][${sdReport._correlationId}]`);
      const storageDocumentCase: IDynamicsStorageDocumentCase = await CaseManagement.reportSd(
        null,
        certificate,
        correlationId,
        MessageLabel.STORAGE_DOCUMENT_VOIDED,
        isFromExporter ? SdPsCaseTwoType.VoidByExporter : SdPsCaseTwoType.VoidByAdmin
      );
      await DefraTrade.reportSdToTrade(certificate, MessageLabel.STORAGE_DOCUMENT_VOIDED, storageDocumentCase, null);
    }
    else {
      const requestByAdmin = certificate.requestByAdmin;
      const ccReport = toCcDefraReport(
        certificateId,
        correlationId,
        DocumentStatuses.Void,
        requestByAdmin,
        getVesselsIdx(),
        certificate,
      );

      logger.info(`[REPORTING-CC-VOID][${certificateId}][REPORT-ID][${ccReport._correlationId}]`);
      await insertCcDefraValidationReport(ccReport);

      logger.info(`[REPORTING-CC-VOID][CASE-MANAGEMENT][${certificateId}][REPORT-ID][${ccReport._correlationId}]`);

      const result: IDynamicsCatchCertificateCase = await CaseManagement.reportCc(null, certificate, ccReport._correlationId, MessageLabel.CATCH_CERTIFICATE_VOIDED, isFromExporter ? CaseTwoType.VoidByExporter : CaseTwoType.VoidByAdmin);
      await DefraTrade.reportCcToTrade(certificate, MessageLabel.CATCH_CERTIFICATE_VOIDED, result, null);
    }
  }
}

export const reportSdPsSubmitted = async (sdpsValidationData: ISdPsQueryResult[]): Promise<void> => {
  if (sdpsValidationData.length > 0) {
    const certificateId = sdpsValidationData[0].documentNumber;
    const correlationId = uuidv4();

    logger.info(`[DATA-HUB][REPORT-SDPS-SUBMITTED][${certificateId}]`);

    const certificate = await getCertificateByDocumentNumberWithNumberOfFailedAttempts(certificateId, getDocumentType(certificateId));

    if (certificate?.documentNumber) {
      logger.info(`[DATA-HUB][REPORT-SDPS-SUBMITTED][${certificateId}][FOUND]`);

      if (certificateId.toUpperCase().includes('-PS-')) {
        await StrategicReporting.reportPs(sdpsValidationData, certificate, correlationId);
        const processingStatementCase: IDynamicsProcessingStatementCase = await CaseManagement.reportPs(sdpsValidationData, certificate, correlationId, MessageLabel.PROCESSING_STATEMENT_SUBMITTED);
        await DefraTrade.reportPsToTrade(certificate, MessageLabel.PROCESSING_STATEMENT_SUBMITTED, processingStatementCase, sdpsValidationData);
      }
      else {
        await StrategicReporting.reportSd(sdpsValidationData, certificate, correlationId);
        const storageDocumentCase: IDynamicsStorageDocumentCase = await CaseManagement.reportSd(sdpsValidationData, certificate, correlationId, MessageLabel.STORAGE_DOCUMENT_SUBMITTED);
        await DefraTrade.reportSdToTrade(certificate, MessageLabel.STORAGE_DOCUMENT_SUBMITTED, storageDocumentCase, sdpsValidationData);
      }
    }
    else {
      logger.info(`[DATA-HUB][REPORT-SDPS-SUBMITTED][${certificateId}][NOT-FOUND]`);
    }
  }
};

export const reportCcSubmitted = async (ccValidationData: ICcQueryResult[]): Promise<void> => {
  try {
    logger.info(`[REPORT-CC-SUBMITTED][ccValidationData][${ccValidationData.length}]`);
    if (ccValidationData.length > 0) {
      let ccReport, catchCertificate;
      const certificateId = ccValidationData[0].documentNumber;
      const correlationId = uuidv4();

      logger.info(`[LANDINGS][REPORTING-CC][${certificateId}][REPORT-ID][${correlationId}]`);

      try {
        catchCertificate = await getCertificateByDocumentNumberWithNumberOfFailedAttempts(certificateId, getDocumentType(certificateId));
        logger.info(`[REPORT-CC-SUBMITTED][SUCCESS][getCertificateByDocumentNumberWithNumberOfFailedAttempts][${certificateId}]`);
      }
      catch (e) {
        logger.warn(`[REPORT-CC-SUBMITTED][ERROR][getCertificateByDocumentNumberWithNumberOfFailedAttempts][${e}]`);
        throw e;
      }

      await refreshRiskingData()
        .catch(e => logger.error(`[REPORT-CC-SUBMITTED][REFRESH-RISKING-DATA][ERROR][${e}]`));

      const requestByAdmin = catchCertificate.requestByAdmin;

      try {
        ccReport = toCcDefraReport(certificateId, correlationId, ccValidationData[0].status, requestByAdmin,  getVesselsIdx(), catchCertificate);
        logger.info(`[REPORT-CC-SUBMITTED][SUCCESS][toCcDefraReport][${certificateId}]`);
      }
      catch (e) {
        logger.warn(`[REPORT-CC-SUBMITTED][ERROR][toCcDefraReport][${e}]`);
        throw e;
      }

      try {
        ccReport.landings = DefraMapper.toLandings(ccValidationData);
        logger.info(`[REPORT-CC-SUBMITTED][SUCCESS][toLandings][${certificateId}]`);
      }
      catch (e) {
        logger.warn(`[REPORT-CC-SUBMITTED][ERROR][toLandings][${e}]`);
        throw e;
      }

      try {
        await insertCcDefraValidationReport(ccReport);
        logger.info(`[REPORT-CC-SUBMITTED][SUCCESS][insertCcDefraValidationReport][${certificateId}]`);
      }
      catch (e) {
        logger.warn(`[REPORT-CC-SUBMITTED][ERROR][insertCcDefraValidationReport][${e}]`);
        throw e;
      }

      if (catchCertificate.exportData?.exporterDetails !== undefined) {

        for (const landing of ccValidationData) {
          landing.hasSalesNote= await updateLandings(landing);
        }

        const result: IDynamicsCatchCertificateCase = await CaseManagement.reportCc(ccValidationData, catchCertificate, correlationId, MessageLabel.CATCH_CERTIFICATE_SUBMITTED);
        logger.info(`[REPORT-CC-SUBMITTED][SUCCESS][${certificateId}]`);

        await DefraTrade.reportCcToTrade(catchCertificate, MessageLabel.CATCH_CERTIFICATE_SUBMITTED, result, ccValidationData);
      } else {
        logger.error(`[REPORT-CC-SUBMITTED][FAIL][${certificateId}][NO-EXPORTER-DETAILS]`);
      }
    }
  } catch (e) {
    logger.warn(`[REPORT-CC-SUBMITTED][ERROR][${e}]`);
    throw e;
  }
};
const updateLandings = async (landing: ICcQueryResult) => {
  const requestedDate = moment.utc(landing.dateLanded);
  const requestedDateISO = requestedDate.format('YYYY-MM-DD')

  if (!requestedDate.isValid() || isEmpty(landing.rssNumber)) {
    logger.info(`[ONLINE-VALIDATION-REPORT][${landing.extended.landingId}][NO-SALES-NOTE]`);
    return;
  }

  const salesNote = await getExtendedValidationData(requestedDateISO, landing.rssNumber, 'salesNotes');
  const _hasSaveNote = !isEmpty(salesNote);
  logger.info(`[ONLINE-VALIDATION-REPORT][${landing.extended.landingId}][HAS-SALES-NOTE][${_hasSaveNote}]`);
  return _hasSaveNote;
}

export const reportCcLandingUpdate = async (ccValidationData: ICcQueryResult[]): Promise<void> => {
  try {
    logger.info(`[ONLINE-VALIDATION-REPORT][VALIDATIONS][${ccValidationData.length}]`);
    if (ccValidationData.length > 0) {
      let ccReport;
      const certificateId = ccValidationData[0].documentNumber;
      const correlationId = uuidv4();

      logger.info(`[ONLINE-VALIDATION-REPORT][REPORTING-CC][${certificateId}][REPORT-ID][${correlationId}]`);
     const catchCertificate = await getCatchCertificate(certificateId)
     

      const requestByAdmin = catchCertificate.requestByAdmin;
      try {
        ccReport = toCcDefraReport(certificateId, correlationId, ccValidationData[0].status, requestByAdmin, getVesselsIdx(), catchCertificate);
        logger.info(`[ONLINE-VALIDATION-REPORT][toCcDefraReport][${certificateId}][SUCCESS]`);
      }
      catch (e) {
        logger.warn(`[ONLINE-VALIDATION-REPORT][toCcDefraReport][${e}][ERROR]`);
        throw e;
      }
      ccReport.landings = await getLandings(ccValidationData, certificateId);
     

      try {
        await insertCcDefraValidationReport(ccReport);
        logger.info(`[ONLINE-VALIDATION-REPORT][insertCcDefraValidationReport][${certificateId}][SUCCESS]`);
      }
      catch (e) {
        logger.warn(`[ONLINE-VALIDATION-REPORT][insertCcDefraValidationReport][${e}][ERROR]`);
        throw e;
      }

      if (catchCertificate.exportData?.exporterDetails !== undefined) {

        for (const landing of ccValidationData) {
          const requestedDate = moment.utc(landing.dateLanded);
          const requestedDateISO = requestedDate.format('YYYY-MM-DD')

          if (!requestedDate.isValid() || isEmpty(landing.rssNumber)) {
            logger.info(`[ONLINE-VALIDATION-REPORT][${landing.extended.landingId}][NO-SALES-NOTE]`);
            continue;
          }

          const salesNote = await getExtendedValidationData(requestedDateISO, landing.rssNumber, 'salesNotes');
          const _hasSaveNote = !isEmpty(salesNote);
          logger.info(`[ONLINE-VALIDATION-REPORT][${landing.extended.landingId}][HAS-SALES-NOTE][${_hasSaveNote}]`);
          landing.hasSalesNote = _hasSaveNote;
        }

        await CaseManagement.reportCcLandingUpdate(ccValidationData, catchCertificate, correlationId, MessageLabel.NEW_LANDING);
        logger.info(`[ONLINE-VALIDATION-REPORT][SUCCESS][${certificateId}]`);
      } else {
        logger.error(`[ONLINE-VALIDATION-REPORT][FAIL][${certificateId}][NO-EXPORTER-DETAILS]`);
      }
    }
  } catch (e) {
    logger.error(`[ONLINE-VALIDATION-REPORT][ERROR][${e.stack || e}]`);
  }
};
const getCatchCertificate = async (certificateId: string) => {
  try {
    const catchCertificate = await getCertificateByDocumentNumberWithNumberOfFailedAttempts(certificateId, getDocumentType(certificateId));
    logger.info(`[ONLINE-VALIDATION-REPORT][getCertificateByDocumentNumberWithNumberOfFailedAttempts][${certificateId}][SUCCESS]`);
    return catchCertificate;
  }
  catch (e) {
    logger.warn(`[ONLINE-VALIDATION-REPORT][getCertificateByDocumentNumberWithNumberOfFailedAttempts][${e}][ERROR]`);
    throw e;
  }
}
const getLandings = async (ccValidationData: ICcQueryResult[], certificateId: string) => {
  try {
    const landings=DefraMapper.toLandings(ccValidationData);
    logger.info(`[ONLINE-VALIDATION-REPORT][toLandings][${certificateId}][SUCCESS]`);
    return landings
  }
  catch (e) {
    logger.warn(`[ONLINE-VALIDATION-REPORT][toLandings][${e}][ERROR]`);
    throw e;
  }
}