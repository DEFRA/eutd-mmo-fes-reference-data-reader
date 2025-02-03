import * as report from '../../src/landings/orchestration/batchReport';
import { validationReportsRoutes } from '../../src/handler/validationReports';
import * as Hapi from '@hapi/hapi';

const moment = require('moment');
moment.suppressDeprecationWarnings = true;


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

  let catchCertMock: jest.SpyInstance;
  let catchCertVoidMock: jest.SpyInstance;
  let catchCertBlockMock: jest.SpyInstance;


  beforeEach(() => {
    catchCertMock = jest.spyOn(report, 'catchCertReport');
    catchCertVoidMock = jest.spyOn(report, 'catchCertVoidReport');
    catchCertBlockMock = jest.spyOn(report,'catchCertBlockedReport');
  });

  afterEach(() => {
    catchCertMock.mockRestore();
    catchCertVoidMock.mockRestore();
    catchCertBlockMock.mockRestore();
  })

  it('will disregard any `nulls` and set them as a white space', async () => {

    catchCertVoidMock.mockResolvedValue([]);
    catchCertBlockMock.mockResolvedValue([]);
    catchCertMock.mockResolvedValue([{column1: null, column2: 'value2'}]);

    const req = {
        method: 'GET',
        url: '/v1/validationreports/catchcert.json?fromdate=20190101&todate=20190201'
      };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

    expect(JSON.parse(response.payload)).toEqual(JSON.parse(`[{"column1":"","column2":"value2"}]`));


  });

  it('will disregard any `undefineds` and set them as a white space', async () => {

    catchCertVoidMock.mockResolvedValue([]);
    catchCertBlockMock.mockResolvedValue([]);
    catchCertMock.mockResolvedValue([{column1: undefined, column2: 'value2'}]);

    const req ={
        method: 'GET',
        url: '/v1/validationreports/catchcert.json?fromdate=20190101&todate=20190201'
      };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

    expect(JSON.parse(response.payload)).toEqual(JSON.parse(`[{"column1":"","column2":"value2"}]`));


  });

  it('can get data in CSV format', async () => {

    catchCertVoidMock.mockResolvedValue([]);

    catchCertBlockMock.mockResolvedValue([]);

    catchCertMock.mockResolvedValue([{column1: 'value1', column2: 'value2'}]);

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

    catchCertVoidMock.mockResolvedValue([]);

    catchCertBlockMock.mockResolvedValue([]);

    catchCertMock.mockResolvedValue([{column1: 'value1'}]);

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

    catchCertVoidMock.mockResolvedValue([]);

    catchCertBlockMock.mockResolvedValue([]);

    catchCertMock.mockResolvedValue([{column1: 'value1'}]);

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

    catchCertMock.mockResolvedValue([]);

    catchCertBlockMock.mockResolvedValue([]);

    catchCertVoidMock.mockResolvedValue([{column1: 'value1'}]);

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

    catchCertVoidMock.mockResolvedValue([]);

    catchCertBlockMock.mockResolvedValue([]);

    catchCertMock.mockResolvedValue([{column1: 'value'}]);

    const req ={
      method: 'GET',
      url: '/v1/validationreports/catchcert.json?fromdate=2019-01-01&todate=2019-01-01'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

    expect(catchCertMock.mock.calls[0][0].toISOString()).toEqual('2019-01-01T00:00:00.000Z');
    expect(catchCertMock.mock.calls[0][1].toISOString()).toEqual('2019-01-01T23:59:59.999Z');



  });
});


describe("When generating a SDPS Report", () => {

  let sdpsMock: jest.SpyInstance;
  let sdpsVoidMock: jest.SpyInstance;
  let sdpsBlockMock: jest.SpyInstance;

  beforeEach(() => {
    sdpsMock = jest.spyOn(report, 'sdpsReport');
    sdpsVoidMock = jest.spyOn(report, 'sdpsVoidReport');
    sdpsBlockMock = jest.spyOn(report,'sdpsBlockedReport');
  });

  afterEach(() => {
    sdpsMock.mockRestore();
    sdpsVoidMock.mockRestore();
    sdpsBlockMock.mockRestore();
  })

  it('will disregard any `nulls` and set them as a white space', async () => {

    sdpsVoidMock.mockResolvedValue([]);

    sdpsBlockMock.mockResolvedValue([]);

    sdpsMock.mockResolvedValue([{column1: null, column2: 'value2'}]);

    const req ={
        method: 'GET',
        url: '/v1/validationreports/sdps.json?fromdate=20190101&todate=20190201'
      };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

    expect(JSON.parse(response.payload)).toEqual(JSON.parse(`[{"column1":"","column2":"value2"}]`));


  });

  it('can get data in JSON format', async () => {

    sdpsVoidMock.mockResolvedValue([]);

    sdpsBlockMock.mockResolvedValue([]);

    sdpsMock.mockResolvedValue([{column1: 'value1'}]);

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

    sdpsVoidMock.mockResolvedValue([]);

    sdpsBlockMock.mockResolvedValue([]);

    sdpsMock.mockResolvedValue([{column1: 'value'}]);

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdps.json?fromdate=2019-01-01&todate=2019-01-01'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

    expect(sdpsMock.mock.calls[0][0].toISOString()).toEqual('2019-01-01T00:00:00.000Z');
    expect(sdpsMock.mock.calls[0][1].toISOString()).toEqual('2019-01-01T23:59:59.999Z');



  });

  it('will 400 on bad missing parameters', async () => {

    sdpsVoidMock.mockResolvedValue([]);

    sdpsBlockMock.mockResolvedValue([]);

    sdpsMock.mockResolvedValue([{column1: 'value'}]);

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdps.json'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(400);



  });

  it('can get data for void report', async () => {

    sdpsMock.mockResolvedValue([]);
    sdpsBlockMock.mockResolvedValue([]);

    sdpsVoidMock.mockResolvedValue([{column1: 'value'}]);

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdps.json?fromdate=2019-01-01&todate=2019-01-01'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);


    // did call 'void' report
    expect(sdpsVoidMock.mock.calls.length).toEqual(1);



  })

});


describe("When generating a Catch Certificate Investigation Report", () => {

  let catchCertInvestigationMock: jest.SpyInstance;
  let catchCertVoidInvestigationMock: jest.SpyInstance;
  let catchCertBlockInvestigationMock: jest.SpyInstance;

  beforeEach(() => {
    catchCertInvestigationMock = jest.spyOn(report, 'catchCertInvestigationReport');
    catchCertVoidInvestigationMock = jest.spyOn(report, 'catchCertVoidInvestigationReport');
    catchCertBlockInvestigationMock = jest.spyOn(report,'catchCertBlockedInvestigationReport');
  });

  afterEach(() => {
    catchCertInvestigationMock.mockRestore();
    catchCertVoidInvestigationMock.mockRestore();
    catchCertBlockInvestigationMock.mockRestore();
  })

  it('an investigation report with no data', async () => {

    catchCertInvestigationMock.mockResolvedValue([])

    catchCertVoidInvestigationMock.mockResolvedValue([])
    catchCertBlockInvestigationMock.mockResolvedValue([])

    const req ={
      method: 'GET',
      url: '/v1/validationreports/catchcertinvestigation.json?fromdate=2019-01-01&todate=2020-01-01&exporter=BOB'
    };
    const response = await server.inject(req);
    expect(response.statusCode).toBe(204);



  })

  it('an investigation report with data', async () => {

    catchCertInvestigationMock.mockResolvedValue([{bob: 1}])

    catchCertVoidInvestigationMock.mockResolvedValue([{bob: 2}])

    catchCertBlockInvestigationMock.mockResolvedValue([{bob: 3}])

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
  let sdpsInvestigationMock: jest.SpyInstance;
  let sdpsVoidInvestigationMock: jest.SpyInstance;
  let sdpsBlockInvestigationMock: jest.SpyInstance;

  beforeEach(() => {
    sdpsInvestigationMock = jest.spyOn(report, 'sdpsInvestigationReport');
    sdpsVoidInvestigationMock = jest.spyOn(report, 'sdpsVoidInvestigationReport');
    sdpsBlockInvestigationMock = jest.spyOn(report,'sdpsBlockedInvestigationReport');
  })

  afterEach(() => {
    sdpsInvestigationMock.mockRestore();
    sdpsVoidInvestigationMock.mockRestore();
    sdpsBlockInvestigationMock.mockRestore();
  })

  it('an investigation report with no data', async () => {

    sdpsInvestigationMock.mockResolvedValue([])

    sdpsVoidInvestigationMock.mockResolvedValue([])

    sdpsBlockInvestigationMock.mockResolvedValue([])

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdpsinvestigation.json?fromdate=2019-01-01&todate=2020-01-01&exporter=BOB'
    };
    const response = await server.inject(req);
    expect(response.statusCode).toBe(204);



  })

  it('an investigation report with data', async () => {

    sdpsInvestigationMock.mockResolvedValue([{bob: 1}])

    sdpsVoidInvestigationMock.mockResolvedValue([{bob: 2}])

    sdpsBlockInvestigationMock.mockResolvedValue([{bob: 3}])

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

  let sdpsMock: jest.SpyInstance;
  let sdpsVoidMock: jest.SpyInstance;
  let sdpsBlockMock: jest.SpyInstance;

  beforeEach(() => {
    sdpsMock = jest.spyOn(report, 'sdpsReport');
    sdpsVoidMock = jest.spyOn(report, 'sdpsVoidReport');
    sdpsBlockMock = jest.spyOn(report, 'sdpsBlockedReport');
  })

  afterEach(() => {
    sdpsMock.mockRestore();
    sdpsVoidMock.mockRestore();
    sdpsBlockMock.mockRestore();
  })

  it('invalid report type', async () => {

    const req ={
      method: 'GET',
      url: '/v1/validationreports/mrbobreport.json?fromdate=2019-01-01&todate=2019-01-01'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(404);


  });

  it('asofdate parameter happy path', async () => {

    sdpsVoidMock.mockResolvedValue([]);

    sdpsBlockMock.mockResolvedValue([]);

    sdpsMock.mockResolvedValue([{column1: 'value'}]);

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdps.json?fromdate=2019-01-01&todate=2019-01-01&asofdate=2019-01-01'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);


  });

  it('asofdate parameter sad path', async () => {

    sdpsMock.mockResolvedValue([{column1: 'value'}]);

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdps.json?fromdate=2019-01-01&todate=2019-01-01&asofdate=baddate'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(400);


  });

  it('area parameter happy path', async () => {
    sdpsVoidMock.mockResolvedValue([]);

    sdpsBlockMock.mockResolvedValue([]);

    sdpsMock.mockResolvedValue([{column1: 'value'}]);

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
    sdpsVoidMock.mockResolvedValue([]);

    sdpsMock.mockResolvedValue([]);

    sdpsBlockMock.mockResolvedValue([]);

    const req ={
      method: 'GET',
      url: '/v1/validationreports/sdps.json?fromdate=2019-01-01&todate=2019-01-01'
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(204);

  });

  it('500 on unexpected error', async () => {
    sdpsMock.mockImplementationOnce(() => {
      throw new Error();
    })

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
