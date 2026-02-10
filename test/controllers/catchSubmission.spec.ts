import { submitDocumentToBoomi } from '../../src/controllers/catchSubmission';
import { BoomiService } from 'mmo-shared-reference-data';
import logger from '../../src/logger';
import CatchCertificateTransformerService from '../../src/services/catch-certificate-transformer.service';
import ProcessingStatementTransformerService from '../../src/services/processing-statement-transformer.service';
import StorageNotesTransformerService from '../../src/services/storage-notes-transformer.service';
import { DocumentModel } from '../../src/landings/types/document';
import { updateCertificateEuCatchStatus } from '../../src/landings/persistence/catchCert';

jest.mock('mmo-shared-reference-data');
jest.mock('../../src/logger');
jest.mock('../../src/services/catch-certificate-transformer.service');
jest.mock('../../src/services/processing-statement-transformer.service');
jest.mock('../../src/services/storage-notes-transformer.service');
jest.mock('../../src/landings/types/document');
jest.mock('../../src/landings/persistence/catchCert');

describe('CATCH Submission Controller (FI0-10312)', () => {
  let mockSendDocumentToBoomi: jest.SpyInstance;
  let mockLoggerInfo: jest.SpyInstance;
  let mockLoggerError: jest.SpyInstance;
  let mockGenerateCatchPayload: jest.SpyInstance;
  let mockFindOne: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSendDocumentToBoomi = jest.spyOn(BoomiService, 'sendDocumentToBoomi');
    mockLoggerInfo = logger.info as jest.Mock;
    mockLoggerError = logger.error as jest.Mock;
    mockGenerateCatchPayload = jest.spyOn(CatchCertificateTransformerService, 'generateCatchPayload');
    mockFindOne = DocumentModel.findOne as jest.Mock;
    mockUpdateCertificateEuCatchStatus = updateCertificateEuCatchStatus as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('submitDocumentToBoomi - Catch Certificate', () => {
    // Simplified payload from orchestration (only documentNumber and operation)
    const mockRawPayload = {
      documentNumber: 'GBR-2025-CC-TEST123',
      operation: 'submit'
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

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCertificateFromDB),
      });
      mockGenerateCatchPayload.mockReturnValueOnce(mockTransformedPayload);
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(mockRawPayload);

      expect(mockFindOne).toHaveBeenCalledWith({
        __t: "catchCert",
        documentNumber: mockRawPayload.documentNumber,
        status: { $in: ['COMPLETE', 'VOID'] },
      });

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
              value: 'CATCH.CC.GB.2026.0000006'
            }
          }
        }
      };
      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Certificate voided successfully',
      };

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCertificateFromDB),
      });
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(voidPayload);

      expect(mockSendDocumentToBoomi).toHaveBeenCalledWith(
        mockVoidPayload,
        { documentType: "CATCHCERTIFICATE" },
        'catchVoid'
      );
    });

    it('should handle certificate not found error', async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

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

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(certificateWithoutExportData),
      });

      await expect(submitDocumentToBoomi(mockRawPayload)).rejects.toThrow(
        'No exportData found for document number: GBR-2025-CC-TEST123'
      );

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]')
      );
    });

    it('should handle CATCH API errors', async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCertificateFromDB),
      });
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
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCertificateFromDB),
      });
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
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCertificateFromDB),
      });
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

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCertificateFromDB),
      });
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
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Database connection error')),
      });

      await expect(submitDocumentToBoomi(mockRawPayload)).rejects.toThrow(
        'Database connection error'
      );
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error: Connection refused');
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCertificateFromDB),
      });
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

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCertificateFromDB),
      });
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

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCertificateWithValidProducts),
      });
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

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCertificateWithCaughtBy),
      });
      mockGenerateProcessingStatementPayload.mockReturnValueOnce(
        mockTransformedPSPayload
      );
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(mockPSPayload);

      expect(mockGenerateProcessingStatementPayload).toHaveBeenCalled();
      expect(mockSendDocumentToBoomi).toHaveBeenCalled();
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

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCertificateWithEmptyProducts),
      });
      mockGenerateProcessingStatementPayload.mockReturnValueOnce(
        mockTransformedPSPayload
      );
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(mockPSPayload);

      expect(mockGenerateProcessingStatementPayload).toHaveBeenCalled();
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

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCertificateWithWhitespaceDescription),
      });
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

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCertificateWithNoCatchesButDescription),
      });
      mockGenerateProcessingStatementPayload.mockReturnValueOnce(
        mockTransformedPSPayload
      );
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(mockPSPayload);

      expect(mockGenerateProcessingStatementPayload).toHaveBeenCalled();
      expect(mockSendDocumentToBoomi).toHaveBeenCalled();
    });

    it('should use catchVoid resourceType for void operation', async () => {
      const mockCertificateToVoid = {
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
        catchSubmission: {
          status: "SUCCESS",
          reference: "CATCH.PS.GB.2026.0000006",
          uri: "https://webgate.acceptance.ec.europa.eu/tracesnt/certificate/catch-certificate/CATCH.CC.GB.2026.0000006",
          timestamp: "2026-01-06T16:09:16.982+01:00",
          reasonInformation: "Message has been successfully processed"
        }
      };

      const voidPayload = {
        documentNumber: 'GBR-2025-PS-TEST123',
        operation: 'void' as const
      }
      const mockVoidPayload = {
        CancelProcessingStatementRequest: {
          SPSCertificate: {
            ID: {
              value: 'CATCH.PS.GB.2026.0000006'
            }
          }
        }
      };
      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Certificate voided successfully',
      };

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCertificateToVoid),
      });
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(voidPayload);

      expect(mockSendDocumentToBoomi).toHaveBeenCalledWith(
        mockVoidPayload,
        { documentType: "PROCESSINGSTATEMENT" },
        'catchVoid'
      );
    });
  });

  describe('submitDocumentToBoomi - Storage document', () => {
    let mockGenerateStorageNotesPayload: jest.SpyInstance;

    beforeEach(() => {
      mockGenerateStorageNotesPayload = jest.spyOn(
        StorageNotesTransformerService,
        'generateStorageNotesPayload'
      );
    });

    const mockSDPayload = {
      documentNumber: 'GBR-2025-SD-TEST123',
      operation: 'submit' as 'submit' | 'void',
    };

    const mockStorageDocumentFromDB = {
      documentNumber: 'GBR-2025-SD-TEST123',
      status: 'COMPLETE',
      createdAt: new Date('2025-01-05T16:59:29.190Z'),
      exportData: {
        catches: [
          {
            species: 'Atlantic Salmon',
            catchCertificateNumber: 'GBR-2024-CC-789',
            totalWeight: 500,
          },
        ],
        exporterDetails: {
          exporterFullName: 'Test Storage Exporter Ltd',
          exporterCompanyName: 'Storage Company',
          addressOne: 'Storage Address',
          townCity: 'Storage City',
          postcode: 'ST1 2AG',
        },
        exportedTo: {
          officialCountryName: 'France',
          isoCodeAlpha2: 'FR',
        },
        exportLocation: {
          locationName: 'Dover Port',
        },
        facilityName: 'Cold Storage Facility',
        facilityApprovalNumber: 'FSF-12345',
        facilityAddressOne: 'Facility Street 1',
        facilityTownCity: 'Facility Town',
        facilityPostcode: 'FC1 5TY',
        facilityArrivalDate: '2025-01-03',
        facilityStorage: [
          {
            containerNumber: 'CONT-001',
            sealNumber: 'SEAL-001',
            temperature: '-18°C',
          },
        ],
        transportation: {
          vehicle: 'refrigerated-truck',
          vehicleNumber: 'RT-456',
          departurePlace: 'Dover',
        },
        arrivalTransportation: {
          vehicle: 'vessel',
          vesselName: 'Ocean Carrier',
          arrivalPlace: 'Calais',
        },
      },
      catchSubmission: {
        status: 'SUCCESS',
        reference: 'CATCH.SD.GB.2026.0000007',
        uri: 'https://webgate.acceptance.ec.europa.eu/tracesnt/certificate/storage-document/CATCH.SD.GB.2026.0000007',
        timestamp: '2026-01-06T16:09:16.982+01:00',
        reasonInformation: 'Message has been successfully processed',
      },
    };

    const mockTransformedSDPayload = {
      CreateCatchNonManipulationDocumentRequest: {
        CatchNonManipulationDocument: {
          ID: {
            value: 'GBR-2025-SD-TEST123',
          },
          FacilityName: {
            languageID: 'en',
            value: 'Cold Storage Facility',
          },
        },
      },
    };

    it('should successfully submit Storage Document to CATCH API', async () => {
      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Accepted for processing',
      };

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockStorageDocumentFromDB),
      });
      mockGenerateStorageNotesPayload.mockReturnValueOnce(mockTransformedSDPayload);
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(mockSDPayload);

      expect(mockFindOne).toHaveBeenCalledWith({
        __t: 'storageDocument',
        documentNumber: mockSDPayload.documentNumber,
        status: { $in: ['COMPLETE', 'VOID'] },
      });

      expect(mockGenerateStorageNotesPayload).toHaveBeenCalledWith(
        mockSDPayload.documentNumber,
        mockStorageDocumentFromDB.createdAt,
        expect.objectContaining({
          catches: mockStorageDocumentFromDB.exportData.catches,
          exporterDetails: mockStorageDocumentFromDB.exportData.exporterDetails,
          exportedTo: mockStorageDocumentFromDB.exportData.exportedTo,
          exportLocation: mockStorageDocumentFromDB.exportData.exportLocation,
          facilityName: mockStorageDocumentFromDB.exportData.facilityName,
          facilityApprovalNumber: mockStorageDocumentFromDB.exportData.facilityApprovalNumber,
          facilityAddressOne: mockStorageDocumentFromDB.exportData.facilityAddressOne,
          facilityTownCity: mockStorageDocumentFromDB.exportData.facilityTownCity,
          facilityPostcode: mockStorageDocumentFromDB.exportData.facilityPostcode,
          facilityArrivalDate: mockStorageDocumentFromDB.exportData.facilityArrivalDate,
          facilityStorage: mockStorageDocumentFromDB.exportData.facilityStorage,
          transport: mockStorageDocumentFromDB.exportData.transportation,
          arrivalTransport: mockStorageDocumentFromDB.exportData.arrivalTransportation,
        })
      );

      expect(mockSendDocumentToBoomi).toHaveBeenCalledWith(
        mockTransformedSDPayload,
        { documentType: 'NONMANIPULATIONDOCUMENT' },
        'catchSubmit'
      );

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('[DOCUMENT-SUBMISSION]')
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('[TRANSFORMING-SD-TO-UN-CEFACT]')
      );
    });

    it('should use catchVoid resourceType for void operation', async () => {
      const voidPayload = { ...mockSDPayload, operation: 'void' as const };
      const mockVoidPayload = {
        CancelCatchNonManipulationDocumentRequest: {
          CatchNonManipulationDocument: {
            ID: {
              value: 'CATCH.SD.GB.2026.0000007',
            },
          },
        },
      };
      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Storage Document voided successfully',
      };

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockStorageDocumentFromDB),
      });
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(voidPayload);

      expect(mockSendDocumentToBoomi).toHaveBeenCalledWith(
        mockVoidPayload,
        { documentType: 'NMDOCUMENT' },
        'catchVoid'
      );

      expect(mockGenerateStorageNotesPayload).not.toHaveBeenCalled();
    });

    it('should handle Storage Document with empty catches array', async () => {
      const mockSDWithEmptyCatches = {
        ...mockStorageDocumentFromDB,
        exportData: {
          ...mockStorageDocumentFromDB.exportData,
          catches: [],
        },
      };

      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Accepted for processing',
      };

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSDWithEmptyCatches),
      });
      mockGenerateStorageNotesPayload.mockReturnValueOnce(mockTransformedSDPayload);
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(mockSDPayload);

      expect(mockGenerateStorageNotesPayload).toHaveBeenCalledWith(
        mockSDPayload.documentNumber,
        mockSDWithEmptyCatches.createdAt,
        expect.objectContaining({
          catches: [],
        })
      );

      expect(mockSendDocumentToBoomi).toHaveBeenCalled();
    });

    it('should handle Storage Document with missing catches (undefined)', async () => {
      const mockSDWithoutCatches = {
        ...mockStorageDocumentFromDB,
        exportData: {
          ...mockStorageDocumentFromDB.exportData,
          catches: undefined,
        },
      };

      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Accepted for processing',
      };

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSDWithoutCatches),
      });
      mockGenerateStorageNotesPayload.mockReturnValueOnce(mockTransformedSDPayload);
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(mockSDPayload);

      expect(mockGenerateStorageNotesPayload).toHaveBeenCalledWith(
        mockSDPayload.documentNumber,
        mockSDWithoutCatches.createdAt,
        expect.objectContaining({
          catches: [],
        })
      );
    });

    it('should handle Storage Document transformation errors', async () => {
      const error = new Error('Storage Document transformation failed');

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockStorageDocumentFromDB),
      });
      mockGenerateStorageNotesPayload.mockImplementation(() => {
        throw error;
      });

      await expect(submitDocumentToBoomi(mockSDPayload)).rejects.toThrow(error);

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]')
      );
      expect(mockUpdateCertificateEuCatchStatus).toHaveBeenCalledWith(
        'GBR-2025-SD-TEST123',
        expect.objectContaining({
          euCatchStatus: 'FAILURE',
          faultCode: 'S:Client',
          faultString: 'Storage Document transformation failed',
        })
      );
    });

    it('should handle Storage Document submission API errors', async () => {
      const apiError = new Error('CATCH API error: 500 - Internal Server Error');

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockStorageDocumentFromDB),
      });
      mockGenerateStorageNotesPayload.mockReturnValueOnce(mockTransformedSDPayload);
      mockSendDocumentToBoomi.mockRejectedValueOnce(apiError);

      await expect(submitDocumentToBoomi(mockSDPayload)).rejects.toThrow(apiError);

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]')
      );
      expect(mockUpdateCertificateEuCatchStatus).toHaveBeenCalledWith(
        'GBR-2025-SD-TEST123',
        expect.objectContaining({
          euCatchStatus: 'FAILURE',
          faultString: 'CATCH API error: 500 - Internal Server Error',
        })
      );
    });

    it('should handle Storage Document not found error', async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(submitDocumentToBoomi(mockSDPayload)).rejects.toThrow(
        'Document not found for document number: GBR-2025-SD-TEST123'
      );

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('[DOCUMENT-SUBMISSION][FETCH-DATA]')
      );
      expect(mockUpdateCertificateEuCatchStatus).toHaveBeenCalledWith(
        'GBR-2025-SD-TEST123',
        expect.objectContaining({
          euCatchStatus: 'FAILURE',
        })
      );
    });

    it('should handle Storage Document with missing exportData', async () => {
      const mockSDWithoutExportData = {
        ...mockStorageDocumentFromDB,
        exportData: null,
      };

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSDWithoutExportData),
      });

      await expect(submitDocumentToBoomi(mockSDPayload)).rejects.toThrow(
        'No exportData found for document number: GBR-2025-SD-TEST123'
      );

      expect(mockUpdateCertificateEuCatchStatus).toHaveBeenCalledWith(
        'GBR-2025-SD-TEST123',
        expect.objectContaining({
          euCatchStatus: 'FAILURE',
          faultString: 'No exportData found for document number: GBR-2025-SD-TEST123',
        })
      );
    });

    it('should log all Storage Document submission steps', async () => {
      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Accepted for processing',
      };

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockStorageDocumentFromDB),
      });
      mockGenerateStorageNotesPayload.mockReturnValueOnce(mockTransformedSDPayload);
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(mockSDPayload);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('[DOCUMENT-SUBMISSION][GBR-2025-SD-TEST123][START]')
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('[FETCHING-DATA]')
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('[DATA-EXTRACTED]')
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('[TRANSFORMING-SD-TO-UN-CEFACT]')
      );
    });

    it('should correctly transform transportation fields', async () => {
      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Accepted for processing',
      };

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockStorageDocumentFromDB),
      });
      mockGenerateStorageNotesPayload.mockReturnValueOnce(mockTransformedSDPayload);
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(mockSDPayload);

      expect(mockGenerateStorageNotesPayload).toHaveBeenCalledWith(
        mockSDPayload.documentNumber,
        mockStorageDocumentFromDB.createdAt,
        expect.objectContaining({
          transport: mockStorageDocumentFromDB.exportData.transportation,
          arrivalTransport: mockStorageDocumentFromDB.exportData.arrivalTransportation,
        })
      );
    });

    it('should handle void operation with catchSubmission reference', async () => {
      const voidPayload = { ...mockSDPayload, operation: 'void' as const };
      const mockResponse = {
        status: 'OK',
        statusCode: '202',
        message: 'Storage Document voided successfully',
      };

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockStorageDocumentFromDB),
      });
      mockSendDocumentToBoomi.mockResolvedValueOnce(mockResponse);

      await submitDocumentToBoomi(voidPayload);

      const voidPayloadCall = mockSendDocumentToBoomi.mock.calls[0][0];
      expect(voidPayloadCall.CancelCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.ID.value).toBe(
        'CATCH.SD.GB.2026.0000007'
      );
    });
  });
});
