import moment from 'moment';
import { toDynamicsCcCase, toLanding } from '../../../src/landings/transformations/dynamicsValidation';
import * as Shared from 'mmo-shared-reference-data';
import * as Cache from '../../../src/data/cache';
import * as isHighRisk from '../../../src/landings/query/isHighRisk';
import {
  CaseOneType,
  CaseTwoType,
  IDynamicsCatchCertificateCase
} from "../../../src/landings/types/dynamicsCcCase";
import { ApplicationConfig } from "../../../src/config";
import { IDocument } from '../../../src/landings/types/document';
import * as VesselService from '../../../src/handler/vesselService';

jest.mock('../../../src/handler/vesselService');

describe('toLanding', () => {
  let mockToLandingStatus;
  let mockCcBatchReport;
  let mockIsQuotaSpecies;
  let mockGetTotalRiskScore;
  let mockGetExporterRisk;
  let mockIsRiskEnabled;
  let mockVesselLength;

  const sampleBatchReport = [{
    FI0_47_unavailabilityExceeds14Days: ' Fail',
    aggregatedLandedDecWeight: 89,
    aggregatedEstimateWeight: 89,
    aggregatedEstimateWeightPlusTolerance: 89,
    exportedWeightExceedingEstimateLandedWeight: 89,
    rawLandingsUrl: 'a url',
    salesNotesUrl: 'a url'
  }];

  const sampleICcQueryResult: Shared.ICcQueryResult = {
    documentNumber: '',
    documentType: '',
    status: 'COMPLETE',
    createdAt: '2019-01-01',
    rssNumber: '',
    da: 'England',
    dateLanded: '2019-01-01',
    species: ' a species',
    weightFactor: 0,
    weightOnCert: 89,
    rawWeightOnCert: 89,
    weightOnAllCerts: 0,
    weightOnAllCertsBefore: 0,
    weightOnAllCertsAfter: 0,
    // Is there a landing?
    isLandingExists: true,
    isSpeciesExists: true,
    // From the landing
    numberOfLandingsOnDay: 0,
    weightOnLanding: 0,
    weightOnLandingAllSpecies: 0,
    // Some derivations
    isOverusedThisCert: true,
    isOverusedAllCerts: true,
    // Linked certs
    overUsedInfo: [],
    durationSinceCertCreation: '',
    durationBetweenCertCreationAndFirstLandingRetrieved: null,
    durationBetweenCertCreationAndLastLandingRetrieved: null,
    extended: {
      landingId: 'an id',
      state: 'a state',
      presentation: 'a presentation',
      vessel: 'a vessel name',
      pln: ' a pln',
      dataEverExpected: true,
      landingDataExpectedDate: "2023-05-26",
      landingDataEndDate: "2023-06-05",
      isLegallyDue: true
    },
    isExceeding14DayLimit: true
  };


  beforeEach(() => {
    mockVesselLength = jest.spyOn(VesselService, 'getVesselLength');
    mockVesselLength.mockReturnValue(undefined);
    mockToLandingStatus = jest.spyOn(Shared, 'toLandingStatus');
    mockCcBatchReport = jest.spyOn(Shared, 'ccBatchReport');
    mockIsQuotaSpecies = jest.spyOn(Cache, 'isQuotaSpecies');
    mockIsQuotaSpecies.mockReturnValue(false);
    mockGetTotalRiskScore = jest.spyOn(isHighRisk, 'getTotalRiskScore');
    mockGetTotalRiskScore.mockReturnValue(1.0);
    mockGetExporterRisk = jest.spyOn(isHighRisk, 'getExporterBehaviourRiskScore');
    mockGetExporterRisk.mockReturnValue(1.0);
    mockIsRiskEnabled = jest.spyOn(isHighRisk, 'isRiskEnabled');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should set source when landingTotalBreakdown does not exists', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);
    mockToLandingStatus.mockReturnValue('a status');

    sampleICcQueryResult.isLandingExists = true;
    sampleICcQueryResult.landingTotalBreakdown = undefined;
    sampleICcQueryResult.source = 'a landing source';

    const result = toLanding(sampleICcQueryResult);

    expect(result.source).toBeDefined();

  });

  it('should set source when landingTotalBreakdown is empty', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);
    mockToLandingStatus.mockReturnValue('a status');

    const copySampleICcQueryResult: Shared.ICcQueryResult = {
      ...sampleICcQueryResult,
      isLandingExists: true,
      landingTotalBreakdown: [],
      source: 'a landing source'
    };

    const result = toLanding(copySampleICcQueryResult);

    expect(result.source).toBeDefined();

  });

  it('should set source when landingTotalBreakdown is an empty array', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);
    mockToLandingStatus.mockReturnValue('a status');

    sampleICcQueryResult.isLandingExists = true;
    sampleICcQueryResult.landingTotalBreakdown = [];
    sampleICcQueryResult.source = 'a landing source';

    const result = toLanding(sampleICcQueryResult);

    expect(result.source).toBeDefined();

  });

  it('should set source as undefined when isLandingExists is false and source is undefined', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);
    mockToLandingStatus.mockReturnValue('a status');

    sampleICcQueryResult.isLandingExists = false;
    sampleICcQueryResult.source = undefined;

    const result = toLanding(sampleICcQueryResult);

    expect(result.source).toBeUndefined();

  });

  it('should set source when isLandingExists is true and source is defined', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);
    mockToLandingStatus.mockReturnValue('a status');

    sampleICcQueryResult.isLandingExists = true;
    sampleICcQueryResult.landingTotalBreakdown = [{
      factor: 1,
      isEstimate: true,
      liveWeight: 100,
      source: 'a source',
      weight: 100,
    }];
    sampleICcQueryResult.source = 'the real source';

    const result = toLanding(sampleICcQueryResult);

    expect(result.source).toEqual('the real source');

  });

  it('should set set vesselName the extended.vessel property', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);
    mockToLandingStatus.mockReturnValue('a status');

    sampleICcQueryResult.isLandingExists = true;
    sampleICcQueryResult.landingTotalBreakdown = undefined;

    const result = toLanding(sampleICcQueryResult);

    expect(result.vesselName).toEqual('a vessel name');

  });

  it('should set vaidation.speciesRiskToggle to the output of isRiskEnabled', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);
    mockToLandingStatus.mockReturnValue('a status');

    mockIsRiskEnabled.mockReturnValue(true);
    let result = toLanding(sampleICcQueryResult);
    expect(result.risking?.isSpeciesRiskEnabled).toBeTruthy();

    mockIsRiskEnabled.mockReturnValue(false);
    result = toLanding(sampleICcQueryResult);
    expect(result.risking?.isSpeciesRiskEnabled).toBeFalsy();

  });

  it('will set validation.isLegallyDue to true if the isLegallyDue check returns true', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);

    const result = toLanding(sampleICcQueryResult);

    expect(result.validation.isLegallyDue).toBe(true);
  });

  it('will set validation.isLegallyDue to false if extended.vesselOverriddenByAdmin is true', async () => {
    mockCcBatchReport.mockReturnValue(sampleBatchReport);

    sampleICcQueryResult.extended.vesselOverriddenByAdmin = true;

    const result = toLanding({
      ...sampleICcQueryResult,
      extended: {
        ...sampleICcQueryResult.extended,
        isLegallyDue: false
      }
    });

    expect(result.validation.isLegallyDue).toBe(false);
  });

  it('should set dataEverExpected as true', async () => {
    const result = toLanding(sampleICcQueryResult);

    expect(result.dataEverExpected).toBe(true);
  });

  it('should set dataEverExpected as false', async () => {
    sampleICcQueryResult.extended.dataEverExpected = false;
    const result = toLanding(sampleICcQueryResult);

    expect(result.dataEverExpected).toBe(false);
  });

  it('should set dataEverExpected as true when it is undefined', async () => {
    sampleICcQueryResult.extended.dataEverExpected = undefined;
    const result = toLanding(sampleICcQueryResult);

    expect(result.dataEverExpected).toBe(true);
  });

  it('should set vesselAdministration as England', async () => {
    const result = toLanding(sampleICcQueryResult);

    expect(result.vesselAdministration).toBe('England');
  });

  it('should set landing data expectation dates', () => {
    const result = toLanding(sampleICcQueryResult);

    expect(result.landingDataExpectedDate).toBe('2023-05-26');
    expect(result.landingDataEndDate).toBe('2023-06-05');
  });

  it('should set landingDataExpectedAtSubmission when dataEverExpected is true', async () => {
    const result = toLanding(sampleICcQueryResult);

    expect(result.landingDataExpectedAtSubmission).toBe(false);
  });

  it('should set landingDataExpectedAtSubmission when dataEverExpected is undefined', async () => {
    sampleICcQueryResult.extended.dataEverExpected = undefined;
    const result = toLanding(sampleICcQueryResult);

    expect(result.landingDataExpectedAtSubmission).toBe(false);
  });

  it('should not set landingDataExpectedAtSubmission when dataEverExpected is false', async () => {
    sampleICcQueryResult.extended.dataEverExpected = false;
    const result = toLanding(sampleICcQueryResult);

    expect(result.landingDataExpectedAtSubmission).toBeUndefined();
  });

  it('should set landingDataExpectedAtSubmission=true when expecteddate is before date of submission', async () => {
    sampleICcQueryResult.createdAt="2023-05-30";
    sampleICcQueryResult.extended.dataEverExpected = true;
    sampleICcQueryResult.extended.landingDataExpectedDate="2023-05-27";

    const result = toLanding(sampleICcQueryResult);
    expect(result.landingDataExpectedAtSubmission).toBe(true);
  });

  it('should set landingDataExpectedAtSubmission=false when expecteddate is after date of submission', async () => {
    sampleICcQueryResult.createdAt="2023-05-30";
    sampleICcQueryResult.extended.dataEverExpected = true;
    sampleICcQueryResult.extended.landingDataExpectedDate="2023-06-01";

    const result = toLanding(sampleICcQueryResult);
    expect(result.landingDataExpectedAtSubmission).toBe(false);
  });

  it('should set isLate=true when firstDateTimeLandingDataRetrieved is after the expected date and before or on the end date', async () => {
    sampleICcQueryResult.firstDateTimeLandingDataRetrieved='2023-06-01T07:23:52.264Z';
    sampleICcQueryResult.extended.landingDataExpectedDate="2023-05-30";
    sampleICcQueryResult.extended.landingDataEndDate="2023-06-07";
    sampleICcQueryResult.extended.vesselOverriddenByAdmin = false;

    const result = toLanding(sampleICcQueryResult);
    expect(result.isLate).toEqual(true);
  });

  it('should set isLate=false when isLandingExists is true and firstDateTimeLandingDataRetrieved is after the expected date and before or on the end date', async () => {
    sampleICcQueryResult.firstDateTimeLandingDataRetrieved='2023-06-01T07:23:52.264Z';
    sampleICcQueryResult.extended.landingDataExpectedDate="2023-06-01";

    const result = toLanding(sampleICcQueryResult);
    expect(result.isLate).toEqual(false);
  });

  it('should not set isLate when firstDateTimeLandingDataRetrieved is undefined and submission date is on end date', async () => {
    sampleICcQueryResult.firstDateTimeLandingDataRetrieved=undefined;
    sampleICcQueryResult.extended.landingDataEndDate="2023-06-01";
    sampleICcQueryResult.extended.dataEverExpected=true;
    sampleICcQueryResult.extended.vesselOverriddenByAdmin = false;

    const result = toLanding(sampleICcQueryResult);
    expect(result.isLate).toBeUndefined();
  });

  it('should not set isLate when landing status is Data Never Expected', async () => {
    sampleICcQueryResult.extended.dataEverExpected = false;

    const result = toLanding(sampleICcQueryResult);
    expect(result.status).toEqual(Shared.LandingStatusType.DataNeverExpected);
    expect(result.isLate).toBeUndefined();
  });

  it('should set dateDataReceived when isLandingExists is true and dateLandingReceived is available', async () => {
    const copySampleICcQueryResult: Shared.ICcQueryResult = {
      ...sampleICcQueryResult,
      isLandingExists: true,
      firstDateTimeLandingDataRetrieved: '2023-06-01T07:23:52.264Z'
    };
    const result = toLanding(copySampleICcQueryResult);
    expect(result.dateDataReceived).toEqual('2023-06-01T07:23:52.264Z');

  });

  it('should not set dateDataReceived when isLandingExists is false and dateLandingReceived is not available', async () => {
    const copySampleICcQueryResult: Shared.ICcQueryResult = {
      ...sampleICcQueryResult,
      isLandingExists: false,
      firstDateTimeLandingDataRetrieved: undefined
    };
    const result = toLanding(copySampleICcQueryResult);
    expect(result.dateDataReceived).toBeUndefined();

  });
});

describe('toDynamicsCcCase', () => {

  const aCorrectionId = 'some-uuid-correlation-id';
  const exampleCc: IDocument = {
    "createdAt": new Date("2020-06-24T10:39:32.000Z"),
    "__t": "catchCert",
    "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
    "status": "COMPLETE",
    "documentNumber": "GBR-2020-CC-1BC924FCF",
    "requestByAdmin": false,
    "audit": [],
    "userReference": "MY REF",
    "clonedFrom": "GBR-2020-CC-1BC924DEF",
    "landingsCloned": true,
    "parentDocumentVoid": false,
    "exportData": {
      "exporterDetails": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "exporterFullName": "Bob Exporter",
        "exporterCompanyName": "Exporter Co",
        "addressOne": "B",
        "addressTwo": "S",
        "townCity": "T",
        "postcode": "AB1 1AS",
        "_dynamicsAddress": { "dynamicsData": 'original address' }
      },
      "products": [
        {
          "species": "European lobster (LBE)",
          "speciesId": "4e5fff23-184c-4a46-beef-e93ccd040392",
          "speciesCode": "LBE",
          "commodityCode": "03063210",
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
  };

  const expectedResult: IDynamicsCatchCertificateCase = {
    documentNumber: exampleCc.documentNumber,
    clonedFrom: exampleCc.clonedFrom,
    landingsCloned: exampleCc.landingsCloned,
    parentDocumentVoid: exampleCc.parentDocumentVoid,
    caseType1: CaseOneType.CatchCertificate,
    caseType2: CaseTwoType.VoidByExporter,
    numberOfFailedSubmissions: 5,
    isDirectLanding: false,
    documentUrl: `${ApplicationConfig.prototype.externalAppUrl}/qr/export-certificates/${exampleCc.documentUri}`,
    documentDate: moment.utc(exampleCc.createdAt).toISOString(),
    exporter: {
      fullName: exampleCc.exportData.exporterDetails.exporterFullName,
      companyName: exampleCc.exportData.exporterDetails.exporterCompanyName,
      contactId: exampleCc.exportData.exporterDetails.contactId,
      accountId: exampleCc.exportData.exporterDetails.accountId,
      address: {
        line1: exampleCc.exportData.exporterDetails.addressOne,
        city: exampleCc.exportData.exporterDetails.townCity,
        postCode: exampleCc.exportData.exporterDetails.postcode
      },
      dynamicsAddress: exampleCc.exportData.exporterDetails._dynamicsAddress
    },
    landings: null,
    _correlationId: aCorrectionId,
    requestedByAdmin: exampleCc.requestByAdmin || false,
    da: 'Scotland',
    failureIrrespectiveOfRisk: false,
    exportedTo: {
      officialCountryName: "Nigeria",
      isoCodeAlpha2: "NG",
      isoCodeAlpha3: "NGA"
    }
  };

  it('should not call toDynamicsCcCase2 if no validatedLandings are given', () => {
    const result = toDynamicsCcCase(null, exampleCc, aCorrectionId, CaseTwoType.VoidByExporter);
    expect(result).toEqual(expectedResult);
  });

})