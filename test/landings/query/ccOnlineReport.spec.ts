
import moment from 'moment';
import { getCatchCertificateOnlineValidationReport } from '../../../src/landings/query/onlineReports'
import { ValidationRules } from '../../../src/landings/types/onlineValidationReport'
import { generateIndex, ICcQueryResult } from 'mmo-shared-reference-data';
import { ccQuery } from "mmo-shared-reference-data";
import { LandingSources } from '../../../src/landings/types/landing';
import * as isHighRisk from '../../../src/landings/query/isHighRisk';

describe('the catch certificate online validation report', () => {
    const vessels = [
      {
        registrationNumber:"WA1",
        fishingLicenceValidTo:"2020-12-20T00:00:00",
        fishingLicenceValidFrom:"2010-12-29T00:00:00",
        rssNumber: "rssWA1",
        adminPort: 'GUERNSEY',
        licenceHolderName: 'Mr Bob'
      },
      {
        registrationNumber:"WA2",
        fishingLicenceValidTo:"2020-12-20T00:00:00",
        fishingLicenceValidFrom:"2010-12-29T00:00:00",
        rssNumber: "rssWA2",
        adminPort: 'WICK',
        licenceHolderName: 'Mr Doe'
      }
    ];

    const vesselsIdx: (pln: string) => any = generateIndex(vessels);

    const mockGetSpeciesAlias = jest.fn();
    mockGetSpeciesAlias.mockImplementation((speciesName) => {
      const list = {
        'MON': ['ANF'],
        'ANF': ['MON']
      }
      return list[speciesName] ?? []
    });

    let mockGetTotalRiskScore;
    let mockIsHighRisk;

    beforeAll(() => {
      mockGetTotalRiskScore = jest.spyOn(isHighRisk, 'getTotalRiskScore');
      mockIsHighRisk = jest.spyOn(isHighRisk, 'isHighRisk');
    });

    beforeEach(() => {
      mockGetTotalRiskScore.mockReturnValue(1.1);
      mockIsHighRisk.mockReturnValue(true);
    })

    afterAll(() => {
      mockIsHighRisk.mockRestore();
    });

    it('will pass validation when there is a landing', () => {

      const documents = [
        { documentNumber: "CC1",
          createdAt: "2019-07-12T00:00:00.000Z",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-08T00:00:00.000Z", weight: 10 }
                ] } ] } },
      ];

      const landings = [
        { rssNumber: 'rssWA1',
          dateTimeLanded: moment.utc('20190708T010000Z').toISOString(),
          dateTimeRetrieved: '2019-07-10T00:00:00.000Z',
          source: LandingSources.LandingDeclaration,
          items: [
            { species: 'LBE', weight: 50, factor: 1 } ]}
      ];

      const rawLandings : ICcQueryResult[] = Array.from(ccQuery(documents, landings, vesselsIdx, moment.utc(), mockGetSpeciesAlias));

      const result = getCatchCertificateOnlineValidationReport("CC1",rawLandings);

      expect(result).toEqual([]);

    });

    it('will fail validation when the species doesnt match the landing', () => {

      const documents = [
        { documentNumber: "CC1",
          createdAt: "2019-07-12T00:00:00.000Z",
          exportData: {
            products : [
              { speciesCode : "AAA",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-08T00:00:00.000Z", weight: 10 }
                ] } ] } },
      ];

      const landings = [
        { rssNumber: 'rssWA1',
          dateTimeLanded: moment.utc('20190708T010000Z').toISOString(),
          dateTimeRetrieved: '2019-07-10T00:00:00.000Z',
          source: LandingSources.LandingDeclaration,
          items: [
            { species: 'LBE', weight: 50, factor: 1 } ]}
      ];

      const rawLandings : ICcQueryResult[] = Array.from(ccQuery(documents, landings, vesselsIdx, moment.utc(), mockGetSpeciesAlias));


      const result = getCatchCertificateOnlineValidationReport("CC1", rawLandings);

      const expectedResult = [
        {
          date: moment.utc("2019-07-08T00:00:00.000Z").toDate(),
          vessel: 'DAYBREAK',
          species: 'AAA',
          failures: [ValidationRules.THREE_C]
        }];

      expect(result).toEqual(expectedResult);

    });

    it('will fail validation when the export weight is greater than the landed weight and the species risk rating is FAIL', () => {
      const documents = [
        { documentNumber: "CC1",
          createdAt: "2019-07-12T00:00:00.000Z",
          exportData: {
            exporterDetails: {
              contactId: "some-contact-id",
              accountId: "some-account-id",
              exporterFullName: "Private",
              exporterCompanyName: "Private",
              addressOne: "Building and street",
              addressTwo: "Building 2 and street name",
              townCity: "London",
              postcode: "AB1 2XX"
            },
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-08T00:00:00.000Z", weight: 101 }
                ] } ] } },
      ];

      const landings = [
        { rssNumber: 'rssWA1',
          dateTimeLanded: moment.utc('20190708T010000Z').toISOString(),
          dateTimeRetrieved: '2019-07-10T00:00:00.000Z',
          source: LandingSources.LandingDeclaration,
          items: [
            { species: 'LBE', weight: 50, factor: 1 } ]}
      ];

      const rawLandings : ICcQueryResult[] = Array.from(ccQuery(documents, landings, vesselsIdx, moment.utc(), mockGetSpeciesAlias));

      const result = getCatchCertificateOnlineValidationReport("CC1", rawLandings);

      const expectedResult = [
        {
          date: moment.utc("2019-07-08T00:00:00.000Z").toDate(),
          vessel: "DAYBREAK",
          species: 'LBE',
          failures: [ValidationRules.THREE_D, ValidationRules.FOUR_A]
        }];

      expect(result).toEqual(expectedResult);
      expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
      expect(mockIsHighRisk).toHaveBeenCalledWith(1.1);
    });

    it('will fail validation when the export weight across all cetificates is greater than the landed weight', () => {

      const documents = [
        { documentNumber: "CC1",
          createdAt: "2019-07-12T00:00:00.000Z",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-08T00:00:00.000Z", weight: 90 }
                ] } ] } },
        { documentNumber: "CC2",
        createdAt: "2019-07-13T00:00:00.000Z",
        exportData: {
          products : [
            { speciesCode : "LBE",
              caughtBy : [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-08T00:00:00.000Z", weight: 70 }
              ] } ] } },
      ];

      const landings = [
        { rssNumber: 'rssWA1',
          dateTimeLanded: moment.utc('20190708T010000Z').toISOString(),
          dateTimeRetrieved: '2019-07-10T00:00:00.000Z',
          source: LandingSources.LandingDeclaration,
          items: [
            { species: 'LBE', weight: 100, factor: 1 } ]}
      ];

      const rawLandings : ICcQueryResult[] = Array.from(ccQuery(documents, landings, vesselsIdx, moment.utc(), mockGetSpeciesAlias));

      const result = getCatchCertificateOnlineValidationReport("CC1", rawLandings);

      const expectedResult = [
        {
          date: moment.utc("2019-07-08T00:00:00.000Z").toDate(),
          vessel: "DAYBREAK",
          species: 'LBE',
          failures: [ValidationRules.FOUR_A]
        }];

      expect(result).toEqual(expectedResult);

    });

    it('will fail validation when the export risk rating is FAIL and landing contains an overriden vessel', () => {

      const documents = [
        { documentNumber: "CC1",
          createdAt: "2019-07-12T00:00:00.000Z",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-08T00:00:00.000Z", weight: 10, vesselOverriddenByAdmin: true, licenceHolder: "MR JOHN DOE" }
                ] } ] } },
      ];

      const landings = [];

      const rawLandings : ICcQueryResult[] = Array.from(ccQuery(documents, landings, vesselsIdx, moment.utc(), mockGetSpeciesAlias));

      const result = getCatchCertificateOnlineValidationReport("CC1", rawLandings);

      const expectedResult = [
        {
          date: moment.utc("2019-07-08T00:00:00.000Z").toDate(),
          species: "LBE",
          vessel: "DAYBREAK",
          failures:[
            "noDataSubmitted",
          ],
       }];

      expect(result).toEqual(expectedResult);
    });

    it('will fail validation when the licence period does not have a licence holder', () => {

      mockIsHighRisk.mockReturnValue(false);

      const documents = [
        { documentNumber: "CC1",
          createdAt: "2019-07-12T00:00:00.000Z",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-08T00:00:00.000Z", weight: 10 }
                ] } ] } },
      ];

      const landings = [];

      const vesselsIdx: (pln: string) => any = generateIndex([
        {
          registrationNumber:"WA1",
          fishingLicenceValidTo:"2020-12-20T00:00:00",
          fishingLicenceValidFrom:"2010-12-29T00:00:00",
          rssNumber: "rssWA1",
          adminPort: 'GUERNSEY'
        },
        {
          registrationNumber:"WA2",
          fishingLicenceValidTo:"2020-12-20T00:00:00",
          fishingLicenceValidFrom:"2010-12-29T00:00:00",
          rssNumber: "rssWA2",
          adminPort: 'WICK',
          licenceHolderName: 'Mr Doe'
        }
      ]);

      const rawLandings : ICcQueryResult[] = Array.from(ccQuery(documents, landings, vesselsIdx, moment.utc(), mockGetSpeciesAlias));

      const result = getCatchCertificateOnlineValidationReport("CC1", rawLandings);

      const expectedResult = [
        {
          date: moment.utc("2019-07-08T00:00:00.000Z").toDate(),
          species: "LBE",
          vessel: "DAYBREAK",
          failures:[
            "noLicenceHolder",
          ],
       }];

      expect(result).toEqual(expectedResult);
    });

    it('will pass validation when the export is Low Risk and is NOT Legally due and when there is no landing', () => {

      mockIsHighRisk.mockReturnValue(false);

      const documents = [
        { documentNumber: "CC1",
          createdAt: "2019-07-12T00:00:00.000Z",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-08T00:00:00.000Z", weight: 10 }
                ] } ] } },
      ];

      const landings = [];

      const rawLandings : ICcQueryResult[] = Array.from(ccQuery(documents, landings, vesselsIdx, moment.utc(), mockGetSpeciesAlias));

      const result = getCatchCertificateOnlineValidationReport("CC1", rawLandings);

      const expectedResult = [];

      expect(result).toEqual(expectedResult);
    });
});