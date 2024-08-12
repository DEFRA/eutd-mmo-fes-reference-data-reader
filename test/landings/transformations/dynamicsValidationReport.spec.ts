import moment from "moment";
import * as Shared from "mmo-shared-reference-data";
import { ISdPsQueryResult } from "../../../src/landings/types/query";
import { LandingSources } from "../../../src/landings/types/landing";
import { InvestigationStatus, AuditEventTypes } from "../../../src/landings/types/auditEvent";
import { ApplicationConfig } from "../../../src/config";
import {
  CaseTwoType
} from "../../../src/landings/types/dynamicsCcCase";
import {
  SdPsCaseTwoType,
  SdPsStatus
} from "../../../src/landings/types/dynamicsSdPsCase";
import {
  toPsCatch,
  toDynamicsPs,
  toSdPsCaseTwoType,
  toSdProduct,
  toDynamicsSd,
  toSpeciesCode
} from "../../../src/landings/transformations/dynamicsValidation";
import { CertificateAudit } from '../../../src/landings/types/defraValidation';
import { IDocument } from "../../../src/landings/types/document";
import * as SUT from "../../../src/landings/transformations/dynamicsValidation";
import * as Cache from "../../../src/data/cache";
import * as RiskRating from "../../../src/landings/query/isHighRisk";
import * as VesselService from "../../../src/handler/vesselService";

describe('Dynamics Validation', () => {

  const queryTime = moment.utc();

  const exampleCc: IDocument = {
    "createdAt": new Date("2020-06-24T10:39:32.000Z"),
    "__t": "catchCert",
    "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
    "status": "COMPLETE",
    "documentNumber": "GBR-2020-CC-1BC924FCF",
    "requestByAdmin": false,
    "audit": [
      {
        "eventType": "INVESTIGATED",
        "triggeredBy": "Chris Waugh",
        "timestamp": new Date("2020-06-24T10:40:18.780Z"),
        "data": {
          "investigationStatus": "UNDER_INVESTIGATION"
        }
      },
      {
        "eventType": "INVESTIGATED",
        "triggeredBy": "Chris Waugh",
        "timestamp": new Date("2020-06-24T10:40:23.439Z"),
        "data": {
          "investigationStatus": "CLOSED_NFA"
        }
      }
    ],
    "userReference": "MY REF",
    "exportData": {
      "exporterDetails": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "exporterFullName": "Bob Exporter",
        "exporterCompanyName": "Exporter Co",
        "addressOne": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
        "townCity": "T",
        "postcode": "AB1 1AB",
        "buildingNumber": "123",
        "subBuildingName": "Unit 1",
        "buildingName": "CJC Fish Ltd",
        "streetName": "17  Old Edinburgh Road",
        "county": "West Midlands",
        "country": "England",
        "_dynamicsAddress": { "dynamicsData": 'original address' },
        "_dynamicsUser": {
          "firstName": 'Bob',
          "lastName": 'Exporter'
        }
      },
      "products": [
        {
          "species": "European lobster (LBE)",
          "speciesId": "4e5fff23-184c-4a46-beef-e93ccd040392",
          "speciesCode": "LBE",
          "commodityCode": "03063210",
          "commodityCodeDescription": "Fresh or chilled fillets of cod \"Gadus morhua, Gadus ogac, Gadus macrocephalus\" and of Boreogadus saida",
          "scientificName": "Gadus morhua",
          "state": {
            "code": "ALI",
            "name": "Alive"
          },
          "presentation": {
            "code": "WHL",
            "name": "Whole"
          },
          "factor": 1,
          "caughtBy": [
            {
              "vessel": "WIRON 5",
              "pln": "H1100",
              "id": "5a259dc5-b05c-44fe-8d3f-7ee8cc99bfca",
              "date": "2020-06-24",
              "faoArea": "FAO27",
              "weight": 100
            }
          ]
        },
        {
          "species": "Atlantic cod (COD)",
          "speciesId": "6763576e-c5b8-41cf-a708-f4b9a470623e",
          "speciesCode": "COD",
          "commodityCode": "03025110",
          "state": {
            "code": "FRE",
            "name": "Fresh"
          },
          "presentation": {
            "code": "GUT",
            "name": "Gutted"
          },
          "factor": 1.17,
          "caughtBy": [
            {
              "vessel": "WIRON 5",
              "pln": "H1100",
              "id": "2e9da3e5-5e31-4555-abb4-9e5e53b8d0ef",
              "date": "2020-06-02",
              "faoArea": "FAO27",
              "weight": 200
            },
            {
              "vessel": "WIRON 6",
              "pln": "H2200",
              "id": "4cf6cb44-28ad-4731-bea4-05051ae2edd9",
              "date": "2020-05-31",
              "faoArea": "FAO27",
              "weight": 200
            }
          ]
        }
      ],
      "conservation": {
        "conservationReference": "UK Fisheries Policy"
      },
      "transportation": {
        "vehicle": "truck",
        "exportedFrom": "United Kingdom",
        "exportedTo": {
          "officialCountryName": "Nigeria",
          "isoCodeAlpha2": "NG",
          "isoCodeAlpha3": "NGA",
          "isoNumericCode": "566"
        },
        "cmr": true
      }
    },
    "createdByEmail": "foo@foo.com",
    "documentUri": "_44fd226f-598f-4615-930f-716b2762fea4.pdf",
    "investigation": {
      "investigator": "Chris Waugh",
      "status": "CLOSED_NFA"
    },
    "numberOfFailedAttempts": 5
  }

  const correlationId = 'some-uuid-correlation-id';

  let mockIsQuotaSpecies;
  let mockIsHighRisk;
  let mockGetTotalRiskScore;
  let mockGetExporterRiskScore;

  beforeEach(() => {
    mockIsQuotaSpecies = jest.spyOn(Cache, 'isQuotaSpecies');
    mockIsQuotaSpecies.mockReturnValue(false);

    mockIsHighRisk = jest.spyOn(RiskRating, 'isHighRisk');
    mockIsHighRisk.mockReturnValue(false);

    mockGetTotalRiskScore = jest.spyOn(RiskRating, 'getTotalRiskScore');
    mockGetTotalRiskScore.mockReturnValue(1);

    mockGetExporterRiskScore = jest.spyOn(RiskRating, 'getExporterBehaviourRiskScore');
    mockGetExporterRiskScore.mockReturnValue(1);

  });

  afterEach(() => {
    mockIsQuotaSpecies.mockRestore();
    mockIsHighRisk.mockRestore();
    mockGetTotalRiskScore.mockRestore();
    mockGetExporterRiskScore.mockRestore();
  });

  describe("When mapping from an ICcQueryResult to a IDynamicsCatchCertificateCase", () => {

    const queryTime = moment.utc()

    const input: Shared.ICcQueryResult = {
      documentNumber: 'CC1',
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
      isSpeciesExists: false,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1.7,
          isEstimate: true,
          weight: 30,
          liveWeight: 51,
          source: LandingSources.CatchRecording
        }
      ],
      source: LandingSources.CatchRecording,
      isExceeding14DayLimit: false,
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
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
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
        presentationName: 'sliced',
        vessel: 'DAYBREAK',
        fao: 'FAO27',
        pln: 'WA1',
        species: 'Lobster',
        scientificName: "Gadus morhua",
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '1234',
        commodityCodeDescription: "Fresh or chilled fillets of cod",
        investigation: {
          investigator: "Investigator Gadget",
          status: InvestigationStatus.Open
        },
        transportationVehicle: 'directLanding'
      }
    }

    ApplicationConfig.prototype.externalAppUrl = "http://localhost:3001"

    it('will map the root properties', () => {
      const result = SUT.toDynamicsCcCase([input], exampleCc, correlationId);

      expect(result.documentNumber).toEqual('GBR-2020-CC-1BC924FCF');
      expect(result.caseType1).toEqual('CC');
      expect(result.caseType2).toEqual(CaseTwoType.RealTimeValidation_Rejected)
      expect(result.numberOfFailedSubmissions).toBe(5);
      expect(result.isDirectLanding).toBeTruthy();
      expect(result.da).toEqual('Scotland');
      expect(result.documentUrl).toEqual('http://localhost:3001/qr/export-certificates/_44fd226f-598f-4615-930f-716b2762fea4.pdf');
      expect(result.documentDate).toEqual('2020-06-24T10:39:32.000Z');
      expect(result.landings?.length).toBeGreaterThan(0);
      expect(result.exporter).toEqual({
        address: {
          building_number: "123",
          sub_building_name: "Unit 1",
          building_name: "CJC Fish Ltd",
          street_name: "17  Old Edinburgh Road",
          county: "West Midlands",
          country: "England",
          city: exampleCc.exportData.exporterDetails.townCity,
          line1: exampleCc.exportData.exporterDetails.addressOne,
          postCode: exampleCc.exportData.exporterDetails.postcode,
        },
        dynamicsAddress: { dynamicsData: 'original address' },
        companyName: exampleCc.exportData.exporterDetails.exporterCompanyName,
        contactId: exampleCc.exportData.exporterDetails.contactId,
        accountId: exampleCc.exportData.exporterDetails.accountId,
        fullName: exampleCc.exportData.exporterDetails.exporterFullName
      });
      expect(result._correlationId).toEqual('some-uuid-correlation-id');
      expect(result.requestedByAdmin).toBe(false);
      expect(result.isUnblocked).toBeFalsy();
      expect(result.audits).toBeDefined();
      expect(result.vesselOverriddenByAdmin).toBeFalsy();
      expect(result.failureIrrespectiveOfRisk).toBeTruthy();
      expect(result.exportedTo).toEqual({
        officialCountryName: "Nigeria",
        isoCodeAlpha2: "NG",
        isoCodeAlpha3: "NGA"
      });
    });

    it('will not map the document URL if the document is not COMPLETE', () => {

      const uncompleteCc: IDocument = Object.assign(exampleCc, { status: "DRAFT" });

      ApplicationConfig.prototype.externalAppUrl = "http://localhost:3001";

      const result = SUT.toDynamicsCcCase([input], uncompleteCc, correlationId);

      expect(result.documentUrl).toEqual(undefined);
    });

    it('will map the number of failed submissions', () => {
      const result = SUT.toDynamicsCcCase([input], exampleCc, correlationId);

      expect(result.numberOfFailedSubmissions).toBe(5);
    });

    it('will contain an internal _correlationId', () => {
      const result = SUT.toDynamicsCcCase([input], exampleCc, correlationId);

      expect(result._correlationId).toBeDefined();
    });

    it('will contain a flag to indicate a pre approved validation when provided', () => {
      const result = SUT.toDynamicsCcCase([input], exampleCc, correlationId);

      expect(result.isUnblocked).toBeFalsy();
    });

    it('will contain an audit of admin operations', () => {
      const result = SUT.toDynamicsCcCase([input], exampleCc, correlationId);

      const expected: CertificateAudit[] = [{
        auditOperation: 'INVESTIGATED',
        user: 'Chris Waugh',
        auditAt: expect.any(Date),
        investigationStatus: 'UNDER_INVESTIGATION'
      },
      {
        auditOperation: 'INVESTIGATED',
        user: 'Chris Waugh',
        auditAt: expect.any(Date),
        investigationStatus: 'CLOSED_NFA'
      }];

      expect(result.audits).toStrictEqual(expected);
      expect(result.audits?.length).toBe(2);
    });

    it('will contain a flag to indicate an application via a direct mode of transport', () => {
      const result = SUT.toDynamicsCcCase([input, input], exampleCc, correlationId);

      expect(result.isDirectLanding).toBeTruthy();
    });

    it('will contain a flag to indicate an application via an indirect mode of transport', () => {
      const indirectLanding: Shared.ICcQueryResult = {
        documentNumber: 'CC1',
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
        isSpeciesExists: false,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [
          {
            factor: 1.7,
            isEstimate: true,
            weight: 30,
            liveWeight: 51,
            source: LandingSources.CatchRecording
          }
        ],
        source: LandingSources.CatchRecording,
        isExceeding14DayLimit: false,
        isOverusedThisCert: false,
        isOverusedAllCerts: false,
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
          documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          transportationVehicle: 'any other mode of transport'
        }
      }

      const result = SUT.toDynamicsCcCase([indirectLanding], exampleCc, correlationId);

      expect(result.isDirectLanding).toBeFalsy();
    });

    it('will contain a flag to indicate that a landing has an unlicensed vessel which has been added by an admin', () => {
      const overriddenVesselLanding: Shared.ICcQueryResult = {
        documentNumber: 'CC1',
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
        isSpeciesExists: false,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [
          {
            factor: 1.7,
            isEstimate: true,
            weight: 30,
            liveWeight: 51,
            source: LandingSources.CatchRecording
          }
        ],
        source: LandingSources.CatchRecording,
        isExceeding14DayLimit: false,
        isOverusedThisCert: false,
        isOverusedAllCerts: false,
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
          documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          transportationVehicle: 'any other mode of transport',
          vesselOverriddenByAdmin: true
        }
      }

      const result = SUT.toDynamicsCcCase([input, overriddenVesselLanding], exampleCc, correlationId);

      expect(result.vesselOverriddenByAdmin).toBeTruthy();
    });

  });

  describe("When assigning a case2Type to a IDynamicsCatchCertificateCase", () => {
    it("will contain correct string for RealTimeValidation_Rejected", () => {
      const result = CaseTwoType.RealTimeValidation_Rejected;

      expect(result).toBe("Real Time Validation - Rejected");
    });

    it("will contain correct string for RealTimeValidation_Overuse", () => {
      const result = CaseTwoType.RealTimeValidation_Overuse;

      expect(result).toBe("Real Time Validation - Overuse Failure");
    });

    it("will contain correct string for PendingLandingData", () => {
      const result = CaseTwoType.PendingLandingData;

      expect(result).toBe("Pending Landing Data");
    });

    it("will contain correct string for Success", () => {
      const result = CaseTwoType.Success;

      expect(result).toBe("Real Time Validation - Successful");
    });

    it("will contain correct string for VOID by an exporter", () => {
      const result = CaseTwoType.VoidByExporter;

      expect(result).toBe("Void by an Exporter");
    });
  });

  describe('When mapping to a Case Type 2', () => {

    describe('When validating a single landing', () => {

      let mockIsHighRisk;
      let mockGetTotalRiskScore;
      let mockIsRiskEnabled;
      let mockIsSpeciesFailure;
      let mockIsElog;
      let mockIsWithinDeminimus;

      beforeEach(() => {
        mockIsHighRisk = jest.spyOn(RiskRating, 'isHighRisk');
        mockGetTotalRiskScore = jest.spyOn(RiskRating, 'getTotalRiskScore');
        mockIsRiskEnabled = jest.spyOn(RiskRating, 'isRiskEnabled');
        mockIsSpeciesFailure = jest.spyOn(RiskRating, 'isSpeciesFailure');
        mockIsElog = jest.spyOn(Shared, 'isElog');
        mockIsWithinDeminimus = jest.spyOn(Shared, 'isWithinDeminimus');
      });

      afterEach(() => {
        mockIsHighRisk.mockRestore();
        mockGetTotalRiskScore.mockRestore();
        mockIsRiskEnabled.mockRestore();
        mockIsSpeciesFailure.mockRestore();
        mockIsElog.mockRestore();
        mockIsWithinDeminimus.mockRestore();
      });

      describe('against a Landing dec or Catch Recording', () => {

        describe('When Risk rating is PASS', () => {

          const riskScore = 0.8;
          const isHighRisk = false;

          beforeEach(() => {
            mockIsHighRisk.mockReturnValue(isHighRisk);
            mockGetTotalRiskScore.mockReturnValue(riskScore);
          });

          it('will flag as `Real Time Validation - Successful` if there are no failures', () => {
            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
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
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.CatchRecording
                },
              ],
              source: LandingSources.CatchRecording,
              isOverusedThisCert: false,
              isOverusedAllCerts: false,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob"
              },
            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.Success);
            expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
            expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
          });

          it('will flag as `Real Time Validation - Successful` when species and weight check PASS but over-use FAIL', () => {
            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
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
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.CatchRecording,
                },
              ],
              isOverusedThisCert: false,
              isOverusedAllCerts: true,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob"
              },

            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.Success);
            expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
            expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
          });

          it('will flag as `Real Time Validation - Successful` when species PASS but weight check and over-use FAIL', () => {
            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
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
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.CatchRecording,
                },
              ],
              isOverusedThisCert: true,
              isOverusedAllCerts: true,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob"
              },
            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.Success);
            expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
            expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
          });

          it('will flag as `Real Time Validation - Successful` when species FAIL and species toggle is enabled', () => {
            mockIsRiskEnabled.mockReturnValue(true);

            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
              weightOnCert: 121,
              rawWeightOnCert: 122,
              weightOnAllCerts: 200,
              weightOnAllCertsBefore: 0,
              weightOnAllCertsAfter: 100,
              weightFactor: 5,
              isLandingExists: true,
              isSpeciesExists: false,
              numberOfLandingsOnDay: 1,
              weightOnLanding: 30,
              weightOnLandingAllSpecies: 30,
              landingTotalBreakdown: [
                {
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.CatchRecording,
                },
              ],
              isOverusedThisCert: true,
              isOverusedAllCerts: true,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob"
              },
            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.Success);
            expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
            expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
            expect(mockIsSpeciesFailure).toHaveBeenCalledWith(mockIsHighRisk);
          });

        });

        describe('When Risk rating is FAIL', () => {

          const riskScore = 0.8;
          const isHighRisk = true;

          beforeEach(() => {
            mockIsHighRisk.mockReturnValue(isHighRisk);
            mockGetTotalRiskScore.mockReturnValue(riskScore);
          });

          it('will flag as `Real Time Validation - Successful` if there are no failures', () => {
            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
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
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.CatchRecording
                },
              ],
              source: LandingSources.CatchRecording,
              isOverusedThisCert: false,
              isOverusedAllCerts: false,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob"
              },
            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.Success);
            expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
            expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
          });

          it('will flag as `Real Time Validation - Overuse` when species and weight check PASS but over-use FAIL', () => {
            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
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
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.CatchRecording
                },
              ],
              source: LandingSources.CatchRecording,
              isOverusedThisCert: false,
              isOverusedAllCerts: true,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob"
              },
            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.RealTimeValidation_Overuse);
            expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
            expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
          });

          it('will flag as `Real Time Validation - Rejected` when species PASS but weight check and over-use FAIL', () => {
            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
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
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.CatchRecording
                },
              ],
              source: LandingSources.CatchRecording,
              isOverusedThisCert: true,
              isOverusedAllCerts: true,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob"
              },
            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.RealTimeValidation_Rejected);
            expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
            expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
          });

          it('will flag as `Real Time Validation - Rejected` when species PASS but weight check FAIL and over-use PASS', () => {
            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
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
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.CatchRecording
                },
              ],
              source: LandingSources.CatchRecording,
              isOverusedThisCert: true,
              isOverusedAllCerts: false,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob"
              },
            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.RealTimeValidation_Rejected);
            expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
            expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
          });

          it('will flag as `Real Time Validation - Rejected` when species FAIL and species toggle is enabled', () => {
            mockIsRiskEnabled.mockReturnValue(true);

            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
              weightOnCert: 121,
              rawWeightOnCert: 122,
              weightOnAllCerts: 200,
              weightOnAllCertsBefore: 0,
              weightOnAllCertsAfter: 100,
              weightFactor: 5,
              isLandingExists: true,
              isSpeciesExists: false,
              numberOfLandingsOnDay: 1,
              weightOnLanding: 30,
              weightOnLandingAllSpecies: 30,
              landingTotalBreakdown: [
                {
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.CatchRecording,
                },
              ],
              isOverusedThisCert: true,
              isOverusedAllCerts: true,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob"
              },
            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.RealTimeValidation_Rejected);
            expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
            expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
            expect(mockIsSpeciesFailure).toHaveBeenCalledWith(mockIsHighRisk);
          });
        });

        it('will flag as `Real Time Validation - Rejected` when species FAIL when toggle is disabled', () => {
          mockIsRiskEnabled.mockReturnValue(false);

          const input: Shared.ICcQueryResult[] = [{
            documentNumber: "CC1",
            documentType: "catchCertificate",
            createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
            status: "COMPLETE",
            rssNumber: "rssWA1",
            da: "Guernsey",
            dateLanded: "2019-07-10",
            species: "LBE",
            weightOnCert: 121,
            rawWeightOnCert: 122,
            weightOnAllCerts: 200,
            weightOnAllCertsBefore: 0,
            weightOnAllCertsAfter: 100,
            weightFactor: 5,
            isLandingExists: true,
            isSpeciesExists: false,
            numberOfLandingsOnDay: 1,
            weightOnLanding: 30,
            weightOnLandingAllSpecies: 30,
            landingTotalBreakdown: [
              {
                factor: 1.7,
                isEstimate: true,
                weight: 30,
                liveWeight: 51,
                source: LandingSources.CatchRecording
              },
            ],
            source: LandingSources.CatchRecording,
            isOverusedThisCert: true,
            isOverusedAllCerts: true,
            isExceeding14DayLimit: false,
            overUsedInfo: [],
            durationSinceCertCreation: moment
              .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
              .toISOString(),
            durationBetweenCertCreationAndFirstLandingRetrieved: moment
              .duration(
                moment
                  .utc("2019-07-11T09:00:00.000Z")
                  .diff(moment.utc("2019-07-13T08:26:06.939Z"))
              )
              .toISOString(),
            durationBetweenCertCreationAndLastLandingRetrieved: moment
              .duration(
                moment
                  .utc("2019-07-11T09:00:00.000Z")
                  .diff(moment.utc("2019-07-13T08:26:06.939Z"))
              )
              .toISOString(),
            extended: {
              landingId: "rssWA12019-07-10",
              contactId: "some-contact-id",
              accountId: "some-account-id",
              exporterName: "Mr Bob",
              presentation: "SLC",
              documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
              presentationName: "sliced",
              vessel: "DAYBREAK",
              fao: "FAO27",
              pln: "WA1",
              species: "Lobster",
              state: "FRE",
              stateName: "fresh",
              commodityCode: "1234",
              investigation: {
                investigator: "Investigator Gadget",
                status: InvestigationStatus.Open,
              },
              transportationVehicle: "directLanding",
              licenceHolder: "Mr Bob"
            },
          }];

          const result = SUT.toDynamicsCase2(input);
          expect(result).toEqual(CaseTwoType.RealTimeValidation_Rejected);
        });

        it('will flag as `Real Time Validation - Successful` when species FAIL when toggle is disabled and document is pre approved', () => {
          mockIsRiskEnabled.mockReturnValue(false);

          const input: Shared.ICcQueryResult[] = [{
            documentNumber: "CC1",
            documentType: "catchCertificate",
            createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
            status: "COMPLETE",
            rssNumber: "rssWA1",
            da: "Guernsey",
            dateLanded: "2019-07-10",
            species: "LBE",
            weightOnCert: 121,
            rawWeightOnCert: 122,
            weightOnAllCerts: 200,
            weightOnAllCertsBefore: 0,
            weightOnAllCertsAfter: 100,
            weightFactor: 5,
            isLandingExists: true,
            isSpeciesExists: false,
            numberOfLandingsOnDay: 1,
            weightOnLanding: 30,
            weightOnLandingAllSpecies: 30,
            landingTotalBreakdown: [
              {
                factor: 1.7,
                isEstimate: true,
                weight: 30,
                liveWeight: 51,
                source: LandingSources.CatchRecording
              },
            ],
            source: LandingSources.CatchRecording,
            isOverusedThisCert: true,
            isOverusedAllCerts: true,
            isExceeding14DayLimit: false,
            isPreApproved: true,
            overUsedInfo: [],
            durationSinceCertCreation: moment
              .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
              .toISOString(),
            durationBetweenCertCreationAndFirstLandingRetrieved: moment
              .duration(
                moment
                  .utc("2019-07-11T09:00:00.000Z")
                  .diff(moment.utc("2019-07-13T08:26:06.939Z"))
              )
              .toISOString(),
            durationBetweenCertCreationAndLastLandingRetrieved: moment
              .duration(
                moment
                  .utc("2019-07-11T09:00:00.000Z")
                  .diff(moment.utc("2019-07-13T08:26:06.939Z"))
              )
              .toISOString(),
            extended: {
              landingId: "rssWA12019-07-10",
              contactId: "some-contact-id",
              accountId: "some-account-id",
              exporterName: "Mr Bob",
              presentation: "SLC",
              documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
              presentationName: "sliced",
              vessel: "DAYBREAK",
              fao: "FAO27",
              pln: "WA1",
              species: "Lobster",
              state: "FRE",
              stateName: "fresh",
              commodityCode: "1234",
              investigation: {
                investigator: "Investigator Gadget",
                status: InvestigationStatus.Open,
              },
              transportationVehicle: "directLanding",
              licenceHolder: "Mr Bob"
            },
          }];

          const result = SUT.toDynamicsCase2(input);
          expect(result).toEqual(CaseTwoType.Success);
        });
      });

      describe('against a logbook', () => {

        describe('When Risk rating is PASS', () => {

          const riskScore = 0.8;
          const isHighRisk = false;

          beforeEach(() => {
            mockIsHighRisk.mockReturnValue(isHighRisk);
            mockGetTotalRiskScore.mockReturnValue(riskScore);
          });

          it('will flag as `Real Time Validation - Successful` if there are no failures', () => {
            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
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
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.ELog
                },
              ],
              source: LandingSources.ELog,
              isOverusedThisCert: false,
              isOverusedAllCerts: false,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob",
                dataEverExpected: true,
                landingDataExpectedDate: '2019-07-13',
                landingDataEndDate: '2019-07-14',
              },
            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.Success);
            expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
            expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
          });

          it('will flag as `Real Time Validation - Successful` when species and weight check PASS but over-use FAIL', () => {
            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
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
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.ELog
                },
              ],
              source: LandingSources.ELog,
              isOverusedThisCert: false,
              isOverusedAllCerts: true,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob",
                dataEverExpected: true,
                landingDataExpectedDate: '2019-07-13',
                landingDataEndDate: '2019-07-14',
              },
            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.Success);
            expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
            expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
          });

          it('will flag as `Real Time Validation - Successful` when species PASS but weight check and over-use FAIL', () => {
            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
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
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.ELog
                },
              ],
              source: LandingSources.ELog,
              isOverusedThisCert: true,
              isOverusedAllCerts: true,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob",
                dataEverExpected: true,
                landingDataExpectedDate: '2019-07-13',
                landingDataEndDate: '2019-07-14',
              },
            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.Success);
            expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
            expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
          });

          it('will flag as `Real Time Validation - Successful` when species FAIL and is over 50 KG deminimus and the species toggle is enabled', () => {
            mockIsRiskEnabled.mockReturnValue(true);

            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
              weightOnCert: 121,
              rawWeightOnCert: 122,
              weightOnAllCerts: 200,
              weightOnAllCertsBefore: 0,
              weightOnAllCertsAfter: 100,
              weightFactor: 5,
              isLandingExists: true,
              isSpeciesExists: false,
              numberOfLandingsOnDay: 1,
              weightOnLanding: 30,
              weightOnLandingAllSpecies: 30,
              landingTotalBreakdown: [
                {
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.ELog
                },
              ],
              source: LandingSources.ELog,
              isOverusedThisCert: true,
              isOverusedAllCerts: true,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob",
                dataEverExpected: true,
                landingDataExpectedDate: '2019-07-13',
                landingDataEndDate: '2019-07-14',
              },
            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.Success);
            expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
            expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
          });

        });

        describe('When Risk rating is FAIL', () => {

          const riskScore = 0.8;
          const isHighRisk = true;

          beforeEach(() => {
            mockIsHighRisk.mockReturnValue(isHighRisk);
            mockGetTotalRiskScore.mockReturnValue(riskScore);
          });

          it('will flag as `Real Time Validation - Successful` if there are no failures', () => {
            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
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
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.ELog
                },
              ],
              source: LandingSources.ELog,
              isOverusedThisCert: false,
              isOverusedAllCerts: false,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob",
                dataEverExpected: true,
                landingDataExpectedDate: '2019-07-13',
                landingDataEndDate: '2019-07-14',
              },
            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.Success);
            expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
            expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
          });

          it('will flag as `Real Time Validation - Overuse Failure` when species and weight check PASS but over-use FAIL', () => {
            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
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
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.ELog
                },
              ],
              source: LandingSources.ELog,
              isOverusedThisCert: false,
              isOverusedAllCerts: true,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob",
                dataEverExpected: true,
                landingDataExpectedDate: '2019-07-13',
                landingDataEndDate: '2019-07-14',
              },
            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.RealTimeValidation_Overuse);
            expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
            expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
          });

          it('will flag as `Real Time Validation - Rejected` when species PASS but weight check and over-use FAIL', () => {
            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
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
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.ELog
                },
              ],
              source: LandingSources.ELog,
              isOverusedThisCert: true,
              isOverusedAllCerts: true,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob",
                dataEverExpected: true,
                landingDataExpectedDate: '2019-07-13',
                landingDataEndDate: '2019-07-14',
              },
            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.RealTimeValidation_Rejected);
            expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
            expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
          });

          it('will flag as `Real Time Validation - Rejected` when species FAIL and is over 50 KG deminimus and the species toggle is disabled', () => {
            mockIsRiskEnabled.mockReturnValue(false);

            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
              weightOnCert: 121,
              rawWeightOnCert: 122,
              weightOnAllCerts: 200,
              weightOnAllCertsBefore: 0,
              weightOnAllCertsAfter: 100,
              weightFactor: 5,
              isLandingExists: true,
              isSpeciesExists: false,
              numberOfLandingsOnDay: 1,
              weightOnLanding: 30,
              weightOnLandingAllSpecies: 30,
              landingTotalBreakdown: [
                {
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.ELog
                },
              ],
              source: LandingSources.ELog,
              isOverusedThisCert: true,
              isOverusedAllCerts: true,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob",
                dataEverExpected: true,
                landingDataExpectedDate: '2019-07-13',
                landingDataEndDate: '2019-07-14'
              },
            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.RealTimeValidation_Rejected);
          });

          it('will flag as `Real Time Validation - Rejected` when species FAIL and is over 50 KG deminimus and the species toggle is enabled', () => {
            mockIsRiskEnabled.mockReturnValue(true);

            const input: Shared.ICcQueryResult[] = [{
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
              weightOnCert: 121,
              rawWeightOnCert: 122,
              weightOnAllCerts: 200,
              weightOnAllCertsBefore: 0,
              weightOnAllCertsAfter: 100,
              weightFactor: 5,
              isLandingExists: true,
              isSpeciesExists: false,
              numberOfLandingsOnDay: 1,
              weightOnLanding: 30,
              weightOnLandingAllSpecies: 30,
              landingTotalBreakdown: [
                {
                  factor: 1.7,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.ELog
                },
              ],
              source: LandingSources.ELog,
              isOverusedThisCert: true,
              isOverusedAllCerts: true,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment
                .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                .toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              durationBetweenCertCreationAndLastLandingRetrieved: moment
                .duration(
                  moment
                    .utc("2019-07-11T09:00:00.000Z")
                    .diff(moment.utc("2019-07-13T08:26:06.939Z"))
                )
                .toISOString(),
              extended: {
                landingId: "rssWA12019-07-10",
                exporterContactId: "some-contact-id",
                exporterAccountId: "some-account-id",
                exporterName: "Mr Bob",
                presentation: "SLC",
                documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                presentationName: "sliced",
                vessel: "DAYBREAK",
                fao: "FAO27",
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {
                  investigator: "Investigator Gadget",
                  status: InvestigationStatus.Open,
                },
                transportationVehicle: "directLanding",
                licenceHolder: "Mr Bob",
                dataEverExpected: true,
                landingDataExpectedDate: '2019-07-13',
                landingDataEndDate: '2019-07-14',
              },
            }];

            const result = SUT.toDynamicsCase2(input);
            expect(result).toEqual(CaseTwoType.RealTimeValidation_Rejected);
            expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
            expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
          });

        });

        it('will flag as `Real Time Validation - Rejected` when species FAIL and species weight is above the 50 KG deminimus', () => {
          mockIsRiskEnabled.mockReturnValue(false);

          const input: Shared.ICcQueryResult[] = [{
            documentNumber: "CC1",
            documentType: "catchCertificate",
            createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
            status: "COMPLETE",
            rssNumber: "rssWA1",
            da: "Guernsey",
            dateLanded: "2019-07-10",
            species: "LBE",
            weightOnCert: 51,
            rawWeightOnCert: 51,
            weightOnAllCerts: 51,
            weightOnAllCertsBefore: 0,
            weightOnAllCertsAfter: 51,
            weightFactor: 1,
            isLandingExists: true,
            isSpeciesExists: false,
            numberOfLandingsOnDay: 1,
            weightOnLanding: 30,
            weightOnLandingAllSpecies: 30,
            landingTotalBreakdown: [
              {
                factor: 1.7,
                isEstimate: true,
                weight: 30,
                liveWeight: 51,
                source: LandingSources.ELog
              },
            ],
            source: LandingSources.ELog,
            isOverusedThisCert: true,
            isOverusedAllCerts: true,
            isExceeding14DayLimit: false,
            overUsedInfo: [],
            durationSinceCertCreation: moment
              .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
              .toISOString(),
            durationBetweenCertCreationAndFirstLandingRetrieved: moment
              .duration(
                moment
                  .utc("2019-07-11T09:00:00.000Z")
                  .diff(moment.utc("2019-07-13T08:26:06.939Z"))
              )
              .toISOString(),
            durationBetweenCertCreationAndLastLandingRetrieved: moment
              .duration(
                moment
                  .utc("2019-07-11T09:00:00.000Z")
                  .diff(moment.utc("2019-07-13T08:26:06.939Z"))
              )
              .toISOString(),
            extended: {
              landingId: "rssWA12019-07-10",
              exporterName: "Mr Bob",
              presentation: "SLC",
              documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
              presentationName: "sliced",
              vessel: "DAYBREAK",
              fao: "FAO27",
              pln: "WA1",
              species: "Lobster",
              state: "FRE",
              stateName: "fresh",
              commodityCode: "1234",
              investigation: {
                investigator: "Investigator Gadget",
                status: InvestigationStatus.Open,
              },
              transportationVehicle: "directLanding",
              licenceHolder: "Mr Bob",
              dataEverExpected: true,
              landingDataExpectedDate: '2019-07-13',
              landingDataEndDate: '2019-07-14'
            },
          }];

          const result = SUT.toDynamicsCase2(input);
          expect(mockIsElog).toHaveBeenCalledWith(mockIsWithinDeminimus);
          expect(mockIsWithinDeminimus).toHaveBeenCalledWith(input[0].isSpeciesExists, input[0].weightOnCert, Shared.DEMINIMUS_IN_KG);
          expect(result).toEqual(CaseTwoType.RealTimeValidation_Rejected);
        });

        it('will flag as `Pending Landing Data` when species FAIL but species weight is within the 50 KG deminimus', () => {
          const input: Shared.ICcQueryResult[] = [{
            documentNumber: "CC1",
            documentType: "catchCertificate",
            createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
            status: "COMPLETE",
            rssNumber: "rssWA1",
            da: "Guernsey",
            dateLanded: "2019-07-10",
            species: "LBE",
            weightOnCert: 50,
            rawWeightOnCert: 50,
            weightOnAllCerts: 50,
            weightOnAllCertsBefore: 0,
            weightOnAllCertsAfter: 50,
            weightFactor: 1,
            isLandingExists: true,
            isSpeciesExists: false,
            numberOfLandingsOnDay: 1,
            weightOnLanding: 30,
            weightOnLandingAllSpecies: 30,
            landingTotalBreakdown: [
              {
                factor: 1.7,
                isEstimate: true,
                weight: 30,
                liveWeight: 51,
                source: LandingSources.ELog
              },
            ],
            source: LandingSources.ELog,
            isOverusedThisCert: true,
            isOverusedAllCerts: true,
            isExceeding14DayLimit: false,
            overUsedInfo: [],
            durationSinceCertCreation: moment
              .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
              .toISOString(),
            durationBetweenCertCreationAndFirstLandingRetrieved: moment
              .duration(
                moment
                  .utc("2019-07-11T09:00:00.000Z")
                  .diff(moment.utc("2019-07-13T08:26:06.939Z"))
              )
              .toISOString(),
            durationBetweenCertCreationAndLastLandingRetrieved: moment
              .duration(
                moment
                  .utc("2019-07-11T09:00:00.000Z")
                  .diff(moment.utc("2019-07-13T08:26:06.939Z"))
              )
              .toISOString(),
            extended: {
              landingId: "rssWA12019-07-10",
              exporterName: "Mr Bob",
              presentation: "SLC",
              documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
              presentationName: "sliced",
              vessel: "DAYBREAK",
              fao: "FAO27",
              pln: "WA1",
              species: "Lobster",
              state: "FRE",
              stateName: "fresh",
              commodityCode: "1234",
              investigation: {
                investigator: "Investigator Gadget",
                status: InvestigationStatus.Open,
              },
              transportationVehicle: "directLanding",
              licenceHolder: "Mr Bob",
              dataEverExpected: true,
              landingDataExpectedDate: "2024-01-24",
              landingDataEndDate: moment.utc().format('YYYY-MM-DD'),
            },
          }];

          const result = SUT.toDynamicsCase2(input);
          expect(mockIsElog).toHaveBeenCalledWith(mockIsWithinDeminimus);
          expect(mockIsWithinDeminimus).toHaveBeenCalledWith(input[0].isSpeciesExists, input[0].weightOnCert, Shared.DEMINIMUS_IN_KG);
          expect(result).toEqual(CaseTwoType.PendingLandingData);
        });

        it('will flag as `Real Time Validation - Successful` when species FAIL and document is pre approved', () => {
          const input: Shared.ICcQueryResult[] = [{
            documentNumber: "CC1",
            documentType: "catchCertificate",
            createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
            status: "COMPLETE",
            rssNumber: "rssWA1",
            da: "Guernsey",
            dateLanded: "2019-07-10",
            species: "LBE",
            weightOnCert: 121,
            rawWeightOnCert: 122,
            weightOnAllCerts: 200,
            weightOnAllCertsBefore: 0,
            weightOnAllCertsAfter: 100,
            weightFactor: 5,
            isLandingExists: true,
            isSpeciesExists: false,
            numberOfLandingsOnDay: 1,
            weightOnLanding: 30,
            weightOnLandingAllSpecies: 30,
            landingTotalBreakdown: [
              {
                factor: 1.7,
                isEstimate: true,
                weight: 30,
                liveWeight: 51,
                source: LandingSources.ELog
              },
            ],
            source: LandingSources.ELog,
            isOverusedThisCert: true,
            isOverusedAllCerts: true,
            isExceeding14DayLimit: false,
            isPreApproved: true,
            overUsedInfo: [],
            durationSinceCertCreation: moment
              .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
              .toISOString(),
            durationBetweenCertCreationAndFirstLandingRetrieved: moment
              .duration(
                moment
                  .utc("2019-07-11T09:00:00.000Z")
                  .diff(moment.utc("2019-07-13T08:26:06.939Z"))
              )
              .toISOString(),
            durationBetweenCertCreationAndLastLandingRetrieved: moment
              .duration(
                moment
                  .utc("2019-07-11T09:00:00.000Z")
                  .diff(moment.utc("2019-07-13T08:26:06.939Z"))
              )
              .toISOString(),
            extended: {
              landingId: "rssWA12019-07-10",
              exporterName: "Mr Bob",
              presentation: "SLC",
              documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
              presentationName: "sliced",
              vessel: "DAYBREAK",
              fao: "FAO27",
              pln: "WA1",
              species: "Lobster",
              state: "FRE",
              stateName: "fresh",
              commodityCode: "1234",
              investigation: {
                investigator: "Investigator Gadget",
                status: InvestigationStatus.Open,
              },
              transportationVehicle: "directLanding",
              licenceHolder: "Mr Bob"
            },
          }];

          const result = SUT.toDynamicsCase2(input);
          expect(result).toEqual(CaseTwoType.Success);
        });

      });

      describe('no landing data found', () => {

        describe('When risk rating is low', () => {

          const riskScore = 0.8;
          const isHighRisk = false;

          beforeEach(() => {
            mockIsHighRisk.mockReturnValue(isHighRisk);
            mockGetTotalRiskScore.mockReturnValue(riskScore);
          });

          describe('When dataEverExpected is false', () => {

            it('will set caseType2=`Real Time Validation - Successful`', () => {
              const input: Shared.ICcQueryResult[] = [{
                documentNumber: "CC1",
                documentType: "catchCertificate",
                createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
                status: "COMPLETE",
                rssNumber: "rssWA1",
                da: "Guernsey",
                dateLanded: "2019-07-10",
                species: "LBE",
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
                durationSinceCertCreation: moment
                  .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                  .toISOString(),
                durationBetweenCertCreationAndFirstLandingRetrieved: null,
                durationBetweenCertCreationAndLastLandingRetrieved: null,
                extended: {
                  landingId: "rssWA12019-07-10",
                  exporterContactId: "some-contact-id",
                  exporterAccountId: "some-account-id",
                  exporterName: "Mr Bob",
                  presentation: "SLC",
                  documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                  presentationName: "sliced",
                  vessel: "DAYBREAK",
                  fao: "FAO27",
                  pln: "WA1",
                  species: "Lobster",
                  state: "FRE",
                  stateName: "fresh",
                  commodityCode: "1234",
                  investigation: {
                    investigator: "Investigator Gadget",
                    status: InvestigationStatus.Open,
                  },
                  transportationVehicle: "directLanding",
                  licenceHolder: "Mr Bob",
                  dataEverExpected: false
                },
              }];

              const result = SUT.toDynamicsCase2(input);
              expect(result).toEqual(CaseTwoType.Success);
              expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
              expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
            });

          });

          describe('When dataEverExpected is true', () => {

            describe('When data is expected at submission', () => {

              // row 13
              it('will set caseType2=`Real Time Validation - No Landing Data` when submission date is after landing end date', () => {

                const input: Shared.ICcQueryResult[] = [{
                  documentNumber: "CC1",
                  documentType: "catchCertificate",
                  createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
                  status: "COMPLETE",
                  rssNumber: "rssWA1",
                  da: "Guernsey",
                  dateLanded: "2019-07-10",
                  species: "LBE",
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
                  durationSinceCertCreation: moment
                    .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                    .toISOString(),
                  durationBetweenCertCreationAndFirstLandingRetrieved: null,
                  durationBetweenCertCreationAndLastLandingRetrieved: null,
                  extended: {
                    landingId: "rssWA12019-07-10",
                    exporterContactId: "some-contact-id",
                    exporterAccountId: "some-account-id",
                    exporterName: "Mr Bob",
                    presentation: "SLC",
                    documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                    presentationName: "sliced",
                    vessel: "DAYBREAK",
                    fao: "FAO27",
                    pln: "WA1",
                    species: "Lobster",
                    state: "FRE",
                    stateName: "fresh",
                    commodityCode: "1234",
                    investigation: {
                      investigator: "Investigator Gadget",
                      status: InvestigationStatus.Open,
                    },
                    transportationVehicle: "directLanding",
                    licenceHolder: "Mr Bob",
                    dataEverExpected: true,
                    landingDataExpectedDate: '2019-07-08',
                    landingDataEndDate: '2019-07-12',
                  },
                }];

                const result = SUT.toDynamicsCase2(input);
                expect(result).toEqual(CaseTwoType.RealTimeValidation_NoLandingData);
              });

              // row 17
              it('will set caseType2=`Pending Landing Data` when submission date is on the landing end date', () => {

                const input: Shared.ICcQueryResult[] = [{
                  documentNumber: "CC1",
                  documentType: "catchCertificate",
                  createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
                  status: "COMPLETE",
                  rssNumber: "rssWA1",
                  da: "Guernsey",
                  dateLanded: "2019-07-10",
                  species: "LBE",
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
                  durationSinceCertCreation: moment
                    .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                    .toISOString(),
                  durationBetweenCertCreationAndFirstLandingRetrieved: null,
                  durationBetweenCertCreationAndLastLandingRetrieved: null,
                  extended: {
                    landingId: "rssWA12019-07-10",
                    exporterContactId: "some-contact-id",
                    exporterAccountId: "some-account-id",
                    exporterName: "Mr Bob",
                    presentation: "SLC",
                    documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                    presentationName: "sliced",
                    vessel: "DAYBREAK",
                    fao: "FAO27",
                    pln: "WA1",
                    species: "Lobster",
                    state: "FRE",
                    stateName: "fresh",
                    commodityCode: "1234",
                    investigation: {
                      investigator: "Investigator Gadget",
                      status: InvestigationStatus.Open,
                    },
                    transportationVehicle: "directLanding",
                    licenceHolder: "Mr Bob",
                    dataEverExpected: true,
                    landingDataExpectedDate: '2019-07-08',
                    landingDataEndDate: '2019-07-13',
                  },
                }];

                const result = SUT.toDynamicsCase2(input);
                expect(result).toEqual(CaseTwoType.PendingLandingData);
              });

            });

            describe('When data is not expected at submission', () => {

              // row 19
              it('will set caseType2=`Pending Landing Data` when submission date is before landing end date', () => {

                const input: Shared.ICcQueryResult[] = [{
                  documentNumber: "CC1",
                  documentType: "catchCertificate",
                  createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
                  status: "COMPLETE",
                  rssNumber: "rssWA1",
                  da: "Guernsey",
                  dateLanded: "2019-07-10",
                  species: "LBE",
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
                  durationSinceCertCreation: moment
                    .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                    .toISOString(),
                  durationBetweenCertCreationAndFirstLandingRetrieved: null,
                  durationBetweenCertCreationAndLastLandingRetrieved: null,
                  extended: {
                    landingId: "rssWA12019-07-10",
                    exporterContactId: "some-contact-id",
                    exporterAccountId: "some-account-id",
                    exporterName: "Mr Bob",
                    presentation: "SLC",
                    documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                    presentationName: "sliced",
                    vessel: "DAYBREAK",
                    fao: "FAO27",
                    pln: "WA1",
                    species: "Lobster",
                    state: "FRE",
                    stateName: "fresh",
                    commodityCode: "1234",
                    investigation: {
                      investigator: "Investigator Gadget",
                      status: InvestigationStatus.Open,
                    },
                    transportationVehicle: "directLanding",
                    licenceHolder: "Mr Bob",
                    dataEverExpected: true,
                    landingDataExpectedDate: '2019-07-14',
                    landingDataEndDate: '2019-07-16',
                  },
                }];

                const result = SUT.toDynamicsCase2(input);
                expect(result).toEqual(CaseTwoType.PendingLandingData);
              });

            });

            it('will set caseType2=`Real Time Validation - No Landing Data` when end date is before submission date', () => {
              const input: Shared.ICcQueryResult[] = [{
                documentNumber: "CC1",
                documentType: "catchCertificate",
                createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
                status: "COMPLETE",
                rssNumber: "rssWA1",
                da: "Guernsey",
                dateLanded: "2019-07-10",
                species: "LBE",
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
                durationSinceCertCreation: moment
                  .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                  .toISOString(),
                durationBetweenCertCreationAndFirstLandingRetrieved: null,
                durationBetweenCertCreationAndLastLandingRetrieved: null,
                extended: {
                  landingId: "rssWA12019-07-10",
                  exporterContactId: "some-contact-id",
                  exporterAccountId: "some-account-id",
                  exporterName: "Mr Bob",
                  presentation: "SLC",
                  documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                  presentationName: "sliced",
                  vessel: "DAYBREAK",
                  fao: "FAO27",
                  pln: "WA1",
                  species: "Lobster",
                  state: "FRE",
                  stateName: "fresh",
                  commodityCode: "1234",
                  investigation: {
                    investigator: "Investigator Gadget",
                    status: InvestigationStatus.Open,
                  },
                  transportationVehicle: "directLanding",
                  licenceHolder: "Mr Bob",
                  dataEverExpected: true,
                  landingDataExpectedDate: '2019-07-08',
                  landingDataEndDate: '2019-07-12',
                },
              }];

              const result = SUT.toDynamicsCase2(input);
              expect(result).toEqual(CaseTwoType.RealTimeValidation_NoLandingData);
              expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
              expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
            });

            it('will set caseType2=`Pending Landing Data` when end date is after submission date', () => {
              const input: Shared.ICcQueryResult[] = [{
                documentNumber: "CC1",
                documentType: "catchCertificate",
                createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
                status: "COMPLETE",
                rssNumber: "rssWA1",
                da: "Guernsey",
                dateLanded: "2019-07-10",
                species: "LBE",
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
                durationSinceCertCreation: moment
                  .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                  .toISOString(),
                durationBetweenCertCreationAndFirstLandingRetrieved: null,
                durationBetweenCertCreationAndLastLandingRetrieved: null,
                extended: {
                  landingId: "rssWA12019-07-10",
                  exporterContactId: "some-contact-id",
                  exporterAccountId: "some-account-id",
                  exporterName: "Mr Bob",
                  presentation: "SLC",
                  documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                  presentationName: "sliced",
                  vessel: "DAYBREAK",
                  fao: "FAO27",
                  pln: "WA1",
                  species: "Lobster",
                  state: "FRE",
                  stateName: "fresh",
                  commodityCode: "1234",
                  investigation: {
                    investigator: "Investigator Gadget",
                    status: InvestigationStatus.Open,
                  },
                  transportationVehicle: "directLanding",
                  licenceHolder: "Mr Bob",
                  dataEverExpected: true,
                  landingDataExpectedDate: '2019-07-08',
                  landingDataEndDate: '2019-07-15',
                },
              }];

              const result = SUT.toDynamicsCase2(input);
              expect(result).toEqual(CaseTwoType.PendingLandingData);
              expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
              expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
            });

            it('will set caseType2=`Pending Landing Data` when end date is same as submission date', () => {
              const input: Shared.ICcQueryResult[] = [{
                documentNumber: "CC1",
                documentType: "catchCertificate",
                createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
                status: "COMPLETE",
                rssNumber: "rssWA1",
                da: "Guernsey",
                dateLanded: "2019-07-10",
                species: "LBE",
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
                durationSinceCertCreation: moment
                  .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                  .toISOString(),
                durationBetweenCertCreationAndFirstLandingRetrieved: null,
                durationBetweenCertCreationAndLastLandingRetrieved: null,
                extended: {
                  landingId: "rssWA12019-07-10",
                  exporterContactId: "some-contact-id",
                  exporterAccountId: "some-account-id",
                  exporterName: "Mr Bob",
                  presentation: "SLC",
                  documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                  presentationName: "sliced",
                  vessel: "DAYBREAK",
                  fao: "FAO27",
                  pln: "WA1",
                  species: "Lobster",
                  state: "FRE",
                  stateName: "fresh",
                  commodityCode: "1234",
                  investigation: {
                    investigator: "Investigator Gadget",
                    status: InvestigationStatus.Open,
                  },
                  transportationVehicle: "directLanding",
                  licenceHolder: "Mr Bob",
                  dataEverExpected: true,
                  landingDataExpectedDate: '2019-07-08',
                  landingDataEndDate: '2019-07-13'
                },
              }];

              const result = SUT.toDynamicsCase2(input);
              expect(result).toEqual(CaseTwoType.PendingLandingData);
            });

            it('will set caseType2=`Pending Landing Data` when end date is undefined', () => {
              const input: Shared.ICcQueryResult[] = [{
                documentNumber: "CC1",
                documentType: "catchCertificate",
                createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
                status: "COMPLETE",
                rssNumber: "rssWA1",
                da: "Guernsey",
                dateLanded: "2019-07-10",
                species: "LBE",
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
                durationSinceCertCreation: moment
                  .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                  .toISOString(),
                durationBetweenCertCreationAndFirstLandingRetrieved: null,
                durationBetweenCertCreationAndLastLandingRetrieved: null,
                extended: {
                  landingId: "rssWA12019-07-10",
                  exporterContactId: "some-contact-id",
                  exporterAccountId: "some-account-id",
                  exporterName: "Mr Bob",
                  presentation: "SLC",
                  documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                  presentationName: "sliced",
                  vessel: "DAYBREAK",
                  fao: "FAO27",
                  pln: "WA1",
                  species: "Lobster",
                  state: "FRE",
                  stateName: "fresh",
                  commodityCode: "1234",
                  investigation: {
                    investigator: "Investigator Gadget",
                    status: InvestigationStatus.Open,
                  },
                  transportationVehicle: "directLanding",
                  licenceHolder: "Mr Bob",
                  dataEverExpected: true
                },
              }];

              const result = SUT.toDynamicsCase2(input);
              expect(result).toEqual(CaseTwoType.PendingLandingData);
              expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
              expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
            });

          });

        });

        describe('When risk rating is high', () => {

          const riskScore = 0.8;
          const isHighRisk = true;

          beforeEach(() => {
            mockIsHighRisk.mockReturnValue(isHighRisk);
            mockGetTotalRiskScore.mockReturnValue(riskScore);
          });

          describe('When vessel has been overridden by an admin', () => {

            it('will flag as `Real Time Validation - Rejected`', () => {
              const input: Shared.ICcQueryResult[] = [{
                documentNumber: "CC1",
                documentType: "catchCertificate",
                createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
                status: "COMPLETE",
                rssNumber: "rssWA1",
                da: "Guernsey",
                dateLanded: "2019-07-10",
                species: "LBE",
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
                durationSinceCertCreation: moment
                  .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                  .toISOString(),
                durationBetweenCertCreationAndFirstLandingRetrieved: null,
                durationBetweenCertCreationAndLastLandingRetrieved: null,
                extended: {
                  landingId: "rssWA12019-07-10",
                  exporterContactId: "some-contact-id",
                  exporterAccountId: "some-account-id",
                  exporterName: "Mr Bob",
                  presentation: "SLC",
                  documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                  presentationName: "sliced",
                  vessel: "DAYBREAK",
                  fao: "FAO27",
                  pln: "WA1",
                  species: "Lobster",
                  state: "FRE",
                  stateName: "fresh",
                  commodityCode: "1234",
                  investigation: {
                    investigator: "Investigator Gadget",
                    status: InvestigationStatus.Open,
                  },
                  transportationVehicle: "directLanding",
                  vesselOverriddenByAdmin: true,
                  licenceHolder: "Mr Bob",
                  dataEverExpected: true,
                  landingDataExpectedDate: '2019-08-08',
                  landingDataEndDate: '2019-08-16',
                },
              }];

              const result = SUT.toDynamicsCase2(input);
              expect(result).toEqual(CaseTwoType.RealTimeValidation_Rejected);
            });

          });

          describe('When dataEverExpected is false', () => {

            // row 12
            it('will set caseType2=`Data Never Expected`', () => {
              const input: Shared.ICcQueryResult[] = [{
                documentNumber: "CC1",
                documentType: "catchCertificate",
                createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
                status: "COMPLETE",
                rssNumber: "rssWA1",
                da: "Guernsey",
                dateLanded: "2019-07-10",
                species: "LBE",
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
                durationSinceCertCreation: moment
                  .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                  .toISOString(),
                durationBetweenCertCreationAndFirstLandingRetrieved: null,
                durationBetweenCertCreationAndLastLandingRetrieved: null,
                extended: {
                  landingId: "rssWA12019-07-10",
                  exporterContactId: "some-contact-id",
                  exporterAccountId: "some-account-id",
                  exporterName: "Mr Bob",
                  presentation: "SLC",
                  documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                  presentationName: "sliced",
                  vessel: "DAYBREAK",
                  fao: "FAO27",
                  pln: "WA1",
                  species: "Lobster",
                  state: "FRE",
                  stateName: "fresh",
                  commodityCode: "1234",
                  investigation: {
                    investigator: "Investigator Gadget",
                    status: InvestigationStatus.Open,
                  },
                  transportationVehicle: "directLanding",
                  licenceHolder: "Mr Bob",
                  dataEverExpected: false
                },
              }];

              const result = SUT.toDynamicsCase2(input);
              expect(result).toEqual(CaseTwoType.DataNeverExpected);
              expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
              expect(mockIsHighRisk).toHaveBeenCalledWith(riskScore);
            });

          });

          describe('When dataEverExpected is true', () => {

            describe('When data is expected at submission', () => {

              // row 14
              it('will set caseType2=`Real Time Validation - Rejected` when submission date is after landing end date', () => {

                const input: Shared.ICcQueryResult[] = [{
                  documentNumber: "CC1",
                  documentType: "catchCertificate",
                  createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
                  status: "COMPLETE",
                  rssNumber: "rssWA1",
                  da: "Guernsey",
                  dateLanded: "2019-07-10",
                  species: "LBE",
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
                  durationSinceCertCreation: moment
                    .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                    .toISOString(),
                  durationBetweenCertCreationAndFirstLandingRetrieved: null,
                  durationBetweenCertCreationAndLastLandingRetrieved: null,
                  extended: {
                    landingId: "rssWA12019-07-10",
                    exporterContactId: "some-contact-id",
                    exporterAccountId: "some-account-id",
                    exporterName: "Mr Bob",
                    presentation: "SLC",
                    documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                    presentationName: "sliced",
                    vessel: "DAYBREAK",
                    fao: "FAO27",
                    pln: "WA1",
                    species: "Lobster",
                    state: "FRE",
                    stateName: "fresh",
                    commodityCode: "1234",
                    investigation: {
                      investigator: "Investigator Gadget",
                      status: InvestigationStatus.Open,
                    },
                    transportationVehicle: "directLanding",
                    licenceHolder: "Mr Bob",
                    dataEverExpected: true,
                    landingDataExpectedDate: '2019-07-08',
                    landingDataEndDate: '2019-07-12',
                  },
                }];

                const result = SUT.toDynamicsCase2(input);
                expect(result).toEqual(CaseTwoType.RealTimeValidation_Rejected);
              });

              // row 18
              it('will set caseType2=`Real Time Validation - Rejected` when submission date is on the landing end date', () => {

                const input: Shared.ICcQueryResult[] = [{
                  documentNumber: "CC1",
                  documentType: "catchCertificate",
                  createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
                  status: "COMPLETE",
                  rssNumber: "rssWA1",
                  da: "Guernsey",
                  dateLanded: "2019-07-10",
                  species: "LBE",
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
                  durationSinceCertCreation: moment
                    .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                    .toISOString(),
                  durationBetweenCertCreationAndFirstLandingRetrieved: null,
                  durationBetweenCertCreationAndLastLandingRetrieved: null,
                  extended: {
                    landingId: "rssWA12019-07-10",
                    exporterContactId: "some-contact-id",
                    exporterAccountId: "some-account-id",
                    exporterName: "Mr Bob",
                    presentation: "SLC",
                    documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                    presentationName: "sliced",
                    vessel: "DAYBREAK",
                    fao: "FAO27",
                    pln: "WA1",
                    species: "Lobster",
                    state: "FRE",
                    stateName: "fresh",
                    commodityCode: "1234",
                    investigation: {
                      investigator: "Investigator Gadget",
                      status: InvestigationStatus.Open,
                    },
                    transportationVehicle: "directLanding",
                    licenceHolder: "Mr Bob",
                    dataEverExpected: true,
                    landingDataExpectedDate: '2019-07-08',
                    landingDataEndDate: '2019-07-13',
                  },
                }];

                const result = SUT.toDynamicsCase2(input);
                expect(result).toEqual(CaseTwoType.RealTimeValidation_Rejected);
              });

            });

            describe('When data is not expected at submission', () => {

              // row 20
              it('will set caseType2=`Pending Landing Data` when submission date is before landing end date', () => {

                const input: Shared.ICcQueryResult[] = [{
                  documentNumber: "CC1",
                  documentType: "catchCertificate",
                  createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
                  status: "COMPLETE",
                  rssNumber: "rssWA1",
                  da: "Guernsey",
                  dateLanded: "2019-07-10",
                  species: "LBE",
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
                  durationSinceCertCreation: moment
                    .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
                    .toISOString(),
                  durationBetweenCertCreationAndFirstLandingRetrieved: null,
                  durationBetweenCertCreationAndLastLandingRetrieved: null,
                  extended: {
                    landingId: "rssWA12019-07-10",
                    exporterContactId: "some-contact-id",
                    exporterAccountId: "some-account-id",
                    exporterName: "Mr Bob",
                    presentation: "SLC",
                    documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
                    presentationName: "sliced",
                    vessel: "DAYBREAK",
                    fao: "FAO27",
                    pln: "WA1",
                    species: "Lobster",
                    state: "FRE",
                    stateName: "fresh",
                    commodityCode: "1234",
                    investigation: {
                      investigator: "Investigator Gadget",
                      status: InvestigationStatus.Open,
                    },
                    transportationVehicle: "directLanding",
                    licenceHolder: "Mr Bob",
                    dataEverExpected: true,
                    landingDataExpectedDate: '2019-07-14',
                    landingDataEndDate: '2019-07-16',
                  },
                }];

                const result = SUT.toDynamicsCase2(input);
                expect(result).toEqual(CaseTwoType.PendingLandingData);
              });

            });

          });

        });

      });

      describe('and no licence holder is found', () => {
        it('will flag as `Real Time Validation - Rejected`', () => {
          const input: Shared.ICcQueryResult[] = [{
            documentNumber: "CC1",
            documentType: "catchCertificate",
            createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
            status: "COMPLETE",
            rssNumber: "rssWA1",
            da: "Guernsey",
            dateLanded: "2019-07-10",
            species: "LBE",
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
                factor: 1.7,
                isEstimate: true,
                weight: 30,
                liveWeight: 51,
                source: LandingSources.CatchRecording
              },
            ],
            source: LandingSources.CatchRecording,
            isOverusedThisCert: false,
            isOverusedAllCerts: false,
            isExceeding14DayLimit: false,
            overUsedInfo: [],
            durationSinceCertCreation: moment
              .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
              .toISOString(),
            durationBetweenCertCreationAndFirstLandingRetrieved: moment
              .duration(
                moment
                  .utc("2019-07-11T09:00:00.000Z")
                  .diff(moment.utc("2019-07-13T08:26:06.939Z"))
              )
              .toISOString(),
            durationBetweenCertCreationAndLastLandingRetrieved: moment
              .duration(
                moment
                  .utc("2019-07-11T09:00:00.000Z")
                  .diff(moment.utc("2019-07-13T08:26:06.939Z"))
              )
              .toISOString(),
            extended: {
              landingId: "rssWA12019-07-10",
              exporterContactId: "some-contact-id",
              exporterAccountId: "some-account-id",
              exporterName: "Mr Bob",
              presentation: "SLC",
              documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
              presentationName: "sliced",
              vessel: "DAYBREAK",
              fao: "FAO27",
              pln: "WA1",
              species: "Lobster",
              state: "FRE",
              stateName: "fresh",
              commodityCode: "1234",
              investigation: {
                investigator: "Investigator Gadget",
                status: InvestigationStatus.Open,
              },
              transportationVehicle: "directLanding"
            },
          }];

          const result = SUT.toDynamicsCase2(input);
          expect(result).toEqual(CaseTwoType.RealTimeValidation_Rejected);
        })
      });

    });

    describe('When validating multiple landings', () => {

      let mockIsHighRisk;

      beforeEach(() => {
        mockIsHighRisk = jest.spyOn(RiskRating, 'isHighRisk');
      });

      afterEach(() => {
        mockIsHighRisk.mockRestore();
      });

      it('will flag as `Real Time Validation - Rejected Case` if any of the landings result in a `Real Time Validation - Rejected Case`', () => {
        const input: Shared.ICcQueryResult[] = [{
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.CatchRecording
            },
          ],
          source: LandingSources.CatchRecording,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.ELog
            },
          ],
          source: LandingSources.ELog,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            ).toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: false,
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.CatchRecording
            },
          ],
          source: LandingSources.CatchRecording,
          isOverusedThisCert: true,
          isOverusedAllCerts: true,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
          },
        }];

        const result = SUT.toDynamicsCase2(input);
        expect(result).toEqual(CaseTwoType.RealTimeValidation_Rejected);
      });

      it('will flag as `Pending Landing Data` if any of the landings result in a `Pending Landing Data`', () => {

        const input: Shared.ICcQueryResult[] = [{
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
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
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: null,
          durationBetweenCertCreationAndLastLandingRetrieved: null,
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
            licenceHolder: "Mr Bob"
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.CatchRecording
            },
          ],
          source: LandingSources.CatchRecording,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
            licenceHolder: "Mr Bob"
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.CatchRecording
            },
          ],
          source: LandingSources.CatchRecording,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
            licenceHolder: "Mr Bob"
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.ELog
            },
          ],
          source: LandingSources.ELog,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
            licenceHolder: "Mr Bob"
          },
        }];

        const result = SUT.toDynamicsCase2(input);
        expect(result).toEqual(CaseTwoType.PendingLandingData);
      });

      it('will flag as `Real Time Validation - Successful` if all of the landings result in a `Real Time Validation - Successful`', () => {

        mockIsHighRisk.mockReturnValue(false);

        const input: Shared.ICcQueryResult[] = [{
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.LandingDeclaration
            },
          ],
          source: LandingSources.LandingDeclaration,
          isOverusedThisCert: true,
          isOverusedAllCerts: true,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
            licenceHolder: "Mr Bob"
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.CatchRecording
            },
          ],
          source: LandingSources.CatchRecording,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
            licenceHolder: "Mr Bob"
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.CatchRecording
            },
          ],
          source: LandingSources.CatchRecording,
          isOverusedThisCert: false,
          isOverusedAllCerts: true,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
            licenceHolder: "Mr Bob"
          },
        }];

        const result = SUT.toDynamicsCase2(input);
        expect(result).toEqual(CaseTwoType.Success);
      });

      it('will set caseType2=`Data Never Expected` if any of the landings has data ever expected = false  and risk is High', () => {

        mockIsHighRisk.mockReturnValue(true);

        const input: Shared.ICcQueryResult[] = [{
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: false,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 0,
          weightOnLanding: 0,
          weightOnLandingAllSpecies: 0,
          landingTotalBreakdown: [],
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: null,
          durationBetweenCertCreationAndLastLandingRetrieved: null,
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
            licenceHolder: "Mr Bob",
            dataEverExpected: false
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.CatchRecording
            },
          ],
          source: LandingSources.CatchRecording,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
            licenceHolder: "Mr Bob",
            dataEverExpected: true
          },
        }
        ];

        const result = SUT.toDynamicsCase2(input);
        expect(result).toEqual(CaseTwoType.DataNeverExpected);
      });

      it('will flag as `Real Time Validation - Successful` if all the landings has data ever expected = true', () => {

        mockIsHighRisk.mockReturnValue(false);

        const input: Shared.ICcQueryResult[] = [{
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.LandingDeclaration
            },
          ],
          source: LandingSources.LandingDeclaration,
          isOverusedThisCert: true,
          isOverusedAllCerts: true,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
            licenceHolder: "Mr Bob",
            dataEverExpected: true
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.CatchRecording
            },
          ],
          source: LandingSources.CatchRecording,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
            licenceHolder: "Mr Bob",
            dataEverExpected: true
          },
        }];

        const result = SUT.toDynamicsCase2(input);
        expect(result).toEqual(CaseTwoType.Success);
      });

      it('will flag as `Real Time Validation - Overuse` if any of the landings result in a `Real Time Validation - Overuse`', () => {
        mockIsHighRisk.mockReturnValue(true);

        const input: Shared.ICcQueryResult[] = [{
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
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
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: null,
          durationBetweenCertCreationAndLastLandingRetrieved: null,
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
            licenceHolder: "Mr Bob",
            dataEverExpected: true,
            landingDataExpectedDate: '2019-07-14',
            landingDataEndDate: '2019-07-16',
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.CatchRecording
            },
          ],
          source: LandingSources.CatchRecording,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
            licenceHolder: "Mr Bob",
            dataEverExpected: true,
            landingDataExpectedDate: '2019-07-14',
            landingDataEndDate: '2019-07-16',
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.ELog
            },
          ],
          source: LandingSources.ELog,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
            licenceHolder: "Mr Bob",
            dataEverExpected: true,
            landingDataExpectedDate: '2019-07-14',
            landingDataEndDate: '2019-07-16',
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
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
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.CatchRecording
            },
          ],
          source: LandingSources.CatchRecording,
          isOverusedThisCert: false,
          isOverusedAllCerts: true,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
            licenceHolder: "Mr Bob",
            dataEverExpected: true,
            landingDataExpectedDate: '2019-07-14',
            landingDataEndDate: '2019-07-16',
          },
        }];

        const result = SUT.toDynamicsCase2(input);
        expect(result).toEqual(CaseTwoType.RealTimeValidation_Overuse);
      });

      it('will flag as `Real Time Validation - Successful` if all of the landings result in a `Real Time Validation - Successful` and the document is pre approved', () => {
        const input: Shared.ICcQueryResult[] = [{
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.CatchRecording
            },
          ],
          source: LandingSources.CatchRecording,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.ELog
            },
          ],
          source: LandingSources.ELog,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: false,
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.CatchRecording
            },
          ],
          source: LandingSources.CatchRecording,
          isOverusedThisCert: true,
          isOverusedAllCerts: true,
          isExceeding14DayLimit: false,
          isPreApproved: true,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
          },
        }];

        const result = SUT.toDynamicsCase2(input);
        expect(result).toEqual(CaseTwoType.Success);
      });

      it('will flag as `Real Time Validation - Successful` if none of the landings result in a `Pending Landing Data` but some are `Real Time Validation - Overuse` and the document is pre approved', () => {
        mockIsHighRisk.mockReturnValue(true);

        const input: Shared.ICcQueryResult[] = [{
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.CatchRecording
            },
          ],
          source: LandingSources.CatchRecording,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
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
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.CatchRecording
            },
          ],
          source: LandingSources.CatchRecording,
          isOverusedThisCert: false,
          isOverusedAllCerts: true,
          isExceeding14DayLimit: false,
          isPreApproved: true,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
          },
        }];

        const result = SUT.toDynamicsCase2(input);
        expect(result).toEqual(CaseTwoType.Success);
      });

      it('will flag as `Real Time Validation - Successful` if all of the landings result in a `Real Time Validation - Rejected` and the document is pre approved', () => {
        mockIsHighRisk.mockReturnValue(true);

        const input: Shared.ICcQueryResult[] = [{
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
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
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: null,
          durationBetweenCertCreationAndLastLandingRetrieved: null,
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.CatchRecording
            },
          ],
          source: LandingSources.CatchRecording,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
          weightOnCert: 121,
          rawWeightOnCert: 122,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          weightFactor: 5,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 3,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          landingTotalBreakdown: [
            {
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.ELog
            },
          ],
          source: LandingSources.ELog,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
          },
        }, {
          documentNumber: "CC1",
          documentType: "catchCertificate",
          createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
          status: "COMPLETE",
          rssNumber: "rssWA1",
          da: "Guernsey",
          dateLanded: "2019-07-10",
          species: "LBE",
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
              factor: 1.7,
              isEstimate: true,
              weight: 30,
              liveWeight: 51,
              source: LandingSources.CatchRecording
            },
          ],
          source: LandingSources.CatchRecording,
          isOverusedThisCert: false,
          isOverusedAllCerts: true,
          isExceeding14DayLimit: false,
          isPreApproved: true,
          overUsedInfo: [],
          durationSinceCertCreation: moment
            .duration(queryTime.diff(moment.utc("2019-07-13T08:26:06.939Z")))
            .toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          durationBetweenCertCreationAndLastLandingRetrieved: moment
            .duration(
              moment
                .utc("2019-07-11T09:00:00.000Z")
                .diff(moment.utc("2019-07-13T08:26:06.939Z"))
            )
            .toISOString(),
          extended: {
            landingId: "rssWA12019-07-10",
            exporterName: "Mr Bob",
            presentation: "SLC",
            documentUrl: "_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf",
            presentationName: "sliced",
            vessel: "DAYBREAK",
            fao: "FAO27",
            pln: "WA1",
            species: "Lobster",
            state: "FRE",
            stateName: "fresh",
            commodityCode: "1234",
            investigation: {
              investigator: "Investigator Gadget",
              status: InvestigationStatus.Open,
            },
            transportationVehicle: "directLanding",
          },
        }];

        const result = SUT.toDynamicsCase2(input);
        expect(result).toEqual(CaseTwoType.PendingLandingData);
      });

      it('will flag as `Real Time Validation - Successful` if any of `Pending Landing Data` are passed their retrospective end dates', () => {

        const input: Shared.ICcQueryResult[] = [{
          documentNumber: "GBR-2024-CC-EC450B645",
          documentType: "catchCertificate",
          createdAt: "2024-01-29T12:56:37.558Z",
          status: "COMPLETE",
          extended: {
            exporterContactId: "6abd90b4-6f0e-ed11-82e4-000d3addb07a",
            exporterName: "Nik Patel (Test)",
            exporterCompanyName: "nik",
            exporterPostCode: "NE4 7YH",
            vessel: "FREEDOM II",
            landingId: "GBR-2024-CC-EC450B645-6343513023",
            pln: "BH56",
            fao: "FAO27",
            flag: "GBR",
            cfr: "GBR000A14456",
            presentation: "WHL",
            presentationName: "Whole",
            species: "Norway lobster (NEP)",
            scientificName: "Nephrops norvegicus",
            state: "FRE",
            stateName: "Fresh",
            commodityCode: "03063400",
            commodityCodeDescription: "Norway lobsters \"Nephrops norvegicus\", whether in shell or not, live, fresh or chilled",
            transportationVehicle: "truck",
            numberOfSubmissions: 1,
            speciesOverriddenByAdmin: false,
            licenceHolder: "MR  SIMON LITTLE ",
            dataEverExpected: true,
            landingDataExpectedDate: "2024-01-25",
            landingDataEndDate: "2024-01-27",
            isLegallyDue: false,
            homePort: "SUNDERLAND",
            imoNumber: null,
            licenceNumber: "10180",
            licenceValidTo: "2030-12-31"
          },
          rssNumber: "A14456",
          da: "England",
          dateLanded: "2024-01-25",
          species: "NEP",
          weightFactor: 1,
          weightOnCert: 1000,
          rawWeightOnCert: 1000,
          weightOnAllCerts: 1200,
          weightOnAllCertsBefore: 200,
          weightOnAllCertsAfter: 1200,
          isLandingExists: true,
          isExceeding14DayLimit: false,
          speciesAlias: "N",
          durationSinceCertCreation: "PT0.089S",
          source: "LANDING_DECLARATION",
          weightOnLandingAllSpecies: 155,
          numberOfLandingsOnDay: 1,
          durationBetweenCertCreationAndFirstLandingRetrieved: "-PT85H29M10.722S",
          durationBetweenCertCreationAndLastLandingRetrieved: "-PT85H29M10.722S",
          firstDateTimeLandingDataRetrieved: "2024-01-25T23:27:26.836Z",
          isSpeciesExists: true,
          weightOnLanding: 100,
          landingTotalBreakdown: [
            {
              presentation: "WHL",
              state: "FRE",
              source: "LANDING_DECLARATION",
              isEstimate: false,
              factor: 1,
              weight: 100,
              liveWeight: 100
            }
          ],
          isOverusedThisCert: true,
          isOverusedAllCerts: true,
          overUsedInfo: [
            "GBR-2024-CC-33EDF4737",
            "GBR-2024-CC-EC450B645"
          ]
        },
        {
          documentNumber: "GBR-2024-CC-EC450B645",
          documentType: "catchCertificate",
          createdAt: "2024-01-29T12:56:37.558Z",
          status: "COMPLETE",
          extended: {
            exporterContactId: "6abd90b4-6f0e-ed11-82e4-000d3addb07a",
            exporterName: "Nik Patel (Test)",
            exporterCompanyName: "nik",
            exporterPostCode: "NE4 7YH",
            vessel: "NEWBROOK",
            landingId: "GBR-2024-CC-EC450B645-7586183840",
            pln: "DH149",
            fao: "FAO27",
            flag: "GBR",
            cfr: "GBR000A16386",
            presentation: "WHL",
            presentationName: "Whole",
            species: "Atlantic cod (COD)",
            scientificName: "Gadus morhua",
            state: "FRE",
            stateName: "Fresh",
            commodityCode: "03025110",
            commodityCodeDescription: "Fresh or chilled cod \"Gadus morhua\"",
            transportationVehicle: "truck",
            numberOfSubmissions: 1,
            speciesOverriddenByAdmin: false,
            licenceHolder: "MR J JACK ELLIOTT ",
            dataEverExpected: true,
            landingDataExpectedDate: "2024-01-24",
            landingDataEndDate: "2024-01-26",
            isLegallyDue: false,
            homePort: "DARTMOUTH",
            imoNumber: null,
            licenceNumber: "10387",
            licenceValidTo: "2030-12-31"
          },
          rssNumber: "A16386",
          da: "England",
          dateLanded: "2024-01-24",
          species: "COD",
          weightFactor: 1,
          weightOnCert: 45,
          rawWeightOnCert: 45,
          weightOnAllCerts: 90,
          weightOnAllCertsBefore: 45,
          weightOnAllCertsAfter: 90,
          isLandingExists: true,
          isExceeding14DayLimit: false,
          speciesAlias: "N",
          durationSinceCertCreation: "PT0.089S",
          source: "ELOG",
          weightOnLandingAllSpecies: 200,
          numberOfLandingsOnDay: 1,
          durationBetweenCertCreationAndFirstLandingRetrieved: "-PT85H14M48.886S",
          durationBetweenCertCreationAndLastLandingRetrieved: "-PT85H14M48.886S",
          firstDateTimeLandingDataRetrieved: "2024-01-25T23:41:48.672Z",
          isSpeciesExists: false,
          weightOnLanding: 0,
          isOverusedAllCerts: false,
          isOverusedThisCert: false,
          overUsedInfo: []
        },
        {
          documentNumber: "GBR-2024-CC-EC450B645",
          documentType: "catchCertificate",
          createdAt: "2024-01-29T12:56:37.558Z",
          status: "COMPLETE",
          extended: {
            exporterContactId: "6abd90b4-6f0e-ed11-82e4-000d3addb07a",
            exporterName: "Nik Patel (Test)",
            exporterCompanyName: "nik",
            exporterPostCode: "NE4 7YH",
            vessel: "EDWARD HENRY",
            landingId: "GBR-2024-CC-EC450B645-2441394875",
            pln: "DH100",
            fao: "FAO27",
            flag: "GBR",
            cfr: "GBR000C17553",
            presentation: "WHL",
            presentationName: "Whole",
            species: "Norway lobster (NEP)",
            scientificName: "Nephrops norvegicus",
            state: "FRE",
            stateName: "Fresh",
            commodityCode: "03063400",
            commodityCodeDescription: "Norway lobsters \"Nephrops norvegicus\", whether in shell or not, live, fresh or chilled",
            transportationVehicle: "truck",
            numberOfSubmissions: 1,
            speciesOverriddenByAdmin: false,
            licenceHolder: "MR R J MITCHELMORE",
            dataEverExpected: true,
            landingDataExpectedDate: "2024-01-25",
            landingDataEndDate: "2024-01-27",
            isLegallyDue: true,
            homePort: "DARTMOUTH",
            imoNumber: 9264398,
            licenceNumber: "11869",
            licenceValidTo: "2030-12-31"
          },
          rssNumber: "C17553",
          da: "England",
          dateLanded: "2024-01-25",
          species: "NEP",
          weightFactor: 1,
          weightOnCert: 100,
          rawWeightOnCert: 100,
          weightOnAllCerts: 300,
          weightOnAllCertsBefore: 200,
          weightOnAllCertsAfter: 300,
          isLandingExists: true,
          isExceeding14DayLimit: false,
          speciesAlias: "N",
          durationSinceCertCreation: "PT0.089S",
          source: "ELOG",
          weightOnLandingAllSpecies: 100,
          numberOfLandingsOnDay: 1,
          durationBetweenCertCreationAndFirstLandingRetrieved: "-PT85H29M10.493S",
          durationBetweenCertCreationAndLastLandingRetrieved: "-PT85H29M10.493S",
          firstDateTimeLandingDataRetrieved: "2024-01-25T23:27:27.065Z",
          isSpeciesExists: true,
          weightOnLanding: 100,
          landingTotalBreakdown: [
            {
              presentation: "WHL",
              state: "FRE",
              source: "ELOG",
              isEstimate: true,
              factor: 1,
              weight: 100,
              liveWeight: 100
            }
          ],
          isOverusedThisCert: false,
          isOverusedAllCerts: true,
          overUsedInfo: [
            "GBR-2024-CC-BE5C906A4",
            "GBR-2024-CC-33EDF4737",
            "GBR-2024-CC-EC450B645"
          ]
        }];

        const result = SUT.toDynamicsCase2(input);
        expect(result).toEqual(CaseTwoType.Success);
      });


    });

  });

  describe("When mapping from an ICcQueryResult to a IDynamicsLanding", () => {

    let mockGetVesselLength;

    beforeEach(() => {
      mockGetVesselLength = jest.spyOn(VesselService, 'getVesselLength');
      mockGetVesselLength.mockReturnValue(9);
    });

    afterEach(() => {
      mockGetVesselLength.mockRestore();
    });

    const input: Shared.ICcQueryResult = {
      documentNumber: 'CC1',
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
      isLandingExists: false,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 51,
      weightOnLandingAllSpecies: 30,
      isOverusedThisCert: false,
      isOverusedAllCerts: true,
      isExceeding14DayLimit: true,
      overUsedInfo: ["CC2", "CC3"],
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
        exporterPostCode: 'AB1 2XX',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
        presentation: 'SLC',
        presentationAdmin: 'sliced admin',
        presentationName: 'sliced',
        vessel: 'DAYBREAK',
        licenceHolder: 'MASTER OF VESSEL',
        fao: 'FAO27',
        pln: 'WA1',
        species: 'Lobster',
        speciesAdmin: 'Lobster Admin',
        scientificName: "Gadus morhua",
        state: 'FRE',
        stateAdmin: 'fresh admin',
        stateName: 'fresh',
        commodityCode: '1234',
        commodityCodeAdmin: '1234 - ADMIN',
        commodityCodeDescription: "Fresh or chilled fillets of cod",
        investigation: {
          investigator: "Investigator Gadget",
          status: InvestigationStatus.Open
        },
        transportationVehicle: 'directLanding',
        numberOfSubmissions: 1,
        dataEverExpected: true,
        landingDataExpectedDate: "2019-07-10",
        landingDataEndDate: "2019-07-12"
      }
    }

    it('will map all root properties', () => {
      const result: Shared.IDynamicsLanding = SUT.toLanding(input);

      expect(result.status).toEqual(Shared.LandingStatusType.ValidationFailure_NoLandingData);
      expect(result.id).toEqual('rssWA12019-07-10');
      expect(result.landingDate).toEqual('2019-07-10');
      expect(result.species).toEqual('LBE');
      expect(result.state).toEqual('FRE');
      expect(result.vesselPln).toEqual('WA1');
      expect(result.vesselLength).toBe(9);
      expect(result.licenceHolder).toBe('MASTER OF VESSEL')
      expect(result.source).toBeUndefined();
      expect(result.weight).toEqual(122);
      expect(result.numberOfTotalSubmissions).toEqual(1);
      expect(result.risking?.overuseInfo).toEqual(["CC2", "CC3"]);
      expect(result.vesselOverriddenByAdmin).toBe(false);
      expect(result.cnCode).toBe("1234");
      expect(result.commodityCodeDescription).toBe("Fresh or chilled fillets of cod");
      expect(result.scientificName).toBe("Gadus morhua");
      expect(result.landingDataExpectedAtSubmission).toBe(true);
      expect(result.is14DayLimitReached).toBe(true);
      expect(result.adminSpecies).toBe('Lobster Admin');
      expect(result.adminCommodityCode).toBe('1234 - ADMIN');
      expect(result.adminState).toBe('fresh admin');
      expect(result.adminPresentation).toBe('sliced admin');
    });

    it('will not have a source if there is no landings', () => {
      const input: Shared.ICcQueryResult = {
        documentNumber: 'CC1',
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
        isLandingExists: false,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 51,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [],
        isOverusedThisCert: true,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          landingId: 'rssWA12019-07-10',
          exporterName: 'Mr Bob',
          presentation: 'SLC',
          documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          transportationVehicle: 'directLanding'
        }
      }

      const result: Shared.IDynamicsLanding = SUT.toLanding(input);

      expect(result.source).toEqual(undefined)
    });

    it('will include a vessel overridden flag if the vessel has been overridden', () => {

      const input: Shared.ICcQueryResult = {
        documentNumber: 'CC1',
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
        isLandingExists: false,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 51,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [],
        isOverusedThisCert: true,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        durationSinceCertCreation: moment.duration(
          queryTime
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
        extended: {
          landingId: 'rssWA12019-07-10',
          exporterName: 'Mr Bob',
          presentation: 'SLC',
          documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          vesselOverriddenByAdmin: true
        }
      }

      const result: Shared.IDynamicsLanding = SUT.toLanding(input);

      expect(result.vesselOverriddenByAdmin).toBeTruthy();
    });

    it('will include a landingDataExpectedAtSubmission flag as false if the submission date is before the expected date for landing data', () => {
      const input: Shared.ICcQueryResult = {
        documentNumber: 'CC1',
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
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 51,
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
        source: LandingSources.CatchRecording,
        isOverusedThisCert: false,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        overUsedInfo: ["CC2", "CC3"],
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
          exporterPostCode: 'AB1 2XX',
          presentation: 'SLC',
          documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
          presentationName: 'sliced',
          vessel: 'DAYBREAK',
          licenceHolder: 'MASTER OF VESSEL',
          fao: 'FAO27',
          pln: 'WA1',
          species: 'Lobster',
          scientificName: "Gadus morhua",
          state: 'FRE',
          stateName: 'fresh',
          commodityCode: '1234',
          commodityCodeDescription: "Fresh or chilled fillets of cod",
          investigation: {
            investigator: "Investigator Gadget",
            status: InvestigationStatus.Open
          },
          transportationVehicle: 'directLanding',
          numberOfSubmissions: 1,
          dataEverExpected: true,
          landingDataExpectedDate: "2019-07-14",
          landingDataEndDate: "2019-07-20"
        }
      }

      const result: Shared.IDynamicsLanding = SUT.toLanding(input);
      expect(result.landingDataExpectedAtSubmission).toBe(false);
    });

  });

  describe('When mapping from an ICcQueryResult to an IDynamicsLandingValidation', () => {

    const input: Shared.ICcQueryResult = {
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
      isLandingExists: true,
      hasSalesNote: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 51,
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
      source: LandingSources.CatchRecording,
      speciesAlias: 'Y',
      speciesAnomaly: 'CAA',
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
        exporterPostCode: 'SE1 2XX',
        presentation: 'SLC',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
        isLegallyDue: false
      }
    }

    ApplicationConfig.prototype.internalAppUrl = "http://localhost:6500"

    let mockGetVesselLength;

    beforeEach(() => {
      mockGetVesselLength = jest.spyOn(VesselService, 'getVesselLength');
      mockGetVesselLength.mockReturnValue(9);
    });

    afterEach(() => {
      mockGetVesselLength.mockRestore();
    });

    it('will map all root properties', () => {
      const result: Shared.IDynamicsLanding = SUT.toLanding(input);

      expect(result.validation.liveExportWeight).toEqual(121)
      expect(result.validation.totalEstimatedForExportSpecies).toEqual(30)
      expect(result.validation.totalEstimatedWithTolerance).toEqual(33)
      expect(result.validation.totalRecordedAgainstLanding).toEqual(200)
      expect(result.validation.landedWeightExceededBy).toEqual(167)
      expect(result.validation.rawLandingsUrl).toEqual('http://localhost:6500/reference/api/v1/extendedData/rawLandings?dateLanded=2019-07-10&rssNumber=rssWA1');
      expect(result.validation.salesNoteUrl).toEqual('http://localhost:6500/reference/api/v1/extendedData/salesNotes?dateLanded=2019-07-10&rssNumber=rssWA1');
      expect(result.validation.isLegallyDue).toBe(false);
      expect(result.source).toBe('CATCH_RECORDING');
      expect(result.speciesAlias).toBe('Y');
      expect(result.speciesAnomaly).toBe('CAA');
    });

    it('will not include a rawLandingURL or salesNoteURL if no landing data is found', () => {

      const input: Shared.ICcQueryResult = {
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
          exporterPostCode: 'SE1 2XX',
          presentation: 'SLC',
          documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          isLegallyDue: false
        }
      }

      const result: Shared.IDynamicsLanding = SUT.toLanding(input);

      expect(result.validation.rawLandingsUrl).toBeUndefined();
      expect(result.validation.salesNoteUrl).toBeUndefined();
      expect(result.source).toBeUndefined();
    });

    it('will not include a rawLandingURL or salesNoteURL if landing data is not expected', () => {

      const input: Shared.ICcQueryResult = {
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
        isLandingExists: true,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 51,
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
        source: LandingSources.CatchRecording,
        speciesAlias: 'Y',
        speciesAnomaly: 'CAA',
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
          exporterPostCode: 'SE1 2XX',
          presentation: 'SLC',
          documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          isLegallyDue: false,
          dataEverExpected: false
        }
      }

      const result: Shared.IDynamicsLanding = SUT.toLanding(input);

      expect(result.validation.rawLandingsUrl).toBeUndefined();
      expect(result.validation.salesNoteUrl).toBeUndefined();
    });

    it('will have a totalWeightForSpecies (raw weight)', () => {
      const input: Shared.ICcQueryResult = {
        documentNumber: 'CC1',
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
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 51,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [
          {
            factor: 1.7,
            isEstimate: false,
            weight: 30,
            liveWeight: 51,
            source: LandingSources.LandingDeclaration
          }],
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
          documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          transportationVehicle: 'directLanding'
        }
      }

      const result: Shared.IDynamicsLanding = SUT.toLanding(input);

      expect(result.validation.totalWeightForSpecies).toEqual(30)
    });

    it('will have a landedWeightExceededBy for landing decs', () => {
      const input: Shared.ICcQueryResult = {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
        status: 'COMPLETE',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: moment('2019-07-10').format('YYYY-MM-DD'),
        species: 'LBE',
        weightOnCert: 500,
        rawWeightOnCert: 500,
        weightOnAllCerts: 500,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 500,
        weightFactor: 5,
        isLandingExists: true,
        isSpeciesExists: true,
        isExceeding14DayLimit: false,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 50,
        weightOnLandingAllSpecies: 500,
        landingTotalBreakdown: [
          {
            factor: 1,
            isEstimate: false,
            weight: 50,
            liveWeight: 50,
            source: LandingSources.LandingDeclaration
          }
        ],
        source: LandingSources.LandingDeclaration,
        isOverusedThisCert: true,
        isOverusedAllCerts: true,
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
          documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          transportationVehicle: 'directLanding'
        }
      }

      const result: Shared.IDynamicsLanding = SUT.toLanding(input);

      expect(result.validation.landedWeightExceededBy).toEqual(450)
    });

    it('will have a legally due value', () => {
      const result: Shared.IDynamicsLanding = SUT.toLanding(input);

      expect(mockGetVesselLength).toHaveBeenCalledWith('WA1', input.dateLanded);
      expect(result.validation.isLegallyDue).toEqual(false);
    });

    describe('when species exists', () => {

      it('will have a `totalLiveForExportSpecies` property only when cert is validated by Landing Declation', () => {
        const inputValidatedByLandingDeclaration = {
          ...input,
          source: LandingSources.LandingDeclaration
        };

        const result: Shared.IDynamicsLanding = SUT.toLanding(inputValidatedByLandingDeclaration);

        expect(result.validation.totalLiveForExportSpecies).toBeDefined();
      });

      it('will not have a `totalLiveForExportSpecies` property only when cert is validated by Catch Recording', () => {
        const result: Shared.IDynamicsLanding = SUT.toLanding(input);
        expect(result.validation.totalLiveForExportSpecies).toBeUndefined();
      });

      it('will not have a `totalLiveForExportSpecies` property only when cert is validated by ELog', () => {
        const inputValidatedByElog = {
          ...input,
          source: LandingSources.ELog
        };

        const result: Shared.IDynamicsLanding = SUT.toLanding(inputValidatedByElog);
        expect(result.validation.totalLiveForExportSpecies).toBeUndefined();
      });
    });

    describe('when species does not exists', () => {

      it('will not have a `totalLiveForExportSpecies` property if cert has a species mis-match', () => {
        const inputWithSpeciesMisMatch = {
          ...input,
          isSpeciesExists: false
        };

        const result: Shared.IDynamicsLanding = SUT.toLanding(inputWithSpeciesMisMatch);
        expect(result.validation.totalLiveForExportSpecies).toBeUndefined();
      });

      it('will not have a `totalLiveForExportSpecies` property when cert is validated by Landing Declation', () => {
        const inputWithSpeciesMisMatchValidatedByLandingDeclaration = {
          ...input,
          source: LandingSources.LandingDeclaration,
          isSpeciesExists: false
        };

        const result: Shared.IDynamicsLanding = SUT.toLanding(inputWithSpeciesMisMatchValidatedByLandingDeclaration);

        expect(result.validation.totalLiveForExportSpecies).toBeUndefined();
      });

    });

  });

  describe('When mapping from an ICcQueryResult to an IDynamicsRisk', () => {

    let mockTotalRiskScore;
    let mockVesselOfInterestRiskScore;
    let mockExporterSpeciesRiskScore;
    let mockSpeciesRiskScore;
    let mockGetRiskThreshold;

    beforeEach(() => {
      mockTotalRiskScore = jest.spyOn(RiskRating, 'getTotalRiskScore');
      mockVesselOfInterestRiskScore = jest.spyOn(RiskRating, 'getVesselOfInterestRiskScore');
      mockExporterSpeciesRiskScore = jest.spyOn(RiskRating, 'getExporterBehaviourRiskScore');
      mockSpeciesRiskScore = jest.spyOn(RiskRating, 'getExportedSpeciesRiskScore');
      mockGetRiskThreshold = jest.spyOn(Cache, 'getRiskThreshold');

      mockTotalRiskScore.mockReturnValue(1.0);
      mockVesselOfInterestRiskScore.mockReturnValue(1.0);
      mockExporterSpeciesRiskScore.mockReturnValue(1.0);
      mockSpeciesRiskScore.mockReturnValue(1.0);
      mockGetRiskThreshold.mockReturnValue(1.0);
    });

    afterAll(() => {
      mockTotalRiskScore.mockRestore();
      mockVesselOfInterestRiskScore.mockRestore();
      mockExporterSpeciesRiskScore.mockRestore();
      mockSpeciesRiskScore.mockRestore();
      mockGetRiskThreshold.mockRestore();
    });

    it('will map all root properties', () => {
      const input: Shared.ICcQueryResult = {
        documentNumber: 'CC1',
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
        isLandingExists: false,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 51,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [],
        isOverusedThisCert: true,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        overUsedInfo: ["CC2", "CC3"],
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
          exporterAccountId: 'some-account-id',
          exporterContactId: 'some-contact-id',
          exporterName: 'Mr Bob',
          presentation: 'SLC',
          documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          transportationVehicle: 'directLanding'
        }
      }

      const result: Shared.IDynamicsLanding = SUT.toLanding(input);

      expect(mockIsHighRisk).toHaveBeenCalledWith(1.0);
      expect(mockTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
      expect(mockVesselOfInterestRiskScore).toHaveBeenCalledWith('WA1');
      expect(mockExporterSpeciesRiskScore).toHaveBeenCalledWith('some-account-id', 'some-contact-id');
      expect(mockSpeciesRiskScore).toHaveBeenCalledWith('LBE');

      expect(result.risking?.overuseInfo).toEqual(["CC2", "CC3"]);
      expect(result.risking?.landingRiskScore).toEqual("1");
      expect(result.risking?.exporterRiskScore).toEqual("1");
      expect(result.risking?.speciesRisk).toEqual("1");
      expect(result.risking?.vessel).toEqual("1");
      expect(result.risking?.highOrLowRisk).toBe(Shared.LevelOfRiskType.Low);
    });

    it('will not display over use info if its empty', () => {
      const input: Shared.ICcQueryResult = {
        documentNumber: 'CC1',
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
        isLandingExists: false,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 51,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [],
        isOverusedThisCert: true,
        isOverusedAllCerts: false,
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
          documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          transportationVehicle: 'directLanding'
        }
      }

      const result: Shared.IDynamicsLanding = SUT.toLanding(input);

      expect(result.risking?.overuseInfo).toBeUndefined();
    });

    it('will not have an overuse array when the failure overuse occurs on this document', () => {
      const input: Shared.ICcQueryResult = {
        documentNumber: 'CC1',
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
        isLandingExists: false,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 51,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [],
        isOverusedThisCert: true,
        isOverusedAllCerts: false,
        isExceeding14DayLimit: false,
        overUsedInfo: ['CC1'],
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
          documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          transportationVehicle: 'directLanding'
        }
      }

      const result: Shared.IDynamicsLanding = SUT.toLanding(input);

      expect(result.risking?.overuseInfo).toBeUndefined();
    });

    it('will not include current document number in overuseInfo array when the failure overuse occurs on this document', () => {
      const input: Shared.ICcQueryResult = {
        documentNumber: 'CC1',
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
        isLandingExists: false,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 51,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [],
        isOverusedThisCert: true,
        isOverusedAllCerts: false,
        isExceeding14DayLimit: false,
        overUsedInfo: ['CC1', 'CC2'],
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
          documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          transportationVehicle: 'directLanding'
        }
      }

      const result: Shared.IDynamicsLanding = SUT.toLanding(input);

      expect(result.risking?.overuseInfo).toStrictEqual(["CC2"])
    });
  });

  describe("When assigning a case2Type to a IDynamicsProcessingStatementCase and IDynamicsStorageDocumentCase", () => {
    it("will contain correct string for RealTimeValidation_Success", () => {
      const result = SdPsCaseTwoType.RealTimeValidation_Success;
      expect(result).toBe("Real Time Validation - Successful");
    });

    it("will contain correct string for RealTimeValidation_Overuse", () => {
      const result = SdPsCaseTwoType.RealTimeValidation_Overuse;
      expect(result).toBe("Real Time Validation - Overuse Failure");
    });

    it("will contain correct string for RealTimeValidation_Weight", () => {
      const result = SdPsCaseTwoType.RealTimeValidation_Weight;
      expect(result).toBe("Real Time Validation - Weight Failure");
    });

    it("will contain correct string for VOID by an exporter", () => {
      const result = SdPsCaseTwoType.VoidByExporter;
      expect(result).toBe("Void by an Exporter");
    });
  });

  describe("When assigning a SdPsStatus to validation within IDynamicsProcessingStatementCatch", () => {
    it("will contain correct string for Success", () => {
      const result = SdPsStatus.Success;
      expect(result).toBe("Validation Success");
    });
    it("will contain correct string for Overuse", () => {
      const result = SdPsStatus.Overuse;
      expect(result).toBe("Validation Failure - Overuse");
    });
    it("will contain correct string for Weight", () => {
      const result = SdPsStatus.Weight;
      expect(result).toBe("Validation Failure - Weight");
    });

  });

  describe('When mapping from an ISdPsQueryResult to a IDynamicsProcessingStatementCatch', () => {
    const input: ISdPsQueryResult = {
      documentNumber: "PS1",
      catchCertificateNumber: "PS2",
      catchCertificateType: "uk",
      documentType: "PS",
      createdAt: "2020-01-01",
      status: "COMPLETE",
      species: "Atlantic cod (COD)",
      scientificName: "Gadus morhua",
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
        id: 'PS2-1610018839',
      }
    };

    it('will map the foreignCatchCertificateNumber', () => {
      const result = toPsCatch(input);

      expect(result.foreignCatchCertificateNumber).toEqual("PS2");
    });

    it('will map the catchCertificateType', () => {
      const result = toPsCatch(input);

      expect(result.isDocumentIssuedInUK).toBe(true);
    });

    it('will map the species code', () => {
      const result = toPsCatch(input);

      expect(result.species).toEqual("COD");
    });

    it('will map the commodity code', () => {
      const result = toPsCatch(input);

      expect(result.cnCode).toEqual("FRESHCOD");
    })

    it('will map the importedWeight', () => {
      const result = toPsCatch(input);

      expect(result.importedWeight).toEqual(200);
    });

    it('will map usedWeightAgainstCertificate', () => {
      const result = toPsCatch(input);

      expect(result.usedWeightAgainstCertificate).toEqual(100)
    });

    it('will map processedWeight', () => {
      const result = toPsCatch(input);

      expect(result.processedWeight).toEqual(80)
    });

    it('will map a scientific name', () => {
      const result = toPsCatch(input);

      expect(result.scientificName).toBe("Gadus morhua");
    });

    describe("The validation within IDynamicsProcessingStatementCatch", () => {
      it('will contain totalUsedWeightAgainstCertificate', () => {
        const result = toPsCatch(input);

        expect(result.validation.totalUsedWeightAgainstCertificate).toEqual(150)
      });

      it('will highlight `Success` if there is no failure', () => {
        const input: ISdPsQueryResult = {
          documentNumber: "PS1",
          catchCertificateNumber: "PS2",
          documentType: "PS",
          createdAt: "2020-01-01",
          status: "COMPLETE",
          species: "COD",
          commodityCode: "FRESHCOD",
          weightOnDoc: 100,
          weightOnAllDocs: 100,
          weightOnFCC: 200,
          weightAfterProcessing: 80,
          isOverAllocated: false,
          isMismatch: false,
          overAllocatedByWeight: 0,
          overUsedInfo: [],
          da: null,
          extended: {
            id: 'PS2-1610018839',
          }
        };

        const result = toPsCatch(input);

        expect(result.validation.status).toEqual(SdPsStatus.Success)
      });

      it('will highlight when the failure reason is the weight', () => {
        const input: ISdPsQueryResult = {
          documentNumber: "PS1",
          catchCertificateNumber: "PS2",
          documentType: "PS",
          createdAt: "2020-01-01",
          status: "COMPLETE",
          species: "COD",
          commodityCode: "FRESHCOD",
          weightOnDoc: 100,
          weightOnAllDocs: 150,
          weightOnFCC: 200,
          weightAfterProcessing: 80,
          isOverAllocated: false,
          overUsedInfo: [],
          isMismatch: true,
          overAllocatedByWeight: 0,
          da: null,
          extended: {
            id: 'PS2-1610018839',
          }
        };

        const result = toPsCatch(input);

        expect(result.validation.status).toEqual(SdPsStatus.Weight)
      });

      it('will highlight when the failure reason is overuse', () => {
        const input: ISdPsQueryResult = {
          documentNumber: "PS1",
          catchCertificateNumber: "PS2",
          documentType: "PS",
          createdAt: "2020-01-01",
          status: "COMPLETE",
          species: "COD",
          commodityCode: "FRESHCOD",
          weightOnDoc: 100,
          weightOnAllDocs: 150,
          weightOnFCC: 200,
          weightAfterProcessing: 80,
          isOverAllocated: true,
          isMismatch: false,
          overAllocatedByWeight: 50,
          overUsedInfo: [],
          da: null,
          extended: {
            id: 'PS2-1610018839',
          }
        };

        const result = toPsCatch(input);

        expect(result.validation.weightExceededAmount).toEqual(50)
      });

      it('will have the over use array when the failure reason is overuse', () => {
        const input: ISdPsQueryResult = {
          documentNumber: "PS1",
          catchCertificateNumber: "PS2",
          documentType: "PS",
          createdAt: "2020-01-01",
          status: "COMPLETE",
          species: "COD",
          commodityCode: "FRESHCOD",
          weightOnDoc: 100,
          weightOnAllDocs: 150,
          weightOnFCC: 200,
          weightAfterProcessing: 80,
          isOverAllocated: false,
          overUsedInfo: ["PS3"],
          isMismatch: false,
          overAllocatedByWeight: 50,
          da: null,
          extended: {
            id: 'PS2-1610018839',
          }
        };

        const result = toPsCatch(input);

        expect(result.validation.overuseInfo).toEqual(["PS3"])
      });

      it('will not have an overuse array when the failure overuse occurs on this document', () => {
        const input: ISdPsQueryResult = {
          documentNumber: "PS1",
          catchCertificateNumber: "PS2",
          documentType: "PS",
          createdAt: "2020-01-01",
          status: "COMPLETE",
          species: "COD",
          commodityCode: "FRESHCOD",
          weightOnDoc: 100,
          weightOnAllDocs: 150,
          weightOnFCC: 200,
          weightAfterProcessing: 80,
          isOverAllocated: false,
          overUsedInfo: ["PS1"],
          isMismatch: false,
          overAllocatedByWeight: 50,
          da: null,
          extended: {
            id: 'PS2-1610018839',
          }
        };

        const result = toPsCatch(input);

        expect(result.validation.overuseInfo).toBeUndefined();
      });

      it('will not include current document number in overuseInfo array when the failure overuse occurs on this document', () => {
        const input: ISdPsQueryResult = {
          documentNumber: "PS1",
          catchCertificateNumber: "PS2",
          documentType: "PS",
          createdAt: "2020-01-01",
          status: "COMPLETE",
          species: "COD",
          commodityCode: "FRESHCOD",
          weightOnDoc: 100,
          weightOnAllDocs: 150,
          weightOnFCC: 200,
          weightAfterProcessing: 80,
          isOverAllocated: false,
          overUsedInfo: ["PS1", "PS2"],
          isMismatch: false,
          overAllocatedByWeight: 50,
          da: null,
          extended: {
            id: 'PS2-1610018839',
          }
        };

        const result = toPsCatch(input);

        expect(result.validation.overuseInfo).toStrictEqual(["PS2"]);
      });
    });
  });

  describe('When mapping to a SDPS case type two', () => {
    it('if there are no errors, the output will be Success', () => {
      const input: ISdPsQueryResult[] = [{
        documentNumber: "PS1",
        catchCertificateNumber: "PS2",
        documentType: "PS",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "COD",
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
          id: 'PS2-1610018839',
        }
      }];

      const result = toSdPsCaseTwoType(input);

      expect(result).toEqual(SdPsCaseTwoType.RealTimeValidation_Success)
    });

    it('will be Weight if there are any Weight errors', () => {
      const input: ISdPsQueryResult[] = [{
        documentNumber: "PS1",
        catchCertificateNumber: "PS2",
        documentType: "PS",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "COD",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        isMismatch: false,
        overAllocatedByWeight: 0,
        overUsedInfo: [],
        da: null,
        extended: {
          id: 'PS2-1610018839',
        }
      }, {
        documentNumber: "PS1",
        catchCertificateNumber: "PS2",
        documentType: "PS",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "COD",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        overUsedInfo: [],
        isMismatch: true,
        overAllocatedByWeight: 0,
        da: null,
        extended: {
          id: 'PS2-1610018859',
        }
      }];

      const result = toSdPsCaseTwoType(input);

      expect(result).toEqual(SdPsCaseTwoType.RealTimeValidation_Weight)
    });

    it('will be Overuse if there are any Overuse errors', () => {
      const input: ISdPsQueryResult[] = [{
        documentNumber: "PS1",
        catchCertificateNumber: "PS2",
        documentType: "PS",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "COD",
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
          id: 'PS2-1610018839',
        }
      }, {
        documentNumber: "PS1",
        catchCertificateNumber: "PS2",
        documentType: "PS",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "COD",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: false,
        overUsedInfo: [],
        isMismatch: true,
        overAllocatedByWeight: 0,
        da: null,
        extended: {
          id: 'PS2-161001859',
        }
      }, {
        documentNumber: "PS1",
        catchCertificateNumber: "PS2",
        documentType: "PS",
        createdAt: "2020-01-01",
        status: "COMPLETE",
        species: "COD",
        commodityCode: "FRESHCOD",
        weightOnDoc: 100,
        weightOnAllDocs: 150,
        weightOnFCC: 200,
        weightAfterProcessing: 80,
        isOverAllocated: true,
        overUsedInfo: [],
        isMismatch: false,
        overAllocatedByWeight: 0,
        da: null,
        extended: {
          id: 'PS2-1610018869',
        }
      }];

      const result = toSdPsCaseTwoType(input);

      expect(result).toEqual(SdPsCaseTwoType.RealTimeValidation_Overuse)
    })
  });

  describe('When mapping from an ISdPsQueryResult to IDynamicsProcessingStatementCase', () => {

    const examplePS: IDocument = {
      createdAt: new Date("2020-06-09T11:27:49.000Z"),
      __t: "processingStatement",
      createdBy: "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      status: "COMPLETE",
      documentNumber: "GBR-2020-PS-BA8A6BE06",
      requestByAdmin: false,
      audit: [{
        eventType: 'AuditEventTypes.PreApproved',
        triggeredBy: "Bob",
        timestamp: new Date(),
        data: null
      }, {
        eventType: 'AuditEventTypes.Investigated',
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
            exportWeightAfterProcessing: 3,
            scientificName: "Gadus morhua"
          }],
        exporterDetails: {
          contactId: "a contact id",
          accountId: "an account id",
          exporterCompanyName: "Exporter Co",
          addressOne: "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          townCity: "T",
          postcode: "AB1 1AB",
          buildingNumber: "123",
          subBuildingName: "Unit 1",
          buildingName: "CJC Fish Ltd",
          streetName: "17 Old Edinburgh Road",
          county: "West Midlands",
          country: "England",
          _dynamicsAddress: "dynamics"
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

    const input: ISdPsQueryResult = {
      documentNumber: "PS1",
      catchCertificateNumber: "PS2",
      documentType: "PS",
      createdAt: "2020-01-01",
      status: "COMPLETE",
      species: "COD",
      scientificName: "Gadus morhua",
      commodityCode: "FRESHCOD",
      weightOnDoc: 100,
      weightOnAllDocs: 150,
      weightOnFCC: 200,
      weightAfterProcessing: 80,
      isOverAllocated: false,
      isMismatch: false,
      overAllocatedByWeight: 0,
      overUsedInfo: [],
      da: null,
      extended: {
        id: 'PS2-1610018839',
      }
    };

    it('will map an exporter details', () => {
      const result = toDynamicsPs([input], examplePS, correlationId);

      expect(result.exporter).toStrictEqual({
        companyName: "Exporter Co",
        address: {
          building_number: "123",
          sub_building_name: "Unit 1",
          building_name: "CJC Fish Ltd",
          street_name: "17 Old Edinburgh Road",
          county: "West Midlands",
          country: "England",
          line1: "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          city: "T",
          postCode: "AB1 1AB"
        },
        contactId: "a contact id",
        accountId: "an account id",
        dynamicsAddress: "dynamics"
      }
      )
    })

    it('will contains documentDate', () => {
      const result = toDynamicsPs([input], examplePS, correlationId);

      expect(result.documentDate).toBe('2020-06-09T11:27:49.000Z');
    })

    it('will contains documentURI', () => {
      const result = toDynamicsPs([input], examplePS, correlationId);

      expect(result.documentUrl).toContain('_fd91895a-85e5-4e1b-90ef-53cffe3ac758.pdf');
    })

    it('will map the catches', () => {
      const result = toDynamicsPs([input], examplePS, correlationId);

      expect(result.catches?.length).toBeGreaterThan(0);
    });

    it('will map the consignment description to processed fishery products', () => {
      const result = toDynamicsPs([input], examplePS, correlationId);

      expect(result.processedFisheryProducts).toBe("test");
    });


    it('will map the documentNumber', () => {
      const result = toDynamicsPs([input], examplePS, correlationId);

      expect(result.documentNumber).toEqual('GBR-2020-PS-BA8A6BE06');
    });

    it('will map the Case type One', () => {
      const result = toDynamicsPs([input], examplePS, correlationId);

      expect(result.caseType1).toEqual('PS');
    });

    it('will map the Person Responsible', () => {
      const result = toDynamicsPs([input], examplePS, correlationId);

      expect(result.personResponsible).toEqual("Bob Bobby");
    });

    it('will map the Plant Name', () => {
      const result = toDynamicsPs([input], examplePS, correlationId);

      expect(result.plantName).toEqual("Bob's plant");
    });

    it('will map the number of failed submissions', () => {
      const result = toDynamicsPs([input], examplePS, correlationId);

      expect(result.numberOfFailedSubmissions).toEqual(5);
    });

    it('will map the case two type', () => {
      const result = toDynamicsPs([input], examplePS, correlationId);

      expect(result.caseType2).toEqual(SdPsCaseTwoType.RealTimeValidation_Success);
    });

    it('will include a correlationId', () => {
      const result = toDynamicsPs([input], examplePS, correlationId);

      expect(result._correlationId).toEqual('some-uuid-correlation-id');
    });

    it('will include a requestedByAdmin flag', () => {
      const result = toDynamicsPs([input], examplePS, correlationId);

      expect(result.requestedByAdmin).toEqual(false);
    });

    it('will include all root properties required for a VOID payload', () => {
      const result = toDynamicsPs(null, examplePS, correlationId, SdPsCaseTwoType.VoidByExporter);

      expect(result.caseType2).toEqual("Void by an Exporter");
      expect(result.catches).toBeUndefined();
    });

    it('will include an exportedTo', () => {
      const result = toDynamicsPs([input], examplePS, correlationId);

      expect(result.exportedTo).toEqual({
        officialCountryName: "Nigeria",
        isoCodeAlpha2: "NG",
        isoCodeAlpha3: "NGA"
      });
    });
  });

  describe('When mapping fron an ISdPsQueryResult to a IDynamicsStorageDocumentProduct', () => {
    const input: ISdPsQueryResult = {
      documentNumber: "SD1",
      catchCertificateNumber: "SD2",
      catchCertificateType: "uk",
      documentType: "SD",
      createdAt: "2020-01-01",
      status: "COMPLETE",
      species: "Atlantic cod (COD)",
      scientificName: "Gadus morhua",
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
        id: 'SD2-1610018839',
      }
    };

    it('will map the foreignCatchCertificateNumber', () => {
      const result = toSdProduct(input);

      expect(result.foreignCatchCertificateNumber).toEqual("SD2");
    });

    it('will map the certificateType', () => {
      const result = toSdProduct(input);

      expect(result.isDocumentIssuedInUK).toEqual(true);
    });

    it('will map the species code', () => {
      const result = toSdProduct(input);

      expect(result.species).toEqual("COD");
    });

    it('will map the commodity code', () => {
      const result = toSdProduct(input);

      expect(result.cnCode).toEqual("FRESHCOD");
    })

    it('will map the importedWeight', () => {
      const result = toSdProduct(input);

      expect(result.importedWeight).toEqual(200);
    });

    it('will map exportedWeight', () => {
      const result = toSdProduct(input);

      expect(result.exportedWeight).toEqual(100)
    });

    it('will map a scientific name', () => {
      const result = toSdProduct(input);

      expect(result.scientificName).toBe("Gadus morhua");
    });

    describe("The validation within IDynamicsStorageDocumentProduct", () => {
      it('will contain totalUsedWeightAgainstCertificate', () => {
        const result = toSdProduct(input);

        expect(result.validation.totalWeightExported).toEqual(150)
      });

      it('will highlight when the failure reason is the weight', () => {
        const input: ISdPsQueryResult = {
          documentNumber: "SD1",
          catchCertificateNumber: "SD2",
          documentType: "SD",
          createdAt: "2020-01-01",
          status: "COMPLETE",
          species: "COD",
          commodityCode: "FRESHCOD",
          weightOnDoc: 100,
          weightOnAllDocs: 150,
          weightOnFCC: 200,
          weightAfterProcessing: 80,
          isOverAllocated: false,
          overUsedInfo: [],
          isMismatch: true,
          overAllocatedByWeight: 0,
          da: null,
          extended: {
            id: 'SD2-1610018839',
          }
        };

        const result = toSdProduct(input);

        expect(result.validation.status).toEqual(SdPsStatus.Weight)
      });

      it('will highlight when the failure reason is overuse', () => {
        const input: ISdPsQueryResult = {
          documentNumber: "SD1",
          catchCertificateNumber: "SD2",
          documentType: "PS",
          createdAt: "2020-01-01",
          status: "COMPLETE",
          species: "COD",
          commodityCode: "FRESHCOD",
          weightOnDoc: 100,
          weightOnAllDocs: 150,
          weightOnFCC: 200,
          weightAfterProcessing: 80,
          isOverAllocated: true,
          overUsedInfo: [],
          isMismatch: false,
          overAllocatedByWeight: 50,
          da: null,
          extended: {
            id: 'SD2-1610018839',
          }
        };

        const result = toSdProduct(input);

        expect(result.validation.status).toEqual(SdPsStatus.Overuse)
      });

      it('will highlight the weight exceeded amount when the failure reason is overuse', () => {
        const input: ISdPsQueryResult = {
          documentNumber: "SD1",
          catchCertificateNumber: "SD2",
          documentType: "SD",
          createdAt: "2020-01-01",
          status: "COMPLETE",
          species: "COD",
          commodityCode: "FRESHCOD",
          weightOnDoc: 100,
          weightOnAllDocs: 150,
          weightOnFCC: 200,
          weightAfterProcessing: 80,
          isOverAllocated: false,
          overUsedInfo: [],
          isMismatch: false,
          overAllocatedByWeight: 50,
          da: null,
          extended: {
            id: 'SD2-1610018839',
          }
        };

        const result = toSdProduct(input);

        expect(result.validation.weightExceededAmount).toEqual(50)
      });

      it('will have over use array when the failure reason is overuse', () => {
        const input: ISdPsQueryResult = {
          documentNumber: "SD1",
          catchCertificateNumber: "SD2",
          documentType: "SD",
          createdAt: "2020-01-01",
          status: "COMPLETE",
          species: "COD",
          commodityCode: "FRESHCOD",
          weightOnDoc: 100,
          weightOnAllDocs: 150,
          weightOnFCC: 200,
          weightAfterProcessing: 80,
          isOverAllocated: false,
          overUsedInfo: ["SD3"],
          isMismatch: false,
          overAllocatedByWeight: 50,
          da: null,
          extended: {
            id: 'SD2-1610018839',
          }
        };

        const result = toSdProduct(input);

        expect(result.validation.overuseInfo).toEqual(["SD3"])
      });

      it('will not have an overuse array when the failure overuse occurs on this document', () => {
        const input: ISdPsQueryResult = {
          documentNumber: "SD1",
          catchCertificateNumber: "SD2",
          documentType: "SD",
          createdAt: "2020-01-01",
          status: "COMPLETE",
          species: "COD",
          commodityCode: "FRESHCOD",
          weightOnDoc: 100,
          weightOnAllDocs: 150,
          weightOnFCC: 200,
          weightAfterProcessing: 80,
          isOverAllocated: false,
          overUsedInfo: ["SD1"],
          isMismatch: false,
          overAllocatedByWeight: 50,
          da: null,
          extended: {
            id: 'SD2-1610018839',
          }
        };

        const result = toSdProduct(input);

        expect(result.validation.overuseInfo).toBeUndefined();
      });

      it('will not include current document number in overuseInfo array when the failure overuse occurs on this document', () => {
        const input: ISdPsQueryResult = {
          documentNumber: "SD1",
          catchCertificateNumber: "SD2",
          documentType: "SD",
          createdAt: "2020-01-01",
          status: "COMPLETE",
          species: "COD",
          commodityCode: "FRESHCOD",
          weightOnDoc: 100,
          weightOnAllDocs: 150,
          weightOnFCC: 200,
          weightAfterProcessing: 80,
          isOverAllocated: false,
          overUsedInfo: ["SD1", "SD2"],
          isMismatch: false,
          overAllocatedByWeight: 50,
          da: null,
          extended: {
            id: 'SD2-1610018839',
          }
        };

        const result = toSdProduct(input);

        expect(result.validation.overuseInfo).toStrictEqual(["SD2"]);
      });
    });

  });

  describe('When mapping from an ISdPsQueryResult to IDynamicsStorageDocumentCase', () => {

    const exampleSd: IDocument = {
      "createdAt": new Date("2020-06-12T20:12:28.201Z"),
      "__t": "storageDocument",
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "createdByEmail": "foo@foo.com",
      "status": "COMPLETE",
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
          "buildingName": "BuildingName",
          "buildingNumber": "BuildingNumber",
          "subBuildingName": "SubBuildingName",
          "streetName": "StreetName",
          "country": "Country",
          "county": "County",
          "townCity": "Town",
          "postcode": "TF1 3AA",
          "_dynamicsAddress": { "dynamicsData": 'original address' }
        },
        "catches": [{
          "product": "Atlantic herring (HER)",
          "commodityCode": "0345603",
          "productWeight": "1000",
          "dateOfUnloading": "12/06/2020",
          "placeOfUnloading": "Dover",
          "transportUnloadedFrom": "BA078",
          "certificateNumber": "GBR-3453-3453-3443",
          "weightOnCC": "1000",
          "scientificName": "Gadus morhua"
        }],
        "storageFacilities": [{
          "facilityName": "Exporter Person",
          "facilityAddressOne": "Building Name",
          "facilityAddressTwo": "Building Street",
          "facilityTownCity": "Town",
          "facilityPostcode": "XX12 X34"
        }],
        "exportedTo": {
          "officialCountryName": "Nigeria",
          "isoCodeAlpha2": "NG",
          "isoCodeAlpha3": "NGA",
          "isoNumericCode": "566"
        },
        "transportation": {
          "vehicle": "truck",
          "cmr": true
        }
      },
      "documentUri": "_0d8f98a1-c372-47c4-803f-dafd642c4941.pdf",
      "numberOfFailedAttempts": 5
    };

    const input: ISdPsQueryResult = {
      documentNumber: "SD1",
      catchCertificateNumber: "SD2",
      documentType: "SD",
      createdAt: "2020-01-01",
      status: "COMPLETE",
      species: "Atlantic cod (COD)",
      commodityCode: "FRESHCOD",
      weightOnDoc: 100,
      weightOnAllDocs: 150,
      weightOnFCC: 200,
      weightAfterProcessing: 80,
      isOverAllocated: false,
      isMismatch: false,
      overAllocatedByWeight: 0,
      overUsedInfo: [],
      da: null,
      extended: {
        id: 'SD2-1610018839',
      }
    };

    it('will map the products', () => {
      const result = toDynamicsSd([input], exampleSd, correlationId);

      expect(result.products?.length).toBeGreaterThan(0);
    });

    it('will map the documentNumber', () => {
      const result = toDynamicsSd([input], exampleSd, correlationId);

      expect(result.documentNumber).toEqual('GBR-2020-SD-C90A88218');
    });

    it('will map the Case type One', () => {
      const result = toDynamicsSd([input], exampleSd, correlationId);

      expect(result.caseType1).toEqual('SD');
    });

    it('will map the company name', () => {
      const result = toDynamicsSd([input], exampleSd, correlationId);

      expect(result.companyName).toEqual("Exporter Ltd");
    });

    it('will map the number of failed submissions', () => {
      const result = toDynamicsSd([input], exampleSd, correlationId);

      expect(result.numberOfFailedSubmissions).toEqual(5);
    });

    it('will map the case two type', () => {
      const result = toDynamicsSd([input], exampleSd, correlationId);

      expect(result.caseType2).toEqual(SdPsCaseTwoType.RealTimeValidation_Success);
    });

    it('will map an exporter details', () => {
      const result = toDynamicsSd([input], exampleSd, correlationId);

      expect(result.exporter).toMatchObject({
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
      }
      )
    });

    it('will contains documentDate', () => {
      const result = toDynamicsSd([input], exampleSd, correlationId);

      expect(result.documentDate).toBe('2020-06-12T20:12:28.201Z');
    });

    it('will contains documentURI', () => {
      const result = toDynamicsSd([input], exampleSd, correlationId);

      expect(result.documentUrl).toContain('_0d8f98a1-c372-47c4-803f-dafd642c4941.pdf');
    });

    it('will include a correlationId', () => {
      const result = toDynamicsSd([input], exampleSd, correlationId);

      expect(result._correlationId).toEqual('some-uuid-correlation-id');
    });

    it('will include a requestedByAdmin flag', () => {
      const result = toDynamicsSd([input], exampleSd, correlationId);

      expect(result.requestedByAdmin).toEqual(false);
    });

    it('will include all root properties required for a VOID payload', () => {
      const result = toDynamicsSd(null, exampleSd, correlationId, SdPsCaseTwoType.VoidByExporter);

      expect(result.caseType2).toEqual("Void by an Exporter");
      expect(result.products).toBeUndefined();
    });

    it('will include an exportedTo', () => {
      const result = toDynamicsSd([input], exampleSd, correlationId);

      expect(result.exportedTo).toEqual({
        officialCountryName: "Nigeria",
        isoCodeAlpha2: "NG",
        isoCodeAlpha3: "NGA"
      });
    });

  });

  describe('When mapping from a species description to species code', () => {
    it('will return species code', () => {
      const result = toSpeciesCode("Atlantic cod (COD)")
      expect(result).toEqual("COD");
    });

    it('will return species code Pouting(=Bib) (BIB)', () => {
      const result = toSpeciesCode("Pouting(=Bib) (BIB)")
      expect(result).toEqual("BIB");
    });

    it('will return empty string if there is no species code in the string', () => {
      const result = toSpeciesCode("Atlantic cod")
      expect(result).toBeUndefined();
    });

    it('will return null if undefined', () => {
      const result = toSpeciesCode(undefined)
      expect(result).toBeUndefined();
    });
  });

  describe('When mapping from a IDynamicsLanding to failureIrrespectiveOfRisk', () => {
    const landing: Shared.IDynamicsLanding = {
      status: Shared.LandingStatusType.ValidationFailure_Overuse,
      id: "GBR-2020-CC-X",
      landingDate: "2018-12-08",
      species: "COD",
      is14DayLimitReached: false,
      vesselOverriddenByAdmin: false,
      state: "FRE",
      presentation: "FIL",
      speciesOverriddenByAdmin: false,
      cnCode: "1234",
      commodityCodeDescription: "some description",
      scientificName: "some scientific name",
      vesselName: "BOB WINNIE",
      vesselPln: "FH691",
      vesselLength: 10,
      licenceHolder: "VESSEL MASTER",
      weight: 10,
      numberOfTotalSubmissions: 1,
      adminSpecies: "Sand smelt (ATP)",
      adminState: "Fresh",
      adminPresentation: "Whole",
      adminCommodityCode: "some commodity code",
      validation: {
        liveExportWeight: 26,
        totalRecordedAgainstLanding: 26,
        landedWeightExceededBy: undefined,
        rawLandingsUrl: "some-raw-landings-url",
        salesNoteUrl: "some-sales-notes-url",
        isLegallyDue: true
      },
      dataEverExpected: true,
      vesselAdministration: 'England'
    };

    const landing_weight_failure: Shared.IDynamicsLanding = {
      status: Shared.LandingStatusType.ValidationFailure_Weight,
      id: "GBR-2020-CC-X",
      landingDate: "2018-12-08",
      species: "COD",
      is14DayLimitReached: false,
      vesselOverriddenByAdmin: false,
      state: "FRE",
      presentation: "FIL",
      speciesOverriddenByAdmin: false,
      cnCode: "1234",
      commodityCodeDescription: "some description",
      scientificName: "some scientific name",
      vesselName: "BOB WINNIE",
      vesselPln: "FH691",
      vesselLength: 10,
      licenceHolder: "VESSEL MASTER",
      weight: 10,
      numberOfTotalSubmissions: 1,
      adminSpecies: "Sand smelt (ATP)",
      adminState: "Fresh",
      adminPresentation: "Whole",
      adminCommodityCode: "some commodity code",
      validation: {
        liveExportWeight: 26,
        totalRecordedAgainstLanding: 26,
        landedWeightExceededBy: undefined,
        rawLandingsUrl: "some-raw-landings-url",
        salesNoteUrl: "some-sales-notes-url",
        isLegallyDue: true
      },
      dataEverExpected: true,
      vesselAdministration: 'England'
    };

    const landing_species_failure: Shared.IDynamicsLanding = {
      status: Shared.LandingStatusType.ValidationFailure_Species,
      id: "GBR-2020-CC-X",
      landingDate: "2018-12-08",
      species: "COD",
      is14DayLimitReached: false,
      vesselOverriddenByAdmin: false,
      state: "FRE",
      cnCode: "1234",
      commodityCodeDescription: "some description",
      scientificName: "some scientific name",
      presentation: "FIL",
      speciesOverriddenByAdmin: false,
      vesselName: "BOB WINNIE",
      vesselPln: "FH691",
      vesselLength: 10,
      licenceHolder: "VESSEL MASTER",
      weight: 10,
      numberOfTotalSubmissions: 1,
      adminSpecies: "Sand smelt (ATP)",
      adminState: "Fresh",
      adminPresentation: "Whole",
      adminCommodityCode: "some commodity code",
      validation: {
        liveExportWeight: 26,
        totalRecordedAgainstLanding: 26,
        landedWeightExceededBy: undefined,
        rawLandingsUrl: "some-raw-landings-url",
        salesNoteUrl: "some-sales-notes-url",
        isLegallyDue: true
      },
      dataEverExpected: true,
      vesselAdministration: 'England'
    };

    const landing_no_data_failure: Shared.IDynamicsLanding = {
      status: Shared.LandingStatusType.ValidationFailure_NoLandingData,
      id: "GBR-2020-CC-X",
      landingDate: "2018-12-08",
      species: "COD",
      is14DayLimitReached: false,
      vesselOverriddenByAdmin: false,
      state: "FRE",
      presentation: "FIL",
      speciesOverriddenByAdmin: false,
      cnCode: "1234",
      commodityCodeDescription: "some description",
      scientificName: "some scientific name",
      vesselName: "BOB WINNIE",
      vesselPln: "FH691",
      vesselLength: 10,
      licenceHolder: "VESSEL MASTER",
      weight: 10,
      numberOfTotalSubmissions: 1,
      adminSpecies: "Sand smelt (ATP)",
      adminState: "Fresh",
      adminPresentation: "Whole",
      adminCommodityCode: "some commodity code",
      validation: {
        liveExportWeight: 26,
        totalRecordedAgainstLanding: 26,
        landedWeightExceededBy: undefined,
        rawLandingsUrl: "some-raw-landings-url",
        salesNoteUrl: "some-sales-notes-url",
        isLegallyDue: true
      },
      dataEverExpected: true,
      vesselAdministration: 'England'
    };

    const landing_no_licence_holder: Shared.IDynamicsLanding = {
      status: Shared.LandingStatusType.ValidationFailure_NoLicenceHolder,
      id: "GBR-2020-CC-X",
      landingDate: "2018-12-08",
      species: "COD",
      is14DayLimitReached: false,
      vesselOverriddenByAdmin: false,
      state: "FRE",
      presentation: "FIL",
      speciesOverriddenByAdmin: true,
      cnCode: "1234",
      commodityCodeDescription: "some description",
      scientificName: "some scientific name",
      vesselName: "BOB WINNIE",
      vesselPln: "FH691",
      vesselLength: 10,
      licenceHolder: "VESSEL MASTER",
      weight: 10,
      numberOfTotalSubmissions: 1,
      adminSpecies: "Sand smelt (ATP)",
      adminState: "Fresh",
      adminPresentation: "Whole",
      adminCommodityCode: "some commodity code",
      validation: {
        liveExportWeight: 26,
        totalRecordedAgainstLanding: 26,
        landedWeightExceededBy: undefined,
        rawLandingsUrl: "some-raw-landings-url",
        salesNoteUrl: "some-sales-notes-url",
        isLegallyDue: true
      },
      dataEverExpected: true,
      vesselAdministration: 'England'
    };

    it('will return the correct failureIrrespectiveOfRisk for a given set of landings', () => {
      expect(SUT.toFailureIrrespectiveOfRisk([landing])).toBeFalsy();
      expect(SUT.toFailureIrrespectiveOfRisk([landing, landing_species_failure])).toBeTruthy();
      expect(SUT.toFailureIrrespectiveOfRisk([landing, landing_weight_failure])).toBeTruthy();
      expect(SUT.toFailureIrrespectiveOfRisk([landing, landing_no_data_failure])).toBeTruthy();
      expect(SUT.toFailureIrrespectiveOfRisk([landing, landing_no_licence_holder])).toBeTruthy();
    });
  });

  describe('When mapping from ICcQueryResult to IDynamicsLandingCase', () => {
    let res: Shared.IDynamicsLandingCase;

    const input: Shared.ICcQueryResult = {
      documentNumber: 'CC1',
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
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown: [
        {
          factor: 1.7,
          isEstimate: true,
          weight: 30,
          liveWeight: 51,
          source: Shared.LandingSources.CatchRecording
        }
      ],
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
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
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
          status: 'OPEN_UNDER_ENQUIRY'
        },
        transportationVehicle: 'directLanding',
        numberOfSubmissions: 1,
      }
    };

    let mockToLanding: jest.SpyInstance;

    beforeEach(() => {
      mockToLanding = jest.spyOn(SUT, 'toLanding');
      mockToLanding.mockResolvedValue({});

      res = SUT.toDynamicsLandingCase(input, exampleCc, correlationId);
    });

    afterEach(() => {
      mockToLanding.mockRestore();
    });

    it('should include all the properties from the standard landing mapper', () => {
      expect(res.status).not.toBeUndefined();
    });

    it('should include all the properties from the standard exporter mapper', () => {
      expect(res.exporter).not.toBeUndefined();
    });

    it('should include the documentNumber', () => {
      expect(res.documentNumber).toBe("GBR-2020-CC-1BC924FCF");
    });

    it('should include the documentDate', () => {
      expect(res.documentDate).toBe("2020-06-24T10:39:32.000Z");
    });

    it('should include the documentUrl', () => {
      expect(res.documentUrl).toBe(`${ApplicationConfig.prototype.externalAppUrl}/qr/export-certificates/${exampleCc.documentUri}`);
    });

    it('should include a correlationId', () => expect(res._correlationId).toEqual('some-uuid-correlation-id'));

    it('should include a requestedByAdmin flag', () => expect(res.requestedByAdmin).toEqual(false));

    it('should include a numberOfFailedSubmissions field', () => expect(res.numberOfFailedSubmissions).toEqual(5));

    it('should include a numberOfSubmissions field', () => expect(res.numberOfTotalSubmissions).toEqual(1));

    it('should include an exportedTo', () => {
      expect(res.exportedTo).toEqual({
        officialCountryName: "Nigeria",
        isoCodeAlpha2: "NG",
        isoCodeAlpha3: "NGA"
      });
    })
  });

  describe('When mapping from ICcQueryResult to IDynamicsLandingDetails', () => {

    it('will process all ICcQueryResults to a collection of IDynamicsLandingCase', () => {
      const input: Shared.ICcQueryResult[] = [{
        documentNumber: 'CC1',
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
        isLandingExists: false,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 0,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        landingTotalBreakdown: [],
        isOverusedThisCert: false,
        isOverusedAllCerts: false,
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
          documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
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
            status: 'OPEN_UNDER_ENQUIRY'
          },
          transportationVehicle: 'directLanding',
          dataEverExpected: true,
          landingDataExpectedDate: '2023-09-01',
          landingDataEndDate: '2023-09-02'
        }
      }];

      const result = SUT.toDynamicsLandingDetails(input, exampleCc, correlationId);

      expect(result).toHaveLength(1);
    });

  });

});