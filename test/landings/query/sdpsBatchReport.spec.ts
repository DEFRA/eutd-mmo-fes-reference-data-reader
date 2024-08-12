import {sdpsQuery} from "../../../src/landings/query/sdpsQuery";

const moment = require('moment');
const Report = require('../../../src/landings/query/sdpsBatchReport');
import { postCodeToDa } from 'mmo-shared-reference-data';
import { InvestigationStatus, AuditEventTypes } from '../../../src/landings/types/auditEvent';


const createDocument = (documentNumber, documentType, catches, createdAt?, audit : any = []) =>
  ({
     __t: documentType,
     documentUri: 'http://www.bob.com',
     exportData: { catches },
     createdByEmail: 'bob@bob.com',
     createdBy: 'bob',
     createdAt: createdAt ? createdAt : new Date(),
     documentNumber,
     status: 'COMPLETE',
     audit : audit
	});


describe('tests on the report output', () => {
  it('can create a report on simple data', () => {
     const document: any = createDocument('12345',
       'processingStatement',
       [
         { catchCertificateNumber: 'FCC051', species: 'cats', totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
       ],
       moment.utc('2019-01-01T00:00:00Z')
     );

    document.exportData.exporterDetails = { exporterCompanyName : 'the company' }
    document.investigation = {
      investigator: "Miss The Investigator",
      status: InvestigationStatus.DataError
    };

    const expected = [
      { productCommodityCode: 'N/A',
        documentNumber: '12345', documentStatus: 'COMPLETE',
        documentType: 'PS', exporter: 'the company',
        speciesCode: 'cats', speciesName: 'cats',
        weight: 100,
        exportWeightExceeded: 0, inputWeightMismatch: undefined, timestamp: '2019-01-01T00:00:00.000Z',
        documentUrl: 'http://www.bob.com',
        authority: 'England',
        investigatedBy : 'Miss The Investigator',
        investigationStatus: InvestigationStatus.DataError
      }
    ];

    const rawValidationResult = sdpsQuery([document],{'NE' : {} });
    const res = Report.sdpsBatchReport(rawValidationResult);
    expect(Array.from(res)).toEqual(expected);
  });

  it('will have preApprovedBy property', () => {
    const document: any = createDocument('12345',
      'processingStatement',
      [
        { catchCertificateNumber: 'FCC051', species: 'cats', totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
      ],
      moment.utc('2019-01-01T00:00:00Z'),[
        {"eventType": AuditEventTypes.PreApproved, "triggeredBy": "Jim", "timestamp": new Date(), "data": null},
        {"eventType": AuditEventTypes.PreApproved, "triggeredBy": "Bob", "timestamp": new Date(), "data": null}
      ]
    );

   document.exportData.exporterDetails = { exporterCompanyName : 'the company' }
   document.investigation = {
     investigator: "Miss The Investigator",
     status: InvestigationStatus.DataError
   };

   const expected = [
     { productCommodityCode: 'N/A',
       documentNumber: '12345', documentStatus: 'COMPLETE',
       documentType: 'PS', exporter: 'the company',
       speciesCode: 'cats', speciesName: 'cats',
       weight: 100,
       exportWeightExceeded: 0, inputWeightMismatch: undefined, timestamp: '2019-01-01T00:00:00.000Z',
       documentUrl: 'http://www.bob.com',
       authority: 'England',
       investigatedBy : 'Miss The Investigator',
       investigationStatus: InvestigationStatus.DataError,
       preApprovedBy: 'Bob'
     }
   ];

   const rawValidationResult = sdpsQuery([document],{'NE' : {} });
   const res = Report.sdpsBatchReport(rawValidationResult);
   expect(Array.from(res)).toEqual(expected);
 });

  it('can create a report on simple data with audit data', () => {
    const document: any = createDocument('12345',
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', species: 'cats', totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
        ],
        moment.utc('2019-01-01T00:00:00Z')
    );

    document.exportData.exporterDetails = { exporterCompanyName : 'the company' }
    document.investigation = {
      investigator: "Miss The Investigator",
      status: InvestigationStatus.DataError
    };
    document.audit = [
      {
        "eventType" : "VOIDED",
        "triggeredBy" : "Automated Tester MMO ECC Service Management",
        "timestamp" : new Date("2020-04-01T12:15:40.472Z"),
        "data" : null
      },
      {
        "eventType" : "INVESTIGATED",
        "triggeredBy" : "Automated Tester MMO ECC Service Management",
        "timestamp" : new Date("2020-04-02T09:30:51.947Z"),
        "data" : {
          "investigationStatus" : "MINOR_WRITTEN"
        }
      },
      {
        "eventType" : "VOIDED",
        "triggeredBy" : "Automated Tester MMO ECC Service Management",
        "timestamp" : new Date("2020-04-02T09:54:49.560Z"),
        "data" : null
      }
    ]

    const expected = [
      { productCommodityCode: 'N/A',
        documentNumber: '12345', documentStatus: 'COMPLETE',
        documentType: 'PS', exporter: 'the company',
        speciesCode: 'cats', speciesName: 'cats',
        weight: 100,
        exportWeightExceeded: 0, inputWeightMismatch: undefined, timestamp: '2019-01-01T00:00:00.000Z',
        documentUrl: 'http://www.bob.com',
        authority: 'England',
        investigatedBy : 'Miss The Investigator',
        investigationStatus: InvestigationStatus.DataError,
        voidedBy : "Automated Tester MMO ECC Service Management"
      }
    ];

    const rawValidationResult = sdpsQuery([document],{'NE' : {} });
    const res = Report.sdpsBatchReport(rawValidationResult);
    expect(Array.from(res)).toEqual(expected);
  });

  it('can create a report on more complete data', () => {
    const documents = [
      createDocument('12345',
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', species: 'cats', totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
          { catchCertificateNumber: 'FCC051', species: 'dogs', totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
          { catchCertificateNumber: 'FCC052', species: 'cats', totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
        ],
        moment.utc('2019-01-01T00:00:00Z')
      ),

      createDocument('22345',
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', species: 'cats', totalWeightLanded: 500, exportWeightBeforeProcessing: 500 },
          { catchCertificateNumber: 'FCC053', species: 'cats', totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
        ],
        moment.utc('2019-01-01T10:00:00Z')
      ),

      createDocument('32345',
        'storageDocument',
        [
          { certificateNumber: 'FCC051', product: 'cats', commodityCode: 'CC', weightOnCC: 999, productWeight: 0 }
        ],
        moment.utc('2019-01-01T12:00:00Z')
      ),

    ];

    const expected = [
      { productCommodityCode: 'N/A',
        documentNumber: '12345', documentStatus: 'COMPLETE',
        documentType: 'PS',
        speciesName: 'cats', speciesCode: 'cats', weight: 100, exportWeightExceeded: 100, inputWeightMismatch: undefined, timestamp: '2019-01-01T00:00:00.000Z',
        documentUrl: 'http://www.bob.com',
        authority: 'England' },
      { productCommodityCode: 'N/A',
        documentNumber: '12345', documentStatus: 'COMPLETE',
        documentType: 'PS',
        speciesName: 'dogs', speciesCode: 'dogs', weight: 100, exportWeightExceeded: 0, inputWeightMismatch: undefined, timestamp: '2019-01-01T00:00:00.000Z',
        documentUrl: 'http://www.bob.com',
        authority: 'England' },
      { productCommodityCode: 'N/A',
        documentNumber: '12345', documentStatus: 'COMPLETE',
        documentType: 'PS',
        speciesName: 'cats', speciesCode: 'cats', weight: 100, exportWeightExceeded: 0, inputWeightMismatch: undefined, timestamp: '2019-01-01T00:00:00.000Z',
        documentUrl: 'http://www.bob.com',
        authority: 'England' },
      { productCommodityCode: 'N/A',
        documentNumber: '22345', documentStatus: 'COMPLETE',
        documentType: 'PS',
        speciesName: 'cats', speciesCode: 'cats', weight: 500, exportWeightExceeded: 100, inputWeightMismatch: undefined, timestamp: '2019-01-01T10:00:00.000Z',
        documentUrl: 'http://www.bob.com',
        authority: 'England' },
      { productCommodityCode: 'N/A',
        documentNumber: '22345', documentStatus: 'COMPLETE',
        documentType: 'PS',
        speciesName: 'cats', speciesCode: 'cats', weight: 100, exportWeightExceeded: 0, inputWeightMismatch: undefined, timestamp: '2019-01-01T10:00:00.000Z',
        documentUrl: 'http://www.bob.com',
        authority: 'England' },
      { productCommodityCode: 'CC',
        documentNumber: '32345', documentStatus: 'COMPLETE',
        documentType: 'SD',
        speciesName: 'cats', speciesCode: 'cats', weight: 0, exportWeightExceeded: 100, inputWeightMismatch: 'fail', timestamp: '2019-01-01T12:00:00.000Z',
        documentUrl: 'http://www.bob.com',
        authority: 'England' }
    ];

    const rawValidationResult = sdpsQuery(documents,undefined);
    const res = Report.sdpsBatchReport(rawValidationResult);

    expect(Array.from(res)).toEqual(expected);
  });

  it('report will be filtered on an open range', () => {

    const documents = [
      createDocument('12345',
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', species: 'cats', totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
        ],
        moment.utc('2018-01-01T00:00:00Z')
      ),

      createDocument('22345',
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', species: 'cats', totalWeightLanded: 500, exportWeightBeforeProcessing: 500 },
        ],
        moment.utc('2019-01-01T00:00:00Z')
      )
    ];

    let res;

    const rawValidationResult =  sdpsQuery(documents,undefined);

    res = Array.from(Report.sdpsBatchReport(rawValidationResult));
    expect(res.length).toBe(2);

    res = Array.from(Report.sdpsBatchReport(sdpsQuery(documents,postCodeToDa), moment.utc('2019-01-01T00:00:00Z')));
    expect(res.length).toBe(1);
    expect(res[0].documentNumber).toBe('22345');

    res = Array.from(Report.sdpsBatchReport(sdpsQuery(documents,postCodeToDa), null, moment.utc('2018-12-31T00:00:00Z')));
    expect(res.length).toBe(1);

    // Boundary
    res = Array.from(Report.sdpsBatchReport(sdpsQuery(documents,postCodeToDa), null, moment.utc('2018-12-31T00:00:00Z')));
    expect(res.length).toBe(1);

    res = Array.from(Report.sdpsBatchReport(sdpsQuery(documents,postCodeToDa), null, moment.utc('2019-01-02T00:00:00Z')));
    expect(res.length).toBe(2);

    res = Array.from(Report.sdpsBatchReport(sdpsQuery(documents,postCodeToDa), moment.utc('2020-01-01T00:00:00Z')));
    expect(res.length).toBe(0);

    res = Array.from(Report.sdpsBatchReport(sdpsQuery(documents,postCodeToDa), null, moment.utc('2001-01-01T00:00:00Z')));
    expect(res.length).toBe(0);

  });

  it('report will be filtered on a closed range', () => {
    const documents = [
      createDocument('12345',
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', species: 'cats', totalWeightLanded: 500, exportWeightBeforeProcessing: 100 },
        ],
        moment.utc('2018-01-01T00:00:00Z')
      ),

      createDocument('22345',
        'processingStatement',
        [
          { catchCertificateNumber: 'FCC051', species: 'cats', totalWeightLanded: 500, exportWeightBeforeProcessing: 500 },
        ],
        moment.utc('2019-01-01T00:00:00Z')
      )
    ];

    let res;

    res = Array.from(Report.sdpsBatchReport(sdpsQuery(documents,undefined), moment.utc('2001-01-01T00:00:00Z'), moment.utc('2020-01-01')))
    expect(res.length).toBe(2);

    res = Array.from(Report.sdpsBatchReport(sdpsQuery(documents,undefined), moment.utc('2018-06-01'), moment.utc('2018-07-01')))
    expect(res.length).toBe(0);

    res = Array.from(Report.sdpsBatchReport(sdpsQuery(documents,undefined), moment.utc('2018-06-01'), moment.utc('2019-01-01')))
    expect(res.length).toBe(1);
  });
})
