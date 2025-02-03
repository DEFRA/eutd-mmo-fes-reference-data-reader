import { IForeignCatchCertificateValidationResult, IOnlineValidationReportItem } from '../types/onlineValidationReport';
import { rawCatchCertToOnlineValidationReport,rawForeignCatchCertToOnlineReport } from '../transformations/transformations';
import { ICcQueryResult } from 'mmo-shared-reference-data';
import { ISdPsQueryResult } from '../types/query';
import logger from '../../logger'


export function getCatchCertificateOnlineValidationReport(onlineCertNumber : string, rawValidatedCertificates : ICcQueryResult[]) : IOnlineValidationReportItem[] {
   logger.info(`[CATCH-CERTIFICATE-ONLINE-VALIDATION-REPORT][${onlineCertNumber}][GENERATING-REPORT]`);
   const rawOnlineValidation = rawValidatedCertificates.filter(cert => cert.documentNumber === onlineCertNumber);

   return rawCatchCertToOnlineValidationReport(rawOnlineValidation);
}

export function getForeignCatchCertificateOnlineValidationReport(onlineCertNumber: string, rawValidatedCertificates: ISdPsQueryResult[]) : IForeignCatchCertificateValidationResult {
   logger.info(`[FOREIGN-CATCH-CERTIFICATE-ONLINE-VALIDATION-REPORT][GENERATING-REPORT]`);
   const rawOnlineValidation = rawValidatedCertificates.filter(cert => cert.documentNumber === onlineCertNumber);
   return rawForeignCatchCertToOnlineReport(rawOnlineValidation);
}
