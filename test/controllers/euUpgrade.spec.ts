import {
  processEuUpgradeCallback,
  toBackEndCatchSubmission,
  ICatchStatus,
} from '../../src/controllers/euUpgrade';
import {
  BoomiService,
  IEuUpgradeResponse,
} from 'mmo-shared-reference-data';
import { updateCertificateEuCatchStatus } from '../../src/landings/persistence/catchCert';
import logger from '../../src/logger';

jest.mock('mmo-shared-reference-data');
jest.mock('../../src/landings/persistence/catchCert');
jest.mock('../../src/logger');

describe('EU Upgrade Controller (FI0-10355 Scenario 3)', () => {
  let mockProcessEuUpgradeCallback: jest.SpyInstance;
  let mockUpdateCertificateStatus: jest.SpyInstance;
  let mockLoggerInfo: jest.SpyInstance;
  let mockLoggerError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProcessEuUpgradeCallback = jest.spyOn(
      BoomiService,
      'processEuUpgradeCallback',
    );
    mockUpdateCertificateStatus = updateCertificateEuCatchStatus as jest.Mock;
    mockLoggerInfo = logger.info as jest.Mock;
    mockLoggerError = logger.error as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processEuUpgradeCallback', () => {
    it('should successfully process a SUCCESS callback', async () => {
      const callbackData = {
        Envelope: {
          Header: {
            Message: {
              severity: 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'request-id-123',
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
                  ReasonInformation: 'Message has been successfully processed',
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
                    ID: 'EU.CATCH.CC.0123456789',
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
        documentNumber: 'GBR-2023-CC-TEST123',
        euCatchStatus: 'SUCCESS',
        euCatchReferenceNumber: 'EU.CATCH.CC.0123456789',
        euCatchStatusCode: '70',
        euCatchStatusName: 'Issued (Validated)',
        euCatchUri:
          'https://webgate.acceptance.ec.europa.eu/tracesnt-beta/certificate/catch-certificate/GBR-2023-CC-TEST123',
        euCatchTimestamp: '2025-11-21T10:00:00Z',
        reasonInformation: 'Message has been successfully processed',
        requestId: 'request-id-123',
      };

      mockProcessEuUpgradeCallback.mockReturnValueOnce(mockSuccessResponse);
      mockUpdateCertificateStatus.mockResolvedValueOnce({});

      await processEuUpgradeCallback(callbackData);

      expect(mockProcessEuUpgradeCallback).toHaveBeenCalledWith(callbackData);
      expect(mockUpdateCertificateStatus).toHaveBeenCalledWith(
        'GBR-2023-CC-TEST123',
        {
          documentNumber: 'GBR-2023-CC-TEST123',
          euCatchReferenceNumber: 'EU.CATCH.CC.0123456789',
          euCatchStatus: 'SUCCESS',
          euCatchStatusCode: '70',
          euCatchStatusName: 'Issued (Validated)',
          euCatchUri: 'https://webgate.acceptance.ec.europa.eu/tracesnt-beta/certificate/catch-certificate/GBR-2023-CC-TEST123',
          euCatchTimestamp: '2025-11-21T10:00:00Z',
          reasonInformation: 'Message has been successfully processed',
          requestId: 'request-id-123',
        },
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('[EU-UPGRADE][CALLBACK][SUCCESS]'),
      );
    });

    it('should successfully process a FAILURE callback with error message', async () => {
      const callbackData = {
        Envelope: {
          Header: {
            Message: {
              severity: 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'request-id-456',
            },
          },
          Body: {
            Fault: {
              faultcode: 'S:Client',
              faultstring: 'Some business rules are not met',
              fesDocNumber: 'GBR-2023-CC-TEST123',
              detail: {
                BusinessRulesValidationException: {
                  Error: [
                    {
                      ID: 'SPS-CONSIGNOR-NOT-FOUND',
                      Message: {
                        languageID: 'en',
                        text: 'ID not found or not compatible',
                      },
                      Field: {
                        languageID: 'en',
                        text: '/SPSCertificate/SPSConsignment/ConsignorSPSParty',
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
        documentNumber: 'GBR-2023-CC-TEST123',
        faultCode: 'S:Client',
        faultString: 'Some business rules are not met',
        validationErrors: [
          {
            errorId: 'SPS-CONSIGNOR-NOT-FOUND',
            errorMessage: 'ID not found or not compatible',
            errorField: '/SPSCertificate/SPSConsignment/ConsignorSPSParty',
          },
        ],
        requestId: 'request-id-456',
      };

      mockProcessEuUpgradeCallback.mockReturnValueOnce(mockFailureResponse);
      mockUpdateCertificateStatus.mockResolvedValueOnce({});

      await processEuUpgradeCallback(callbackData);

      expect(mockUpdateCertificateStatus).toHaveBeenCalledWith(
        'GBR-2023-CC-TEST123',
        {
          euCatchStatus: 'FAILURE',
          documentNumber: 'GBR-2023-CC-TEST123',
          faultCode: 'S:Client',
          faultString: 'Some business rules are not met',
          validationErrors: [
            {
              errorId: 'SPS-CONSIGNOR-NOT-FOUND',
              errorMessage: 'ID not found or not compatible',
              errorField: '/SPSCertificate/SPSConsignment/ConsignorSPSParty',
            },
          ],
          requestId: 'request-id-456',
        },
      );
    });

    it('should handle validation errors from shared service', async () => {
      const callbackData = {
        Envelope: {
          Header: {
            Message: {
              severity: 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'request-id-error',
            },
          },
          Body: {}, // Invalid body structure
        },
      };

      mockProcessEuUpgradeCallback.mockImplementationOnce(() => {
        throw new Error(
          'Unknown callback payload structure - neither success nor fault response',
        )
      });

      await expect(processEuUpgradeCallback(callbackData)).rejects.toThrow();
      expect(mockLoggerError).toHaveBeenCalled();
    });

    it('should handle database update errors', async () => {
      const callbackData = {
        Envelope: {
          Header: {
            Message: {
              severity: 'debugging',
              ID: 'WS_REQUEST_ID',
              Message: 'request-id-db-error',
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
                    ID: 'EU.CC.CATCH.0123456789',
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
        requestId: 'request-id-db-error',
      };

      mockProcessEuUpgradeCallback.mockResolvedValueOnce(mockSuccessResponse);
      mockUpdateCertificateStatus.mockRejectedValueOnce(
        new Error('Database error'),
      );

      await expect(processEuUpgradeCallback(callbackData)).rejects.toThrow(
        'Database error',
      );
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('toBackEndCatchSubmission', () => {
    describe('IEuUpgradeResponse transformation', () => {
      it('should transform SUCCESS response with all fields', () => {
        const euUpgradeData: IEuUpgradeResponse = {
          documentNumber: 'GBR-2023-CC-TEST123',
          euCatchStatus: 'SUCCESS',
          euCatchReferenceNumber: 'EU.CATCH.CC.0123456789',
          euCatchStatusCode: '70',
          euCatchStatusName: 'Issued (Validated)',
          euCatchUri: 'https://example.com/cert',
          euCatchTimestamp: '2025-11-21T10:00:00Z',
          reasonInformation: 'Message processed successfully',
          faultCode: '',
          faultString: '',
          validationErrors: [
            {
              errorId: 'ERR-001',
              errorMessage: 'Test error message',
              errorField: '/field/path',
            },
          ],
        };

        const result: ICatchStatus = toBackEndCatchSubmission(euUpgradeData);

        expect(result).toEqual({
          status: 'SUCCESS',
          reference: 'EU.CATCH.CC.0123456789',
          code: '70',
          name: 'Issued (Validated)',
          uri: 'https://example.com/cert',
          timestamp: '2025-11-21T10:00:00Z',
          reasonInformation: 'Message processed successfully',
          faultCode: '',
          faultString: '',
          validationErrors: [
            {
              id: 'ERR-001',
              message: 'Test error message',
              field: '/field/path',
            },
          ],
        });
      });

      it('should transform FAILURE response with validation errors', () => {
        const euUpgradeData: IEuUpgradeResponse = {
          documentNumber: 'GBR-2023-CC-TEST456',
          euCatchStatus: 'FAILURE',
          euCatchReferenceNumber: '',
          euCatchStatusCode: '',
          euCatchStatusName: '',
          euCatchUri: '',
          euCatchTimestamp: '',
          reasonInformation: 'Validation failed',
          faultCode: 'S:Client',
          faultString: 'Business rules not met',
          validationErrors: [
            {
              errorId: 'SPS-CONSIGNOR-NOT-FOUND',
              errorMessage: 'ID not found',
              errorField: '/SPSCertificate/SPSConsignment',
            },
            {
              errorId: 'SPS-INVALID-DATE',
              errorMessage: 'Invalid date format',
              errorField: '/SPSCertificate/IssueDateTime',
            },
          ],
        };

        const result: ICatchStatus = toBackEndCatchSubmission(euUpgradeData);

        expect(result).toEqual({
          status: 'FAILURE',
          reference: '',
          code: '',
          name: '',
          uri: '',
          timestamp: '',
          reasonInformation: 'Validation failed',
          faultCode: 'S:Client',
          faultString: 'Business rules not met',
          validationErrors: [
            {
              id: 'SPS-CONSIGNOR-NOT-FOUND',
              message: 'ID not found',
              field: '/SPSCertificate/SPSConsignment',
            },
            {
              id: 'SPS-INVALID-DATE',
              message: 'Invalid date format',
              field: '/SPSCertificate/IssueDateTime',
            },
          ],
        });
      });

      it('should transform IN_PROGRESS response', () => {
        const euUpgradeData: IEuUpgradeResponse = {
          documentNumber: 'GBR-2023-CC-TEST789',
          euCatchStatus: 'IN_PROGRESS',
          euCatchStatusMessage: 'Catch certificate is being retried'
        };

        const result: ICatchStatus = toBackEndCatchSubmission(euUpgradeData);

        expect(result).toEqual({
          status: 'IN_PROGRESS',
          message: 'Catch certificate is being retried'
        });
      });

      it('should handle empty validationErrors array', () => {
        const euUpgradeData: IEuUpgradeResponse = {
          documentNumber: 'GBR-2023-CC-TEST000',
          euCatchStatus: 'SUCCESS',
          euCatchReferenceNumber: 'EU.CATCH.CC.0000',
          euCatchStatusCode: '70',
          euCatchStatusName: 'Issued',
          euCatchUri: 'https://example.com/cert000',
          euCatchTimestamp: '2025-11-21T10:00:00Z',
          reasonInformation: 'Success',
          faultCode: '',
          faultString: '',
          validationErrors: [],
        };

        const result: ICatchStatus = toBackEndCatchSubmission(euUpgradeData);

        expect(result.validationErrors).toEqual([]);
        expect(result.status).toBe('SUCCESS');
      });
    });

    describe('ICatchApiResponse transformation', () => {
      it('should transform SUCCESS ICatchApiResponse', () => {
        const catchApiData: IEuUpgradeResponse = {
          documentNumber: 'GBR-2023-CC-TEST000',
          euCatchStatus: 'SUCCESS',
          reasonInformation: 'Successfully submitted to Boomi',
        };

        const result: ICatchStatus = toBackEndCatchSubmission(catchApiData);

        expect(result).toEqual({
          status: 'SUCCESS',
          reasonInformation: 'Successfully submitted to Boomi',
        });
      });

      it('should transform FAILURE ICatchApiResponse', () => {
        const catchApiData: IEuUpgradeResponse = {
          documentNumber: 'GBR-2023-CC-TEST000',
          euCatchStatus: 'FAILURE',
          reasonInformation: 'Failed to submit to Boomi',
        };

        const result: ICatchStatus = toBackEndCatchSubmission(catchApiData);

        expect(result).toEqual({
          status: 'FAILURE',
          reasonInformation: 'Failed to submit to Boomi',
        });
      });

      it('should transform ICatchApiResponse with undefined statusMessage', () => {
        const catchApiData: IEuUpgradeResponse = {
          euCatchStatus: 'SUCCESS',
          euCatchStatusMessage: undefined,
          documentNumber: 'GBR-CC-2025-TEST000'
        };

        const result: ICatchStatus = toBackEndCatchSubmission(catchApiData);

        expect(result).toEqual({
          status: 'SUCCESS',
          reasonInformation: undefined,
        });
      });

      it('should transform ICatchApiResponse with empty statusMessage', () => {
        const catchApiData: IEuUpgradeResponse = {
          euCatchStatus: 'IN_PROGRESS',
          reasonInformation: '',
          documentNumber: 'GBR-CC-2025-TEST000'
        };

        const result: ICatchStatus = toBackEndCatchSubmission(catchApiData);

        expect(result).toEqual({
          status: 'IN_PROGRESS',
          reasonInformation: '',
        });
      });
    });
  });
});
