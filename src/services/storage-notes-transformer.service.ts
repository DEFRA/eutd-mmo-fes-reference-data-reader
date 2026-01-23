import moment from 'moment';
import { createMainCarriageSPSTransportMovement, getApplicationSPSClassification, getSignatorySPSAuthentication, IssuerSPSParty, validateUKPSNumberFormat, validateUKSDNumberFormat } from '../data/euCatch';
import logger from '../logger';
import { toSpeciesCode } from '../landings/transformations/dynamicsValidation';

/**
 * Transforms storage notes data into UN/CEFACT CATCH API JSON schema format
 * Following the CreateCatchNonManipulationDocumentRequest schema
 */
export default class StorageNotesTransformerService {
  public static generateStorageNotesPayload(
    documentNumber: string,
    createdAt: Date,
    exportData: any
  ): any {
    logger.info(`[STORAGE-NOTES-TRANSFORMER][GENERATING-PAYLOAD][${documentNumber}]`);

    const payload = {
      CreateCatchNonManipulationDocumentRequest: {
        CatchNonManipulationDocument: {
          SPSExchangedDocument: this.buildNonManipulationExchangedDocument(documentNumber, createdAt, exportData),
          SPSArrivalConsignment: this.buildConsignment(exportData, 'arrival'),
          SPSDepartureConsignment: this.buildConsignment(exportData, 'departure')
        }
      }
    };

    logger.info(`[STORAGE-NOTES-TRANSFORMER][PAYLOAD-GENERATED][${documentNumber}]`);
    return payload;
  }

  private static buildReferencedDocuments(documentNumber: string, exportData: any): any[] {
    const documents = [
      {
        TypeCode: {
          value: '916'
        },
        RelationshipTypeCode: {
          value: 'DM'
        },
        ID: {
          value: documentNumber
        }
      }
    ];

    // Add transport document reference if available
    if (exportData?.transport?.transportDocumentReferenceNumber) {
      documents.push({
        TypeCode: {
          value: '710'
        },
        RelationshipTypeCode: {
          value: 'VON'
        },
        ID: {
          value: exportData.transport.transportDocumentReferenceNumber,
          schemeAgencyID: 'BEFORE_BCP'
        }
      } as any);
    }

    return documents;
  }

  private static buildAttainedSPSQualification(nameValue: string = '', languageID?: string) {
    const nameObj: any = { value: nameValue };
    if (languageID) nameObj.languageID = languageID;
    return { Name: nameObj };
  }

  private static buildAuthentications(createdAt: Date): any[] {
    return [
      {
        TypeCode: { value: '5' },
        ActualDateTime: { DateTime: { value: createdAt.toISOString() } },
        ProviderSPSParty: {
          Name: { value: 'Official' },
          RoleCode: { value: '' },
          SpecifiedSPSPerson: {
            Name: { value: 'John Dow' },
            AttainedSPSQualification: this.buildAttainedSPSQualification('')
          }
        },
        IncludedSPSClause: { Content: { value: '' } }
      },
      {
        TypeCode: { value: '1' },
        ActualDateTime: { DateTime: { value: createdAt.toISOString() } },
        ProviderSPSParty: {
          Name: { languageID: 'en', value: 'Official Inspector' },
          RoleCode: { value: 'VJ' },
          SpecifiedSPSPerson: {
            Name: { languageID: 'en', value: 'John Doe' },
            AttainedSPSQualification: this.buildAttainedSPSQualification('', 'en')
          }
        }
      }
    ];
  }

  private static buildConsignment(exportData: any, type: 'arrival' | 'departure'): any {
    const consignment: any = {
      ExportExitDateTime: {
        DateTime: {
          value: exportData?.transport?.exportDate
            ? new Date(exportData.transport.exportDate).toISOString()
            : new Date().toISOString()
        }
      }
    };

    if (type === 'arrival') {
      field.AvailabilityDueDateTime = {
        DateTime: {
          value: exportData?.facilityArrivalDate
            ? new Date(exportData.facilityArrivalDate).toISOString()
            : new Date().toISOString()
        }
      };

      field.ExportExitDateTime = {
        DateTime: {
          value: moment(exportData?.arrivalTransport?.departureDate, ["DD/MM/YYYY", "YYYY-MM-DD", "D/M/YYYY", "YYYY-M-D"]).toISOString()
        }
      };

      field.ConsignorSPSParty = this.buildConsignorParty(exportData, type);
      field.ConsigneeReceiptSPSLocation = this.buildConsigneeReceiptLocation(exportData?.arrivalTransport);
      field.ConsigneeSPSParty = this.buildConsigneeParty(exportData);

      field.LoadingBaseportSPSLocation = {
        ID: {
          value: ''
        },
        Name: {
          languageID: 'en',
          value: exportData?.arrivalTransport?.departureCountry
        }
      };

      field.UnloadingBaseportSPSLocation = {
        ID: {
          value: ''
        },
        Name: {
          languageID: 'en',
          value: exportData?.arrivalTransport?.departurePort
        }
      };

      field.MainCarriageSPSTransportMovement = createMainCarriageSPSTransportMovement(exportData?.arrivalTransport);
    } else {
      field.ExportExitDateTime = {
        DateTime: {
          value: moment(exportData?.transport?.exportDate, ["DD/MM/YYYY", "YYYY-MM-DD", "D/M/YYYY", "YYYY-M-D"]).toISOString()
        }
      };

      field.ConsignorSPSParty = {
        Name: {
          languageID: 'en',
          value: ''
        }
      };
      field.ConsigneeSPSParty = {
        Name: {
          languageID: 'en',
          value: ''
        }
      };

      field.LoadingBaseportSPSLocation = {
        ID: {
          value: ''
        },
        Name: {
          languageID: 'en',
          value: exportData?.transport?.departurePlace
        }
      };

      field.UnloadingBaseportSPSLocation = {
        ID: {
          value: ''
        },
        Name: {
          languageID: 'en',
          value: exportData?.transport?.pointOfDestination
        }
      };

      field.MainCarriageSPSTransportMovement = createMainCarriageSPSTransportMovement(exportData?.transport);
    }

    field.ExportSPSCountry = {
      ID: {
        value: 'GB'
      },
      Name: {
        languageID: 'en',
        value: 'United Kingdom'
      }
    };

    field.ImportSPSCountry = {
      ID: {
        value: ''
      },
      Name: {
        languageID: 'en',
        value: ''
      }
    };

    field.ExaminationSPSEvent = {
      OccurrenceSPSLocation: {
        ID: {
          value: ''
        },
        Name: {
          value: ''
        }
      }
    };

    field.IncludedSPSConsignmentItem = {
      IncludedSPSTradeLineItem: this.buildConsignmentItems(exportData, type)
    }

    return field;
  }

  private static buildConsigneeParty(exportData: any): any {
    return {
      Name: {
        languageID: 'en',
        value: exportData?.facilityName
      },
      RoleCode: {
        value: 'EX'
      },
      SpecifiedSPSAddress: {
        LineOne: {
          languageID: 'en',
          value: exportData?.facilityAddressOne
        },
        CityName: {
          languageID: 'en',
          value: exportData?.facilityTownCity
        },
        PostcodeCode: {
          languageID: 'en',
          value: exportData?.facilityPostcode || ''
        },
        CountryID: {
          value: 'GB'
        },
        CountryName: {
          languageID: 'en',
          value: 'UNITED KINGDOM OF GREAT BRITAIN AND NORTHERN IRELAND'
        }
      }
    };
  }

  private static buildConsigneeReceiptLocation(exportData: any): any {
    return {
      ID: {
        value: ''
      },
      Name: {
        languageID: 'en',
        value: exportData?.placeOfUnloading
      }
    };
  }

  private static buildConsignorParty(exportData: any, type: string): any {
    const exporterDetails = exportData?.exporterDetails || {};

    return {
      Name: {
        languageID: 'en',
        value: type === 'arrival' ? exportData?.facilityName : exporterDetails.exporterCompanyName
      },
      RoleCode: {
        name: 'Consignor (Exporter)',
        value: 'CZ'
      },
      SpecifiedSPSAddress: {
        LineOne: {
          languageID: 'en',
          value: type === 'arrival' ? exportData?.facilityAddressOne : exporterDetails.exporterAddressOne
        },
        CityName: {
          languageID: 'en',
          value: type === 'arrival' ? exportData?.facilityTownCity : exporterDetails.townCity
        },
        PostcodeCode: {
          languageID: 'en',
          value: type === 'arrival' ? exportData?.facilityPostcode : exporterDetails.exporterPostcode
        },
        CountryID: {
          value: 'GB'
        },
        CountryName: {
          languageID: 'en',
          value: type === 'arrival' ? exportData?.facilityCountry : exporterDetails.country
        }
      }
    };
  }

  private static buildLocation(location: any): any {
    if (!location) {
      return {
        ID: {
          value: ''
        },
        Name: {
          languageID: 'en',
          value: ''
        }
      };
    }

    return {
      ID: {
        value: location.officialCountryCode || location.isoCodeAlpha2 || ''
      },
      Name: {
        languageID: 'en',
        value: location.officialCountryName || location.name || ''
      }
    };
  }

  private static buildTransportMovement(exportData: any): any {
    const transport = exportData?.transport || {};

    return {
      ID: {
        schemeID: 'ship_imo_number_before_bcp',
        value: transport.cmr || ''
      },
      ModeCode: {
        name: this.getTransportModeName(transport.vehicle),
        value: this.getTransportModeCode(transport.vehicle)
      },
      UsedSPSTransportMeans: {
        Name: {
          languageID: 'en',
          languageLocaleID: 'en-nz',
          value: transport.registrationNumber || transport.flightNumber || transport.vesselName || ''
        }
      }
    };
  }

  private static getTransportModeName(vehicle: string): string {
    const modes: Record<string, string> = {
      truck: 'Road transport',
      plane: 'Air transport',
      ship: 'Maritime transport',
      train: 'Rail transport',
      containerVessel: 'Maritime transport'
    };
    return modes[vehicle] || 'Maritime transport';
  }

  private static getTransportModeCode(vehicle: string): string {
    const codes: Record<string, string> = {
      truck: '3',
      plane: '4',
      ship: '1',
      train: '2',
      containerVessel: '1'
    };
    return codes[vehicle] || '1';
  }

  private static buildConsignmentItems(exportData: any): any {
    const catches = exportData?.catches || [];

    if (catches.length === 0) {
      return this.createEmptyConsignmentItem();
    }

    return catches.map((ctch: any, index: number) => ({
      SequenceNumeric: {
        format: (index + 1).toString(),
        value: index + 1
      },
      Description: {
        languageID: 'en',
        languageLocaleID: 'en',
        value: ''
      },
      NetWeightMeasure: {
        unitCode: 'KGM',
        unitCodeListVersionID: type === 'arrival' ? ctch.netWeightProductArrival : ctch.netWeightProductDeparture,
        value: type === 'arrival' ? ctch.netWeightProductArrival : ctch.netWeightProductDeparture
      },
      GrossWeightMeasure: {
        unitCode: 'KGM',
        unitCodeListVersionID: type === 'arrival' ? ctch.netWeightFisheryProductArrival : ctch.netWeightFisheryProductDeparture,
        value: type === 'arrival' ? ctch.netWeightFisheryProductArrival : ctch.netWeightFisheryProductDeparture
      },
      AdditionalInformationSPSNote: this.buildAdditionalNotes(ctch),
      ApplicableSPSClassification: getApplicationSPSClassification(ctch.commodityCode)
    }));
  }

  private static buildAdditionalNotes(catchData: any): any[] {
    const notes = [];

    if (catchData.certificateNumber) {
      let localReference = 'CATCH_CERTIFICATE_LOCAL_REFERENCE';

      if (validateUKPSNumberFormat(catchData.certificateNumber)) {
        localReference = 'CATCH_PROCESSING_STATEMENT_LOCAL_REFERENCE'
      } else if (validateUKSDNumberFormat(catchData.certificateNumber)) {
        localReference = 'CATCH_NON_MANIPULATION_DOCUMENT_LOCAL_REFERENCE'
      }

      notes.push({
        Content: {
          languageID: 'en',
          value: catchData.certificateNumber
        },
        SubjectCode: {
          value: localReference
        }
      });
    }

    notes.push({
      Content: {
        languageID: 'en',
        value: 'GB'
      },
      SubjectCode: {
        value: 'CATCH_ISSUING_COUNTRY'
      }
    });

    if (catchData.product) {
      notes.push({
        Content: {
          languageID: 'en',
          value: toSpeciesCode(catchData.product)
        },
        SubjectCode: {
          value: 'SPECIES'
        }
      });
    }

    return notes;
  }

  private static buildClassification(catchData: any): any {
    return {
      SystemID: {
        value: 'CN'
      },
      SystemName: {
        languageID: 'en',
        languageLocaleID: 'en',
        value: 'CN Code (Combined Nomenclature)'
      },
      ClassCode: {
        value: catchData.commodityCode || ''
      },
      ClassName: {
        languageID: 'en',
        languageLocaleID: 'en',
        value: catchData.commodityCodeDescription || 'Other prepared or preserved fish'
      }
    };
  }

    private static buildExchangedDocument(documentNumber: string, createdAt: Date, exportData: any): any {
    return {
      Name: {
        languageID: 'en',
        value: 'Non Manipulation Document'
      },
      Description: {
        value: ''
      },
      ID: {
        value: ''
      },
      TypeCode: {
        listID: '1001',
        listAgencyID: '6',
        listVersionID: 'D16B',
        name: 'CATCH_NON_MANIPULATION_DOCUMENT',
        listURI: '',
        value: '16'
      },
      StatusCode: {
        listID: '4405',
        listAgencyID: '6',
        listVersionID: 'D16B',
        name: '39',
        listURI: '39',
        value: '39'
      },
      IssueDateTime: {
        DateTime: {
          value: createdAt.toISOString()
        }
      },
      IssuerSPSParty: {
        Name: {
          languageID: 'en',
          value: 'Marine Management Organization'
        },
        RoleCode: {
          value: 'PQ'
        }
      },
      IncludedSPSNote: {
        Content: {
          languageID: 'en',
          value: exportData?.facilityStorage || 'CHILLED'
        },
        SubjectCode: {
          languageID: 'en',
          value: 'STORAGE_CONDITION'
        }
      },
      ReferenceSPSReferencedDocument: this.buildReferencedDocuments(documentNumber, exportData),
      SignatorySPSAuthentication: this.buildAuthentications(createdAt)
    };
  }
}
