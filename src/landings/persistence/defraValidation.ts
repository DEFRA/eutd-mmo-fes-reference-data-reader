import moment from 'moment';
import { ApplicationConfig } from '../../config';
import { IDefraValidationCatchCertificate } from 'mmo-shared-reference-data';
import {
    IDefraValidationReport,
    IDefraValidationProcessingStatement,
    DefraValidationReportModel,
    DefraValidationProcessingStatementModel,
    DefraValidationReportData,
    IDefraValidationStorageDocument,
    DefraValidationStorageDocumentModel,
    DefraValidationCatchCertificateModel
} from '../types/defraValidation';

export const insertDefraValidationReport = async (report: IDefraValidationReport): Promise<void> => {
    await new DefraValidationReportModel(report).save();
};

export const insertPsDefraValidationReport = async (report: IDefraValidationProcessingStatement): Promise<void> => {
    await new DefraValidationProcessingStatementModel(report).save();
};

export const insertSdDefraValidationReport = async (report: IDefraValidationStorageDocument): Promise<void> => {
    await new DefraValidationStorageDocumentModel(report).save();
};

export const insertCcDefraValidationReport = async (report: IDefraValidationCatchCertificate): Promise<void> => {
    await new DefraValidationCatchCertificateModel(report).save();
};

export const getAllDefraValidationReports = async (dateFrom: string = undefined, dateTo: string = undefined): Promise<any[]> => {

    const filters = [];

    if (dateFrom) {
      filters.push({'lastUpdated': {'$gte': moment(dateFrom).utc().toDate()}});
    }

    if (dateTo) {
        filters.push({'lastUpdated': {'$lte': moment(dateTo).utc().toDate()}});
    }

    const qry = (filters.length) ? {'$and': filters} : {}

    return await DefraValidationReportData.find(qry)
      .setOptions({ strictQuery: false })
      .select(['-_id', '-__v', '-__t', '-_processed'])
      .lean();
};

export const getDefraValidationReportsCount = async (): Promise<any> => {
  const data: any[] =
    (await DefraValidationReportData.find({})
      .setOptions({ strictQuery: false })
      .select(['-_id', '-__v', '-__t'])
      .lean()) || [];

  return data.reduce((defraValidationReportCounts: any, defraValidationReport: any) => {
    if (defraValidationReport._processed) {
      defraValidationReportCounts['processedDefraValidationReports']++;
    } else {
      defraValidationReportCounts['unprocessedDefraValidationReports']++;
    }

    switch(defraValidationReport.documentType) {
      case 'CatchCertificate':
        defraValidationReportCounts['ccDefraValidationReports']++;
        break;
      case 'ProcessingStatement':
        defraValidationReportCounts['psDefraValidationReports']++;
        break;
      case 'StorageDocument':
        defraValidationReportCounts['sdDefraValidationReports']++;
        break;
      default:
        defraValidationReportCounts['baseDefraValidationReports']++;
    }

    defraValidationReportCounts['totalDefraValidationReports']++;

    return defraValidationReportCounts;
  }, {
    totalDefraValidationReports: 0,
    processedDefraValidationReports: 0,
    unprocessedDefraValidationReports: 0,
    ccDefraValidationReports: 0,
    psDefraValidationReports: 0,
    sdDefraValidationReports: 0,
    baseDefraValidationReports: 0
  });
}

export const getUnprocessedReports = async (): Promise<any[]> =>
  await DefraValidationReportData.find({ _processed: false })
    .setOptions({ strictQuery: false })
    .select(['-__v', '-__t', '-_processed'])
    .limit(ApplicationConfig.prototype.maximumDefraValidationReportBatchSize)
    .lean();

export const markAsProcessed = async (ids: string[]): Promise<void> => {
  await DefraValidationReportData.updateMany(
    {
      _id: {
        $in: ids
      }
    },
    { _processed: true },
    { strict: false }
  );
};