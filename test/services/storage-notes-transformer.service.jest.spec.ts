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
        expect(arrivalConsignment.ConsigneeSPSParty.RoleCode.value).toBe('EX');
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
