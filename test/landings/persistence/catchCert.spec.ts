const Ajv = require('ajv');
const addFormats = require('ajv-formats')
const mongoose = require('mongoose');

const moment = require('moment');
import { MongoMemoryServer } from 'mongodb-memory-server';
import { LandingStatus } from 'mmo-shared-reference-data';
import { minimalSchema } from '../../../src/landings/types/catchCert';
import { DocumentModel } from '../../../src/landings/types/document';
import { FailedOnlineCertificates } from '../../../src/landings/types/query';
import {
  getCertificateByPdfReference,
  getCatchCerts,
  getCertificateByDocumentNumber,
  getCertificateByDocumentNumberWithNumberOfFailedAttempts,
  upsertCertificate,
  upsertExportPayload,
  upsertProductsByIgnore,
  getAllCatchCertsWithProducts,
  Product
} from '../../../src/landings/persistence/catchCert';
import {
  DocumentStatuses
} from '../../../src/landings/types/document';


describe('that we can read catch certificates in bulk', () => {

  describe('and handle bad data from mongo', () => {

    describe('testing the validation independently', () => {

      const ajv = new Ajv()
      addFormats(ajv);
      const validate = ajv.compile(minimalSchema)

      it('will validate ok when data is ok', () => {

        const catchCerts = {
          documentNumber: "CC2",
          createdAt: "2019-07-10T08:26:06.939Z",
          exportData: {
            products : [
              { speciesCode: "LBE",
                state: { code : "BAD" } ,
                presentation: { code: "BAD" },
                caughtBy: [ { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 300 } ]
              }
            ],
          },
        }

        const res = validate(catchCerts)

        expect(res).toBe(true)

      })

      it('will fail to validate when there are missing products', () => {

        const catchCerts = {
          documentNumber: "CC2",
          createdAt: "2019-07-10T08:26:06.939Z",
          exportData: {
            notProducts: "hello"
          } }

        const res = validate(catchCerts)

        expect(res).toBe(false)

      })

      it('will fail to validate when there is no date', () => {

        const catchCerts = {
          documentNumber: "CC2",
          createdAt: "2019-07-10T08:26:06.939Z",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [ { vessel: "DAYBREAK", pln: "WA1", weight: 300 } ]
              }
            ],
          },
        }

        const res = validate(catchCerts)

        expect(res).toBe(false)

      })

      it('will fail to validate when date is not a date', () => {

        const catchCerts = {
          documentNumber: "CC2",
          createdAt: "2019-07-10T08:26:06.939Z",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [ { vessel: "DAYBREAK", pln: "WA1", date: "NOT A DATE", weight: 300 } ]
              }
            ],
          },
        }

        const res = validate(catchCerts)

        expect(res).toBe(false)

      })

      it('will fail to validate when date empty', () => {

        const catchCerts = {
          documentNumber: "CC2",
          createdAt: "2019-07-10T08:26:06.939Z",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [ { vessel: "DAYBREAK", pln: "WA1", date: "", weight: 300 } ]
              }
            ],
          },
        }

        const res = validate(catchCerts)

        expect(res).toBe(false)

      })

    })
  })



})

describe('MongoMemoryServer - Wrapper to run inMemory Database', () => {

  let mongoServer;
  const opts = {}

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, opts).catch(err => {console.log(err)});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

describe('fetching catch certificates', () => {

  beforeEach(async () => {
    await DocumentModel.deleteMany({});
  });

  describe('when fetching with basic filters', () => {

    it('can fetch catch certificates', async () => {

      const catchCert = new DocumentModel({
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: "2019-07-10T08:26:06.939Z",
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

      const res = await getCatchCerts({})

      expect(res.length).toBe(1)
      const first: any = res[0]
      expect(first.exportData.products.length).toBe(2)

    })

    it('can fetch multiple catch certificates', async () => {

      let catchCert = new DocumentModel({
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: "2019-07-10T08:26:06.939Z",
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
          ], },
      })
      await catchCert.save()

      catchCert = new DocumentModel({
        __t: "catchCert",
        documentNumber: "CC2",
        createdAt: "2019-07-10T08:26:06.939Z",
        createdBy: "Bob",
        createdByEmail: "foo@foo.com",
        exportData: {
          products : [
            { speciesCode : "COD",
              caughtBy : [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 500 },
              ]
            },
          ], },
      })
      await catchCert.save()

      const res = await getCatchCerts({})

      expect(res.length).toBe(2)

    })

    it('wont return certs with a status other than COMPLETE', async () => {
      const catchCert = new DocumentModel({
        status: "DRAFT",
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: "2019-07-10T08:26:06.939Z",
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
          ], },
      })
      await catchCert.save()
      const res = await getCatchCerts({})
      expect(res.length).toBe(0)
    })

    it('will only return certs after fromDate when fromDate is specified', async () => {

      const catchCert = new DocumentModel({
        status: "COMPLETE",
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: "2019-10-18T23:59:59.999Z",
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
          ], },
      })
      await catchCert.save()

      let res

      res = await getCatchCerts({})
      expect(res.length).toBe(1)

      res = await getCatchCerts({ fromDate: moment.utc('2019-10-19').startOf('day') })
      expect(res.length).toBe(0)

    })

    it('will only return certs after fromDate when fromDate is specified boundery', async () => {

      const catchCert = new DocumentModel({
        status: "COMPLETE",
        __t: "catchCert",
        documentNumber: "CC1",
        createdAt: "2019-10-19T00:00:00.000Z",
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
          ], },
      })
      await catchCert.save()

      const res = await getCatchCerts({ fromDate: moment.utc('2019-10-19').startOf('day') })
      expect(res.length).toBe(1)

    })

  })

  describe('when filtering on functions used in the investigation action', () => {

    describe('on documentNumber', () => {

      it('can find a single document',  async () => {

        const catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC1",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [ { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 } ]
              },
            ], }
        })
        await catchCert.save()

        const res = await getCatchCerts({documentNumber: 'CC1' })

        expect(res.length).toBe(1)

        expect(res[0].documentNumber).toBe('CC1')

      })

      it('will not find document that does not exist',  async () => {

        const catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC1",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [ { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 } ]
              },
            ], }
        })
        await catchCert.save()

        const res = await getCatchCerts({ documentNumber: 'CC2' })

        expect(res.length).toBe(0)

      })

      it('will find document from multiple doucments',  async () => {

        let catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC1",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [ { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 } ]
              },
            ], }
        })
        await catchCert.save()

        catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC2",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [ { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 } ]
              },
            ], }
        })
        await catchCert.save()

        const res = await getCatchCerts({ documentNumber: 'CC1' })

        expect(res.length).toBe(1)

      })


    })

    describe('on pln', () => {

      it('can find a single document',  async () => {

        const catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC1",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [ { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 } ]
              },
            ], }
        })
        await catchCert.save()

        const res = await getCatchCerts({pln: 'WA1' })

        expect(res.length).toBe(1)

      })

      it('will not find document that does not exist',  async () => {

        const catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC1",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [ { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 } ]
              },
            ], }
        })
        await catchCert.save()

        const res = await getCatchCerts({ pln: 'NO WAY' })

        expect(res.length).toBe(0)

      })

      it('will find multiple documents',  async () => {

        let catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC1",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 },
                  { vessel: "DAYBREAK", pln: "WA2", date: "2019-07-10", weight: 100 },
                ]
              },
              { speciesCode : "BOB",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 },
                  { vessel: "DAYBREAK", pln: "WA3", date: "2019-07-10", weight: 100 },
                ]
              },
            ], }
        })
        await catchCert.save()

        catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC2",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [ { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 } ]
              },
            ], }
        })
        await catchCert.save()

        catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC3",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [ { vessel: "DAYBREAK", pln: "WA2", date: "2019-07-10", weight: 100 } ]
              },
            ], }
        })
        await catchCert.save()

        const res = await getCatchCerts({ pln: 'WA1' })

        expect(res.length).toBe(2)

        expect(res[0].documentNumber).toBe('CC1')
        expect(res[1].documentNumber).toBe('CC2')

      })


    })

    describe('on exporter', () => {

      it('can find a single document',  async () => {

        const catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC1",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products: [
              { speciesCode : "LBE",
                caughtBy : [ { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 } ]
              },
            ],
            exporterDetails: { exporterCompanyName : "BOB" }
          },
        })
        await catchCert.save()

        const res = await getCatchCerts({ exporter: 'BOB' })

        expect(res.length).toBe(1)

      })

      it('will not find document that does not exist',  async () => {

        const catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC1",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [ { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 } ]
              },
            ],
            exporterDetails: { exporterCompanyName : "BOB" }
          },
        })
        await catchCert.save()

        const res = await getCatchCerts({ exporter: 'NO WAY' })

        expect(res.length).toBe(0)

      })

      it('will find multiple documents',  async () => {

        let catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC1",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 },
                ]
              },
              { speciesCode : "BOB",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 },
                ]
              },
            ],
            exporterDetails: { exporterCompanyName : "BOB" }
          },
        })
        await catchCert.save()

        catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC2",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [ { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 } ]
              },
            ],
            exporterDetails: { exporterCompanyName : "BOB" }
          },
        })
        await catchCert.save()

        catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC2",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [ { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 } ]
              },
            ],
            exporterDetails: { exporterCompanyName : "FRED" }
          },
        })
        await catchCert.save()

        const res = await getCatchCerts({ exporter: 'BOB' })

        expect(res.length).toBe(2)

      })

      it('will ignore case', async() => {
        const catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC1",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products: [
              { speciesCode : "LBE",
                caughtBy : [ { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100 } ]
              },
            ],
            exporterDetails: { exporterCompanyName : "The Quick Brown Fox" }
          },
        })
        await catchCert.save()

        const res = await getCatchCerts({ exporter: 'the quick brown fox' })

        expect(res.length).toBe(1)
      });

    });

    describe('on landing status', () => {

      it('will find a single document', async () => {

        const landingStatuses: LandingStatus[] = [ LandingStatus.Complete ];

        let catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC1",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "HAS_LANDING_DATA" }
                ]
              },
            ], }
        });

        await catchCert.save();

        catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC2",
          createdAt: "2019-10-20T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "PENDING_LANDING_DATA" }
                ]
              },
            ], }
        });

        await catchCert.save();

        const res = await getCatchCerts({ landingStatuses });

        expect(res.length).toBe(1);

      });

      it('will not find a document if none exist', async () => {
        const landingStatuses: LandingStatus[] = [ LandingStatus.Complete ];

        let catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC1",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "PENDING_LANDING_DATA" }
                ]
              },
            ], }
        });

        await catchCert.save();

        catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC2",
          createdAt: "2019-10-20T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "PENDING_LANDING_DATA" }
                ]
              },
            ], }
        });

        await catchCert.save();

        const res = await getCatchCerts({ landingStatuses });

        expect(res.length).toBe(0);
      });

      it('will find all documents that have at least one landing that is pending landing data', async () => {

        const landingStatuses: LandingStatus[] = [ LandingStatus.Pending ];

        let catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC1",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-9",  weight: 100, _status: "HAS_LANDING_DATA" },
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "HAS_LANDING_DATA" },
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "PENDING_LANDING_DATA" }
                ]
              },
            ], }
        });

        await catchCert.save();

        catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC2",
          createdAt: "2019-10-20T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-12", weight: 100, _status: "HAS_LANDING_DATA" }
                ]
              },
            ], }
        });

        await catchCert.save();

        const res = await getCatchCerts({ landingStatuses });

        expect(res.length).toBe(1);

      });

      it('will find all documents that have at least one landing that has landing data', async () => {

        const landingStatuses: LandingStatus[] = [ LandingStatus.Complete ];

        let catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC1",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-9",  weight: 100, _status: "HAS_LANDING_DATA" },
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "HAS_LANDING_DATA" },
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "PENDING_LANDING_DATA" }
                ]
              },
            ], }
        });

        await catchCert.save();

        catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC2",
          createdAt: "2019-10-20T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-12", weight: 100, _status: "HAS_LANDING_DATA" }
                ]
              },
            ], }
        });

        await catchCert.save();

        const res = await getCatchCerts({ landingStatuses });

        expect(res.length).toBe(2);

      });

      it('will find all documents that have at least one landing that has a landing that has exceeded data limit', async () => {
        const landingStatuses: LandingStatus[] = [ LandingStatus.Exceeded14Days ];

        let catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC1",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-9",  weight: 100, _status: "HAS_LANDING_DATA" },
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "HAS_LANDING_DATA" },
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "EXCEEDED_14_DAY_LIMIT" }
                ]
              },
            ], }
        });

        await catchCert.save();

        catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC2",
          createdAt: "2019-10-20T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-12", weight: 100, _status: "HAS_LANDING_DATA" }
                ]
              },
            ], }
        });

        await catchCert.save();

        catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC3",
          createdAt: "2019-10-20T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-12", weight: 100, _status: "EXCEEDED_14_DAY_LIMIT" }
                ]
              },
            ], }
        });

        await catchCert.save();

        const res = await getCatchCerts({ landingStatuses });

        expect(res.length).toBe(2);
      });

      it('will find all documents that have at least one landing that is pending landing OR has landing data', async () => {
        const landingStatuses: LandingStatus[] = [ LandingStatus.Pending, LandingStatus.Complete ];

        let catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC1",
          createdAt: "2019-10-19T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-9",  weight: 100, _status: "HAS_LANDING_DATA" },
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _status: "PENDING_LANDING_DATA" },
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100, _status: "EXCEEDED_14_DAY_LIMIT" }
                ]
              },
            ], }
        });

        await catchCert.save();

        catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC2",
          createdAt: "2019-10-20T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-12", weight: 100, _status: "HAS_LANDING_DATA" }
                ]
              },
            ], }
        });

        await catchCert.save();

        catchCert = new DocumentModel({
          status: "COMPLETE",
          __t: "catchCert",
          documentNumber: "CC3",
          createdAt: "2019-10-20T00:00:00.000Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          exportData: {
            products : [
              { speciesCode : "LBE",
                caughtBy : [
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-12", weight: 100, _status: "EXCEEDED_14_DAY_LIMIT" },
                  { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-13", weight: 100, _status: "EXCEEDED_14_DAY_LIMIT" }
                ]
              },
            ], }
        });

        await catchCert.save();

        const res = await getCatchCerts({ landingStatuses });

        expect(res.length).toBe(2);
      });

    });

  })

})

describe('retrieving VOID documents', () => {

  beforeEach(async () => {
    await DocumentModel.deleteMany({});
  });

  it('will retrieve a single document with VOID status', async () => {

    const catchCert = new DocumentModel({
      __t: "catchCert",
      status: "VOID",
      documentNumber: "5230495340934580593458230495823540",
      createdAt: "2019-10-19T00:00:00.000Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: { products : [] }
    })
    await catchCert.save()

    const res = await getCatchCerts({ documentStatus: 'VOID', documentNumber: '5230495340934580593458230495823540' })
    expect(res[0].documentNumber).toBe('5230495340934580593458230495823540')
  })

  it('will retrieve documents with VOID status', async () => {

    let catchCert

    catchCert = new DocumentModel({
      __t: "catchCert",
      status: "VOID",
      documentNumber: "CC1",
      createdAt: "2019-10-19T00:00:00.000Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: { products : [] }
    })
    await catchCert.save()

    catchCert = new DocumentModel({
      __t: "catchCert",
      status: "VOID",
      documentNumber: "CC2",
      createdAt: "2019-10-19T00:00:00.000Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: { products : [] }
    })
    await catchCert.save()

    let res

    res = await getCatchCerts({})
    expect(res.length).toBe(0)

    res = await getCatchCerts({ documentStatus: 'COMPLETE'})
    expect(res.length).toBe(0)

    res = await getCatchCerts({ documentStatus: 'VOID' })
    expect(res.length).toBe(2)

  })

})

describe('reading individual certificates', () => {


  beforeEach(async () => {
      await DocumentModel.deleteMany({});
      await FailedOnlineCertificates.deleteMany({});
  });

  it('can find a certificate by its pdf reference number', async () => {
		const model = new DocumentModel({
      __t: 'processingStatement',
      documentNumber: "GBR-TEST-AFJ",
      status: DocumentStatuses.Complete,
      documentUri: "myTestId.pdf",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com"
    })

    await model.save()

    const certificate = await getCertificateByPdfReference('myTestId')

    expect(certificate?.documentNumber).toBe('GBR-TEST-AFJ')

  })

  it('can find a certificate by its document number', async () => {
		const model = new DocumentModel({
      __t: 'processingStatement',
      documentNumber: "GBR-TEST-AFJ",
      status: DocumentStatuses.Complete,
      documentUri: "myTestId.pdf",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com"
    })

    await model.save()

    const certificate = await getCertificateByDocumentNumber('GBR-TEST-AFJ')

    expect(certificate.status).toBe(DocumentStatuses.Complete)
  })

  it('can find a certificate by its document number with the number of failed attempts', async () => {
    const model = new DocumentModel({
      __t: 'processingStatement',
      documentNumber: "GBR-XX-1",
      status: DocumentStatuses.Draft,
      documentUri: "myTestId.pdf",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com"
    })

    let failedOnlineCertificatesModel

    failedOnlineCertificatesModel = new FailedOnlineCertificates({
      documentNumber: "GBR-XX-1",
      status: DocumentStatuses.Blocked,
      createdAt: "2019-07-10T08:26:06.939Z"
    })

    await failedOnlineCertificatesModel.save()

    failedOnlineCertificatesModel = new FailedOnlineCertificates({
      documentNumber: "GBR-XX-1",
      status: DocumentStatuses.Blocked,
      createdAt: "2019-07-11T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com"
    })

    await failedOnlineCertificatesModel.save()

    await model.save()

    const certificate = await getCertificateByDocumentNumberWithNumberOfFailedAttempts("GBR-XX-1")

    expect(certificate.documentNumber).toBe("GBR-XX-1");
    expect(certificate.status).toBe(DocumentStatuses.Draft);
    expect(certificate.numberOfFailedAttempts).toBe(2);
    expect(certificate.createdAt).toEqual(new Date("2019-07-10T08:26:06.939Z"));
    expect(certificate.documentUri).toBe("myTestId.pdf");
  })

  it('should return zero number of failed attempts if none found', async () => {
    const model = new DocumentModel({
      __t: 'processingStatement',
      documentNumber: "GBR-XX-1",
      status: DocumentStatuses.Draft,
      documentUri: "myTestId.pdf",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com"
    })

    await model.save()

    const certificate = await getCertificateByDocumentNumberWithNumberOfFailedAttempts("GBR-XX-1")

    expect(certificate.documentNumber).toBe("GBR-XX-1");
    expect(certificate.status).toBe(DocumentStatuses.Draft);
    expect(certificate.numberOfFailedAttempts).toBe(0);
    expect(certificate.createdAt).toEqual(new Date("2019-07-10T08:26:06.939Z"));
    expect(certificate.documentUri).toBe("myTestId.pdf");
  })

  it('should group matching results by createdAt', async () => {
    const model = new DocumentModel({
      __t: 'processingStatement',
      documentNumber: "GBR-XX-1",
      status: DocumentStatuses.Draft,
      documentUri: "myTestId.pdf",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com"
    })

    let failedOnlineCertificatesModel

    failedOnlineCertificatesModel = new FailedOnlineCertificates({
      documentNumber: "GBR-XX-1",
      status: DocumentStatuses.Blocked,
      createdAt: "2019-07-10T08:26:06.939Z"
    })

    await failedOnlineCertificatesModel.save()

    failedOnlineCertificatesModel = new FailedOnlineCertificates({
      documentNumber: "GBR-XX-1",
      status: DocumentStatuses.Blocked,
      createdAt: "2019-07-10T08:26:06.939Z"
    })

    await failedOnlineCertificatesModel.save()

    await model.save()

    const certificate = await getCertificateByDocumentNumberWithNumberOfFailedAttempts("GBR-XX-1")

    expect(certificate.documentNumber).toBe("GBR-XX-1");
    expect(certificate.status).toBe(DocumentStatuses.Draft);
    expect(certificate.numberOfFailedAttempts).toBe(1);
    expect(certificate.createdAt).toEqual(new Date("2019-07-10T08:26:06.939Z"));
    expect(certificate.documentUri).toBe("myTestId.pdf");
  })

  it('will return undefined if a document can not be found', async () => {
    const model = new DocumentModel({
      __t: 'processingStatement',
      documentNumber: "GBR-XX-1",
      status: DocumentStatuses.Draft,
      documentUri: "myTestId.pdf",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com"
    })

    await model.save()

    const certificate = await getCertificateByDocumentNumberWithNumberOfFailedAttempts("GBR-XX-2")

    expect(certificate).toBeUndefined();
  })

  it('will fail when there is no certificate found', async () => {

		const model = new DocumentModel({
      __t: 'processingStatement',
      documentNumber: "GBR-TEST-AFJ",
      status: DocumentStatuses.Complete,
      documentUri: "http://www.bob.com/a39f45.pdf",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com"
    })

    await model.save()

    const certificate = await getCertificateByPdfReference('a39f455')

    expect(certificate).toBeFalsy()
  })

  it('returned certificate is a pojo', async () => {

		const model = new DocumentModel({
      __t: 'processingStatement',
      documentNumber: "GBR-TEST-AFJ",
      status: DocumentStatuses.Complete,
      documentUri: "myTestId.pdf",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com"
    })

    await model.save()

    const certificate = await getCertificateByPdfReference('myTestId')

    expect(certificate).not.toHaveProperty('save')
  })
})



describe('updating certificates', () => {

  beforeEach(async () => {
    await DocumentModel.deleteMany({});
  });

  it('can update more than one property', async () => {
		const model = new DocumentModel({
      __t: 'processingStatement',
      documentNumber: "GBR-TEST-AFJ",
      status: DocumentStatuses.Complete,
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com"
    });

    const updatedProperties = {
      status : DocumentStatuses.Void,
      createdBy: "Jon"
    }

    await model.save();
    await upsertCertificate("GBR-TEST-AFJ", updatedProperties);

    const results: any = await DocumentModel.find();

    expect(results[0].status).toBe('VOID')
    expect(results[0].createdBy).toBe('Jon')
  });

   describe('When voiding a certificate', () => {
      it('will void a certificate if the status is not DRAFT', async () => {

        const model = new DocumentModel({
          __t: 'processingStatement',
          documentNumber: "GBR-TEST-AFJ",
          status: DocumentStatuses.Complete,
          createdAt: "2019-07-10T08:26:06.939Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com"
        });

        const updatedProperties = {
          status : DocumentStatuses.Void
        }

        await model.save();
        await upsertCertificate("GBR-TEST-AFJ", updatedProperties);

        const results: any = await DocumentModel.find();

        expect(results[0].status).toBe('VOID')

      });

      it('will not void a certificate if the status is LOCKED', async () => {
        await new DocumentModel({
          __t: 'processingStatement',
          documentNumber: "GBR-TEST-AFJ",
          status: DocumentStatuses.Locked,
          createdAt: "2019-07-10T08:26:06.939Z",
          createdBy: "Bob",
          createdByEmail: "foo@foo.com"
        }).save();

        const result = await upsertCertificate("GBR-TEST-AFJ", {status : DocumentStatuses.Void});
        expect(result).toBeNull();

        const results: any = await DocumentModel.find();
        expect(results[0].status).toBe(DocumentStatuses.Locked);
      });
   });


  describe('When investigating a certificate', () => {
    it('will mark as investigated succesfully if the certificate is COMPLETE', async () => {
      const model = new DocumentModel({
        __t: 'processingStatement',
        documentNumber: "GBR-TEST-AFJ",
        status: DocumentStatuses.Complete,
        createdAt: "2019-07-10T08:26:06.939Z",
        createdBy: "Bob",
        createdByEmail: "foo@foo.com"
      });

      const updatedProperties = {
        investigation: {
          investigator: "Mr. Bob",
          status: "STATUS"
        }
      }

      await model.save();
      await upsertCertificate("GBR-TEST-AFJ", updatedProperties);

      const results: any = await DocumentModel.find();

      expect(results[0].investigation).toStrictEqual({ investigator: "Mr. Bob", status: "STATUS" })
    });

    it('will mark as investigated succesfully if the certificate is PENDING', async () => {
      const model = new DocumentModel({
        __t: 'processingStatement',
        documentNumber: "GBR-TEST-AFJ",
        status: DocumentStatuses.Pending,
        createdAt: "2019-07-10T08:26:06.939Z",
        createdBy: "Bob",
        createdByEmail: "foo@foo.com"
      });

      const updatedProperties = {
        investigation: {
          investigator: "Mr. Bob",
          status: "STATUS"
        }
      }

      await model.save();
      await upsertCertificate("GBR-TEST-AFJ", updatedProperties);

      const results: any = await DocumentModel.find();

      expect(results[0].investigation).toStrictEqual({ investigator: "Mr. Bob", status: "STATUS" })
    });

    it('will mark as investigated succesfully if the certificate is DRAFT', async () => {
      const model = new DocumentModel({
        __t: 'processingStatement',
        documentNumber: "GBR-TEST-AFJ",
        status: DocumentStatuses.Draft,
        createdAt: "2019-07-10T08:26:06.939Z",
        createdBy: "Bob",
        createdByEmail: "foo@foo.com"
      });

      const updatedProperties = {
        investigation: {
          investigator: "Mr. Bob",
          status: "STATUS"
        }
      }

      await model.save();
      await upsertCertificate("GBR-TEST-AFJ", updatedProperties);

      const results: any = await DocumentModel.find();

      expect(results[0].investigation).toStrictEqual({ investigator: "Mr. Bob", status: "STATUS" })
    });

    it('will not mark as investigated a certificate if the status is LOCKED', async () => {
      await new DocumentModel({
        __t: 'processingStatement',
        documentNumber: "GBR-TEST-AFJ",
        status: DocumentStatuses.Locked,
        createdAt: "2019-07-10T08:26:06.939Z",
        createdBy: "Bob",
        createdByEmail: "foo@foo.com"
      }).save();

      const updatedProperties = {
        investigation: {
          investigator: "Mr. Bob",
          status: "STATUS"
        }
      }

      const result = await upsertCertificate("GBR-TEST-AFJ", updatedProperties);
      expect(result).toBeNull();

      const results: any = await DocumentModel.find();
      expect(results[0].investigation).toBeUndefined();
    });

    it('will not mark as investigated a certificate if the status is VOID', async () => {
      await new DocumentModel({
        __t: 'processingStatement',
        documentNumber: "GBR-TEST-AFJ",
        status: DocumentStatuses.Void,
        createdAt: "2019-07-10T08:26:06.939Z",
        createdBy: "Bob",
        createdByEmail: "foo@foo.com"
      }).save();

      const updatedProperties = {
        investigation: {
          investigator: "Mr. Bob",
          status: "STATUS"
        }
      }

      const result = await upsertCertificate("GBR-TEST-AFJ", updatedProperties);
      expect(result).toBeNull();

      const results: any = await DocumentModel.find();
      expect(results[0].investigation).toBeUndefined();
    });
  });

  it('can upsert properties', async () => {
    const model = new DocumentModel({
      __t: 'processingStatement',
      documentNumber: "GBR-TEST-AFJ",
      status: DocumentStatuses.Complete,
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com"
    });

    const updatedProperties = {
      status : DocumentStatuses.Void,
      investigation : {
        investigator: "Mr. Bob",
        status: "STATUS"
      }
    }

    await model.save();
    await upsertCertificate("GBR-TEST-AFJ", updatedProperties);

    const results: any = await DocumentModel.find();

    expect(results[0].status).toBe('VOID')
    expect(results[0].investigation).toStrictEqual({investigator: "Mr. Bob", status: "STATUS"} )
  });

  it('should update the database so flag _ignore in products will change to vesselOverriddenByAdmin', async () => {
    const catchCert = new DocumentModel({
      __t: "catchCert",
      _id: '600b0a48755cf8ceb693482a',
      documentNumber: "CC1",
      status: DocumentStatuses.Draft,
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products : [
          { speciesCode : "LBE",
            caughtBy : [
              { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, _ignore: true },
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

    const updatedProducts = [
      { speciesCode : "LBE",
        caughtBy : [
          { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10", weight: 100, vesselOverriddenByAdmin: true },
          { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11", weight: 100 }
        ]
      },
      { speciesCode : "COD",
        caughtBy : [
          { vessel: "DAYBREAK", pln: "WA2", date: "2018-07-10", weight: 500, vesselOverriddenByAdmin: true },
        ]
      },
    ]

    await catchCert.save()

    await upsertProductsByIgnore(updatedProducts, "CC1");

    const certificate = await getCertificateByDocumentNumber('CC1')

    expect(certificate.exportData.products[0].caughtBy[0]).toEqual({"date": "2019-07-10", "pln": "WA1", "vessel": "DAYBREAK", "vesselOverriddenByAdmin": true, "weight": 100});
  });

  it('can upsert a change in products', async () => {
    const model = new DocumentModel({
      __t: "catchCert",
      createdBy: "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      createdByEmail: "foo@foo.com",
      createdAt:"2019-07-10T08:26:06.939Z",
      status: "DRAFT",
      documentNumber: "CC1",
      requestByAdmin: false,
      audit: [],
      __v: 0,
      userReference: "",
      exportData: {
          exporterDetails: {
              exporterFullName: "Private",
              exporterCompanyName: "Private",
              addressOne: "Building and street",
              addressTwo: "Building 2 and street name",
              townCity: "London",
              postcode: "AB1 2XX"
          },
          products: [{
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
                  vessel: "WIRON 5",
                  pln: "H1100",
                  id: "CC1-1601034223",
                  date: "2020-08-30",
                  faoArea: "FAO27",
                  weight: 500
              }]
          }],
          conservation: {
              conservationReference: "UK Fisheries Policy"
          },
          transportation: {
              vehicle: "directLanding",
              exportedFrom: "United Kingdom"
          }
      }
    });

    const updatedProduct: Product[] = [{
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
          vessel: "WIRON 5",
          pln: "H1100",
          id: "CC1-1601034223",
          date: "2020-08-30",
          faoArea: "FAO27",
          weight: 500,
          _status: LandingStatus.Complete
      }]
    }];

    await model.save();
    await upsertExportPayload("CC1", updatedProduct);

    const results: any = await DocumentModel.find();

    expect(results[0].status).toBe('DRAFT');
    expect(results[0].exportData.products[0].caughtBy[0]._status).toStrictEqual(LandingStatus.Complete);
  });
});


describe('fetching catch certificates for landings', () => {

  beforeEach(async () => {
    await DocumentModel.deleteMany({});
  });

  it('no results for empty array of landings', async () => {

    const catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC1",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products : [
          { speciesCode : "LBE",
            caughtBy : [
              { vessel: "DAYBREAK", pln: "WA1", date: '2019-07-10', weight: 100 },
            ]
          },
        ], }
    })
    await catchCert.save()

    const res = await getCatchCerts({ landings:[] })

    expect(res.length).toBe(0)

  })

  it('no results single catch cert non matching landings', async () => {

    const catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC1",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products : [
          { speciesCode : "LBE",
            caughtBy : [
              { vessel: "DAYBREAK", pln: "WA1", date: '2019-07-10', weight: 100 },
            ]
          },
        ], }
    })
    await catchCert.save()

    const res = await getCatchCerts({ landings: [ { pln: 'WA2', dateLanded: '2019-07-10' }, { pln: 'WA1', dateLanded: '2019-07-11' } ] })

    expect(res.length).toBe(0)

  })

  it('single catch cert single landing', async () => {

    const catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC1",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products : [
          { speciesCode : "LBE",
            caughtBy : [
              { vessel: "DAYBREAK", pln: "WA1", date: '2019-07-10', weight: 100 },
            ]
          },
        ], }
    })
    await catchCert.save()

    const res = await getCatchCerts({ landings: [ { pln: 'WA1', dateLanded: '2019-07-10' } ] })

    expect(res.length).toBe(1)

  })

  it('multiple catch certs', async () => {

    let catchCert

    catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC1",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products : [
          { speciesCode : "LBE",
            caughtBy : [
              { vessel: "DAYBREAK", pln: "WA1", date: '2019-07-10', weight: 100 },
            ]
          },
        ], }
    })
    await catchCert.save()

    catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC2",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products : [
          { speciesCode : "LBE",
            caughtBy : [
              { vessel: "DAYBREAK", pln: "WA1", date: '2019-07-10', weight: 100 },
            ]
          },
        ], }
    })
    await catchCert.save()

    const res = await getCatchCerts({ landings: [ { pln: 'WA1', dateLanded: '2019-07-10' } ] })

    expect(res.length).toBe(2)

  })

  it('multiple catch certs multiple landings', async () => {

    let catchCert

    catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC1",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products : [
          { speciesCode : "LBE",
            caughtBy : [
              { vessel: "DAYBREAK", pln: "WA1", date: '2019-07-10', weight: 100 },
              { vessel: "DAYBREAK", pln: "WA2", date: '2019-07-10', weight: 100 },
            ]
          },
          { speciesCode : "BOB",
            caughtBy : [
              { vessel: "DAYBREAK", pln: "WA1", date: '2019-07-10', weight: 100 },
              { vessel: "DAYBREAK", pln: "WA2", date: '2019-07-10', weight: 100 },
            ]
          },
        ], }
    })
    await catchCert.save()

    catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC2",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products : [
          { speciesCode : "LBE",
            caughtBy : [
              { vessel: "DAYBREAK", pln: "WA1", date: '2019-07-10', weight: 100 },
              { vessel: "DAYBREAK", pln: "WA3", date: '2019-07-10', weight: 100 },
            ]
          },
          { speciesCode : "BOB",
            caughtBy : [
              { vessel: "DAYBREAK", pln: "WA1", date: '2019-07-11', weight: 100 },
            ]
          },
        ], }
    })
    await catchCert.save()

    const res = await getCatchCerts({ landings: [
      { pln: 'WA1', dateLanded: '2019-07-10' },
      { pln: 'WA1', dateLanded: '2019-07-11' },
      { pln: 'WA9', dateLanded: '2019-07-11' },
    ] })

    expect(res.length).toBe(2)

  })

  it('multiple catch certs only one match', async () => {

    let catchCert

    catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC1",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products : [
          { speciesCode : "LBE",
            caughtBy : [
              { vessel: "DAYBREAK", pln: "WA1", date: '2019-07-10', weight: 100 },
            ]
          },
        ], }
    })
    await catchCert.save()

    catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC2",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products : [
          { speciesCode : "LBE",
            caughtBy : [
              { vessel: "DAYBREAK", pln: "WA2", date: '2019-07-10', weight: 100 },
            ]
          },
        ], }
    })
    await catchCert.save()

    const res = await getCatchCerts({ landings: [ { pln: 'WA1', dateLanded: '2019-07-10' } ] })

    expect(res.length).toBe(1)

  })

  it('can handle dupliate landings by acting the same as if they were uniqued', async () => {

    let catchCert

    catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC1",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products : [
          { speciesCode : "LBE",
            caughtBy : [
              { vessel: "DAYBREAK", pln: "WA1", date: '2019-07-10', weight: 100 },
            ]
          },
        ], }
    })
    await catchCert.save()

    catchCert = new DocumentModel({
      __t: "catchCert",
      documentNumber: "CC2",
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products : [
          { speciesCode : "LBE",
            caughtBy : [
              { vessel: "DAYBREAK", pln: "WA2", date: '2019-07-10', weight: 100 },
            ]
          },
        ], }
    })
    await catchCert.save()


    const res = await getCatchCerts({ landings: [ { pln: 'WA1', dateLanded: '2019-07-10' }, { pln: 'WA1', dateLanded: '2019-07-10' } ] })

    expect(res.length).toBe(1)

  })

  it('should return just the catch certificates', async () => {

    let catchCert

    catchCert = new DocumentModel({
      __t: 'catchCert',
      documentNumber: 'CC1',
      createdAt: '2019-07-10T08:26:06.939Z',
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products: [
          {
            speciesCode: 'LBE',
            caughtBy: [
              {
                vessel: 'DAYBREAK',
                pln: 'WA1',
                date: '2019-07-10',
                weight: 100,
              },
            ],
          },
        ],
      },
    });

    await catchCert.save()

    catchCert = new DocumentModel({
      __t: 'catchCert',
      documentNumber: 'CC2',
      createdAt: '2019-07-10T08:26:06.939Z',
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        products: [
          {
            speciesCode: 'LBE',
            caughtBy: [
              {
                vessel: 'DAYBREAK',
                pln: 'WA2',
                date: '2019-07-10',
                weight: 100,
              },
            ],
          },
        ],
      },
    });

    await catchCert.save()

    catchCert = new DocumentModel({
      __t: 'storageDocument',
      documentNumber: 'SD2',
      createdAt: '2019-07-10T08:26:06.939Z',
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {
        catches: [
          {
            certificateNumber: 'FCC051',
            product: 'Atlantic herring (HER)',
            commodityCode: '423523432',
            weightOnCC: 1000,
            productWeight: 1000,
          },
        ],
      },
    });

    await catchCert.save()

    const res = await getAllCatchCertsWithProducts();
    expect(res.length).toBe(2);
  })

  it('should not return anything if exportData is empty', async () => {
    const catchCert = new DocumentModel({
      __t: 'catchCert',
      documentNumber: 'CC1',
      createdAt: '2019-07-10T08:26:06.939Z',
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      exportData: {},
    });

    await catchCert.save()

    const res = await getAllCatchCertsWithProducts();
    expect(res.length).toBe(0);
  })
})

});

