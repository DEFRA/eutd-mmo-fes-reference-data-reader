import logger from '../logger';

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

    try {
      const payload = {
        CreateCatchNonManipulationDocumentRequest: {
          CatchNonManipulationDocument: {
            SPSExchangedDocument: this.buildExchangedDocument(documentNumber, createdAt, exportData),
            SPSArrivalConsignment: this.buildConsignment(exportData, 'arrival'),
            SPSDepartureConsignment: this.buildConsignment(exportData, 'departure')
          }
        }
      };

      logger.info(`[STORAGE-NOTES-TRANSFORMER][PAYLOAD-GENERATED][${documentNumber}]`);
      return payload;
    } catch (error) {
      logger.error(`[STORAGE-NOTES-TRANSFORMER][ERROR][${documentNumber}][${error.message}]`);
      throw error;
    }
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
      consignment.AvailabilityDueDateTime = {
        DateTime: {
          value: exportData?.facilityArrivalDate 
            ? new Date(exportData.facilityArrivalDate).toISOString()
            : new Date().toISOString()
        }
      };

      consignment.ConsignorSPSParty = this.buildConsignorParty(exportData);
      consignment.ConsigneeReceiptSPSLocation = this.buildConsigneeReceiptLocation(exportData);
      consignment.ConsigneeSPSParty = this.buildConsigneeParty(exportData);
    } else {
      consignment.ConsignorSPSParty = {
        Name: {
          languageID: 'en',
          value: ''
        }
      };
      consignment.ConsigneeSPSParty = {
        Name: {
          languageID: 'en',
          value: ''
        }
      };
    }

    consignment.ExportSPSCountry = {
      ID: {
        value: 'GB'
      },
      Name: {
        languageID: 'en',
        value: 'United Kingdom'
      }
    };

    consignment.LoadingBaseportSPSLocation = this.buildLocation(exportData?.exportLocation);
    consignment.ImportSPSCountry = this.buildLocation(exportData?.exportedTo);
    consignment.UnloadingBaseportSPSLocation = this.buildLocation(exportData?.exportedTo);

    consignment.ExaminationSPSEvent = {
      OccurrenceSPSLocation: {
        ID: {
          value: ''
        },
        Name: {
          value: ''
        }
      }
    };

    consignment.MainCarriageSPSTransportMovement = this.buildTransportMovement(exportData);
    consignment.IncludedSPSConsignmentItem = this.buildConsignmentItems(exportData);

    return consignment;
  }

  private static buildConsignorParty(exportData: any): any {
    return {
      ID: {
        value: exportData?.facilityApprovalNumber || 'Facility ID'
      },
      Name: {
        languageID: 'en',
        value: exportData?.facilityName || 'Facility Name'
      },
      RoleCode: {
        value: 'CB'
      },
      SpecifiedSPSAddress: {
        LineOne: {
          languageID: 'en',
          value: exportData?.facilityAddressOne || ''
        },
        CityName: {
          languageID: 'en',
          value: exportData?.facilityTownCity || ''
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
        value: exportData?.unloadingPlace || 'place of unloading'
      },
      Name: {
        value: ''
      }
    };
  }

  private static buildConsigneeParty(exportData: any): any {
    const exporterDetails = exportData?.exporterDetails || {};
    
    return {
      ID: {
        value: exporterDetails.exporterCompanyName || 'Exporter ID'
      },
      Name: {
        languageID: 'en',
        value: exporterDetails.exporterCompanyName || 'Exporter Name'
      },
      RoleCode: {
        name: 'Consignor (Exporter)',
        value: 'CZ'
      },
      SpecifiedSPSAddress: {
        LineOne: {
          languageID: 'en',
          value: exporterDetails.exporterAddressOne || ''
        },
        CityName: {
          languageID: 'en',
          value: exporterDetails._townCity || ''
        },
        PostcodeCode: {
          languageID: 'en',
          value: exporterDetails.exporterPostcode || ''
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

    // For now, build single item with first catch
    // In production, you may need to handle multiple items differently
    const firstCatch = catches[0];

    return {
      IncludedSPSTradeLineItem: {
        SequenceNumeric: {
          format: '1',
          value: 1
        },
        Description: {
          languageID: 'en',
          languageLocaleID: 'en',
          value: firstCatch.productDescription || ''
        },
        NetWeightMeasure: {
          unitCode: 'KGM',
          unitCodeListVersionID: '100',
          value: firstCatch.netWeightProductArrival || firstCatch.productWeight || '0'
        },
        GrossWeightMeasure: {
          unitCode: 'KGM',
          unitCodeListVersionID: '100',
          value: firstCatch.netWeightProductArrival || firstCatch.productWeight || '0'
        },
        AdditionalInformationSPSNote: this.buildAdditionalNotes(firstCatch),
        ApplicableSPSClassification: this.buildClassification(firstCatch)
      }
    };
  }

  private static createEmptyConsignmentItem(): any {
    return {
      IncludedSPSTradeLineItem: {
        SequenceNumeric: {
          format: '1',
          value: 1
        },
        Description: {
          languageID: 'en',
          languageLocaleID: 'en',
          value: ''
        },
        NetWeightMeasure: {
          unitCode: 'KGM',
          unitCodeListVersionID: '100',
          value: '0'
        },
        GrossWeightMeasure: {
          unitCode: 'KGM',
          unitCodeListVersionID: '100',
          value: '0'
        },
        AdditionalInformationSPSNote: [],
        ApplicableSPSClassification: {
          SystemID: {
            value: 'CN'
          },
          SystemName: {
            languageID: 'en',
            languageLocaleID: 'en',
            value: 'CN Code (Combined Nomenclature)'
          },
          ClassCode: {
            value: ''
          },
          ClassName: {
            languageID: 'en',
            languageLocaleID: 'en',
            value: ''
          }
        }
      }
    };
  }

  private static buildAdditionalNotes(catchData: any): any[] {
    const notes = [];

    if (catchData.certificateNumber) {
      notes.push({
        Content: {
          languageID: 'en',
          value: catchData.certificateNumber
        },
        SubjectCode: {
          value: 'CATCH_CERTIFICATE_LOCAL_REFERENCE'
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

    if (catchData.product?.scientificName) {
      notes.push({
        Content: {
          languageID: 'en',
          value: catchData.product.scientificName
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
}
