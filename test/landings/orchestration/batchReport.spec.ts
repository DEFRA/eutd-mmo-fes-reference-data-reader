const _ = require('lodash')
import moment from 'moment'

const mongoose = require('mongoose');

import { MongoMemoryServer } from 'mongodb-memory-server';

import { generateIndex, BoomiService } from 'mmo-shared-reference-data'
import * as cache from '../../../src/data/cache'
import { DocumentModel } from '../../../src/landings/types/document'
import { FailedOnlineCertificates } from '../../../src/landings/types/query'
import { LandingModel, LandingSources } from '../../../src/landings/types/landing'
import * as Report from '../../../src/landings/orchestration/batchReport'
import * as CatchCert from '../../../src/landings/persistence/catchCert'
import * as BlockedDocuments from '../../../src/landings/persistence/blockedDocuments'
import * as Documents from '../../../src/landings/persistence/storeDocProcStat'

const vessels = [
  {
    fishingVesselName: "",
    registrationNumber:"WA1",
    fishingLicenceValidFrom:"2010-12-29T00:00:00",
    fishingLicenceValidTo:"2020-12-20T00:00:00",
    rssNumber: "rssWA1",
    adminPort: 'GUERNSEY',
    vesselLength: 100,
    flag: "",
    homePort: "",
    fishingLicenceNumber: "",
    imo: null
  },
  {
    fishingVesselName: "",
    registrationNumber:"WA2",
    fishingLicenceValidFrom:"2010-12-29T00:00:00",
    fishingLicenceValidTo:"2020-12-20T00:00:00",
    rssNumber: "rssWA2",
    adminPort: 'GUERNSEY',
    vesselLength: 5,
    flag: "",
    homePort: "",
    fishingLicenceNumber: "",
    imo: null
  }
]
const vesselsIdx = generateIndex(vessels)
const getVesselIdxMock = jest.spyOn(cache, 'getVesselsIdx');
getVesselIdxMock.mockReturnValue(vesselsIdx)
const getVesselsDataMock = jest.spyOn(cache, 'getVesselsData')
getVesselsDataMock.mockReturnValue(vessels)

interface ICatchTestItem {
  species: string,
  weight: number,
  area: number,
  dateLanded: string,
}

const createCefas = (rssNumber: string, catches: ICatchTestItem[]) => ({
  cfr: 'cfr',
  rssNumber,
  vesselRegistrationNumber: 'regNumber',
  vesselName: 'vesselName',
  fishingAuthority: 'fishingAuthority',
  landings: _(catches)
    .sortBy('dateLanded')
    .groupBy('dateLanded')
    .map( (items, dateLanded) => ({
      logbookNumber: 'logbookNumber',
      landingDateTime: dateLanded,
      landingPort: 'landingPort',
      landingAreas: _(items)
        .sortBy('area')
        .groupBy('area')
        .map( (items, area) => ({
          faoArea: parseInt(area),
          faoSubArea: 'SUB' + area,
          landingAreaCatches: _(items)
            .map(item => ({
              species: item.species,
              weight: item.weight,
              presentation: 'PRE',
              state: 'STA'
            })).value()
        })).value()
    })).value(),
  dateTimeStamp: '20190101T000000Z'
})


describe('all reporting functions', () => {

  let mongoServer;

  const opts = { connectTimeoutMS:60000, socketTimeoutMS:600000, serverSelectionTimeoutMS:60000 }

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, opts).catch(err => {console.log(err)});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('the investigation function', () => {

    describe('for catch certificates', () => {

      describe('for COMPLETE documents', () => {

        /*
         * Mock the Boomi Service to get landings (for > 10m)
         */

        const landings = {
          'rssWA1:2019-07-11': createCefas('rssWA1', [{
            species: 'COD',
            weight: 100,
            area: 5,
            dateLanded: '2019-07-11T12:00:00Z'
          }])
        }
        const getLandingDataMock = jest.fn()
        getLandingDataMock.mockImplementation(
          async (dateLanded, rssNumber, _) => {
            const key = `${rssNumber}:${dateLanded}`
            const res = landings[key] ? [landings[key]] : []
            return res
          }
        )
        BoomiService.getLandingData = getLandingDataMock

        beforeEach(async () => {
          await LandingModel.deleteMany({});
          getLandingDataMock.mockClear()
        })

        beforeAll(async () => {

          let catchCert

          catchCert = new DocumentModel({
            __t: "catchCert",
            status: "COMPLETE",
            documentNumber: "CC1",
            createdAt: moment().toISOString(),
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            exportData: {
              products: [
                {
                  speciesCode: "COD",
                  caughtBy: [
                    {vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100}
                  ]
                }]
            }
          })
          await catchCert.save()

          catchCert = new DocumentModel({
            __t: "catchCert",
            status: "COMPLETE",
            documentNumber: "CC2",
            createdAt: moment().toISOString(),
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            exportData: {
              products: [
                { speciesCode: "BAS",
                  caughtBy: [
                    {vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100}
                  ]
                }]
            }
          })
          await catchCert.save()

          catchCert = new DocumentModel({
            __t: "catchCert",
            status: "COMPLETE",
            documentNumber: "CC3",
            createdAt: moment().toISOString(),
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            exportData: {
              products: [
                { speciesCode: "BAS",
                  caughtBy: [
                    {vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100}
                  ]
                }]
            }
          })
          await catchCert.save()

          catchCert = new DocumentModel({
            __t: "catchCert",
            status: "COMPLETE",
            documentNumber: "CC4",
            createdAt: '2019-01-01T10:00:00Z',
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            exportData: {
              products: [
                { speciesCode: "BAS",
                  caughtBy: [
                    {vessel: "DAYBREAK", pln: "WA1", date: "2019-01-01", weight: 100}
                  ]
                }]
            }
          })
          await catchCert.save()

        })

        afterAll(async () => {
          await DocumentModel.deleteMany({});
        })

        it('can filter on document number', async () => {

          const res = Array.from(await Report.catchCertInvestigationReport({documentNumber: 'CC1'}))

          expect(res.length).toBe(1)

          expect(res[0].documentNumber).toBe('CC1')
          expect(res[0].FI0_136_numberOfFailedValidations).toBe(0)   // cc created < 14 days.. so no failed validation
          expect(res[0].FI0_288_numberOfLandings).toBe(undefined)

        })

        it('can filter on document number and will update missing landings', async () => {

          const res = Array.from(await Report.catchCertInvestigationReport({documentNumber: 'CC3'}))

          expect(res[0].documentNumber).toBe('CC3')
          expect(getLandingDataMock).toHaveBeenCalled()
          expect(res[0].FI0_288_numberOfLandings).toEqual(1)

        })

        it('will NOT update landings from API when landings already satisfied', async () => {

          const landing = new LandingModel({
            rssNumber: 'rssWA1',
            dateTimeLanded: moment.utc('2019-07-10T03:00:00Z'),
            source: LandingSources.CatchRecording,
            items: [
              {species: 'COD', weight: 2000, factor: 1},
              {species: 'BAS', weight: 2000, factor: 1}
            ]
          })
          await landing.save()

          const res = Array.from(await Report.catchCertInvestigationReport({documentNumber: 'CC1'}))

          expect(res[0].documentNumber).toBe('CC1')
          expect(getLandingDataMock).not.toHaveBeenCalled()
          expect(res[0].FI0_288_numberOfLandings).toEqual(1)

        })

        it('will not try and get landings for CC that are > 40 days old', async () => {
          await Report.catchCertInvestigationReport({documentNumber: 'CC4'})
          expect(getLandingDataMock).not.toHaveBeenCalled()
        })

        it('will include elogs when looking for landing data', async () => {
          getLandingDataMock.mockResolvedValue([]);

          Array.from(await Report.catchCertInvestigationReport({documentNumber: 'CC3'}))

          expect(getLandingDataMock.mock.calls.length).toBe(3);
          expect(getLandingDataMock.mock.calls[0][2]).toBe('landing');
          expect(getLandingDataMock.mock.calls[1][2]).toBe('eLogs');
          expect(getLandingDataMock.mock.calls[2][2]).toBe('salesNotes');
        })

      })

      describe('for VOID documents', () => {

        beforeAll(async () => {

          let catchCert

          catchCert = new DocumentModel({
            __t: "catchCert",
            status: "COMPLETE",
            documentNumber: "CC1",
            createdAt: moment().toISOString(),
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            exportData: {
              products: [
                {
                  speciesCode: "COD",
                  caughtBy: [{ vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 }]
                }],
              exporterDetails: {'exporterCompanyName': 'Exporter Bob'}
            }
          })
          await catchCert.save()

          catchCert = new DocumentModel({
            __t: "catchCert",
            status: "VOID",
            documentNumber: "CC2",
            createdAt: moment(),
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            exportData: {
              products: [
                { speciesCode: "BAS",
                  caughtBy: [{ vessel: "DAYBREAK", pln: "WA2", date: "2019-07-10", weight: 100 }]
                }],
              exporterDetails: {'exporterCompanyName': 'Exporter Bob'}
            }
          })
          await catchCert.save()

          catchCert = new DocumentModel({
            __t: "catchCert",
            status: "VOID",
            documentNumber: "CC3",
            createdAt: moment().toISOString(),
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            exportData: {
              products: [
                { speciesCode: "BAS",
                  caughtBy: [{ vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100 }]
                }],
              exporterDetails: {'exporterCompanyName': 'Exporter Fred'}
            }
          })
          await catchCert.save()

        })

        afterAll(async () => {
          await DocumentModel.deleteMany({});
        })

        it('can get documents on documentNumber', async () => {

          const res = Array.from(await Report.catchCertVoidInvestigationReport( {
            fromDate: moment('2017-01-01'),
            toDate: moment('2049-12-31'),
            documentNumber: 'CC2',
          } ))

          expect(res.length).toBe(1)
          expect(res[0].documentNumber).toBe('CC2')
          expect(res[0].FI0_41_unavailabilityDuration).toBe(undefined)

        })

        it('can get documents on pln', async () => {

          const res = Array.from(await Report.catchCertVoidInvestigationReport( {
            fromDate: moment('2017-01-01'),
            toDate: moment('2049-12-31'),
            pln: 'WA1',
          } ))

          expect(res.length).toBe(1)
          expect(res[0].documentNumber).toBe('CC3')

        })

        it('can get documents on exporter', async () => {

          const res = Array.from(await Report.catchCertVoidInvestigationReport( {
            fromDate: moment('2017-01-01'),
            toDate: moment('2049-12-31'),
            exporter: 'Exporter Fred',
          } ))

          expect(res.length).toBe(1)
          expect(res[0].documentNumber).toBe('CC3')

        })

        it('respects date range (lower)', async () => {

          const res = Array.from(await Report.catchCertVoidInvestigationReport( {
            fromDate: moment('2030-01-01'),
            toDate: moment('2049-12-31'),
            exporter: 'Exporter Fred',
          } ))

          expect(res.length).toBe(0)

        })

        it('respects date range (upper)', async () => {

          const res = Array.from(await Report.catchCertVoidInvestigationReport( {
            fromDate: moment('2001-01-01'),
            toDate: moment('2002-12-31'),
            exporter: 'Exporter Fred',
          } ))

          expect(res.length).toBe(0)

        })

      })

      describe('for BLOCKED documents', () => {

        beforeAll(async () => {

          let failedCatchCert

          failedCatchCert = new FailedOnlineCertificates(
            {
              "documentNumber": "CC Bob",
              "documentType": "catchCertificate",
              "createdAt": "2019-12-04T00:00:00.000Z",
              "extended": {
                "exporterName": "kj",
                "exporterCompanyName": "Exporter Bob",
                "vessel": "ABIGAIL",
                "pln": "PLN Bob",
                "presentation": "FIL",
                "species": "European seabass (BSS)",
                "state": "FRE",
                "commodityCode": "03044990"
              },
              "rssNumber": "rssWA1",
              "da": "Guernsey",
              "dateLanded": "2019-07-08",
              "species": "LBE",
              "weightOnCert": 100,
              "weightOnAllCerts": 100,
              "weightOnAllCertsBefore": 0,
              "weightOnAllCertsAfter": 100,
              "isLandingExists": true,
              "weightOnLandingAllSpecies": 30,
              "numberOfLandingsOnDay": 1,
              "durationBetweenCertCreationAndFirstLandingRetrieved": "-PT48H",
              "durationBetweenCertCreationAndLastLandingRetrieved": "-PT48H",
              "isSpeciesExists": true,
              "weightOnLanding": 30,
              "isOverusedThisCert": true,
              "isOverusedAllCerts": true,
              "durationSinceCertCreation": "PT468H"
            }
          )
          await failedCatchCert.save()

          failedCatchCert = new FailedOnlineCertificates(
            {
              "documentNumber": "CC Fred",
              "documentType": "catchCertificate",
              "createdAt": "2019-12-04T00:00:00.000Z",
              "extended": {
                "exporterName": "kj",
                "exporterCompanyName": "Exporter Fred",
                "vessel": "ABIGAIL",
                "pln": "PLN Fred",
                "presentation": "FIL",
                "species": "European seabass (BSS)",
                "state": "FRE",
                "commodityCode": "03044990"
              },
              "rssNumber": "rssWA1",
              "da": "Guernsey",
              "dateLanded": "2019-07-08",
              "species": "LBE",
              "weightOnCert": 100,
              "weightOnAllCerts": 100,
              "weightOnAllCertsBefore": 0,
              "weightOnAllCertsAfter": 100,
              "isLandingExists": true,
              "weightOnLandingAllSpecies": 30,
              "numberOfLandingsOnDay": 1,
              "durationBetweenCertCreationAndFirstLandingRetrieved": "-PT48H",
              "durationBetweenCertCreationAndLastLandingRetrieved": "-PT48H",
              "isSpeciesExists": true,
              "weightOnLanding": 30,
              "isOverusedThisCert": true,
              "isOverusedAllCerts": true,
              "durationSinceCertCreation": "PT468H"
            }
          )
          await failedCatchCert.save()

        })

        afterAll(async () => {
          await FailedOnlineCertificates.deleteMany({});
        })

        it('can filter by document number', async () => {

          const res = Array.from(await Report.catchCertBlockedInvestigationReport( {
            fromDate: moment('2017-01-01'),
            toDate: moment('2049-12-31'),
            documentNumber: 'CC Bob',
          } ))

          expect(res.length).toBe(1)
          expect(res[0].documentNumber).toBe('CC Bob')
          expect(res[0].FI0_288_numberOfLandings).toBe(1)

        })

        it('can filter by pln', async () => {

          const res = Array.from(await Report.catchCertBlockedInvestigationReport( {
            fromDate: moment('2017-01-01'),
            toDate: moment('2049-12-31'),
            pln: 'PLN Bob',
          } ))

          expect(res.length).toBe(1)
          expect(res[0].documentNumber).toBe('CC Bob')
          expect(res[0].dateLanded).toBe('2019-07-08')

        })

        it('can filter by exporter', async () => {

          const res = Array.from(await Report.catchCertBlockedInvestigationReport( {
            fromDate: moment('2017-01-01'),
            toDate: moment('2049-12-31'),
            exporter: 'Exporter Fred',
          } ))

          expect(res.length).toBe(1)
          expect(res[0].documentNumber).toBe('CC Fred')
          expect(res[0].FI0_291_totalExportWeights).toBe(100)

        })

        it('respects date range (lower)', async () => {

          const res = Array.from(await Report.catchCertBlockedInvestigationReport( {
            fromDate: moment('2030-01-01'),
            toDate: moment('2049-12-31'),
            exporter: 'Exporter Fred',
          } ))

          expect(res.length).toBe(0)

        })

        it('respects date range (upper)', async () => {

          const res = Array.from(await Report.catchCertBlockedInvestigationReport( {
            fromDate: moment('2001-01-01'),
            toDate: moment('2002-12-31'),
            exporter: 'Exporter Fred',
          } ))

          expect(res.length).toBe(0)

        })


      })

    })

    describe('for storage documents and processing statements', () => {

      describe('for COMPLETE documents', () => {

        beforeAll(async () => {

          let document

          document = new DocumentModel({
            __t: 'storageDocument',
            createdAt: new Date(),
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            documentNumber: 'D1',
            exportData: {
              catches: [
                {certificateNumber: 'FCC001', product: 'cats', weightOnCC: 500, productWeight: 500},
              ],
              exporterDetails: {'exporterCompanyName': 'FRED'}
            },
            status: 'COMPLETE',
          })
          await document.save()

          document = new DocumentModel({
            __t: 'processingStatement',
            createdAt: new Date(),
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            documentNumber: 'D2',
            exportData: {
              catches: [
                {
                  catchCertificateNumber: 'FCC001',
                  species: 'cats',
                  totalWeightLanded: 500,
                  exportWeightBeforeProcessing: 100
                },
                {
                  catchCertificateNumber: 'FCC002',
                  species: 'cats',
                  totalWeightLanded: 500,
                  exportWeightBeforeProcessing: 100
                },
              ],
              exporterDetails: {'exporterCompanyName': 'BOB'}
            },
            status: 'COMPLETE',
          })
          await document.save()

          document = new DocumentModel({
            __t: 'processingStatement',
            createdAt: new Date(),
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            documentNumber: 'D3',
            exportData: {
              catches: [
                {
                  catchCertificateNumber: 'FCC002',
                  species: 'cats',
                  totalWeightLanded: 1000,
                  exportWeightBeforeProcessing: 100
                },
              ],
              exporterDetails: {'exporterCompanyName': 'FRED'}
            },
            status: 'COMPLETE',
          })
          await document.save()

        })

        afterAll(async () => {
          await DocumentModel.deleteMany({});
        })

        it('can filter on document number', async () => {

          const res: any[] = Array.from(await Report.sdpsInvestigationReport({documentNumber: 'D1'}))

          expect(res.length).toBe(1)

          expect(res[0].documentNumber).toBe('D1')
          expect(res[0].exportWeightExceeded).toBe(100)

        })

        it('can filter on document number with mismatch failure', async () => {

          const res: any[] = Array.from(await Report.sdpsInvestigationReport({documentNumber: 'D3'}))

          expect(res.length).toBe(1)

          expect(res[0].documentNumber).toBe('D3')
          expect(res[0].inputWeightMismatch).toBe('fail')

        })

        it('can filter on exporter', async () => {

          const res: any[] = Array.from(await Report.sdpsInvestigationReport({exporter: 'BOB'}))

          expect(res.length).toBe(2)

          expect(res[0].documentNumber).toBe('D2')
          expect(res[1].documentNumber).toBe('D2')

        })

      })

      describe('for VOID documents', () => {

        beforeAll(async () => {

          let document

          document = new DocumentModel({
            __t: 'storageDocument',
            createdAt: new Date(),
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            documentNumber: 'SD COMPLETE',
            exportData: {
              catches: [
                {certificateNumber: 'FCC001', product: 'cats', weightOnCC: 500, productWeight: 500},
              ],
              exporterDetails: {'exporterCompanyName': 'FRED'}
            },
            status: 'COMPLETE',
          })
          await document.save()

          document = new DocumentModel({
            __t: 'storageDocument',
            createdAt: new Date(),
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            documentNumber: 'SD BOB',
            exportData: {
              catches: [
                {certificateNumber: 'FCC001', product: 'cats', weightOnCC: 500, productWeight: 500},
              ],
              exporterDetails: {'exporterCompanyName': 'Exporter Bob'}
            },
            status: 'VOID',
          })
          await document.save()

          document = new DocumentModel({
            __t: 'processingStatement',
            createdAt: new Date(),
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            documentNumber: 'PS BOB',
            exportData: {
              catches: [
                {catchCertificateNumber: 'FCC002', species: 'cats', totalWeightLanded: 1000, exportWeightBeforeProcessing: 100},
              ],
              exporterDetails: {'exporterCompanyName': 'Exporter Bob'}
            },
            status: 'VOID',
          })
          await document.save()

          document = new DocumentModel({
            __t: 'processingStatement',
            createdAt: new Date(),
            createdBy: "Bob",
            createdByEmail: "foo@foo.com",
            documentNumber: 'PS FRED',
            exportData: {
              catches: [
                {catchCertificateNumber: 'FCC002', species: 'cats', totalWeightLanded: 1000, exportWeightBeforeProcessing: 100},
              ],
              exporterDetails: {'exporterCompanyName': 'FRED'}
            },
            status: 'VOID',
          })
          await document.save()

        })

        afterAll(async () => {
          await DocumentModel.deleteMany({});
        })

        it('can get documents on documentNumber', async () => {

          const res = Array.from(await Report.sdpsVoidInvestigationReport( {
            fromDate: moment('2017-01-01'),
            toDate: moment('2049-12-31'),
            documentNumber: 'SD BOB',
          } ))

          expect(res.length).toBe(1)
          expect(res[0].documentNumber).toBe('SD BOB')
          expect(res[0].FI0_41_unavailabilityDuration).toBe(undefined)

        })

        it('will not get COMPLETE documents', async () => {

          const res = Array.from(await Report.sdpsVoidInvestigationReport( {
            fromDate: moment('2017-01-01'),
            toDate: moment('2049-12-31'),
            documentNumber: 'SD COMPLETE',
          } ))

          expect(res.length).toBe(0)

        })

        it('can get documents on exporter', async () => {

          const res = Array.from(await Report.sdpsVoidInvestigationReport( {
            fromDate: moment('2017-01-01'),
            toDate: moment('2049-12-31'),
            exporter: 'Exporter Bob',
          } ))

          expect(res.length).toBe(2)
          expect(res[0].documentNumber).toBe('SD BOB')
          expect(res[1].documentNumber).toBe('PS BOB')

        })

        it('respects date range (lower)', async () => {

          const res = Array.from(await Report.sdpsVoidInvestigationReport( {
            fromDate: moment('2030-01-01'),
            toDate: moment('2049-12-31'),
            exporter: 'Exporter Bob',
          } ))

          expect(res.length).toBe(0)

        })

        it('respects date range (upper)', async () => {

          const res = Array.from(await Report.sdpsVoidInvestigationReport( {
            fromDate: moment('2001-01-01'),
            toDate: moment('2002-12-31'),
            exporter: 'Exporter Bob',
          } ))

          expect(res.length).toBe(0)

        })

      })

      describe('for BLOCKED documents', () => {

        beforeAll(async () => {

          let failedCatchCert

          failedCatchCert = new FailedOnlineCertificates({
            catchCertificateNumber: "FCC001",
            documentNumber: 'SD001',
            status: 'DRAFT',
            documentType: 'storageDocument',
            da: 'England',
            createdAt: '2019-01-01T00:00:00.000Z',
            species: 'cats',
            commodityCode: undefined,
            weightOnDoc: 100,
            weightOnAllDocs: 1100,
            weightOnFCC: 500,
            isOverAllocated: true,
            overAllocatedByWeight: 600,
            isMismatch: false,
            extended: {
             exporterCompanyName: 'Exporter Bob',
             id: 'FCC001-1610018839',
            }}
          )
          await failedCatchCert.save()

          failedCatchCert = new FailedOnlineCertificates({
            catchCertificateNumber: "FCC001",
            documentNumber: 'PS001',
            status: 'DRAFT',
            documentType: 'processingStatement',
            da: 'England',
            createdAt: '2019-01-01T00:00:00.000Z',
            species: 'cats',
            commodityCode: undefined,
            weightOnDoc: 100,
            weightOnAllDocs: 1100,
            weightOnFCC: 500,
            isOverAllocated: true,
            overAllocatedByWeight: 600,
            isMismatch: false,
            extended: {
              exporterCompanyName: 'Exporter Fred',
              id: 'FCC001-1610018839',
            }}
          )
          await failedCatchCert.save()

        })

        afterAll(async () => {
          await FailedOnlineCertificates.deleteMany({});
        })

        it('can filter by document number', async () => {

          const res = Array.from(await Report.sdpsBlockedInvestigationReport({
            fromDate: moment('2017-01-01'),
            toDate: moment('2049-12-31'),
            documentNumber: 'SD001',
          }))

          expect(res.length).toBe(1)
          expect(res[0].documentNumber).toBe('SD001')

        })

        it('can filter by exporter', async () => {

          const res = Array.from(await Report.sdpsBlockedInvestigationReport({
            fromDate: moment('2017-01-01'),
            toDate: moment('2049-12-31'),
            exporter: 'Exporter Fred',
          }))

          expect(res.length).toBe(1)
          expect(res[0].documentNumber).toBe('PS001')

        })

        it('respects date range (lower)', async () => {

          const res = Array.from(await Report.sdpsBlockedInvestigationReport({
            fromDate: moment('2030-01-01'),
            toDate: moment('2049-12-31'),
            exporter: 'Exporter Fred',
          }))

          expect(res.length).toBe(0)

        })

        it('respects date range (upper)', async () => {

          const res = Array.from(await Report.sdpsBlockedInvestigationReport({
            fromDate: moment('2001-01-01'),
            toDate: moment('2002-12-31'),
            exporter: 'Exporter Fred',
          }))

          expect(res.length).toBe(0)

        })


      })

    })

  })

  describe('the report function', () => {

    describe('for catch certificates', () => {

      beforeEach(async () => {
        await DocumentModel.deleteMany({});
      });

      it('will return report data for COMPLETE documents', async () => {

        const catchCert = new DocumentModel({
          __t: "catchCert",
          status: "COMPLETE",
          documentNumber: "CC1",
          createdAt: "2019-09-10T08:26:06.939Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 },
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100 }
                ]
              },
              { speciesCode : "COD",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 500 },
                ]
              },
            ], },
        })
        await catchCert.save()

        const reportData = Array.from(await Report.catchCertReport(moment.utc('2017-01-01').startOf('day'), moment.utc('2020-01-01').endOf('day'), moment.utc('2019-09-10'), []))

        expect(reportData.length).toBe(3)

        // should HAVE validation properties
        expect(reportData[0].FI0_41_unavailabilityDuration).toBeDefined()
        expect(reportData[0].salesNotesUrl).toBeDefined()


      })

      it('will return report data for VOID documents', async () => {

        const catchCert = new DocumentModel({
          __t: "catchCert",
          status: "VOID",
          documentNumber: "CC1",
          createdAt: "2019-09-10T08:26:06.939Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 },
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100 }
                ]
              },
              { speciesCode : "COD",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 500 },
                ]
              },
            ], },
        })
        await catchCert.save()

        let reportData

        // check they won't be found by the 'normal' report
        reportData = Array.from(await Report.catchCertReport(moment.utc('2017-01-01').startOf('day'), moment.utc('2020-01-01').endOf('day'), moment.utc('2019-09-10'), []))

        expect(reportData.length).toBe(0)

        reportData = Array.from(await Report.catchCertVoidReport(moment.utc('2017-01-01').startOf('day'), moment.utc('2020-01-01').endOf('day'), moment.utc('2019-09-10'), []))

        expect(reportData.length).toBe(3)

        // should NOT have validation properties
        expect(reportData[0].FI0_41_unavailabilityDuration).toBe(undefined)
        expect(reportData[0].salesNotesUrl).toBe(undefined)

      })


    })

    describe('for storage documents and processing statements', () => {

      beforeEach(async () => {
        await DocumentModel.deleteMany({});
      });

      it('will return report data', async () => {

        const document = new DocumentModel({
          "__t" : "storageDocument",
          "createdAt" : moment.utc("2019-09-27T11:41:06.855Z"),
          "createdBy" : "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
          "createdByEmail" : "foo@foo.com",
          "documentNumber" : "GBR-2019-SD-EB7B6E8F2",
          "documentUri" : "http://localhost:3001/pdf/export-certificates/_e4c27592-f6b2-42a4-820e-e5a9d49295a1.pdf?st=2019-09-27T11%3A36%3A06Z&se=2020-09-27T11%3A41%3A06Z&sp=r&sv=2018-03-28&sr=b&sig=lamf0%2F%2Bu80bQXdj%2FCvtP09uVI%2F0MJBcDUyc6UhrgwOU%3D",
          "status" : "COMPLETE",
          "exportData" : {
            "catches" : [
              {
                "product" : "Atlantic herring (HER)",
                "commodityCode" : "1",
                "productWeight" : "1000",
                "certificateNumber" : "juanito_juanito_junior",
                "weightOnCC" : "2000"
              }
            ],
            "storageFacility" : {
              "facilityName" : "FACILITY",
              "facilityAddressOne" : "Bruntingthorpe Industrial Estate Unit 6 Upper Bruntingthorpe",
              "facilityTownCity" : "Lutterworth",
              "facilityPostcode" : "LE17 5QZ",
              "facilityArrivalDate" : "15/07/2019",
              "facilityStorage" : "Chilled"
            },
            "exporterDetails" : {
              "exporterCompanyName" : "Mr",
              "addressOne" : "11, Woodlands Way",
              "addressTwo" : "Woodlands Way",
              "townCity" : "Blaydon-on-Tyne",
              "postcode" : "G12 12S"
            },
            "transportation" : {
              "vehicle" : "truck"
            },
            "arrivalTransportation" : {
              "vehicle" : "truck",
              "placeOfUnloading" : "Dover",
            }
          },
          "audit" : [],
        })
        await document.save()

        const reportData = await Report.sdpsReport(moment.utc('2017-01-01').startOf('day'), moment.utc('2020-01-01').endOf('day'), [])

        const reportDataArray: any[] = Array.from(reportData)

        expect(reportDataArray.length).toBe(1)

        expect(reportDataArray[0].authority).toEqual('Scotland')

      })

      it('will return report data for VOID certificates', async () => {

        const document = new DocumentModel({
          "__t" : "storageDocument",
          "createdAt" : moment.utc("2019-09-27T11:41:06.855Z"),
          "createdBy" : "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
          "createdByEmail" : "foo@foo.com",
          "documentNumber" : "GBR-2019-SD-EB7B6E8F2",
          "documentUri" : "http://localhost:3001/pdf/export-certificates/_e4c27592-f6b2-42a4-820e-e5a9d49295a1.pdf?st=2019-09-27T11%3A36%3A06Z&se=2020-09-27T11%3A41%3A06Z&sp=r&sv=2018-03-28&sr=b&sig=lamf0%2F%2Bu80bQXdj%2FCvtP09uVI%2F0MJBcDUyc6UhrgwOU%3D",
          "status" : "VOID",
          "exportData" : {
            "catches" : [
              {
                "product" : "Atlantic herring (HER)",
                "commodityCode" : "1",
                "productWeight" : "1000",
                "certificateNumber" : "juanito_juanito_junior",
                "weightOnCC" : "2000"
              }
            ],
            "facilityName" : "FACILITY",
            "facilityAddressOne" : "Bruntingthorpe Industrial Estate Unit 6 Upper Bruntingthorpe",
            "facilityTownCity" : "Lutterworth",
            "facilityPostcode" : "LE17 5QZ",
            "facilityArrivalDate": "15/07/2019",
            "facilityStorage" : "Chilled",
            "exporterDetails" : {
              "exporterCompanyName" : "Mr",
              "addressOne" : "11, Woodlands Way",
              "addressTwo" : "Woodlands Way",
              "townCity" : "Blaydon-on-Tyne",
              "postcode" : "G12 12S"
            },
            "transportation" : {
              "vehicle" : "truck"
            },
            "arrivalTransportation" : {
              "vehicle" : "truck",
              "placeOfUnloading" : "Dover",
            }
          },
          "audit" : [],
        })
        await document.save()

        let reportData

        // should not show up in the 'normal' report
        reportData = Array.from(await Report.sdpsReport(moment.utc('2017-01-01').startOf('day'), moment.utc('2020-01-01').endOf('day'), []))

        expect(reportData.length).toBe(0)

        // does appear in the VOID report
        reportData = Array.from(await Report.sdpsVoidReport(moment.utc('2017-01-01').startOf('day'), moment.utc('2020-01-01').endOf('day'), []))

        expect(reportData.length).toBe(1)

      })


    })

    describe('will handle exceptions', () => {

      it('will handle exceptions in the catchCertReport', async () => {

        expect.assertions(1)

        const mock = jest.spyOn(CatchCert, 'getCatchCerts')

        mock.mockImplementation( _ => {
          throw new Error('this is an error')
        })

        let error;

        try {

          await Report.catchCertReport(
            moment.utc('2017-01-01').startOf('day'),
            moment.utc('2020-01-01').endOf('day'),
            moment.utc('2019-09-10'),
            [])

        } catch (e) {
          error = e
        } finally {
          expect(error.toString()).toMatch('this is an error')
        }

      })

      it('will handle exceptions in the sdpsReport', async () => {

        expect.assertions(1)

        const mock = jest.spyOn(Documents, 'getAllDocuments')

        mock.mockImplementation( _ => {
          throw new Error('this is an error')
        })

        let error;

        try {

          await Report.sdpsReport(
            moment.utc('2017-01-01').startOf('day'),
            moment.utc('2020-01-01').endOf('day'),
            [])

        } catch (e) {
          error = e
        } finally {
          expect(error.toString()).toMatch('this is an error')

        }

      })

    })

    describe('get blocked certificates from mongo', () => {
      let mock;

      const testData =
        {
          "documentNumber": "GBR-2019-CC-D822EDD19",
          "documentType": "catchCertificate",
          "createdAt": "2019-12-04T00:00:00.000Z",
          "extended": {
            "exporterName": "kj",
            "vessel": "ABIGAIL",
            "pln": "BN24",
            "presentation": "FIL",
            "species": "European seabass (BSS)",
            "state": "FRE",
            "commodityCode": "03044990"
          },
          "rssNumber": "rssWA1",
          "da": "Guernsey",
          "dateLanded": "2019-07-08",
          "species": "LBE",
          "weightOnCert": 100,
          "weightOnAllCerts": 100,
          "weightOnAllCertsBefore": 0,
          "weightOnAllCertsAfter": 100,
          "isLandingExists": true,
          "weightOnLandingAllSpecies": 30,
          "numberOfLandingsOnDay": 1,
          "durationBetweenCertCreationAndFirstLandingRetrieved": "-PT48H",
          "durationBetweenCertCreationAndLastLandingRetrieved": "-PT48H",
          "isSpeciesExists": true,
          "weightOnLanding": 30,
          "isOverusedThisCert": true,
          "isOverusedAllCerts": true,
          "durationSinceCertCreation": "PT468H"
        }

      beforeEach(async () => {
        await FailedOnlineCertificates.deleteMany({});
        mock = jest.spyOn(BlockedDocuments, 'getBlockedCatchCerts');
      });

      afterEach(async () => {
        mock.mockRestore();
      })

      it('handles error returned from the model in getBlockedCatchCerts', async () => {
        mock.mockImplementation(() => {
          throw new Error("something went wrong with db call")
        });

        let error;

        try {
          await Report.catchCertBlockedReport(moment.utc(), moment.utc(), ["some place weird"]);
        } catch(e) {
          error = e
        } finally {
          expect(error.toString()).toEqual("Error: something went wrong with db call")
        }
      });

      it('returns blocked certificates for specified areas in a date range', async () => {

        const blockedCatchCert = new FailedOnlineCertificates(testData)

        await blockedCatchCert.save();

        const reportData = Array.from(await Report.catchCertBlockedReport(moment.utc("2019-10-04").startOf('day'), moment.utc("2019-12-25").endOf('day'), ["Guernsey", "England", "Wales", "Spain"]));

        expect(mock).toHaveBeenCalled();
        expect(reportData.length).toBe(1)
        expect(reportData[0].documentNumber).toBe("GBR-2019-CC-D822EDD19")

        //try to get a report when dates are out of range => should return 0 docs back
        const reportDataAgain = Array.from(await Report.catchCertBlockedReport(moment.utc("2019-12-08").startOf('day'), moment.utc("2019-12-25").endOf('day'), ["Guernsey", "England", "Wales", "Spain"]));

        expect(reportDataAgain.length).toBe(0);

        mock.mockRestore();
      });

      it('returns blocked certificates for any area in a date range', async () => {

        const blockedCatchCert = new FailedOnlineCertificates(testData)

        await blockedCatchCert.save();

        const reportData = Array.from(await Report.catchCertBlockedReport(moment.utc("2019-10-04").startOf('day'), moment.utc("2019-12-25").endOf('day'), []));

        expect(mock).toHaveBeenCalled();
        expect(reportData.length).toBe(1)
        expect(reportData[0].documentNumber).toBe("GBR-2019-CC-D822EDD19")

        //try to get a report when dates are out of range => should return 0 docs back
        const reportDataAgain = Array.from(await Report.catchCertBlockedReport(moment.utc("2019-12-08").startOf('day'), moment.utc("2019-12-25").endOf('day'), []));

        expect(reportDataAgain.length).toBe(0);

        mock.mockRestore();
      });

    })

    describe('for BLOCKED Storage Documents and Processing Statements', () => {

      beforeAll(async () => {

        let failedCatchCert

        failedCatchCert = new FailedOnlineCertificates({
          catchCertificateNumber: "FCC001",
          documentNumber: 'SD001',
          status: 'DRAFT',
          documentType: 'storageDocument',
          da: 'England',
          createdAt: '2019-01-01T00:00:00.000Z',
          species: 'cats',
          commodityCode: undefined,
          weightOnDoc: 100,
          weightOnAllDocs: 1100,
          weightOnFCC: 500,
          isOverAllocated: true,
          overAllocatedByWeight: 600,
          isMismatch: false,
          extended: {
            exporterCompanyName: 'Exporter Bob',
            id: 'FCC001-1610018839',
          }}
        )
        await failedCatchCert.save()

        failedCatchCert = new FailedOnlineCertificates({
          catchCertificateNumber: "FCC001",
          documentNumber: 'PS001',
          status: 'DRAFT',
          documentType: 'processingStatement',
          da: 'England',
          createdAt: '2020-01-01T00:00:00.000Z',
          species: 'cats',
          commodityCode: undefined,
          weightOnDoc: 100,
          weightOnAllDocs: 1100,
          weightOnFCC: 500,
          isOverAllocated: true,
          overAllocatedByWeight: 600,
          isMismatch: false,
          extended: {
            exporterCompanyName: 'Exporter Fred',
            id: 'FCC001-1610018839',
          }}
        )
        await failedCatchCert.save()

      })

      afterAll(async () => {
        await FailedOnlineCertificates.deleteMany({});
      })

      it('gets documents', async () => {

        const res = Array.from(await Report.sdpsBlockedReport(moment('2017-01-01'), moment('2049-12-31'), []))

        expect(res.length).toBe(2)

      })

      it('gets documents in range', async () => {

        const res = Array.from(await Report.sdpsBlockedReport(moment('2019-02-01'), moment('2049-12-31'), []))

        expect(res.length).toBe(1)

      })

    })

  })

})