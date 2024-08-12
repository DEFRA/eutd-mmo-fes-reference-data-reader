import moment from 'moment'
import logger from '../../logger'
import { FailedOnlineCertificates, FailedOnlineSdPs } from '../types/query'

interface IGetBlockedDocuments {
  fromDate?: moment.Moment,
  toDate?: moment.Moment,
  documentNumber?: string,
  exporter?: string,
  pln?: string,
  areas?: string[]
}

export const getBlockedCatchCerts = async (
  { fromDate, toDate, documentNumber, exporter, pln, areas }: IGetBlockedDocuments) => {

  logger.info(`[LANDINGS][PERSISTENCE][GET-ALL-BLOCKED-CATCH-CERTS]`)

  const query: any = {
    documentType: 'catchCertificate'
  }

  if (fromDate && toDate) {
    query['createdAt'] = {
      '$gte': fromDate.toISOString(),
      '$lte': toDate.toISOString()
    }
  }

  if (areas && areas.length) {
    query['da'] = {$in: areas};
  }

  if (documentNumber) query.documentNumber = documentNumber
  if (exporter) query['extended.exporterCompanyName'] = {'$regex': exporter,$options:'i'}
  if (pln) query['extended.pln'] = pln

  logger.info(`[LANDINGS][PERSISTENCE][GET-ALL-BLOCKED-CATCH-CERTS][QUERY]${JSON.stringify(query)}`)

  return await FailedOnlineCertificates
    .find(query, null, { timeout: true, lean: true });
}

export const getBlockedSdPs = async (
  { fromDate, toDate, documentNumber, exporter, areas }: IGetBlockedDocuments) => {

  logger.info(`[LANDINGS][PERSISTENCE][GET-ALL-BLOCKED-FOREIGN-CATCH-CERTS]`);

  const query: any = {
    '$or' : [
      {
        documentType: 'processingStatement'
      },
      {
        documentType: 'storageDocument'
      }
    ]
  };

  if (fromDate && toDate) {
    query['createdAt'] = {
      '$gte': fromDate.toISOString(),
      '$lte': toDate.toISOString()
    }
  }

  if (areas && areas.length) {
    query['da'] = {$in: areas};
  }

  if (documentNumber) query.documentNumber = documentNumber;
  if (exporter) query['extended.exporterCompanyName'] = {'$regex': exporter,$options:'i'};

  logger.info(`[LANDINGS][PERSISTENCE][GET-ALL-BLOCKED-CATCH-CERTS][QUERY]${JSON.stringify(query)}`);

  return await FailedOnlineSdPs
    .find(query, null, { timeout: true, lean: true});
};

