import moment from 'moment';
import { createMainCarriageSPSTransportMovement, createUtilizedSPSTransportEquipments, getApplicationSPSClassification, getSignatorySPSAuthentication, IssuerSPSParty, validateUKPSNumberFormat, validateUKSDNumberFormat } from '../data/euCatch';
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

  private static buildNonManipulationExchangedDocument(documentNumber: string, createdAt: Date, exportData: any): any {
    const EmptyNode = {
      value: ''
    };

    const TypeCode = {
      listID: '1001',
      listAgencyID: '6',
      listVersionID: 'D16B',
      name: 'CATCH_NON_MANIPULATION_DOCUMENT',
      listURI: '',
      value: '16'
    };

    const StatusCode = {
      listID: '4405',
      listAgencyID: '6',
      listVersionID: 'D16B',
      name: '39',
      listURI: '39',
      value: '39'
    };

    return {
      Name: {
        languageID: 'en',
        value: 'Non Manipulation Document'
      },
      ID: EmptyNode,
      Description: EmptyNode,
      TypeCode,
      StatusCode,
      IssueDateTime: {
        DateTime: {
          value: createdAt.toISOString()
        }
      },
      IssuerSPSParty,
      IncludedSPSNote: {
        Content: {
          languageID: 'en',
          value: exportData?.facilityStorage
        },
        SubjectCode: {
          languageID: 'en',
          value: 'STORAGE_CONDITION'
        }
      },
      ReferenceSPSReferencedDocument: [
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
      ],
      SignatorySPSAuthentication: getSignatorySPSAuthentication(createdAt)
    };
  }

  private static buildConsignment(exportData: any, type: 'arrival' | 'departure'): any {
    const field: any = {};

    if (type === 'arrival') {
      field.AvailabilityDueDateTime = {
        DateTime: {
          value: moment(exportData?.facilityArrivalDate, ["DD/MM/YYYY", "YYYY-MM-DD", "D/M/YYYY", "YYYY-M-D"]).toISOString()
        }
      };

      field.ExportExitDateTime = {
        DateTime: {
          value: moment(exportData?.arrivalTransport?.departureDate, ["DD/MM/YYYY", "YYYY-MM-DD", "D/M/YYYY", "YYYY-M-D"]).toISOString()
        }
      };

      field.ConsignorSPSParty = this.buildConsignorParty(exportData);
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
      field.UtilizedSPSTransportEquipment = createUtilizedSPSTransportEquipments([], exportData?.arrivalTransport, ",");
    } else {
      field.ExportExitDateTime = {
        DateTime: {
          value: moment(exportData?.transport?.exportDate, ["DD/MM/YYYY", "YYYY-MM-DD", "D/M/YYYY", "YYYY-M-D"]).toISOString()
        }
      };

      field.ConsignorSPSParty = {
        Name: {
          value: ''
        }
      };
      field.ConsigneeSPSParty = {
        Name: {
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
      field.UtilizedSPSTransportEquipment = createUtilizedSPSTransportEquipments([], exportData?.transport, ",");
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
      ID: {
        value: ''
      },
      Name: {
        languageID: 'en',
        value: exportData?.facilityName
      },
      RoleCode: {
        value: 'CN'
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

  private static buildConsignorParty(exportData: any): any {
    const exporterDetails = exportData?.exporterDetails || {};

    return {
      ID: {
        value: ''
      },
      Name: {
        languageID: 'en',
        value: exporterDetails.exporterCompanyName
      },
      RoleCode: {
        name: 'Consignor (Exporter)',
        value: 'EX'
      },
      SpecifiedSPSAddress: {
        LineOne: {
          languageID: 'en',
          value: exporterDetails.exporterAddressOne
        },
        CityName: {
          languageID: 'en',
          value: exporterDetails.townCity
        },
        PostcodeCode: {
          languageID: 'en',
          value: exporterDetails.exporterPostcode
        },
        CountryID: {
          value: 'GB'
        },
        CountryName: {
          languageID: 'en',
          value: exporterDetails.country
        }
      }
    };
  }

  private static buildConsignmentItems(exportData: any, type: string): any {
    const catches = exportData?.catches || [];

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
      ApplicableSPSClassification: getApplicationSPSClassification(ctch.commodityCode, !this.isProcessingStatementReference(ctch))
    }));
  }

  private static isProcessingStatementReference(catchData: any): boolean {
    return ['non_uk', 'uk'].includes(catchData.certificateType) && catchData.entryDocumentType === 'processingStatement'
      || validateUKPSNumberFormat(catchData.certificateNumber);
  }

  private static buildAdditionalNotes(catchData: any): any[] {
    const notes = [];

    if (catchData.certificateNumber) {
      let localReference = 'CATCH_CERTIFICATE_LOCAL_REFERENCE';

      if (catchData.certificateType === 'non_uk' && catchData.entryDocumentType) {
        // non-UK: use explicit document type rather than format heuristics
        if (catchData.entryDocumentType === 'processingStatement') {
          localReference = 'CATCH_PROCESSING_STATEMENT_LOCAL_REFERENCE';
        } else if (catchData.entryDocumentType === 'storageNotes') {
          localReference = 'CATCH_NON_MANIPULATION_DOCUMENT_LOCAL_REFERENCE';
        }
        // 'catchCertificate' keeps the default CATCH_CERTIFICATE_LOCAL_REFERENCE
      } else if (validateUKPSNumberFormat(catchData.certificateNumber)) {
        localReference = 'CATCH_PROCESSING_STATEMENT_LOCAL_REFERENCE';
      } else if (validateUKSDNumberFormat(catchData.certificateNumber)) {
        localReference = 'CATCH_NON_MANIPULATION_DOCUMENT_LOCAL_REFERENCE';
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
        value: catchData.certificateType === 'non_uk' ? catchData.issuingCountry?.isoCodeAlpha2 : 'GB'
      },
      SubjectCode: {
        value: this.isProcessingStatementReference(catchData)
          ? 'CATCH_PROCESSING_STATEMENT_ISSUING_COUNTRY'
          : 'CATCH_ISSUING_COUNTRY'
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

}
