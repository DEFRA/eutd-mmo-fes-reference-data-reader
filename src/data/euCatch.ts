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
  'containerVessel': '1'
};

export const modeName = {
  'truck': 'Road transport',
  'train': 'Rail transport',
  'plane': 'Air transport',
  'containerVessel': 'Maritime transport'
};

export const schemeID = {
  'truck': 'road_vehicle_registration_before_bcp',
  'train': 'train_identifier_before_bcp',
  'plane': 'airplane_flight_number_before_bcp',
  'containerVessel': 'ship_imo_number_before_bcp'
};

export const schemeName = {
  'truck': 'Road vehicle registration (before BCP)',
  'train': 'Rail Identifier (before BCP)',
  'plane': 'Flight number (before BCP)',
  'containerVessel': 'Ship IMO Number (before BCP)'
}

const TRANSPORT_VEHICLE_TRUCK = 'truck';
const TRANSPORT_VEHICLE_TRAIN = 'train';
const TRANSPORT_VEHICLE_PLANE = 'plane';
export const TRANSPORT_VEHICLE_CONTAINER_VESSEL = 'containerVessel';

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

  return null;
}

export const getSchemeAgencyName: (transport: any) => string = (transport: any) => (transport?.vehicle === TRANSPORT_VEHICLE_TRUCK) ? transport.nationalityOfVehicle : null;

export const createMainCarriageSPSTransportMovement = (transport: any) => {
  const vehicle = transport?.vehicle;
  const schemeAgencyID = getSchemeAgencyID(transport);
  const schemeAgencyName = getSchemeAgencyName(transport);

  const commonTransportInformation = {
    ID: {
      schemeID: schemeID[vehicle],
      schemeName: schemeName[vehicle],
      schemeAgencyID: schemeAgencyID ? schemeAgencyID : undefined,
      schemeAgencyName: schemeAgencyName ? schemeAgencyName : undefined,
      value: getTransportId(transport)
    },
    ModeCode: {
      name: modeName[vehicle],
      value: modeMap[vehicle]
    }
  };

  return (transport?.vehicle === TRANSPORT_VEHICLE_CONTAINER_VESSEL) ? {
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

export const getApplicationSPSClassification = (commoditityCode: string | undefined) => ({
  SystemID: {
    value: 'CN'
  },
  SystemName: {
    languageID: 'en',
    languageLocaleID: 'en',
    value: 'CN Code'
  },
  ClassCode: {
    value: commoditityCode ? commoditityCode.substring(0, 6) : ''
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