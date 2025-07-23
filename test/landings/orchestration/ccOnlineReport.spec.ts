import {
  generateIndex,
  mapLandingWithLandingStatus,
  getLandingsFromCatchCertificate,
  ICcQueryResult,
  LandingStatus
} from 'mmo-shared-reference-data';
import { ValidationRules } from '../../../src/landings/types/onlineValidationReport';
import {
  generateOnlineValidationReport,
  mapPlnLandingsToRssLandings,
} from '../../../src/landings/orchestration/ccOnlineReport';
import moment from 'moment';
import * as onlineReports from '../../../src/landings/query/onlineReports';
import * as catchCertQuery from '../../../src/landings/persistence/catchCert';
import * as landingsPersistence from '../../../src/landings/persistence/landing';
import * as cache from '../../../src/data/cache';
import * as isHighRisk from '../../../src/landings/query/isHighRisk';
import * as isLegallyDue from '../../../src/landings/query/isLegallyDue';
import * as ccQuery from '../../../src/landings/query/ccQuery';
import * as dataHub from '../../../src/controllers/dataHub';
import { MongoMemoryServer } from "mongodb-memory-server";
const mongoose = require('mongoose');

import { FailedOnlineCertificates } from "../../../src/landings/types/query";
import { BlockingStatusModel } from "../../../src/landings/types/systemBlock";
import { preApproveDocumentFromMongo } from "../../../src/landings/persistence/preApproved.service";
import { PreApprovedDocuments as preApprovedMongooseDoc } from "../../../src/landings/types/preApprovedDocument";
import { DocumentModel } from "../../../src/landings/types/document";
import logger from '../../../src/logger'

const getCatchCertsStub = jest.spyOn(catchCertQuery, 'getCatchCerts')
const getLandingsStub = jest.spyOn(landingsPersistence, 'getLandingsMultiple')
const getVesselIdxStub = jest.spyOn(cache, 'getVesselsIdx')
const refreshRiskingStub = jest.spyOn(cache, 'refreshRiskingData');
const loggerErrorStub = jest.spyOn(logger, 'error');
const vesselData = [
  {
    registrationNumber: "WA1",
    fishingLicenceValidTo: "2100-12-20T00:00:00",
    fishingLicenceValidFrom: "2000-12-29T00:00:00",
    rssNumber: "rssWA1",
    licenceHolderName: "Mr Doe"
  },
  {
    registrationNumber: "WA2",
    fishingLicenceValidTo: "2100-12-20T00:00:00",
    fishingLicenceValidFrom: "2000-12-29T00:00:00",
    rssNumber: "rssWA2",
    licenceHolderName: "Mr Smith"
  },
  {
    registrationNumber: "WA3",
    fishingLicenceValidTo: "2100-12-20T00:00:00",
    fishingLicenceValidFrom: "2000-12-29T00:00:00",
    rssNumber: "rssWA3",
    licenceHolderName: "Mr Bob"
  },
  {
    registrationNumber: "WA4",
    fishingLicenceValidTo: "2100-12-20T00:00:00",
    fishingLicenceValidFrom: "2000-12-29T00:00:00",
    rssNumber: "rssWA4",
    licenceHolderName: "Mr Doe"
  },
  {
    registrationNumber: "WA5",
    fishingLicenceValidTo: "2100-12-20T00:00:00",
    fishingLicenceValidFrom: "2000-12-29T00:00:00",
    rssNumber: "rssWA5"
  }
];

const vesselIdx = generateIndex(vesselData);

describe('When validating an online Catch Certificate', () => {
  let mongoServer;

  const opts = { connectTimeoutMS: 60000, socketTimeoutMS: 600000, serverSelectionTimeoutMS: 60000 }

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, opts).catch(err => { console.log(err) });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    getCatchCertsStub.mockReset();
    getLandingsStub.mockReset();
    getVesselIdxStub.mockReset();
    refreshRiskingStub.mockReset();
    await FailedOnlineCertificates.deleteMany({});
    await BlockingStatusModel.deleteMany({});
    await preApprovedMongooseDoc.deleteMany({});
    await DocumentModel.deleteMany({});
  });

  describe('When call to update risking data fails', () => {
    let mockRunUpdateForLandings;

    beforeEach(() => {
      mockRunUpdateForLandings = jest.spyOn(ccQuery, 'runUpdateForLandings');
      mockRunUpdateForLandings.mockResolvedValue(undefined);
    });

    afterEach(() => {
      mockRunUpdateForLandings.mockRestore();
    });

    it('will handle error thrown whilst refreshing risking', async () => {
      const error = new Error('risking error');
      const mockStructureInRedis =
      {
        "documentNumber": "CERTIFICATE",
        "exportPayload": {
          "items": [
            {
              "product": {
                "id": "55e627af-90d5-4046-9b45-16c269700fde",
                "commodityCode": "1234",
                "presentation": {
                  "code": "FIS",
                  "label": "Filleted and skinned"
                },
                "state": {
                  "code": "BAD",
                  "label": "Fresh"
                },
                "species": {
                  "code": "LBE",
                  "label": "Lobster"
                }
              },
              "landings": [
                {
                  "model": {
                    "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                    "vessel": {
                      "pln": "WA1",
                      "vesselName": "DAYBREAK",
                      "flag": "GBR",
                      "homePort": "IJMUIDEN",
                      "licenceNumber": "11957",
                      "imoNumber": 8707537,
                      "licenceValidTo": "2382-12-31T00:00:00",
                      "rssNumber": "rssWA1",
                      "vesselLength": 113.97,
                      "label": "DAYBREAK (WA1)",
                      "domId": "CORNELISVROLIJKFZN-H171"
                    },
                    "dateLanded": "2019-10-06T00:00:00.000Z",
                    "exportWeight": 78,
                    "faoArea": "FAO27"
                  }
                }
              ]
            }
          ]
        },
        "exporter": {
          "exporterFullName": 'Mr Bob',
          "contactId": "some-contact-id",
          "accountId": "some-account-id"
        }

      };

      const payload = {
        dataToValidate: mockStructureInRedis
      };

      getCatchCertsStub.mockResolvedValue([]);
      getLandingsStub.mockResolvedValue([]);
      getVesselIdxStub.mockReturnValue(vesselIdx);
      refreshRiskingStub.mockRejectedValue(error);
      await generateOnlineValidationReport(payload);

      expect(loggerErrorStub).toHaveBeenCalled()
      expect(loggerErrorStub).toHaveBeenCalledWith(`[ONLINE-VALIDATION-REPORT][REFRESH-RISKING-DATA][ERROR][${error}]`);
    })
  })

  describe('When certificate is not valid', () => {

    let mockGetTotalRiskScore;
    let mockIsHighRisk;
    let mockIsLegallyDue;
    let mockRunUpdateForLandings;

    beforeEach(() => {
      mockGetTotalRiskScore = jest.spyOn(isHighRisk, 'getTotalRiskScore');
      mockGetTotalRiskScore.mockReturnValue(1.2);

      mockIsHighRisk = jest.spyOn(isHighRisk, 'isHighRisk');
      mockIsHighRisk.mockReturnValue(true);

      mockIsLegallyDue = jest.spyOn(isLegallyDue, 'isLegallyDue');
      mockIsLegallyDue.mockReturnValue(true);

      mockRunUpdateForLandings = jest.spyOn(ccQuery, 'runUpdateForLandings');
      mockRunUpdateForLandings.mockResolvedValue(undefined);
    });

    afterEach(() => {
      mockGetTotalRiskScore.mockRestore();
      mockIsHighRisk.mockRestore();
      mockIsLegallyDue.mockRestore();
      mockRunUpdateForLandings.mockRestore();
    });

    it('will return a validation report', async () => {
      await BlockingStatusModel.create({
        name: "CC_3c",
        status: true
      });

      await BlockingStatusModel.create({
        name: "CC_3d",
        status: true
      });

      await BlockingStatusModel.create({
        name: "CC_4a",
        status: true
      });

      await BlockingStatusModel.create({
        name: "PS_SD_4b",
        status: true
      });

      const allCatchCerts = [
        {
          "_id": "5db041d79df195bd1cfda7a8",
          "__t": "catchCert",
          "documentNumber": "CC1",
          "createdAt": "2019-07-10T08:26:06.939Z",
          "exportData":
          {
            "exporterDetails": {
              "contactId": "some-contact-id",
              "accountId": "some-account-id",
              "exporterFullName": "Private",
              "exporterCompanyName": "Private",
              "addressOne": "Building and street",
              "addressTwo": "Building 2 and street name",
              "townCity": "London",
              "postcode": "AB1 2XX"
            },
            "products": [
              {
                "speciesCode": "LBE",
                "caughtBy": [
                  {
                    "vessel": "DAYBREAK", "pln": "WA1", "date": "2019-10-06", "weight": 50
                  }
                ]
              }]
          },
          "__v": 0
        }];

      const allLandings = [
        {
          "_id": "5db04725eb5385bd1c5aa7e8",
          "rssNumber": "rssWA1",
          "dateTimeLanded": "2019-10-06T00:00:00.000Z",
          "items": [
            {
              "_id": "5db04725eb5385bd1c5aa7e9",
              "species": "HER",
              "weight": 50,
              "factor": 1
            }
          ],
          "dateTimeRetrieved": "2019-10-23T12:27:17.000Z",
          "source": "",
          "__v": 0
        }
      ];

      const mockStructureInRedis =
      {
        "documentNumber": "FAILING CERTIFICATE",
        "exportPayload": {
          "items": [
            {
              "product": {
                "id": "55e627af-90d5-4046-9b45-16c269700fde",
                "commodityCode": "1234",
                "presentation": {
                  "code": "FIS",
                  "label": "Filleted and skinned"
                },
                "state": {
                  "code": "BAD",
                  "label": "Fresh"
                },
                "species": {
                  "code": "LBE",
                  "label": "Lobster"
                }
              },
              "landings": [
                {
                  "model": {
                    "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                    "vessel": {
                      "pln": "WA1",
                      "vesselName": "DAYBREAK",
                      "flag": "GBR",
                      "homePort": "IJMUIDEN",
                      "licenceNumber": "11957",
                      "imoNumber": 8707537,
                      "licenceValidTo": "2382-12-31T00:00:00",
                      "rssNumber": "rssWA1",
                      "vesselLength": 113.97,
                      "label": "DAYBREAK (WA1)",
                      "domId": "CORNELISVROLIJKFZN-H171"
                    },
                    "dateLanded": "2019-10-06T00:00:00.000Z",
                    "exportWeight": 78,
                    "faoArea": "FAO27",
                    "numberOfSubmissions": 0
                  }
                }
              ]
            }
          ]
        },
        "exporter": {
          "exporterFullName": 'Mr Bob',
          "contactId": "some-contact-id",
          "accountId": "some-account-id"
        }

      };

      const expectedResult: any = {
        report: [{
          species: 'LBE',
          presentation: 'FIS',
          state: 'BAD',
          failures: [ValidationRules.THREE_C],
          vessel: "DAYBREAK",
          date: moment.utc("2019-10-06T00:00:00.000Z").toDate()
        }],
        rawData: [
          {
            "createdAt": expect.any(String),
            "da": "England",
            "dateLanded": "2019-10-06",
            "documentNumber": "FAILING CERTIFICATE",
            "documentType": "catchCertificate",
            "durationBetweenCertCreationAndFirstLandingRetrieved": expect.any(String),
            "durationBetweenCertCreationAndLastLandingRetrieved": expect.any(String),
            "durationSinceCertCreation": expect.any(String),
            "extended": {
              "commodityCode": "1234",
              "exporterCompanyName": undefined,
              "presentationName": "Filleted and skinned",
              "exporterContactId": "some-contact-id",
              "exporterAccountId": "some-account-id",
              "exporterName": "Mr Bob",
              "fao": "FAO27",
              "investigation": undefined,
              "stateName": "Fresh",
              "landingId": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
              "licenceValidTo": "2100-12-20",
              "licenceHolder": "Mr Doe",
              "pln": "WA1",
              "preApprovedBy": undefined,
              "presentation": "FIS",
              "species": "Lobster",
              "state": "BAD",
              "url": undefined,
              "vessel": "DAYBREAK",
              "voidedBy": undefined,
              "dataEverExpected": false,
              "numberOfSubmissions": 1,
              "speciesOverriddenByAdmin": false,
            },
            "isLandingExists": true,
            "isExceeding14DayLimit": false,
            "isPreApproved": false,
            "isOverusedAllCerts": false,
            "isOverusedThisCert": false,
            "overUsedInfo": [],
            "isSpeciesExists": false,
            "numberOfLandingsOnDay": 1,
            "rawWeightOnCert": 78,
            "rssNumber": "rssWA1",
            "species": "LBE",
            "status": "BLOCKED",
            "speciesAlias": "N",
            "source": "",
            "weightFactor": 1,
            "weightOnAllCerts": 128,
            "weightOnAllCertsAfter": 128,
            "weightOnAllCertsBefore": 50,
            "weightOnCert": 78,
            "weightOnLanding": 0,
            "weightOnLandingAllSpecies": 50,
            "firstDateTimeLandingDataRetrieved": "2019-10-23T12:27:17.000Z",
          }
        ]
      };

      const payload = {
        dataToValidate: mockStructureInRedis
      };

      // @ts-expect-error correct type not required
      getCatchCertsStub.mockResolvedValue(allCatchCerts);
      getLandingsStub.mockResolvedValue(allLandings);
      getVesselIdxStub.mockReturnValue(vesselIdx);
      refreshRiskingStub.mockResolvedValue();
      const result = await generateOnlineValidationReport(payload);

      expect(result).toEqual(expectedResult);
      expect(refreshRiskingStub).toHaveBeenCalled();
    });

    it('will return a validation report if there is no related catch certificates', async () => {
      await BlockingStatusModel.create({
        name: "CC_3c",
        status: true
      });

      await BlockingStatusModel.create({
        name: "CC_3d",
        status: true
      });

      await BlockingStatusModel.create({
        name: "CC_4a",
        status: true
      });

      await BlockingStatusModel.create({
        name: "PS_SD_4b",
        status: true
      });

      const allLandings = [
        {
          "_id": "5db04725eb5385bd1c5aa7e8",
          "rssNumber": "rssWA1",
          "dateTimeLanded": "2019-10-06T00:00:00.000Z",
          "items": [
            {
              "_id": "5db04725eb5385bd1c5aa7e9",
              "species": "HER",
              "weight": 50,
              "factor": 1,
            }
          ],
          "dateTimeRetrieved": "2019-10-23T12:27:17.000Z",
          "source": "",
          "__v": 0
        }
      ];

      const mockStructureInRedis =
      {
        "documentNumber": "FAILING CERTIFICATE",
        "exportPayload": {
          "items": [
            {
              "product": {
                "id": "55e627af-90d5-4046-9b45-16c269700fde",
                "commodityCode": "1234",
                "presentation": {
                  "code": "FIS",
                  "label": "Filleted and skinned"
                },
                "state": {
                  "code": "BAD",
                  "label": "Fresh"
                },
                "species": {
                  "code": "LBE",
                  "label": "Lobster"
                }
              },
              "landings": [
                {
                  "model": {
                    "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                    "vessel": {
                      "pln": "WA1",
                      "vesselName": "DAYBREAK",
                      "flag": "GBR",
                      "homePort": "IJMUIDEN",
                      "licenceNumber": "11957",
                      "imoNumber": 8707537,
                      "licenceValidTo": "2382-12-31T00:00:00",
                      "rssNumber": "rssWA1",
                      "vesselLength": 113.97,
                      "label": "DAYBREAK (WA1)",
                      "domId": "CORNELISVROLIJKFZN-H171",
                    },
                    "dateLanded": "2019-10-06T00:00:00.000Z",
                    "exportWeight": 78,
                    "faoArea": "FAO27",
                    "numberOfSubmissions": 0
                  }
                }
              ]
            }
          ]
        },
        "exporter": {
          "exporterFullName": 'Mr Bob',
          "contactId": "some-contact-id",
          "accountId": "some-account-id"
        }

      };

      const expectedResult: any = {
        report: [
          {
            species: 'LBE',
            presentation: 'FIS',
            state: 'BAD',
            failures: [ValidationRules.THREE_C],
            vessel: "DAYBREAK",
            date: moment.utc("2019-10-06T00:00:00.000Z").toDate()
          }
        ],
        rawData: [{
          "createdAt": expect.any(String),
          "da": "England",
          "dateLanded": "2019-10-06",
          "documentNumber": "FAILING CERTIFICATE",
          "documentType": "catchCertificate",
          "durationBetweenCertCreationAndFirstLandingRetrieved": expect.any(String),
          "durationBetweenCertCreationAndLastLandingRetrieved": expect.any(String),
          "durationSinceCertCreation": expect.any(String),
          "extended": {
            "dataEverExpected": false,
            "commodityCode": "1234",
            "exporterContactId": "some-contact-id",
            "exporterAccountId": "some-account-id",
            "exporterCompanyName": undefined,
            "presentationName": "Filleted and skinned",
            "stateName": "Fresh",
            "exporterName": "Mr Bob",
            "fao": "FAO27",
            "investigation": undefined,
            "landingId": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
            "licenceValidTo": "2100-12-20",
            "licenceHolder": "Mr Doe",
            "pln": "WA1",
            "preApprovedBy": undefined,
            "presentation": "FIS",
            "species": "Lobster",
            "state": "BAD",
            "url": undefined,
            "vessel": "DAYBREAK",
            "voidedBy": undefined,
            "numberOfSubmissions": 1,
            "speciesOverriddenByAdmin": false
          },
          "isLandingExists": true,
          "isOverusedAllCerts": false,
          "isOverusedThisCert": false,
          "overUsedInfo": [],
          "isSpeciesExists": false,
          "isExceeding14DayLimit": false,
          "isPreApproved": false,
          "numberOfLandingsOnDay": 1,
          "rawWeightOnCert": 78,
          "rssNumber": "rssWA1",
          "species": "LBE",
          "status": "BLOCKED",
          "speciesAlias": "N",
          "source": "",
          "weightFactor": 1,
          "weightOnAllCerts": 78,
          "weightOnAllCertsAfter": 78,
          "weightOnAllCertsBefore": 0,
          "weightOnCert": 78,
          "weightOnLanding": 0,
          "weightOnLandingAllSpecies": 50,
          "firstDateTimeLandingDataRetrieved": "2019-10-23T12:27:17.000Z",
        }]
      }


      const payload = {
        dataToValidate: mockStructureInRedis
      };

      getCatchCertsStub.mockResolvedValue([]);
      getLandingsStub.mockResolvedValue(allLandings);
      getVesselIdxStub.mockReturnValue(vesselIdx);
      refreshRiskingStub.mockResolvedValue();
      const result = await generateOnlineValidationReport(payload);

      expect(result).toEqual(expectedResult);
    });

    it('will call getCatchCerts with the referenced landings', async () => {

      const allCatchCerts = [{
        "_id": "5db041d79df195bd1cfda7a8",
        "__t": "catchCert",
        "documentNumber": "CC1",
        "createdAt": "2019-07-10T08:26:06.939Z",
        "exportData": {
          "exporterDetails": {
            "contactId": "some-contact-id",
            "accountId": "some-account-id",
            "exporterFullName": "Private",
            "exporterCompanyName": "Private",
            "addressOne": "Building and street",
            "addressTwo": "Building 2 and street name",
            "townCity": "London",
            "postcode": "AB1 2XX"
          },
          "products": [{
            "speciesCode": "LBE",
            "caughtBy": [
              {
                "vessel": "DAYBREAK", "pln": "WA1", "date": "2019-10-06", "weight": 50
              }
            ]
          }]
        },
        "__v": 0
      }]

      const allLandings = [
        {
          "_id": "5db04725eb5385bd1c5aa7e8",
          "rssNumber": "101",
          "dateTimeLanded": "2019-10-06T00:00:00.000Z",
          "items": [
            {
              "_id": "5db04725eb5385bd1c5aa7e9",
              "species": "LBE",
              "weight": 50,
              "factor": 1
            }
          ],
          "dateTimeRetrieved": "2019-10-23T12:27:17.000Z",
          "source": "",
          "__v": 0
        }
      ]

      const mockStructureInRedis = {
        "documentNumber": "ONLINE CERTIFICATE",
        "exportPayload": {
          "items": [
            {
              "product": {
                "id": "55e627af-90d5-4046-9b45-16c269700fde",
                "commodityCode": "1234",
                "presentation": {
                  "code": "FIS",
                  "label": "Filleted and skinned"
                },
                "state": {
                  "code": "BAD",
                  "label": "Fresh"
                },
                "species": {
                  "code": "LBE",
                  "label": "Lobster"
                }
              },
              "landings": [
                {
                  "model": {
                    "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                    "vessel": {
                      "pln": "WA1",
                      "vesselName": "DAYBREAK",
                      "flag": "GBR",
                      "homePort": "IJMUIDEN",
                      "licenceNumber": "11957",
                      "imoNumber": 8707537,
                      "licenceValidTo": "2382-12-31T00:00:00",
                      "rssNumber": "C19669",
                      "vesselLength": 113.97,
                      "label": "DAYBREAK (WA1)",
                      "domId": "CORNELISVROLIJKFZN-H171"
                    },
                    "dateLanded": "2019-10-06T00:00:00.000Z",
                    "exportWeight": 78,
                    "faoArea": "FAO27",
                    "highSeasArea": "yes",
                    "rfmo": "General Fisheries Commission for the Mediterranean (GFCM)",
                    "riskScore": 0.04,
                    "threshold": 1,
                    "speciesRiskScore": 0.2,
                    "vesselRiskScore": 0.2,
                    "exporterRiskScore": 1,
                    "isSpeciesRiskEnabled": false,
                  }
                }
              ]
            }
          ]
        },
        "exporter": {
          "exporterFullName": 'Mr Bob',
        }
      };

      const payload = {
        dataToValidate: mockStructureInRedis
      };

      // @ts-expect-error correct type not required
      getCatchCertsStub.mockResolvedValue(allCatchCerts);
      getLandingsStub.mockResolvedValue(allLandings);
      getVesselIdxStub.mockReturnValue(vesselIdx);
      refreshRiskingStub.mockResolvedValue();
      await generateOnlineValidationReport(payload);
      expect(getCatchCertsStub).toHaveBeenCalledWith(
        {
          landings: [{
            dateLanded: '2019-10-06',
            isLegallyDue: undefined,
            pln: 'WA1',
            dataEverExpected: false,
            landingDataEndDate: undefined,
            landingDataExpectedDate: undefined,
            createdAt: expect.any(String),
            exporterRiskScore: 1,
            isSpeciesRiskEnabled: false,
            riskScore: 0.04,
            speciesRiskScore: 0.2,
            threshold: 1,
            vesselRiskScore: 0.2
          }]
        });
    });

    it('will set the status as BLOCKED when saving a failed certificate', async () => {
      const allCatchCerts = [
        {
          "_id": "5db041d79df195bd1cfda7a8",
          "__t": "catchCert",
          "documentNumber": "CC1",
          "createdAt": "2019-07-10T08:26:06.939Z",
          "exportData":
          {
            "products": [
              {
                "speciesCode": "LBE",
                "caughtBy": [
                  {
                    "vessel": "DAYBREAK", "pln": "WA1", "date": "2019-10-06", "weight": 50
                  }
                ]
              }]
          },
          "__v": 0
        }];

      const allLandings = [
        {
          "_id": "5db04725eb5385bd1c5aa7e8",
          "rssNumber": "rssWA1",
          "dateTimeLanded": "2019-10-06T00:00:00.000Z",
          "items": [
            {
              "_id": "5db04725eb5385bd1c5aa7e9",
              "species": "HER",
              "weight": 50,
              "factor": 1
            }
          ],
          "dateTimeRetrieved": "2019-10-23T12:27:17.000Z",
          "source": "",
          "__v": 0
        }
      ];

      const mockStructureInRedis =
      {
        "documentNumber": "FAILING 3C CERTIFICATE",
        "exportPayload": {
          "items": [
            {
              "product": {
                "id": "55e627af-90d5-4046-9b45-16c269700fde",
                "commodityCode": "1234",
                "presentation": {
                  "code": "FIS",
                  "label": "Filleted and skinned"
                },
                "state": {
                  "code": "BAD",
                  "label": "Fresh"
                },
                "species": {
                  "code": "LBE",
                  "label": "Lobster"
                }
              },
              "landings": [
                {
                  "model": {
                    "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                    "vessel": {
                      "pln": "WA1",
                      "vesselName": "DAYBREAK",
                      "flag": "GBR",
                      "homePort": "IJMUIDEN",
                      "licenceNumber": "11957",
                      "imoNumber": 8707537,
                      "licenceValidTo": "2382-12-31T00:00:00",
                      "rssNumber": "rssWA1",
                      "vesselLength": 113.97,
                      "label": "DAYBREAK (WA1)",
                      "domId": "CORNELISVROLIJKFZN-H171"
                    },
                    "dateLanded": "2019-10-06T00:00:00.000Z",
                    "exportWeight": 78,
                    "faoArea": "FAO27"
                  }
                }
              ]
            }
          ]
        },
        "exporter": {
          "exporterFullName": 'Mr Bob',
        }

      };

      const payload = {
        dataToValidate: mockStructureInRedis
      };

      // @ts-expect-error correct type not required
      getCatchCertsStub.mockResolvedValue(allCatchCerts);
      getLandingsStub.mockResolvedValue(allLandings);
      getVesselIdxStub.mockReturnValue(vesselIdx);
      refreshRiskingStub.mockResolvedValue();
      await BlockingStatusModel.create({
        name: "CC_3c",
        status: true
      });

      await generateOnlineValidationReport(payload);

      const result = await FailedOnlineCertificates.findOne({ documentNumber: "FAILING 3C CERTIFICATE" }).lean();

      expect(result?.documentNumber).toEqual("FAILING 3C CERTIFICATE");
    });

    it('will only save the failed certificate for the current document we are validating', async () => {
      const allCatchCerts = [
        {
          "_id": "5db041d79df195bd1cfda7a8",
          "__t": "catchCert",
          "documentNumber": "CC1",
          "createdAt": "2019-07-10T08:26:06.939Z",
          "exportData":
          {
            "products": [
              {
                "speciesCode": "LBE",
                "caughtBy": [
                  {
                    "vessel": "DAYBREAK", "pln": "WA1", "date": "2019-10-06", "weight": 50
                  }
                ]
              }]
          },
          "__v": 0
        }];

      const allLandings = [
        {
          "_id": "5db04725eb5385bd1c5aa7e8",
          "rssNumber": "rssWA1",
          "dateTimeLanded": "2019-10-06T00:00:00.000Z",
          "items": [
            {
              "_id": "5db04725eb5385bd1c5aa7e9",
              "species": "HER",
              "weight": 50,
              "factor": 1
            }
          ],
          "dateTimeRetrieved": "2019-10-23T12:27:17.000Z",
          "source": "",
          "__v": 0
        }
      ];

      const mockStructureInRedis =
      {
        "documentNumber": "FAILING 3C CERTIFICATE",
        "exportPayload": {
          "items": [
            {
              "product": {
                "id": "55e627af-90d5-4046-9b45-16c269700fde",
                "commodityCode": "1234",
                "presentation": {
                  "code": "FIS",
                  "label": "Filleted and skinned"
                },
                "state": {
                  "code": "BAD",
                  "label": "Fresh"
                },
                "species": {
                  "code": "LBE",
                  "label": "Lobster"
                }
              },
              "landings": [
                {
                  "model": {
                    "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                    "vessel": {
                      "pln": "WA1",
                      "vesselName": "DAYBREAK",
                      "flag": "GBR",
                      "homePort": "IJMUIDEN",
                      "licenceNumber": "11957",
                      "imoNumber": 8707537,
                      "licenceValidTo": "2382-12-31T00:00:00",
                      "rssNumber": "rssWA1",
                      "vesselLength": 113.97,
                      "label": "DAYBREAK (WA1)",
                      "domId": "CORNELISVROLIJKFZN-H171"
                    },
                    "dateLanded": "2019-10-06T00:00:00.000Z",
                    "exportWeight": 78,
                    "faoArea": "FAO27"
                  }
                }
              ]
            }
          ]
        },
        "exporter": {
          "exporterFullName": 'Mr Bob',
        }

      };

      // @ts-expect-error correct type not required
      getCatchCertsStub.mockResolvedValue(allCatchCerts);
      getLandingsStub.mockResolvedValue(allLandings);
      getVesselIdxStub.mockReturnValue(vesselIdx);
      refreshRiskingStub.mockResolvedValue();
      const payload = {
        dataToValidate: mockStructureInRedis
      };

      await BlockingStatusModel.create({
        name: "CC_3c",
        status: true
      });

      await generateOnlineValidationReport(payload);

      const redisCert = await FailedOnlineCertificates.findOne({ documentNumber: "FAILING 3C CERTIFICATE" }).lean();
      const relatedCert = await FailedOnlineCertificates.findOne({ documentNumber: "CC1" }).lean();


      expect(redisCert?.documentNumber).toEqual("FAILING 3C CERTIFICATE");
      expect(relatedCert).toEqual(null);
    });

    it('will save the failed certificate if we fail on Licence Holder', async () => {
      mockIsLegallyDue.mockReturnValue(false);

      const allCatchCerts = [];

      const allLandings = [];

      const mockStructureInRedis =
      {
        "documentNumber": "FAILING noLicenceHolder CERTIFICATE",
        "exportPayload": {
          "items": [
            {
              "product": {
                "id": "55e627af-90d5-4046-9b45-16c269700fde",
                "commodityCode": "1234",
                "presentation": {
                  "code": "FIS",
                  "label": "Filleted and skinned"
                },
                "state": {
                  "code": "BAD",
                  "label": "Fresh"
                },
                "species": {
                  "code": "LBE",
                  "label": "Lobster"
                }
              },
              "landings": [
                {
                  "model": {
                    "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                    "vessel": {
                      "pln": "WA5",
                      "vesselName": "DAYBREAK",
                      "flag": "GBR",
                      "homePort": "IJMUIDEN",
                      "licenceNumber": "11957",
                      "imoNumber": 8707537,
                      "licenceValidTo": "2382-12-31T00:00:00",
                      "rssNumber": "rssWA1",
                      "vesselLength": 9.97,
                      "label": "DAYBREAK (WA5)",
                      "domId": "CORNELISVROLIJKFZN-H171"
                    },
                    "dateLanded": "2019-10-06T00:00:00.000Z",
                    "exportWeight": 78,
                    "faoArea": "FAO27"
                  }
                }
              ]
            }
          ]
        },
        "exporter": {
          "exporterFullName": 'Mr Bob',
        }

      };

      const payload = {
        dataToValidate: mockStructureInRedis
      };

      getCatchCertsStub.mockResolvedValue(allCatchCerts);
      getLandingsStub.mockResolvedValue(allLandings);
      getVesselIdxStub.mockReturnValue(vesselIdx);
      refreshRiskingStub.mockResolvedValue();
      await generateOnlineValidationReport(payload);

      const result = await FailedOnlineCertificates.findOne({ documentNumber: "FAILING noLicenceHolder CERTIFICATE" }).lean() || { documentNumber: '' };

      expect(result.documentNumber).toEqual("FAILING noLicenceHolder CERTIFICATE");
    });

    describe("When any of the blocking is turned on", () => {

      describe('When 3C blocking is turned on', () => {
        it('will save the failed certificate if we fail on 3C', async () => {
          const allCatchCerts = [
            {
              "_id": "5db041d79df195bd1cfda7a8",
              "__t": "catchCert",
              "documentNumber": "CC1",
              "createdAt": "2019-07-10T08:26:06.939Z",
              "exportData":
              {
                "products": [
                  {
                    "speciesCode": "LBE",
                    "caughtBy": [
                      {
                        "vessel": "DAYBREAK", "pln": "WA1", "date": "2019-10-06", "weight": 50
                      }
                    ]
                  }]
              },
              "__v": 0
            }];

          const allLandings = [
            {
              "_id": "5db04725eb5385bd1c5aa7e8",
              "rssNumber": "rssWA1",
              "dateTimeLanded": "2019-10-06T00:00:00.000Z",
              "items": [
                {
                  "_id": "5db04725eb5385bd1c5aa7e9",
                  "species": "HER",
                  "weight": 50,
                  "factor": 1
                }
              ],
              "dateTimeRetrieved": "2019-10-23T12:27:17.000Z",
              "source": "",
              "__v": 0
            }
          ];

          const mockStructureInRedis =
          {
            "documentNumber": "FAILING 3C CERTIFICATE",
            "exportPayload": {
              "items": [
                {
                  "product": {
                    "id": "55e627af-90d5-4046-9b45-16c269700fde",
                    "commodityCode": "1234",
                    "presentation": {
                      "code": "FIS",
                      "label": "Filleted and skinned"
                    },
                    "state": {
                      "code": "BAD",
                      "label": "Fresh"
                    },
                    "species": {
                      "code": "LBE",
                      "label": "Lobster"
                    }
                  },
                  "landings": [
                    {
                      "model": {
                        "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                        "vessel": {
                          "pln": "WA1",
                          "vesselName": "DAYBREAK",
                          "flag": "GBR",
                          "homePort": "IJMUIDEN",
                          "licenceNumber": "11957",
                          "imoNumber": 8707537,
                          "licenceValidTo": "2382-12-31T00:00:00",
                          "rssNumber": "rssWA1",
                          "vesselLength": 113.97,
                          "label": "DAYBREAK (WA1)",
                          "domId": "CORNELISVROLIJKFZN-H171"
                        },
                        "dateLanded": "2019-10-06T00:00:00.000Z",
                        "exportWeight": 78,
                        "faoArea": "FAO27"
                      }
                    }
                  ]
                }
              ]
            },
            "exporter": {
              "exporterFullName": 'Mr Bob',
            }

          };

          const payload = {
            dataToValidate: mockStructureInRedis
          };

          // @ts-expect-error correct type not required
          getCatchCertsStub.mockResolvedValue(allCatchCerts);
          getLandingsStub.mockResolvedValue(allLandings);
          getVesselIdxStub.mockReturnValue(vesselIdx);
          refreshRiskingStub.mockResolvedValue();
          await BlockingStatusModel.create({
            name: "CC_3c",
            status: true
          });

          await generateOnlineValidationReport(payload);

          const result = await FailedOnlineCertificates.findOne({ documentNumber: "FAILING 3C CERTIFICATE" }).lean();

          expect(result?.documentNumber).toEqual("FAILING 3C CERTIFICATE");
        });

        it('will only save the failed certificate once if we fail on 3C and 4A is enabled too', async () => {
          const allCatchCerts = [
            {
              "_id": "5db041d79df195bd1cfda7a8",
              "__t": "catchCert",
              "documentNumber": "CC1",
              "createdAt": "2019-07-10T08:26:06.939Z",
              "exportData":
              {
                "products": [
                  {
                    "speciesCode": "LBE",
                    "caughtBy": [
                      {
                        "vessel": "DAYBREAK", "pln": "WA1", "date": "2019-10-06", "weight": 50
                      }
                    ]
                  }]
              },
              "__v": 0
            }];

          const allLandings = [
            {
              "_id": "5db04725eb5385bd1c5aa7e8",
              "rssNumber": "rssWA1",
              "dateTimeLanded": "2019-10-06T00:00:00.000Z",
              "items": [
                {
                  "_id": "5db04725eb5385bd1c5aa7e9",
                  "species": "HER",
                  "weight": 50,
                  "factor": 1
                }
              ],
              "dateTimeRetrieved": "2019-10-23T12:27:17.000Z",
              "source": "",
              "__v": 0
            }
          ];

          const mockStructureInRedis =
          {
            "documentNumber": "FAILING 3C CERTIFICATE",
            "exportPayload": {
              "items": [
                {
                  "product": {
                    "id": "55e627af-90d5-4046-9b45-16c269700fde",
                    "commodityCode": "1234",
                    "presentation": {
                      "code": "FIS",
                      "label": "Filleted and skinned"
                    },
                    "state": {
                      "code": "BAD",
                      "label": "Fresh"
                    },
                    "species": {
                      "code": "LBE",
                      "label": "Lobster"
                    }
                  },
                  "landings": [
                    {
                      "model": {
                        "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                        "vessel": {
                          "pln": "WA1",
                          "vesselName": "DAYBREAK",
                          "flag": "GBR",
                          "homePort": "IJMUIDEN",
                          "licenceNumber": "11957",
                          "imoNumber": 8707537,
                          "licenceValidTo": "2382-12-31T00:00:00",
                          "rssNumber": "rssWA1",
                          "vesselLength": 113.97,
                          "label": "DAYBREAK (WA1)",
                          "domId": "CORNELISVROLIJKFZN-H171"
                        },
                        "dateLanded": "2019-10-06T00:00:00.000Z",
                        "exportWeight": 78,
                        "faoArea": "FAO27"
                      }
                    }
                  ]
                }
              ]
            },
            "exporter": {
              "exporterFullName": 'Mr Bob',
            }

          };

          const payload = {
            dataToValidate: mockStructureInRedis
          };

          // @ts-expect-error correct type not required
          getCatchCertsStub.mockResolvedValue(allCatchCerts);
          getLandingsStub.mockResolvedValue(allLandings);
          getVesselIdxStub.mockReturnValue(vesselIdx);
          refreshRiskingStub.mockResolvedValue();
          await BlockingStatusModel.create({
            name: "CC_3c",
            status: true
          });

          await BlockingStatusModel.create({
            name: "CC_4a",
            status: true
          });

          await generateOnlineValidationReport(payload);

          const result = await FailedOnlineCertificates.find({ documentNumber: "FAILING 3C CERTIFICATE" }).lean();

          expect(result.length).toEqual(1);
        });

        it('will not save the certificate if we do not fail on 3C', async () => {
          const allCatchCerts = [
            {
              "_id": "5db041d79df195bd1cfda7a8",
              "__t": "catchCert",
              "documentNumber": "CC1",
              "createdAt": "2019-07-10T08:26:06.939Z",
              "exportData":
              {
                "products": [
                  {
                    "speciesCode": "LBE",
                    "caughtBy": [
                      {
                        "vessel": "DAYBREAK", "pln": "WA1", "date": "2019-10-06", "weight": 50
                      }
                    ]
                  }]
              },
              "__v": 0
            }];

          const allLandings = [
            {
              "_id": "5db04725eb5385bd1c5aa7e8",
              "rssNumber": "rssWA1",
              "dateTimeLanded": "2019-10-06T00:00:00.000Z",
              "items": [
                {
                  "_id": "5db04725eb5385bd1c5aa7e9",
                  "species": "LBE",
                  "weight": 50,
                  "factor": 1
                }
              ],
              "dateTimeRetrieved": "2019-10-23T12:27:17.000Z",
              "source": "",
              "__v": 0
            }
          ];

          const mockStructureInRedis =
          {
            "documentNumber": "FAILING 4A CERTIFICATE",
            "exportPayload": {
              "items": [
                {
                  "product": {
                    "id": "55e627af-90d5-4046-9b45-16c269700fde",
                    "commodityCode": "1234",
                    "presentation": {
                      "code": "FIS",
                      "label": "Filleted and skinned"
                    },
                    "state": {
                      "code": "BAD",
                      "label": "Fresh"
                    },
                    "species": {
                      "code": "LBE",
                      "label": "Lobster"
                    }
                  },
                  "landings": [
                    {
                      "model": {
                        "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                        "vessel": {
                          "pln": "WA1",
                          "vesselName": "DAYBREAK",
                          "flag": "GBR",
                          "homePort": "IJMUIDEN",
                          "licenceNumber": "11957",
                          "imoNumber": 8707537,
                          "licenceValidTo": "2382-12-31T00:00:00",
                          "rssNumber": "rssWA1",
                          "vesselLength": 113.97,
                          "label": "DAYBREAK (WA1)",
                          "domId": "CORNELISVROLIJKFZN-H171"
                        },
                        "dateLanded": "2019-10-06T00:00:00.000Z",
                        "exportWeight": 10,
                        "faoArea": "FAO27"
                      }
                    }
                  ]
                }
              ]
            },
            "exporter": {
              "exporterFullName": 'Mr Bob',
            }

          };

          // @ts-expect-error correct type not required
          getCatchCertsStub.mockResolvedValue(allCatchCerts);
          getLandingsStub.mockResolvedValue(allLandings);
          getVesselIdxStub.mockReturnValue(vesselIdx);
          refreshRiskingStub.mockResolvedValue();
          const payload = {
            dataToValidate: mockStructureInRedis
          };

          await BlockingStatusModel.create({
            name: "CC_3c",
            status: true
          });

          await generateOnlineValidationReport(payload);
          const result = await FailedOnlineCertificates.findOne({ documentNumber: "FAILING 4A CERTIFICATE" }).lean();

          expect(result).toEqual(null);
        })
      });

      describe('When 3D blocking is turned on', () => {

        beforeEach(() => {
          mockIsHighRisk.mockReturnValue(true);
        });

        it('will save the failed certificate if we fail on 3D', async () => {
          const allCatchCerts = [
            {
              "_id": "5db041d79df195bd1cfda7a8",
              "__t": "catchCert",
              "documentNumber": "CC1",
              "createdAt": "2019-07-10T08:26:06.939Z",
              "exportData":
              {
                "exporterDetails": {
                  "contactId": "some-contact-id",
                  "accountId": "some-account-id",
                  "exporterFullName": "Private",
                  "exporterCompanyName": "Private",
                  "addressOne": "Building and street",
                  "addressTwo": "Building 2 and street name",
                  "townCity": "London",
                  "postcode": "AB1 2XX"
                },
                "products": [
                  {
                    "speciesCode": "LBE",
                    "caughtBy": [
                      {
                        "vessel": "DAYBREAK", "pln": "WA1", "date": "2019-10-06", "weight": 50
                      }
                    ]
                  }]
              },
              "__v": 0
            }];

          const allLandings = [
            {
              "_id": "5db04725eb5385bd1c5aa7e8",
              "rssNumber": "rssWA1",
              "dateTimeLanded": "2019-10-06T00:00:00.000Z",
              "items": [
                {
                  "_id": "5db04725eb5385bd1c5aa7e9",
                  "species": "LBE",
                  "weight": 50,
                  "factor": 1
                }
              ],
              "dateTimeRetrieved": "2019-10-23T12:27:17.000Z",
              "source": "",
              "__v": 0
            }
          ];

          const mockStructureInRedis =
          {
            "documentNumber": "FAILING 3D CERTIFICATE",
            "exportPayload": {
              "items": [
                {
                  "product": {
                    "id": "55e627af-90d5-4046-9b45-16c269700fde",
                    "commodityCode": "1234",
                    "presentation": {
                      "code": "FIS",
                      "label": "Filleted and skinned"
                    },
                    "state": {
                      "code": "BAD",
                      "label": "Fresh"
                    },
                    "species": {
                      "code": "LBE",
                      "label": "Lobster"
                    }
                  },
                  "landings": [
                    {
                      "model": {
                        "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                        "vessel": {
                          "pln": "WA1",
                          "vesselName": "DAYBREAK",
                          "flag": "GBR",
                          "homePort": "IJMUIDEN",
                          "licenceNumber": "11957",
                          "imoNumber": 8707537,
                          "licenceValidTo": "2382-12-31T00:00:00",
                          "rssNumber": "rssWA1",
                          "vesselLength": 113.97,
                          "label": "DAYBREAK (WA1)",
                          "domId": "CORNELISVROLIJKFZN-H171"
                        },
                        "dateLanded": "2019-10-06T00:00:00.000Z",
                        "exportWeight": 78,
                        "faoArea": "FAO27"
                      }
                    }
                  ]
                }
              ]
            },
            "exporter": {
              "exporterFullName": 'Mr Bob',
              "accountId": "some-account-id",
              "contactId": "some-contact-id"
            }

          };

          // @ts-expect-error correct type not required
          getCatchCertsStub.mockResolvedValue(allCatchCerts);
          getLandingsStub.mockResolvedValue(allLandings);
          getVesselIdxStub.mockReturnValue(vesselIdx);
          refreshRiskingStub.mockResolvedValue();
          const payload = {
            dataToValidate: mockStructureInRedis
          };

          await BlockingStatusModel.create({
            name: "CC_3d",
            status: true
          });

          await generateOnlineValidationReport(payload);
          const result = await FailedOnlineCertificates.findOne({ documentNumber: "FAILING 3D CERTIFICATE" }).lean();

          expect(result?.documentNumber).toEqual("FAILING 3D CERTIFICATE");
          expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
          expect(mockIsHighRisk).toHaveBeenCalledWith(1.2);
        });

        it('will not save the certificate if we do not fail on 3D', async () => {
          const allCatchCerts = [
            {
              "_id": "5db041d79df195bd1cfda7a8",
              "__t": "catchCert",
              "documentNumber": "CC1",
              "createdAt": "2019-07-10T08:26:06.939Z",
              "exportData":
              {
                "exporterDetails": {
                  "accountId": "some-account-id",
                  "contactId": "some-contact-id",
                  "exporterFullName": "Private",
                  "exporterCompanyName": "Private",
                  "addressOne": "Building and street",
                  "addressTwo": "Building 2 and street name",
                  "townCity": "London",
                  "postcode": "AB1 2XX"
                },
                "products": [
                  {
                    "speciesCode": "LBE",
                    "caughtBy": [
                      {
                        "vessel": "DAYBREAK", "pln": "WA1", "date": "2019-10-06", "weight": 50
                      }
                    ]
                  }]
              },
              "__v": 0
            }];

          const allLandings = [
            {
              "_id": "5db04725eb5385bd1c5aa7e8",
              "rssNumber": "rssWA1",
              "dateTimeLanded": "2019-10-06T00:00:00.000Z",
              "items": [
                {
                  "_id": "5db04725eb5385bd1c5aa7e9",
                  "species": "LBE",
                  "weight": 50,
                  "factor": 1
                }
              ],
              "dateTimeRetrieved": "2019-10-23T12:27:17.000Z",
              "source": "",
              "__v": 0
            }
          ];

          const mockStructureInRedis =
          {
            "documentNumber": "FAILING 4A CERTIFICATE",
            "exportPayload": {
              "items": [
                {
                  "product": {
                    "id": "55e627af-90d5-4046-9b45-16c269700fde",
                    "commodityCode": "1234",
                    "presentation": {
                      "code": "FIS",
                      "label": "Filleted and skinned"
                    },
                    "state": {
                      "code": "BAD",
                      "label": "Fresh"
                    },
                    "species": {
                      "code": "LBE",
                      "label": "Lobster"
                    }
                  },
                  "landings": [
                    {
                      "model": {
                        "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                        "vessel": {
                          "pln": "WA1",
                          "vesselName": "DAYBREAK",
                          "flag": "GBR",
                          "homePort": "IJMUIDEN",
                          "licenceNumber": "11957",
                          "imoNumber": 8707537,
                          "licenceValidTo": "2382-12-31T00:00:00",
                          "rssNumber": "rssWA1",
                          "vesselLength": 113.97,
                          "label": "DAYBREAK (WA1)",
                          "domId": "CORNELISVROLIJKFZN-H171"
                        },
                        "dateLanded": "2019-10-06T00:00:00.000Z",
                        "exportWeight": 10,
                        "faoArea": "FAO27"
                      }
                    }
                  ]
                }
              ]
            },
            "exporter": {
              "exporterFullName": 'Mr Bob',
              "accountId": "some-account-id",
              "contactId": "some-contact-id"
            }

          };

          // @ts-expect-error correct type not required
          getCatchCertsStub.mockResolvedValue(allCatchCerts);
          getLandingsStub.mockResolvedValue(allLandings);
          getVesselIdxStub.mockReturnValue(vesselIdx);
          refreshRiskingStub.mockResolvedValue();
          const payload = {
            dataToValidate: mockStructureInRedis
          };

          await BlockingStatusModel.create({
            name: "CC_3d",
            status: true
          });

          await generateOnlineValidationReport(payload);
          const result = await FailedOnlineCertificates.findOne({ documentNumber: "FAILING 4A CERTIFICATE" }).lean();

          expect(result).toEqual(null);
        })
      });

      describe('When 4A blocking is turned on', () => {
        it('will save the failed certificate if we fail on 4A', async () => {
          const allCatchCerts = [
            {
              "_id": "5db041d79df195bd1cfda7a8",
              "__t": "catchCert",
              "documentNumber": "CC1",
              "createdAt": "2019-07-10T08:26:06.939Z",
              "exportData":
              {
                "products": [
                  {
                    "speciesCode": "LBE",
                    "caughtBy": [
                      {
                        "vessel": "DAYBREAK", "pln": "WA1", "date": "2019-10-06", "weight": 100
                      }
                    ]
                  }]
              },
              "__v": 0
            }];

          const allLandings = [
            {
              "_id": "5db04725eb5385bd1c5aa7e8",
              "rssNumber": "rssWA1",
              "dateTimeLanded": "2019-10-06T00:00:00.000Z",
              "items": [
                {
                  "_id": "5db04725eb5385bd1c5aa7e9",
                  "species": "LBE",
                  "weight": 50,
                  "factor": 1
                }
              ],
              "dateTimeRetrieved": "2019-10-23T12:27:17.000Z",
              "source": "",
              "__v": 0
            }
          ];

          const mockStructureInRedis =
          {
            "documentNumber": "FAILING 4A CERTIFICATE",
            "exportPayload": {
              "items": [
                {
                  "product": {
                    "id": "55e627af-90d5-4046-9b45-16c269700fde",
                    "commodityCode": "1234",
                    "presentation": {
                      "code": "FIS",
                      "label": "Filleted and skinned"
                    },
                    "state": {
                      "code": "BAD",
                      "label": "Fresh"
                    },
                    "species": {
                      "code": "LBE",
                      "label": "Lobster"
                    }
                  },
                  "landings": [
                    {
                      "model": {
                        "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                        "vessel": {
                          "pln": "WA1",
                          "vesselName": "DAYBREAK",
                          "flag": "GBR",
                          "homePort": "IJMUIDEN",
                          "licenceNumber": "11957",
                          "imoNumber": 8707537,
                          "licenceValidTo": "2382-12-31T00:00:00",
                          "rssNumber": "rssWA1",
                          "vesselLength": 113.97,
                          "label": "DAYBREAK (WA1)",
                          "domId": "CORNELISVROLIJKFZN-H171"
                        },
                        "dateLanded": "2019-10-06T00:00:00.000Z",
                        "exportWeight": 10,
                        "faoArea": "FAO27"
                      }
                    }
                  ]
                }
              ]
            },
            "exporter": {
              "exporterFullName": 'Mr Bob',
            }

          };

          // @ts-expect-error correct type not required
          getCatchCertsStub.mockResolvedValue(allCatchCerts);
          getLandingsStub.mockResolvedValue(allLandings);
          getVesselIdxStub.mockReturnValue(vesselIdx);
          refreshRiskingStub.mockResolvedValue();
          const payload = {
            dataToValidate: mockStructureInRedis
          };

          await BlockingStatusModel.create({
            name: "CC_4a",
            status: true
          });

          await generateOnlineValidationReport(payload);
          const result = await FailedOnlineCertificates.findOne({ documentNumber: "FAILING 4A CERTIFICATE" }).lean();

          expect(result?.documentNumber).toEqual("FAILING 4A CERTIFICATE");
        });
      });

      describe('When the document has been pre approved', () => {
        it('will return an empty validation report', async () => {
          const allCatchCerts = [
            {
              "_id": "5db041d79df195bd1cfda7a8",
              "__t": "catchCert",
              "documentNumber": "CC1",
              "createdAt": "2019-07-10T08:26:06.939Z",
              "exportData":
              {
                "exporterDetails": {
                  "contactId": "some-contact-id",
                  "accountId": "some-account-id",
                  "exporterFullName": "Private",
                  "exporterCompanyName": "Private",
                  "addressOne": "Building and street",
                  "addressTwo": "Building 2 and street name",
                  "townCity": "London",
                  "postcode": "AB1 2XX"
                },
                "products": [
                  {
                    "speciesCode": "LBE",
                    "caughtBy": [
                      {
                        "vessel": "DAYBREAK", "pln": "WA1", "date": "2019-10-06", "weight": 50
                      }
                    ]
                  }]
              },
              "__v": 0
            }];

          const allLandings = [
            {
              "_id": "5db04725eb5385bd1c5aa7e8",
              "rssNumber": "rssWA1",
              "dateTimeLanded": "2019-10-06T00:00:00.000Z",
              "items": [
                {
                  "_id": "5db04725eb5385bd1c5aa7e9",
                  "species": "HER",
                  "weight": 50,
                  "factor": 1
                }
              ],
              "dateTimeRetrieved": "2019-10-23T12:27:17.000Z",
              "source": "",
              "__v": 0
            }
          ];

          const mockStructureInRedis =
          {
            "documentNumber": "FAILING CERTIFICATE",
            "exportPayload": {
              "items": [
                {
                  "product": {
                    "id": "55e627af-90d5-4046-9b45-16c269700fde",
                    "commodityCode": "1234",
                    "presentation": {
                      "code": "FIS",
                      "label": "Filleted and skinned"
                    },
                    "state": {
                      "code": "BAD",
                      "label": "Fresh"
                    },
                    "species": {
                      "code": "LBE",
                      "label": "Lobster"
                    }
                  },
                  "landings": [
                    {
                      "model": {
                        "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                        "vessel": {
                          "pln": "WA1",
                          "vesselName": "DAYBREAK",
                          "flag": "GBR",
                          "homePort": "IJMUIDEN",
                          "licenceNumber": "11957",
                          "imoNumber": 8707537,
                          "licenceValidTo": "2382-12-31T00:00:00",
                          "rssNumber": "rssWA1",
                          "vesselLength": 113.97,
                          "label": "DAYBREAK (WA1)",
                          "domId": "CORNELISVROLIJKFZN-H171"
                        },
                        "numberOfSubmissions": 0,
                        "dateLanded": "2019-10-06T00:00:00.000Z",
                        "exportWeight": 78,
                        "faoArea": "FAO27"
                      }
                    }
                  ]
                }
              ]
            },
            "exporter": {
              "exporterFullName": 'Mr Bob',
              "contactId": "some-contact-id",
              "accountId": "some-account-id"
            }

          };

          const payload = {
            dataToValidate: mockStructureInRedis
          };

          const catchCert = new DocumentModel({
            __t: "catchCert",
            status: "DRAFT",
            documentNumber: "FAILING CERTIFICATE",
            createdAt: "2019-10-19T00:00:00.000Z",
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            exportData: { products: [] }
          });
          await catchCert.save();

          await preApproveDocumentFromMongo(mockStructureInRedis.documentNumber, "Bob");

          await BlockingStatusModel.create({
            name: "CC_3c",
            status: true
          });

          // @ts-expect-error correct type not required
          getCatchCertsStub.mockResolvedValue(allCatchCerts);
          getLandingsStub.mockResolvedValue(allLandings);
          getVesselIdxStub.mockReturnValue(vesselIdx);
          refreshRiskingStub.mockResolvedValue();
          const result = await generateOnlineValidationReport(payload);

          expect(result).toEqual({
            rawData: [
              {
                "createdAt": expect.any(String),
                "da": "England",
                "dateLanded": "2019-10-06",
                "documentNumber": "FAILING CERTIFICATE",
                "documentType": "catchCertificate",
                "durationBetweenCertCreationAndFirstLandingRetrieved": expect.any(String),
                "durationBetweenCertCreationAndLastLandingRetrieved": expect.any(String),
                "durationSinceCertCreation": expect.any(String),
                "extended": {
                  "dataEverExpected": false,
                  "commodityCode": "1234",
                  "exporterContactId": "some-contact-id",
                  "exporterAccountId": "some-account-id",
                  "exporterCompanyName": undefined,
                  "presentationName": "Filleted and skinned",
                  "stateName": "Fresh",
                  "exporterName": "Mr Bob",
                  "fao": "FAO27",
                  "investigation": undefined,
                  "landingId": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                  "licenceValidTo": "2100-12-20",
                  "licenceHolder": "Mr Doe",
                  "pln": "WA1",
                  "preApprovedBy": undefined,
                  "presentation": "FIS",
                  "species": "Lobster",
                  "state": "BAD",
                  "url": undefined,
                  "vessel": "DAYBREAK",
                  "voidedBy": undefined,
                  "numberOfSubmissions": 1,
                  "speciesOverriddenByAdmin": false,
                },
                "isLandingExists": true,
                "isOverusedAllCerts": false,
                "isOverusedThisCert": false,
                "overUsedInfo": [],
                "isSpeciesExists": false,
                "isExceeding14DayLimit": false,
                "numberOfLandingsOnDay": 1,
                "rawWeightOnCert": 78,
                "rssNumber": "rssWA1",
                "species": "LBE",
                "status": "COMPLETE",
                "speciesAlias": "N",
                "source": "",
                "weightFactor": 1,
                "weightOnAllCerts": 128,
                "weightOnAllCertsAfter": 128,
                "weightOnAllCertsBefore": 50,
                "weightOnCert": 78,
                "weightOnLanding": 0,
                "weightOnLandingAllSpecies": 50,
                "isPreApproved": true,
                "firstDateTimeLandingDataRetrieved": "2019-10-23T12:27:17.000Z",

              }],
            report: []
          });
        });

        it('will not persist the failed certificate', async () => {
          const allCatchCerts = [
            {
              "_id": "5db041d79df195bd1cfda7a8",
              "__t": "catchCert",
              "documentNumber": "CC1",
              "createdAt": "2019-07-10T08:26:06.939Z",
              "exportData":
              {
                "products": [
                  {
                    "speciesCode": "LBE",
                    "caughtBy": [
                      {
                        "vessel": "DAYBREAK", "pln": "WA1", "date": "2019-10-06", "weight": 50
                      }
                    ]
                  }]
              },
              "__v": 0
            }];

          const allLandings = [
            {
              "_id": "5db04725eb5385bd1c5aa7e8",
              "rssNumber": "rssWA1",
              "dateTimeLanded": "2019-10-06T00:00:00.000Z",
              "items": [
                {
                  "_id": "5db04725eb5385bd1c5aa7e9",
                  "species": "HER",
                  "weight": 50,
                  "factor": 1
                }
              ],
              "dateTimeRetrieved": "2019-10-23T12:27:17.000Z",
              "source": "",
              "__v": 0
            }
          ];

          const mockStructureInRedis =
          {
            "documentNumber": "FAILING 3C CERTIFICATE",
            "exportPayload": {
              "items": [
                {
                  "product": {
                    "id": "55e627af-90d5-4046-9b45-16c269700fde",
                    "commodityCode": "1234",
                    "presentation": {
                      "code": "FIS",
                      "label": "Filleted and skinned"
                    },
                    "state": {
                      "code": "BAD",
                      "label": "Fresh"
                    },
                    "species": {
                      "code": "LBE",
                      "label": "Lobster"
                    }
                  },
                  "landings": [
                    {
                      "model": {
                        "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                        "vessel": {
                          "pln": "WA1",
                          "vesselName": "DAYBREAK",
                          "flag": "GBR",
                          "homePort": "IJMUIDEN",
                          "licenceNumber": "11957",
                          "imoNumber": 8707537,
                          "licenceValidTo": "2382-12-31T00:00:00",
                          "rssNumber": "rssWA1",
                          "vesselLength": 113.97,
                          "label": "DAYBREAK (WA1)",
                          "domId": "CORNELISVROLIJKFZN-H171"
                        },
                        "dateLanded": "2019-10-06T00:00:00.000Z",
                        "exportWeight": 78,
                        "faoArea": "FAO27"
                      }
                    }
                  ]
                }
              ]
            },
            "exporter": {
              "exporterFullName": 'Mr Bob',
            }

          };


          const catchCert = new DocumentModel({
            __t: "catchCert",
            status: "DRAFT",
            documentNumber: "FAILING 3C CERTIFICATE",
            createdAt: "2019-10-19T00:00:00.000Z",
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            exportData: { products: [] }
          });
          await catchCert.save();

          // @ts-expect-error correct type not required
          getCatchCertsStub.mockResolvedValue(allCatchCerts);
          getLandingsStub.mockResolvedValue(allLandings);
          getVesselIdxStub.mockReturnValue(vesselIdx);
          refreshRiskingStub.mockResolvedValue();
          const payload = {
            dataToValidate: mockStructureInRedis
          };

          await BlockingStatusModel.create({
            name: "CC_3c",
            status: true
          });
          await preApproveDocumentFromMongo(mockStructureInRedis.documentNumber, "Bob");
          await generateOnlineValidationReport(payload);

          const result = await FailedOnlineCertificates.findOne({ documentNumber: "FAILING 3C CERTIFICATE" }).lean();

          expect(result).toEqual(null);
        });
      });

      describe("When the document has been pre approved but it is out of date", () => {
        it('will return the validation report', async () => {
          const allCatchCerts = [
            {
              "_id": "5db041d79df195bd1cfda7a8",
              "__t": "catchCert",
              "documentNumber": "CC1",
              "createdAt": "2019-07-10T08:26:06.939Z",
              "exportData":
              {
                "exporterDetails": {
                  "contactId": "some-contact-id",
                  "accountId": "some-account-id",
                  "exporterFullName": "Private",
                  "exporterCompanyName": "Private",
                  "addressOne": "Building and street",
                  "addressTwo": "Building 2 and street name",
                  "townCity": "London",
                  "postcode": "AB1 2XX"
                },
                "products": [
                  {
                    "speciesCode": "LBE",
                    "caughtBy": [
                      {
                        "vessel": "DAYBREAK", "pln": "WA1", "date": "2019-10-06", "weight": 50
                      }
                    ]
                  }]
              },
              "__v": 0
            }];

          const allLandings = [
            {
              "_id": "5db04725eb5385bd1c5aa7e8",
              "rssNumber": "rssWA1",
              "dateTimeLanded": "2019-10-06T00:00:00.000Z",
              "items": [
                {
                  "_id": "5db04725eb5385bd1c5aa7e9",
                  "species": "HER",
                  "weight": 50,
                  "factor": 1
                }
              ],
              "dateTimeRetrieved": "2019-10-23T12:27:17.000Z",
              "source": "",
              "__v": 0
            }
          ];

          const mockStructureInRedis =
          {
            "documentNumber": "FAILING CERTIFICATE",
            "exportPayload": {
              "items": [
                {
                  "product": {
                    "id": "55e627af-90d5-4046-9b45-16c269700fde",
                    "commodityCode": "1234",
                    "presentation": {
                      "code": "FIS",
                      "label": "Filleted and skinned"
                    },
                    "state": {
                      "code": "BAD",
                      "label": "Fresh"
                    },
                    "species": {
                      "code": "LBE",
                      "label": "Lobster",
                      "admin": "ADMIN Species"
                    }
                  },
                  "landings": [
                    {
                      "model": {
                        "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                        "vessel": {
                          "pln": "WA1",
                          "vesselName": "DAYBREAK",
                          "flag": "GBR",
                          "homePort": "IJMUIDEN",
                          "licenceNumber": "11957",
                          "imoNumber": 8707537,
                          "licenceValidTo": "2382-12-31T00:00:00",
                          "rssNumber": "rssWA1",
                          "vesselLength": 113.97,
                          "label": "DAYBREAK (WA1)",
                          "domId": "CORNELISVROLIJKFZN-H171"
                        },
                        "dateLanded": "2019-10-06T00:00:00.000Z",
                        "exportWeight": 80,
                        "faoArea": "FAO27",
                        "numberOfSubmissions": 0
                      }
                    }
                  ]
                }
              ]
            },
            "exporter": {
              "exporterFullName": 'Mr Bob',
              "contactId": "some-contact-id",
              "accountId": "some-account-id"
            }

          };


          const payload = {
            dataToValidate: mockStructureInRedis
          };

          const catchCert = new DocumentModel({
            __t: "catchCert",
            status: "DRAFT",
            documentNumber: "FAILING CERTIFICATE",
            createdAt: "2019-10-19T00:00:00.000Z",
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            exportData: {
              products: [
                {
                  speciesCode: "LBE",
                  caughtBy: [{ vessel: "DAYBREAK", pln: "WA1", date: "2019-10-06T00:00:00.000Z", weight: 78 }]
                }],
              exporterDetails: { 'exporterCompanyName': 'Mr Bob' }
            }
          });
          await catchCert.save();

          await preApproveDocumentFromMongo(mockStructureInRedis.documentNumber, "Bob");

          await modifyCertificate("FAILING CERTIFICATE")


          await BlockingStatusModel.create({
            name: "CC_3c",
            status: true
          });

          // @ts-expect-error correct type not required
          getCatchCertsStub.mockResolvedValue(allCatchCerts);
          getLandingsStub.mockResolvedValue(allLandings);
          getVesselIdxStub.mockReturnValue(vesselIdx);
          refreshRiskingStub.mockResolvedValue();
          const result = await generateOnlineValidationReport(payload);

          const expectedResult: any = {
            report: [{
              species: 'LBE',
              presentation: 'FIS',
              state: 'BAD',
              failures: [ValidationRules.THREE_C],
              vessel: "DAYBREAK",
              date: moment.utc("2019-10-06T00:00:00.000Z").toDate()
            }],
            rawData: [{
              "createdAt": expect.any(String),
              "da": "England",
              "dateLanded": "2019-10-06",
              "documentNumber": "FAILING CERTIFICATE",
              "documentType": "catchCertificate",
              "durationBetweenCertCreationAndFirstLandingRetrieved": expect.any(String),
              "durationBetweenCertCreationAndLastLandingRetrieved": expect.any(String),
              "durationSinceCertCreation": expect.any(String),
              "extended": {
                "dataEverExpected": false,
                "commodityCode": "1234",
                "exporterContactId": "some-contact-id",
                "exporterAccountId": "some-account-id",
                "exporterCompanyName": undefined,
                "presentationName": "Filleted and skinned",
                "stateName": "Fresh",
                "exporterName": "Mr Bob",
                "fao": "FAO27",
                "investigation": undefined,
                "landingId": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                "licenceValidTo": "2100-12-20",
                "licenceHolder": "Mr Doe",
                "pln": "WA1",
                "preApprovedBy": undefined,
                "presentation": "FIS",
                "species": "Lobster",
                "speciesAdmin": "ADMIN Species",
                "state": "BAD",
                "url": undefined,
                "vessel": "DAYBREAK",
                "voidedBy": undefined,
                "numberOfSubmissions": 1,
                "speciesOverriddenByAdmin": true,
              },
              "isLandingExists": true,
              "isOverusedAllCerts": false,
              "isOverusedThisCert": false,
              "isExceeding14DayLimit": false,
              "isPreApproved": false,
              "overUsedInfo": [],
              "isSpeciesExists": false,
              "numberOfLandingsOnDay": 1,
              "rawWeightOnCert": 80,
              "rssNumber": "rssWA1",
              "species": "LBE",
              "status": "BLOCKED",
              "speciesAlias": "N",
              "source": "",
              "weightFactor": 1,
              "weightOnAllCerts": 130,
              "weightOnAllCertsAfter": 130,
              "weightOnAllCertsBefore": 50,
              "weightOnCert": 80,
              "weightOnLanding": 0,
              "weightOnLandingAllSpecies": 50,
              "firstDateTimeLandingDataRetrieved": "2019-10-23T12:27:17.000Z",
            }]
          }

          expect(result).toEqual(expectedResult);
        });

        it('will  persist the failed certificate', async () => {
          const allCatchCerts = [
            {
              "_id": "5db041d79df195bd1cfda7a8",
              "__t": "catchCert",
              "documentNumber": "CC1",
              "createdAt": "2019-07-10T08:26:06.939Z",
              "exportData":
              {
                "products": [
                  {
                    "speciesCode": "LBE",
                    "caughtBy": [
                      {
                        "vessel": "DAYBREAK", "pln": "WA1", "date": "2019-10-06", "weight": 50
                      }
                    ]
                  }]
              },
              "__v": 0
            }];

          const allLandings = [
            {
              "_id": "5db04725eb5385bd1c5aa7e8",
              "rssNumber": "rssWA1",
              "dateTimeLanded": "2019-10-06T00:00:00.000Z",
              "items": [
                {
                  "_id": "5db04725eb5385bd1c5aa7e9",
                  "species": "HER",
                  "weight": 50,
                  "factor": 1
                }
              ],
              "dateTimeRetrieved": "2019-10-23T12:27:17.000Z",
              "source": "",
              "__v": 0
            }
          ];

          const mockStructureInRedis =
          {
            "documentNumber": "FAILING 3C CERTIFICATE",
            "exportPayload": {
              "items": [
                {
                  "product": {
                    "id": "55e627af-90d5-4046-9b45-16c269700fde",
                    "commodityCode": "1234",
                    "presentation": {
                      "code": "FIS",
                      "label": "Filleted and skinned"
                    },
                    "state": {
                      "code": "BAD",
                      "label": "Fresh"
                    },
                    "species": {
                      "code": "LBE",
                      "label": "Lobster"
                    }
                  },
                  "landings": [
                    {
                      "model": {
                        "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                        "vessel": {
                          "pln": "WA1",
                          "vesselName": "DAYBREAK",
                          "flag": "GBR",
                          "homePort": "IJMUIDEN",
                          "licenceNumber": "11957",
                          "imoNumber": 8707537,
                          "licenceValidTo": "2382-12-31T00:00:00",
                          "rssNumber": "rssWA1",
                          "vesselLength": 113.97,
                          "label": "DAYBREAK (WA1)",
                          "domId": "CORNELISVROLIJKFZN-H171"
                        },
                        "dateLanded": "2019-10-06T00:00:00.000Z",
                        "exportWeight": 78,
                        "faoArea": "FAO27"
                      }
                    }
                  ]
                }
              ]
            },
            "exporter": {
              "exporterFullName": 'Mr Bob',
            }

          };

          // @ts-expect-error correct type not required
          getCatchCertsStub.mockResolvedValue(allCatchCerts);
          getLandingsStub.mockResolvedValue(allLandings);
          getVesselIdxStub.mockReturnValue(vesselIdx);
          refreshRiskingStub.mockResolvedValue();
          const payload = {
            dataToValidate: mockStructureInRedis
          };

          await BlockingStatusModel.create({
            name: "CC_3c",
            status: true
          });

          const catchCert = new DocumentModel({
            __t: "catchCert",
            status: "DRAFT",
            documentNumber: "FAILING 3C CERTIFICATE",
            createdAt: "2019-10-19T00:00:00.000Z",
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            exportData: {
              products: [
                {
                  speciesCode: "LBE",
                  caughtBy: [{ vessel: "DAYBREAK", pln: "WA1", date: "2019-10-06T00:00:00.000Z", weight: 78 }]
                }],
              exporterDetails: { 'exporterCompanyName': 'Mr Bob' }
            }
          });
          await catchCert.save();

          await preApproveDocumentFromMongo(mockStructureInRedis.documentNumber, "Bob");

          await modifyCertificate("FAILING 3C CERTIFICATE")

          await generateOnlineValidationReport(payload);

          const result = await FailedOnlineCertificates.findOne({ documentNumber: "FAILING 3C CERTIFICATE" }).lean();

          expect(result?.documentNumber).toEqual("FAILING 3C CERTIFICATE");
        });
      });
    });

    describe("When all CC system blocks are turned off", () => {
      let mockGetCCOnlineValidationReport;

      beforeEach(() => {
        mockGetCCOnlineValidationReport = jest.spyOn(onlineReports, 'getCatchCertificateOnlineValidationReport');
      });

      afterEach(() => {
        mockGetCCOnlineValidationReport.mockRestore();
      });

      it('will set the status as COMPLETE', async () => {
        await FailedOnlineCertificates.deleteMany({});

        const allCatchCerts = [];

        const allLandings = [];

        const mockStructureInRedis =
        {
          "documentNumber": "ONLINE CERTIFICATE",
          "exportPayload": {
            "items": [
              {
                "product": {
                  "id": "55e627af-90d5-4046-9b45-16c269700fde",
                  "commodityCode": "1234",
                  "presentation": {
                    "code": "FIS",
                    "label": "Filleted and skinned"
                  },
                  "state": {
                    "code": "BAD",
                    "label": "Fresh"
                  },
                  "species": {
                    "code": "LBE",
                    "label": "Lobster"
                  }
                },
                "landings": [
                  {
                    "model": {
                      "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                      "vessel": {
                        "pln": "WA1",
                        "vesselName": "DAYBREAK",
                        "flag": "GBR",
                        "homePort": "IJMUIDEN",
                        "licenceNumber": "11957",
                        "imoNumber": 8707537,
                        "licenceValidTo": "2382-12-31T00:00:00",
                        "rssNumber": "C19669",
                        "vesselLength": 113.97,
                        "label": "DAYBREAK (WA1)",
                        "domId": "CORNELISVROLIJKFZN-H171"
                      },
                      "dateLanded": "2019-10-06T00:00:00.000Z",
                      "exportWeight": 78,
                      "faoArea": "FAO27"
                    }
                  }
                ]
              }
            ]
          },
          "exporter": {
            "exporterFullName": 'Mr Bob',
          }

        };

        const payload = {
          dataToValidate: mockStructureInRedis
        };

        mockGetCCOnlineValidationReport.mockReturnValue([{
          "species": "LBE",
          "presentation": "FIS",
          "state": "BAD",
          "date": "2019-07-11T00:00:00.000Z",
          "vessel": "DAYBREAK",
          "failures": [
            "4A"
          ]
        }
        ]);

        await BlockingStatusModel.create({
          name: "CC_3c",
          status: false
        });

        await BlockingStatusModel.create({
          name: "CC_3d",
          status: false
        });

        await BlockingStatusModel.create({
          name: "CC_4a",
          status: false
        });

        await BlockingStatusModel.create({
          name: "PS_SD_4b",
          status: true
        });

        getCatchCertsStub.mockResolvedValue(allCatchCerts);
        getLandingsStub.mockResolvedValue(allLandings);
        getVesselIdxStub.mockReturnValue(vesselIdx);
        refreshRiskingStub.mockResolvedValue();
        const response = await generateOnlineValidationReport(payload);

        const result = await FailedOnlineCertificates.findOne({ documentNumber: "ONLINE CERTIFICATE" }).lean();

        expect(result).toEqual(null);
        expect(response.rawData.every(queryRes => queryRes.status === "COMPLETE")).toBeTruthy();
      });
    });
  });

  describe('When certificate is valid', () => {

    let mockGetTotalRiskScore;

    beforeEach(() => {
      mockGetTotalRiskScore = jest.spyOn(isHighRisk, 'getTotalRiskScore');
      mockGetTotalRiskScore.mockReturnValue(1.2);
    });

    afterEach(() => {
      mockGetTotalRiskScore.mockRestore();
    });

    describe('When the application is High Risk', () => {

      let mockIsHighRisk;
      let mockIsLegallyDue;
      let mockRunUpdateForLandings;

      beforeAll(() => {
        mockIsHighRisk = jest.spyOn(isHighRisk, 'isHighRisk');
        mockIsHighRisk.mockReturnValue(true);

        mockIsLegallyDue = jest.spyOn(isLegallyDue, 'isLegallyDue');
        mockIsLegallyDue.mockReturnValue(false);

        mockRunUpdateForLandings = jest.spyOn(ccQuery, 'runUpdateForLandings');
        mockRunUpdateForLandings.mockResolvedValue(undefined);
      });

      afterAll(() => {
        mockIsHighRisk.mockRestore();
        mockIsLegallyDue.mockRestore();
        mockRunUpdateForLandings.mockRestore();
      });

      it('will not save the certificate', async () => {

        await FailedOnlineCertificates.deleteMany({});

        const allCatchCerts = [];

        const allLandings = [{
          "_id": "5db04725eb5385bd1c5aa7e8",
          "rssNumber": "rssWA1",
          "dateTimeLanded": "2019-10-06T00:00:00.000Z",
          "items": [
            {
              "_id": "5db04725eb5385bd1c5aa7e9",
              "species": "LBE",
              "weight": 78,
              "factor": 1
            }
          ],
          "dateTimeRetrieved": "2019-10-23T12:27:17.000Z",
          "source": "",
          "__v": 0
        }];

        const mockStructureInRedis =
        {
          "documentNumber": "ONLINE CERTIFICATE",
          "exportPayload": {
            "items": [
              {
                "product": {
                  "id": "55e627af-90d5-4046-9b45-16c269700fde",
                  "commodityCode": "1234",
                  "commodityCodeDescription": "some commodity code description",
                  "presentation": {
                    "code": "FIS",
                    "label": "Filleted and skinned"
                  },
                  "scientificName": "some scientific name",
                  "state": {
                    "code": "BAD",
                    "label": "Fresh"
                  },
                  "species": {
                    "code": "LBE",
                    "label": "Lobster"
                  }
                },
                "landings": [
                  {
                    "model": {
                      "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                      "vessel": {
                        "pln": "WA1",
                        "vesselName": "DAYBREAK",
                        "flag": "GBR",
                        "homePort": "IJMUIDEN",
                        "licenceNumber": "11957",
                        "imoNumber": 8707537,
                        "licenceValidTo": "2382-12-31T00:00:00",
                        "rssNumber": "C19669",
                        "vesselLength": 113.97,
                        "label": "DAYBREAK (WA1)",
                        "domId": "CORNELISVROLIJKFZN-H171"
                      },
                      "dateLanded": "2019-10-06T00:00:00.000Z",
                      "exportWeight": 78,
                      "faoArea": "FAO27"
                    }
                  }
                ]
              }
            ]
          },
          "exporter": {
            "exporterFullName": 'Mr Bob',
          }

        };

        const payload = {
          dataToValidate: mockStructureInRedis
        };

        getCatchCertsStub.mockResolvedValue(allCatchCerts);
        getLandingsStub.mockResolvedValue(allLandings);
        getVesselIdxStub.mockReturnValue(vesselIdx);
        refreshRiskingStub.mockResolvedValue();
        const response = await generateOnlineValidationReport(payload);

        const result = await FailedOnlineCertificates.findOne({ documentNumber: "ONLINE CERTIFICATE" }).lean();

        expect(result).toEqual(null);
        expect(response.rawData.every(queryRes => queryRes.status === "COMPLETE")).toBeTruthy();
      });

    });

    describe('When the application is Legally due', () => {
      let mockIsHighRisk;
      let mockIsLegallyDue;
      let mockRunUpdateForLandings;

      beforeEach(() => {
        mockIsHighRisk = jest.spyOn(isHighRisk, 'isHighRisk');
        mockIsHighRisk.mockReturnValue(false);

        mockIsLegallyDue = jest.spyOn(isLegallyDue, 'isLegallyDue');
        mockIsLegallyDue.mockReturnValue(true);

        mockRunUpdateForLandings = jest.spyOn(ccQuery, 'runUpdateForLandings');
        mockRunUpdateForLandings.mockResolvedValue(undefined);
      });

      afterEach(() => {
        mockIsHighRisk.mockRestore();
        mockIsLegallyDue.mockRestore();
        mockRunUpdateForLandings.mockRestore();
      });

      it('will not save the certificate', async () => {

        await FailedOnlineCertificates.deleteMany({});

        const allCatchCerts = [];

        const allLandings = [];

        const mockStructureInRedis =
        {
          "documentNumber": "ONLINE CERTIFICATE",
          "exportPayload": {
            "items": [
              {
                "product": {
                  "id": "55e627af-90d5-4046-9b45-16c269700fde",
                  "commodityCode": "1234",
                  "commodityCodeDescription": "some commodity code description",
                  "presentation": {
                    "code": "FIS",
                    "label": "Filleted and skinned"
                  },
                  "scientificName": "some scientific name",
                  "state": {
                    "code": "BAD",
                    "label": "Fresh"
                  },
                  "species": {
                    "code": "LBE",
                    "label": "Lobster"
                  }
                },
                "landings": [
                  {
                    "model": {
                      "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                      "vessel": {
                        "pln": "WA1",
                        "vesselName": "DAYBREAK",
                        "flag": "GBR",
                        "homePort": "IJMUIDEN",
                        "licenceNumber": "11957",
                        "imoNumber": 8707537,
                        "licenceValidTo": "2382-12-31T00:00:00",
                        "rssNumber": "C19669",
                        "vesselLength": 113.97,
                        "label": "DAYBREAK (WA1)",
                        "domId": "CORNELISVROLIJKFZN-H171"
                      },
                      "dateLanded": "2019-10-06T00:00:00.000Z",
                      "exportWeight": 78,
                      "faoArea": "FAO27"
                    }
                  }
                ]
              }
            ]
          },
          "exporter": {
            "exporterFullName": 'Mr Bob',
          }

        };

        const payload = {
          dataToValidate: mockStructureInRedis
        };

        getCatchCertsStub.mockResolvedValue(allCatchCerts);
        getLandingsStub.mockResolvedValue(allLandings);
        getVesselIdxStub.mockReturnValue(vesselIdx);
        refreshRiskingStub.mockResolvedValue();
        const response = await generateOnlineValidationReport(payload);

        const result = await FailedOnlineCertificates.findOne({ documentNumber: "ONLINE CERTIFICATE" }).lean();

        expect(result).toEqual(null);
        expect(response.rawData.every(queryRes => queryRes.status === "COMPLETE")).toBeTruthy();
      });
    });

    describe('When the application affects the submisson of previous applications', () => {
      let mockReportCcLandingUpdate;

      beforeEach(() => {
        mockReportCcLandingUpdate = jest.spyOn(dataHub, 'reportCcLandingUpdate');
        mockReportCcLandingUpdate.mockResolvedValue(undefined);
      });

      afterEach(() => {
        mockReportCcLandingUpdate.mockRestore();
      });

      it('will report the update of landings for other CC documents', async () => {
        const previousCatchCert = new DocumentModel({
          __t: "catchCert",
          status: "DRAFT",
          documentNumber: "ONLINE CERTIFICATE 2",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products: [
              {
                speciesId: "55e627af-90d5-4046-9b45-16c269700fde",
                species: "Lobster (LBE)",
                speciesCode: "LBE",
                commodityCode: "1234",
                commodityCodeDescription: "some commodity code description",
                scientificName: "some scientific name",
                state: {
                  code: "BAD",
                  name: "Fresh"
                },
                presentation: {
                  code: "WHL",
                  name: "Whole"
                },
                factor: 1,
                caughtBy: [
                  {
                    vessel: "DAYBREAK",
                    pln: "WA1",
                    homePort: "IJMUIDEN",
                    flag: "GBR",
                    cfr: "NLD200202641",
                    imoNumber: 8707537,
                    licenceNumber: "11957",
                    licenceValidTo: "2382-12-31T00:00:00",
                    licenceHolder: "INTERFISH WIRONS LIMITED",
                    id: "ONLINE CERTIFICATE-7679944432",
                    date: "2019-10-06",
                    faoArea: "FAO27",
                    weight: 78,
                    numberOfSubmissions: 1,
                    isLegallyDue: true,
                    dataEverExpected: true,
                    landingDataExpectedDate: "2024-02-20",
                    landingDataEndDate: "2024-03-05",
                    _status: "PENDING_LANDING_DATA"
                  }
                ]
              }
            ]
          }
        });

        await previousCatchCert.save();

        const catchCert = new DocumentModel({
          __t: "catchCert",
          status: "DRAFT",
          documentNumber: "ONLINE CERTIFICATE",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products: [
              {
                speciesId: "55e627af-90d5-4046-9b45-16c269700fde",
                species: "Lobster (LBE)",
                speciesCode: "LBE",
                commodityCode: "1234",
                commodityCodeDescription: "some commodity code description",
                scientificName: "some scientific name",
                state: {
                  code: "BAD",
                  name: "Fresh"
                },
                presentation: {
                  code: "WHL",
                  name: "Whole"
                },
                factor: 1,
                caughtBy: [
                  {
                    vessel: "DAYBREAK",
                    pln: "WA1",
                    homePort: "IJMUIDEN",
                    flag: "GBR",
                    cfr: "NLD200202641",
                    imoNumber: 8707537,
                    licenceNumber: "11957",
                    licenceValidTo: "2382-12-31T00:00:00",
                    licenceHolder: "INTERFISH WIRONS LIMITED",
                    id: "ONLINE CERTIFICATE-7679944432",
                    date: "2019-10-06",
                    faoArea: "FAO27",
                    weight: 78,
                    numberOfSubmissions: 1,
                    isLegallyDue: true,
                    dataEverExpected: true,
                    landingDataExpectedDate: "2024-02-20",
                    landingDataEndDate: "2024-03-05"
                  }
                ]
              }
            ]
          }
        });

        await catchCert.save();

        const allCatchCerts = [{
          __t: "catchCert",
          status: "DRAFT",
          documentNumber: "ONLINE CERTIFICATE 2",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products: [
              {
                speciesId: "55e627af-90d5-4046-9b45-16c269700fde",
                species: "Lobster (LBE)",
                speciesCode: "LBE",
                commodityCode: "1234",
                commodityCodeDescription: "some commodity code description",
                scientificName: "some scientific name",
                state: {
                  code: "BAD",
                  name: "Fresh"
                },
                presentation: {
                  code: "WHL",
                  name: "Whole"
                },
                factor: 1,
                caughtBy: [
                  {
                    vessel: "DAYBREAK",
                    pln: "WA1",
                    homePort: "IJMUIDEN",
                    flag: "GBR",
                    cfr: "NLD200202641",
                    imoNumber: 8707537,
                    licenceNumber: "11957",
                    licenceValidTo: "2382-12-31T00:00:00",
                    licenceHolder: "INTERFISH WIRONS LIMITED",
                    id: "ONLINE CERTIFICATE-7679944432",
                    date: "2019-10-06",
                    faoArea: "FAO27",
                    weight: 78,
                    numberOfSubmissions: 1,
                    isLegallyDue: true,
                    dataEverExpected: true,
                    landingDataExpectedDate: "2024-02-20",
                    landingDataEndDate: "2024-03-05",
                    _status: "PENDING_LANDING_DATA"
                  }
                ]
              }
            ]
          }
        }];

        const allLandings = [{
          "_id": "5db04725eb5385bd1c5aa7e8",
          "rssNumber": "rssWA1",
          "dateTimeLanded": "2019-10-06T00:00:00.000Z",
          "items": [
            {
              "_id": "5db04725eb5385bd1c5aa7e9",
              "species": "LBE",
              "weight": 78,
              "factor": 1
            }
          ],
          "dateTimeRetrieved": "2019-10-23T12:27:17.000Z",
          "source": "",
          "__v": 0
        }];

        const mockStructureInRedis =
        {
          "documentNumber": "ONLINE CERTIFICATE",
          "exportPayload": {
            "items": [
              {
                "product": {
                  "id": "55e627af-90d5-4046-9b45-16c269700fde",
                  "commodityCode": "1234",
                  "commodityCodeDescription": "some commodity code description",
                  "presentation": {
                    "code": "FIS",
                    "label": "Filleted and skinned"
                  },
                  "scientificName": "some scientific name",
                  "state": {
                    "code": "BAD",
                    "label": "Fresh"
                  },
                  "species": {
                    "code": "LBE",
                    "label": "Lobster"
                  }
                },
                "landings": [
                  {
                    "model": {
                      "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                      "vessel": {
                        "pln": "WA1",
                        "vesselName": "DAYBREAK",
                        "flag": "GBR",
                        "homePort": "IJMUIDEN",
                        "licenceNumber": "11957",
                        "imoNumber": 8707537,
                        "licenceValidTo": "2382-12-31T00:00:00",
                        "rssNumber": "C19669",
                        "vesselLength": 113.97,
                        "label": "DAYBREAK (WA1)",
                        "domId": "CORNELISVROLIJKFZN-H171"
                      },
                      "dateLanded": "2019-10-06T00:00:00.000Z",
                      "exportWeight": 78,
                      "faoArea": "FAO27"
                    }
                  }
                ]
              }
            ]
          },
          "exporter": {
            "exporterFullName": 'Mr Bob',
          }

        };

        const payload = {
          dataToValidate: mockStructureInRedis
        };

        // @ts-expect-error correct type not required
        getCatchCertsStub.mockResolvedValue(allCatchCerts);
        getLandingsStub.mockResolvedValue(allLandings);
        getVesselIdxStub.mockReturnValue(vesselIdx);
        refreshRiskingStub.mockResolvedValue();
        await generateOnlineValidationReport(payload);

        expect(mockReportCcLandingUpdate).toHaveBeenCalled();
      });
    });

  });

  describe('When extracting landings from a CC to be able to get all landings', () => {

    it('will collate all landings in a single list', () => {

      const catchCertificates = [
        { pln: "WA1", dateLanded: "2015-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true },
        { pln: "WA1", dateLanded: "2014-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true },
        { pln: "WA2", dateLanded: "2019-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true },
        { pln: "WA3", dateLanded: "2018-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true },
        { pln: "WA4", dateLanded: "2017-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true }
      ];

      const expectedResult = [
        { rssNumber: "rssWA1", dateLanded: "2015-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true },
        { rssNumber: "rssWA1", dateLanded: "2014-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true },
        { rssNumber: "rssWA2", dateLanded: "2019-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true },
        { rssNumber: "rssWA3", dateLanded: "2018-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true },
        { rssNumber: "rssWA4", dateLanded: "2017-10-06", createdAt: "2020-09-26T08:26:06.939Z", landingDataEndDate: "2020-10-01", landingDataExpectedDate: "2020-09-26", dataEverExpected: true }
      ];

      getVesselIdxStub.mockReturnValue(vesselIdx);

      const result = mapPlnLandingsToRssLandings(catchCertificates);

      expect(result).toEqual(expectedResult);

    });

    it('will remove all landings for which landing data is not expected', () => {

      const catchCertificates = [
        { pln: "WA1", dateLanded: "2015-10-06", createdAt: "2020-09-26T08:26:06.939Z", dataEverExpected: false },
        { pln: "WA1", dateLanded: "2014-10-06", createdAt: "2020-09-26T08:26:06.939Z", dataEverExpected: false, isLegallyDue: true },
        { pln: "WA2", dateLanded: "2019-10-06", createdAt: "2020-09-26T08:26:06.939Z", dataEverExpected: true, landingDataExpectedDate: "3020-09-27", landingDataEndDate: "3020-09-28", isLegallyDue: true },
        { pln: "WA3", dateLanded: "2018-10-06", createdAt: "2020-09-26T08:26:06.939Z", dataEverExpected: true, landingDataExpectedDate: "2020-09-27", landingDataEndDate: "2020-09-28" },
        { pln: "WA4", dateLanded: "2017-10-06", createdAt: "2020-09-26T08:26:06.939Z" }
      ];

      const expectedResult = [
        { rssNumber: "rssWA2", dateLanded: "2019-10-06", createdAt: "2020-09-26T08:26:06.939Z", dataEverExpected: true, isLegallyDue: true, landingDataExpectedDate: "3020-09-27", landingDataEndDate: "3020-09-28" },
        { rssNumber: "rssWA3", dateLanded: "2018-10-06", createdAt: "2020-09-26T08:26:06.939Z", dataEverExpected: true, landingDataExpectedDate: "2020-09-27", landingDataEndDate: "2020-09-28" },
        { rssNumber: "rssWA4", dateLanded: "2017-10-06", createdAt: "2020-09-26T08:26:06.939Z" }
      ];

      getVesselIdxStub.mockReturnValue(vesselIdx);

      const result = mapPlnLandingsToRssLandings(catchCertificates);

      expect(result).toEqual(expectedResult);

    });
  });

  describe('When extracting landings from a CC to be able to get all catch certs', () => {
    it('will collate all landings in a single list', () => {
      const catchCertificate = {
        "documentNumber": "CC1",
        "exportData": {
          "products": [
            {
              "speciesCode": "LBE",
              "species": "Lobster",
              "commodityCode": "1234",
              "commodityCodeDescription": "some commodity code description",
              "scientificName": "some scientific name",
              "state": {
                "code": "BAD"
              },
              "caughtBy": [
                { "vessel": "TEST1", "pln": "WA1", "date": "2015-10-06", "weight": 78 },
                { "vessel": "TEST1", "pln": "WA1", "date": "2014-10-06", "weight": 212 }
              ]
            }, {
              "speciesCode": "LBE",
              "species": "Lobster",
              "commodityCode": "1234",
              "state": {
                "code": "BAD"
              },
              "caughtBy": [
                { "vessel": "TEST2", "pln": "WA2", "date": "2019-10-06", "weight": 100 },
                { "vessel": "TEST3", "pln": "WA3", "date": "2018-10-06", "weight": 211 },
                { "vessel": "TEST4", "pln": "WA4", "date": "2017-10-06", "weight": 140 }
              ]
            }],
          "exporterDetails": { "exporterFullName": 'Mr Bob' }
        }
      };

      const expectedResult = [
        { pln: "WA1", dateLanded: "2015-10-06" },
        { pln: "WA1", dateLanded: "2014-10-06" },
        { pln: "WA2", dateLanded: "2019-10-06" },
        { pln: "WA3", dateLanded: "2018-10-06" },
        { pln: "WA4", dateLanded: "2017-10-06" }
      ]

      const result = getLandingsFromCatchCertificate(catchCertificate);

      expect(result).toEqual(expectedResult);
    });

    it('will include all landings that have an vesselOverriddenByAdmin flag when reporting new landings', () => {
      const catchCertificate = {
        "documentNumber": "CC1",
        "createdAt": "2020-09-26T08:26:06.939Z",
        "exportData": {
          "products": [
            {
              "speciesCode": "LBE",
              "species": "Lobster",
              "commodityCode": "1234",
              "commodityCodeDescription": "some commodity code description",
              "scientificName": "some scientific name",
              "state": {
                "code": "BAD"
              },
              "caughtBy": [
                { "vessel": "TEST1", "pln": "WA1", "date": "2015-10-06", "weight": 78, "vesselOverriddenByAdmin": true },
                { "vessel": "TEST1", "pln": "WA1", "date": "2014-10-06", "weight": 212 }
              ]
            }, {
              "speciesCode": "LBE",
              "species": "Lobster",
              "commodityCode": "1234",
              "state": {
                "code": "BAD"
              },
              "caughtBy": [
                { "vessel": "TEST2", "pln": "WA2", "date": "2019-10-06", "weight": 100, "vesselOverriddenByAdmin": true },
                { "vessel": "TEST3", "pln": "WA3", "date": "2018-10-06", "weight": 211 },
                { "vessel": "TEST4", "pln": "WA4", "date": "2017-10-06", "weight": 140 }
              ]
            }],
          "exporterDetails": { "exporterFullName": 'Mr Bob' }
        }
      };

      const expectedResult = [
        { pln: "WA1", dateLanded: "2015-10-06", createdAt: "2020-09-26T08:26:06.939Z" },
        { pln: "WA1", dateLanded: "2014-10-06", createdAt: "2020-09-26T08:26:06.939Z" },
        { pln: "WA2", dateLanded: "2019-10-06", createdAt: "2020-09-26T08:26:06.939Z" },
        { pln: "WA3", dateLanded: "2018-10-06", createdAt: "2020-09-26T08:26:06.939Z" },
        { pln: "WA4", dateLanded: "2017-10-06", createdAt: "2020-09-26T08:26:06.939Z" }
      ]

      const result = getLandingsFromCatchCertificate(catchCertificate, true);

      expect(result).toEqual(expectedResult);
    });

    it('will exclude all landings that have an vesselOverriddenByAdmin flag', () => {
      const catchCertificate = {
        "documentNumber": "CC1",
        "exportData": {
          "products": [
            {
              "speciesCode": "LBE",
              "species": "Lobster",
              "commodityCode": "1234",
              "commodityCodeDescription": "some commodity code description",
              "scientificName": "some scientific name",
              "state": {
                "code": "BAD"
              },
              "caughtBy": [
                { "vessel": "TEST1", "pln": "WA1", "date": "2015-10-06", "weight": 78, "vesselOverriddenByAdmin": true },
                { "vessel": "TEST1", "pln": "WA1", "date": "2014-10-06", "weight": 212 }
              ]
            }, {
              "speciesCode": "LBE",
              "species": "Lobster",
              "commodityCode": "1234",
              "state": {
                "code": "BAD"
              },
              "caughtBy": [
                { "vessel": "TEST2", "pln": "WA2", "date": "2019-10-06", "weight": 100, "vesselOverriddenByAdmin": true },
                { "vessel": "TEST3", "pln": "WA3", "date": "2018-10-06", "weight": 211 },
                { "vessel": "TEST4", "pln": "WA4", "date": "2017-10-06", "weight": 140 }
              ]
            }],
          "exporterDetails": { "exporterFullName": 'Mr Bob' }
        }
      };

      const expectedResult = [
        { pln: "WA1", dateLanded: "2014-10-06" },
        { pln: "WA3", dateLanded: "2018-10-06" },
        { pln: "WA4", dateLanded: "2017-10-06" }
      ]

      const result = getLandingsFromCatchCertificate(catchCertificate);

      expect(result).toEqual(expectedResult);
    });

    it('will exclude a single landing when it has a vesselOverriddenByAdmin flag', () => {
      const catchCertificate = {
        "documentNumber": "CC1",
        "exportData": {
          "products": [
            {
              "speciesCode": "LBE",
              "species": "Lobster",
              "commodityCode": "1234",
              "commodityCodeDescription": "some commodity code description",
              "scientificName": "some scientific name",
              "state": {
                "code": "BAD"
              },
              "caughtBy": [
                { "vessel": "TEST1", "pln": "WA1", "date": "2015-10-06", "weight": 78, "vesselOverriddenByAdmin": true }
              ]
            }],
          "exporterDetails": { "exporterFullName": 'Mr Bob' }
        }
      };

      const expectedResult = [];

      const result = getLandingsFromCatchCertificate(catchCertificate);

      expect(result).toEqual(expectedResult);
    });
  });
});

describe('When updating a landing within an online Catch Certificate', () => {

  const mockGetToLiveWeightFactor = () => 1;
  const landing = {
    id: "CC1-1",
    vessel: "WIRON 5",
    pln: "H1100",
    date: "some-date",
    faoArea: "FAO27",
    weight: 500,
    highSeasArea: "yes",
    rfmo: "General Fisheries Commission for the Mediterranean (GFCM)"
  };

  const product = {
    species: "Atlantic cod (COD)",
    speciesId: "CC1-976b1606-70b5-44d8-a4ba-ef2c81ac838a",
    speciesCode: "COD",
    commodityCode: "03025110",
    state: {
      code: "FRE",
      name: "Fresh"
    },
    presentation: {
      code: "WHL",
      name: "Whole"
    },
    factor: 1,
    caughtBy: [{
      ...landing
    }]
  };

  let mockIsHighRisk;

  beforeEach(() => {
    mockIsHighRisk = jest.spyOn(isHighRisk, 'isHighRisk');
    mockIsHighRisk.mockReturnValue(true);
  });

  afterEach(() => {
    mockIsHighRisk.mockRestore()
  });

  it('will place a _status of Has Landing Data', () => {

    const validation: ICcQueryResult = {
      documentNumber: "CC1",
      documentType: "catchCertificate",
      createdAt: "2020-09-25T11:43:51.869Z",
      status: "COMPLETE",
      extended: {
        exporterName: "Private",
        exporterCompanyName: "Private",
        exporterPostCode: "AB1 2XX",
        vessel: "WIRON 5",
        landingId: "CC1-1",
        pln: "H1100",
        fao: "FAO27",
        flag: "GBR",
        cfr: "GBRC1121091",
        presentation: "WHL",
        presentationName: "Whole",
        species: "Atlantic cod (COD)",
        state: "FRE",
        stateName: "Fresh",
        commodityCode: "03025110",
        transportationVehicle: "directLanding"
      },
      rssNumber: "C20514",
      da: "England",
      dateLanded: "2020-08-30",
      species: "COD",
      weightFactor: 1,
      weightOnCert: 500,
      rawWeightOnCert: 500,
      weightOnAllCerts: 500,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 500,
      isLandingExists: true,
      isExceeding14DayLimit: false,
      source: "LANDING_DECLARATION",
      weightOnLandingAllSpecies: 1000,
      numberOfLandingsOnDay: 1,
      durationBetweenCertCreationAndFirstLandingRetrieved: "-PT0.011S",
      durationBetweenCertCreationAndLastLandingRetrieved: "-PT0.011S",
      isSpeciesExists: true,
      weightOnLanding: 1000,
      landingTotalBreakdown: [
        {
          presentation: "WHL",
          state: "FRE",
          source: "LANDING_DECLARATION",
          isEstimate: false,
          factor: 1,
          weight: 1000,
          liveWeight: 1000
        }
      ],
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
      overUsedInfo: [],
      durationSinceCertCreation: "PT0.009S"
    };

    const result = mapLandingWithLandingStatus(product, validation, mockGetToLiveWeightFactor);

    expect(result.caughtBy?.[0]._status).toEqual(LandingStatus.Complete);
  });

  it('will place a _status of Has Landing Data for eLogs', () => {

    const validation: ICcQueryResult = {
      documentNumber: "CC1",
      documentType: "catchCertificate",
      createdAt: "2020-09-25T11:43:51.869Z",
      status: "COMPLETE",
      extended: {
        exporterName: "Private",
        exporterCompanyName: "Private",
        exporterPostCode: "AB1 2XX",
        vessel: "WIRON 5",
        landingId: "CC1-1",
        pln: "H1100",
        fao: "FAO27",
        flag: "GBR",
        cfr: "GBRC1121091",
        presentation: "WHL",
        presentationName: "Whole",
        species: "Atlantic cod (COD)",
        state: "FRE",
        stateName: "Fresh",
        commodityCode: "03025110",
        transportationVehicle: "directLanding"
      },
      rssNumber: "C20514",
      da: "England",
      dateLanded: "2020-08-30",
      species: "COD",
      weightFactor: 1,
      weightOnCert: 500,
      rawWeightOnCert: 500,
      weightOnAllCerts: 500,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 500,
      isExceeding14DayLimit: false,
      isLandingExists: true,
      source: "ELOG",
      weightOnLandingAllSpecies: 1000,
      numberOfLandingsOnDay: 1,
      durationBetweenCertCreationAndFirstLandingRetrieved: "-PT0.011S",
      durationBetweenCertCreationAndLastLandingRetrieved: "-PT0.011S",
      isSpeciesExists: true,
      weightOnLanding: 1000,
      landingTotalBreakdown: [
        {
          presentation: "WHL",
          state: "FRE",
          source: "ELOG",
          isEstimate: false,
          factor: 1,
          weight: 1000,
          liveWeight: 1000
        }
      ],
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
      overUsedInfo: [],
      durationSinceCertCreation: "PT0.009S"
    }

    const result = mapLandingWithLandingStatus(product, validation, mockGetToLiveWeightFactor);

    expect(result.caughtBy?.[0]._status).toEqual(LandingStatus.Complete);

  });

  it('will place a _status of elog species mismatch for eLogs failures within thier deminimus', () => {

    const validation: ICcQueryResult = {
      documentNumber: "CC1",
      documentType: "catchCertificate",
      createdAt: "2020-09-25T11:43:51.869Z",
      status: "COMPLETE",
      extended: {
        exporterName: "Private",
        exporterCompanyName: "Private",
        exporterPostCode: "AB1 2XX",
        vessel: "WIRON 5",
        landingId: "CC1-1",
        pln: "H1100",
        fao: "FAO27",
        flag: "GBR",
        cfr: "GBRC1121091",
        presentation: "WHL",
        presentationName: "Whole",
        species: "Atlantic cod (COD)",
        state: "FRE",
        stateName: "Fresh",
        commodityCode: "03025110",
        transportationVehicle: "directLanding"
      },
      rssNumber: "C20514",
      da: "England",
      dateLanded: "2020-08-30",
      species: "COD",
      weightFactor: 1,
      weightOnCert: 50,
      rawWeightOnCert: 50,
      weightOnAllCerts: 50,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 500,
      isExceeding14DayLimit: false,
      isLandingExists: true,
      source: "ELOG",
      weightOnLandingAllSpecies: 1000,
      numberOfLandingsOnDay: 1,
      durationBetweenCertCreationAndFirstLandingRetrieved: "-PT0.011S",
      durationBetweenCertCreationAndLastLandingRetrieved: "-PT0.011S",
      isSpeciesExists: false,
      weightOnLanding: 1000,
      landingTotalBreakdown: [
        {
          presentation: "WHL",
          state: "FRE",
          source: "ELOG",
          isEstimate: false,
          factor: 1,
          weight: 1000,
          liveWeight: 1000
        }
      ],
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
      overUsedInfo: [],
      durationSinceCertCreation: "PT0.009S"
    }

    const result = mapLandingWithLandingStatus(product, validation, mockGetToLiveWeightFactor);

    expect(result.caughtBy?.[0]._status).toEqual(LandingStatus.Elog);

  });

  it('will place a _status of Pending Landing for a landing where an overuse has occured', () => {

    const validation: ICcQueryResult = {
      documentNumber: "CC1",
      documentType: "catchCertificate",
      createdAt: "2020-09-25T11:43:51.869Z",
      status: "COMPLETE",
      extended: {
        exporterName: "Private",
        exporterCompanyName: "Private",
        exporterPostCode: "AB1 2XX",
        vessel: "WIRON 5",
        landingId: "CC1-1",
        pln: "H1100",
        fao: "FAO27",
        flag: "GBR",
        cfr: "GBRC1121091",
        presentation: "WHL",
        presentationName: "Whole",
        species: "Atlantic cod (COD)",
        state: "FRE",
        stateName: "Fresh",
        commodityCode: "03025110",
        transportationVehicle: "directLanding"
      },
      rssNumber: "C20514",
      da: "England",
      dateLanded: "2020-08-30",
      species: "COD",
      weightFactor: 1,
      weightOnCert: 500,
      rawWeightOnCert: 500,
      weightOnAllCerts: 500,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 500,
      isLandingExists: true,
      isExceeding14DayLimit: false,
      source: "LANDING_DECLARATION",
      weightOnLandingAllSpecies: 1000,
      numberOfLandingsOnDay: 1,
      durationBetweenCertCreationAndFirstLandingRetrieved: "-PT0.011S",
      durationBetweenCertCreationAndLastLandingRetrieved: "-PT0.011S",
      isSpeciesExists: true,
      weightOnLanding: 1000,
      landingTotalBreakdown: [
        {
          presentation: "WHL",
          state: "FRE",
          source: "LANDING_DECLARATION",
          isEstimate: false,
          factor: 1,
          weight: 1000,
          liveWeight: 1000
        }
      ],
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
      overUsedInfo: [],
      durationSinceCertCreation: "PT0.009S"
    };

    const result = mapLandingWithLandingStatus(product, validation, mockGetToLiveWeightFactor);

    expect(result.caughtBy?.[0]._status).toEqual(LandingStatus.Complete);
  });

  it('will place a status of pending landing data for ignored landings', () => {

    const validation: ICcQueryResult = {
      documentNumber: "CC1",
      documentType: "catchCertificate",
      createdAt: "2020-09-25T11:43:51.869Z",
      status: "COMPLETE",
      extended: {
        exporterName: "Private",
        exporterCompanyName: "Private",
        exporterPostCode: "AB1 2XX",
        vessel: "ADMIN UPDATED VESSEL",
        landingId: "CC1-1",
        pln: "ADMIN UPDATED PLN",
        fao: "FAO27",
        flag: "GBR",
        cfr: "GBRC1121091",
        presentation: "WHL",
        presentationName: "Whole",
        species: "Atlantic cod (COD)",
        state: "FRE",
        stateName: "Fresh",
        commodityCode: "03025110",
        transportationVehicle: "directLanding",
        vesselOverriddenByAdmin: true
      },
      rssNumber: "UNKNOWN",
      da: "England",
      dateLanded: "2020-08-30",
      species: "COD",
      weightFactor: 1,
      weightOnCert: 500,
      rawWeightOnCert: 500,
      weightOnAllCerts: 500,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 500,
      isExceeding14DayLimit: false,
      isLandingExists: false,
      weightOnLandingAllSpecies: 0,
      numberOfLandingsOnDay: 1,
      durationBetweenCertCreationAndFirstLandingRetrieved: "-PT0.011S",
      durationBetweenCertCreationAndLastLandingRetrieved: "-PT0.011S",
      isSpeciesExists: true,
      weightOnLanding: 0,
      landingTotalBreakdown: [],
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
      overUsedInfo: [],
      durationSinceCertCreation: "PT0.009S"
    }

    const result = mapLandingWithLandingStatus(product, validation, mockGetToLiveWeightFactor);

    expect(result.caughtBy?.[0]._status).toEqual(LandingStatus.Pending);
  });

  it('will place a _status of Date Ever Expected', () => {

    const validation: ICcQueryResult = {
      documentNumber: "CC1",
      documentType: "catchCertificate",
      createdAt: "2020-09-25T11:43:51.869Z",
      status: "COMPLETE",
      extended: {
        exporterName: "Private",
        exporterCompanyName: "Private",
        exporterPostCode: "AB1 2XX",
        vessel: "WIRON 5",
        landingId: "CC1-1",
        pln: "H1100",
        fao: "FAO27",
        flag: "GBR",
        cfr: "GBRC1121091",
        presentation: "WHL",
        presentationName: "Whole",
        species: "Atlantic cod (COD)",
        state: "FRE",
        stateName: "Fresh",
        commodityCode: "03025110",
        transportationVehicle: "directLanding",
        dataEverExpected: false,
      },
      rssNumber: "C20514",
      da: "England",
      dateLanded: "2020-08-30",
      species: "COD",
      weightFactor: 1,
      weightOnCert: 500,
      rawWeightOnCert: 500,
      weightOnAllCerts: 500,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 500,
      isExceeding14DayLimit: true,
      isLandingExists: true,
      source: "ELOG",
      weightOnLandingAllSpecies: 1000,
      numberOfLandingsOnDay: 1,
      durationBetweenCertCreationAndFirstLandingRetrieved: "-PT0.011S",
      durationBetweenCertCreationAndLastLandingRetrieved: "-PT0.011S",
      isSpeciesExists: true,
      weightOnLanding: 1000,
      landingTotalBreakdown: [
        {
          presentation: "WHL",
          state: "FRE",
          source: "ELOG",
          isEstimate: false,
          factor: 1,
          weight: 1000,
          liveWeight: 1000
        }
      ],
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
      overUsedInfo: [],
      durationSinceCertCreation: "PT0.009S"
    }

    const result = mapLandingWithLandingStatus(product, validation, mockGetToLiveWeightFactor);

    expect(result.caughtBy?.[0]._status).toEqual(LandingStatus.DataNeverExpected);

  });

  it('will place a _status of Exceeding 14 day limit', () => {

    const validation: ICcQueryResult = {
      documentNumber: "CC1",
      documentType: "catchCertificate",
      createdAt: "2020-09-25T11:43:51.869Z",
      status: "COMPLETE",
      extended: {
        exporterName: "Private",
        exporterCompanyName: "Private",
        exporterPostCode: "AB1 2XX",
        vessel: "WIRON 5",
        landingId: "CC1-1",
        pln: "H1100",
        fao: "FAO27",
        flag: "GBR",
        cfr: "GBRC1121091",
        presentation: "WHL",
        presentationName: "Whole",
        species: "Atlantic cod (COD)",
        state: "FRE",
        stateName: "Fresh",
        commodityCode: "03025110",
        transportationVehicle: "directLanding"
      },
      rssNumber: "C20514",
      da: "England",
      dateLanded: "2020-08-30",
      species: "COD",
      weightFactor: 1,
      weightOnCert: 500,
      rawWeightOnCert: 500,
      weightOnAllCerts: 500,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 500,
      isLandingExists: true,
      isExceeding14DayLimit: true,
      source: "LANDING_DECLARATION",
      weightOnLandingAllSpecies: 1000,
      numberOfLandingsOnDay: 1,
      durationBetweenCertCreationAndFirstLandingRetrieved: "-PT0.011S",
      durationBetweenCertCreationAndLastLandingRetrieved: "-PT0.011S",
      isSpeciesExists: true,
      weightOnLanding: 1000,
      landingTotalBreakdown: [
        {
          presentation: "WHL",
          state: "FRE",
          source: "LANDING_DECLARATION",
          isEstimate: false,
          factor: 1,
          weight: 1000,
          liveWeight: 1000
        }
      ],
      isOverusedThisCert: false,
      isOverusedAllCerts: false,
      overUsedInfo: [],
      durationSinceCertCreation: "PT0.009S"
    };

    const result = mapLandingWithLandingStatus(product, validation, mockGetToLiveWeightFactor);

    expect(result.caughtBy?.[0]._status).toEqual(LandingStatus.Exceeded14Days);
  });

});

const modifyCertificate = async (documentNumber: string) => {


  await DocumentModel.findOneAndUpdate(
    {
      documentNumber: documentNumber
    },
    {
      audit: [],
      __t: 'catchCert',
      status: 'DRAFT',
      documentNumber: 'FAILING CERTIFICATE',
      exportData:
      {
        products: [],
        exporterDetails: { exporterCompanyName: 'Mr Bob 2' }
      },
      __v: 0
    }
  )
}



