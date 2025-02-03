import { Server } from '../../src/server';
import config, { ApplicationConfig } from '../../src/config';
import * as sharedReferenceData from 'mmo-shared-reference-data';
import * as cache from '../../src/data/cache';
import * as risking from '../../src/landings/persistence/risking';
import * as conversionFactors from '../../src/landings/persistence/conversionFactors';
import * as eodSettings from '../../src/landings/persistence/eodSettings';
import * as systemBlocks from '../../src/services/systemBlock.service';
import * as UpdateIgnoreFlagNameService from '../../src/landings/updateIgnoreFlagName';
import { IWeighting } from '../../src/landings/types/appConfig/risking';

import logger from '../../src/logger';

const moment = require('moment')
moment.suppressDeprecationWarnings = true

const dataMock = jest.spyOn(cache, 'getVesselsData')

// stub out expensive call
const generateIndex = jest.spyOn(sharedReferenceData, 'generateIndex')
generateIndex.mockReturnValue( () => undefined )

const mockSeedConversionFactors = jest.spyOn(conversionFactors, 'loadConversionFactorsFromLocalFile');
mockSeedConversionFactors.mockResolvedValue([]);

const mockSeedVesselsOfInterest = jest.spyOn(risking, 'seedVesselsOfInterest');
mockSeedVesselsOfInterest.mockResolvedValue(undefined);

const mockGetVesselsOfInterest = jest.spyOn(risking, 'getVesselsOfInterest');
mockGetVesselsOfInterest.mockResolvedValue([]);

const mockSeedWeighting = jest.spyOn(risking, 'seedWeightingRisk');
mockSeedWeighting.mockResolvedValue({
  vesselWeight: 0,
  speciesWeight: 0,
  exporterWeight: 0,
  threshold: 0
});

const mockSeedBlockingRules = jest.spyOn(systemBlocks, 'seedBlockingRules');
mockSeedBlockingRules.mockResolvedValue(null);

const mockGetWeighting = jest.spyOn(risking, 'getWeightingRisk');
mockGetWeighting.mockResolvedValue({} as IWeighting);

const mockGetSpeciesToggle = jest.spyOn(risking, 'getSpeciesToggle');
mockGetSpeciesToggle.mockResolvedValue({ enabled: false });

const mockUpdateIgnoreFlagName = jest.spyOn(UpdateIgnoreFlagNameService, 'updateIgnoreFlagName');
mockUpdateIgnoreFlagName.mockResolvedValue(undefined);

const mockSeedEodSettings = jest.spyOn(eodSettings, 'seedEodRules');
mockSeedEodSettings.mockResolvedValue(undefined);

const mockLoadEodSettings = jest.spyOn(cache, 'loadEodSettings');
mockLoadEodSettings.mockResolvedValue(undefined);

beforeAll(async () => {
  ApplicationConfig.loadEnv({
    PORT: '9008',
    NODE_ENV: 'development'
  });

  await Server.start(config, true);
});

afterAll(async () => {
  await Server.stop();
});

describe("To Support Vessels Autocomplete", () => {
  beforeEach(() => {
    dataMock.mockReturnValue(
      [{
        fishingVesselName:"CARALISA",
        ircs:"VSLJ3",
        flag:"GBR",
        homePort:"MALLAIG",
        registrationNumber:"OB956",
        imo:null,
        fishingLicenceNumber:"1234",
        fishingLicenceValidTo:"2017-12-20T00:00:00",
        fishingLicenceValidFrom:"2010-12-31T00:00:00",
        rssNumber: '',
        vesselLength: 0,
        adminPort: '',
        licenceHolderName: "I am the Licence Holder name for this fishing boat"
      },
      {
        fishingVesselName:"CARALISA",
        ircs:"VSLJ3",
        flag:"GBR",
        homePort:"MALLAIG",
        registrationNumber:"OB956",
        imo:null,
        fishingLicenceNumber:"1234",
        fishingLicenceValidTo:"2027-12-31T00:00:00",
        fishingLicenceValidFrom: "2018-12-20T00:00:00",
        rssNumber: '',
        vesselLength: 0,
        adminPort: '',
        licenceHolderName: "I am the Licence Holder name for this fishing boat"
      },
      {
        fishingVesselName: "ANOTHER LADY II",
        ircs: null,
        cfr: "GBR000C20766",
        flag: "GBR",
        homePort: "BRIXHAM",
        registrationNumber: "E576",
        imo: null,
        fishingLicenceNumber: "25295",
        fishingLicenceValidFrom: "2016-11-01T00:00:00",
        fishingLicenceValidTo: "2030-12-31T00:00:00",
        adminPort: "BRIXHAM",
        rssNumber: "C20766",
        vesselLength: 5.8,
        licenceHolderName: "MR L GRAVES "
      }
    ]);
  });

  it('GET /v1/vessels/search happy path with known test data', async () => {

    const response = await Server.inject({
      url: '/v1/vessels/search?searchTerm=CA&landedDate=2019-01-01'
    });

    const result = JSON.parse(response.payload);
    expect(result[0].licenceNumber).toEqual("1234");
    expect(result[0].licenceHolder).toBe("I am the Licence Holder name for this fishing boat")
    expect(response.statusCode).toBe(200);
  });

  it('GET /v1/vessels/search with vessel name having spaces', async () => {

    const response = await Server.inject({
      url: '/v1/vessels/search?searchTerm=ANOTHER%20LADY%20II&landedDate=2024-6-18'
    });

    const result = JSON.parse(response.payload);
    expect(response.statusCode).toBe(200);
    expect(result[0].vesselName).toEqual("ANOTHER LADY II");
  });

  it('GET /v1/vessels/search with vessel name having spaces with an open parenthsis', async () => {

    const response = await Server.inject({
      url: '/v1/vessels/search?searchTerm=ANOTHER%20LADY%20II%20(E576&landedDate=2024-6-18'
    });

    const result = JSON.parse(response.payload);
    expect(response.statusCode).toBe(200);
    expect(result[0].vesselName).toEqual("ANOTHER LADY II");
  });

  it('GET /v1/vessels/search with vessel name having spaces with a close parenthsis', async () => {

    const response = await Server.inject({
      url: '/v1/vessels/search?searchTerm=ANOTHER%20LADY%20II%20(E576)&landedDate=2024-6-18'
    });

    const result = JSON.parse(response.payload);
    expect(response.statusCode).toBe(200);
    expect(result[0].vesselName).toEqual("ANOTHER LADY II");
  });

  it('should return a 400 error if special characters are passed into the query', async() => {
    const response = await Server.inject({
      url: '/v1/vessels/search?searchTerm=**&landedDate=2019-01-01'
    });

    expect(response.statusCode).toBe(400);
  })

  it('should not return anything when calling /search if vessel has a gap in between licenses and landed date is outside licenses', async () => {

    const response = await Server.inject({
      url: '/v1/vessels/search?searchTerm=CARALISA&landedDate=2018-08-08'
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toEqual("[]");
  });

  it('should return valid vessels if the landed date is the same as the licenseFrom date, within two license gaps', async () => {

    const response = await Server.inject({
      url: '/v1/vessels/search?searchTerm=CARALISA&landedDate=2018-12-20'
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).not.toEqual("[]");
  });
});


describe("To Support Vessels Autocomplete- without mocking", () => {

  beforeAll(async() => {
    dataMock.mockRestore();
    await cache.loadLocalFishCountriesAndSpecies();
    await cache.loadVessels();
  })

  it('should return valid vessels if the landed date is the same as the licenseFrom date', async () => {

    const response = await Server.inject({
      url: '/v1/vessels/search?searchTerm=STRIKER&landedDate=2014-07-01'
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).not.toEqual("[]");
  });

  it('should return valid vessels if the landed date is the same as the licenseTo date', async () => {

    const response = await Server.inject({
      url: '/v1/vessels/search?searchTerm=STRIKER&landedDate=2030-12-31'
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).not.toEqual("[]");
  });

  it('should not return anything when calling /v1/vessels/search outside licenseFrom date', async () => {

    const response = await Server.inject({
      url: '/v1/vessels/search?searchTerm=JOLA&landedDate=2437-12-19'
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toEqual("[]");
  });

  it('should GET /v1/vessels/search for multiple parameters with date in range should return data', async () => {

    const response = await Server.inject({
      url: '/v1/vessels/search?searchTerm=BOB&landedDate=2019-01-01'
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).not.toEqual("[]");
  });

  it('GET /v1/vessels/search should return no data when date is not provided', async () => {

    const response = await Server.inject({
      url: '/v1/vessels/search?searchTerm=CA&landedDate='
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toEqual('[]');
  });

  it('GET /v1/vessels/search should return Bad Request when date is invalid', async () => {

    const response = await Server.inject({
      url: '/v1/vessels/search?searchTerm=CA&landedDate=ABC'
    });

    expect(response.statusCode).toBe(400);
    expect(response.payload).toEqual('');
  });
});


describe("Routes", () => {
  let getVesselsDataMock;
  const error = new Error('error');

  beforeEach(() => {
     getVesselsDataMock = jest.spyOn(cache, 'getVesselsData');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should GET /', async () => {
    const response = await Server.inject({
      url: '/'
    });
    expect(response.statusCode).toBe(200);
  });

  it('should GET /health', async () => {
    const response = await Server.inject({
      url: '/health'
    });
    expect(response.statusCode).toBe(200);
  });

  it('should GET /v1/states', async () => {
    const response = await Server.inject({
      url: '/v1/states'
    });
    expect(response.statusCode).toBe(200);
    expect(response.payload.length > 0).toBe(true);
  });

  it('should GET /v1/presentations', async () => {
    const response = await Server.inject({
      url: '/v1/presentations'
    });
    expect(response.statusCode).toBe(200);
    expect(response.payload.length > 0).toBe(true);
  });

  it('should GET /v1/vessels/hasLicense', async () => {
    const response = await Server.inject({
      url: '/v1/vessels/hasLicense?vesselPln=E163&vesselName=STRIKER&landedDate=2016-09-01&flag=GBR&cfr=GBR000B10811&homePort=EXMOUTH&licenceNumber=22548&licenceValidTo=2030-12-31'
    });
    expect(response.statusCode).toBe(200);
    expect(response.payload.length > 0).toBe(true);
  });

  it('should GET /v1/vessels/hasLicense with licence holder', async () => {
    const response = await Server.inject({
      url: '/v1/vessels/hasLicense?vesselPln=E163&vesselName=STRIKER&landedDate=2016-09-01&flag=GBR&cfr=GBR000B10811&homePort=EXMOUTH&licenceNumber=22548&licenceValidTo=2030-12-31'
    });

    const data = JSON.parse(response.payload);

    expect(response.statusCode).toBe(200);
    expect(data.licenceHolderName).toEqual("MR J GOSLING ");
  });

  it('should GET /v1/vessels/hasLicense with a 00:01:00 valid to', async () => {
    const response = await Server.inject({
      url: '/v1/vessels/hasLicense?vesselPln=INS146&vesselName=STROMA&landedDate=2018-09-01&flag=GBR&cfr=GBR000C16096&homePort=BUCKIE&licenceNumber=30468&licenceValidTo=2027-12-31'
    });
    expect(response.statusCode).toBe(200);
    expect(response.payload.length > 0).toBe(true);
  });

  it('should return valid licence with full data / time GET /v1/vessels/hasLicense', async () => {
    const response = await Server.inject({
      url: '/v1/vessels/hasLicense?vesselPln=SY854&vesselName=ALINE&landedDate=2016-09-01&flag=GBR&cfr=GBR000C18030&homePort=BERNERA%20(LEWIS)&licenceNumber=30435&licenceValidTo=2027-12-31T00:01:00'
    });
    expect(response.statusCode).toBe(200);
    expect(response.payload.length > 0).toBe(true);
  });

  it('should not get any results from GET /v1/vessels/hasLicense', async () => {
    const response = await Server.inject({
      url: '/v1/vessels/hasLicense?vesselPln=OMN&vesselName=YIKES&landedDate=2049-01-01'
    });
    expect(response.statusCode).toBe(404);
    expect(response.payload.length === 0).toBe(true);
  });

  it('should not get any results with fake flag GET /v1/vessels/hasLicense', async () => {
    const response = await Server.inject({
      url: '/v1/vessels/hasLicense?vesselPln=SY854&vesselName=ALINE&landedDate=2019-01-01&flag=FAKE&cfr=GBRC18030&homePort=BERNERA%20(LEWIS)&licenceNumber=30435&licenceValidTo=2012-06-30T00:00:00'
    });
    expect(response.statusCode).toBe(404);
    expect(response.payload.length === 0).toBe(true);
  });

  it('should not get any results with fake cfr GET /v1/vessels/hasLicense', async () => {
    const response = await Server.inject({
      url: '/v1/vessels/hasLicense?vesselPln=SY854&vesselName=ALINE&landedDate=2019-01-01&flag=GBR&cfr=FAKE&homePort=BERNERA%20(LEWIS)&licenceNumber=30435&licenceValidTo=2012-06-30T00:00:00'
    });
    expect(response.statusCode).toBe(404);
    expect(response.payload.length === 0).toBe(true);
  });

  it('should not get any results with fake homePort GET /v1/vessels/hasLicense', async () => {
    const response = await Server.inject({
      url: '/v1/vessels/hasLicense?vesselPln=SY854&vesselName=ALINE&landedDate=2019-01-01&flag=GBR&cfr=GBRC18030&homePort=FAKE&licenceNumber=30435&licenceValidTo=2012-06-30T00:00:00'
    });
    expect(response.statusCode).toBe(404);
    expect(response.payload.length === 0).toBe(true);
  });

  it('should not get any results with no licenceNumber GET /v1/vessels/hasLicense', async () => {
    const response = await Server.inject({
      url: '/v1/vessels/hasLicense?vesselPln=SY854&vesselName=ALINE&landedDate=2019-01-01&flag=GBR&cfr=GBRC18030&homePort=BERNERA%20(LEWIS)&licenceValidTo=2012-06-30T00:00:00'
    });
    expect(response.statusCode).toBe(404);
    expect(response.payload.length === 0).toBe(true);
  });

  it('should not get any results with fake licenceTo GET /v1/vessels/hasLicense', async () => {
    const response = await Server.inject({
      url: '/v1/vessels/hasLicense?vesselPln=SY854&vesselName=ALINE&landedDate=2019-01-01&flag=GBR&cfr=GBRC18030&homePort=BERNERA%20(LEWIS)&licenceNumber=30435&licenceValidTo=fake'
    });
    expect(response.statusCode).toBe(404);
    expect(response.payload.length === 0).toBe(true);
  });

  it('should get all results with correct imo number GET /v1/vessels/hasLicense', async () => {
    const response = await Server.inject({
      url: '/v1/vessels/hasLicense?vesselPln=H1100&vesselName=WIRON%205&landedDate=2020-09-01&flag=GBR&cfr=NLD200202641&homePort=PLYMOUTH&licenceNumber=12480&licenceValidTo=2021-08-09T00:00:00&imo=9249556'
    });
    expect(response.statusCode).toBe(200);
    expect(response.payload.length > 0).toBe(true);
  });

  it('should not get any results with fake imo number GET /v1/vessels/hasLicense', async () => {
    const response = await Server.inject({
      url: '/v1/vessels/hasLicense?vesselPln=H1100&vesselName=WIRON%205&landedDate=2020-09-01&flag=GBR&cfr=GBRC20514&homePort=PLYMOUTH&licenceNumber=12480&licenceValidTo=2382-12-31T00:00:00&imo=00000000'
    });
    expect(response.statusCode).toBe(404);
    expect(response.payload.length === 0).toBe(true);
  });

  it('should return 500 from GET /v1/vessels/hasLicense', async () => {
    getVesselsDataMock.mockImplementation(() => {throw error});

    const response = await Server.inject({
      url: '/v1/vessels/hasLicense?licenceNumber=30435'
    });
    expect(response.statusCode).toBe(500);
  });

  it('should GET /v1/speciesStateLookup', async () => {
    const response = await Server.inject({
      url: '/v1/speciesStateLookup?faoCode=COD'
    });

    const data = JSON.parse(response.payload);

    expect(response.statusCode).toBe(200);
    expect(data.length > 0).toBe(true);
  });

  it('should GET /v1/speciesStateLookup with unique presentations', async () => {
    const isArrayUnique = (arr: any) => Array.isArray(arr) && new Set(arr).size === arr.length;

    const response = await Server.inject({
      url: '/v1/speciesStateLookup?faoCode=BLI'
    });
    const data = JSON.parse(response.payload);

    expect(response.statusCode).toBe(200);
    expect(data.every((_: any) => isArrayUnique(_.presentations.map((p: any) => p.value)))).toBe(true);
  });

  it('should GET UK Species', async () => {
    const response = await Server.inject({
      url: '/v1/species?uk=Y'
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload.length > 0).toBe(true);
  });

  it('should GET All Species', async () => {
    const response = await Server.inject({
      url: '/v1/species'
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload.length > 0).toBe(true);
  });

  it('should GET /v1/commodities/search', async () => {
    const response = await Server.inject({
      url: '/v1/commodities/search?speciesCode=COD&state=FRE&presentation=FIL'
    });
    expect(response.statusCode).toBe(200);
    expect(response.payload.length > 0).toBe(true);
  });

  it('should GET /v1/commodities', async () => {
    const response = await Server.inject({
      url: '/v1/commodities'
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).length > 0).toBe(true);
  });

  it('should GET /v1/vessels/search', async () => {
    const response = await Server.inject({
      url: '/v1/vessels/search?searchTerm=EX'
    });
    expect(response.statusCode).toBe(200);
    expect(response.payload.length > 0).toBe(true);
  });

  it('should GET /v1/vessels/search with licence holder', async () => {
    const response = await Server.inject({
      url: '/v1/vessels/search?searchTerm=MARLENA&landedDate=2016-08-15'
    });

    const data = JSON.parse(response.payload);

    expect(response.statusCode).toBe(200);
    expect(data[0].licenceHolder).toEqual("MR K RYRIE ");
  });

  it('should GET /v1/vessels/search-exact', async () => {
    const response = await Server.inject({
      url: '/v1/vessels/search-exact?vesselPln=SY854&vesselName=ALINE'
    });
    expect(response.statusCode).toBe(200);
    expect(response.payload.length > 0).toBe(true);
  });

  it('should GET /v1/vessels/search-exact with licence holder', async () => {
    const response = await Server.inject({
      url: '/v1/vessels/search-exact?vesselPln=K529&vesselName=MARLENA'
    });

    const data = JSON.parse(response.payload);

    expect(response.statusCode).toBe(200);
    expect(data.licenceHolder).toEqual("MR K RYRIE ");
  });

  it('should not GET results for /v1/vessels/search-exact', async () => {
    const response = await Server.inject({
      url: '/v1/vessels/search-exact?vesselPln=OMN&vesselName=YIKES'
    });
    expect(response.statusCode).toBe(404);
    expect(response.payload.length === 0).toBe(true);
  });

  it('should return 500 error from /v1/vessels/search-exact', async () => {
    getVesselsDataMock.mockImplementation(() => {throw error});

    const response = await Server.inject({
      url: '/v1/vessels/search-exact?vesselPln=OMN&vesselName=YIKES'
    });
    expect(response.statusCode).toBe(500);
  });

  it('should GET /v1/vessels', async () => {
    const response = await Server.inject({
      url: '/v1/vessels'
    });
    expect(response.statusCode).toBe(200);
    expect(response.payload.length > 0).toBe(true);
  });

  it('should GET /v1/vessels with licence holder', async () => {
    const response = await Server.inject({
      url: '/v1/vessels'
    });

    const data = JSON.parse(response.payload);

    expect(response.statusCode).toBe(200);
    expect(data[0].licenceHolder).toEqual("MR  KEVIN MCMILLEN ");
  });

  it('should return 500 error from /v1/vessels', async () => {
    getVesselsDataMock.mockImplementation(() => {throw error});

    const response = await Server.inject({
      url: '/v1/vessels'
    });
    expect(response.statusCode).toBe(500);
  });

  it('should GET All Countries', async () => {
    const getDataMock = jest.spyOn(cache, 'getCountries');

    const data = [
      {
        officialCountryName: 'SPAIN',
        isoCodeAlpha2: 'ES',
        isoCodeAlpha3: 'ESP',
        isoNumericCode: '124',
      },
      {
        officialCountryName: 'GREECE',
        isoCodeAlpha2: 'GR',
        isoCodeAlpha3: 'GRE',
        isoNumericCode: '123',
      },
      {
        officialCountryName: 'UNITED KINGDOM',
        isoCodeAlpha2: 'GB',
        isoCodeAlpha3: 'GBR',
        isoNumericCode: '126',
      },
      {
        officialCountryName: 'BRAZIL',
        isoCodeAlpha2: 'BR',
        isoCodeAlpha3: 'BRA',
        isoNumericCode: '128',
      }
    ];

    getDataMock.mockReturnValue(data);

    const response = await Server.inject({
      url: '/v1/countries'
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload.length > 0).toBe(true);
    expect(response.payload).toEqual(JSON.stringify(data));
  });

  it('should return 500 from /v1/countries', async () => {
    const getDataMock = jest.spyOn(cache, 'getCountries');

    const error = new Error('error');
    getDataMock.mockImplementation(() => {throw error});

    const response = await Server.inject({
      url: '/v1/countries'
    });
    expect(response.statusCode).toBe(500);
  });

  describe('GET /v1/addresses/search', () => {

    let mockGetAddresses;
    let mockLogError;

    beforeEach(() => {
      mockGetAddresses = jest.spyOn(sharedReferenceData.BoomiService, 'getAddresses');
      mockLogError = jest.spyOn(logger, 'error');
    });

    afterEach(() => {
      mockGetAddresses.mockRestore();
    });

    it('will return 200 if an address is found', async () => {
      const addresses = [{street: 'x'}];

      mockGetAddresses.mockResolvedValue(addresses);

      const response = await Server.inject({
        url: '/v1/addresses/search?postcode=NE1%201NE'
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toStrictEqual(addresses);
    });

    it('will return 200 if an address is not found', async () => {
      mockGetAddresses.mockResolvedValue([]);

      const response = await Server.inject({
        url: '/v1/addresses/search?postcode=NE1%201NE'
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toStrictEqual([]);
    });

    it('will return a 400 error if no postcode is provided', async () => {
      const response = await Server.inject({
        url: '/v1/addresses/search'
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toStrictEqual({
        postcode: 'error.postcode.any.required'
      })
    });

    it('will return a 400 error if an invalid postcode is provided', async () => {
      const response = await Server.inject({
        url: '/v1/addresses/search?postcode=X'
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toStrictEqual({
        postcode: 'error.postcode.string.pattern.base'
      });
    });

    it('will return a 200 with an empty array if the boomi service errors', async () => {
      mockGetAddresses.mockRejectedValue(new Error('something went wrong'));

      const response = await Server.inject({
        url: '/v1/addresses/search?postcode=NE1%201NE'
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toStrictEqual([]);
    });

    it('will log the error if the boomi service errors', async () => {
      const error = new Error('something went wrong');
      const postcode = 'NE1 1NE'

      mockGetAddresses.mockRejectedValue(error);

      await Server.inject({
        url: `/v1/addresses/search?postcode=${postcode}`
      });

      expect(mockLogError).toHaveBeenCalledWith(`[GET-ADDRESS][${postcode}][ERROR][${error.stack}]`);
    });

  });

});