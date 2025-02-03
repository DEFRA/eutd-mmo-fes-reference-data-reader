import * as cache from '../../src/data/cache';
import * as landingsRefresh from '../../src/landings/orchestration/landingsRefresh';
import * as eodSettings from '../../src/landings/persistence/eodSettings';
import * as Hapi from '@hapi/hapi';
import { generateIndex } from 'mmo-shared-reference-data';
import { landingQueueRoutes } from '../../src/handler/landingQueue';

import logger from '../../src/logger';

let server;
let dataMock: jest.SpyInstance;
let idxMock: jest.SpyInstance;
let getDataEverExpected: jest.SpyInstance;
let isLandingDataAvailable: jest.SpyInstance;
let fetchLandingsMock: jest.SpyInstance;
let fetchSalesNoteMock: jest.SpyInstance;
let loggerMock: jest.SpyInstance;
let loggerErrorMock: jest.SpyInstance;

beforeAll(async () => {
  server = Hapi.server({
    port: 9013,
    host: 'localhost'
  });

  landingQueueRoutes(server);

  await server.initialize();
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

beforeEach(() => {
  dataMock = jest.spyOn(cache, 'getVesselsData')
  idxMock = jest.spyOn(cache, 'getVesselsIdx')
  getDataEverExpected = jest.spyOn(cache, 'getDataEverExpected')
  isLandingDataAvailable = jest.spyOn(eodSettings, 'isLandingDataAvailable')
  fetchLandingsMock = jest.spyOn(landingsRefresh, 'fetchLandings')
  fetchSalesNoteMock = jest.spyOn(landingsRefresh, 'fetchSalesNote');
  loggerMock = jest.spyOn(logger, 'info');
  loggerErrorMock = jest.spyOn(logger, 'error');

  fetchLandingsMock.mockResolvedValue([]);
  fetchSalesNoteMock.mockResolvedValue(undefined);
  getDataEverExpected.mockReturnValue(true);
  isLandingDataAvailable.mockResolvedValue(true);
  dataMock.mockReturnValue(
    [{
      registrationNumber: "B13508",
      fishingLicenceValidTo: "2020-12-20T00:00:00",
      fishingLicenceValidFrom: "2010-12-29T00:00:00",
      vesselLength: 10.75
    }]);

  const vesselsIdx = generateIndex(
    [{
      registrationNumber: "B13508",
      fishingLicenceValidTo: "2020-12-20T00:00:00",
      fishingLicenceValidFrom: "2010-12-29T00:00:00",
      rssNumber: "test",
      cfr: "GBRtest",
      vesselLength: 10.75
    }]);

  idxMock.mockReturnValue(vesselsIdx)
})

afterEach(() => {
  loggerMock.mockReset();
  fetchLandingsMock.mockReset();
  fetchSalesNoteMock.mockReset();
  getDataEverExpected.mockReset();
  isLandingDataAvailable.mockReset();
  loggerErrorMock.mockReset();
})

describe("Refreshing landings", () => {

  it('will fail if there is no payload', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue'
    };

    const response = await server.inject(req);

    expect(fetchLandingsMock).not.toHaveBeenCalled();
    expect(fetchSalesNoteMock).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
  });

  it('will fail if pln is missing', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ dateLanded: '2019-09-05' })
    };

    const response = await server.inject(req);

    expect(fetchLandingsMock).not.toHaveBeenCalled();
    expect(fetchSalesNoteMock).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
  });

  it('will fail if dateLanded is missing', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'test' })
    };

    const response = await server.inject(req);

    expect(fetchLandingsMock).not.toHaveBeenCalled();
    expect(fetchSalesNoteMock).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
  });

  it('will fail if date landed is wrong', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'B13509', dateLanded: 'test' })
    };

    const response = await server.inject(req);

    expect(fetchLandingsMock).not.toHaveBeenCalled();
    expect(fetchSalesNoteMock).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
  });

  it('will fail if date landed is of the incorrect length', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'B13509', dateLanded: '2019-02-3' })
    };

    const response = await server.inject(req);

    expect(fetchLandingsMock).not.toHaveBeenCalled();
    expect(fetchSalesNoteMock).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
  });

  it('will fail if date landed is invalid', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'B13509', dateLanded: '2019-02-31' })
    };

    const response = await server.inject(req);

    expect(fetchLandingsMock).not.toHaveBeenCalled();
    expect(fetchSalesNoteMock).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
  });

  it('will log date landed, pln and isLegallyDue position', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'B13509', dateLanded: '2019-02-31', isLegallyDue: true })
    };

    await server.inject(req);

    expect(fetchLandingsMock).not.toHaveBeenCalled();
    expect(loggerMock).toHaveBeenNthCalledWith(1, "[POST /landings/queue]");
    expect(loggerMock).toHaveBeenNthCalledWith(2, "[POST /landings/queue][PLN: B13509][DATE-LANDED: 2019-02-31][LEGALLY-DUE: true]");
  });

  it('will fail if we cant find rssNumber', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'B13509', dateLanded: '2019-09-05' })
    };

    const response = await server.inject(req);

    expect(fetchLandingsMock).not.toHaveBeenCalled();
    expect(fetchSalesNoteMock).not.toHaveBeenCalled();
    expect(loggerMock).toHaveBeenNthCalledWith(4, "[POST /landings/queue]licence not found for [B13509][2019-09-05]");
    expect(response.statusCode).toBe(400);
  });

  it('will succeed with 202 when calling POST', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'B13508', dateLanded: '2019-09-05' })
    };

    const response = await server.inject(req);

    expect(isLandingDataAvailable).toHaveBeenNthCalledWith(1, expect.anything(), expect.anything(), undefined);
    expect(fetchLandingsMock).toHaveBeenCalled();
    expect(fetchSalesNoteMock).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(202);
  });

  it('will not call fetch landings if landing data is not available but will fetch sales note', async () => {
    isLandingDataAvailable.mockResolvedValueOnce(false);

    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'B13508', dateLanded: '2019-09-05', isLegallyDue: true })
    };

    const response = await server.inject(req);

    expect(loggerMock).toHaveBeenNthCalledWith(4, "[POST /landings/queue][FETCHING-SALES-NOTE][PLN: B13508][DATE-LANDED: 2019-09-05]");
    expect(loggerMock).toHaveBeenNthCalledWith(5, "[POST /landings/queue][LANDING-DATA-NOT-AVAILABLE][PLN: B13508][DATE-LANDED: 2019-09-05][LEGALLY-DUE: true]");
    expect(fetchLandingsMock).not.toHaveBeenCalled();
    expect(fetchSalesNoteMock).toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
  });

  it('will fail with 500 when calling POST', async () => {
    idxMock.mockImplementationOnce(() => {
      throw new Error();
    });

    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'B13508', dateLanded: '2019-09-05' })
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(500);
  });

  it('will call isLandingDataAvailable with isLegallyDue true', async () => {

    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'B13508', dateLanded: '2019-09-05', isLegallyDue: true })
    };

    const response = await server.inject(req);

    expect(isLandingDataAvailable).toHaveBeenCalledWith(expect.anything(), expect.anything(), true);
    expect(fetchLandingsMock).toHaveBeenCalled();
    expect(fetchSalesNoteMock).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(202);
  });

});