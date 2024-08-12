import * as cache from '../../src/data/cache';
import * as landingsRefresh from '../../src/landings/orchestration/landingsRefresh';
import * as eodSettings from '../../src/landings/persistence/eodSettings';
import * as Hapi from '@hapi/hapi';
import { generateIndex } from 'mmo-shared-reference-data';
import { landingQueueRoutes } from '../../src/handler/landingQueue';

import logger from '../../src/logger';

const sinon = require('sinon');

const dataMock = sinon.stub(cache, 'getVesselsData')
const idxMock = sinon.stub(cache, 'getVesselsIdx')
const getDataEverExpected = sinon.stub(cache, 'getDataEverExpected')
const isLandingDataAvailable = sinon.stub(eodSettings, 'isLandingDataAvailable')
const fetchLandingsMock = sinon.stub(landingsRefresh, 'fetchLandings')
const fetchSalesNoteMock = sinon.stub(landingsRefresh, 'fetchSalesNote');
const loggerMock = sinon.stub(logger, 'info');
const loggerErrorMock = sinon.stub(logger, 'error');

let server;

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
  fetchLandingsMock.resolves([]);
  fetchSalesNoteMock.resolves(undefined);
  getDataEverExpected.returns(true);
  isLandingDataAvailable.resolves(true);
  dataMock.returns(
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

  idxMock.returns(vesselsIdx)
})

afterEach(() => {
  loggerMock.reset();
  fetchLandingsMock.reset();
  fetchSalesNoteMock.reset();
  getDataEverExpected.reset();
  isLandingDataAvailable.reset();
  loggerErrorMock.reset();
})

describe("Refreshing landings", () => {

  it('will fail if there is no payload', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue'
    };

    const response = await server.inject(req);

    expect(fetchLandingsMock.called).toBe(false);
    expect(fetchSalesNoteMock.called).toBe(false);
    expect(response.statusCode).toBe(400);
  });

  it('will fail if pln is missing', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ dateLanded: '2019-09-05' })
    };

    const response = await server.inject(req);

    expect(fetchLandingsMock.called).toBe(false);
    expect(fetchSalesNoteMock.called).toBe(false);
    expect(response.statusCode).toBe(400);
  });

  it('will fail if dateLanded is missing', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'test' })
    };

    const response = await server.inject(req);

    expect(fetchLandingsMock.called).toBe(false);
    expect(fetchSalesNoteMock.called).toBe(false);
    expect(response.statusCode).toBe(400);
  });

  it('will fail if date landed is wrong', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'B13509', dateLanded: 'test' })
    };

    const response = await server.inject(req);

    expect(fetchLandingsMock.called).toBe(false);
    expect(fetchSalesNoteMock.called).toBe(false);
    expect(response.statusCode).toBe(400);
  });

  it('will fail if date landed is of the incorrect length', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'B13509', dateLanded: '2019-02-3' })
    };

    const response = await server.inject(req);

    expect(fetchLandingsMock.called).toBe(false);
    expect(fetchSalesNoteMock.called).toBe(false);
    expect(response.statusCode).toBe(400);
  });

  it('will fail if date landed is invalid', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'B13509', dateLanded: '2019-02-31' })
    };

    const response = await server.inject(req);

    expect(fetchLandingsMock.called).toBe(false);
    expect(fetchSalesNoteMock.called).toBe(false);
    expect(response.statusCode).toBe(400);
  });

  it('will log date landed, pln and isLegallyDue position', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'B13509', dateLanded: '2019-02-31', isLegallyDue: true })
    };

    await server.inject(req);

    expect(fetchLandingsMock.called).toBe(false);
    expect(loggerMock.getCall(0).args[0]).toEqual("[POST /landings/queue]");
    expect(loggerMock.getCall(1).args[0]).toEqual("[POST /landings/queue][PLN: B13509][DATE-LANDED: 2019-02-31][LEGALLY-DUE: true]");
  });

  it('will fail if we cant find rssNumber', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'B13509', dateLanded: '2019-09-05' })
    };

    const response = await server.inject(req);

    expect(fetchLandingsMock.called).toBe(false);
    expect(fetchSalesNoteMock.called).toBe(false);
    expect(loggerMock.getCall(3).args[0]).toEqual("[POST /landings/queue]licence not found for [B13509][2019-09-05]");
    expect(response.statusCode).toBe(400);
  });

  it('will succeed with 202 when calling POST', async () => {
    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'B13508', dateLanded: '2019-09-05' })
    };

    const response = await server.inject(req);

    expect(isLandingDataAvailable.getCall(0).args[2]).toBeUndefined();
    expect(fetchLandingsMock.called).toBe(true);
    expect(fetchSalesNoteMock.called).toBe(false);
    expect(response.statusCode).toBe(202);
  });

  it('will not call fetch landings if landing data is not available but will fetch sales note', async () => {
    isLandingDataAvailable.resolves(false);

    const req = {
      method: 'POST',
      url: '/v1/landings/queue',
      payload: JSON.stringify({ pln: 'B13508', dateLanded: '2019-09-05', isLegallyDue: true })
    };

    const response = await server.inject(req);

    expect(loggerMock.getCall(3).args[0]).toEqual("[POST /landings/queue][FETCHING-SALES-NOTE][PLN: B13508][DATE-LANDED: 2019-09-05]");
    expect(loggerMock.getCall(4).args[0]).toEqual("[POST /landings/queue][LANDING-DATA-NOT-AVAILABLE][PLN: B13508][DATE-LANDED: 2019-09-05][LEGALLY-DUE: true]");
    expect(fetchLandingsMock.called).toBe(false);
    expect(fetchSalesNoteMock.called).toBe(true);
    expect(response.statusCode).toBe(400);
  });

  it('will fail with 500 when calling POST', async () => {
    idxMock.throws();

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

    expect(isLandingDataAvailable.getCall(0).args[2]).toBe(true);
    expect(fetchLandingsMock.called).toBe(true);
    expect(fetchSalesNoteMock.called).toBe(false);
    expect(response.statusCode).toBe(202);
  });

});