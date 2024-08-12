import moment from 'moment'
import { getCertificateByDocumentNumberWithNumberOfFailedAttemptsQuery } from 'mmo-shared-reference-data';
import { DocumentModel, DocumentStatuses, IDocument } from '../types/document';
import { LandingStatus } from '../types/document';
import { ICountry } from '../types/appConfig/countries';
import logger from '../../logger'

export const getCertificateByPdfReference = async (documentNumber: string) => {
  return await DocumentModel.findOne({ documentUri: `${documentNumber}.pdf` }).lean()
}

export const getCertificateByDocumentNumber = async (documentNumber: string): Promise<IDocument> => {
  return await DocumentModel.findOne({
    documentNumber: documentNumber,
    status: { $in: [DocumentStatuses.Draft, DocumentStatuses.Pending, DocumentStatuses.Complete] }
  }).lean()
}

export const getCertificateByDocumentNumberWithNumberOfFailedAttempts = async (documentNumber: string): Promise<IDocument> => {
  return await DocumentModel.aggregate(getCertificateByDocumentNumberWithNumberOfFailedAttemptsQuery(documentNumber)).then(results => results[0]);
}

export const upsertCertificate = async (documentNumber: string, parametersToUpdate: Object) => {
  const certificate : any = await DocumentModel.findOne({
    documentNumber : documentNumber,
    status: { $nin: [DocumentStatuses.Locked, DocumentStatuses.Void] }
  });

  if (!certificate) return null;

  for(const [key, value] of Object.entries(parametersToUpdate))
    certificate[key] = value

  const response: any = await DocumentModel.findOneAndUpdate(
    {
      documentNumber: documentNumber
    },
    certificate,
    {new: true}
  )

  return response;
}

export const upsertProductsByIgnore = async (products: any, documentNumber: String) => {
  const query : any = {documentNumber: documentNumber};
  const update = {
    $set: { 'exportData.products': products },
  };
  await DocumentModel.findOneAndUpdate(query, update);
};

export const upsertExportPayload = async (documentNumber: string, products: Product[]) => {
  const query : any = {status: 'DRAFT', documentNumber: documentNumber};

  const certificate = DocumentModel.findOne(
    query,
    ['userReference', 'exportData'],
    { lean: true }
  );

  if (!certificate) return null;

  const options = { upsert: true, omitUndefined: true };
  const update = {'$set': { 'exportData.products': products } }

  await DocumentModel.findOneAndUpdate(query, update, options);
}

export interface Catch {
  id: string;
  vessel?: string;
  pln?: string;
  homePort?: string;
  flag?: string; // jurisdiction under whose laws the vessel is registered or licensed
  cfr?: string; // cost and freight (CFR) is a legal term
  imoNumber?: string | null;
  licenceNumber?: string;
  licenceValidTo?: string;
  licenceHolder?: string;
  date?: string;
  faoArea?: string;
  weight?: number;
  _status?: LandingStatus;
  numberOfSubmissions?: number;
  vesselOverriddenByAdmin?: boolean;
  vesselNotFound?: boolean;
  dataEverExpected?: boolean;
  landingDataExpectedDate?: string;
  landingDataEndDate?: string;
  isLegallyDue?: boolean;
}

export interface State {
  code: string,
  name?: string,
  admin?: string
}

export interface Presentation {
  code: string,
  name?: string,
  admin?: string
}

export interface Product {
  speciesId: string,
  species?: string,
  speciesAdmin?: string,
  speciesCode?: string,
  scientificName?: string,
  commodityCode?: string,
  commodityCodeAdmin?: string,
  commodityCodeDescription?: string,
  state?: State,
  presentation?: Presentation,
  caughtBy?: Catch[],
  factor? : number,
  speciesOverriddenByAdmin?: boolean;
  stateAdmin?: string,
  presentationAdmin?: string,
}

export interface BasicTransportDetails {
  vehicle: string,
  exportedFrom?: string,
  departurePlace? : string,
  exportDate? : string,
  exportedTo? : ICountry,
}

export interface Train extends BasicTransportDetails {
  railwayBillNumber: string,
}

export interface Plane extends BasicTransportDetails {
  flightNumber: string,
  containerNumber: string
}

export interface ContainerVessel extends BasicTransportDetails {
  vesselName: string,
  flagState: string,
  containerNumber: string
}

export interface Truck extends BasicTransportDetails {
  cmr?: boolean,
  nationalityOfVehicle?: string,
  registrationNumber?: string
}

export type Transport = Train | Plane | ContainerVessel | Truck;

interface IGetCatchCerts {
  fromDate?: moment.Moment,
  toDate?: moment.Moment,
  documentStatus?: string,
  landings?: { pln: string, dateLanded: string }[],
  documentNumber?: string,
  exporter?: string,
  pln?: string,
  areas?: string[],
  landingStatuses?: LandingStatus[]
}

export const getCatchCerts = async (
  { fromDate, documentStatus=DocumentStatuses.Complete, landings, documentNumber, exporter, pln, landingStatuses }: IGetCatchCerts) => {

  if (landings && landings.length === 0) return []

  if (landings && pln) return []  // conflicting filters

  const query: any = {
    __t: 'catchCert',
    createdAt: { $type: 9 },
    'exportData.products': { $exists: true },
    $or: [ {'status': { $exists: false }}, {'status': documentStatus} ]
  }

  if (landings) {
    /*
     * filter by catch certificates referencing one of the supplied landings
     */
    const landingsClause = {
      $elemMatch: {
        $or: landings.map(landing => ({
          pln: landing.pln,
          date: landing.dateLanded
        }))
      }
    }
    query['exportData.products.caughtBy'] = landingsClause
  }

  if (landingStatuses) {
    /**
     * filter by catch certificates with landings of specific landing status
     */
    const landingsClause = {
      $elemMatch: {
        $or: landingStatuses.map(_ => ({
          _status: _
        }))
      }
    }

    query['exportData.products.caughtBy'] = landingsClause
  }

  /*
   * Filters from the investigation function.
   * Should result in mutually exclusive filters, but will not protect against this here
   */
  if (documentNumber) query.documentNumber = documentNumber

  if (exporter) {
     query['exportData.exporterDetails.exporterCompanyName'] = {'$regex': exporter,$options:'i'}
  }

  if (pln) query['exportData.products.caughtBy.pln'] = pln


  /*
   * From date filtering used to support go-live feature of only 'seeing'
   * data from after a cut off date as business will not archive pre go-live data
   */
  if (fromDate) query.createdAt = { $gte: fromDate.toDate() }

  logger.info(`[LANDINGS][PERSISTENCE][GET-ALL-CATCH-CERTS][QUERY]${JSON.stringify(query)}`)

  return await DocumentModel
    .find(query, null, { timeout: true, lean: true })
    .sort({ createdAt: -1 })
}

export const getAllCatchCertsWithProducts = async (): Promise<IDocument[]> =>
  await DocumentModel.find({
    __t: 'catchCert',
    'exportData.products': { $exists: true },
  }).lean();


