import { submitDocumentToBoomi } from '../../src/controllers/catchSubmission';
import { BoomiService } from 'mmo-shared-reference-data';
import logger from '../../src/logger';
import CatchCertificateTransformerService from '../../src/services/catch-certificate-transformer.service';
import ProcessingStatementTransformerService from '../../src/services/processing-statement-transformer.service';
import { getCertificateByDocumentNumberWithNumberOfFailedAttempts } from '../../src/landings/persistence/catchCert';

jest.mock('mmo-shared-reference-data');
jest.mock('../../src/logger');
jest.mock('../../src/services/catch-certificate-transformer.service');
jest.mock('../../src/services/processing-statement-transformer.service');
jest.mock('../../src/landings/persistence/catchCert');

describe('CATCH Submission Controller (FI0-10312)', () => {
  let mockSendDocumentToBoomi: jest.SpyInstance;
  let mockLoggerInfo: jest.SpyInstance;
  let mockLoggerError: jest.SpyInstance;
  let mockGenerateCatchPayload: jest.SpyInstance;
  let mockGenerateVoidCatchPayload: jest.SpyInstance;
  let mockGetCertificate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSendDocumentToBoomi = jest.spyOn(BoomiService, 'sendDocumentToBoomi');
    mockLoggerInfo = logger.info as jest.Mock;
    mockLoggerError = logger.error as jest.Mock;
    mockGenerateCatchPayload = jest.spyOn(CatchCertificateTransformerService, 'generateCatchPayload');
    mockGenerateVoidCatchPayload = jest.spyOn(CatchCertificateTransformerService, 'generateVoidCatchPayload');
    mockGetCertificate = getCertificateByDocumentNumberWithNumberOfFailedAttempts as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('submitDocumentToBoomi - Catch Certificate', () => {
    // Simplified payload from orchestration (only documentNumber and operation)
    const mockRawPayload = {
      documentNumber: 'GBR-2025-CC-TEST123',
      operation: 'submit' as 'submit' | 'void',
    };

    // Mock certificate data from database
    const mockCertificateFromDB = {
      documentNumber: 'GBR-2025-CC-TEST123',
      status: 'COMPLETE',
      createdAt: '2025-01-05T16:59:29.190Z',
      exportData: {
        products: [
          {
            product: {
              commodityCode: '03025100',
              scientificName: 'Oncorhynchus mykiss',
              state: 'FRO',
              presentation: 'WHL',
            },
            caughtBy: [
              {
                vessel: { vesselName: 'Test Vessel' },
                faoArea: 'FAO27',
                dateLanded: '2025-05-20',
                exportWeight: 100,
              },
            ],
          },
        ],
        exporterDetails: {
          exporterFullName: 'Test Exporter Ltd',
          exporterCompanyName: 'Test Company',
          addressOne: 'Test Address',
          townCity: 'Test City',
          postcode: 'TE5 T12',
        },
        transportation: {
          vehicle: 'truck',
          cmr: 'CMR123',
          departurePlace: 'Test Port',
        },
        conservation: {
          conservationReference: 'CR123',
          user_id: 'test-user',
        },
      },
      catchSubmission: {
        status: "SUCCESS",
        reference: "CATCH.CC.GB.2026.0000006",
        uri: "https://webgate.acceptance.ec.europa.eu/tracesnt/certificate/catch-certificate/CATCH.CC.GB.2026.0000006",
        timestamp: "2026-01-06T16:09:16.982+01:00",
        reasonInformation: "Message has been successfully processed"
      }
    };

    // Transformed UN/CEFACT payload
    const mockTransformedPayload = {
      CreateCatchCertificateRequest: {
        SPSCertificate: {
          SPSExchangedDocument: {
            Name: {
              languageID: 'en',
              value: 'Catch Certificate',
            },
            ID: {
              schemeAgencyID: 'agency',
              value: 'GBR-2025-CC-TEST123',
            },
            TypeCode: {
              name: 'CATCH_CERTIFICATE',
              value: '16',
            },
          },
          SPSConsignment: {
            ConsignorSPSParty: {
              ID: { value: 'GB-1666' },
              Name: { languageID: 'en', value: 'Test Exporter' },
            },
          },
        },
      },
    };

    it('should successfully submit certificate to CATCH API', async () => {
      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Accepted for processing',
      };

      mockGetCertificate.mockResolvedValueOnce(mockCertificateFromDB);
      mockGenerateCatchPayload.mockReturnValueOnce(mockTransformedPayload);
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(mockRawPayload);

      expect(mockGetCertificate).toHaveBeenCalledWith(
        mockRawPayload.documentNumber,
        'catchCert'
      );

      expect(mockGenerateCatchPayload).toHaveBeenCalledWith(
        mockRawPayload.documentNumber,
        '2025-01-05T16:59:29.190Z',
        mockCertificateFromDB.exportData
      );

      expect(mockSendDocumentToBoomi).toHaveBeenCalledWith(
        mockTransformedPayload,
        { documentType: "CATCHCERTIFICATE" },
        'catchSubmit'
      );

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('[DOCUMENT-SUBMISSION]')
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('[FETCHING-DATA]')
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('[TRANSFORMING-CC-TO-UN-CEFACT]')
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('[SUCCESS]')
      );
    });

    it('should use catchVoid resourceType for void operation', async () => {
      const voidPayload = { ...mockRawPayload, operation: 'void' as const };
      const mockVoidPayload = {
        CancelCatchCertificateRequest: {
          SPSCertificate: {
            ID: {
              value: 'GBR-2025-CC-TEST123'
            }
          }
        }
      };
      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Certificate voided successfully',
      };

      mockGetCertificate.mockResolvedValueOnce(mockCertificateFromDB);
      mockGenerateVoidCatchPayload.mockReturnValueOnce(mockVoidPayload);
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(voidPayload);

      expect(mockGenerateVoidCatchPayload).toHaveBeenCalledWith('CATCH.CC.GB.2026.0000006');
      expect(mockSendDocumentToBoomi).toHaveBeenCalledWith(
        mockVoidPayload,
        { documentType: "CATCHCERTIFICATE" },
        'catchVoid'
      );
    });

    it('should handle certificate not found error', async () => {
      mockGetCertificate.mockResolvedValueOnce(null);

      await expect(submitDocumentToBoomi(mockRawPayload)).rejects.toThrow(
        'Document not found for document number: GBR-2025-CC-TEST123'
      );

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('[DOCUMENT-SUBMISSION][FETCH-DATA]')
      );
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]')
      );
    });

    it('should handle missing exportData error', async () => {
      const certificateWithoutExportData = {
        ...mockCertificateFromDB,
        exportData: null,
      };

      mockGetCertificate.mockResolvedValueOnce(certificateWithoutExportData);

      await expect(submitDocumentToBoomi(mockRawPayload)).rejects.toThrow(
        'No exportData found for document number: GBR-2025-CC-TEST123'
      );

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]')
      );
    });

    it('should handle CATCH API errors', async () => {
      mockGetCertificate.mockResolvedValueOnce(mockCertificateFromDB);
      mockGenerateCatchPayload.mockReturnValueOnce(mockTransformedPayload);
      mockSendDocumentToBoomi.mockRejectedValueOnce(
        new Error('CATCH API error: 500 - Internal Server Error')
      );

      await expect(submitDocumentToBoomi(mockRawPayload)).rejects.toThrow(
        'CATCH API error: 500 - Internal Server Error'
      );

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]')
      );
    });

    it('should handle OAuth token errors', async () => {
      mockGetCertificate.mockResolvedValueOnce(mockCertificateFromDB);
      mockGenerateCatchPayload.mockReturnValueOnce(mockTransformedPayload);
      mockSendDocumentToBoomi.mockRejectedValueOnce(
        new Error('Failed to get catchSubmit OAuth token')
      );

      await expect(submitDocumentToBoomi(mockRawPayload)).rejects.toThrow(
        'Failed to get catchSubmit OAuth token'
      );
    });

    it('should handle transformation errors', async () => {
      const error = new Error('Transformation failed: Invalid payload structure');
      mockGetCertificate.mockResolvedValueOnce(mockCertificateFromDB);
      mockGenerateCatchPayload.mockImplementation(() => {
        throw error;
      });

      await expect(submitDocumentToBoomi(mockRawPayload)).rejects.toThrow(error);

      expect(mockLoggerError).toHaveBeenCalled();
    });

    it('should handle payload with missing document number', async () => {
      const invalidPayload: any = {
        ...mockRawPayload,
        documentNumber: undefined,
      };

      mockGetCertificate.mockResolvedValueOnce(mockCertificateFromDB);
      mockGenerateCatchPayload.mockReturnValueOnce(mockTransformedPayload);

      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Accepted for processing',
      };

      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(invalidPayload);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('[UNKNOWN]')
      );
    });

    it('should handle database errors', async () => {
      mockGetCertificate.mockRejectedValueOnce(
        new Error('Database connection error')
      );

      await expect(submitDocumentToBoomi(mockRawPayload)).rejects.toThrow(
        'Database connection error'
      );
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error: Connection refused');
      mockGetCertificate.mockResolvedValueOnce(mockCertificateFromDB);
      mockGenerateCatchPayload.mockReturnValueOnce(mockTransformedPayload);
      mockSendDocumentToBoomi.mockRejectedValue(error);

      await expect(submitDocumentToBoomi(mockRawPayload)).rejects.toThrow(error);

      expect(mockLoggerError).toHaveBeenCalled();
    });

    it('should log all submission steps', async () => {
      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Accepted for processing',
      };

      mockGetCertificate.mockResolvedValueOnce(mockCertificateFromDB);
      mockGenerateCatchPayload.mockReturnValueOnce(mockTransformedPayload);
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(mockRawPayload);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('[DOCUMENT-SUBMISSION][GBR-2025-CC-TEST123][START]')
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('[FETCHING-DATA]')
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('[DATA-EXTRACTED]')
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('[TRANSFORMING-CC-TO-UN-CEFACT]')
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('[SUCCESS]')
      );
    });
  });

  describe('submitDocumentToBoomi - Processing Statement (FI0-10647)', () => {
    let mockGenerateProcessingStatementPayload: jest.SpyInstance;

    beforeEach(() => {
      mockGenerateProcessingStatementPayload = jest.spyOn(
        ProcessingStatementTransformerService,
        'generateProcessingStatementPayload'
      );
    });

    const mockPSPayload = {
      documentNumber: 'GBR-2025-PS-TEST123',
      operation: 'submit' as 'submit' | 'void',
    };

    const mockTransformedPSPayload = {
      CreateCatchProcessingStatementRequest: {
        SPSCertificate: {
          SPSExchangedDocument: {
            Name: {
              languageID: 'en',
              value: 'Processing Statement',
            },
            ID: {
              value: 'GBR-2025-PS-TEST123',
            },
          },
        },
      },
    };

    it('should block submission with description-only products', async () => {
      const mockCertificateWithDescriptionOnlyProduct = {
        documentNumber: 'GBR-2025-PS-TEST123',
        status: 'COMPLETE',
        createdAt: new Date('2025-01-05T16:59:29.190Z'),
        exportData: {
          products: [
            {
              description: 'Product description only',
              // No catches array
            },
            {
              productDescription: 'Another description',
              // No caughtBy array
            },
          ],
          catches: [],
          exporterDetails: {
            exporterFullName: 'Test Exporter',
          },
        },
      };

      mockGetCertificate.mockResolvedValueOnce(
        mockCertificateWithDescriptionOnlyProduct
      );

      await expect(submitDocumentToBoomi(mockPSPayload)).rejects.toThrow(
        'PROCESSING_STATEMENT_PRODUCT_DETAILS_REQUIRED'
      );

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('[PS][VALIDATION][DESCRIPTION-ONLY-PRODUCTS][COUNT:2]')
      );
    });

    it('should allow submission with valid products that have catches', async () => {
      const mockCertificateWithValidProducts = {
        documentNumber: 'GBR-2025-PS-TEST123',
        status: 'COMPLETE',
        createdAt: new Date('2025-01-05T16:59:29.190Z'),
        exportData: {
          products: [
            {
              description: 'Product with catches',
              catches: [
                {
                  species: 'Atlantic Cod',
                  catchCertificateNumber: 'GBR-2024-CC-123',
                },
              ],
            },
          ],
          catches: [],
          exporterDetails: {
            exporterFullName: 'Test Exporter',
          },
        },
      };

      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Accepted for processing',
      };

      mockGetCertificate.mockResolvedValueOnce(
        mockCertificateWithValidProducts
      );
      mockGenerateProcessingStatementPayload.mockReturnValueOnce(
        mockTransformedPSPayload
      );
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(mockPSPayload);

      expect(mockGenerateProcessingStatementPayload).toHaveBeenCalled();
      expect(mockSendDocumentToBoomi).toHaveBeenCalledWith(
        mockTransformedPSPayload,
        { documentType: 'PROCESSINGSTATEMENT' },
        'catchSubmit'
      );
    });

    it('should allow submission with products that have caughtBy array', async () => {
      const mockCertificateWithCaughtBy = {
        documentNumber: 'GBR-2025-PS-TEST123',
        status: 'COMPLETE',
        createdAt: new Date('2025-01-05T16:59:29.190Z'),
        exportData: {
          products: [
            {
              description: 'Product with caughtBy',
              caughtBy: [
                {
                  species: 'Pacific Cod',
                  catchCertificateNumber: 'GBR-2024-CC-456',
                },
              ],
            },
          ],
          catches: [],
          exporterDetails: {
            exporterFullName: 'Test Exporter',
          },
        },
      };

      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Accepted for processing',
      };

      mockGetCertificate.mockResolvedValueOnce(mockCertificateWithCaughtBy);
      mockGenerateProcessingStatementPayload.mockReturnValueOnce(
        mockTransformedPSPayload
      );
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(mockPSPayload);

      expect(mockGenerateProcessingStatementPayload).toHaveBeenCalled();
      expect(mockSendDocumentToBoomi).toHaveBeenCalled();
    });

    it('should block mixed products with one description-only product', async () => {
      const mockCertificateWithMixedProducts = {
        documentNumber: 'GBR-2025-PS-TEST123',
        status: 'COMPLETE',
        createdAt: new Date('2025-01-05T16:59:29.190Z'),
        exportData: {
          products: [
            {
              description: 'Valid product',
              catches: [
                {
                  species: 'Atlantic Cod',
                  catchCertificateNumber: 'GBR-2024-CC-123',
                },
              ],
            },
            {
              description: 'Description only product',
              // No catches
            },
          ],
          catches: [],
          exporterDetails: {
            exporterFullName: 'Test Exporter',
          },
        },
      };

      mockGetCertificate.mockResolvedValueOnce(
        mockCertificateWithMixedProducts
      );

      await expect(submitDocumentToBoomi(mockPSPayload)).rejects.toThrow(
        'PROCESSING_STATEMENT_PRODUCT_DETAILS_REQUIRED'
      );

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('[PS][VALIDATION][DESCRIPTION-ONLY-PRODUCTS][COUNT:1]')
      );
    });

    it('should allow empty products array', async () => {
      const mockCertificateWithEmptyProducts = {
        documentNumber: 'GBR-2025-PS-TEST123',
        status: 'COMPLETE',
        createdAt: new Date('2025-01-05T16:59:29.190Z'),
        exportData: {
          products: [],
          catches: [],
          exporterDetails: {
            exporterFullName: 'Test Exporter',
          },
        },
      };

      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Accepted for processing',
      };

      mockGetCertificate.mockResolvedValueOnce(
        mockCertificateWithEmptyProducts
      );
      mockGenerateProcessingStatementPayload.mockReturnValueOnce(
        mockTransformedPSPayload
      );
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(mockPSPayload);

      expect(mockGenerateProcessingStatementPayload).toHaveBeenCalled();
    });

    it('should block product with consignmentDescription only', async () => {
      const mockCertificateWithConsignmentDescription = {
        documentNumber: 'GBR-2025-PS-TEST123',
        status: 'COMPLETE',
        createdAt: new Date('2025-01-05T16:59:29.190Z'),
        exportData: {
          products: [
            {
              consignmentDescription: 'This is a consignment description',
              // No catches or caughtBy
            },
          ],
          catches: [],
          exporterDetails: {
            exporterFullName: 'Test Exporter',
          },
        },
      };

      mockGetCertificate.mockResolvedValueOnce(
        mockCertificateWithConsignmentDescription
      );

      await expect(submitDocumentToBoomi(mockPSPayload)).rejects.toThrow(
        'PROCESSING_STATEMENT_PRODUCT_DETAILS_REQUIRED'
      );

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('[PS][VALIDATION][DESCRIPTION-ONLY-PRODUCTS][COUNT:1]')
      );
    });

    it('should handle product with empty catches array as description-only', async () => {
      const mockCertificateWithEmptyCatches = {
        documentNumber: 'GBR-2025-PS-TEST123',
        status: 'COMPLETE',
        createdAt: new Date('2025-01-05T16:59:29.190Z'),
        exportData: {
          products: [
            {
              description: 'Product with empty catches',
              catches: [], // Empty array should be treated as no catches
            },
          ],
          catches: [],
          exporterDetails: {
            exporterFullName: 'Test Exporter',
          },
        },
      };

      mockGetCertificate.mockResolvedValueOnce(
        mockCertificateWithEmptyCatches
      );

      await expect(submitDocumentToBoomi(mockPSPayload)).rejects.toThrow(
        'PROCESSING_STATEMENT_PRODUCT_DETAILS_REQUIRED'
      );
    });

    it('should handle product with empty caughtBy array as description-only', async () => {
      const mockCertificateWithEmptyCaughtBy = {
        documentNumber: 'GBR-2025-PS-TEST123',
        status: 'COMPLETE',
        createdAt: new Date('2025-01-05T16:59:29.190Z'),
        exportData: {
          products: [
            {
              productDescription: 'Product with empty caughtBy',
              caughtBy: [], // Empty array
            },
          ],
          catches: [],
          exporterDetails: {
            exporterFullName: 'Test Exporter',
          },
        },
      };

      mockGetCertificate.mockResolvedValueOnce(
        mockCertificateWithEmptyCaughtBy
      );

      await expect(submitDocumentToBoomi(mockPSPayload)).rejects.toThrow(
        'PROCESSING_STATEMENT_PRODUCT_DETAILS_REQUIRED'
      );
    });

    it('should handle null or undefined product objects gracefully', async () => {
      const mockCertificateWithNullProduct = {
        documentNumber: 'GBR-2025-PS-TEST123',
        status: 'COMPLETE',
        createdAt: new Date('2025-01-05T16:59:29.190Z'),
        exportData: {
          products: [null, undefined],
          catches: [],
          exporterDetails: {
            exporterFullName: 'Test Exporter',
          },
        },
      };

      mockGetCertificate.mockResolvedValueOnce(
        mockCertificateWithNullProduct
      );

      await expect(submitDocumentToBoomi(mockPSPayload)).rejects.toThrow(
        'PROCESSING_STATEMENT_PRODUCT_DETAILS_REQUIRED'
      );
    });

    it('should handle product with whitespace-only description as description-only', async () => {
      const mockCertificateWithWhitespaceDescription = {
        documentNumber: 'GBR-2025-PS-TEST123',
        status: 'COMPLETE',
        createdAt: new Date('2025-01-05T16:59:29.190Z'),
        exportData: {
          products: [
            {
              description: '   ', // Only whitespace
              // No catches
            },
          ],
          catches: [],
          exporterDetails: {
            exporterFullName: 'Test Exporter',
          },
        },
      };

      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Accepted for processing',
      };

      mockGetCertificate.mockResolvedValueOnce(
        mockCertificateWithWhitespaceDescription
      );
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      // Whitespace-only description is treated as no description, so should be allowed
      await expect(submitDocumentToBoomi(mockPSPayload)).resolves.not.toThrow();
    });

    it('should allow product with no description but has catches', async () => {
      const mockCertificateWithNoCatchesButDescription = {
        documentNumber: 'GBR-2025-PS-TEST123',
        status: 'COMPLETE',
        createdAt: new Date('2025-01-05T16:59:29.190Z'),
        exportData: {
          products: [
            {
              // No description fields at all
              catches: [
                {
                  species: 'Atlantic Cod',
                  catchCertificateNumber: 'GBR-2024-CC-123',
                },
              ],
            },
          ],
          catches: [],
          exporterDetails: {
            exporterFullName: 'Test Exporter',
          },
        },
      };

      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Accepted for processing',
      };

      mockGetCertificate.mockResolvedValueOnce(
        mockCertificateWithNoCatchesButDescription
      );
      mockGenerateProcessingStatementPayload.mockReturnValueOnce(
        mockTransformedPSPayload
      );
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(mockPSPayload);

      expect(mockGenerateProcessingStatementPayload).toHaveBeenCalled();
      expect(mockSendDocumentToBoomi).toHaveBeenCalled();
    });
  });
});
