import * as Hapi from '@hapi/hapi';
import * as UploadValidationService from '../../src/services/uploadValidation.service';
import {landingValidationSchema, uploadValidatorRoutes} from '../../src/handler/uploadValidator';
import logger from '../../src/logger';
import * as ErrorUtils from '../../src/utils/errorExtractor';

describe('uploadValidator', () => {

  const server = Hapi.server();
  let mockLogInfo;
  let mockLogError;
  let mockValidateLandings;
  let mockErrorExtractor;

  beforeAll(async () => {
    uploadValidatorRoutes(server);
    await server.initialize();
    await server.start();
  });

  beforeEach(()=>{
    mockLogInfo = jest.spyOn(logger, 'info');
    mockLogError = jest.spyOn(logger, 'error');
    mockValidateLandings = jest.spyOn(UploadValidationService, 'validateLandings');
    mockErrorExtractor = jest.spyOn(ErrorUtils, 'default');
  });

  afterEach(()=>{
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('/v1/upload/landings/validate', () => {

    const validatedLandings = ['validated landings'] as any;

    const landings = [{id: 'landing 1'}];
    const products = [{id: 'product 1'}];
    const landingLimitDaysInFuture = 7;

    const request = {
      method: "POST",
      url: "/v1/upload/landings/validate",
      payload: {
        landings,
        products,
        landingLimitDaysInFuture
      }
    };

    beforeEach(() => {
      mockValidateLandings.mockReturnValue(validatedLandings);
    });

    it('should log the request', async () => {
      await server.inject({...request});

      expect(mockLogInfo).toHaveBeenCalledWith('[UPLOAD-LANDINGS][VALIDATE]');
    });

    it('should call validate landings', async () => {
      await server.inject({...request});

      expect(mockValidateLandings).toHaveBeenCalledWith(landings, products, landingLimitDaysInFuture);
    });

    it('should return the validation result', async () => {
      const response = await server.inject({...request});

      expect(response.statusCode).toBe(200);
      expect(response.result).toStrictEqual(validatedLandings);
    });

    it('should log any errors and return a 500 status', async () => {
      const error = new Error('something went wrong');
      mockValidateLandings.mockImplementation(() => { throw error; });

      const response = await server.inject({...request});

      expect(mockLogError).toHaveBeenCalledWith(`[UPLOAD-LANDINGS][VALIDATE][ERROR][${error.message}]`);

      expect(response.statusCode).toBe(500);
      expect(response.result).toBeNull();
    });

    it('should return any validation errors and a 400 status code if the payload is invalid', async () => {
      const extractedErrors = 'error 123';
      mockErrorExtractor.mockReturnValue(extractedErrors);

      const response = await server.inject({
        ...request,
        payload: {}
      });

      expect(response.statusCode).toBe(400);
      expect(response.result).toStrictEqual(extractedErrors);
    });

  });

  describe('landingValidationSchema', () => {

    const valid = {
      landings: [{id: 'landing 1'}],
      products: [{id: 'landing 2'}],
      landingLimitDaysInFuture: 7
    };

    it('should return no errors for a valid input', () => {
      const result = landingValidationSchema.validate(valid);

      expect(result.value).toStrictEqual(valid);
      expect(result.error).toBeUndefined();
    });

    it('should require landings', () => {
      const input = {
        ...valid,
        landings: undefined
      };

      const result = landingValidationSchema.validate(input);

      expect(result.error).not.toBeUndefined();
    });

    it('should require landings to be an array', () => {
      const input = {
        ...valid,
        landings: 'hello'
      };

      const result = landingValidationSchema.validate(input);

      expect(result.error).not.toBeUndefined();
    });

    it('should require landings to be objects', () => {
      const input = {
        ...valid,
        landings: [1, 'hello']
      };

      const result = landingValidationSchema.validate(input);

      expect(result.error).not.toBeUndefined();
    });

    it('should allow an empty landings array', () => {
      const input = {
        ...valid,
        landings: []
      };

      const result = landingValidationSchema.validate(input);

      expect(result.error).toBeUndefined();
    });

    it('should not care about the properties in the landings objects', () => {
      const input = {
        ...valid,
        landings: [{x: 'x'}, {y: 1}, {z: true}, {}]
      };

      const result = landingValidationSchema.validate(input);

      expect(result.error).toBeUndefined();
    });

    it('should require products', () => {
      const input = {
        ...valid,
        products: undefined
      };

      const result = landingValidationSchema.validate(input);

      expect(result.error).not.toBeUndefined();
    });

    it('should require products to be an array', () => {
      const input = {
        ...valid,
        products: 'hello'
      };

      const result = landingValidationSchema.validate(input);

      expect(result.error).not.toBeUndefined();
    });

    it('should require products to be objects', () => {
      const input = {
        ...valid,
        products: [1, 'hello']
      };

      const result = landingValidationSchema.validate(input);

      expect(result.error).not.toBeUndefined();
    });

    it('should not care about the properties in the product objects', () => {
      const input = {
        ...valid,
        products: [{x: 'x'}, {y: 1}, {z: true}, {}]
      };

      const result = landingValidationSchema.validate(input);

      expect(result.error).toBeUndefined();
    });

    it('should allow an empty products array', () => {
      const input = {
        ...valid,
        products: []
      };

      const result = landingValidationSchema.validate(input);

      expect(result.error).toBeUndefined();
    });

    it('should require a landing limit', () => {
      const input = {
        ...valid,
        landingLimitDaysInFuture: undefined
      };

      const result = landingValidationSchema.validate(input);

      expect(result.error).not.toBeUndefined();
    });

    it('should require the landing limit to be a number', () => {
      const input = {
        ...valid,
        landingLimitDaysInFuture: 'hello'
      };

      const result = landingValidationSchema.validate(input);

      expect(result.error).not.toBeUndefined();
    });

    it('should not allow a negative landing limit', () => {
      const input = {
        ...valid,
        landingLimitDaysInFuture: -1
      };

      const result = landingValidationSchema.validate(input);

      expect(result.error).not.toBeUndefined();
    });

  });

});
