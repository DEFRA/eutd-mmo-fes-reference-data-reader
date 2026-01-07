import * as Hapi from '@hapi/hapi';
import * as Joi from 'joi';
import * as EuUpgrade from '../../src/handler/euUpgrade';
import * as Controller from '../../src/controllers/euUpgrade';
import logger from '../../src/logger';

jest.mock('../../src/controllers/euUpgrade');
jest.mock('../../src/logger');

describe('EU Upgrade Handler (FI0-10355 Scenario 3)', () => {
  let mockProcessEuUpgradeCallback: jest.SpyInstance;
  let server: Hapi.Server;

  beforeAll(async () => {
    server = Hapi.server({
      port: 9010,
      host: 'localhost',
    });

    EuUpgrade.euUpgradeRoutes(server);

    server.validator(Joi);

    await server.initialize();
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessEuUpgradeCallback = jest.spyOn(
      Controller,
      'processEuUpgradeCallback',
    );
  });

  describe('POST /v1/eu-upgrade', () => {
    it('should successfully process EU upgrade callback with success response', async () => {
      const payload = {
        Envelope: {
          Header: {
            Message: {
              severity: 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'test-request-123',
            },
          },
          Body: {
            SubmitCatchResponse: {
              SPSAcknowledgement: {
                SPSAcknowledgementDocument: {
                  IssueDateTime: {
                    DateTime: '2025-11-21T10:00:00Z',
                  },
                  StatusCode: {
                    name: 'Issued (Validated)',
                    value: '70',
                  },
                  ReasonInformation: 'Successfully processed',
                  fesDocNumber: 'GBR-2023-CC-TEST123',
                  ReferenceSPSReferencedDocument: {
                    TypeCode: {
                      name: 'Certificate (Catch Certificate)',
                      value: '16',
                    },
                    RelationshipTypeCode: {
                      name: 'Document reference, internal',
                      value: 'CAW',
                    },
                    ID: 'GBR-2023-CC-TEST123',
                    AttachmentBinaryObject: {
                      format: 'url',
                      mimeCode: 'text/url',
                      uri: 'https://webgate.acceptance.ec.europa.eu/tracesnt-beta/certificate/catch-certificate/GBR-2023-CC-TEST123',
                    },
                  },
                },
              },
            },
          },
        },
      };

      const mockSuccessResponse = {
        euCatchStatus: "SUCCESS",
        certificateId: 'GBR-2023-CC-TEST123',
        euCatchStatusCode: '70',
        euCatchStatusName: 'Issued (Validated)',
        euCatchUri:
          'https://webgate.acceptance.ec.europa.eu/tracesnt-beta/certificate/catch-certificate/GBR-2023-CC-TEST123',
        euCatchTimestamp: '2025-11-21T10:00:00Z',
        reasonInformation: 'Successfully processed',
        requestId: 'test-request-123',
      };

      mockProcessEuUpgradeCallback.mockResolvedValueOnce(mockSuccessResponse);

      const response = await server.inject({
        method: 'POST',
        url: '/v1/eu-upgrade',
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(mockProcessEuUpgradeCallback).toHaveBeenCalledWith(payload);
    });

    it('should successfully process EU upgrade callback with failure response', async () => {
      const payload = {
        Envelope: {
          Header: {
            Message: {
              severity: 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'test-request-failure',
            },
          },
          Body: {
            Fault: {
              faultcode: 'SOAP-ENV:Server',
              faultstring: 'Validation failed',
              fesDocNumber: 'GBR-2023-CC-TEST123',
              detail: {
                BusinessRulesValidationException: {
                  Error: [
                    {
                      ID: 'ERROR_001',
                      Message: {
                        languageID: 'en',
                        text: 'Invalid certificate number',
                      },
                      Field: {
                        languageID: 'en',
                        text: 'certificateId',
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      };

      const mockFailureResponse = {
        euCatchStatus: 'FAILURE',
        faultCode: 'SOAP-ENV:Server',
        faultString: 'Validation failed',
        validationErrors: [
          {
            id: 'ERROR_001',
            message: 'Invalid certificate number',
            field: 'certificateId',
          },
        ],
        requestId: 'test-request-failure',
      };

      mockProcessEuUpgradeCallback.mockResolvedValueOnce(mockFailureResponse);

      const response = await server.inject({
        method: 'POST',
        url: '/v1/eu-upgrade',
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(mockProcessEuUpgradeCallback).toHaveBeenCalledWith(payload);
    });

    it('should return 500 when processing throws an error', async () => {
      const payload = {
        Envelope: {
          Header: {
            Message: {
              severity: 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'test-request-error',
            },
          },
          Body: {
            SubmitCatchResponse: {
              SPSAcknowledgement: {
                SPSAcknowledgementDocument: {
                  IssueDateTime: { DateTime: '2025-11-21T10:00:00Z' },
                  StatusCode: { name: 'Issued', value: '70' },
                  ReasonInformation: 'Processed',
                  fesDocNumber: 'GBR-2023-CC-TEST123',
                  ReferenceSPSReferencedDocument: {
                    TypeCode: { name: 'Certificate', value: '16' },
                    RelationshipTypeCode: {
                      name: 'Document reference',
                      value: 'CAW',
                    },
                    ID: 'EU.CATCH.CC.0123456789',
                    AttachmentBinaryObject: {
                      format: 'url',
                      mimeCode: 'text/url',
                      uri: 'https://example.com/cert',
                    },
                  },
                },
              },
            },
          },
        },
      };

      mockProcessEuUpgradeCallback.mockRejectedValueOnce(
        new Error('Database connection error'),
      );

      const response = await server.inject({
        method: 'POST',
        url: '/v1/eu-upgrade',
        payload,
      });

      expect(response.statusCode).toBe(500);
      expect(mockProcessEuUpgradeCallback).toHaveBeenCalledWith(payload);
      expect(logger.error).toHaveBeenCalledWith(
        '[EU-UPGRADE][ENDPOINT][ERROR][REQUEST-ID:test-request-error][Database connection error]',
      );
    });

    it('should validate required fields in payload', async () => {
      const payload = {
        Envelope: {
          Header: {
            Message: {
              severity: 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'test-request-validation',
            },
          },
          // Missing Body
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/eu-upgrade',
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(mockProcessEuUpgradeCallback).not.toHaveBeenCalled();
    });

    it('should validate envelope structure', async () => {
      const payload = {
        // Missing Envelope
        data: 'invalid',
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/eu-upgrade',
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(mockProcessEuUpgradeCallback).not.toHaveBeenCalled();
    });

    it('should validate missing Header in Envelope', async () => {
      const payload = {
        Envelope: {
          // Missing Header
          Body: {
            SubmitCatchResponse: {
              SPSAcknowledgement: {
                SPSAcknowledgementDocument: {
                  IssueDateTime: { DateTime: '2025-11-21T10:00:00Z' },
                  StatusCode: { name: 'Issued', value: '70' },
                  ReasonInformation: 'Processed',
                  ReferenceSPSReferencedDocument: {
                    TypeCode: { name: 'Certificate', value: '16' },
                    RelationshipTypeCode: {
                      name: 'Document reference',
                      value: 'CAW',
                    },
                    ID: 'GBR-2023-CC-TEST123',
                    AttachmentBinaryObject: {
                      format: 'url',
                      mimeCode: 'text/url',
                      uri: 'https://example.com/cert',
                    },
                  },
                },
              },
            },
          },
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/eu-upgrade',
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(mockProcessEuUpgradeCallback).not.toHaveBeenCalled();
    });

    it('should validate missing Message in Header', async () => {
      const payload = {
        Envelope: {
          Header: {
            // Missing Message
          },
          Body: {
            SubmitCatchResponse: {
              SPSAcknowledgement: {
                SPSAcknowledgementDocument: {
                  IssueDateTime: { DateTime: '2025-11-21T10:00:00Z' },
                  StatusCode: { name: 'Issued', value: '70' },
                  ReasonInformation: 'Processed',
                  ReferenceSPSReferencedDocument: {
                    TypeCode: { name: 'Certificate', value: '16' },
                    RelationshipTypeCode: {
                      name: 'Document reference',
                      value: 'CAW',
                    },
                    ID: 'GBR-2023-CC-TEST123',
                    AttachmentBinaryObject: {
                      format: 'url',
                      mimeCode: 'text/url',
                      uri: 'https://example.com/cert',
                    },
                  },
                },
              },
            },
          },
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/eu-upgrade',
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(mockProcessEuUpgradeCallback).not.toHaveBeenCalled();
    });

    it('should validate Body has either SubmitCatchResponse or Fault, not both', async () => {
      const payload = {
        Envelope: {
          Header: {
            Message: {
              severity: 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'test-request-both',
            },
          },
          Body: {
            SubmitCatchResponse: {
              SPSAcknowledgement: {
                SPSAcknowledgementDocument: {
                  IssueDateTime: { DateTime: '2025-11-21T10:00:00Z' },
                  StatusCode: { name: 'Issued', value: '70' },
                  ReasonInformation: 'Processed',
                  ReferenceSPSReferencedDocument: {
                    TypeCode: { name: 'Certificate', value: '16' },
                    RelationshipTypeCode: {
                      name: 'Document reference',
                      value: 'CAW',
                    },
                    ID: 'GBR-2023-CC-TEST123',
                    AttachmentBinaryObject: {
                      format: 'url',
                      mimeCode: 'text/url',
                      uri: 'https://example.com/cert',
                    },
                  },
                },
              },
            },
            Fault: {
              faultcode: 'SOAP-ENV:Server',
              faultstring: 'Error',
              detail: {
                BusinessRulesValidationException: {
                  Error: [
                    {
                      ID: 'ERROR_001',
                      Message: { languageID: 'en', text: 'Error message' },
                      Field: { languageID: 'en', text: 'field' },
                    },
                  ],
                },
              },
            },
          },
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/eu-upgrade',
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(mockProcessEuUpgradeCallback).not.toHaveBeenCalled();
    });

    it('should validate Body has at least one of SubmitCatchResponse or Fault', async () => {
      const payload = {
        Envelope: {
          Header: {
            Message: {
              severity: 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'test-request-neither',
            },
          },
          Body: {
            // Neither SubmitCatchResponse nor Fault
          },
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/eu-upgrade',
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(mockProcessEuUpgradeCallback).not.toHaveBeenCalled();
    });

    it('should validate Fault structure when present', async () => {
      const payload = {
        Envelope: {
          Header: {
            Message: {
              severity: 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'test-request-invalid-fault',
            },
          },
          Body: {
            Fault: {
              faultcode: 'SOAP-ENV:Server',
              // Missing faultstring
              detail: {
                BusinessRulesValidationException: {
                  Error: [
                    {
                      ID: 'ERROR_001',
                      Message: { languageID: 'en', text: 'Error message' },
                      Field: { languageID: 'en', text: 'field' },
                    },
                  ],
                },
              },
            },
          },
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/eu-upgrade',
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(mockProcessEuUpgradeCallback).not.toHaveBeenCalled();
    });

    it('should validate SubmitCatchResponse structure when present', async () => {
      const payload = {
        Envelope: {
          Header: {
            Message: {
              severity: 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'test-request-invalid-response',
            },
          },
          Body: {
            SubmitCatchResponse: {
              SPSAcknowledgement: {
                SPSAcknowledgementDocument: {
                  IssueDateTime: { DateTime: '2025-11-21T10:00:00Z' },
                  StatusCode: { name: 'Issued', value: '70' },
                  // Missing ReasonInformation
                  ReferenceSPSReferencedDocument: {
                    TypeCode: { name: 'Certificate', value: '16' },
                    RelationshipTypeCode: {
                      name: 'Document reference',
                      value: 'CAW',
                    },
                    ID: 'GBR-2023-CC-TEST123',
                    AttachmentBinaryObject: {
                      format: 'url',
                      mimeCode: 'text/url',
                      uri: 'https://example.com/cert',
                    },
                  },
                },
              },
            },
          },
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/eu-upgrade',
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(mockProcessEuUpgradeCallback).not.toHaveBeenCalled();
    });

    it('should allow optional Security field in Header', async () => {
      const payload = {
        Envelope: {
          Header: {
            Message: {
              severity: 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'test-request-with-security',
            },
            Security: {
              TimestampType: {
                Created: '2025-11-21T10:00:00Z',
                Expires: '2025-11-21T11:00:00Z',
              },
            },
          },
          Body: {
            SubmitCatchResponse: {
              SPSAcknowledgement: {
                SPSAcknowledgementDocument: {
                  IssueDateTime: { DateTime: '2025-11-21T10:00:00Z' },
                  StatusCode: { name: 'Issued', value: '70' },
                  ReasonInformation: 'Processed',
                  fesDocNumber: 'GBR-2023-CC-TEST123',
                  ReferenceSPSReferencedDocument: {
                    TypeCode: { name: 'Certificate', value: '16' },
                    RelationshipTypeCode: {
                      name: 'Document reference',
                      value: 'CAW',
                    },
                    ID: 'EU.CATCH.2023.CC',
                    AttachmentBinaryObject: {
                      format: 'url',
                      mimeCode: 'text/url',
                      uri: 'https://example.com/cert',
                    },
                  },
                },
              },
            },
          },
        },
      };

      const mockSuccessResponse = {
        success: true,
        certificateId: 'GBR-2023-CC-TEST123',
        euCatchStatusCode: '70',
        euCatchStatusName: 'Issued',
        euCatchUri: 'https://example.com/cert',
        euCatchTimestamp: '2025-11-21T10:00:00Z',
        reasonInformation: 'Processed',
        requestId: 'test-request-with-security',
      };

      mockProcessEuUpgradeCallback.mockResolvedValueOnce(mockSuccessResponse);

      const response = await server.inject({
        method: 'POST',
        url: '/v1/eu-upgrade',
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(mockProcessEuUpgradeCallback).toHaveBeenCalledWith(payload);
    });

    it('should validate Error array in Fault has at least one item', async () => {
      const payload = {
        Envelope: {
          Header: {
            Message: {
              severity: 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'test-request-empty-errors',
            },
          },
          Body: {
            Fault: {
              faultcode: 'SOAP-ENV:Server',
              faultstring: 'Validation failed',
              detail: {
                BusinessRulesValidationException: {
                  Error: [], // Empty array should fail validation
                },
              },
            },
          },
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/eu-upgrade',
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(mockProcessEuUpgradeCallback).not.toHaveBeenCalled();
    });

    it('should allow empty string in Field.text for Fault errors', async () => {
      const payload = {
        Envelope: {
          Header: {
            Message: {
              severity: 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'test-request-empty-field',
            },
          },
          Body: {
            Fault: {
              faultcode: 'SOAP-ENV:Server',
              faultstring: 'General validation error',
              fesDocNumber: 'GBR-2025-CC-0123456789',
              detail: {
                BusinessRulesValidationException: {
                  Error: [
                    {
                      ID: 'ERROR_001',
                      Message: {
                        languageID: 'en',
                        text: 'General error',
                      },
                      Field: {
                        languageID: 'en',
                        text: '', // Empty string should be allowed
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      };

      const mockFailureResponse = {
        success: false,
        faultCode: 'SOAP-ENV:Server',
        faultString: 'General validation error',
        validationErrors: [
          {
            id: 'ERROR_001',
            message: 'General error',
            field: '',
          },
        ],
        requestId: 'test-request-empty-field',
      };

      mockProcessEuUpgradeCallback.mockResolvedValueOnce(mockFailureResponse);

      const response = await server.inject({
        method: 'POST',
        url: '/v1/eu-upgrade',
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(mockProcessEuUpgradeCallback).toHaveBeenCalledWith(payload);
    });

    it('should have auth disabled for the endpoint', async () => {
      const routes = server.table();
      const euUpgradeRoute = routes.find(
        (r) => r.path === '/v1/eu-upgrade' && r.method === 'post',
      );

      expect(euUpgradeRoute).toBeDefined();
      expect(euUpgradeRoute?.settings.auth).toBe(false);
    });

    it('should have correct tags on the endpoint', async () => {
      const routes = server.table();
      const euUpgradeRoute = routes.find(
        (r) => r.path === '/v1/eu-upgrade' && r.method === 'post',
      );

      expect(euUpgradeRoute).toBeDefined();
      expect(euUpgradeRoute?.settings.tags).toEqual([
        'api',
        'eu-upgrade',
        'catch',
      ]);
    });

    it('should have correct description on the endpoint', async () => {
      const routes = server.table();
      const euUpgradeRoute = routes.find(
        (r) => r.path === '/v1/eu-upgrade' && r.method === 'post',
      );

      expect(euUpgradeRoute).toBeDefined();
      expect(euUpgradeRoute?.settings.description).toBe(
        'Receive EU CATCH status callbacks from BOOMI',
      );
    });
  });
});
