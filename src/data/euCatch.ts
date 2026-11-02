import { ICountry } from "mmo-shared-reference-data";
import axios from 'axios';
import querystring from 'node:querystring';
import { getCountries } from "./cache";
import { getCommodities } from "../controllers/species";
import appConfig from '../config';
import logger from '../logger';

type IDynamics365OAuthResponse = {
  access_token: string;
  expires_in: number;
};

type IEuCatchCrmResponse = {
  status?: string;
  euCatchOperatorId?: string;
};

type IAxiosErrorLike = {
  isAxiosError?: boolean;
  code?: string;
  response?: {
    status?: number;
  };
};

const isHttpsUrl = (value: string): boolean => {
  if (appConfig.inDev) {
    return true;
  }

  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const getSanitisedErrorMetadata = (error: unknown): { category: string; code: string; status: string } => {
  const axiosError = error as IAxiosErrorLike;
  const status = axiosError?.response?.status;

  if (axiosError?.isAxiosError || axiosError?.code || status) {
    return {
      category: 'HTTP',
      code: axiosError?.code || 'UNKNOWN',
      status: typeof status === 'number' ? `${status}` : 'N/A'
    };
  }

  return {
    category: 'GENERAL',
    code: 'N/A',
    status: 'N/A'
  };
};

const isCrmOperatorActivityEnabled = (): boolean => appConfig.enableCrmOperatorActivityId !== false;

const getEuCatchOAuthToken = async (): Promise<string> => {
  if (!isHttpsUrl(appConfig.dynamics365CrmOauthTokenUrl)) {
    logger.warn('[EU-CATCH-CRM][TOKEN][INVALID-CONFIG][OAUTH-TOKEN-URL-NON-HTTPS]');
    throw new Error('EU_CATCH_TOKEN_URL_MUST_BE_HTTPS');
  }

  const tokenRequest = {
    client_id: appConfig.dynamics365CrmOauthClientId,
    client_secret: appConfig.dynamics365CrmOauthClientSecret,
    scope: appConfig.dynamics365CrmOauthScope,
    grant_type: 'client_credentials'
  };

  const tokenResponse = await axios.post<IDynamics365OAuthResponse>(
    appConfig.dynamics365CrmOauthTokenUrl,
    querystring.stringify(tokenRequest),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: appConfig.dynamics365CrmTimeoutMs
    }
  );

  const accessToken = tokenResponse?.data?.access_token?.trim();

  if (!accessToken) {
    logger.warn('[EU-CATCH-CRM][TOKEN][INVALID-RESPONSE][MISSING-ACCESS-TOKEN]');
    throw new Error('EU_CATCH_MISSING_ACCESS_TOKEN');
  }

  return accessToken;
};

export const getEuCatchOperatorId = async (accountId: string): Promise<string> => {
  logger.info('[EU-CATCH-CRM][GET-OPERATOR-ID][STARTED]');

  try {
    if (!isCrmOperatorActivityEnabled()) {
      logger.info('[EU-CATCH-CRM][GET-OPERATOR-ID][DISABLED-BY-FLAG]');
      return '';
    }

    if (!isHttpsUrl(appConfig.dynamics365CrmUrl)) {
      logger.warn('[EU-CATCH-CRM][GET-OPERATOR-ID][INVALID-CONFIG][CRM-URL-NON-HTTPS]');
      return '';
    }

    const accessToken = await getEuCatchOAuthToken();
    const response = await axios.get<IEuCatchCrmResponse>(appConfig.dynamics365CrmUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      params: {
        'api-version': appConfig.dynamics365CrmApiVersion,
        accountId
      },
      timeout: appConfig.dynamics365CrmTimeoutMs,
      validateStatus: () => true
    });

    if (response?.status !== 200) {
      logger.warn(`[EU-CATCH-CRM][GET-OPERATOR-ID][NON-200][STATUS][${response?.status}]`);
      return '';
    }

    const responseStatus = response?.data?.status;
    const operatorId = response?.data?.euCatchOperatorId;

    if (responseStatus === 'Succeeded' && operatorId) {
      logger.info('[EU-CATCH-CRM][GET-OPERATOR-ID][SUCCESS]');
      return operatorId;
    }

    if (responseStatus === 'Failed') {
      logger.warn('[EU-CATCH-CRM][GET-OPERATOR-ID][FAILED-STATUS]');
      return '';
    }

    logger.warn('[EU-CATCH-CRM][GET-OPERATOR-ID][EMPTY-OPERATOR-ID]');
    return '';
  } catch (error) {
    const errorMetadata = getSanitisedErrorMetadata(error);
    logger.warn(
      `[EU-CATCH-CRM][GET-OPERATOR-ID][ERROR][CATEGORY][${errorMetadata.category}][CODE][${errorMetadata.code}][STATUS][${errorMetadata.status}]`
    );
    return '';
  }
}

export const updateEuCatchOperatorId = async (accountId: string, euCatchOperatorId: string): Promise<boolean> => {
  try {

    if (!isCrmOperatorActivityEnabled()) {
      logger.info('[EU-CATCH-CRM][UPDATE-OPERATOR][DISABLED-BY-FLAG]');
      return false;
    }

    if (!isHttpsUrl(appConfig.dynamics365CrmSendUrl)) {
      logger.warn('[EU-CATCH-CRM][UPDATE-OPERATOR][INVALID-CONFIG][CRM-SEND-URL-NON-HTTPS]');
      return false;
    }

    logger.info('[EU-CATCH-CRM][UPDATE-OPERATOR][STARTED]');

    const accessToken = await getEuCatchOAuthToken();
    const response = await axios.post<IEuCatchCrmResponse>(
      appConfig.dynamics365CrmSendUrl,
      {
        accountId,
        euCatchOperatorId
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          'api-version': appConfig.dynamics365CrmApiVersion,
        },
        timeout: appConfig.dynamics365CrmTimeoutMs,
        validateStatus: () => true
      }
    );

    if (response.status === 200 && response?.data?.status === 'Updated') {
      return true;
    }

    if (response.status === 500 && response?.data?.status === 'Failed') {
      logger.warn('[EU-CATCH-CRM][UPDATE-OPERATOR][FAILED-STATUS]');
      return false;
    }

    if (response.status !== 200) {
      logger.warn(`[EU-CATCH-CRM][UPDATE-OPERATOR][NON-200][STATUS][${response.status}]`);
      return false;
    }

    logger.warn('[EU-CATCH-CRM][UPDATE-OPERATOR][MALFORMED-200-PAYLOAD]');
    return false;
  } catch (error) {
    const errorMetadata = getSanitisedErrorMetadata(error);
    logger.warn(
      `[EU-CATCH-CRM][UPDATE-OPERATOR][ERROR][CATEGORY][${errorMetadata.category}][CODE][${errorMetadata.code}][STATUS][${errorMetadata.status}]`
    );
    return false;
  }
};

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
    case TRANSPORT_VEHICLE_DIRECT_LANDING: {
      return transport.imoNumber?.toString() ?? '';
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

  if (transport?.vehicle === TRANSPORT_VEHICLE_DIRECT_LANDING) {
    return countryISOMapping[transport.flag];
  }
}

export const getSchemeAgencyName: (transport: any) => string = (transport: any) => {
  if (transport?.vehicle === TRANSPORT_VEHICLE_TRUCK) return transport.nationalityOfVehicle;
  if (transport?.vehicle === TRANSPORT_VEHICLE_DIRECT_LANDING) return countryFlagNameMapping[transport.flag];
  return undefined;
};

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
const countryISOMapping: { [key: string]: string } = {
  GBR: "GB",
  GGY: "GB",
  IMN: "GB",
  JEY: "GB",
}

const countryFlagNameMapping: { [key: string]: string } = {
  GBR: "United Kingdom of Great Britain and Northern Ireland (the)",
  GGY: "United Kingdom of Great Britain and Northern Ireland (the)",
  IMN: "United Kingdom of Great Britain and Northern Ireland (the)",
  JEY: "United Kingdom of Great Britain and Northern Ireland (the)",
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