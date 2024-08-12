import moment from 'moment'
import logger from '../../logger';

import { ccBatchReport, ccQuery, imap, ifilter,postCodeToDa } from 'mmo-shared-reference-data';
import { getSpeciesAliases, getVesselsIdx } from '../../data/cache';
import { getForeignCatchCertificatesFromDocuments, sdpsQuery } from "../query/sdpsQuery";
import { sdpsBatchReport } from '../query/sdpsBatchReport';
import { getCatchCerts } from '../persistence/catchCert';
import { getBlockedCatchCerts, getBlockedSdPs } from '../persistence/blockedDocuments';
import { getAllDocuments } from '../persistence/storeDocProcStat';
import { getAllLandings, getLandingsMultiple } from '../persistence/landing';
import { ICcBatchValidationReport, ISdPsBatchValidationReport} from '../types/query';
import { ILanding } from '../types/landing';
import { DocumentStatuses } from '../types/document';
import { fetchLandings } from './landingsRefresh';
import { getLandingsFromCatchCerts, vesselLookup } from '../transformations/transformations';
import { missingLandingInvestigationRefreshQuery } from '../query/ccQuery';

interface IReportFilters {
  fromDate?: moment.Moment,
  toDate?: moment.Moment,
  documentNumber?: string,
  exporter?: string,
  pln?: string,
  asOfDate?: moment.Moment
}

const clearObjectProperties = (propertyArray: string[], object: any) => {
  propertyArray.forEach(property => {
    delete object[property]
  })

  return object
}

export async function catchCertBlockedInvestigationReport(
  { fromDate,
    toDate,
    documentNumber,
    exporter,
    pln }: IReportFilters){

  try {

    const filters: any = {};

    if (documentNumber) filters.documentNumber = documentNumber;
    if (exporter) filters.exporter = exporter;
    if (pln) filters.pln = pln;
    filters.fromDate = fromDate;
    filters.toDate = toDate;

    logger.info(`[BATCH-REPORT][CATCH-CERT-BLOCKED-INVESTIGATION-REPORT][PARAMS]${filters}`)

    const dataFromDB = await getBlockedCatchCerts(filters);
    return ccBatchReport(dataFromDB[Symbol.iterator](), fromDate, toDate);

  } catch (e) {
    logger.error({err:e}, `[BATCH-REPORT][CATCH-CERT-BLOCKED-INVESTIGATION-REPORT][ERROR] ${e}`)
    throw e
  }
}

export async function catchCertVoidInvestigationReport(
  { fromDate,
    toDate,
    documentNumber,
    exporter,
    pln,
    asOfDate=moment() }: IReportFilters): Promise<IterableIterator<ICcBatchValidationReport>> {

  try {

    const filters: any = {}

    if (documentNumber) filters.documentNumber = documentNumber
    if (exporter) filters.exporter = exporter
    if (pln) filters.pln = pln
    filters.fromDate = fromDate
    filters.toDate = toDate

    filters.documentStatus = DocumentStatuses.Void

    logger.info(`[BATCH-REPORT][CATCH-CERT-VOID-INVESTIGATION-REPORT][PARAMS]${filters}`)

    const catchCerts = await getCatchCerts(filters)
    const landings = []
    const queryData  = ccQuery(catchCerts, landings, getVesselsIdx(), asOfDate, getSpeciesAliases)

    const results = ccBatchReport(queryData, fromDate, toDate)

    return imap(results, (data) => clearObjectProperties(['rawLandingsUrl', 'salesNotesUrl', 'FI0_41_unavailabilityDuration', 'FI0_47_unavailabilityExceeds14Days', 'FI0_288_numberOfLandings', 'FI0_289_speciesMismatch', 'FI0_290_exportedWeightExceedingLandedWeight', 'FI0_291_totalExportWeights', 'FI0_136_numberOfFailedValidations'], data))

  } catch (e) {
    logger.error({err:e}, `[BATCH-REPORT][CATCH-CERT-VOID-INVESTIGATION-REPORT][ERROR] ${e}`)
    throw e
  }
}

export async function sdpsVoidInvestigationReport(
  { fromDate,
    toDate,
    documentNumber,
    exporter}: IReportFilters) {

  try {

    const filters: any = {}

    if (documentNumber) filters.documentNumber = documentNumber;
    if (exporter) filters.exporter = exporter;
    filters.fromDate = fromDate;
    filters.toDate = toDate;

    filters.documentStatus = DocumentStatuses.Void;

    logger.info(`[BATCH-REPORT][SDPS-VOID-INVESTIGATION-REPORT][PARAMS]${filters}`)

    const documentsBase: any[] = Array.from(await getAllDocuments(filters))

    const documentsBaseIds: string[] = documentsBase.map(d => d.documentNumber)

    const fccNumbers = getForeignCatchCertificatesFromDocuments(documentsBase)

    const documentsExtended: any[] = Array.from(await getAllDocuments({
      fccNumbers: fccNumbers,
      documentStatus: DocumentStatuses.Void
    }))

    const queryData = Array.from(sdpsQuery(documentsExtended, postCodeToDa))

    const reportData = sdpsBatchReport(queryData, fromDate, toDate);

    return ifilter(reportData, r => documentsBaseIds.includes(r.documentNumber))

  } catch (e) {
    logger.error({err:e}, `[BATCH-REPORT][SDPD-VOID-INVESTIGATION-REPORT][ERROR] ${e}`)
    throw e
  }
}

export async function sdpsBlockedInvestigationReport(
  { fromDate,
    toDate,
    documentNumber,
    exporter }: IReportFilters) {

  try {

    const filters: any = {};

    if (documentNumber) filters.documentNumber = documentNumber;
    if (exporter) filters.exporter = exporter;
    filters.fromDate = fromDate;
    filters.toDate = toDate;

    logger.info(`[BATCH-REPORT][SDPS-BLOCKED-INVESTIGATION-REPORT][PARAMS]${filters}`)

    const dataFromDB  = await getBlockedSdPs(filters);

    return sdpsBatchReport(dataFromDB[Symbol.iterator](), fromDate, toDate)

  } catch (e) {
    logger.error({err:e}, `[BATCH-REPORT][SDPD-BLOCKED-INVESTIGATION-REPORT][ERROR] ${e}`)
    throw e
  }
}

export async function catchCertInvestigationReport(
  { fromDate,
    toDate,
    documentNumber,
    exporter,
    pln,
    asOfDate = moment() }: IReportFilters) {

  try {

    const vesselsIdx = getVesselsIdx()

    const filters: any = {}

    if (documentNumber) filters.documentNumber = documentNumber
    if (exporter) filters.exporter = exporter
    if (pln) filters.pln = pln
    filters.fromDate = fromDate
    filters.toDate = toDate

    logger.info(`[BATCH-REPORT][CATCH-CERT-INVESTIGATION-REPORT][PARAMS]${filters}`)

    //
    // Get the base set of catch certificates (based on the filter options).
    //
    const catchCertsBase: any[] = Array.from(await getCatchCerts(filters))

    //
    // Save the ids (docment numbers) so that we can use these to filter down the result set
    // for the report
    const catchCertsBaseIds: string[] = catchCertsBase.map(c => c.documentNumber)

    //
    // Get the list of landings from the base set of catch certificates
    //
    const referencedLandings: {
      dateLanded: string,
      pln: string,
      rssNumber: string
    }[] = getLandingsFromCatchCerts(catchCertsBase, vesselLookup(vesselsIdx))

    //
    // Get all catch certificates that reference the same set of landings
    //
    const catchCertsExtended: any[] = Array.from(await getCatchCerts({ landings: referencedLandings }))

    //
    // Get the details for all referenced landings
    //
    let landings: ILanding[]
    landings = Array.from(await getLandingsMultiple(referencedLandings))

    //
    // Get set of landings that need to be updated (are referenced from catch certificates but do not exist
    // or are 'over used')
    // There is a potential optimisation here.  We need to pass in the extended set of catch certificates
    // but only need to refresh landings that are not satisfied based on the basis set.  (if a sibling catch certificate
    // is failing, but not the original, then we don't have to update).. but this requires adding functionality to
    // missingLandings query
    //
    const missingLandings: {
      dateLanded: string,
      rssNumber: string
    }[] = Array.from(missingLandingInvestigationRefreshQuery(catchCertsExtended, landings, vesselsIdx, asOfDate))

    //
    // Refresh these landings
    //
    for (const { rssNumber, dateLanded } of missingLandings) {

      try {
        logger.info(`[BATCH-REPORT][CATCH-CERT-INVESTIGATION-REPORT][REFRESH-LANDINGS] for [${rssNumber}-${dateLanded}]`)
        const res = await fetchLandings(rssNumber, dateLanded)
        if (!res) logger.info(`[BATCH-REPORT][CATCH-CERT-INVESTIGATION-REPORT][REFRESH-LANDINGS]NO-DATA for [${rssNumber}-${dateLanded}]`)
      } catch (e) {
        logger.error({err:e}, `[BATCH-REPORT][CATCH-CERT-INVESTIGATION-REPORT][REFRESH-LANDINGS]ERROR for [${rssNumber}-${dateLanded}] ${e}`)
      }
    }

    //
    // Get the updated landings (after the refresh)
    //
    landings = Array.from(await getLandingsMultiple(referencedLandings))

    //
    // Run query with extended catch certificates and refreshed landings
    //
    const queryData = Array.from(ccQuery(catchCertsExtended, landings, vesselsIdx, asOfDate, getSpeciesAliases))

    //
    // Run view layer (report).  queryData is an array (as we need to reuse it) so convert it to an iterator
    //
    const reportData = Array.from(ccBatchReport(imap(queryData, item => item), fromDate, toDate))

    //
    // Filter the view back to the base set from the initial filter
    //
    return ifilter(reportData, r => catchCertsBaseIds.includes(r.documentNumber))

  } catch (e) {
    logger.error({err:e}, `[BATCH-REPORT][CATCH-CERT-INVESTIGATION-REPORT][ERROR] ${e}`)
    throw e
  }
}

export async function sdpsInvestigationReport(
  { fromDate,
    toDate,
    documentNumber,
    exporter }: IReportFilters) {

  try {

    const filters: any = {}

    if (documentNumber) filters.documentNumber = documentNumber
    if (exporter) filters.exporter = exporter
    filters.fromDate = fromDate
    filters.toDate = toDate

    logger.info(`[BATCH-REPORT][SDPS-INVESTIGATION-REPORT][PARAMS]${filters}`)

    const documentsBase: any[] = Array.from(await getAllDocuments(filters))

    const documentsBaseIds: string[] = documentsBase.map(d => d.documentNumber)

    const fccNumbers = getForeignCatchCertificatesFromDocuments(documentsBase)

    const documentsExtended: any[] = Array.from(await getAllDocuments({ fccNumbers: fccNumbers }))

    const queryData = Array.from(sdpsQuery(documentsExtended, postCodeToDa))

    const reportData = sdpsBatchReport(queryData, fromDate, toDate);

    return ifilter(reportData, r => documentsBaseIds.includes(r.documentNumber))

  } catch (e) {
    logger.error({err:e}, `[BATCH-REPORT][SDPS-INVESTIGATION-REPORT][ERROR] ${e}`)
    throw e
  }
}

export async function catchCertReport(
  fromDate: moment.Moment,
  toDate: moment.Moment,
  asOfDate: moment.Moment=moment.utc(),
  areas: string[]
): Promise<IterableIterator<ICcBatchValidationReport>> {

  logger.info(`[BATCH-REPORT][CATCH-CERT-REPORT][FROM-DATE]${fromDate.toISOString()}[TO-DATE]${toDate.toISOString()}[AS-OF-DATE]${asOfDate.toISOString()}[AREA]${areas}`)

  try {

    logger.info(`[BATCH-REPORT][GET-CATCH-CERTS][START]${moment.utc()}`)
    const catchCerts = await getCatchCerts({})
    logger.info(`[BATCH-REPORT][GET-CATCH-CERTS][END]${moment.utc()}`)
    logger.info(`[BATCH-REPORT][GET-ALL-LANDINGS][START]${moment.utc()}`)
    const landings = await getAllLandings()
    logger.info(`[BATCH-REPORT][GET-ALL-LANDINGS][END]${moment.utc()}`)
    logger.info(`[BATCH-REPORT][CC-QUERY][START]${moment.utc()}`)
    const queryData = ccQuery(catchCerts, landings, getVesselsIdx(), asOfDate, getSpeciesAliases)
    logger.info(`[BATCH-REPORT][CC-QUERY][END]${moment.utc()}`)
    logger.info(`[BATCH-REPORT][GENERATE-BATCH-REPORT][START]${moment.utc()}`)
    return ccBatchReport(queryData, fromDate, toDate, areas)
  } catch(e) {
    logger.error({err:e}, `[BATCH-REPORT][CATCH-CERT-REPORT][ERROR] ${e}`)
    throw(e)
  }
}

export async function catchCertVoidReport(
  fromDate: moment.Moment,
  toDate: moment.Moment,
  asOfDate: moment.Moment=moment.utc(),
  areas: string[]
): Promise<IterableIterator<ICcBatchValidationReport>> {

  logger.info(`[BATCH-REPORT][CATCH-CERT-VOID-REPORT][FROM-DATE]${fromDate.toISOString()}[TO-DATE]${toDate.toISOString()}[AS-OF-DATE]${asOfDate.toISOString()}[AREA]${areas}`)

  try {

    const catchCerts = await getCatchCerts({ documentStatus: DocumentStatuses.Void })
    const landings = []
    const queryData = ccQuery(catchCerts, landings, getVesselsIdx(), asOfDate, getSpeciesAliases)
    const results = ccBatchReport(queryData, fromDate, toDate, areas)
    return imap(results, (data) => clearObjectProperties(['rawLandingsUrl', 'salesNotesUrl', 'FI0_41_unavailabilityDuration', 'FI0_47_unavailabilityExceeds14Days', 'FI0_288_numberOfLandings', 'FI0_289_speciesMismatch', 'FI0_290_exportedWeightExceedingLandedWeight', 'FI0_291_totalExportWeights', 'FI0_136_numberOfFailedValidations'], data))

  } catch(e) {
    logger.error({err:e}, `[BATCH-REPORT][CATCH-CERT-VOID-REPORT][ERROR] ${e}`)
    throw(e)
  }
}

export async function catchCertBlockedReport(fromDate: moment.Moment, toDate: moment.Moment, areas: string[]): Promise<IterableIterator<ICcBatchValidationReport>>  {

  logger.info(`[BATCH-REPORT][CATCH-CERT-BLOCKED-REPORT][FROM-DATE]${fromDate.toISOString()}[TO-DATE]${toDate.toISOString()}[AREA]${areas}`)

  try {
    const dataFromDB  = await getBlockedCatchCerts({ fromDate, toDate, areas });
    return ccBatchReport(dataFromDB[Symbol.iterator](), fromDate, toDate, areas);
  } catch (e) {
    logger.error({err: e }, `[BATCH-REPORT][CATCH-CERT-BLOCKED-REPORT][ERROR] ${e}`)
    throw (e)
  }
}

export async function sdpsReport(fromDate: moment.Moment, toDate: moment.Moment, areas: string[]) : Promise<IterableIterator<ISdPsBatchValidationReport>> {

  logger.info(`[BATCH-REPORT][SDPS-REPORT][FROM-DATE]${fromDate.toISOString()}[TO-DATE]${toDate.toISOString()}[AREA]${areas}`);

  try {
    const documents = await getAllDocuments({})
    const queryData = sdpsQuery(documents, postCodeToDa);
    return sdpsBatchReport(queryData, fromDate, toDate, areas);
  } catch(e) {
    logger.error({err:e}, `[BATCH-REPORT][SDPS-REPORT][ERROR] ${e}`);
    throw(e)
  }
}

export async function sdpsVoidReport(fromDate: moment.Moment, toDate: moment.Moment, areas: string[]): Promise<IterableIterator<ISdPsBatchValidationReport>> {

  logger.info(`[BATCH-REPORT][SDPS-VOID-REPORT][FROM-DATE]${fromDate.toISOString()}[TO-DATE]${toDate.toISOString()}[AREA]${areas}`);

  try {
    const documents = await getAllDocuments({ documentStatus: DocumentStatuses.Void });
    const queryData = sdpsQuery(documents, postCodeToDa);
    const results = sdpsBatchReport(queryData, fromDate, toDate, areas);
    return imap(results, (data) => clearObjectProperties(['inputWeightMismatch', 'exportWeightExceeded' ], data))
    } catch(e) {
    logger.error({err:e}, `[BATCH-REPORT][SDPS-VOID-REPORT][ERROR] ${e}`);
    throw(e)
  }
}

export async function sdpsBlockedReport(fromDate: moment.Moment, toDate: moment.Moment, areas: string[]) : Promise<IterableIterator<ISdPsBatchValidationReport>> {

  logger.info(`[BATCH-REPORT][SDPS-BLOCKED-REPORT][FROM-DATE]${fromDate.toISOString()}[TO-DATE]${toDate.toISOString()}[AREA]${areas}`);

  try {
    const dataFromDB  = await getBlockedSdPs({ fromDate, toDate, areas });
    return sdpsBatchReport(dataFromDB[Symbol.iterator](), fromDate, toDate, areas)
  } catch (e) {
    logger.error({ err: e }, `[BATCH-REPORT][BLOCKED-CATCH-CERT-REPORT][ERROR] ${e}`)
    throw (e)
  }
}