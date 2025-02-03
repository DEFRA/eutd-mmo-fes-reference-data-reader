
import * as preApprovedService from '../../src/landings/persistence/preApproved.service'
import { preApprovalDocumentRoutes } from '../../src/handler/preApprovedDocuments';
import * as Hapi from '@hapi/hapi';

let server;

beforeAll(async () => {
  server = Hapi.server({
    port: 9015,
    host: 'localhost'
  });

  preApprovalDocumentRoutes(server)

  await server.initialize();
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

describe('When pre approving a document in MONGO', () => {

  let serviceGetStub: jest.SpyInstance;
  let preApproveMongoStub: jest.SpyInstance;

  beforeEach(() => {
    serviceGetStub = jest.spyOn(preApprovedService, 'getPreApprovedDocumentByDocumentNumber');
    preApproveMongoStub = jest.spyOn(preApprovedService, 'preApproveDocumentFromMongo');
  });

  afterEach(() => {
    serviceGetStub.mockReset();
    preApproveMongoStub.mockReset();
  });

  it('will pre approve a document if everything goes ok', async () => {
    preApproveMongoStub.mockResolvedValue({});

    const request = {
      method: 'POST',
      url: '/v1/certificates/GBR-AZR-TEST/preApprove',
      headers: {
        "X-ADMIN-USER": "Bob"
      }
    };

    const response = await server.inject(request);

    expect(response.statusCode).toBe(204);

  });

  it('will return FORBIDDEN if there is no user in headers', async () => {
    const request = {
      method: 'POST',
      url: '/v1/certificates/GBR-AZR-TEST/preApprove'
    };

    const response = await server.inject(request);

    expect(response.statusCode).toBe(403);

  });

  it('will return NOT FOUND if the document does not exist', async () => {
    preApproveMongoStub.mockReset();
    preApproveMongoStub.mockImplementation(() => {
      throw new Error("Not Found")
    });

    const request = {
      method: 'POST',
      url: '/v1/certificates/GBR-AZR-TEST/preApprove',
      headers: {
        "X-ADMIN-USER": "Bob"
      }
    };

    const response = await server.inject(request);

    expect(response.statusCode).toBe(404);

  });

  it('will return INTERNAL SERVER ERROR if something goes wrong', async () => {
    preApproveMongoStub.mockReset();
    preApproveMongoStub.mockImplementation(() => {
      throw new Error()
    });

    const request = {
      method: 'POST',
      url: '/v1/certificates/GBR-AZR-TEST/preApprove',
      headers: {
        "X-ADMIN-USER": "Bob"
      }
    };

    const response = await server.inject(request);

    expect(response.statusCode).toBe(500);

  });
});

describe('When getting a pre approved document', () => {

  let serviceGetStub: jest.SpyInstance;

  beforeEach(() => {
    serviceGetStub = jest.spyOn(preApprovedService, 'getPreApprovedDocumentByDocumentNumber');
  });

  it('will return a valid pre Approved document', async () => {
    serviceGetStub.mockReset();
    serviceGetStub.mockResolvedValue({
      documentNumber: 'GBR-AZR-TEST',
      certificateData: "test"
    });

    const request = {
      method: 'GET',
      url: '/v1/certificates/GBR-AZR-TEST/preApprove'
    };

    const response = await server.inject(request);
    const payload = JSON.parse(response.payload);

    expect(response.statusCode).toBe(200);
    expect(payload.documentNumber).toEqual('GBR-AZR-TEST');

  });

  it('will return NOT FOUND if the document does not exist', async () => {
    serviceGetStub.mockReset();
    serviceGetStub.mockResolvedValue(null);

    const request = {
      method: 'GET',
      url: '/v1/certificates/GBR-AZR-TEST/preApprove'
    };

    const response = await server.inject(request);

    expect(response.statusCode).toBe(404);


  });

  it('will return INTERNAL SERVER ERROR something goes wrong retrieving the document', async () => {
    serviceGetStub.mockReset();
    serviceGetStub.mockImplementation(() => {
      throw new Error()
    });

    const request = {
      method: 'GET',
      url: '/v1/certificates/GBR-AZR-TEST/preApprove'
    };

    const response = await server.inject(request);

    expect(response.statusCode).toBe(500);


  });
});