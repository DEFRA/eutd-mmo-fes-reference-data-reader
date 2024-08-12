import * as Hapi from '@hapi/hapi';
import {virusCheckerRoutes} from '../../src/handler/virusChecker';
import * as AVS from '../../src/services/antiVirus.service';
import logger from '../../src/logger';

describe('virusChecker', () => {

  const server = Hapi.server();
  let mockScanFile;
  let mockLoggerInfo;
  let mockLoggerError;

  const validPayload = {
    fileName: 'the file name',
    content: 'the content',
    documentNumber: 'docNumber-1234',
    key: 'a UUID'
  };

  beforeAll(async () => {
    virusCheckerRoutes(server);
    await server.initialize();
    await server.start();
  });

  beforeEach(()=>{
    mockScanFile = jest.spyOn(AVS,'scanFile');
    mockScanFile.mockResolvedValue({ some:'data'});
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(()=>{
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('/v1/virusChecker/csv',()=>{
    const request = {
      method: "POST",
      url: "/v1/virusChecker/csv",
    };

    it('should log , call av api and return scanFile response if payload is valid', async () => {
      const response = await server.inject({
        ...request,
        payload: {...validPayload }
      });
      expect(mockScanFile).toHaveBeenCalledWith({
        ...validPayload,
        extension: 'csv'
      });
      expect(mockLoggerInfo).toHaveBeenCalledWith(`[VIRUS-CHECKER][CSV][${validPayload.documentNumber}][START][${validPayload.key}]`);
      expect(response.statusCode).toBe(200);
      expect(response.result).toEqual({some:'data'});
    });

    it('should return payload missing error', async () => {
      const response = await server.inject({
        ...request
      });
      expect(response.statusCode).toBe(400);
      expect(response.result).toEqual({"value": "error.value.object.base"});
    });

    it('should return error for each missing property', async () => {
      const response = await server.inject({
        ...request,
        payload: {
        }
      });
      expect(response.statusCode).toBe(400);
      expect(response.result).toEqual({
        "content": "error.content.any.required",
        "documentNumber": "error.documentNumber.any.required",
        "fileName": "error.fileName.any.required",
        "key": "error.key.any.required"
      });
    });

    it('should log the error and return 500 error if scanFile throw an error', async () => {
      mockScanFile.mockRejectedValue(new Error('an error'));
      const response = await server.inject({
        ...request,
        payload: {...validPayload }
      });

      expect(response.statusCode).toBe(500);
      expect(mockLoggerError).toHaveBeenCalledWith(`[VIRUS-CHECKER][CSV][${validPayload.documentNumber}][ERROR][${validPayload.key}][Error: an error]`);


    });
  })

});
