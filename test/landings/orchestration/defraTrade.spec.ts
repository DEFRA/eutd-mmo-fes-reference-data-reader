import moment from "moment";
import * as DefraMapper from "../../../src/landings/transformations/defraTradeValidation";
import * as Shared from "mmo-shared-reference-data";
import * as SUT from "../../../src/landings/orchestration/defraTrade";
import * as VesselService from '../../../src/handler/vesselService';
import { ApplicationConfig } from "../../../src/config";
import { CaseOneType, CaseTwoType, IDynamicsCatchCertificateCase, CaseOutcomeAtSubmission, CaseStatusAtSubmission } from "../../../src/landings/types/dynamicsCcCase";
import { IDefraTradeProcessingStatement, IDefraTradeSdPsStatus, IDefraTradeStorageDocument } from "../../../src/landings/types/defraTradeSdPsCase";
import { IDynamicsStorageDocumentCase, SdPsCaseTwoType, SdPsStatus, IDynamicsProcessingStatementCase } from "../../../src/landings/types/dynamicsSdPsCase";
import { ISdPsQueryResult } from "../../../src/landings/types/query";
import { InvestigationStatus } from "../../../src/landings/types/auditEvent";
import { LandingSources } from "../../../src/landings/types/landing";

import logger from "../../../src/logger";
import { IDocument } from "../../../src/landings/types/document";
import { ServiceBusMessage } from "@azure/service-bus";

describe('azureTradeQueueEnabled Feature flag turned on', () => {

  let mockGetRssNumber;
  let mockGetVesselService;
  let mockPersistence;
  let mockLogInfo;
  let mockLogError;

  ApplicationConfig.loadEnv({
    AZURE_QUEUE_TRADE_CONNECTION_STRING: 'AZURE_QUEUE_TRADE_CONNECTION_STRING',
    REPORT_QUEUE_TRADE: 'REPORT_QUEUE_TRADE',
  });

  beforeEach(() => {
    mockLogInfo = jest.spyOn(logger, 'info');
    mockLogError = jest.spyOn(logger, 'error');
    mockPersistence = jest.spyOn(Shared, 'addToReportQueue');
    mockPersistence.mockResolvedValue(null);

    ApplicationConfig.prototype.azureTradeQueueEnabled = true;

    mockGetRssNumber = jest.spyOn(VesselService, 'getRssNumber');
    mockGetRssNumber.mockReturnValue("C20415");

    mockGetVesselService = jest.spyOn(VesselService, 'getVesselDetails');
    mockGetVesselService.mockReturnValue({
      fishingVesselName: "AGAN BORLOWEN",
      ircs: null,
      cfr: "GBR000C20415",
      flag: "GBR",
      homePort: "NEWLYN",
      registrationNumber: "SS229",
      imo: null,
      fishingLicenceNumber: "25072",
      fishingLicenceValidFrom: "2014-07-01T00:00:00",
      fishingLicenceValidTo: "2030-12-31T00:00:00",
      adminPort: "NEWLYN",
      rssNumber: "C20415",
      vesselLength: 6.88,
      licenceHolderName: "MR S CLARY-BROM "
    })
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will not add CC payload when it contains a validation error', async () => {
    const cc: any = { test: 'catch certificate', documentNumber: 'document1' };
    const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = {
      "documentNumber": "GBR-2023-CC-C58DF9A73",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        {
          "status": Shared.LandingStatusType.DataNeverExpected,
          "id": "GBR-2023-CC-C58DF9A73-4248789552",
          "startDate": "2023-08-31",
          "landingDate": "2023-08-31",
          "species": "BSF",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "ASHLEIGH JANE",
          "vesselPln": "OB81",
          "vesselLength": 9.91,
          "vesselAdministration": "Scotland",
          "licenceHolder": "C & J SHELLFISH LTD",
          "speciesAlias": "N",
          "highSeasArea": "yes",
          "rfmo": "General Fisheries Commission for the Mediterranean (GFCM)",
          "weight": 89,
          "gearType": "Type 1",
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": false,
          "isLate": false,
          "validation": {
            "liveExportWeight": 110.36,
            "totalRecordedAgainstLanding": 220.72,
            "landedWeightExceededBy": null,
            "rawLandingsUrl": "http://localhost:6500/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=A12860",
            "salesNoteUrl": "http://localhost:6500/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=A12860",
            "isLegallyDue": false
          },
          "risking": {
            "vessel": "0.5",
            "speciesRisk": "1",
            "exporterRiskScore": "1",
            "landingRiskScore": "0.5",
            "highOrLowRisk": Shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false
          }
        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA"
      }
    };
    const mapped: any = { _correlationId: 'some-uuid-correlation-id' };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradeCc');
    mockMapper.mockReturnValue(mapped);

    await SUT.reportCcToTrade(cc, Shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED, dynamicsCatchCertificateCase, []);

    expect(mockMapper).toHaveBeenCalledWith(cc, dynamicsCatchCertificateCase, []);
    expect(mockPersistence).not.toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalled();
  });

  it('will add CC payload to the the report queue', async () => {
    const cc: IDocument = {
      "createdAt": new Date("2020-06-24T10:39:32.000Z"),
      "__t": "catchCert",
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "status": "COMPLETE",
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "audit": [
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:18.780Z"
          },
          "data": {
            "investigationStatus": "UNDER_INVESTIGATION"
          }
        },
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:23.439Z"
          },
          "data": {
            "investigationStatus": "CLOSED_NFA"
          }
        }
      ],
      "userReference": "MY REF",
      "exportData": {
        "products": [
          {
            "speciesId": "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            "species": "Black scabbardfish (BSF)",
            "speciesCode": "BSF",
            "commodityCode": "03028990",
            "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
            "scientificName": "Aphanopus carbo",
            "state": {
              "code": "FRE",
              "name": "Fresh"
            },
            "presentation": {
              "code": "GUT",
              "name": "Gutted"
            },
            "factor": 1.24,
            "caughtBy": [
              {
                "vessel": "AGAN BORLOWEN",
                "pln": "SS229",
                "homePort": "NEWLYN",
                "flag": "GBR",
                "cfr": "GBR000C20415",
                "imoNumber": null,
                "licenceNumber": "25072",
                "licenceValidTo": "2030-12-31",
                "licenceHolder": "MR S CLARY-BROM ",
                "id": "GBR-2023-CC-C58DF9A73-1777642314",
                "date": "2023-08-31",
                "faoArea": "FAO27",
                "weight": 122,
                "numberOfSubmissions": 1,
                "isLegallyDue": false,
                "dataEverExpected": true,
                "landingDataExpectedDate": "2023-08-31",
                "landingDataEndDate": "2023-09-02",
                "_status": "PENDING_LANDING_DATA"
              }
            ]
          }
        ],
        "transportation": {
          "exportedFrom": "United Kingdom",
          "exportedTo": {
            "officialCountryName": "Åland Islands",
            "isoCodeAlpha2": "AX",
            "isoCodeAlpha3": "ALA",
            "isoNumericCode": "248"
          },
          "vehicle": "truck",
          "cmr": true
        },
        "conservation": {
          "conservationReference": "UK Fisheries Policy"
        },
        "exporterDetails": {
          "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
          "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
          "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "buildingNumber": null,
          "subBuildingName": "NATURAL ENGLAND",
          "buildingName": "LANCASTER HOUSE",
          "streetName": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "postcode": "NE4 7YH",
          "townCity": "NEWCASTLE UPON TYNE",
          "exporterCompanyName": "Automation Testing Ltd",
          "exporterFullName": "Automation Tester",
          "_dynamicsAddress": {
            "defra_uprn": "10091818796",
            "defra_buildingname": "LANCASTER HOUSE",
            "defra_subbuildingname": "NATURAL ENGLAND",
            "defra_premises": null,
            "defra_street": "HAMPSHIRE COURT",
            "defra_locality": "NEWCASTLE BUSINESS PARK",
            "defra_dependentlocality": null,
            "defra_towntext": "NEWCASTLE UPON TYNE",
            "defra_county": null,
            "defra_postcode": "NE4 7YH",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "defra_internationalpostalcode": null,
            "defra_fromcompanieshouse": false,
            "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
          },
          "_dynamicsUser": {
            "firstName": "Automation",
            "lastName": "Tester"
          }
        },
        "landingsEntryOption": "manualEntry"
      },
      "createdByEmail": "foo@foo.com",
      "documentUri": "_44fd226f-598f-4615-930f-716b2762fea4.pdf",
      "investigation": {
        "investigator": "Chris Waugh",
        "status": "CLOSED_NFA"
      },
      "numberOfFailedAttempts": 5
    };

    const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        {
          "status": Shared.LandingStatusType.DataNeverExpected,
          "id": "GBR-2023-CC-C58DF9A73-4248789552",
          "startDate": "2023-08-31",
          "landingDate": "2023-08-31",
          "species": "BSF",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "ASHLEIGH JANE",
          "vesselPln": "OB81",
          "vesselLength": 9.91,
          "vesselAdministration": "Scotland",
          "licenceHolder": "C & J SHELLFISH LTD",
          "speciesAlias": "N",
          "weight": 89,
          "highSeasArea": "yes",
          "rfmo": "General Fisheries Commission for the Mediterranean (GFCM)",
          "gearType": "Type 1",
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": false,
          "isLate": false,
          "validation": {
            "liveExportWeight": 110.36,
            "totalRecordedAgainstLanding": 220.72,
            "landedWeightExceededBy": null,
            "rawLandingsUrl": "http://localhost:6500/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=A12860",
            "salesNoteUrl": "http://localhost:6500/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=A12860",
            "isLegallyDue": false
          },
          "risking": {
            "vessel": "0.5",
            "speciesRisk": "1",
            "exporterRiskScore": "1",
            "landingRiskScore": "0.5",
            "highOrLowRisk": Shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false
          }
        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA"
      }
    };

    const ccQueryResults: Shared.ICcQueryResult[] = [{
      documentNumber: 'GBR-2020-CC-1BC924FCF',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'C20415',
      da: 'Scotland',
      dateLanded: '2023-08-31',
      species: 'BSF',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      hasSalesNote: true,
      isSpeciesExists: false,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      speciesAlias: "N",
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
        moment.utc()
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        landingId: 'GBR-2023-CC-C58DF9A73-1777642314',
        exporterName: 'Mr Bob',
        presentation: 'GUT',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
        presentationName: 'sliced',
        vessel: 'AGAN BORLOWEN',
        fao: 'FAO27',
        highSeasArea: 'yes',
        rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
        pln: 'SS229',
        species: 'Lobster',
        scientificName: "Aphanopus carbo",
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '03028990',
        commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
        investigation: {
          investigator: "Investigator Gadget",
          status: InvestigationStatus.Open
        },
        transportationVehicle: 'truck',
        flag: "GBR",
        homePort: "NEWLYN",
        licenceNumber: "25072",
        licenceValidTo: "2030-12-31",
        licenceHolder: "MR S CLARY-BROM ",
        imoNumber: null,
        numberOfSubmissions: 1,
        isLegallyDue: true
      }
    }];

    const body: Shared.IDefraTradeCatchCertificate = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        {
          "status": Shared.DefraCcLandingStatusType.ValidationFailure_Species,
          "id": "GBR-2023-CC-C58DF9A73-1777642314",
          "landingDate": "2023-08-31",
          "species": "Lobster",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "AGAN BORLOWEN",
          "vesselPln": "SS229",
          "vesselLength": 6.88,
          "vesselAdministration": "Scotland",
          "licenceHolder": "MR S CLARY-BROM ",
          "source": "CATCH_RECORDING",
          "speciesAlias": "N",
          "weight": 122,
          "highSeasArea": "yes",
          "rfmo": "General Fisheries Commission for the Mediterranean (GFCM)",
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": true,
          "landingDataExpectedAtSubmission": true,
          "validation": {
            "liveExportWeight": 121,
            "totalEstimatedForExportSpecies": 30,
            "totalEstimatedWithTolerance": 56.1,
            "totalRecordedAgainstLanding": 200,
            "landedWeightExceededBy": 143.9,
            "rawLandingsUrl": "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            "salesNoteUrl": "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            "isLegallyDue": true
          },
          "risking": {
            "vessel": "0",
            "speciesRisk": "0",
            "exporterRiskScore": "0",
            "landingRiskScore": "0",
            "highOrLowRisk": Shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false
          },
          "flag": "GBR",
          "catchArea": Shared.CatchArea.FAO27,
          "homePort": "NEWLYN",
          "fishingLicenceNumber": "25072",
          "fishingLicenceValidTo": "2030-12-31",
          "imo": null
        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA",
        "isoNumericCode": "248"
      },
      "certStatus": Shared.CertificateStatus.COMPLETE,
      "transportation": {
        "modeofTransport": "truck",
        "hasRoadTransportDocument": true
      },
      "multiVesselSchedule": false
    };

    const expected: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: dynamicsCatchCertificateCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: dynamicsCatchCertificateCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: dynamicsCatchCertificateCase.exporter.accountId || null,
        UserId: dynamicsCatchCertificateCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: "COMPLETE",
        TimestampUtc: expect.any(String)
      },
      subject: Shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED + '-GBR-2020-CC-1BC924FCF'
    };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradeCc');

    await SUT.reportCcToTrade(cc, Shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED, dynamicsCatchCertificateCase, ccQueryResults);

    expect(mockMapper).toHaveBeenCalledWith(cc, dynamicsCatchCertificateCase, ccQueryResults);
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2020-CC-1BC924FCF', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('clonedFrom');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('landingsCloned');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('parentDocumentVoid');
  });

  it('will add CC payload to the the report queue for exportedTo with NI', async () => {
    const cc: IDocument = {
      "createdAt": new Date("2020-06-24T10:39:32.000Z"),
      "__t": "catchCert",
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "status": "COMPLETE",
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "audit": [
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:18.780Z"
          },
          "data": {
            "investigationStatus": "UNDER_INVESTIGATION"
          }
        },
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:23.439Z"
          },
          "data": {
            "investigationStatus": "CLOSED_NFA"
          }
        }
      ],
      "userReference": "MY REF",
      "exportData": {
        "products": [
          {
            "speciesId": "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            "species": "Black scabbardfish (BSF)",
            "speciesCode": "BSF",
            "commodityCode": "03028990",
            "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
            "scientificName": "Aphanopus carbo",
            "state": {
              "code": "FRE",
              "name": "Fresh"
            },
            "presentation": {
              "code": "GUT",
              "name": "Gutted"
            },
            "factor": 1.24,
            "caughtBy": [
              {
                "vessel": "AGAN BORLOWEN",
                "pln": "SS229",
                "homePort": "NEWLYN",
                "flag": "GBR",
                "cfr": "GBR000C20415",
                "imoNumber": null,
                "licenceNumber": "25072",
                "licenceValidTo": "2030-12-31",
                "licenceHolder": "MR S CLARY-BROM ",
                "id": "GBR-2023-CC-C58DF9A73-1777642314",
                "date": "2023-08-31",
                "faoArea": "FAO27",
                "weight": 122,
                "numberOfSubmissions": 1,
                "isLegallyDue": false,
                "dataEverExpected": true,
                "landingDataExpectedDate": "2023-08-31",
                "landingDataEndDate": "2023-09-02",
                "_status": "PENDING_LANDING_DATA"
              }
            ]
          }
        ],
        "transportation": {
          "exportedFrom": "United Kingdom",
          "exportedTo": {
            "officialCountryName": "Northern Ireland",
            "isoCodeAlpha2": "XI",
            "isoCodeAlpha3": null,
            "isoNumericCode": null
          },
          "vehicle": "truck",
          "cmr": true
        },
        "conservation": {
          "conservationReference": "UK Fisheries Policy"
        },
        "exporterDetails": {
          "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
          "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
          "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "buildingNumber": null,
          "subBuildingName": "NATURAL ENGLAND",
          "buildingName": "LANCASTER HOUSE",
          "streetName": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "postcode": "NE4 7YH",
          "townCity": "NEWCASTLE UPON TYNE",
          "exporterCompanyName": "Automation Testing Ltd",
          "exporterFullName": "Automation Tester",
          "_dynamicsAddress": {
            "defra_uprn": "10091818796",
            "defra_buildingname": "LANCASTER HOUSE",
            "defra_subbuildingname": "NATURAL ENGLAND",
            "defra_premises": null,
            "defra_street": "HAMPSHIRE COURT",
            "defra_locality": "NEWCASTLE BUSINESS PARK",
            "defra_dependentlocality": null,
            "defra_towntext": "NEWCASTLE UPON TYNE",
            "defra_county": null,
            "defra_postcode": "NE4 7YH",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "defra_internationalpostalcode": null,
            "defra_fromcompanieshouse": false,
            "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
          },
          "_dynamicsUser": {
            "firstName": "Automation",
            "lastName": "Tester"
          }
        },
        "landingsEntryOption": "manualEntry"
      },
      "createdByEmail": "foo@foo.com",
      "documentUri": "_44fd226f-598f-4615-930f-716b2762fea4.pdf",
      "investigation": {
        "investigator": "Chris Waugh",
        "status": "CLOSED_NFA"
      },
      "numberOfFailedAttempts": 5
    };

    const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        {
          "status": Shared.LandingStatusType.DataNeverExpected,
          "id": "GBR-2023-CC-C58DF9A73-4248789552",
          "startDate": "2023-08-31",
          "landingDate": "2023-08-31",
          "species": "BSF",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "ASHLEIGH JANE",
          "vesselPln": "OB81",
          "vesselLength": 9.91,
          "vesselAdministration": "Scotland",
          "licenceHolder": "C & J SHELLFISH LTD",
          "speciesAlias": "N",
          "weight": 89,
          "highSeasArea": "yes",
          "rfmo": "General Fisheries Commission for the Mediterranean (GFCM)",
          "gearType": "Type 1",
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": false,
          "isLate": false,
          "validation": {
            "liveExportWeight": 110.36,
            "totalRecordedAgainstLanding": 220.72,
            "landedWeightExceededBy": null,
            "rawLandingsUrl": "http://localhost:6500/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=A12860",
            "salesNoteUrl": "http://localhost:6500/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=A12860",
            "isLegallyDue": false
          },
          "risking": {
            "vessel": "0.5",
            "speciesRisk": "1",
            "exporterRiskScore": "1",
            "landingRiskScore": "0.5",
            "highOrLowRisk": Shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false
          }
        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA"
      }
    };

    const ccQueryResults: Shared.ICcQueryResult[] = [{
      documentNumber: 'GBR-2020-CC-1BC924FCF',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'C20415',
      da: 'Scotland',
      dateLanded: '2023-08-31',
      species: 'BSF',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      hasSalesNote: true,
      isSpeciesExists: false,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      speciesAlias: "N",
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
        moment.utc()
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        landingId: 'GBR-2023-CC-C58DF9A73-1777642314',
        exporterName: 'Mr Bob',
        presentation: 'GUT',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
        presentationName: 'sliced',
        vessel: 'AGAN BORLOWEN',
        fao: 'FAO27',
        highSeasArea: 'yes',
        rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
        pln: 'SS229',
        species: 'Lobster',
        scientificName: "Aphanopus carbo",
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '03028990',
        commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
        investigation: {
          investigator: "Investigator Gadget",
          status: InvestigationStatus.Open
        },
        transportationVehicle: 'truck',
        flag: "GBR",
        homePort: "NEWLYN",
        licenceNumber: "25072",
        licenceValidTo: "2030-12-31",
        licenceHolder: "MR S CLARY-BROM ",
        imoNumber: null,
        numberOfSubmissions: 1,
        isLegallyDue: true
      }
    }];

    const body: Shared.IDefraTradeCatchCertificate = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        {
          "status": Shared.DefraCcLandingStatusType.ValidationFailure_Species,
          "id": "GBR-2023-CC-C58DF9A73-1777642314",
          "landingDate": "2023-08-31",
          "species": "Lobster",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "AGAN BORLOWEN",
          "vesselPln": "SS229",
          "vesselLength": 6.88,
          "vesselAdministration": "Scotland",
          "licenceHolder": "MR S CLARY-BROM ",
          "source": "CATCH_RECORDING",
          "speciesAlias": "N",
          "weight": 122,
          "highSeasArea": "yes",
          "rfmo": "General Fisheries Commission for the Mediterranean (GFCM)",
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": true,
          "landingDataExpectedAtSubmission": true,
          "validation": {
            "liveExportWeight": 121,
            "totalEstimatedForExportSpecies": 30,
            "totalEstimatedWithTolerance": 56.1,
            "totalRecordedAgainstLanding": 200,
            "landedWeightExceededBy": 143.9,
            "rawLandingsUrl": "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            "salesNoteUrl": "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            "isLegallyDue": true
          },
          "risking": {
            "vessel": "0",
            "speciesRisk": "0",
            "exporterRiskScore": "0",
            "landingRiskScore": "0",
            "highOrLowRisk": Shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false
          },
          "flag": "GBR",
          "catchArea": Shared.CatchArea.FAO27,
          "homePort": "NEWLYN",
          "fishingLicenceNumber": "25072",
          "fishingLicenceValidTo": "2030-12-31",
          "imo": null
        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Northern Ireland",
        "isoCodeAlpha2": "XI",
        "isoCodeAlpha3": null,
        "isoNumericCode": null
      },
      "certStatus": Shared.CertificateStatus.COMPLETE,
      "transportation": {
        "modeofTransport": "truck",
        "hasRoadTransportDocument": true
      },
      "multiVesselSchedule": false
    };

    const expected: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: dynamicsCatchCertificateCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: dynamicsCatchCertificateCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: dynamicsCatchCertificateCase.exporter.accountId || null,
        UserId: dynamicsCatchCertificateCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: "COMPLETE",
        TimestampUtc: expect.any(String)
      },
      subject: Shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED + '-GBR-2020-CC-1BC924FCF'
    };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradeCc');

    await SUT.reportCcToTrade(cc, Shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED, dynamicsCatchCertificateCase, ccQueryResults);

    expect(mockMapper).toHaveBeenCalledWith(cc, dynamicsCatchCertificateCase, ccQueryResults);
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2020-CC-1BC924FCF', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('clonedFrom');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('landingsCloned');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('parentDocumentVoid');
  });

  it('will add CC payload to the the report queue for VOID by exporter', async () => {
    const cc: IDocument = {
      "createdAt": new Date("2020-06-24T10:39:32.000Z"),
      "__t": "catchCert",
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "status": "COMPLETE",
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "audit": [
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:18.780Z"
          },
          "data": {
            "investigationStatus": "UNDER_INVESTIGATION"
          }
        },
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:23.439Z"
          },
          "data": {
            "investigationStatus": "CLOSED_NFA"
          }
        }
      ],
      "userReference": "MY REF",
      "exportData": {
        "products": [
          {
            "speciesId": "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            "species": "Black scabbardfish (BSF)",
            "speciesCode": "BSF",
            "commodityCode": "03028990",
            "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
            "scientificName": "Aphanopus carbo",
            "state": {
              "code": "FRE",
              "name": "Fresh"
            },
            "presentation": {
              "code": "GUT",
              "name": "Gutted"
            },
            "factor": 1.24,
            "caughtBy": [
              {
                "vessel": "AGAN BORLOWEN",
                "pln": "SS229",
                "homePort": "NEWLYN",
                "flag": "GBR",
                "cfr": "GBR000C20415",
                "imoNumber": null,
                "licenceNumber": "25072",
                "licenceValidTo": "2030-12-31",
                "licenceHolder": "MR S CLARY-BROM ",
                "id": "GBR-2023-CC-C58DF9A73-1777642314",
                "date": "2023-08-31",
                "faoArea": "FAO27",
                "weight": 122,
                "numberOfSubmissions": 1,
                "isLegallyDue": false,
                "dataEverExpected": true,
                "landingDataExpectedDate": "2023-08-31",
                "landingDataEndDate": "2023-09-02",
                "_status": "PENDING_LANDING_DATA"
              }
            ]
          }
        ],
        "transportation": {
          "exportedFrom": "United Kingdom",
          "exportedTo": {
            "officialCountryName": "Åland Islands",
            "isoCodeAlpha2": "AX",
            "isoCodeAlpha3": "ALA",
            "isoNumericCode": "248"
          },
          "vehicle": "truck",
          "cmr": true
        },
        "conservation": {
          "conservationReference": "UK Fisheries Policy"
        },
        "exporterDetails": {
          "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
          "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
          "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "buildingNumber": null,
          "subBuildingName": "NATURAL ENGLAND",
          "buildingName": "LANCASTER HOUSE",
          "streetName": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "postcode": "NE4 7YH",
          "townCity": "NEWCASTLE UPON TYNE",
          "exporterCompanyName": "Automation Testing Ltd",
          "exporterFullName": "Automation Tester",
          "_dynamicsAddress": {
            "defra_uprn": "10091818796",
            "defra_buildingname": "LANCASTER HOUSE",
            "defra_subbuildingname": "NATURAL ENGLAND",
            "defra_premises": null,
            "defra_street": "HAMPSHIRE COURT",
            "defra_locality": "NEWCASTLE BUSINESS PARK",
            "defra_dependentlocality": null,
            "defra_towntext": null,
            "defra_county": null,
            "defra_postcode": "NE4 7YH",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "defra_internationalpostalcode": null,
            "defra_fromcompanieshouse": false,
            "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
          },
          "_dynamicsUser": {
            "firstName": "Automation",
            "lastName": "Tester"
          }
        },
        "landingsEntryOption": "manualEntry"
      },
      "createdByEmail": "foo@foo.com",
      "documentUri": "_44fd226f-598f-4615-930f-716b2762fea4.pdf",
      "investigation": {
        "investigator": "Chris Waugh",
        "status": "CLOSED_NFA"
      },
      "numberOfFailedAttempts": 5
    };

    const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.VoidByExporter,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": null,
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": null,
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA"
      }
    };

    const body: Shared.IDefraTradeCatchCertificate = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.VoidByExporter,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": null,
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": null,
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA",
        "isoNumericCode": "248"
      },
      "certStatus": Shared.CertificateStatus.VOID,
      "transportation": {
        "modeofTransport": "truck",
        "hasRoadTransportDocument": true
      },
      "multiVesselSchedule": false
    };

    const expected: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: dynamicsCatchCertificateCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: dynamicsCatchCertificateCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: dynamicsCatchCertificateCase.exporter.accountId || null,
        UserId: dynamicsCatchCertificateCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: Shared.CertificateStatus.VOID,
        TimestampUtc: expect.any(String)
      },
      subject: Shared.MessageLabel.CATCH_CERTIFICATE_VOIDED + '-GBR-2020-CC-1BC924FCF'
    };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradeCc');

    await SUT.reportCcToTrade(cc, Shared.MessageLabel.CATCH_CERTIFICATE_VOIDED, dynamicsCatchCertificateCase, null);

    expect(mockMapper).toHaveBeenCalledWith(cc, dynamicsCatchCertificateCase, null);
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2020-CC-1BC924FCF', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('clonedFrom');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('landingsCloned');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('parentDocumentVoid');
  });

  it('will add CC payload to the the report queue for VOID by admin', async () => {
    const cc: IDocument = {
      "createdAt": new Date("2020-06-24T10:39:32.000Z"),
      "__t": "catchCert",
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "status": "COMPLETE",
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "audit": [
        {
          "eventType": "VOIDED",
          "triggeredBy": "Automated Tester MMO ECC Service Management",
          "timestamp": {
            "$date": "1702984738656"
          },
          "data": null
        }
      ],
      "userReference": "MY REF",
      "exportData": {
        "products": [
          {
            "speciesId": "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            "species": "Black scabbardfish (BSF)",
            "speciesCode": "BSF",
            "commodityCode": "03028990",
            "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
            "scientificName": "Aphanopus carbo",
            "state": {
              "code": "FRE",
              "name": "Fresh"
            },
            "presentation": {
              "code": "GUT",
              "name": "Gutted"
            },
            "factor": 1.24,
            "caughtBy": [
              {
                "vessel": "AGAN BORLOWEN",
                "pln": "SS229",
                "homePort": "NEWLYN",
                "flag": "GBR",
                "cfr": "GBR000C20415",
                "imoNumber": null,
                "licenceNumber": "25072",
                "licenceValidTo": "2030-12-31",
                "licenceHolder": "MR S CLARY-BROM ",
                "id": "GBR-2023-CC-C58DF9A73-1777642314",
                "date": "2023-08-31",
                "faoArea": "FAO27",
                "weight": 122,
                "numberOfSubmissions": 1,
                "isLegallyDue": false,
                "dataEverExpected": true,
                "landingDataExpectedDate": "2023-08-31",
                "landingDataEndDate": "2023-09-02",
                "_status": "PENDING_LANDING_DATA"
              }
            ]
          }
        ],
        "transportation": {
          "exportedFrom": "United Kingdom",
          "exportedTo": {
            "officialCountryName": "Åland Islands",
            "isoCodeAlpha2": "AX",
            "isoCodeAlpha3": "ALA",
            "isoNumericCode": "248"
          },
          "vehicle": "truck",
          "cmr": true
        },
        "conservation": {
          "conservationReference": "UK Fisheries Policy"
        },
        "exporterDetails": {
          "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "buildingNumber": null,
          "subBuildingName": "NATURAL ENGLAND",
          "buildingName": "LANCASTER HOUSE",
          "streetName": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "postcode": "NE4 7YH",
          "townCity": "NEWCASTLE UPON TYNE",
          "exporterCompanyName": "Automation Testing Ltd",
          "exporterFullName": "Automation Tester",
        },
        "landingsEntryOption": "manualEntry"
      },
      "createdByEmail": "foo@foo.com",
      "documentUri": "_44fd226f-598f-4615-930f-716b2762fea4.pdf",
      "investigation": {
        "investigator": "Chris Waugh",
        "status": "CLOSED_NFA"
      },
      "numberOfFailedAttempts": 5
    };

    const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.VoidByAdmin,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        }
      },
      "landings": null,
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA"
      },
      "audits": [{
        "auditOperation": "VOIDED",
        "user": "Automated Tester MMO ECC Service Management",
        "auditAt": expect.any(Date)
      }]
    };

    const body: Shared.IDefraTradeCatchCertificate = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.VoidByAdmin,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        }
      },
      "landings": null,
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "audits": [
        {
          "auditAt": expect.any(Date),
          "auditOperation": "VOIDED",
          "user": "Automated Tester MMO ECC Service Management",
        },
      ],
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA",
        "isoNumericCode": "248"
      },
      "certStatus": Shared.CertificateStatus.VOID,
      "transportation": {
        "modeofTransport": "truck",
        "hasRoadTransportDocument": true
      },
      "multiVesselSchedule": false
    };

    const expected: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: dynamicsCatchCertificateCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: dynamicsCatchCertificateCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: dynamicsCatchCertificateCase.exporter.accountId || null,
        UserId: dynamicsCatchCertificateCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: Shared.CertificateStatus.VOID,
        TimestampUtc: expect.any(String)
      },
      subject: Shared.MessageLabel.CATCH_CERTIFICATE_VOIDED + '-GBR-2020-CC-1BC924FCF'
    };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradeCc');

    await SUT.reportCcToTrade(cc, Shared.MessageLabel.CATCH_CERTIFICATE_VOIDED, dynamicsCatchCertificateCase, null);

    expect(mockMapper).toHaveBeenCalledWith(cc, dynamicsCatchCertificateCase, null);
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2020-CC-1BC924FCF', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('clonedFrom');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('landingsCloned');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('parentDocumentVoid');
  });

  it('will add CC payload to the the report queue for transportation with CMR', async () => {
    const cc: IDocument = {
      "createdAt": new Date("2020-06-24T10:39:32.000Z"),
      "__t": "catchCert",
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "status": "COMPLETE",
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "audit": [
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:18.780Z"
          },
          "data": {
            "investigationStatus": "UNDER_INVESTIGATION"
          }
        },
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:23.439Z"
          },
          "data": {
            "investigationStatus": "CLOSED_NFA"
          }
        }
      ],
      "userReference": "MY REF",
      "exportData": {
        "products": [
          {
            "speciesId": "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            "species": "Black scabbardfish (BSF)",
            "speciesCode": "BSF",
            "commodityCode": "03028990",
            "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
            "scientificName": "Aphanopus carbo",
            "state": {
              "code": "FRE",
              "name": "Fresh"
            },
            "presentation": {
              "code": "GUT",
              "name": "Gutted"
            },
            "factor": 1.24,
            "caughtBy": [
              {
                "vessel": "AGAN BORLOWEN",
                "pln": "SS229",
                "homePort": "NEWLYN",
                "flag": "GBR",
                "cfr": "GBR000C20415",
                "imoNumber": null,
                "licenceNumber": "25072",
                "licenceValidTo": "2030-12-31",
                "licenceHolder": "MR S CLARY-BROM ",
                "id": "GBR-2023-CC-C58DF9A73-1777642314",
                "date": "2023-08-31",
                "faoArea": "FAO27",
                "weight": 122,
                "numberOfSubmissions": 1,
                "isLegallyDue": false,
                "dataEverExpected": true,
                "landingDataExpectedDate": "2023-08-31",
                "landingDataEndDate": "2023-09-02",
                "_status": "PENDING_LANDING_DATA"
              }
            ]
          }
        ],
        "transportations": [{
          "id": 0,
          "vehicle": "truck",
          "cmr": true
        }],
        "conservation": {
          "conservationReference": "UK Fisheries Policy"
        },
        "exporterDetails": {
          "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
          "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
          "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "buildingNumber": null,
          "subBuildingName": "NATURAL ENGLAND",
          "buildingName": "LANCASTER HOUSE",
          "streetName": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "postcode": "NE4 7YH",
          "townCity": "NEWCASTLE UPON TYNE",
          "exporterCompanyName": "Automation Testing Ltd",
          "exporterFullName": "Automation Tester",
          "_dynamicsAddress": {
            "defra_uprn": "10091818796",
            "defra_buildingname": "LANCASTER HOUSE",
            "defra_subbuildingname": "NATURAL ENGLAND",
            "defra_premises": null,
            "defra_street": "HAMPSHIRE COURT",
            "defra_locality": "NEWCASTLE BUSINESS PARK",
            "defra_dependentlocality": null,
            "defra_towntext": "NEWCASTLE UPON TYNE",
            "defra_county": null,
            "defra_postcode": "NE4 7YH",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "defra_internationalpostalcode": null,
            "defra_fromcompanieshouse": false,
            "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
          },
          "_dynamicsUser": {
            "firstName": "Automation",
            "lastName": "Tester"
          }
        },
        "landingsEntryOption": "manualEntry",
        "exportedFrom": "United Kingdom",
        "exportedTo": {
          "officialCountryName": "Northern Ireland",
          "isoCodeAlpha2": "XI",
          "isoCodeAlpha3": null,
          "isoNumericCode": null
        },
      },
      "createdByEmail": "foo@foo.com",
      "documentUri": "_44fd226f-598f-4615-930f-716b2762fea4.pdf",
      "investigation": {
        "investigator": "Chris Waugh",
        "status": "CLOSED_NFA"
      },
      "numberOfFailedAttempts": 5
    };

    const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        {
          "status": Shared.LandingStatusType.DataNeverExpected,
          "id": "GBR-2023-CC-C58DF9A73-4248789552",
          "startDate": "2023-08-31",
          "landingDate": "2023-08-31",
          "species": "BSF",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "ASHLEIGH JANE",
          "vesselPln": "OB81",
          "vesselLength": 9.91,
          "vesselAdministration": "Scotland",
          "licenceHolder": "C & J SHELLFISH LTD",
          "speciesAlias": "N",
          "weight": 89,
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": false,
          "isLate": false,
          "validation": {
            "liveExportWeight": 110.36,
            "totalRecordedAgainstLanding": 220.72,
            "landedWeightExceededBy": null,
            "rawLandingsUrl": "http://localhost:6500/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=A12860",
            "salesNoteUrl": "http://localhost:6500/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=A12860",
            "isLegallyDue": false
          },
          "risking": {
            "vessel": "0.5",
            "speciesRisk": "1",
            "exporterRiskScore": "1",
            "landingRiskScore": "0.5",
            "highOrLowRisk": Shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false
          }
        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA"
      }
    };

    const ccQueryResults: Shared.ICcQueryResult[] = [{
      documentNumber: 'GBR-2020-CC-1BC924FCF',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'C20415',
      da: 'Scotland',
      dateLanded: '2023-08-31',
      species: 'BSF',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      hasSalesNote: true,
      isSpeciesExists: false,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      speciesAlias: "N",
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
        moment.utc()
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        landingId: 'GBR-2023-CC-C58DF9A73-1777642314',
        exporterName: 'Mr Bob',
        presentation: 'GUT',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
        presentationName: 'sliced',
        vessel: 'AGAN BORLOWEN',
        fao: 'FAO27',
        highSeasArea: 'yes',
        rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
        pln: 'SS229',
        species: 'Lobster',
        scientificName: "Aphanopus carbo",
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '03028990',
        commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
        investigation: {
          investigator: "Investigator Gadget",
          status: InvestigationStatus.Open
        },
        transportationVehicle: 'truck',
        flag: "GBR",
        homePort: "NEWLYN",
        licenceNumber: "25072",
        licenceValidTo: "2030-12-31",
        licenceHolder: "MR S CLARY-BROM ",
        imoNumber: null,
        numberOfSubmissions: 1,
        isLegallyDue: true
      }
    }];

    const body: Shared.IDefraTradeCatchCertificate = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        {
          "status": Shared.DefraCcLandingStatusType.ValidationFailure_Species,
          "id": "GBR-2023-CC-C58DF9A73-1777642314",
          "landingDate": "2023-08-31",
          "species": "Lobster",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "AGAN BORLOWEN",
          "vesselPln": "SS229",
          "vesselLength": 6.88,
          "vesselAdministration": "Scotland",
          "licenceHolder": "MR S CLARY-BROM ",
          "source": "CATCH_RECORDING",
          "speciesAlias": "N",
          "weight": 122,
          "highSeasArea": "yes",
          "rfmo": "General Fisheries Commission for the Mediterranean (GFCM)",
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": true,
          "landingDataExpectedAtSubmission": true,
          "validation": {
            "liveExportWeight": 121,
            "totalEstimatedForExportSpecies": 30,
            "totalEstimatedWithTolerance": 56.1,
            "totalRecordedAgainstLanding": 200,
            "landedWeightExceededBy": 143.9,
            "rawLandingsUrl": "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            "salesNoteUrl": "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            "isLegallyDue": true
          },
          "risking": {
            "vessel": "0",
            "speciesRisk": "0",
            "exporterRiskScore": "0",
            "landingRiskScore": "0",
            "highOrLowRisk": Shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false
          },
          "flag": "GBR",
          "catchArea": Shared.CatchArea.FAO27,
          "homePort": "NEWLYN",
          "fishingLicenceNumber": "25072",
          "fishingLicenceValidTo": "2030-12-31",
          "imo": null
        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Northern Ireland",
        "isoCodeAlpha2": "XI",
        "isoCodeAlpha3": null,
        "isoNumericCode": null
      },
      "certStatus": Shared.CertificateStatus.COMPLETE,
      "transportation": {
        "modeofTransport": "truck",
        "hasRoadTransportDocument": true
      },
      "multiVesselSchedule": false
    };

    const expected: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: dynamicsCatchCertificateCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: dynamicsCatchCertificateCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: dynamicsCatchCertificateCase.exporter.accountId || null,
        UserId: dynamicsCatchCertificateCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: "COMPLETE",
        TimestampUtc: expect.any(String)
      },
      subject: Shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED + '-GBR-2020-CC-1BC924FCF'
    };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradeCc');

    await SUT.reportCcToTrade(cc, Shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED, dynamicsCatchCertificateCase, ccQueryResults);

    expect(mockMapper).toHaveBeenCalledWith(cc, dynamicsCatchCertificateCase, ccQueryResults);
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2020-CC-1BC924FCF', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('clonedFrom');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('landingsCloned');
    expect(dynamicsCatchCertificateCase).not.toHaveProperty('parentDocumentVoid');
  });

  it('will not add PS payload when it contains a validation error', async () => {
    const cc: any = { test: 'proccessing statement', documentNumber: 'document1' };
    const mapped: any = { _correlationId: 'some-uuid-correlation-id' };
    const psCase: IDynamicsProcessingStatementCase = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "PS",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-PS-234234-234-234",
      "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
      "exportedTo": {
        "officialCountryName": "Nigeria",
        "isoCodeAlpha2": "NG",
        "isoCodeAlpha3": "NGR"
      },
      "catches": [
        {
          "foreignCatchCertificateNumber": "FR-PS-234234-23423-234234",
          "isDocumentIssuedInUK": true,
          "id": "GBR-PS-234234-234-234-1234567890",
          "species": "HER",
          "cnCode": "324234324432234",
          "scientificName": "scientific name",
          "importedWeight": 500,
          "usedWeightAgainstCertificate": 700,
          "processedWeight": 800,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 700,
            "weightExceededAmount": 300,
            "overuseInfo": [
              "GBR-PS-123234-123-234”,”GBR-PS-123234-123-234"
            ]
          }
        },
        {
          "foreignCatchCertificateNumber": "IRL-PS-4324-423423-234234",
          "isDocumentIssuedInUK": false,
          "id": "GBR-PS-234234-234-234-1234567890",
          "species": "SAL",
          "cnCode": "523842358",
          "scientificName": "scientific name",
          "importedWeight": 200,
          "usedWeightAgainstCertificate": 100,
          "processedWeight": 150,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 200
          }
        }
      ],
      "da": "Northern Ireland",
      "plantName": "Bob's Fisheries LTD",
      "personResponsible": "Mr. Bob",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": true,
      "clonedFrom": "GBR-PS-234234-234-234",
      "parentDocumentVoid": false
    };

    const psQueryResults: ISdPsQueryResult[] = [{
      documentNumber: "PS1",
      catchCertificateNumber: "PS2",
      catchCertificateType: 'uk',
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
      da: 'England',
      extended: {
        id: 'PS2-1610018839',
      }
    }];

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradePs');
    mockMapper.mockReturnValue(mapped);

    await SUT.reportPsToTrade(cc, Shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED, psCase, psQueryResults);

    expect(mockPersistence).not.toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalled();
  });

  it('will add PS payload to the report queue', async () => {
    const ps: IDocument = {
      "documentNumber": "GBR-2023-PS-6D2C91A0A",
      "status": "COMPLETE",
      "createdAt": new Date("2020-06-24T10:39:32.000Z"),
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "createdByEmail": "foo@foo.com",
      "requestByAdmin": false,
      "contactId": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ13",
      "__t": "processingStatement",
      "audit": [],
      "exportData": {
        "catches": [
          {
            "catchCertificateNumber": "GBR-2023-CC-1975CB0F9",
            "catchCertificateType": "non_uk",
            "species": "Northern shortfin squid (SQI)",
            "speciesCode": "SQI",
            "id": "GBR-2023-CC-1975CB0F9-1692962600",
            "totalWeightLanded": "80",
            "exportWeightBeforeProcessing": "80",
            "exportWeightAfterProcessing": "80",
            "scientificName": "Illex illecebrosus",
            "_id": {
              "$oid": "64e88f2814ee5ab32f4a9278"
            }
          }
        ],
        "products": [
          {
            "id": "GBR-2023-PS-6D2C91A0A-1692962523",
            "commodityCode": "03021180",
            "description": "something",
            "_id": {
              "$oid": "64e88f2814ee5ab32f4a9279"
            }
          }
        ],
        "consignmentDescription": null,
        "healthCertificateNumber": "20/2/123456",
        "healthCertificateDate": "25/08/2023",
        "exporterDetails": {
          "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
          "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
          "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "buildingNumber": null,
          "subBuildingName": "NATURAL ENGLAND",
          "buildingName": "LANCASTER HOUSE",
          "streetName": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "postcode": "NE4 7YH",
          "townCity": "NEWCASTLE UPON TYNE",
          "exporterCompanyName": "Automation Testing Ltd",
          "_dynamicsAddress": {
            "defra_uprn": "10091818796",
            "defra_buildingname": "LANCASTER HOUSE",
            "defra_subbuildingname": "NATURAL ENGLAND",
            "defra_premises": null,
            "defra_street": "HAMPSHIRE COURT",
            "defra_locality": "NEWCASTLE BUSINESS PARK",
            "defra_dependentlocality": null,
            "defra_towntext": "NEWCASTLE UPON TYNE",
            "defra_county": null,
            "defra_postcode": "NE4 7YH",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "defra_internationalpostalcode": null,
            "defra_fromcompanieshouse": false,
            "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
          },
          "_dynamicsUser": {
            "firstName": "Automation",
            "lastName": "Tester"
          }
        },
        "personResponsibleForConsignment": "Isaac",
        "plantApprovalNumber": "1234",
        "plantName": "name",
        "plantAddressOne": "LANCASTER HOUSE, MMO SUB, HAMPSHIRE COURT",
        "plantSubBuildingName": "MMO SUB",
        "plantBuildingName": "LANCASTER HOUSE",
        "plantStreetName": "HAMPSHIRE COURT",
        "plantCounty": "TYNESIDE",
        "plantCountry": "ENGLAND",
        "plantTownCity": "NEWCASTLE UPON TYNE",
        "plantPostcode": "NE4 7YH",
        "dateOfAcceptance": "25/08/2023",
        "exportedTo": {
          "officialCountryName": "France",
          "isoCodeAlpha2": "FR",
          "isoCodeAlpha3": "FRA",
          "isoNumericCode": "250"
        }
      },
      "documentUri": "_5831e2cd-faef-4e64-9d67-3eb23ba7d930.pdf"
    };

    const psCase: IDynamicsProcessingStatementCase = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "PS",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-2023-PS-6D2C91A0A",
      "plantName": "Bob's Fisheries LTD",
      "personResponsible": "Mr. Bob",
      "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
      "exportedTo": {
        "officialCountryName": "Nigeria",
        "isoCodeAlpha2": "NG",
        "isoCodeAlpha3": "NGR"
      },
      "catches": [
        {
          "foreignCatchCertificateNumber": "FR-PS-234234-23423-234234",
          "isDocumentIssuedInUK": false,
          "id": "GBR-2023-PS-6D2C91A0A-1234567890",
          "species": "HER",
          "cnCode": "324234324432234",
          "scientificName": "scientific name",
          "importedWeight": 500,
          "usedWeightAgainstCertificate": 700,
          "processedWeight": 800,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 700,
            "weightExceededAmount": 300,
            "overuseInfo": [
              "GBR-PS-123234-123-234”,”GBR-PS-123234-123-234"
            ]
          }
        },
        {
          "foreignCatchCertificateNumber": "IRL-PS-4324-423423-234234",
          "isDocumentIssuedInUK": false,
          "id": "GBR-PS-234234-234-234-1234567890",
          "species": "SAL",
          "cnCode": "523842358",
          "scientificName": "scientific name",
          "importedWeight": 200,
          "usedWeightAgainstCertificate": 100,
          "processedWeight": 150,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 200
          }
        }
      ],
      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": true,
      "clonedFrom": "GBR-PS-234234-234-234",
      "parentDocumentVoid": false
    };

    const body: IDefraTradeProcessingStatement = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "PS",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-2023-PS-6D2C91A0A",
      "plantName": "Bob's Fisheries LTD",
      "personResponsible": "Mr. Bob",
      "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
      "exportedTo": {
        "officialCountryName": "France",
        "isoCodeAlpha2": "FR",
        "isoCodeAlpha3": "FRA",
        "isoNumericCode": "250"
      },
      "catches": [
        {
          "foreignCatchCertificateNumber": "PS2",
          "id": "PS2-1610018839",
          "species": "Atlantic cod (COD)",
          "cnCode": "FRESHCOD",
          "scientificName": "Gadus morhua",
          "importedWeight": 200,
          "usedWeightAgainstCertificate": 100,
          "processedWeight": 80,
          "validation": {
            "status": IDefraTradeSdPsStatus.Success,
            "totalUsedWeightAgainstCertificate": 150,
            "weightExceededAmount": 0,
            "overuseInfo": undefined,
          }
        }
      ],
      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": true,
      "plantAddress": {
        "line1": "LANCASTER HOUSE, MMO SUB, HAMPSHIRE COURT",
        "building_name": "LANCASTER HOUSE",
        "sub_building_name": "MMO SUB",
        "street_name": "HAMPSHIRE COURT",
        "country": "ENGLAND",
        "county": "TYNESIDE",
        "city": "NEWCASTLE UPON TYNE",
        "postCode": "NE4 7YH"
      },
      "plantApprovalNumber": "1234",
      "plantDateOfAcceptance": "2023-08-25",
      "healthCertificateNumber": "20/2/123456",
      "healthCertificateDate": "2023-08-25",
      "authority": {
        "name": "Illegal Unreported and Unregulated (IUU) Fishing Team",
        "companyName": "Marine Management Organisation",
        "address": {
          "line1": "Lancaster House, Hampshire Court",
          "building_name": "Lancaster House",
          "street_name": "Hampshire Court",
          "city": "Newcastle upon Tyne",
          "postCode": "NE4 7YJ",
          "country": "United Kingdom"
        },
        "tel": "0300 123 1032",
        "email": "ukiuuslo@marinemanagement.org.uk",
        "dateIssued": moment().format('YYYY-MM-DD')
      }
    };

    const psQueryResults: ISdPsQueryResult[] = [{
      documentNumber: "GBR-2023-PS-6D2C91A0A",
      catchCertificateNumber: "PS2",
      catchCertificateType: "non_uk",
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
      da: 'England',
      extended: {
        id: 'PS2-1610018839',
      }
    }];

    const expected: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: psCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: psCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: psCase.exporter.accountId || null,
        UserId: psCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: "COMPLETE",
        TimestampUtc: expect.any(String)
      },
      subject: Shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED + '-GBR-2023-PS-6D2C91A0A'
    };

    const psQueryResultsBlocked: ISdPsQueryResult[] = [{
      documentNumber: "GBR-2023-PS-6D2C91A0A",
      catchCertificateNumber: "PS2",
      catchCertificateType: "non_uk",
      documentType: "PS",
      createdAt: "2020-01-01",
      status: "BLOCKED",
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
      da: 'England',
      extended: {
        id: 'PS2-1610018839',
      }
    }];

    const expectedResult: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: psCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: psCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: psCase.exporter.accountId || null,
        UserId: psCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: "BLOCKED",
        TimestampUtc: expect.any(String)
      },
      subject: Shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED + '-GBR-2023-PS-6D2C91A0A'
    };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradePs');

    await SUT.reportPsToTrade(ps, Shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED, psCase, psQueryResults);
    await SUT.reportPsToTrade(ps, Shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED, psCase, psQueryResultsBlocked);

    expect(mockMapper).toHaveBeenCalledWith(ps, psCase, psQueryResults);
    expect(mockMapper).toHaveBeenCalledWith(ps, psCase, psQueryResultsBlocked);

    expect(mockPersistence).toHaveBeenCalledWith('GBR-2023-PS-6D2C91A0A', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2023-PS-6D2C91A0A', expectedResult, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
  });

  it('will add PS payload to the report queue for exportedTo with NI', async () => {
    const ps: IDocument = {
      "documentNumber": "GBR-2023-PS-6D2C91A0A",
      "status": "COMPLETE",
      "createdAt": new Date("2020-06-24T10:39:32.000Z"),
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "createdByEmail": "foo@foo.com",
      "requestByAdmin": false,
      "contactId": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ13",
      "__t": "processingStatement",
      "audit": [],
      "exportData": {
        "catches": [
          {
            "catchCertificateNumber": "GBR-2023-CC-1975CB0F9",
            "catchCertificateType": "non_uk",
            "species": "Northern shortfin squid (SQI)",
            "speciesCode": "SQI",
            "id": "GBR-2023-CC-1975CB0F9-1692962600",
            "totalWeightLanded": "80",
            "exportWeightBeforeProcessing": "80",
            "exportWeightAfterProcessing": "80",
            "scientificName": "Illex illecebrosus",
            "_id": {
              "$oid": "64e88f2814ee5ab32f4a9278"
            }
          }
        ],
        "products": [
          {
            "id": "GBR-2023-PS-6D2C91A0A-1692962523",
            "commodityCode": "03021180",
            "description": "something",
            "_id": {
              "$oid": "64e88f2814ee5ab32f4a9279"
            }
          }
        ],
        "consignmentDescription": null,
        "healthCertificateNumber": "20/2/123456",
        "healthCertificateDate": "25/08/2023",
        "exporterDetails": {
          "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
          "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
          "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "buildingNumber": null,
          "subBuildingName": "NATURAL ENGLAND",
          "buildingName": "LANCASTER HOUSE",
          "streetName": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "postcode": "NE4 7YH",
          "townCity": "NEWCASTLE UPON TYNE",
          "exporterCompanyName": "Automation Testing Ltd",
          "_dynamicsAddress": {
            "defra_uprn": "10091818796",
            "defra_buildingname": "LANCASTER HOUSE",
            "defra_subbuildingname": "NATURAL ENGLAND",
            "defra_premises": null,
            "defra_street": "HAMPSHIRE COURT",
            "defra_locality": "NEWCASTLE BUSINESS PARK",
            "defra_dependentlocality": null,
            "defra_towntext": "NEWCASTLE UPON TYNE",
            "defra_county": null,
            "defra_postcode": "NE4 7YH",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "defra_internationalpostalcode": null,
            "defra_fromcompanieshouse": false,
            "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
          },
          "_dynamicsUser": {
            "firstName": "Automation",
            "lastName": "Tester"
          }
        },
        "personResponsibleForConsignment": "Isaac",
        "plantApprovalNumber": "1234",
        "plantName": "name",
        "plantAddressOne": "LANCASTER HOUSE, MMO SUB, HAMPSHIRE COURT",
        "plantSubBuildingName": "MMO SUB",
        "plantBuildingName": "LANCASTER HOUSE",
        "plantStreetName": "HAMPSHIRE COURT",
        "plantCounty": "TYNESIDE",
        "plantCountry": "ENGLAND",
        "plantTownCity": "NEWCASTLE UPON TYNE",
        "plantPostcode": "NE4 7YH",
        "dateOfAcceptance": "25/08/2023",
        "exportedTo": {
          "officialCountryName": "Northern Ireland",
          "isoCodeAlpha2": "XI",
          "isoCodeAlpha3": null,
          "isoNumericCode": null
        }
      },
      "documentUri": "_5831e2cd-faef-4e64-9d67-3eb23ba7d930.pdf"
    };

    const psCase: IDynamicsProcessingStatementCase = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "PS",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-2023-PS-6D2C91A0A",
      "plantName": "Bob's Fisheries LTD",
      "personResponsible": "Mr. Bob",
      "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
      "exportedTo": {
        "officialCountryName": "Northern Ireland",
        "isoCodeAlpha2": "XI",
      },
      "catches": [
        {
          "foreignCatchCertificateNumber": "FR-PS-234234-23423-234234",
          "isDocumentIssuedInUK": false,
          "id": "GBR-2023-PS-6D2C91A0A-1234567890",
          "species": "HER",
          "cnCode": "324234324432234",
          "scientificName": "scientific name",
          "importedWeight": 500,
          "usedWeightAgainstCertificate": 700,
          "processedWeight": 800,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 700,
            "weightExceededAmount": 300,
            "overuseInfo": [
              "GBR-PS-123234-123-234”,”GBR-PS-123234-123-234"
            ]
          }
        },
        {
          "foreignCatchCertificateNumber": "IRL-PS-4324-423423-234234",
          "isDocumentIssuedInUK": false,
          "id": "GBR-PS-234234-234-234-1234567890",
          "species": "SAL",
          "cnCode": "523842358",
          "scientificName": "scientific name",
          "importedWeight": 200,
          "usedWeightAgainstCertificate": 100,
          "processedWeight": 150,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 200
          }
        }
      ],
      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": true,
      "clonedFrom": "GBR-PS-234234-234-234",
      "parentDocumentVoid": false
    };

    const body: IDefraTradeProcessingStatement = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "PS",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-2023-PS-6D2C91A0A",
      "plantName": "Bob's Fisheries LTD",
      "personResponsible": "Mr. Bob",
      "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
      "exportedTo": {
        "officialCountryName": "Northern Ireland",
        "isoCodeAlpha2": "XI",
        "isoCodeAlpha3": null,
        "isoNumericCode": null
      },
      "catches": [
        {
          "foreignCatchCertificateNumber": "PS2",
          "id": "PS2-1610018839",
          "species": "Atlantic cod (COD)",
          "cnCode": "FRESHCOD",
          "scientificName": "Gadus morhua",
          "importedWeight": 200,
          "usedWeightAgainstCertificate": 100,
          "processedWeight": 80,
          "validation": {
            "status": IDefraTradeSdPsStatus.Success,
            "totalUsedWeightAgainstCertificate": 150,
            "weightExceededAmount": 0,
            "overuseInfo": undefined,
          }
        }
      ],
      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": true,
      "plantAddress": {
        "line1": "LANCASTER HOUSE, MMO SUB, HAMPSHIRE COURT",
        "building_name": "LANCASTER HOUSE",
        "sub_building_name": "MMO SUB",
        "street_name": "HAMPSHIRE COURT",
        "country": "ENGLAND",
        "county": "TYNESIDE",
        "city": "NEWCASTLE UPON TYNE",
        "postCode": "NE4 7YH"
      },
      "plantApprovalNumber": "1234",
      "plantDateOfAcceptance": "2023-08-25",
      "healthCertificateNumber": "20/2/123456",
      "healthCertificateDate": "2023-08-25",
      "authority": {
        "name": "Illegal Unreported and Unregulated (IUU) Fishing Team",
        "companyName": "Marine Management Organisation",
        "address": {
          "line1": "Lancaster House, Hampshire Court",
          "building_name": "Lancaster House",
          "street_name": "Hampshire Court",
          "city": "Newcastle upon Tyne",
          "postCode": "NE4 7YJ",
          "country": "United Kingdom"
        },
        "tel": "0300 123 1032",
        "email": "ukiuuslo@marinemanagement.org.uk",
        "dateIssued": moment().format('YYYY-MM-DD')
      }
    };

    const psQueryResults: ISdPsQueryResult[] = [{
      documentNumber: "GBR-2023-PS-6D2C91A0A",
      catchCertificateNumber: "PS2",
      catchCertificateType: "non_uk",
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
      da: 'England',
      extended: {
        id: 'PS2-1610018839',
      }
    }];

    const expected: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: psCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: psCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: psCase.exporter.accountId || null,
        UserId: psCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: "COMPLETE",
        TimestampUtc: expect.any(String)
      },
      subject: Shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED + '-GBR-2023-PS-6D2C91A0A'
    };

    const psQueryResultsBlocked: ISdPsQueryResult[] = [{
      documentNumber: "GBR-2023-PS-6D2C91A0A",
      catchCertificateNumber: "PS2",
      catchCertificateType: "non_uk",
      documentType: "PS",
      createdAt: "2020-01-01",
      status: "BLOCKED",
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
      da: 'England',
      extended: {
        id: 'PS2-1610018839',
      }
    }];

    const expectedResult: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: psCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: psCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: psCase.exporter.accountId || null,
        UserId: psCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: "BLOCKED",
        TimestampUtc: expect.any(String)
      },
      subject: Shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED + '-GBR-2023-PS-6D2C91A0A'
    };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradePs');

    await SUT.reportPsToTrade(ps, Shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED, psCase, psQueryResults);
    await SUT.reportPsToTrade(ps, Shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED, psCase, psQueryResultsBlocked);

    expect(mockMapper).toHaveBeenCalledWith(ps, psCase, psQueryResults);
    expect(mockMapper).toHaveBeenCalledWith(ps, psCase, psQueryResultsBlocked);

    expect(mockPersistence).toHaveBeenCalledWith('GBR-2023-PS-6D2C91A0A', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2023-PS-6D2C91A0A', expectedResult, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
  });

  it('will add PS voided payload to the the report queue', async () => {

    const psVoided: IDocument = {
      "documentNumber": "GBR-2023-PS-6D2C91A0A",
      "status": "VOID",
      "createdAt": new Date("2020-06-24T10:39:32.000Z"),
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "createdByEmail": "foo@foo.com",
      "requestByAdmin": false,
      "contactId": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ13",
      "__t": "processingStatement",
      "audit": [],
      "exportData": {
        "catches": [
          {
            "foreignCatchCertificateNumber": "PS2",
            "id": "PS2-1610018839",
            "species": "Atlantic cod (COD)",
            "cnCode": "FRESHCOD",
            "scientificName": "Gadus morhua",
            "importedWeight": 200,
            "usedWeightAgainstCertificate": 100,
            "processedWeight": 80,
            "validation": {
              "status": SdPsStatus.Success,
              "totalUsedWeightAgainstCertificate": 150,
              "weightExceededAmount": 0,
              "overuseInfo": undefined,
            }
          }
        ],
        "products": [
          {
            "id": "GBR-2023-PS-6D2C91A0A-1692962523",
            "commodityCode": "03021180",
            "description": "something",
            "_id": {
              "$oid": "64e88f2814ee5ab32f4a9279"
            }
          }
        ],
        "consignmentDescription": null,
        "healthCertificateNumber": "20/2/123456",
        "healthCertificateDate": "25/08/2023",
        "exporterDetails": {
          "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "buildingNumber": null,
          "subBuildingName": "NATURAL ENGLAND",
          "buildingName": "LANCASTER HOUSE",
          "streetName": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "postcode": "NE4 7YH",
          "townCity": "NEWCASTLE UPON TYNE",
          "exporterCompanyName": "Automation Testing Ltd"
        },
        "personResponsibleForConsignment": "Isaac",
        "plantApprovalNumber": "1234",
        "plantName": "name",
        "plantAddressOne": "LANCASTER HOUSE, MMO SUB, HAMPSHIRE COURT",
        "plantSubBuildingName": "MMO SUB",
        "plantBuildingName": "LANCASTER HOUSE",
        "plantStreetName": "HAMPSHIRE COURT",
        "plantCounty": "TYNESIDE",
        "plantCountry": "ENGLAND",
        "plantTownCity": "NEWCASTLE UPON TYNE",
        "plantPostcode": "NE4 7YH",
        "dateOfAcceptance": "25/08/2023",
        "exportedTo": {
          "officialCountryName": "France",
          "isoCodeAlpha2": "FR",
          "isoCodeAlpha3": "FRA",
          "isoNumericCode": "250"
        }
      },
      "documentUri": "_5831e2cd-faef-4e64-9d67-3eb23ba7d930.pdf"
    };

    const psCase: IDynamicsProcessingStatementCase = {
      "exporter": {
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "PS",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-2023-PS-6D2C91A0A",
      "plantName": "Bob's Fisheries LTD",
      "personResponsible": "Mr. Bob",
      "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
      "exportedTo": {
        "officialCountryName": "Nigeria",
        "isoCodeAlpha2": "NG",
        "isoCodeAlpha3": "NGR"
      },
      "catches": [
        {
          "foreignCatchCertificateNumber": "FR-PS-234234-23423-234234",
          "isDocumentIssuedInUK": false,
          "id": "GBR-2023-PS-6D2C91A0A-1234567890",
          "species": "HER",
          "cnCode": "324234324432234",
          "scientificName": "scientific name",
          "importedWeight": 500,
          "usedWeightAgainstCertificate": 700,
          "processedWeight": 800,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 700,
            "weightExceededAmount": 300,
            "overuseInfo": [
              "GBR-PS-123234-123-234”,”GBR-PS-123234-123-234"
            ]
          }
        },
        {
          "foreignCatchCertificateNumber": "IRL-PS-4324-423423-234234",
          "isDocumentIssuedInUK": false,
          "id": "GBR-PS-234234-234-234-1234567890",
          "species": "SAL",
          "cnCode": "523842358",
          "scientificName": "scientific name",
          "importedWeight": 200,
          "usedWeightAgainstCertificate": 100,
          "processedWeight": 150,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 200
          }
        }
      ],
      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": true,
      "clonedFrom": "GBR-PS-234234-234-234",
      "parentDocumentVoid": false
    };

    const expected: ServiceBusMessage = {
      body: expect.any(Object),
      messageId: expect.any(String),
      correlationId: psCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: psCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: psCase.exporter.accountId || null,
        UserId: psCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: Shared.CertificateStatus.VOID,
        TimestampUtc: expect.any(String)
      },
      subject: Shared.MessageLabel.PROCESSING_STATEMENT_VOIDED + '-GBR-2023-PS-6D2C91A0A'
    };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradePs');

    await SUT.reportPsToTrade(psVoided, Shared.MessageLabel.PROCESSING_STATEMENT_VOIDED, psCase, null)
    expect(mockMapper).toHaveBeenCalledWith(psVoided, psCase, null)
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2023-PS-6D2C91A0A', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
  })

  it('will not add SD payload to the the report queue', async () => {
    const sd: any = { test: 'storage document', documentNumber: 'document1' };
    const sdCase: IDynamicsStorageDocumentCase = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "Vue Red",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "SD",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-SD-234234-234-234",
      "companyName": "Bob's Fisheries LTD",
      "exportedTo": {
        "officialCountryName": "Nigeria",
        "isoCodeAlpha2": "NG",
        "isoCodeAlpha3": "NGR"
      },
      "products": [
        {
          "id": "some-product-id",
          "foreignCatchCertificateNumber": "FR-SD-234234-23423-234234",
          "isDocumentIssuedInUK": true,
          "species": "HER",
          "cnCode": "324234324432234",
          "scientificName": "scientific name",
          "importedWeight": 500,
          "exportedWeight": 700,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalWeightExported": 700,
            "weightExceededAmount": 200,
            "overuseInfo": ["GBR-SD-123234-123-234”,”GBR-SD-123234-123-234"]
          }
        }
      ],
      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": false
    };
    const mapped: any = { _correlationId: 'some-uuid-correlation-id' };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradeSd');
    mockMapper.mockReturnValue(mapped);

    await SUT.reportSdToTrade(sd, Shared.MessageLabel.STORAGE_DOCUMENT_SUBMITTED, sdCase, []);

    expect(mockMapper).toHaveBeenCalledWith(sd, sdCase, []);
    expect(mockPersistence).not.toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalled();
    expect(sdCase).not.toHaveProperty('clonedFrom');
    expect(sdCase).not.toHaveProperty('parentDocumentVoid');
  });

  it('will add SD payload to the report queue', async () => {
    const sd: IDocument = {
      "documentNumber": "GBR-2023-SD-74EA9D198",
      "status": "COMPLETE",
      "createdAt": new Date("2020-06-24T10:39:32.000Z"),
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "createdByEmail": "foo@foo.com",
      "requestByAdmin": false,
      "contactId": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ13",
      "__t": "storageDocument",
      "audit": [],
      "exportData": {
        "catches": [
          {
            "product": "Atlantic cod (COD)",
            "id": "GBR-2023-SD-74EA9D198-1693931464",
            "commodityCode": "03089090",
            "certificateNumber": "GBR-2023-CC-0123456789",
            "productWeight": "100",
            "dateOfUnloading": "05/09/2023",
            "placeOfUnloading": "Dover",
            "transportUnloadedFrom": "BA078",
            "weightOnCC": "100",
            "scientificName": "Gadus morhua",
            "certificateType": "non_uk",
            "_id": {
              "$oid": "64f757c8080a8629e4e64941"
            }
          }
        ],
        "storageFacilities": [
          {
            "facilityName": "name",
            "facilityAddressOne": "MMO SUB, LANCASTER HOUSE, HAMPSHIRE COURT",
            "facilityTownCity": "NEWCASTLE UPON TYNE",
            "facilityPostcode": "NE4 7YH",
            "facilitySubBuildingName": "MMO SUB",
            "facilityBuildingNumber": "",
            "facilityBuildingName": "LANCASTER HOUSE",
            "facilityStreetName": "HAMPSHIRE COURT",
            "facilityCounty": "TYNESIDE",
            "facilityCountry": "ENGLAND"
          }
        ],
        "exporterDetails": {
          "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
          "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
          "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "buildingNumber": null,
          "subBuildingName": "NATURAL ENGLAND",
          "buildingName": "LANCASTER HOUSE",
          "streetName": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "postcode": "NE4 7YH",
          "townCity": "NEWCASTLE UPON TYNE",
          "exporterCompanyName": "Automation Testing Ltd",
          "_dynamicsAddress": {
            "defra_uprn": "10091818796",
            "defra_buildingname": "LANCASTER HOUSE",
            "defra_subbuildingname": "NATURAL ENGLAND",
            "defra_premises": null,
            "defra_street": "HAMPSHIRE COURT",
            "defra_locality": "NEWCASTLE BUSINESS PARK",
            "defra_dependentlocality": null,
            "defra_towntext": "NEWCASTLE UPON TYNE",
            "defra_county": null,
            "defra_postcode": "NE4 7YH",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "defra_internationalpostalcode": null,
            "defra_fromcompanieshouse": false,
            "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
          },
          "_dynamicsUser": {
            "firstName": "Automation",
            "lastName": "Tester"
          }
        },
        "exportedTo": {
          "officialCountryName": "Afghanistan",
          "isoCodeAlpha2": "AF",
          "isoCodeAlpha3": "AFG",
          "isoNumericCode": "004"
        },
        "transportation": {
          "exportedTo": {
            "officialCountryName": "Afghanistan",
            "isoCodeAlpha2": "AF",
            "isoCodeAlpha3": "AFG",
            "isoNumericCode": "004"
          },
          "vehicle": "truck",
          "cmr": true,
          "exportDate": "05/09/2023"
        }
      },
      "userReference": "some-reference",
      "documentUri": "_ab830758-1c18-4dad-b756-e3dc10fe7efa.pdf"
    };

    const sdCase: IDynamicsStorageDocumentCase = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "Vue Red",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "SD",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-2023-SD-74EA9D198",
      "companyName": "Bob's Fisheries LTD",
      "exportedTo": {
        "officialCountryName": "Nigeria",
        "isoCodeAlpha2": "NG",
        "isoCodeAlpha3": "NGR"
      },
      "products": [
        {
          "id": "some-product-id",
          "foreignCatchCertificateNumber": "FR-SD-234234-23423-234234",
          "isDocumentIssuedInUK": true,
          "species": "HER",
          "cnCode": "324234324432234",
          "scientificName": "scientific name",
          "importedWeight": 500,
          "exportedWeight": 700,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalWeightExported": 700,
            "weightExceededAmount": 200,
            "overuseInfo": ["GBR-SD-123234-123-234”,”GBR-SD-123234-123-234"]
          }
        }
      ],
      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": false
    };

    const results: ISdPsQueryResult[] = [{
      documentNumber: 'GBR-2023-SD-74EA9D198',
      status: 'COMPLETE',
      documentType: 'storageDocument',
      createdAt: '2023-09-05T16:31:16.000Z',
      da: 'England',
      species: 'Atlantic cod (COD)',
      scientificName: 'Gadus morhua',
      catchCertificateNumber: 'GBR-2023-CC-0123456789',
      commodityCode: '03089090',
      weightOnDoc: 100,
      extended: {
        url: '_ab830758-1c18-4dad-b756-e3dc10fe7efa.pdf',
        exporterCompanyName: 'Automation Testing Ltd',
        investigation: undefined,
        voidedBy: undefined,
        preApprovedBy: undefined,
        id: 'GBR-2023-SD-74EA9D198-1693931464'
      },
      weightOnAllDocs: 400,
      weightOnFCC: 100,
      isOverAllocated: true,
      overAllocatedByWeight: 300,
      overUsedInfo: [],
      isMismatch: false,
      dateOfUnloading: '05/09/2023',
      placeOfUnloading: 'Dover',
      transportUnloadedFrom: 'BA078'
    }]

    const sdBlockedResults: ISdPsQueryResult[] = [{
      documentNumber: 'GBR-2023-SD-74EA9D198',
      status: 'BLOCKED',
      documentType: 'storageDocument',
      createdAt: '2023-09-05T16:31:16.000Z',
      da: 'England',
      species: 'Atlantic cod (COD)',
      scientificName: 'Gadus morhua',
      catchCertificateNumber: 'GBR-2023-CC-0123456789',
      commodityCode: '03089090',
      weightOnDoc: 100,
      extended: {
        url: '_ab830758-1c18-4dad-b756-e3dc10fe7efa.pdf',
        exporterCompanyName: 'Automation Testing Ltd',
        investigation: undefined,
        voidedBy: undefined,
        preApprovedBy: undefined,
        id: 'GBR-2023-SD-74EA9D198-1693931464'
      },
      weightOnAllDocs: 400,
      weightOnFCC: 100,
      isOverAllocated: true,
      overAllocatedByWeight: 300,
      overUsedInfo: [],
      isMismatch: false,
      dateOfUnloading: '05/09/2023',
      placeOfUnloading: 'Dover',
      transportUnloadedFrom: 'BA078'
    }]

    const body: IDefraTradeStorageDocument = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "Vue Red",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "SD",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-2023-SD-74EA9D198",
      "companyName": "Bob's Fisheries LTD",
      "exportedTo": {
        "officialCountryName": "Afghanistan",
        "isoCodeAlpha2": "AF",
        "isoCodeAlpha3": "AFG",
        "isoNumericCode": "004"
      },
      "products": [
        {
          "foreignCatchCertificateNumber": "GBR-2023-CC-0123456789",
          "species": "Atlantic cod (COD)",
          "id": "GBR-2023-SD-74EA9D198-1693931464",
          "cnCode": "03089090",
          "scientificName": "Gadus morhua",
          "importedWeight": 100,
          "exportedWeight": 100,
          "validation": {
            "totalWeightExported": 400,
            "status": IDefraTradeSdPsStatus.Overuse,
            "weightExceededAmount": 300
          },
          "dateOfUnloading": "2023-09-05",
          "placeOfUnloading": "Dover",
          "transportUnloadedFrom": "BA078"
        }
      ],
      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": false,
      "storageFacilities": [
        {
          "name": "name",
          "address": {
            "building_number": "",
            "sub_building_name": "MMO SUB",
            "building_name": "LANCASTER HOUSE",
            "street_name": "HAMPSHIRE COURT",
            "county": "TYNESIDE",
            "country": "ENGLAND",
            "line1": "MMO SUB, LANCASTER HOUSE, HAMPSHIRE COURT",
            "city": "NEWCASTLE UPON TYNE",
            "postCode": "NE4 7YH"
          }
        }
      ],
      "transportation": {
        "modeofTransport": "truck",
        "hasRoadTransportDocument": true,
        "exportDate": "2023-09-05"
      },
      "authority": {
        "name": "Illegal Unreported and Unregulated (IUU) Fishing Team",
        "companyName": "Marine Management Organisation",
        "address": {
          "line1": "Lancaster House, Hampshire Court",
          "building_name": "Lancaster House",
          "street_name": "Hampshire Court",
          "city": "Newcastle upon Tyne",
          "postCode": "NE4 7YJ",
          "country": "United Kingdom"
        },
        "tel": "0300 123 1032",
        "email": "ukiuuslo@marinemanagement.org.uk",
        "dateIssued": moment().format('YYYY-MM-DD')
      }
    };

    const expected: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: sdCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: sdCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: sdCase.exporter.accountId || null,
        UserId: sdCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: "COMPLETE",
        TimestampUtc: expect.any(String)
      },
      subject: Shared.MessageLabel.STORAGE_DOCUMENT_SUBMITTED + "-GBR-2023-SD-74EA9D198"
    };

    const expectedResults: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: sdCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: sdCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: sdCase.exporter.accountId || null,
        UserId: sdCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: "BLOCKED",
        TimestampUtc: expect.any(String)
      },
      subject: Shared.MessageLabel.STORAGE_DOCUMENT_SUBMITTED + "-GBR-2023-SD-74EA9D198"
    };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradeSd');

    await SUT.reportSdToTrade(sd, Shared.MessageLabel.STORAGE_DOCUMENT_SUBMITTED, sdCase, results);
    await SUT.reportSdToTrade(sd, Shared.MessageLabel.STORAGE_DOCUMENT_SUBMITTED, sdCase, sdBlockedResults);

    expect(mockMapper).toHaveBeenCalledWith(sd, sdCase, results);
    expect(mockMapper).toHaveBeenCalledWith(sd, sdCase, sdBlockedResults);
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2023-SD-74EA9D198', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2023-SD-74EA9D198', expectedResults, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(mockLogInfo).toHaveBeenCalledWith(`[DEFRA-TRADE-SD][DOCUMENT-NUMBER][GBR-2023-SD-74EA9D198][PAYLOAD][${JSON.stringify(body)}]`);
  });

  it('will add SD payload to the report queue with exportedTo NI', async () => {
    const sd: IDocument = {
      "documentNumber": "GBR-2023-SD-74EA9D198",
      "status": "COMPLETE",
      "createdAt": new Date("2020-06-24T10:39:32.000Z"),
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "createdByEmail": "foo@foo.com",
      "requestByAdmin": false,
      "contactId": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ13",
      "__t": "storageDocument",
      "audit": [],
      "exportData": {
        "catches": [
          {
            "product": "Atlantic cod (COD)",
            "id": "GBR-2023-SD-74EA9D198-1693931464",
            "commodityCode": "03089090",
            "certificateNumber": "GBR-2023-CC-0123456789",
            "productWeight": "100",
            "dateOfUnloading": "05/09/2023",
            "placeOfUnloading": "Dover",
            "transportUnloadedFrom": "BA078",
            "weightOnCC": "100",
            "scientificName": "Gadus morhua",
            "certificateType": "non_uk",
            "_id": {
              "$oid": "64f757c8080a8629e4e64941"
            }
          }
        ],
        "storageFacilities": [
          {
            "facilityName": "name",
            "facilityAddressOne": "MMO SUB, LANCASTER HOUSE, HAMPSHIRE COURT",
            "facilityTownCity": "NEWCASTLE UPON TYNE",
            "facilityPostcode": "NE4 7YH",
            "facilitySubBuildingName": "MMO SUB",
            "facilityBuildingNumber": "",
            "facilityBuildingName": "LANCASTER HOUSE",
            "facilityStreetName": "HAMPSHIRE COURT",
            "facilityCounty": "TYNESIDE",
            "facilityCountry": "ENGLAND"
          }
        ],
        "exporterDetails": {
          "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
          "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
          "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "buildingNumber": null,
          "subBuildingName": "NATURAL ENGLAND",
          "buildingName": "LANCASTER HOUSE",
          "streetName": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "postcode": "NE4 7YH",
          "townCity": "NEWCASTLE UPON TYNE",
          "exporterCompanyName": "Automation Testing Ltd",
          "_dynamicsAddress": {
            "defra_uprn": "10091818796",
            "defra_buildingname": "LANCASTER HOUSE",
            "defra_subbuildingname": "NATURAL ENGLAND",
            "defra_premises": null,
            "defra_street": "HAMPSHIRE COURT",
            "defra_locality": "NEWCASTLE BUSINESS PARK",
            "defra_dependentlocality": null,
            "defra_towntext": "NEWCASTLE UPON TYNE",
            "defra_county": null,
            "defra_postcode": "NE4 7YH",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "defra_internationalpostalcode": null,
            "defra_fromcompanieshouse": false,
            "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
          },
          "_dynamicsUser": {
            "firstName": "Automation",
            "lastName": "Tester"
          }
        },
        "exportedTo": {
          "officialCountryName": "Northern Ireland",
          "isoCodeAlpha2": "XI",
          "isoCodeAlpha3": null,
          "isoNumericCode": null
        },
        "transportation": {
          "exportedTo": {
            "officialCountryName": "Northern Ireland",
            "isoCodeAlpha2": "XI",
            "isoCodeAlpha3": null,
            "isoNumericCode": null
          },
          "vehicle": "truck",
          "cmr": true,
          "exportDate": "05/09/2023"
        }
      },
      "userReference": "some-reference",
      "documentUri": "_ab830758-1c18-4dad-b756-e3dc10fe7efa.pdf"
    };

    const sdCase: IDynamicsStorageDocumentCase = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "Vue Red",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "SD",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-2023-SD-74EA9D198",
      "companyName": "Bob's Fisheries LTD",
      "exportedTo": {
        "officialCountryName": "Northern Ireland",
        "isoCodeAlpha2": "XI"
      },
      "products": [
        {
          "id": "some-product-id",
          "foreignCatchCertificateNumber": "FR-SD-234234-23423-234234",
          "isDocumentIssuedInUK": true,
          "species": "HER",
          "cnCode": "324234324432234",
          "scientificName": "scientific name",
          "importedWeight": 500,
          "exportedWeight": 700,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalWeightExported": 700,
            "weightExceededAmount": 200,
            "overuseInfo": ["GBR-SD-123234-123-234”,”GBR-SD-123234-123-234"]
          }
        }
      ],
      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": false
    };

    const results: ISdPsQueryResult[] = [{
      documentNumber: 'GBR-2023-SD-74EA9D198',
      status: 'COMPLETE',
      documentType: 'storageDocument',
      createdAt: '2023-09-05T16:31:16.000Z',
      da: 'England',
      species: 'Atlantic cod (COD)',
      scientificName: 'Gadus morhua',
      catchCertificateNumber: 'GBR-2023-CC-0123456789',
      commodityCode: '03089090',
      weightOnDoc: 100,
      extended: {
        url: '_ab830758-1c18-4dad-b756-e3dc10fe7efa.pdf',
        exporterCompanyName: 'Automation Testing Ltd',
        investigation: undefined,
        voidedBy: undefined,
        preApprovedBy: undefined,
        id: 'GBR-2023-SD-74EA9D198-1693931464'
      },
      weightOnAllDocs: 400,
      weightOnFCC: 100,
      isOverAllocated: true,
      overAllocatedByWeight: 300,
      overUsedInfo: [],
      isMismatch: false,
      dateOfUnloading: '05/09/2023',
      placeOfUnloading: 'Dover',
      transportUnloadedFrom: 'BA078'
    }]

    const sdBlockedResults: ISdPsQueryResult[] = [{
      documentNumber: 'GBR-2023-SD-74EA9D198',
      status: 'BLOCKED',
      documentType: 'storageDocument',
      createdAt: '2023-09-05T16:31:16.000Z',
      da: 'England',
      species: 'Atlantic cod (COD)',
      scientificName: 'Gadus morhua',
      catchCertificateNumber: 'GBR-2023-CC-0123456789',
      commodityCode: '03089090',
      weightOnDoc: 100,
      extended: {
        url: '_ab830758-1c18-4dad-b756-e3dc10fe7efa.pdf',
        exporterCompanyName: 'Automation Testing Ltd',
        investigation: undefined,
        voidedBy: undefined,
        preApprovedBy: undefined,
        id: 'GBR-2023-SD-74EA9D198-1693931464'
      },
      weightOnAllDocs: 400,
      weightOnFCC: 100,
      isOverAllocated: true,
      overAllocatedByWeight: 300,
      overUsedInfo: [],
      isMismatch: false,
      dateOfUnloading: '05/09/2023',
      placeOfUnloading: 'Dover',
      transportUnloadedFrom: 'BA078'
    }]

    const body: IDefraTradeStorageDocument = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "Vue Red",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "SD",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-2023-SD-74EA9D198",
      "companyName": "Bob's Fisheries LTD",
      "exportedTo": {
        "officialCountryName": "Northern Ireland",
        "isoCodeAlpha2": "XI",
        "isoCodeAlpha3": null,
        "isoNumericCode": null
      },
      "products": [
        {
          "foreignCatchCertificateNumber": "GBR-2023-CC-0123456789",
          "species": "Atlantic cod (COD)",
          "id": "GBR-2023-SD-74EA9D198-1693931464",
          "cnCode": "03089090",
          "scientificName": "Gadus morhua",
          "importedWeight": 100,
          "exportedWeight": 100,
          "validation": {
            "totalWeightExported": 400,
            "status": IDefraTradeSdPsStatus.Overuse,
            "weightExceededAmount": 300
          },
          "dateOfUnloading": "2023-09-05",
          "placeOfUnloading": "Dover",
          "transportUnloadedFrom": "BA078"
        }
      ],
      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": false,
      "storageFacilities": [
        {
          "name": "name",
          "address": {
            "building_number": "",
            "sub_building_name": "MMO SUB",
            "building_name": "LANCASTER HOUSE",
            "street_name": "HAMPSHIRE COURT",
            "county": "TYNESIDE",
            "country": "ENGLAND",
            "line1": "MMO SUB, LANCASTER HOUSE, HAMPSHIRE COURT",
            "city": "NEWCASTLE UPON TYNE",
            "postCode": "NE4 7YH"
          }
        }
      ],
      "transportation": {
        "modeofTransport": "truck",
        "hasRoadTransportDocument": true,
        "exportDate": "2023-09-05"
      },
      "authority": {
        "name": "Illegal Unreported and Unregulated (IUU) Fishing Team",
        "companyName": "Marine Management Organisation",
        "address": {
          "line1": "Lancaster House, Hampshire Court",
          "building_name": "Lancaster House",
          "street_name": "Hampshire Court",
          "city": "Newcastle upon Tyne",
          "postCode": "NE4 7YJ",
          "country": "United Kingdom"
        },
        "tel": "0300 123 1032",
        "email": "ukiuuslo@marinemanagement.org.uk",
        "dateIssued": moment().format('YYYY-MM-DD')
      }
    };

    const expected: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: sdCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: sdCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: sdCase.exporter.accountId || null,
        UserId: sdCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: "COMPLETE",
        TimestampUtc: expect.any(String)
      },
      subject: Shared.MessageLabel.STORAGE_DOCUMENT_SUBMITTED + "-GBR-2023-SD-74EA9D198"
    };

    const expectedResults: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: sdCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: sdCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: sdCase.exporter.accountId || null,
        UserId: sdCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: "BLOCKED",
        TimestampUtc: expect.any(String)
      },
      subject: Shared.MessageLabel.STORAGE_DOCUMENT_SUBMITTED + "-GBR-2023-SD-74EA9D198"
    };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradeSd');

    await SUT.reportSdToTrade(sd, Shared.MessageLabel.STORAGE_DOCUMENT_SUBMITTED, sdCase, results);
    await SUT.reportSdToTrade(sd, Shared.MessageLabel.STORAGE_DOCUMENT_SUBMITTED, sdCase, sdBlockedResults);

    expect(mockMapper).toHaveBeenCalledWith(sd, sdCase, results);
    expect(mockMapper).toHaveBeenCalledWith(sd, sdCase, sdBlockedResults);
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2023-SD-74EA9D198', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2023-SD-74EA9D198', expectedResults, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(mockLogInfo).toHaveBeenCalledWith(`[DEFRA-TRADE-SD][DOCUMENT-NUMBER][GBR-2023-SD-74EA9D198][PAYLOAD][${JSON.stringify(body)}]`);
  });

  it('will add SD voided payload to the the report queue', async () => {

    const sd: IDocument = {
      "documentNumber": "GBR-2023-SD-74EA9D198",
      "status": "VOID",
      "createdAt": new Date("2020-06-24T10:39:32.000Z"),
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "createdByEmail": "foo@foo.com",
      "requestByAdmin": false,
      "contactId": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ13",
      "__t": "storageDocument",
      "audit": [],
      "exportData": {
        "catches": [
          {
            "product": "Atlantic cod (COD)",
            "id": "GBR-2023-SD-74EA9D198-1693931464",
            "commodityCode": "03089090",
            "certificateNumber": "GBR-2023-CC-0123456789",
            "productWeight": "100",
            "dateOfUnloading": "05/09/2023",
            "placeOfUnloading": "Dover",
            "transportUnloadedFrom": "BA078",
            "weightOnCC": "100",
            "scientificName": "Gadus morhua",
            "certificateType": "non_uk",
            "_id": {
              "$oid": "64f757c8080a8629e4e64941"
            }
          }
        ],
        "storageFacilities": [
          {
            "facilityName": "name",
            "facilityAddressOne": "MMO SUB, LANCASTER HOUSE, HAMPSHIRE COURT",
            "facilityTownCity": "NEWCASTLE UPON TYNE",
            "facilityPostcode": "NE4 7YH",
            "facilitySubBuildingName": "MMO SUB",
            "facilityBuildingNumber": "",
            "facilityBuildingName": "LANCASTER HOUSE",
            "facilityStreetName": "HAMPSHIRE COURT",
            "facilityCounty": "TYNESIDE",
            "facilityCountry": "ENGLAND"
          }
        ],
        "exporterDetails": {
          "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "buildingNumber": null,
          "subBuildingName": "NATURAL ENGLAND",
          "buildingName": "LANCASTER HOUSE",
          "streetName": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "postcode": "NE4 7YH",
          "townCity": "NEWCASTLE UPON TYNE",
          "exporterCompanyName": "Automation Testing Ltd"
        },
        "exportedTo": {
          "officialCountryName": "Afghanistan",
          "isoCodeAlpha2": "AF",
          "isoCodeAlpha3": "AFG",
          "isoNumericCode": "004"
        },
        "transportation": {
          "exportedTo": {
            "officialCountryName": "Afghanistan",
            "isoCodeAlpha2": "AF",
            "isoCodeAlpha3": "AFG",
            "isoNumericCode": "004"
          },
          "vehicle": "truck",
          "cmr": true,
          "exportDate": "05/09/2023"
        }
      },
      "userReference": "some-reference",
      "documentUri": "_ab830758-1c18-4dad-b756-e3dc10fe7efa.pdf"
    };

    const sdCase: IDynamicsStorageDocumentCase = {
      "exporter": {
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "Vue Red",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "SD",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-2023-SD-74EA9D198",
      "companyName": "Bob's Fisheries LTD",
      "exportedTo": {
        "officialCountryName": "Nigeria",
        "isoCodeAlpha2": "NG",
        "isoCodeAlpha3": "NGR"
      },
      "products": [
        {
          "id": "some-product-id",
          "foreignCatchCertificateNumber": "FR-SD-234234-23423-234234",
          "isDocumentIssuedInUK": true,
          "species": "HER",
          "cnCode": "324234324432234",
          "scientificName": "scientific name",
          "importedWeight": 500,
          "exportedWeight": 700,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalWeightExported": 700,
            "weightExceededAmount": 200,
            "overuseInfo": ["GBR-SD-123234-123-234”,”GBR-SD-123234-123-234"]
          }
        }
      ],
      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": false
    };

    const expected: ServiceBusMessage = {
      body: expect.any(Object),
      messageId: expect.any(String),
      correlationId: sdCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: sdCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: sdCase.exporter.accountId || null,
        UserId: sdCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: Shared.CertificateStatus.VOID,
        TimestampUtc: expect.any(String)
      },
      subject: Shared.MessageLabel.STORAGE_DOCUMENT_VOIDED + '-GBR-2023-SD-74EA9D198'
    };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradeSd');

    await SUT.reportSdToTrade(sd, Shared.MessageLabel.STORAGE_DOCUMENT_VOIDED, sdCase, null);

    expect(mockMapper).toHaveBeenCalledWith(sd, sdCase, null);
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2023-SD-74EA9D198', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
  });

  it('will validate CC payload so that the extra fields passed to CM is not passed to Trade queue', async () => {
    const cc: IDocument = {
      "createdAt": new Date("2020-06-24T10:39:32.000Z"),
      "__t": "catchCert",
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "status": "COMPLETE",
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "audit": [
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:18.780Z"
          },
          "data": {
            "investigationStatus": "UNDER_INVESTIGATION"
          }
        },
        {
          "eventType": "INVESTIGATED",
          "triggeredBy": "Chris Waugh",
          "timestamp": {
            "$date": "2020-06-24T10:40:23.439Z"
          },
          "data": {
            "investigationStatus": "CLOSED_NFA"
          }
        }
      ],
      "userReference": "MY REF",
      "exportData": {
        "products": [
          {
            "speciesId": "GBR-2023-CC-C58DF9A73-35f724fd-b026-4ba7-80cf-4f458a780486",
            "species": "Black scabbardfish (BSF)",
            "speciesCode": "BSF",
            "commodityCode": "03028990",
            "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
            "scientificName": "Aphanopus carbo",
            "state": {
              "code": "FRE",
              "name": "Fresh"
            },
            "presentation": {
              "code": "GUT",
              "name": "Gutted"
            },
            "factor": 1.24,
            "caughtBy": [
              {
                "vessel": "AGAN BORLOWEN",
                "pln": "SS229",
                "homePort": "NEWLYN",
                "flag": "GBR",
                "cfr": "GBR000C20415",
                "imoNumber": null,
                "licenceNumber": "25072",
                "licenceValidTo": "2030-12-31",
                "licenceHolder": "MR S CLARY-BROM ",
                "id": "GBR-2023-CC-C58DF9A73-1777642314",
                "date": "2023-08-31",
                "faoArea": "FAO27",
                "weight": 122,
                "numberOfSubmissions": 1,
                "isLegallyDue": false,
                "dataEverExpected": true,
                "landingDataExpectedDate": "2023-08-31",
                "landingDataEndDate": "2023-09-02",
                "_status": "PENDING_LANDING_DATA"
              }
            ]
          }
        ],
        "transportation": {
          "exportedFrom": "United Kingdom",
          "exportedTo": {
            "officialCountryName": "Åland Islands",
            "isoCodeAlpha2": "AX",
            "isoCodeAlpha3": "ALA",
            "isoNumericCode": "248"
          },
          "vehicle": "truck",
          "cmr": true
        },
        "conservation": {
          "conservationReference": "UK Fisheries Policy"
        },
        "exporterDetails": {
          "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
          "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
          "addressOne": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "buildingNumber": null,
          "subBuildingName": "NATURAL ENGLAND",
          "buildingName": "LANCASTER HOUSE",
          "streetName": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "postcode": "NE4 7YH",
          "townCity": "NEWCASTLE UPON TYNE",
          "exporterCompanyName": "Automation Testing Ltd",
          "exporterFullName": "Automation Tester",
          "_dynamicsAddress": {
            "defra_uprn": "10091818796",
            "defra_buildingname": "LANCASTER HOUSE",
            "defra_subbuildingname": "NATURAL ENGLAND",
            "defra_premises": null,
            "defra_street": "HAMPSHIRE COURT",
            "defra_locality": "NEWCASTLE BUSINESS PARK",
            "defra_dependentlocality": null,
            "defra_towntext": "NEWCASTLE UPON TYNE",
            "defra_county": null,
            "defra_postcode": "NE4 7YH",
            "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
            "defra_internationalpostalcode": null,
            "defra_fromcompanieshouse": false,
            "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
            "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
            "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
            "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
            "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
          },
          "_dynamicsUser": {
            "firstName": "Automation",
            "lastName": "Tester"
          }
        },
        "landingsEntryOption": "manualEntry"
      },
      "createdByEmail": "foo@foo.com",
      "documentUri": "_44fd226f-598f-4615-930f-716b2762fea4.pdf",
      "investigation": {
        "investigator": "Chris Waugh",
        "status": "CLOSED_NFA"
      },
      "numberOfFailedAttempts": 5
    };

    const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "clonedFrom": "GBR-PS-234234-234-234",
      "landingsCloned": false,
      "parentDocumentVoid": false,
      "caseStatusAtSubmission": CaseStatusAtSubmission.DataNeverExpected,
      "caseRiskAtSubmission": Shared.LevelOfRiskType.Low,
      "caseOutcomeAtSubmission": CaseOutcomeAtSubmission.Issued,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        {
          "status": Shared.LandingStatusType.DataNeverExpected,
          "id": "GBR-2023-CC-C58DF9A73-4248789552",
          "startDate": "2023-08-31",
          "landingDate": "2023-08-31",
          "species": "BSF",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "ASHLEIGH JANE",
          "vesselPln": "OB81",
          "vesselLength": 9.91,
          "vesselAdministration": "Scotland",
          "licenceHolder": "C & J SHELLFISH LTD",
          "speciesAlias": "N",
          "highSeasArea": "yes",
          "rfmo": "General Fisheries Commission for the Mediterranean (GFCM)",
          "weight": 89,
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": false,
          "isLate": false,
          "landingOutcomeAtSubmission": Shared.LandingOutcomeType.Success,
          "landingOutcomeAtRetrospectiveCheck": Shared.LandingRetrospectiveOutcomeType.Success,
          "validation": {
            "liveExportWeight": 110.36,
            "totalRecordedAgainstLanding": 220.72,
            "landedWeightExceededBy": null,
            "rawLandingsUrl": "http://localhost:6500/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=A12860",
            "salesNoteUrl": "http://localhost:6500/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=A12860",
            "isLegallyDue": false
          },
          "risking": {
            "vessel": "0.5",
            "speciesRisk": "1",
            "exporterRiskScore": "1",
            "landingRiskScore": "0.5",
            "highOrLowRisk": Shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false
          }
        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA"
      }
    };

    const ccQueryResults: Shared.ICcQueryResult[] = [{
      documentNumber: 'GBR-2020-CC-1BC924FCF',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2019-07-13T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'C20415',
      da: 'Scotland',
      dateLanded: '2023-08-31',
      species: 'BSF',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 5,
      isLandingExists: true,
      hasSalesNote: true,
      isSpeciesExists: false,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      speciesAlias: "N",
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
        moment.utc()
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
          .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
      extended: {
        landingId: 'GBR-2023-CC-C58DF9A73-1777642314',
        exporterName: 'Mr Bob',
        presentation: 'GUT',
        documentUrl: '_887ce0e0-9ab1-4f4d-9524-572a9762e021.pdf',
        presentationName: 'sliced',
        vessel: 'AGAN BORLOWEN',
        fao: 'FAO27',
        highSeasArea: 'yes',
        rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
        pln: 'SS229',
        species: 'Lobster',
        scientificName: "Aphanopus carbo",
        state: 'FRE',
        stateName: 'fresh',
        commodityCode: '03028990',
        commodityCodeDescription: "Fresh or chilled fish, n.e.s.",
        investigation: {
          investigator: "Investigator Gadget",
          status: InvestigationStatus.Open
        },
        transportationVehicle: 'truck',
        flag: "GBR",
        homePort: "NEWLYN",
        licenceNumber: "25072",
        licenceValidTo: "2030-12-31",
        licenceHolder: "MR S CLARY-BROM ",
        imoNumber: null,
        numberOfSubmissions: 1,
        isLegallyDue: true
      }
    }];

    const body: Shared.IDefraTradeCatchCertificate = {
      "documentNumber": "GBR-2020-CC-1BC924FCF",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        {
          "status": Shared.DefraCcLandingStatusType.ValidationFailure_Species,
          "id": "GBR-2023-CC-C58DF9A73-1777642314",
          "landingDate": "2023-08-31",
          "species": "Lobster",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "AGAN BORLOWEN",
          "vesselPln": "SS229",
          "vesselLength": 6.88,
          "vesselAdministration": "Scotland",
          "licenceHolder": "MR S CLARY-BROM ",
          "source": "CATCH_RECORDING",
          "speciesAlias": "N",
          "weight": 122,
          "highSeasArea": "yes",
          "rfmo": "General Fisheries Commission for the Mediterranean (GFCM)",
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": true,
          "landingDataExpectedAtSubmission": true,
          "validation": {
            "liveExportWeight": 121,
            "totalEstimatedForExportSpecies": 30,
            "totalEstimatedWithTolerance": 56.1,
            "totalRecordedAgainstLanding": 200,
            "landedWeightExceededBy": 143.9,
            "rawLandingsUrl": "undefined/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=C20415",
            "salesNoteUrl": "undefined/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=C20415",
            "isLegallyDue": true
          },
          "risking": {
            "vessel": "0",
            "speciesRisk": "0",
            "exporterRiskScore": "0",
            "landingRiskScore": "0",
            "highOrLowRisk": Shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false
          },
          "flag": "GBR",
          "catchArea": Shared.CatchArea.FAO27,
          "homePort": "NEWLYN",
          "fishingLicenceNumber": "25072",
          "fishingLicenceValidTo": "2030-12-31",
          "imo": null
        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA",
        "isoNumericCode": "248"
      },
      "certStatus": Shared.CertificateStatus.COMPLETE,
      "transportation": {
        "modeofTransport": "truck",
        "hasRoadTransportDocument": true
      },
      "multiVesselSchedule": false
    };

    const expected: ServiceBusMessage = {
      body,
      messageId: expect.any(String),
      correlationId: dynamicsCatchCertificateCase._correlationId,
      contentType: 'application/json',
      applicationProperties: {
        EntityKey: dynamicsCatchCertificateCase.documentNumber,
        PublisherId: 'FES',
        OrganisationId: dynamicsCatchCertificateCase.exporter.accountId || null,
        UserId: dynamicsCatchCertificateCase.exporter.contactId || null,
        SchemaVersion: 2,
        Type: "Internal",
        Status: "COMPLETE",
        TimestampUtc: expect.any(String)
      },
      subject: Shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED + '-GBR-2020-CC-1BC924FCF'
    };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradeCc');

    await SUT.reportCcToTrade(cc, Shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED, dynamicsCatchCertificateCase, ccQueryResults);

    expect(mockMapper).toHaveBeenCalled();
    expect(mockPersistence).toHaveBeenCalledWith('GBR-2020-CC-1BC924FCF', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(expected.body).not.toHaveProperty('clonedFrom');
    expect(expected.body).not.toHaveProperty('landingsCloned');
    expect(expected.body).not.toHaveProperty('parentDocumentVoid');
    expect(expected.body).not.toHaveProperty('caseStatusAtSubmission');
    expect(expected.body).not.toHaveProperty('caseRiskAtSubmission');
    expect(expected.body).not.toHaveProperty('caseOutcomeAtSubmission');
    expect(expected.body.landings).not.toHaveProperty('landingOutcomeAtSubmission');
    expect(expected.body.landings).not.toHaveProperty('landingOutcomeAtRetrospectiveCheck');
  });
});

describe('azureTradeQueueEnabled feature flag turned off', () => {
  let mockPersistence;
  let mockLogInfo;

  ApplicationConfig.loadEnv({
    AZURE_QUEUE_TRADE_CONNECTION_STRING: 'AZURE_QUEUE_TRADE_CONNECTION_STRING',
    REPORT_QUEUE_TRADE: 'REPORT_QUEUE_TRADE',
  })

  beforeEach(() => {
    mockLogInfo = jest.spyOn(logger, 'info');
    mockPersistence = jest.spyOn(Shared, 'addToReportQueue');

    ApplicationConfig.prototype.azureTradeQueueEnabled = false;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will add CC payload without CHIP to the the report queue, when configuration is false', async () => {
    const cc: any = { test: 'catch certificate', documentNumber: 'document1' };
    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradeCc');
    const dynamicsCatchCertificateCase: IDynamicsCatchCertificateCase = {
      "documentNumber": "GBR-2023-CC-C58DF9A73",
      "caseType1": CaseOneType.CatchCertificate,
      "caseType2": CaseTwoType.PendingLandingData,
      "numberOfFailedSubmissions": 0,
      "isDirectLanding": false,
      "documentUrl": "http://localhost:3001/qr/export-certificates/_e1708f0c-93d5-48ca-b227-45e1c815b549.pdf",
      "documentDate": "2023-08-31T18:27:00.000Z",
      "exporter": {
        "fullName": "Automation Tester",
        "companyName": "Automation Testing Ltd",
        "contactId": "4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId": "8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "address": {
          "building_number": null,
          "sub_building_name": "NATURAL ENGLAND",
          "building_name": "LANCASTER HOUSE",
          "street_name": "HAMPSHIRE COURT",
          "county": null,
          "country": "United Kingdom of Great Britain and Northern Ireland",
          "line1": "NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
          "city": "NEWCASTLE UPON TYNE",
          "postCode": "NE4 7YH"
        },
        "dynamicsAddress": {
          "defra_uprn": "10091818796",
          "defra_buildingname": "LANCASTER HOUSE",
          "defra_subbuildingname": "NATURAL ENGLAND",
          "defra_premises": null,
          "defra_street": "HAMPSHIRE COURT",
          "defra_locality": "NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality": null,
          "defra_towntext": "NEWCASTLE UPON TYNE",
          "defra_county": null,
          "defra_postcode": "NE4 7YH",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode": null,
          "defra_fromcompanieshouse": false,
          "defra_addressid": "a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No"
        }
      },
      "landings": [
        {
          "status": Shared.LandingStatusType.DataNeverExpected,
          "id": "GBR-2023-CC-C58DF9A73-4248789552",
          "startDate": "2023-08-31",
          "landingDate": "2023-08-31",
          "species": "BSF",
          "cnCode": "03028990",
          "commodityCodeDescription": "Fresh or chilled fish, n.e.s.",
          "scientificName": "Aphanopus carbo",
          "is14DayLimitReached": true,
          "state": "FRE",
          "presentation": "GUT",
          "vesselName": "ASHLEIGH JANE",
          "vesselPln": "OB81",
          "vesselLength": 9.91,
          "vesselAdministration": "Scotland",
          "licenceHolder": "C & J SHELLFISH LTD",
          "speciesAlias": "N",
          "weight": 89,
          "highSeasArea": "yes",
          "rfmo": "General Fisheries Commission for the Mediterranean (GFCM)",
          "numberOfTotalSubmissions": 1,
          "vesselOverriddenByAdmin": false,
          "speciesOverriddenByAdmin": false,
          "dataEverExpected": false,
          "isLate": false,
          "validation": {
            "liveExportWeight": 110.36,
            "totalRecordedAgainstLanding": 220.72,
            "landedWeightExceededBy": null,
            "rawLandingsUrl": "http://localhost:6500/reference/api/v1/extendedData/rawLandings?dateLanded=2023-08-31&rssNumber=A12860",
            "salesNoteUrl": "http://localhost:6500/reference/api/v1/extendedData/salesNotes?dateLanded=2023-08-31&rssNumber=A12860",
            "isLegallyDue": false
          },
          "risking": {
            "vessel": "0.5",
            "speciesRisk": "1",
            "exporterRiskScore": "1",
            "landingRiskScore": "0.5",
            "highOrLowRisk": Shared.LevelOfRiskType.Low,
            "isSpeciesRiskEnabled": false
          }
        }
      ],
      "_correlationId": "f59339d6-e1d2-4a46-93d5-7eb9bb139e1b",
      "requestedByAdmin": false,
      "isUnblocked": false,
      "da": "England",
      "vesselOverriddenByAdmin": false,
      "speciesOverriddenByAdmin": false,
      "failureIrrespectiveOfRisk": true,
      "exportedTo": {
        "officialCountryName": "Åland Islands",
        "isoCodeAlpha2": "AX",
        "isoCodeAlpha3": "ALA"
      }
    };

    const expected: ServiceBusMessage = {
      body: dynamicsCatchCertificateCase,
      subject: 'catch_certificate_submitted-document1',
      sessionId: 'f59339d6-e1d2-4a46-93d5-7eb9bb139e1b'
    };

    await SUT.reportCcToTrade(cc, Shared.MessageLabel.CATCH_CERTIFICATE_SUBMITTED, dynamicsCatchCertificateCase, []);

    expect(mockLogInfo).toHaveBeenCalledWith(`[DEFRA-TRADE-CC][DOCUMENT-NUMBER][${cc.documentNumber}][CHIP-DISABLED]`);
    expect(mockPersistence).toHaveBeenCalledWith('document1', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(mockMapper).not.toHaveBeenCalled();
  });

  it('will add PS payload without CHIP to the the report queue, when configuration is false', async () => {
    const ps: any = { test: 'processing statement', documentNumber: 'document1' };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradePs');
    const psCase: IDynamicsProcessingStatementCase = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "PS",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-PS-234234-234-234",
      "plantName": "Bob's Fisheries LTD",
      "personResponsible": "Mr. Bob",
      "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
      "exportedTo": {
        "officialCountryName": "Nigeria",
        "isoCodeAlpha2": "NG",
        "isoCodeAlpha3": "NGR"
      },
      "catches": [
        {
          "foreignCatchCertificateNumber": "FR-PS-234234-23423-234234",
          "isDocumentIssuedInUK": true,
          "id": "GBR-PS-234234-234-234-1234567890",
          "species": "HER",
          "cnCode": "324234324432234",
          "scientificName": "scientific name",
          "importedWeight": 500,
          "usedWeightAgainstCertificate": 700,
          "processedWeight": 800,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 700,
            "weightExceededAmount": 300,
            "overuseInfo": [
              "GBR-PS-123234-123-234”,”GBR-PS-123234-123-234"
            ]
          }
        },
        {
          "foreignCatchCertificateNumber": "IRL-PS-4324-423423-234234",
          "isDocumentIssuedInUK": false,
          "id": "GBR-PS-234234-234-234-1234567890",
          "species": "SAL",
          "cnCode": "523842358",
          "scientificName": "scientific name",
          "importedWeight": 200,
          "usedWeightAgainstCertificate": 100,
          "processedWeight": 150,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 200
          }
        }
      ],

      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": true,
    };

    const psCaseExpected: IDynamicsProcessingStatementCase = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "123 Unit 1 CJC Fish Ltd 17 Old Edinburgh Road",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "PS",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-PS-234234-234-234",
      "plantName": "Bob's Fisheries LTD",
      "personResponsible": "Mr. Bob",
      "processedFisheryProducts": "Cooked Squid Rings (1605540090), Cooked Atlantic Cold Water Prawns (1605211096),",
      "exportedTo": {
        "officialCountryName": "Nigeria",
        "isoCodeAlpha2": "NG",
        "isoCodeAlpha3": "NGR"
      },
      "catches": [
        {
          "foreignCatchCertificateNumber": "FR-PS-234234-23423-234234",
          "id": "GBR-PS-234234-234-234-1234567890",
          "species": "HER",
          "cnCode": "324234324432234",
          "scientificName": "scientific name",
          "importedWeight": 500,
          "usedWeightAgainstCertificate": 700,
          "processedWeight": 800,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 700,
            "weightExceededAmount": 300,
            "overuseInfo": [
              "GBR-PS-123234-123-234”,”GBR-PS-123234-123-234"
            ]
          }
        },
        {
          "foreignCatchCertificateNumber": "IRL-PS-4324-423423-234234",
          "id": "GBR-PS-234234-234-234-1234567890",
          "species": "SAL",
          "cnCode": "523842358",
          "scientificName": "scientific name",
          "importedWeight": 200,
          "usedWeightAgainstCertificate": 100,
          "processedWeight": 150,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalUsedWeightAgainstCertificate": 200
          }
        }
      ],

      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": true,
    };

    const psQueryResults: ISdPsQueryResult[] = [{
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
      da: 'England',
      extended: {
        id: 'PS2-1610018839',
      }
    }];

    const expected: ServiceBusMessage = {
      body: psCaseExpected,
      subject: 'processing_statement_submitted-document1',
      sessionId: 'c03483ba-86ed-49be-ba9d-695ea27b3951'
    };

    await SUT.reportPsToTrade(ps, Shared.MessageLabel.PROCESSING_STATEMENT_SUBMITTED, psCase, psQueryResults);

    expect(mockLogInfo).toHaveBeenCalledWith(`[DEFRA-TRADE-PS][DOCUMENT-NUMBER][${ps.documentNumber}][CHIP-DISABLED]`);
    expect(mockPersistence).toHaveBeenCalledWith('document1', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(mockMapper).not.toHaveBeenCalled();
  });

  it('will add SD payload without CHIP to the the report queue, when configuration is false', async () => {

    const sd: any = { test: 'storage document', documentNumber: 'document1' };

    const mockMapper = jest.spyOn(DefraMapper, 'toDefraTradeSd');

    const sdCase: IDynamicsStorageDocumentCase = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "Vue Red",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "SD",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-SD-234234-234-234",
      "companyName": "Bob's Fisheries LTD",
      "exportedTo": {
        "officialCountryName": "Nigeria",
        "isoCodeAlpha2": "NG",
        "isoCodeAlpha3": "NGR"
      },
      "products": [
        {
          "id": "some-product-id",
          "foreignCatchCertificateNumber": "FR-SD-234234-23423-234234",
          "isDocumentIssuedInUK": true,
          "species": "HER",
          "cnCode": "324234324432234",
          "scientificName": "scientific name",
          "importedWeight": 500,
          "exportedWeight": 700,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalWeightExported": 700,
            "weightExceededAmount": 200,
            "overuseInfo": ["GBR-SD-123234-123-234”,”GBR-SD-123234-123-234"]
          }
        }
      ],
      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": false
    };

    const sdCaseExpected: IDynamicsStorageDocumentCase = {
      "exporter": {
        "contactId": "a contact id",
        "accountId": "an account id",
        "dynamicsAddress": {
          "defra_addressid": "00185463-69c2-e911-a97a-000d3a2cbad9",
          "defra_buildingname": "Lancaster House",
          "defra_fromcompanieshouse": false,
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue": "No",
          "defra_postcode": "NE4 7YJ",
          "defra_premises": "23",
          "defra_street": "Newcastle upon Tyne",
          "defra_towntext": "Newcastle upon Tyne",
          "_defra_country_value": "f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty": "defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname": "defra_country",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue": "United Kingdom of Great Britain and Northern Ireland"
        },
        "companyName": "FISH LTD",
        "address": {
          "building_number": "123",
          "sub_building_name": "Unit 1",
          "building_name": "CJC Fish Ltd",
          "street_name": "17  Old Edinburgh Road",
          "county": "West Midlands",
          "country": "England",
          "line1": "Vue Red",
          "city": "ROWTR",
          "postCode": "WN90 23A"
        }
      },
      "documentUrl": "http://tst-gov.uk/asfd9asdfasdf0jsaf.pdf",
      "documentDate": "2019-01-01 05:05:05",
      "caseType1": "SD",
      "caseType2": SdPsCaseTwoType.RealTimeValidation_Overuse,
      "numberOfFailedSubmissions": 4,
      "documentNumber": "GBR-SD-234234-234-234",
      "companyName": "Bob's Fisheries LTD",
      "exportedTo": {
        "officialCountryName": "Nigeria",
        "isoCodeAlpha2": "NG",
        "isoCodeAlpha3": "NGR"
      },
      "products": [
        {
          "id": "some-product-id",
          "foreignCatchCertificateNumber": "FR-SD-234234-23423-234234",
          "species": "HER",
          "cnCode": "324234324432234",
          "scientificName": "scientific name",
          "importedWeight": 500,
          "exportedWeight": 700,
          "validation": {
            "status": SdPsStatus.Overuse,
            "totalWeightExported": 700,
            "weightExceededAmount": 200,
            "overuseInfo": ["GBR-SD-123234-123-234”,”GBR-SD-123234-123-234"]
          }
        }
      ],
      "da": "Northern Ireland",
      "_correlationId": "c03483ba-86ed-49be-ba9d-695ea27b3951",
      "requestedByAdmin": false
    };

    const sdQueryResults: ISdPsQueryResult[] = [{
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
      da: 'England',
      extended: {
        id: 'PS2-1610018839',
      }
    }];

    const expected: ServiceBusMessage = {
      body: sdCaseExpected,
      subject: 'storage_document_submitted-document1',
      sessionId: 'c03483ba-86ed-49be-ba9d-695ea27b3951'
    };

    await SUT.reportSdToTrade(sd, Shared.MessageLabel.STORAGE_DOCUMENT_SUBMITTED, sdCase, sdQueryResults);

    expect(mockLogInfo).toHaveBeenCalledWith(`[DEFRA-TRADE-SD][DOCUMENT-NUMBER][${sd.documentNumber}][CHIP-DISABLED]`);
    expect(mockPersistence).toHaveBeenCalledWith('document1', expected, 'AZURE_QUEUE_TRADE_CONNECTION_STRING', 'REPORT_QUEUE_TRADE', false);
    expect(mockMapper).not.toHaveBeenCalled();

  });
});