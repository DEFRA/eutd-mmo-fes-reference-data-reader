import moment from "moment";
import { MongoMemoryServer } from "mongodb-memory-server";
import { ICcQueryResult } from "mmo-shared-reference-data";
import { DefraValidationReportData } from "../../src/landings/types/defraValidation";
import * as Controllers from "../../src/controllers/dataHub"
import * as DefraPersistance from '../../src/landings/persistence/defraValidation'
import * as CertificatePersistance from '../../src/landings/persistence/catchCert'
import * as DefraMapper from '../../src/landings/transformations/defraValidation';
import * as DefraTrade from '../../src/landings/orchestration/defraTrade';
import { AuditEventTypes, InvestigationStatus } from "../../src/landings/types/auditEvent";
import { LandingSources } from "../../src/landings/types/landing";
import * as Shared from "mmo-shared-reference-data";
import * as DynamicsMapper from "../../src/landings/transformations/dynamicsValidation";
import * as CaseManagement from "../../src/landings/orchestration/caseManagement";
import * as StrategicReporting from "../../src/landings/orchestration/strategicReporting";
import * as DefraValidationMapper from "../../src/landings/transformations/defraValidation";
import * as Cache from "../../src/data/cache";
import * as extendedValidationDataService from "../../src/landings/extendedValidationDataService";
import {
  IDynamicsCatchCertificateCase,
  CaseOneType,
  CaseTwoType
} from "../../src/landings/types/dynamicsCcCase";
import { IDynamicsStorageDocumentCase, IDynamicsProcessingStatementCase, SdPsCaseTwoType } from "../../src/landings/types/dynamicsSdPsCase";
import { IDocument } from "../../src/landings/types/document";
import { ApplicationConfig } from "../../src/config";
import logger from "../../src/logger";

moment.suppressDeprecationWarnings = true;

const mockVesselIdxWithPln: jest.Mock = jest.fn();

jest.mock('uuid');

const { v4: uuid } = require('uuid');
const mongoose = require('mongoose');


let mongoServer: MongoMemoryServer;
const opts = { connectTimeoutMS: 60000, socketTimeoutMS: 600000, serverSelectionTimeoutMS: 60000 }

let mockInsertSdDefraValidationReport: jest.SpyInstance;
let mockInsertCcDefraValidationReport: jest.SpyInstance;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, opts).catch((err: Error) => { console.log(err) });
});

beforeEach(() => {
  mockInsertSdDefraValidationReport = jest.spyOn(DefraPersistance, 'insertSdDefraValidationReport');
  mockInsertCcDefraValidationReport = jest.spyOn(DefraPersistance, 'insertCcDefraValidationReport');
});

afterEach(async () => {
  await DefraValidationReportData.deleteMany({});

  mockInsertSdDefraValidationReport.mockRestore();
  mockInsertCcDefraValidationReport.mockRestore();
})

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("Report Draft", () => {
  describe("When setting a Processing Statement as DRAFT", () => {

    const processingStatement: IDocument = {
      "createdAt": new Date("2020-08-17T17:31:13.210Z"),
      "__t": "processingStatement",
      "requestByAdmin": false,
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "createdByEmail": "foo@foo.com",
      "status": "DRAFT",
      "documentNumber": "GBR-2020-PS-66D2F95F4",
      "audit": [],
      "numberOfFailedAttempts": 0,
      "documentUri": "test.pdf",
      "investigation": []
    };

    let mockGetCertificateByDocumentNumber: jest.SpyInstance;
    let mockToPsDefraReport: jest.SpyInstance;
    let mockLogInfo: jest.SpyInstance;

    beforeEach(() => {
      mockGetCertificateByDocumentNumber = jest
        .spyOn(CertificatePersistance, 'getCertificateByDocumentNumberWithNumberOfFailedAttempts');
      mockGetCertificateByDocumentNumber.mockResolvedValue(processingStatement);

      uuid.mockImplementation(() => 'some-uuid-correlation-id');
      mockToPsDefraReport = jest.spyOn(DefraMapper, 'toPsDefraReport');
      mockLogInfo = jest.spyOn(logger, 'info');
    });

    afterEach(() => {
      uuid.mockRestore();
      mockToPsDefraReport.mockRestore();
      mockLogInfo.mockRestore();
      mockGetCertificateByDocumentNumber.mockRestore();
    });

    it("will correctly save the right type of data", async () => {
      await Controllers.reportDraft("GBR-PS-2342342-32423");
      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(result[0].documentNumber).toBe("GBR-PS-2342342-32423");
    });

    it("will include an internal _correlationId for end to end traceability", async () => {
      await Controllers.reportDraft("GBR-PS-2342342-32423");
      expect(mockToPsDefraReport).toHaveBeenCalledWith('GBR-PS-2342342-32423', 'some-uuid-correlation-id', 'DRAFT', false);

      const result = await DefraPersistance.getAllDefraValidationReports();
      expect(result[0]._correlationId).toEqual('some-uuid-correlation-id');
      expect(mockLogInfo).toHaveBeenCalledWith(`[REPORTING-PS-DRAFT][GBR-PS-2342342-32423][REPORT-ID][some-uuid-correlation-id]`);
    });

    it("will include a requestedByAdmin flag within the report", async () => {
      const documentNumber = "GBR-PS-2342342-32423";

      await Controllers.reportDraft(documentNumber);

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith(documentNumber, "processingStatement");
      expect(result[0].requestedByAdmin).toBe(false);
    });

    it('will not report draft if document can not be found', async () => {
      mockGetCertificateByDocumentNumber.mockResolvedValue(null);
      await Controllers.reportDraft("INVALID-PS-DOCUMENT-NUMBER");
      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockToPsDefraReport).not.toHaveBeenCalled();
      expect(result.length).toBe(0);
    });

  });

  describe("When setting a Storage Document as DRAFT", () => {
    const storageDocument: IDocument = {
      "createdAt": new Date("2020-08-17T17:31:13.210Z"),
      "__t": "storageDocument",
      "requestByAdmin": false,
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "createdByEmail": "foo@foo.com",
      "status": "DRAFT",
      "documentNumber": "GBR-2020-SD-66D2F95F4",
      "audit": [],
      "numberOfFailedAttempts": 0,
      "documentUri": "test.pdf",
      "investigation": []
    };

    let mockGetCertificateByDocumentNumber: jest.SpyInstance;
    let mockToSdDefraReport: jest.SpyInstance;
    let mockLogInfo: jest.SpyInstance;

    beforeEach(() => {
      mockGetCertificateByDocumentNumber = jest
        .spyOn(CertificatePersistance, 'getCertificateByDocumentNumberWithNumberOfFailedAttempts');
      mockGetCertificateByDocumentNumber.mockResolvedValue(storageDocument);

      uuid.mockImplementation(() => 'some-uuid-correlation-id');
      mockToSdDefraReport = jest.spyOn(DefraMapper, 'toSdDefraReport');
      mockLogInfo = jest.spyOn(logger, 'info');
    });

    afterEach(() => {
      uuid.mockRestore();
      mockToSdDefraReport.mockRestore();
      mockLogInfo.mockRestore();
      mockGetCertificateByDocumentNumber.mockRestore();
    });

    it("will correctly save the right type of data", async () => {
      await Controllers.reportDraft("GBR-SD-2342342-32423");

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockInsertSdDefraValidationReport).toHaveBeenCalled();
      expect(result[0].documentNumber).toBe("GBR-SD-2342342-32423");
    });

    it("will include an internal _correlationId for end to end traceability", async () => {
      await Controllers.reportDraft("GBR-SD-2342342-32423");

      expect(mockToSdDefraReport).toHaveBeenCalledWith('GBR-SD-2342342-32423', 'some-uuid-correlation-id', 'DRAFT', false);

      const result = await DefraPersistance.getAllDefraValidationReports();
      expect(result[0]._correlationId).toEqual('some-uuid-correlation-id');
      expect(mockLogInfo).toHaveBeenCalledWith(`[REPORTING-SD-DRAFT][GBR-SD-2342342-32423][REPORT-ID][some-uuid-correlation-id]`);
    });

    it("will include a requestedByAdmin flag within the report", async () => {
      const documentNumber = "GBR-SD-2342342-32423";

      await Controllers.reportDraft(documentNumber);

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith(documentNumber, "storageDocument");
      expect(result[0].requestedByAdmin).toBe(false);
    });

    it('will not report draft if document can not be found', async () => {
      mockGetCertificateByDocumentNumber.mockResolvedValue(null);

      await Controllers.reportDraft("INVALID-SD-DOCUMENT-NUMBER");
      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockToSdDefraReport).not.toHaveBeenCalled();
      expect(result.length).toBe(0);
    });
  });

  describe("When setting a Catch Certificate as DRAFT", () => {
    const catchCertificate: IDocument = {
      "createdAt": new Date("2020-08-17T17:31:13.210Z"),
      "__t": "catchCert",
      "requestByAdmin": false,
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "createdByEmail": "foo@foo.com",
      "status": "DRAFT",
      "documentNumber": "GBR-2020-CC-66D2F95F4",
      "audit": [],
      "exportData": {
        "exporterDetails": {
          "exporterFullName": "Isaac Babalola",
          "exporterCompanyName": "Private",
          "addressOne": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          "buildingNumber": "123",
          "subBuildingName": "Unit 1",
          "buildingName": "CJC Fish Ltd",
          "streetName": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "townCity": "TOWN",
          "postcode": "IM4 5XX"
        }
      },
      "numberOfFailedAttempts": 0,
      "documentUri": "test.pdf",
      "investigation": []
    };

    let mockGetCertificateByDocumentNumber: jest.SpyInstance;
    let mockToCcDefraReport: jest.SpyInstance;
    let mockLogInfo: jest.SpyInstance;

    beforeEach(() => {
      mockGetCertificateByDocumentNumber = jest
        .spyOn(CertificatePersistance, 'getCertificateByDocumentNumberWithNumberOfFailedAttempts');
      mockGetCertificateByDocumentNumber.mockResolvedValue(catchCertificate);

      uuid.mockImplementation(() => 'some-uuid-correlation-id');
      mockToCcDefraReport = jest.spyOn(Shared, 'toCcDefraReport');
      mockLogInfo = jest.spyOn(logger, 'info');
    });

    afterEach(() => {
      mockGetCertificateByDocumentNumber.mockRestore();
      mockToCcDefraReport.mockRestore();
      mockLogInfo.mockRestore();
      uuid.mockRestore();
    });

    it("will correctly save the right type of data", async () => {

      await Controllers.reportDraft("GBR-CC-2342342-32423");

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockInsertCcDefraValidationReport).toHaveBeenCalled();
      expect(result[0].documentNumber).toBe("GBR-CC-2342342-32423");
    });

    it("will include an internal _correlationId for end to end traceability", async () => {

      await Controllers.reportDraft("GBR-CC-2342342-32423");

      expect(mockToCcDefraReport).toHaveBeenCalledWith('GBR-CC-2342342-32423', 'some-uuid-correlation-id', 'DRAFT', false);

      const result = await DefraPersistance.getAllDefraValidationReports();
      expect(result[0]._correlationId).toEqual('some-uuid-correlation-id');
      expect(mockLogInfo).toHaveBeenCalledWith(`[REPORTING-CC-DRAFT][GBR-CC-2342342-32423][REPORT-ID][some-uuid-correlation-id]`);
    });

    it("will include a requestedByAdmin flag within the report", async () => {
      const documentNumber = "GBR-CC-2342342-32423";

      await Controllers.reportDraft(documentNumber);

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith(documentNumber, "catchCert");
      expect(result[0].requestedByAdmin).toBe(false);
    });

    it('will not report draft if document can not be found', async () => {
      mockGetCertificateByDocumentNumber.mockResolvedValue(null);

      await Controllers.reportDraft("INVALID-CC-DOCUMENT-NUMBER");
      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockToCcDefraReport).not.toHaveBeenCalled();
      expect(result.length).toBe(0);
    });
  });
});

describe("Report Delete", () => {
  let mockGetCertificateByDocumentNumber: jest.SpyInstance;
  let mockPostCodeDaLookup: jest.SpyInstance;
  let mockLogInfo: jest.SpyInstance;

  beforeEach(() => {
    mockGetCertificateByDocumentNumber = jest
      .spyOn(CertificatePersistance, 'getCertificateByDocumentNumberWithNumberOfFailedAttempts');

    mockPostCodeDaLookup = jest.spyOn(DefraValidationMapper, 'daLookUp');
    mockLogInfo = jest.spyOn(logger, 'info');
    uuid.mockImplementation(() => 'some-uuid-correlation-id');
  });

  afterEach(() => {
    mockGetCertificateByDocumentNumber.mockRestore();
    mockPostCodeDaLookup.mockRestore();
    mockLogInfo.mockRestore();
    uuid.mockRestore();
  });

  describe("When deleting a Processing Statement", () => {
    let mockToPsDefraReport: jest.SpyInstance;

    beforeEach(() => {
      mockToPsDefraReport = jest.spyOn(DefraMapper, 'toPsDefraReport');
    });

    afterEach(() => {
      mockToPsDefraReport.mockRestore();
    });

    it("will correctly save the right type of data", async () => {
      const processingStatement = {
        "requestByAdmin": false
      };

      mockGetCertificateByDocumentNumber.mockResolvedValue(processingStatement);

      await Controllers.reportDelete("GBR-PS-2342342-32423");

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(result[0].documentNumber).toBe("GBR-PS-2342342-32423");
    });

    it("will include devolved Authority (DA) in Strategic Report if the PS has exporter details", async () => {
      const documentNumber = "GBR-2020-PS-5A1FEE8A2";
      const processingStatement = {
        "createdAt": moment.utc("2020-07-20T15:04:40.523Z").toISOString(),
        "__t": "processingStatement",
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "createdByEmail": "foo@foo.com",
        "status": "DRAFT",
        "documentNumber": "GBR-2020-PS-5A1FEE8A2",
        "requestByAdmin": false,
        "audit": [],
        "__v": 0,
        "userReference": "Reference",
        "exportData": {
          "exporterDetails": {
            "exporterCompanyName": "Private",
            "addressOne": "Address line 1",
            "addressTwo": "Address line 2",
            "townCity": "TOWN",
            "postcode": "IM4 5XX"
          }
        }
      };

      mockGetCertificateByDocumentNumber.mockResolvedValue(processingStatement);

      await Controllers.reportDelete(documentNumber);

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith(documentNumber, "processingStatement");
      expect(mockPostCodeDaLookup).toHaveBeenCalled();
      expect(result[0].devolvedAuthority).toEqual("Isle of Man");
    });

    it("will NOT include devolved Authority (DA) in Strategic Report if the PS does not have exporter details", async () => {
      const processingStatementWithoutExporterDetails = {
        "createdAt": moment.utc("2020-07-20T10:37:52.802Z").toISOString(),
        "__t": "processingStatement",
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "createdByEmail": "foo@foo.com",
        "status": "DRAFT",
        "documentNumber": "GBR-2020-PS-5A69A17AE",
        "requestByAdmin": false,
        "audit": [],
        "__v": 0,
        "userReference": "Reference"
      };

      mockGetCertificateByDocumentNumber.mockResolvedValue(processingStatementWithoutExporterDetails);

      await Controllers.reportDelete("GBR-PS-2342342-32423");

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockPostCodeDaLookup).not.toHaveBeenCalled();
      expect(result[0].devolvedAuthority).toBeUndefined();
    });

    it("will include an internal _correlationId for end to end traceability", async () => {
      const processingStatement = {
        "requestByAdmin": false
      };

      mockGetCertificateByDocumentNumber.mockResolvedValue(processingStatement);

      await Controllers.reportDelete("GBR-PS-2342342-32423");

      expect(mockToPsDefraReport).toHaveBeenCalledWith('GBR-PS-2342342-32423', 'some-uuid-correlation-id', 'DELETE', false);

      const result = await DefraPersistance.getAllDefraValidationReports();
      expect(result[0]._correlationId).toEqual('some-uuid-correlation-id');
      expect(mockLogInfo).toHaveBeenCalledWith(`[REPORTING-PS-DELETE][GBR-PS-2342342-32423][REPORT-ID][some-uuid-correlation-id]`);
    });

    it("will include a requestedByAdmin flag within the report", async () => {
      const documentNumber = "GBR-PS-2342342-32423";
      const processingStatement = {
        "createdAt": moment.utc("2020-08-17T17:31:13.210Z").toISOString(),
        "__t": "processingStatement",
        "requestByAdmin": false,
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "status": "DRAFT",
        "documentNumber": "GBR-2020-PS-66D2F95F4",
        "audit": [],
        "__v": 0
      };

      mockGetCertificateByDocumentNumber.mockResolvedValue(processingStatement);

      await Controllers.reportDelete(documentNumber);

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith(documentNumber, "processingStatement");
      expect(result[0].requestedByAdmin).toBe(false);
    });

    it('will not report delete if document can not be found', async () => {
      mockGetCertificateByDocumentNumber.mockResolvedValue(null);
      await Controllers.reportDelete("INVALID-PS-DOCUMENT-NUMBER");
      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockToPsDefraReport).not.toHaveBeenCalled();
      expect(result.length).toBe(0);
    });
  });

  describe("When deleting a Storage Document", () => {
    let mockToSdDefraReport: jest.SpyInstance;

    beforeEach(() => {
      mockToSdDefraReport = jest.spyOn(DefraMapper, 'toSdDefraReport');
    });

    afterEach(() => {
      mockToSdDefraReport.mockRestore();
    });
    it("will correctly save the right type of data", async () => {
      const storageDocument = {
        "requestByAdmin": false
      };

      mockGetCertificateByDocumentNumber.mockResolvedValue(storageDocument);

      await Controllers.reportDelete("GBR-SD-2342342-32423");

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockInsertSdDefraValidationReport).toHaveBeenCalled();
      expect(result[0].documentNumber).toBe("GBR-SD-2342342-32423");
    });

    it("will include devolved Authority (DA) in Strategic Report if the SD has exporter details", async () => {
      const documentNumber = "GBR-2020-SD-5A1FEE8A2";
      const storageDocument = {
        "createdAt": moment.utc("2020-07-20T15:04:40.523Z").toISOString(),
        "__t": "storageDocument",
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "createdByEmail": "foo@foo.com",
        "status": "DRAFT",
        "documentNumber": "GBR-2020-SD-5A1FEE8A2",
        "requestByAdmin": false,
        "audit": [],
        "__v": 0,
        "userReference": "",
        "exportData": {
          "exporterDetails": {
            "exporterCompanyName": "Private",
            "addressOne": "Address line 1",
            "addressTwo": "Address line 2",
            "townCity": "TOWN",
            "postcode": "IM4 5XX"
          }
        }
      };

      mockGetCertificateByDocumentNumber.mockResolvedValue(storageDocument);

      await Controllers.reportDelete(documentNumber);

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith(documentNumber, "storageDocument");
      expect(mockPostCodeDaLookup).toHaveBeenCalled();
      expect(result[0].devolvedAuthority).toEqual("Isle of Man");
    });

    it("will NOT include devolved Authority (DA) in Strategic Report if the SD does not have exporter details", async () => {
      const storageDocumentWithoutExporterDetails = {
        "createdAt": moment.utc("2020-07-20T15:04:40.523Z").toISOString(),
        "__t": "storageDocument",
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "createdByEmail": "foo@foo.com",
        "status": "DRAFT",
        "documentNumber": "GBR-SD-2342342-32423",
        "requestByAdmin": false,
        "audit": [],
        "__v": 0,
        "userReference": ""
      };

      mockGetCertificateByDocumentNumber.mockResolvedValue(storageDocumentWithoutExporterDetails);

      await Controllers.reportDelete("GBR-SD-2342342-32423");

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockPostCodeDaLookup).not.toHaveBeenCalled();
      expect(result[0].devolvedAuthority).toBeUndefined();
    });

    it("will include an internal _correlationId for end to end traceability", async () => {
      const storageDocument = {
        "requestByAdmin": false
      };

      mockGetCertificateByDocumentNumber.mockResolvedValue(storageDocument);

      await Controllers.reportDelete("GBR-SD-2342342-32423");

      expect(mockToSdDefraReport).toHaveBeenCalledWith('GBR-SD-2342342-32423', 'some-uuid-correlation-id', 'DELETE', false);

      const result = await DefraPersistance.getAllDefraValidationReports();
      expect(result[0]._correlationId).toEqual('some-uuid-correlation-id');
      expect(mockLogInfo).toHaveBeenCalledWith(`[REPORTING-SD-DELETE][GBR-SD-2342342-32423][REPORT-ID][some-uuid-correlation-id]`);
    });

    it("will include a requestedByAdmin flag within the report", async () => {
      const documentNumber = "GBR-SD-2342342-32423";
      const processingStatement = {
        "createdAt": moment.utc("2020-08-17T17:31:13.210Z").toISOString(),
        "__t": "storageDocument",
        "requestByAdmin": false,
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "status": "DRAFT",
        "documentNumber": "GBR-2020-SD-66D2F95F4",
        "audit": [],
        "__v": 0
      };

      mockGetCertificateByDocumentNumber.mockResolvedValue(processingStatement);

      await Controllers.reportDelete(documentNumber);

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith(documentNumber, "storageDocument");
      expect(result[0].requestedByAdmin).toBe(false);
    });

    it('will not report delete if document can not be found', async () => {
      mockGetCertificateByDocumentNumber.mockResolvedValue(null);
      await Controllers.reportDelete("INVALID-SD-DOCUMENT-NUMBER");
      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockToSdDefraReport).not.toHaveBeenCalled();
      expect(result.length).toBe(0);
    });
  });

  describe("When deleting a Catch Certificate", () => {
    let mockToCcDefraReport: jest.SpyInstance;

    beforeEach(() => {
      mockToCcDefraReport = jest.spyOn(Shared, 'toCcDefraReport');
    });

    afterEach(() => {
      mockToCcDefraReport.mockRestore();
    });

    it("will correctly save the right type of data", async () => {
      const catchCertificate = {
        "requestByAdmin": false
      };

      mockGetCertificateByDocumentNumber.mockResolvedValue(catchCertificate);

      await Controllers.reportDelete("GBR-CC-2342342-32423");

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockInsertCcDefraValidationReport).toHaveBeenCalled();
      expect(result[0].documentNumber).toBe("GBR-CC-2342342-32423");
    });

    it("will include devolved Authority (DA) in Strategic Report if the CC has exporter details", async () => {
      const documentNumber = "GBR-CC-2342342-32423";
      const catchCertificate = {
        "createdAt": moment.utc("2020-07-20T15:19:54.855Z").toISOString(),
        "__t": "catchCert",
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "createdByEmail": "foo@foo.com",
        "status": "DRAFT",
        "documentNumber": "GBR-CC-2342342-32423",
        "requestByAdmin": false,
        "audit": [],
        "__v": 0,
        "userReference": "",
        "exportData": {
          "exporterDetails": {
            "exporterFullName": "Isaac Babalola",
            "exporterCompanyName": "Private",
            "addressOne": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
            "buildingNumber": "123",
            "subBuildingName": "Unit 1",
            "buildingName": "CJC Fish Ltd",
            "streetName": "17  Old Edinburgh Road",
            "county": "West Midlands",
            "country": "England",
            "townCity": "TOWN",
            "postcode": "IM4 5XX"
          }
        }
      };

      mockGetCertificateByDocumentNumber.mockResolvedValue(catchCertificate);

      await Controllers.reportDelete(documentNumber);

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith(documentNumber, "catchCert");
      expect(mockPostCodeDaLookup).toHaveBeenCalled();
      expect(result[0].devolvedAuthority).toEqual("Isle of Man");
    });

    it("will NOT include devolved Authority (DA) in Strategic Report if the CC does not have exporter details", async () => {
      const catchCertificateWithoutExporterDetails = {
        "createdAt": moment.utc("2020-07-20T15:19:54.855Z").toISOString(),
        "__t": "catchCert",
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "createdByEmail": "foo@foo.com",
        "status": "DRAFT",
        "documentNumber": "GBR-CC-2342342-32423",
        "requestByAdmin": false,
        "audit": [],
        "__v": 0,
        "userReference": ""
      };

      mockGetCertificateByDocumentNumber.mockResolvedValue(catchCertificateWithoutExporterDetails);

      await Controllers.reportDelete("GBR-CC-2342342-32423");

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockPostCodeDaLookup).not.toHaveBeenCalled();
      expect(result[0].devolvedAuthority).toBeUndefined();
    });

    it("will include an internal _correlationId for end to end traceability", async () => {
      const catchCertificate = {
        "requestByAdmin": false
      };

      mockGetCertificateByDocumentNumber.mockResolvedValue(catchCertificate);

      await Controllers.reportDelete("GBR-CC-2342342-32423");

      expect(mockToCcDefraReport).toHaveBeenCalledWith('GBR-CC-2342342-32423', 'some-uuid-correlation-id', 'DELETE', false);

      const result = await DefraPersistance.getAllDefraValidationReports();
      expect(result[0]._correlationId).toEqual('some-uuid-correlation-id');
      expect(mockLogInfo).toHaveBeenCalledWith(`[REPORTING-CC-DELETE][GBR-CC-2342342-32423][REPORT-ID][some-uuid-correlation-id]`);
    });

    it("will include a requestedByAdmin flag within the report", async () => {
      const documentNumber = "GBR-CC-2342342-32423";
      const catchCertificate = {
        "createdAt": moment.utc("2020-08-17T17:31:13.210Z").toISOString(),
        "__t": "catchCert",
        "requestByAdmin": false,
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "status": "DRAFT",
        "documentNumber": "GBR-2020-CC-66D2F95F4",
        "audit": [],
        "__v": 0
      };

      mockGetCertificateByDocumentNumber.mockResolvedValue(catchCertificate);

      await Controllers.reportDelete(documentNumber);

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith(documentNumber, "catchCert");
      expect(result[0].requestedByAdmin).toBe(false);
    });

    it('will not report delete if document can not be found', async () => {
      mockGetCertificateByDocumentNumber.mockResolvedValue(null);
      await Controllers.reportDelete("INVALID-CC-DOCUMENT-NUMBER");
      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockToCcDefraReport).not.toHaveBeenCalled();
      expect(result.length).toBe(0);
    });
  });
});

describe("Report Void", () => {

  let mockLogInfo: jest.SpyInstance;
  let mockAddToReportQueue: jest.SpyInstance;

  beforeEach(() => {
    uuid.mockImplementation(() => 'some-uuid-correlation-id');
    mockLogInfo = jest.spyOn(logger, 'info');
    mockAddToReportQueue = jest.spyOn(Shared, 'addToReportQueue');
    mockAddToReportQueue.mockResolvedValue({ some: "data" });
  });

  afterEach(() => {
    uuid.mockRestore();
    mockLogInfo.mockRestore();
    mockAddToReportQueue.mockRestore();
  });

  describe("When voiding a Processing Statement", () => {
    const systemPs: IDocument = {
      createdAt: new Date("2020-06-09T11:27:49.000Z"),
      __t: "processingStatement",
      createdBy: "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      status: "COMPLETE",
      documentNumber: "GBR-2020-PS-BA8A6BE06",
      requestByAdmin: false,
      audit: [{
        eventType: AuditEventTypes.PreApproved,
        triggeredBy: "Bob",
        timestamp: new Date(),
        data: null
      }, {
        eventType: AuditEventTypes.Investigated,
        triggeredBy: "Bob",
        timestamp: new Date(),
        data: null
      }],
      investigation: null,
      exportData: {
        catches: [
          {
            species: "Atlantic herring (HER)",
            catchCertificateNumber: "23462436",
            totalWeightLanded: 3,
            exportWeightBeforeProcessing: 3,
            exportWeightAfterProcessing: 3
          },
          {
            species: "Balbonic Salmon (SAL)",
            catchCertificateNumber: "RAZ-24323-4234-234",
            totalWeightLanded: 32,
            exportWeightBeforeProcessing: 32,
            exportWeightAfterProcessing: 3524
          }],
        exporterDetails: {
          exporterCompanyName: "Bobby The Second",
          addressOne: "11, Righteous WAy Way",
          addressTwo: "Dessert Way",
          townCity: "Blaydon-on-Thames",
          postcode: "LE29 04G",
          _dynamicsAddress: {},
          _dynamicsUser: {
            firstName: "Bobby",
            lastName: "The Second"
          }
        },
        consignmentDescription: "test",
        healthCertificateNumber: "3",
        healthCertificateDate: "01/06/2020",
        personResponsibleForConsignment: "Bob Bobby",
        plantApprovalNumber: "111-222",
        plantName: "Bob's plant",
        plantAddressOne: "test1",
        plantAddressTwo: "test2",
        plantTownCity: "city Test",
        plantPostcode: "RRR",
        dateOfAcceptance: "09/06/2020"
      },
      createdByEmail: "foo@foo.com",
      documentUri: "_fd91895a-85e5-4e1b-90ef-53cffe3ac758.pdf",
      numberOfFailedAttempts: 5
    }

    const dynamicsPsMappedData: IDynamicsProcessingStatementCase = {
      exporter: {
        contactId: "a contact id",
        accountId: "an account id",
        dynamicsAddress: {
        },
        companyName: "Bobby The Second",
        address: {
          line1: "11, Righteous WAy Way",
          line2: "Dessert Way",
          city: "Blaydon-on-Thames",
          postCode: "LE29 04G"
        }
      },
      documentUrl: "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      documentDate: "2019-01-01 05:05:05",
      caseType1: "PS",
      caseType2: SdPsCaseTwoType.VoidByExporter,
      numberOfFailedSubmissions: 5,
      plantName: "Bob's plant",
      personResponsible: "Bob Bobby",
      documentNumber: "GBR-PS-234234-234-234",
      da: "Scotland",
      processedFisheryProducts: "Some Commodity Code (COD)",
      _correlationId: "c03483ba-86ed-49be-ba9d-695ea27b3951",
      requestedByAdmin: false,
      clonedFrom: "GBR-PS-234234-234-234",
      parentDocumentVoid: false,
      exportedTo: {
        officialCountryName: "Nigeria"
      }
    };

    let mockToPsDefraReport: jest.SpyInstance;
    let mockGetCertificateById: jest.SpyInstance;
    let mockReportPs: jest.SpyInstance;
    let mockToPSDefraTrade: jest.SpyInstance;

    beforeEach(() => {
      mockToPsDefraReport = jest.spyOn(DefraMapper, 'toPsDefraReport');
      mockReportPs = jest.spyOn(CaseManagement, 'reportPs');
      mockReportPs.mockReturnValue(dynamicsPsMappedData);
      mockToPSDefraTrade = jest.spyOn(DefraTrade, 'reportPsToTrade');
      mockToPSDefraTrade.mockResolvedValue(undefined);
      mockGetCertificateById = jest
        .spyOn(CertificatePersistance, 'getCertificateByDocumentNumberWithNumberOfFailedAttempts')
        .mockImplementation(() => new Promise(res => res(systemPs)));
    });

    afterEach(() => {
      mockToPsDefraReport.mockRestore();
      mockGetCertificateById.mockRestore();
      mockReportPs.mockRestore();
      mockToPSDefraTrade.mockRestore();
    });

    it("will correctly save the right type of data", async () => {
      await Controllers.reportVoid("GBR-PS-2342342-32423");

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(result[0].created).toStrictEqual({
        id: 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12',
        email: 'foo@foo.com',
        firstName: 'Bobby',
        lastName: 'The Second'
      });
    });

    it("will include an internal _correlationId for end to end traceability", async () => {
      await Controllers.reportVoid("GBR-PS-2342342-32423");
      expect(mockToPsDefraReport).toHaveBeenCalledWith('GBR-PS-2342342-32423', 'some-uuid-correlation-id', 'VOID', false, systemPs);

      const result = await DefraPersistance.getAllDefraValidationReports();
      expect(result[0]._correlationId).toEqual('some-uuid-correlation-id');
      expect(mockLogInfo).toHaveBeenCalledWith(`[REPORTING-PS-VOID][GBR-PS-2342342-32423][REPORT-ID][some-uuid-correlation-id]`);
    });

    it("will include a requestedByAdmin flag within the report", async () => {
      const documentNumber = "GBR-PS-2342342-32423";
      await Controllers.reportVoid(documentNumber);

      const result = await DefraPersistance.getAllDefraValidationReports();
      expect(mockGetCertificateById).toHaveBeenCalledWith(documentNumber, "processingStatement");
      expect(result[0].requestedByAdmin).toBe(false);
    });

    it('will not report void if document can not be found', async () => {
      const documentNumber = "INVALID-PS-DOCUMENT-NUMBER";
      mockGetCertificateById.mockImplementationOnce(() => new Promise(res => res(null)));

      await Controllers.reportVoid(documentNumber);

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockToPsDefraReport).not.toHaveBeenCalled();
      expect(result.length).toBe(0);
    });

    it('will trigger a case management report if request is from external app', async () => {
      const documentNumber = "GBR-PS-2342342-32423";

      await Controllers.reportVoid(documentNumber, true);

      expect(mockLogInfo).toHaveBeenCalledWith(`[REPORTING-PS-VOID][CASE-MANAGEMENT][${documentNumber}][REPORT-ID][some-uuid-correlation-id]`);
      expect(mockReportPs).toHaveBeenCalledWith(null, systemPs, 'some-uuid-correlation-id', 'processing_statement_voided', SdPsCaseTwoType.VoidByExporter);
    });

    it('will trigger a defra trade report if request is from external app', async () => {
      const documentNumber = "GBR-PS-2342342-32423";
      await Controllers.reportVoid(documentNumber, true);
      expect(mockToPSDefraTrade).toHaveBeenCalledWith(systemPs, 'processing_statement_voided', dynamicsPsMappedData, null);
    });

    it('will trigger case management report if request is not from external app', async () => {
      const documentNumber = "GBR-PS-2342342-32423";
      await Controllers.reportVoid(documentNumber, false);

      expect(mockLogInfo).toHaveBeenCalledWith(`[REPORTING-PS-VOID][CASE-MANAGEMENT][${documentNumber}][REPORT-ID][some-uuid-correlation-id]`);
      expect(mockReportPs).toHaveBeenCalledWith(null, systemPs, 'some-uuid-correlation-id', 'processing_statement_voided', SdPsCaseTwoType.VoidByAdmin);
    });

  });

  describe("When voiding a Storage Document", () => {
    let mockGetCertificateById: jest.SpyInstance;
    let mockToSdDefraReport: jest.SpyInstance;
    let mockReportSd: jest.SpyInstance;
    let mockToSDDefraTrade: jest.SpyInstance;

    const documentNumber = "GBR-SD-2342342-32423";

    const backEndSd: IDocument = {
      "createdAt": new Date("2020-06-14T21:46:37.000Z"),
      "__t": "storageDocument",
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "status": "VOID",
      "documentNumber": "GBR-SD-2342342-32423",
      "audit": [],
      "investigation": {},
      "requestByAdmin": false,
      "exportData": {
        "exporterDetails": {
          "exporterCompanyName": "Exporter Ltd",
          "addressOne": "Building Name",
          "addressTwo": "Building Street",
          "townCity": "Town",
          "postcode": "XX12 X34",
          "_dynamicsUser": {
            "firstName": "Bob",
            "lastName": "Exporter"
          }
        },
        "catches": [{
          "product": "Atlantic herring (HER)",
          "commodityCode": "0345603",
          "productWeight": "12",
          "certificateNumber": "GBR-3453-3453-3443",
          "weightOnCC": "12"
        }],
        "storageFacility": {
          "facilityName": "Exporter Person",
          "facilityAddressOne": "Building Name",
          "facilityAddressTwo": "Building Street",
          "facilityTownCity": "Town",
          "facilityPostcode": "XX12 X34"
        },
        "transportation": {
          "vehicle": "containerVessel",
          "vesselName": "WIRON 5",
          "flagState": "UK",
          "containerNumber": "1234",
          "departurePlace": "Telford",
          "exportDate": "03/03/2020"
        },
        "arrivalTransportation": {
          "vehicle": "truck",
          "nationalityOfVehicle": "Ukraine",
          "registrationNumber": "BD51SMR",
          "freightBillNumber": "BD51SMR",
          "departureCountry": "Burundi",
          "departurePort": "Calais-Dunkerque airport",
          "departureDate": "17/10/2025",
          "placeOfUnloading": "Place of unloading"
        }
      },
      "createdByEmail": "foo@foo.com",
      "documentUri": "_0d8f98a1-c372-47c4-803f-dafd642c4941.pdf",
      "numberOfFailedAttempts": 5
    }

    const mockStorageDocumentCase: IDynamicsStorageDocumentCase = {
      exporter: {
        accountId: "an account id",
        address: {
          city: "T",
          line1: "B",
          line2: "S",
          postCode: "P",
        },
        companyName: "Exporter Co",
        contactId: "a contact id",
        dynamicsAddress: {
          dynamicsData: "original address",
        },
      },
      documentUrl: 'string',
      documentDate: 'string',
      caseType1: 'string',
      caseType2: SdPsCaseTwoType.VoidByExporter,
      numberOfFailedSubmissions: 0,
      documentNumber: 'string',
      companyName: 'string',
      exportedTo: {
        officialCountryName: 'France'
      },
      products: [],
      _correlationId: 'string',
      da: 'string',
      requestedByAdmin: false,
      clonedFrom: 'string',
      parentDocumentVoid: true,
    }

    const dynamicsSdMappedData: IDynamicsStorageDocumentCase = {
      _correlationId: 'some-uuid-correlation-id',
      documentNumber: documentNumber,
      clonedFrom: "GBR-2023-SD-1ED610D4B",
      parentDocumentVoid: false,
      caseType1: CaseOneType.CatchCertificate,
      caseType2: SdPsCaseTwoType.VoidByExporter,
      numberOfFailedSubmissions: 0,
      documentUrl: '',
      documentDate: 'a date',
      requestedByAdmin: false,
      companyName: 'some company name',
      da: 'Scotland',
      exporter: {
        companyName: 'Exporter Co',
        contactId: 'a contact id',
        accountId: 'an account id',
        address: { line1: 'B', line2: 'S', city: 'T', postCode: 'P' },
        dynamicsAddress: { dynamicsData: 'original address' }
      },
      exportedTo: {
        officialCountryName: "Nigeria"
      }
    };

    beforeEach(() => {
      mockToSdDefraReport = jest.spyOn(DefraMapper, 'toSdDefraReport');

      mockReportSd = jest.spyOn(CaseManagement, 'reportSd');
      mockToSDDefraTrade = jest.spyOn(DefraTrade, 'reportSdToTrade');

      mockReportSd.mockReturnValue(dynamicsSdMappedData);

      mockGetCertificateById = jest
        .spyOn(CertificatePersistance, 'getCertificateByDocumentNumberWithNumberOfFailedAttempts')
        .mockImplementation(() => new Promise(res => res(backEndSd)));
    });

    afterEach(() => {
      mockToSdDefraReport.mockRestore();
      mockReportSd.mockRestore();
      mockGetCertificateById.mockRestore();
    });

    it("will correctly save the right type of data", async () => {
      await Controllers.reportVoid(documentNumber);
      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockInsertSdDefraValidationReport).toHaveBeenCalled();
      expect(result[0].documentNumber).toBe("GBR-SD-2342342-32423");
    });

    it("will include an internal _correlationId for end to end traceability", async () => {
      await Controllers.reportVoid(documentNumber);

      expect(mockToSdDefraReport).toHaveBeenCalledWith('GBR-SD-2342342-32423', 'some-uuid-correlation-id', 'VOID', false, backEndSd);

      const result = await DefraPersistance.getAllDefraValidationReports();
      expect(result[0]._correlationId).toEqual('some-uuid-correlation-id');
      expect(mockLogInfo).toHaveBeenCalledWith(`[REPORTING-SD-VOID][GBR-SD-2342342-32423][REPORT-ID][some-uuid-correlation-id]`);
    });

    it("will include a requestedByAdmin flag within the report", async () => {

      await Controllers.reportVoid(documentNumber);

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockGetCertificateById).toHaveBeenCalledWith(documentNumber, "storageDocument");
      expect(result[0].requestedByAdmin).toBe(false);
    });

    it('will trigger a case management report if request is from external app', async () => {
      mockReportSd.mockResolvedValue(mockStorageDocumentCase)

      await Controllers.reportVoid(documentNumber, true);

      expect(mockLogInfo).toHaveBeenCalledWith(`[REPORTING-SD-VOID][CASE-MANAGEMENT][${documentNumber}][REPORT-ID][some-uuid-correlation-id]`);
      expect(mockReportSd).toHaveBeenCalledWith(null, backEndSd, 'some-uuid-correlation-id', 'storage_document_voided', SdPsCaseTwoType.VoidByExporter);
      expect(mockToSDDefraTrade).toHaveBeenCalledWith(backEndSd, 'storage_document_voided', mockStorageDocumentCase, null)

    });

    it('will trigger case management report if request is not from external app', async () => {
      mockReportSd.mockResolvedValue(mockStorageDocumentCase)

      await Controllers.reportVoid(documentNumber, false);

      expect(mockLogInfo).toHaveBeenCalledWith(`[REPORTING-SD-VOID][CASE-MANAGEMENT][${documentNumber}][REPORT-ID][some-uuid-correlation-id]`);
      expect(mockReportSd).toHaveBeenCalledWith(null, backEndSd, 'some-uuid-correlation-id', 'storage_document_voided', SdPsCaseTwoType.VoidByAdmin);
      expect(mockToSDDefraTrade).toHaveBeenCalledWith(backEndSd, 'storage_document_voided', mockStorageDocumentCase, null)
    });

    it('will not report void if document can not be found', async () => {
      mockGetCertificateById.mockImplementationOnce(() => new Promise(res => res(null)));

      await Controllers.reportVoid("INVALID-SD-DOCUMENT-NUMBER");

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockToSdDefraReport).not.toHaveBeenCalled();
      expect(result.length).toBe(0);
    });
  });

  describe("When voiding a Catch Certificate", () => {

    let mockGetCertificateById: jest.SpyInstance;
    let mockToCcDefraReport: jest.SpyInstance;
    let mockToDynamicsCcCase: jest.SpyInstance;
    let mockToCCDefraTrade: jest.SpyInstance;
    let mockVesselIdx: jest.SpyInstance;

    const documentNumber = "GBR-CC-2342342-32423";
    const backEndCc: IDocument = {
      __t: "catchCertificate",
      createdAt: new Date("2020-06-14T21:46:37.000Z"),
      createdBy: "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      createdByEmail: "foo@foo.com",
      status: "VOID",
      documentNumber: documentNumber,
      audit: [],
      exportData: {
        exporterDetails: {
          contactId: 'a contact id',
          accountId: 'an account id',
          exporterFullName: "Bob Exporter",
          exporterCompanyName: "Exporter Co",
          addressOne: "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          buildingNumber: "123",
          subBuildingName: "Unit 1",
          buildingName: "CJC Fish Ltd",
          streetName: "17  Old Edinburgh Road",
          county: "West Midlands",
          country: "England",
          townCity: "TOWN",
          postcode: "IM4 5XX"
        },
        transportation: {
          vehicle: "truck",
          exportedFrom: "United Kingdom",
          exportedTo: {
            officialCountryName: "Nigeria",
            isoCodeAlpha2: "NG",
            isoCodeAlpha3: "NGA",
            isoNumericCode: "566"
          },
          cmr: true
        }
      },
      investigation: null,
      documentUri: null,
      requestByAdmin: false,
      numberOfFailedAttempts: 5
    };

    const dynamicsMappedData: IDynamicsCatchCertificateCase = {
      _correlationId: 'some-uuid-correlation-id',
      documentNumber: documentNumber,
      da: 'Isle of Man',
      caseType1: CaseOneType.CatchCertificate,
      caseType2: CaseTwoType.VoidByExporter,
      numberOfFailedSubmissions: 5,
      isDirectLanding: false,
      isUnblocked: undefined,
      landings: null,
      documentUrl: undefined,
      documentDate: '2020-06-14T21:46:37.000Z',
      requestedByAdmin: false,
      vesselOverriddenByAdmin: undefined,
      failureIrrespectiveOfRisk: false,
      exporter: {
        fullName: 'Bob Exporter',
        companyName: 'Exporter Co',
        contactId: 'a contact id',
        accountId: 'an account id',
        address: {
          building_number: "123",
          sub_building_name: "Unit 1",
          building_name: "CJC Fish Ltd",
          street_name: "17  Old Edinburgh Road",
          county: "West Midlands",
          country: "England",
          line1: "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          city: "TOWN",
          postCode: "IM4 5XX"
        },
        dynamicsAddress: undefined
      },
      audits: undefined,
      exportedTo: {
        isoCodeAlpha2: "NG",
        isoCodeAlpha3: "NGA",
        officialCountryName: "Nigeria",
      },
    };

    ApplicationConfig.loadEnv({
      AZURE_QUEUE_CONNECTION_STRING: 'AZURE_QUEUE_CONNECTION_STRING',
      REPORT_QUEUE: 'REPORT_QUEUE',
      AZURE_QUEUE_TRADE_CONNECTION_STRING: 'AZURE_QUEUE_TRADE_CONNECTION_STRING',
      REPORT_QUEUE_TRADE: 'REPORT_QUEUE_TRADE'
    });

    beforeEach(() => {
      mockGetCertificateById = jest
        .spyOn(CertificatePersistance, 'getCertificateByDocumentNumberWithNumberOfFailedAttempts')
        .mockImplementation(() => new Promise(res => res(backEndCc)));

      mockToCcDefraReport = jest.spyOn(Shared, 'toCcDefraReport');
      mockToDynamicsCcCase = jest.spyOn(DynamicsMapper, 'toDynamicsCcCase');
      mockToCCDefraTrade = jest.spyOn(DefraTrade, 'reportCcToTrade');
      mockToCCDefraTrade.mockResolvedValue(undefined);
      mockVesselIdx = jest.spyOn(Cache, 'getVesselsIdx');
      mockVesselIdx.mockReturnValue(mockVesselIdxWithPln);
    });

    afterEach(() => {
      mockGetCertificateById.mockRestore();
      mockToCcDefraReport.mockRestore();
      mockToDynamicsCcCase.mockRestore();
      mockToCCDefraTrade.mockRestore();
      mockVesselIdx.mockRestore();
    });

    it("will correctly save the right type of data", async () => {
      await Controllers.reportVoid("GBR-2020-CC-C90A88218");

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(mockInsertCcDefraValidationReport).toHaveBeenCalled();
      expect(result[0].documentNumber).toBe("GBR-2020-CC-C90A88218");
    });

    it("will include an internal _correlationId for end to end traceability", async () => {
      await Controllers.reportVoid("GBR-CC-2342342-32423");

      expect(mockToCcDefraReport).toHaveBeenCalledWith('GBR-CC-2342342-32423', 'some-uuid-correlation-id', 'VOID', false, mockVesselIdxWithPln, backEndCc);

      const result = await DefraPersistance.getAllDefraValidationReports();
      expect(result[0]._correlationId).toEqual('some-uuid-correlation-id');
      expect(mockLogInfo).toHaveBeenCalledWith(`[REPORTING-CC-VOID][GBR-CC-2342342-32423][REPORT-ID][some-uuid-correlation-id]`);
    });

    it("will include a requestedByAdmin flag within the report", async () => {

      await Controllers.reportVoid(documentNumber);

      const result = await DefraPersistance.getAllDefraValidationReports();
      expect(mockGetCertificateById).toHaveBeenCalledWith(documentNumber, "catchCert");
      expect(result[0].requestedByAdmin).toBe(false);
    });

    it('will trigger a case management report if request is from external app', async () => {
      const expected = {
        body: dynamicsMappedData,
        subject: 'catch_certificate_voided-GBR-CC-2342342-32423',
        sessionId: 'some-uuid-correlation-id'
      };

      mockToDynamicsCcCase.mockReturnValue(dynamicsMappedData);

      await Controllers.reportVoid(documentNumber, true);

      expect(mockLogInfo).toHaveBeenCalledWith(`[REPORTING-CC-VOID][CASE-MANAGEMENT][GBR-CC-2342342-32423][REPORT-ID][some-uuid-correlation-id]`);
      expect(mockToDynamicsCcCase).toHaveBeenCalledWith(null, backEndCc, 'some-uuid-correlation-id', CaseTwoType.VoidByExporter);
      expect(mockAddToReportQueue).toHaveBeenCalledWith(documentNumber, expected, 'AZURE_QUEUE_CONNECTION_STRING', 'REPORT_QUEUE', false);
    });

    it('will trigger case management report if request is not from external app', async () => {
      const expected = {
        body: dynamicsMappedData,
        subject: 'catch_certificate_voided-GBR-CC-2342342-32423',
        sessionId: 'some-uuid-correlation-id'
      };

      mockToDynamicsCcCase.mockReturnValue(dynamicsMappedData);

      await Controllers.reportVoid(documentNumber, false);

      expect(mockLogInfo).toHaveBeenCalledWith(`[REPORTING-CC-VOID][CASE-MANAGEMENT][GBR-CC-2342342-32423][REPORT-ID][some-uuid-correlation-id]`);
      expect(mockToDynamicsCcCase).toHaveBeenCalledWith(null, backEndCc, 'some-uuid-correlation-id', CaseTwoType.VoidByAdmin);
      expect(mockAddToReportQueue).toHaveBeenCalledWith(documentNumber, expected, 'AZURE_QUEUE_CONNECTION_STRING', 'REPORT_QUEUE', false);
    });

    it('will trigger a defra trade report if request is from external app', async () => {
      mockToDynamicsCcCase.mockReturnValue(dynamicsMappedData);

      await Controllers.reportVoid(documentNumber, true);

      expect(mockToCCDefraTrade).toHaveBeenCalledWith(backEndCc, 'catch_certificate_voided', dynamicsMappedData, null);
    });

    it('will not report void if document can not be found', async () => {
      const documentNumber = "INVALID-CC-DOCUMENT-NUMBER";

      mockGetCertificateById.mockImplementationOnce(() => new Promise(res => res(null)));

      await Controllers.reportVoid(documentNumber);

      expect(mockToCcDefraReport).not.toHaveBeenCalled();

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(result.length).toBe(0);
    });

    it('will include the exporter address in the format required by Strategic Reporting', async () => {

      await Controllers.reportVoid(documentNumber);

      const result = await DefraPersistance.getAllDefraValidationReports();

      expect(result[0].exporterDetails).toStrictEqual({
        accountId: "an account id",
        contactId: "a contact id",
        fullName: "Bob Exporter",
        companyName: "Exporter Co",
        address: {
          building_number: "123",
          sub_building_name: "Unit 1",
          building_name: "CJC Fish Ltd",
          street_name: "17  Old Edinburgh Road",
          county: "West Midlands",
          country: "England",
          line1: "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          city: "TOWN",
          postCode: "IM4 5XX"
        }
      });
    });

    it('will include the exporter address in the format required by Case Management', async () => {
      const expected = {
        body: dynamicsMappedData,
        subject: 'catch_certificate_voided-GBR-CC-2342342-32423',
        sessionId: 'some-uuid-correlation-id'
      };

      await Controllers.reportVoid(documentNumber, true);

      expect(mockAddToReportQueue).toHaveBeenCalledWith(documentNumber, expected, 'AZURE_QUEUE_CONNECTION_STRING', 'REPORT_QUEUE', false);
    });
  });
});

describe("Report Submitted", () => {

  let mockGetCertificate: jest.SpyInstance;
  let mockToCcDefraReport: jest.SpyInstance;
  let mockToCCDefraTrade: jest.SpyInstance;
  let mockReportCc: jest.SpyInstance;
  let mockToLandings: jest.SpyInstance;
  let mockInsertCcReport: jest.SpyInstance;

  beforeEach(() => {
    mockGetCertificate = jest.spyOn(CertificatePersistance, 'getCertificateByDocumentNumberWithNumberOfFailedAttempts');
    mockToCcDefraReport = jest.spyOn(Shared, 'toCcDefraReport');
    mockToLandings = jest.spyOn(DefraMapper, 'toLandings');
    mockToCCDefraTrade = jest.spyOn(DefraTrade, 'reportCcToTrade');
    mockReportCc = jest.spyOn(CaseManagement, 'reportCc');
    mockInsertCcReport = jest.spyOn(DefraPersistance, 'insertCcDefraValidationReport');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when a PS is submitted', () => {

    const certificateId = 'XXX-PS-XXX'

    let mockLogInfo: jest.SpyInstance;
    let mockReportCaseManagement: jest.SpyInstance;
    let mockReportStrategicReporting: jest.SpyInstance;
    let mockToPSDefraTrade: jest.SpyInstance;

    beforeEach(() => {
      mockLogInfo = jest.spyOn(logger, 'info');
      mockReportCaseManagement = jest.spyOn(CaseManagement, 'reportPs');
      mockReportStrategicReporting = jest.spyOn(StrategicReporting, 'reportPs');
      mockToPSDefraTrade = jest.spyOn(DefraTrade, 'reportPsToTrade');
    });

    it('will do nothing if the validation array is empty', async () => {
      await Controllers.reportSdPsSubmitted([]);

      expect(mockLogInfo).not.toHaveBeenCalled();
      expect(mockReportCaseManagement).not.toHaveBeenCalled();
      expect(mockReportStrategicReporting).not.toHaveBeenCalled();
      expect(mockToPSDefraTrade).not.toHaveBeenCalled();
    });

    it('will log if the referenced document can not be found', async () => {
      mockGetCertificate.mockResolvedValue(null);

      const input: any[] = [{ documentNumber: certificateId }];

      await Controllers.reportSdPsSubmitted(input);

      expect(mockLogInfo).toHaveBeenCalledTimes(2);
      expect(mockLogInfo).toHaveBeenNthCalledWith(1, `[DATA-HUB][REPORT-SDPS-SUBMITTED][${certificateId}]`);
      expect(mockLogInfo).toHaveBeenNthCalledWith(2, `[DATA-HUB][REPORT-SDPS-SUBMITTED][${certificateId}][NOT-FOUND]`);

      expect(mockReportCaseManagement).not.toHaveBeenCalled();
      expect(mockReportStrategicReporting).not.toHaveBeenCalled();
      expect(mockToPSDefraTrade).not.toHaveBeenCalled();
    });

    it('will call strategic reporting, defraTrade and case management if the document is found', async () => {
      const cert: any = { documentNumber: certificateId, createdAt: '2020-01-01' };
      mockGetCertificate.mockResolvedValue(cert);
      mockReportCaseManagement.mockResolvedValue({ _correlationId: 'some-uuid-correlation-id' });
      mockReportStrategicReporting.mockResolvedValue(null);

      const input: any[] = [{ documentNumber: certificateId }];

      await Controllers.reportSdPsSubmitted(input);

      expect(mockLogInfo).toHaveBeenNthCalledWith(1, `[DATA-HUB][REPORT-SDPS-SUBMITTED][${certificateId}]`);
      expect(mockLogInfo).toHaveBeenNthCalledWith(2, `[DATA-HUB][REPORT-SDPS-SUBMITTED][${certificateId}][FOUND]`);

      expect(mockReportCaseManagement).toHaveBeenCalledWith(input, cert, undefined, "processing_statement_submitted");
      expect(mockReportStrategicReporting).toHaveBeenCalledWith(input, cert, undefined);
      expect(mockToPSDefraTrade).toHaveBeenCalledWith(cert, 'processing_statement_submitted', { _correlationId: 'some-uuid-correlation-id' }, input);
    });

    describe('for traceability', () => {
      const cert: any = { documentNumber: certificateId, createdAt: '2020-01-01' };
      const input: any[] = [{ documentNumber: certificateId }];

      beforeEach(() => {
        uuid.mockImplementation(() => 'some-uuid-correlation-id');
        mockGetCertificate.mockResolvedValue(cert);
        mockReportCaseManagement.mockResolvedValue({ _correlationId: 'some-uuid-correlation-id' });
        mockReportStrategicReporting.mockResolvedValue(null);
      });

      afterEach(() => {
        uuid.mockRestore();
      });

      it('will include a correlation Id with in stragetic Reporting if the document is found', async () => {
        await Controllers.reportSdPsSubmitted(input);
        expect(mockReportStrategicReporting).toHaveBeenCalledWith(input, cert, 'some-uuid-correlation-id');
      });

      it('will include a correlation Id with in case management if the document is found', async () => {
        await Controllers.reportSdPsSubmitted(input);
        expect(mockReportCaseManagement).toHaveBeenCalledWith(input, cert, 'some-uuid-correlation-id', "processing_statement_submitted");
      });
    });
  });

  describe('when a SD is submitted', () => {

    const certificateId = 'XXX-SD-XXX'

    let mockLogInfo: jest.SpyInstance;
    let mockReportCaseManagement: jest.SpyInstance;
    let mockReportStrategicReporting: jest.SpyInstance;
    let mockToSDDefraTrade: jest.SpyInstance;

    beforeEach(() => {
      mockLogInfo = jest.spyOn(logger, 'info');
      mockReportCaseManagement = jest.spyOn(CaseManagement, 'reportSd');
      mockReportStrategicReporting = jest.spyOn(StrategicReporting, 'reportSd');
      mockToSDDefraTrade = jest.spyOn(DefraTrade, 'reportSdToTrade');
    });

    it('will do nothing if the validation array is empty', async () => {
      await Controllers.reportSdPsSubmitted([]);

      expect(mockLogInfo).not.toHaveBeenCalled();
      expect(mockReportCaseManagement).not.toHaveBeenCalled();
      expect(mockReportStrategicReporting).not.toHaveBeenCalled();
      expect(mockToSDDefraTrade).not.toHaveBeenCalled();
    });

    it('will log if the referenced document can not be found', async () => {
      mockGetCertificate.mockResolvedValue(null);

      const input: any[] = [{ documentNumber: certificateId }];

      await Controllers.reportSdPsSubmitted(input);

      expect(mockLogInfo).toHaveBeenCalledTimes(2);
      expect(mockLogInfo).toHaveBeenNthCalledWith(1, `[DATA-HUB][REPORT-SDPS-SUBMITTED][${certificateId}]`);
      expect(mockLogInfo).toHaveBeenNthCalledWith(2, `[DATA-HUB][REPORT-SDPS-SUBMITTED][${certificateId}][NOT-FOUND]`);

      expect(mockReportCaseManagement).not.toHaveBeenCalled();
      expect(mockReportStrategicReporting).not.toHaveBeenCalled();
      expect(mockToSDDefraTrade).not.toHaveBeenCalled();
    });

    it('will call strategic reporting and case management if the document is found', async () => {
      const cert: any = { documentNumber: certificateId, createdAt: '2020-01-01' };

      mockGetCertificate.mockResolvedValue(cert);
      mockReportCaseManagement.mockResolvedValue(null);
      mockReportStrategicReporting.mockResolvedValue(null);
      mockToSDDefraTrade.mockResolvedValue(null);

      const input: any[] = [{ documentNumber: certificateId }];

      await Controllers.reportSdPsSubmitted(input);

      expect(mockLogInfo).toHaveBeenNthCalledWith(1, `[DATA-HUB][REPORT-SDPS-SUBMITTED][${certificateId}]`);
      expect(mockLogInfo).toHaveBeenNthCalledWith(2, `[DATA-HUB][REPORT-SDPS-SUBMITTED][${certificateId}][FOUND]`);

      expect(mockReportCaseManagement).toHaveBeenCalledWith(input, cert, undefined, 'storage_document_submitted');
      expect(mockReportStrategicReporting).toHaveBeenCalledWith(input, cert, undefined);
      expect(mockToSDDefraTrade).toHaveBeenCalledWith(cert, 'storage_document_submitted', null, [{ "documentNumber": "XXX-SD-XXX" }]);
    });

    describe('for traceability', () => {
      const cert: any = { documentNumber: certificateId, createdAt: '2020-01-01' };
      const input: any[] = [{ documentNumber: certificateId }];

      beforeEach(() => {
        uuid.mockImplementation(() => 'some-uuid-correlation-id');
        mockGetCertificate.mockResolvedValue(cert);
        mockReportCaseManagement.mockResolvedValue(null);
        mockReportStrategicReporting.mockResolvedValue(null);
        mockToSDDefraTrade.mockResolvedValue(null);
      });

      afterEach(() => {
        uuid.mockRestore();
      });

      it('will include a correlation Id with in strategic Reporting if the document is found', async () => {
        await Controllers.reportSdPsSubmitted(input);
        expect(mockReportStrategicReporting).toHaveBeenCalledWith(input, cert, 'some-uuid-correlation-id');
      });

      it('will include a correlation Id with in case management if the document is found', async () => {
        await Controllers.reportSdPsSubmitted(input);
        expect(mockReportCaseManagement).toHaveBeenCalledWith(input, cert, 'some-uuid-correlation-id', 'storage_document_submitted');
      });

    });
  });

  describe('when a CC is submitted', () => {

    const queryTime = moment.utc();
    const documentNumber = 'X-CC-1';
    const data: ICcQueryResult[] = [{
      documentNumber: documentNumber,
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2019-07-10',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      hasSalesNote: false,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: LandingSources.CatchRecording
        }
      ],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
      overUsedInfo: [],
      durationSinceCertCreation: moment.duration(
        queryTime
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        landingId: 'rssWA12019-07-10',
        exporterName: 'Mr Bob',
        presentation: 'SLC',
        presentationName: 'sliced',
        vessel: 'DAYBREAK',
        fao: 'FAO27',
        pln: 'WA1',
        highSeasArea: 'yes',
        rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
        exclusiveEconomicZones: [
          {
            officialCountryName: "Nigeria",
            isoCodeAlpha2: "NG",
            isoCodeAlpha3: "NGA",
            isoNumericCode: "566"
          },
          {
            officialCountryName: "France",
            isoCodeAlpha2: "FR",
            isoCodeAlpha3: "FRA",
            isoNumericCode: "250"
          }
        ],
        species: 'Lobster',
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '1234',
        investigation: {
          investigator: "Investigator Gadget",
          status: InvestigationStatus.Open
        },
        transportationVehicle: 'directLanding',
        dataEverExpected: true,
        landingDataExpectedDate: '1901-01-01',
        landingDataEndDate: '2901-01-01',
      }
    }];

    let mockLogInfo: jest.SpyInstance;
    let mockRefreshRiskingData: jest.SpyInstance;
    let mockGetExtendedValidationData: jest.SpyInstance;
    let mockVesselIdx: jest.SpyInstance;

    beforeEach(() => {
      mockLogInfo = jest.spyOn(logger, 'info');
      mockRefreshRiskingData = jest.spyOn(Cache, 'refreshRiskingData');
      mockGetExtendedValidationData = jest.spyOn(extendedValidationDataService, 'getExtendedValidationData');
      mockGetExtendedValidationData.mockResolvedValue(null);
      mockVesselIdx = jest.spyOn(Cache, 'getVesselsIdx');
      mockVesselIdx.mockReturnValue(mockVesselIdxWithPln);
      uuid.mockImplementation(() => 'some-uuid-correlation-id');
    });

    afterEach(() => {
      mockLogInfo.mockRestore();
      mockRefreshRiskingData.mockRestore();
      mockGetExtendedValidationData.mockRestore();
      mockVesselIdx.mockRestore();
      uuid.mockRestore();
    });

    describe('for the first time', () => {

      it('all methods required by reportCcSubmitted should be called with the correct data', async () => {
        const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
        const getCatchCertificate = {
          ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
            exporterDetails: {}, products: [{
              species: 'Atlantic Herring (HER)',
            }]
          }
        };
        const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", requestedByAdmin: false };
        const toLandingsResponse = [{
          species: 'HER'
        }];

        mockInsertCcReport.mockResolvedValue(null);
        mockRefreshRiskingData.mockResolvedValue(null);
        mockReportCc.mockResolvedValue(mockMapCcResponse);
        mockToCCDefraTrade.mockResolvedValue(undefined);

        mockGetCertificate.mockResolvedValue(getCatchCertificate);
        mockToCcDefraReport.mockReturnValue(toReportResponse);
        mockToLandings.mockReturnValue(toLandingsResponse);

        await Controllers.reportCcSubmitted(data);

        expect(mockRefreshRiskingData).toHaveBeenCalled();
        expect(mockInsertCcReport).toHaveBeenCalledWith({ ...toReportResponse, landings: toLandingsResponse });

        expect(mockGetCertificate).toHaveBeenCalledWith('X-CC-1', "catchCert");
        expect(mockToCcDefraReport).toHaveBeenCalledWith('X-CC-1', 'some-uuid-correlation-id', 'COMPLETE', false, mockVesselIdxWithPln, getCatchCertificate);
        expect(mockToLandings).toHaveBeenCalledWith(data);
        expect(mockInsertCcDefraValidationReport).toHaveBeenCalledWith(toReportResponse);

        expect(mockGetExtendedValidationData).toHaveBeenCalledWith('2019-07-10', 'rssWA1', 'salesNotes');
        expect(mockGetExtendedValidationData).toHaveBeenCalledTimes(1);
        expect(mockReportCc).toHaveBeenCalledTimes(1);
        expect(mockReportCc).toHaveBeenCalledWith(data, getCatchCertificate, 'some-uuid-correlation-id', "catch_certificate_submitted");
        expect(mockToCCDefraTrade).toHaveBeenCalledTimes(1);
        expect(mockToCCDefraTrade).toHaveBeenCalledWith(getCatchCertificate, Shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED, mockMapCcResponse, data);
      });

      it('should not map or report CC when no landings are given', async () => {
        const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
        const getCatchCertificate = {
          ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
            products: [{
              species: 'Atlantic Herring (HER)',
            }]
          }
        };
        const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", requestedByAdmin: false };
        const toLandingsResponse = [{
          species: 'HER'
        }];

        mockInsertCcReport.mockResolvedValue(null);
        mockRefreshRiskingData.mockResolvedValue(null);

        mockGetCertificate.mockResolvedValue(getCatchCertificate);
        mockToCcDefraReport.mockReturnValue(toReportResponse);
        mockToLandings.mockReturnValue(toLandingsResponse);

        await Controllers.reportCcSubmitted([]);

        expect(mockRefreshRiskingData).not.toHaveBeenCalled();
        expect(mockInsertCcReport).not.toHaveBeenCalledWith({ ...toReportResponse, landings: toLandingsResponse });

        expect(mockGetCertificate).not.toHaveBeenCalledWith('X-CC-1');
        expect(mockGetExtendedValidationData).not.toHaveBeenCalled();
        expect(mockToCcDefraReport).not.toHaveBeenCalledWith('X-CC-1', 'some-uuid-correlation-id', 'COMPLETE', false, getCatchCertificate);
        expect(mockToLandings).not.toHaveBeenCalledWith(data);
        expect(mockInsertCcDefraValidationReport).not.toHaveBeenCalledWith(toReportResponse);
      });

      it('should not call get extended validation data if date is invalid', async () => {
        const data: ICcQueryResult[] = [{
          documentNumber: documentNumber,
          documentType: 'catchCertificate',
          createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
          status: 'COMPLETE',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: 'invalid-date',
          species: 'LBE',
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1,
              isEstimate: true,
              weight: 30,
              liveWeight: 30,
              source: LandingSources.CatchRecording
            }
          ],
          isOverusedThisCert: true,
          isOverusedAllCerts: true,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment.duration(
            queryTime
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
            moment.utc('2019-07-11T09:00:00.000Z')
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
            moment.utc('2019-07-11T09:00:00.000Z')
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          extended: {
            landingId: 'rssWA12019-07-10',
            exporterName: 'Mr Bob',
            presentation: 'SLC',
            presentationName: 'sliced',
            vessel: 'DAYBREAK',
            fao: 'FAO27',
            pln: 'WA1',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            exclusiveEconomicZones: [
              {
                officialCountryName: "Nigeria",
                isoCodeAlpha2: "NG",
                isoCodeAlpha3: "NGA",
                isoNumericCode: "566"
              },
              {
                officialCountryName: "France",
                isoCodeAlpha2: "FR",
                isoCodeAlpha3: "FRA",
                isoNumericCode: "250"
              }
            ],
            species: 'Lobster',
            state: 'FRE',
            stateName: 'fresh',
            commodityCode: '1234',
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open
            },
            transportationVehicle: 'directLanding',
            dataEverExpected: true,
            landingDataExpectedDate: '1901-01-01',
            landingDataEndDate: '2901-01-01',
          }
        }];

        const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
        const getCatchCertificate = {
          ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
            exporterDetails: {}, products: [{
              species: 'Atlantic Herring (HER)',
            }]
          }
        };
        const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", requestedByAdmin: false };
        const toLandingsResponse = [{
          species: 'HER'
        }];

        mockInsertCcReport.mockResolvedValue(null);
        mockRefreshRiskingData.mockResolvedValue(null);
        mockReportCc.mockResolvedValue(mockMapCcResponse);
        mockToCCDefraTrade.mockResolvedValue(undefined);

        mockGetCertificate.mockResolvedValue(getCatchCertificate);
        mockToCcDefraReport.mockReturnValue(toReportResponse);
        mockToLandings.mockReturnValue(toLandingsResponse);

        await Controllers.reportCcSubmitted(data);

        expect(mockGetExtendedValidationData).toHaveBeenCalledTimes(0);
        expect(data[0].hasSalesNote).toBeUndefined();
      });

      it('should not call get extended validation data if rssNumber is missing', async () => {
        const data: ICcQueryResult[] = [{
          documentNumber: documentNumber,
          documentType: 'catchCertificate',
          createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
          status: 'COMPLETE',
          rssNumber: '',
          da: 'Guernsey',
          dateLanded: '2023-01-01',
          species: 'LBE',
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1,
              isEstimate: true,
              weight: 30,
              liveWeight: 30,
              source: LandingSources.CatchRecording
            }
          ],
          isOverusedThisCert: true,
          isOverusedAllCerts: true,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment.duration(
            queryTime
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
            moment.utc('2019-07-11T09:00:00.000Z')
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
            moment.utc('2019-07-11T09:00:00.000Z')
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          extended: {
            landingId: 'rssWA12019-07-10',
            exporterName: 'Mr Bob',
            presentation: 'SLC',
            presentationName: 'sliced',
            vessel: 'DAYBREAK',
            fao: 'FAO27',
            pln: 'WA1',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            exclusiveEconomicZones: [
              {
                officialCountryName: "Nigeria",
                isoCodeAlpha2: "NG",
                isoCodeAlpha3: "NGA",
                isoNumericCode: "566"
              },
              {
                officialCountryName: "France",
                isoCodeAlpha2: "FR",
                isoCodeAlpha3: "FRA",
                isoNumericCode: "250"
              }
            ],
            species: 'Lobster',
            state: 'FRE',
            stateName: 'fresh',
            commodityCode: '1234',
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open
            },
            transportationVehicle: 'directLanding',
            dataEverExpected: true,
            landingDataExpectedDate: '1901-01-01',
            landingDataEndDate: '2901-01-01',
          }
        }];

        const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
        const getCatchCertificate = {
          ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
            exporterDetails: {}, products: [{
              species: 'Atlantic Herring (HER)',
            }]
          }
        };
        const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", requestedByAdmin: false };
        const toLandingsResponse = [{
          species: 'HER'
        }];

        mockInsertCcReport.mockResolvedValue(null);
        mockRefreshRiskingData.mockResolvedValue(null);
        mockReportCc.mockResolvedValue(mockMapCcResponse);
        mockToCCDefraTrade.mockResolvedValue(undefined);

        mockGetCertificate.mockResolvedValue(getCatchCertificate);
        mockToCcDefraReport.mockReturnValue(toReportResponse);
        mockToLandings.mockReturnValue(toLandingsResponse);

        await Controllers.reportCcSubmitted(data);

        expect(mockGetExtendedValidationData).toHaveBeenCalledTimes(0);
        expect(data[0].hasSalesNote).toBeUndefined();
      });

      it('should call get extended validation data if landing data does not exist', async () => {
        const data: ICcQueryResult[] = [{
          documentNumber: documentNumber,
          documentType: 'catchCertificate',
          createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
          status: 'COMPLETE',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: '2023-01-01',
          species: 'LBE',
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: false,
          isSpeciesExists: false,
          numberOfLandingsOnDay: 0,
          weightOnLanding: 0,
          weightOnLandingAllSpecies: 0,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment.duration(
            queryTime
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: null,
          durationBetweenCertCreationAndLastLandingRetrieved: null,
          extended: {
            landingId: 'rssWA12019-07-10',
            exporterName: 'Mr Bob',
            presentation: 'SLC',
            presentationName: 'sliced',
            vessel: 'DAYBREAK',
            fao: 'FAO27',
            pln: 'WA1',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            exclusiveEconomicZones: [
              {
                officialCountryName: "Nigeria",
                isoCodeAlpha2: "NG",
                isoCodeAlpha3: "NGA",
                isoNumericCode: "566"
              },
              {
                officialCountryName: "France",
                isoCodeAlpha2: "FR",
                isoCodeAlpha3: "FRA",
                isoNumericCode: "250"
              }
            ],
            species: 'Lobster',
            state: 'FRE',
            stateName: 'fresh',
            commodityCode: '1234',
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open
            },
            transportationVehicle: 'directLanding',
            dataEverExpected: true,
            landingDataExpectedDate: '1901-01-01',
            landingDataEndDate: '2901-01-01',
          }
        }];

        const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
        const getCatchCertificate = {
          ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
            exporterDetails: {}, products: [{
              species: 'Atlantic Herring (HER)',
            }]
          }
        };
        const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", requestedByAdmin: false };
        const toLandingsResponse = [{
          species: 'HER'
        }];

        mockInsertCcReport.mockResolvedValue(null);
        mockRefreshRiskingData.mockResolvedValue(null);
        mockReportCc.mockResolvedValue(mockMapCcResponse);
        mockToCCDefraTrade.mockResolvedValue(undefined);

        mockGetCertificate.mockResolvedValue(getCatchCertificate);
        mockToCcDefraReport.mockReturnValue(toReportResponse);
        mockToLandings.mockReturnValue(toLandingsResponse);

        await Controllers.reportCcSubmitted(data);

        expect(mockGetExtendedValidationData).toHaveBeenCalledTimes(1);
        expect(data[0].hasSalesNote).toBe(false);
      });

      it('should not call get extended validation data if landing data is not expected', async () => {
        const data: ICcQueryResult[] = [{
          documentNumber: documentNumber,
          documentType: 'catchCertificate',
          createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
          status: 'COMPLETE',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: 'invalid-date',
          species: 'LBE',
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1,
              isEstimate: true,
              weight: 30,
              liveWeight: 30,
              source: LandingSources.CatchRecording
            }
          ],
          isOverusedThisCert: true,
          isOverusedAllCerts: true,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment.duration(
            queryTime
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
            moment.utc('2019-07-11T09:00:00.000Z')
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
            moment.utc('2019-07-11T09:00:00.000Z')
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          extended: {
            landingId: 'rssWA12019-07-10',
            exporterName: 'Mr Bob',
            presentation: 'SLC',
            presentationName: 'sliced',
            vessel: 'DAYBREAK',
            fao: 'FAO27',
            pln: 'WA1',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            exclusiveEconomicZones: [
              {
                officialCountryName: "Nigeria",
                isoCodeAlpha2: "NG",
                isoCodeAlpha3: "NGA",
                isoNumericCode: "566"
              },
              {
                officialCountryName: "France",
                isoCodeAlpha2: "FR",
                isoCodeAlpha3: "FRA",
                isoNumericCode: "250"
              }
            ],
            species: 'Lobster',
            state: 'FRE',
            stateName: 'fresh',
            commodityCode: '1234',
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open
            },
            transportationVehicle: 'directLanding',
            dataEverExpected: false
          }
        }];

        const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
        const getCatchCertificate = {
          ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
            exporterDetails: {}, products: [{
              species: 'Atlantic Herring (HER)',
            }]
          }
        };
        const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", requestedByAdmin: false };
        const toLandingsResponse = [{
          species: 'HER'
        }];

        mockInsertCcReport.mockResolvedValue(null);
        mockRefreshRiskingData.mockResolvedValue(null);
        mockReportCc.mockResolvedValue(mockMapCcResponse);
        mockToCCDefraTrade.mockResolvedValue(undefined);

        mockGetCertificate.mockResolvedValue(getCatchCertificate);
        mockToCcDefraReport.mockReturnValue(toReportResponse);
        mockToLandings.mockReturnValue(toLandingsResponse);

        await Controllers.reportCcSubmitted(data);

        expect(mockGetExtendedValidationData).toHaveBeenCalledTimes(0);
        expect(data[0].hasSalesNote).toBeUndefined();
      });

      it('should call get extended validation data in order', async () => {
        mockGetExtendedValidationData.mockResolvedValueOnce(null);
        mockGetExtendedValidationData.mockResolvedValueOnce({
          dateLanded: "2023-01-02",
          rssNumber: "rssWA2",
          data: [{}]
        });

        const data: ICcQueryResult[] = [{
          documentNumber: documentNumber,
          documentType: 'catchCertificate',
          createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
          status: 'COMPLETE',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: '2023-01-01',
          species: 'LBE',
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1,
              isEstimate: true,
              weight: 30,
              liveWeight: 30,
              source: LandingSources.CatchRecording
            }
          ],
          isOverusedThisCert: true,
          isOverusedAllCerts: true,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment.duration(
            queryTime
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
            moment.utc('2019-07-11T09:00:00.000Z')
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
            moment.utc('2019-07-11T09:00:00.000Z')
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          extended: {
            landingId: 'rssWA12019-07-10',
            exporterName: 'Mr Bob',
            presentation: 'SLC',
            presentationName: 'sliced',
            vessel: 'DAYBREAK',
            fao: 'FAO27',
            pln: 'WA1',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            exclusiveEconomicZones: [
              {
                officialCountryName: "Nigeria",
                isoCodeAlpha2: "NG",
                isoCodeAlpha3: "NGA",
                isoNumericCode: "566"
              },
              {
                officialCountryName: "France",
                isoCodeAlpha2: "FR",
                isoCodeAlpha3: "FRA",
                isoNumericCode: "250"
              }
            ],
            species: 'Lobster',
            state: 'FRE',
            stateName: 'fresh',
            commodityCode: '1234',
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open
            },
            transportationVehicle: 'directLanding',
            dataEverExpected: true,
            landingDataExpectedDate: '1901-01-01',
            landingDataEndDate: '2901-01-01',
          }
        }, {
          documentNumber: documentNumber,
          documentType: 'catchCertificate',
          createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
          status: 'COMPLETE',
          rssNumber: 'rssWA2',
          da: 'Guernsey',
          dateLanded: '2023-01-02',
          species: 'LBE',
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1,
              isEstimate: true,
              weight: 30,
              liveWeight: 30,
              source: LandingSources.CatchRecording
            }
          ],
          isOverusedThisCert: true,
          isOverusedAllCerts: true,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment.duration(
            queryTime
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
            moment.utc('2019-07-11T09:00:00.000Z')
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
            moment.utc('2019-07-11T09:00:00.000Z')
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          extended: {
            landingId: 'rssWA12019-07-10',
            exporterName: 'Mr Bob',
            presentation: 'SLC',
            presentationName: 'sliced',
            vessel: 'DAYBREAK',
            fao: 'FAO27',
            pln: 'WA1',
            species: 'Lobster',
            state: 'FRE',
            stateName: 'fresh',
            commodityCode: '1234',
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open
            },
            transportationVehicle: 'directLanding',
            dataEverExpected: true,
            landingDataExpectedDate: '1901-01-01',
            landingDataEndDate: '2901-01-01',
          }
        }];

        const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
        const getCatchCertificate = {
          ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
            exporterDetails: {}, products: [{
              species: 'Atlantic Herring (HER)',
            }]
          }
        };
        const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", requestedByAdmin: false };
        const toLandingsResponse = [{
          species: 'HER'
        }];

        mockInsertCcReport.mockResolvedValue(null);
        mockRefreshRiskingData.mockResolvedValue(null);
        mockReportCc.mockResolvedValue(mockMapCcResponse);
        mockToCCDefraTrade.mockResolvedValue(undefined);

        mockGetCertificate.mockResolvedValue(getCatchCertificate);
        mockToCcDefraReport.mockReturnValue(toReportResponse);
        mockToLandings.mockReturnValue(toLandingsResponse);

        await Controllers.reportCcSubmitted(data);

        expect(mockGetExtendedValidationData).toHaveBeenCalledTimes(2);
        expect(mockGetExtendedValidationData).toHaveBeenNthCalledWith(1, '2023-01-01', 'rssWA1', 'salesNotes');
        expect(mockGetExtendedValidationData).toHaveBeenNthCalledWith(2, '2023-01-02', 'rssWA2', 'salesNotes');
        expect(data[0].hasSalesNote).toBe(false);
        expect(data[1].hasSalesNote).toBe(true);
      });
    });

    describe('error handling', () => {
      let mockLogWarn: jest.SpyInstance;
      let mockLogError: jest.SpyInstance;

      beforeEach(() => {
        mockLogWarn = jest.spyOn(logger, 'warn');
        mockLogError = jest.spyOn(logger, 'error');
      });

      afterEach(() => {
        mockLogWarn.mockRestore();
        mockLogError.mockRestore();
      });

      it('should catch any errors thrown', async () => {

        mockGetCertificate.mockImplementation(() => {
          throw 'error';
        });

        const caughtError = await Controllers.reportCcSubmitted(data).catch((err) => err)
        expect(caughtError).toBe('error');
        expect(mockLogWarn).toHaveBeenNthCalledWith(1, '[REPORT-CC-SUBMITTED][ERROR][getCertificateByDocumentNumberWithNumberOfFailedAttempts][error]');
        expect(mockLogWarn).toHaveBeenNthCalledWith(2, '[REPORT-CC-SUBMITTED][ERROR][error]');
      });

      it('should catch any errors thrown when mapping', async () => {
        const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
        const getCatchCertificate = {
          ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
            products: [{
              species: 'Atlantic Herring (HER)',
            }]
          }
        };

        mockGetCertificate.mockResolvedValue(getCatchCertificate);
        mockToCcDefraReport.mockImplementation(() => {
          throw 'error';
        });

        const caughtError = await Controllers.reportCcSubmitted(data).catch((err) => err)
        expect(caughtError).toBe('error');
        expect(mockLogWarn).toHaveBeenNthCalledWith(1, '[REPORT-CC-SUBMITTED][ERROR][toCcDefraReport][error]');
        expect(mockLogWarn).toHaveBeenNthCalledWith(2, '[REPORT-CC-SUBMITTED][ERROR][error]');

      });

      it('should catch any errors thrown when mapping landings', async () => {
        const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
        const getCatchCertificate = {
          ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
            products: [{
              species: 'Atlantic Herring (HER)',
            }]
          }
        };
        const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", requestedByAdmin: false };

        mockGetCertificate.mockResolvedValue(getCatchCertificate);
        mockToCcDefraReport.mockReturnValue(toReportResponse);
        mockToLandings.mockImplementation(() => {
          throw 'error';
        });

        const caughtError = await Controllers.reportCcSubmitted(data).catch((err) => err);
        expect(caughtError).toBe('error');
        expect(mockLogWarn).toHaveBeenNthCalledWith(1, '[REPORT-CC-SUBMITTED][ERROR][toLandings][error]');
        expect(mockLogWarn).toHaveBeenNthCalledWith(2, '[REPORT-CC-SUBMITTED][ERROR][error]');
      });

      it('should catch any errors thrown when inserting defra valdation records', async () => {
        const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
        const getCatchCertificate = {
          ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
            products: [{
              species: 'Atlantic Herring (HER)',
            }]
          }
        };
        const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", requestedByAdmin: false };
        const toLandingsResponse = [{
          species: 'HER'
        }];

        mockGetCertificate.mockResolvedValue(getCatchCertificate);
        mockToCcDefraReport.mockReturnValue(toReportResponse);
        mockToLandings.mockReturnValue(toLandingsResponse);
        mockInsertCcDefraValidationReport.mockImplementation(() => {
          throw 'error';
        });


        const caughtError = await Controllers.reportCcSubmitted(data).catch((err) => err);
        expect(caughtError).toBe('error');
        expect(mockLogWarn).toHaveBeenNthCalledWith(1, '[REPORT-CC-SUBMITTED][ERROR][insertCcDefraValidationReport][error]');
        expect(mockLogWarn).toHaveBeenNthCalledWith(2, '[REPORT-CC-SUBMITTED][ERROR][error]');
      });

      it('should catch any errors thrown when updating risking', async () => {
        const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
        const getCatchCertificate = {
          ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
            products: [{
              species: 'Atlantic Herring (HER)',
            }], exporterDetails: {}, transportation: { exportedTo: {} }
          }
        };
        const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", requestedByAdmin: false };
        const toLandingsResponse = [{
          species: 'HER'
        }];

        mockGetCertificate.mockResolvedValue(getCatchCertificate);
        mockToCcDefraReport.mockReturnValue(toReportResponse);
        mockToLandings.mockReturnValue(toLandingsResponse);

        await Controllers.reportCcSubmitted(data).catch((err) => err);
        expect(mockLogError).toHaveBeenCalledTimes(2);
        expect(mockLogError).toHaveBeenNthCalledWith(1, '[VESSEL-SERVICE][VESSEL-LOOKUP][NOT-FOUND]WA1:2019-07-10');
        expect(mockLogError).toHaveBeenNthCalledWith(2, '[VESSEL-SERVICE][RSS-NUMBER][NOT-FOUND]WA1:2019-07-10');

      });
    });
  });

});

describe('Report Cc Landing Update', () => {

  const queryTime = moment.utc();
  const documentNumber = 'X-CC-1';
  const data: Shared.ICcQueryResult[] = [{
    documentNumber: documentNumber,
    documentType: 'catchCertificate',
    createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
    status: 'COMPLETE',
    rssNumber: 'rssWA1',
    da: 'Guernsey',
    dateLanded: '2019-07-10',
    species: 'LBE',
    weightOnCert: 121,
    rawWeightOnCert: 122,
    weightOnAllCerts: 200,
    weightOnAllCertsBefore: 0,
    weightOnAllCertsAfter: 100,
    weightFactor: 5,
    isLandingExists: true,
    hasSalesNote: false,
    isSpeciesExists: true,
    numberOfLandingsOnDay: 1,
    weightOnLanding: 30,
    weightOnLandingAllSpecies: 30,
    landingTotalBreakdown: [
      {
        factor: 1,
        isEstimate: true,
        weight: 30,
        liveWeight: 30,
        source: Shared.LandingSources.CatchRecording
      }
    ],
    isOverusedThisCert: true,
    isOverusedAllCerts: true,
    isExceeding14DayLimit: false,
    overUsedInfo: [],
    durationSinceCertCreation: moment.duration(
      queryTime
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
    durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
      moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
    durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
      moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
    extended: {
      landingId: 'rssWA12019-07-10',
      exporterName: 'Mr Bob',
      presentation: 'SLC',
      presentationName: 'sliced',
      vessel: 'DAYBREAK',
      fao: 'FAO27',
      pln: 'WA1',
      species: 'Lobster',
      exclusiveEconomicZones: [
        {
          officialCountryName: "Nigeria",
          isoCodeAlpha2: "NG",
          isoCodeAlpha3: "NGA",
          isoNumericCode: "566"
        },
        {
          officialCountryName: "France",
          isoCodeAlpha2: "FR",
          isoCodeAlpha3: "FRA",
          isoNumericCode: "250"
        }
      ],
      state: 'FRE',
      stateName: 'fresh',
      commodityCode: '1234',
      investigation: {
        investigator: "Investigator Gadget",
        status: Shared.InvestigationStatus.Open
      },
      transportationVehicle: 'directLanding',
      dataEverExpected: true,
      landingDataExpectedDate: '1901-01-01',
      landingDataEndDate: '2901-01-01',
    }
  }];

  let mockGetExtendedValidationData: jest.SpyInstance;

  let mockInsertCcReport: jest.SpyInstance;
  let mockGetCertificate: jest.SpyInstance;
  let mockToCcDefraReport: jest.SpyInstance;
  let mockToLandings: jest.SpyInstance;
  let mockReportCc: jest.SpyInstance;
  let mockLogInfo: jest.SpyInstance;
  let mockLogWarn: jest.SpyInstance;
  let mockLogError: jest.SpyInstance;
  let mockVesselIdx: jest.SpyInstance;

  beforeEach(() => {
    mockLogInfo = jest.spyOn(logger, 'info');
    mockGetExtendedValidationData = jest.spyOn(extendedValidationDataService, 'getExtendedValidationData');
    mockGetExtendedValidationData.mockResolvedValue(null);
    uuid.mockImplementation(() => 'some-uuid-correlation-id');

    mockInsertCcReport = jest.spyOn(DefraPersistance, 'insertCcDefraValidationReport');
    mockGetCertificate = jest.spyOn(CertificatePersistance, 'getCertificateByDocumentNumberWithNumberOfFailedAttempts');
    mockToCcDefraReport = jest.spyOn(Shared, 'toCcDefraReport');
    mockToLandings = jest.spyOn(DefraMapper, 'toLandings');
    mockReportCc = jest.spyOn(CaseManagement, 'reportCcLandingUpdate');
    mockVesselIdx = jest.spyOn(Cache, 'getVesselsIdx');
    mockVesselIdx.mockReturnValue(mockVesselIdxWithPln);
    mockLogInfo = jest.spyOn(logger, 'info');
    mockLogWarn = jest.spyOn(logger, 'warn');
    mockLogError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    mockGetExtendedValidationData.mockRestore();
    uuid.mockRestore();

    mockInsertCcReport.mockRestore();
    mockGetCertificate.mockRestore();
    mockToCcDefraReport.mockRestore();
    mockToLandings.mockRestore();
    mockReportCc.mockRestore();
    mockVesselIdx.mockRestore();
    mockLogInfo.mockRestore();
    mockLogWarn.mockRestore();
    mockLogError.mockRestore();
  });

  describe('for a landing update', () => {

    it('all methods required by reportCcSubmitted should be called with the correct data', async () => {
      const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE' };
      const getCatchCertificate = {
        ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
          exporterDetails: {}, products: [{
            species: 'Atlantic Herring (HER)',
          }]
        }
      };
      const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", _correlationId: 'some-uuid-correlation-id', requestedByAdmin: false };
      const toLandingsResponse = [{
        species: 'HER'
      }];

      mockInsertCcReport.mockResolvedValue(null);

      mockGetCertificate.mockResolvedValue(getCatchCertificate);
      mockToCcDefraReport.mockReturnValue(toReportResponse);
      mockToLandings.mockReturnValue(toLandingsResponse);

      await Controllers.reportCcLandingUpdate(data);

      expect(mockInsertCcReport).toHaveBeenCalledWith({ ...toReportResponse, landings: toLandingsResponse });
      expect(mockGetCertificate).toHaveBeenCalledWith('X-CC-1', 'catchCert');
      expect(mockToCcDefraReport).toHaveBeenCalledWith('X-CC-1', 'some-uuid-correlation-id', 'COMPLETE', false, mockVesselIdxWithPln, getCatchCertificate);
      expect(mockToLandings).toHaveBeenCalledWith(data);
      expect(mockInsertCcReport).toHaveBeenCalledWith(toReportResponse);
      expect(mockReportCc).toHaveBeenCalledTimes(1);
      expect(mockReportCc).toHaveBeenCalledWith(data, getCatchCertificate, 'some-uuid-correlation-id', 'new-landing');
    });

    it('should catch any errors thrown', async () => {

      mockGetCertificate.mockImplementation(() => {
        throw 'error';
      });

      await Controllers.reportCcLandingUpdate(data);

      expect(mockLogWarn).toHaveBeenNthCalledWith(1, '[ONLINE-VALIDATION-REPORT][getCertificateByDocumentNumberWithNumberOfFailedAttempts][error][ERROR]');
      expect(mockLogError).toHaveBeenNthCalledWith(1, '[ONLINE-VALIDATION-REPORT][ERROR][error]');
    });

    it('should catch any errors thrown when mapping', async () => {
      const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
      const getCatchCertificate = {
        ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
          products: [{
            species: 'Atlantic Herring (HER)',
          }]
        }
      };

      mockGetCertificate.mockResolvedValue(getCatchCertificate);
      mockToCcDefraReport.mockImplementation(() => {
        throw 'error';
      });

      await Controllers.reportCcLandingUpdate(data);

      expect(mockLogWarn).toHaveBeenNthCalledWith(1, '[ONLINE-VALIDATION-REPORT][toCcDefraReport][error][ERROR]');
      expect(mockLogError).toHaveBeenNthCalledWith(1, '[ONLINE-VALIDATION-REPORT][ERROR][error]');
    });

    it('should catch any errors thrown when mapping landings', async () => {
      const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
      const getCatchCertificate = {
        ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
          products: [{
            species: 'Atlantic Herring (HER)',
          }]
        }
      };
      const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", requestedByAdmin: false };

      mockGetCertificate.mockResolvedValue(getCatchCertificate);
      mockToCcDefraReport.mockReturnValue(toReportResponse);
      mockToLandings.mockImplementation(() => {
        throw 'error';
      });

      await Controllers.reportCcLandingUpdate(data);

      expect(mockLogWarn).toHaveBeenNthCalledWith(1, '[ONLINE-VALIDATION-REPORT][toLandings][error][ERROR]');
      expect(mockLogError).toHaveBeenNthCalledWith(1, '[ONLINE-VALIDATION-REPORT][ERROR][error]');
    });

    it('should catch any errors thrown when inserting defra valdation records', async () => {
      const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
      const getCatchCertificate = {
        ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
          products: [{
            species: 'Atlantic Herring (HER)',
          }]
        }
      };
      const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", requestedByAdmin: false };
      const toLandingsResponse = [{
        species: 'HER'
      }];

      mockGetCertificate.mockResolvedValue(getCatchCertificate);
      mockToCcDefraReport.mockReturnValue(toReportResponse);
      mockToLandings.mockReturnValue(toLandingsResponse);
      mockInsertCcReport.mockImplementation(() => {
        throw 'error';
      });


      await Controllers.reportCcLandingUpdate(data);

      expect(mockLogWarn).toHaveBeenNthCalledWith(1, '[ONLINE-VALIDATION-REPORT][insertCcDefraValidationReport][error][ERROR]');
      expect(mockLogError).toHaveBeenNthCalledWith(1, '[ONLINE-VALIDATION-REPORT][ERROR][error]');
    });

    it('should catch any errors thrown when landing has not exporter details', async () => {
      const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE', _correlationId: 'some-uuid-correlation-id' };
      const getCatchCertificate = {
        ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
          products: [{
            species: 'Atlantic Herring (HER)',
          }], exporterDetails: undefined, transportation: { exportedTo: {} }
        }
      };
      const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", requestedByAdmin: false };
      const toLandingsResponse = [{
        species: 'HER'
      }];

      mockInsertCcReport.mockResolvedValue(null);
      mockGetCertificate.mockResolvedValue(getCatchCertificate);
      mockToCcDefraReport.mockReturnValue(toReportResponse);
      mockToLandings.mockReturnValue(toLandingsResponse);

      await Controllers.reportCcLandingUpdate(data);
      expect(mockLogError).toHaveBeenCalledWith(`[ONLINE-VALIDATION-REPORT][FAIL][${documentNumber}][NO-EXPORTER-DETAILS]`);
    });

    it('should not set sales notes if date landed is invalid', async () => {
      const mockMapCcResponse = { documentNumber: documentNumber, status: 'COMPLETE' };
      const getCatchCertificate = {
        ...mockMapCcResponse, requestByAdmin: false, audit: [], exportData: {
          exporterDetails: {}, products: [{
            species: 'Atlantic Herring (HER)',
          }]
        }
      };
      const toReportResponse = { ...mockMapCcResponse, documentType: "CatchCertificate", _correlationId: 'some-uuid-correlation-id', requestedByAdmin: false };
      const toLandingsResponse = [{
        species: 'HER'
      }];

      mockInsertCcReport.mockResolvedValue(null);
      mockGetCertificate.mockResolvedValue(getCatchCertificate);
      mockToCcDefraReport.mockReturnValue(toReportResponse);
      mockToLandings.mockReturnValue(toLandingsResponse);

      await Controllers.reportCcLandingUpdate([{ ...data[0], dateLanded: 'invalid date' }]);

      expect(mockLogInfo).toHaveBeenCalledWith(`[ONLINE-VALIDATION-REPORT][${data[0].extended.landingId}][NO-SALES-NOTE]`);
    });
  });
});