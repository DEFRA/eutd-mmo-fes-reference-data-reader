import { Schema, model, Document } from 'mongoose';

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

export enum LandingStatus {
  Pending = 'PENDING_LANDING_DATA',
  Complete = 'HAS_LANDING_DATA',
  Exceeded14Days = 'EXCEEDED_14_DAY_LIMIT',
  DataNeverExpected = 'LANDING_DATA_NEVER_EXPECTED'
}

export interface Investigation {
  investigator: string,
  status: string
}

const documentSchema = new Schema({
    __t:            { type: String, required: true  },
    documentNumber: { type: String, required: true  },
    status:         { type: String, required: false, enum: Object.values(DocumentStatuses) },
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
  parentDocumentVoid?: boolean
}

export interface IDocumentModel extends IDocument, Document {}

export const DocumentModel = model<IDocumentModel>('exportCertificate', documentSchema, 'exportCertificates')
