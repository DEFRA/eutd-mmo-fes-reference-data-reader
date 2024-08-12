import { postCodeDaLookup } from 'mmo-shared-reference-data';
import { ISdPsQueryResult } from "../types/query";
import { AuditEventTypes } from "../types/auditEvent";
import { getLastAuditEvent } from "../transformations/transformations"

const _ = require('lodash');
import logger from '../../logger';
import moment from 'moment';

interface IFlattenedCatch {
  documentNumber: string;
  documentType: string;
  certificateNumber: string;
  certificateType: string;
  status: string;
  createdAt: string;
  da: string;
  species: string;
  scientificName?: string;
  commodityCode: string;
  weight: number;
  weightOnCC: number;
  weightAfterProcessing?: number;
  dateOfUnloading?: string;
  placeOfUnloading?: string;
  transportUnloadedFrom?: string;
  extended: any;
}

export const TOLERANCE_IN_KG = 50;

export function* sdpsQuery (documents: any[], postCodeToDa: any):
  IterableIterator<ISdPsQueryResult> {

  const daLookup = postCodeDaLookup(postCodeToDa)

  /*
   * Unwind to:
   *    documentNumber, documentType, certificateNumber, createdAt, species, weight, weightOnCC, weightAfterProcessing, extended
   */
  const unwoundCatches: IFlattenedCatch[] = Array.from(unwindDocumentsToCatches(documents, daLookup))

  const foreignCatchCerts: any = unwoundCatchesToForeignCatchCerts(unwoundCatches)

  /*
   * Unwind to:
   *    certificateNumber, species, createdByDocument, declaredWeight, allocatedWeight, allocationsFrom
   */
  const unwoundForeignCatchCerts: any[] = Array.from(unwindForeignCatchCerts(foreignCatchCerts))

  /*
   * Index by:
   *    certificateNumber + species
   */
  const fccIdx = unwoundForeignCatchCerts.reduce((acc, cur) => ({ ...acc, [`${cur.certificateNumber}${cur.species}`]: cur }), {})

  const linkedSdPs = [];

  for (const item of unwoundCatches) {

    const r = <ISdPsQueryResult>{}

    const fcc = fccIdx[`${item.certificateNumber}${item.species}`]

    if (!fcc) {
      logger.error(`[FOREIGN-CATCH-CERTS][ERROR]Unable to find [${item.certificateNumber}${item.species}] in fccIdx`)
    } else {

      r.documentNumber = item.documentNumber
      r.status = item.status
      r.documentType = item.documentType
      r.createdAt = item.createdAt
      r.da = item.da
      r.species = item.species
      r.scientificName = item.scientificName
      r.catchCertificateNumber = item.certificateNumber
      r.catchCertificateType = item.certificateType
      r.commodityCode = item.commodityCode
      r.weightOnDoc = item.weight
      r.extended = item.extended

      r.weightOnAllDocs = fcc.allocatedWeight
      r.weightOnFCC = fcc.declaredWeight
      r.isOverAllocated = fcc.allocatedWeight > (fcc.declaredWeight + TOLERANCE_IN_KG)
      r.overAllocatedByWeight = r.isOverAllocated ? fcc.allocatedWeight - fcc.declaredWeight : 0
      r.overUsedInfo = r.isOverAllocated  ? [...new Set(linkedSdPs)] : [];
      r.isMismatch = item.weightOnCC !== fcc.declaredWeight  // Declared weight different to first declared weight

      if (item.weightAfterProcessing !== undefined) {
        r.weightAfterProcessing = item.weightAfterProcessing
      }

      if (item.dateOfUnloading !== undefined) r.dateOfUnloading = item.dateOfUnloading
      if (item.placeOfUnloading !== undefined) r.placeOfUnloading = item.placeOfUnloading
      if (item.transportUnloadedFrom !== undefined) r.transportUnloadedFrom = item.transportUnloadedFrom
      linkedSdPs.push(item.documentNumber);
      yield r

    }
  }
}

export const unwindAndMapCatches = (doc: any, daLookup): IFlattenedCatch[] => {

  const voidedEvent = (doc.audit && doc.audit.length)
      ? getLastAuditEvent(doc.audit, AuditEventTypes.Voided)
      : undefined;

  const preApprovedEvent = (doc.audit && doc.audit.length)
      ? getLastAuditEvent(doc.audit, AuditEventTypes.PreApproved)
      : undefined;

  return doc.exportData.catches.map(cat => {

    const basic = {
      documentNumber: doc.documentNumber,
      status: doc.status ? doc.status : 'COMPLETE',
      createdAt: moment.utc(doc.createdAt).toISOString(),
      da: doc.exportData.exporterDetails ? daLookup(doc.exportData.exporterDetails.postcode) : 'England'
    }

    let specific

    if (doc.__t === 'storageDocument')
      specific = {
        documentType: 'storageDocument',
        certificateNumber: cat.certificateNumber,
        certificateType: cat.certificateType,
        species: cat.product,
        commodityCode: cat.commodityCode,
        weight: parseFloat(cat.productWeight),
        weightOnCC: cat.weightOnCC ? parseFloat(cat.weightOnCC) : 0,
        dateOfUnloading: cat.dateOfUnloading,
        placeOfUnloading: cat.placeOfUnloading,
        transportUnloadedFrom: cat.transportUnloadedFrom,
        scientificName: cat.scientificName
      }

    if (doc.__t === 'processingStatement') {
      specific = {
        documentType: 'processingStatement',
        certificateNumber: cat.catchCertificateNumber,
        certificateType: cat.catchCertificateType,
        species: cat.species,
        scientificName: cat.scientificName,
        commodityCode: 'N/A',
        weight: parseFloat(cat.exportWeightBeforeProcessing),
        weightOnCC: parseFloat(cat.totalWeightLanded),
        weightAfterProcessing: (cat.exportWeightAfterProcessing !== undefined) ? parseFloat(cat.exportWeightAfterProcessing) : undefined
      }
    }

    const extended = {
      url: doc.documentUri,
      exporterCompanyName: doc.exportData.exporterDetails ? doc.exportData.exporterDetails.exporterCompanyName : undefined,
      investigation: doc.investigation,
      voidedBy : (voidedEvent && voidedEvent.triggeredBy) ? voidedEvent.triggeredBy : undefined,
      preApprovedBy: (preApprovedEvent && preApprovedEvent.triggeredBy) ? preApprovedEvent.triggeredBy : undefined,
      id: cat.id,
    }

    return {...basic, ...specific, extended}

  })
}

export function* unwindDocumentsToCatches(documents: any[], daLookup) {
  for (const unwounds of documents.map(doc => unwindAndMapCatches(doc, daLookup)))
    for (const unwound of unwounds)
      yield unwound
}

export function* unwindForeignCatchCerts(foreignCatchCerts: any[]) {
  for ( const { certificateNumber, items } of foreignCatchCerts ) {
    for ( const item of items ) {
      yield {
        certificateNumber,
        certificateType: item.certificateType,
        species: item.species,
        createdByDocument: item.createdByDocument,
        declaredWeight: item.declaredWeight,
        allocatedWeight: item.allocatedWeight,
        allocationsFrom: item.allocationsFrom
      }
    }
  }
}

export function* unwoundCatchesToForeignCatchCerts(unwoundCatches: IFlattenedCatch[]) {

  logger.info(`[FOREIGN-CATCH-CERTS][DOCUMENTS-TO-FOREIGN-CATCH-CERTS]`)

  const groupedCatches = _(Array.from(unwoundCatches))
    .sortBy(['certificateNumber', 'createdAt', 'documentNumber'])
    .groupBy('certificateNumber')
    .value()

  for (const [certificateNumber, catches] of Object.entries(groupedCatches)) {

    const items = {}

    for (const cat of catches as any) {

      const species = cat.species

      if (!(Object.prototype.hasOwnProperty.call(items, species))) {

        /*
         * first (we've sorted above by createdAt) document to refernce this fkk / species
         * gets to determine the declaredWeight
         */
        items[species] = {
          species,
          createdByDocument: cat.documentNumber,
          declaredWeight: cat.weightOnCC,
          allocatedWeight: 0,
          allocationsFrom: []
        }
      }
      items[species].allocatedWeight += cat.weight;
      items[species].allocationsFrom.push( { documentNumber: cat.documentNumber, weight: cat.weight } )
    }

    yield { certificateNumber,
            items: Object.values(items) }

  }
}


export const getForeignCatchCertificatesFromDocuments = (documents: any[]) =>
  _.uniq(
    Array.from(unwindDocumentsToCatches(documents, () => true))
      .map( ({ certificateNumber }) => certificateNumber.toUpperCase() )
  );

