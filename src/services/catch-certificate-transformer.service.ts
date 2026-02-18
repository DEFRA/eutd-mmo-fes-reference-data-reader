import { ICountry } from 'mmo-shared-reference-data';
import { getCountries, getGearTypes, getRfmos } from '../data/cache';
import logger from '../logger';
import { GearRecord } from '../interfaces/gearTypes.interface';
import { eufaoAreas } from '../data/faoAreas';
import { createMainCarriageSPSTransportMovement, exportedFromMapping, getCountryISO2 } from '../data/euCatch';
import { equalsIgnoreCase } from '../utils/string';

const formatDate = (dateString: string | Date) => {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Transforms catch certificate data into UN/CEFACT CATCH API JSON schema format
 */
export default class CatchCertificateTransformerService {
  public static generateCatchPayload(
    documentNumber: string,
    createdAt: Date,
    exportData: any
  ): any {
    logger.info(`[CATCH-TRANSFORMER][GENERATING-PAYLOAD][${documentNumber}]`);

    try {
      const payload = {
        CreateCatchCertificateRequest: {
          SPSCertificate: {
            SPSExchangedDocument: this.buildExchangedDocument(documentNumber, createdAt, exportData),
            SPSConsignment: this.buildConsignment(exportData)
          }
        }
      };

      logger.info(`[CATCH-TRANSFORMER][PAYLOAD-GENERATED][${documentNumber}]`);
      return payload;
    } catch (error) {
      logger.error(`[CATCH-TRANSFORMER][ERROR][${documentNumber}][${error.message}]`);
      throw error;
    }
  }

  private static buildExchangedDocument(documentNumber: string, createdAt: Date, exportData: any): any {
    const transportDocumentReferences = this.buildTransportDocumentReferences(exportData.transportations);

    return {
      Name: {
        languageID: 'en',
        value: 'Catch Certificate'
      },
      Description: {
        value: ''
      },
      ID: {
        schemeAgencyID: 'agency',
        value: ''
      },
      TypeCode: {
        name: 'CATCH_CERTIFICATE',
        value: '852'
      },
      StatusCode: {
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
          },
          ID: {
            value: documentNumber
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
            value: 'Regulation (EU) 2023/2842'
          }
        },
        ...transportDocumentReferences
      ],
      SignatorySPSAuthentication: {
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
            },
            AttainedSPSQualification: {
              Name: {
                value: ''
              }
            }
          }
        },
        IncludedSPSClause: {
          Content: {
            value: ''
          }
        }
      },
      IncludedSPSNote: [
        {
          Content: {
            value: 'true'
          },
          SubjectCode: {
            value: 'TRANSPORT_DETAILS_EXPORTER_SIGNATURE_PRESENT'
          }
        },
        {
          Content: {
            value: formatDate(new Date())
          },
          SubjectCode: {
            value: 'EXPORTER_SIGNATURE_DATE'
          }
        }
      ]
    };
  }

  private static buildTransportDocumentReferences(transportations: any[]): any[] {
    if (!transportations || !Array.isArray(transportations)) {
      return [];
    }

    const references: any[] = [];

    for (const transport of transportations) {
      if (!transport.transportDocuments || !Array.isArray(transport.transportDocuments)) {
        continue;
      }

      const vehicle = transport.vehicle;
      let typeCodeValue: string;
      let typeCodeName: string;
      let informationValue: string;

      // Determine TypeCode based on vehicle type
      switch (vehicle) {
        case 'containerVessel':
          typeCodeValue = '710';
          typeCodeName = 'Sea waybill (International transport document for Ship)';
          informationValue = transport.vesselName || '';
          break;
        case 'train':
          typeCodeValue = '720';
          typeCodeName = 'Rail consignment note (International transport document for Rail)';
          informationValue = transport.railwayBillNumber || '';
          break;
        case 'truck':
          typeCodeValue = '730';
          typeCodeName = 'Road consignment note (International transport document for Road Vehicle)';
          informationValue = transport.registrationNumber || '';
          break;
        case 'plane':
          typeCodeValue = '740';
          typeCodeName = 'Air waybill (International transport document for Airplane)';
          informationValue = transport.flightNumber || '';
          break;
        default:
          continue; // Skip if vehicle type is not recognized
      }

      // Create a reference object for each transport document
      for (const doc of transport.transportDocuments) {
        references.push({
          TypeCode: {
            name: typeCodeName,
            value: typeCodeValue
          },
          RelationshipTypeCode: {
            name: 'Bill of lading number (International transport document)',
            value: 'BM'
          },
          ID: {
            schemeID: 'BEFORE_BCP',
            value: doc.reference || ''
          },
          Information: {
            value: informationValue
          }
        });
      }
    }

    return references;
  }

  private static buildConsignment(exportData: any): any {
    return {
      ConsignorSPSParty: this.buildConsignorParty(exportData.exporterDetails),
      ConsigneeSPSParty: {
        Name: {
          value: ''
        },
        RoleCode: {
          value: 'CN'
        }
      },
      ExportSPSCountry: {
        ID: {
          schemeAgencyID: 'agency',
          value: exportedFromMapping[exportData.exportedFrom] ?? 'GB'
        },
        Name: {
          languageID: 'en',
          languageLocaleID: 'en-nz',
          value: exportData.exportedFrom
        }
      },
      LoadingBaseportSPSLocation: this.buildLoadingLocation(exportData),
      ImportSPSCountry: this.buildImportCountry(exportData.exportedTo),
      UnloadingBaseportSPSLocation: this.buildUnloadingLocation(exportData.exportedTo, exportData.pointOfDestination),
      ExaminationSPSEvent: {
        OccurrenceSPSLocation: {
          Name: {
            value: ''
          }
        }
      },
      MainCarriageSPSTransportMovement: this.buildTransportMovement(exportData.transportations),
      UtilizedSPSTransportEquipment: this.buildTransportEquipment(exportData.transportations),
      IncludedSPSConsignmentItem: this.buildConsignmentItems(exportData)
    };
  }

  private static buildConsignorParty(exporter: any): any {
    const countries: ICountry[] = getCountries();
    const countryID: ICountry | undefined = countries.find((country: ICountry) => country.officialCountryName.includes(exporter?.country));
    return {
      ID: {
        value: ''
      },
      Name: {
        languageID: 'en',
        value: exporter?.exporterCompanyName || ''
      },
      RoleCode: {
        name: 'Consignor (Exporter)',
        value: 'CZ'
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
        CountryID: {
          value: countryID?.isoCodeAlpha2 || 'GB'
        },
        CountryName: {
          languageID: 'en',
          value: exporter?.country
        }
      }
    };
  }

  private static buildLoadingLocation(exportData: any): any {
    const pointsOfDeparture = exportData.transportations
      ? [...new Set(
          exportData.transportations
            .map((t: any) => t.departurePlace)
            .filter((place: string) => place)
        )].join(', ')
      : '';

    return {
      ID: {
        schemeID: 'controlled_location_id',
        value: 'GB'
      },
      Name: {
        languageID: 'en',
        languageLocaleID: 'en-nz',
        value: pointsOfDeparture
      }
    };
  }

  private static buildImportCountry(country: ICountry): any {
    return {
      ID: {
        value: country?.isoCodeAlpha2 ?? ''
      },
      Name: {
        languageID: 'en',
        value: country?.officialCountryName ?? ''
      }
    };
  }

  private static buildUnloadingLocation(exportedTo: ICountry, pointOfDestination: string): any {
    return {
      ID: {
        schemeID: 'controlled_location_id',
        value: exportedTo.isoCodeAlpha2
      },
      Name: {
        languageID: 'en',
        languageLocaleID: 'en-nz',
        value: pointOfDestination
      }
    };
  }

  private static buildTransportMovement(transportations: any[]): any {
    return transportations?.map(createMainCarriageSPSTransportMovement);
  }

  private static buildTransportEquipment(transportations: any[]): any {
    return transportations?.reduce((utilizedSPSTransportEquipments: any, transport: any) => {
      // Handle containerNumbers (comma-separated string from multiple containers)
      if (transport.containerIdentificationNumber) {
        const containerArray = transport.containerIdentificationNumber.split(' ').map((cn: string) => cn.trim()).filter((cn: string) => cn.length > 0);
        const containerNumbers = containerArray.map((containerNumber: string) => ({
          ID: {
            schemeID: 'container_number',
            value: containerNumber
          }
        }));
        return [...utilizedSPSTransportEquipments, ...containerNumbers];
      }

      // Fallback to single containerNumber for backwards compatibility
      if (transport.containerNumber) {
        const containerNumberArray = transport.containerNumber.split(' ').map((cn: string) => cn.trim()).filter((cn: string) => cn.length > 0);
        return [...utilizedSPSTransportEquipments, ...containerNumberArray.map((containerNumber: string) => ({
          ID: {
            schemeID: 'container_number',
            value: containerNumber
          }
        }))];
      }

      return utilizedSPSTransportEquipments;
    }, []);
  }

  private static buildConsignmentItems(exportData: any): any[] {
    const consignmentItems: any[] = [];
    let vesselSequenceNumber = 1;

    // Get unique vessels from all products' caughtBy arrays and assign sequence numbers
    const uniqueVessels = new Map();
    const vesselSequenceMap = new Map();

    exportData.products?.forEach((product: any) => {
      product.caughtBy?.forEach((catchItem: any) => {
        if (!uniqueVessels.has(catchItem.cfr)) {
          uniqueVessels.set(catchItem.cfr, catchItem);
          vesselSequenceMap.set(catchItem.cfr, vesselSequenceNumber++);
        }
      });
    });

    // Collect all vessel trade line items (TypeCode "5")
    const vesselTradeLineItems: any[] = [];
    uniqueVessels.forEach((vessel: any) => {
      vesselTradeLineItems.push({
        SequenceNumeric: {
          format: vesselSequenceMap.get(vessel.cfr).toString(),
          value: vesselSequenceMap.get(vessel.cfr)
        },
        Description: {
          languageID: 'en',
          languageLocaleID: 'en',
          value: 'en'
        },
        AdditionalInformationSPSNote: this.buildTypeCode5AdditionalInformationSPSNote(vessel, exportData.conservation?.conservationReference)
      });
    });

    // Create single consignment item for all vessels (TypeCode "5")
    if (vesselTradeLineItems.length > 0) {
      consignmentItems.push({
        NatureIdentificationSPSCargo: {
          TypeCode: {
            value: '5'
          }
        },
        IncludedSPSTradeLineItem: vesselTradeLineItems
      });
    }

    let productSequenceNumber = 0;

    // Collect all product trade line items (TypeCode "12")
    const productTradeLineItems: any[] = [];
    exportData.products?.forEach((product: any) => {
      product.caughtBy?.forEach((catchItem: any) => {
        productSequenceNumber++;
        productTradeLineItems.push({
          SequenceNumeric: {
            format: Number(productSequenceNumber).toString(),
            value: productSequenceNumber
          },
          Description: {
            languageID: 'en',
            value: product.commodityCodeDescription || ''
          },
          CommonName: {
            value: product.scientificName || ''
          },
          NetWeightMeasure: {
            unitCode: 'KGM',
            value: catchItem.weight?.toString() || '0'
          },
          AdditionalInformationSPSNote: this.buildTypeCode12AdditionalInformationSPSNote(catchItem),
          ApplicableSPSClassification: {
            SystemID: {
              value: 'CN'
            },
            SystemName: {
              languageID: 'en',
              value: 'CN Code'
            },
            ClassCode: {
              value: product.commodityCode ? product.commodityCode.substring(0, 6) : ''
            },
            ClassName: {
              languageID: 'en',
              value: product.commodityCodeDescription || ''
            }
          }
        });
      });
    });

    // Create single consignment item for all products (TypeCode "12")
    if (productTradeLineItems.length > 0) {
      consignmentItems.push({
        NatureIdentificationSPSCargo: {
          TypeCode: {
            value: '12'
          }
        },
        IncludedSPSTradeLineItem: productTradeLineItems
      });
    }

    return consignmentItems;
  }

  private static buildTypeCode5AdditionalInformationSPSNote(vessel: any, conservationReference?: any): any[] {
    const additionalInformationSPSNote = [];

    if (conservationReference) {
      additionalInformationSPSNote.push({
        Content: {
          value: conservationReference
        },
        SubjectCode: {
          value: 'CONSERVATION_AND_MANAGEMENT_MEASURES'
        }
      })
    }

    if (vessel.vessel) {
      additionalInformationSPSNote.push({
        Content: {
          languageID: 'en',
          value: vessel.vessel
        },
        SubjectCode: {
          value: 'VESSEL_NAME'
        }
      })
    }

    if (vessel.flag) {
      additionalInformationSPSNote.push({
        Content: {
          value: getCountryISO2(vessel.flag)
        },
        SubjectCode: {
          value: 'VESSEL_FLAG'
        }
      })
    }

    if (vessel.cfr) {
      additionalInformationSPSNote.push({
        Content: {
          value: vessel.cfr
        },
        SubjectCode: {
          value: 'VESSEL_REGISTRATION'
        }
      })
    }

    if (vessel.ircs) {
      additionalInformationSPSNote.push({
        Content: {
          value: vessel.ircs
        },
        SubjectCode: {
          value: 'CALL_SIGN'
        }
      })
    }

    if (vessel.homePort) {
      additionalInformationSPSNote.push({
        Content: {
          value: vessel.homePort
        },
        SubjectCode: {
          value: 'HOME_PORT'
        }
      })
    }

    if (vessel.gearCode) {
      const gearTypes: GearRecord[] = getGearTypes();
      additionalInformationSPSNote.push({
        Content: {
          value: gearTypes.find((gearType: GearRecord) => gearType['Gear code'] === vessel.gearCode)?.['ISSCFG code'] || '99.9'
        },
        SubjectCode: {
          value: 'FISHING_GEAR'
        }
      })
    }

    if (vessel.licenceNumber) {
      additionalInformationSPSNote.push({
        Content: {
          value: vessel.licenceNumber
        },
        SubjectCode: {
          value: 'FISHING_LICENSE'
        }
      })
    }

    if (vessel.licenceValidTo) {
      additionalInformationSPSNote.push({
        Content: {
          value: formatDate(new Date(vessel.licenceValidTo))
        },
        SubjectCode: {
          value: 'FISHING_LICENSE_END_DATE'
        }
      })
    }

    additionalInformationSPSNote.push({
      Content: {
        value: ''
      },
      SubjectCode: {
        value: 'PHONE'
      }
    })

    if (vessel.licenceHolder) {
      additionalInformationSPSNote.push({
        Content: {
          value: vessel.licenceHolder
        },
        SubjectCode: {
          value: 'MASTER_OF_VESSEL'
        }
      })
    }

    if (vessel.imoNumber) {
      additionalInformationSPSNote.push({
        Content: {
          value: vessel.imoNumber
        },
        SubjectCode: {
          value: 'IMO'
        }
      })
    }

    return additionalInformationSPSNote;
  }

  private static buildTypeCode12AdditionalInformationSPSNote(catchItem: any): any[] {
    const additionalInformationSPSNote = [];

    if (catchItem.weight) {
      additionalInformationSPSNote.push({
        Content: {
          value: catchItem.weight?.toString() || '0'
        },
        SubjectCode: {
          value: 'NET_WEIGHT'
        }
      })
    }

    if (catchItem.cfr) {
      additionalInformationSPSNote.push({
        Content: {
          languageID: 'en',
          value: catchItem.cfr
        },
        SubjectCode: {
          value: 'VESSEL_REGISTRATION'
        }
      })
    }

    // Get all EEZ or use empty array
    const eezCode = catchItem.exclusiveEconomicZones?.map((exclusiveEconomicZone: ICountry) => ({
      Content: {
        languageID: 'en',
        value: exclusiveEconomicZone.isoCodeAlpha2 || ''
      },
      SubjectCode: {
        value: 'EXCLUSIVE_ECONOMIC_ZONE'
      }
    })) || [];

    if (eezCode.length > 0) {
      additionalInformationSPSNote.push(...eezCode);
    }

    if (catchItem.licenceHolder) {
      additionalInformationSPSNote.push({
        Content: {
          languageID: 'en',
          value: catchItem.licenceHolder
        },
        SubjectCode: {
          value: 'MASTER_OF_VESSEL'
        }
      })
    }

    if (catchItem.startDate) {
      additionalInformationSPSNote.push({
        Content: {
          languageID: 'en',
          value: formatDate(catchItem.startDate)
        },
        SubjectCode: {
          value: 'START_DATE'
        }
      })
    }

    if (catchItem.date) {
      additionalInformationSPSNote.push({
        Content: {
          languageID: 'en',
          value: formatDate(catchItem.date)
        },
        SubjectCode: {
          value: 'END_DATE'
        }
      })
    }

    if (catchItem.faoArea) {
      additionalInformationSPSNote.push({
        Content: {
          languageID: 'en',
          value: eufaoAreas[catchItem.faoArea]
        },
        SubjectCode: {
          value: 'CATCH_AREA'
        }
      })
    }

    if (catchItem.highSeasArea === 'Yes') {
      additionalInformationSPSNote.push({
        Content: {
          languageID: 'en',
          value: eufaoAreas[catchItem.faoArea]
        },
        SubjectCode: {
          value: 'HIGH_SEAS_CATCH_AREA'
        }
      })
    }

    if (catchItem.rfmo) {
      const abbreviation = getRfmos()?.find(r => equalsIgnoreCase(catchItem.rfmo, r['Full text']))?.Abbreviation;
      additionalInformationSPSNote.push({
        Content: {
          languageID: 'en',
          value: abbreviation
        },
        SubjectCode: {
          value: 'REGIONAL_FISHERIES_MANAGEMENT_ORGANISATION'
        }
      })
    }

    return additionalInformationSPSNote;
  }

}
