import * as CcReporting from '../../src/landings/orchestration/ccOnlineReport'
import * as SdpsReporting from "../../src/landings/orchestration/sdpsOnlineReport";
import { IOnlineValidationReportItem,
  ValidationRules,
  IForeignCatchCertificateValidationResult } from '../../src/landings/types/onlineValidationReport'
import moment = require('moment');
import { onlineValidationRoutes } from '../../src/handler/onlineValidation';
import * as Hapi from '@hapi/hapi';

const sinon = require('sinon');
const ccReportingMock = sinon.stub(CcReporting, 'generateOnlineValidationReport');
const sdpsReportingMock = sinon.stub(SdpsReporting, 'generateForeignCatchCertOnlineValidationReport');

let server;

beforeAll(async () => {
  server = Hapi.server({
    port: 9014,
    host: 'localhost'
  });

  onlineValidationRoutes(server);

  await server.initialize();
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

describe('When getting a catch certificate', () => {

  it('will return a 200 if the payload has a "dataToValidate" property', async () => {
    const date = "2019-11-25T00:00:00.000Z";

    const onlineReportResponse : IOnlineValidationReportItem[] = [
      {
        species: 'LBE',
        presentation: 'FIS',
        state: 'BAD',
        failures: [ValidationRules.THREE_D],
        vessel: "MR BOB",
        date: moment.utc(date).toDate()
      }
    ];

    const req = {
        method: 'POST',
        url: '/v1/catchcertificates/validation/online',
        payload: {
          dataToValidate: { a: 'catchCertificate' }
        }
    };

    ccReportingMock.reset();
    ccReportingMock.returns(onlineReportResponse);

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);
    expect(response.payload).toBe(`[{"species":"LBE","presentation":"FIS","state":"BAD","failures":["3D"],"vessel":"MR BOB","date":"${date}"}]`);

  });

  it('will return a 400 if the payload doesnt have a "dataToValidate" property', async () => {

    const req = {
        method: 'POST',
        url: '/v1/catchcertificates/validation/online',
        payload: {}
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(400);

  });

  it('will return a 400 if there is no payload', async () => {

    const req = {
        method: 'POST',
        url: '/v1/catchcertificates/validation/online'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(400);

  });

  it('will return a 400 if the payload is the wrong datatype', async () => {

    const req = {
        method: 'POST',
        url: '/v1/catchcertificates/validation/online',
        payload: []
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(400);

  });

  it('will return a 500 if an unexpected error occurs in the report generation', async () => {

    ccReportingMock.reset();
    ccReportingMock.throws();

    const req = {
        method: 'POST',
        url: '/v1/catchcertificates/validation/online',
        payload: { dataToValidate: { a: 'catchCertificate' }}
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(500);

  })
});

describe('When getting a storage document/ processing statement', () => {

  it('will return a 200 if the payload has an "dataToValidate" property', async () => {

    const onlineReportResponse : IForeignCatchCertificateValidationResult[] = [{
      isValid: false,
      details:[ { certificateNumber: 'GBR-2019-SD-DED9F3FE6', product: 'Atlantic herring (HER)' } ],
      rawData: [{
        documentNumber : 'PS Id',
        status : 'a status',
        documentType : 'PS',
        createdAt : 'a date',
        da : 'UK',
        species : 'a species',
        commodityCode : 'species code',
        weightOnAllDocs : 100,
        weightOnDoc : 90,
        weightOnFCC : 80,
        isOverAllocated: false,
        overUsedInfo: [],
        overAllocatedByWeight : 0,
        isMismatch : false,
        extended : {
          id: 'GBR-2019-SD-DED9F3FE6-1610018839'
        }
      }]
    }];


    const req = {
        method: 'POST',
        url: '/v1/sdps/validation/online',
        payload: {
            dataToValidate: { a: 'catchCertificate' }
        }
    };

    sdpsReportingMock.reset();
    sdpsReportingMock.returns(onlineReportResponse);

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);
    expect(response.payload).toBe(JSON.stringify(onlineReportResponse));
  });

  it('will return a 400 if there is no payload', async () => {

    const req = {
        method: 'POST',
        url: '/v1/sdps/validation/online'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(400);

  });

  it('will return a 400 if there is no "dataToValidate" property', async () => {

    const req = {
        method: 'POST',
        url: '/v1/sdps/validation/online',
        payload: {}
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(400);

  });

  it('will return a 500 if an unexpected error occurs in the report generation', async () => {

    sdpsReportingMock.reset();
    sdpsReportingMock.throws();

    const req = {
        method: 'POST',
        url: '/v1/sdps/validation/online',
        payload: { dataToValidate: { a: 'catchCertificate' } }
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(500);
  })
});