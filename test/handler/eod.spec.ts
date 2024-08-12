import * as Hapi from '@hapi/hapi';
import * as EODService from '../../src/landings/persistence/eodSettings';
import * as SUT from '../../src/handler/eod';
import { IEodSetting, IEodAdminAudit } from '../../src/landings/types/appConfig/eodSettings';
import logger from '../../src/logger';


let server;

beforeAll(async () => {
  server = Hapi.server({
    port: 9012,
    host: 'localhost'
  });

  SUT.eodRoutes(server);

  await server.initialize();
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

let mockLoggerInfo;
let mockLoggerError;



describe('When getting all the EOD rules', () => {
  let mockGetEodSetting;


  beforeEach(() => {
    mockGetEodSetting = jest.spyOn(EODService, 'getEodSettings');
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    mockGetEodSetting.mockRestore();
    mockLoggerInfo.mockRestore();
    mockLoggerError.mockRestore();
  })

  const req = {
    method: 'GET',
    url: '/v1/eod/rules',
  };

  it('will return status code of 200 if eod rules found', async () => {
    const dataFromDb: IEodSetting[] = [
      {
        "da": "England",
        "vesselSizes": [
          'Under 10m',
          '10-12m'
        ]
      }
    ];

    const expectedResponse: IEodSetting[] = [{
      "da": "England",
      "vesselSizes": [
        'Under 10m',
        '10-12m'
      ]
    }];

    mockGetEodSetting.mockResolvedValue(dataFromDb);

    const response = await server.inject(req);


    expect(mockGetEodSetting).toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(response.payload).toBe(JSON.stringify(expectedResponse));
    expect(mockLoggerInfo).toHaveBeenCalledWith('[EOD][GET-EOD-RULES][SUCCESS]');
  });


  it('will return a status code of 500 if any errors that are thrown', async () => {
    mockGetEodSetting.mockRejectedValue('error');

    const response = await server.inject(req);

    expect(mockGetEodSetting).toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalledWith('[EOD][ADD-EOD-RULES][ERROR][error]');
    expect(response.statusCode).toBe(500);
  });
});

describe('When saving the EOD rules', () => {
  let mockPostEodSetting;

  beforeEach(() => {
    mockPostEodSetting = jest.spyOn(EODService, 'createEodRules');
    mockPostEodSetting.mockResolvedValue(null);
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    mockPostEodSetting.mockRestore();
    mockLoggerInfo.mockRestore();
    mockLoggerError.mockRestore();
  })

  const req = {
    method: 'POST',
    url: '/v1/eod/rules/add',
    payload: {
      user: 'Bob',
      da: "England",
      vesselSizes: [0.5, 0.9]
    }
  };

  it('will return status code of 200 if eod rules found', async () => {
    const response = await server.inject(req);
    expect(mockPostEodSetting).toHaveBeenCalledWith('Bob', 'England', [0.5, 0.9], undefined);
    expect(response.statusCode).toBe(200);
  });

  it('will return a status code of 500 if any errors that are thrown', async () => {
    mockPostEodSetting.mockRejectedValue('error');

    const response = await server.inject(req);

    expect(mockPostEodSetting).toHaveBeenCalled();
    expect(response.statusCode).toBe(500);
  });

  it('will return a status code of 400 if payload is missing', async () => {
    const request = {
      method: 'POST',
      url: '/v1/eod/rules/add',
      payload: {}
    };
    const response = await server.inject(request);

    expect(mockPostEodSetting).not.toHaveBeenCalled();

    expect(response.statusCode).toBe(400);
  });
});

describe('When getting audit for EOD rules', () => {
  let mockGetAudits;

  const audits: IEodAdminAudit[] = [
    {
      date: '19-04-2023',
      time: '11:31:23 pm',
      user: 'Bob',
      rule: 'dataEverExpected',
      da: 'England',
      vesselSizes: ''
    },
    {
      date: '20-04-2023',
      time: '07:21:46 am',
      user: 'Automated Tester MMO ECC Service Management',
      rule: 'dataEverExpected',
      da: 'England',
      vesselSizes: '10-12m,12m+'
    },
    {
      date: '20-04-2023',
      time: '09:05:36 am',
      user: 'Automated Tester MMO ECC Service Management',
      rule: 'dataEverExpected',
      da: 'England',
      vesselSizes: 'Under 10m,10-12m,12m+'
    },
    {
      date: '20-04-2023',
      time: '06:32:29 am',
      user: 'Bob',
      rule: 'dataEverExpected',
      da: 'Guernsey',
      vesselSizes: 'Under 10m'
    },
    {
      date: '20-04-2023',
      time: '06:33:30 am',
      user: 'Isaac',
      rule: 'dataEverExpected',
      da: 'Guernsey',
      vesselSizes: 'Under 10m,10-12m'
    }
  ];

  beforeEach(() => {
    mockGetAudits = jest.spyOn(EODService, 'getEodAudits');
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    mockGetAudits.mockRestore();
    mockLoggerInfo.mockRestore();
    mockLoggerError.mockRestore();
  })

  const req = {
    method: 'GET',
    url: '/v1/eod/audit'
  };

  it('will return status code of 200', async () => {
    mockGetAudits.mockResolvedValue(audits);

    const response = await server.inject(req);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[EOD][GET-EOD-AUDITS][SUCCESS]');
    expect(mockGetAudits).toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(response.payload).toEqual(JSON.stringify(audits));
  });

  it('will return a status code of 500 if any errors that are thrown', async () => {
    mockGetAudits.mockRejectedValue('error');

    const response = await server.inject(req);

    expect(mockLoggerError).toHaveBeenCalledWith('[EOD][ADD-EOD-AUDITS][ERROR][error]');
    expect(mockGetAudits).toHaveBeenCalled();
    expect(response.statusCode).toBe(500);
  });
});