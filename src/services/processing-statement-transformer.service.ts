import moment from 'moment';
import logger from '../logger';
import { getApplicationSPSClassification, getSignatorySPSAuthentication, IssuerSPSParty, validateUKPSNumberFormat } from '../data/euCatch';
import { ICountry } from 'mmo-shared-reference-data';

/**
 * Transforms processing statement data into UN/CEFACT CATCH API JSON schema format
 */
export default class ProcessingStatementTransformerService {
  public static generateProcessingStatementPayload(
    documentNumber: string,
    createdAt: Date,
    exportData: any
  ): any {
    logger.info(`[PS-TRANSFORMER][GENERATING-PAYLOAD][${documentNumber}]`);

    try {
      const payload = {
        CreateCatchProcessingStatementRequest: {
          SPSCertificate: {
            SPSExchangedDocument: this.buildExchangedDocument(documentNumber, createdAt, exportData),
            SPSConsignment: this.buildConsignment(exportData)
          }
        }
      };

      logger.info(`[PS-TRANSFORMER][PAYLOAD-GENERATED][${documentNumber}]`);
      return payload;
    } catch (error) {
      logger.error(`[PS-TRANSFORMER][ERROR][${documentNumber}][${error.message}]`);
      throw error;
    }
  }

  private static buildExchangedDocument(documentNumber: string, createdAt: Date, exportData: any): any {
    return {
      Name: {
        languageID: 'en',
        value: 'Processing Statement'
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
        name: 'CATCH_PROCESSING_STATEMENT',
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
      IssuerSPSParty,
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
        },
        {
          TypeCode: {
            name: 'Health certificate',
            value: '636'
          },
          RelationshipTypeCode: {
            value: 'ZZZ'
          },
          IssueDateTime: {
            value: moment(exportData.healthCertificateDate, ["DD/MM/YYYY", "DD/M/YYYY", "D/MM/YYYY", "D/M/YYYY"]).toISOString()
          },
          ID: {
            schemeAgencyID: 'GB',
            value: exportData.healthCertificateNumber
          }
        },
        {
          TypeCode: {
            value: '916'
          },
          RelationshipTypeCode: {
            value: 'AIS'
          },
          ID: {
            value: exportData.plantApprovalNumber
          }
        }
      ],
      SignatorySPSAuthentication: getSignatorySPSAuthentication(createdAt)
    };
  }

  private static buildConsignment(exportData: any): any {
    return {
      ConsignorSPSParty: this.buildConsignorParty(exportData),
      ConsigneeSPSParty: this.buildConsigneeParty(exportData.exporterDetails),
      ExportSPSCountry: this.buildExportCountry(),
      LoadingBaseportSPSLocation: this.buildLoadingLocation(),
      ImportSPSCountry: this.buildImportCountry(exportData.exportedTo),
      UnloadingBaseportSPSLocation: this.buildUnloadingLocation(exportData.exportedTo, exportData.pointOfDestination),
      ExaminationSPSEvent: {
        OccurrenceSPSLocation: {
          ID: {
            value: ''
          },
          Name: {
            value: ''
          }
        }
      },
      IncludedSPSConsignmentItem: {
        IncludedSPSTradeLineItem: this.buildConsignmentItem(exportData)
      }
    };
  }

  private static buildConsignorParty({ plantName, plantAddressOne, plantTownCity, plantPostcode }: any): any {
    return {
      Name: {
        languageID: 'en',
        value: plantName || ''
      },
      RoleCode: {
        value: 'CZ'
      },
      SpecifiedSPSAddress: {
        LineOne: {
          languageID: 'en',
          value: plantAddressOne || ''
        },
        CityName: {
          languageID: 'en',
          value: plantTownCity || ''
        },
        PostcodeCode: {
          languageID: 'en',
          value: plantPostcode || ''
        },
        CountryID: {
          value: 'GB'
        },
        CountryName: {
          languageID: 'en',
          value: 'United Kingdom'
        }
      }
    };
  }

  private static buildConsigneeParty({ exporterCompanyName, addressOne, townCity, postcode }: any): any {
    return {
      ID: {
        value: ''
      },
      Name: {
        languageID: 'en',
        value: exporterCompanyName || ''
      },
      RoleCode: {
        value: 'CN'
      },
      SpecifiedSPSAddress: {
        LineOne: {
          languageID: 'en',
          value: addressOne || ''
        },
        CityName: {
          languageID: 'en',
          value: townCity || ''
        },
        PostcodeCode: {
          languageID: 'en',
          value: postcode || ''
        },
        CountryID: {
          value: 'GB'
        },
        CountryName: {
          languageID: 'en',
          value: 'United Kingdom'
        }
      }
    };
  }

  private static buildExportCountry(): any {
    return {
      ID: {
        schemeAgencyID: 'agency',
        value: 'GB'
      },
      Name: {
        languageID: 'en',
        languageLocaleID: 'en-nz',
        value: 'United Kingdom'
      }
    };
  }

  private static buildLoadingLocation(): any {
    return {
      ID: {
        schemeID: '',
        value: ''
      },
      Name: {
        languageID: '',
        languageLocaleID: '',
        value: ''
      }
    };
  }

  private static buildImportCountry(exportedTo: any): any {
    const importCountry = exportedTo?.isoCodeAlpha2 || '';
    const countryName = exportedTo?.officialCountryName || '';

    return {
      ID: {
        value: importCountry
      },
      Name: {
        languageID: 'en',
        value: countryName.toUpperCase()
      }
    };
  }

  private static buildUnloadingLocation(exportedTo: ICountry, pointOfDestination: string): any {
    return {
      ID: {
        schemeID: 'controlled_location_id',
        value: exportedTo?.isoCodeAlpha2 ?? ''
      },
      Name: {
        languageID: 'en',
        languageLocaleID: 'en-nz',
        value: pointOfDestination
      }
    };
  }

  private static buildConsignmentItem(exportData: any): any {
    // Get first product for basic information
    const catches = exportData.catches || [];
    return catches.map((ctch: any, index: number) => {
      const sequenceNumeric = index + 1;

      // Build additional information notes
      const notes: any[] = [];

      // Add catch certificate references
      if (ctch.catchCertificateNumber && validateUKPSNumberFormat(ctch.catchCertificateNumber)) {
        notes.push({
          Content: {
            languageID: 'en',
            value: ctch.catchCertificateNumber
          },
          SubjectCode: {
            value: 'CATCH_PROCESSING_STATEMENT_LOCAL_REFERENCE'
          }
        });
      } else {
        notes.push({
          Content: {
            languageID: 'en',
            value: ctch.catchCertificateNumber
          },
          SubjectCode: {
            value: 'CATCH_CERTIFICATE_LOCAL_REFERENCE'
          }
        });
      }

      if (ctch.catchCertificateNumber && validateUKPSNumberFormat(ctch.catchCertificateNumber)) {
        notes.push({
          Content: {
            languageID: 'en',
            value: ctch.catchCertificateType === 'non_uk' ? ctch.issuingCountry?.isoCodeAlpha2 : 'GB'
          },
          SubjectCode: {
            value: 'CATCH_PROCESSING_STATEMENT_ISSUING_COUNTRY'
          }
        });
      } else {
        notes.push({
          Content: {
            languageID: 'en',
            value: ctch.catchCertificateType === 'non_uk' ? ctch.issuingCountry?.isoCodeAlpha2 : 'GB'
          },
          SubjectCode: {
            value: 'CATCH_CERTIFICATE_ISSUING_COUNTRY'
          }
        });
      }

      if (ctch.productCommodityCode) {
        notes.push({
          Content: {
            languageID: 'en',
            value: ctch.productCommodityCode.substring(0, 6)
          },
          SubjectCode: {
            value: 'PROCESSED_PRODUCT_CODE'
          }
        });
      }

      if (ctch.scientificName) {
        notes.push({
          Content: {
            languageID: 'en',
            value: ctch.scientificName
          },
          SubjectCode: {
            value: 'PROCESSED_SPECIES'
          }
        });
      }

      // Add processing details
      if (exportData.consignmentDescription) {
        notes.push({
          Content: {
            languageID: 'en',
            value: exportData.consignmentDescription
          },
          SubjectCode: {
            value: 'PROCESSING_TYPE'
          }
        });
      }

      return {
        SequenceNumeric: {
          format: sequenceNumeric.toString(),
          value: sequenceNumeric
        },
        Description: {
          languageID: 'en',
          languageLocaleID: 'en',
          value: ctch.productDescription || ''
        },
        NetWeightMeasure: {
          unitCode: 'KGM',
          unitCodeListVersionID: ctch.exportWeightBeforeProcessing?.toString() ?? '',
          value: ctch.exportWeightBeforeProcessing ?? ''
        },
        GrossWeightMeasure: {
          unitCode: 'KGM',
          unitCodeListVersionID: ctch.exportWeightAfterProcessing?.toString() ?? '',
          value: ctch.exportWeightAfterProcessing?.toString()
        },
        AdditionalInformationSPSNote: notes,
        ApplicableSPSClassification: getApplicationSPSClassification(ctch.productCommodityCode)
      };
    })
  }
}
