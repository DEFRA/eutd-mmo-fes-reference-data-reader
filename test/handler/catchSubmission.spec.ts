import * as Hapi from '@hapi/hapi';
import * as Joi from 'joi';
import * as CatchSubmission from '../../src/handler/catchSubmission';
import * as Controller from '../../src/controllers/catchSubmission';
import { BoomiService } from 'mmo-shared-reference-data';
import * as CatchCertPersistence from '../../src/landings/persistence/catchCert';
import * as DataHub from '../../src/controllers/dataHub';
import CatchCertificateTransformerService from '../../src/services/catch-certificate-transformer.service';
import ProcessingStatementTransformerService from '../../src/services/processing-statement-transformer.service';
import StorageNotesTransformerService from '../../src/services/storage-notes-transformer.service';
import { DocumentModel } from '../../src/landings/types/document';

jest.mock('mmo-shared-reference-data');
jest.mock('../../src/landings/persistence/catchCert');
jest.mock('../../src/landings/types/document');
jest.mock('../../src/controllers/dataHub');
jest.mock('../../src/services/catch-certificate-transformer.service');
jest.mock('../../src/services/processing-statement-transformer.service');
jest.mock('../../src/services/storage-notes-transformer.service');
jest.mock('../../src/logger');

describe('CATCH Submission Handler (FI0-10312)', () => {
  let server: Hapi.Server;

  beforeAll(async () => {
    server = Hapi.server({
      port: 9011,
      host: 'localhost',
    });

    CatchSubmission.catchSubmissionRoutes(server);
    server.validator(Joi);

    await server.initialize();
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /v1/catch-submission', () => {
    const validPayload = {
      documentNumber: 'GBR-2025-CC-TEST123',
      operation: 'submit',
    };

    it('should successfully process CATCH submission request', async () => {
      const mockCatchCertDocument = {
        documentNumber: 'GBR-2025-CC-TEST123',
        createdAt: new Date('2025-01-01'),
        exportData: {
          products: [{ product: 'Cod' }],
          exporterDetails: { name: 'Test Exporter' }
        }
      };

      (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
      (DocumentModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCatchCertDocument)
      });
      (CatchCertificateTransformerService.generateCatchPayload as jest.Mock)
        .mockReturnValue({ CreateCatchCertificateRequest: {} });
      (BoomiService.sendDocumentToBoomi as jest.Mock).mockResolvedValue({
        CatchCertificateResponse: { status: 'SUCCESS' }
      });
      (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

      const response = await server.inject({
        method: 'POST',
        url: '/v1/catch-submission',
        payload: validPayload,
        auth: { strategy: 'simple', credentials: {} },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 500 when CATCH API submission fails', async () => {
      (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
      (DocumentModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('CATCH API error: 500 - Internal Server Error'))
      });
      (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

      const response = await server.inject({
        method: 'POST',
        url: '/v1/catch-submission',
        payload: validPayload,
        auth: { strategy: 'simple', credentials: {} },
      });

      expect(response.statusCode).toBe(500);
    });

    it('should return 400 for missing documentNumber', async () => {
      const invalidPayload = { operation: 'submit' };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/catch-submission',
        payload: invalidPayload,
        auth: { strategy: 'simple', credentials: {} },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid operation value', async () => {
      const invalidPayload = {
        documentNumber: 'GBR-2025-CC-TEST123',
        operation: 'invalid',
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/catch-submission',
        payload: invalidPayload,
        auth: { strategy: 'simple', credentials: {} },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should default operation to submit when not provided', async () => {
      const mockCatchCertDocument = {
        documentNumber: 'GBR-2025-CC-TEST123',
        createdAt: new Date('2025-01-01'),
        exportData: {
          products: [{ product: 'Cod' }],
          exporterDetails: { name: 'Test Exporter' }
        }
      };

      (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
      (DocumentModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCatchCertDocument)
      });
      (CatchCertificateTransformerService.generateCatchPayload as jest.Mock)
        .mockReturnValue({ CreateCatchCertificateRequest: {} });
      (BoomiService.sendDocumentToBoomi as jest.Mock).mockResolvedValue({
        CatchCertificateResponse: { status: 'SUCCESS' }
      });
      (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

      const payloadWithoutOperation = {
        documentNumber: 'GBR-2025-CC-TEST123',
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/catch-submission',
        payload: payloadWithoutOperation,
        auth: { strategy: 'simple', credentials: {} },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should handle void operation', async () => {
      const mockCatchCertDocument = {
        documentNumber: 'GBR-2025-CC-TEST123',
        createdAt: new Date('2025-01-01'),
        exportData: {
          products: [{ product: 'Cod' }],
          exporterDetails: { name: 'Test Exporter' }
        }
      };

      (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
      (DocumentModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCatchCertDocument)
      });
      (CatchCertificateTransformerService.generateCatchPayload as jest.Mock)
        .mockReturnValue({ CreateCatchCertificateRequest: {} });
      (BoomiService.sendDocumentToBoomi as jest.Mock).mockResolvedValue({
        CatchCertificateResponse: { status: 'SUCCESS' }
      });
      (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

      const voidPayload = {
        documentNumber: 'GBR-2025-CC-TEST123',
        operation: 'void',
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/catch-submission',
        payload: voidPayload,
        auth: { strategy: 'simple', credentials: {} },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should handle error with empty message property', async () => {
      const errorWithEmptyMessage = new Error('');

      (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
      (DocumentModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockRejectedValue(errorWithEmptyMessage)
      });
      (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

      const response = await server.inject({
        method: 'POST',
        url: '/v1/catch-submission',
        payload: validPayload,
        auth: { strategy: 'simple', credentials: {} },
      });

      expect(response.statusCode).toBe(500);
    });
  });

  // Note: Lines 20-21 in catchSubmission.ts contain defensive || operators:
  //   const documentNumber = payload.documentNumber || 'UNKNOWN';
  //   const operation = payload.operation || 'submit';
  // These fallbacks are unreachable in practice because Joi validation (lines 58-61)
  // ensures documentNumber is required and operation defaults to 'submit'.
  // To achieve 100% branch coverage, these defensive operators should be removed
  // as they represent dead code protected by the validation layer.
});

describe('Catch Certificate Submission', () => {
  const mockCatchCertDocument = {
    documentNumber: 'GBR-2025-CC-TEST001',
    createdAt: new Date('2025-01-01'),
    exportData: {
      products: [
        {
          product: 'Cod',
          caughtBy: [
            { vesselName: 'Test Vessel', weight: 100 }
          ]
        }
      ],
      exporterDetails: { name: 'Test Exporter' },
      transportation: { vehicle: 'truck' },
      conservation: { method: 'frozen' }
    },
    catchSubmission: {
      status: "SUCCESS",
      reference: "CATCH.CC.GB.2026.0000006",
      uri: "https://webgate.acceptance.ec.europa.eu/tracesnt/certificate/catch-certificate/CATCH.CC.GB.2026.0000006",
      timestamp: "2026-01-06T16:09:16.982+01:00",
      reasonInformation: "Message has been successfully processed"
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully submit a catch certificate', async () => {
    const mockTransformedPayload = {
      CreateCatchCertificateRequest: { SPSCertificate: {} }
    };
    const mockBoomiResponse = {
      CatchCertificateResponse: {
        status: 'SUCCESS',
        statusMessage: 'Certificate submitted successfully',
        fesDocNumber: 'GBR-CC-2025-01234567'
      }
    };

    const mockProcessBoomiResponse = {
      euCatchStatus: 'SUCCESS',
      documentNumber: 'Certificate submitted successfully',
      euCatchStatusMessage: 'GBR-CC-2025-01234567'
    };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockCatchCertDocument)
    });
    (CatchCertificateTransformerService.generateCatchPayload as jest.Mock)
      .mockReturnValue(mockTransformedPayload);
    (BoomiService.sendDocumentToBoomi as jest.Mock).mockResolvedValue(mockBoomiResponse);
    (BoomiService.processEuUpgradeCallback as jest.Mock).mockReturnValue(mockProcessBoomiResponse);
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await Controller.submitDocumentToBoomi({
      documentNumber: 'GBR-2025-CC-TEST001',
      operation: 'submit'
    });

    expect(DataHub.getDocumentType).toHaveBeenCalledWith('GBR-2025-CC-TEST001');
    expect(DocumentModel.findOne).toHaveBeenCalledWith({
      __t: "catchCert",
      documentNumber: 'GBR-2025-CC-TEST001',
      status: { $in: ['COMPLETE', 'VOID'] }
    });
    expect(CatchCertificateTransformerService.generateCatchPayload).toHaveBeenCalled();
    expect(BoomiService.sendDocumentToBoomi).toHaveBeenCalledWith(
      mockTransformedPayload,
      { documentType: 'CATCHCERTIFICATE' },
      'catchSubmit'
    );
    expect(CatchCertPersistence.updateCertificateEuCatchStatus).toHaveBeenCalledWith(
      'GBR-2025-CC-TEST001',
      mockProcessBoomiResponse
    );
  });

  it('should use void operation for catch certificate', async () => {
    const mockVoidPayload = {
      CancelCatchCertificateRequest: {
        SPSCertificate: {
          ID: {
            value: 'CATCH.CC.GB.2026.0000006'
          }
        }
      }
    };
    const mockBoomiResponse = {
      CatchCertificateResponse: {
        status: 'SUCCESS',
        statusMessage: 'Certificate voided successfully'
      }
    };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockCatchCertDocument)
    });
    (BoomiService.sendDocumentToBoomi as jest.Mock).mockResolvedValue(mockBoomiResponse);
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await Controller.submitDocumentToBoomi({
      documentNumber: 'GBR-2025-CC-TEST001',
      operation: 'void'
    });

    expect(BoomiService.sendDocumentToBoomi).toHaveBeenCalledWith(
      mockVoidPayload,
      { documentType: 'CATCHCERTIFICATE' },
      'catchVoid'
    );
  });

  it('should use default status when CatchCertificateResponse is missing', async () => {
    const mockTransformedPayload = {
      CreateCatchCertificateRequest: { SPSCertificate: {} }
    };
    const mockBoomiResponse = {}; // No CatchCertificateResponse

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockCatchCertDocument)
    });
    (CatchCertificateTransformerService.generateCatchPayload as jest.Mock)
      .mockReturnValue(mockTransformedPayload);
    (BoomiService.sendDocumentToBoomi as jest.Mock).mockResolvedValue(mockBoomiResponse);
    (BoomiService.processEuUpgradeCallback as jest.Mock).mockImplementationOnce(() => {
      throw new Error('no catch response')
    });
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await expect(() => Controller.submitDocumentToBoomi({
      documentNumber: 'GBR-2025-CC-TEST001',
      operation: 'submit'
    })).rejects.toThrow('no catch response')

    expect(CatchCertPersistence.updateCertificateEuCatchStatus).toHaveBeenCalledWith(
      'GBR-2025-CC-TEST001',
      { euCatchStatus: 'FAILURE', faultCode: 'S:Client', documentNumber: "GBR-2025-CC-TEST001", faultString: "no catch response" }
    );
  });

  it('should use default status when Boomi response is null', async () => {
    const mockTransformedPayload = {
      CreateCatchCertificateRequest: { SPSCertificate: {} }
    };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockCatchCertDocument)
    });
    (CatchCertificateTransformerService.generateCatchPayload as jest.Mock)
      .mockReturnValue(mockTransformedPayload);
    (BoomiService.sendDocumentToBoomi as jest.Mock).mockResolvedValue(null);
    (BoomiService.processEuUpgradeCallback as jest.Mock).mockImplementationOnce(() => {
      throw new Error('no catch response')
    });
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await expect(() => Controller.submitDocumentToBoomi({
      documentNumber: 'GBR-2025-CC-TEST001',
      operation: 'submit'
    })).rejects.toThrow('no catch response');

    expect(CatchCertPersistence.updateCertificateEuCatchStatus).toHaveBeenCalledWith(
      'GBR-2025-CC-TEST001',
      { euCatchStatus: 'FAILURE', faultCode: 'S:Client', documentNumber: "GBR-2025-CC-TEST001", faultString: "no catch response" }
    );
  });

  it('should use default status when Boomi response is undefined', async () => {
    const mockTransformedPayload = {
      CreateCatchCertificateRequest: { SPSCertificate: {} }
    };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockCatchCertDocument)
    });
    (CatchCertificateTransformerService.generateCatchPayload as jest.Mock)
      .mockReturnValue(mockTransformedPayload);
    (BoomiService.sendDocumentToBoomi as jest.Mock).mockResolvedValue(undefined);
    (BoomiService.processEuUpgradeCallback as jest.Mock).mockImplementationOnce(() => {
      throw new Error('no catch response')
    });
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await expect(Controller.submitDocumentToBoomi({
      documentNumber: 'GBR-2025-CC-TEST001',
      operation: 'submit'
    })).rejects.toThrow('no catch response');

    expect(CatchCertPersistence.updateCertificateEuCatchStatus).toHaveBeenCalledWith(
      'GBR-2025-CC-TEST001',
      { euCatchStatus: 'FAILURE', faultCode: 'S:Client', documentNumber: "GBR-2025-CC-TEST001", faultString: "no catch response" }
    );
  });

  it('should handle products without caughtBy', async () => {
    const mockDocumentNoCaughtBy = {
      documentNumber: 'GBR-2025-CC-TEST002',
      createdAt: new Date('2025-01-01'),
      exportData: {
        products: [
          {
            product: 'Cod',
            caughtBy: null
          }
        ],
        exporterDetails: { name: 'Test Exporter' },
        transportation: { vehicle: 'truck' },
        conservation: { method: 'frozen' }
      }
    };

    const mockTransformedPayload = {
      CreateCatchCertificateRequest: { SPSCertificate: {} }
    };
    const mockBoomiResponse = {
      CatchCertificateResponse: {
        status: 'SUCCESS',
        statusMessage: 'Certificate submitted'
      }
    };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockDocumentNoCaughtBy)
    });
    (CatchCertificateTransformerService.generateCatchPayload as jest.Mock)
      .mockReturnValue(mockTransformedPayload);
    (BoomiService.sendDocumentToBoomi as jest.Mock).mockResolvedValue(mockBoomiResponse);
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await Controller.submitDocumentToBoomi({
      documentNumber: 'GBR-2025-CC-TEST002',
      operation: 'submit'
    });

    expect(CatchCertificateTransformerService.generateCatchPayload).toHaveBeenCalledWith(
      'GBR-2025-CC-TEST002',
      expect.any(Date),
      mockDocumentNoCaughtBy.exportData
    );
  });

  it('should handle null products array', async () => {
    const mockDocumentNoProducts = {
      documentNumber: 'GBR-2025-CC-TEST003',
      createdAt: new Date('2025-01-01'),
      exportData: {
        products: null,
        exporterDetails: { name: 'Test Exporter' },
        transportation: { vehicle: 'truck' },
        conservation: { method: 'frozen' }
      }
    };

    const mockTransformedPayload = {
      CreateCatchCertificateRequest: { SPSCertificate: {} }
    };
    const mockBoomiResponse = {
      CatchCertificateResponse: {
        status: 'SUCCESS',
        statusMessage: 'Certificate submitted'
      }
    };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockDocumentNoProducts)
    });
    (CatchCertificateTransformerService.generateCatchPayload as jest.Mock)
      .mockReturnValue(mockTransformedPayload);
    (BoomiService.sendDocumentToBoomi as jest.Mock).mockResolvedValue(mockBoomiResponse);
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await Controller.submitDocumentToBoomi({
      documentNumber: 'GBR-2025-CC-TEST003',
      operation: 'submit'
    });

    expect(CatchCertificateTransformerService.generateCatchPayload).toHaveBeenCalledWith(
      'GBR-2025-CC-TEST003',
      expect.any(Date),
      mockDocumentNoProducts.exportData
    );
  });
});

describe('Processing Statement Submission', () => {
  const mockPsDocument = {
    documentNumber: 'GBR-2025-PS-TEST001',
    createdAt: new Date('2025-01-01'),
    exportData: {
      products: [{ product: 'Processed Cod' }],
      catches: [{ species: 'Cod' }],
      exporterDetails: { name: 'Test Processor' },
      exportedTo: { country: 'France' },
      plantName: 'Test Plant',
      plantApprovalNumber: 'AP123',
      plantAddressOne: '123 Test St',
      plantTownCity: 'Test City',
      plantPostcode: 'TE5T1NG',
      healthCertificateNumber: 'HC123',
      healthCertificateDate: '2025-01-01',
      dateOfAcceptance: '2025-01-02',
      consignmentDescription: 'Processed fish',
      personResponsibleForConsignment: 'John Doe'
    },
    catchSubmission: {
      status: "SUCCESS",
      reference: "CATCH.PS.GB.2026.0000006",
      uri: "https://webgate.acceptance.ec.europa.eu/tracesnt/certificate/catch-certificate/CATCH.CC.GB.2026.0000006",
      timestamp: "2026-01-06T16:09:16.982+01:00",
      reasonInformation: "Message has been successfully processed"
    }
  };

  it('should successfully submit a processing statement', async () => {
    const mockTransformedPayload = {
      CreateCatchProcessingStatementRequest: { SPSCertificate: {} }
    };
    const mockBoomiResponse = {
      ProcessingStatementResponse: {
        status: 'SUCCESS',
        statusMessage: 'Statement submitted successfully'
      }
    };

    const mockProcessBoomiResponse = {
      euCatchStatus: "IN_PROGRESS",
      euCatchStatusMessage: "Processing Statement is being retried.",
      documentNumber: "GBR-2026-CC-3FD5E066"
    };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('processingStatement');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockPsDocument)
    });
    (ProcessingStatementTransformerService.generateProcessingStatementPayload as jest.Mock)
      .mockReturnValue(mockTransformedPayload);
    (BoomiService.sendDocumentToBoomi as jest.Mock).mockResolvedValue(mockBoomiResponse);
    (BoomiService.processEuUpgradeCallback as jest.Mock).mockReturnValue(mockProcessBoomiResponse);
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await Controller.submitDocumentToBoomi({
      documentNumber: 'GBR-2025-PS-TEST001',
      operation: 'submit'
    });

    expect(DataHub.getDocumentType).toHaveBeenCalledWith('GBR-2025-PS-TEST001');
    expect(DocumentModel.findOne).toHaveBeenCalledWith({
      __t: "processingStatement",
      documentNumber: 'GBR-2025-PS-TEST001',
      status: { $in: ['COMPLETE', 'VOID'] }
    });
    expect(ProcessingStatementTransformerService.generateProcessingStatementPayload).toHaveBeenCalled();
    expect(BoomiService.sendDocumentToBoomi).toHaveBeenCalledWith(
      mockTransformedPayload,
      { documentType: 'PROCESSINGSTATEMENT' },
      'catchSubmit'
    );

    expect(CatchCertPersistence.updateCertificateEuCatchStatus).toHaveBeenCalledWith(
      'GBR-2025-PS-TEST001',
      mockProcessBoomiResponse
    );
  });

  it('should use void operation for processing statement', async () => {
    const mockTransformedPayload = {
      CancelProcessingStatementRequest: { SPSCertificate: { ID: { value: 'CATCH.PS.GB.2026.0000006' } } }
    };
    const mockBoomiResponse = {
      ProcessingStatementResponse: {
        status: 'SUCCESS',
        statusMessage: 'Statement voided successfully'
      }
    };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('processingStatement');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockPsDocument)
    });
    (ProcessingStatementTransformerService.generateProcessingStatementPayload as jest.Mock)
      .mockReturnValue(mockTransformedPayload);
    (BoomiService.sendDocumentToBoomi as jest.Mock).mockResolvedValue(mockBoomiResponse);
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await Controller.submitDocumentToBoomi({
      documentNumber: 'GBR-2025-PS-TEST001',
      operation: 'void'
    });

    expect(BoomiService.sendDocumentToBoomi).toHaveBeenCalledWith(
      mockTransformedPayload,
      { documentType: 'PROCESSINGSTATEMENT' },
      'catchVoid'
    );
  });

  it('should use default status when ProcessingStatementResponse is missing', async () => {
    const mockTransformedPayload = {
      CreateCatchProcessingStatementRequest: { SPSCertificate: {} }
    };
    const mockBoomiResponse = {}; // No ProcessingStatementResponse

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('processingStatement');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockPsDocument)
    });
    (ProcessingStatementTransformerService.generateProcessingStatementPayload as jest.Mock)
      .mockReturnValue(mockTransformedPayload);
    (BoomiService.sendDocumentToBoomi as jest.Mock).mockResolvedValue(mockBoomiResponse);
    (BoomiService.processEuUpgradeCallback as jest.Mock).mockImplementationOnce(() => {
      throw new Error('no catch response')
    });
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await expect(Controller.submitDocumentToBoomi({
      documentNumber: 'GBR-2025-PS-TEST001',
      operation: 'submit'
    })).rejects.toThrow('no catch response');

    expect(CatchCertPersistence.updateCertificateEuCatchStatus).toHaveBeenCalledWith(
      'GBR-2025-PS-TEST001',
      {
        documentNumber: "GBR-2025-PS-TEST001",
        euCatchStatus: "FAILURE",
        faultCode: "S:Client",
        faultString: "no catch response",
      }
    );
  });

  it('should use default status when PS Boomi response is null', async () => {
    const mockTransformedPayload = {
      CreateCatchProcessingStatementRequest: { SPSCertificate: {} }
    };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('processingStatement');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockPsDocument)
    });
    (ProcessingStatementTransformerService.generateProcessingStatementPayload as jest.Mock)
      .mockReturnValue(mockTransformedPayload);
    (BoomiService.sendDocumentToBoomi as jest.Mock).mockResolvedValue(null);
    (BoomiService.processEuUpgradeCallback as jest.Mock).mockImplementationOnce(() => {
      throw new Error('no catch response')
    });
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await expect(Controller.submitDocumentToBoomi({
      documentNumber: 'GBR-2025-PS-TEST001',
      operation: 'submit'
    })).rejects.toThrow('no catch response');

    expect(CatchCertPersistence.updateCertificateEuCatchStatus).toHaveBeenCalledWith(
      'GBR-2025-PS-TEST001',
      {
        documentNumber: "GBR-2025-PS-TEST001",
        euCatchStatus: "FAILURE",
        faultCode: "S:Client",
        faultString: "no catch response",
      }
    );
  });

  it('should use default status when PS Boomi response is undefined', async () => {
    const mockTransformedPayload = {
      CreateCatchProcessingStatementRequest: { SPSCertificate: {} }
    };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('processingStatement');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockPsDocument)
    });
    (ProcessingStatementTransformerService.generateProcessingStatementPayload as jest.Mock)
      .mockReturnValue(mockTransformedPayload);
    (BoomiService.sendDocumentToBoomi as jest.Mock).mockResolvedValue(undefined);
    (BoomiService.processEuUpgradeCallback as jest.Mock).mockImplementationOnce(() => {
      throw new Error('no catch response')
    });
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await expect(Controller.submitDocumentToBoomi({
      documentNumber: 'GBR-2025-PS-TEST001',
      operation: 'submit'
    })).rejects.toThrow('no catch response');

    expect(CatchCertPersistence.updateCertificateEuCatchStatus).toHaveBeenCalledWith(
      'GBR-2025-PS-TEST001',
      {
        documentNumber: "GBR-2025-PS-TEST001",
        euCatchStatus: "FAILURE",
        faultCode: "S:Client",
        faultString: "no catch response",
      }
    );
  });

  it('should handle null products in processing statement', async () => {
    const mockPsDocumentNullProducts = {
      ...mockPsDocument,
      exportData: {
        ...mockPsDocument.exportData,
        products: null
      }
    };

    const mockTransformedPayload = {
      CreateCatchProcessingStatementRequest: { SPSCertificate: {} }
    };
    const mockBoomiResponse = {
      ProcessingStatementResponse: {
        status: 'SUCCESS',
        statusMessage: 'Statement submitted'
      }
    };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('processingStatement');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockPsDocumentNullProducts)
    });
    (ProcessingStatementTransformerService.generateProcessingStatementPayload as jest.Mock)
      .mockReturnValue(mockTransformedPayload);
    (BoomiService.sendDocumentToBoomi as jest.Mock).mockResolvedValue(mockBoomiResponse);
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await Controller.submitDocumentToBoomi({
      documentNumber: 'GBR-2025-PS-TEST001',
      operation: 'submit'
    });

    expect(ProcessingStatementTransformerService.generateProcessingStatementPayload).toHaveBeenCalledWith(
      'GBR-2025-PS-TEST001',
      expect.any(Date),
      expect.objectContaining({
        products: []
      })
    );
  });

  it('should handle null catches in processing statement', async () => {
    const mockPsDocumentNullCatches = {
      ...mockPsDocument,
      exportData: {
        ...mockPsDocument.exportData,
        catches: null
      }
    };

    const mockTransformedPayload = {
      CreateCatchProcessingStatementRequest: { SPSCertificate: {} }
    };
    const mockBoomiResponse = {
      ProcessingStatementResponse: {
        status: 'SUCCESS',
        statusMessage: 'Statement submitted'
      }
    };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('processingStatement');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockPsDocumentNullCatches)
    });
    (ProcessingStatementTransformerService.generateProcessingStatementPayload as jest.Mock)
      .mockReturnValue(mockTransformedPayload);
    (BoomiService.sendDocumentToBoomi as jest.Mock).mockResolvedValue(mockBoomiResponse);
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await Controller.submitDocumentToBoomi({
      documentNumber: 'GBR-2025-PS-TEST001',
      operation: 'submit'
    });

    expect(ProcessingStatementTransformerService.generateProcessingStatementPayload).toHaveBeenCalledWith(
      'GBR-2025-PS-TEST001',
      expect.any(Date),
      expect.objectContaining({
        catches: []
      })
    );
  });
});

describe('Error Handling', () => {
  it('should throw error when document is not found', async () => {
    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(null)
    });

    await expect(
      Controller.submitDocumentToBoomi({
        documentNumber: 'GBR-2025-CC-NOTFOUND',
        operation: 'submit'
      })
    ).rejects.toThrow('Document not found for document number: GBR-2025-CC-NOTFOUND');
  });

  it('should throw error when exportData is missing', async () => {
    const mockDocumentNoExportData = {
      documentNumber: 'GBR-2025-CC-TEST004',
      createdAt: new Date('2025-01-01'),
      exportData: null
    };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockDocumentNoExportData)
    });

    await expect(
      Controller.submitDocumentToBoomi({
        documentNumber: 'GBR-2025-CC-TEST004',
        operation: 'submit'
      })
    ).rejects.toThrow('No exportData found for document number: GBR-2025-CC-TEST004');
  });

  it('should handle fetch error and update certificate status', async () => {
    const fetchError = new Error('Database connection failed');

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockRejectedValue(fetchError)
    });
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await expect(
      Controller.submitDocumentToBoomi({
        documentNumber: 'GBR-2025-CC-TEST005',
        operation: 'submit'
      })
    ).rejects.toThrow('Database connection failed');

    expect(CatchCertPersistence.updateCertificateEuCatchStatus).toHaveBeenCalledWith(
      'GBR-2025-CC-TEST005',
      {
        documentNumber: "GBR-2025-CC-TEST005",
        euCatchStatus: "FAILURE",
        faultCode: "S:Client",
        faultString: "Database connection failed",
      }
    );
  });

  it('should handle Boomi service error and update certificate status', async () => {
    const mockCatchCertDocument = {
      documentNumber: 'GBR-2025-CC-TEST006',
      createdAt: new Date('2025-01-01'),
      exportData: {
        products: [{ product: 'Cod' }],
        exporterDetails: { name: 'Test Exporter' }
      }
    };

    const boomiError = new Error('Boomi service unavailable');

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockCatchCertDocument)
    });
    (CatchCertificateTransformerService.generateCatchPayload as jest.Mock)
      .mockReturnValue({ CreateCatchCertificateRequest: {} });
    (BoomiService.sendDocumentToBoomi as jest.Mock).mockRejectedValue(boomiError);
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await expect(
      Controller.submitDocumentToBoomi({
        documentNumber: 'GBR-2025-CC-TEST006',
        operation: 'submit'
      })
    ).rejects.toThrow('Boomi service unavailable');

    expect(CatchCertPersistence.updateCertificateEuCatchStatus).toHaveBeenCalledWith(
      'GBR-2025-CC-TEST006',
      {
        documentNumber: "GBR-2025-CC-TEST006",
        euCatchStatus: "FAILURE",
        faultCode: "S:Client",
        faultString: "Boomi service unavailable",
      }
    );
  });

  it('should handle transformer error and update certificate status', async () => {
    const mockCatchCertDocument = {
      documentNumber: 'GBR-2025-CC-TEST007',
      createdAt: new Date('2025-01-01'),
      exportData: {
        products: [{ product: 'Cod' }],
        exporterDetails: { name: 'Test Exporter' }
      }
    };

    const transformerError = new Error('Transformation failed');

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockCatchCertDocument)
    });
    (CatchCertificateTransformerService.generateCatchPayload as jest.Mock)
      .mockImplementation(() => {
        throw transformerError;
      });
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await expect(
      Controller.submitDocumentToBoomi({
        documentNumber: 'GBR-2025-CC-TEST007',
        operation: 'submit'
      })
    ).rejects.toThrow('Transformation failed');

    expect(CatchCertPersistence.updateCertificateEuCatchStatus).toHaveBeenCalledWith(
      'GBR-2025-CC-TEST007',
      {
        documentNumber: "GBR-2025-CC-TEST007",
        euCatchStatus: "FAILURE",
        faultCode: "S:Client",
        faultString: "Transformation failed",
      }
    );
  });

  it('should handle processing statement Boomi error', async () => {
    const mockPsDocument = {
      documentNumber: 'GBR-2025-PS-TEST002',
      createdAt: new Date('2025-01-01'),
      exportData: {
        products: [{ product: 'Processed Cod' }],
        catches: [{ species: 'Cod' }],
        exporterDetails: { name: 'Test Processor' }
      }
    };

    const boomiError = new Error('PS Boomi error');

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('processingStatement');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockPsDocument)
    });
    (ProcessingStatementTransformerService.generateProcessingStatementPayload as jest.Mock)
      .mockReturnValue({ CreateCatchProcessingStatementRequest: {} });
    (BoomiService.sendDocumentToBoomi as jest.Mock).mockRejectedValue(boomiError);
    (CatchCertPersistence.updateCertificateEuCatchStatus as jest.Mock).mockResolvedValue(undefined);

    await expect(
      Controller.submitDocumentToBoomi({
        documentNumber: 'GBR-2025-PS-TEST002',
        operation: 'submit'
      })
    ).rejects.toThrow('PS Boomi error');

    expect(CatchCertPersistence.updateCertificateEuCatchStatus).toHaveBeenCalledWith(
      'GBR-2025-PS-TEST002',
      {
        documentNumber: "GBR-2025-PS-TEST002",
        euCatchStatus: "FAILURE",
        faultCode: "S:Client",
        faultString: "PS Boomi error",
      }
    );
  });
});

describe('GET /v1/catch-submission/payload', () => {
  let server: Hapi.Server;

  beforeAll(async () => {
    server = Hapi.server({ port: 9024, host: 'localhost' });
    CatchSubmission.catchSubmissionRoutes(server);
    server.validator(Joi);
    await server.initialize();
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 with the transformed catch certificate payload', async () => {
    const mockDocument = {
      documentNumber: 'GBR-2025-CC-PAYLOAD01',
      createdAt: new Date('2025-01-01'),
      catchSubmission: { status: 'SUCCESS', reference: 'CATCH.CC.GB.2026.0000001' },
      exportData: { products: [{ product: 'Cod' }], exporterDetails: { name: 'Exporter' } }
    };
    const mockPayload = { CreateCatchCertificateRequest: { SPSCertificate: { id: 'abc' } } };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockDocument)
    });
    (CatchCertificateTransformerService.generateCatchPayload as jest.Mock).mockReturnValue(mockPayload);

    const response = await server.inject({
      method: 'GET',
      url: '/v1/catch-submission/payload?documentNumber=GBR-2025-CC-PAYLOAD01',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual(mockPayload);
    expect(CatchCertificateTransformerService.generateCatchPayload).toHaveBeenCalled();
    expect(DataHub.getDocumentType).toHaveBeenCalledWith('GBR-2025-CC-PAYLOAD01');
  });

  it('should return 200 with the transformed processing statement payload', async () => {
    const mockDocument = {
      documentNumber: 'GBR-2025-PS-PAYLOAD01',
      createdAt: new Date('2025-01-01'),
      catchSubmission: { status: 'SUCCESS', reference: 'CATCH.PS.GB.2026.0000001' },
      exportData: {
        products: [{ product: 'Processed Cod' }],
        catches: [{ species: 'Cod' }],
        exporterDetails: { name: 'Processor' }
      }
    };
    const mockPayload = { CreateCatchProcessingStatementRequest: { SPSCertificate: {} } };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('processingStatement');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockDocument)
    });
    (ProcessingStatementTransformerService.generateProcessingStatementPayload as jest.Mock).mockReturnValue(mockPayload);

    const response = await server.inject({
      method: 'GET',
      url: '/v1/catch-submission/payload?documentNumber=GBR-2025-PS-PAYLOAD01',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual(mockPayload);
    expect(ProcessingStatementTransformerService.generateProcessingStatementPayload).toHaveBeenCalled();
  });

  it('should return 200 with the transformed storage notes payload', async () => {
    const mockDocument = {
      documentNumber: 'GBR-2025-SD-PAYLOAD01',
      createdAt: new Date('2025-01-01'),
      catchSubmission: { status: 'SUCCESS', reference: 'CATCH.SD.GB.2026.0000001' },
      exportData: {
        catches: [{ species: 'Cod' }],
        exporterDetails: { name: 'Storer' }
      }
    };
    const mockPayload = { CreateCatchNonManipulationDocumentRequest: { CatchNonManipulationDocument: {} } };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('storageDocument');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockDocument)
    });
    (StorageNotesTransformerService.generateStorageNotesPayload as jest.Mock).mockReturnValue(mockPayload);

    const response = await server.inject({
      method: 'GET',
      url: '/v1/catch-submission/payload?documentNumber=GBR-2025-SD-PAYLOAD01',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual(mockPayload);
    expect(StorageNotesTransformerService.generateStorageNotesPayload).toHaveBeenCalled();
  });

  it('should return 400 when documentNumber is missing', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/catch-submission/payload',
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 404 when document is not found', async () => {
    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(null)
    });

    const response = await server.inject({
      method: 'GET',
      url: '/v1/catch-submission/payload?documentNumber=GBR-2025-CC-NOTFOUND',
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.payload)).toEqual({
      error: 'Document not found for document number: GBR-2025-CC-NOTFOUND'
    });
  });

  it('should return 500 when transformer throws', async () => {
    const mockDocument = {
      documentNumber: 'GBR-2025-CC-ERR01',
      createdAt: new Date('2025-01-01'),
      catchSubmission: { status: 'SUCCESS', reference: 'CATCH.CC.GB.2026.0000002' },
      exportData: { products: [], exporterDetails: {} }
    };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockDocument)
    });
    (CatchCertificateTransformerService.generateCatchPayload as jest.Mock).mockImplementation(() => {
      throw new Error('Transformation failed');
    });

    const response = await server.inject({
      method: 'GET',
      url: '/v1/catch-submission/payload?documentNumber=GBR-2025-CC-ERR01',
    });

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.payload)).toEqual({ error: 'Transformation failed' });
  });

  it('should return 500 when document fetch fails', async () => {
    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockRejectedValue(new Error('DB connection lost'))
    });

    const response = await server.inject({
      method: 'GET',
      url: '/v1/catch-submission/payload?documentNumber=GBR-2025-CC-DBERR',
    });

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.payload)).toEqual({ error: 'DB connection lost' });
  });

  it('should return 500 when document has no exportData', async () => {
    const mockDocument = {
      documentNumber: 'GBR-2025-CC-NOEXPORT',
      createdAt: new Date('2025-01-01'),
      catchSubmission: { status: 'SUCCESS', reference: 'CATCH.CC.GB.2026.0000003' },
      exportData: null
    };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockDocument)
    });

    const response = await server.inject({
      method: 'GET',
      url: '/v1/catch-submission/payload?documentNumber=GBR-2025-CC-NOEXPORT',
    });

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.payload)).toEqual({
      error: 'No exportData found for document number: GBR-2025-CC-NOEXPORT'
    });
  });

  it('should return 500 for an unsupported document type', async () => {
    const mockDocument = {
      documentNumber: 'GBR-2025-XX-UNKNOWN',
      createdAt: new Date('2025-01-01'),
      catchSubmission: { status: 'SUCCESS', reference: 'CATCH.XX.GB.2026.0000001' },
      exportData: { products: [] }
    };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('unknownType');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockDocument)
    });

    const response = await server.inject({
      method: 'GET',
      url: '/v1/catch-submission/payload?documentNumber=GBR-2025-XX-UNKNOWN',
    });

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.payload)).toEqual({ error: 'Unsupported document type: unknownType' });
  });

  it('should return 422 when document has no catchSubmission', async () => {
    const mockDocument = {
      documentNumber: 'GBR-2025-CC-NOCATCH',
      createdAt: new Date('2025-01-01'),
      exportData: { products: [], exporterDetails: {} }
      // catchSubmission intentionally absent
    };

    (DataHub.getDocumentType as jest.Mock).mockReturnValue('catchCert');
    (DocumentModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockDocument)
    });

    const response = await server.inject({
      method: 'GET',
      url: '/v1/catch-submission/payload?documentNumber=GBR-2025-CC-NOCATCH',
    });

    expect(response.statusCode).toBe(422);
    expect(JSON.parse(response.payload)).toEqual({
      error: 'Document not valid for EU Catch: GBR-2025-CC-NOCATCH'
    });
  });
});