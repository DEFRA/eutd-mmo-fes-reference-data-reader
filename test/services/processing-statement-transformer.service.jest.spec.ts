import ProcessingStatementTransformerService from '../../src/services/processing-statement-transformer.service';
import logger from '../../src/logger';

jest.mock('../../src/logger');

describe('ProcessingStatementTransformerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateProcessingStatementPayload', () => {
    const documentNumber = 'GBR-2025-PS-TEST123';
    const createdAt = new Date('2025-01-01T10:00:00Z');

    const baseExportData = {
      exporterDetails: {
        exporterCompanyName: 'Test Exporter Ltd',
        addressOne: '123 Export Street',
        townCity: 'London',
        postcode: 'E1 1AA'
      },
      plantName: 'Test Processing Plant',
      plantApprovalNumber: 'GB-001',
      plantAddressOne: '456 Plant Road',
      plantTownCity: 'Manchester',
      plantPostcode: 'M1 1BB',
      exportedTo: {
        isoCodeAlpha2: 'FR',
        officialCountryName: 'France'
      },
      products: [
        {
          description: 'Frozen Cod Fillets',
          commodityCode: '0304890097'
        }
      ],
      catches: [
        {
          catchCertificateNumber: 'GBR-2025-CC-001',
          exportWeightAfterProcessing: '100.5'
        }
      ],
      consignmentDescription: 'Filleting and freezing'
    };

    it('should generate complete processing statement payload with all fields', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      expect(logger.info).toHaveBeenCalledWith(`[PS-TRANSFORMER][GENERATING-PAYLOAD][${documentNumber}]`);
      expect(logger.info).toHaveBeenCalledWith(`[PS-TRANSFORMER][PAYLOAD-GENERATED][${documentNumber}]`);

      // Verify top-level structure
      expect(result).toHaveProperty('CreateCatchProcessingStatementRequest');
      expect(result.CreateCatchProcessingStatementRequest).toHaveProperty('SPSCertificate');

      const certificate = result.CreateCatchProcessingStatementRequest.SPSCertificate;
      expect(certificate).toHaveProperty('SPSExchangedDocument');
      expect(certificate).toHaveProperty('SPSConsignment');
    });

    it('should build exchanged document with correct document number', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const exchangedDoc = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSExchangedDocument;

      expect(exchangedDoc.ID.value).toBe(documentNumber);
      expect(exchangedDoc.Name.value).toBe('Processing Statement');
      expect(exchangedDoc.Name.languageID).toBe('en');
    });

    it('should set document type code to 17 for processing statement', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const exchangedDoc = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSExchangedDocument;

      expect(exchangedDoc.TypeCode.value).toBe('17');
      expect(exchangedDoc.TypeCode.name).toBe('PROCESSING_STATEMENT');
      expect(exchangedDoc.TypeCode.listAgencyID).toBe('EU_IUU_CATCH_CERT');
    });

    it('should set status code to 39 for FINAL', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const exchangedDoc = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSExchangedDocument;

      expect(exchangedDoc.StatusCode.value).toBe('39');
      expect(exchangedDoc.StatusCode.name).toBe('FINAL');
    });

    it('should set issue date time using formatDate', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const exchangedDoc = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSExchangedDocument;

      expect(exchangedDoc.IssueDateTime.DateTime.value).toBe('2025-01-01T10:00:00.000Z');
    });

    it('should set issuer party as Marine Management Organization', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const exchangedDoc = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSExchangedDocument;

      expect(exchangedDoc.IssuerSPSParty.Name.value).toBe('Marine Management Organization');
      expect(exchangedDoc.IssuerSPSParty.RoleCode.value).toBe('PQ');
    });

    it('should include reference documents', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const exchangedDoc = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSExchangedDocument;

      expect(exchangedDoc.ReferenceSPSReferencedDocument).toHaveLength(3);
      expect(exchangedDoc.ReferenceSPSReferencedDocument[0].TypeCode.value).toBe('916');
      expect(exchangedDoc.ReferenceSPSReferencedDocument[1].TypeCode.name).toBe('HEALTH_CERTIFICATE');
      expect(exchangedDoc.ReferenceSPSReferencedDocument[2].ID.value).toBe('Regulation No 1005/2008 ARTICLE 12 ANNEX II');
    });

    it('should include signatory authentication with two signatures', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const exchangedDoc = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSExchangedDocument;

      expect(exchangedDoc.SignatorySPSAuthentication).toHaveLength(2);
      expect(exchangedDoc.SignatorySPSAuthentication[0].TypeCode.value).toBe('1');
      expect(exchangedDoc.SignatorySPSAuthentication[1].TypeCode.value).toBe('2');
      expect(exchangedDoc.SignatorySPSAuthentication[1].ProviderSPSParty.Name.value).toBe('Marine Management Organization');
    });

    it('should build consignor party with plant details', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ConsignorSPSParty.ID.value).toBe('GB-001');
      expect(consignment.ConsignorSPSParty.Name.value).toBe('Test Processing Plant');
      expect(consignment.ConsignorSPSParty.RoleCode.value).toBe('CZ');
      expect(consignment.ConsignorSPSParty.SpecifiedSPSAddress.LineOne.value).toBe('456 Plant Road');
      expect(consignment.ConsignorSPSParty.SpecifiedSPSAddress.CityName.value).toBe('Manchester');
      expect(consignment.ConsignorSPSParty.SpecifiedSPSAddress.PostcodeCode.value).toBe('M1 1BB');
      expect(consignment.ConsignorSPSParty.SpecifiedSPSAddress.CountryID.value).toBe('GB');
    });

    it('should handle missing plant details gracefully', () => {
      const exportDataWithoutPlant = {
        ...baseExportData,
        plantName: undefined,
        plantApprovalNumber: undefined,
        plantAddressOne: undefined,
        plantTownCity: undefined,
        plantPostcode: undefined
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithoutPlant
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ConsignorSPSParty.ID.value).toBe('');
      expect(consignment.ConsignorSPSParty.Name.value).toBe('');
      expect(consignment.ConsignorSPSParty.SpecifiedSPSAddress.LineOne.value).toBe('');
      expect(consignment.ConsignorSPSParty.SpecifiedSPSAddress.CityName.value).toBe('');
      expect(consignment.ConsignorSPSParty.SpecifiedSPSAddress.PostcodeCode.value).toBe('');
    });

    it('should build consignee party with exporter details', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ConsigneeSPSParty.ID.value).toBe('Test Exporter Ltd');
      expect(consignment.ConsigneeSPSParty.Name.value).toBe('Test Exporter Ltd');
      expect(consignment.ConsigneeSPSParty.RoleCode.value).toBe('CN');
      expect(consignment.ConsigneeSPSParty.SpecifiedSPSAddress.LineOne.value).toBe('123 Export Street');
      expect(consignment.ConsigneeSPSParty.SpecifiedSPSAddress.CityName.value).toBe('London');
      expect(consignment.ConsigneeSPSParty.SpecifiedSPSAddress.PostcodeCode.value).toBe('E1 1AA');
      expect(consignment.ConsigneeSPSParty.SpecifiedSPSAddress.CountryID.value).toBe('GB');
    });

    it('should handle missing exporter details gracefully', () => {
      const exportDataWithoutExporter = {
        ...baseExportData,
        exporterDetails: {}
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithoutExporter
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ConsigneeSPSParty.ID.value).toBe('');
      expect(consignment.ConsigneeSPSParty.Name.value).toBe('');
      expect(consignment.ConsigneeSPSParty.SpecifiedSPSAddress.LineOne.value).toBe('');
    });

    it('should set export country to GB (United Kingdom)', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ExportSPSCountry.ID.value).toBe('GB');
      expect(consignment.ExportSPSCountry.Name.value).toBe('United Kingdom');
    });

    it('should set loading location to GB01', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.LoadingBaseportSPSLocation.ID.value).toBe('GB01');
      expect(consignment.LoadingBaseportSPSLocation.Name.value).toBe('GB');
    });

    it('should build import country from exportedTo details', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ImportSPSCountry.ID.value).toBe('FR');
      expect(consignment.ImportSPSCountry.Name.value).toBe('FRANCE');
    });

    it('should default import country to FR when exportedTo is missing', () => {
      const exportDataWithoutDestination = {
        ...baseExportData,
        exportedTo: null
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithoutDestination
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ImportSPSCountry.ID.value).toBe('FR');
      expect(consignment.ImportSPSCountry.Name.value).toBe('FRANCE');
    });

    it('should handle missing isoCodeAlpha2 in exportedTo', () => {
      const exportDataWithPartialDestination = {
        ...baseExportData,
        exportedTo: {
          officialCountryName: 'Spain'
        }
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithPartialDestination
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ImportSPSCountry.ID.value).toBe('FR');
      expect(consignment.ImportSPSCountry.Name.value).toBe('SPAIN');
    });

    it('should convert country name to uppercase', () => {
      const exportDataWithLowerCase = {
        ...baseExportData,
        exportedTo: {
          isoCodeAlpha2: 'ES',
          officialCountryName: 'spain'
        }
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithLowerCase
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ImportSPSCountry.Name.value).toBe('SPAIN');
    });

    it('should build unloading location based on import country', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.UnloadingBaseportSPSLocation.ID.value).toBe('FR01');
      expect(consignment.UnloadingBaseportSPSLocation.Name.value).toBe('FR');
    });

    it('should default unloading location to FR01 when exportedTo is missing', () => {
      const exportDataWithoutDestination = {
        ...baseExportData,
        exportedTo: undefined
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithoutDestination
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.UnloadingBaseportSPSLocation.ID.value).toBe('FR01');
    });

    it('should include examination event location', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ExaminationSPSEvent.OccurrenceSPSLocation.Name.value).toBe('');
    });

    it('should build consignment item with product details', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.SequenceNumeric.value).toBe(1);
      expect(item.Description.value).toBe('Frozen Cod Fillets');
    });

    it('should calculate total weight from catches', () => {
      const exportDataWithMultipleCatches = {
        ...baseExportData,
        catches: [
          { catchCertificateNumber: 'GBR-2025-CC-001', exportWeightAfterProcessing: '100.5' },
          { catchCertificateNumber: 'GBR-2025-CC-002', exportWeightAfterProcessing: '50.25' },
          { catchCertificateNumber: 'GBR-2025-CC-003', exportWeightAfterProcessing: '75' }
        ]
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithMultipleCatches
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.NetWeightMeasure.value).toBe('225.75');
      expect(item.GrossWeightMeasure.value).toBe('225.75');
    });

    it('should handle missing catches array', () => {
      const exportDataWithoutCatches = {
        ...baseExportData,
        catches: undefined
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithoutCatches
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.NetWeightMeasure.value).toBe('0');
      expect(item.GrossWeightMeasure.value).toBe('0');
    });

    it('should handle catches without exportWeightAfterProcessing', () => {
      const exportDataWithIncompleteCatches = {
        ...baseExportData,
        catches: [
          { catchCertificateNumber: 'GBR-2025-CC-001' },
          { catchCertificateNumber: 'GBR-2025-CC-002', exportWeightAfterProcessing: '50' }
        ]
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithIncompleteCatches
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.NetWeightMeasure.value).toBe('50');
    });

    it('should set weight unit to KGM (kilograms)', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.NetWeightMeasure.unitCode).toBe('KGM');
      expect(item.GrossWeightMeasure.unitCode).toBe('KGM');
    });

    it('should add catch certificate references to additional information notes', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.AdditionalInformationSPSNote).toHaveLength(2);
      expect(item.AdditionalInformationSPSNote[0].Content.value).toBe('GBR-2025-CC-001');
      expect(item.AdditionalInformationSPSNote[0].SubjectCode.value).toBe('CATCH_CERTIFICATE_REFERENCE');
    });

    it('should add processing type to additional information notes', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.AdditionalInformationSPSNote[1].Content.value).toBe('Filleting and freezing');
      expect(item.AdditionalInformationSPSNote[1].SubjectCode.value).toBe('PROCESSING_TYPE');
    });

    it('should handle multiple catch certificate references', () => {
      const exportDataWithMultipleCerts = {
        ...baseExportData,
        catches: [
          { catchCertificateNumber: 'GBR-2025-CC-001', exportWeightAfterProcessing: '50' },
          { catchCertificateNumber: 'GBR-2025-CC-002', exportWeightAfterProcessing: '50' },
          { catchCertificateNumber: 'GBR-2025-CC-003', exportWeightAfterProcessing: '50' }
        ]
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithMultipleCerts
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.AdditionalInformationSPSNote.length).toBe(4); // 3 catch certs + 1 processing type
      expect(item.AdditionalInformationSPSNote[0].Content.value).toBe('GBR-2025-CC-001');
      expect(item.AdditionalInformationSPSNote[1].Content.value).toBe('GBR-2025-CC-002');
      expect(item.AdditionalInformationSPSNote[2].Content.value).toBe('GBR-2025-CC-003');
    });

    it('should handle catches without certificate numbers', () => {
      const exportDataWithoutCertNumbers = {
        ...baseExportData,
        catches: [
          { exportWeightAfterProcessing: '100' }
        ]
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithoutCertNumbers
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      // Should only have processing type note, no catch certificate references
      expect(item.AdditionalInformationSPSNote.length).toBe(1);
      expect(item.AdditionalInformationSPSNote[0].SubjectCode.value).toBe('PROCESSING_TYPE');
    });

    it('should handle missing consignment description', () => {
      const exportDataWithoutDescription = {
        ...baseExportData,
        consignmentDescription: undefined
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithoutDescription
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      // Should only have catch certificate reference, no processing type
      expect(item.AdditionalInformationSPSNote.length).toBe(1);
      expect(item.AdditionalInformationSPSNote[0].SubjectCode.value).toBe('CATCH_CERTIFICATE_REFERENCE');
    });

    it('should set CN classification system for commodity code', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.ApplicableSPSClassification.SystemID.value).toBe('CN');
      expect(item.ApplicableSPSClassification.SystemName.value).toBe('CN Code');
    });

    it('should include commodity code and description in classification', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.ApplicableSPSClassification.ClassCode.value).toBe('0304890097');
      expect(item.ApplicableSPSClassification.ClassName.value).toBe('Frozen Cod Fillets');
    });

    it('should handle missing products array', () => {
      const exportDataWithoutProducts = {
        ...baseExportData,
        products: undefined
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithoutProducts
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.Description.value).toBe('');
      expect(item.ApplicableSPSClassification.ClassCode.value).toBe('');
      expect(item.ApplicableSPSClassification.ClassName.value).toBe('');
    });

    it('should handle empty products array', () => {
      const exportDataWithEmptyProducts = {
        ...baseExportData,
        products: []
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithEmptyProducts
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.Description.value).toBe('');
      expect(item.ApplicableSPSClassification.ClassCode.value).toBe('');
    });

    it('should handle product without description', () => {
      const exportDataWithIncompleteProduct = {
        ...baseExportData,
        products: [
          { commodityCode: '0304890097' }
        ]
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithIncompleteProduct
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.Description.value).toBe('');
      expect(item.ApplicableSPSClassification.ClassName.value).toBe('');
    });

    it('should handle product without commodity code', () => {
      const exportDataWithIncompleteProduct = {
        ...baseExportData,
        products: [
          { description: 'Frozen Cod Fillets' }
        ]
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithIncompleteProduct
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.ApplicableSPSClassification.ClassCode.value).toBe('');
    });

    it('should log error and throw when exception occurs', () => {
      expect(() => {
        ProcessingStatementTransformerService.generateProcessingStatementPayload(
          documentNumber,
          null,
          baseExportData
        );
      }).toThrow('Cannot read properties of null (reading \'toISOString\')');

      expect(logger.error).toHaveBeenCalledWith(`[PS-TRANSFORMER][ERROR][${documentNumber}][Cannot read properties of null (reading 'toISOString')]`);
    });

    it('should handle null exportData gracefully', () => {
      expect(() => {
        ProcessingStatementTransformerService.generateProcessingStatementPayload(
          documentNumber,
          createdAt,
          null
        );
      }).toThrow();

      expect(logger.error).toHaveBeenCalled();
    });

    it('should use first product when multiple products exist', () => {
      const exportDataWithMultipleProducts = {
        ...baseExportData,
        products: [
          { description: 'First Product', commodityCode: '1111111111' },
          { description: 'Second Product', commodityCode: '2222222222' }
        ]
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithMultipleProducts
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.Description.value).toBe('First Product');
      expect(item.ApplicableSPSClassification.ClassCode.value).toBe('1111111111');
    });

    it('should handle decimal weights correctly', () => {
      const exportDataWithDecimalWeights = {
        ...baseExportData,
        catches: [
          { catchCertificateNumber: 'GBR-2025-CC-001', exportWeightAfterProcessing: '100.567' },
          { catchCertificateNumber: 'GBR-2025-CC-002', exportWeightAfterProcessing: '50.123' }
        ]
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithDecimalWeights
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.NetWeightMeasure.value).toBe('150.69');
    });

    it('should handle empty catches array', () => {
      const exportDataWithEmptyCatches = {
        ...baseExportData,
        catches: []
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithEmptyCatches
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.NetWeightMeasure.value).toBe('0');
      expect(item.AdditionalInformationSPSNote.length).toBe(1); // Only processing type
    });

    it('should handle different country codes', () => {
      const exportDataWithDifferentCountry = {
        ...baseExportData,
        exportedTo: {
          isoCodeAlpha2: 'ES',
          officialCountryName: 'Spain'
        }
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithDifferentCountry
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ImportSPSCountry.ID.value).toBe('ES');
      expect(consignment.ImportSPSCountry.Name.value).toBe('SPAIN');
      expect(consignment.UnloadingBaseportSPSLocation.ID.value).toBe('ES01');
      expect(consignment.UnloadingBaseportSPSLocation.Name.value).toBe('ES');
    });

    it('should use plant values when all plant fields are provided', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      // Verify all plant fields use actual values, not defaults
      expect(consignment.ConsignorSPSParty.ID.value).toBe('GB-001');
      expect(consignment.ConsignorSPSParty.Name.value).toBe('Test Processing Plant');
      expect(consignment.ConsignorSPSParty.SpecifiedSPSAddress.LineOne.value).toBe('456 Plant Road');
      expect(consignment.ConsignorSPSParty.SpecifiedSPSAddress.CityName.value).toBe('Manchester');
      expect(consignment.ConsignorSPSParty.SpecifiedSPSAddress.PostcodeCode.value).toBe('M1 1BB');
    });

    it('should use exporter values when all exporter fields are provided', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      // Verify all exporter fields use actual values, not defaults
      expect(consignment.ConsigneeSPSParty.ID.value).toBe('Test Exporter Ltd');
      expect(consignment.ConsigneeSPSParty.Name.value).toBe('Test Exporter Ltd');
      expect(consignment.ConsigneeSPSParty.SpecifiedSPSAddress.LineOne.value).toBe('123 Export Street');
      expect(consignment.ConsigneeSPSParty.SpecifiedSPSAddress.CityName.value).toBe('London');
      expect(consignment.ConsigneeSPSParty.SpecifiedSPSAddress.PostcodeCode.value).toBe('E1 1AA');
    });

    it('should handle null plant object', () => {
      const exportDataWithNullPlant = {
        ...baseExportData,
        plantName: null,
        plantApprovalNumber: null,
        plantAddressOne: null,
        plantTownCity: null,
        plantPostcode: null
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithNullPlant
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ConsignorSPSParty.ID.value).toBe('');
      expect(consignment.ConsignorSPSParty.Name.value).toBe('');
    });

    it('should handle empty string plant fields', () => {
      const exportDataWithEmptyPlant = {
        ...baseExportData,
        plantName: '',
        plantApprovalNumber: '',
        plantAddressOne: '',
        plantTownCity: '',
        plantPostcode: ''
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithEmptyPlant
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ConsignorSPSParty.ID.value).toBe('');
      expect(consignment.ConsignorSPSParty.Name.value).toBe('');
      expect(consignment.ConsignorSPSParty.SpecifiedSPSAddress.LineOne.value).toBe('');
      expect(consignment.ConsignorSPSParty.SpecifiedSPSAddress.CityName.value).toBe('');
      expect(consignment.ConsignorSPSParty.SpecifiedSPSAddress.PostcodeCode.value).toBe('');
    });    it('should handle null exporter fields', () => {
      const exportDataWithNullExporter = {
        ...baseExportData,
        exporterDetails: {
          exporterCompanyName: null,
          addressOne: null,
          townCity: null,
          postcode: null
        }
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithNullExporter
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ConsigneeSPSParty.ID.value).toBe('');
      expect(consignment.ConsigneeSPSParty.Name.value).toBe('');
      expect(consignment.ConsigneeSPSParty.SpecifiedSPSAddress.LineOne.value).toBe('');
    });

    it('should handle empty string exporter fields', () => {
      const exportDataWithEmptyExporter = {
        ...baseExportData,
        exporterDetails: {
          exporterCompanyName: '',
          addressOne: '',
          townCity: '',
          postcode: ''
        }
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithEmptyExporter
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ConsigneeSPSParty.ID.value).toBe('');
      expect(consignment.ConsigneeSPSParty.Name.value).toBe('');
      expect(consignment.ConsigneeSPSParty.SpecifiedSPSAddress.LineOne.value).toBe('');
      expect(consignment.ConsigneeSPSParty.SpecifiedSPSAddress.CityName.value).toBe('');
      expect(consignment.ConsigneeSPSParty.SpecifiedSPSAddress.PostcodeCode.value).toBe('');
    });

    it('should handle exportedTo with null officialCountryName', () => {
      const exportDataWithNullCountryName = {
        ...baseExportData,
        exportedTo: {
          isoCodeAlpha2: 'DE',
          officialCountryName: null
        }
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithNullCountryName
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ImportSPSCountry.ID.value).toBe('DE');
      expect(consignment.ImportSPSCountry.Name.value).toBe('FRANCE'); // Falls back to default
    });

    it('should handle exportedTo with empty isoCodeAlpha2', () => {
      const exportDataWithEmptyCode = {
        ...baseExportData,
        exportedTo: {
          isoCodeAlpha2: '',
          officialCountryName: 'Germany'
        }
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithEmptyCode
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ImportSPSCountry.ID.value).toBe('FR'); // Falls back to default
    });

    it('should handle product with all fields present', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      // Verify actual values are used, not defaults
      expect(item.Description.value).toBe('Frozen Cod Fillets');
      expect(item.ApplicableSPSClassification.ClassCode.value).toBe('0304890097');
      expect(item.ApplicableSPSClassification.ClassName.value).toBe('Frozen Cod Fillets');
    });

    it('should handle product with null description', () => {
      const exportDataWithNullDescription = {
        ...baseExportData,
        products: [
          { description: null, commodityCode: '0304890097' }
        ]
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithNullDescription
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.Description.value).toBe('');
    });

    it('should handle product with null commodity code', () => {
      const exportDataWithNullCode = {
        ...baseExportData,
        products: [
          { description: 'Frozen Cod', commodityCode: null }
        ]
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithNullCode
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      expect(item.ApplicableSPSClassification.ClassCode.value).toBe('');
    });

    it('should handle catch with exportWeightAfterProcessing present', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      // Verify weight from catch is used
      expect(item.NetWeightMeasure.value).toBe('100.5');
    });

    it('should handle catch with catchCertificateNumber present', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      // Verify certificate number is included in notes
      expect(item.AdditionalInformationSPSNote[0].Content.value).toBe('GBR-2025-CC-001');
    });

    it('should handle consignmentDescription present', () => {
      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      // Verify processing type is included in notes
      const processingNote = item.AdditionalInformationSPSNote.find(
        (note: any) => note.SubjectCode.value === 'PROCESSING_TYPE'
      );
      expect(processingNote.Content.value).toBe('Filleting and freezing');
    });

    it('should handle catch with zero weight', () => {
      const exportDataWithZeroWeight = {
        ...baseExportData,
        catches: [
          {
            species: 'Atlantic cod',
            catchCertificateNumber: 'GBR-2025-CC-001',
            exportWeightAfterProcessing: 0
          }
        ]
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithZeroWeight
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      // Zero is falsy, should not be added to weight
      expect(item.NetWeightMeasure.value).toBe('0');
    });

    it('should handle catch with empty string certificate number', () => {
      const exportDataWithEmptyCert = {
        ...baseExportData,
        catches: [
          {
            species: 'Atlantic cod',
            catchCertificateNumber: '',
            exportWeightAfterProcessing: 50.5
          }
        ]
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithEmptyCert
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      // Empty string is falsy, should not be added as note
      expect(item.AdditionalInformationSPSNote).toHaveLength(1); // Only PROCESSING_TYPE note
    });

    it('should handle empty string consignmentDescription', () => {
      const exportDataWithEmptyDescription = {
        ...baseExportData,
        consignmentDescription: ''
      };

      const result = ProcessingStatementTransformerService.generateProcessingStatementPayload(
        documentNumber,
        createdAt,
        exportDataWithEmptyDescription
      );

      const consignment = result.CreateCatchProcessingStatementRequest.SPSCertificate.SPSConsignment;
      const item = consignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

      // Empty string is falsy, should not add processing type note
      expect(item.AdditionalInformationSPSNote).toHaveLength(1); // Only catch certificate note
    });
  });
});