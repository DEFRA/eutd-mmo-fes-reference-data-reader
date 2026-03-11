import StorageNotesTransformerService from '../../src/services/storage-notes-transformer.service';
import { buildSupportingDocumentReferences } from '../../src/data/euCatch';
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
        postcode: 'E1 1AA',
        country: 'United Kingdom'
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

        expect(arrivalConsignment.ConsigneeSPSParty.Name.value).toBe('Test Cold Storage Facility');
        expect(arrivalConsignment.ConsigneeSPSParty.RoleCode.value).toBe('CN');
      });

      it('should include facility address in arrival consignment', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.ConsigneeSPSParty.SpecifiedSPSAddress.LineOne.value).toBe('456 Storage Road');
        expect(arrivalConsignment.ConsigneeSPSParty.SpecifiedSPSAddress.CityName.value).toBe('Manchester');
        expect(arrivalConsignment.ConsigneeSPSParty.SpecifiedSPSAddress.PostcodeCode.value).toBe('M1 1BB');
        expect(arrivalConsignment.ConsigneeSPSParty.SpecifiedSPSAddress.CountryID.value).toBe('GB');
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

      it('should include consignee receipt location in arrival consignment', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.ConsigneeReceiptSPSLocation).toBeDefined();
        expect(arrivalConsignment.ConsigneeReceiptSPSLocation.ID.value).toBe('');
        expect(arrivalConsignment.ConsigneeReceiptSPSLocation.Name.value).toBe('Hull');
      });

      it('should set consignee party details in arrival consignment', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.ConsigneeSPSParty).toBeDefined();
        expect(arrivalConsignment.ConsigneeSPSParty.Name.value).toBe('Test Cold Storage Facility');
        expect(arrivalConsignment.ConsigneeSPSParty.RoleCode.value).toBe('CN');
      });

      it('should set consignee party address in arrival consignment', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.ConsigneeSPSParty.SpecifiedSPSAddress).toBeDefined();
        expect(arrivalConsignment.ConsigneeSPSParty.SpecifiedSPSAddress.LineOne.value).toBe('456 Storage Road');
        expect(arrivalConsignment.ConsigneeSPSParty.SpecifiedSPSAddress.CityName.value).toBe('Manchester');
        expect(arrivalConsignment.ConsigneeSPSParty.SpecifiedSPSAddress.PostcodeCode.value).toBe('M1 1BB');
        expect(arrivalConsignment.ConsigneeSPSParty.SpecifiedSPSAddress.CountryID.value).toBe('GB');
        expect(arrivalConsignment.ConsigneeSPSParty.SpecifiedSPSAddress.CountryName.value).toBe('UNITED KINGDOM OF GREAT BRITAIN AND NORTHERN IRELAND');
      });

      it('should set loading baseport location from arrival transport departure country', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.LoadingBaseportSPSLocation).toBeDefined();
        expect(arrivalConsignment.LoadingBaseportSPSLocation.ID.value).toBe('');
        expect(arrivalConsignment.LoadingBaseportSPSLocation.Name.languageID).toBe('en');
        expect(arrivalConsignment.LoadingBaseportSPSLocation.Name.value).toBe('United Kingdom of Great Britain and Northern Ireland');
      });

      it('should set unloading baseport location from arrival transport departure port', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.UnloadingBaseportSPSLocation).toBeDefined();
        expect(arrivalConsignment.UnloadingBaseportSPSLocation.ID.value).toBe('');
        expect(arrivalConsignment.UnloadingBaseportSPSLocation.Name.languageID).toBe('en');
        expect(arrivalConsignment.UnloadingBaseportSPSLocation.Name.value).toBe('Calais port');
      });

      it('should handle missing arrival transport departure country', () => {
        const exportDataWithoutDepartureCountry = {
          ...baseExportData,
          arrivalTransport: {
            ...baseExportData.arrivalTransport,
            departureCountry: undefined
          }
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutDepartureCountry
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.LoadingBaseportSPSLocation.Name.value).toBeUndefined();
      });

      it('should handle missing arrival transport departure port', () => {
        const exportDataWithoutDeparturePort = {
          ...baseExportData,
          arrivalTransport: {
            ...baseExportData.arrivalTransport,
            departurePort: undefined
          }
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutDeparturePort
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.UnloadingBaseportSPSLocation.Name.value).toBeUndefined();
      });

      it('should handle missing unloading place', () => {
        const exportDataWithoutUnloadingPlace = {
          ...baseExportData,
          arrivalTransport: {
            ...baseExportData.arrivalTransport,
            placeOfUnloading: undefined
          }
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutUnloadingPlace
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.ConsigneeReceiptSPSLocation.ID.value).toBe('');
      });

      it('should handle missing facility postcode', () => {
        const exportDataWithoutPostcode = {
          ...baseExportData,
          facilityPostcode: undefined
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutPostcode
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.ConsigneeSPSParty.SpecifiedSPSAddress.PostcodeCode.value).toBe('');
      });

      it('should handle missing entire arrival transport object', () => {
        const exportDataWithoutArrivalTransport = {
          ...baseExportData,
          arrivalTransport: undefined
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutArrivalTransport
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.LoadingBaseportSPSLocation.Name.value).toBeUndefined();
        expect(arrivalConsignment.UnloadingBaseportSPSLocation.Name.value).toBeUndefined();
      });

      it('should set ExportExitDateTime from arrivalTransport departureDate', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.ExportExitDateTime).toBeDefined();
        expect(arrivalConsignment.ExportExitDateTime.DateTime.value).toContain('2026-01-21');
      });

      it('should handle missing arrivalTransport departureDate gracefully', () => {
        const exportDataWithoutDepartureDate = {
          ...baseExportData,
          arrivalTransport: {
            ...baseExportData.arrivalTransport,
            departureDate: undefined
          }
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutDepartureDate
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.ExportExitDateTime).toBeDefined();
        expect(arrivalConsignment.ExportExitDateTime.DateTime.value).toBeDefined();
      });

      it('should include ExaminationSPSEvent with empty location in arrival consignment', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.ExaminationSPSEvent).toBeDefined();
        expect(arrivalConsignment.ExaminationSPSEvent.OccurrenceSPSLocation).toBeDefined();
        expect(arrivalConsignment.ExaminationSPSEvent.OccurrenceSPSLocation.ID.value).toBe('');
        expect(arrivalConsignment.ExaminationSPSEvent.OccurrenceSPSLocation.Name.value).toBe('');
      });

      it('should include UtilizedSPSTransportEquipment for arrival transport with containerNumber', () => {
        const exportDataWithContainer = {
          ...baseExportData,
          arrivalTransport: {
            ...baseExportData.arrivalTransport,
            containerNumber: 'ARRCONT123456'
          }
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithContainer
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.UtilizedSPSTransportEquipment).toBeDefined();
        expect(arrivalConsignment.UtilizedSPSTransportEquipment).toHaveLength(1);
        expect(arrivalConsignment.UtilizedSPSTransportEquipment[0].ID.value).toBe('ARRCONT123456');
        expect(arrivalConsignment.UtilizedSPSTransportEquipment[0].ID.schemeID).toBe('container_number');
      });

      it('should return empty UtilizedSPSTransportEquipment array when no container number on arrival transport', () => {
        const exportDataWithoutContainer = {
          ...baseExportData,
          arrivalTransport: {
            vehicle: 'truck',
            registrationNumber: 'AB12 CDE',
            departureCountry: 'United Kingdom',
            departurePort: 'Dover',
            departureDate: '21/01/2026',
            placeOfUnloading: 'Hull'
          }
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutContainer
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.UtilizedSPSTransportEquipment).toBeDefined();
        expect(arrivalConsignment.UtilizedSPSTransportEquipment).toHaveLength(0);
      });

      it('should set SequenceNumeric correctly for each catch item', () => {
        const exportDataWithMultipleCatches = {
          ...baseExportData,
          catches: [
            { ...baseExportData.catches[0] },
            { ...baseExportData.catches[0], product: 'Atlantic salmon (SAL)' },
            { ...baseExportData.catches[0], product: 'European plaice (PLE)' }
          ]
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithMultipleCatches
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;
        const tradeLineItems = arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

        expect(tradeLineItems[0].SequenceNumeric.value).toBe(1);
        expect(tradeLineItems[0].SequenceNumeric.format).toBe('1');
        expect(tradeLineItems[1].SequenceNumeric.value).toBe(2);
        expect(tradeLineItems[1].SequenceNumeric.format).toBe('2');
        expect(tradeLineItems[2].SequenceNumeric.value).toBe(3);
        expect(tradeLineItems[2].SequenceNumeric.format).toBe('3');
      });

      it('should use arrival weight fields in arrival consignment trade line items', () => {
        const exportDataWithArrivalWeights = {
          ...baseExportData,
          catches: [{
            ...baseExportData.catches[0],
            netWeightProductArrival: 80,
            netWeightFisheryProductArrival: 95
          }]
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithArrivalWeights
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;
        const tradeLineItem = arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0];

        expect(tradeLineItem.NetWeightMeasure.value).toBe(80);
        expect(tradeLineItem.NetWeightMeasure.unitCode).toBe('KGM');
        expect(tradeLineItem.GrossWeightMeasure.value).toBe(95);
        expect(tradeLineItem.GrossWeightMeasure.unitCode).toBe('KGM');
      });

      it('should set ConsignorSPSParty CountryName from exporter in arrival', () => {
        const exportDataWithFacilityCountry = {
          ...baseExportData,
          facilityCountry: 'United Kingdom'
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithFacilityCountry
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;

        expect(arrivalConsignment.ConsignorSPSParty.SpecifiedSPSAddress.CountryName.value).toBe('United Kingdom');
      });

      it('should set Description as empty languageID en in trade line items', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;
        const tradeLineItem = arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0];

        expect(tradeLineItem.Description).toBeDefined();
        expect(tradeLineItem.Description.languageID).toBe('en');
        expect(tradeLineItem.Description.value).toBe('');
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

      it('should set ExportExitDateTime from transport exportDate in departure', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.ExportExitDateTime).toBeDefined();
        expect(departureConsignment.ExportExitDateTime.DateTime.value).toContain('2026-01-21');
      });

      it('should handle missing transport exportDate gracefully', () => {
        const exportDataWithoutExportDate = {
          ...baseExportData,
          transport: {
            ...baseExportData.transport,
            exportDate: undefined
          }
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutExportDate
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.ExportExitDateTime).toBeDefined();
        expect(departureConsignment.ExportExitDateTime.DateTime.value).toBeDefined();
      });

      it('should set LoadingBaseportSPSLocation from transport departurePlace', () => {
        const exportDataWithDeparturePlace = {
          ...baseExportData,
          transport: {
            ...baseExportData.transport,
            departurePlace: 'Hull Port'
          }
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithDeparturePlace
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.LoadingBaseportSPSLocation.ID.value).toBe('');
        expect(departureConsignment.LoadingBaseportSPSLocation.Name.value).toBe('Hull Port');
      });

      it('should return undefined LoadingBaseportSPSLocation name when departurePlace is missing', () => {
        const exportDataWithoutDeparturePlace = {
          ...baseExportData,
          transport: {
            ...baseExportData.transport,
            departurePlace: undefined
          }
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutDeparturePlace
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.LoadingBaseportSPSLocation.Name.value).toBeUndefined();
      });

      it('should set UnloadingBaseportSPSLocation from transport pointOfDestination', () => {
        const exportDataWithDestination = {
          ...baseExportData,
          transport: {
            ...baseExportData.transport,
            pointOfDestination: 'Calais Port'
          }
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithDestination
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.UnloadingBaseportSPSLocation.ID.value).toBe('');
        expect(departureConsignment.UnloadingBaseportSPSLocation.Name.value).toBe('Calais Port');
      });

      it('should return undefined UnloadingBaseportSPSLocation name when pointOfDestination is missing', () => {
        const exportDataWithoutDestination = {
          ...baseExportData,
          transport: {
            ...baseExportData.transport,
            pointOfDestination: undefined
          }
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutDestination
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.UnloadingBaseportSPSLocation.Name.value).toBeUndefined();
      });

      it('should include ExaminationSPSEvent with empty location in departure consignment', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.ExaminationSPSEvent).toBeDefined();
        expect(departureConsignment.ExaminationSPSEvent.OccurrenceSPSLocation).toBeDefined();
        expect(departureConsignment.ExaminationSPSEvent.OccurrenceSPSLocation.ID.value).toBe('');
        expect(departureConsignment.ExaminationSPSEvent.OccurrenceSPSLocation.Name.value).toBe('');
      });

      it('should include UtilizedSPSTransportEquipment from transport containerNumber in departure', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.UtilizedSPSTransportEquipment).toBeDefined();
        expect(departureConsignment.UtilizedSPSTransportEquipment).toHaveLength(1);
        expect(departureConsignment.UtilizedSPSTransportEquipment[0].ID.value).toBe('CONT123456');
        expect(departureConsignment.UtilizedSPSTransportEquipment[0].ID.schemeID).toBe('container_number');
      });

      it('should include multiple containers in UtilizedSPSTransportEquipment when containerIdentificationNumber has comma-separated values', () => {
        const exportDataWithMultipleContainers = {
          ...baseExportData,
          transport: {
            ...baseExportData.transport,
            containerNumber: undefined,
            containerIdentificationNumber: 'CONT111, CONT222, CONT333'
          }
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithMultipleContainers
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.UtilizedSPSTransportEquipment).toHaveLength(3);
        expect(departureConsignment.UtilizedSPSTransportEquipment[0].ID.value).toBe('CONT111');
        expect(departureConsignment.UtilizedSPSTransportEquipment[1].ID.value).toBe('CONT222');
        expect(departureConsignment.UtilizedSPSTransportEquipment[2].ID.value).toBe('CONT333');
      });

      it('should use departure weight fields in departure consignment trade line items', () => {
        const exportDataWithDepartureWeights = {
          ...baseExportData,
          catches: [{
            ...baseExportData.catches[0],
            netWeightProductDeparture: 90,
            netWeightFisheryProductDeparture: 95
          }]
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithDepartureWeights
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;
        const tradeLineItem = departureConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0];

        expect(tradeLineItem.NetWeightMeasure.value).toBe(90);
        expect(tradeLineItem.NetWeightMeasure.unitCode).toBe('KGM');
        expect(tradeLineItem.GrossWeightMeasure.value).toBe(95);
        expect(tradeLineItem.GrossWeightMeasure.unitCode).toBe('KGM');
      });

      it('should set ConsigneeSPSParty with empty name in departure consignment', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;

        expect(departureConsignment.ConsigneeSPSParty).toBeDefined();
        expect(departureConsignment.ConsigneeSPSParty.Name.value).toBe('');
      });

      it('should set SequenceNumeric correctly for catches in departure consignment', () => {
        const exportDataWithMultipleCatches = {
          ...baseExportData,
          catches: [
            { ...baseExportData.catches[0] },
            { ...baseExportData.catches[0], product: 'Atlantic salmon (SAL)' }
          ]
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithMultipleCatches
        );

        const departureConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSDepartureConsignment;
        const tradeLineItems = departureConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

        expect(tradeLineItems[0].SequenceNumeric.value).toBe(1);
        expect(tradeLineItems[0].SequenceNumeric.format).toBe('1');
        expect(tradeLineItems[1].SequenceNumeric.value).toBe(2);
        expect(tradeLineItems[1].SequenceNumeric.format).toBe('2');
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

        expect(arrivalConsignment.ConsignorSPSParty.Name.value).toBe("Fish & Chips Ltd™");
      });
    });

    describe('Certificate number validation and SubjectCode assignment', () => {
      it('should set SubjectCode to CATCH_CERTIFICATE_LOCAL_REFERENCE for standard catch certificate', () => {
        const exportDataWithCC = {
          ...baseExportData,
          catches: [{
            certificateNumber: 'GBR-2025-CC-1234567890',
            product: 'Atlantic cod (COD)',
            commoditityCode: '030111',
            netWeightProductArrival: 100,
            netWeightFisheryProductArrival: 105
          }]
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithCC
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;
        const tradeLineItem = arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0];
        const certificateNote = tradeLineItem.AdditionalInformationSPSNote.find(
          (note: any) => note.Content.value === 'GBR-2025-CC-1234567890'
        );

        expect(certificateNote).toBeDefined();
        expect(certificateNote.SubjectCode.value).toBe('CATCH_CERTIFICATE_LOCAL_REFERENCE');
      });

      it('should set SubjectCode to CATCH_PROCESSING_STATEMENT_LOCAL_REFERENCE for UKPS certificate', () => {
        const exportDataWithUKPS = {
          ...baseExportData,
          catches: [{
            certificateNumber: 'GBR-2026-PS-40AF7C9D7',
            product: 'Atlantic cod (COD)',
            commoditityCode: '030111',
            netWeightProductArrival: 100,
            netWeightFisheryProductArrival: 105
          }]
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithUKPS
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;
        const tradeLineItem = arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0];
        const certificateNote = tradeLineItem.AdditionalInformationSPSNote.find(
          (note: any) => note.Content.value === 'GBR-2026-PS-40AF7C9D7'
        );

        expect(certificateNote).toBeDefined();
        expect(certificateNote.SubjectCode.value).toBe('CATCH_PROCESSING_STATEMENT_LOCAL_REFERENCE');
      });

      it('should set SubjectCode to CATCH_NON_MANIPULATION_DOCUMENT_LOCAL_REFERENCE for UKSD certificate', () => {
        const exportDataWithUKSD = {
          ...baseExportData,
          catches: [{
            certificateNumber: 'GBR-2026-SD-40AF7C9D7',
            product: 'Atlantic cod (COD)',
            commoditityCode: '030111',
            netWeightProductArrival: 100,
            netWeightFisheryProductArrival: 105
          }]
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithUKSD
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;
        const tradeLineItem = arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0];
        const certificateNote = tradeLineItem.AdditionalInformationSPSNote.find(
          (note: any) => note.Content.value === 'GBR-2026-SD-40AF7C9D7'
        );

        expect(certificateNote).toBeDefined();
        expect(certificateNote.SubjectCode.value).toBe('CATCH_NON_MANIPULATION_DOCUMENT_LOCAL_REFERENCE');
      });

      it('should not add certificate note when certificateNumber is missing', () => {
        const exportDataWithoutCertificate = {
          ...baseExportData,
          catches: [{
            product: 'Atlantic cod (COD)',
            commoditityCode: '030111',
            netWeightProductArrival: 100,
            netWeightFisheryProductArrival: 105
          }]
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutCertificate
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;
        const tradeLineItem = arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0];
        const certificateNotes = tradeLineItem.AdditionalInformationSPSNote.filter(
          (note: any) => ['CATCH_CERTIFICATE_LOCAL_REFERENCE', 'CATCH_PROCESSING_STATEMENT_LOCAL_REFERENCE', 'CATCH_NON_MANIPULATION_DOCUMENT_LOCAL_REFERENCE'].includes(note.SubjectCode.value)
        );

        expect(certificateNotes).toHaveLength(0);
      });

      it('should not add certificate note when certificateNumber is empty string', () => {
        const exportDataWithEmptyCertificate = {
          ...baseExportData,
          catches: [{
            certificateNumber: '',
            product: 'Atlantic cod (COD)',
            commoditityCode: '030111',
            netWeightProductArrival: 100,
            netWeightFisheryProductArrival: 105
          }]
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithEmptyCertificate
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;
        const tradeLineItem = arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0];
        const certificateNotes = tradeLineItem.AdditionalInformationSPSNote.filter(
          (note: any) => ['CATCH_CERTIFICATE_LOCAL_REFERENCE', 'CATCH_PROCESSING_STATEMENT_LOCAL_REFERENCE', 'CATCH_NON_MANIPULATION_DOCUMENT_LOCAL_REFERENCE'].includes(note.SubjectCode.value)
        );

        expect(certificateNotes).toHaveLength(0);
      });

      it('should handle multiple catches with different certificate types', () => {
        const exportDataWithMultipleCertificates = {
          ...baseExportData,
          catches: [
            {
              certificateNumber: 'GBR-2025-CC-1234567890',
              product: 'Atlantic cod (COD)',
              commoditityCode: '030111',
              netWeightProductArrival: 100,
              netWeightFisheryProductArrival: 105
            },
            {
              certificateNumber: 'GBR-2026-PS-40AF7C9D7',
              product: 'Atlantic salmon (SAL)',
              commoditityCode: '030121',
              netWeightProductArrival: 200,
              netWeightFisheryProductArrival: 210
            },
            {
              certificateNumber: 'GBR-2026-SD-40AF7C9D7',
              product: 'European plaice (PLE)',
              commoditityCode: '030131',
              netWeightProductArrival: 150,
              netWeightFisheryProductArrival: 155
            }
          ]
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithMultipleCertificates
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;
        const tradeLineItems = arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem;

        expect(tradeLineItems).toHaveLength(3);

        // Verify first catch (CC)
        const firstCertNote = tradeLineItems[0].AdditionalInformationSPSNote.find(
          (note: any) => note.Content.value === 'GBR-2025-CC-1234567890'
        );
        expect(firstCertNote.SubjectCode.value).toBe('CATCH_CERTIFICATE_LOCAL_REFERENCE');

        // Verify second catch (PS)
        const secondCertNote = tradeLineItems[1].AdditionalInformationSPSNote.find(
          (note: any) => note.Content.value === 'GBR-2026-PS-40AF7C9D7'
        );
        expect(secondCertNote.SubjectCode.value).toBe('CATCH_PROCESSING_STATEMENT_LOCAL_REFERENCE');

        // Verify third catch (SD)
        const thirdCertNote = tradeLineItems[2].AdditionalInformationSPSNote.find(
          (note: any) => note.Content.value === 'GBR-2026-SD-40AF7C9D7'
        );
        expect(thirdCertNote.SubjectCode.value).toBe('CATCH_NON_MANIPULATION_DOCUMENT_LOCAL_REFERENCE');
      });

      it('should always include CATCH_ISSUING_COUNTRY note with value GB', () => {
        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          baseExportData
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;
        const tradeLineItem = arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0];
        const issuingCountryNote = tradeLineItem.AdditionalInformationSPSNote.find(
          (note: any) => note.SubjectCode.value === 'CATCH_ISSUING_COUNTRY'
        );

        expect(issuingCountryNote).toBeDefined();
        expect(issuingCountryNote.Content.value).toBe('GB');
        expect(issuingCountryNote.Content.languageID).toBe('en');
      });

      it('should include SPECIES note when product is present', () => {
        const exportDataWithProduct = {
          ...baseExportData,
          catches: [{
            certificateNumber: 'GBR-2025-CC-001234',
            product: 'Atlantic cod (COD)',
            commoditityCode: '030111',
            netWeightProductArrival: 100,
            netWeightFisheryProductArrival: 105
          }]
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithProduct
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;
        const tradeLineItem = arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0];
        const speciesNote = tradeLineItem.AdditionalInformationSPSNote.find(
          (note: any) => note.SubjectCode.value === 'SPECIES'
        );

        expect(speciesNote).toBeDefined();
        expect(speciesNote.Content.value).toBe('COD');
        expect(speciesNote.Content.languageID).toBe('en');
      });

      it('should not include SPECIES note when product is missing', () => {
        const exportDataWithoutProduct = {
          ...baseExportData,
          catches: [{
            certificateNumber: 'GBR-2025-CC-001234',
            commoditityCode: '030111',
            netWeightProductArrival: 100,
            netWeightFisheryProductArrival: 105
          }]
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithoutProduct
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;
        const tradeLineItem = arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0];
        const speciesNote = tradeLineItem.AdditionalInformationSPSNote.find(
          (note: any) => note.SubjectCode.value === 'SPECIES'
        );

        expect(speciesNote).toBeUndefined();
      });

      it('should not include SPECIES note when product is empty string', () => {
        const exportDataWithEmptyProduct = {
          ...baseExportData,
          catches: [{
            certificateNumber: 'GBR-2025-CC-001234',
            product: '',
            commoditityCode: '030111',
            netWeightProductArrival: 100,
            netWeightFisheryProductArrival: 105
          }]
        };

        const result = StorageNotesTransformerService.generateStorageNotesPayload(
          documentNumber,
          createdAt,
          exportDataWithEmptyProduct
        );

        const arrivalConsignment = result.CreateCatchNonManipulationDocumentRequest.CatchNonManipulationDocument.SPSArrivalConsignment;
        const tradeLineItem = arrivalConsignment.IncludedSPSConsignmentItem.IncludedSPSTradeLineItem[0];
        const speciesNote = tradeLineItem.AdditionalInformationSPSNote.find(
          (note: any) => note.SubjectCode.value === 'SPECIES'
        );

        expect(speciesNote).toBeUndefined();
      });
    });
  });
});

describe('buildSupportingDocumentReferences', () => {
  describe('guard clauses', () => {
    it('should return empty array when catches is null', () => {
      const result = buildSupportingDocumentReferences(null);
      expect(result).toEqual([]);
    });

    it('should return empty array when catches is undefined', () => {
      const result = buildSupportingDocumentReferences(undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array when catches is not an array (string)', () => {
      const result = buildSupportingDocumentReferences('invalid' as any);
      expect(result).toEqual([]);
    });

    it('should return empty array when catches is not an array (object)', () => {
      const result = buildSupportingDocumentReferences({} as any);
      expect(result).toEqual([]);
    });

    it('should return empty array when catches is an empty array', () => {
      const result = buildSupportingDocumentReferences([]);
      expect(result).toEqual([]);
    });
  });

  describe('supportingDocuments guard clauses', () => {
    it('should skip a catch item that has no supportingDocuments property', () => {
      const result = buildSupportingDocumentReferences([{ product: 'Cod' }]);
      expect(result).toEqual([]);
    });

    it('should skip a catch item where supportingDocuments is null', () => {
      const result = buildSupportingDocumentReferences([{ supportingDocuments: null }]);
      expect(result).toEqual([]);
    });

    it('should skip a catch item where supportingDocuments is a string (not an array)', () => {
      const result = buildSupportingDocumentReferences([{ supportingDocuments: 'DOC-001' }]);
      expect(result).toEqual([]);
    });

    it('should skip a catch item where supportingDocuments is an object (not an array)', () => {
      const result = buildSupportingDocumentReferences([{ supportingDocuments: { ref: 'DOC-001' } }]);
      expect(result).toEqual([]);
    });

    it('should continue to next catch when one has non-array supportingDocuments and another has valid ones', () => {
      const result = buildSupportingDocumentReferences([
        { supportingDocuments: 'not-an-array' },
        { supportingDocuments: ['VALID-DOC'] }
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].ID.value).toBe('VALID-DOC');
    });
  });

  describe('empty and falsy document filtering', () => {
    it('should skip an empty string entry in supportingDocuments', () => {
      const result = buildSupportingDocumentReferences([{ supportingDocuments: [''] }]);
      expect(result).toEqual([]);
    });

    it('should skip a null entry in supportingDocuments', () => {
      const result = buildSupportingDocumentReferences([{ supportingDocuments: [null] }]);
      expect(result).toEqual([]);
    });

    it('should skip an undefined entry in supportingDocuments', () => {
      const result = buildSupportingDocumentReferences([{ supportingDocuments: [undefined] }]);
      expect(result).toEqual([]);
    });

    it('should skip a zero entry in supportingDocuments', () => {
      const result = buildSupportingDocumentReferences([{ supportingDocuments: [0] }]);
      expect(result).toEqual([]);
    });

    it('should only include non-empty entries from a mixed array', () => {
      const result = buildSupportingDocumentReferences([{
        supportingDocuments: ['', 'VALID-DOC', null, undefined, 'ANOTHER-DOC', '']
      }]);
      expect(result).toHaveLength(2);
      expect(result[0].ID.value).toBe('VALID-DOC');
      expect(result[1].ID.value).toBe('ANOTHER-DOC');
    });
  });

  describe('reference object shape', () => {
    it('should return a reference with the correct TypeCode', () => {
      const result = buildSupportingDocumentReferences([{ supportingDocuments: ['DOC-001'] }]);
      expect(result[0].TypeCode).toEqual({ value: '890' });
    });

    it('should return a reference with the correct RelationshipTypeCode', () => {
      const result = buildSupportingDocumentReferences([{ supportingDocuments: ['DOC-001'] }]);
      expect(result[0].RelationshipTypeCode).toEqual({
        name: 'Mutually defined reference number (Supporting document)',
        value: 'ZZZ'
      });
    });

    it('should return a reference with schemeID BK', () => {
      const result = buildSupportingDocumentReferences([{ supportingDocuments: ['DOC-001'] }]);
      expect(result[0].ID.schemeID).toBe('BK');
    });

    it('should set ID.value to the document reference string', () => {
      const result = buildSupportingDocumentReferences([{ supportingDocuments: ['MY-SUPP-DOC-123'] }]);
      expect(result[0].ID.value).toBe('MY-SUPP-DOC-123');
    });

    it('should not add any extra properties beyond TypeCode, RelationshipTypeCode, and ID', () => {
      const result = buildSupportingDocumentReferences([{ supportingDocuments: ['DOC-001'] }]);
      expect(Object.keys(result[0])).toEqual(['TypeCode', 'RelationshipTypeCode', 'ID']);
    });
  });

  describe('multiple catches and documents', () => {
    it('should create one entry per valid document across a single catch', () => {
      const result = buildSupportingDocumentReferences([{
        supportingDocuments: ['DOC-A', 'DOC-B', 'DOC-C']
      }]);
      expect(result).toHaveLength(3);
      expect(result[0].ID.value).toBe('DOC-A');
      expect(result[1].ID.value).toBe('DOC-B');
      expect(result[2].ID.value).toBe('DOC-C');
    });

    it('should flatten documents from multiple catches into a single array', () => {
      const result = buildSupportingDocumentReferences([
        { supportingDocuments: ['DOC-A1', 'DOC-A2'] },
        { supportingDocuments: ['DOC-B1'] },
        { supportingDocuments: ['DOC-C1', 'DOC-C2'] }
      ]);
      expect(result).toHaveLength(5);
      expect(result.map((r: any) => r.ID.value)).toEqual(['DOC-A1', 'DOC-A2', 'DOC-B1', 'DOC-C1', 'DOC-C2']);
    });

    it('should skip catches without supportingDocuments and still include valid ones', () => {
      const result = buildSupportingDocumentReferences([
        { product: 'Cod' },
        { supportingDocuments: ['DOC-001'] },
        { supportingDocuments: null },
        { supportingDocuments: ['DOC-002'] }
      ]);
      expect(result).toHaveLength(2);
      expect(result[0].ID.value).toBe('DOC-001');
      expect(result[1].ID.value).toBe('DOC-002');
    });

    it('should produce consistent schemeID BK on all returned references', () => {
      const result = buildSupportingDocumentReferences([
        { supportingDocuments: ['X1', 'X2'] },
        { supportingDocuments: ['X3'] }
      ]);
      result.forEach((ref: any) => {
        expect(ref.ID.schemeID).toBe('BK');
      });
    });
  });
});
