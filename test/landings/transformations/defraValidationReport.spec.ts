import {
  IDefraValidationReport,
  IDefraValidationProcessingStatement,
  CertificateAudit,
  ProcessingStatementReportCatch,
  CertificatePlant,
  HealthCertificate,
  CertificateConsignment,
  CertificateCompany,
  StorageDocumentReportCatch,
  IDefraValidationStorageDocument,
  CertificateStorageFacility,
  CertificateTransport
} from '../../../src/landings/types/defraValidation';
import { CertificateLanding, ICcQueryResult, CatchCertificateTransport, toTransportations } from 'mmo-shared-reference-data';
import { ISdPsQueryResult } from '../../../src/landings/types/query';
import {
  ccQueryResultToDefraValidationReport,
  toPsDefraReport,
  toDefraAudit,
  toDefraPsCatch, toDefraSdProduct,
  toTransportation,
  toCatches,
  toProducts,
  toSdDefraReport,
  toDefraSdStorageFacility,
  toLandings
} from "../../../src/landings/transformations/defraValidation";
import { DocumentStatuses, IDocument } from "../../../src/landings/types/document";
import { IAuditEvent, AuditEventTypes, InvestigationStatus } from '../../../src/landings/types/auditEvent';
import * as Transformations from '../../../src/landings/transformations/transformations';
import * as SUT from "../../../src/landings/transformations/defraValidation";
import { ApplicationConfig } from '../../../src/config';
import moment from 'moment';
import { LandingSources } from '../../../src/landings/types/landing';

describe('For System Audits', () => {
  it('will always include all required elements', () => {
    const systemAudit: IAuditEvent = {
      eventType: AuditEventTypes.PreApproved,
      triggeredBy: "Bob",
      timestamp: new Date(),
      data: null
    }

    const result: CertificateAudit = toDefraAudit(systemAudit);

    expect(result.auditOperation).toEqual(AuditEventTypes.PreApproved);
    expect(result.user).toEqual(systemAudit.triggeredBy)
    expect(result.auditAt).toEqual(systemAudit.timestamp)
  });

  it('will include the investigation status if present', () => {
    const systemAudit: IAuditEvent = {
      eventType: AuditEventTypes.PreApproved,
      triggeredBy: "Bob",
      timestamp: new Date(),
      data: {
        investigationStatus: InvestigationStatus.Closed
      }
    }

    const result: CertificateAudit = toDefraAudit(systemAudit);

    expect(result.investigationStatus).toEqual(InvestigationStatus.Closed);
  });
});

describe('For processing statements', () => {
  const systemPs: IDocument = {
    createdAt: new Date("2020-06-09T11:27:49.000Z"),
    __t: "processingStatement",
    createdBy: "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
    status: "COMPLETE",
    documentNumber: "GBR-2020-PS-BA8A6BE06",
    requestByAdmin: false,
    investigation: [],
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
    userReference: "test",
    exportData: {
      catches: [
        {
          species: "Atlantic herring (HER)",
          scientificName: "Clupea harengus",
          catchCertificateNumber: "23462436",
          totalWeightLanded: 3,
          exportWeightBeforeProcessing: 3,
          exportWeightAfterProcessing: 3
        },
        {
          species: "Balbonic Salmon (SAL)",
          scientificName: "Balbonic",
          catchCertificateNumber: "RAZ-24323-4234-234",
          totalWeightLanded: 32,
          exportWeightBeforeProcessing: 32,
          exportWeightAfterProcessing: 3524
        }],
      exporterDetails: {
        contactId: 'a contact id',
        accountId: 'an account id',
        exporterCompanyName: "Bobby The Second",
        buildingName: "Building Name",
        buildingNumber: "Building Number",
        subBuildingName: "Sub Building Name",
        addressOne: "11, Righteous Way",
        townCity: "Blaydon-on-Thames",
        county: "County",
        country: "Country",
        postcode: "BT1 1AA",
        _dynamicsAddress: { dynamicsData: 'original address' },
        _dynamicsUser: {
          firstName: "Bob",
          lastName: "Exporter"
        }
      },
      consignmentDescription: "test",
      healthCertificateNumber: "3",
      healthCertificateDate: "01/06/2020",
      personResponsibleForConsignment: "Bob Bobby",
      plantApprovalNumber: "111-222",
      plantName: "Bob's plant",
      plantAddressOne: "test1",
      plantBuildingName: "plantBuildingName",
      plantBuildingNumber: "plantBuildingNumber",
      plantSubBuildingName: "plantSubBuildingName",
      plantStreetName: "plantStreetName",
      plantCountry: "plantCountry",
      plantCounty: "plantCounty",
      plantTownCity: "city Test",
      plantPostcode: "RRR",
      dateOfAcceptance: "09/06/2020",
      exportedTo: {
        officialCountryName: "Nigeria",
        isoCodeAlpha2: "NG",
        isoCodeAlpha3: "NGA",
        isoNumericCode: "566"
      }
    },
    createdByEmail: "foo@foo.com",
    documentUri: "_fd91895a-85e5-4e1b-90ef-53cffe3ac758.pdf",
    numberOfFailedAttempts: 5
  }

  describe('For catches', () => {
    it('will always include all required elements', () => {
      const psCatch = {
        species: "Atlantic herring (HER)",
        scientificName: "Clupea harengus",
        catchCertificateNumber: "IT-23423-423-42342",
        totalWeightLanded: 10,
        exportWeightBeforeProcessing: 20,
        exportWeightAfterProcessing: 30
      };

      const expectedResult: ProcessingStatementReportCatch = {
        species: "Atlantic herring (HER)",
        scientificName: "Clupea harengus",
        catchCertificateNumber: "IT-23423-423-42342",
        isDocumentIssuedInUK: false,
        totalWeightLanded: 10,
        exportWeightBeforeProcessing: 20,
        exportWeightAfterProcessing: 30,
      }

      const result = toDefraPsCatch(psCatch)

      expect(result).toEqual(expectedResult);

    });

    it('will set isDocumentIssuedInUK to true if it is a UK type of catchCertificate', () => {
      const psCatch = {
        species: "Atlantic herring (HER)",
        scientificName: "Clupea harengus",
        catchCertificateNumber: "IT-23423-423-42342",
        catchCertificateType: "uk",
        totalWeightLanded: 10,
        exportWeightBeforeProcessing: 20,
        exportWeightAfterProcessing: 30
      };

      const expectedResult: ProcessingStatementReportCatch = {
        species: "Atlantic herring (HER)",
        scientificName: "Clupea harengus",
        catchCertificateNumber: "IT-23423-423-42342",
        isDocumentIssuedInUK: true,
        totalWeightLanded: 10,
        exportWeightBeforeProcessing: 20,
        exportWeightAfterProcessing: 30,
      }

      const result = toDefraPsCatch(psCatch)

      expect(result).toEqual(expectedResult);

    });
  });

  it('will map correctly for a DRAFT with all required fields', () => {
    const result: IDefraValidationProcessingStatement = toPsDefraReport("GBR-PS-32432-234234", "some-uuid-correlation-id", DocumentStatuses.Draft, requestByAdmin)

    expect(result.documentType).toEqual("ProcessingStatement");
    expect(result.documentNumber).toEqual("GBR-PS-32432-234234");
    expect(result.status).toEqual(DocumentStatuses.Draft);
    expect(result._correlationId).toBe("some-uuid-correlation-id");
    expect(result.requestedByAdmin).toBe(false);
    expect(result.failedSubmissions).toBeUndefined();
    expect(result.exportedTo).toBeUndefined();
  });

  it('will map all audit events', () => {
    const result: IDefraValidationProcessingStatement = toPsDefraReport("GBR-PS-32432-234234", "", DocumentStatuses.Draft, requestByAdmin, systemPs)

    expect(result.audits?.length).toEqual(2);
  });

  it('will map all catches', () => {
    const result: IDefraValidationProcessingStatement = toPsDefraReport("GBR-PS-32432-234234", "", DocumentStatuses.Draft, requestByAdmin, systemPs)

    expect(result.catches?.length).toEqual(2);
  });

  it('will map a health certificate', () => {
    const expectedResult: HealthCertificate = {
      number: "3",
      date: "01/06/2020"
    };

    const result: IDefraValidationProcessingStatement = toPsDefraReport("GBR-PS-32432-234234", "", DocumentStatuses.Draft, requestByAdmin, systemPs)

    expect(result.healthCertificate).toEqual(expectedResult)
  });

  it('will map the consignment', () => {
    const expectedResult: CertificateConsignment = {
      description: "test",
      personResponsible: "Bob Bobby"
    }

    const result: IDefraValidationProcessingStatement = toPsDefraReport("GBR-PS-32432-234234", "", DocumentStatuses.Draft, requestByAdmin, systemPs)

    expect(result.consignment).toEqual(expectedResult)
  });

  describe("For exporter details", () => {

    it('will contain the exporter details', () => {
      const expectedResult: CertificateCompany = {
        companyName: "Bobby The Second",
        address: {
          building_name: "Building Name",
          building_number: "Building Number",
          sub_building_name: "Sub Building Name",
          line1: "11, Righteous Way",
          city: "Blaydon-on-Thames",
          county: "County",
          country: "Country",
          postCode: "BT1 1AA",
        },
        contactId: 'a contact id',
        accountId: 'an account id',
        dynamicsAddress: { dynamicsData: 'original address' }
      };

      const result: IDefraValidationProcessingStatement = toPsDefraReport("GBR-PS-32432-234234", "", DocumentStatuses.Draft, requestByAdmin, systemPs)

      expect(result.exporterDetails).toEqual(expectedResult)
    });

    it('will deal with address with only mandatory items', () => {

      const systemPs: IDocument = {
        createdAt: new Date("2020-06-09T11:27:49.000Z"),
        __t: "processingStatement",
        createdBy: "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        status: "COMPLETE",
        documentNumber: "GBR-2020-PS-BA8A6BE06",
        requestByAdmin: false,
        investigation: [],
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
        userReference: "test",
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
            contactId: 'a contact id',
            accountId: 'an account id',
            exporterCompanyName: "Bobby The Second",
            addressOne: "11, Righteous WAy Way",
            townCity: "Blaydon-on-Thames",
            _dynamicsAddress: { dynamicsData: 'original address' },
            _dynamicsUser: {
              firstName: 'Bob',
              lastName: 'Exporter'
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

      const expectedResult: CertificateCompany = {
        companyName: "Bobby The Second",
        address: {
          line1: "11, Righteous WAy Way",
          city: "Blaydon-on-Thames"
        },
        contactId: 'a contact id',
        accountId: 'an account id',
        dynamicsAddress: { dynamicsData: 'original address' }
      };

      const result: IDefraValidationProcessingStatement = toPsDefraReport("GBR-PS-32432-234234", "", DocumentStatuses.Draft, requestByAdmin, systemPs)
      expect(result.exporterDetails).toEqual(expectedResult)
    });
  });

  it('will bring the number of unsuccessful submissions', () => {
    const result: IDefraValidationProcessingStatement = toPsDefraReport("GBR-PS-32432-234234", "", DocumentStatuses.Draft, requestByAdmin, systemPs)

    expect(result.failedSubmissions).toEqual(5);
  });

  it('will bring the number of unsuccessful submissions when undefined', () => {
    const examplePsWithNoNumberOfSubmissions: IDocument = {
      createdAt: new Date("2020-06-09T11:27:49.000Z"),
      __t: "processingStatement",
      createdBy: "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      status: "COMPLETE",
      documentNumber: "GBR-2020-PS-BA8A6BE06",
      requestByAdmin: false,
      investigation: [],
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
      userReference: "test",
      exportData: {
        catches: [
          {
            species: "Atlantic herring (HER)",
            scientificName: "Clupea harengus",
            catchCertificateNumber: "23462436",
            totalWeightLanded: 3,
            exportWeightBeforeProcessing: 3,
            exportWeightAfterProcessing: 3
          },
          {
            species: "Balbonic Salmon (SAL)",
            scientificName: "Balbonic",
            catchCertificateNumber: "RAZ-24323-4234-234",
            totalWeightLanded: 32,
            exportWeightBeforeProcessing: 32,
            exportWeightAfterProcessing: 3524
          }],
        exporterDetails: {
          contactId: 'a contact id',
          accountId: 'an account id',
          exporterCompanyName: "Bobby The Second",
          buildingName: "Building Name",
          buildingNumber: "Building Number",
          subBuildingName: "Sub Building Name",
          addressOne: "11, Righteous Way",
          townCity: "Blaydon-on-Thames",
          county: "County",
          country: "Country",
          postcode: "BT1 1AA",
          _dynamicsAddress: { dynamicsData: 'original address' },
          _dynamicsUser: {
            firstName: "Bob",
            lastName: "Exporter"
          }
        },
        consignmentDescription: "test",
        healthCertificateNumber: "3",
        healthCertificateDate: "01/06/2020",
        personResponsibleForConsignment: "Bob Bobby",
        plantApprovalNumber: "111-222",
        plantName: "Bob's plant",
        plantAddressOne: "test1",
        plantBuildingName: "plantBuildingName",
        plantBuildingNumber: "plantBuildingNumber",
        plantSubBuildingName: "plantSubBuildingName",
        plantStreetName: "plantStreetName",
        plantCountry: "plantCountry",
        plantCounty: "plantCounty",
        plantTownCity: "city Test",
        plantPostcode: "RRR",
        dateOfAcceptance: "09/06/2020",
        exportedTo: {
          officialCountryName: "Nigeria",
          isoCodeAlpha2: "NG",
          isoCodeAlpha3: "NGA",
          isoNumericCode: "566"
        }
      },
      createdByEmail: "foo@foo.com",
      documentUri: "_fd91895a-85e5-4e1b-90ef-53cffe3ac758.pdf"
    }

    const result: IDefraValidationProcessingStatement = toPsDefraReport("GBR-PS-32432-234234", "", DocumentStatuses.Draft, requestByAdmin, examplePsWithNoNumberOfSubmissions)

    expect(result.failedSubmissions).toEqual(0);
  });

  it('will surface the report uri with correct path', () => {
    ApplicationConfig.prototype.externalAppUrl = "http://localhost:3001"

    const result: IDefraValidationProcessingStatement = toPsDefraReport("GBR-PS-32432-234234", "", DocumentStatuses.Draft, requestByAdmin, systemPs)

    expect(result.documentUri).toEqual(`http://localhost:3001/qr/export-certificates/${systemPs.documentUri}`);
  });

  it('will contain the exporter number', () => {

    const result: IDefraValidationProcessingStatement = toPsDefraReport("GBR-PS-32432-234234", "", DocumentStatuses.Draft, requestByAdmin, systemPs)

    expect(result.exporterDetails?.contactId).toEqual("a contact id");
    expect(result.exporterDetails?.accountId).toEqual("an account id");
  });

  describe("For processing plant", () => {
    it('will map the processing plant', () => {
      const expectedResult: CertificatePlant = {
        approvalNumber: "111-222",
        name: "Bob's plant",
        address: {
          line1: "test1",
          building_name: "plantBuildingName",
          building_number: "plantBuildingNumber",
          sub_building_name: "plantSubBuildingName",
          street_name: "plantStreetName",
          country: "plantCountry",
          county: "plantCounty",
          city: "city Test",
          postCode: "RRR"
        },
        dateOfAcceptance: "09/06/2020"
      }

      const result: IDefraValidationProcessingStatement = toPsDefraReport("GBR-PS-32432-234234", "", DocumentStatuses.Draft, requestByAdmin, systemPs)

      expect(result.plant).toEqual(expectedResult)
    });

    it('will handle an address with only required fields', () => {

      const systemPs: IDocument = {
        createdAt: new Date("2020-06-09T11:27:49.000Z"),
        __t: "processingStatement",
        createdBy: "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        status: "COMPLETE",
        documentNumber: "GBR-2020-PS-BA8A6BE06",
        requestByAdmin: false,
        investigation: [],
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
        userReference: "test",
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
            exporterCompanyName: "Mr",
            addressOne: "11, Righteous WAy Way",
            addressTwo: "Dessert Way",
            townCity: "Blaydon-on-Thames",
            postcode: "LE29 04G",
            _dynamicsAddress: { dynamicsData: 'original address' },
            _dynamicsUser: {
              firstName: 'Bob',
              lastName: 'Exporter'
            }
          },
          consignmentDescription: "test",
          healthCertificateNumber: "3",
          healthCertificateDate: "01/06/2020",
          personResponsibleForConsignment: "test",
          plantApprovalNumber: "111-222",
          plantName: "Bob's plant",
          plantAddressOne: "test1",
          plantTownCity: "city Test",
          dateOfAcceptance: "09/06/2020"
        },
        createdByEmail: "foo@foo.com",
        documentUri: "_fd91895a-85e5-4e1b-90ef-53cffe3ac758.pdf",
        numberOfFailedAttempts: 5
      }

      const expectedResult: CertificatePlant = {
        approvalNumber: "111-222",
        name: "Bob's plant",
        address: {
          line1: "test1",
          city: "city Test",
        },
        dateOfAcceptance: "09/06/2020"
      }

      const result: IDefraValidationProcessingStatement = toPsDefraReport("GBR-PS-32432-234234", "", DocumentStatuses.Draft, requestByAdmin, systemPs)

      expect(result.plant).toEqual(expectedResult)
    });
  });

  it('will add rest of root properties', () => {
    const result: IDefraValidationProcessingStatement = toPsDefraReport("GBR-PS-32432-234234", "some-uuid-correlation-id", DocumentStatuses.Draft, requestByAdmin, systemPs)

    expect(result.userReference).toEqual("test");
    expect(result.created).toEqual({
      id: 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12',
      email: 'foo@foo.com',
      firstName: 'Bob',
      lastName: 'Exporter'
    });
    expect(result.dateCreated).toEqual(systemPs.createdAt);
    expect(result._correlationId).toBe('some-uuid-correlation-id');
    expect(result.exportedTo?.officialCountryName).toBe('Nigeria');
  });

  it('will map the DA based on the exporter postcode', () => {
    const result: IDefraValidationProcessingStatement = toPsDefraReport("GBR-PS-32432-234234", "", DocumentStatuses.Draft, requestByAdmin, systemPs)

    expect(result.devolvedAuthority).toEqual("Northern Ireland")
  });

  describe('when document status is DELETE', () => {
    let mockPostCodeDaLookup: jest.SpyInstance;

    beforeEach(() => {
      mockPostCodeDaLookup = jest.spyOn(SUT, 'daLookUp');
    });

    afterEach(() => {
      mockPostCodeDaLookup.mockRestore();
    });

    it('will display devolvedAuthority when exporter details are available', () => {
      const result: IDefraValidationProcessingStatement = toPsDefraReport('GBR-2020-PS-BA8A6BE06', '', 'DELETE', requestByAdmin, systemPs);

      expect(mockPostCodeDaLookup).toHaveBeenCalledWith('BT1 1AA');
      expect(result.devolvedAuthority).toEqual('Northern Ireland');
    });

    it('will not display devolvedAuthority when exporter details are not available', () => {
      const backEndPsWithNoExporterDetails: IDocument = {
        "createdAt": new Date("2020-06-12T20:12:28.201Z"),
        "__t": "processingStatement",
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "createdByEmail": "foo@foo.com",
        "status": "DRAFT",
        "documentNumber": "GBR-2020-PS-BA8A6BE06",
        "investigation": [],
        "audit": [],
        "requestByAdmin": false,
        "userReference": "My Reference",
        "exportData": {},
        "numberOfFailedAttempts": 0
      };

      const result: IDefraValidationProcessingStatement = toPsDefraReport('GBR-2020-PS-BA8A6BE06', "", 'DELETE', requestByAdmin, backEndPsWithNoExporterDetails);

      expect(mockPostCodeDaLookup).not.toHaveBeenCalled();
      expect(result.devolvedAuthority).toBeUndefined();
    });
  });
});

describe('For storage documents', () => {

  describe('when document status is DRAFT', () => {
    const correlationId = 'some-uuid-correlation-id';

    it('will map all required fields correctly', () => {
      const result: IDefraValidationStorageDocument = toSdDefraReport('GBR-2020-SD-C90A88218', correlationId, DocumentStatuses.Draft, requestByAdmin)

      expect(result.documentType).toEqual("StorageDocument");
      expect(result.documentNumber).toEqual("GBR-2020-SD-C90A88218");
      expect(result.status).toEqual('DRAFT');
      expect(result._correlationId).toBe('some-uuid-correlation-id');
      expect(result.requestedByAdmin).toBe(false);

      expect(result.audits).toBeUndefined()
      expect(result.devolvedAuthority).toBeUndefined();

      expect(result.userReference).toBeUndefined()
      expect(result.dateCreated).toBeUndefined();

      expect(result.exporterDetails).toBeUndefined();
      expect(result.products).toBeUndefined();
      expect(result.storageFacilities).toBeUndefined();
      expect(result.transportation).toBeUndefined();
      expect(result.arrivalTransportation).toBeUndefined();

      expect(result.documentUri).toBeUndefined();
      expect(result.failedSubmissions).toBeUndefined();
      expect(result.exportedTo).toBeUndefined();
    });
  });

  describe('when document status is DELETE', () => {
    const backEndSd: IDocument = {
      "createdAt": new Date("2020-06-12T20:12:28.201Z"),
      "__t": "storageDocument",
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "createdByEmail": "foo@foo.com",
      "status": "DRAFT",
      "documentNumber": "GBR-2020-SD-C90A88218",
      "clonedFrom": "GBR-2023-SD-C3A82642B",
      "parentDocumentVoid": false,
      "requestByAdmin": false,
      "investigation": [],
      "audit": [{
        "eventType": AuditEventTypes.PreApproved,
        "triggeredBy": "Bob",
        "timestamp": new Date(),
        "data": null
      }, {
        "eventType": AuditEventTypes.Investigated,
        "triggeredBy": "Bob",
        "timestamp": new Date(),
        "data": null
      }],
      "userReference": "My Reference",
      "exportData": {
        "exporterDetails": {
          "exporterCompanyName": "Exporter Ltd",
          "addressOne": "Building Name",
          "addressTwo": "Building Street",
          "townCity": "Town",
          "postcode": "IM1 3AA",
          "_dynamicsAddress": { "dynamicsData": 'original address' },
          "_dynamicsUser": {
            "firstName": "Bob",
            "lastName": "Exporter"
          }
        },
        "catches": [{
          "product": "Atlantic herring (HER)",
          "scientificName": "Clupea harengus",
          "commodityCode": "0345603",
          "productWeight": "1000",
          "dateOfUnloading": "12/06/2020",
          "placeOfUnloading": "Dover",
          "transportUnloadedFrom": "BA078",
          "certificateNumber": "GBR-3453-3453-3443",
          "weightOnCC": "1000"
        }],
        "storageFacilities": [{
          "facilityName": "Exporter Person",
          "facilityAddressOne": "Building Name",
          "facilityAddressTwo": "Building Street",
          "facilityTownCity": "Town",
          "facilityPostcode": "XX12 X34"
        }],
        "transportation": {
          "vehicle": "truck",
          "cmr": true
        },
        "exportedTo": {
          "officialCountryName": "Nigeria",
          "isoCodeAlpha2": "NG",
          "isoCodeAlpha3": "NGA",
          "isoNumericCode": "566"
        },
      },
      "documentUri": "_0d8f98a1-c372-47c4-803f-dafd642c4941.pdf",
      "numberOfFailedAttempts": 5
    };

    let mockPostCodeDaLookup: jest.SpyInstance;

    beforeEach(() => {
      mockPostCodeDaLookup = jest.spyOn(SUT, 'daLookUp');
    });

    afterEach(() => {
      mockPostCodeDaLookup.mockRestore();
    });

    it('will map all required fields correctly', () => {
      const result: IDefraValidationStorageDocument = toSdDefraReport('GBR-2020-SD-C90A88218', correlationId, 'DELETE', requestByAdmin);

      expect(result.documentType).toEqual("StorageDocument");
      expect(result.documentNumber).toEqual("GBR-2020-SD-C90A88218");
      expect(result.status).toEqual('DELETE');
      expect(result._correlationId).toBe('some-uuid-correlation-id');
      expect(result.requestedByAdmin).toBe(false);

      expect(mockPostCodeDaLookup).not.toHaveBeenCalled();

      expect(result.audits).toBeUndefined();
      expect(result.devolvedAuthority).toBeUndefined();

      expect(result.userReference).toBeUndefined();
      expect(result.dateCreated).toBeUndefined();

      expect(result.exporterDetails).toBeUndefined();
      expect(result.products).toBeUndefined();
      expect(result.storageFacilities).toBeUndefined();
      expect(result.transportation).toBeUndefined();
      expect(result.arrivalTransportation).toBeUndefined();

      expect(result.documentUri).toBeUndefined();
      expect(result.failedSubmissions).toBeUndefined();

      expect(result.exportedTo).toBeUndefined();
    });

    it('will display devolvedAuthority when exporter details are available', () => {
      const result: IDefraValidationStorageDocument = toSdDefraReport('GBR-2020-SD-C90A88218', correlationId, 'DELETE', requestByAdmin, backEndSd);

      expect(mockPostCodeDaLookup).toHaveBeenCalledWith('IM1 3AA');
      expect(result.devolvedAuthority).toEqual('Isle of Man');
    });

    it('will not display devolvedAuthority when exporter details are not available', () => {
      const backEndSdWithNoExporterDetails: IDocument = {
        "createdAt": new Date("2020-06-12T20:12:28.201Z"),
        "__t": "storageDocument",
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "createdByEmail": "foo@foo.com",
        "status": "DRAFT",
        "documentNumber": "GBR-2020-SD-C90A88218",
        "requestByAdmin": false,
        "audit": [],
        "userReference": "My Reference",
        "exportData": {},
        "numberOfFailedAttempts": 5
      };

      const result: IDefraValidationStorageDocument = toSdDefraReport('GBR-2020-SD-C90A88218', correlationId, 'DELETE', requestByAdmin, backEndSdWithNoExporterDetails);

      expect(mockPostCodeDaLookup).not.toHaveBeenCalled();
      expect(result.devolvedAuthority).toBeUndefined();
    });
  });

  describe('when document status is VOID', () => {
    const backEndSd: IDocument = {
      "createdAt": new Date("2020-06-12T20:12:28.201Z"),
      "__t": "storageDocument",
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "createdByEmail": "foo@foo.com",
      "status": "VOID",
      "documentNumber": "GBR-2020-SD-C90A88218",
      "clonedFrom": "GBR-2023-SD-C3A82642B",
      "parentDocumentVoid": false,
      "requestByAdmin": false,
      "audit": [{
        "eventType": AuditEventTypes.PreApproved,
        "triggeredBy": "Bob",
        "timestamp": new Date(),
        "data": null
      }, {
        "eventType": AuditEventTypes.Investigated,
        "triggeredBy": "Bob",
        "timestamp": new Date(),
        "data": null
      }],
      "userReference": "My Reference",
      "exportData": {
        "exporterDetails": {
          "contactId": "a contact id",
          "accountId": "an account id",
          "exporterCompanyName": "Exporter Ltd",
          "addressOne": "Building Name",
          "buildingName": "BuildingName",
          "buildingNumber": "BuildingNumber",
          "subBuildingName": "SubBuildingName",
          "streetName": "StreetName",
          "country": "Country",
          "county": "County",
          "townCity": "Town",
          "postcode": "TF1 3AA",
          "_dynamicsAddress": { "dynamicsData": 'original address' },
          "_dynamicsUser": {
            "firstName": "Bob",
            "lastName": "Exporter"
          }
        },
        "catches": [{
          "product": "Atlantic herring (HER)",
          "scientificName": "Clupea harengus",
          "commodityCode": "0345603",
          "productWeight": "1000",
          "dateOfUnloading": "12/06/2020",
          "placeOfUnloading": "Dover",
          "transportUnloadedFrom": "BA078",
          "certificateNumber": "GBR-3453-3453-3443",
          "certificateType": "uk",
          "weightOnCC": "1000"
        }],
        "storageFacilities": [{
          "facilityName": "Exporter Person",
          "facilityAddressOne": "Building Name",
          "facilityAddressTwo": "Building Street",
          "facilityTownCity": "Town",
          "facilityPostcode": "XX12 X34"
        }],
        "transportation": {
          "vehicle": "truck",
          "cmr": true
        },
        "exportedTo": {
          "officialCountryName": "Nigeria",
          "isoCodeAlpha2": "NG",
          "isoCodeAlpha3": "NGA",
          "isoNumericCode": "566"
        },
        "transportations": [{
          "id": '0',
          "vehicle": "truck",
          "departurePlace": "Hull",
          "nationalityOfVehicle": "",
          "registrationNumber": "",
          "exportedTo": {
            "officialCountryName": "Nigeria",
            "isoCodeAlpha2": "NG",
            "isoCodeAlpha3": "NGA",
            "isoNumericCode": "566"
          },
          "transportDocuments": [{
            "name": "Invoice",
            "reference": "INV001"
          }]
        }, {
          "id": '0',
          "vehicle": "plane",
          "departurePlace": "Hull",
          "flightNumber": "",
          "containerNumber": "",
          "exportedTo": {
            "officialCountryName": "Nigeria",
            "isoCodeAlpha2": "NG",
            "isoCodeAlpha3": "NGA",
            "isoNumericCode": "566"
          },
          "transportDocuments": [{
            "name": "Invoice",
            "reference": "INV001"
          }]
        }, {
          "id": '0',
          "vehicle": "train",
          "departurePlace": "Hull",
          "railwayBillNumber": "",
          "exportedTo": {
            "officialCountryName": "Nigeria",
            "isoCodeAlpha2": "NG",
            "isoCodeAlpha3": "NGA",
            "isoNumericCode": "566"
          },
          "transportDocuments": [{
            "name": "Invoice",
            "reference": "INV001"
          }]
        }, {
          "id": '0',
          "vehicle": "containerVessel",
          "departurePlace": "Hull",
          "vesselName": "",
          "flagState": "",
          "containerNumber": "",
          "exportedTo": {
            "officialCountryName": "Nigeria",
            "isoCodeAlpha2": "NG",
            "isoCodeAlpha3": "NGA",
            "isoNumericCode": "566"
          },
          "transportDocuments": [{
            "name": "Invoice",
            "reference": "INV001"
          }]
        }, {
          "id": '0',
          "vehicle": "unknown",
          "departurePlace": "Hull",
          "nationalityOfVehicle": "",
          "registrationNumber": "",
          "exportedTo": {
            "officialCountryName": "Nigeria",
            "isoCodeAlpha2": "NG",
            "isoCodeAlpha3": "NGA",
            "isoNumericCode": "566"
          },
          "transportDocuments": []
        }
        ],
      },
      "documentUri": "_0d8f98a1-c372-47c4-803f-dafd642c4941.pdf",
      "numberOfFailedAttempts": 5
    };

    it('will map all required fields correctly', () => {
      const result: IDefraValidationStorageDocument = toSdDefraReport('GBR-2020-SD-C90A88218', correlationId, DocumentStatuses.Void, requestByAdmin);

      expect(result.documentType).toEqual("StorageDocument");
      expect(result.documentNumber).toEqual("GBR-2020-SD-C90A88218");
      expect(result.status).toEqual('VOID');
      expect(result._correlationId).toBe('some-uuid-correlation-id');
      expect(result.requestedByAdmin).toBe(false);

      expect(result.audits).toBeUndefined();
      expect(result.devolvedAuthority).toBeUndefined();

      expect(result.userReference).toBeUndefined();
      expect(result.dateCreated).toBeUndefined();

      expect(result.exporterDetails).toBeUndefined();
      expect(result.products).toBeUndefined();
      expect(result.storageFacilities).toBeUndefined();
      expect(result.transportation).toBeUndefined();

      expect(result.documentUri).toBeUndefined();
      expect(result.failedSubmissions).toBeUndefined();
      expect(result.exportedTo).toBeUndefined();
    });

    it('will include the root properties', () => {
      const result: IDefraValidationStorageDocument = toSdDefraReport('GBR-2020-SD-C90A88218', correlationId, DocumentStatuses.Void, requestByAdmin, backEndSd);

      expect(result.userReference).toEqual("My Reference");
      expect(result.created).toEqual({
        id: 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12',
        email: 'foo@foo.com',
        firstName: 'Bob',
        lastName: 'Exporter'
      });
      expect(result.dateCreated).toEqual(new Date('2020-06-12T20:12:28.201Z'));
      expect(result._correlationId).toBe('some-uuid-correlation-id');
      expect(result.requestedByAdmin).toBe(false);
      expect(result.failedSubmissions).toBe(5);
      expect(result.exportedTo?.officialCountryName).toBe('Nigeria');
      expect(result.clonedFrom).toBe("GBR-2023-SD-C3A82642B");
      expect(result.parentDocumentVoid).toBe(false);
    });

    it('will include a devolvedAuthority property', () => {
      const result: IDefraValidationStorageDocument = toSdDefraReport('GBR-2020-SD-C90A88218', '', DocumentStatuses.Void, requestByAdmin, backEndSd);

      expect(result.devolvedAuthority).toEqual("England");
    });

    it('will map all audit events if any', () => {
      const result: IDefraValidationStorageDocument = toSdDefraReport('GBR-2020-SD-C90A88218', '', DocumentStatuses.Void, requestByAdmin, backEndSd);

      const expected: CertificateAudit = {
        auditOperation: 'PREAPPROVED',
        user: 'Bob',
        auditAt: expect.any(Date),
        investigationStatus: undefined
      };

      expect(result.audits?.[0]).toStrictEqual(expected);
      expect(result.audits?.length).toBe(2);
    });

    it('will include a number of failed submissions property', () => {
      const result: IDefraValidationStorageDocument = toSdDefraReport('GBR-2020-SD-C90A88218', '', DocumentStatuses.Void, requestByAdmin, backEndSd);

      expect(result.failedSubmissions).toEqual(5);
    });

    it('will include a document URI property', () => {
      const result: IDefraValidationStorageDocument = toSdDefraReport('GBR-2020-SD-C90A88218', '', DocumentStatuses.Void, requestByAdmin, backEndSd);

      expect(result.documentUri).toContain('/qr/export-certificates/_0d8f98a1-c372-47c4-803f-dafd642c4941.pdf');
    });


    it('will include a transportation property in the return result', () => {
      const expectedResult: CertificateTransport = {
        modeofTransport: 'truck',
        hasRoadTransportDocument: true
      };

      const result: IDefraValidationStorageDocument = toSdDefraReport("GBR-SD-32432-234234", "", DocumentStatuses.Void, requestByAdmin, backEndSd);
      expect(result.transportation).toEqual(expectedResult);
    });

    describe("For exporter details", () => {
      it('will contain the exporter details', () => {
        const expectedResult: CertificateCompany = {
          companyName: "Exporter Ltd",
          address: {
            line1: "Building Name",
            building_name: "BuildingName",
            building_number: "BuildingNumber",
            sub_building_name: "SubBuildingName",
            street_name: "StreetName",
            country: "Country",
            county: "County",
            city: "Town",
            postCode: "TF1 3AA"
          },
          contactId: 'a contact id',
          accountId: 'an account id',
          dynamicsAddress: { dynamicsData: 'original address' }
        };

        const result: IDefraValidationStorageDocument = toSdDefraReport("GBR-PS-32432-234234", "", DocumentStatuses.Void, requestByAdmin, backEndSd)
        expect(result.exporterDetails).toEqual(expectedResult)
      });

      it('will deal with address with only mandatory items', () => {
        const mockBackEndSd: IDocument = {
          "createdAt": new Date("2020-06-12T20:12:28.201Z"),
          "__t": "storageDocument",
          "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
          "createdByEmail": "foo@foo.com",
          "status": "VOID",
          "documentNumber": "GBR-2020-SD-C90A88218",
          "requestByAdmin": false,
          "audit": [{
            "eventType": AuditEventTypes.PreApproved,
            "triggeredBy": "Bob",
            "timestamp": new Date(),
            "data": null
          }, {
            "eventType": AuditEventTypes.Investigated,
            "triggeredBy": "Bob",
            "timestamp": new Date(),
            "data": null
          }],
          "userReference": "My Reference",
          "exportData": {
            "exporterDetails": {
              "contactId": "a contact id",
              "accountId": "an account id",
              "exporterCompanyName": "Exporter Ltd",
              "addressOne": "Building Name",
              "townCity": "Town",
              "_dynamicsAddress": { "dynamicsData": 'original address' },
              "_dynamicsUser": {
                "firstName": 'Bob',
                "lastName": 'Exporter'
              }
            },
            "catches": [{
              "product": "Atlantic herring (HER)",
              "commodityCode": "0345603",
              "productWeight": "1000",
              "dateOfUnloading": "12/06/2020",
              "placeOfUnloading": "Dover",
              "transportUnloadedFrom": "BA078",
              "certificateNumber": "GBR-3453-3453-3443",
              "weightOnCC": "1000"
            }],
            "storageFacilities": [{
              "facilityName": "Exporter Person",
              "facilityAddressOne": "Building Name",
              "facilityAddressTwo": "Building Street",
              "facilityTownCity": "Town",
              "facilityPostcode": "XX12 X34"
            }],
            "transportation": {
              "vehicle": "truck",
              "cmr": true
            },
            "arrivalTransportation": [{
              "id": '0',
              "vehicle": "truck",
              "departurePlace": "Hull",
              "nationalityOfVehicle": "Uk",
              "registrationNumber": "ABC",
              "freightBillNumber": "ABC123",
              "departureCountry": "United Kingdom",
              "departurePort": "Hull",
              "exportDate": "2023-08-31"
            }, {
              "id": '0',
              "vehicle": "plane",
              "departurePlace": "Hull",
              "flightNumber": "SK123",
              "containerNumber": "CON121",
              "freightBillNumber": "ABC123",
              "departureCountry": "United Kingdom",
              "departurePort": "Hull",
              "exportDate": "2023-08-31",
            }, {
              "id": '0',
              "vehicle": "train",
              "railwayBillNumber": "ABC123",
              "freightBillNumber": "ABC123",
              "departureCountry": "United Kingdom",
              "departurePort": "Hull",
              "exportDate": "2023-08-31",
            }, {
              "id": '0',
              "vehicle": "containerVessel",
              "departurePlace": "Hull",
              "vesselName": "",
              "flagState": "",
              "containerNumber": "CON121",
              "freightBillNumber": "ABC123",
              "departureCountry": "United Kingdom",
              "departurePort": "Hull",
              "exportDate": "2023-08-31",
            }, {
              "id": '0',
              "vehicle": "unknown",
              "departurePlace": "Hull",
              "nationalityOfVehicle": "",
              "registrationNumber": "",
              "freightBillNumber": "",
              "departureCountry": "United Kingdom",
              "departurePort": "Hull",
              "exportDate": "2023-08-31",
            }
            ],
          },
          "numberOfFailedAttempts": 5
        };

        const expectedResult: CertificateCompany = {
          companyName: "Exporter Ltd",
          address: {
            line1: "Building Name",
            city: "Town"
          },
          contactId: 'a contact id',
          accountId: 'an account id',
          dynamicsAddress: { dynamicsData: 'original address' }
        };
        const result: IDefraValidationStorageDocument = toSdDefraReport("GBR-PS-32432-234234", "", DocumentStatuses.Void, requestByAdmin, mockBackEndSd);
        expect(result.exporterDetails).toEqual(expectedResult)
      });

      it('will contain the exporter number', () => {

        const result: IDefraValidationStorageDocument = toSdDefraReport("GBR-SD-32432-2342IVINA34", "", DocumentStatuses.Complete, requestByAdmin, backEndSd)

        expect(result.exporterDetails?.contactId).toEqual("a contact id");
        expect(result.exporterDetails?.accountId).toEqual("an account id");
      });

    });

    describe("For products", () => {
      it('will not include all the required properties for a product if none provided', () => {
        const result = toDefraSdProduct(undefined);

        expect(result).toBeUndefined();
      });

      it('will include all the required properties for a product', () => {
        const sdCatch = {
          product: "Atlantic herring (HER)",
          scientificName: "Clupea harengus",
          commodityCode: "1234",
          productWeight: "1000",
          dateOfUnloading: "11/06/2020",
          placeOfUnloading: "Dover",
          transportUnloadedFrom: "BA078",
          certificateNumber: "12345",
          weightOnCC: "1000",
          certificateType: "uk"
        };

        const expectedResult: StorageDocumentReportCatch = {
          species: "Atlantic herring (HER)",
          scientificName: "Clupea harengus",
          productWeight: 1000,
          dateOfUnloading: "11/06/2020",
          placeOfUnloading: "Dover",
          transportUnloadedFrom: "BA078",
          certificateNumber: "12345",
          weightOnCertificate: 1000,
          cnCode: "1234",
          isDocumentIssuedInUK: true
        };

        const result = toDefraSdProduct(sdCatch);

        expect(result).toEqual(expectedResult);
      });

      it('will include a products array in the return results', () => {
        const expectedResult: StorageDocumentReportCatch[] = [{
          species: "Atlantic herring (HER)",
          scientificName: "Clupea harengus",
          productWeight: 1000,
          dateOfUnloading: "12/06/2020",
          placeOfUnloading: "Dover",
          transportUnloadedFrom: "BA078",
          certificateNumber: "GBR-3453-3453-3443",
          weightOnCertificate: 1000,
          cnCode: "0345603",
          isDocumentIssuedInUK: true
        }];

        const result: IDefraValidationStorageDocument = toSdDefraReport("GBR-PS-32432-234234", "", DocumentStatuses.Void, requestByAdmin, backEndSd);
        expect(result.products).toEqual(expectedResult)
      });
    });

    describe("For Storage Facilities", () => {
      it('will not include all the required storage facility properties if none provided', () => {
        const result = toDefraSdStorageFacility(undefined);

        expect(result).toBeUndefined();
      });

      it('will include all the required properties for a storage facility', () => {
        const sdStorageFacility = {
          facilityName: "Exporter Person",
          facilityAddressOne: "Building Name",
          facilityTownCity: "Town",
          facilityPostcode: "XX12 X34"
        };

        const expectedResult: CertificateStorageFacility = {
          name: 'Exporter Person',
          address: {
            line1: "Building Name",
            city: "Town",
            postCode: "XX12 X34"
          }
        };

        const result = toDefraSdStorageFacility(sdStorageFacility);

        expect(result).toEqual(expectedResult);
      });

      it('will include all the optional properties for a storage facility', () => {
        const sdStorageFacility = {
          facilityName: "Exporter Person",
          facilityAddressOne: "Building Name",
          facilityBuildingName: "FacilityBuildingName",
          facilityBuildingNumber: "FacilityBuildingNumber",
          facilitySubBuildingName: "FacilitySubBuildingName",
          facilityStreetName: "FacilityStreetName",
          facilityCountry: "FacilityCountry",
          facilityCounty: "FacilityCounty",
          facilityTownCity: "Town",
          facilityPostcode: "XX12 X34"
        };

        const expectedResult: CertificateStorageFacility = {
          name: 'Exporter Person',
          address: {
            line1: "Building Name",
            building_name: "FacilityBuildingName",
            building_number: "FacilityBuildingNumber",
            sub_building_name: "FacilitySubBuildingName",
            street_name: "FacilityStreetName",
            country: "FacilityCountry",
            county: "FacilityCounty",
            city: "Town",
            postCode: "XX12 X34"
          }
        };

        const result = toDefraSdStorageFacility(sdStorageFacility);

        expect(result).toEqual(expectedResult);
      });

      it('will include a storage facility array in the return results', () => {
        const expectedResult: CertificateStorageFacility[] = [{
          name: 'Exporter Person',
          address: {
            line1: "Building Name",
            city: "Town",
            postCode: "XX12 X34"
          }
        }];

        const result: IDefraValidationStorageDocument = toSdDefraReport("GBR-SD-32432-234234", "", DocumentStatuses.Void, requestByAdmin, backEndSd);
        expect(result.storageFacilities).toEqual(expectedResult);
      });

      it('will include approval Number and product handling in the return results', () => {
        const backEndWithSdStorageFacility = {
          ...backEndSd,
          exportData: {
            ...backEndSd.exportData,
            storageFacilities: [{
              facilityName: "Exporter Person",
              facilityAddressOne: "Building Name",
              facilityAddressTwo: "Building Street",
              facilityTownCity: "Town",
              facilityPostcode: "XX12 X34",
              facilityApprovalNumber: "approval number",
              facilityStorage: "product handling"
            }],
          }
        }
        const expectedResult: CertificateStorageFacility[] = [{
          name: 'Exporter Person',
          address: {
            line1: "Building Name",
            city: "Town",
            postCode: "XX12 X34"
          },
          approvalNumber: "approval number",
          productHandling: "product handling"
        }];

        const result: IDefraValidationStorageDocument = toSdDefraReport("GBR-SD-32432-234234", "", DocumentStatuses.Void, requestByAdmin, backEndWithSdStorageFacility);
        expect(result.storageFacilities).toEqual(expectedResult);
      });
    });
  });

  describe('when document status is COMPLETE', () => {

    it('will map all required fields correctly - arrival transportation PLANE', () => {
      const backEndSd: IDocument = {
        "createdAt": new Date("2020-06-12T20:12:28.201Z"),
        "__t": "storageDocument",
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "createdByEmail": "foo@foo.com",
        "status": "DRAFT",
        "documentNumber": "GBR-2020-SD-C90A88218",
        "clonedFrom": "GBR-2023-SD-C3A82642B",
        "parentDocumentVoid": false,
        "requestByAdmin": false,
        "investigation": [],
        "audit": [{
          "eventType": AuditEventTypes.PreApproved,
          "triggeredBy": "Bob",
          "timestamp": new Date(),
          "data": null
        }, {
          "eventType": AuditEventTypes.Investigated,
          "triggeredBy": "Bob",
          "timestamp": new Date(),
          "data": null
        }],
        "userReference": "My Reference",
        "exportData": {
          "exporterDetails": {
            "exporterCompanyName": "Exporter Ltd",
            "addressOne": "Building Name",
            "addressTwo": "Building Street",
            "townCity": "Town",
            "postcode": "IM1 3AA",
            "_dynamicsAddress": { "dynamicsData": 'original address' },
            "_dynamicsUser": {
              "firstName": "Bob",
              "lastName": "Exporter"
            }
          },
          "catches": [{
            "product": "Atlantic herring (HER)",
            "scientificName": "Clupea harengus",
            "commodityCode": "0345603",
            "productWeight": "1000",
            "dateOfUnloading": "12/06/2020",
            "placeOfUnloading": "Dover",
            "transportUnloadedFrom": "BA078",
            "certificateNumber": "GBR-3453-3453-3443",
            "weightOnCC": "1000"
          }],
          "storageFacilities": [{
            "facilityName": "Exporter Person",
            "facilityAddressOne": "Building Name",
            "facilityAddressTwo": "Building Street",
            "facilityTownCity": "Town",
            "facilityPostcode": "XX12 X34"
          }],
          "transportation": {
            "vehicle": "truck",
            "cmr": true
          },
          "exportedTo": {
            "officialCountryName": "Nigeria",
            "isoCodeAlpha2": "NG",
            "isoCodeAlpha3": "NGA",
            "isoNumericCode": "566"
          },
          "arrivalTransportation": {
            "vehicle": "plane",
            "flightNumber": "AF296Q",
            "containerNumbers": "ABCD12345670,ABCD12345671,ABCD12345672,ABCD1234563",
            "airwayBillNumber": "123-45678901",
            "freightBillNumber": "BD51SMR",
            "departureCountry": "Algeria",
            "departurePort": "Port",
            "departureDate": "06/10/2025"
          }
        },
        "documentUri": "_0d8f98a1-c372-47c4-803f-dafd642c4941.pdf"
      };

      const result: IDefraValidationStorageDocument = toSdDefraReport('GBR-2020-SD-C90A88218', correlationId, 'COMPLETE', requestByAdmin, backEndSd);
      expect(result.failedSubmissions).toBe(0);
      expect(result.arrivalTransportation?.airwaybillNumber).toBe("123-45678901");
      expect(result.arrivalTransportation?.containerId).toBe("ABCD12345670,ABCD12345671,ABCD12345672,ABCD1234563");
      expect(result.arrivalTransportation?.freightbillNumber).toBe("BD51SMR");
    });

    it('will map all required fields correctly - arrival transportation CONTAINER VESSEL', () => {
      const backEndSd: IDocument = {
        "createdAt": new Date("2020-06-12T20:12:28.201Z"),
        "__t": "storageDocument",
        "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "createdByEmail": "foo@foo.com",
        "status": "DRAFT",
        "documentNumber": "GBR-2020-SD-C90A88218",
        "clonedFrom": "GBR-2023-SD-C3A82642B",
        "parentDocumentVoid": false,
        "requestByAdmin": false,
        "investigation": [],
        "audit": [{
          "eventType": AuditEventTypes.PreApproved,
          "triggeredBy": "Bob",
          "timestamp": new Date(),
          "data": null
        }, {
          "eventType": AuditEventTypes.Investigated,
          "triggeredBy": "Bob",
          "timestamp": new Date(),
          "data": null
        }],
        "userReference": "My Reference",
        "exportData": {
          "exporterDetails": {
            "exporterCompanyName": "Exporter Ltd",
            "addressOne": "Building Name",
            "addressTwo": "Building Street",
            "townCity": "Town",
            "postcode": "IM1 3AA",
            "_dynamicsAddress": { "dynamicsData": 'original address' },
            "_dynamicsUser": {
              "firstName": "Bob",
              "lastName": "Exporter"
            }
          },
          "catches": [{
            "product": "Atlantic herring (HER)",
            "scientificName": "Clupea harengus",
            "commodityCode": "0345603",
            "productWeight": "1000",
            "dateOfUnloading": "12/06/2020",
            "placeOfUnloading": "Dover",
            "transportUnloadedFrom": "BA078",
            "certificateNumber": "GBR-3453-3453-3443",
            "weightOnCC": "1000"
          }],
          "storageFacilities": [{
            "facilityName": "Exporter Person",
            "facilityAddressOne": "Building Name",
            "facilityAddressTwo": "Building Street",
            "facilityTownCity": "Town",
            "facilityPostcode": "XX12 X34"
          }],
          "transportation": {
            "vehicle": "plane",
            "departurePlace": "Hull",
            "flightNumber": "SK123",
            "containerNumber": "CON121",
            "freightBillNumber": "ABC123",
            "departureCountry": "United Kingdom",
            "departurePort": "Hull",
            "exportDate": "2023-08-31",
          },
          "exportedTo": {
            "officialCountryName": "Nigeria",
            "isoCodeAlpha2": "NG",
            "isoCodeAlpha3": "NGA",
            "isoNumericCode": "566"
          },
          "arrivalTransportation": {
            "vehicle": "containerVessel",
            "vesselName": "Felicity Ace",
            "flagState": "Greece",
            "containerNumbers": "ABCD12345670,ABCD12345671,ABCD12345672,ABCD1234563",
            "freightBillNumber": "AA1234567",
            "departureCountry": "Afghanistan",
            "departurePort": "Calais port",
            "departureDate": "06/10/2025"
          }
        },
        "documentUri": "_0d8f98a1-c372-47c4-803f-dafd642c4941.pdf"
      };

      const result: IDefraValidationStorageDocument = toSdDefraReport('GBR-2020-SD-C90A88218', correlationId, 'COMPLETE', requestByAdmin, backEndSd);
      expect(result.failedSubmissions).toBe(0);
      expect(result.arrivalTransportation?.containerId).toBe("ABCD12345670,ABCD12345671,ABCD12345672,ABCD1234563");
      expect(result.arrivalTransportation?.freightbillNumber).toBe("AA1234567");
    });
  });
});

describe('ccQueryResult to defraValidationReport', () => {

  const ccQueryResult: ICcQueryResult = {
    documentNumber: 'Cert Id',
    documentType: 'CC',
    status: 'a status',
    createdAt: 'a date',
    rssNumber: 'a rss number',
    da: 'da',
    dateLanded: 'a date',
    species: 'species name ',
    weightFactor: 1,
    weightOnCert: 2,
    rawWeightOnCert: 3,
    weightOnAllCerts: 4,
    weightOnAllCertsBefore: 5,
    weightOnAllCertsAfter: 6,
    isLandingExists: true,
    isSpeciesExists: true,
    numberOfLandingsOnDay: 10,
    weightOnLanding: 20,
    landingTotalBreakdown: [
      {
        source: 'a source',
        isEstimate: true,
        factor: 20,
        weight: 25,
        liveWeight: 30
      }],
    weightOnLandingAllSpecies: 40,
    isOverusedThisCert: true,
    isOverusedAllCerts: true,
    isExceeding14DayLimit: false,
    overUsedInfo: [],
    durationSinceCertCreation: 'something',
    durationBetweenCertCreationAndFirstLandingRetrieved: "some data",
    durationBetweenCertCreationAndLastLandingRetrieved: 'some more data',
    extended: {}
  };

  it('should return  minimum defraValidationReport for any ICcQueryResult is given', function () {

    const result: IDefraValidationReport = ccQueryResultToDefraValidationReport(ccQueryResult);

    expect(result).toMatchObject({ certificateId: 'Cert Id', status: 'a status' });
    expect(result).toHaveProperty('lastUpdated');
  });

  it('should return landingId if extended.landing is given', () => {
    ccQueryResult.extended = {
      landingId: 'a landing id'
    };

    const result: IDefraValidationReport = ccQueryResultToDefraValidationReport(ccQueryResult);

    expect(result).toMatchObject({ landingId: 'a landing id' });
  });

  it('should return isUnblocked true  if extended.PreApprovedBy is populated', () => {
    ccQueryResult.extended = {
      PreApprovedBy: 'a name'
    };

    const result: IDefraValidationReport = ccQueryResultToDefraValidationReport(ccQueryResult);

    expect(result.isUnblocked).toBe(true);
  });

});

describe('toLandings', () => {
  const queryTime = moment.utc()
  const input: ICcQueryResult = {
    documentNumber: 'CC1',
    documentType: 'catchCertificate',
    createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
    status: 'COMPLETE',
    rssNumber: 'rssWA1',
    da: 'Guernsey',
    startDate: moment.utc('2019-07-10').format('YYYY-MM-DD'),
    dateLanded: moment.utc('2019-07-10').format('YYYY-MM-DD'),
    species: 'LBE',
    weightOnCert: 121,
    rawWeightOnCert: 122,
    weightOnAllCerts: 200,
    weightOnAllCertsBefore: 0,
    weightOnAllCertsAfter: 100,
    weightFactor: 5,
    gearType: "Type 1",
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
    firstDateTimeLandingDataRetrieved: moment.utc('2023-01-01T00:00:00.000Z').toISOString(),
    extended: {
      landingId: 'rssWA12019-07-10',
      exporterName: 'Mr Bob',
      exporterPostCode: 'SE1 2XX',
      exportTo: 'Italy',
      presentation: 'SLC',
      presentationName: 'sliced',
      vessel: 'DAYBREAK',
      fao: 'FAO27',
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
      pln: 'WA1',
      flag: 'GBR',
      cfr: 'GBRC20514',
      species: 'Lobster',
      state: 'FRE',
      stateName: 'fresh',
      commodityCode: '1234',
      commodityCodeAdmin: '1234 - ADMIN',
      investigation: {
        investigator: "Investigator Gadget",
        status: InvestigationStatus.Open
      },
      transportationVehicle: 'directLanding',
      isLegallyDue: false,
      dataEverExpected: true,
      landingDataExpectedDate: '2023-02-05',
      landingDataEndDate: '2023-02-06'
    }
  }

  let mockLicenceLookUp: jest.SpyInstance;
  let mockVesselLookup: jest.SpyInstance;

  beforeEach(() => {
    mockLicenceLookUp = jest.fn().mockImplementation(() => ({
      vesselLength: 10,
      adminPort: 'testPort',
      flag: 'GBR',
      rssNumber: 'some-rssNumber',
      da: 'England',
      homePort: 'some-home-port',
      imoNumber: null,
      licenceNumber: 'licence-number',
      licenceValidTo: '2023-01-01',
      licenceHolder: 'some licence holder'
    }));
    mockVesselLookup = jest.spyOn(Transformations, 'vesselLookup').mockImplementation(() => mockLicenceLookUp);
  });

  afterEach(() => {
    mockLicenceLookUp.mockRestore();
    mockVesselLookup.mockRestore();
  });

  it('should map all 1 to 1 root properties that require no behaviour', () => {
    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].exportWeight).toEqual(121);
    expect(result[0].daysWithNoLandingData).toEqual("0.0.0.0");
    expect(result[0].isDirectLanding).toEqual(true);
    expect(result[0].totalWeightRecordedAgainstLanding).toEqual(30);
    expect(result[0].totalWeightExported).toEqual(200);
    expect(result[0].totalWeightExported).toEqual(200);
    expect(result[0].isNoLandingDataTimeExceeded).toEqual(false);
    expect(result[0].exportWeightFactor).toEqual(5);
    expect(result[0].landingBreakdown).toEqual([
      {
        factor: 1,
        isEstimate: true,
        weight: 30,
        liveWeight: 30,
        source: LandingSources.CatchRecording
      }
    ]);
    expect(result[0].isLandingDataAvailable).toEqual(true);
    expect(result[0].rss).toEqual('rssWA1');
    expect(result[0].isSpeciesMisMatch).toEqual(false);
    expect(result[0].isOveruse).toEqual(true);
    expect(result[0].isExporterLandingOveruse).toEqual(true);
    expect(result[0].isValidationFailed).toEqual(true);
    expect(result[0].gearType).toEqual('Type 1');
    expect(result[0].highSeasArea).toEqual('yes');
    expect(result[0].exclusiveEconomicZones).toEqual([
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
    ]);
    expect(result[0].rfmo).toEqual('General Fisheries Commission for the Mediterranean (GFCM)');
    expect(result[0].exclusiveEconomicZones).toEqual([
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
    ]);
    expect(result[0].startDate).toEqual('2019-07-10');
    expect(result[0].date).toEqual('2019-07-10');
    expect(result[0].cnCode).toEqual('1234');
    expect(result[0].isLegallyDue).toBe(false);
  });

  it('will show the amount you are exceeded by for actual landings', () => {
    const input: ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: moment.utc('2019-07-10').format('YYYY-MM-DD'),
      species: 'LBE',
      weightOnCert: 200,
      rawWeightOnCert: 200,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 200,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 60,
      weightOnLandingAllSpecies: 60,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: false,
          weight: 30,
          liveWeight: 30,
          source: LandingSources.LandingDeclaration
        },
        {
          factor: 1,
          isEstimate: false,
          weight: 30,
          liveWeight: 30,
          source: LandingSources.LandingDeclaration
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
        exporterPostCode: 'XX1 2XX',
        presentation: 'SLC',
        presentationName: 'sliced',
        vessel: 'DAYBREAK',
        fao: 'FAO27',
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
        pln: 'WA1',
        species: 'Lobster',
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '1234',
        investigation: {
          investigator: "Investigator Gadget",
          status: InvestigationStatus.Open
        }
      }
    }

    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].landedWeightExceededAmount).toEqual(140);
  });

  it('will show the amount you are exceeded by for estimated landings with the 10% tolerance', () => {
    const input: ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: moment.utc('2019-07-10').format('YYYY-MM-DD'),
      species: 'LBE',
      weightOnCert: 200,
      rawWeightOnCert: 200,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 200,
      weightFactor: 5,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 60,
      weightOnLandingAllSpecies: 60,
      landingTotalBreakdown: [
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: LandingSources.ELog
        },
        {
          factor: 1,
          isEstimate: true,
          weight: 30,
          liveWeight: 30,
          source: LandingSources.ELog
        }
      ],
      overUsedInfo: [],
      isOverusedThisCert: true,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: false,
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
        exporterPostCode: 'XX1 2XX',
        presentation: 'SLC',
        presentationName: 'sliced',
        vessel: 'DAYBREAK',
        fao: 'FAO27',
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
        pln: 'WA1',
        species: 'Lobster',
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '1234',
        investigation: {
          investigator: "Investigator Gadget",
          status: InvestigationStatus.Open
        }
      }
    }

    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].landedWeightExceededAmount).toEqual(134);
  })

  it('should map fully qualified urls for external information', () => {
    ApplicationConfig.prototype.internalAppUrl = "http://localhost:6500"

    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].rawLandingsDataUrl)
      .toEqual(`http://localhost:6500/reference/api/v1/extendedData/rawLandings?dateLanded=2019-07-10&rssNumber=rssWA1`);
    expect(result[0].rawSalesNotesDataUrl)
      .toEqual(`http://localhost:6500/reference/api/v1/extendedData/salesNotes?dateLanded=2019-07-10&rssNumber=rssWA1`);
  });

  it('should map the species code and name', () => {
    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].species).toEqual({
      name: "Lobster",
      code: "LBE"
    });
  });

  it('should map the state name and code', () => {
    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].state).toEqual({
      name: "fresh",
      code: "FRE"
    });
  });

  it('should map the presentation name and code', () => {
    const result: CertificateLanding[] = toLandings([input]);
    expect(result[0].presentation).toEqual({
      name: "sliced",
      code: "SLC"
    });
  });

  it('should map a vessel over 10M', () => {
    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].vessel).toEqual({
      name: "DAYBREAK",
      pln: "WA1",
      length: 10,
      fao: "FAO27",
      flag: "GBR",
      cfr: "GBRC20514"
    });
  });

  it('should map a vessel less than 10M', () => {
    mockLicenceLookUp = jest.fn().mockImplementation(() => ({
      vesselLength: 8,
      adminPort: 'testPort',
      flag: 'GBR',
      rssNumber: 'some-rssNumber',
      da: 'England',
      homePort: 'some-home-port',
      imoNumber: null,
      licenceNumber: 'licence-number',
      licenceValidTo: '2023-01-01',
      licenceHolder: 'some licence holder'
    }));

    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].vessel).toEqual({
      name: "DAYBREAK",
      pln: "WA1",
      length: 8,
      fao: "FAO27",
      flag: "GBR",
      cfr: "GBRC20514"
    });
  })

  it('should map correctly the isLegally due', () => {
    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].isLegallyDue).toBe(false);
  })

  it('should map isSpeciesMisMatch as false when no landing exists', () => {
    const input: ICcQueryResult = {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: moment.utc('2019-07-10').format('YYYY-MM-DD'),
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
      landingTotalBreakdown: [],
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
        pln: 'WA1',
        species: 'Lobster',
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '1234',
        investigation: {
          investigator: "Investigator Gadget",
          status: InvestigationStatus.Open
        },
        transportationVehicle: 'directLanding'
      }
    }

    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].isSpeciesMisMatch).toEqual(false);
  });

  it('should map a cfr and a flag', () => {
    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].vessel.cfr).toBe("GBRC20514");
    expect(result[0].vessel.flag).toBe("GBR");
  });

  it('should map the validation out when vessel details is undefined', () => {
    mockLicenceLookUp.mockReturnValue(undefined);

    const result: CertificateLanding[] = toLandings([{
      ...input,
      extended: {
        ...input.extended,
        cfr: undefined
      }
    }]);

    expect(result).toBeDefined();
  });

  it('should map EoD related data', () => {
    const result: CertificateLanding[] = toLandings([input]);

    expect(result[0].vesselAdministration).toBe('Guernsey');
    expect(result[0].dataEverExpected).toBe(true);
    expect(result[0].landingDataExpectedDate).toBe('2023-02-05');
    expect(result[0].landingDataEndDate).toBe('2023-02-06');
    expect(result[0].landingDataExpectedAtSubmission).toBe(false);
    expect(result[0].isLate).toBe(false);
    expect(result[0].dateDataReceived).toBe('2023-01-01T00:00:00.000Z');
  })
});

describe('toCatches', () => {

  it('should map ISdpsQueryResult', () => {

    const input: ISdPsQueryResult = {
      documentNumber: "PS1",
      catchCertificateNumber: "PS2",
      documentType: "PS",
      createdAt: "2020-01-01",
      status: "COMPLETE",
      species: "COD",
      scientificName: "Aspidophoroides bartoni",
      commodityCode: "FRESHCOD",
      weightOnDoc: 100,
      weightOnAllDocs: 150,
      weightOnFCC: 200,
      weightAfterProcessing: 80,
      isOverAllocated: false,
      overUsedInfo: [],
      isMismatch: false,
      overAllocatedByWeight: 0,
      da: null,
      extended: {
        id: 'SDHSADJHSDHASDSD-1610018839',
      }
    };

    const result = toCatches([input]);

    expect(result).toEqual([{
      species: "COD",
      scientificName: "Aspidophoroides bartoni",
      catchCertificateNumber: "PS2",
      totalWeightLanded: 200,
      exportWeightBeforeProcessing: 100,
      exportWeightAfterProcessing: 80,
      isOverUse: false,
      hasWeightMismatch: false,
      importWeightExceededAmount: 0,
      cnCode: "FRESHCOD",
      isDocumentIssuedInUK: false
    }]);

  });

});

describe('toProduct', () => {

  it('should map ISdPsQueryResult', () => {
    const queryResult: ISdPsQueryResult[] = [{
      documentNumber: "SD1",
      catchCertificateNumber: "SD2",
      documentType: "SD",
      createdAt: "2020-01-01",
      status: "COMPLETE",
      species: "COD",
      scientificName: "Aspidophoroides bartoni",
      commodityCode: "FRESHCOD",
      weightOnDoc: 100,
      weightOnAllDocs: 150,
      weightOnFCC: 200,
      isOverAllocated: false,
      overUsedInfo: [],
      isMismatch: false,
      overAllocatedByWeight: 0,
      da: null,
      extended: {
        id: 'SD2-1610018839',
      },
      dateOfUnloading: "12/12/2019",
      placeOfUnloading: "DOVER",
      transportUnloadedFrom: "BA078",
      productDescription: "Fresh cod",
      supportingDocuments: "GBR-2025-CC-ABB235F7F, GBR-2024-CC-BEFCD6036, GBR-2025-SD-6FFEAE1A1",
      netWeightProductArrival: "100",
      netWeightFisheryProductArrival: "110",
      netWeightProductDeparture: "90",
      netWeightFisheryProductDeparture: "95"

    }];

    const result = toProducts(queryResult);

    expect(result).toEqual([{
      species: "COD",
      scientificName: "Aspidophoroides bartoni",
      productWeight: 100,
      dateOfUnloading: "12/12/2019",
      placeOfUnloading: "DOVER",
      transportUnloadedFrom: "BA078",
      certificateNumber: "SD2",
      weightOnCertificate: 200,
      cnCode: "FRESHCOD",
      isOverUse: false,
      isImportWeightMismatch: false,
      overUseExceededAmount: 0,
      productDescription: "Fresh cod",
      supportingDocuments: "GBR-2025-CC-ABB235F7F, GBR-2024-CC-BEFCD6036, GBR-2025-SD-6FFEAE1A1",
      netWeightProductArrival: "100",
      netWeightFisheryProductArrival: "110",
      netWeightProductDeparture: "90",
      netWeightFisheryProductDeparture: "95",
      isDocumentIssuedInUK: false
    }]);
  })
});

describe('For transportation', () => {

  it('will include all the required transportation properties when provided', () => {
    const result = toTransportation(undefined);

    expect(result).toEqual(undefined);
  });

  describe('For Truck', () => {
    it('will include the correct set of properties when exporter has transport document', () => {
      const truckTransport = {
        vehicle: "truck",
        cmr: true
      };

      const expectedResult: CertificateTransport = {
        modeofTransport: 'truck',
        hasRoadTransportDocument: true
      };

      const result = toTransportation(truckTransport);

      expect(result).toEqual(expectedResult);
    });

    it('will include the correct set of properties when exporter has not got transport document', () => {
      const truckTransport = {
        vehicle: "truck",
        cmr: false,
        nationalityOfVehicle: "UK",
        registrationNumber: "WE893EF",
        departurePlace: "Telford",
        exportDate: "14/06/2019"
      }

      const expectedResult: CertificateTransport = {
        modeofTransport: 'truck',
        hasRoadTransportDocument: false,
        nationality: "UK",
        registration: "WE893EF",
        exportLocation: "Telford",
        exportDate: "14/06/2019"
      };

      const result = toTransportation(truckTransport);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('For Train', () => {
    it('will include the correct set of properties', () => {
      const trainTransport = {
        vehicle: "train",
        railwayBillNumber: "1234",
        departurePlace: "Telford",
        exportDate: "03/05/2020"
      };

      const expectedResult: CertificateTransport = {
        modeofTransport: 'train',
        billNumber: "1234",
        exportLocation: "Telford",
        exportDate: "03/05/2020"
      };

      const result = toTransportation(trainTransport);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('For Plane', () => {
    it('will include the correct set of properties', () => {
      const planeTransport = {
        vehicle: "plane",
        flightNumber: "BA078",
        containerNumber: "1234",
        departurePlace: "Telford",
        exportDate: "30/05/2020"
      };

      const expectedResult: CertificateTransport = {
        modeofTransport: 'plane',
        flightNumber: "BA078",
        containerId: "1234",
        exportLocation: "Telford",
        exportDate: "30/05/2020"
      };

      const result = toTransportation(planeTransport);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('For Container Vessel', () => {
    it('will include the correct set of properties', () => {
      const vesselTransport = {
        vehicle: "containerVessel",
        vesselName: "WIRON 5",
        flagState: "UK",
        containerNumber: "1234",
        departurePlace: "Telford",
        exportDate: "30/05/2020"
      };

      const expectedResult: CertificateTransport = {
        modeofTransport: 'vessel',
        name: "WIRON 5",
        flag: "UK",
        containerId: "1234",
        exportLocation: "Telford",
        exportDate: "30/05/2020"
      }

      const result = toTransportation(vesselTransport);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('For DirectLanding', () => {
    it('will include the correct set of properties', () => {
      const directLanding = {
        vehicle: "directLanding",
        exportedFrom: "United Kingdom",
        departurePlace: "Location",
        exportedTo: {
          officialCountryName: "France",
          isoCodeAlpha2: "FR",
          isoCodeAlpha3: "FRA",
          isoNumericCode: "250"
        },
        exportDate: "30/05/2020"
      };

      const expectedResult: CertificateTransport = {
        modeofTransport: "directLanding",
        exportLocation: "Location",
        exportDate: "30/05/2020"
      };

      const result = toTransportation(directLanding);

      expect(result).toEqual(expectedResult);
    });
  });
});

describe('For transportations', () => {

  it('will include all the required transportations properties when provided', () => {
    const result = toTransportations(undefined);

    expect(result).toEqual(undefined);
  });

  describe('For Truck', () => {
    it('will include the correct set of properties when exporter has transport document', () => {
      const truckTransport = {
        "id": "0",
        "freightBillNumber": "0",
        "vehicle": "truck",
        "departurePlace": "Hull",
        "nationalityOfVehicle": "",
        "registrationNumber": "",
        "cmr": false,
        "exportedTo": {
          "officialCountryName": "Nigeria",
          "isoCodeAlpha2": "NG",
          "isoCodeAlpha3": "NGA",
          "isoNumericCode": "566"
        },
        "transportDocuments": [{
          "name": "Invoice",
          "reference": "INV001"
        }]
      };

      const expectedResult: CatchCertificateTransport = {
        modeofTransport: 'truck',
        hasRoadTransportDocument: false,
        nationality: '',
        registration: '',
        id: '0',
        exportLocation: 'Hull',
        freightBillNumber: '0',
        transportDocuments: [{
          "name": "Invoice",
          "reference": "INV001"
        }],
      };

      const result = toTransportations(truckTransport);

      expect(result).toEqual(expectedResult);
    });

    it('will include the correct set of properties when exporter has not got transports document', () => {
      const truckTransport = {
        vehicle: "truck",
        nationalityOfVehicle: "UK",
        registrationNumber: "WE893EF",
        departurePlace: "Telford",
        freightBillNumber: "0",
        cmr: false,
        id: "0",
        transportDocuments: [{
          "name": "Invoice",
          "reference": "INV001"
        }]
      }

      const expectedResult: CatchCertificateTransport = {
        modeofTransport: 'truck',
        hasRoadTransportDocument: false,
        nationality: "UK",
        registration: "WE893EF",
        exportLocation: "Telford",
        freightBillNumber: "0",
        id: "0",
        transportDocuments: [{
          "name": "Invoice",
          "reference": "INV001"
        }]
      };

      const result = toTransportations(truckTransport);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('For Train', () => {
    it('will include the correct set of properties', () => {
      const trainTransport = {
        vehicle: "train",
        railwayBillNumber: "1234",
        departurePlace: "Telford",
        freightBillNumber: "0",
        id: "0",
        transportDocuments: [{
          "name": "Invoice",
          "reference": "INV001"
        }]
      };

      const expectedResult: CatchCertificateTransport = {
        modeofTransport: 'train',
        billNumber: "1234",
        exportLocation: "Telford",
        freightBillNumber: "0",
        id: "0",
        transportDocuments: [{
          "name": "Invoice",
          "reference": "INV001"
        }]
      };

      const result = toTransportations(trainTransport);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('For Plane', () => {
    it('will include the correct set of properties', () => {
      const planeTransport = {
        vehicle: "plane",
        flightNumber: "BA078",
        containerNumber: "1234",
        departurePlace: "Telford",
        freightBillNumber: "0",
        id: "0",
        transportDocuments: [{
          "name": "Invoice",
          "reference": "INV001"
        }]
      };

      const expectedResult: CatchCertificateTransport = {
        modeofTransport: 'plane',
        flightNumber: "BA078",
        containerId: "1234",
        exportLocation: "Telford",
        freightBillNumber: "0",
        id: "0",
        transportDocuments: [{
          "name": "Invoice",
          "reference": "INV001"
        }]
      };

      const result = toTransportations(planeTransport);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('For Container Vessel', () => {
    it('will include the correct set of properties', () => {
      const vesselTransport = {
        vehicle: "containerVessel",
        vesselName: "WIRON 5",
        flagState: "UK",
        containerNumber: "1234",
        departurePlace: "Telford",
        freightBillNumber: "0",
        id: "0",
        transportDocuments: [{
          "name": "Invoice",
          "reference": "INV001"
        }]
      };

      const expectedResult: CatchCertificateTransport = {
        modeofTransport: 'vessel',
        name: "WIRON 5",
        flag: "UK",
        containerId: "1234",
        exportLocation: "Telford",
        freightBillNumber: "0",
        id: "0",
        transportDocuments: [{
          "name": "Invoice",
          "reference": "INV001"
        }]
      }

      const result = toTransportations(vesselTransport);

      expect(result).toEqual(expectedResult);
    });
  });
});

const correlationId = 'some-uuid-correlation-id';
const requestByAdmin = false;