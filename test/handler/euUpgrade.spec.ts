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
    mockProcessEuUpgradeCallback = jest.spyOn(
      Controller,
      'processEuUpgradeCallback',
    );
  });

  afterEach(() => {
    mockProcessEuUpgradeCallback.mockRestore();
  });

  describe('POST /v1/eu-upgrade', () => {
    it('should successfully process EU upgrade callback with success response from no security', async () => {
      const payload = {
        Envelope: {
          Header: {
            Message: {
              ID: "WS_REQUEST_ID",
              Message: "5360c8a1-0a95-4758-af18-78e4f09a5342"
            }
          },
          Body: {
            SubmitCatchResponse: {
              SPSAcknowledgement: {
                SPSAcknowledgementDocument: {
                  IssueDateTime: {
                    DateTime: "2026-01-07T15:56:26.311+01:00"
                  },
                  StatusCode: {
                    "@name": "Issued (Validated)",
                    text: "70"
                  },
                  ReasonInformation: "Message has been successfully processed",
                  fesDocNumber: "GBR-2026-CC-3530192AB",
                  ReferenceSPSReferencedDocument: [
                    {
                      TypeCode: {
                        "@name": "Certificate (Catch Certificate)",
                        text: "16"
                      },
                      RelationshipTypeCode: {
                        "@name": "Document reference, internal (Document reference, internal)",
                        text: "CAW"
                      },
                      ID: {
                        text: "CATCH.CC.GB.2026.0000021"
                      },
                      AttachmentBinaryObject: {
                        "@format": "url",
                        "@mimeCode": "text/url",
                        "@uri": "https://webgate.acceptance.ec.europa.eu/tracesnt/certificate/catch-certificate/CATCH.CC.GB.2026.0000021"
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      };

      const mockSuccessResponse = {
        euCatchStatus: 'SUCCESS',
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

    it('should successfully process EU upgrade callback with success response', async () => {
      const payload = {
        Envelope: {
          Header: {
            Message: {
              "@severity": "debugging",
              "@xmlns": "http://ec.europa.eu/sanco/tracesnt/message/v1",
              ID: "WS_REQUEST_ID",
              Message: "eb9dc56a-a8df-44b7-9a02-2d03ecec748d"
            },
            Security: {
              "@xmlns:ns1": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd",
              "@xmlns:ns2": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd",
              TimestampType: {
                Created: "2025-10-06T16:50:40.447+02:00",
                Expires: "2025-10-06T16:50:45.447+02:00"
              }
            }
          },
          Body: {
            SubmitCatchResponse: {
              "@xmlns": "http://ec.europa.eu/tracesnt/certificate/catch/submission/v1",
              SPSAcknowledgement: {
                SPSAcknowledgementDocument: {
                  IssueDateTime: {
                    DateTime: "2025-10-06T16:50:38.944+02:00"
                  },
                  StatusCode: {
                    "@name": "Issued (Validated)",
                    text: "70"
                  },
                  ReasonInformation: "Message has been successfully processed",
                  fesDocNumber: 'GBR-2023-CC-TEST123',
                  ReferenceSPSReferencedDocument: [
                    {
                      TypeCode: {
                        "@name": "Goods control certificate (Catch Processing Statement)",
                        text: "841"
                      },
                      RelationshipTypeCode: {
                        "@name": "Document reference, internal (Document reference, internal)",
                        text: "CAW"
                      },
                      ID: {
                        "@schemeAgencyID": "GB",
                        text: "110632"
                      },
                      AttachmentBinaryObject: {
                        "@format": "url",
                        "@mimeCode": "text/url",
                        "@uri": "https://webgate.acceptance.ec.europa.eu/tracesnt-beta/certificate/catch-certificate/processing-statement/CATCH.PS.GB.2025.0000069"
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      };

      const mockSuccessResponse = {
        euCatchStatus: 'SUCCESS',
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
              severity: "debugging",
              ID: "WS_REQUEST_ID",
              Message: "b62c0a35-839f-4d90-b745-4bbb8ab0f384"
            }
          },
          Body: {
            Fault: {
              faultcode: "S:Client",
              faultstring: "Some business rules are not met",
              fesDocNumber: "GBR-2026-CC-3530192AB",
              detail: {
                BusinessRulesValidationException: {
                  Error: [
                    {
                      ID: "SPS-CONSIGNOR-NOT-FOUND",
                      Message: {
                        languageID: "en",
                        text: "ID not found or not compatible"
                      },
                      Field: {
                        languageID: "en",
                        text: "/SPSCertificate/SPSConsignment/ConsignorSPSParty"
                      }
                    },
                    {
                      ID: "CATCH-WS-020",
                      Message: {
                        languageID: "en",
                        text: "[en] catch.ws.invalid.vessel.fishing.gear.found"
                      },
                      Field: {
                        languageID: "en",
                        text: ""
                      }
                    }
                  ]
                }
              }
            }
          }
        }
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

    it('should successfully process EU upgrade callback with 200 response', async () => {
      const payload = {
        Envelope: {
          Body: {
            Fault: {
              faultcode: "S:Client",
              faultstring: "Some business rules are not met",
              fesDocNumber: "GBR-2026-CC-474F089E0",
              detail: {
                BusinessRulesValidationException: {
                  Error: [
                    {
                      ID: "CATCH-CONSIGNMENT-VERIFICATION-201",
                      Message: {
                        languageID: "en",
                        text: " Document number - Document number is taken: this catch certificate or processing statement already exists in CATCH. Follow the \"re-use workflow\"."
                      },
                      Field: {
                        languageID: "en"
                      }
                    }
                  ]
                }
              }
            }
          }
        }
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

      expect(response.payload).toBe('');
      expect(response.statusCode).toBe(200);
      expect(mockProcessEuUpgradeCallback).toHaveBeenCalledWith(payload);
    });

    it('should return 500 when processing throws an error', async () => {
      const payload = {
        Envelope: {
          Header: {
            Message: {
              '@severity': 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'test-request-error',
            },
          },
          Body: {
            SubmitCatchResponse: {
              SPSAcknowledgement: {
                SPSAcknowledgementDocument: {
                  IssueDateTime: { DateTime: '2025-11-21T10:00:00Z' },
                  StatusCode: { '@name': 'Issued', text: '70' },
                  ReasonInformation: 'Processed',
                  fesDocNumber: 'GBR-2023-CC-TEST123',
                  ReferenceSPSReferencedDocument: [{
                    TypeCode: { '@name': 'Certificate', text: '16' },
                    RelationshipTypeCode: {
                      '@name': 'Document reference',
                      text: 'CAW',
                    },
                    ID: { "@schemeAgencyID": "GB", text: 'EU.CATCH.CC.0123456789' },
                    AttachmentBinaryObject: {
                      "@format": 'url',
                      "@mimeCode": 'text/url',
                      "@uri": 'https://example.com/cert',
                    },
                  }]
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
        '[EU-UPGRADE][ENDPOINT][ERROR][Database connection error]',
      );
    });

    it('should validate required fields in payload', async () => {
      const payload = {
        Envelope: {
          Header: {
            Message: {
              "@severity": "debugging",
              "@xmlns": "http://ec.europa.eu/sanco/tracesnt/message/v1",
              ID: "WS_REQUEST_ID",
              Message: "eb9dc56a-a8df-44b7-9a02-2d03ecec748d"
            },
            Security: {
              "@xmlns:ns1": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd",
              "@xmlns:ns2": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd",
              TimestampType: {
                Created: "2025-10-06T16:50:40.447+02:00",
                Expires: "2025-10-06T16:50:45.447+02:00"
              }
            }
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
              "@xmlns": "http://ec.europa.eu/tracesnt/certificate/catch/submission/v1",
              SPSAcknowledgement: {
                SPSAcknowledgementDocument: {
                  IssueDateTime: {
                    DateTime: "2025-10-06T16:50:38.944+02:00"
                  },
                  StatusCode: {
                    "@name": "Issued (Validated)",
                    text: "70"
                  },
                  ReasonInformation: "Message has been successfully processed",
                  ReferenceSPSReferencedDocument: [
                    {
                      TypeCode: {
                        "@name": "Goods control certificate (Catch Processing Statement)",
                        text: "841"
                      },
                      RelationshipTypeCode: {
                        "@name": "Document reference, internal (Document reference, internal)",
                        text: "CAW"
                      },
                      ID: {
                        "@schemeAgencyID": "GB",
                        text: "110632"
                      },
                      AttachmentBinaryObject: {
                        "@format": "url",
                        "@mimeCode": "text/url",
                        "@uri": "https://webgate.acceptance.ec.europa.eu/tracesnt-beta/certificate/catch-certificate/processing-statement/CATCH.PS.GB.2025.0000069"
                      }
                    }
                  ]
                }
              }
            }
          }
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
              "@xmlns": "http://ec.europa.eu/tracesnt/certificate/catch/submission/v1",
              SPSAcknowledgement: {
                SPSAcknowledgementDocument: {
                  IssueDateTime: {
                    DateTime: "2025-10-06T16:50:38.944+02:00"
                  },
                  StatusCode: {
                    "@name": "Issued (Validated)",
                    text: "70"
                  },
                  ReasonInformation: "Message has been successfully processed",
                  ReferenceSPSReferencedDocument: [
                    {
                      TypeCode: {
                        "@name": "Goods control certificate (Catch Processing Statement)",
                        text: "841"
                      },
                      RelationshipTypeCode: {
                        "@name": "Document reference, internal (Document reference, internal)",
                        text: "CAW"
                      },
                      ID: {
                        "@schemeAgencyID": "GB",
                        text: "110632"
                      },
                      AttachmentBinaryObject: {
                        "@format": "url",
                        "@mimeCode": "text/url",
                        "@uri": "https://webgate.acceptance.ec.europa.eu/tracesnt-beta/certificate/catch-certificate/processing-statement/CATCH.PS.GB.2025.0000069"
                      }
                    }
                  ]
                }
              }
            }
          }
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
              "@severity": "debugging",
              "@xmlns": "http://ec.europa.eu/sanco/tracesnt/message/v1",
              ID: "WS_REQUEST_ID",
              Message: "eb9dc56a-a8df-44b7-9a02-2d03ecec748d"
            },
            Security: {
              "@xmlns:ns1": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd",
              "@xmlns:ns2": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd",
              TimestampType: {
                Created: "2025-10-06T16:50:40.447+02:00",
                Expires: "2025-10-06T16:50:45.447+02:00"
              }
            }
          },
          Body: {
            SubmitCatchResponse: {
              "@xmlns": "http://ec.europa.eu/tracesnt/certificate/catch/submission/v1",
              SPSAcknowledgement: {
                SPSAcknowledgementDocument: {
                  IssueDateTime: {
                    DateTime: "2025-10-06T16:50:38.944+02:00"
                  },
                  StatusCode: {
                    "@name": "Issued (Validated)",
                    text: "70"
                  },
                  ReasonInformation: "Message has been successfully processed",
                  ReferenceSPSReferencedDocument: [
                    {
                      TypeCode: {
                        "@name": "Goods control certificate (Catch Processing Statement)",
                        text: "841"
                      },
                      RelationshipTypeCode: {
                        "@name": "Document reference, internal (Document reference, internal)",
                        text: "CAW"
                      },
                      ID: {
                        "@schemeAgencyID": "GB",
                        text: "110632"
                      },
                      AttachmentBinaryObject: {
                        "@format": "url",
                        "@mimeCode": "text/url",
                        "@uri": "https://webgate.acceptance.ec.europa.eu/tracesnt-beta/certificate/catch-certificate/processing-statement/CATCH.PS.GB.2025.0000069"
                      }
                    }
                  ]
                }
              }
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
              "@severity": "debugging",
              "@xmlns": "http://ec.europa.eu/sanco/tracesnt/message/v1",
              ID: "WS_REQUEST_ID",
              Message: "eb9dc56a-a8df-44b7-9a02-2d03ecec748d"
            },
            Security: {
              "@xmlns:ns1": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd",
              "@xmlns:ns2": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd",
              TimestampType: {
                Created: "2025-10-06T16:50:40.447+02:00",
                Expires: "2025-10-06T16:50:45.447+02:00"
              }
            }
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
              "@xmlns": "http://ec.europa.eu/tracesnt/certificate/catch/submission/v1",
              SPSAcknowledgement: {
                SPSAcknowledgementDocument: {
                  IssueDateTime: {
                    DateTime: "2025-10-06T16:50:38.944+02:00"
                  },
                  StatusCode: {
                    "@name": "Issued (Validated)",
                    text: "70"
                  },
                  ReasonInformation: "Message has been successfully processed",
                  ReferenceSPSReferencedDocument: [
                    {
                      TypeCode: {
                        "@name": "Goods control certificate (Catch Processing Statement)",
                        text: "841"
                      },
                      RelationshipTypeCode: {
                        "@name": "Document reference, internal (Document reference, internal)",
                        text: "CAW"
                      },
                      ID: {
                        "@schemeAgencyID": "GB",
                        text: "110632"
                      },
                      AttachmentBinaryObject: {
                        "@format": "url",
                        "@mimeCode": "text/url",
                        "@uri": "https://webgate.acceptance.ec.europa.eu/tracesnt-beta/certificate/catch-certificate/processing-statement/CATCH.PS.GB.2025.0000069"
                      }
                    }
                  ]
                }
              }
            }
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
              "@severity": "debugging",
              "@xmlns": "http://ec.europa.eu/sanco/tracesnt/message/v1",
              ID: "WS_REQUEST_ID",
              Message: "eb9dc56a-a8df-44b7-9a02-2d03ecec748d"
            },
            Security: {
              "@xmlns:ns1": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd",
              "@xmlns:ns2": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd",
              TimestampType: {
                Created: "2025-10-06T16:50:40.447+02:00",
                Expires: "2025-10-06T16:50:45.447+02:00"
              }
            }
          },
          Body: {
            SubmitCatchResponse: {
              "@xmlns": "http://ec.europa.eu/tracesnt/certificate/catch/submission/v1",
              SPSAcknowledgement: {
                SPSAcknowledgementDocument: {
                  IssueDateTime: {
                    DateTime: "2025-10-06T16:50:38.944+02:00"
                  },
                  StatusCode: {
                    "@name": "Issued (Validated)",
                    text: "70"
                  },
                  fesDocNumber: "GBR-2023-CC-TEST123",
                  ReasonInformation: "Message has been successfully processed",
                  ReferenceSPSReferencedDocument: [
                    {
                      TypeCode: {
                        "@name": "Goods control certificate (Catch Processing Statement)",
                        text: "841"
                      },
                      RelationshipTypeCode: {
                        "@name": "Document reference, internal (Document reference, internal)",
                        text: "CAW"
                      },
                      ID: {
                        "@schemeAgencyID": "GB",
                        text: "110632"
                      },
                      AttachmentBinaryObject: {
                        "@format": "url",
                        "@mimeCode": "text/url",
                        "@uri": "https://webgate.acceptance.ec.europa.eu/tracesnt-beta/certificate/catch-certificate/processing-statement/CATCH.PS.GB.2025.0000069"
                      }
                    }
                  ]
                }
              }
            }
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
              "@severity": "debugging",
              "@xmlns": "http://ec.europa.eu/sanco/tracesnt/message/v1",
              ID: "WS_REQUEST_ID",
              Message: "eb9dc56a-a8df-44b7-9a02-2d03ecec748d"
            },
            Security: {
              "@xmlns:ns1": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd",
              "@xmlns:ns2": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd",
              TimestampType: {
                Created: "2025-10-06T16:50:40.447+02:00",
                Expires: "2025-10-06T16:50:45.447+02:00"
              }
            }
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
              '@severity': 'debugging',
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

    it('should return 404 when certificate is not found', async () => {
      const payload = {
        Envelope: {
          Header: {
            Message: {
              '@severity': 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'test-request-not-found',
            },
          },
          Body: {
            SubmitCatchResponse: {
              SPSAcknowledgement: {
                SPSAcknowledgementDocument: {
                  IssueDateTime: { DateTime: '2025-11-21T10:00:00Z' },
                  StatusCode: { '@name': 'Issued', text: '70' },
                  ReasonInformation: 'Processed',
                  fesDocNumber: 'GBR-2023-CC-NOTFOUND',
                  ReferenceSPSReferencedDocument: [{
                    TypeCode: { '@name': 'Certificate', text: '16' },
                    RelationshipTypeCode: {
                      '@name': 'Document reference',
                      text: 'CAW',
                    },
                    ID: { "@schemeAgencyID": "GB", text: 'EU.CATCH.CC.NOTFOUND' },
                    AttachmentBinaryObject: {
                      "@format": 'url',
                      "@mimeCode": 'text/url',
                      "@uri": 'https://example.com/cert',
                    },
                  }]
                },
              },
            },
          },
        },
      };

      mockProcessEuUpgradeCallback.mockRejectedValueOnce(
        new Error('Certificate not found: GBR-2023-CC-NOTFOUND'),
      );

      const response = await server.inject({
        method: 'POST',
        url: '/v1/eu-upgrade',
        payload,
      });

      expect(response.statusCode).toBe(404);
      expect(response.result).toEqual({ error: 'Certificate not found' });
      expect(mockProcessEuUpgradeCallback).toHaveBeenCalledWith(payload);
      expect(logger.error).toHaveBeenCalledWith(
        '[EU-UPGRADE][ENDPOINT][ERROR][REQUEST-ID:test-request-not-found][Certificate not found: GBR-2023-CC-NOTFOUND]',
      );
    });

    it('should return 500 for internal server errors', async () => {
      const payload = {
        Envelope: {
          Header: {
            Message: {
              '@severity': 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'test-request-server-error',
            },
          },
          Body: {
            SubmitCatchResponse: {
              SPSAcknowledgement: {
                SPSAcknowledgementDocument: {
                  IssueDateTime: { DateTime: '2025-11-21T10:00:00Z' },
                  StatusCode: { '@name': 'Issued', text: '70' },
                  ReasonInformation: 'Processed',
                  fesDocNumber: 'GBR-2023-CC-TEST123',
                  ReferenceSPSReferencedDocument: [{
                    TypeCode: { '@name': 'Certificate', text: '16' },
                    RelationshipTypeCode: {
                      '@name': 'Document reference',
                      text: 'CAW',
                    },
                    ID: { "@schemeAgencyID": "GB", text: 'EU.CATCH.CC.0123456789' },
                    AttachmentBinaryObject: {
                      "@format": 'url',
                      "@mimeCode": 'text/url',
                      "@uri": 'https://example.com/cert',
                    },
                  }]
                },
              },
            },
          },
        },
      };

      mockProcessEuUpgradeCallback.mockRejectedValueOnce(
        new Error('Unexpected database error'),
      );

      const response = await server.inject({
        method: 'POST',
        url: '/v1/eu-upgrade',
        payload,
      });

      expect(response.statusCode).toBe(500);
      expect(mockProcessEuUpgradeCallback).toHaveBeenCalledWith(payload);
      expect(logger.error).toHaveBeenCalledWith(
        '[EU-UPGRADE][ENDPOINT][ERROR][REQUEST-ID:test-request-server-error][Unexpected database error]',
      );
    });
  });
});
