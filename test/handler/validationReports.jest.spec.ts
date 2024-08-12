import * as report from '../../src/landings/orchestration/batchReport';
import { validationReportsRoutes } from '../../src/handler/validationReports';
import * as Hapi from '@hapi/hapi';

const moment = require('moment');
moment.suppressDeprecationWarnings = true;

const sinon = require('sinon');

const catchCertMock = sinon.stub(report, 'catchCertReport');
const catchCertVoidMock = sinon.stub(report, 'catchCertVoidReport');
const catchCertBlockMock = sinon.stub(report,'catchCertBlockedReport');
const sdpsMock = sinon.stub(report, 'sdpsReport');
const sdpsVoidMock = sinon.stub(report, 'sdpsVoidReport');
const sdpsBlockMock = sinon.stub(report,'sdpsBlockedReport')

const catchCertInvestigationMock = sinon.stub(report, 'catchCertInvestigationReport');
const catchCertVoidInvestigationMock = sinon.stub(report, 'catchCertVoidInvestigationReport');
const catchCertBlockInvestigationMock = sinon.stub(report,'catchCertBlockedInvestigationReport');
const sdpsInvestigationMock = sinon.stub(report, 'sdpsInvestigationReport');
const sdpsVoidInvestigationMock = sinon.stub(report, 'sdpsVoidInvestigationReport');
const sdpsBlockInvestigationMock = sinon.stub(report,'sdpsBlockedInvestigationReport')

let server;

beforeAll(async () => {
  server = Hapi.server({
    port: 9017,
    host: 'localhost'
  });

  validationReportsRoutes(server);

  await server.initialize();
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

describe("When generating a Catch Certificate Report", () => {

  it('will disregard any `nulls` and set them as a white space', async () => {

    catchCertMock.reset();
    catchCertVoidMock.reset();
    catchCertVoidMock.returns([]);
    catchCertBlockMock.reset();
    catchCertBlockMock.returns([]);
    catchCertMock.returns([{column1: null, column2: 'value2'}]);

    const req = {
        method: 'GET',
        url: '/v1/validationreports/catchcert.json?fromdate=20190101&todate=20190201'
      };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

    expect(JSON.parse(response.payload)).toEqual(JSON.parse(`[{"column1":"","column2":"value2"}]`));


  });

  it('will disregard any `undefineds` and set them as a white space', async () => {

    catchCertMock.reset();
    catchCertVoidMock.reset();
    catchCertVoidMock.returns([]);
    catchCertBlockMock.reset();
    catchCertBlockMock.returns([]);
    catchCertMock.returns([{column1: undefined, column2: 'value2'}]);

    const req ={
        method: 'GET',
        url: '/v1/validationreports/catchcert.json?fromdate=20190101&todate=20190201'
      };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

    expect(JSON.parse(response.payload)).toEqual(JSON.parse(`[{"column1":"","column2":"value2"}]`));


  });


  it('can get data in CSV format', async () => {

    catchCertMock.reset();
    catchCertVoidMock.reset();
    catchCertVoidMock.returns([]);
    catchCertBlockMock.reset();
    catchCertBlockMock.returns([]);
    catchCertMock.returns([{column1: 'value1', column2: 'value2'}]);

    const req ={
        method: 'GET',
        url: '/v1/validationreports/catchcert.csv?fromdate=20190101&todate=20190201'
      };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

    expect(response.payload).toEqual(`"column1","column2"
"value1","value2"`);



  });

  it('can get data in JSON format', async () => {

    catchCertMock.reset();
    catchCertVoidMock.reset();
    catchCertVoidMock.returns([]);
    catchCertBlockMock.reset();
    catchCertBlockMock.returns([]);
    catchCertMock.returns([{column1: 'value1'}]);

    const req ={
        method: 'GET',
        url: '/v1/validationreports/catchcert.json?fromdate=20190101&todate=20190201'
      };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

    const payload = JSON.parse(response.payload);

    expect(payload).toEqual([{column1: 'value1'}]);



  });

  it('will normalise case in url path', async () => {

    catchCertMock.reset();
    catchCertVoidMock.reset();
    catchCertVoidMock.returns([]);
    catchCertBlockMock.reset();
    catchCertBlockMock.returns([]);
    catchCertMock.returns([{column1: 'value1'}]);

    const req ={
        method: 'GET',
        url: '/v1/validationreports/CatchCert.json?fromdate=20190101&todate=20190201'
      };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

    const payload = JSON.parse(response.payload);

    expect(payload).toEqual([{column1: 'value1'}]);



  });

  it('can get data for void report', async () => {

    catchCertMock.reset();
    catchCertMock.returns([]);
    catchCertVoidMock.reset();
    catchCertBlockMock.reset();
    catchCertBlockMock.returns([]);
    catchCertVoidMock.returns([{column1: 'value1'}]);

    const req ={
        method: 'GET',
        url: '/v1/validationreports/catchcert.json?fromdate=20190101&todate=20190201'
      };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

    const payload = JSON.parse(response.payload);

    expect(payload).toEqual([{column1: 'value1'}]);



  });

  it('will set timestamp bounds correctly on date inputs: FI0-381', async () => {

    catchCertMock.reset();
    catchCertVoidMock.reset();
    catchCertVoidMock.returns([]);
    catchCertBlockMock.reset();
    catchCertBlockMock.returns([]);
    catchCertMock.returns([{column1: 'value'}]);

    const req ={
      method: 'GET',
      url: '/v1/validationreports/catchcert.json?fromdate=2019-01-01&todate=2019-01-01'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

    expect(catchCertMock.args[0][0].toISOString()).toEqual('2019-01-01T00:00:00.000Z');
    expect(catchCertMock.args[0][1].toISOString()).toEqual('2019-01-01T23:59:59.999Z');



  });
});


describe("When generating a SDPS Report", () => {

  it('will disregard any `nulls` and set them as a white space', async () => {
    sdpsMock.reset();
    sdpsVoidMock.returns([]);
    sdpsBlockMock.reset();
    sdpsBlockMock.returns([]);
    sdpsMock.returns([{column1: null, column2: 'value2'}]);

    const req ={
        method: 'GET',
        url: '/v1/validationreports/sdps.json?fromdate=20190101&todate=20190201'
      };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

    expect(JSON.parse(response.payload)).toEqual(JSON.parse(`[{"column1":"","column2":"value2"}]`));


  });

  it('can get data in JSON format', async () => {

    sdpsMock.reset();
    sdpsVoidMock.reset();
    sdpsVoidMock.returns([]);
    sdpsBlockMock.reset();
    sdpsBlockMock.returns([]);
    sdpsMock.returns([{column1: 'value1'}]);

    const req ={
        method: 'GET',
        url: '/v1/validationreports/sdps.json?fromdate=20190101&todate=20190201'
      };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

    const payload = JSON.parse(response.payload);

    expect(payload).toEqual([{column1: 'value1'}]);



  });

  it('will set timestamp bounds correctly on date inputs', async () => {

    sdpsMock.reset();
    sdpsVoidMock.reset();
    sdpsVoidMock.returns([]);
    sdpsBlockMock.reset();
    sdpsBlockMock.returns([]);
    sdpsMock.returns([{column1: 'value'}]);

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdps.json?fromdate=2019-01-01&todate=2019-01-01'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

    expect(sdpsMock.args[0][0].toISOString()).toEqual('2019-01-01T00:00:00.000Z');
    expect(sdpsMock.args[0][1].toISOString()).toEqual('2019-01-01T23:59:59.999Z');



  });

  it('will 400 on bad missing parameters', async () => {

    sdpsMock.reset();
    sdpsVoidMock.reset();
    sdpsVoidMock.returns([]);
    sdpsBlockMock.reset();
    sdpsBlockMock.returns([]);
    sdpsMock.returns([{column1: 'value'}]);

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdps.json'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(400);



  });

  it('can get data for void report', async () => {

    sdpsMock.reset();
    sdpsMock.returns([]);
    sdpsVoidMock.reset();
    sdpsBlockMock.reset();
    sdpsBlockMock.returns([]);
    sdpsVoidMock.returns([{column1: 'value'}]);

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdps.json?fromdate=2019-01-01&todate=2019-01-01'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);


    // did call 'void' report
    expect(sdpsVoidMock.args.length).toEqual(1);



  })

});


describe("When generating a Catch Certificate Investigation Report", () => {

  it('an investigation report with no data', async () => {

    catchCertInvestigationMock.reset();
    catchCertInvestigationMock.returns([])
    catchCertVoidInvestigationMock.reset();
    catchCertVoidInvestigationMock.returns([])
    catchCertBlockInvestigationMock.reset();
    catchCertBlockInvestigationMock.returns([])

    const req ={
      method: 'GET',
      url: '/v1/validationreports/catchcertinvestigation.json?fromdate=2019-01-01&todate=2020-01-01&exporter=BOB'
    };
    const response = await server.inject(req);
    expect(response.statusCode).toBe(204);



  })

  it('an investigation report with data', async () => {

    catchCertInvestigationMock.reset();
    catchCertInvestigationMock.returns([{bob: 1}])
    catchCertVoidInvestigationMock.reset();
    catchCertVoidInvestigationMock.returns([{bob: 2}])
    catchCertBlockInvestigationMock.reset();
    catchCertBlockInvestigationMock.returns([{bob: 3}])

    const req ={
      method: 'GET',
      url: '/v1/validationreports/catchcertinvestigation.json?fromdate=2019-01-01&todate=2020-01-01&exporter=BOB'
    };
    const response = await server.inject(req);
    expect(response.statusCode).toBe(200);

    expect(JSON.parse(response.payload)).toEqual(JSON.parse(`[{"bob":1},{"bob":2},{"bob":3}]`));



  })


})

describe("When generating a SDPS Investigation Report", () => {
  it('an investigation report with no data', async () => {

    sdpsInvestigationMock.reset();
    sdpsInvestigationMock.returns([])
    sdpsVoidInvestigationMock.reset();
    sdpsVoidInvestigationMock.returns([])
    sdpsBlockInvestigationMock.reset();
    sdpsBlockInvestigationMock.returns([])

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdpsinvestigation.json?fromdate=2019-01-01&todate=2020-01-01&exporter=BOB'
    };
    const response = await server.inject(req);
    expect(response.statusCode).toBe(204);



  })

  it('an investigation report with data', async () => {

    sdpsInvestigationMock.reset();
    sdpsInvestigationMock.returns([{bob: 1}])
    sdpsVoidInvestigationMock.reset();
    sdpsVoidInvestigationMock.returns([{bob: 2}])
    sdpsBlockInvestigationMock.reset();
    sdpsBlockInvestigationMock.returns([{bob: 3}])

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdpsinvestigation.json?fromdate=2019-01-01&todate=2020-01-01&exporter=BOB'
    };
    const response = await server.inject(req);
    expect(response.statusCode).toBe(200);

    expect(JSON.parse(response.payload)).toEqual(JSON.parse(`[{"bob":1},{"bob":2},{"bob":3}]`));



  })

})


describe("various other edgecase paths", () => {

  it('invalid report type', async () => {

    const req ={
      method: 'GET',
      url: '/v1/validationreports/mrbobreport.json?fromdate=2019-01-01&todate=2019-01-01'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(404);


  });

  it('asofdate parameter happy path', async () => {

    sdpsMock.reset();
    sdpsVoidMock.returns([]);
    sdpsBlockMock.reset();
    sdpsBlockMock.returns([]);
    sdpsMock.returns([{column1: 'value'}]);

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdps.json?fromdate=2019-01-01&todate=2019-01-01&asofdate=2019-01-01'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);


  });

  it('asofdate parameter sad path', async () => {

    sdpsMock.reset();
    sdpsMock.returns([{column1: 'value'}]);

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdps.json?fromdate=2019-01-01&todate=2019-01-01&asofdate=baddate'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(400);


  });

  it('area parameter happy path', async () => {
    sdpsMock.reset();
    sdpsVoidMock.reset();
    sdpsVoidMock.returns([]);
    sdpsBlockMock.reset();
    sdpsBlockMock.returns([]);
    sdpsMock.returns([{column1: 'value'}]);

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdps.json?fromdate=2019-01-01&todate=2019-01-01&area=England,Wales'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

  });

  it('area parameter sad path', async () => {

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdps.json?fromdate=2019-01-01&todate=2019-01-01&area=Jersey,India'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(400);

  });

  it('invalid dates', async () => {

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdps.json?fromdate=baddate&todate=2019-01-01'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(400);

  });


  it('empty report will return no data', async () => {
    sdpsMock.reset();
    sdpsVoidMock.reset();
    sdpsVoidMock.returns([]);
    sdpsMock.returns([]);
    sdpsBlockMock.reset();
    sdpsBlockMock.returns([]);

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdps.json?fromdate=2019-01-01&todate=2019-01-01'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(204);

  });

  it('500 on unexpected error', async () => {
    sdpsMock.reset();
    sdpsMock.throws();

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdps.json?fromdate=2019-01-01&todate=2019-01-01'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(500);

  })

  it('catch cert investigation missing params', async () => {

    const req ={
      method: 'GET',
      url: '/v1/validationreports/catchcertinvestigation.json?fromdate=2019-01-01&todate=2020-01-01'
    };
    const response = await server.inject(req);
    expect(response.statusCode).toBe(400);



  })

  it('sdps investigation missing params', async () => {

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdpsinvestigation.json?fromdate=2019-01-01&todate=2020-01-01'
    };
    const response = await server.inject(req);
    expect(response.statusCode).toBe(400);



  })

  it('incorrect file type', async () => {

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdpsinvestigation.bob?fromdate=2019-01-01&todate=2020-01-01'
    };
    const response = await server.inject(req);
    expect(response.statusCode).toBe(404);



  })

});
