import { ICountry } from "mmo-shared-reference-data";
import { getCountries } from "./cache";
import { getCommodities } from "../controllers/species";

export const IssuerSPSParty = {
  Name: {
    languageID: 'en',
    value: 'Marine Management Organization'
  },
  RoleCode: {
    value: 'VJ'
  }
}

export const getSignatorySPSAuthentication = (createdAt: Date) => ([
  {
    TypeCode: {
      value: '5'
    },
    ActualDateTime: {
      DateTime: {
        value: createdAt.toISOString()
      }
    },
    ProviderSPSParty: {
      Name: {
        value: 'Official Inspector'
      },
      RoleCode: {
        value: 'VJ'
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
      value: '1'
    },
    ActualDateTime: {
      DateTime: {
        value: createdAt.toISOString()
      }
    },
    ProviderSPSParty: {
      Name: {
        languageID: 'en',
        value: ''
      },
      RoleCode: {
        value: 'VJ'
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
]);

export const modeMap = {
  'truck': '3',
  'train': '2',
  'plane': '4',
  'containerVessel': '1',
  'directLanding': '1'
};

export const modeName = {
  'truck': 'Road transport',
  'train': 'Rail transport',
  'plane': 'Air transport',
  'containerVessel': 'Maritime transport',
  'directLanding': 'Maritime transport'
};

export const schemeID = {
  'truck': 'road_vehicle_registration_before_bcp',
  'train': 'train_identifier_before_bcp',
  'plane': 'airplane_flight_number_before_bcp',
  'containerVessel': 'ship_imo_number_before_bcp',
  'directLanding': 'ship_imo_number_before_bcp'
};

export const schemeName = {
  'truck': 'Road vehicle registration (before BCP)',
  'train': 'Rail Identifier (before BCP)',
  'plane': 'Flight number (before BCP)',
  'containerVessel': 'Ship IMO Number (before BCP)',
  'directLanding': 'Ship IMO Number (before BCP)'
}

const TRANSPORT_VEHICLE_TRUCK = 'truck';
const TRANSPORT_VEHICLE_TRAIN = 'train';
const TRANSPORT_VEHICLE_PLANE = 'plane';
export const TRANSPORT_VEHICLE_CONTAINER_VESSEL = 'containerVessel';
export const TRANSPORT_VEHICLE_DIRECT_LANDING = 'directLanding';

export const getTransportId: (transport: any) => string = (transport: any) => {
  switch (transport?.vehicle) {
    case TRANSPORT_VEHICLE_TRUCK: {
      return transport.registrationNumber;
    }
    case TRANSPORT_VEHICLE_TRAIN: {
      return transport.railwayBillNumber;
    }
    case TRANSPORT_VEHICLE_PLANE: {
      return transport.flightNumber;
    }
    default: {
      return ''
    }
  }
}

export const getSchemeAgencyID: (transport: any) => string = (transport: any) => {
  if (transport?.vehicle === TRANSPORT_VEHICLE_TRUCK) {
    const countries: ICountry[] = getCountries();
    const countryID: ICountry | undefined = countries.find((country: ICountry) => country.officialCountryName.includes(transport.nationalityOfVehicle));
    return countryID?.isoCodeAlpha2 ?? 'GB';
  }
}

export const getSchemeAgencyName: (transport: any) => string = (transport: any) => (transport?.vehicle === TRANSPORT_VEHICLE_TRUCK) ? transport.nationalityOfVehicle : undefined;

export const createMainCarriageSPSTransportMovement = (transport: any) => {
  const vehicle = transport?.vehicle;
  const schemeAgencyID = getSchemeAgencyID(transport);
  const schemeAgencyName = getSchemeAgencyName(transport);

  const commonTransportInformation = {
    ID: {
      schemeID: schemeID[vehicle],
      schemeName: schemeName[vehicle],
      schemeAgencyID: schemeAgencyID,
      schemeAgencyName: schemeAgencyName,
      value: getTransportId(transport)
    },
    ModeCode: {
      name: modeName[vehicle],
      value: modeMap[vehicle]
    }
  };

  return (transport?.vehicle === TRANSPORT_VEHICLE_CONTAINER_VESSEL || transport?.vehicle === TRANSPORT_VEHICLE_DIRECT_LANDING) ? {
    ...commonTransportInformation,
    UsedSPSTransportMeans: {
      Name: {
        languageID: 'en',
        languageLocaleID: 'en-nz',
        value: transport.vesselName
      }
    }
  } : commonTransportInformation
}

export const buildTransportDocumentReferences = (transportations: any[]): any[] => {
  if (!transportations || !Array.isArray(transportations)) {
    return [];
  }

  const references: any[] = [];

  for (const transport of transportations) {
    if (!Array.isArray(transport?.transportDocuments)) {
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

export const buildSupportingDocumentReferences = (catches: any[]): any[] => {
  if (!catches || !Array.isArray(catches)) {
    return [];
  }

  const references: any[] = [];

  for (const catchItem of catches) {
    if (!Array.isArray(catchItem?.supportingDocuments)) {
      continue;
    }

    for (const doc of catchItem.supportingDocuments) {
      if (!doc) {
        continue;
      }

      references.push({
        TypeCode: {
          value: '916'
        },
        RelationshipTypeCode: {
          name: 'Mutually defined reference number (Supporting document)',
          value: 'ZZZ'
        },
        ID: {
          schemeID: 'GB',
          value: doc
        }
      });
    }
  }

  return references;
}

export const createUtilizedSPSTransportEquipments = (utilizedSPSTransportEquipments: any, transport: any, delimiter: any = ' ') => {
  // Handle containerNumbers (comma-separated string from multiple containers)
  if (transport?.containerIdentificationNumber) {
    const containerArray = transport.containerIdentificationNumber.split(delimiter).map((cn: string) => cn.trim()).filter((cn: string) => cn.length > 0);
    const containerNumbers = containerArray.map((containerNumber: string) => ({
      ID: {
        schemeID: 'container_number',
        value: containerNumber
      }
    }));
    return [...utilizedSPSTransportEquipments, ...containerNumbers];
  }

  // Fallback to single containerNumber for backwards compatibility
  if (transport?.containerNumber) {
    const containerNumberArray = transport.containerNumber.split(delimiter).map((cn: string) => cn.trim()).filter((cn: string) => cn.length > 0);
    return [...utilizedSPSTransportEquipments, ...containerNumberArray.map((containerNumber: string) => ({
      ID: {
        schemeID: 'container_number',
        value: containerNumber
      }
    }))];
  }

  // Fallback for containerNumbers for backwards compatibility with non-manipulation documents
  if (transport?.containerNumbers) {
    const containerNumberArray = transport.containerNumbers.split(delimiter).map((cn: string) => cn.trim()).filter((cn: string) => cn.length > 0);
    return [...utilizedSPSTransportEquipments, ...containerNumberArray.map((containerNumber: string) => ({
      ID: {
        schemeID: 'container_number',
        value: containerNumber
      }
    }))];
  }


  return utilizedSPSTransportEquipments;
}

export const getApplicationSPSClassification = (commoditityCode: string = '', truncate: boolean = true) => ({
  SystemID: {
    value: 'CN'
  },
  SystemName: {
    languageID: 'en',
    languageLocaleID: 'en',
    value: 'CN Code'
  },
  ClassCode: {
    value: truncate ? commoditityCode.substring(0, 6) : commoditityCode
  },
  ClassName: {
    languageID: 'en',
    languageLocaleID: 'en',
    value: getCommodities()?.find((commodity: {
      code: string;
      description: string;
    }) => commodity.code === commoditityCode)?.description ?? ''
  }
})

export const validateUKPSNumberFormat = (str: string) => {
  const regex = /^GBR-\d{4}-PS-[A-Z0-9]{9}$/;
  return regex.test(str);
}

export const validateUKSDNumberFormat = (str: string) => {
  const regex = /^GBR-\d{4}-SD-[A-Z0-9]{9}$/;
  return regex.test(str);
}

// Unique Flag Codes: from vessel file
// GBR - Great Britain (United Kingdom)
// GGY - Guernsey
// IMN - Isle of Man
// JEY - Jersey
const countryISOMapping = {
  GBR: "GB",
  GGY: "GB",
  IMN: "GB",
  JEY: "GB",
}

export function getCountryISO2(countryCode: string) {
  return countryISOMapping[countryCode]
}

export const exportedFromMapping = {
  ['United Kingdom']: 'GB',
  ['Guernsey']: 'GG',
  ['Isle Of Man']: 'IM',
  ['Jersey']: 'JE'
}