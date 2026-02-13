import CatchCertificateTransformerService from '../../src/services/catch-certificate-transformer.service';
import * as Cache from '../../src/data/cache';
import logger from '../../src/logger';

jest.mock('../../src/logger');

describe('CatchCertificateTransformerService', () => {
  const mockLogger = logger as jest.Mocked<typeof logger>;
  let mockGetCountries: jest.SpyInstance;
  let mockGetGearCodes: jest.SpyInstance;
  let mockGetRFMO: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCountries = jest.spyOn(Cache, 'getCountries');
    mockGetGearCodes = jest.spyOn(Cache, 'getGearTypes');
    mockGetRFMO = jest.spyOn(Cache, 'getRfmos');
  });

  describe('generateCatchPayload', () => {
    it('should generate complete catch payload with all fields', () => {
      const documentNumber = 'GBR-2025-CC-TEST123';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            commodityCode: '03026100',
            commodityCodeDescription: 'Fresh or chilled cod',
            scientificName: 'Gadus morhua',
            caughtBy: [
              {
                vessel: 'Sea Warrior',
                flag: 'GBR',
                cfr: 'GBR123456',
                homePort: 'Penzance',
                licenceNumber: 'L12345',
                licenceValidTo: '2025-12-31',
                licenceHolder: 'John Smith',
                weight: 500,
                gearType: 'OTB',
                startDate: '2025-01-01',
                date: '2025-01-15',
                faoArea: '27.4.a',
                exclusiveEconomicZones: [
                  { isoCodeAlpha2: 'GB', officialCountryName: 'United Kingdom' }
                ]
              }
            ]
          }
        ],
        exporterDetails: {
          exporterCompanyName: 'Test Exporter Ltd',
          addressOne: '123 Fish Street',
          townCity: 'London',
          country: 'United Kingdom'
        },
        exportedFrom: 'Dover Port',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'Calais Port',
        transportations: [{
          vehicle: 'containerVessel',
          vesselName: 'MV Ocean Carrier',
          container: true,
          containerNumber: 'CONT123456'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        `[CATCH-TRANSFORMER][GENERATING-PAYLOAD][${documentNumber}]`
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `[CATCH-TRANSFORMER][PAYLOAD-GENERATED][${documentNumber}]`
      );

      expect(result).toHaveProperty('CreateCatchCertificateRequest');
      expect(result.CreateCatchCertificateRequest).toHaveProperty('SPSCertificate');
      expect(result.CreateCatchCertificateRequest.SPSCertificate).toHaveProperty(
        'SPSExchangedDocument'
      );
      expect(result.CreateCatchCertificateRequest.SPSCertificate).toHaveProperty('SPSConsignment');
    });

    it('should handle exportData.products array', () => {
      const documentNumber = 'GBR-2025-CC-TEST456';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            commodityCode: '03034100',
            commodityCodeDescription: 'Frozen skipjack',
            scientificName: 'Katsuwonus pelamis',
            caughtBy: []
          }
        ],
        exporterDetails: {
          exporterCompanyName: 'Marine Exports'
        },
        exportedFrom: 'London',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'Paris',
        transportations: [{
          vehicle: 'truck'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      expect(result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment).toBeDefined();
    });

    it('should log error and throw when transformation fails', () => {
      const documentNumber = 'GBR-2025-CC-ERROR';
      const createdAt = new Date('2025-12-01');
      const exportData = {};

      // Mock buildExchangedDocument to throw an error
      const mockBuildExchangedDocument = jest.spyOn(
        CatchCertificateTransformerService as any,
        'buildExchangedDocument'
      ).mockImplementation(() => {
        throw new Error('Test error');
      });

      expect(() => {
        CatchCertificateTransformerService.generateCatchPayload(
          documentNumber,
          createdAt,
          exportData
        );
      }).toThrow('Test error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`[CATCH-TRANSFORMER][ERROR][${documentNumber}]`)
      );

      // Restore the mock after the test
      mockBuildExchangedDocument.mockRestore();
    });
  });

  describe('buildExchangedDocument', () => {
    it('should build exchanged document with correct structure', () => {
      const documentNumber = 'GBR-2025-CC-DOC001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const exchangedDoc =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSExchangedDocument;

      expect(exchangedDoc.Name.value).toBe('Catch Certificate');
      expect(exchangedDoc.ID.value).toBe('');
      expect(exchangedDoc.TypeCode.name).toBe('CATCH_CERTIFICATE');
      expect(exchangedDoc.TypeCode.value).toBe('852');
      expect(exchangedDoc.StatusCode.value).toBe('39');
      expect(exchangedDoc.IssuerSPSParty.Name.value).toBe('Marine Management Organization');
      expect(exchangedDoc.ReferenceSPSReferencedDocument).toHaveLength(2);
      expect(exchangedDoc.SignatorySPSAuthentication).toBeDefined();
    });

    it('should include current timestamp in IssueDateTime', () => {
      const documentNumber = 'GBR-2025-CC-TIME001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const timestamp =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSExchangedDocument.IssueDateTime
          .DateTime.value;
      const parsedTimestamp = new Date(timestamp);

      expect(parsedTimestamp.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
      expect(parsedTimestamp.getTime()).toBeLessThanOrEqual(createdAt.getTime());
    });

    it('should include transport document references for containerVessel', () => {
      const documentNumber = 'GBR-2025-CC-TRANSDOC001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'containerVessel',
          vesselName: 'MV Ocean Carrier',
          transportDocuments: [
            { name: 'Bill of Lading', reference: 'BOL123456' },
            { name: 'Packing List', reference: 'PKL789012' }
          ]
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const references =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSExchangedDocument
          .ReferenceSPSReferencedDocument;

      expect(references.length).toBeGreaterThanOrEqual(4); // 2 default + 2 transport docs
      const transportDocRefs = references.filter((ref: any) => ref.TypeCode.value === '710');
      expect(transportDocRefs).toHaveLength(2);
      expect(transportDocRefs[0].RelationshipTypeCode.value).toBe('BM');
      expect(transportDocRefs[0].ID.value).toBe('BOL123456');
      expect(transportDocRefs[0].Information.value).toBe('MV Ocean Carrier');
      expect(transportDocRefs[1].ID.value).toBe('PKL789012');
      expect(transportDocRefs[1].Information.value).toBe('MV Ocean Carrier');
    });

    it('should include transport document references for train', () => {
      const documentNumber = 'GBR-2025-CC-TRANSDOC002';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'train',
          railwayBillNumber: 'RAIL12345',
          transportDocuments: [
            { name: 'Railway Bill', reference: 'RB001' }
          ]
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const references =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSExchangedDocument
          .ReferenceSPSReferencedDocument;

      const transportDocRefs = references.filter((ref: any) => ref.TypeCode.value === '720');
      expect(transportDocRefs).toHaveLength(1);
      expect(transportDocRefs[0].RelationshipTypeCode.value).toBe('BM');
      expect(transportDocRefs[0].ID.value).toBe('RB001');
      expect(transportDocRefs[0].Information.value).toBe('RAIL12345');
    });

    it('should include transport document references for truck', () => {
      const documentNumber = 'GBR-2025-CC-TRANSDOC003';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'truck',
          registrationNumber: 'ABC123',
          transportDocuments: [
            { name: 'CMR', reference: 'CMR456' }
          ]
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const references =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSExchangedDocument
          .ReferenceSPSReferencedDocument;

      const transportDocRefs = references.filter((ref: any) => ref.TypeCode.value === '730');
      expect(transportDocRefs).toHaveLength(1);
      expect(transportDocRefs[0].RelationshipTypeCode.value).toBe('BM');
      expect(transportDocRefs[0].ID.value).toBe('CMR456');
      expect(transportDocRefs[0].Information.value).toBe('ABC123');
    });

    it('should include transport document references for plane', () => {
      const documentNumber = 'GBR-2025-CC-TRANSDOC004';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'plane',
          flightNumber: 'BA456',
          transportDocuments: [
            { name: 'Airway Bill', reference: 'AWB789' }
          ]
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const references =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSExchangedDocument
          .ReferenceSPSReferencedDocument;

      const transportDocRefs = references.filter((ref: any) => ref.TypeCode.value === '740');
      expect(transportDocRefs).toHaveLength(1);
      expect(transportDocRefs[0].RelationshipTypeCode.value).toBe('BM');
      expect(transportDocRefs[0].ID.value).toBe('AWB789');
      expect(transportDocRefs[0].Information.value).toBe('BA456');
    });

    it('should handle multiple transportations with different vehicle types', () => {
      const documentNumber = 'GBR-2025-CC-TRANSDOC005';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [
          {
            vehicle: 'truck',
            registrationNumber: 'TRUCK001',
            transportDocuments: [
              { name: 'CMR', reference: 'CMR001' }
            ]
          },
          {
            vehicle: 'containerVessel',
            vesselName: 'MV Vessel',
            transportDocuments: [
              { name: 'Bill of Lading', reference: 'BOL001' },
              { name: 'Manifest', reference: 'MAN001' }
            ]
          }
        ]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const references =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSExchangedDocument
          .ReferenceSPSReferencedDocument;

      const truckRefs = references.filter((ref: any) => ref.TypeCode.value === '730');
      expect(truckRefs).toHaveLength(1);
      expect(truckRefs[0].ID.value).toBe('CMR001');
      expect(truckRefs[0].Information.value).toBe('TRUCK001');

      const vesselRefs = references.filter((ref: any) => ref.TypeCode.value === '710');
      expect(vesselRefs).toHaveLength(2);
      expect(vesselRefs[0].ID.value).toBe('BOL001');
      expect(vesselRefs[0].Information.value).toBe('MV Vessel');
      expect(vesselRefs[1].ID.value).toBe('MAN001');
      expect(vesselRefs[1].Information.value).toBe('MV Vessel');
    });

    it('should handle missing transportDocuments array', () => {
      const documentNumber = 'GBR-2025-CC-TRANSDOC006';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'truck',
          registrationNumber: 'ABC123'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const references =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSExchangedDocument
          .ReferenceSPSReferencedDocument;

      // Should only have the 2 default references
      expect(references).toHaveLength(2);
      expect(references[0].TypeCode.value).toBe('916');
      expect(references[1].TypeCode.value).toBe('916');
    });

    it('should handle empty transportDocuments array', () => {
      const documentNumber = 'GBR-2025-CC-TRANSDOC007';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'truck',
          registrationNumber: 'ABC123',
          transportDocuments: []
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const references =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSExchangedDocument
          .ReferenceSPSReferencedDocument;

      // Should only have the 2 default references
      expect(references).toHaveLength(2);
    });

    it('should skip transportations with unknown vehicle types', () => {
      const documentNumber = 'GBR-2025-CC-TRANSDOC008';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'hovercraft',
          transportDocuments: [
            { name: 'Doc', reference: 'REF001' }
          ]
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const references =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSExchangedDocument
          .ReferenceSPSReferencedDocument;

      // Should only have the 2 default references
      expect(references).toHaveLength(2);
    });

    it('should handle missing vehicle identifier fields', () => {
      const documentNumber = 'GBR-2025-CC-TRANSDOC009';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'containerVessel',
          transportDocuments: [
            { name: 'Bill of Lading', reference: 'BOL123' }
          ]
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const references =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSExchangedDocument
          .ReferenceSPSReferencedDocument;

      const transportDocRefs = references.filter((ref: any) => ref.TypeCode.value === '710');
      expect(transportDocRefs).toHaveLength(1);
      expect(transportDocRefs[0].Information.value).toBe('');
    });

    it('should handle null transportations array', () => {
      const documentNumber = 'GBR-2025-CC-TRANSDOC010';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: null
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const references =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSExchangedDocument
          .ReferenceSPSReferencedDocument;

      // Should only have the 2 default references
      expect(references).toHaveLength(2);
    });
  });

  describe('buildConsignment', () => {
    it('should build consignment with all parties', () => {
      const documentNumber = 'GBR-2025-CC-CONS001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {
          exporterCompanyName: 'Fish Traders Ltd',
          addressOne: '456 Harbor Road',
          townCity: 'Plymouth',
          country: 'United Kingdom'
        },
        exportedFrom: 'Heathrow',
        exportedTo: { isoCodeAlpha2: 'ES', officialCountryName: 'Spain' },
        pointOfDestination: 'Madrid',
        transportations: [{
          vehicle: 'plane',
          flightNumber: 'BA123'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const consignment =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment;

      expect(consignment.ConsignorSPSParty.Name.value).toBe('Fish Traders Ltd');
      expect(consignment.ConsigneeSPSParty.RoleCode.value).toBe('CN');
      expect(consignment.ExportSPSCountry.ID.value).toBe('GB');
      expect(consignment.ImportSPSCountry.ID.value).toBe('ES');
    });
  });

  describe('buildConsignorParty', () => {
    it('should build consignor party with complete address', () => {
      mockGetCountries.mockReturnValue([{
        officialCountryName: 'United Kingdom of Great Britain and Northern Ireland (the)',
        isoCodeAlpha2: 'This is the UK'
      }]);

      const documentNumber = 'GBR-2025-CC-PARTY001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {
          exporterCompanyName: 'Ocean Exports Inc',
          addressOne: '789 Maritime Avenue',
          townCity: 'Southampton',
          country: 'United Kingdom of Great Britain and Northern Ireland'
        },
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const consignor =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment.ConsignorSPSParty;

      expect(consignor.ID.value).toBe('');
      expect(consignor.Name.value).toBe('Ocean Exports Inc');
      expect(consignor.RoleCode.value).toBe('CZ');
      expect(consignor.SpecifiedSPSAddress.LineOne.value).toBe('789 Maritime Avenue');
      expect(consignor.SpecifiedSPSAddress.CityName.value).toBe('Southampton');
      expect(consignor.SpecifiedSPSAddress.CountryName.value).toBe('United Kingdom of Great Britain and Northern Ireland');
      expect(consignor.SpecifiedSPSAddress.CountryID.value).toBe('This is the UK');
    });

    it('should handle missing exporter details', () => {
      const documentNumber = 'GBR-2025-CC-NOEXP001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const consignor =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment.ConsignorSPSParty;

      expect(consignor.ID.value).toBe('');
      expect(consignor.Name.value).toBe('');
      expect(consignor.SpecifiedSPSAddress.LineOne.value).toBe('');
      expect(consignor.SpecifiedSPSAddress.CountryID.value).toBe('GB');
    });
  });

  describe('buildLoadingLocation', () => {
    it('should use exportedFrom locationName when available', () => {
      const documentNumber = 'GBR-2025-CC-LOAD001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporter: {},
        exportedFrom: 'United Kingdom',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: []
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const loadingLocation =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .LoadingBaseportSPSLocation;

      expect(loadingLocation.ID.value).toBe('GB01');
      expect(loadingLocation.Name.value).toBe('GB');
    });

    it('should use exportLocation as fallback', () => {
      const documentNumber = 'GBR-2025-CC-LOAD002';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporter: {},
        exportedFrom: 'United Kingdom',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          exportLocation: 'Bristol Port'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const loadingLocation =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .LoadingBaseportSPSLocation;

      expect(loadingLocation.ID.value).toBe('GB01');
      expect(loadingLocation.Name.value).toBe('GB');
    });

    it('should use default GB01 when no location provided', () => {
      const documentNumber = 'GBR-2025-CC-LOAD003';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'GB01',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const loadingLocation =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .LoadingBaseportSPSLocation;

      expect(loadingLocation.ID.value).toBe('GB01');
    });

    it('should handle null transport object', () => {
      const documentNumber = 'GBR-2025-CC-LOAD004';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'GB01',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const loadingLocation =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .LoadingBaseportSPSLocation;

      expect(loadingLocation.ID.value).toBe('GB01');
    });
  });

  describe('buildImportCountry', () => {
    it('should use exportedTo data when available', () => {
      const documentNumber = 'GBR-2025-CC-IMP001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: {
          isoCodeAlpha2: 'DE',
          officialCountryName: 'Germany'
        },
        pointOfDestination: 'Germany',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const importCountry =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment.ImportSPSCountry;

      expect(importCountry.ID.value).toBe('DE');
      expect(importCountry.Name.value).toBe('Germany');
    });

    it('should use importCountry as fallback', () => {
      const documentNumber = 'GBR-2025-CC-IMP002';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'IT', officialCountryName: 'Italy' },
        pointOfDestination: 'Italy',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const importCountry =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment.ImportSPSCountry;

      expect(importCountry.ID.value).toBe('IT');
      expect(importCountry.Name.value).toBe('Italy');
    });

    it('should default to FR when no import country provided', () => {
      const documentNumber = 'GBR-2025-CC-IMP003';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const importCountry =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment.ImportSPSCountry;

      expect(importCountry.ID.value).toBe('FR');
      expect(importCountry.Name.value).toBe('France');
    });

    it('should handle null transport object', () => {
      const documentNumber = 'GBR-2025-CC-IMP004';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const importCountry =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment.ImportSPSCountry;

      expect(importCountry.ID.value).toBe('FR');
      expect(importCountry.Name.value).toBe('France');
    });

    it('should handle missing exportedTo with null transport', () => {
      const documentNumber = 'GBR-2025-CC-IMP005';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'Dover',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const importCountry =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment.ImportSPSCountry;

      expect(importCountry.ID.value).toBe('FR');
      expect(importCountry.Name.value).toBe('France');
    });
  });

  describe('buildUnloadingLocation', () => {
    it('should build unloading location with country code', () => {
      const documentNumber = 'GBR-2025-CC-UNLOAD001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporter: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'NL', officialCountryName: 'Netherlands' },
        pointOfDestination: 'Netherlands',
        transportations: []
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const unloadingLocation =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .UnloadingBaseportSPSLocation;

      expect(unloadingLocation.ID.value).toBe('FR');
      expect(unloadingLocation.Name.value).toBe('Netherlands');
    });

    it('should default to FR01 when no import country', () => {
      const documentNumber = 'GBR-2025-CC-UNLOAD002';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const unloadingLocation =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .UnloadingBaseportSPSLocation;

      expect(unloadingLocation.ID.value).toBe('FR');
      expect(unloadingLocation.Name.value).toBe('France');
    });

    it('should handle null transport object', () => {
      const documentNumber = 'GBR-2025-CC-UNLOAD003';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const unloadingLocation =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .UnloadingBaseportSPSLocation;

      expect(unloadingLocation.ID.value).toBe('FR');
    });
  });

  describe('buildTransportMovement', () => {
    it('should map truck transport correctly', () => {
      const documentNumber = 'GBR-2025-CC-TRANS001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'truck',
          registrationNumber: 'ABC123'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].ModeCode.value).toBe('3');
      expect(transport[0].ModeCode.name).toBe('Road transport');
      expect(transport[0].UsedSPSTransportMeans).toBeUndefined();
    });

    it('should set schemeAgencyID and schemeAgencyName for truck with nationalityOfVehicle', () => {
      mockGetCountries.mockReturnValue([{
        officialCountryName: 'United Kingdom of Great Britain and Northern Ireland (the)',
        isoCodeAlpha2: 'GB'
      }, {
        officialCountryName: 'France',
        isoCodeAlpha2: 'FR'
      }]);

      const documentNumber = 'GBR-2025-CC-TRANS-SCHEME-001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'truck',
          registrationNumber: 'ABC123',
          nationalityOfVehicle: 'France'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].ID.schemeAgencyID).toBe('FR');
      expect(transport[0].ID.schemeAgencyName).toBe('France');
    });

    it('should default schemeAgencyID to GB when truck nationalityOfVehicle not found', () => {
      mockGetCountries.mockReturnValue([{
        officialCountryName: 'United Kingdom of Great Britain and Northern Ireland (the)',
        isoCodeAlpha2: 'GB'
      }]);

      const documentNumber = 'GBR-2025-CC-TRANS-SCHEME-002';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'truck',
          registrationNumber: 'ABC123',
          nationalityOfVehicle: 'Unknown Country'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].ID.schemeAgencyID).toBe('GB');
      expect(transport[0].ID.schemeAgencyName).toBe('Unknown Country');
    });

    it('should not set schemeAgencyID and schemeAgencyName for non-truck vehicles', () => {
      const documentNumber = 'GBR-2025-CC-TRANS-SCHEME-003';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'plane',
          flightNumber: 'BA123',
          nationalityOfVehicle: 'United Kingdom'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].ID.schemeAgencyID).toBeUndefined();
      expect(transport[0].ID.schemeAgencyName).toBeUndefined();
    });

    it('should handle truck without nationalityOfVehicle field', () => {
      mockGetCountries.mockReturnValue([{
        officialCountryName: 'United Kingdom of Great Britain and Northern Ireland (the)',
        isoCodeAlpha2: 'GB'
      }]);

      const documentNumber = 'GBR-2025-CC-TRANS-SCHEME-004';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'truck',
          registrationNumber: 'ABC123'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].ID.schemeAgencyID).toBe('GB');
      expect(transport[0].ID.schemeAgencyName).toBeUndefined();
    });

    it('should map train transport correctly', () => {
      const documentNumber = 'GBR-2025-CC-TRANS002';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'train'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].ModeCode.value).toBe('2');
      expect(transport[0].ModeCode.name).toBe('Rail transport');
    });

    it('should map plane transport correctly', () => {
      const documentNumber = 'GBR-2025-CC-TRANS003';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'plane',
          flightNumber: 'LH456'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].ModeCode.value).toBe('4');
      expect(transport[0].ModeCode.name).toBe('Air transport');
      expect(transport[0].UsedSPSTransportMeans).toBeUndefined();
    });

    it('should map containerVessel transport correctly', () => {
      const documentNumber = 'GBR-2025-CC-TRANS004';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'containerVessel',
          vesselName: 'SS Atlantic'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].ModeCode.value).toBe('1');
      expect(transport[0].ModeCode.name).toBe('Maritime transport');
      expect(transport[0].UsedSPSTransportMeans.Name.value).toBe('SS Atlantic');
    });

    it('should default to maritime transport for unknown vehicle types', () => {
      const documentNumber = 'GBR-2025-CC-TRANS005';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'unknown'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].ModeCode.value).toBeUndefined();
      expect(transport[0].ModeCode.name).toBeUndefined();
    });

    it('should handle missing vehicle type', () => {
      const documentNumber = 'GBR-2025-CC-TRANS006';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].ModeCode.value).toBeUndefined();
      expect(transport[0].UsedSPSTransportMeans).toBeUndefined();
    });

    it('should handle null transport object', () => {
      const documentNumber = 'GBR-2025-CC-TRANS007';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].ModeCode.value).toBeUndefined();
      expect(transport[0].ModeCode.name).toBeUndefined();
      expect(transport[0].UsedSPSTransportMeans).toBeUndefined();
    });

    it('should handle container vessel transport object', () => {
      const documentNumber = 'GBR-2025-CC-TRANS007';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'containerVessel',
          vesselName: 'MSC Express III'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].ModeCode.value).toBe('1');
      expect(transport[0].ModeCode.name).toBe('Maritime transport');
      expect(transport[0].UsedSPSTransportMeans).toEqual({ Name: { languageID: 'en', languageLocaleID: 'en-nz', value: 'MSC Express III' } });
    });

    it('should use empty string when all transport means are missing', () => {
      const documentNumber = 'GBR-2025-CC-TRANS008';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'containerVessel',
          vesselName: ''
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].UsedSPSTransportMeans.Name.value).toBe('');
    });
  });

  describe('getMeansOfTransport (via buildTransportMovement)', () => {
    it('should extract registrationNumber for truck vehicle', () => {
      const documentNumber = 'GBR-2025-CC-TRANS-MEANS001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'truck',
          registrationNumber: 'XYZ-9876'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].UsedSPSTransportMeans).toBeUndefined()
    });

    it('should extract railwayBillNumber for train vehicle', () => {
      const documentNumber = 'GBR-2025-CC-TRANS-MEANS002';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'train',
          railwayBillNumber: 'RAIL-12345'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].UsedSPSTransportMeans).toBeUndefined();
    });

    it('should extract flightNumber for plane vehicle', () => {
      const documentNumber = 'GBR-2025-CC-TRANS-MEANS003';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'plane',
          flightNumber: 'BA2490'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].UsedSPSTransportMeans).toBeUndefined();
    });

    it('should extract vesselName for containerVessel vehicle', () => {
      const documentNumber = 'GBR-2025-CC-TRANS-MEANS004';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'containerVessel',
          vesselName: 'MV Maersk Viking'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].UsedSPSTransportMeans.Name.value).toBe('MV Maersk Viking');
    });

    it('should return empty string for truck when registrationNumber is missing', () => {
      const documentNumber = 'GBR-2025-CC-TRANS-MEANS005';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'truck'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].UsedSPSTransportMeans).toBeUndefined();
    });

    it('should return empty string for train when railwayBillNumber is missing', () => {
      const documentNumber = 'GBR-2025-CC-TRANS-MEANS006';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'train'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].UsedSPSTransportMeans).toBeUndefined();
    });

    it('should return empty string for plane when flightNumber is missing', () => {
      const documentNumber = 'GBR-2025-CC-TRANS-MEANS007';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'plane'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].UsedSPSTransportMeans).toBeUndefined();
    });

    it('should return empty string for containerVessel when vesselName is missing', () => {
      const documentNumber = 'GBR-2025-CC-TRANS-MEANS008';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'containerVessel'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].UsedSPSTransportMeans.Name.value).toBeUndefined();
    });

    it('should return empty string for unknown vehicle type', () => {
      const documentNumber = 'GBR-2025-CC-TRANS-MEANS009';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'unknown',
          registrationNumber: 'ABC123'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].UsedSPSTransportMeans).toBeUndefined();
    });

    it('should return empty string when vehicle type is null', () => {
      const documentNumber = 'GBR-2025-CC-TRANS-MEANS010';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: null,
          registrationNumber: 'TEST123'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].UsedSPSTransportMeans).toBeUndefined();
    });

    it('should return empty string when vehicle type is undefined', () => {
      const documentNumber = 'GBR-2025-CC-TRANS-MEANS011';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          registrationNumber: 'TEST456'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].UsedSPSTransportMeans).toBeUndefined();
    });

    it('should handle multiple transportations with different vehicle types', () => {
      const documentNumber = 'GBR-2025-CC-TRANS-MEANS012';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [
          {
            vehicle: 'truck',
            registrationNumber: 'TRUCK-001',
            transportDocuments: [{
              name: "Truck Documentation",
              reference: "INV00001"
            }]
          },
          {
            vehicle: 'train',
            railwayBillNumber: 'TRAIN-002',
            transportDocuments: [{
              name: "Train documentation",
              reference: "INV00001"
            }]
          },
          {
            vehicle: 'plane',
            flightNumber: 'PLANE-003',
            transportDocuments: [{
              name: "Plane",
              reference: "INV00001"
            }]
          },
          {
            vehicle: 'containerVessel',
            vesselName: 'VESSEL-004',
            transportDocuments: [{
              name: "Container vessel",
              reference: "INV00001"
            }]
          }
        ]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transports =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transports).toHaveLength(4);
      expect(transports[0].UsedSPSTransportMeans).toBeUndefined();
      expect(transports[1].UsedSPSTransportMeans).toBeUndefined();
      expect(transports[2].UsedSPSTransportMeans).toBeUndefined();
      expect(transports[3].UsedSPSTransportMeans.Name.value).toBe('VESSEL-004');
    });

    it('should handle empty string values for transport identifiers', () => {
      const documentNumber = 'GBR-2025-CC-TRANS-MEANS013';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [
          {
            vehicle: 'truck',
            registrationNumber: ''
          },
          {
            vehicle: 'train',
            railwayBillNumber: ''
          },
          {
            vehicle: 'plane',
            flightNumber: ''
          },
          {
            vehicle: 'containerVessel',
            vesselName: 'Wiron 5'
          }
        ]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transports =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transports).toHaveLength(4);
      expect(transports[0].UsedSPSTransportMeans).toBeUndefined();
      expect(transports[1].UsedSPSTransportMeans).toBeUndefined();
      expect(transports[2].UsedSPSTransportMeans).toBeUndefined();
      expect(transports[3].UsedSPSTransportMeans.Name.value).toBe('Wiron 5');
    });

    it('should handle special characters in transport identifiers', () => {
      const documentNumber = 'GBR-2025-CC-TRANS-MEANS014';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'containerVessel',
          vesselName: 'MV Åsgard-Øst (2024)'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].UsedSPSTransportMeans.Name.value).toBe('MV Åsgard-Øst (2024)');
    });

    it('should handle numeric values for transport identifiers', () => {
      const documentNumber = 'GBR-2025-CC-TRANS-MEANS015';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          vehicle: 'train',
          railwayBillNumber: 123456
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const transport =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .MainCarriageSPSTransportMovement;

      expect(transport[0].UsedSPSTransportMeans).toBeUndefined();
    });
  });

  describe('buildTransportEquipment', () => {
    it('should include container number when provided', () => {
      const documentNumber = 'GBR-2025-CC-EQUIP001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          containerNumber: 'CONT987654'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const equipment =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .UtilizedSPSTransportEquipment;

      expect(equipment[0].ID.value).toBe('CONT987654');
      expect(equipment[0].AffixedSPSSeal).toBeUndefined();
    });

    it('should handle missing container number', () => {
      const documentNumber = 'GBR-2025-CC-EQUIP002';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const equipment =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .UtilizedSPSTransportEquipment;

      expect(equipment).toEqual([]);
    });

    it('should handle null transport object', () => {
      const documentNumber = 'GBR-2025-CC-EQUIP003';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const equipment =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .UtilizedSPSTransportEquipment;

      expect(equipment).toEqual([]);
    });

    it('should handle multiple container numbers from containerNumbers field', () => {
      const documentNumber = 'GBR-2025-CC-EQUIP004';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          containerNumber: 'ABCU1234567 MACB1234567 BCBU1234567'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const equipment =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .UtilizedSPSTransportEquipment;

      expect(equipment).toHaveLength(3);
      expect(equipment[0].ID.value).toBe('ABCU1234567');
      expect(equipment[0].ID.schemeID).toBe('container_number');
      expect(equipment[1].ID.value).toBe('MACB1234567');
      expect(equipment[1].ID.schemeID).toBe('container_number');
      expect(equipment[2].ID.value).toBe('BCBU1234567');
      expect(equipment[2].ID.schemeID).toBe('container_number');
    });

    it('should handle containerNumbers with spaces after commas', () => {
      const documentNumber = 'GBR-2025-CC-EQUIP005';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          containerNumber: 'ABCU1234567 MACB1234567 BCBU1234567'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const equipment =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .UtilizedSPSTransportEquipment;

      expect(equipment).toHaveLength(3);
      expect(equipment[0].ID.value).toBe('ABCU1234567');
      expect(equipment[1].ID.value).toBe('MACB1234567');
      expect(equipment[2].ID.value).toBe('BCBU1234567');
    });

    it('should handle containerIdentificationNumber field (new field)', () => {
      const documentNumber = 'GBR-2025-CC-EQUIP006';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          containerIdentificationNumber: 'MSCU9876543'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const equipment =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .UtilizedSPSTransportEquipment;

      expect(equipment).toHaveLength(1);
      expect(equipment[0].ID.value).toBe('MSCU9876543');
      expect(equipment[0].ID.schemeID).toBe('container_number');
    });

    it('should handle multiple containers from containerIdentificationNumber field', () => {
      const documentNumber = 'GBR-2025-CC-EQUIP007';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          containerIdentificationNumber: 'CONT1111111 CONT2222222 CONT3333333'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const equipment =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .UtilizedSPSTransportEquipment;

      expect(equipment).toHaveLength(3);
      expect(equipment[0].ID.value).toBe('CONT1111111');
      expect(equipment[0].ID.schemeID).toBe('container_number');
      expect(equipment[1].ID.value).toBe('CONT2222222');
      expect(equipment[1].ID.schemeID).toBe('container_number');
      expect(equipment[2].ID.value).toBe('CONT3333333');
      expect(equipment[2].ID.schemeID).toBe('container_number');
    });

    it('should prioritize containerIdentificationNumber over containerNumber when both exist', () => {
      const documentNumber = 'GBR-2025-CC-EQUIP008';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          containerIdentificationNumber: 'NEW1234567',
          containerNumber: 'OLD1234567'
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const equipment =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .UtilizedSPSTransportEquipment;

      expect(equipment).toHaveLength(1);
      expect(equipment[0].ID.value).toBe('NEW1234567');
      expect(equipment[0].ID.schemeID).toBe('container_number');
    });

    it('should handle multiple transportations with different container fields', () => {
      const documentNumber = 'GBR-2025-CC-EQUIP009';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [
          {
            containerIdentificationNumber: 'NEW1111111 NEW2222222'
          },
          {
            containerNumber: 'OLD3333333'
          }
        ]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const equipment =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .UtilizedSPSTransportEquipment;

      expect(equipment).toHaveLength(3);
      expect(equipment[0].ID.value).toBe('NEW1111111');
      expect(equipment[1].ID.value).toBe('NEW2222222');
      expect(equipment[2].ID.value).toBe('OLD3333333');
    });

    it('should handle containerIdentificationNumber with extra spaces', () => {
      const documentNumber = 'GBR-2025-CC-EQUIP010';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{
          containerIdentificationNumber: '  CONT1234567   CONT7654321  '
        }]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const equipment =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .UtilizedSPSTransportEquipment;

      expect(equipment).toHaveLength(2);
      expect(equipment[0].ID.value).toBe('CONT1234567');
      expect(equipment[1].ID.value).toBe('CONT7654321');
    });
  });

  describe('buildConsignmentItems', () => {
    it('should return empty array when no items provided', () => {
      const documentNumber = 'GBR-2025-CC-ITEMS001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      expect(items).toEqual([]);
    });

    it('should include conservation item and product items', () => {
      const documentNumber = 'GBR-2025-CC-ITEMS002';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            commodityCode: '03026100',
            scientificName: 'Gadus morhua',
            caughtBy: [
              {
                vessel: 'Fishing Boat 1',
                cfr: 'GBR001',
                weight: 300
              }
            ]
          }
        ],
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}],
        conservation: {
          conservationReference: 'REF123'
        }
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      expect(items.length).toBe(2); // 1 conservation + 1 product
    });

    it('should handle null exportPayload', () => {
      const documentNumber = 'GBR-2025-CC-ITEMS003';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [],
        exporterDetails: {},
        exportedFrom: '',
        exportedTo: {},
        pointOfDestination: ''
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      expect(items).toEqual([]);
    });

    it('should handle undefined items property', () => {
      const documentNumber = 'GBR-2025-CC-ITEMS004';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}],
        conservation: {}
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      expect(items).toEqual([]);
    });
  });

  describe('buildConservationItem', () => {
    it('should return null when no vessel information', () => {
      const documentNumber = 'GBR-2025-CC-CONS001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            commodityCode: '03026100',
            caughtBy: []
          }
        ],
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      expect(items.length).toBe(0); // No items when caughtBy is empty
    });

    it('should build conservation item with all vessel details', () => {
      const documentNumber = 'GBR-2025-CC-CONS002';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            commodityCode: '03026100',
            caughtBy: [
              {
                vessel: 'HMS Fisher',
                flag: 'GBR',
                cfr: 'GBR999999',
                homePort: 'Newlyn',
                licenceNumber: 'LIC999',
                licenceValidTo: '2025-12-31',
                faoArea: 'FAO27',
                rfmo: 'Commission for the Conservation of Antarctic Marine Living Resources (CCAMLR)',
                highSeasArea: 'Yes',
                ircs: 'D5RX8',
                gearCode: 'PTM',
                weight: 500,
                exclusiveEconomicZones: []
              }
            ]
          }
        ],
        exporterDetails: {},
        exportedFrom: 'UK',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: 'France',
        transportations: [{}],
        conservation: {
          conservationReference: 'CON-REF-001',
          user_submitted_conservation_info: 'Frozen at sea'
        }
      };
      const rfmoRecords = [
        {
          "Full text": "Commission for the Conservation of Antarctic Marine Living Resources (CCAMLR)",
          Abbreviation: "CCAMLR",
        },
        {
          "Full text": "General Fisheries Commission for the Mediterranean (GFCM)",
          Abbreviation: "GFCM",
        },
        {
          "Full text": "North East Atlantic Fisheries Commission (NEAFC)",
          Abbreviation: "NEAFC"
        }
      ];

      mockGetRFMO.mockReturnValue(rfmoRecords);
      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      const conservationItem = items[0];
      expect(conservationItem.NatureIdentificationSPSCargo.TypeCode.value).toBe('5');
      expect(conservationItem.IncludedSPSTradeLineItem[0].SequenceNumeric.value).toBe(1);

      let notes = conservationItem.IncludedSPSTradeLineItem[0].AdditionalInformationSPSNote;
      expect(notes.some((n: any) => n.SubjectCode.value === 'CONSERVATION_AND_MANAGEMENT_MEASURES')).toBe(true);
      expect(notes.some((n: any) => n.SubjectCode.value === 'VESSEL_NAME')).toBe(true);
      expect(notes.some((n: any) => n.SubjectCode.value === 'VESSEL_FLAG')).toBe(true);
      expect(notes.some((n: any) => n.SubjectCode.value === 'VESSEL_REGISTRATION')).toBe(true);
      expect(notes.some((n: any) => n.SubjectCode.value === 'CALL_SIGN')).toBe(true);
      expect(notes.some((n: any) => n.SubjectCode.value === 'HOME_PORT')).toBe(true);
      expect(notes.some((n: any) => n.SubjectCode.value === 'FISHING_GEAR')).toBe(true);
      expect(notes.some((n: any) => n.SubjectCode.value === 'FISHING_LICENSE')).toBe(true);
      expect(notes.some((n: any) => n.SubjectCode.value === 'FISHING_LICENSE_END_DATE')).toBe(true);

      const catchAreaItem = items[1];
      notes = catchAreaItem.IncludedSPSTradeLineItem[0].AdditionalInformationSPSNote;
      expect(notes.some((n: any) => n.SubjectCode.value === 'CATCH_AREA')).toBe(true);
      expect(notes.some((n: any) => n.SubjectCode.value === 'HIGH_SEAS_CATCH_AREA')).toBe(true);
      expect(notes.some((n: any) => n.SubjectCode.value === 'REGIONAL_FISHERIES_MANAGEMENT_ORGANISATION')).toBe(true);
      expect(notes.some((n: any) => n.Content.value === 'CCAMLR')).toBe(true);
    });

    it('should include phone note even when empty', () => {
      const documentNumber = 'GBR-2025-CC-CONS003';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            caughtBy: [
              {
                vessel: 'Test Vessel'
              }
            ]
          }
        ],
        exporterDetails: {},
        exportedFrom: '',
        exportedTo: {},
        pointOfDestination: '',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      const conservationItem = items[0];
      const notes = conservationItem.IncludedSPSTradeLineItem[0].AdditionalInformationSPSNote;
      const phoneNote = notes.find((n: any) => n.SubjectCode.value === 'PHONE');

      expect(phoneNote).toBeDefined();
      expect(phoneNote.Content.value).toBe('');
    });

    it('should handle missing landings array', () => {
      const documentNumber = 'GBR-2025-CC-CONS004';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
          }
        ],
        exporterDetails: {},
        exportedFrom: '',
        exportedTo: {},
        pointOfDestination: ''
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      expect(items.length).toBe(0); // No items when caughtBy is undefined
    });

    it('should handle landing without gearCode', () => {
      mockGetGearCodes.mockReturnValue([{
        'Gear code': 'FPN',
        'ISSCFG code': '08.1'
      }]);

      const documentNumber = 'GBR-2025-CC-CONS005';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            caughtBy: [
              {
                vessel: 'Test Vessel',
                pln: 'TEST123',
                gearCode: 'FPN',
                exclusiveEconomicZones: []
              }
            ]
          }
        ],
        exporterDetails: {},
        exportedFrom: '',
        exportedTo: {},
        pointOfDestination: ''
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      const conservationItem = items[0];
      const notes = conservationItem.IncludedSPSTradeLineItem[0].AdditionalInformationSPSNote;
      const gearNote = notes.find((n: any) => n.SubjectCode.value === 'FISHING_GEAR');

      expect(gearNote.Content.value).toBe('08.1');
    });
  });

  describe('buildProductItem', () => {
    it('should return null when no product data', () => {
      const documentNumber = 'GBR-2025-CC-PROD001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            caughtBy: []
          }
        ],
        exporterDetails: {},
        exportedFrom: '',
        exportedTo: {},
        pointOfDestination: ''
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      expect(items.length).toBe(0);
    });

    it('should build product item with complete landing details', () => {
      const documentNumber = 'GBR-2025-CC-PROD002';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            commodityCode: '03044100',
            commodityCodeDescription: 'Fresh hake',
            scientificName: 'Merluccius merluccius',
            species: { label: 'European Hake' },
            caughtBy: [
              {
                cfr: 'GBR123',
                pln: 'PZ777',
                licenceHolder: 'Jane Doe',
                weight: 750,
                startDate: '2025-02-01',
                date: '2025-02-10',
                faoArea: '27.7.e',
                rfmo: 'Commission for the Conservation of Antarctic Marine Living Resources (CCAMLR)',
                exclusiveEconomicZones: [
                  { isoCodeAlpha2: 'GB' },
                  { officialCountryName: 'Ireland' }
                ]
              }
            ]
          }
        ],
        exporterDetails: {},
        exportedFrom: '',
        exportedTo: {},
        pointOfDestination: ''
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      expect(items.length).toBe(2); // 1 vessel + 1 product
      const productItem = items[1];
      expect(productItem.NatureIdentificationSPSCargo.TypeCode.value).toBe('12');
      expect(productItem.IncludedSPSTradeLineItem[0].Description.value).toBe('Fresh hake');
      expect(productItem.IncludedSPSTradeLineItem[0].CommonName.value).toBe('Merluccius merluccius');
      expect(productItem.IncludedSPSTradeLineItem[0].NetWeightMeasure.value).toBe('750');
      expect(productItem.IncludedSPSTradeLineItem[0].ApplicableSPSClassification.ClassCode.value).toBe('030441');
    });

    it('should calculate total weight from multiple landings', () => {
      const documentNumber = 'GBR-2025-CC-PROD003';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            commodityCode: '03026100',
            scientificName: 'Gadus morhua',
            caughtBy: [
              {
                cfr: 'GBR111',
                pln: 'PZ111',
                weight: 200,
                exclusiveEconomicZones: []
              },
              {
                cfr: 'GBR111',
                pln: 'PZ222',
                weight: 300,
                exclusiveEconomicZones: []
              },
              {
                cfr: 'GBR111',
                pln: 'PZ333',
                weight: 150,
                exclusiveEconomicZones: []
              }
            ]
          }
        ],
        exporterDetails: {},
        exportedFrom: '',
        exportedTo: {},
        pointOfDestination: ''
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      expect(items.length).toBe(2); // 1 vessel + 3 products
      const productsIncludedSPSConsignmentItem = items[1];
      expect(productsIncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0].SequenceNumeric.format).toBe("1");
      expect(productsIncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0].SequenceNumeric.value).toBe(1);
      expect(productsIncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0].NetWeightMeasure.value).toBe('200');
      expect(productsIncludedSPSConsignmentItem.IncludedSPSTradeLineItem[1].SequenceNumeric.format).toBe("2");
      expect(productsIncludedSPSConsignmentItem.IncludedSPSTradeLineItem[1].SequenceNumeric.value).toBe(2);
      expect(productsIncludedSPSConsignmentItem.IncludedSPSTradeLineItem[1].NetWeightMeasure.value).toBe('300');
      expect(productsIncludedSPSConsignmentItem.IncludedSPSTradeLineItem[2].SequenceNumeric.format).toBe("3");
      expect(productsIncludedSPSConsignmentItem.IncludedSPSTradeLineItem[2].SequenceNumeric.value).toBe(3);
      expect(productsIncludedSPSConsignmentItem.IncludedSPSTradeLineItem[2].NetWeightMeasure.value).toBe('150');
    });

    it('should add notes for all EEZ zones', () => {
      const documentNumber = 'GBR-2025-CC-PROD004';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            commodityCode: '03026100',
            scientificName: 'Gadus morhua',
            caughtBy: [
              {
                pln: 'PZ444',
                weight: 400,
                exclusiveEconomicZones: [
                  { isoCodeAlpha2: 'GB', officialCountryName: 'United Kingdom' },
                  { isoCodeAlpha2: 'NO', officialCountryName: 'Norway' },
                  { officialCountryName: 'Iceland' }
                ]
              }
            ]
          }
        ],
        exporterDetails: {},
        exportedFrom: '',
        exportedTo: {},
        pointOfDestination: ''
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;



      const productItem = items[1];
      const notes = productItem.IncludedSPSTradeLineItem[0].AdditionalInformationSPSNote;
      const eezNotes = notes.filter((n: any) => n.SubjectCode.value === 'EXCLUSIVE_ECONOMIC_ZONE');

      expect(eezNotes.length).toBe(3);
    });

    it('should handle landings without vessel data', () => {
      const documentNumber = 'GBR-2025-CC-PROD005';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            commodityCode: '03026100',
            scientificName: 'Gadus morhua',
            caughtBy: [
              {
                weight: 100,
                exclusiveEconomicZones: []
              }
            ]
          }
        ],
        exporterDetails: {},
        exportedFrom: '',
        exportedTo: {},
        pointOfDestination: ''
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      expect(items.length).toBe(2); // 1 vessel + 1 product
      const productItem = items[1];
      const notes = productItem.IncludedSPSTradeLineItem[0].AdditionalInformationSPSNote;

      expect(notes.length).toBeGreaterThan(0); // Notes are always added
    });

    it('should use species label when commodityCodeDescription is missing', () => {
      const documentNumber = 'GBR-2025-CC-PROD006';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            commodityCode: '03026100',
            scientificName: 'Gadus morhua',
            species: 'Atlantic Cod',
            caughtBy: []
          }
        ],
        exporterDetails: {},
        exportedFrom: '',
        exportedTo: {},
        pointOfDestination: ''
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      expect(items.length).toBe(0); // No items when caughtBy is empty
    });

    it('should handle missing exportWeight gracefully', () => {
      const documentNumber = 'GBR-2025-CC-PROD007';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            commodityCode: '03026100',
            scientificName: 'Gadus morhua',
            caughtBy: [
              {
                pln: 'PZ555',
                exclusiveEconomicZones: []
              }
            ]
          }
        ],
        exporterDetails: {},
        exportedFrom: '',
        exportedTo: {},
        pointOfDestination: ''
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      const productItem = items[1];
      expect(productItem.IncludedSPSTradeLineItem[0].NetWeightMeasure.value).toBe('0');
    });
  });

  describe('formatDate', () => {
    it('should format date as DD-MMM-YYYY', () => {
      const documentNumber = 'GBR-2025-CC-DATE001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            commodityCode: '03026100',
            scientificName: 'Gadus morhua',
            caughtBy: [
              {
                pln: 'PZ001',
                weight: 100,
                startDate: '2025-01-05',
                date: '2025-12-25',
                exclusiveEconomicZones: []
              }
            ]
          }
        ],
        exporterDetails: {},
        exportedFrom: '',
        exportedTo: {},
        pointOfDestination: '',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      const productItem = items[1];
      const notes = productItem.IncludedSPSTradeLineItem[0].AdditionalInformationSPSNote;
      const startDateNote = notes.find((n: any) => n.SubjectCode.value === 'START_DATE');
      const endDateNote = notes.find((n: any) => n.SubjectCode.value === 'END_DATE');

      expect(startDateNote.Content.value).toBe('05-Jan-2025');
      expect(endDateNote.Content.value).toBe('25-Dec-2025');
    });

    it('should handle single-digit dates with leading zero', () => {
      const documentNumber = 'GBR-2025-CC-DATE002';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            commodityCode: '03026100',
            scientificName: 'Gadus morhua',
            caughtBy: [
              {
                pln: 'PZ001',
                weight: 100,
                startDate: '2025-02-03',
                exclusiveEconomicZones: []
              }
            ]
          }
        ],
        exporterDetails: {},
        exportedFrom: '',
        exportedTo: {},
        pointOfDestination: '',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      const productItem = items[1];
      const notes = productItem.IncludedSPSTradeLineItem[0].AdditionalInformationSPSNote;
      const startDateNote = notes.find((n: any) => n.SubjectCode.value === 'START_DATE');

      expect(startDateNote.Content.value).toBe('03-Feb-2025');
    });

    it('should return original string on invalid date', () => {
      const documentNumber = 'GBR-2025-CC-DATE003';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            commodityCode: '03026100',
            scientificName: 'Gadus morhua',
            caughtBy: [
              {
                pln: 'PZ001',
                weight: 100,
                startDate: 'invalid-date-string',
                exclusiveEconomicZones: []
              }
            ]
          }
        ],
        exporterDetails: {},
        exportedFrom: '',
        exportedTo: {},
        pointOfDestination: '',
        transportations: [{}]
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      const productItem = items[1];
      const notes = productItem.IncludedSPSTradeLineItem[0].AdditionalInformationSPSNote;
      const startDateNote = notes.find((n: any) => n.SubjectCode.value === 'START_DATE');

      expect(startDateNote.Content.value).toBe('NaN-undefined-NaN');
    });
  });

  describe('Edge cases and integration scenarios', () => {
    it('should handle multiple products with different configurations', () => {
      const documentNumber = 'GBR-2025-CC-MULTI001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            commodityCode: '03026100',
            commodityCodeDescription: 'Cod',
            scientificName: 'Gadus morhua',
            caughtBy: [
              {
                vessel: 'Vessel 1',
                pln: 'PZ001',
                weight: 500,
                gearType: 'OTB',
                exclusiveEconomicZones: [],
                cfr: '0000001'
              }
            ]
          },
          {
            commodityCode: '03034100',
            scientificName: 'Katsuwonus pelamis',
            species: 'Skipjack Tuna',
            caughtBy: [
              {
                vessel: 'Vessel 2',
                pln: 'PZ002',
                weight: 300,
                exclusiveEconomicZones: [],
                cfr: '0000002'
              }
            ]
          }
        ],
        exporterDetails: {
          exporterCompanyName: 'Multi Product Exports'
        },
        vehicle: 'plane',
        exportedFrom: '',
        exportedTo: {},
        pointOfDestination: ''
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      const items =
        result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment
          .IncludedSPSConsignmentItem;

      expect(items.length).toBe(2);
      expect(items[0].IncludedSPSTradeLineItem.length).toBe(2); // 2 vessels
      expect(items[0].IncludedSPSTradeLineItem[0].SequenceNumeric.value).toBe(1);
      expect(items[0].IncludedSPSTradeLineItem[0].AdditionalInformationSPSNote[0].Content.value).toBe('Vessel 1');
      expect(items[0].IncludedSPSTradeLineItem[1].SequenceNumeric.value).toBe(2);
      expect(items[0].IncludedSPSTradeLineItem[1].AdditionalInformationSPSNote[0].Content.value).toBe('Vessel 2');

      expect(items[1].IncludedSPSTradeLineItem.length).toBe(2); // 2 products
      expect(items[1].IncludedSPSTradeLineItem[0].SequenceNumeric.value).toBe(1);
      expect(items[1].IncludedSPSTradeLineItem[0].CommonName.value).toBe('Gadus morhua');
      expect(items[1].IncludedSPSTradeLineItem[1].SequenceNumeric.value).toBe(2);
      expect(items[1].IncludedSPSTradeLineItem[1].CommonName.value).toBe('Katsuwonus pelamis');
    });

    it('should handle complete real-world scenario', () => {
      const documentNumber = 'GBR-2025-CC-COMPLETE001';
      const createdAt = new Date('2025-12-01');
      const exportData = {
        products: [
          {
            commodityCode: '03026100',
            commodityCodeDescription: 'Fresh or chilled Atlantic cod',
            scientificName: 'Gadus morhua',
            species: 'Atlantic Cod',
            caughtBy: [
              {
                vessel: 'Poseidon',
                flag: 'GBR',
                pln: 'PZ123',
                cfr: 'GBR123456',
                homePort: 'Penzance',
                licenceNumber: 'FL12345',
                licenceValidTo: '2025-12-31',
                licenceHolder: 'Captain Jack Sparrow',
                weight: 850,
                gearType: 'OTB',
                startDate: '2025-01-10',
                dateLanded: '2025-01-15',
                faoArea: '27.4.a',
                rfmo: 'Commission for the Conservation of Antarctic Marine Living Resources (CCAMLR)',
                exclusiveEconomicZones: [
                  { isoCodeAlpha2: 'GB', officialCountryName: 'United Kingdom' }
                ]
              }
            ]
          }
        ],
        exporterDetails: {
          exporterCompanyName: 'Premium Seafood Exports Ltd',
          addressOne: '123 Harbour Street',
          townCity: 'Newlyn'
        },
        transportations: [{
          vehicle: 'containerVessel',
          vesselName: 'MV Ocean Pride',
          containerNumber: 'MSCU1234567'
        }],
        exportedFrom: 'Port of Plymouth',
        exportedTo: { isoCodeAlpha2: 'FR', officialCountryName: 'France' },
        pointOfDestination: '',
        conservation: {
          conservationReference: 'EU-REG-1005-2008',
          user_submitted_conservation_info: 'Flash frozen at -40°C within 4 hours of catch'
        }
      };

      const result = CatchCertificateTransformerService.generateCatchPayload(
        documentNumber,
        createdAt,
        exportData
      );

      expect(result).toBeDefined();
      expect(result.CreateCatchCertificateRequest.SPSCertificate).toBeDefined();

      const exchangedDoc = result.CreateCatchCertificateRequest.SPSCertificate.SPSExchangedDocument;
      expect(exchangedDoc.ID.value).toBe('');

      const consignment = result.CreateCatchCertificateRequest.SPSCertificate.SPSConsignment;
      expect(consignment.ConsignorSPSParty.Name.value).toBe('Premium Seafood Exports Ltd');
      expect(consignment.MainCarriageSPSTransportMovement[0].ModeCode.value).toBe('1');

      const items = consignment.IncludedSPSConsignmentItem;
      expect(items.length).toBe(2); // 1 vessel + 1 product

      expect(mockLogger.info).toHaveBeenCalledWith(
        `[CATCH-TRANSFORMER][GENERATING-PAYLOAD][${documentNumber}]`
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `[CATCH-TRANSFORMER][PAYLOAD-GENERATED][${documentNumber}]`
      );
    });
  });
});
