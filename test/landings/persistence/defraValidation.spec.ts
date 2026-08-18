import moment from 'moment';
import { ApplicationConfig } from '../../../src/config';
import { FailedOnlineCertificates } from '../../../src/landings/types/query';
import { IDefraValidationCatchCertificate } from 'mmo-shared-reference-data';
import {
  insertPsDefraValidationReport,
  insertSdDefraValidationReport,
  insertCcDefraValidationReport
} from '../../../src/landings/persistence/defraValidation';
import {
  IDefraValidationReport,
  IDefraValidationProcessingStatement,
  DefraValidationReportData,
  DefraValidationReportModel,
  DefraValidationCatchCertificateModel,
  DefraValidationProcessingStatementModel,
  DefraValidationStorageDocumentModel,
  IDefraValidationStorageDocument,
} from '../../../src/landings/types/defraValidation';

import * as SUT from '../../../src/landings/persistence/defraValidation';
import { connectTestMongo, disconnectTestMongo } from '../../helpers/mongoTestConnection';

beforeAll(async () => {
  await connectTestMongo();
});

afterEach(async () => {
  await DefraValidationReportData.deleteMany({});
  await FailedOnlineCertificates.deleteMany({});
})

afterAll(async () => {
  await disconnectTestMongo();
});

const sampleReport = (certificateId: string, status: string, requestedByAdmin: boolean, landingId?: string, validationPass?: boolean, lastUpdated?: string, isUnblocked?: boolean, documentType?: string, processed?: boolean) => ({
  certificateId     : certificateId,
  status            : status,
  landingId         : landingId || undefined,
  validationPass    : validationPass || undefined,
  lastUpdated       : lastUpdated ? moment.utc(lastUpdated).toDate() : new Date('2020-06-01'),
  isUnblocked       : isUnblocked || false,
  requestedByAdmin  : requestedByAdmin || false,
  documentType      : documentType || undefined,
  _processed        : processed || false
});

describe('insertDefraValidationReport', () => {

  it('will save a new defra report', async () => {

    const report : IDefraValidationReport = {
      certificateId: '1234',
      status: 'COMPLETE',
      landingId: 'C02514',
      validationPass: true,
      lastUpdated: new Date(),
      isUnblocked: true,
      requestedByAdmin: false
    };

    await SUT.insertDefraValidationReport(report);

    const result: any = await DefraValidationReportData.find().lean();

    expect(result).toHaveLength(1);
    expect(result[0].certificateId).toBe('1234');
    expect(result[0].requestedByAdmin).toBe(false);
  });

});

describe('insertPsDefraValidationReport', () => {

  it('will save a new psdefra report', async () => {

    const report : IDefraValidationProcessingStatement = {
      documentType : "ProcessingStatement",
      documentNumber: "GBR-34234-PS-234234",
      status: "DRAFT",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };

    await insertPsDefraValidationReport(report);

    const result: any = await DefraValidationReportData.find().lean();

    expect(result).toHaveLength(1);
    expect(result[0].documentType).toBe('ProcessingStatement');
  });

  it('will save both ps defra report and standard defra report', async () => {
    const report1 : IDefraValidationReport = {
      certificateId: '1234',
      status: 'COMPLETE',
      landingId: 'C02514',
      validationPass: true,
      lastUpdated: new Date(),
      isUnblocked: true,
      requestedByAdmin: false
    };

    const report2 : IDefraValidationProcessingStatement = {
      documentType : "ProcessingStatement",
      documentNumber: "GBR-34234-PS-234234",
      status: "DRAFT",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };


    await SUT.insertDefraValidationReport(report1);
    await SUT.insertPsDefraValidationReport(report2);

    const result: any = await DefraValidationReportData.find().lean();

    expect(result).toHaveLength(2);
    expect(result[0].certificateId).toBe('1234');
    expect(result[1].documentType).toBe('ProcessingStatement');
  });

  it('will auto generate lastUpdated for PS defra report', async () => {

    const report1 : IDefraValidationProcessingStatement = {
      documentType : "ProcessingStatement",
      documentNumber: "GBR-34234-PS-234234",
      status: "DRAFT",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };

    const report2 : IDefraValidationProcessingStatement = {
      documentType : "ProcessingStatement",
      documentNumber: "ZZZ-34234-PS-234234",
      status: "DRAFT",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };

    await insertPsDefraValidationReport(report1);
    await new Promise(resolve => setTimeout(resolve, 10));

    await insertPsDefraValidationReport(report2);

    const result: any = await DefraValidationReportData.find().lean();

    expect(result).toHaveLength(2);
    expect(result[0].lastUpdated).not.toEqual(result[1].lastUpdated);
  });
});

describe('insertSdDefraValidationReport', () => {

  it('will save a new sddefra report', async () => {

    const report : IDefraValidationStorageDocument = {
      documentType : "StorageDocument",
      documentNumber: "GBR-34234-SD-234234",
      status: "DRAFT",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };

    await insertSdDefraValidationReport(report);

    const result: any = await DefraValidationReportData.find().lean();

    expect(result).toHaveLength(1);
    expect(result[0].documentType).toBe('StorageDocument');
  });

  it('will save both sddefra report and standard defra report', async () => {
    const report1 : IDefraValidationReport = {
      certificateId: '1234',
      status: 'COMPLETE',
      landingId: 'C02514',
      validationPass: true,
      lastUpdated: new Date(),
      isUnblocked: true,
      requestedByAdmin: false
    };

    const report2 : IDefraValidationStorageDocument = {
      documentType : "StorageDocument",
      documentNumber: "GBR-34234-SD-234234",
      status: "DRAFT",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };


    await SUT.insertDefraValidationReport(report1);
    await SUT.insertSdDefraValidationReport(report2);

    const result: any = await DefraValidationReportData.find().lean();

    expect(result).toHaveLength(2);
    expect(result[0].certificateId).toBe('1234');
    expect(result[1].documentType).toBe('StorageDocument');
  });

  it('will auto generate lastUpdated for SD defra report', async () => {

    const report1 : IDefraValidationStorageDocument = {
      documentType : "StorageDocument",
      documentNumber: "GBR-34234-SD-234234",
      status: "DRAFT",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };

    const report2 : IDefraValidationStorageDocument = {
      documentType : "StorageDocument",
      documentNumber: "ZZZ-34234-SD-234234",
      status: "DRAFT",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };

    await insertSdDefraValidationReport(report1);

    // Add a small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await insertSdDefraValidationReport(report2);

    const result: any = await DefraValidationReportData.find().lean();

    expect(result).toHaveLength(2);
    expect(result[0].lastUpdated).not.toEqual(result[1].lastUpdated);
  });
});

describe('insertCcDefraValidationReport', () => {

  it('will save a new cc defra report', async () => {

    const report : IDefraValidationCatchCertificate = {
      documentType : "CC",
      documentNumber: "GBR-34234-SD-234234",
      status: "DRAFT",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };

    await insertCcDefraValidationReport(report);

    const result: any = await DefraValidationReportData.find().lean();

    expect(result).toHaveLength(1);
    expect(result[0].documentType).toBe('CC');
  });

  it('will save both cc defra report and standard defra report', async () => {
    const report1 : IDefraValidationReport = {
      certificateId: '1234',
      status: 'COMPLETE',
      landingId: 'C02514',
      validationPass: true,
      lastUpdated: new Date(),
      isUnblocked: true,
      requestedByAdmin: false
    };

    const report2 : IDefraValidationCatchCertificate = {
      documentType : "CC",
      documentNumber: "GBR-34234-SD-234234",
      status: "DRAFT",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };


    await SUT.insertDefraValidationReport(report1);
    await SUT.insertCcDefraValidationReport(report2);

    const result: any = await DefraValidationReportData.find().lean();

    expect(result).toHaveLength(2);
    expect(result[0].certificateId).toBe('1234');
    expect(result[1].documentType).toBe('CC');
  });

  it('will auto generate lastUpdated for cc defra report', async () => {

    const report1 : IDefraValidationCatchCertificate = {
      documentType : "CC",
      documentNumber: "GBR-34234-SD-234234",
      status: "DRAFT",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };

    const report2 : IDefraValidationCatchCertificate = {
      documentType : "CC",
      documentNumber: "ZZZ-34234-SD-234234",
      status: "DRAFT",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };

    await insertCcDefraValidationReport(report1);

    // Add a small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await insertCcDefraValidationReport(report2);

    const result: any = await DefraValidationReportData.find().lean();

    expect(result).toHaveLength(2);
    expect(result[0].lastUpdated).not.toEqual(result[1].lastUpdated);
  });
});

describe('getAllDefraValidationReports', () => {

  it('will return ALL defra reports if no dateFrom and no dateTo are specified', async () => {
    await new DefraValidationReportModel(sampleReport('1234', 'COMPLETE', false, '2019-02-19CS214')).save();
    await new DefraValidationReportModel(sampleReport('1235', 'DRAFT', false, '2019-02-19CS214')).save();
    await new DefraValidationProcessingStatementModel({
      documentType : "ProcessingStatement",
      documentNumber: "ZZZ-34234-PS-234234",
      status: "DRAFT",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    }).save();
    await new DefraValidationReportModel(sampleReport('1237', 'BLOCKED', false, '2019-02-19CS214', false, '2019-12-01')).save();
    await new DefraValidationReportModel(sampleReport('1238', 'BLOCKED', false, '2019-02-19CS214', false, '2019-12-02', true)).save();

    const result = await SUT.getAllDefraValidationReports();

    expect(result).toHaveLength(5);
  });

  it('will filter defra reports by lastUpdated if a dateFrom is specified', async () => {
    await Promise.all([
      new DefraValidationReportModel(sampleReport('1234', 'COMPLETE', false, null, true, '2019-02-19')).save(),
      new DefraValidationReportModel(sampleReport('1235', 'DRAFT',    false, null, true, '2019-02-20')).save(),
      new DefraValidationReportModel(sampleReport('1237', 'BLOCKED',  false, null, true, '2019-02-21')).save(),
      new DefraValidationReportModel(sampleReport('1238', 'BLOCKED',  false, null, true, '2019-02-22')).save()
    ]);

    const result = await SUT.getAllDefraValidationReports('2019-02-21', undefined);
    const certIds = result.map(_ => _.certificateId);

    expect(result).toHaveLength(2);
    expect(certIds).toContain('1237');
    expect(certIds).toContain('1238');
  });

  it('will filter defra reports by lastUpdated if a dateTo is specified', async () => {
    await Promise.all([
      new DefraValidationReportModel(sampleReport('1234', 'COMPLETE', false, null, true, '2019-02-19')).save(),
      new DefraValidationReportModel(sampleReport('1235', 'DRAFT',    false, null, true, '2019-02-20')).save(),
      new DefraValidationReportModel(sampleReport('1237', 'BLOCKED',  false, null, true, '2019-02-21')).save(),
      new DefraValidationReportModel(sampleReport('1238', 'BLOCKED',  false, null, true, '2019-02-22')).save()
    ]);

    const result = await SUT.getAllDefraValidationReports(undefined, '2019-02-21');
    const certIds = result.map(_ => _.certificateId);

    expect(result).toHaveLength(3);
    expect(certIds).toContain('1234');
    expect(certIds).toContain('1235');
  });

  it('will filter defra reports by lastUpdated if a dateFrom and dateTo are specified', async () => {
    await Promise.all([
      new DefraValidationReportModel(sampleReport('1234', 'COMPLETE', false, null, true, '2019-02-19')).save(),
      new DefraValidationReportModel(sampleReport('1235', 'DRAFT',    false, null, true, '2019-02-20')).save(),
      new DefraValidationReportModel(sampleReport('1237', 'BLOCKED',  false, null, true, '2019-02-21')).save(),
      new DefraValidationReportModel(sampleReport('1238', 'BLOCKED',  false, null, true, '2019-02-22')).save()
    ]);

    const result = await SUT.getAllDefraValidationReports('2019-02-20', '2019-02-21');
    const certIds = result.map(_ => _.certificateId);

    expect(result).toHaveLength(2);
    expect(certIds).toContain('1235');
    expect(certIds).toContain('1235');
  });

  it('will return no defra reports if dateFrom is after dateTo', async () => {
    await Promise.all([
      new DefraValidationReportModel(sampleReport('1234', 'COMPLETE', false, null, true, '2019-02-19')).save(),
      new DefraValidationReportModel(sampleReport('1235', 'DRAFT',    false, null, true, '2019-02-20')).save(),
      new DefraValidationReportModel(sampleReport('1237', 'BLOCKED',  false, null, true, '2019-02-21')).save(),
      new DefraValidationReportModel(sampleReport('1238', 'BLOCKED',  false, null, true, '2019-02-22')).save()
    ]);

    const result = await SUT.getAllDefraValidationReports('2019-02-21', '2019-02-20');

    expect(result).toHaveLength(0);
  });

  it('will return no defra reports if the collection is empty', async () => {
    const result = await SUT.getAllDefraValidationReports();

    expect(result).toHaveLength(0);
  });

  it('will filter out internal fields from the response', async () => {
    await new DefraValidationReportModel(sampleReport('1234', 'COMPLETE', false, '2019-02-19CS214')).save();

    const result = await SUT.getAllDefraValidationReports();

    expect(result[0]['certificateId']).toBe('1234');
    expect(result[0]['_id']).toBeUndefined();
    expect(result[0]['_processed']).toBeUndefined();
    expect(result[0]['__v']).toBeUndefined();
    expect(result[0]['__t']).toBeUndefined();
  });

});

describe('getDefraValidationReportsCount', () => {

  it('will return information of ALL defra reports', async () => {
    await new DefraValidationReportModel(sampleReport('1234', 'COMPLETE', false, '2019-02-19CS214')).save();
    await new DefraValidationReportModel(sampleReport('1235', 'DRAFT', false, '2019-02-19CS214')).save();
    await new DefraValidationReportModel(sampleReport('1237', 'BLOCKED', false, '2019-02-19CS214', false, '2019-12-01')).save();
    await new DefraValidationReportModel(sampleReport('1238', 'BLOCKED', false, '2019-02-19CS214', false, '2019-12-02', true)).save();

    const result = await SUT.getDefraValidationReportsCount();

    expect(result).toEqual({
      totalDefraValidationReports: 4,
      processedDefraValidationReports: 0,
      ccDefraValidationReports: 0,
      psDefraValidationReports: 0,
      sdDefraValidationReports: 0,
      unprocessedDefraValidationReports: 4,
      baseDefraValidationReports: 4
    });
  });

  it('will return information of ALL processed defra reports', async () => {
    await new DefraValidationReportModel(sampleReport('1234', 'COMPLETE', false, '2019-02-19CS214', false, undefined, false, undefined, true)).save();
    await new DefraValidationReportModel(sampleReport('1235', 'DRAFT', false, '2019-02-19CS214')).save();
    await new DefraValidationReportModel(sampleReport('1237', 'BLOCKED', false, '2019-02-19CS214', false, '2019-12-01')).save();
    await new DefraValidationReportModel(sampleReport('1238', 'BLOCKED', false, '2019-02-19CS214', false, '2019-12-02', true)).save();

    const result = await SUT.getDefraValidationReportsCount();

    expect(result).toEqual({
      totalDefraValidationReports: 4,
      processedDefraValidationReports: 1,
      ccDefraValidationReports: 0,
      psDefraValidationReports: 0,
      sdDefraValidationReports: 0,
      unprocessedDefraValidationReports: 3,
      baseDefraValidationReports: 4
    });
  });

    it('will return information of ALL Catch Certificates, Processing Statements and Storage Documents defra reports', async () => {
      await new DefraValidationReportModel(sampleReport('1234', 'COMPLETE', false, '2019-02-19CS214', false, undefined, false, undefined, true)).save();
      await new DefraValidationCatchCertificateModel({
        documentType : "CatchCertificate",
        documentNumber: "ZZZ-34234-CC-234234",
        status: "DRAFT",
        _correlationId: 'some-uuid-correlation-id',
        requestedByAdmin: false
      }).save();
      await new DefraValidationProcessingStatementModel({
        documentType : "ProcessingStatement",
        documentNumber: "ZZZ-34234-PS-234234",
        status: "DRAFT",
        _correlationId: 'some-uuid-correlation-id',
        requestedByAdmin: false
      }).save();
      await new DefraValidationStorageDocumentModel({
        documentType : "StorageDocument",
        documentNumber: "ZZZ-34234-SD-234234",
        status: "DRAFT",
        _correlationId: 'some-uuid-correlation-id',
        requestedByAdmin: false
      }).save();

      const result = await SUT.getDefraValidationReportsCount();

      expect(result).toEqual({
        totalDefraValidationReports: 4,
        processedDefraValidationReports: 1,
        ccDefraValidationReports: 1,
        psDefraValidationReports: 1,
        sdDefraValidationReports: 1,
        unprocessedDefraValidationReports: 3,
        baseDefraValidationReports: 1
      });
  });

  it('will return no defra reports if the collection is empty', async () => {
    const result = await SUT.getDefraValidationReportsCount();

    expect(result).toEqual({
      totalDefraValidationReports: 0,
      processedDefraValidationReports: 0,
      ccDefraValidationReports: 0,
      psDefraValidationReports: 0,
      sdDefraValidationReports: 0,
      unprocessedDefraValidationReports: 0,
      baseDefraValidationReports: 0
    });
  });

});

describe('getUnprocessedReports', () => {

  it('returns any reports which havent been processed', async () => {

    const report : IDefraValidationReport = {
      certificateId: '1234',
      status: 'COMPLETE',
      landingId: 'C02514',
      validationPass: true,
      lastUpdated: new Date(),
      isUnblocked: true,
      requestedByAdmin: false
    };

    await SUT.insertDefraValidationReport(report);

    const all = await SUT.getAllDefraValidationReports();
    const unprocessed = await SUT.getUnprocessedReports();

    expect(unprocessed).toHaveLength(all.length);

  });

  it('does not return any reports which have been processed', async () => {

    const report : IDefraValidationReport = {
      certificateId: '1234',
      status: 'COMPLETE',
      landingId: 'C02514',
      validationPass: true,
      lastUpdated: new Date(),
      isUnblocked: true,
      requestedByAdmin: false
    };

    await SUT.insertDefraValidationReport(report);

    await DefraValidationReportData.updateMany({}, { _processed: true }, { strict: false });

    const all = await SUT.getAllDefraValidationReports();
    const unprocessed = await SUT.getUnprocessedReports();

    expect(all).toHaveLength(1);
    expect(unprocessed).toHaveLength(0);

  });

  it('does return only the number of entries in batch size', async () => {

    const report : IDefraValidationReport = {
      certificateId: '1234',
      status: 'COMPLETE',
      landingId: 'C02514',
      validationPass: true,
      lastUpdated: new Date(),
      isUnblocked: true,
      requestedByAdmin: false
    };

    await SUT.insertDefraValidationReport(report);
    await SUT.insertDefraValidationReport(report);
    await SUT.insertDefraValidationReport(report);

    await DefraValidationReportData.updateMany({}, { _processed: false }, { strict: false });

    const all = await SUT.getAllDefraValidationReports();

    const backup_maximumDefraValidationReportBatchSize = ApplicationConfig.prototype.maximumDefraValidationReportBatchSize;
    ApplicationConfig.prototype.maximumDefraValidationReportBatchSize = 2;
    const unprocessed = await SUT.getUnprocessedReports();
    ApplicationConfig.prototype.maximumDefraValidationReportBatchSize = backup_maximumDefraValidationReportBatchSize;


    expect(all).toHaveLength(3);
    expect(unprocessed).toHaveLength(2);

  });

  it('will return all the specified data points for each record', async () => {

    const report : IDefraValidationProcessingStatement = {
      documentType: 'PS',
      documentNumber: 'DOC1',
      status: 'STATUS',
      devolvedAuthority: 'ENGLAND',
      dateCreated: new Date(Date.now()),
      lastUpdated: new Date(Date.now()),
      userReference: 'User Ref',
      audits: [{
        auditAt: new Date(Date.now()),
        auditOperation: 'INVESTIGATE',
        user: 'Bob'
      }],
      exporterDetails: {
        companyName: 'Bob Exporter',
        address: {
          line1: 'Line 1',
          city: 'City',
          postCode: 'Postcode'
        },
        contactId : 'a contact id',
        accountId : 'an account id',
        dynamicsAddress : {dynamicsData : 'original address'}
      },
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };

    await insertPsDefraValidationReport(report);

    const res = await SUT.getUnprocessedReports();

    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject(report);

    expect(res[0]._id).toBeDefined();
    expect(res[0].__v).toBeUndefined();
    expect(res[0].__t).toBeUndefined();
    expect(res[0]._processed).toBeUndefined();
  });

});

describe('markAsProcessed', () => {

  it('will mark reports as processed by id', async () => {

    await Promise.all([1,2,3,4,5].map(i => {
      const report : IDefraValidationReport = {
        certificateId: i.toString(),
        status: 'COMPLETE',
        landingId: 'C02514',
        validationPass: true,
        lastUpdated: new Date(),
        isUnblocked: true,
        requestedByAdmin: false
      };

      return SUT.insertDefraValidationReport(report);
    }));

    const all = await SUT.getUnprocessedReports();
    const ids = all.map(_ => _._id);

    expect(all).toHaveLength(5);

    await SUT.markAsProcessed([ids[0], ids[1]]);

    const unprocessed = await SUT.getUnprocessedReports();

    expect(unprocessed).toHaveLength(3);

  });

});

describe('updateCcDefraValidationReport', () => {

  it('will update Catch Certificate defra validation report with catch status data for CC document number', async () => {
    const report: IDefraValidationCatchCertificate = {
      documentType: "CatchCertificate",
      documentNumber: "GBR-2024-CC-123456",
      status: "COMPLETE",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };

    await insertCcDefraValidationReport(report);

    const statusData = {
      status: 'ACCEPTED',
      reference: 'CATCH-REF-2024-001234',
      faultString: null
    };

    await SUT.updateCcDefraValidationReport('GBR-2024-CC-123456', statusData);

    const result: any = await DefraValidationCatchCertificateModel.findOne({ documentNumber: 'GBR-2024-CC-123456' }).lean();

    expect(result.catchStatus).toBe('ACCEPTED');
    expect(result.catchReference).toBe('CATCH-REF-2024-001234');
    expect(result.rejectedReason).toBeNull();
  });

  it('will update Processing Statement defra validation report with catch status data for PS document number', async () => {
    const report: IDefraValidationProcessingStatement = {
      documentType: "ProcessingStatement",
      documentNumber: "GBR-2024-PS-A1B2C3D4E",
      status: "COMPLETE",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };

    await insertPsDefraValidationReport(report);

    const statusData = {
      status: 'ACCEPTED',
      reference: 'CATCH-REF-2024-001235',
      faultString: null
    };

    await SUT.updateCcDefraValidationReport('GBR-2024-PS-A1B2C3D4E', statusData);

    const result: any = await DefraValidationProcessingStatementModel.findOne({ documentNumber: 'GBR-2024-PS-A1B2C3D4E' }).lean();

    expect(result.catchStatus).toBe('ACCEPTED');
    expect(result.catchReference).toBe('CATCH-REF-2024-001235');
    expect(result.rejectedReason).toBeNull();
  });

  it('will update Storage Document defra validation report with catch status data for SD document number', async () => {
    const report: IDefraValidationStorageDocument = {
      documentType: "StorageDocument",
      documentNumber: "GBR-2024-SD-F5G6H7I8J",
      status: "COMPLETE",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };

    await insertSdDefraValidationReport(report);

    const statusData = {
      status: 'ACCEPTED',
      reference: 'CATCH-REF-2024-001236',
      faultString: null
    };

    await SUT.updateCcDefraValidationReport('GBR-2024-SD-F5G6H7I8J', statusData);

    const result: any = await DefraValidationStorageDocumentModel.findOne({ documentNumber: 'GBR-2024-SD-F5G6H7I8J' }).lean();

    expect(result.catchStatus).toBe('ACCEPTED');
    expect(result.catchReference).toBe('CATCH-REF-2024-001236');
    expect(result.rejectedReason).toBeNull();
  });

  it('will update defra validation report with rejected reason when submission fails', async () => {
    const report: IDefraValidationCatchCertificate = {
      documentType: "CatchCertificate",
      documentNumber: "GBR-2024-CC-789012",
      status: "COMPLETE",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };

    await insertCcDefraValidationReport(report);

    const statusData = {
      status: 'REJECTED',
      reference: null,
      faultString: 'Invalid catch certificate number format'
    };

    await SUT.updateCcDefraValidationReport('GBR-2024-CC-789012', statusData);

    const result: any = await DefraValidationCatchCertificateModel.findOne({ documentNumber: 'GBR-2024-CC-789012' }).lean();

    expect(result.catchStatus).toBe('REJECTED');
    expect(result.catchReference).toBeNull();
    expect(result.rejectedReason).toBe('Invalid catch certificate number format');
  });

  it('will only update COMPLETE status documents', async () => {
    const draftReport: IDefraValidationCatchCertificate = {
      documentType: "CatchCertificate",
      documentNumber: "GBR-2024-CC-999999",
      status: "DRAFT",
      _correlationId: 'some-uuid-correlation-id',
      requestedByAdmin: false
    };

    await insertCcDefraValidationReport(draftReport);

    const statusData = {
      status: 'ACCEPTED',
      reference: 'CATCH-REF-2024-001237',
      faultString: null
    };

    await SUT.updateCcDefraValidationReport('GBR-2024-CC-999999', statusData);

    const result: any = await DefraValidationCatchCertificateModel.findOne({ documentNumber: 'GBR-2024-CC-999999' }).lean();

    expect(result.catchStatus).toBeUndefined();
    expect(result.catchReference).toBeUndefined();
  });
});