import { Schema, model, Document } from 'mongoose';

export interface IPreApprovedDocument {
    documentNumber: string,
    certificateData: string,
    preApprovedBy: string
}

export interface IPreApprovedDocumentModel extends IPreApprovedDocument, Document {}

const PreApprovedDocumentSchema = new Schema({
    documentNumber: { type: String, required: true },
    certificateData: { type: String, required: true },
    preApprovedBy: { type: String, required: true }
});

export const PreApprovedDocuments = model<IPreApprovedDocumentModel>('preApprovedDocuments', PreApprovedDocumentSchema, 'preApprovedDocuments');
