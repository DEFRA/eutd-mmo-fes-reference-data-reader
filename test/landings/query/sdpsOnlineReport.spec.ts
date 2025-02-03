const moment = require('moment');
import { InvestigationStatus } from '../../../src/landings/types/auditEvent';
import {sdpsQuery} from "../../../src/landings/query/sdpsQuery";
import {getForeignCatchCertificateOnlineValidationReport} from "../../../src/landings/query/onlineReports";

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


describe('tests on the foreign catch certificate online report output', () => {
  it('will return a report if there is something invalid with a processing statement', () => {
     const document: any = createDocument('12345',
       'processingStatement',
       [
         { catchCertificateNumber: 'FCC051', species: 'cats', totalWeightLanded: 100, exportWeightBeforeProcessing: 500, exportWeightAfterProcessing: 400 },
       ],
       moment.utc('2019-01-01T00:00:00Z')
     );

    document.exportData.exporterDetails = { exporterCompanyName : 'the company' }
    document.investigation = {
      investigator: "Miss The Investigator",
      status: InvestigationStatus.DataError
    };

    const expected = {
      isValid: false,
      details: [
        {
          certificateNumber: "FCC051",
          product: "cats"
        }
      ],
      rawData: [{
        catchCertificateNumber: "FCC051",
        commodityCode: "N/A",
        createdAt: "2019-01-01T00:00:00.000Z",
        da: "England",
        documentNumber: "12345",
        documentType: "processingStatement",
        extended: {
          exporterCompanyName: "the company",
          investigation: {
            investigator: "Miss The Investigator",
            status: "DATA_ERROR_NFA",
          },
          preApprovedBy: undefined,
          url: "http://www.bob.com",
          voidedBy: undefined,
        },
        isMismatch: false,
        isOverAllocated: true,
        overUsedInfo: [],
        overAllocatedByWeight: 400,
        species: "cats",
        status: "COMPLETE",
        weightOnAllDocs: 500,
        weightOnDoc: 500,
        weightOnFCC: 100,
        weightAfterProcessing: 400
      }]
    };

    const rawValidationResult = Array.from(sdpsQuery([document],{'NE' : {} }));
    const res = getForeignCatchCertificateOnlineValidationReport("12345",rawValidationResult);
    expect(res).toEqual(expected);
  });

  it('will return a report if there is something invalid with a storage document', () => {
        const document: any = createDocument('12345',
            'storageDocument',
            [
                { certificateNumber: 'FCC051', product: 'cats', id: "FCC051-1610018869", weightOnCC: 500, productWeight: 800 },
                { certificateNumber: 'FCC051', product: 'dogs', id: "FCC051-1610018849", weightOnCC: 500, productWeight: 200 }
            ]
        );

        const expectedOutput = {
          isValid: false,
          details: [ { certificateNumber: 'FCC051', product: 'cats' }],
            rawData: [{
              catchCertificateNumber: "FCC051",
              commodityCode: undefined,
              createdAt: expect.any(String),
              da: "England",
              documentNumber: "12345",
              documentType: "storageDocument",
              extended: {
              exporterCompanyName: "the company",
              id: "FCC051-1610018869",
              investigation: {
                investigator: "Miss The Investigator",
                status: "DATA_ERROR_NFA",
              },
              preApprovedBy: undefined,
              url: "http://www.bob.com",
              voidedBy: undefined,
              },
              isMismatch: false,
              isOverAllocated: true,
              overUsedInfo: [],
              overAllocatedByWeight: 300,
              species: "cats",
              status: "COMPLETE",
              weightOnAllDocs: 800,
              weightOnDoc: 800,
              weightOnFCC: 500
            },
            {
              catchCertificateNumber: "FCC051",
              commodityCode: undefined,
              createdAt: expect.any(String),
              da: "England",
              documentNumber: "12345",
              documentType: "storageDocument",
              extended: {
              exporterCompanyName: "the company",
              id: "FCC051-1610018849",
              investigation: {
                investigator: "Miss The Investigator",
                status: "DATA_ERROR_NFA",
              },
              preApprovedBy: undefined,
              url: "http://www.bob.com",
              voidedBy: undefined,
              },
              isMismatch: false,
              isOverAllocated: false,
              overUsedInfo: [],
              overAllocatedByWeight: 0,
              species: "dogs",
              status: "COMPLETE",
              weightOnAllDocs: 200,
              weightOnDoc: 200,
              weightOnFCC: 500
            }]
        };

        document.exportData.exporterDetails = { exporterCompanyName : 'the company' };
        document.investigation = {
            investigator: "Miss The Investigator",
            status: InvestigationStatus.DataError
        };

        const rawValidationResult = Array.from(sdpsQuery([document],{'NE' : {} }));
        const res = getForeignCatchCertificateOnlineValidationReport("12345",rawValidationResult);
        expect(res).toEqual(expectedOutput);
    });

  it('will deal with case sensitivity on cert numbers', () => {
      const document: any = createDocument('12345',
          'processingStatement',
          [
              { catchCertificateNumber: 'fcc051', species: 'cats', totalWeightLanded: 100, exportWeightBeforeProcessing: 500 },
          ],
          moment.utc('2019-01-01T00:00:00Z')
      );

      document.exportData.exporterDetails = { exporterCompanyName : 'the company' }
      document.investigation = {
          investigator: "Miss The Investigator",
          status: InvestigationStatus.DataError
      };

      const rawValidationResult = Array.from(sdpsQuery([document],{'NE' : {} }));
      const res = getForeignCatchCertificateOnlineValidationReport("12345",rawValidationResult);
      expect(res.details[0].certificateNumber).toEqual("FCC051");
  });

  it('can create a report on simple data that has some documents invalid and some valid', () => {
        const document: any = createDocument('12345',
            'processingStatement',
            [
                { catchCertificateNumber: 'FCC051', species: 'worms', totalWeightLanded: 100, exportWeightBeforeProcessing: 50 },
                { catchCertificateNumber: 'FCC052', species: 'luttons', totalWeightLanded: 100, exportWeightBeforeProcessing: 500 }
            ],
            moment.utc('2019-01-01T00:00:00Z')
        );

        document.exportData.exporterDetails = { exporterCompanyName : 'the company' }
        document.investigation = {
            investigator: "Miss The Investigator",
            status: InvestigationStatus.DataError
        };

        const expected = {
            isValid: false,
            details: [
                {
                    certificateNumber: "FCC052",
                    product: "luttons"
                }
            ],
            rawData: [{
              catchCertificateNumber: "FCC051",
              commodityCode: "N/A",
              createdAt: "2019-01-01T00:00:00.000Z",
              da: "England",
              documentNumber: "12345",
              documentType: "processingStatement",
              extended: {
              exporterCompanyName: "the company",
              investigation: {
                  investigator: "Miss The Investigator",
                  status: "DATA_ERROR_NFA",
                },
                preApprovedBy: undefined,
                url: "http://www.bob.com",
                voidedBy: undefined,
              },
              isMismatch: false,
              isOverAllocated: false,
              overUsedInfo: [],
              overAllocatedByWeight: 0,
              species: "worms",
              status: "COMPLETE",
              weightOnAllDocs: 50,
              weightOnDoc: 50,
              weightOnFCC: 100,
            },
            {
              catchCertificateNumber: "FCC052",
              commodityCode: "N/A",
              createdAt: "2019-01-01T00:00:00.000Z",
              da: "England",
              documentNumber: "12345",
              documentType: "processingStatement",
              extended: {
              exporterCompanyName: "the company",
              investigation: {
                  investigator: "Miss The Investigator",
                  status: "DATA_ERROR_NFA",
                },
                preApprovedBy: undefined,
                url: "http://www.bob.com",
                voidedBy: undefined,
              },
              isMismatch: false,
              isOverAllocated: true,
              overUsedInfo: ["12345"],
              overAllocatedByWeight: 400,
              species: "luttons",
              status: "COMPLETE",
              weightOnAllDocs: 500,
              weightOnDoc: 500,
              weightOnFCC: 100,
            }]
        };

        const rawValidationResult = Array.from(sdpsQuery([document],{'NE' : {} }));
        const res = getForeignCatchCertificateOnlineValidationReport("12345",rawValidationResult);
        expect(res).toEqual(expected);
    });

  it('can create a report on more complete data', () => {
    const documents = [
      createDocument('12345',
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'cats', scientificName: 'some scientific name', id: "FCC051-1610018899", totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
          { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'dogs', scientificName: 'some scientific name', id: "FCC051-1610018889", totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
          { catchCertificateNumber: 'FCC052', catchCertificateType: 'uk', species: 'cats', scientificName: 'some scientific name', id: "FCC051-1610018879", totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
        ],
        moment.utc('2019-01-01T00:00:00Z')
      ),

      createDocument('12345',
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'cats', scientificName: 'some scientific name', id: "FCC051-1610018869", totalWeightLanded: 500, exportWeightBeforeProcessing: 500 },
          { catchCertificateNumber: 'FCC053', catchCertificateType: 'uk', species: 'cats', scientificName: 'some scientific name', id: "FCC051-1610018859", totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
        ],
        moment.utc('2019-01-01T10:00:00Z')
      ),

      createDocument('12345',
        'storageDocument',
        [
          { certificateNumber: 'FCC051', certificateType: 'uk', product: 'cats', scientificName: 'some scientific name', id: "FCC051-1610018849", commodityCode: 'CC', weightOnCC: 999, productWeight: 0 }
        ],
        moment.utc('2019-01-01T12:00:00Z')
      ),

    ];

    const rawValidationResult = Array.from(sdpsQuery(documents,undefined));
    const res = getForeignCatchCertificateOnlineValidationReport("12345",rawValidationResult);
    const expectedOutput = { isValid: false,
        details:
            [ { certificateNumber: 'FCC051', product: 'cats' },
                { certificateNumber: 'FCC051', product: 'cats' },
                { certificateNumber: 'FCC051', product: 'cats' } ],
        rawData: [{
          catchCertificateNumber: "FCC051",
          catchCertificateType: 'uk',
          commodityCode: "N/A",
          createdAt: "2019-01-01T00:00:00.000Z",
          da: "England",
          documentNumber: "12345",
          documentType: "processingStatement",
          extended: {
            exporterCompanyName: undefined,
            id: "FCC051-1610018899",
            investigation: undefined,
            preApprovedBy: undefined,
            url: "http://www.bob.com",
            voidedBy: undefined,
          },
          isMismatch: false,
          isOverAllocated: true,
          overUsedInfo: [],
          overAllocatedByWeight: 100,
          species: "cats",
          scientificName: "some scientific name",
          status: "COMPLETE",
          weightOnAllDocs: 600,
          weightOnDoc: 100,
          weightOnFCC: 500,
        },
        {
          catchCertificateNumber: "FCC051",
          catchCertificateType: 'uk',
          commodityCode: "N/A",
          createdAt: "2019-01-01T00:00:00.000Z",
          da: "England",
          documentNumber: "12345",
          documentType: "processingStatement",
          extended: {
            exporterCompanyName: undefined,
            id: "FCC051-1610018889",
            investigation: undefined,
            preApprovedBy: undefined,
            url: "http://www.bob.com",
            voidedBy: undefined,
          },
          isMismatch: false,
          isOverAllocated: false,
          overUsedInfo: [],
          overAllocatedByWeight: 0,
          species: "dogs",
          scientificName: "some scientific name",
          status: "COMPLETE",
          weightOnAllDocs: 100,
          weightOnDoc: 100,
          weightOnFCC: 500,
        },
        {
          catchCertificateNumber: "FCC052",
          catchCertificateType: 'uk',
          commodityCode: "N/A",
          createdAt: "2019-01-01T00:00:00.000Z",
          da: "England",
          documentNumber: "12345",
          documentType: "processingStatement",
          extended: {
            exporterCompanyName: undefined,
            id: "FCC051-1610018879",
            investigation: undefined,
            preApprovedBy: undefined,
            url: "http://www.bob.com",
            voidedBy: undefined,
          },
          isMismatch: false,
          isOverAllocated: false,
          overUsedInfo: [],
          overAllocatedByWeight: 0,
          species: "cats",
          scientificName: "some scientific name",
          status: "COMPLETE",
          weightOnAllDocs: 100,
          weightOnDoc: 100,
          weightOnFCC: 500,
        },
        {
          catchCertificateNumber: "FCC051",
          catchCertificateType: 'uk',
          commodityCode: "N/A",
          createdAt: "2019-01-01T10:00:00.000Z",
          da: "England",
          documentNumber: "12345",
          documentType: "processingStatement",
          extended: {
            exporterCompanyName: undefined,
            id: "FCC051-1610018869",
            investigation: undefined,
            preApprovedBy: undefined,
            url: "http://www.bob.com",
            voidedBy: undefined,
          },
          isMismatch: false,
          isOverAllocated: true,
          overUsedInfo: ["12345"],
          overAllocatedByWeight: 100,
          species: "cats",
          scientificName: "some scientific name",
          status: "COMPLETE",
          weightOnAllDocs: 600,
          weightOnDoc: 500,
          weightOnFCC: 500,
        },
        {
          catchCertificateNumber: "FCC053",
          catchCertificateType: 'uk',
          commodityCode: "N/A",
          createdAt: "2019-01-01T10:00:00.000Z",
          da: "England",
          documentNumber: "12345",
          documentType: "processingStatement",
          extended: {
            exporterCompanyName: undefined,
            id: "FCC051-1610018859",
            investigation: undefined,
            preApprovedBy: undefined,
            url: "http://www.bob.com",
            voidedBy: undefined,
          },
          isMismatch: false,
          isOverAllocated: false,
          overUsedInfo: [],
          overAllocatedByWeight: 0,
          species: "cats",
          scientificName: "some scientific name",
          status: "COMPLETE",
          weightOnAllDocs: 100,
          weightOnDoc: 100,
          weightOnFCC: 500,
        },
        {
          catchCertificateNumber: "FCC051",
          catchCertificateType: 'uk',
          commodityCode: "CC",
          createdAt: "2019-01-01T12:00:00.000Z",
          da: "England",
          documentNumber: "12345",
          documentType: "storageDocument",
          extended: {
            exporterCompanyName: undefined,
            id: "FCC051-1610018849",
            investigation: undefined,
            preApprovedBy: undefined,
            url: "http://www.bob.com",
            voidedBy: undefined,
          },
          isMismatch: true,
          isOverAllocated: true,
          overAllocatedByWeight: 100,
          overUsedInfo: ["12345"],
          species: "cats",
          scientificName: "some scientific name",
          status: "COMPLETE",
          weightOnAllDocs: 600,
          weightOnDoc: 0,
          weightOnFCC: 500,
        }
    ]};

    expect(res).toStrictEqual(expectedOutput);
  });

  it('will return return a valid result if data is correct', () => {
    const document: any = createDocument('12345',
        'storageDocument',
        [
          { certificateNumber: 'FCC051', product: 'cats', weightOnCC: 500, productWeight: 200 },
          { certificateNumber: 'FCC051', product: 'dogs', weightOnCC: 500, productWeight: 200 }
        ]
    );

    document.exportData.exporterDetails = { exporterCompanyName : 'the company' }
    document.investigation = {
      investigator: "Miss The Investigator",
      status: InvestigationStatus.DataError
    };

    const rawValidationResult = Array.from(sdpsQuery([document],{'NE' : {} }));
    const res = getForeignCatchCertificateOnlineValidationReport("12345",rawValidationResult);

    expect(res.isValid).toEqual(true);
  });

  it('will only return the certificates related to redis payload', () => {
        const documents = [
            createDocument('12345',
                'processingStatement',
                [
                    { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'cats', scientificName: 'some scientific name', id: "FCC051-1610018899", totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
                    { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'dogs', scientificName: 'some scientific name', id: "FCC051-1610018889", totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
                    { catchCertificateNumber: 'FCC052', catchCertificateType: 'uk', species: 'cats', scientificName: 'some scientific name', id: "FCC051-1610018879", totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
                ],
                moment.utc('2019-01-01T00:00:00Z')
            ),

            createDocument('22345',
                'processingStatement',
                [
                    { catchCertificateNumber: 'FCC051', catchCertificateType: 'uk', species: 'cats', scientificName: 'some scientific name', id: "FCC051-1610018869", totalWeightLanded: 500, exportWeightBeforeProcessing: 500 },
                    { catchCertificateNumber: 'FCC053', catchCertificateType: 'uk', species: 'cats', scientificName: 'some scientific name', id: "FCC051-1610018859", totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
                ],
                moment.utc('2019-01-01T10:00:00Z')
            ),

            createDocument('32345',
                'storageDocument',
                [
                    { certificateNumber: 'FCC051', certificateType: 'uk', product: 'cats', scientificName: 'some scientific name', id: "FCC051-1610018849", commodityCode: 'CC', weightOnCC: 999, productWeight: 0 }
                ],
                moment.utc('2019-01-01T12:00:00Z')
            ),

        ];

        const rawValidationResult = Array.from(sdpsQuery(documents,undefined));
        const res = getForeignCatchCertificateOnlineValidationReport("12345",rawValidationResult);
        const expectedOutput = {
          isValid: false,
          details:[ { certificateNumber: 'FCC051', product: 'cats' }],
          rawData: [{
            catchCertificateNumber: "FCC051",
            catchCertificateType: 'uk',
            commodityCode: "N/A",
            createdAt: "2019-01-01T00:00:00.000Z",
            da: "England",
            documentNumber: "12345",
            documentType: "processingStatement",
            extended: {
              exporterCompanyName: undefined,
              id: "FCC051-1610018899",
              investigation: undefined,
              preApprovedBy: undefined,
              url: "http://www.bob.com",
              voidedBy: undefined,
            },
            isMismatch: false,
            isOverAllocated: true,
            overUsedInfo: [],
            overAllocatedByWeight: 100,
            species: "cats",
            scientificName: 'some scientific name',
            status: "COMPLETE",
            weightOnAllDocs: 600,
            weightOnDoc: 100,
            weightOnFCC: 500,
          },
          {
            catchCertificateNumber: "FCC051",
            catchCertificateType: 'uk',
            commodityCode: "N/A",
            createdAt: "2019-01-01T00:00:00.000Z",
            da: "England",
            documentNumber: "12345",
            documentType: "processingStatement",
            extended: {
              exporterCompanyName: undefined,
              id: "FCC051-1610018889",
              investigation: undefined,
              preApprovedBy: undefined,
              url: "http://www.bob.com",
              voidedBy: undefined,
            },
            isMismatch: false,
            isOverAllocated: false,
            overUsedInfo: [],
            overAllocatedByWeight: 0,
            species: "dogs",
            scientificName: "some scientific name",
            status: "COMPLETE",
            weightOnAllDocs: 100,
            weightOnDoc: 100,
            weightOnFCC: 500,
          },
          {
            catchCertificateNumber: "FCC052",
            catchCertificateType: 'uk',
            commodityCode: "N/A",
            createdAt: "2019-01-01T00:00:00.000Z",
            da: "England",
            documentNumber: "12345",
            documentType: "processingStatement",
            extended: {
              exporterCompanyName: undefined,
              id: "FCC051-1610018879",
              investigation: undefined,
              preApprovedBy: undefined,
              url: "http://www.bob.com",
              voidedBy: undefined,
            },
            isMismatch: false,
            isOverAllocated: false,
            overUsedInfo: [],
            overAllocatedByWeight: 0,
            species: "cats",
            scientificName: "some scientific name",
            status: "COMPLETE",
            weightOnAllDocs: 100,
            weightOnDoc: 100,
            weightOnFCC: 500,
          }]
        };

        expect(res).toStrictEqual(expectedOutput);
    });
});