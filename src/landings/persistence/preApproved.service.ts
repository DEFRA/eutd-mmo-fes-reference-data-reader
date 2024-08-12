import { PreApprovedDocuments} from '../types/preApprovedDocument';
import logger from '../../logger';
import { hashIt } from '../../utils/hashIt'
import {DocumentModel} from "../types/document";
import {DocumentStatuses} from "../../landings/types/document"
import { IAuditEvent, AuditEventTypes } from '../types/auditEvent';
import { AddAudit } from '../../services/audit.service';

export const preApproveDocumentFromMongo = async (documentNumber: string, user: string) => {
    logger.info(`[LANDINGS][PERSISTENCE][PRE-APPROVE-A-DOCUMENT] [${(documentNumber)}]`);

    const certificate = await DocumentModel.findOne({
        documentNumber : documentNumber,
        status: DocumentStatuses.Draft
    });

    if (!certificate) throw new Error("Not Found");

    const exportData = (certificate.exportData) ? JSON.stringify(certificate.exportData) : '';

    return await preApproveDocument(documentNumber, exportData, user);
};

const preApproveDocument = async (documentNumber: string, exportData: string, user: string) => {
    const hashedCertificate = hashIt(exportData);

    return PreApprovedDocuments.findOneAndUpdate(
        {
            documentNumber: documentNumber,
        },
        { documentNumber, certificateData: hashedCertificate, preApprovedBy: user },
        { upsert: true, new: true }
    )
};

export const getPreApprovedDocumentByDocumentNumber = async (documentNumber: string) => {
    logger.info(`[LANDINGS][PERSISTENCE][GET-PRE-APPROVED-DOCUMENT] [${(documentNumber)}]`);
    return await PreApprovedDocuments.findOne({ documentNumber }, null, {lean: true});
};

export const isDocumentPreApproved = async (documentNumber: string, certificateData: {exportData?: {}}) => {
    const exportData = certificateData.exportData ? JSON.stringify(certificateData.exportData) : '';
    const hashedCertificate = hashIt(exportData);

    const preApprovedDocument = await getPreApprovedDocumentByDocumentNumber(documentNumber);

    if (preApprovedDocument && preApprovedDocument.certificateData) {
        logger.info(`[PREAPPROVAL-CHECK][${documentNumber}][COMPARING][${hashedCertificate}][${JSON.stringify(preApprovedDocument)}]`);

        const isPreApproved = hashedCertificate === preApprovedDocument.certificateData;

        logger.info(`[PREAPPROVAL-CHECK][${documentNumber}][${isPreApproved}]`);

        if (isPreApproved) {
            const auditEvent: IAuditEvent = {
                eventType: AuditEventTypes.PreApproved,
                triggeredBy: preApprovedDocument.preApprovedBy,
                timestamp: new Date(Date.now()),
                data: null
              }

            await AddAudit(documentNumber, auditEvent);
        }

        return isPreApproved;
    } else {
        logger.info(`[PREAPPROVAL-CHECK][${documentNumber}][NOT-FOUND]`);
        return false;
    }
};