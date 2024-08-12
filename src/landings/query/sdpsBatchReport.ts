import moment from 'moment'
import logger from '../../logger'
import { imap, ifilter } from 'mmo-shared-reference-data';
import { ISdPsBatchValidationReport } from '../types/query';

export const sdpsBatchReport = (
    rawValidationForeignCertificates: any,
    pdateFrom?: moment.Moment,
    pdateTo?: moment.Moment,
    pAreas?: string[]
  ): IterableIterator<ISdPsBatchValidationReport>  => {

  const dateFrom = pdateFrom || moment.utc('1970-01-01');
  const dateTo = pdateTo || moment.utc('2070-01-01');

  let areas = pAreas || [];

  if (areas.length === 0) {
    areas = [ 'Northern Ireland', 'Isle of Man', 'Channel Islands', 'Guernsey', 'Jersey', 'England', 'Wales', 'Scotland', 'Isle of Man' ];
  }

  logger.info(`[SDPS-REPORT][DATE-FROM]${dateFrom.toISOString()}[DATE-TO]${dateTo.toISOString()}[AREAS]${areas}`);

  return imap(
    ifilter(rawValidationForeignCertificates, q =>
      ((moment(q.createdAt) >= dateFrom && moment(q.createdAt) <= dateTo) && areas.includes(q.da))
    ), (q) => {

      const r = <ISdPsBatchValidationReport>{};

      r.timestamp = moment(q.createdAt).toISOString();
      r.date = undefined;
      r.time = undefined;

      r.documentType = '??';
      if (q.documentType === 'storageDocument')
        r.documentType = 'SD';
      if (q.documentType === 'processingStatement')
        r.documentType = 'PS';

      r.documentNumber = q.documentNumber;
      r.documentStatus = q.status;
      r.exporter = q.extended.exporterCompanyName;
      r.speciesCode = q.species;
      r.speciesName = q.species;
      r.weight = q.weightOnDoc;
      r.productCommodityCode = q.commodityCode;

      r.documentUrl = q.extended.url;
      r.inputWeightMismatch = q.isMismatch ? 'fail' : undefined;
      r.exportWeightExceeded = q.overAllocatedByWeight;

      r.authority = q.da;
      r.investigatedBy = q.extended.investigation ? q.extended.investigation.investigator : undefined;
      r.investigationStatus = q.extended.investigation ? q.extended.investigation.status : undefined;
      r.preApprovedBy = q.extended.preApprovedBy;
      r.voidedBy = q.extended.voidedBy;

      return r
    });

};
