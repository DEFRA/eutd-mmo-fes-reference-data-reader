import logger from '../logger';

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
            SPSExchangedDocument: this.buildExchangedDocument(documentNumber, createdAt),
            SPSConsignment: this.buildConsignment(
              exportData,
              exportData.exporterDetails,
              {
                plantName: exportData.plantName,
                plantApprovalNumber: exportData.plantApprovalNumber,
                plantAddressOne: exportData.plantAddressOne,
                plantTownCity: exportData.plantTownCity,
                plantPostcode: exportData.plantPostcode
              },
              exportData.exportedTo
            )
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

  private static buildExchangedDocument(documentNumber: string, createdAt: Date): any {
    return {
      Name: {
        languageID: 'en',
        value: 'Processing Statement'
      },
      Description: {
        value: ''
      },
      ID: {
        value: documentNumber
      },
      TypeCode: {
        listID: 'document_type',
        listAgencyID: 'EU_IUU_CATCH_CERT',
        listVersionID: '1.0',
        name: 'PROCESSING_STATEMENT',
        listURI: 'urn:un:unece:uncefact:codelist:standard:6:0205',
        value: '17'
      },
      StatusCode: {
        listID: 'status',
        listAgencyID: 'EU_IUU_CATCH_CERT',
        listVersionID: '1.0',
        name: 'FINAL',
        listURI: 'urn:un:unece:uncefact:codelist:standard:UNECE:DocumentStatusCode',
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
      ReferenceSPSReferencedDocument: [
        {
          TypeCode: {
            value: '916'
          },
          RelationshipTypeCode: {
            value: 'DM'
          }
        },
        {
          TypeCode: {
            name: 'HEALTH_CERTIFICATE',
            value: '856'
          },
          RelationshipTypeCode: {
            value: 'REF'
          },
          IssueDateTime: {
            value: createdAt.toISOString()
          },
          ID: {
            schemeAgencyID: 'GB',
            value: ''
          }
        },
        {
          TypeCode: {
            value: '916'
          },
          RelationshipTypeCode: {
            value: 'ALE'
          },
          ID: {
            value: 'Regulation No 1005/2008 ARTICLE 12 ANNEX II'
          }
        }
      ],
      SignatorySPSAuthentication: [
        {
          TypeCode: {
            value: '1'
          },
          ActualDateTime: {
            DateTime: {
              value: createdAt.toISOString()
            }
          },
          ProviderSPSParty: {
            Name: {
              value: ''
            },
            RoleCode: {
              value: 'PQ'
            },
            SpecifiedSPSPerson: {
              Name: {
                value: ''
              }
            }
          },
          IncludedSPSClause: {
            Content: {
              value: ''
            }
          }
        },
        {
          TypeCode: {
            value: '2'
          },
          ActualDateTime: {
            DateTime: {
              value: createdAt.toISOString()
            }
          },
          ProviderSPSParty: {
            Name: {
              languageID: 'en',
              value: 'Marine Management Organization'
            },
            RoleCode: {
              value: 'CA'
            },
            SpecifiedSPSPerson: {
              Name: {
                languageID: 'en',
                value: ''
              },
              AttainedSPSQualification: {
                Name: {
                  value: ''
                }
              }
            }
          }
        }
      ]
    };
  }

  private static buildConsignment(
    exportPayload: any,
    exporter: any,
    plant: any,
    exportedTo: any
  ): any {
    return {
      ConsignorSPSParty: this.buildConsignorParty(plant),
      ConsigneeSPSParty: this.buildConsigneeParty(exporter),
      ExportSPSCountry: this.buildExportCountry(),
      LoadingBaseportSPSLocation: this.buildLoadingLocation(),
      ImportSPSCountry: this.buildImportCountry(exportedTo),
      UnloadingBaseportSPSLocation: this.buildUnloadingLocation(exportedTo),
      ExaminationSPSEvent: {
        OccurrenceSPSLocation: {
          Name: {
            value: ''
          }
        }
      },
      IncludedSPSConsignmentItem: this.buildConsignmentItem(exportPayload)
    };
  }

  private static buildConsignorParty(plant: any): any {
    return {
      ID: {
        value: plant?.plantApprovalNumber || ''
      },
      Name: {
        languageID: 'en',
        value: plant?.plantName || ''
      },
      RoleCode: {
        value: 'CZ'
      },
      SpecifiedSPSAddress: {
        LineOne: {
          languageID: 'en',
          value: plant?.plantAddressOne || ''
        },
        CityName: {
          languageID: 'en',
          value: plant?.plantTownCity || ''
        },
        PostcodeCode: {
          languageID: 'en',
          value: plant?.plantPostcode || ''
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

  private static buildConsigneeParty(exporter: any): any {
    return {
      ID: {
        value: exporter?.exporterCompanyName || ''
      },
      Name: {
        languageID: 'en',
        value: exporter?.exporterCompanyName || ''
      },
      RoleCode: {
        value: 'CN'
      },
      SpecifiedSPSAddress: {
        LineOne: {
          languageID: 'en',
          value: exporter?.addressOne || ''
        },
        CityName: {
          languageID: 'en',
          value: exporter?.townCity || ''
        },
        PostcodeCode: {
          languageID: 'en',
          value: exporter?.postcode || ''
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
        schemeID: 'controlled_location_id',
        value: 'GB01'
      },
      Name: {
        languageID: 'en',
        languageLocaleID: 'en-nz',
        value: 'GB'
      }
    };
  }

  private static buildImportCountry(exportedTo: any): any {
    const importCountry = exportedTo?.isoCodeAlpha2 || 'FR';
    const countryName = exportedTo?.officialCountryName || 'FRANCE';

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

  private static buildUnloadingLocation(exportedTo: any): any {
    const importCountry = exportedTo?.isoCodeAlpha2 || 'FR';

    return {
      ID: {
        schemeID: 'controlled_location_id',
        value: `${importCountry}01`
      },
      Name: {
        languageID: 'en',
        languageLocaleID: 'en-nz',
        value: importCountry
      }
    };
  }

  private static buildConsignmentItem(exportPayload: any): any {
    // Get first product for basic information
    const products = exportPayload?.products || [];
    const firstProduct = products[0];

    // Calculate total weight from catches
    let totalWeight = 0;
    const catches = exportPayload?.catches || [];
    catches.forEach((catchItem: any) => {
      if (catchItem?.exportWeightAfterProcessing) {
        totalWeight += parseFloat(catchItem.exportWeightAfterProcessing);
      }
    });

    // Build additional information notes
    const notes: any[] = [];

    // Add catch certificate references
    catches.forEach((catchItem: any) => {
      if (catchItem?.catchCertificateNumber) {
        notes.push({
          Content: {
            languageID: 'en',
            value: catchItem.catchCertificateNumber
          },
          SubjectCode: {
            value: 'CATCH_CERTIFICATE_REFERENCE'
          }
        });
      }
    });

    // Add processing details
    if (exportPayload?.consignmentDescription) {
      notes.push({
        Content: {
          languageID: 'en',
          value: exportPayload.consignmentDescription
        },
        SubjectCode: {
          value: 'PROCESSING_TYPE'
        }
      });
    }

    return {
      IncludedSPSTradeLineItem: {
        SequenceNumeric: {
          format: '1',
          value: 1
        },
        Description: {
          languageID: 'en',
          languageLocaleID: 'en',
          value: firstProduct?.description || ''
        },
        NetWeightMeasure: {
          unitCode: 'KGM',
          unitCodeListVersionID: 'urn:un:unece:uncefact:codelist:standard:6:UNECE',
          value: totalWeight.toString()
        },
        GrossWeightMeasure: {
          unitCode: 'KGM',
          unitCodeListVersionID: 'urn:un:unece:uncefact:codelist:standard:6:UNECE',
          value: totalWeight.toString()
        },
        AdditionalInformationSPSNote: notes,
        ApplicableSPSClassification: {
          SystemID: {
            value: 'CN'
          },
          SystemName: {
            languageID: 'en',
            languageLocaleID: 'en',
            value: 'CN Code'
          },
          ClassCode: {
            value: firstProduct?.commodityCode || ''
          },
          ClassName: {
            languageID: 'en',
            languageLocaleID: 'en',
            value: firstProduct?.description || ''
          }
        }
      }
    };
  }
}
