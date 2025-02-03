import * as Hapi from '@hapi/hapi';
import * as RiskingService from '../../src/landings/persistence/risking';
import * as Cache from '../../src/data/cache';
import * as SUT from '../../src/handler/risking';
import { IVesselOfInterest, VesselOfInterest } from '../../src/landings/types/appConfig/risking';
import * as RiskController from '../../src/controllers/risking'
import logger from '../../src/logger';

let server;

beforeAll(async () => {
  server = Hapi.server({
    port: 9012,
    host: 'localhost'
  });

  SUT.riskingRoutes(server);

  await server.initialize();
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

let mockLoggerInfo;
let mockLoggerError;

describe('When getting all the vessels of interest', () => {
  let mockGetVesselsOfInterest;


  beforeEach(() => {
    mockGetVesselsOfInterest = jest.spyOn(RiskingService, 'getVesselsOfInterest');
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    mockGetVesselsOfInterest.mockRestore();
    mockLoggerInfo.mockRestore();
    mockLoggerError.mockRestore();
  })

  const req = {
    method: 'GET',
    url: '/v1/risking/vessels',
  };

  it('will return status code of 200 if vessels of interest are found', async () => {
    const dataFromDb: IVesselOfInterest[] = [
      {
        fishingVesselName: "MARY AMELIA",
        registrationNumber: "L086",
        homePort: "LEIGH-ON-SEA",
        da: "England"
      },
      {
        fishingVesselName: "FIONA MARY",
        registrationNumber: "PW160",
        homePort: "PLYMOUTH",
        da: "England"
      }
    ];

    const expectedResponse: VesselOfInterest[] = [
      {
        pln: "PW160",
        vesselName: "FIONA MARY",
        homePort: "PLYMOUTH",
        da: "England"
      },
      {
        pln: "L086",
        vesselName: "MARY AMELIA",
        homePort: "LEIGH-ON-SEA",
        da: "England"
      }
    ]

    mockGetVesselsOfInterest.mockResolvedValue(dataFromDb);

    const response = await server.inject(req);


    expect(mockGetVesselsOfInterest).toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(response.payload).toBe(JSON.stringify(expectedResponse));
    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][GET-VESSELS-OF-INTEREST][VESSELS 2][SUCCESS]');
  });

  it('will return a status code of 500 if any errors that are thrown', async () => {
    mockGetVesselsOfInterest.mockRejectedValue('error');

    const response = await server.inject(req);

    expect(mockGetVesselsOfInterest).toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalledWith('[RISKING][GET-VESSELS-OF-INTEREST][ERROR][error]');
    expect(response.statusCode).toBe(500);
  });
});

describe('When searching vessels of interest', () => {
  let mockGetVesselsData;

  const testVesselsData: any[] = [
    {
      fishingVesselName: "WIRON 5",
      ircs: "2HGD8",
      flag: "GBR",
      homePort: "PLYMOUTH",
      registrationNumber: "H1100",
      imo: 9249556,
      fishingLicenceNumber: "12480",
      fishingLicenceValidFrom: "2016-09-01T00:00:00",
      fishingLicenceValidTo: "2382-12-31T00:00:00",
      adminPort: "PLYMOUTH",
      rssNumber: "C20514",
      vesselLength: 50.63,
      cfr: "GBRC20514"
    },
    {
      fishingVesselName: "WIRON 6",
      ircs: "2HGE2",
      flag: "GBR",
      homePort: "PLYMOUTH",
      registrationNumber: "H2200",
      imo: 9249568,
      fishingLicenceNumber: "12481",
      fishingLicenceValidFrom: "2017-08-11T00:00:00",
      fishingLicenceValidTo: "2382-12-31T00:00:00",
      adminPort: "PLYMOUTH",
      rssNumber: "C20515",
      vesselLength: 50.63,
      cfr: "GBRC20515"
    },
    {
      fishingVesselName: "SIR MILES",
      ircs: "MEIZ",
      flag: "GBR",
      homePort: "LOCHINVER",
      registrationNumber: "AR94",
      imo: 5242964,
      fishingLicenceNumber: "12844",
      fishingLicenceValidFrom: "2017-07-13T00:00:00",
      fishingLicenceValidTo: "2027-12-31T00:00:00",
      adminPort: "LOCHINVER",
      rssNumber: "A10123",
      vesselLength: 35.43,
      cfr: "GBRA10123"
    },
    {
      fishingVesselName: "JOANNA",
      ircs: "GFGX",
      flag: "GBR",
      homePort: "STORNOWAY",
      registrationNumber: "CY701",
      imo: null,
      fishingLicenceNumber: "41606",
      fishingLicenceValidFrom: "2017-06-27T00:00:00",
      fishingLicenceValidTo: "2027-12-31T00:00:00",
      adminPort: "STORNOWAY",
      rssNumber: "A10168",
      vesselLength: 16.46,
      cfr: "GBRA10168"
    },
    {
      fishingVesselName: "ABOUT TIME",
      ircs: "MJUR5",
      flag: "GBR",
      homePort: "UNKNOWN",
      registrationNumber: "NN8",
      imo: null,
      fishingLicenceNumber: "10793",
      fishingLicenceValidFrom: "2017-03-17T00:00:00",
      fishingLicenceValidTo: "2382-12-31T00:00:00",
      adminPort: "HASTINGS",
      rssNumber: "A20475",
      vesselLength: 11.9,
      cfr: "GBRA20475"
    },
    {
      fishingVesselName: "BLUE SKY",
      ircs: "MIBB",
      flag: "GBR",
      homePort: "UNKNOWN",
      registrationNumber: "BCK21",
      imo: null,
      fishingLicenceNumber: "11075",
      fishingLicenceValidFrom: "2017-07-13T00:00:00",
      fishingLicenceValidTo: "2027-12-31T00:00:00",
      adminPort: "FRASERBURGH",
      rssNumber: "A23004",
      vesselLength: 13.4,
      cfr: "GBRA23004"
    },
    {
      fishingVesselName: "BAD TEST 1",
      ircs: "MIBB",
      flag: "GBR",
      homePort: "UNKNOWN",
      registrationNumber: "WA1",
      imo: null,
      fishingLicenceNumber: "11075",
      fishingLicenceValidFrom: "2017-07-13T00:00:00",
      fishingLicenceValidTo: "2027-12-31T00:00:00",
      adminPort: "UNKNOWN",
      rssNumber: "TEST",
      vesselLength: 10,
      cfr: "GBRA23004"
    },
    {
      fishingVesselName: "BAD TEST 2",
      ircs: "MIBB",
      flag: "GBR",
      homePort: "UNKNOWN",
      registrationNumber: "WA2",
      imo: null,
      fishingLicenceNumber: "11075",
      fishingLicenceValidFrom: "2007-07-13T00:00:00",
      fishingLicenceValidTo: "2007-12-31T00:00:00",
      adminPort: "UNKNOWN",
      rssNumber: "TEST",
      vesselLength: 10,
      cfr: "GBRA23004"
    }
  ];

  beforeEach(() => {
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');

    mockGetVesselsData = jest.spyOn(Cache, 'getVesselsData');
    mockGetVesselsData.mockReturnValue(testVesselsData);
  });

  afterEach(() => {
    mockLoggerInfo.mockRestore();
    mockLoggerError.mockRestore();

    mockGetVesselsData.mockRestore();
  });

  it('will return 200 OK with an empty array if no vessels of interests are found', async () => {

    const response = await server.inject({
      method: 'GET',
      url: '/v1/risking/vessels/search?searchTerm=NORESULTS'
    });

    expect(mockLoggerInfo).toHaveBeenCalledWith(`[RISKING][SEARCH][0][FOUND]`);
    expect(response.statusCode).toBe(200);
    expect(response.payload).toEqual(JSON.stringify([]));
  });

  it('will return 200 OK when a result is found', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/risking/vessels/search?searchTerm=H1100'
    });

    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][SEARCH][1][FOUND]');
    expect(response.statusCode).toBe(200);
    expect(response.payload).toEqual(JSON.stringify([{
      pln: 'H1100',
      vesselName: 'WIRON 5',
      homePort: 'PLYMOUTH',
      da: 'England'
    }]));
  });


  it('will return 200 OK with an empty array if the search term contains any special characters', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/risking/vessels/search?searchTerm=P%$'
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toEqual(JSON.stringify([]));
  });

  it('will return 400 Bad Request if a search term is not given', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/risking/vessels/search'
    });

    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][SEARCH][INVALID-SEARCH-TERM]');
    expect(response.statusCode).toBe(400);
    expect(response.payload).toEqual(JSON.stringify([]));
  });

  it('will return 500 Internal Server Error if an error is thrown', async () => {
    mockGetVesselsData.mockImplementationOnce(() => {
      throw new Error('error');
    });

    const response = await server.inject({
      method: 'GET',
      url: '/v1/risking/vessels/search?searchTerm=H1100'
    });

    expect(mockLoggerError).toHaveBeenCalledWith('[RISKING][SEARCH][ERROR][Error: error]');
    expect(response.statusCode).toBe(500);
    expect(response.payload).toEqual(JSON.stringify([]));
  });

  it('will return valid vessels for the given search term in lower case', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/risking/vessels/search?searchTerm=H1100'
    });
    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][SEARCH][1][FOUND]');
    expect(response.statusCode).toBe(200);
    expect(response.payload).toEqual(JSON.stringify([{
      pln: 'H1100',
      vesselName: 'WIRON 5',
      homePort: 'PLYMOUTH',
      da: 'England'
    }]));
  });

  it('will return valid vessels in alphabetical order of vessel name', async () => {

    const response = await server.inject({
      method: 'GET',
      url: '/v1/risking/vessels/search?searchTerm=a'
    });

    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][SEARCH][4][FOUND]');
    expect(response.statusCode).toBe(200);
    expect(response.payload).toStrictEqual(JSON.stringify([{
      pln: 'NN8',
      vesselName: 'ABOUT TIME',
      homePort: 'UNKNOWN',
      da: 'England'
    },
    {
      pln: 'WA1',
      vesselName: 'BAD TEST 1',
      homePort: 'UNKNOWN',
      da: 'England'
    },
    {
      pln: 'CY701',
      vesselName: 'JOANNA',
      homePort: 'STORNOWAY',
      da: 'Scotland'
    },
    {
      pln: 'AR94',
      vesselName: 'SIR MILES',
      homePort: 'LOCHINVER',
      da: 'Scotland'
    },
    ]));
  });

  it('will return valid vessels of interest with England if da can not be found', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/risking/vessels/search?searchTerm=WA1'
    });

    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][SEARCH][1][FOUND]');
    expect(response.statusCode).toBe(200);
    expect(response.payload).toEqual(JSON.stringify([{
      pln: 'WA1',
      vesselName: 'BAD TEST 1',
      homePort: 'UNKNOWN',
      da: 'England'
    }
    ]));
  });

  it('will not return vessels that do not currently have a valid fishing licence', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/risking/vessels/search?searchTerm=WA2'
    });

    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][SEARCH][0][FOUND]');
    expect(response.statusCode).toBe(200);
    expect(response.payload).toEqual(JSON.stringify([]));
  });
});

describe('When deleting vessels of interest', () => {
  let mockDeleteVesselOfInterest;

  beforeEach(() => {
    mockDeleteVesselOfInterest = jest.spyOn(RiskingService, 'deleteVesselOfInterest');
    mockDeleteVesselOfInterest.mockResolvedValue(null);
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    mockDeleteVesselOfInterest.mockRestore();
    mockLoggerInfo.mockRestore();
    mockLoggerError.mockRestore();
  });

  describe('will return 200 OK when', () => {
    it('a vessel of interest is successfully deleted', async () => {

      const response = await server.inject({
        method: 'POST',
        url: '/v1/risking/vessel/delete',
        payload: {
          pln: "H1100",
          vesselName: "WIRON 5"
        }
      });

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, '[RISKING][DELETE-VESSEL-OF-INTEREST][PLN: H1100][VESSEL: WIRON 5]');
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(2, '[RISKING][DELETE-VESSEL-OF-INTEREST][SUCCESS]')
      expect(mockDeleteVesselOfInterest).toHaveBeenCalledWith('H1100', 'WIRON 5');
      expect(response.statusCode).toBe(200);
    });
  });

  describe('will return 400 Bad Request when', () => {
    it('pln is missing in the payload', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/risking/vessel/delete',
        payload: {
          vesselName: "WIRON 5"
        }
      });

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, '[RISKING][DELETE-VESSEL-OF-INTEREST][PLN: undefined][VESSEL: WIRON 5]');
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(2, '[RISKING][DELETE-VESSEL-OF-INTEREST][UNSUCCESSFUL]');
      expect(mockDeleteVesselOfInterest).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(400);
    });

    it('vesselName is missing in the payload', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/risking/vessel/delete',
        payload: {
          pln: "H1100"
        }
      });

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, '[RISKING][DELETE-VESSEL-OF-INTEREST][PLN: H1100][VESSEL: undefined]');
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(2, '[RISKING][DELETE-VESSEL-OF-INTEREST][UNSUCCESSFUL]');
      expect(mockDeleteVesselOfInterest).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(400);
    });

    it('both pln and vesselName are missing in the payload', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/risking/vessel/delete',
        payload: {
        }
      });

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, '[RISKING][DELETE-VESSEL-OF-INTEREST][PLN: undefined][VESSEL: undefined]');
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(2, '[RISKING][DELETE-VESSEL-OF-INTEREST][UNSUCCESSFUL]');
      expect(mockDeleteVesselOfInterest).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(400);
    });
  });

  describe('will return 500 Internal Server Error when', () => {
    it('an error is thrown', async () => {
      const error = new Error('error');
      mockDeleteVesselOfInterest.mockImplementation(() => { throw error });

      const response = await server.inject({
        method: 'POST',
        url: '/v1/risking/vessel/delete',
        payload: {
          pln: "H1100",
          vesselName: "WIRON 5"
        }
      });

      expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][DELETE-VESSEL-OF-INTEREST][PLN: H1100][VESSEL: WIRON 5]');
      expect(mockLoggerError).toHaveBeenCalledWith('[RISKING][DELETE-VESSEL-OF-INTEREST][ERROR][Error: error]');
      expect(mockDeleteVesselOfInterest).toHaveBeenCalledWith('H1100', 'WIRON 5');
      expect(response.statusCode).toBe(500);
    });
  });
})

describe('When adding vessels of interest', () => {
  let mockCreateVesselOfInterest;

  beforeEach(() => {
    mockCreateVesselOfInterest = jest.spyOn(RiskingService, 'createVesselOfInterest');
    mockCreateVesselOfInterest.mockResolvedValue(null);
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    mockCreateVesselOfInterest.mockRestore();
    mockLoggerInfo.mockRestore();
    mockLoggerError.mockRestore();
  });

  describe('will return 200 OK when', () => {
    it('a vessel of interest is successfully added', async () => {

      const response = await server.inject({
        method: 'POST',
        url: '/v1/risking/vessel/add',
        payload: {
          pln: "test PLN",
          vesselName: "test vessel",
          homePort: "UNKNOWN",
          da: "England"
        }
      });

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, '[RISKING][ADD-VESSELS-OF-INTEREST][SUCCESS]');
      expect(mockCreateVesselOfInterest).toHaveBeenCalledWith({
        pln: "test PLN",
        vesselName: "test vessel",
        homePort: "UNKNOWN",
        da: "England"
      });
      expect(response.statusCode).toBe(200);
    });
  });

  describe('will return 400 Bad Request when', () => {
    it('pln is missing in the payload', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/risking/vessel/add',
        payload: {
          vesselName: "test vessel",
          homePort: "UNKNOWN",
          da: "England"
        }
      });

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, '[RISKING][ADD-VESSEL-OF-INTEREST][MISSING-PAYLOAD]');
      expect(mockCreateVesselOfInterest).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(400);
    });

    it('vesselName is missing in the payload', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/risking/vessel/add',
        payload: {
          pln: "test PLN",
          homePort: "UNKNOWN",
          da: "England"
        }
      });

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, '[RISKING][ADD-VESSEL-OF-INTEREST][MISSING-PAYLOAD]');
      expect(mockCreateVesselOfInterest).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(400);
    });

    it('homePort is missing in the payload', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/risking/vessel/add',
        payload: {
          pln: "test PLN",
          vesselName: "test vessel",
          da: "England"
        }
      });

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, '[RISKING][ADD-VESSEL-OF-INTEREST][MISSING-PAYLOAD]');
      expect(mockCreateVesselOfInterest).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(400);
    });

    it('da is missing in the payload', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/risking/vessel/add',
        payload: {
          pln: "test PLN",
          vesselName: "test vessel",
          homePort: "UNKNOWN",
        }
      });

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, '[RISKING][ADD-VESSEL-OF-INTEREST][MISSING-PAYLOAD]');
      expect(mockCreateVesselOfInterest).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(400);
    });

    it('nothing is in the payload', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/risking/vessel/add',
        payload: {

        }
      });

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, '[RISKING][ADD-VESSEL-OF-INTEREST][MISSING-PAYLOAD]');
      expect(mockCreateVesselOfInterest).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(400);
    });

    it('null is in the payload', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/risking/vessel/add',
        payload: {
          pln: null
        }
      });

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, '[RISKING][ADD-VESSEL-OF-INTEREST][MISSING-PAYLOAD]');
      expect(mockCreateVesselOfInterest).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(400);
    });
  });

  describe('will return 500 Internal Server Error when', () => {
    it('an error is thrown', async () => {
      const error = new Error('error');
      mockCreateVesselOfInterest.mockImplementation(() => { throw error });

      const response = await server.inject({
        method: 'POST',
        url: '/v1/risking/vessel/add',
        payload: {
          pln: "test PLN",
          vesselName: "test vessel",
          homePort: "UNKNOWN",
          da: "England"
        }
      });

      expect(mockLoggerError).toHaveBeenCalledWith('[RISKING][ADD-VESSEL-OF-INTEREST][ERROR][Error: error]');
      expect(mockCreateVesselOfInterest).toHaveBeenCalledWith({
        pln: "test PLN",
        vesselName: "test vessel",
        homePort: "UNKNOWN",
        da: "England"
      });
      expect(response.statusCode).toBe(500);
    });
  });
})

describe('when getting the risk toggle', () => {

  let mockGetSpeciesRiskToggle;

  beforeEach(() => {
    mockGetSpeciesRiskToggle = jest.spyOn(RiskController, 'getSpeciesToggle');
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    mockGetSpeciesRiskToggle.mockRestore();
    mockLoggerInfo.mockRestore();
    mockLoggerError.mockRestore();
  })

  const req = {
    method: 'GET',
    url: '/v1/risking/species-toggle',
  };

  it('will return 200 if everything is ok', async () => {
    const expectedResponse = { enabled: true };

    mockGetSpeciesRiskToggle.mockResolvedValue(expectedResponse);

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);
    expect(mockGetSpeciesRiskToggle).toHaveBeenCalled();
    expect(response.payload).toBe(JSON.stringify(expectedResponse));
    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][GET-SPECIES-TOGGLE]');
    expect(mockLoggerInfo).toHaveBeenCalledWith(`[RISKING][GET-SPECIES-TOGGLE][SUCCESS][${JSON.stringify(expectedResponse)}]`);
  });

  it('will return 500 when something is wrong', async () => {
    const error = new Error('error');

    mockGetSpeciesRiskToggle.mockImplementation(() => { throw error });

    const response = await server.inject(req);

    expect(response.statusCode).toBe(500);
    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][GET-SPECIES-TOGGLE]');
    expect(mockLoggerError).toHaveBeenCalledWith(`[RISKING][GET-SPECIES-TOGGLE][ERROR][${error}]`)
  });

});

describe('when setting the risk toggle', () => {

  let mockSetSpeciesRiskToggle;

  beforeEach(() => {
    mockSetSpeciesRiskToggle = jest.spyOn(RiskController, 'setSpeciesToggle');
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    mockSetSpeciesRiskToggle.mockRestore();
    mockLoggerInfo.mockRestore();
    mockLoggerError.mockRestore();
  });

  const req = {
    method: 'PUT',
    url: '/v1/risking/species-toggle',
    payload: {
      enabled: true
    }
  };

  describe('it will return bad request', () => {

    it('when the payload is empty', async () => {
      const badReq = {
        method: 'PUT',
        url: '/v1/risking/species-toggle',
      };

      const response = await server.inject(badReq);

      expect(response.statusCode).toBe(400);
      expect(mockSetSpeciesRiskToggle).not.toHaveBeenCalled();
    });

    it('when the payload does not have an enabled property', async () => {
      const badReq = {
        method: 'PUT',
        url: '/v1/risking/species-toggle',
        payload: {
          isEnabled: true
        }
      };

      const response = await server.inject(badReq);

      expect(response.statusCode).toBe(400);
      expect(mockSetSpeciesRiskToggle).not.toHaveBeenCalled();
    });

    it('when the payload has an enabled property of the wrong data type', async () => {
      const badReq = {
        method: 'PUT',
        url: '/v1/risking/species-toggle',
        payload: {
          enabled: 'yes'
        }
      };

      const response = await server.inject(badReq);

      expect(response.statusCode).toBe(400);
      expect(mockSetSpeciesRiskToggle).not.toHaveBeenCalled();
    });
  });

  it('will return 204 when the request is valid', async () => {
    mockSetSpeciesRiskToggle.mockResolvedValue(null);

    const response = await server.inject(req);

    expect(response.statusCode).toBe(204);
    expect(mockSetSpeciesRiskToggle).toHaveBeenCalledWith({ enabled: true });
    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][SET-SPECIES-TOGGLE]');
    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][SET-SPECIES-TOGGLE][SUCCESS]');
  });

  it('will return 500 when the request fails', async () => {
    const error = new Error('something bad happened');

    mockSetSpeciesRiskToggle.mockImplementation(() => { throw error; });

    const response = await server.inject(req);

    expect(response.statusCode).toBe(500);
    expect(mockSetSpeciesRiskToggle).toHaveBeenCalledWith({ enabled: true });
    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][SET-SPECIES-TOGGLE]');
    expect(mockLoggerError).toHaveBeenCalledWith(`[RISKING][SET-SPECIES-TOGGLE][ERROR][${error}]`)
  })

});

describe('GET /v1/risking/weightings', () => {

  let mockGet;

  beforeEach(() => {
    mockGet = jest.spyOn(RiskController, 'getWeighting');
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    mockGet.mockRestore();
    mockLoggerInfo.mockRestore();
    mockLoggerError.mockRestore();
  });

  it('will return a status code of 200 if the controller returns data', async () => {
    const req = {
      method: 'GET',
      url: '/v1/risking/weightings'
    };

    const data = {
      test: 123
    };

    mockGet.mockResolvedValue(data);

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);
    expect(response.payload).toEqual(JSON.stringify(data));
  });

  it('will return a status code of 204 if the controller does not return data', async () => {
    const req = {
      method: 'GET',
      url: '/v1/risking/weightings'
    };

    mockGet.mockResolvedValue(null);

    const response = await server.inject(req);

    expect(response.statusCode).toBe(204);
  });

  it('will return a status code of 500 if the controller throws an error', async () => {
    const req = {
      method: 'GET',
      url: '/v1/risking/weightings'
    };

    mockGet.mockRejectedValue(new Error('error'))

    const response = await server.inject(req);

    expect(response.statusCode).toBe(500);
  });

  it('will log success', async () => {
    const req = {
      method: 'GET',
      url: '/v1/risking/weightings'
    };

    const data = {
      test: 123
    };

    mockGet.mockResolvedValue(data);

    await server.inject(req);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][GET-WEIGHTINGS]');
    expect(mockLoggerInfo).toHaveBeenCalledWith(`[RISKING][GET-WEIGHTINGS][SUCCESS][${JSON.stringify(data)}]`);
  });

  it('will log errors', async () => {
    const req = {
      method: 'GET',
      url: '/v1/risking/weightings'
    };

    const err = new Error('something went wrong');

    mockGet.mockRejectedValue(err)

    await server.inject(req);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][GET-WEIGHTINGS]');
    expect(mockLoggerError).toHaveBeenCalledWith(`[RISKING][GET-WEIGHTINGS][ERROR][${err}]`);
  });

});

describe('PUT /v1/risking/weightings', () => {

  let mockSet;

  beforeEach(() => {
    mockSet = jest.spyOn(RiskController, 'setWeighting');
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    mockSet.mockRestore();
    mockLoggerInfo.mockRestore();
    mockLoggerError.mockRestore();
  });

  describe('it will return bad request when', () => {

    it('the request payload is missing', async () => {
      const req = {
        method: 'PUT',
        url: '/v1/risking/weightings',
        payload: null
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(400);
    });

    it('the exporter value is missing or incorrect', async () => {
      const req = {
        method: 'PUT',
        url: '/v1/risking/weightings',
        payload: {
          exporter: null,
          species: 0.5,
          vessel: 0.5
        }
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(400);
    });

    it('the species value is missing or incorrect', async () => {
      const req = {
        method: 'PUT',
        url: '/v1/risking/weightings',
        payload: {
          exporter: 0.5,
          vessel: 0.5
        }
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(400);
    });

    it('the vessel value is missing or incorrect', async () => {
      const req = {
        method: 'PUT',
        url: '/v1/risking/weightings',
        payload: {
          exporter: 0.5,
          species: 0.5,
          vessel: [0.5]
        }
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(400);
    });

  });

  it('will return a status code of 204 if the controller is successful', async () => {
    mockSet.mockResolvedValue(null);

    const req = {
      method: 'PUT',
      url: '/v1/risking/weightings',
      payload: {
        exporter: 0.5,
        species: 0.5,
        vessel: 0.5
      }
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(204);
  });

  it('will return a status code of 500 if the controller returns an error', async () => {
    mockSet.mockRejectedValue(new Error('error'));

    const req = {
      method: 'PUT',
      url: '/v1/risking/weightings',
      payload: {
        exporter: 0.5,
        species: 0.5,
        vessel: 0.5
      }
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(500);
  });

  it('will log success', async () => {
    mockSet.mockResolvedValue(null);

    const req = {
      method: 'PUT',
      url: '/v1/risking/weightings',
      payload: {
        exporter: 0.5,
        species: 0.5,
        vessel: 0.5
      }
    };

    await server.inject(req);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][SET-WEIGHTINGS]');
    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][SET-WEIGHTINGS][SUCCESS]');
  });

  it('will log errors', async () => {
    const err = new Error('error');

    mockSet.mockRejectedValue(err);

    const req = {
      method: 'PUT',
      url: '/v1/risking/weightings',
      payload: {
        exporter: 0.5,
        species: 0.5,
        vessel: 0.5
      }
    };

    await server.inject(req);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][SET-WEIGHTINGS]');
    expect(mockLoggerError).toHaveBeenCalledWith(`[RISKING][SET-WEIGHTINGS][ERROR][${err}]`);
  });

});

describe('PUT /v1/risking/threshold', () => {

  let mockSet;

  beforeEach(() => {
    mockSet = jest.spyOn(RiskController, 'setThreshold');
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    mockSet.mockRestore();
    mockLoggerInfo.mockRestore();
    mockLoggerError.mockRestore();
  });

  describe('it will return bad request when', () => {

    it('the request payload is missing', async () => {
      const req = {
        method: 'PUT',
        url: '/v1/risking/threshold',
        payload: null
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(400);
    });

    it('the threshold value is missing or incorrect', async () => {
      const req = {
        method: 'PUT',
        url: '/v1/risking/threshold',
        payload: {
          threshold: null
        }
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(400);
    });

  });

  it('will return a status code of 204 if the controller is successful', async () => {
    mockSet.mockResolvedValue(null);

    const req = {
      method: 'PUT',
      url: '/v1/risking/threshold',
      payload: {
        threshold: 0.5
      }
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(204);
  });

  it('will return a status code of 500 if the controller returns an error', async () => {
    mockSet.mockRejectedValue(new Error('error'));

    const req = {
      method: 'PUT',
      url: '/v1/risking/threshold',
      payload: {
        threshold: 0.5
      }
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(500);
  });

  it('will log success', async () => {
    mockSet.mockResolvedValue(null);

    const req = {
      method: 'PUT',
      url: '/v1/risking/threshold',
      payload: {
        threshold: 0.5
      }
    };

    await server.inject(req);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][SET-THRESHOLD]');
    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][SET-THRESHOLD][SUCCESS]');
  });

  it('will log errors', async () => {
    const err = new Error('error');

    mockSet.mockRejectedValue(err);

    const req = {
      method: 'PUT',
      url: '/v1/risking/threshold',
      payload: {
        threshold: 0.5
      }
    };

    await server.inject(req);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[RISKING][SET-THRESHOLD]');
    expect(mockLoggerError).toHaveBeenCalledWith(`[RISKING][SET-THRESHOLD][ERROR][${err}]`);
  });

});