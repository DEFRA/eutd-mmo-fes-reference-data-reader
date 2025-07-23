import * as Hapi from '@hapi/hapi';
import * as CatchCertService from '../../src/landings/persistence/catchCert';
import * as VesselService from '../../src/handler/vesselService';
import { isLegallyDueRoute } from '../../src/handler/isLegallyDue';
import logger from '../../src/logger';
import * as Cache from "../../src/data/cache";

describe('POST /isLegallyDue', () => {
  let server;
  let mockLogInfo;
  let mockLogError;
  let mockUpsertCertificate;
  let mockGetCertificateByDocumentNumber;
  let mockVesselLookup;
  let mockGetVesselDetails;
  let mockRefreshRiskingData;

  const vesselDetails = { vesselLength :  33.89, cfr : 'GBR000B14974', adminPort : 'KIRKWALL' };
  const mockDocumentNumber = 'mockDoc-123';
  const caughtBy = {
    "numberOfSubmissions":0,
    "vessel":"AALSKERE",
    "pln":"K373",
    "homePort":"KIRKWALL",
    "flag":"GBR",
    "cfr":"GBR000B14974",
    "imoNumber":"9163178",
    "licenceNumber":"40815",
    "licenceValidTo":"2027-12-31T00:00:00",
    "licenceHolder":"Noah Body ",
    "id":"GBR-2023-CC-DC72A6E55-2509840834",
    "date":"2023-08-08",
    "faoArea":"FAO27",
    "weight":123,
    "highSeasArea": "yes",
    "rfmo": "General Fisheries Commission for the Mediterranean (GFCM)"
  };
  const products = [{
    "species":"Atlantic cod (COD)",
    "speciesId":"GBR-2023-CC-DC72A6E55-d5c8bdd5-1c29-4f03-b546-d4223fe9efe1",
    "speciesCode":"COD",
    "commodityCode":"03044410",
    "commodityCodeDescription":"Fresh or chilled fillets of cod \"Gadus morhua, Gadus ogac, Gadus macrocephalus\" and of Boreogadus saida",
    "scientificName":"Gadus morhua",
    "state":{
      "code":"FRE",
      "name":"Fresh"
    },
    "presentation":{
      "code":"FIL",
      "name":"Filleted"
    },
    "caughtBy": [caughtBy]
  }];

  const exportData = {
    "landingsEntryOption":"directLanding",
    "transportation": {
      "vehicle":"directLanding",
      "exportedFrom":"United Kingdom",
      "exportedTo": {
        "officialCountryName":"United Kingdom of Great Britain and Northern Ireland",
        "isoCodeAlpha2":"GB",
        "isoCodeAlpha3":"GBR",
        "isoNumericCode":"826"
      }
    },
    "exporterDetails": {
      "contactId":"4704bf69-18f9-ec11-bb3d-000d3a2f806d",
      "accountId":"8504bf69-18f9-ec11-bb3d-000d3a2f806d",
      "exporterFullName":"Automation Tester",
      "exporterCompanyName": "Automation Testing Ltd",
      "addressOne":"NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
      "buildingNumber": null,
      "subBuildingName": "NATURAL ENGLAND",
      "buildingName":"LANCASTER HOUSE",
      "streetName":"HAMPSHIRE COURT",
      "county":null,
      "country":"United Kingdom of Great Britain and Northern Ireland",
      "townCity":"NEWCASTLE UPON TYNE",
      "postcode":"NE4 7YH",
      "_dynamicsAddress":{
        "defra_uprn":"10091818796",
        "defra_buildingname":"LANCASTER HOUSE",
        "defra_subbuildingname":"NATURAL ENGLAND",
        "defra_premises":null,
        "defra_street":"HAMPSHIRE COURT",
        "defra_locality":"NEWCASTLE BUSINESS PARK",
        "defra_dependentlocality":null,
        "defra_towntext":"NEWCASTLE UPON TYNE",
        "defra_county":null,
        "defra_postcode":"AB1 2CD",
        "_defra_country_value":"f49cf73a-fa9c-e811-a950-000d3a3a2566",
        "defra_internationalpostalcode":null,
        "defra_fromcompanieshouse":false,
        "defra_addressid":"a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
        "_defra_country_value_OData_Community_Display_V1_FormattedValue":"United Kingdom of Great Britain and Northern Ireland",
        "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty":"defra_Country",
        "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname":"defra_country",
        "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue":"No"
      },"_dynamicsUser":{
        "firstName":"Automation",
        "lastName":"Tester"
      }
    },
    "products": products,
    "conservation":{
      "conservationReference":"UK Fisheries Policy"
    }
  }

  beforeAll(async () => {
    server = Hapi.server({
      port: 9021,
      host: 'localhost'
    });

    isLegallyDueRoute(server);

    await server.initialize();
    await server.start();
  });

  beforeEach(() => {
    mockLogInfo = jest.spyOn(logger, 'info');
    mockLogError = jest.spyOn(logger, 'error');

    mockVesselLookup = jest.spyOn(VesselService,'getRssNumber');
    mockVesselLookup.mockReturnValue('B14974');
    mockGetVesselDetails = jest.spyOn(VesselService, 'getVesselDetails');
    mockGetVesselDetails.mockReturnValue(vesselDetails);
    mockUpsertCertificate = jest.spyOn(CatchCertService, 'upsertCertificate');
    mockUpsertCertificate.mockResolvedValue(null);
    mockGetCertificateByDocumentNumber = jest.spyOn(CatchCertService, 'getCertificateByDocumentNumber');
    mockRefreshRiskingData = jest.spyOn(Cache, 'refreshRiskingData');
    mockGetCertificateByDocumentNumber.mockResolvedValue({
      documentNumber: mockDocumentNumber,
      exportData
    });
  })

  afterEach(() => {
    mockLogInfo.mockRestore();
    mockLogError.mockRestore();
    mockUpsertCertificate.mockRestore();
    mockGetCertificateByDocumentNumber.mockRestore();
    mockVesselLookup.mockRestore();
    mockGetVesselDetails.mockRestore();
    mockRefreshRiskingData.mockRestore();
  })

  afterAll(async () => {
    await server.stop();
  });

  it('will update isLegallyDue on exportData', async () => {
    mockRefreshRiskingData.mockResolvedValue(null);
    const response = await server.inject({
      method: 'POST',
      url: '/v1/isLegallyDue',
      payload: {
        documentNumber: mockDocumentNumber
      }
    });

    const expectedExportData = {
      "landingsEntryOption":"directLanding",
      "transportation": {
        "vehicle":"directLanding",
        "exportedFrom":"United Kingdom",
        "exportedTo": {
          "officialCountryName":"United Kingdom of Great Britain and Northern Ireland",
          "isoCodeAlpha2":"GB",
          "isoCodeAlpha3":"GBR",
          "isoNumericCode":"826"
        }
      },
      "exporterDetails": {
        "contactId":"4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId":"8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "exporterFullName":"Automation Tester",
        "exporterCompanyName": "Automation Testing Ltd",
        "addressOne":"NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
        "buildingNumber": null,
        "subBuildingName": "NATURAL ENGLAND",
        "buildingName":"LANCASTER HOUSE",
        "streetName":"HAMPSHIRE COURT",
        "county":null,
        "country":"United Kingdom of Great Britain and Northern Ireland",
        "townCity":"NEWCASTLE UPON TYNE",
        "postcode":"NE4 7YH",
        "_dynamicsAddress":{
          "defra_uprn":"10091818796",
          "defra_buildingname":"LANCASTER HOUSE",
          "defra_subbuildingname":"NATURAL ENGLAND",
          "defra_premises":null,
          "defra_street":"HAMPSHIRE COURT",
          "defra_locality":"NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality":null,
          "defra_towntext":"NEWCASTLE UPON TYNE",
          "defra_county":null,
          "defra_postcode":"AB1 2CD",
          "_defra_country_value":"f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode":null,
          "defra_fromcompanieshouse":false,
          "defra_addressid":"a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue":"United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty":"defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname":"defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue":"No"
        },"_dynamicsUser":{
          "firstName":"Automation",
          "lastName":"Tester"
        }
      },
      "products":[{
        "species":"Atlantic cod (COD)",
        "speciesId":"GBR-2023-CC-DC72A6E55-d5c8bdd5-1c29-4f03-b546-d4223fe9efe1",
        "speciesCode":"COD",
        "commodityCode":"03044410",
        "commodityCodeDescription":"Fresh or chilled fillets of cod \"Gadus morhua, Gadus ogac, Gadus macrocephalus\" and of Boreogadus saida",
        "scientificName":"Gadus morhua",
        "state":{
          "code":"FRE",
          "name":"Fresh"
        },
        "presentation":{
          "code":"FIL",
          "name":"Filleted"
        },
        "caughtBy":[{
          ...caughtBy,
          "isLegallyDue": true,
          "riskScore": 0,
          "threshold": 0,
          "speciesRiskScore": 0,
          "vesselRiskScore": 0,
          "exporterRiskScore": 0,
          "isSpeciesRiskEnabled": false
        }]
      }],
      "conservation":{
        "conservationReference":"UK Fisheries Policy"
      }
    }

    expect(mockGetCertificateByDocumentNumber).toHaveBeenCalled();
    expect(mockLogInfo).toHaveBeenCalledWith(`[RUN-UPDATE-FOR-LEGALLY-DUE][UPSERT][${mockDocumentNumber}]`);
    expect(mockUpsertCertificate).toHaveBeenCalledWith(mockDocumentNumber, { exportData: expectedExportData });
    expect(response.statusCode).toBe(200);
  });

  it('will handle exportData without products', async () => {
    mockGetCertificateByDocumentNumber.mockResolvedValue({
      documentNumber: mockDocumentNumber,
      exportData: {
        ...exportData,
        products: []
      }
    });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/isLegallyDue',
      payload: {
        documentNumber: mockDocumentNumber
      }
    });

    expect(mockLogInfo).toHaveBeenCalledWith(`[RUN-UPDATE-FOR-LEGALLY-DUE][${mockDocumentNumber}]`);
    expect(response.statusCode).toBe(404);
  });

  it('will handle undefined products', async () => {
    mockGetCertificateByDocumentNumber.mockResolvedValue({
      documentNumber: mockDocumentNumber,
      exportData: {
        ...exportData,
        products: undefined
      }
    });
    mockRefreshRiskingData.mockResolvedValue(null);
    const response = await server.inject({
      method: 'POST',
      url: '/v1/isLegallyDue',
      payload: {
        documentNumber: mockDocumentNumber
      }
    });

    expect(mockLogInfo).toHaveBeenCalledWith(`[RUN-UPDATE-FOR-LEGALLY-DUE][${mockDocumentNumber}]`);
    expect(response.statusCode).toBe(404);
  });

  it('will handle refreshRiskingData error', async () => {
    
    const error = new Error('riskingMockError');
    mockRefreshRiskingData.mockRejectedValue(error);
   
    const response = await server.inject({
      method: 'POST',
      url: '/v1/isLegallyDue',
      payload: {
        documentNumber: mockDocumentNumber
      }
    });

    expect(mockGetCertificateByDocumentNumber).toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(mockLogError).toHaveBeenCalledWith(`[RUN-UPDATE-FOR-LEGALLY-DUE][ERROR][${error}]`);
  });
  
  it('will handle undefined vessel details', async () => {
    mockVesselLookup.mockReturnValue(undefined);
    mockGetVesselDetails.mockReturnValue(undefined);
    mockRefreshRiskingData.mockResolvedValue(null);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/isLegallyDue',
      payload: {
        documentNumber: mockDocumentNumber
      }
    });

    const expectedExportData = {
      "landingsEntryOption":"directLanding",
      "transportation": {
        "vehicle":"directLanding",
        "exportedFrom":"United Kingdom",
        "exportedTo": {
          "officialCountryName":"United Kingdom of Great Britain and Northern Ireland",
          "isoCodeAlpha2":"GB",
          "isoCodeAlpha3":"GBR",
          "isoNumericCode":"826"
        }
      },
      "exporterDetails": {
        "contactId":"4704bf69-18f9-ec11-bb3d-000d3a2f806d",
        "accountId":"8504bf69-18f9-ec11-bb3d-000d3a2f806d",
        "exporterFullName":"Automation Tester",
        "exporterCompanyName": "Automation Testing Ltd",
        "addressOne":"NATURAL ENGLAND, LANCASTER HOUSE, HAMPSHIRE COURT",
        "buildingNumber": null,
        "subBuildingName": "NATURAL ENGLAND",
        "buildingName":"LANCASTER HOUSE",
        "streetName":"HAMPSHIRE COURT",
        "county":null,
        "country":"United Kingdom of Great Britain and Northern Ireland",
        "townCity":"NEWCASTLE UPON TYNE",
        "postcode":"NE4 7YH",
        "_dynamicsAddress":{
          "defra_uprn":"10091818796",
          "defra_buildingname":"LANCASTER HOUSE",
          "defra_subbuildingname":"NATURAL ENGLAND",
          "defra_premises":null,
          "defra_street":"HAMPSHIRE COURT",
          "defra_locality":"NEWCASTLE BUSINESS PARK",
          "defra_dependentlocality":null,
          "defra_towntext":"NEWCASTLE UPON TYNE",
          "defra_county":null,
          "defra_postcode":"AB1 2CD",
          "_defra_country_value":"f49cf73a-fa9c-e811-a950-000d3a3a2566",
          "defra_internationalpostalcode":null,
          "defra_fromcompanieshouse":false,
          "defra_addressid":"a6bb5e78-18f9-ec11-bb3d-000d3a449c8e",
          "_defra_country_value_OData_Community_Display_V1_FormattedValue":"United Kingdom of Great Britain and Northern Ireland",
          "_defra_country_value_Microsoft_Dynamics_CRM_associatednavigationproperty":"defra_Country",
          "_defra_country_value_Microsoft_Dynamics_CRM_lookuplogicalname":"defra_country",
          "defra_fromcompanieshouse_OData_Community_Display_V1_FormattedValue":"No"
        },"_dynamicsUser":{
          "firstName":"Automation",
          "lastName":"Tester"
        }
      },
      "products":[{
        "species":"Atlantic cod (COD)",
        "speciesId":"GBR-2023-CC-DC72A6E55-d5c8bdd5-1c29-4f03-b546-d4223fe9efe1",
        "speciesCode":"COD",
        "commodityCode":"03044410",
        "commodityCodeDescription":"Fresh or chilled fillets of cod \"Gadus morhua, Gadus ogac, Gadus macrocephalus\" and of Boreogadus saida",
        "scientificName":"Gadus morhua",
        "state":{
          "code":"FRE",
          "name":"Fresh"
        },
        "presentation":{
          "code":"FIL",
          "name":"Filleted"
        },
        "caughtBy":[{
          ...caughtBy,
          "isLegallyDue": false,
          "riskScore": 0,
          "threshold": 0,
          "speciesRiskScore": 0,
          "vesselRiskScore": 0,
          "exporterRiskScore": 0,
          "isSpeciesRiskEnabled": false,
        }]
      }],
      "conservation":{
        "conservationReference":"UK Fisheries Policy"
      }
    }

    expect(mockLogInfo).toHaveBeenCalledWith(`[RUN-UPDATE-FOR-LEGALLY-DUE][${mockDocumentNumber}]`);
    expect(mockUpsertCertificate).toHaveBeenCalledWith(mockDocumentNumber, { exportData: expectedExportData });
    expect(response.statusCode).toBe(200);
  });

  it('will handle missing documentNumber from payload', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/isLegallyDue',
      payload: {}
    });

    expect(mockLogError).toHaveBeenCalledWith(`[RUN-UPDATE-FOR-LEGALLY-DUE][NO DOCUMENT NUMBER]`);
    expect(response.statusCode).toBe(400);
  });

  it('will handle wrong data type documentNumber in payload', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/isLegallyDue',
      payload: {
        documentNumber: 123
      }
    });

    expect(mockLogError).toHaveBeenCalledWith(`[RUN-UPDATE-FOR-LEGALLY-DUE][NO DOCUMENT NUMBER]`);
    expect(response.statusCode).toBe(400);
  });

  it('will handle certificates having missing exportData', async () => {
    mockGetCertificateByDocumentNumber.mockResolvedValue({
      documentNumber: mockDocumentNumber,
      exportData: undefined
    });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/isLegallyDue',
      payload: {
        documentNumber: mockDocumentNumber
      }
    });

    expect(mockLogInfo).toHaveBeenCalledWith(`[RUN-UPDATE-FOR-LEGALLY-DUE][${mockDocumentNumber}][NO-PRODUCTS-FOUND]`);
    expect(response.statusCode).toBe(404);
  });

  it('will handle errors getting certificate by document number', async () => {
    const errorMessage = Error('Async error message');
    mockGetCertificateByDocumentNumber.mockRejectedValue(errorMessage);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/isLegallyDue',
      payload: {
        documentNumber: mockDocumentNumber
      }
    });

    expect(mockLogError).toHaveBeenCalledWith({"err": errorMessage}, "[RUN-UPDATE-FOR-LEGALLY-DUE][ERROR] Error: Async error message");
    expect(response.statusCode).toBe(500);
  });

  it('will handle products missing caughtBy (type errors)', async () => {
    mockGetCertificateByDocumentNumber.mockResolvedValue({
      documentNumber: mockDocumentNumber,
      exportData: {
        products: [{}]
      }
    })
    mockRefreshRiskingData.mockResolvedValue(null);
    
    const response = await server.inject({
      method: 'POST',
      url: '/v1/isLegallyDue',
      payload: {
        documentNumber: mockDocumentNumber
      }
    });

    const expectedExportData = {
      products: [{}]
    }

    expect(mockGetCertificateByDocumentNumber).toHaveBeenCalled();
    expect(mockLogInfo).toHaveBeenCalledWith(`[RUN-UPDATE-FOR-LEGALLY-DUE][UPSERT][${mockDocumentNumber}]`);
    expect(mockUpsertCertificate).toHaveBeenCalledWith(mockDocumentNumber, { exportData: expectedExportData });
    expect(response.statusCode).toBe(200);
  });

  it('will handle exporterDetails missing data', async () => {
    mockGetCertificateByDocumentNumber.mockResolvedValue({
      documentNumber: mockDocumentNumber,
      exportData: {
        ...exportData,
        exporterDetails: undefined
      }
    })

    mockRefreshRiskingData.mockResolvedValue(null);
    
    const response = await server.inject({
      method: 'POST',
      url: '/v1/isLegallyDue',
      payload: {
        documentNumber: mockDocumentNumber
      }
    });

    expect(mockGetCertificateByDocumentNumber).toHaveBeenCalled();
    expect(mockLogInfo).toHaveBeenCalledWith(`[RUN-UPDATE-FOR-LEGALLY-DUE][UPSERT][${mockDocumentNumber}]`);
    expect(response.statusCode).toBe(200);
  });
});