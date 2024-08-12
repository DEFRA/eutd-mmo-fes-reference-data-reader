import logger from '../../logger'
import moment from 'moment'

import { DocumentModel, DocumentStatuses } from '../types/document'

interface IGetDocuments {
  fromDate?: moment.Moment,
  toDate?: moment.Moment,
  documentStatus?: string,
  fccNumbers?: string[],
  documentNumber?: string,
  exporter?: string,
}

export const getAllDocuments = async (
  { fromDate, documentStatus=DocumentStatuses.Complete, fccNumbers, documentNumber, exporter }: IGetDocuments) => {

  if (fccNumbers && fccNumbers.length === 0) return []

  const query: any = {
    __t: { $in: ['storageDocument', 'processingStatement'] },
    'exportData': { $exists: true },
    'exportData.catches': { $exists: true },
    $or: [ { 'status': { $exists: false } }, { 'status': documentStatus } ]
  }

  if (fromDate) query.createdAt = { $gte: fromDate.toDate() }

  if (fccNumbers)
    query['$and'] = [
      { $or:
        [
          {  __t: 'storageDocument', 'exportData.catches.certificateNumber': { $in : fccNumbers } },
          {  __t: 'processingStatement', 'exportData.catches.catchCertificateNumber': { $in: fccNumbers } },
        ]
      }
    ]

  /*
   * Filters from the investigation function.
   * Should result in mutually exclusive filters, but will not protect against this here
   */
  if (documentNumber) query.documentNumber = documentNumber
  if (exporter) query['exportData.exporterDetails.exporterCompanyName'] = {'$regex': exporter,$options:'i'}

  logger.info(`[LANDINGS][PERSISTENCE][GET-ALL-DOCUMENTS][QUERY]${JSON.stringify(query)}`)

  return await DocumentModel
    .find(query, null, { timeout: true })
    .lean()
}

