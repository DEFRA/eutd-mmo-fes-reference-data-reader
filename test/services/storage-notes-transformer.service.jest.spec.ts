import StorageNotesTransformerService from '../../src/services/storage-notes-transformer.service';
import logger from '../../src/logger';

jest.mock('../../src/logger');

describe('StorageNotesTransformerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateStorageNotesPayload', () => {
    const documentNumber = 'GBR-2025-SD-TEST123';
    const createdAt = new Date('2025-01-01T10:00:00Z');

    const baseExportData = {
      exporterDetails: {
        exporterCompanyName: 'Test Exporter Ltd',
        addressOne: '123 Export Street',
        townCity: 'London',
        postcode: 'E1 1AA'
      },
      facilityName: 'Test Cold Storage Facility',
      facilityApprovalNumber: 'GB-COLD-001',
      facilityAddressOne: '456 Storage Road',
      facilityTownCity: 'Manchester',
      facilityPostcode: 'M1 1BB',
      facilityArrivalDate: '01/01/2025',
      facilityStorage: 'CHILLED',
      exportedTo: {
        isoCodeAlpha2: 'FR',
        officialCountryName: 'France'
      },
      exportLocation: {
        locationName: 'Dover Port'
      },
      transport: {
        vehicle: 'containerVessel',
        vesselName: 'MV Ocean Carrier',
        containerNumber: 'CONT123456',
        exportDate: "21/01/2026"
      },
      arrivalTransport: {
        vehicle: "truck",
        nationalityOfVehicle: "Tanzania, United Republic of",
        registrationNumber: "A123 4567",
        freightBillNumber: "",
        departureCountry: "United Kingdom of Great Britain and Northern Ireland",
        departurePort: "Calais port",
        departureDate: "21/01/2026",
        placeOfUnloading: "Hull"
      },
      unloadingPlace: {
        locationName: 'Calais Port'
      },
      catches: [
        {
          certificateNumber: 'GBR-2025-CC-001',
          product: "Atlantic cod (COD)",
          scientificName: 'Gadus morhua',
          exportWeight: '100.5'
        }
      ]
    };

    it('should generate complete storage notes payload with all fields', () => {
      const result = StorageNotesTransformerService.generateStorageNotesPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      expect(logger.info).toHaveBeenCalledWith(`[STORAGE-NOTES-TRANSFORMER][GENERATING-PAYLOAD][${documentNumber}]`);
      expect(logger.info).toHaveBeenCalledWith(`[STORAGE-NOTES-TRANSFORMER][PAYLOAD-GENERATED][${documentNumber}]`);

      // Verify top-level structure
      expect(result).toHaveProperty('CreateCatchNonManipulationDocumentRequest');
      expect(result.CreateCatchNonManipulationDocumentRequest).toHaveProperty('CatchNonManipulationDocument');

      const document = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument;
      expect(document).toHaveProperty('SPSExchangedDocument');
      expect(document).toHaveProperty('SPSArrivalConsignment');
      expect(document).toHaveProperty('SPSDepartureConsignment');
    });

    it('should build exchanged document with correct name', () => {
      const result = StorageNotesTransformerService.generateStorageNotesPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const exchangedDoc = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSExchangedDocument;

      expect(exchangedDoc.Name.value).toBe('Non Manipulation Document');
      expect(exchangedDoc.Name.languageID).toBe('en');
    });

    it('should set document type code to 16 for storage document', () => {
      const result = StorageNotesTransformerService.generateStorageNotesPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const exchangedDoc = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSExchangedDocument;

      expect(exchangedDoc.TypeCode.value).toBe('16');
      expect(exchangedDoc.TypeCode.name).toBe('CATCH_NON_MANIPULATION_DOCUMENT');
      expect(exchangedDoc.TypeCode.listAgencyID).toBe('6');
      expect(exchangedDoc.TypeCode.listID).toBe('1001');
    });

    it('should set status code to 39 for FINAL', () => {
      const result = StorageNotesTransformerService.generateStorageNotesPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const exchangedDoc = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSExchangedDocument;

      expect(exchangedDoc.StatusCode.value).toBe('39');
      expect(exchangedDoc.StatusCode.name).toBe('39');
    });

    it('should set issue date time using ISO format', () => {
      const result = StorageNotesTransformerService.generateStorageNotesPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const exchangedDoc = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSExchangedDocument;

      expect(exchangedDoc.IssueDateTime.DateTime.value).toBe('2025-01-01T10:00:00.000Z');
    });

    it('should set issuer party as Marine Management Organization', () => {
      const result = StorageNotesTransformerService.generateStorageNotesPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const exchangedDoc = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSExchangedDocument;

      expect(exchangedDoc.IssuerSPSParty.Name.value).toBe('Marine Management Organization');
      expect(exchangedDoc.IssuerSPSParty.RoleCode.value).toBe('VJ');
    });

    it('should include storage condition in notes', () => {
      const result = StorageNotesTransformerService.generateStorageNotesPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const exchangedDoc = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSExchangedDocument;

      expect(exchangedDoc.IncludedSPSNote.Content.value).toBe('CHILLED');
      expect(exchangedDoc.IncludedSPSNote.SubjectCode.value).toBe('STORAGE_CONDITION');
    });

    it('should not default to CHILLED when facilityStorage is missing', () => {
      const exportDataWithoutStorage = { ...baseExportData, facilityStorage: undefined };

      const result = StorageNotesTransformerService.generateStorageNotesPayload(
        documentNumber,
        createdAt,
        exportDataWithoutStorage
      );

      const exchangedDoc = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSExchangedDocument;

      expect(exchangedDoc.IncludedSPSNote.Content.value).not.toBe('CHILLED');
    });

    it('should include reference documents', () => {
      const result = StorageNotesTransformerService.generateStorageNotesPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const exchangedDoc = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSExchangedDocument;

      expect(exchangedDoc.ReferenceSPSReferencedDocument).toBeDefined();
      expect(Array.isArray(exchangedDoc.ReferenceSPSReferencedDocument)).toBe(true);
      expect(exchangedDoc.ReferenceSPSReferencedDocument.length).toBeGreaterThan(0);
    });

    it('should include catch certificate reference', () => {
      const result = StorageNotesTransformerService.generateStorageNotesPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const exchangedDoc = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSExchangedDocument;
      const catchCertRef = exchangedDoc.ReferenceSPSReferencedDocument.find(
        (doc: any) => doc.TypeCode.value === '916'
      );

      expect(catchCertRef).toBeDefined();
      expect(catchCertRef.ID.value).toBe(documentNumber);
    });

    it('should include transport document reference when available', () => {
      const exportDataWithTransportDoc = {
        ...baseExportData,
        transport: {
          ...baseExportData.transport,
          transportDocumentReferenceNumber: 'TD-12345'
        }
      };

      const result = StorageNotesTransformerService.generateStorageNotesPayload(
        documentNumber,
        createdAt,
        exportDataWithTransportDoc
      );

      const exchangedDoc = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSExchangedDocument;
      const transportDocRef = exchangedDoc.ReferenceSPSReferencedDocument.find(
        (doc: any) => doc.TypeCode.value === '916'
      );

      expect(transportDocRef).toBeDefined();
      expect(transportDocRef.ID.value).toBe('GBR-2025-SD-TEST123');
    });

    it('should include signatory authentication with two signatures', () => {
      const result = StorageNotesTransformerService.generateStorageNotesPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const exchangedDoc = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSExchangedDocument;

      expect(exchangedDoc.SignatorySPSAuthentication).toHaveLength(2);
      expect(exchangedDoc.SignatorySPSAuthentication[0].TypeCode.value).toBe('5');
      expect(exchangedDoc.SignatorySPSAuthentication[1].TypeCode.value).toBe('1');
    });

    it('should set authentication actual date time', () => {
      const result = StorageNotesTransformerService.generateStorageNotesPayload(
        documentNumber,
        createdAt,
        baseExportData
      );

      const exchangedDoc = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSExchangedDocument;

      expect(exchangedDoc.SignatorySPSAuthentication[0].ActualDateTime.DateTime.value).toBe('2025-01-01T10:00:00.000Z');
      expect(exchangedDoc.SignatorySPSAuthentication[0].ProviderSPSParty.Name.value).toBe('Official Inspector');
    });

    describe('SPSArrivalConsignment', () => {
      it('should build arrival consignment with facility party', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.ConsignorSPSParty.Name.value).toBe('Test Cold Storage Facility');
        expect(arrivalConsignment.ConsignorSPSParty.RoleCode.value).toBe('CZ');
      });

      it('should include facility address in arrival consignment', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.ConsignorSPSParty.SpecifiedSPSAddress.LineOne.value).toBe('456 Storage Road');
        expect(arrivalConsignment.ConsignorSPSParty.SpecifiedSPSAddress.CityName.value).toBe('Manchester');
        expect(arrivalConsignment.ConsignorSPSParty.SpecifiedSPSAddress.PostcodeCode.value).toBe('M1 1BB');
        expect(arrivalConsignment.ConsignorSPSParty.SpecifiedSPSAddress.CountryID.value).toBe('GB');
      });

      it('should include availability due date time in arrival consignment', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.AvailabilityDueDateTime).toBeDefined();
        expect(arrivalConsignment.AvailabilityDueDateTime.DateTime.value).toContain('2025-01-01');
      });

      it('should handle missing facility arrival date', () => {
        const exportDataWithoutDate = { ...baseExportData, facilityArrivalDate: undefined };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutDate
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.AvailabilityDueDateTime.DateTime.value).toBeDefined();
      });

      it('should include consignment items as object', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.IncludedSPSConsignmentItem).toBeDefined();
        expect(arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem).toBeDefined();
      });

      it('should set correct additional notes in trade line item', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;
        const tradeLineItem = arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0];

        expect(tradeLineItem.AdditionalInformationSPSNote).toBeDefined();
        expect(Array.isArray(tradeLineItem.AdditionalInformationSPSNote)).toBe(true);
      });

      it('should include classification in trade line item', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;
        const tradeLineItem = arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0];

        expect(tradeLineItem.ApplicableSPSClassification).toBeDefined();
        expect(tradeLineItem.ApplicableSPSClassification.SystemID.value).toBe('CN');
      });

      it('should handle empty catches array', () => {
        const exportDataWithNoCatches = { ...baseExportData, catches: [] };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithNoCatches
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem).toBeDefined();
        expect(arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem).toHaveLength(0);
      });

      it('should handle missing catches', () => {
        const exportDataWithoutCatches = { ...baseExportData, catches: undefined };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutCatches
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem).toBeDefined();
      });
    });

    describe('SPSDepartureConsignment', () => {
      it('should build departure consignment with empty consignor party', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.ConsignorSPSParty.Name.value).toBe('');
      });

      it('should set export country to GB', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.ExportSPSCountry.ID.value).toBe('GB');
        expect(departureConsignment.ExportSPSCountry.Name.value).toBe('United Kingdom');
      });

      it('should set import country from exportedTo', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.ImportSPSCountry.ID.value).toBe('');
        expect(departureConsignment.ImportSPSCountry.Name.value).toBe('');
      });

      it('should handle missing import country', () => {
        const exportDataWithoutImport = { ...baseExportData, exportedTo: undefined };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutImport
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.ImportSPSCountry.ID.value).toBe('');
        expect(departureConsignment.ImportSPSCountry.Name.value).toBe('');
      });

      it('should include loading baseport location', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.LoadingBaseportSPSLocation).toBeDefined();
      });

      it('should include transport movement with vessel name', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.MainCarriageSPSTransportMovement).toBeDefined();
        expect(departureConsignment.MainCarriageSPSTransportMovement.UsedSPSTransportMeans.Name.value).toBe('MV Ocean Carrier');
      });

      it('should set transport mode code for container vessel', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.MainCarriageSPSTransportMovement.UsedSPSTransportMeans).toBeDefined();
        expect(departureConsignment.MainCarriageSPSTransportMovement.UsedSPSTransportMeans.Name.value).toBe('MV Ocean Carrier');
        expect(departureConsignment.MainCarriageSPSTransportMovement.ModeCode.value).toBe('1');
      });

      it('should handle truck transport', () => {
        const exportDataWithTruck = {
          ...baseExportData,
          transport: {
            vehicle: 'truck',
            registrationNumber: 'AB12 CDE'
          }
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithTruck
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.MainCarriageSPSTransportMovement.UsedSPSTransportMeans).toBeUndefined();
        expect(departureConsignment.MainCarriageSPSTransportMovement.ModeCode.value).toBe('3');
      });

      it('should handle plane transport', () => {
        const exportDataWithPlane = {
          ...baseExportData,
          transport: {
            vehicle: 'plane',
            flightNumber: 'BA123'
          }
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithPlane
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.MainCarriageSPSTransportMovement.UsedSPSTransportMeans).toBeUndefined();
        expect(departureConsignment.MainCarriageSPSTransportMovement.ModeCode.value).toBe('4');
      });

      it('should handle train transport', () => {
        const exportDataWithTrain = {
          ...baseExportData,
          transport: {
            vehicle: 'train',
            registrationNumber: 'EUR123'
          }
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithTrain
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.MainCarriageSPSTransportMovement.UsedSPSTransportMeans).toBeUndefined();
        expect(departureConsignment.MainCarriageSPSTransportMovement.ModeCode.value).toBe('2');
      });

      it('should handle missing transport details', () => {
        const exportDataWithoutTransport = { ...baseExportData, transport: undefined };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutTransport
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.MainCarriageSPSTransportMovement.UsedSPSTransportMeans).toBeUndefined();
      });

      it('should include consignment items in departure', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.IncludedSPSConsignmentItem).toBeDefined();
        expect(departureConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem).toBeDefined();
      });
    });

    describe('Error handling', () => {
      it('should handle null export data gracefully', () => {
        const invalidExportData = null;

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          invalidExportData
        );

        expect(result).toBeDefined();
        expect(result.CreateCatchNonManipulationDocumentRequest).toBeDefined();
      });

      it('should handle missing exporter details gracefully', () => {
        const exportDataWithoutExporter = { ...baseExportData, exporterDetails: undefined };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutExporter
        );

        expect(result).toBeDefined();
      });

      it('should handle missing facility details gracefully', () => {
        const exportDataWithoutFacility = {
          ...baseExportData,
          facilityName: undefined,
          facilityApprovalNumber: undefined,
          facilityAddressOne: undefined,
          facilityTownCity: undefined,
          facilityPostcode: undefined
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutFacility
        );

        expect(result).toBeDefined();
      });
    });

    describe('Edge cases', () => {
      it('should handle empty string values', () => {
        const exportDataWithEmptyStrings = {
          ...baseExportData,
          facilityName: '',
          facilityApprovalNumber: '',
          exporterDetails: {
            exporterCompanyName: '',
            addressOne: '',
            townCity: '',
            postcode: ''
          }
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithEmptyStrings
        );

        expect(result).toBeDefined();
      });

      it('should handle zero weight', () => {
        const exportDataWithZeroWeight = {
          ...baseExportData,
          catches: [{
            ...baseExportData.catches[0],
            netWeightFisheryProductArrival: 0
          }]
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithZeroWeight
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;
        const tradeLineItem = arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0];

        expect(tradeLineItem.GrossWeightMeasure.value).toBe(0);
      });

      it('should handle very large weight', () => {
        const exportDataWithLargeWeight = {
          ...baseExportData,
          catches: [{
            ...baseExportData.catches[0],
            netWeightFisheryProductArrival: 999999.99
          }]
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithLargeWeight
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;
        const tradeLineItem = arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0];

        expect(tradeLineItem.GrossWeightMeasure.value).toBe(999999.99);
      });

      it('should handle special characters in names', () => {
        const exportDataWithSpecialChars = {
          ...baseExportData,
          facilityName: "O'Brien's Cold Storage & Co.",
          exporterDetails: {
            ...baseExportData.exporterDetails,
            exporterCompanyName: 'Fish & Chips Ltd™'
          }
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithSpecialChars
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.ConsignorSPSParty.Name.value).toBe("O'Brien's Cold Storage & Co.");
      });
    });
  });
});
