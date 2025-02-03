const moment = require('moment');
import { generateIndex, ICcQueryResult } from 'mmo-shared-reference-data';
import { LandingSources } from '../../../src/landings/types/landing';
import * as Query from '../../../src/landings/query/ccQuery';
import * as IsHighRisk from '../../../src/landings/query/isHighRisk';
import * as CatchCertService from '../../../src/landings/persistence/catchCert';

const vessels = [
  {
    registrationNumber:"WA1",
    fishingLicenceValidTo:"2020-12-20T00:00:00",
    fishingLicenceValidFrom:"2010-12-29T00:00:00",
    rssNumber: "rssWA1",
    adminPort: 'GUERNSEY',
  },
  {
    registrationNumber:"WA2",
    fishingLicenceValidTo:"2018-12-20T00:00:00",
    fishingLicenceValidFrom:"2010-12-29T00:00:00",
    rssNumber: "rssWA2",
    adminPort: 'GUERNSEY',
  }
];

const vesselsIdx = generateIndex(vessels);

describe('the query for refreshing missing landings for investigation', () => {

  let mockIsHighRisk;
  let mockGetTotalRiskScore;

  beforeEach(() => {
    mockIsHighRisk = jest.spyOn(IsHighRisk, 'isHighRisk');
    mockIsHighRisk.mockReturnValue(true);

    mockGetTotalRiskScore = jest.spyOn(IsHighRisk, 'getTotalRiskScore');
    mockGetTotalRiskScore.mockReturnValue(10);
  });

  afterEach(() => {
    mockIsHighRisk.mockRestore();
    mockGetTotalRiskScore.mockRestore();
  });

  const exporterDetails = {
    contactId: "some-contact-id",
    accountId: "some-account-id",
    exporterFullName: "Private",
    exporterCompanyName: "Private",
    addressOne: "Building and street",
    addressTwo: "Building 2 and street name",
    townCity: "London",
    postcode: "AB1 2XX"
  }

  const documentCC1 = {
    documentNumber: "CC1",
        createdAt: "2019-07-31T08:26:06.939Z",
        exportData: {
          exporterDetails: {
            ...exporterDetails
          },
          products : [
            { speciesCode : "LBE",
              caughtBy : [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 200 }
              ] } ] }
  }

  const documentCC2 = {
    documentNumber: "CC2",
      createdAt: "2019-08-01T08:26:06.939Z",
      exportData: {
        exporterDetails: {
          ...exporterDetails
        },
        products : [
          { speciesCode : "LBE",
            caughtBy : [
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 200 }
            ] } ] }
  }

  it('will return overuse as a missing landing - single overuse', () => {

    const documents = [{
      ...documentCC1
    }];

    const landings = [
			{ rssNumber: 'rssWA1',
				dateTimeLanded: moment.utc('20190710T010000Z').toISOString(),
        dateTimeRetrieved: '2019-07-31T08:26:08.000Z',
        source: LandingSources.LandingDeclaration,
				items: [ { species: 'LBE', weight: 100, factor: 1 } ]}
    ];

    const queryTime = moment.utc('2019-08-01T12:00:00');

    const expected = [
      { rssNumber: 'rssWA1', dateLanded: '2019-07-10' }
    ];

    const results: any[] = Array.from(Query.missingLandingInvestigationRefreshQuery(documents, landings, vesselsIdx, queryTime));

    expect(results).toEqual(expected);

  });

  it('will return high risk overuse as a missing landing - overuse across certs', () => {

    const documents = [
      { ...documentCC1 },
      { ...documentCC1 }
    ];

    const landings = [
			{ rssNumber: 'rssWA1',
				dateTimeLanded: moment.utc('20190710T010000Z').toISOString(),
        dateTimeRetrieved: '2019-07-31T08:26:08.000Z',
        source: LandingSources.LandingDeclaration,
				items: [ { species: 'LBE', weight: 300, factor: 1 } ]}
    ];

    const queryTime = moment.utc('2019-08-01T12:00:00');

    const expected = [
      { rssNumber: 'rssWA1', dateLanded: '2019-07-10' }
    ];

    const results: any[] = Array.from(Query.missingLandingInvestigationRefreshQuery(documents, landings, vesselsIdx, queryTime));

    expect(results).toEqual(expected);
    expect(mockIsHighRisk).toHaveBeenCalledTimes(2);
    expect(mockIsHighRisk).toHaveBeenCalledWith(10);
    expect(mockGetTotalRiskScore).toHaveBeenCalledTimes(2);
    expect(mockGetTotalRiskScore).toHaveBeenNthCalledWith(1, 'WA1', 'LBE', 'some-account-id', 'some-contact-id');
    expect(mockGetTotalRiskScore).toHaveBeenNthCalledWith(2, 'WA1', 'LBE', 'some-account-id', 'some-contact-id');
  });

  it('will return species mismatch as a missing landing', () => {

    const documents = [
      { ...documentCC1 }
    ];

    const landings = [
			{ rssNumber: 'rssWA1',
				dateTimeLanded: moment.utc('20190710T010000Z').toISOString(),
        dateTimeRetrieved: '2019-07-31T08:26:08.000Z',
        source: LandingSources.LandingDeclaration,
				items: [ { species: 'COD', weight: 300, factor: 1 } ]}
    ];

    const queryTime = moment.utc('2019-08-01T12:00:00');

    const expected = [
      { rssNumber: 'rssWA1', dateLanded: '2019-07-10' }
    ];

    const results: any[] = Array.from(Query.missingLandingInvestigationRefreshQuery(documents, landings, vesselsIdx, queryTime));

    expect(results).toEqual(expected);

  });

  it('will exclude missing landings from certificates older than 40 days', () => {

    const queryTime = moment.utc('2019-08-01T12:00:00');
    const certificateDate = moment.utc('2019-08-01T12:00:00').subtract(41, 'days');

    const documents = [
      { documentNumber: "CC1",
        createdAt: certificateDate.toISOString(),
        exportData: {
          products : [
            { speciesCode : "LBE",
              caughtBy : [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 200 }
              ] } ] } }
    ];

    const landings = [
			{ rssNumber: 'rssWA1',
				dateTimeLanded: moment.utc('20190710T010000Z').toISOString(),
        dateTimeRetrieved: '2019-07-31T08:26:08.000Z',
        source: LandingSources.LandingDeclaration,
				items: [ { species: 'COD', weight: 300, factor: 1 } ]}
    ];

    const results: any[] = Array.from(Query.missingLandingInvestigationRefreshQuery(documents, landings, vesselsIdx, queryTime));

    expect(results).toHaveLength(0);

  });

  it('will exclude low risk overuse as a missing landing - overuse across certs', () => {

    const documents = [
      { ...documentCC1 },
      { ...documentCC2 }
    ];

    const landings = [
			{ rssNumber: 'rssWA1',
				dateTimeLanded: moment.utc('20190710T010000Z').toISOString(),
        dateTimeRetrieved: '2019-07-31T08:26:08.000Z',
        source: LandingSources.LandingDeclaration,
				items: [ { species: 'LBE', weight: 300, factor: 1 } ]}
    ];

    const queryTime = moment.utc('2019-08-01T12:00:00');

    mockIsHighRisk.mockReturnValue(false);

    const results: any[] = Array.from(Query.missingLandingInvestigationRefreshQuery(documents, landings, vesselsIdx, queryTime));

    mockIsHighRisk.mockReturnValue(false);

    expect(results).toHaveLength(0);
    expect(mockIsHighRisk).toHaveBeenCalledTimes(2);
    expect(mockIsHighRisk).toHaveBeenCalledWith(10);
    expect(mockGetTotalRiskScore).toHaveBeenCalledTimes(2);
    expect(mockGetTotalRiskScore).toHaveBeenNthCalledWith(1, 'WA1', 'LBE', 'some-account-id', 'some-contact-id');
    expect(mockGetTotalRiskScore).toHaveBeenNthCalledWith(2, 'WA1', 'LBE', 'some-account-id', 'some-contact-id');
  });

  it('will exclude overuse within the 50 KG tolerance as a missing landing - overuse across certs', () => {

    const documents = [
      { ...documentCC1 },
      { ...documentCC2 }
    ];

    const landings = [
			{ rssNumber: 'rssWA1',
				dateTimeLanded: moment.utc('20190710T010000Z').toISOString(),
        dateTimeRetrieved: '2019-07-31T08:26:08.000Z',
        source: LandingSources.LandingDeclaration,
				items: [ { species: 'LBE', weight: 350, factor: 1 } ]}
    ];

    const queryTime = moment.utc('2019-08-01T12:00:00');

    const results: any[] = Array.from(Query.missingLandingInvestigationRefreshQuery(documents, landings, vesselsIdx, queryTime));

    expect(results).toHaveLength(0);
  });
});

describe('runUpdateForLandings', () => {

  const queryTime = moment.utc();
  const ccQueryResult: ICcQueryResult[] = [
    {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2020-09-26T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2020-09-25',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 1,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown : [
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
        .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      extended: {}
    },
    {
      documentNumber: 'CC1',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2020-09-26T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2020-09-25',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 1,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown : [
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
        .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      extended: {}

    },
    {
      documentNumber: 'CC2',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2020-09-26T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2020-09-25',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 1,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown : [
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
        .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      extended: {
        landingId: 'GBR-2020-CC-1',
        landingStatus: 'HAS_LANDING_DATA'
      }
    },
    {
      documentNumber: 'CC2',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2020-09-26T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2020-09-25',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 1,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown : [
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
        .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      extended: {
        landingId: 'GBR-2020-CC-2',
        landingStatus: 'HAS_LANDING_DATA'
      }
    },
    {
      documentNumber: 'CC3',
      documentType: 'catchCertificate',
      createdAt: moment.utc('2020-09-26T08:26:06.939Z').toISOString(),
      status: 'COMPLETE',
      rssNumber: 'rssWA1',
      da: 'Guernsey',
      dateLanded: '2020-09-25',
      species: 'LBE',
      weightOnCert: 121,
      rawWeightOnCert: 122,
      weightOnAllCerts: 200,
      weightOnAllCertsBefore: 0,
      weightOnAllCertsAfter: 100,
      weightFactor: 1,
      isLandingExists: true,
      isSpeciesExists: true,
      numberOfLandingsOnDay: 1,
      weightOnLanding: 30,
      weightOnLandingAllSpecies: 30,
      landingTotalBreakdown : [
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
        .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
        moment.utc('2019-07-11T09:00:00.000Z')
        .diff(moment.utc('2019-07-13T08:00:00.000Z'))).toISOString(),
      extended: {}
    }
  ];

  const certificates: any[] = [
    [
      { documentNumber: 'CC1' }
    ],
    [
      {
        documentNumber: 'CC2',
        exportData: {
          products: [{
            species: "Atlantic cod (COD)",
            speciesId: "GBR-2020-CC-D068305E3-a676d04c-1187-4533-952b-7b96ae034826",
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
              vessel: "WIRON 5",
              pln: "H1100",
              id: "GBR-2020-CC-1",
              date: "2020-09-25",
              faoArea: "FAO27",
              weight: 1000,
              _status: "PENDING_LANDING_DATA"
            },{
              vessel: "WIRON 5",
              pln: "H1100",
              id: "GBR-2020-CC-2",
              date: "2020-09-25",
              faoArea: "FAO27",
              weight: 1000,
              _status: "PENDING_LANDING_DATA"
            }]
          }]
        }
      }
    ]
  ];

  let mockUpsertCertificate;
  let mockGetCertificateByDocumentNumber;

  beforeEach(() => {
    mockUpsertCertificate = jest.spyOn(CatchCertService, 'upsertCertificate');
    mockUpsertCertificate.mockResolvedValue(null);
    mockGetCertificateByDocumentNumber = jest.spyOn(CatchCertService, 'getCertificateByDocumentNumber');
  });

  afterEach(() => {
    mockUpsertCertificate.mockRestore();
    mockGetCertificateByDocumentNumber.mockRestore();
  });

  it('will not upsert with an empty certificate list', async () => {
    mockGetCertificateByDocumentNumber.mockResolvedValue([]);

    await Query.runUpdateForLandings(ccQueryResult, 'CC1');
    expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith('CC1');
    expect(mockUpsertCertificate).not.toHaveBeenCalled();
  });

  it('will not upsert an empty export data', async () => {
    mockGetCertificateByDocumentNumber.mockResolvedValue(certificates[0][0]);

    await Query.runUpdateForLandings(ccQueryResult, 'CC1');
    expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith('CC1');
    expect(mockUpsertCertificate).not.toHaveBeenCalled();
  });

  it('will not upsert when no products are present', async () => {
    mockGetCertificateByDocumentNumber.mockResolvedValue({
      ...certificates[0][0],
      exportData: {}
    });

    await Query.runUpdateForLandings(ccQueryResult, 'CC1');
    expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith('CC1');
    expect(mockUpsertCertificate).not.toHaveBeenCalled();
  });

  it('will not upsert when products are empty', async () => {
    mockGetCertificateByDocumentNumber.mockResolvedValue( {
      ...certificates[0][0],
      exportData: {
        products: []
      }
    });

    await Query.runUpdateForLandings(ccQueryResult, 'CC1');
    expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith('CC1');
    expect(mockUpsertCertificate).not.toHaveBeenCalled();
  });

  it('will upsert an updated products list', async () => {
    mockGetCertificateByDocumentNumber.mockResolvedValue(certificates[1][0]);
    await Query.runUpdateForLandings(ccQueryResult, 'CC2');

    expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith('CC2');
    expect(mockUpsertCertificate).toHaveBeenCalledTimes(1);
    expect(mockUpsertCertificate).toHaveBeenCalledWith('CC2', {
      exportData: {
        products: [{
          species: "Atlantic cod (COD)",
          speciesId: "GBR-2020-CC-D068305E3-a676d04c-1187-4533-952b-7b96ae034826",
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
            vessel: "WIRON 5",
            pln: "H1100",
            id: "GBR-2020-CC-1",
            date: "2020-09-25",
            faoArea: "FAO27",
            weight: 1000,
            _status: "HAS_LANDING_DATA"
          },
          {
            vessel: "WIRON 5",
            pln: "H1100",
            id: "GBR-2020-CC-2",
            date: "2020-09-25",
            faoArea: "FAO27",
            weight: 1000,
            _status: "HAS_LANDING_DATA"
          }]
        }]
      }
    });
  });

  it('will not error is document does not exists', async () => {
    mockGetCertificateByDocumentNumber.mockResolvedValue(null);

    await Query.runUpdateForLandings(ccQueryResult, 'CC1');
    expect(mockGetCertificateByDocumentNumber).toHaveBeenCalledWith('CC1');
    expect(mockUpsertCertificate).not.toHaveBeenCalled();
  });
});