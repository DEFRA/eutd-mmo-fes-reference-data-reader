import { speciesRoutes } from '../../src/handler/species';
import * as Hapi from '@hapi/hapi';
import * as Cache from '../../src/data/cache';

let server;

beforeAll(async () => {
  server = Hapi.server({
    port: 9011,
    host: 'localhost'
  });

  speciesRoutes(server);

  await server.initialize();
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

let mockReq;
describe('/v1/commodities/search', () => {

  const mockGetSpeciesData = jest.spyOn(Cache, 'getSpeciesData');
  mockGetSpeciesData.mockReturnValue([
    {
      faoCode: 'ALB',
      faoName: 'Albacore',
      scientificName: 'Thunnus alalunga',
      preservationState: 'FRE',
      preservationDescr: 'fresh',
      presentationState: 'GUH',
      presentationDescr: 'gutted and headed',
      commodityCode: '03023190',
      commodityCodeDescr: 'Fresh or chilled albacore or longfinned tunas "Thunnus alalunga" (excl. for industrial processing or preservation)'
    },
    {
      faoCode: 'ALB',
      faoName: 'Albacore',
      scientificName: 'Thunnus alalunga',
      preservationState: 'FRE',
      preservationDescr: 'fresh',
      presentationState: 'GUT',
      presentationDescr: 'gutted',
      commodityCode: '03023190',
      commodityCodeDescr: 'Fresh or chilled albacore or longfinned tunas "Thunnus alalunga" (excl. for industrial processing or preservation)'
    },
    {
      faoCode: 'ALB',
      faoName: 'Albacore',
      scientificName: 'Thunnus alalunga',
      preservationState: 'FRE',
      preservationDescr: 'fresh',
      presentationState: 'WHL',
      presentationDescr: 'whole',
      commodityCode: '03023190',
      commodityCodeDescr: 'Fresh or chilled albacore or .... '
    },
    {
      faoCode: 'ALB',
      faoName: 'Albacore',
      scientificName: 'Thunnus alalunga',
      preservationState: 'FRO',
      preservationDescr: 'frozen',
      presentationState: 'GUH',
      presentationDescr: 'gutted and headed',
      commodityCode: '03034190',
      commodityCodeDescr: 'Frozen albacore or longfinned tunas "Thunnus alalunga" (excl. for industrial processing or preservation)'
    },
    {
      faoCode: 'ALB',
      faoName: 'Albacore',
      scientificName: 'Thunnus alalunga',
      preservationState: 'FRO',
      preservationDescr: 'frozen',
      presentationState: 'GUT',
      presentationDescr: 'gutted',
      commodityCode: '03034190',
      commodityCodeDescr: 'Frozen albacore or longfinned tunas "Thunnus alalunga" (excl. for industrial processing or preservation)'
    }
  ]);

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      url: '/v1/commodities/search?speciesCode=ALB&state=FRE&presentation=WHL',
    }
  });

  it('should return 400 code if no query string present', async () => {
    mockReq.url = '/v1/commodities/search';
    const response = await server.inject(mockReq);
    expect(response.statusCode).toBe(400);
  });

  it('should return 200 code if query string present', async () => {
    const response = await server.inject(mockReq);
    expect(response.statusCode).toBe(200);
  });

  it('should call getSpeciesData if query string present', async () => {
    await server.inject(mockReq);
    expect(mockGetSpeciesData).toHaveBeenCalled();
  });

  it('should return if query species is found', async () => {
    const response = await server.inject(mockReq);
    expect(response.result).toEqual([
      {
        code: "03023190",
        description: 'Fresh or chilled albacore or .... ',
        faoName: "Albacore",
        stateLabel: 'fresh',
        presentationLabel: 'whole'
      }
      ]);
  });

  it('should return empty array if species is not found', async () => {
    mockReq = '/v1/commodities/search?speciesCode=NOTTHERE&state=FRE&presentation=WHL';
    const response = await server.inject(mockReq);
    expect(response.result).toEqual([]);
  });


});

describe('/v1/species/search-exact', () => {

  let mockGetSpeciesData: jest.SpyInstance;

  beforeEach(()=>{
    mockReq = {
      method: 'GET',
      url: '/v1/species/search-exact?faoCode=ALB&faoName=Albacore&scientificName=Thunnus+alalunga',
    }

    mockGetSpeciesData = jest.spyOn(Cache, 'getSpeciesData');
    mockGetSpeciesData.mockReturnValue([
      {
        faoCode: 'ALB',
        faoName: 'Albacore',
        scientificName: 'Thunnus alalunga',
        preservationState: 'FRE',
        preservationDescr: 'fresh',
        presentationState: 'GUH',
        presentationDescr: 'gutted and headed',
        commodityCode: '03023190',
        commodityCodeDescr: 'Fresh or chilled albacore or longfinned tunas "Thunnus alalunga" (excl. for industrial processing or preservation)'
      },
      {
        faoCode: 'ALB',
        faoName: 'Albacore',
        scientificName: 'Thunnus alalunga',
        preservationState: 'FRE',
        preservationDescr: 'fresh',
        presentationState: 'GUT',
        presentationDescr: 'gutted',
        commodityCode: '03023190',
        commodityCodeDescr: 'Fresh or chilled albacore or longfinned tunas "Thunnus alalunga" (excl. for industrial processing or preservation)'
      },
      {
        faoCode: 'ALB',
        faoName: 'Albacore',
        scientificName: 'Thunnus alalunga',
        preservationState: 'FRE',
        preservationDescr: 'fresh',
        presentationState: 'WHL',
        presentationDescr: 'whole',
        commodityCode: '03023190',
        commodityCodeDescr: 'Fresh or chilled albacore or .... '
      },
      {
        faoCode: 'ALB',
        faoName: 'Albacore',
        scientificName: 'Thunnus alalunga',
        preservationState: 'FRO',
        preservationDescr: 'frozen',
        presentationState: 'GUH',
        presentationDescr: 'gutted and headed',
        commodityCode: '03034190',
        commodityCodeDescr: 'Frozen albacore or longfinned tunas "Thunnus alalunga" (excl. for industrial processing or preservation)'
      },
      {
        faoCode: 'ALB',
        faoName: 'Albacore',
        scientificName: 'Thunnus alalunga',
        preservationState: 'FRO',
        preservationDescr: 'frozen',
        presentationState: 'GUT',
        presentationDescr: 'gutted',
        commodityCode: '03034190',
        commodityCodeDescr: 'Frozen albacore or longfinned tunas "Thunnus alalunga" (excl. for industrial processing or preservation)'
      }
    ]);
  });

  it('should return 200 code if query string present', async () => {
    const response = await server.inject(mockReq);
    expect(response.statusCode).toBe(200);
  });

  it('should call getSpeciesData if query string present', async () => {
    await server.inject(mockReq);
    expect(mockGetSpeciesData).toHaveBeenCalled();
  });

  it('should return if query species is found', async () => {
    const response = await server.inject(mockReq);
    expect(response.result).toEqual({"faoCode": "ALB", "faoName": "Albacore", "scientificName": "Thunnus alalunga"});
  });

  it('should return null if species is not found', async () => {
    mockReq = '/v1/species/search-exact?faoCode=COD&faoName=blah&scientificName=Gadus+morhua';
    const response = await server.inject(mockReq);
    expect(response.result).toEqual(null);
  });

  it('should return a 500 response if an error occurs', async () => {
    mockGetSpeciesData.mockImplementation(() => {
      throw new Error('something has gone wrong');
    });
    const response = await server.inject(mockReq);
    expect(response.statusCode).toBe(500);
  });

  it('should handle a request with no params', async () => {
    mockReq = '/v1/species/search-exact';
    const response = await server.inject(mockReq);
    expect(response.result).toEqual(null);
  });
});
