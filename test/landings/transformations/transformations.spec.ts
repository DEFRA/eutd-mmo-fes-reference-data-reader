const _ = require('lodash')
const moment = require('moment')
const AJV = require('ajv')
const addFormats = require('ajv-formats')

const Transformations = require('../../../src/landings/transformations/transformations')
import { LandingSources } from '../../../src/landings/types/landing';
import { generateIndex, ICcQueryResult } from 'mmo-shared-reference-data';
import { minimalSchema } from '../../../src/landings/types/catchCert';
import { IOnlineValidationReportItem, ValidationRules } from '../../../src/landings/types/onlineValidationReport';
import { rawCatchCertToOnlineValidationReport, getLastAuditEvent, rawForeignCatchCertToOnlineReport } from '../../../src/landings/transformations/transformations';
import { InvestigationStatus, AuditEventTypes } from '../../../src/landings/types/auditEvent';
import * as IsHighRisk from '../../../src/landings/query/isHighRisk';
import * as Shared from 'mmo-shared-reference-data';
import * as IsLegallyDue from '../../../src/landings/query/isLegallyDue';
import * as Cache from '../../../src/data/cache';
import * as VesselService from '../../../src/handler/vesselService';

describe('about unwindCatchCerts', () => {

  it('can unwind catch certificates', () => {

    const catchCerts = [
      {
        documentNumber: "CC1",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 },
                { vessel: "DAYBREAK", pln: "WA2", date: "2019-07-10", weight: 100 }
              ]
            }
          ]
        }
      }
    ]

    const expected = [
      { documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z', speciesCode: 'LBE', pln: 'WA1', date: '2019-07-10', weight: 100, factor: 1 },
      { documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z', speciesCode: 'LBE', pln: 'WA2', date: '2019-07-10', weight: 100, factor: 1 }
    ]

    const unwound = Array.from(Transformations.unwindCatchCerts(catchCerts))
      .map((item: any) => {
        delete item.extended;
        return item
      })

    expect(unwound).toEqual(expected)

  })

  it('will include the factor to be applied on the weight', () => {

    const catchCerts = [
      {
        documentNumber: "CC1",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              factor: 1,
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 },
                { vessel: "DAYBREAK", pln: "WA2", date: "2019-07-10", weight: 100 }
              ]
            }
          ]
        }
      }
    ]

    const expected = [
      { documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z', speciesCode: 'LBE', factor: 1, pln: 'WA1', date: '2019-07-10', weight: 100 },
      { documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z', speciesCode: 'LBE', factor: 1, pln: 'WA2', date: '2019-07-10', weight: 100 }
    ]

    const unwound = Array.from(Transformations.unwindCatchCerts(catchCerts))
      .map((item: any) => {
        delete item.extended;
        return item
      })

    expect(unwound).toEqual(expected)

  })

  it('will set a default factor of 1 if there is no factor', () => {

    const catchCerts = [
      {
        documentNumber: "CC1",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 },
                { vessel: "DAYBREAK", pln: "WA2", date: "2019-07-10", weight: 100 }
              ]
            }
          ]
        }
      }
    ]

    const expected = [
      { documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z', speciesCode: 'LBE', factor: 1, pln: 'WA1', date: '2019-07-10', weight: 100 },
      { documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z', speciesCode: 'LBE', factor: 1, pln: 'WA2', date: '2019-07-10', weight: 100 }
    ]

    const unwound = Array.from(Transformations.unwindCatchCerts(catchCerts))
      .map((item: any) => {
        delete item.extended;
        return item
      })

    expect(unwound).toEqual(expected)

  })

  it('can unwind more catch certificates', () => {

    const catchCerts = [
      {
        documentNumber: "CC1",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 },
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100 }
              ]
            },
            {
              speciesCode: "COD",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 500 },
              ]
            },
          ],
        },
      },
      {
        documentNumber: "CC2",
        createdAt: "2019-07-10T08:26:06.999Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 300 }]
            }],
        },
      },
    ]


    const expected = [
      { documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z', speciesCode: 'LBE', pln: 'WA1', date: '2019-07-10', weight: 100, factor: 1 },
      { documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z', speciesCode: 'LBE', pln: 'WA1', date: '2019-07-11', weight: 100, factor: 1 },
      { documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z', speciesCode: 'COD', pln: 'WA1', date: '2019-07-10', weight: 500, factor: 1 },
      { documentNumber: 'CC2', createdAt: '2019-07-10T08:26:06.999Z', speciesCode: 'LBE', pln: 'WA1', date: '2019-07-10', weight: 300, factor: 1 },
    ]

    const unwound = Array.from(Transformations.unwindCatchCerts(catchCerts))
      .map((item: any) => {
        delete item.extended;
        return item
      })

    expect(unwound).toEqual(expected)

  })

  it('can unwind catch certificates with extended data', () => {

    const catchCerts = [
      {
        documentNumber: "CC1",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products: [
            {
              species: "Lobster",
              speciesCode: "LBE",
              commodityCode: "4321",
              commodityCodeDescription: "some commodity code description",
              scientificName: "some scientific name",
              state: { code: "Nice" },
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, numberOfSubmissions: 1, id: "CC1-CC-1", _status: "PENDING_LANDING_DATA", vesselOverriddenByAdmin: true, licenceHolder: "A" },
              ]
            },
            {
              species: "Bobster",
              speciesCode: "BOB",
              commodityCode: "4321",
              commodityCodeDescription: "some commodity code description 2",
              scientificName: "some scientific name 2",
              state: { code: "Nice" },
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA2", date: "2019-07-10", weight: 100, numberOfSubmissions: 2, id: "CC1-CC-2", _status: "HAS_LANDING_DATA", licenceHolder: "B" }
              ]
            }
          ],
          exporterDetails: { exporterFullName: 'Mr Bob' }
        },
        status: 'COMPLETE',
        audit: [
          { "eventType": AuditEventTypes.Voided, "triggeredBy": "Jim", "timestamp": new Date(), "data": null },
          { "eventType": AuditEventTypes.Voided, "triggeredBy": "Bob", "timestamp": new Date(), "data": null },
          { "eventType": AuditEventTypes.PreApproved, "triggeredBy": "Bobby", "timestamp": new Date(), "data": null }
        ],
        investigation: {
          investigator: 'Mr Fred',
          status: InvestigationStatus.MinorVerbal
        }
      }
    ]

    const expected = [
      {
        documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z',
        speciesCode: 'LBE', pln: 'WA1', date: '2019-07-10', weight: 100, factor: 1,
        status: "COMPLETE",
        extended: {
          exporterName: 'Mr Bob',
          vessel: 'DAYBREAK',
          pln: 'WA1',
          species: 'Lobster',
          state: 'Nice',
          commodityCode: '4321',
          commodityCodeDescription: "some commodity code description",
          scientificName: "some scientific name",
          landingId: 'CC1-CC-1',
          landingStatus: 'PENDING_LANDING_DATA',
          investigation: {
            investigator: 'Mr Fred',
            status: InvestigationStatus.MinorVerbal
          },
          voidedBy: 'Bob',
          preApprovedBy: 'Bobby',
          numberOfSubmissions: 1,
          vesselOverriddenByAdmin: true,
          licenceHolder: 'A',
          speciesOverriddenByAdmin: false
        }
      },
      {
        documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z',
        speciesCode: 'BOB', pln: 'WA2', date: '2019-07-10', weight: 100, factor: 1,
        status: "COMPLETE",
        extended: {
          exporterName: 'Mr Bob',
          vessel: 'DAYBREAK',
          pln: 'WA2',
          species: 'Bobster',
          state: 'Nice',
          commodityCode: '4321',
          commodityCodeDescription: "some commodity code description 2",
          scientificName: "some scientific name 2",
          landingId: 'CC1-CC-2',
          landingStatus: 'HAS_LANDING_DATA',
          investigation: {
            investigator: 'Mr Fred',
            status: InvestigationStatus.MinorVerbal
          },
          voidedBy: 'Bob',
          preApprovedBy: 'Bobby',
          numberOfSubmissions: 2,
          licenceHolder: 'B',
          speciesOverriddenByAdmin: false
        }
      },
    ]

    const unwound = Array.from(Transformations.unwindCatchCerts(catchCerts))

    expect(unwound).toEqual(expected)

  });

  it('will set extended.vesselOverriddenByAdmin to true if it is true on the landing', () => {
    const catchCerts = [
      {
        documentNumber: "CC1",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products: [
            {
              species: "Lobster",
              speciesCode: "LBE",
              commodityCode: "1234",
              state: { code: "Nice" },
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, numberOfSubmissions: 1, id: "CC1-CC-1", _status: "PENDING_LANDING_DATA", vesselOverriddenByAdmin: true },
              ]
            }
          ],
          exporterDetails: { exporterFullName: 'Mr Bob' }
        },
        status: 'COMPLETE',
        audit: []
      }
    ]

    const unwound = Array.from(Transformations.unwindCatchCerts(catchCerts))
    const landing: any = unwound[0];

    expect(landing.extended.vesselOverriddenByAdmin).toEqual(true);
  });

  it('will set extended.vesselOverriddenByAdmin to undefined if it is not defined in the landing', () => {
    const catchCerts = [
      {
        documentNumber: "CC1",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products: [
            {
              species: "Lobster",
              speciesCode: "LBE",
              commodityCode: "1234",
              state: { code: "Nice" },
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, numberOfSubmissions: 1, id: "CC1-CC-1", _status: "PENDING_LANDING_DATA" },
              ]
            }
          ],
          exporterDetails: { exporterFullName: 'Mr Bob' }
        },
        status: 'COMPLETE',
        audit: []
      }
    ]

    const unwound = Array.from(Transformations.unwindCatchCerts(catchCerts))
    const landing: any = unwound[0];

    expect(landing.extended.vesselOverriddenByAdmin).toBeUndefined();
  });

  it('can unwind catch certifcate data with cfr and flag', () => {
    const catchCerts = [
      {
        documentNumber: "CC1",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products: [
            {
              species: "Lobster",
              speciesCode: "LBE",
              commodityCode: "1234",
              state: { code: "Nice" },
              caughtBy: [
                {
                  vessel: "DAYBREAK",
                  pln: "WA1",
                  date: "2019-07-10",
                  weight: 100,
                  numberOfSubmissions: 1,
                  id: "CC1-CC-1",
                  _status: "PENDING_LANDING_DATA",
                  flag: "GBR",
                  cfr: "GBRC17737"
                },
              ]
            }
          ],
          exporterDetails: { exporterFullName: 'Mr Bob' }
        },
        status: 'COMPLETE',
        audit: [],
        investigation: {}
      }
    ];

    const expected = [
      {
        documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z',
        speciesCode: 'LBE', pln: 'WA1', date: '2019-07-10', weight: 100, factor: 1,
        status: "COMPLETE",
        extended: {
          exporterName: 'Mr Bob',
          vessel: 'DAYBREAK',
          pln: 'WA1',
          species: 'Lobster',
          state: 'Nice',
          commodityCode: '1234',
          landingId: 'CC1-CC-1',
          landingStatus: 'PENDING_LANDING_DATA',
          investigation: {},
          numberOfSubmissions: 1,
          flag: 'GBR',
          cfr: 'GBRC17737',
          speciesOverriddenByAdmin: false
        }
      }
    ]

    const unwound = Array.from(Transformations.unwindCatchCerts(catchCerts));

    expect(unwound).toEqual(expected)
  });

});

describe('mapCatchCerts', () => {
  it('will surface the factor applied to the weight', () => {
    const unwoundCertificates = [
      { documentNumber: 'CC1', status: 'COMPLETE', createdAt: '2019-07-10T08:26:06.939Z', speciesCode: 'LBE', factor: 1, pln: 'WA1', date: '2019-07-10', weight: 100, extended: { vesselOverriddenByAdmin: undefined, speciesOverriddenByAdmin: false } }
    ];

    const result = Array.from(Transformations.mapCatchCerts(unwoundCertificates, () => true));

    expect(result).toStrictEqual([{
      createdAt: "2019-07-10T08:26:06.939Z",
      dateLanded: "2019-07-10",
      da: undefined,
      documentNumber: "CC1",
      factor: 1,
      species: "LBE",
      status: "COMPLETE",
      rssNumber: undefined,
      weight: 100,
      extended: {
        vesselOverriddenByAdmin: undefined,
        speciesOverriddenByAdmin: false,
        flag: undefined,
        homePort: undefined,
        imoNumber: undefined,
        licenceHolder: undefined,
        licenceNumber: undefined,
        licenceValidTo: undefined
      }
    }])
  });

  it('will surface the licence details for the vessel', () => {
    const unwoundCertificates = [
      { documentNumber: 'CC1', status: 'COMPLETE', createdAt: '2019-07-10T08:26:06.939Z', speciesCode: 'LBE', factor: 1, pln: 'WA1', date: '2019-07-10', weight: 100, extended: { vesselOverriddenByAdmin: undefined, speciesOverriddenByAdmin: false } }
    ];

    const result = Array.from(Transformations.mapCatchCerts(unwoundCertificates, () => ({
      rssNumber: 'C19353',
      da: 'England',
      homePort: 'FLEETWOOD',
      flag: 'GBR',
      imoNumber: null,
      licenceNumber: '22657',
      licenceValidTo: '2382-12-31',
      licenceHolder: 'I am the Licence Holder name for this fishing boat'
    })));

    expect(result).toStrictEqual([{
      createdAt: "2019-07-10T08:26:06.939Z",
      dateLanded: "2019-07-10",
      da: 'England',
      documentNumber: "CC1",
      factor: 1,
      species: "LBE",
      status: "COMPLETE",
      rssNumber: 'C19353',
      weight: 100,
      extended: {
        vesselOverriddenByAdmin: undefined,
        speciesOverriddenByAdmin: false,
        flag: 'GBR',
        homePort: 'FLEETWOOD',
        imoNumber: null,
        licenceNumber: '22657',
        licenceValidTo: '2382-12-31',
        licenceHolder: 'I am the Licence Holder name for this fishing boat'
      }
    }])
  });

  it('will surface the admin licence holder', () => {
    const unwoundCertificates = [
      { documentNumber: 'CC1', status: 'COMPLETE', createdAt: '2019-07-10T08:26:06.939Z', speciesCode: 'LBE', factor: 1, pln: 'WA1', date: '2019-07-10', weight: 100, extended: { vesselOverriddenByAdmin: true, speciesOverriddenByAdmin: false, licenceHolder: 'Admin added licence holder' } }
    ];

    const result = Array.from(Transformations.mapCatchCerts(unwoundCertificates, () => ({
      rssNumber: 'C19353',
      da: 'England',
      homePort: 'FLEETWOOD',
      flag: 'GBR',
      imoNumber: null,
      licenceNumber: '22657',
      licenceValidTo: '2382-12-31',
      licenceHolder: 'I am the Licence Holder name for this fishing boat'
    })));

    expect(result).toStrictEqual([{
      createdAt: "2019-07-10T08:26:06.939Z",
      dateLanded: "2019-07-10",
      da: 'England',
      documentNumber: "CC1",
      factor: 1,
      species: "LBE",
      status: "COMPLETE",
      rssNumber: 'C19353',
      weight: 100,
      extended: {
        vesselOverriddenByAdmin: true,
        speciesOverriddenByAdmin: false,
        flag: 'GBR',
        homePort: 'FLEETWOOD',
        imoNumber: null,
        licenceNumber: '22657',
        licenceValidTo: '2382-12-31',
        licenceHolder: 'Admin added licence holder'
      }
    }])
  });
});

describe('on groupCatchCertsByLanding', () => {

  it('can group by rssNumber and dateLanded', () => {
    const unwoundCatchCerts = [
      { documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z', rssNumber: 'WA1', dateLanded: '2019-07-10', species: 'LBE', weight: 100 },
      { documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z', rssNumber: 'WA1', dateLanded: '2019-07-11', species: 'LBE', weight: 100 },
      { documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z', rssNumber: 'WA1', dateLanded: '2019-07-10', species: 'COD', weight: 500 },
      { documentNumber: 'CC2', createdAt: '2019-07-10T08:26:06.999Z', rssNumber: 'WA0', dateLanded: '2019-07-10', species: 'LBE', weight: 300 },
    ]

    const expected = [
      ['WA02019-07-10',
        [
          { documentNumber: 'CC2', createdAt: '2019-07-10T08:26:06.999Z', rssNumber: 'WA0', dateLanded: '2019-07-10', species: 'LBE', weight: 300 },
        ]
      ],
      ['WA12019-07-10',
        [
          { documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z', rssNumber: 'WA1', dateLanded: '2019-07-10', species: 'LBE', weight: 100 },
          { documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z', rssNumber: 'WA1', dateLanded: '2019-07-10', species: 'COD', weight: 500 },
        ]
      ],
      ['WA12019-07-11',
        [
          { documentNumber: 'CC1', createdAt: '2019-07-10T08:26:06.939Z', rssNumber: 'WA1', dateLanded: '2019-07-11', species: 'LBE', weight: 100 },
        ]
      ]
    ]

    const grouped = Array.from(Transformations.groupCatchCertsByLanding(
      _.sortBy(
        Array.from(unwoundCatchCerts),
        ['rssNumber', 'dateLanded', 'createdAt'])))

    expect(grouped).toEqual(expected)

  })

})

describe('licence map', () => {
  it('will fallback to England as DA', () => {

    const vessels = [
      {
        registrationNumber: 'K529',
        fishingLicenceValidFrom: '2006-06-07T00:00:00',
        fishingLicenceValidTo: '2006-06-30T00:00:00',
        adminPort: 'Airstrip One',
        rssNumber: 'A12032',
      }
    ]

    const vesselsIdx = generateIndex(vessels);
    const lookup = Transformations.vesselLookup(vesselsIdx);

    expect(lookup('K529', '2006-06-08').da).toBe('England')

  })

  it('will fail on when licence is missing', () => {

    const vessels = [
      {
        registrationNumber: 'K529',
        fishingLicenceValidFrom: '2006-06-07T00:00:00',
        fishingLicenceValidTo: '2006-06-30T00:00:00',
        adminPort: 'Airstrip One',
        rssNumber: 'A12032',
      }
    ]

    const vesselsIdx = generateIndex(vessels);
    const lookup = Transformations.vesselLookup(vesselsIdx);

    expect(lookup('K529', '2001-01-01')).toBe(undefined)

  })

  it('will find a valid licence and licence holder', () => {

    const vessels = [
      {
        registrationNumber: 'K529',
        fishingLicenceValidFrom: '2006-06-07T00:00:00',
        fishingLicenceValidTo: '2006-06-30T00:00:00',
        fishingLicenceNumber: '30117',
        adminPort: 'GUERNSEY',
        rssNumber: 'A12032',
        homePort: 'WESTRAY',
        flag: 'GBR',
        imo: null,
        licenceHolderName: 'I am the Licence Holder name for this fishing boat',
        vesselLength: 9.4
      }
    ]

    const vesselsIdx = generateIndex(vessels);
    const lookup = Transformations.vesselLookup(vesselsIdx);

    expect(lookup('K529', '2006-06-07'))
      .toStrictEqual({
        da: 'Guernsey',
        flag: 'GBR',
        homePort: 'WESTRAY',
        imoNumber: null,
        licenceNumber: '30117',
        licenceValidTo: '2006-06-30',
        rssNumber: 'A12032',
        licenceHolder: 'I am the Licence Holder name for this fishing boat',
        vesselLength: 9.4
      })
  })

  it('lower boundary (inclusive) check', () => {

    const vessels = [
      {
        registrationNumber: 'K529',
        fishingLicenceValidFrom: '2006-06-07T00:00:00',
        fishingLicenceValidTo: '2006-06-30T00:00:00',
        fishingLicenceNumber: '30117',
        adminPort: 'GUERNSEY',
        rssNumber: 'A12032',
        homePort: 'WESTRAY',
        flag: 'GBR',
        imo: null,
        licenceHolderName: 'I am the Licence Holder name for this fishing boat',
        vesselLength: 9.4
      }
    ]

    const vesselsIdx = generateIndex(vessels);
    const lookup = Transformations.vesselLookup(vesselsIdx);

    expect(lookup('K529', '2006-06-06')).toBe(undefined)

    expect(lookup('K529', '2006-06-07'))
      .toStrictEqual({
        da: 'Guernsey',
        flag: 'GBR',
        homePort: 'WESTRAY',
        imoNumber: null,
        licenceNumber: '30117',
        licenceValidTo: '2006-06-30',
        rssNumber: 'A12032',
        licenceHolder: 'I am the Licence Holder name for this fishing boat',
        vesselLength: 9.4
      })

  })

  it('upper boundery (inclusive) check', () => {

    const vessels = [
      {
        registrationNumber: 'K529',
        fishingLicenceValidFrom: '2006-06-07T00:00:00',
        fishingLicenceValidTo: '2006-06-30T00:00:00',
        fishingLicenceNumber: '30117',
        adminPort: 'GUERNSEY',
        rssNumber: 'A12032',
        homePort: 'WESTRAY',
        flag: 'GBR',
        imo: null,
        licenceHolderName: 'I am the Licence Holder name for this fishing boat',
        vesselLength: 9.4
      }
    ]

    const vesselsIdx = generateIndex(vessels);
    const lookup = Transformations.vesselLookup(vesselsIdx);

    expect(lookup('K529', '2006-06-29'))
      .toStrictEqual({
        da: 'Guernsey',
        flag: 'GBR',
        homePort: 'WESTRAY',
        imoNumber: null,
        licenceNumber: '30117',
        licenceValidTo: '2006-06-30',
        rssNumber: 'A12032',
        licenceHolder: 'I am the Licence Holder name for this fishing boat',
        vesselLength: 9.4
      })

    expect(lookup('K529', '2006-06-30'))
      .toStrictEqual({
        da: 'Guernsey',
        flag: 'GBR',
        homePort: 'WESTRAY',
        imoNumber: null,
        licenceNumber: '30117',
        licenceValidTo: '2006-06-30',
        rssNumber: 'A12032',
        licenceHolder: 'I am the Licence Holder name for this fishing boat',
        vesselLength: 9.4
      })

    expect(lookup('K529', '2006-06-30'))
      .toStrictEqual({
        da: 'Guernsey',
        flag: 'GBR',
        homePort: 'WESTRAY',
        imoNumber: null,
        licenceNumber: '30117',
        licenceValidTo: '2006-06-30',
        rssNumber: 'A12032',
        licenceHolder: 'I am the Licence Holder name for this fishing boat',
        vesselLength: 9.4
      })

    expect(lookup('K529', '2006-07-01')).toBe(undefined)

  })

});

describe('when mapping from a mongo processing statement to domain PS', () => {
  it('should map correctly', () => {
    const mockedMongoPS = {
      "catches": [
        {
          "species": "Atlantic herring (HER)",
          "scientificName": "Pseudophycis bachus",
          "catchCertificateNumber": "323223323242315",
          "catchCertificateType": "uk",
          "id": '323223323242315-1610018839',
          "totalWeightLanded": "2",
          "exportWeightBeforeProcessing": "2",
          "exportWeightAfterProcessing": "2"
        },
        {
          "species": "Allardice's moray (AMA)",
          "scientificName": "Allardice's moray",
          "catchCertificateNumber": "343243242321",
          "catchCertificateType": "uk",
          "id": '343243242321-1610018839',
          "totalWeightLanded": "5",
          "exportWeightBeforeProcessing": "5",
          "exportWeightAfterProcessing": "5"
        }
      ],
      "validationErrors": [
        {

        }
      ],
      "consignmentDescription": "asfd",
      "error": "",
      "addAnotherCatch": "No",
      "personResponsibleForConsignment": "asdfs",
      "plantApprovalNumber": "asdfasdfasdf",
      "plantName": "23523",
      "plantAddressOne": "30 Bob Drive",
      "plantAddressTwo": "Standish",
      "plantTownCity": "Wigan",
      "plantPostcode": "WN4 2JT",
      "dateOfAcceptance": "05/12/2019",
      "healthCertificateNumber": "44234234",
      "healthCertificateDate": "01/10/2019",
      "exporter": {
        "exporterCompanyName": "BONZO",
        "addressOne": "UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
        "addressTwo": "UPPER BRUNTINGTHORPE, LUTTERWORTH",
        "townCity": "HARBOROUGH",
        "postcode": "LE17 5QZ",
        "isExporterDetailsSavedAsDraft": false,
        "journey": "processingStatement",
        "currentUri": "/create-processing-statement/add-exporter-details",
        "nextUri": "/create-processing-statement/add-consignment-details",
        "user_id": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "exporterFullName": "John Test",
        "preLoadedName": true,
        "preLoadedAddress": true,
        "preLoadedCompanyName": true
      },
      "documentNumber": "GBR-2019-PS-B3905EB18",
      "user": {
        "email": "foo@foo.com",
        "principal": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
      }
    };
    const expectedOutput = {
      __t: "processingStatement",
      exportData: {
        catches: [
          { catchCertificateNumber: '323223323242315', catchCertificateType: 'uk', species: 'Atlantic herring (HER)', scientificName: "Pseudophycis bachus", id: '323223323242315-1610018839', totalWeightLanded: "2", exportWeightBeforeProcessing: "2", exportWeightAfterProcessing: "2" },
          { catchCertificateNumber: '343243242321', catchCertificateType: 'uk', species: 'Allardice\'s moray (AMA)', scientificName: "Allardice's moray", id: '343243242321-1610018839', totalWeightLanded: "5", exportWeightBeforeProcessing: "5", exportWeightAfterProcessing: "5" }
        ],
        exporterDetails: {
          postcode: "LE17 5QZ",
          exporterCompanyName: "BONZO"
        }
      },
      documentNumber: "GBR-2019-PS-B3905EB18",
      status: 'DRAFT',
    };
    const result = Transformations.mapProcessingStatementToPS(mockedMongoPS);

    expect(result).toStrictEqual(expectedOutput);
  });
});

describe('when mapping from a mongo storage document to domain SD', () => {
  it('should map correctly, taking into consideration casing', () => {
    const mockedMongoSD = {
      "catches": [
        {
          "product": "Atlantic herring (HER)",
          "scientificName": "Gadus morhua",
          "id": 'fasdfnasdfjasdfjaisdf8asdf8as-1610018839',
          "commodityCode": "423523432",
          "productWeight": "300",
          "dateOfUnloading": "01/10/2019",
          "placeOfUnloading": "351",
          "transportUnloadedFrom": "234",
          "certificateNumber": "fasdfnasdfjasdfjaisdf8asdf8as",
          "certificateType": "uk",
          "weightOnCC": "1000",
          "netWeightFisheryProductArrival": "10",
          "netWeightFisheryProductDeparture": "10",
          "netWeightProductArrival": "10",
          "netWeightProductDeparture": "10"
        },
        {
          "product": "Argentine anchovy (ANA)",
          "scientificName": "Argentine anchovy",
          "id": '2-1610018839',
          "commodityCode": "23408230498234",
          "productWeight": "200",
          "dateOfUnloading": "09/07/2019",
          "placeOfUnloading": "DOVER",
          "transportUnloadedFrom": "234",
          "certificateNumber": "2",
          "certificateType": "uk",
          "weightOnCC": "20000"
        }
      ],
      "storageFacilities": [
        {
          "facilityName": "11",
          "facilityAddressOne": "11 Dessert Way",
          "facilityAddressTwo": "Enyt-No-Nodyalb",
          "facilityTownCity": "Gateshead",
          "facilityPostcode": "N32 5PJ"
        },
        {
          "facilityName": "11 THE SECOND",
          "facilityAddressOne": "11 Dessert Way without water",
          "facilityAddressTwo": "Enyt-No-Nodyalb",
          "facilityTownCity": "Gateshead",
          "facilityPostcode": "N32 5PJ"
        }
      ],
      "validationErrors": [
        {

        }
      ],
      "addAnotherProduct": "No",
      "addAnotherStorageFacility": "No",
      "transport": {
        "vehicle": "truck",
        "currentUri": "/create-storage-document/do-you-have-a-road-transport-document",
        "journey": "storageNotes",
        "user_id": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
        "cmr": "true"
      },
      "exporter": {
        "exporterCompanyName": "BONZO",
        "preLoadedCompanyName": true,
        "exporterFullName": "John Test",
        "preLoadedName": true,
        "addressOne": "UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
        "postcode": "LE17 5QZ",
        "townCity": "HARBOROUGH",
        "addressTwo": "UPPER BRUNTINGTHORPE, LUTTERWORTH",
        "preLoadedAddress": true,
        "isExporterDetailsSavedAsDraft": false,
        "journey": "storageNotes",
        "currentUri": "/create-storage-document/add-exporter-details",
        "nextUri": "/create-storage-document/add-product-to-this-consignment",
        "user_id": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
      },
      "documentNumber": "GBR-2019-SD-DED9F3FE6",
      "user": {
        "email": "foo@foo.com",
        "principal": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
      }
    };
    const expectedOutput = {
      __t: "storageDocument",
      exportData: {
        catches: [
          {
            certificateNumber: 'FASDFNASDFJASDFJAISDF8ASDF8AS',
            certificateType: "uk",
            id: 'fasdfnasdfjasdfjaisdf8asdf8as-1610018839',
            product: 'Atlantic herring (HER)',
            productWeight: "300",
            weightOnCC: "1000",
            commodityCode: "423523432",
            dateOfUnloading: "01/10/2019",
            placeOfUnloading: "351",
            transportUnloadedFrom: "234",
            scientificName: "Gadus morhua",
            netWeightFisheryProductArrival: "10",
            netWeightFisheryProductDeparture: "10",
            netWeightProductArrival: "10",
            netWeightProductDeparture: "10"
          },
          {
            certificateNumber: '2',
            certificateType: "uk",
            id: '2-1610018839',
            product: 'Argentine anchovy (ANA)',
            productWeight: "200",
            weightOnCC: "20000",
            commodityCode: "23408230498234",
            dateOfUnloading: "09/07/2019",
            placeOfUnloading: "DOVER",
            transportUnloadedFrom: "234",
            scientificName: "Argentine anchovy",
            netWeightFisheryProductArrival: undefined,
            netWeightFisheryProductDeparture: undefined,
            netWeightProductArrival: undefined,
            netWeightProductDeparture: undefined
          }
        ],
        exporterDetails: {
          postcode: "LE17 5QZ",
          exporterCompanyName: "BONZO"
        }
      },
      documentNumber: "GBR-2019-SD-DED9F3FE6",
      status: 'DRAFT',
    };
    const result = Transformations.mapStorageDocumentToSD(mockedMongoSD);

    expect(result).toStrictEqual(expectedOutput);
  });
});

describe('map from the structure in orchestrator to cc', () => {
  const mockStructureInOrchestrator =
  {
    "documentNumber": "CC1",
    "exportPayload": {
      "items": [
        {
          "product": {
            "id": "55e627af-90d5-4046-9b45-16c269700fde",
            "commodityCode": "12345",
            "commodityCodeDescription": "some description",
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
            },
            "factor": 5,
            "speciesOverriddenByAdmin": false,
          },
          "landings": [
            {
              "model": {
                "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                "vessel": {
                  "pln": "WA1",
                  "vesselName": "DAYBREAK",
                  "flag": "GBR",
                  "cfr": "GBRC19027",
                  "homePort": "IJMUIDEN",
                  "licenceNumber": "11957",
                  "imoNumber": 8707537,
                  "licenceValidTo": "2382-12-31T00:00:00",
                  "licenceHolder": "MR JOHN DOE",
                  "rssNumber": "C19669",
                  "vesselLength": 113.97,
                  "label": "DAYBREAK (WA1)",
                  "domId": "CORNELISVROLIJKFZN-H171",
                  "vesselOverriddenByAdmin": true
                },
                "startDate": "2019-10-05",
                "dateLanded": "2019-10-06T00:00:00.000Z",
                "exportWeight": 78,
                "gearType": "Type 1",
                "faoArea": "FAO27",
                "highSeasArea": "yes",
                "rfmo": "General Fisheries Commission for the Mediterranean (GFCM)",
                "numberOfSubmissions": 0,
                "isLegallyDue": false,
                "riskScore": 0.25,
                "threshold": 1,
                "speciesRiskScore": 0.5,
                "vesselRiskScore": 0.5,
                "exporterRiskScore": 1,
                "isSpeciesRiskEnabled": false,
              }
            },
            {
              "model": {
                "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae",
                "vessel": {
                  "pln": "WA1",
                  "vesselName": "DAYBREAK",
                  "flag": "GBR",
                  "cfr": "GBRC19027",
                  "homePort": "IJMUIDEN",
                  "licenceNumber": "11957",
                  "imoNumber": 8707537,
                  "licenceValidTo": "2382-12-31T00:00:00",
                  "licenceHolder": "MR JOHN DOE",
                  "rssNumber": "C19669",
                  "vesselLength": 113.97,
                  "label": "DAYBREAK (WA1)",
                  "domId": "CORNELISVROLIJKFZN-H171"
                },
                "startDate": "2019-10-05",
                "dateLanded": "2019-07-01T00:00:00.000Z",
                "exportWeight": 78,
                "gearType": "Type 1",
                "faoArea": "FAO27",
                "highSeasArea": "yes",
                "rfmo": "General Fisheries Commission for the Mediterranean (GFCM)",
                "numberOfSubmissions": 1,
                "isLegallyDue": true,
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
    "exporter": { "exporterFullName": 'Mr Bob', "exporterCompanyName": "Bob's company", "postcode": "XX1 2XX", "contactId": 'some-contact-id', "accountId": 'some-account-id' },
    "transport": {
      "vehicle": "directLanding",
      "exportedFrom": "Jersey"
    }
  };

  const expectedCCObject = {
    "documentNumber": "CC1",
    "exportData": {
      "products": [
        {
          "speciesCode": "LBE",
          "speciesAdmin": undefined,
          "species": "Lobster",
          "commodityCode": "12345",
          "commodityCodeAdmin": undefined,
          "commodityCodeDescription": "some description",
          "state": { "code": "BAD", "name": "Fresh", "admin": undefined },
          "scientificName": "some scientific name",
          "presentation": { "code": "FIS", "name": "Filleted and skinned", "admin": undefined },
          "factor": 5,
          "caughtBy": [
            { "cfr": "GBRC19027", "vessel": "DAYBREAK", "pln": "WA1", "startDate": "2019-10-05", "date": "2019-10-06", "weight": 78, "gearType": "Type 1", "numberOfSubmissions": 1, "faoArea": "FAO27", "flag": "GBR", "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae", "vesselOverriddenByAdmin": true, "licenceHolder": "MR JOHN DOE", "dataEverExpected": false, "landingDataEndDate": undefined, "landingDataExpectedDate": undefined, "isLegallyDue": false, "exporterRiskScore": 1, "isSpeciesRiskEnabled": false, "riskScore": 0.25, "speciesRiskScore": 0.5, "threshold": 1, "vesselRiskScore": 0.5, "highSeasArea": "yes", "rfmo": "General Fisheries Commission for the Mediterranean (GFCM)", "exclusiveEconomicZones": undefined, },
            { "cfr": "GBRC19027", "vessel": "DAYBREAK", "pln": "WA1", "startDate": "2019-10-05", "date": "2019-07-01", "weight": 78, "gearType": "Type 1", "numberOfSubmissions": 2, "faoArea": "FAO27", "flag": "GBR", "id": "e5b7332b-945f-4bfd-8345-e24ee19386ae", "vesselOverriddenByAdmin": undefined, "licenceHolder": "MR JOHN DOE", "dataEverExpected": false, "landingDataEndDate": undefined, "landingDataExpectedDate": undefined, "isLegallyDue": true, "exporterRiskScore": 1, "isSpeciesRiskEnabled": false, "riskScore": 0.04, "speciesRiskScore": 0.2, "threshold": 1, "vesselRiskScore": 0.2, "highSeasArea": "yes", "rfmo": "General Fisheries Commission for the Mediterranean (GFCM)", "exclusiveEconomicZones": undefined, },
          ]
        }],
      "exporterDetails": {
        "exporterFullName": 'Mr Bob',
        "exporterCompanyName": "Bob's company",
        "exporterPostCode": "XX1 2XX",
        "contactId": "some-contact-id",
        "accountId": 'some-account-id'
      },
      "transportation": { "exportedFrom": "Jersey", "vehicle": "directLanding" }
    }
  };


  let mockGetToLiveWeightFactor;
  let mockLicenceLookup;

  beforeEach(() => {
    mockGetToLiveWeightFactor = jest.spyOn(Cache, 'getToLiveWeightFactor');
    mockGetToLiveWeightFactor.mockReturnValue(5);

    mockLicenceLookup = jest.spyOn(Cache, 'getVesselsIdx');
    mockLicenceLookup.mockReturnValueOnce(() => ([]));
    mockLicenceLookup.mockReturnValueOnce(() => ([{ validFrom: '2019-01-01', validTo: '2020-01-01', rssNumber: 'DAYBREAKWA1' }]));
  });

  afterEach(() => {
    mockGetToLiveWeightFactor.mockRestore();
  });

  it('should map from mongo structure to cc schema', () => {
    const outputFromMapping = Transformations.mapExportPayloadToCC(mockStructureInOrchestrator);
    delete outputFromMapping.createdAt;
    expect(outputFromMapping).toStrictEqual(expectedCCObject);
  });

  it('should be valid json schema', () => {
    const ajv = new AJV();
    addFormats(ajv);
    const validate = ajv.compile(minimalSchema)
    const outputFromMapping = Transformations.mapExportPayloadToCC(mockStructureInOrchestrator);

    const isOutputValidAccordingToSchema = validate(outputFromMapping);

    expect(isOutputValidAccordingToSchema).toBe(true);
  })

});

describe('When mapping from a raw catch cert output to an online validation report', () => {

  let mockGetTotalRiskScore;
  let mockIsHighRisk;

  beforeEach(() => {
    mockGetTotalRiskScore = jest.spyOn(IsHighRisk, 'getTotalRiskScore');
    mockGetTotalRiskScore.mockReturnValue(0.7);

    mockIsHighRisk = jest.spyOn(IsHighRisk, 'isHighRisk');
    mockIsHighRisk.mockReturnValue(true);
  });

  afterEach(() => {
    mockGetTotalRiskScore.mockRestore();
    mockIsHighRisk.mockRestore();
  });

  it('will return an empty array if everything is correct', () => {
    const rawCatchCerts: ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        status: 'COMPLETE',
        createdAt: '2019-07-13T08:26:06.939Z',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightFactor: 1,
        weightOnCert: 100,
        rawWeightOnCert: 100,
        weightOnAllCerts: 200,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        isLandingExists: true,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        isOverusedThisCert: false,
        isOverusedAllCerts: false,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        landingTotalBreakdown: [],
        durationSinceCertCreation: moment.duration(
          moment.utc()
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))),
        durationBetweenCertCreationAndFirstLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))),
        durationBetweenCertCreationAndLastLandingRetrieved: moment.duration(
          moment.utc('2019-07-11T09:00:00.000Z')
            .diff(moment.utc('2019-07-13T08:26:06.939Z'))),
        extended: {
          exporterName: 'Mr Bob',
          vessel: 'DAYBREAK',
          highSeasArea: 'yes',
          rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
          pln: 'WA1',
          species: 'Lobster',
          state: 'BAD',
          commodityCode: '1234',
          status: 'COMPLETE',
          licenceHolder: 'Mr Bob'
        }
      }];
    const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

    expect(result).toEqual([]);
  });

  it('will contain the species', () => {
    const rawCatchCerts: ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        status: 'COMPLETE',
        createdAt: '2019-07-13T08:26:06.939Z',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightFactor: 1,
        weightOnCert: 100,
        rawWeightOnCert: 100,
        weightOnAllCerts: 200,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        isLandingExists: true,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        isOverusedThisCert: true,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        landingTotalBreakdown: [],
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
          exporterName: 'Mr Bob',
          vessel: 'DAYBREAK',
          highSeasArea: 'yes',
          rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
          pln: 'WA1',
          species: 'Lobster',
          state: 'BAD',
          commodityCode: '1234',
          status: 'COMPLETE',
          licenceHolder: 'Mr Bob'
        }
      }];

    const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

    expect(result[0].species).toEqual('LBE');
  });

  it('will contain the presentation', () => {
    const rawCatchCerts: ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        status: 'COMPLETE',
        createdAt: '2019-07-13T08:26:06.939Z',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightFactor: 1,
        weightOnCert: 100,
        rawWeightOnCert: 100,
        weightOnAllCerts: 200,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        isLandingExists: true,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        isOverusedThisCert: true,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        landingTotalBreakdown: [],
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
          exporterName: 'Mr Bob',
          vessel: 'DAYBREAK',
          highSeasArea: 'yes',
          rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
          pln: 'WA1',
          species: 'Lobster',
          presentation: 'Cut & Fresh',
          state: 'BAD',
          commodityCode: '1234',
          status: 'COMPLETE',
          licenceHolder: 'Mr Bob'
        }
      }];

    const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

    expect(result[0].presentation).toEqual('Cut & Fresh');
  });

  it('will contain the state', () => {
    const rawCatchCerts: ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        status: 'COMPLETE',
        createdAt: '2019-07-13T08:26:06.939Z',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightFactor: 1,
        weightOnCert: 100,
        rawWeightOnCert: 100,
        weightOnAllCerts: 200,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        isLandingExists: true,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        isOverusedThisCert: true,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        landingTotalBreakdown: [],
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
          exporterName: 'Mr Bob',
          vessel: 'DAYBREAK',
          highSeasArea: 'yes',
          rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
          pln: 'WA1',
          species: 'Lobster',
          presentation: 'Cut & Fresh',
          state: 'BAD',
          commodityCode: '1234',
          status: 'COMPLETE',
          licenceHolder: 'Mr Bob'
        }
      }];

    const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

    expect(result[0].state).toEqual('BAD');
  });

  it('will contain the vessel', () => {
    const rawCatchCerts: ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        status: 'COMPLETED',
        createdAt: '2019-07-13T08:26:06.939Z',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightFactor: 1,
        weightOnCert: 100,
        rawWeightOnCert: 100,
        weightOnAllCerts: 200,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        isLandingExists: true,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        isOverusedThisCert: true,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        landingTotalBreakdown: [],
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
          exporterName: 'Mr Bob',
          vessel: 'DAYBREAK',
          highSeasArea: 'yes',
          rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
          pln: 'WA1',
          species: 'Lobster',
          presentation: 'Cut & Fresh',
          state: 'BAD',
          commodityCode: '1234',
          status: 'COMPLETE',
          licenceHolder: 'Mr Bob'
        }
      }];

    const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

    expect(result[0].vessel).toEqual('DAYBREAK');
  });

  it('will contain the date', () => {
    const rawCatchCerts: ICcQueryResult[] = [
      {
        documentNumber: 'CC1',
        documentType: 'catchCertificate',
        status: 'COMPLETE',
        createdAt: '2019-07-13T08:26:06.939Z',
        rssNumber: 'rssWA1',
        da: 'Guernsey',
        dateLanded: '2019-07-10',
        species: 'LBE',
        weightFactor: 1,
        weightOnCert: 100,
        rawWeightOnCert: 100,
        weightOnAllCerts: 200,
        weightOnAllCertsBefore: 0,
        weightOnAllCertsAfter: 100,
        isLandingExists: true,
        isSpeciesExists: true,
        numberOfLandingsOnDay: 1,
        weightOnLanding: 30,
        weightOnLandingAllSpecies: 30,
        isOverusedThisCert: true,
        isOverusedAllCerts: true,
        isExceeding14DayLimit: false,
        overUsedInfo: [],
        landingTotalBreakdown: [],
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
          exporterName: 'Mr Bob',
          vessel: 'DAYBREAK',
          highSeasArea: 'yes',
          rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
          pln: 'WA1',
          species: 'Lobster',
          presentation: 'Cut & Fresh',
          state: 'BAD',
          commodityCode: '1234',
          status: 'COMPLETE',
          licenceHolder: 'Mr Bob'
        }
      }];

    const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

    expect(result[0].date).toEqual(moment("2019-07-10T00:00:00.000Z").toDate());
  });

  describe('When checking the failure rules', () => {
    let mockIsWithinDeminimus;
    let mockIsLegallyDue;
    let mockIsQuotaSpecies;
    let mockGetVesselDetails;
    let mockIsSpeciesFailure;
    let mockIsHighRisk;
    let mockIsRiskEnabled;

    beforeEach(() => {
      mockIsWithinDeminimus = jest.spyOn(Shared, 'isWithinDeminimus');
      mockIsLegallyDue = jest.spyOn(IsLegallyDue, 'isLegallyDue');
      mockIsQuotaSpecies = jest.spyOn(Cache, 'isQuotaSpecies');
      mockGetVesselDetails = jest.spyOn(VesselService, 'getVesselDetails');
      mockIsSpeciesFailure = jest.spyOn(Shared, 'isSpeciesFailure');
      mockIsHighRisk = jest.spyOn(IsHighRisk, 'isHighRisk');
      mockIsRiskEnabled = jest.spyOn(IsHighRisk, 'isRiskEnabled');

      mockIsWithinDeminimus.mockReturnValue(false);
      mockIsLegallyDue.mockReturnValue(false);
      mockIsQuotaSpecies.mockReturnValue(false);
      mockGetVesselDetails.mockReturnValue({ vesselLength: 10, cfr: "test", adminPort: "testPort" });
    });

    afterEach(() => {
      mockIsWithinDeminimus.mockRestore();
      mockIsLegallyDue.mockRestore();
      mockIsQuotaSpecies.mockRestore();
      mockGetVesselDetails.mockRestore();
      mockIsSpeciesFailure.mockRestore();
      mockIsHighRisk.mockRestore();
      mockIsRiskEnabled.mockRestore();
    });

    describe('When validating against an ELog for species with a LIVE WEIGHT less than OR equal to the given 50KG deminimus', () => {
      beforeEach(() => {
        mockIsWithinDeminimus.mockReturnValue(true);
      });

      it('will not add failures for 3C (the species specified is different to the species landed)', () => {
        const rawCatchCerts: ICcQueryResult[] = [
          {
            documentNumber: "CC1",
            documentType: "catchCertificate",
            createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
            status: "COMPLETE",
            rssNumber: "rssWA1",
            da: "Guernsey",
            dateLanded: "2019-07-10",
            species: "LBE",
            weightOnCert: 50,
            rawWeightOnCert: 25,
            weightOnAllCerts: 25,
            weightOnAllCertsBefore: 0,
            weightOnAllCertsAfter: 25,
            weightFactor: 2,
            isLandingExists: true,
            isSpeciesExists: false,
            numberOfLandingsOnDay: 1,
            weightOnLanding: 0,
            weightOnLandingAllSpecies: 24.5,
            landingTotalBreakdown: [
              {
                factor: 1,
                isEstimate: true,
                weight: 30,
                liveWeight: 51,
                source: LandingSources.ELog
              }
            ],
            source: LandingSources.ELog,
            isOverusedThisCert: true,
            isOverusedAllCerts: true,
            isExceeding14DayLimit: false,
            overUsedInfo: [],
            durationSinceCertCreation: moment.duration(
              moment.utc()
                .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
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
              highSeasArea: 'yes',
              rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
              pln: "WA1",
              species: "Lobster",
              state: "FRE",
              stateName: "fresh",
              commodityCode: "1234",
              investigation: {},
              transportationVehicle: "directLanding",
              licenceHolder: 'Mr Bob'
            }
          }
        ];

        const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

        expect(mockIsWithinDeminimus).toHaveBeenCalledWith(rawCatchCerts[0].isSpeciesExists, rawCatchCerts[0].weightOnCert, Shared.DEMINIMUS_IN_KG);

        expect(result[0].failures).not.toContain(ValidationRules.THREE_C);
      });

      it('will not add failures for 3C when the species toggle is disabled', () => {
        mockIsRiskEnabled.mockReturnValue(false);

        const rawCatchCerts: ICcQueryResult[] = [
          {
            documentNumber: 'CC1',
            documentType: 'catchCertificate',
            status: 'COMPLETE',
            createdAt: '2019-07-13T08:26:06.939Z',
            rssNumber: 'rssWA1',
            da: 'Guernsey',
            dateLanded: '2019-07-10',
            species: 'LBE',
            weightFactor: 1,
            weightOnCert: 100,
            rawWeightOnCert: 100,
            weightOnAllCerts: 200,
            weightOnAllCertsBefore: 0,
            weightOnAllCertsAfter: 100,
            isLandingExists: true,
            isSpeciesExists: false,
            numberOfLandingsOnDay: 1,
            weightOnLanding: 30,
            weightOnLandingAllSpecies: 30,
            isOverusedThisCert: true,
            isOverusedAllCerts: true,
            isExceeding14DayLimit: false,
            overUsedInfo: [],
            landingTotalBreakdown: [
              {
                factor: 1,
                isEstimate: true,
                weight: 30,
                liveWeight: 51,
                source: LandingSources.ELog
              }
            ],
            source: LandingSources.ELog,
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
              exporterName: 'Mr Bob',
              vessel: 'DAYBREAK',
              highSeasArea: 'yes',
              rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
              pln: 'WA1',
              species: 'Lobster',
              state: 'BAD',
              commodityCode: '1234',
              status: 'COMPLETE',
              licenceHolder: 'Mr Bob'
            }
          }
        ];

        const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

        expect(result[0].failures).not.toContain(ValidationRules.THREE_C);
      });

      it('will not add failures for 3C when the species toggle is enabled', () => {
        mockIsRiskEnabled.mockReturnValue(true);

        const rawCatchCerts: ICcQueryResult[] = [
          {
            documentNumber: 'CC1',
            documentType: 'catchCertificate',
            status: 'COMPLETE',
            createdAt: '2019-07-13T08:26:06.939Z',
            rssNumber: 'rssWA1',
            da: 'Guernsey',
            dateLanded: '2019-07-10',
            species: 'LBE',
            weightFactor: 1,
            weightOnCert: 100,
            rawWeightOnCert: 100,
            weightOnAllCerts: 200,
            weightOnAllCertsBefore: 0,
            weightOnAllCertsAfter: 100,
            isLandingExists: true,
            isSpeciesExists: false,
            numberOfLandingsOnDay: 1,
            weightOnLanding: 30,
            weightOnLandingAllSpecies: 30,
            isOverusedThisCert: true,
            isOverusedAllCerts: true,
            isExceeding14DayLimit: false,
            overUsedInfo: [],
            landingTotalBreakdown: [
              {
                factor: 1,
                isEstimate: true,
                weight: 30,
                liveWeight: 51,
                source: LandingSources.ELog
              }
            ],
            source: LandingSources.ELog,
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
              exporterName: 'Mr Bob',
              vessel: 'DAYBREAK',
              highSeasArea: 'yes',
              rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
              pln: 'WA1',
              species: 'Lobster',
              state: 'BAD',
              commodityCode: '1234',
              status: 'COMPLETE',
              licenceHolder: 'Mr Bob'
            }
          }
        ];

        const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

        expect(result[0].failures).not.toContain(ValidationRules.THREE_C);
      });

    });

    describe('When validating against an ELog for a species with a LIVE WEIGHT more than the given 50KG deminimus', () => {
      beforeEach(() => {
        mockIsWithinDeminimus.mockReturnValue(false);
      });

      it('will add failures for 3C (the species specified is different to the species landed)', () => {
        const rawCatchCerts: ICcQueryResult[] = [
          {
            documentNumber: 'CC1',
            documentType: 'catchCertificate',
            status: 'COMPLETE',
            createdAt: '2019-07-13T08:26:06.939Z',
            rssNumber: 'rssWA1',
            da: 'Guernsey',
            dateLanded: '2019-07-10',
            species: 'LBE',
            weightFactor: 1,
            weightOnCert: 100,
            rawWeightOnCert: 100,
            weightOnAllCerts: 200,
            weightOnAllCertsBefore: 0,
            weightOnAllCertsAfter: 100,
            isLandingExists: true,
            isSpeciesExists: false,
            numberOfLandingsOnDay: 1,
            weightOnLanding: 30,
            weightOnLandingAllSpecies: 30,
            isOverusedThisCert: true,
            isOverusedAllCerts: true,
            isExceeding14DayLimit: false,
            overUsedInfo: [],
            landingTotalBreakdown: [
              {
                factor: 1,
                isEstimate: true,
                weight: 30,
                liveWeight: 51,
                source: LandingSources.ELog
              }
            ],
            source: LandingSources.ELog,
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
              exporterName: 'Mr Bob',
              vessel: 'DAYBREAK',
              highSeasArea: 'yes',
              rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
              pln: 'WA1',
              species: 'Lobster',
              state: 'BAD',
              commodityCode: '1234',
              status: 'COMPLETE',
              licenceHolder: 'Mr Bob'
            }
          }];

        const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

        expect(result[0].failures[0]).toEqual(ValidationRules.THREE_C);
      });

      it('will add failures for 3C when the species toggle is disabled', () => {
        mockIsRiskEnabled.mockReturnValue(false);

        const rawCatchCerts: ICcQueryResult[] = [
          {
            documentNumber: 'CC1',
            documentType: 'catchCertificate',
            status: 'COMPLETE',
            createdAt: '2019-07-13T08:26:06.939Z',
            rssNumber: 'rssWA1',
            da: 'Guernsey',
            dateLanded: '2019-07-10',
            species: 'LBE',
            weightFactor: 1,
            weightOnCert: 100,
            rawWeightOnCert: 100,
            weightOnAllCerts: 200,
            weightOnAllCertsBefore: 0,
            weightOnAllCertsAfter: 100,
            isLandingExists: true,
            isSpeciesExists: false,
            numberOfLandingsOnDay: 1,
            weightOnLanding: 30,
            weightOnLandingAllSpecies: 30,
            isOverusedThisCert: true,
            isOverusedAllCerts: true,
            isExceeding14DayLimit: false,
            overUsedInfo: [],
            landingTotalBreakdown: [
              {
                factor: 1,
                isEstimate: true,
                weight: 30,
                liveWeight: 51,
                source: LandingSources.ELog
              }
            ],
            source: LandingSources.ELog,
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
              exporterName: 'Mr Bob',
              vessel: 'DAYBREAK',
              highSeasArea: 'yes',
              rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
              pln: 'WA1',
              species: 'Lobster',
              state: 'BAD',
              commodityCode: '1234',
              status: 'COMPLETE',
              licenceHolder: 'Mr Bob'
            }
          }
        ];

        const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

        expect(result[0].failures[0]).toEqual(ValidationRules.THREE_C);
      });

      describe('When landing is low risk', () => {
        beforeEach(() => {
          mockIsHighRisk.mockReturnValue(false);
        });

        it('will not add failures for 3C when the toggle is enabled', () => {
          mockIsRiskEnabled.mockReturnValue(true);

          const rawCatchCerts: ICcQueryResult[] = [
            {
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
              weightOnCert: 50,
              rawWeightOnCert: 25,
              weightOnAllCerts: 25,
              weightOnAllCertsBefore: 0,
              weightOnAllCertsAfter: 25,
              weightFactor: 2,
              isLandingExists: true,
              isSpeciesExists: false,
              numberOfLandingsOnDay: 1,
              weightOnLanding: 0,
              weightOnLandingAllSpecies: 24.5,
              landingTotalBreakdown: [
                {
                  factor: 1,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.ELog
                }
              ],
              source: LandingSources.ELog,
              isOverusedThisCert: true,
              isOverusedAllCerts: true,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment.duration(
                moment.utc()
                  .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
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
                highSeasArea: 'yes',
                rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {},
                transportationVehicle: "directLanding",
                licenceHolder: 'Mr Bob'
              }
            }
          ];

          const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);
          expect(result[0].failures).not.toContain(ValidationRules.THREE_C);
        });
      });

      describe('When landing is high risk', () => {
        beforeEach(() => {
          mockIsHighRisk.mockReturnValue(true);
        });

        it('will add failures for 3C when the toggle is enabled', () => {
          mockIsRiskEnabled.mockReturnValue(true);

          const rawCatchCerts: ICcQueryResult[] = [
            {
              documentNumber: "CC1",
              documentType: "catchCertificate",
              createdAt: moment.utc("2019-07-13T08:26:06.939Z").toISOString(),
              status: "COMPLETE",
              rssNumber: "rssWA1",
              da: "Guernsey",
              dateLanded: "2019-07-10",
              species: "LBE",
              weightOnCert: 50,
              rawWeightOnCert: 25,
              weightOnAllCerts: 25,
              weightOnAllCertsBefore: 0,
              weightOnAllCertsAfter: 25,
              weightFactor: 2,
              isLandingExists: true,
              isSpeciesExists: false,
              numberOfLandingsOnDay: 1,
              weightOnLanding: 0,
              weightOnLandingAllSpecies: 24.5,
              landingTotalBreakdown: [
                {
                  factor: 1,
                  isEstimate: true,
                  weight: 30,
                  liveWeight: 51,
                  source: LandingSources.ELog
                }
              ],
              source: LandingSources.ELog,
              isOverusedThisCert: true,
              isOverusedAllCerts: true,
              isExceeding14DayLimit: false,
              overUsedInfo: [],
              durationSinceCertCreation: moment.duration(
                moment.utc()
                  .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
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
                highSeasArea: 'yes',
                rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
                pln: "WA1",
                species: "Lobster",
                state: "FRE",
                stateName: "fresh",
                commodityCode: "1234",
                investigation: {},
                transportationVehicle: "directLanding",
                licenceHolder: 'Mr Bob'
              }
            }
          ];

          const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

          expect(mockIsWithinDeminimus).toHaveBeenCalledWith(rawCatchCerts[0].isSpeciesExists, rawCatchCerts[0].weightOnCert, Shared.DEMINIMUS_IN_KG);
          expect(result[0].failures).toContain(ValidationRules.THREE_C);
        });
      });

    });

    describe('When landing is low risk', () => {

      beforeEach(() => {
        mockIsHighRisk.mockReturnValue(false);
      });

      it('will add failures for 3C when the species toggle is disabled', () => {
        mockIsRiskEnabled.mockReturnValue(false);

        const rawCatchCerts: ICcQueryResult[] = [
          {
            documentNumber: 'CC1',
            documentType: 'catchCertificate',
            createdAt: '2019-07-13T08:26:06.939Z',
            status: 'COMPLETE',
            rssNumber: 'rssWA1',
            da: 'Guernsey',
            dateLanded: '2019-07-10',
            species: 'LBE',
            weightFactor: 1,
            weightOnCert: 100,
            rawWeightOnCert: 100,
            weightOnAllCerts: 200,
            weightOnAllCertsBefore: 0,
            weightOnAllCertsAfter: 100,
            isLandingExists: true,
            isSpeciesExists: false,
            numberOfLandingsOnDay: 1,
            weightOnLanding: 30,
            weightOnLandingAllSpecies: 30,
            isOverusedThisCert: true,
            isOverusedAllCerts: true,
            isExceeding14DayLimit: false,
            overUsedInfo: [],
            landingTotalBreakdown: [],
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
              exporterName: 'Mr Bob',
              vessel: 'DAYBREAK',
              highSeasArea: 'yes',
              rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
              pln: 'WA1',
              species: 'Lobster',
              state: 'BAD',
              commodityCode: '1234',
              status: 'COMPLETE',
              licenceHolder: 'Mr Bob'
            }
          }];

        const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

        expect(result[0].failures).toContain(ValidationRules.THREE_C);
        expect(mockIsSpeciesFailure).toHaveBeenCalledWith(mockIsHighRisk);
      });

      it('will not add failures for 3C when the species toggle is enabled', () => {
        mockIsRiskEnabled.mockReturnValue(true);

        const rawCatchCerts: ICcQueryResult[] = [
          {
            documentNumber: 'CC1',
            documentType: 'catchCertificate',
            createdAt: '2019-07-13T08:26:06.939Z',
            status: 'COMPLETE',
            rssNumber: 'rssWA1',
            da: 'Guernsey',
            dateLanded: '2019-07-10',
            species: 'LBE',
            weightFactor: 1,
            weightOnCert: 100,
            rawWeightOnCert: 100,
            weightOnAllCerts: 200,
            weightOnAllCertsBefore: 0,
            weightOnAllCertsAfter: 100,
            isLandingExists: true,
            isSpeciesExists: false,
            numberOfLandingsOnDay: 1,
            weightOnLanding: 30,
            weightOnLandingAllSpecies: 30,
            isOverusedThisCert: true,
            isOverusedAllCerts: true,
            isExceeding14DayLimit: false,
            overUsedInfo: [],
            landingTotalBreakdown: [],
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
              exporterName: 'Mr Bob',
              vessel: 'DAYBREAK',
              highSeasArea: 'yes',
              rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
              pln: 'WA1',
              species: 'Lobster',
              state: 'BAD',
              commodityCode: '1234',
              status: 'COMPLETE',
              licenceHolder: 'Mr Bob'
            }
          }];

        const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

        expect(result[0].failures).not.toContain(ValidationRules.THREE_C);

        expect(mockIsSpeciesFailure).toHaveBeenCalledWith(mockIsHighRisk);
      });

      it('will not add failures for 3D (the weight of fish must not exceed the weight landed by that vessel on that date)', () => {
        const rawCatchCerts: ICcQueryResult[] = [
          {
            documentNumber: 'CC1',
            documentType: 'catchCertificate',
            createdAt: '2019-07-13T08:26:06.939Z',
            status: 'COMPLETE',
            rssNumber: 'rssWA1',
            da: 'Guernsey',
            dateLanded: '2019-07-10',
            species: 'LBE',
            weightFactor: 1,
            weightOnCert: 100,
            rawWeightOnCert: 100,
            weightOnAllCerts: 200,
            weightOnAllCertsBefore: 0,
            weightOnAllCertsAfter: 100,
            isLandingExists: true,
            isSpeciesExists: true,
            numberOfLandingsOnDay: 1,
            weightOnLanding: 30,
            weightOnLandingAllSpecies: 30,
            isOverusedThisCert: true,
            isOverusedAllCerts: true,
            isExceeding14DayLimit: false,
            overUsedInfo: [],
            landingTotalBreakdown: [],
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
              exporterName: 'Mr Bob',
              vessel: 'DAYBREAK',
              highSeasArea: 'yes',
              rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
              pln: 'WA1',
              species: 'Lobster',
              state: 'BAD',
              commodityCode: '1234',
              status: 'COMPLETE',
              licenceHolder: 'Mr Bob'
            }
          }];

        const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

        expect(result[0].failures).not.toContain(ValidationRules.THREE_D);
      });
    });

    describe('When landing is high risk', () => {

      beforeEach(() => {
        mockIsHighRisk.mockReturnValue(true);
      });

      it('will add failures for 3C when the species toggle is enabled', () => {
        mockIsRiskEnabled.mockReturnValue(true);

        const rawCatchCerts: ICcQueryResult[] = [
          {
            documentNumber: 'CC1',
            documentType: 'catchCertificate',
            createdAt: '2019-07-13T08:26:06.939Z',
            status: 'COMPLETE',
            rssNumber: 'rssWA1',
            da: 'Guernsey',
            dateLanded: '2019-07-10',
            species: 'LBE',
            weightFactor: 1,
            weightOnCert: 100,
            rawWeightOnCert: 100,
            weightOnAllCerts: 200,
            weightOnAllCertsBefore: 0,
            weightOnAllCertsAfter: 100,
            isLandingExists: true,
            isSpeciesExists: false,
            numberOfLandingsOnDay: 1,
            weightOnLanding: 30,
            weightOnLandingAllSpecies: 30,
            isOverusedThisCert: true,
            isOverusedAllCerts: true,
            isExceeding14DayLimit: false,
            overUsedInfo: [],
            landingTotalBreakdown: [],
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
              exporterName: 'Mr Bob',
              vessel: 'DAYBREAK',
              highSeasArea: 'yes',
              rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
              pln: 'WA1',
              species: 'Lobster',
              state: 'BAD',
              commodityCode: '1234',
              status: 'COMPLETE',
              licenceHolder: 'Mr Bob'
            }
          }];

        const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

        expect(result[0].failures).toContain(ValidationRules.THREE_C);
        expect(mockIsSpeciesFailure).toHaveBeenCalledWith(mockIsHighRisk);
      });

      it('will add failures for 3D (the weight of fish must not exceed the weight landed by that vessel on that date)', () => {
        const rawCatchCerts: ICcQueryResult[] = [
          {
            documentNumber: 'CC1',
            documentType: 'catchCertificate',
            createdAt: '2019-07-13T08:26:06.939Z',
            status: 'COMPLETE',
            rssNumber: 'rssWA1',
            da: 'Guernsey',
            dateLanded: '2019-07-10',
            species: 'LBE',
            weightFactor: 1,
            weightOnCert: 100,
            rawWeightOnCert: 100,
            weightOnAllCerts: 200,
            weightOnAllCertsBefore: 0,
            weightOnAllCertsAfter: 100,
            isLandingExists: true,
            isSpeciesExists: true,
            numberOfLandingsOnDay: 1,
            weightOnLanding: 30,
            weightOnLandingAllSpecies: 30,
            isOverusedThisCert: true,
            isOverusedAllCerts: false,
            isExceeding14DayLimit: false,
            landingTotalBreakdown: [],
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
              exporterName: 'Mr Bob',
              vessel: 'DAYBREAK',
              highSeasArea: 'yes',
              rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
              pln: 'WA1',
              species: 'Lobster',
              state: 'BAD',
              commodityCode: '1234',
              status: 'COMPLETE',
              licenceHolder: 'Mr Bob'
            }
          }];

        const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

        expect(result[0].failures[0]).toEqual(ValidationRules.THREE_D);
      });

      it('will add failures for NO_DATA when the vessel has been overridden', () => {
        const rawCatchCerts: ICcQueryResult[] = [
          {
            documentNumber: 'CC1',
            documentType: 'catchCertificate',
            createdAt: '2019-07-13T08:26:06.939Z',
            status: 'COMPLETE',
            rssNumber: 'rssWA1',
            da: 'Guernsey',
            dateLanded: '2019-07-10',
            species: 'LBE',
            weightFactor: 1,
            weightOnCert: 100,
            rawWeightOnCert: 100,
            weightOnAllCerts: 200,
            weightOnAllCertsBefore: 0,
            weightOnAllCertsAfter: 100,
            isLandingExists: false,
            isSpeciesExists: false,
            numberOfLandingsOnDay: 0,
            weightOnLanding: 0,
            weightOnLandingAllSpecies: 0,
            isOverusedThisCert: false,
            isOverusedAllCerts: false,
            isExceeding14DayLimit: false,
            landingTotalBreakdown: [],
            overUsedInfo: [],
            durationSinceCertCreation: moment.duration(
              moment.utc()
                .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
            durationBetweenCertCreationAndFirstLandingRetrieved: null,
            durationBetweenCertCreationAndLastLandingRetrieved: null,
            extended: {
              exporterName: 'Mr Bob',
              exporterPostCode: 'SE1 X12',
              exporterContactId: 'some-contact-id',
              exporterAccountId: 'some-account-id',
              vessel: 'DAYBREAK',
              highSeasArea: 'yes',
              rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
              pln: 'WA1',
              species: 'Lobster',
              state: 'BAD',
              commodityCode: '1234',
              status: 'COMPLETE',
              vesselOverriddenByAdmin: true,
              licenceHolder: 'Mr Bob',
              dataEverExpected: true,
              landingDataExpected: '2019-07-13',
              landingDataEnd: '2019-07-13'
            }
          }
        ];

        const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

        expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
        expect(mockIsHighRisk).toHaveBeenCalledWith(0.7);
        expect(mockGetVesselDetails).not.toHaveBeenCalled();
        expect(mockIsQuotaSpecies).not.toHaveBeenCalled();
        expect(mockIsLegallyDue).not.toHaveBeenCalledWith();
        expect(result[0].failures[0]).toContain(ValidationRules.NO_DATA);
      });

      it('will not add failures for NO_DATA when landing data is not expected', () => {
        const rawCatchCerts: ICcQueryResult[] = [{
          documentNumber: 'CC1',
          documentType: 'catchCertificate',
          createdAt: '2019-07-13T08:26:06.939Z',
          status: 'COMPLETE',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: '2019-07-10',
          species: 'LBE',
          weightFactor: 1,
          weightOnCert: 100,
          rawWeightOnCert: 100,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          isLandingExists: false,
          isSpeciesExists: false,
          numberOfLandingsOnDay: 0,
          weightOnLanding: 0,
          weightOnLandingAllSpecies: 0,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          landingTotalBreakdown: [],
          overUsedInfo: [],
          durationSinceCertCreation: moment.duration(
            moment.utc()
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: null,
          durationBetweenCertCreationAndLastLandingRetrieved: null,
          extended: {
            exporterName: 'Mr Bob',
            exporterPostCode: 'SE1 X12',
            exporterContactId: 'some-contact-id',
            exporterAccountId: 'some-account-id',
            vessel: 'DAYBREAK',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            pln: 'WA1',
            species: 'Lobster',
            state: 'BAD',
            commodityCode: '1234',
            status: 'COMPLETE',
            vesselOverriddenByAdmin: false,
            licenceHolder: 'Mr Bob',
            dataEverExpected: false
          }
        }];

        const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);
        expect(result).toHaveLength(0);
      });

      it('will not add failures for NO_DATA when landing data is unavailable', () => {

        const rawCatchCerts: ICcQueryResult[] = [{
          documentNumber: 'CC1',
          documentType: 'catchCertificate',
          createdAt: '2019-07-13T08:26:06.939Z',
          status: 'COMPLETE',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: '2019-07-10',
          species: 'LBE',
          weightFactor: 1,
          weightOnCert: 100,
          rawWeightOnCert: 100,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          isLandingExists: false,
          isSpeciesExists: false,
          numberOfLandingsOnDay: 0,
          weightOnLanding: 0,
          weightOnLandingAllSpecies: 0,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          landingTotalBreakdown: [],
          overUsedInfo: [],
          durationSinceCertCreation: moment.duration(
            moment.utc()
              .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
          durationBetweenCertCreationAndFirstLandingRetrieved: null,
          durationBetweenCertCreationAndLastLandingRetrieved: null,
          extended: {
            exporterName: 'Mr Bob',
            exporterPostCode: 'SE1 X12',
            exporterContactId: 'some-contact-id',
            exporterAccountId: 'some-account-id',
            vessel: 'DAYBREAK',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            pln: 'WA1',
            species: 'Lobster',
            state: 'BAD',
            commodityCode: '1234',
            status: 'COMPLETE',
            vesselOverriddenByAdmin: false,
            licenceHolder: 'Mr Bob',
            dataEverExpected: true,
            landingDataExpectedDate: '2030-07-11',
            landingDataEndDate: '2030-07-12',
          }
        }];

        const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);
        expect(result).toHaveLength(0);
      });

      describe('When landing data does not exist', () => {

        it('will add failures for NO_DATA', () => {
          const rawCatchCerts: ICcQueryResult[] = [
            {
              documentNumber: 'CC1',
              documentType: 'catchCertificate',
              createdAt: '2019-07-13T08:26:06.939Z',
              status: 'COMPLETE',
              rssNumber: 'rssWA1',
              da: 'Guernsey',
              dateLanded: '2019-07-10',
              species: 'LBE',
              weightFactor: 1,
              weightOnCert: 100,
              rawWeightOnCert: 100,
              weightOnAllCerts: 200,
              weightOnAllCertsBefore: 0,
              weightOnAllCertsAfter: 100,
              isLandingExists: false,
              isSpeciesExists: false,
              numberOfLandingsOnDay: 0,
              weightOnLanding: 0,
              weightOnLandingAllSpecies: 0,
              isOverusedThisCert: false,
              isOverusedAllCerts: false,
              isExceeding14DayLimit: false,
              landingTotalBreakdown: [],
              overUsedInfo: [],
              durationSinceCertCreation: moment.duration(
                moment.utc()
                  .diff(moment.utc('2019-07-13T08:26:06.939Z'))).toISOString(),
              durationBetweenCertCreationAndFirstLandingRetrieved: null,
              durationBetweenCertCreationAndLastLandingRetrieved: null,
              extended: {
                exporterName: 'Mr Bob',
                exporterPostCode: 'SE1 X12',
                exporterContactId: 'some-contact-id',
                exporterAccountId: 'some-account-id',
                vessel: 'DAYBREAK',
                highSeasArea: 'yes',
                rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
                pln: 'WA1',
                species: 'Lobster',
                state: 'BAD',
                commodityCode: '1234',
                status: 'COMPLETE',
                licenceHolder: 'Mr Bob',
                dataEverExpected: true,
                landingDataExpectedDate: '2019-07-12',
                landingDataEndDate: '2019-07-14',
              }
            }];

          const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

          expect(mockGetTotalRiskScore).toHaveBeenCalledWith('WA1', 'LBE', 'some-account-id', 'some-contact-id');
          expect(mockIsHighRisk).toHaveBeenCalledWith(0.7);
          expect(result[0].failures[0]).toContain(ValidationRules.NO_DATA);
        });

      });

      describe('When landing data does exist', () => {

        it('will not add failures for NO_DATA', () => {
          const rawCatchCerts: ICcQueryResult[] = [
            {
              documentNumber: 'CC1',
              documentType: 'catchCertificate',
              createdAt: '2019-07-13T08:26:06.939Z',
              status: 'COMPLETE',
              rssNumber: 'rssWA1',
              da: 'Guernsey',
              dateLanded: '2019-07-10',
              species: 'LBE',
              weightFactor: 1,
              weightOnCert: 100,
              rawWeightOnCert: 100,
              weightOnAllCerts: 200,
              weightOnAllCertsBefore: 0,
              weightOnAllCertsAfter: 100,
              isLandingExists: true,
              isSpeciesExists: true,
              numberOfLandingsOnDay: 1,
              weightOnLanding: 30,
              weightOnLandingAllSpecies: 30,
              isOverusedThisCert: false,
              isOverusedAllCerts: false,
              isExceeding14DayLimit: false,
              landingTotalBreakdown: [{
                factor: 1,
                isEstimate: false,
                weight: 300,
                liveWeight: 300,
                source: LandingSources.LandingDeclaration
              }],
              source: LandingSources.LandingDeclaration,
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
                exporterName: 'Mr Bob',
                exporterPostCode: 'AB1 X12',
                exporterContactId: 'some-contact-id',
                exporterAccountId: 'some-account-id',
                vessel: 'DAYBREAK',
                highSeasArea: 'yes',
                rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
                pln: 'WA1',
                species: 'Lobster',
                state: 'BAD',
                commodityCode: '1234',
                status: 'COMPLETE',
                licenceHolder: 'Mr Bob'
              }
            }];

          const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

          expect(result).toEqual([]);
        });

      });
    });

    it('will add failures for 4A (export weight plus previous exported weight from the same landing is more than the total landed weight)', () => {
      const rawCatchCerts: ICcQueryResult[] = [
        {
          documentNumber: 'CC1',
          documentType: 'catchCertificate',
          status: 'COMPLETE',
          createdAt: '2019-07-13T08:26:06.939Z',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: '2019-07-10',
          species: 'LBE',
          weightFactor: 1,
          weightOnCert: 100,
          rawWeightOnCert: 100,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          isOverusedThisCert: false,
          isOverusedAllCerts: true,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          landingTotalBreakdown: [],
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
            exporterName: 'Mr Bob',
            vessel: 'DAYBREAK',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            pln: 'WA1',
            species: 'Lobster',
            state: 'BAD',
            commodityCode: '1234',
            status: 'COMPLETE',
            licenceHolder: 'Mr Bob'
          }
        }];

      const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

      expect(result[0].failures[0]).toEqual(ValidationRules.FOUR_A);
    });

    it('will add failure for NO LICENCE HOLDER (when CEFAS does not supply a licence holder name)', () => {
      const rawCatchCerts: ICcQueryResult[] = [
        {
          documentNumber: 'CC1',
          documentType: 'catchCertificate',
          status: 'COMPLETE',
          createdAt: '2019-07-13T08:26:06.939Z',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: '2019-07-10',
          species: 'LBE',
          weightFactor: 1,
          weightOnCert: 10,
          rawWeightOnCert: 10,
          weightOnAllCerts: 10,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 10,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          landingTotalBreakdown: [],
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
            exporterName: 'Mr Bob',
            vessel: 'DAYBREAK',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            pln: 'WA1',
            species: 'Lobster',
            state: 'BAD',
            commodityCode: '1234',
            status: 'COMPLETE'
          }
        }
      ];

      const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

      expect(result[0].failures[0]).toEqual(ValidationRules.NO_LICENCE_HOLDER);
    });

    it('will add failure for NO LICENCE HOLDER when licence holder is empty', () => {
      const rawCatchCerts: ICcQueryResult[] = [
        {
          documentNumber: 'CC1',
          documentType: 'catchCertificate',
          status: 'COMPLETE',
          createdAt: '2019-07-13T08:26:06.939Z',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: '2019-07-10',
          species: 'LBE',
          weightFactor: 1,
          weightOnCert: 10,
          rawWeightOnCert: 10,
          weightOnAllCerts: 10,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 10,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          isOverusedThisCert: false,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          landingTotalBreakdown: [],
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
            exporterName: 'Mr Bob',
            vessel: 'DAYBREAK',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            pln: 'WA1',
            species: 'Lobster',
            state: 'BAD',
            commodityCode: '1234',
            status: 'COMPLETE',
            licenceHolder: ''
          }
        }
      ];

      const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);

      expect(result[0].failures[0]).toEqual(ValidationRules.NO_LICENCE_HOLDER);
    });
  });

  describe('If there is one more record with the same Catch Certificate for the same species, presentation, state, vessel, and date', () => {
    let mockIsHighRisk;

    beforeAll(() => {
      mockIsHighRisk = jest.spyOn(IsHighRisk, 'isHighRisk');
    });

    beforeEach(() => {
      mockIsHighRisk.mockReturnValue(true);
    });

    it('combine the results into a single record', () => {
      const rawCatchCerts: ICcQueryResult[] = [
        {
          documentNumber: 'CC1',
          documentType: 'catchCertificate',
          status: 'BLOCKED',
          createdAt: '2019-07-13T08:26:06.939Z',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: '2019-07-10',
          species: 'LBE',
          weightFactor: 1,
          weightOnCert: 100,
          rawWeightOnCert: 100,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          isLandingExists: true,
          isSpeciesExists: false,
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          isOverusedThisCert: true,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          landingTotalBreakdown: [],
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
            exporterName: 'Mr Bob',
            vessel: 'DAYBREAK',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            pln: 'WA1',
            species: 'Lobster',
            state: 'BAD',
            presentation: 'TEST',
            commodityCode: '1234',
            status: 'COMPLETE',
            licenceHolder: 'Mr Bob'
          }
        }, {
          documentNumber: 'CC1',
          documentType: 'catchCertificate',
          status: 'BLOCKED',
          createdAt: '2019-07-13T08:26:06.939Z',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: '2019-07-10',
          species: 'LBE',
          weightFactor: 1,
          weightOnCert: 100,
          rawWeightOnCert: 100,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          isOverusedThisCert: true,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          landingTotalBreakdown: [],
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
            exporterName: 'Mr Bob',
            vessel: 'DAYBREAK',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            pln: 'WA1',
            species: 'Lobster',
            state: 'BAD',
            commodityCode: '1234',
            presentation: 'TEST',
            status: 'COMPLETE',
            licenceHolder: 'Mr Bob'
          }
        }];

      const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);
      const expectedResult: IOnlineValidationReportItem[] = [
        {
          species: 'LBE',
          presentation: 'TEST',
          state: 'BAD',
          failures: [ValidationRules.THREE_C, ValidationRules.THREE_D],
          vessel: "DAYBREAK",
          date: moment.utc("2019-07-10T00:00:00.000Z").toDate()
        }
      ]

      expect(result).toEqual(expectedResult);
    });

    it('will display as many records as there is combinations of species, presentation, state, vessel, and date', () => {
      const rawCatchCerts: ICcQueryResult[] = [
        {
          documentNumber: 'CC1',
          documentType: 'catchCertificate',
          status: 'COMPLETE',
          createdAt: '2019-07-13T08:26:06.939Z',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: '2019-07-10',
          species: 'LBE',
          weightFactor: 1,
          weightOnCert: 100,
          rawWeightOnCert: 100,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          isLandingExists: true,
          isSpeciesExists: false,
          landingTotalBreakdown: [],
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          isOverusedThisCert: true,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
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
            exporterName: 'Mr Bob',
            vessel: 'DAYBREAK',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            pln: 'WA1',
            species: 'Lobster',
            state: 'BAD',
            presentation: 'TEST',
            commodityCode: '1234',
            status: 'COMPLETE',
            licenceHolder: 'Mr Bob'
          }
        }, {
          documentNumber: 'CC1',
          documentType: 'catchCertificate',
          status: 'COMPLETE',
          createdAt: '2019-07-13T08:26:06.939Z',
          rssNumber: 'rssWA1',
          da: 'guernsey',
          dateLanded: '2019-07-11',
          species: 'LBE',
          weightFactor: 1,
          weightOnCert: 100,
          rawWeightOnCert: 100,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          landingTotalBreakdown: [],
          weightOnLandingAllSpecies: 30,
          isOverusedThisCert: false,
          isOverusedAllCerts: true,
          isExceeding14DayLimit: false,
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
            exporterName: 'Mr Bob',
            vessel: 'DAYBREAK',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            pln: 'WA1',
            species: 'Lobster',
            state: 'BAD',
            presentation: 'TEST',
            commodityCode: '1234',
            status: 'COMPLETE',
            licenceHolder: 'Mr Bob'
          }
        }, {
          documentNumber: 'CC1',
          documentType: 'catchCertificate',
          status: 'COMPLETE',
          createdAt: '2019-07-13T08:26:06.939Z',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: '2019-07-10',
          species: 'LBE',
          weightFactor: 1,
          weightOnCert: 100,
          rawWeightOnCert: 100,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          isLandingExists: true,
          isSpeciesExists: false,
          landingTotalBreakdown: [],
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          isOverusedThisCert: true,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
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
            exporterName: 'Mr Bob',
            vessel: 'DAYBREAK 2',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            pln: 'WA1',
            species: 'Lobster',
            state: 'BAD',
            presentation: 'TEST',
            commodityCode: '1234',
            status: 'COMPLETE',
            licenceHolder: 'Mr Bob'
          }
        }, {
          documentNumber: 'CC1',
          documentType: 'catchCertificate',
          status: 'COMPLETE',
          createdAt: '2019-07-13T08:26:06.939Z',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: '2019-07-10',
          species: 'LBE',
          weightFactor: 1,
          weightOnCert: 100,
          rawWeightOnCert: 100,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          isLandingExists: true,
          isSpeciesExists: true,
          landingTotalBreakdown: [],
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          isOverusedThisCert: true,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
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
            exporterName: 'Mr Bob',
            vessel: 'DAYBREAK',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            pln: 'WA1',
            species: 'Lobster',
            state: 'BAD',
            commodityCode: '1234',
            presentation: 'TEST',
            status: 'COMPLETE',
            licenceHolder: 'Mr Bob'
          }
        },
        {
          documentNumber: 'CC2',
          documentType: 'catchCertificate',
          status: 'COMPLETE',
          createdAt: '2019-07-13T08:26:06.939Z',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: '2019-07-10',
          species: 'SNAIL',
          weightFactor: 1,
          weightOnCert: 100,
          rawWeightOnCert: 100,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          isOverusedThisCert: false,
          landingTotalBreakdown: [],
          isOverusedAllCerts: true,
          isExceeding14DayLimit: false,
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
            exporterName: 'Mr Bob',
            vessel: 'DAYBREAK',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            pln: 'WA1',
            species: 'Lobster',
            state: 'WITH SHELL',
            commodityCode: '1234',
            presentation: 'IN RAIN WATER',
            status: 'COMPLETE',
            licenceHolder: 'Mr Bob'
          }
        },
        {
          documentNumber: 'CC3',
          documentType: 'catchCertificate',
          status: 'COMPLETE',
          createdAt: '2019-07-13T08:26:06.939Z',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: '2019-07-10',
          species: 'LOG',
          weightFactor: 1,
          weightOnCert: 100,
          rawWeightOnCert: 100,
          weightOnAllCerts: 200,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 100,
          isLandingExists: true,
          isSpeciesExists: false,
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          isOverusedThisCert: true,
          isOverusedAllCerts: true,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          landingTotalBreakdown: [],
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
            exporterName: 'Mr Bob',
            vessel: 'DAYBREAK',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            pln: 'WA1',
            species: 'Log',
            state: 'WET',
            commodityCode: '1234',
            presentation: 'CHAINSAW CUT',
            status: 'COMPLETE',
            licenceHolder: 'Mr Bob'
          }
        }];

      const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);
      const expectedResult: IOnlineValidationReportItem[] = [
        {
          species: 'LBE',
          presentation: 'TEST',
          state: 'BAD',
          failures: [ValidationRules.THREE_C, ValidationRules.THREE_D],
          vessel: "DAYBREAK",
          date: moment.utc("2019-07-10T00:00:00.000Z").toDate()
        },
        {
          species: 'LBE',
          presentation: 'TEST',
          state: 'BAD',
          failures: [ValidationRules.FOUR_A],
          vessel: "DAYBREAK",
          date: moment.utc("2019-07-11T00:00:00.000Z").toDate()
        },
        {
          species: 'LBE',
          presentation: 'TEST',
          state: 'BAD',
          failures: [ValidationRules.THREE_C, ValidationRules.THREE_D],
          vessel: "DAYBREAK 2",
          date: moment.utc("2019-07-10T00:00:00.000Z").toDate()
        },
        {
          species: 'SNAIL',
          presentation: 'IN RAIN WATER',
          state: 'WITH SHELL',
          failures: [ValidationRules.FOUR_A],
          vessel: "DAYBREAK",
          date: moment.utc("2019-07-10T00:00:00.000Z").toDate()
        },
        {
          species: 'LOG',
          presentation: 'CHAINSAW CUT',
          state: 'WET',
          failures: [ValidationRules.THREE_C, ValidationRules.THREE_D, ValidationRules.FOUR_A],
          vessel: "DAYBREAK",
          date: moment.utc("2019-07-10T00:00:00.000Z").toDate()
        }
      ]

      expect(result).toEqual(expectedResult);
    });

    it('will correctly omit 3C where validation is by ELOG and the LIVE WEIGHT is less than OR equal to the given DEMINIMUS', () => {
      const rawCatchCerts: ICcQueryResult[] = [
        {
          documentNumber: 'CC1',
          documentType: 'catchCertificate',
          status: 'BLOCKED',
          createdAt: '2019-07-13T08:26:06.939Z',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: '2019-07-10',
          species: 'LBE',
          weightFactor: 1,
          weightOnCert: 50,
          rawWeightOnCert: 50,
          weightOnAllCerts: 150,
          weightOnAllCertsBefore: 0,
          weightOnAllCertsAfter: 50,
          isLandingExists: true,
          isSpeciesExists: false,
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          isOverusedThisCert: true,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          landingTotalBreakdown: [],
          source: LandingSources.ELog,
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
            exporterName: 'Mr Bob',
            vessel: 'DAYBREAK',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            pln: 'WA1',
            species: 'Lobster',
            state: 'BAD',
            presentation: 'TEST',
            commodityCode: '1234',
            status: 'COMPLETE',
            licenceHolder: 'Mr Bob'
          }
        }, {
          documentNumber: 'CC1',
          documentType: 'catchCertificate',
          status: 'BLOCKED',
          createdAt: '2019-07-13T08:26:06.939Z',
          rssNumber: 'rssWA1',
          da: 'Guernsey',
          dateLanded: '2019-07-10',
          species: 'LBE',
          weightFactor: 1,
          weightOnCert: 100,
          rawWeightOnCert: 100,
          weightOnAllCerts: 150,
          weightOnAllCertsBefore: 50,
          weightOnAllCertsAfter: 150,
          isLandingExists: true,
          isSpeciesExists: true,
          numberOfLandingsOnDay: 1,
          weightOnLanding: 30,
          weightOnLandingAllSpecies: 30,
          isOverusedThisCert: true,
          isOverusedAllCerts: false,
          isExceeding14DayLimit: false,
          overUsedInfo: [],
          landingTotalBreakdown: [],
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
            exporterName: 'Mr Bob',
            vessel: 'DAYBREAK',
            highSeasArea: 'yes',
            rfmo: 'General Fisheries Commission for the Mediterranean (GFCM)',
            pln: 'WA1',
            species: 'Lobster',
            state: 'BAD',
            commodityCode: '1234',
            presentation: 'TEST',
            status: 'COMPLETE',
            licenceHolder: 'Mr Bob'
          }
        }];

      const result: IOnlineValidationReportItem[] = rawCatchCertToOnlineValidationReport(rawCatchCerts);
      const expectedResult: IOnlineValidationReportItem[] = [{
        species: 'LBE',
        presentation: 'TEST',
        state: 'BAD',
        failures: [ValidationRules.THREE_D],
        vessel: "DAYBREAK",
        date: moment.utc("2019-07-10T00:00:00.000Z").toDate()
      }
      ];

      expect(result).toEqual(expectedResult);
    });
  });
});

describe('when mapping from a raw foreign catch cert to an online report', () => {
  it('will convert the status to COMPLETE when no failed certificates exists', () => {
    const rawOnlineValidation = [{
      status: "DRAFT",
      documentNumber: "FCC1",
      documentType: "PS",
      createdAt: "2021-01-12",
      da: "England",
      species: "COD",
      commodityCode: "0101011",
      weightOnDoc: 0,
      extended: {
        id: "some id",
      },
      weightOnAllDocs: 0,
      weightOnFCC: 0,
      isOverAllocated: false,
      overAllocatedByWeight: 0,
      overUsedInfo: [],
      isMismatch: false
    }];

    const result = rawForeignCatchCertToOnlineReport(rawOnlineValidation);

    expect(result.rawData[0].status).toStrictEqual("COMPLETE");
  });

  it('will NOT convert the status to COMPLETE when failed certificates exists', () => {
    const rawOnlineValidation = [{
      catchCertificateNumber: "cert id",
      status: "DRAFT",
      isOverAllocated: true,
      documentNumber: "FCC1",
      documentType: "PS",
      createdAt: "2021-01-12",
      da: "England",
      species: "COD",
      commodityCode: "0101011",
      weightOnDoc: 0,
      extended: {
        id: "some id",
      },
      weightOnAllDocs: 0,
      weightOnFCC: 0,
      overAllocatedByWeight: 0,
      overUsedInfo: [],
      isMismatch: false
    }];

    const result = rawForeignCatchCertToOnlineReport(rawOnlineValidation);

    expect(result.rawData[0].status).toStrictEqual("DRAFT");
  });
});

describe('when getting a set of referenced landings from catch certificates', () => {

  it('can find the unique set', () => {

    const catchCerts = [
      {
        documentNumber: "CC1",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 },
                { vessel: "DAYBREAK", pln: "WA2", date: "2019-07-10", weight: 100 }
              ]
            },
            {
              speciesCode: "BOB",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 },
                { vessel: "DAYBREAK", pln: "WA2", date: "2019-07-10", weight: 100 },
                { vessel: "DAYBREAK", pln: "WA2", date: "2019-07-11", weight: 100 }
              ]
            }
          ]
        }
      },
      {
        documentNumber: "CC2",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products: [
            {
              speciesCode: "LBE",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-12", weight: 100 },
                { vessel: "DAYBREAK", pln: "WA2", date: "2019-07-12", weight: 100 }
              ]
            },
            {
              speciesCode: "BOB",
              caughtBy: [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-12", weight: 100 },
                { vessel: "DAYBREAK", pln: "WA2", date: "2019-07-12", weight: 100 },
                { vessel: "DAYBREAK", pln: "WA2", date: "2019-07-13", weight: 100 }
              ]
            }
          ]
        }
      }
    ]

    const vessels = [
      {
        registrationNumber: 'WA1',
        fishingLicenceValidFrom: '2006-06-07',
        fishingLicenceValidTo: '2100-06-30',
        adminPort: 'Airstrip One',
        rssNumber: 'RS1',
      },
      {
        registrationNumber: 'WA2',
        fishingLicenceValidFrom: '2006-06-07',
        fishingLicenceValidTo: '2100-06-30',
        adminPort: 'Airstrip One',
        rssNumber: 'RS2',
      }
    ]

    const expected = [
      { dateLanded: '2019-07-10', pln: 'WA1', rssNumber: 'RS1' },
      { dateLanded: '2019-07-10', pln: 'WA2', rssNumber: 'RS2' },
      { dateLanded: '2019-07-11', pln: 'WA2', rssNumber: 'RS2' },
      { dateLanded: '2019-07-12', pln: 'WA1', rssNumber: 'RS1' },
      { dateLanded: '2019-07-12', pln: 'WA2', rssNumber: 'RS2' },
      { dateLanded: '2019-07-13', pln: 'WA2', rssNumber: 'RS2' },
    ]

    const vesselsIdx = generateIndex(vessels);

    const licenceLookup = Transformations.vesselLookup(vesselsIdx)

    const res = Array.from(Transformations.getLandingsFromCatchCerts(catchCerts, licenceLookup))

    expect(res).toEqual(expected)

  })
})

describe('getLastAuditEvent', () => {

  const audits = [
    {
      "eventType": "INVESTIGATED",
      "triggeredBy": "Bob",
      "timestamp": new Date(),
      "data": { "investigationStatus": "DATA_ERROR_NFA" }
    },
    {
      "eventType": "VOIDED",
      "triggeredBy": "Bob",
      "timestamp": new Date(),
      "data": null
    },
    {
      "eventType": "INVESTIGATED",
      "triggeredBy": "Bob",
      "timestamp": new Date(),
      "data": { "investigationStatus": "MINOR_VERBAL" }
    },
    {
      "eventType": "VOIDED",
      "triggeredBy": "Fred",
      "timestamp": new Date(),
      "data": null
    }
  ];

  it('should get the last investigated audit', () => {

    const actual = getLastAuditEvent(audits, AuditEventTypes.Investigated);

    expect(actual).toStrictEqual(audits[2]);

  });

  it('should get the last voided audit', () => {

    const actual = getLastAuditEvent(audits, AuditEventTypes.Voided);

    expect(actual).toStrictEqual(audits[3]);

  });

  it('should return undefined if there are no events of the given type', () => {

    const actual = getLastAuditEvent(audits, 'X');

    expect(actual).toBeUndefined();

  });

  it('should return undefined if there is no audit array', () => {

    const actual = getLastAuditEvent([], AuditEventTypes.Voided);

    expect(actual).toBeUndefined();

  });

});