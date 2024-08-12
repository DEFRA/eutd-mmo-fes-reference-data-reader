import * as Controller from '../../src/controllers/dataHub';
import * as ReportPersistenceService from '../../src/landings/persistence/defraValidation'
import logger from '../../src/logger';
import { dataHubRoutes } from '../../src/handler/dataHub';
import * as Hapi from '@hapi/hapi';

let server;

beforeAll(async () => {
  server = Hapi.server({
    port: 9011,
    host: 'localhost'
  });

  dataHubRoutes(server);

  await server.initialize();
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

describe('data hub', () => {

  describe('routes', () => {

    let mockLoggerInfo;
    let mockLoggerError;

    beforeEach(() => {
      mockLoggerInfo = jest.spyOn(logger, 'info');
      mockLoggerError = jest.spyOn(logger, 'error');
    });

    afterEach(() => {
      mockLoggerInfo.mockRestore();
      mockLoggerError.mockRestore();
    });

    describe('GET /v1/data-hub/data', () => {

      let mockGetDefraValidationReport;

      beforeEach(() => {
        mockGetDefraValidationReport = jest.spyOn(ReportPersistenceService, 'getDefraValidationReportsCount');
      });

      afterEach(() => {
        mockGetDefraValidationReport.mockRestore();
      })

      it('will return status code of 200 if reports are found', async () => {
        const dummyData = {
          totalDefraValidationReports: 0,
          processedDefraValidationReports: 0,
          ccDefraValidationReports: 0,
          psDefraValidationReports: 0,
          sdDefraValidationReports: 0,
          unprocessedDefraValidationReports: 0,
          baseDefraValidationReports: 0
        };

        mockGetDefraValidationReport.mockResolvedValue(dummyData);

        const req = {
          method: 'GET',
          url: '/v1/data-hub/data',
        };

        const response = await server.inject(req);

        expect(mockGetDefraValidationReport).toHaveBeenCalledWith();
        expect(response.statusCode).toBe(200);
        expect(response.payload).toBe(JSON.stringify(dummyData));
        expect(mockLoggerInfo).toHaveBeenCalledWith('[DATA-HUB][GET-VALIDATION-REPORTS][SUCCESS]');
      });

      it('will return status code of 204 if no reports are found', async () => {
        mockGetDefraValidationReport.mockResolvedValue({});

        const req = {
          method: 'GET',
          url: '/v1/data-hub/data'
        };

        const response = await server.inject(req);

        expect(mockGetDefraValidationReport).toHaveBeenCalledWith();
        expect(response.statusCode).toBe(200);
        expect(response.payload).toBe('{}');
        expect(mockLoggerInfo).toHaveBeenCalledWith('[DATA-HUB][GET-VALIDATION-REPORTS][SUCCESS]');
      });

      it('will return a status code of 500 if any errors that are thrown', async () => {
        mockGetDefraValidationReport.mockRejectedValue('error');

        const req = {
          method: 'GET',
          url: '/v1/data-hub/data',
        };

        const response = await server.inject(req);

        expect(mockGetDefraValidationReport).toHaveBeenCalledWith();
        expect(mockLoggerError).toHaveBeenCalledWith('[DATA-HUB][GET-VALIDATION-REPORT][ERROR][error]');
        expect(response.statusCode).toBe(500);
      });
    });

    describe('POST /v1/data-hub/draft', () => {

      let mockReportDraft;

      beforeEach(() => {
        mockReportDraft = jest.spyOn(Controller, 'reportDraft');
      });

      afterEach(() => {
        mockReportDraft.mockRestore();
      });

      describe('will return 204 if', () => {

        it('the payload is valid and reportDraft returns ok', async () => {
          mockReportDraft.mockResolvedValue(null);

          const request = {
            method: 'POST',
            url: '/v1/data-hub/draft',
            payload: {
              certificateId: 'XXX'
            }
          };

          const response = await server.inject(request);

          expect(response.statusCode).toBe(204);
        });

      });

      describe('will return 400 if', () => {

        it('the payload is missing', async () => {
          const request = {
            method: 'POST',
            url: '/v1/data-hub/draft'
          };

          const response = await server.inject(request);

          expect(response.statusCode).toBe(400);
        });

        it('the payload doesnt contain a certificateId', async () => {
          const request = {
            method: 'POST',
            url: '/v1/data-hub/draft',
            payload: {
              cert: 'X'
            }
          };

          const response = await server.inject(request);

          expect(response.statusCode).toBe(400);
        });

        it('the certificateId is null', async () => {
          const request = {
            method: 'POST',
            url: '/v1/data-hub/draft',
            payload: {
              certificateId: null
            }
          };

          const response = await server.inject(request);

          expect(response.statusCode).toBe(400);
        });

        it('the certificateId is of the wrong data type', async () => {
          const request = {
            method: 'POST',
            url: '/v1/data-hub/draft',
            payload: {
              certificateId: 12
            }
          };

          const response = await server.inject(request);

          expect(response.statusCode).toBe(400);
        });

      });

      describe('will return 500 and log an error if', () => {

        it('an error is thrown', async () => {
          const error = new Error('error');
          mockReportDraft.mockImplementation(() => { throw error });

          const request = {
            method: 'POST',
            url: '/v1/data-hub/draft',
            payload: {
              certificateId: 'XXX'
            }
          };

          const response = await server.inject(request);

          expect(mockLoggerError).toHaveBeenCalledWith(`[DATA-HUB][CREATE-DRAFT][ERROR][${error}]`);
          expect(response.statusCode).toBe(500);
        });

      });

    });

    describe('POST /v1/data-hub/delete', () => {

      let mockReportDelete;

      beforeEach(() => {
        mockReportDelete = jest.spyOn(Controller, 'reportDelete');
      });

      afterEach(() => {
        mockReportDelete.mockRestore();
      });

      describe('will return status code of 204 if', () => {
        it('an acceptable payload is given', async () => {
          mockReportDelete.mockResolvedValue(null);

          const payload = {
            certificateId: 'GBR-34234-234234234',
          };

          const req = {
            method: 'POST',
            url: '/v1/data-hub/delete',
            payload: payload
          };

          const response = await server.inject(req);

          expect(response.statusCode).toBe(204);
          expect(mockReportDelete).toHaveBeenCalled();
          expect(mockLoggerInfo).toHaveBeenCalledWith('[DATA-HUB][DELETE-DOCUMENT][SUCCESS][GBR-34234-234234234]');
        });
      });

      describe('will return a status code of 400 if', () => {
        it('there is no payload', async () => {
          const req = {
            method: 'POST',
            url: '/v1/data-hub/delete'
          };

          const response = await server.inject(req);

          expect(response.statusCode).toBe(400);
          expect(mockReportDelete).not.toHaveBeenCalled();
        });

        it('certificateId is missing', async () => {

          const payload = {
            hello: 'hello'
          };
          const req = {
            method: 'POST',
            url: '/v1/data-hub/delete',
            payload: payload
          };

          const response = await server.inject(req);

          expect(response.statusCode).toBe(400);
          expect(mockReportDelete).not.toHaveBeenCalled();
        });
      });

      describe('will return a status code of 500 if', () => {
        it('any errors that are thrown', async () => {
          mockReportDelete.mockRejectedValue('error');

          const payload = {
            certificateId: 'GBR-34234-234234234',
          };

          const req = {
            method: 'POST',
            url: '/v1/data-hub/delete',
            payload: payload
          };

          const response = await server.inject(req);

          expect(response.statusCode).toBe(500);
          expect(mockReportDelete).toHaveBeenCalled();
          expect(mockLoggerError).toHaveBeenCalledWith('[DATA-HUB][DELETE-DOCUMENT][ERROR][error]');
        });
      });
    });

    describe('POST /v1/data-hub/void', () => {

      let mockReportVoid;

      beforeEach(() => {
        mockReportVoid = jest.spyOn(Controller, 'reportVoid');
      });

      afterEach(() => {
        mockReportVoid.mockRestore();
      });

      describe('will return status code of 204 if', () => {
        it('an acceptable payload is provided', async () => {
          mockReportVoid.mockResolvedValue(null);

          const payload = {
            certificateId: 'GBR-34234-234234234',
          };

          const req = {
            method: 'POST',
            url: '/v1/data-hub/void',
            payload: payload
          };

          const response = await server.inject(req);

          expect(response.statusCode).toBe(204);
          expect(mockReportVoid).toHaveBeenCalled();
          expect(mockLoggerInfo).toHaveBeenCalledWith('[DATA-HUB][VOID-DOCUMENT][SUCCESS][GBR-34234-234234234]');
        });
      });

      describe('will return a status code of 400 if', () => {
        it('there is no payload', async () => {
          const req = {
            method: 'POST',
            url: '/v1/data-hub/void'
          };

          const response = await server.inject(req);

          expect(response.statusCode).toBe(400);
          expect(mockReportVoid).not.toHaveBeenCalled();
        });

        it('the certificateId is missing', async () => {
          const payload = {
            hello: 'hello'
          };
          const req = {
            method: 'POST',
            url: '/v1/data-hub/void',
            payload: payload
          };

          const response = await server.inject(req);

          expect(response.statusCode).toBe(400);
          expect(mockReportVoid).not.toHaveBeenCalled();
        });
      });

      describe('will return a status code of 500 if', () => {
        it('any errors that are thrown', async () => {
          mockReportVoid.mockRejectedValue('error');

          const payload = {
            certificateId: 'GBR-34234-234234234',
          };

          const req = {
            method: 'POST',
            url: '/v1/data-hub/void',
            payload: payload
          };

          const response = await server.inject(req);

          expect(response.statusCode).toBe(500);
          expect(mockReportVoid).toHaveBeenCalled();
          expect(mockLoggerError).toHaveBeenCalledWith('[DATA-HUB][VOID-DOCUMENT][ERROR][error]');
        });
      });
    });

    describe('POST /v1/sdps/data-hub/submit', () => {

      let mockReportSdpsSubmitted;

      beforeEach(() => {
        mockReportSdpsSubmitted = jest.spyOn(Controller, 'reportSdPsSubmitted');
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should return 400 bad request if the request payload is empty', async () => {
        const req = {
          method: 'POST',
          url: '/v1/sdps/data-hub/submit',
          payload: null
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 bad request if the request payload doesnt contain a validationData property', async () => {
        const req = {
          method: 'POST',
          url: '/v1/sdps/data-hub/submit',
          payload: {
            test: 'test'
          }
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 bad request if validationData is the wrong data type', async () => {
        const req = {
          method: 'POST',
          url: '/v1/sdps/data-hub/submit',
          payload: {
            validationData: 'test'
          }
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 bad request if validationData is an empty array', async () => {
        const req = {
          method: 'POST',
          url: '/v1/sdps/data-hub/submit',
          payload: {
            validationData: []
          }
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(400);
      });

      it('should return 500 and log the error if mockReportVoid throws an error', async () => {
        const error = new Error('error');
        mockReportSdpsSubmitted.mockRejectedValue(error)

        const req = {
          method: 'POST',
          url: '/v1/sdps/data-hub/submit',
          payload: {
            validationData: [{
              documentNumber: 'X-PS-1'
            }]
          }
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(500);
        expect(mockLoggerError).toHaveBeenCalledWith(`[DATA-HUB][SUBMIT-DOCUMENT][SD-PS][ERROR][${error}]`);
      });

      it('should return 204 no content if everything succeeds', async () => {
        mockReportSdpsSubmitted.mockResolvedValue(null);

        const req = {
          method: 'POST',
          url: '/v1/sdps/data-hub/submit',
          payload: {
            validationData: [
              { documentNumber: 'X-PS-1' },
              { documentNumber: 'X-PS-2' }
            ]
          }
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(204);
        expect(mockLoggerInfo).toHaveBeenCalledWith('[DATA-HUB][SUBMIT-DOCUMENT][SD-PS][SUCCESS]');
      });

    });

    describe('POST /v1/catchcertificates/data-hub/submit', () => {

      let mockReportCcSubmitted;

      beforeEach(() => {
        mockReportCcSubmitted = jest.spyOn(Controller, 'reportCcSubmitted');
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should return 400 bad request if the request payload is empty', async () => {
        const req = {
          method: 'POST',
          url: '/v1/catchcertificates/data-hub/submit',
          payload: null
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 bad request if the request payload doesnt contain a validationData property', async () => {
        const req = {
          method: 'POST',
          url: '/v1/catchcertificates/data-hub/submit',
          payload: {
            test: 'test'
          }
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 bad request if validationData is the wrong data type', async () => {
        const req = {
          method: 'POST',
          url: '/v1/catchcertificates/data-hub/submit',
          payload: {
            validationData: 'test'
          }
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 bad request if validationData is an empty array', async () => {
        const req = {
          method: 'POST',
          url: '/v1/catchcertificates/data-hub/submit',
          payload: {
            validationData: []
          }
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(400);
      });

      it('should return 500 and log the error if insertDefraValidationReport throws an error', async () => {
        const error = new Error('error');
        mockReportCcSubmitted.mockRejectedValue(error)

        const req = {
          method: 'POST',
          url: '/v1/catchcertificates/data-hub/submit',
          payload: {
            validationData: [
              'one'
            ]
          }
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(500);
        expect(mockLoggerError).toHaveBeenCalledWith(`[DATA-HUB][SUBMIT-DOCUMENT][CC][ERROR][${error}]`);
      });

      it('should return 204 no content if everything succeeds', async () => {
        mockReportCcSubmitted.mockReturnValue(null);

        const req = {
          method: 'POST',
          url: '/v1/catchcertificates/data-hub/submit',
          payload: {
            validationData: [
              'one',
              'two'
            ]
          }
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(204);
        expect(mockLoggerInfo).toHaveBeenCalledWith('[DATA-HUB][SUBMIT-DOCUMENT][CC][SUCCESS]');
      });
    });

    describe('POST /v1/catchcertificates/data-hub/resubmit', () => {

      let mockResendCcToTrade;

      beforeEach(() => {
        mockResendCcToTrade = jest.spyOn(Controller, 'resendCcToTrade');
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should return 400 bad request if the request payload is empty', async () => {
        const req = {
          method: 'POST',
          url: '/v1/catchcertificates/data-hub/resubmit',
          payload: null
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 bad request if the request payload doesnt contain a validationData property', async () => {
        const req = {
          method: 'POST',
          url: '/v1/catchcertificates/data-hub/resubmit',
          payload: {
            test: 'test'
          }
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 bad request if validationData is the wrong data type', async () => {
        const req = {
          method: 'POST',
          url: '/v1/catchcertificates/data-hub/resubmit',
          payload: {
            validationData: 'test'
          }
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 bad request if validationData is an empty array', async () => {
        const req = {
          method: 'POST',
          url: '/v1/catchcertificates/data-hub/resubmit',
          payload: {
            validationData: []
          }
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(400);
      });

      it('should return 500 and log the error if insertDefraValidationReport throws an error', async () => {
        const error = new Error('error');
        mockResendCcToTrade.mockRejectedValue(error)

        const req = {
          method: 'POST',
          url: '/v1/catchcertificates/data-hub/resubmit',
          payload: {
            validationData: [
              'one'
            ]
          }
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(500);
        expect(mockLoggerError).toHaveBeenCalledWith(`[DATA-HUB][RESUBMIT-DOCUMENT][CC][ERROR][${error}]`);
      });

      it('should return 204 no content if everything succeeds', async () => {
        mockResendCcToTrade.mockReturnValue(null);

        const req = {
          method: 'POST',
          url: '/v1/catchcertificates/data-hub/resubmit',
          payload: {
            validationData: [
              'one',
              'two'
            ]
          }
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(204);
        expect(mockLoggerInfo).toHaveBeenCalledWith('[DATA-HUB][RESUBMIT-DOCUMENT][CC][SUCCESS]');
      });
    });

  });
});