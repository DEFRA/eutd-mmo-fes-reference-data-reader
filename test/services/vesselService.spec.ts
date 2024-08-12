import * as cache from '../../src/data/cache';
import { generateIndex } from 'mmo-shared-reference-data';
import * as vesselService from '../../src/handler/vesselService';
import logger from '../../src/logger';

const sinon = require('sinon');

const dataMock = sinon.stub(cache, 'getVesselsData')
const idxMock = sinon.stub(cache, 'getVesselsIdx')
const loggerMock = sinon.stub(logger, 'error');

describe("When retrieving rssNumber", () => {

  const vessels = [
    {
      registrationNumber: "OB956",
      fishingLicenceValidTo: "2017-12-20T00:00:00",
      fishingLicenceValidFrom: "2012-05-02T00:00:00",
      rssNumber: "rssNumber"
    },
    {
      registrationNumber: "OB956",
      fishingLicenceValidTo: "2017-12-20T00:00:00",
      fishingLicenceValidFrom: "2012-05-02T00:00:00",
      rssNumber: "rssNumber2"
    }];

  const vesselsIdx = generateIndex(vessels)

  beforeEach(() => {
    dataMock.returns(vessels)
    idxMock.returns(vesselsIdx)
  });

  afterEach(() => {
    dataMock.reset();
    idxMock.reset();
    loggerMock.reset();
  });

  it('will return undefined if date is wrong', () => {

    const output = vesselService.getRssNumber("OB956", "tarara");

    expect(output).toEqual(undefined);
  })

  it('search by registrationNumber and date', () => {

    const output = vesselService.getRssNumber("OB956", "2012-12-29");

    expect(output).toEqual("rssNumber");
  });

  it('should respect lower date boundaries', () => {

    const output = vesselService.getRssNumber("OB956", "2012-05-02");

    expect(output).toEqual("rssNumber");
  });

  it('should respect upper date boundaries', () => {

    const output = vesselService.getRssNumber("OB956", "2017-12-");

    expect(output).toEqual("rssNumber");
  });

  it('should only return the first occurrence', () => {

    const output = vesselService.getRssNumber("OB956", "2012-08-02");

    expect(output).toEqual("rssNumber");
  });

  it('should return undefined if vessel does not exist', () => {
    const output = vesselService.getRssNumber("OB956", "2020-12-02");

    expect(output).toEqual(undefined);
    expect(loggerMock.getCall(0).args[0]).toBe('[VESSEL-SERVICE][RSS-NUMBER][NOT-FOUND]OB956:2020-12-02')
  });

  it('should do an exact search on pln and not pick up another pln that happens to start with the pln we are searching for', () => {

    const vessels = [
      {
        registrationNumber: "BM132",
        fishingLicenceValidTo: "2017-12-20T00:00:00",
        fishingLicenceValidFrom: "2012-05-02T00:00:00",
        rssNumber: "BAD"
      },
      {
        registrationNumber: "BM1",
        fishingLicenceValidTo: "2017-12-20T00:00:00",
        fishingLicenceValidFrom: "2012-05-02T00:00:00",
        rssNumber: "GOOD"
      }];

    const vesselsIdx = generateIndex(vessels)

    dataMock.returns(vessels)
    idxMock.returns(vesselsIdx)

    const output = vesselService.getRssNumber("BM1", "2015-12-02");

    expect(output).toBe('GOOD')

  })

});

describe("When retrieving vessel details for landings refresh", () => {

  it('search by rssNumber', () => {
    dataMock.returns(
      [{
        vesselLength: 10.73,
        rssNumber: "rssNumber",
        cfr: "GBRrssNumber"
      }]);

    const expectedOutput = { vesselLength: 10.73, cfr: "GBRrssNumber" }
    const output = vesselService.getVesselDetails("rssNumber");

    expect(output).toEqual(expectedOutput);
  });

  it('should only return the first occurrence', () => {
    dataMock.returns(
      [{
        vesselLength: 30.01,
        rssNumber: "rssNumber",
        cfr: "GBRrssNumber"
      },
      {
        vesselLength: null,
        rssNumber: "rssNumber",
        cfr: "GBRrssNumber"
      }]);

    const expectedOutput = { vesselLength: 30.01, cfr: "GBRrssNumber" }
    const output = vesselService.getVesselDetails("rssNumber");

    expect(output).toEqual(expectedOutput);
  });

  it('should return undefined if vessel does not exist', () => {
    dataMock.returns(
      [{
        rssNumber: "rssNumber",
        cfr: "GBRrssNumber"
      }]);

    const output = vesselService.getVesselDetails("test");

    expect(output).toEqual(undefined);
  });

  it('should do an exact search on rssNumber and not pick up another rssNumber that happens to start with the rssNumber we are searching for', () => {
    dataMock.returns([
      {
        vesselLength: 7.03,
        rssNumber: "BM132",
        cfr: "GBRBM132"
      },
      {
        vesselLength: 10.01,
        rssNumber: "BM1",
        cfr: "GBRBM1"
      }
    ]);

    const expectedOutput = { vesselLength: 10.01, cfr: "GBRBM1" }
    const output = vesselService.getVesselDetails("BM1");

    expect(output).toEqual(expectedOutput)
  });
});

