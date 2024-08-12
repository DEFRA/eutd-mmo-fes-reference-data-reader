import * as Shared from "mmo-shared-reference-data";
import * as DynamicsMapper from "../../../src/landings/transformations/dynamicsValidation";
import * as SUT from "../../../src/landings/orchestration/caseManagement";

import { SdPsCaseTwoType } from "../../../src/landings/types/dynamicsSdPsCase";

import logger from "../../../src/logger";
import { ApplicationConfig } from "../../../src/config";

const correlationId = 'some-uuid-correlation-id';

describe('reportCc', () => {

  let mockMapper;
  let mockPersistence;
  let mockLogInfo;

  ApplicationConfig.loadEnv({
    AZURE_QUEUE_CONNECTION_STRING: 'AZURE_QUEUE_CONNECTION_STRING',
    REPORT_QUEUE: 'REPORT_QUEUE'
  });

  beforeEach(() => {
    mockMapper = jest.spyOn(DynamicsMapper, 'toDynamicsCcCase');
    mockLogInfo = jest.spyOn(logger, 'info');
    mockPersistence = jest.spyOn(Shared, 'addToReportQueue');
    mockPersistence.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call the mapper and pass the result to the persistence service', async () => {
    const ccQuery: any[] = [{test: 'validation result'}];
    const cc: any = {test: 'catch certificate', documentNumber: 'document1'};
    const message: any = {
      body: {test: 'mapped', _correlationId: correlationId},
      subject: "catch_certificate_submitted-document1",
      sessionId: "some-uuid-correlation-id"
    };

    mockMapper.mockReturnValue({ test: 'mapped', _correlationId: correlationId });

    await SUT.reportCc(ccQuery, cc, correlationId, Shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED);

    expect(mockMapper).toHaveBeenCalledWith(ccQuery, cc, 'some-uuid-correlation-id', undefined);
    expect(mockPersistence).toHaveBeenCalledWith('document1', message, 'AZURE_QUEUE_CONNECTION_STRING', 'REPORT_QUEUE', false);
    expect(mockLogInfo).toHaveBeenCalledWith('[CASE-MANAGEMENT-CC][DOCUMENT-NUMBER][document1][CORRELATION-ID][some-uuid-correlation-id]');
  });
});

describe('reportPs', () => {

  let mockMapper;
  let mockPersistence;
  let mockLogInfo;

  ApplicationConfig.loadEnv({
    AZURE_QUEUE_CONNECTION_STRING: 'AZURE_QUEUE_CONNECTION_STRING',
    REPORT_QUEUE: 'REPORT_QUEUE'
  });

  beforeEach(() => {
    mockMapper = jest.spyOn(DynamicsMapper, 'toDynamicsPs');
    mockLogInfo = jest.spyOn(logger, 'info');
    mockPersistence = jest.spyOn(Shared, 'addToReportQueue');
    mockPersistence.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call the mapper and pass the result to the persistence service', async () => {
    const sdpsQuery: any[] = [{test: 'validation result'}];
    const ps: any = {test: 'processing statement', documentNumber: 'document1'};
    const message: any = {
      body: {test: 'mapped', _correlationId: correlationId},
      subject: "processing_statement_submitted-document1",
      sessionId: "some-uuid-correlation-id"
    };

    mockMapper.mockReturnValue({ test: 'mapped', _correlationId: correlationId });

    await SUT.reportPs(sdpsQuery, ps, correlationId, Shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED);

    expect(mockMapper).toHaveBeenCalledWith(sdpsQuery, ps, 'some-uuid-correlation-id', undefined);
    expect(mockPersistence).toHaveBeenCalledWith('document1', message, 'AZURE_QUEUE_CONNECTION_STRING', 'REPORT_QUEUE', false);
    expect(mockLogInfo).toHaveBeenCalledWith('[CASE-MANAGEMENT-PS][DOCUMENT-NUMBER][document1][CORRELATION-ID][some-uuid-correlation-id]');
  });

  it('should call the mapper and pass the VOID result to the persistence service', async () => {
    const ps: any = { test: 'processing statement', documentNumber: 'document2' };
    const message: any = {
      body: { test: 'mapped', _correlationId: correlationId },
      subject: 'processing_statement_voided-document2',
      sessionId: 'some-uuid-correlation-id'
    };

    mockMapper.mockReturnValue({ test: 'mapped', _correlationId: correlationId });

    await SUT.reportPs(null, ps, correlationId, Shared.MessageLabel.PROCESSING_STATEMENT_VOIDED, SdPsCaseTwoType.VoidByExporter,);

    expect(mockMapper).toHaveBeenCalledWith(null, ps, 'some-uuid-correlation-id', 'Void by an Exporter');
    expect(mockPersistence).toHaveBeenCalledWith('document2', message,'AZURE_QUEUE_CONNECTION_STRING','REPORT_QUEUE',false);
    expect(mockLogInfo).toHaveBeenCalledWith('[CASE-MANAGEMENT-PS][DOCUMENT-NUMBER][document2][CORRELATION-ID][some-uuid-correlation-id]');
  });

});

describe('reportSd', () => {

  let mockMapper;
  let mockPersistence;
  let mockLogInfo;

  ApplicationConfig.loadEnv({
    AZURE_QUEUE_CONNECTION_STRING: 'AZURE_QUEUE_CONNECTION_STRING',
    REPORT_QUEUE: 'REPORT_QUEUE'
  });

  beforeEach(() => {
    mockMapper = jest.spyOn(DynamicsMapper, 'toDynamicsSd');
    mockLogInfo = jest.spyOn(logger, 'info');
    mockPersistence = jest.spyOn(Shared, 'addToReportQueue');
    mockPersistence.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call the mapper and pass the result to the persistence service', async () => {
    const sdpsQuery: any[] = [{test: 'validation result'}];
    const sd: any = {test: 'storage document', documentNumber: 'document2'};
    const message: any = {
      body: {test: 'mapped', _correlationId: correlationId},
      subject: "storage_document_submitted-document2",
      sessionId: "some-uuid-correlation-id"
    };

    mockMapper.mockReturnValue({test: 'mapped', _correlationId: correlationId});

    await SUT.reportSd(sdpsQuery, sd, correlationId, Shared.MessageLabel.STORAGE_DOCUMENT_SUBMITTED);

    expect(mockMapper).toHaveBeenCalledWith(sdpsQuery, sd, 'some-uuid-correlation-id', undefined);
    expect(mockPersistence).toHaveBeenCalledWith('document2', message,'AZURE_QUEUE_CONNECTION_STRING','REPORT_QUEUE', false);
    expect(mockLogInfo).toHaveBeenCalledWith('[CASE-MANAGEMENT-SD][DOCUMENT-NUMBER][document2][CORRELATION-ID][some-uuid-correlation-id]');
  });

  it('should call the mapper and pass the VOID result to the persistence service', async () => {
    const sd: any = {test: 'storage document', documentNumber: 'document2'};
    const message: any = {
      body: {test: 'mapped', _correlationId: correlationId},
      subject: 'storage_document_voided-document2',
      sessionId: 'some-uuid-correlation-id'
    };

    mockMapper.mockReturnValue({test: 'mapped', _correlationId: correlationId});

    await SUT.reportSd(null, sd, correlationId, Shared.MessageLabel.STORAGE_DOCUMENT_VOIDED, SdPsCaseTwoType.VoidByExporter);

    expect(mockMapper).toHaveBeenCalledWith(null, sd, 'some-uuid-correlation-id', 'Void by an Exporter');
    expect(mockPersistence).toHaveBeenCalledWith('document2', message, 'AZURE_QUEUE_CONNECTION_STRING','REPORT_QUEUE', false);
    expect(mockLogInfo).toHaveBeenCalledWith('[CASE-MANAGEMENT-SD][DOCUMENT-NUMBER][document2][CORRELATION-ID][some-uuid-correlation-id]');
  });

});

describe('reportCcLandingUpdate', () => {
  let mockMapperLandingDetail;
  let mockPersistence;
  let mockLogInfo;
  let mockLogError;

  ApplicationConfig.loadEnv({
    AZURE_QUEUE_CONNECTION_STRING: 'AZURE_QUEUE_CONNECTION_STRING',
    REPORT_QUEUE: 'REPORT_QUEUE'
  });

  beforeEach(() => {
    mockMapperLandingDetail = jest.spyOn(DynamicsMapper, 'toDynamicsLandingDetails');
    mockLogInfo = jest.spyOn(logger, 'info');
    mockLogError = jest.spyOn(logger, 'error');
    mockPersistence = jest.spyOn(Shared, 'addToReportQueue');
    mockPersistence.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call the mapper and pass the result to the persistence service for landing detail', async () => {
    const ccQuery: any[] = [{test: 'validation result', extended: {}}];
    const cc: any = {test: 'catch certificate', documentNumber: 'document1'};
    const message: any = {
      body: [{ test: 'mapped', _correlationId: correlationId }],
      subject: "new-landing-document1",
      sessionId: "some-uuid-correlation-id"
    };

    mockMapperLandingDetail.mockReturnValue([{ test: 'mapped', _correlationId: correlationId }]);

    await SUT.reportCcLandingUpdate(ccQuery, cc, correlationId, Shared.MessageLabel.NEW_LANDING);

    expect(mockMapperLandingDetail).toHaveBeenCalledWith(ccQuery, cc, 'some-uuid-correlation-id');
    expect(mockPersistence).toHaveBeenCalledWith('document1', message, 'AZURE_QUEUE_CONNECTION_STRING', 'REPORT_QUEUE', false);
    expect(mockLogInfo).toHaveBeenCalledWith('[LANDING-DETAIL-CC][DOCUMENT-NUMBER][document1][CORRELATION-ID][some-uuid-correlation-id][NUMBER-OF-LANDINGS][1]');
  });

  it('should call the mapper when the landing end date is in the past', async () => {
    const ccQuery: any[] = [{test: 'validation result', extended: { landingDataEndDate: '1901-01-01' }}];
    const cc: any = {test: 'catch certificate', documentNumber: 'document1'};

    mockMapperLandingDetail.mockReturnValue([]);

    await SUT.reportCcLandingUpdate(ccQuery, cc, correlationId, Shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED);

    expect(mockMapperLandingDetail).toHaveBeenCalled();
    expect(mockPersistence).not.toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalledWith('[LANDING-DETAIL-CC][DOCUMENT-NUMBER][document1][CORRELATION-ID][some-uuid-correlation-id][NO-LANDING-UPDATES]');
  });

  it('should not send an empty landings details array to case management', async () => {
    const ccQuery: any[] = [];
    const cc: any = {test: 'catch certificate', documentNumber: 'document1'};

    mockMapperLandingDetail.mockReturnValue([]);

    await SUT.reportCcLandingUpdate(ccQuery, cc, correlationId, Shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED);

    expect(mockMapperLandingDetail).toHaveBeenCalled();
    expect(mockPersistence).not.toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalledWith('[LANDING-DETAIL-CC][DOCUMENT-NUMBER][document1][CORRELATION-ID][some-uuid-correlation-id][NO-LANDING-UPDATES]');
  });

  it('should not send an undefined landings details array to case management', async () => {
    const ccQuery: any = undefined;
    const cc: any = {test: 'catch certificate', documentNumber: 'document1'};

    mockMapperLandingDetail.mockReturnValue(undefined);

    await SUT.reportCcLandingUpdate(ccQuery, cc, correlationId, Shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED);

    expect(mockMapperLandingDetail).toHaveBeenCalled();
    expect(mockPersistence).not.toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalledWith('[LANDING-DETAIL-CC][DOCUMENT-NUMBER][document1][CORRELATION-ID][some-uuid-correlation-id][NO-LANDING-UPDATES]');
  });
});