const moments = require('moment');
const Query = require('../../../src/landings/query/sdpsQuery');
const Transformations = require('../../../src/landings/transformations/transformations');
import { postCodeToDa } from 'mmo-shared-reference-data'
import { ISdPsQueryResult } from '../../../src/landings/types/query'

const createDocument = (documentNumber, documentType, catches, createdAt?) =>
  ({
     __t: documentType,
     documentUri: 'http://www.bob.com',
     exportData: { catches },
     createdByEmail: 'bob@bob.com',
     createdBy: 'bob',
     createdAt: createdAt ? createdAt : new Date(),
     documentNumber,
     status: 'COMPLETE',
	});


const identity = (_) => _


describe('low level transformations', () => {

  it('will unwind and map catches for a storage document', () => {

    const document = createDocument('12345',
      'storageDocument',
      [
        { certificateNumber: 'FCC051', certificateType: 'uk', product: 'cats', scientificName: "some scientific name 1", weightOnCC: 500.51, productWeight: 500.51, dateOfUnloading: "15/06/2020", placeOfUnloading: "Dover", transportUnloadedFrom: "BA078" },
        { certificateNumber: 'FCC051', certificateType: 'non_uk', product: 'dogs', scientificName: "some scientific name 2", weightOnCC: 500.51, productWeight: 200.29, dateOfUnloading: "15/06/2020", placeOfUnloading: "Hull", transportUnloadedFrom: "EF078", supportingDocuments: ['PS','CC'] }
      ]
    )

    const expected = [
      { documentNumber: '12345', status: 'COMPLETE', documentType: 'storageDocument',
        extended: { url: 'http://www.bob.com' },
        certificateNumber: 'FCC051', certificateType: 'uk', da: 'England', species: 'cats', scientificName: "some scientific name 1", weight: 500.51, weightOnCC: 500.51,
        dateOfUnloading: "15/06/2020", placeOfUnloading: "Dover", transportUnloadedFrom: "BA078" },
      { documentNumber: '12345', status: 'COMPLETE', documentType: 'storageDocument',
        extended: { url: 'http://www.bob.com' },
        certificateNumber: 'FCC051', certificateType: 'non_uk', da: 'England', species: 'dogs', scientificName: "some scientific name 2", weight: 200.29, weightOnCC: 500.51,
        dateOfUnloading: "15/06/2020", placeOfUnloading: "Hull", transportUnloadedFrom: "EF078", supportingDocuments: "PS,CC" }
    ]

    const res = Query.unwindAndMapCatches(document, identity)

    const actual = Array.from(res)
    .map((item: any) => {
      delete item.createdAt;
      return item
    })
    expect(actual).toEqual(expected)

  })

  it('will unwind and map catches for a processing statement', () => {

    const document = createDocument('12345',
      'processingStatement',
      [
        { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'cats', scientificName: "some scientific name 1", totalWeightLanded: 500.11, exportWeightBeforeProcessing: 100.11, exportWeightAfterProcessing: 90.11  },
        { catchCertificateNumber: 'FCC051', catchCertificateType: 'non_uk', species: 'cats', scientificName: "some scientific name 1", totalWeightLanded: 400.11, exportWeightBeforeProcessing: 200.11, exportWeightAfterProcessing: 190.11 },
        { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'cats', scientificName: "some scientific name 1", totalWeightLanded: 300.11, exportWeightBeforeProcessing: 300.11, exportWeightAfterProcessing: 290.11 }
      ]
    )

    const expected = [
      { documentNumber: '12345', status: 'COMPLETE', documentType: 'processingStatement',
        extended: { url: 'http://www.bob.com' },
        certificateNumber: 'FCC051', certificateType: 'uk', da: 'England', species: 'cats', scientificName: "some scientific name 1", commodityCode: 'N/A', weight: 100.11, weightOnCC: 500.11, weightAfterProcessing: 90.11 },
      { documentNumber: '12345', status: 'COMPLETE', documentType: 'processingStatement',
        extended: { url: 'http://www.bob.com' },
        certificateNumber: 'FCC051', certificateType: 'non_uk', da: 'England', species: 'cats', scientificName: "some scientific name 1", commodityCode: 'N/A', weight: 200.11, weightOnCC: 400.11, weightAfterProcessing: 190.11 },
      { documentNumber: '12345', status: 'COMPLETE', documentType: 'processingStatement',
        extended: { url: 'http://www.bob.com' },
        certificateNumber: 'FCC051', certificateType: 'uk', da: 'England', species: 'cats', scientificName: "some scientific name 1", commodityCode: 'N/A', weight: 300.11, weightOnCC: 300.11, weightAfterProcessing: 290.11 },
    ]

    const res = Query.unwindAndMapCatches(document, identity)

    const actual = Array.from(res)
    .map((item: any) => {
      delete item.createdAt;
      return item
    })
    expect(actual).toEqual(expected)

  })

  it('will get unique certificates from a set of documents', () => {

    const documents = [
      createDocument('12345', 'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', species: 'cats', scientificName: "some scientific name 1", totalWeightLanded: 500.22, exportWeightBeforeProcessing: 100.22 },
          { catchCertificateNumber: 'FCC052', species: 'cats', scientificName: "some scientific name 1", totalWeightLanded: 400.22, exportWeightBeforeProcessing: 200.22 },
        ]
      ),
      createDocument('22345', 'storageDocument',
        [
          { certificateNumber: 'FCC051', product: 'dogs', scientificName: "some scientific name 2", weightOnCC: 500.22, productWeight: 200.22 },
          { certificateNumber: 'FCC053', product: 'dogs', scientificName: "some scientific name 2", weightOnCC: 500.22, productWeight: 200.22 }
        ]
      )
    ]

    const res = Query.getForeignCatchCertificatesFromDocuments(documents);

    expect(res).toEqual(['FCC051', 'FCC052', 'FCC053'])
  });

  it('will ignore case when getting unique certificates from a set of documents', () => {

    const documents = [
      createDocument('12345', 'processingStatement',
          [
            { catchCertificateNumber: 'FCC051', species: 'cats', scientificName: "some scientific name 1", totalWeightLanded: 500.12, exportWeightBeforeProcessing: 100.12 },
            { catchCertificateNumber: 'FCC052', species: 'cats', scientificName: "some scientific name 1", totalWeightLanded: 400.12, exportWeightBeforeProcessing: 200.12 },
          ]
      ),
      createDocument('22345', 'storageDocument',
          [
            { certificateNumber: 'FCC051', product: 'dogs', scientificName: "some scientific name 2", weightOnCC: 500.12, productWeight: 200.12 },
            { certificateNumber: 'fCC053', product: 'dogs', scientificName: "some scientific name 2", weightOnCC: 500.12, productWeight: 200.12 }
          ]
      )
    ]

    const res = Query.getForeignCatchCertificatesFromDocuments(documents);

    expect(res).toEqual(['FCC051', 'FCC052', 'FCC053'])
  });

  describe('With data coming from Redis', () => {
    it('will unwind and map catches for a processing statement', () => {

      const mockedRedisPS = {
        "catches":[
          {
            "species":"Atlantic herring (HER)",
            "scientificName": "some scientific name 1",
            "catchCertificateNumber":"323223323242315",
            "totalWeightLanded":"2.11",
            "exportWeightBeforeProcessing":"2.11",
            "exportWeightAfterProcessing":"2.11"
          },
          {
            "species":"Allardice's moray (AMA)",
            "scientificName": "some scientific name 2",
            "catchCertificateNumber":"343243242321",
            "totalWeightLanded":"5.22",
            "exportWeightBeforeProcessing":"5.22",
            "exportWeightAfterProcessing":"5.22"
          }
        ],
        "validationErrors":[
          {

          }
        ],
        "consignmentDescription":"asfd",
        "error":"",
        "addAnotherCatch":"No",
        "personResponsibleForConsignment":"asdfs",
        "plantApprovalNumber":"asdfasdfasdf",
        "plantName":"23523",
        "plantAddressOne":"30 Bob Drive",
        "plantAddressTwo":"Standish",
        "plantTownCity":"Wigan",
        "plantPostcode":"WN4 2JT",
        "dateOfAcceptance":"05/12/2019",
        "healthCertificateNumber":"44234234",
        "healthCertificateDate":"01/10/2019",
        "exporter":{
          "exporterCompanyName":"BONZO",
          "addressOne":"UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
          "addressTwo":"UPPER BRUNTINGTHORPE, LUTTERWORTH",
          "townCity":"HARBOROUGH",
          "postcode":"LE17 5QZ",
          "isExporterDetailsSavedAsDraft":false,
          "journey":"processingStatement",
          "currentUri":"/create-processing-statement/add-exporter-details",
          "nextUri":"/create-processing-statement/add-consignment-details",
          "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
          "exporterFullName":"John Test",
          "preLoadedName":true,
          "preLoadedAddress":true,
          "preLoadedCompanyName":true
        },
        "documentNumber":"GBR-2019-PS-B3905EB18",
        "user":{
          "email":"foo@foo.com",
          "principal":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
        }
      };
      const document = Transformations.mapProcessingStatementToPS(mockedRedisPS);

      const expected = [
        { documentNumber: 'GBR-2019-PS-B3905EB18', status: 'DRAFT', documentType: 'processingStatement',
          certificateNumber: '323223323242315', da: 'LE17 5QZ', species: 'Atlantic herring (HER)', scientificName: "some scientific name 1",
          commodityCode: 'N/A', weight: 2.11, weightOnCC: 2.11, weightAfterProcessing: 2.11, extended: {
            exporterCompanyName: "BONZO"
          } },
        { documentNumber: 'GBR-2019-PS-B3905EB18', status: 'DRAFT', documentType: 'processingStatement',
          certificateNumber: '343243242321', da: 'LE17 5QZ',
          species: 'Allardice\'s moray (AMA)', scientificName: "some scientific name 2", commodityCode: 'N/A', weight: 5.22, weightAfterProcessing: 5.22, weightOnCC: 5.22, extended: {
            exporterCompanyName: "BONZO"
          }  },
      ];

      const res = Query.unwindAndMapCatches(document, identity);

      const actual = Array.from(res)
      .map((item: any) => {
        delete item.createdAt;
        return item
      })
      expect(actual).toEqual(expected)

    });

    it('will unwind and map catches for a storage document', () => {

      const mockedRedisSD = {
        "catches":[
          {
            "product":"Atlantic herring (HER)",
            "scientificName": "some scientific name 1",
            "commodityCode":"423523432",
            "productWeight":"300",
            "dateOfUnloading":"01/10/2019",
            "placeOfUnloading":"351",
            "transportUnloadedFrom":"234",
            "certificateNumber":"fasdfnasdfjasdfjaisdf8asdf8as",
            "weightOnCC":"1000"
          },
          {
            "product":"Argentine anchovy (ANA)",
            "scientificName": "some scientific name 2",
            "commodityCode":"23408230498234",
            "productWeight":"200.11",
            "dateOfUnloading":"09/07/2019",
            "placeOfUnloading":"DOVER",
            "transportUnloadedFrom":"234",
            "certificateNumber":"2",
            "weightOnCC":"20000.55"
          }
        ],
        "storageFacilities":[
          {
            "facilityName":"11",
            "facilityAddressOne":"11 Dessert Way",
            "facilityAddressTwo":"Enyt-No-Nodyalb",
            "facilityTownCity":"Gateshead",
            "facilityPostcode":"N32 5PJ"
          },
          {
            "facilityName":"11 THE SECOND",
            "facilityAddressOne":"11 Dessert Way without water",
            "facilityAddressTwo":"Enyt-No-Nodyalb",
            "facilityTownCity":"Gateshead",
            "facilityPostcode":"N32 5PJ"
          }
        ],
        "validationErrors":[
          {

          }
        ],
        "addAnotherProduct":"No",
        "addAnotherStorageFacility":"No",
        "transport":{
          "vehicle":"truck",
          "currentUri":"/create-storage-document/do-you-have-a-road-transport-document",
          "journey":"storageNotes",
          "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
          "cmr":"true"
        },
        "exporter":{
          "exporterCompanyName":"BONZO",
          "preLoadedCompanyName":true,
          "exporterFullName":"John Test",
          "preLoadedName":true,
          "addressOne":"UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
          "postcode":"LE17 5QZ",
          "townCity":"HARBOROUGH",
          "addressTwo":"UPPER BRUNTINGTHORPE, LUTTERWORTH",
          "preLoadedAddress":true,
          "isExporterDetailsSavedAsDraft":false,
          "journey":"storageNotes",
          "currentUri":"/create-storage-document/add-exporter-details",
          "nextUri":"/create-storage-document/add-product-to-this-consignment",
          "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
        },
        "documentNumber":"GBR-2019-SD-DED9F3FE6",
        "user":{
          "email":"foo@foo.com",
          "principal":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
        }
      };

      const document = Transformations.mapStorageDocumentToSD(mockedRedisSD);

      const expected = [
        { documentNumber: 'GBR-2019-SD-DED9F3FE6', status: 'DRAFT', documentType: 'storageDocument',
          certificateNumber: 'FASDFNASDFJASDFJAISDF8ASDF8AS', da: 'LE17 5QZ', species: 'Atlantic herring (HER)',
          scientificName: "some scientific name 1", commodityCode: '423523432', weight: 300, weightOnCC: 1000, extended: {
            exporterCompanyName: "BONZO"
          }, dateOfUnloading:"01/10/2019", placeOfUnloading:"351", transportUnloadedFrom:"234"
         },
        { documentNumber: 'GBR-2019-SD-DED9F3FE6', status: 'DRAFT', documentType: 'storageDocument',
          certificateNumber: '2', da: 'LE17 5QZ', species: 'Argentine anchovy (ANA)',
          scientificName: "some scientific name 2", commodityCode: '23408230498234', weight: 200.11, weightOnCC: 20000.55, extended: {
            exporterCompanyName: "BONZO"
          }, dateOfUnloading: "09/07/2019", placeOfUnloading: "DOVER", transportUnloadedFrom:"234",
        },
      ];

      const res = Query.unwindAndMapCatches(document, identity);
      const actual = Array.from(res)
      .map((item: any) => {
        delete item.createdAt;
        return item
      })
      expect(actual).toEqual(expected)

    });
  });



  it('will map to da from postcode', () => {

    const document: any = createDocument('12345',
      'processingStatement',
      [
        { catchCertificateNumber: 'FCC051', species: 'cats', totalWeightLanded: 500, exportWeightBeforeProcessing: 100},
      ]
    )

    document.exportData.exporterDetails = {
      postcode: 'SUPERCOOL'
    }

    const expected = [
      { documentNumber: '12345', status: 'COMPLETE', documentType: 'processingStatement',
        extended: { url: 'http://www.bob.com' },
        certificateNumber: 'FCC051', da: 'SUPERCOOL', species: 'cats', commodityCode: 'N/A', weight: 100, weightOnCC: 500 }
    ]

    const res = Query.unwindAndMapCatches(document, identity)
    const actual = Array.from(res)
    .map((item: any) => {
      delete item.createdAt;
      return item
    })
    expect(actual).toEqual(expected)

  })

})


describe('Documents to FCC', () => {

  it('test 1', () => {

    const documents = [
      createDocument('12345', 'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'cats', totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
        ])]

    const expected = [
      { certificateNumber: 'FCC051', species: 'cats', declaredWeight: 500, allocatedWeight: 100, createdByDocument: '12345',
        allocationsFrom: [{ documentNumber: '12345', weight: 100}] }
    ]

    const res = Query.unwindForeignCatchCerts(
      Query.unwoundCatchesToForeignCatchCerts(
        Query.unwindDocumentsToCatches(documents)))

    expect(Array.from(res)).toEqual(expected)

  })

  it('test 2', () => {

    const documents = [
      createDocument('12345', 'storageDocument', [
        { certificateNumber: 'FCC061', certificateType: 'uk', product: 'cats', weightOnCC: 500, productWeight: 400 }
      ]),
      createDocument('52345', 'processingStatement', [
        { catchCertificateNumber: 'FCC061', catchCertificateType: 'uk', species: 'cats', totalWeightLanded: 500, exportWeightBeforeProcessing: 100}
      ])
    ]

    const expected = [
      { certificateNumber: 'FCC061', species: 'cats', declaredWeight: 500, allocatedWeight: 500, createdByDocument: '12345',
        allocationsFrom: [{ documentNumber: '12345', weight: 400 }, { documentNumber: '52345', weight: 100 }] }
    ]

    const res = Query.unwindForeignCatchCerts(
      Query.unwoundCatchesToForeignCatchCerts(
        Query.unwindDocumentsToCatches(documents)))

    expect(Array.from(res)).toEqual(expected)

  })

  it('test 3', () => {

    const documents = [
      createDocument('52345', 'storageDocument', [
        { certificateNumber: 'FCC061', certificateType: 'uk', product: 'cats', weightOnCC: 500, productWeight: 400 },
        { certificateNumber: 'FCC061', certificateType: 'non_uk', product: 'dogs', weightOnCC: 500, productWeight: 400 },
        { certificateNumber: 'FCC071', certificateType: 'uk', product: 'cats', weightOnCC: 500, productWeight: 400 }
      ])
    ]

    const expected = [
      { certificateNumber: 'FCC061', species: 'cats', declaredWeight: 500, allocatedWeight: 400, createdByDocument: '52345',
        allocationsFrom: [{ documentNumber: '52345', weight: 400}] },
      { certificateNumber: 'FCC061', species: 'dogs', declaredWeight: 500, allocatedWeight: 400, createdByDocument: '52345',
        allocationsFrom: [{ documentNumber: '52345', weight: 400}] },
      { certificateNumber: 'FCC071', species: 'cats', declaredWeight: 500, allocatedWeight: 400, createdByDocument: '52345',
        allocationsFrom: [{ documentNumber: '52345', weight: 400}] }
    ]

    const res = Query.unwindForeignCatchCerts(
      Query.unwoundCatchesToForeignCatchCerts(
        Query.unwindDocumentsToCatches(documents)))

    expect(Array.from(res)).toEqual(expected)

  })

})


describe('tests at the query level', () => {

  it('test 1', () => {

    const documents = [
      createDocument('12345',
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'cats', scientificName: 'some scientific name', totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
        ],
        moments.utc('2019-01-01T00:00:00Z')
      )]

    const expected = [
      { catchCertificateNumber: "FCC051", catchCertificateType: 'uk', documentNumber: '12345', status: 'COMPLETE', documentType: 'processingStatement', da: 'England', createdAt: '2019-01-01T00:00:00.000Z',
        species: 'cats', scientificName: 'some scientific name', commodityCode: 'N/A',
        weightOnDoc: 100, weightOnAllDocs: 100, weightOnFCC: 500,
        isOverAllocated: false, overAllocatedByWeight: 0,
        overUsedInfo: [],
        isMismatch: false
      }
    ]

    const res = Query.sdpsQuery(documents)

    const actual = Array.from(res)
    .map((item: any) => {
      delete item.extended;
      return item
    })
    expect(actual).toEqual(expected)

  })

  it('test 2', () => {

    const documents = [
      createDocument('12345',
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'cats', scientificName: 'some scientific name', totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
        ],
        moments.utc('2019-01-01T00:00:00Z')),
      createDocument('22345',
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', catchCertificateType: 'non_uk', species: 'cats', scientificName: 'some scientific name', totalWeightLanded: 2000, exportWeightBeforeProcessing: 1000 },
        ],
        moments.utc('2019-01-01T10:00:00Z'))
    ]

    const expected = [
      { catchCertificateNumber: "FCC051", catchCertificateType: 'uk', documentNumber: '12345', status: 'COMPLETE', documentType: 'processingStatement', da: 'England', createdAt: '2019-01-01T00:00:00.000Z',
        species: 'cats', scientificName: 'some scientific name', commodityCode: 'N/A',
        weightOnDoc: 100, weightOnAllDocs: 1100, weightOnFCC: 500,
        isOverAllocated: true, overAllocatedByWeight: 600,
        overUsedInfo: [],
        isMismatch: false
      },
      { catchCertificateNumber: "FCC051", catchCertificateType: 'non_uk', documentNumber: '22345', status: 'COMPLETE', documentType: 'processingStatement', da: 'England', createdAt: '2019-01-01T10:00:00.000Z',
        species: 'cats', scientificName: 'some scientific name', commodityCode: 'N/A',
        weightOnDoc: 1000, weightOnAllDocs: 1100, weightOnFCC: 500,
        isOverAllocated: true, overAllocatedByWeight: 600,
        overUsedInfo: ["12345"],
        isMismatch: true
      }

    ]

    const res = Query.sdpsQuery(documents)
    const actual = Array.from(res)
    .map((item: any) => {
      delete item.extended;
      return item
    })
    expect(actual).toEqual(expected)

  })

  it('commodityCode will appear in the query output', () => {

    const documents = [
      createDocument('12345', 'storageDocument', [
        { certificateNumber: 'FCC061', product: 'cats', scientificName: 'some scientific name', commodityCode: 'COMMODITYCODE123', weightOnCC: 500, productWeight: 400 }
      ]),
      createDocument('52345', 'processingStatement', [
        { catchCertificateNumber: 'FCC061', species: 'cats', scientificName: 'some scientific name', totalWeightLanded: 500, exportWeightBeforeProcessing: 100}
      ])
    ]

    const res: any[] = Array.from(Query.sdpsQuery(documents))

    expect(res.map(_ => [_.documentNumber, _.commodityCode]))
      .toEqual([ ['12345', 'COMMODITYCODE123'], ['52345', 'N/A'] ])

  })


  it('not a mismatch if second reference to a fkk matches the details given on the first reference', () => {

    const documents = [
      createDocument('12345',
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'cats', scientificName: 'some scientific name', totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
        ],
        moments.utc('2019-01-01T00:00:00Z')),
      createDocument('22345',
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', catchCertificateType: 'non_uk', species: 'cats', scientificName: 'some scientific name', totalWeightLanded: 500, exportWeightBeforeProcessing: 400 },
        ],
        moments.utc('2019-01-01T10:00:00Z'))
    ];

    const expected = [
      { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', documentNumber: '12345', status: 'COMPLETE', documentType: 'processingStatement', da: 'England', createdAt: '2019-01-01T00:00:00.000Z',
        species: 'cats', scientificName: 'some scientific name', commodityCode: 'N/A',
        weightOnDoc: 100, weightOnAllDocs: 500, weightOnFCC: 500,
        isOverAllocated: false, overAllocatedByWeight: 0,
        overUsedInfo: [],
        isMismatch: false
      },
      { catchCertificateNumber: 'FCC051', catchCertificateType: 'non_uk', documentNumber: '22345', status: 'COMPLETE', documentType: 'processingStatement', da: 'England', createdAt: '2019-01-01T10:00:00.000Z',
        species: 'cats', scientificName: 'some scientific name', commodityCode: 'N/A',
        weightOnDoc: 400, weightOnAllDocs: 500, weightOnFCC: 500,
        isOverAllocated: false, overAllocatedByWeight: 0,
        overUsedInfo: [],
        isMismatch: false
      }
    ];

    const res = Query.sdpsQuery(documents)
    const actual = Array.from(res)
    .map((item: any) => {
      delete item.extended;
      return item
    })
    expect(actual).toEqual(expected)

  });

  it('can map from postcode to Da', () => {

    const document: any = createDocument(
      '12345',
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', catchCertificateType: 'non_uk', species: 'cats', scientificName: 'some scientific name', totalWeightLanded: 500, exportWeightBeforeProcessing: 100},
        ]
      )
    document.exportData.exporterDetails = { postcode: 'SA79HS' }

    const documents = [document]

    const postCodeToDa = {
      'SA': { authority : 'Wales' },
      'N': { authority : 'Narnia' }
    }

    let res: any[]

    res = Array.from(Query.sdpsQuery(documents, postCodeToDa))

    expect(res[0].da).toBe('Wales')

    document.exportData.exporterDetails = { postcode: 'N1 4XJ' }

    res = Array.from(Query.sdpsQuery(documents, postCodeToDa))

    expect(res[0].da).toBe('Narnia')

  })

  it('can map from postcode to Da for storage document', () => {

    const document: any = createDocument(
      '12345',
        'storageDocument',
        [
          { certificateNumber: 'FCC051', catchCertificateType: 'non_uk', product: 'cats', scientificName: 'some scientific name', weightOnCC: 500, productWeight: 500 },
        ]
      )
    document.exportData.exporterDetails = { postcode: 'SA79HS' }

    const documents = [document]

    const postCodeToDa = {
      'SA': { authority : 'Wales' },
      'N': { authority : 'Narnia' }
    }

    let res: any[]

    res = Array.from(Query.sdpsQuery(documents, postCodeToDa))

    expect(res[0].da).toBe('Wales')

    document.exportData.exporterDetails = { postcode: 'N1 4XJ' }

    res = Array.from(Query.sdpsQuery(documents, postCodeToDa))

    expect(res[0].da).toBe('Narnia')

  })

  it('will accept lower case postcodes', () => {

    const document: any = createDocument(
      '12345',
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', catchCertificateType: 'non_uk', species: 'cats', scientificName: 'some scientific name', totalWeightLanded: 500, exportWeightBeforeProcessing: 100},
        ]
      )
    document.exportData.exporterDetails = { postcode: 'sa79hs' }

    const documents = [document]

    const postCodeToDa = {
      'SA': { authority : 'Wales' },
      'N': { authority : 'Narnia' }
    }

    const res: any[] = Array.from(Query.sdpsQuery(documents, postCodeToDa))

    expect(res[0].da).toBe('Wales')

  })

  it('will fall back to England for bad postcode', () => {

    const document: any = createDocument(
      '12345',
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', catchCertificateType: 'non_uk', species: 'cats', scientificName: 'some scientific name', totalWeightLanded: 500, exportWeightBeforeProcessing: 100},
        ]
      );

    document.exportData.exporterDetails = { postcode: '__///__' }

    const documents = [document];
    const postCodeToDa = {};
    const res: any[] = Array.from(Query.sdpsQuery(documents, postCodeToDa));

    expect(res[0].da).toBe('England');

  })

  it('will not fail on javascript reserved words in source data', () => {
    const document: any = createDocument(
      '12345',
        'processingStatement',
        [
          { catchCertificateNumber: 'bob', catchCertificateType: 'uk', species: 'toString', scientificName: 'some scientific name', totalWeightLanded: 500, exportWeightBeforeProcessing: 100},
          { catchCertificateNumber: 'bob', catchCertificateType: 'non_uk', species: 'COD', scientificName: 'some scientific name', totalWeightLanded: 500, exportWeightBeforeProcessing: 100}
        ]
      )

    const document2: any = createDocument(
      '22345',
        'storageDocument',
        [
          { certificateNumber: 'toString', certificateType: 'uk', product: 'toString', scientificName: 'some scientific name', weightOnCC: 500, productWeight: 500, productDescription: "productDescription", supportingDocuments: ['Document-1'], netWeightProductArrival: 10, netWeightFisheryProductArrival: 10, netWeightProductDeparture: 10, netWeightFisheryProductDeparture: 10 },
          { certificateNumber: 'toString', certificateType: 'uk', product: 'values', scientificName: 'some scientific name', weightOnCC: 500, productWeight: 500, productDescription: "productDescription", supportingDocuments: ['Document-1'], netWeightProductArrival: 10, netWeightFisheryProductArrival: 10, netWeightProductDeparture: 10, netWeightFisheryProductDeparture: 10  },
          { certificateNumber: 'bob', certificateType: 'uk', product: 'COD', scientificName: 'some scientific name', weightOnCC: 500, productWeight: 500 },
        ]
      )

    const documents = [document, document2]

    const res: any[] = Array.from(Query.sdpsQuery(documents, postCodeToDa))

    expect(res.length).toBe(5)

  })

  it('will not fail on other bad data', () => {

    const document: any = createDocument(
      '12345',
        'processingStatement',
        [
          { catchCertificateNumber: undefined, catchCertificateType: undefined, species: undefined, scientificName: undefined, totalWeightLanded: 500, exportWeightBeforeProcessing: 100},
        ]
      )

    const documents = [document]

    const res: any[] = Array.from(Query.sdpsQuery(documents, postCodeToDa))

    expect(res.length).toBe(1)

  })

})

describe('When setting isOverAllocated', () => {

  let documents;

  describe('for processing statement', () => {

    const totalWeightLandedWeight = 100

    beforeEach(()=>{
      documents = [
        createDocument('12345',
           'processingStatement',
           [
             {
               catchCertificateNumber: 'FCC051',
               species: 'cats',
               scientificName: 'some scientific name',
               totalWeightLanded: totalWeightLandedWeight,
               exportWeightBeforeProcessing: 0
             }
           ],
           moments.utc('2019-01-01T00:00:00Z')
        )]
    });

    it('should be set as false if exportWeightBeforeProcessing is less than totalWeightLanded', () => {

      documents[0].exportData.catches[0].exportWeightBeforeProcessing = totalWeightLandedWeight - 1;

      const result = Array.from(Query.sdpsQuery(documents));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();

    });

    it('should be set as false if exportWeightBeforeProcessing is equal to totalWeightLanded', () => {

      documents[0].exportData.catches[0].exportWeightBeforeProcessing = totalWeightLandedWeight ;

      const result = Array.from(Query.sdpsQuery(documents));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();

    });

    it(`should be set as false if exportWeightBeforeProcessing is less than totalWeightLanded + ${Query.TOLERANCE_IN_KG}` , () => {

      documents[0].exportData.catches[0].exportWeightBeforeProcessing = totalWeightLandedWeight + Query.TOLERANCE_IN_KG -1  ;

      const result = Array.from(Query.sdpsQuery(documents));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();

    });

    it(`should be set as false if exportWeightBeforeProcessing is equal is totalWeightLanded + ${Query.TOLERANCE_IN_KG}` , () => {

      documents[0].exportData.catches[0].exportWeightBeforeProcessing = totalWeightLandedWeight + Query.TOLERANCE_IN_KG  ;

      const result = Array.from(Query.sdpsQuery(documents));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();

    });

    it(`should be set as true if exportWeightBeforeProcessing is more than totalWeightLanded + ${Query.TOLERANCE_IN_KG}` , () => {

      documents[0].exportData.catches[0].exportWeightBeforeProcessing = totalWeightLandedWeight + Query.TOLERANCE_IN_KG + 1 ;

      const result = Array.from(Query.sdpsQuery(documents));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeTruthy();

    });

  });

  describe('in storage documents', () => {

    const weightOnCC = 100

    beforeEach(()=> {
      documents = [
         createDocument('12345',
         'storageDocument',
         [
           {
             certificateNumber: 'FCC051',
             product: 'cats',
             scientificName: 'some scientific name',
             weightOnCC: weightOnCC,
             productWeight: 0,
             dateOfUnloading: "15/06/2020",
             placeOfUnloading: "Dover",
             transportUnloadedFrom: "BA078"
           }
         ]
        )
      ]
    });

    it('should be set as false if weightOnCC less than productWeight',  () => {

      documents[0].exportData.catches[0].productWeight = weightOnCC - 1 ;

      const result = Array.from(Query.sdpsQuery(documents));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();

    });

    it('should be set as false if weightOnCC equal to productWeight',  () => {

      documents[0].exportData.catches[0].productWeight = weightOnCC ;

      const result = Array.from(Query.sdpsQuery(documents));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();

    });

    it(`should be set as false if weightOnCC less than productWeight + ${Query.TOLERANCE_IN_KG}`,  () => {

      documents[0].exportData.catches[0].productWeight = weightOnCC + Query.TOLERANCE_IN_KG -1;

      const result = Array.from(Query.sdpsQuery(documents));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();

    });

    it(`should be set as false if weightOnCC equal to productWeight + ${Query.TOLERANCE_IN_KG}`,  () => {

      documents[0].exportData.catches[0].productWeight = weightOnCC + Query.TOLERANCE_IN_KG ;

      const result = Array.from(Query.sdpsQuery(documents));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();

    });

    it(`should be set as true if weightOnCC more than productWeight + ${Query.TOLERANCE_IN_KG}`,  () => {

      documents[0].exportData.catches[0].productWeight = weightOnCC + Query.TOLERANCE_IN_KG + 1;

      const result = Array.from(Query.sdpsQuery(documents));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeTruthy();

    });

  })

});

describe('When setting over used info array', () => {

  let documents;

  describe('for processing statement', () => {

    const totalWeightLandedWeight = 100

    beforeEach(()=>{
      documents = [
        createDocument('PS1',
          'processingStatement',
          [
            {
              catchCertificateNumber: 'FCC051',
              species: 'cats',
              scientificName: 'some scientific name',
              totalWeightLanded: totalWeightLandedWeight,
              exportWeightBeforeProcessing: 0
            }
          ],
          moments.utc('2019-01-01T00:00:00Z')
      ),
      createDocument('PS2',
      'processingStatement',
      [
        {
          catchCertificateNumber: 'FCC051',
          species: 'cats',
          scientificName: 'some scientific name',
          totalWeightLanded: totalWeightLandedWeight,
          exportWeightBeforeProcessing: 0
        },
        {
          catchCertificateNumber: 'FCC051',
          species: 'cats',
          scientificName: 'some scientific name',
          totalWeightLanded: totalWeightLandedWeight,
          exportWeightBeforeProcessing: 0
        }
      ],
      moments.utc('2019-01-01T00:00:00Z')
      )]
    });

    it('should not list any document numbers when an over use does not occur', () => {

      documents[0].exportData.catches[0].exportWeightBeforeProcessing = totalWeightLandedWeight - 1;

      const result = Array.from(Query.sdpsQuery(documents));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();
      result.forEach(result => expect((result as ISdPsQueryResult).overUsedInfo).toEqual([]));

    });

    it(`should list all the prior document numbers when an over use occurs` , () => {

      documents[1].exportData.catches[0].exportWeightBeforeProcessing = totalWeightLandedWeight + Query.TOLERANCE_IN_KG + 1 ;

      const result = Array.from(Query.sdpsQuery(documents));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeTruthy();
      expect((result[0]as ISdPsQueryResult).overUsedInfo).toStrictEqual([]);
      expect((result[1] as ISdPsQueryResult).overUsedInfo).toStrictEqual(['PS1']);
      expect((result[2]as ISdPsQueryResult).overUsedInfo).toStrictEqual(['PS1','PS2']);


    });
  });

  describe('in storage documents', () => {

    const weightOnCC = 100

    beforeEach(()=> {
      documents = [
        createDocument('SD1',
        'storageDocument',
        [
          {
            certificateNumber: 'FCC051',
            product: 'cats',
            scientificName: 'some scientific name',
            weightOnCC: weightOnCC,
            productWeight: 0,
            dateOfUnloading: "15/06/2020",
            placeOfUnloading: "Dover",
            transportUnloadedFrom: "BA078"
          }
        ]
      ),
      createDocument('SD2',
        'storageDocument',
        [
          {
            certificateNumber: 'FCC051',
            product: 'cats',
            scientificName: 'some scientific name',
            weightOnCC: weightOnCC,
            productWeight: 0,
            dateOfUnloading: "15/06/2020",
            placeOfUnloading: "Dover",
            transportUnloadedFrom: "BA078"
          },
          {
            certificateNumber: 'FCC051',
            product: 'cats',
            scientificName: 'some scientific name',
            weightOnCC: weightOnCC,
            productWeight: 0,
            dateOfUnloading: "15/06/2020",
            placeOfUnloading: "Dover",
            transportUnloadedFrom: "BA078"
          }
        ]
      )]
    });

    it('should list any document numbers when an over use does not occur',  () => {

      documents[0].exportData.catches[0].productWeight = weightOnCC - 1 ;

      const result = Array.from(Query.sdpsQuery(documents));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();

    });

    it('should be set as false if weightOnCC equal to productWeight',  () => {

      documents[0].exportData.catches[0].productWeight = weightOnCC ;

      const result = Array.from(Query.sdpsQuery(documents));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeFalsy();
      result.forEach(result => expect((result as ISdPsQueryResult).overUsedInfo).toEqual([]));

    });

    it('should list all the prior document numbers when an over use occurs',  () => {

      documents[1].exportData.catches[1].productWeight = weightOnCC + Query.TOLERANCE_IN_KG + 1;

      const result = Array.from(Query.sdpsQuery(documents));
      expect((result[0] as ISdPsQueryResult).isOverAllocated).toBeTruthy();
      expect((result[0]as ISdPsQueryResult).overUsedInfo).toStrictEqual([]);
      expect((result[1] as ISdPsQueryResult).overUsedInfo).toStrictEqual(['SD1']);
      expect((result[2] as ISdPsQueryResult).overUsedInfo).toStrictEqual(['SD1','SD2']);


    });

  })

});