import { Schema, model, Document } from 'mongoose';
import { ICatchStatus } from '../../controllers/euUpgrade';

export const DocumentStatuses = Object.freeze(
  {
    Draft: 'DRAFT',
    Pending: 'PENDING',
    Complete: 'COMPLETE',
    Void: 'VOID',
    Blocked: 'BLOCKED',
    Locked: 'LOCKED'
  }
)

export interface Investigation {
  investigator: string,
  status: string
}

const documentSchema = new Schema({
    __t:            { type: String, required: true  },
    documentNumber: { type: String, required: true  },
    status:         { type: String, required: false, enum: Object.values(DocumentStatuses) },
    catchStatus:    { type: Object, required: false, default: {} },
    createdAt:      { type: Date,   required: true  },
    createdBy:      { type: String, required: true  },
    createdByEmail: { type: String },
    documentUri:    { type: String, required: false },
    audit:          { type: Array,  required: false },
    investigation:  { type: Schema.Types.Mixed, required: false },
    exportData:     { type: Schema.Types.Mixed, required: false },
    requestByAdmin: { type: Boolean,required: false },
    clonedFrom:     { type: String,required: false },
    landingsCloned: { type: Boolean,required: false },
    parentDocumentVoid: { type: Boolean,required: false },
  },
  {strict: false}
)

export interface IDocument {
  __t: string,
  contactId?: string,
  documentNumber: string,
  status: string,
  catchStatus?: any,
  createdAt: Date,
  createdBy: string,
  createdByEmail: string,
  documentUri?: string | null,
  audit?: any[],
  investigation?: any,
  exportData?: any,
  requestByAdmin?: boolean,
  userReference?: string,
  numberOfFailedAttempts?: number,
  clonedFrom?: string,
  landingsCloned?: boolean,
  parentDocumentVoid?: boolean,
  catchSubmission?: ICatchStatus;
}

export interface IDocumentModel extends IDocument, Document {}

export const DocumentModel = model<IDocumentModel>('exportCertificate', documentSchema, 'exportCertificates')
