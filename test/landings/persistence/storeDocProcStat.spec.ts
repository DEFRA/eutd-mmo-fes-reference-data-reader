const mongoose = require('mongoose');

import { MongoMemoryServer } from 'mongodb-memory-server';
const moment = require('moment');

import { getAllDocuments } from '../../../src/landings/persistence/storeDocProcStat';
import { DocumentModel } from '../../../src/landings/types/document'

describe('that we can read documents from mongo', () => {

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

  beforeEach(async () => {
    await DocumentModel.deleteMany({});
  });

  it('can read storageDocument from mongo', async () => {

    const doc = new DocumentModel({
      "__t" : "storageDocument",
      "createdAt" : moment.utc("2019-09-24T14:28:59.481Z").toDate(),
      "createdBy" : "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "createdByEmail" : "foo@foo.com",
      "documentNumber" : "GBR-2019-SD-8C3267BFB",
      "documentUri" : "http://www.bob.com",
      "status" : "COMPLETE",
      "exportData" : {
        "catches" : [
          {
            "product" : "Atlantic cod (COD)",
            "commodityCode" : "1234",
            "productWeight" : "100",
            "dateOfUnloading" : "24/09/2019",
            "placeOfUnloading" : "Dover",
            "transportUnloadedFrom" : "BIKE",
            "certificateNumber" : "11234",
            "weightOnCC" : "100"
          }
        ],
        "storageFacilities" : [
          {
            "facilityName" : "BOB",
            "facilityAddressOne" : "421 Salters Road",
            "facilityTownCity" : "Newcastle",
            "facilityPostcode" : "NE34XJ",
            "storedAs" : "chilled"
          }
        ],
        "exporterDetails" : {
            "exporterCompanyName" : "Geraint Williams",
            "addressOne" : "421 Salters Road",
            "townCity" : "Newcastle",
            "postcode" : "NE34XJ"
                                },
        "transportation" : {
            "vehicle" : "truck"
                                }
                }
    })

    await doc.save()

    const docs =  await getAllDocuments({})

    expect(docs.length).toEqual(1)
    expect(docs[0].documentNumber).toEqual('GBR-2019-SD-8C3267BFB')

  })

  it('can read processingStatement from mongo', async () => {

    const doc = new DocumentModel({
      "__t": "processingStatement",
      "createdAt": moment.utc("2019-09-24T14:28:17.973Z").toDate(),
      "createdBy": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
      "createdByEmail": "foo@foo.com",
      "documentNumber": "GBR-2019-PS-8FACE6274",
      "status": "COMPLETE",
      "documentUri": "http://bob.com",
      "exportData": {
        "catches": [
          {
            "species": "Atlantic cod (COD)",
            "catchCertificateNumber": "123",
            "totalWeightLanded": "100",
            "exportWeightBeforeProcessing": "100",
            "exportWeightAfterProcessing": "100"
          }
        ],
        "exporterDetails": {
          "exporterCompanyName": "Geraint Williams",
          "addressOne": "421 Salters Road",
          "townCity": "Newcastle",
          "postcode": "NE34XJ"
        },
        "consignmentDescription": "lll",
        "healthCertificateNumber": "123",
        "healthCertificateDate": "24/09/2019",
        "personResponsibleForConsignment": "1111",
        "plantApprovalNumber": "1111",
        "plantName": "123",
        "plantAddressOne": "111 Road",
        "plantTownCity": "Newcastle",
        "plantPostcode": "ABBC",
        "dateOfAcceptance": "24/09/2019"
      },
    })

    await doc.save()

    const docs =  await getAllDocuments({})

    expect(docs.length).toEqual(1)
    expect(docs[0].documentNumber).toEqual('GBR-2019-PS-8FACE6274')

  })

  it('will only read COMPLETE documents or with no status', async () => {

    let doc

    doc = new DocumentModel({
      __t: "processingStatement",
      createdAt: moment.utc("2019-09-24T14:28:17.973Z").toDate(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      documentNumber: "COMPLETE",
      exportData: { catches: []},
      status: "COMPLETE",
    })
    await doc.save()

    doc = new DocumentModel({
      __t: "processingStatement",
      createdAt: moment.utc("2019-09-24T14:28:17.973Z").toDate(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      documentNumber: "DRAFT",
      exportData: { catches: []},
      status: "DRAFT",
    })
    await doc.save()

    doc = new DocumentModel({
      __t: "processingStatement",
      createdAt: moment.utc("2019-09-24T14:28:17.973Z").toDate(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      documentNumber: "OLD",
      exportData: { catches: []},
    })
    await doc.save()


    const docs =  await getAllDocuments({})

    expect(docs.length).toEqual(2)
    expect(docs[0].documentNumber).toEqual('COMPLETE')
    expect(docs[1].documentNumber).toEqual('OLD')

  })

  it('will not read bad data', async () => {

    let doc = new DocumentModel({
      __t: "processingStatement",
      createdAt: moment.utc("2019-09-24T14:28:17.973Z").toDate(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      documentNumber: "GOOD",
      exportData: { catches: []},
      status: "COMPLETE",
    })

    await doc.save()

    doc = new DocumentModel({
      __t: "processingStatement",
      createdAt: moment.utc("2019-09-24T14:28:17.973Z").toDate(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      documentNumber: "NO EXPORTDATA",
      status: "DRAFT",
    })

    await doc.save()

    doc = new DocumentModel({
      __t: "processingStatement",
      createdAt: moment.utc("2019-09-24T14:28:17.973Z").toDate(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      documentNumber: "EXPORT DATA NO CATCHES",
      exportData: 'bob'
    })

    await doc.save()

    const docs =  await getAllDocuments({})

    expect(docs.length).toEqual(1)
    expect(docs[0].documentNumber).toEqual('GOOD')

  })

  it('will only return docs after fromDate when fromDate is specified', async () => {

    const doc = new DocumentModel({
      __t: "processingStatement",
      createdAt: moment.utc("2019-10-18T23:59:59.999Z").toDate(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      documentNumber: "HELLO",
      exportData: { catches: []},
      status: 'COMPLETE'
    })
    await doc.save()

    let res

    res = await getAllDocuments({})
    expect(res.length).toBe(1)

    res = await getAllDocuments({ fromDate: moment.utc('2019-10-19').startOf('day') })
    expect(res.length).toBe(0)

  })

  it('will only return docs after fromDate when fromDate is specified boundary', async () => {

    const doc = new DocumentModel({
      __t: "processingStatement",
      createdAt: moment.utc("2019-10-27T00:00:00.000Z").toDate(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      documentNumber: "HELLO",
      exportData: { catches: []},
      status: 'COMPLETE'
    })
    await doc.save()

    const res = await getAllDocuments({ fromDate: moment.utc('2019-10-27').startOf('day') })
    expect(res.length).toBe(1)

  })

  it('will not return VOID documents', async () => {

    const doc = new DocumentModel({
      __t: "processingStatement",
      createdAt: moment.utc("2019-10-27T00:00:00.000Z").toDate(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      documentNumber: "HELLO",
      exportData: { catches: []},
      status: 'VOID'
    })
    await doc.save()

    const res = await getAllDocuments({})
    expect(res.length).toBe(0)

  })

  it('will return VOID documents', async () => {

    const doc = new DocumentModel({
      __t: "processingStatement",
      createdAt: moment.utc("2019-10-27T00:00:00.000Z").toDate(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      documentNumber: "GBR-ERAERAS-FASDFAS-FASDASF",
      exportData: { catches: []},
      status: 'VOID'
    })
    await doc.save()

    const res = await getAllDocuments({ documentStatus: 'VOID', documentNumber: 'GBR-ERAERAS-FASDFAS-FASDASF' })
    expect(res.length).toBe(1)

  })

  describe("When filtering for investigation functions", () => {
    describe("On Document number", () => {
      it('will return any successful matches', async () => {

        let doc

        doc = new DocumentModel({
          __t: "processingStatement",
          createdAt: moment().toDate(),
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          documentNumber: "HELLO",
          exportData: { catches: []},
          status: 'COMPLETE'
        })
        await doc.save()

        doc = new DocumentModel({
          __t: "processingStatement",
          createdAt: moment().toDate(),
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          documentNumber: "THERE",
          exportData: { catches: []},
          status: 'COMPLETE'
        })
        await doc.save()

        const res = await getAllDocuments({ documentNumber: 'HELLO' })
        expect(res.length).toBe(1)

      });
    });

    describe("On Exporter", () => {
      it('will return any successful matches', async () => {

        let doc

        doc = new DocumentModel({
          __t: "processingStatement",
          createdAt: moment().toDate(),
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          documentNumber: "HELLO",
          exportData: {
            catches: [],
            exporterDetails: { 'exporterCompanyName': 'BOB' }
          },
          status: 'COMPLETE'
        })
        await doc.save()

        doc = new DocumentModel({
          __t: "processingStatement",
          createdAt: moment().toDate(),
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          documentNumber: "THERE",
          exportData: { catches: [],
            exporterDetails: { 'exporterCompanyName': 'FRED' }
          },
          status: 'COMPLETE'
        })
        await doc.save()

        doc = new DocumentModel({
          __t: "processingStatement",
          createdAt: moment().toDate(),
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          documentNumber: "PEOPLE",
          exportData: { catches: [],
            exporterDetails: { 'exporterCompanyName': 'FRED' }
          },
          status: 'COMPLETE'
        })
        await doc.save()

        const res = await getAllDocuments({ exporter: 'FRED' })
        expect(res.length).toBe(2)

      });

      it('will be case insensitive', async () => {

        const doc = new DocumentModel({
          __t: "processingStatement",
          createdAt: moment().toDate(),
          createdBy: "Bob",
          createdByEmail: "foo@foo.com",
          documentNumber: "HELLO",
          exportData: {
            catches: [],
            exporterDetails: { 'exporterCompanyName': 'The QUICK Brown FOX' }
          },
          status: 'COMPLETE'
        })
        await doc.save()

        const res = await getAllDocuments({ exporter: 'the quick brown fox' })
        expect(res.length).toBe(1)

      });
    });
  });


  it('will return documents based on foreign catch certificate numbers', async () => {
    let doc

    doc = new DocumentModel({
      __t: "processingStatement",
      createdAt: moment.utc("2019-09-24T14:28:17.973Z").toDate(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      documentNumber: "D1",
      exportData: { catches: [ { catchCertificateNumber: 'BOB22' },
        { catchCertificateNumber: 'BOB23' }
      ]},
      status: "COMPLETE",
    })
    await doc.save()

    doc = new DocumentModel({
      __t: "processingStatement",
      createdAt: moment.utc("2019-09-24T14:28:17.973Z").toDate(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      documentNumber: "D2",
      exportData: { catches: [ { catchCertificateNumber: 'BOB23' } ]},
      status: "COMPLETE",
    })
    await doc.save()

    doc = new DocumentModel({
      __t: "storageDocument",
      createdAt: moment.utc("2019-09-24T14:28:17.973Z").toDate(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      documentNumber: "D3",
      exportData: { catches: [ { certificateNumber: 'BOB22' } ]},
      status: "COMPLETE",
    })
    await doc.save()

    doc = new DocumentModel({
      __t: "storageDocument",
      createdAt: moment.utc("2019-09-24T14:28:17.973Z").toDate(),
      createdBy: "Bob",
      createdByEmail: "foo@foo.com",
      documentNumber: "D4",
      exportData: { catches: [ { certificateNumber: 'BOB24' } ]},
      status: "COMPLETE",
    })
    await doc.save()

    const res = await getAllDocuments({ fccNumbers: ['BOB22', 'BOB24'] })
    expect(res.length).toBe(3)

    expect(res[0].documentNumber).toBe('D1')
    expect(res[1].documentNumber).toBe('D3')
    expect(res[2].documentNumber).toBe('D4')

  })

})
