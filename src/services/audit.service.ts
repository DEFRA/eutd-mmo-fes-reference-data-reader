import { DocumentModel } from '../landings/types/document';
import { IAuditEvent } from '../landings/types/auditEvent';

export const AddAudit = async (documentNumber: string, audit: IAuditEvent) => {
    const conditions = { documentNumber: documentNumber };
    const update = { "$push": { "audit": audit } };
    const options = { new: true, upsert: false }

    return await DocumentModel.findOneAndUpdate(conditions, update, options);
}