import * as SUT from '../../src/data/cache';
import * as ConversionFactorService from '../../src/landings/persistence/conversionFactors';
import * as RiskingService from '../../src/landings/persistence/risking';
import * as EoDService from '../../src/landings/persistence/eodSettings';
import { type IConversionFactor, BoomiService, type ICountry  } from 'mmo-shared-reference-data';
import { IExporterBehaviour } from '../../src/landings/types/appConfig/exporterBehaviour';
import { ISpeciesRiskToggle, IVesselOfInterest, IWeighting, WEIGHT } from '../../src/landings/types/appConfig/risking';
import * as blob from '../../src/data/blob-storage';
import * as file from '../../src/data/local-file';
import * as systemBlocks from '../../src/services/systemBlock.service';
import appConfig from '../../src/config'
import logger from '../../src/logger';
import { ILicence, IVessel } from '../../src/landings/types/appConfig/vessels';
import { IEodSetting } from '../../src/landings/types/appConfig/eodSettings';
import moment from 'moment';
import { mockGearTypesData, mockRfmosData } from '../mockData';

const allSpeciesData: any[] = [
  {
    faoCode: 'AAB',
    faoName: 'Twobar seabream',
    scientificName: 'Acanthopagrus bifasciatus'
  }
];

const speciesData: any[] = [{
  commodityCode: '03023190',
  commodityCodeDescr: `Fresh or chilled albacore or longfinned tunas 'Thunnus alalunga' (excl. for industrial processing or preservation)`,
  faoCode: 'ALB',
  faoName: 'Albacore',
  presentationDescr: 'gutted and headed',
  presentationState: 'GUH',
  preservationDescr: 'fresh',
  preservationState: 'FRE',
  scientificName: 'Thunnus alalunga'
}];

const vesselData: IVessel[] = [{
  'fishingVesselName': 'MARLENA',
  'ircs': null,
  'flag': 'GBR',
  'homePort': 'WESTRAY',
  'registrationNumber': 'K529',
  'imo': null,
  'fishingLicenceNumber': '30117',
  'fishingLicenceValidFrom': '2006-06-07T00:00:00',
  'fishingLicenceValidTo': '2006-06-30T00:00:00',
  'adminPort': 'STORNOWAY',
  'rssNumber': 'A12032',
  'vesselLength': 8.84,
  'cfr': 'GBRA12032',
  "licenceHolderName": "I am the Licence Holder name for this fishing boat"
},
{
  "fishingVesselName": "WIRON 5",
  "ircs": "2HGD8",
  "cfr": "NLD200202641",
  "flag": "GBR",
  "homePort": "PLYMOUTH",
  "registrationNumber": "H1100",
  "imo": 9249556,
  "fishingLicenceNumber": "12480",
  "fishingLicenceValidFrom": "2021-08-10T00:00:00",
  "fishingLicenceValidTo": "2030-12-31T00:00:00",
  "adminPort": "PLYMOUTH",
  "rssNumber": "C20514",
  "vesselLength": 50.63,
  "licenceHolderName": "INTERFISH WIRONS LIMITED"
},
{
  "fishingVesselName": "ATLANTA II",
  "ircs": "MJAU2",
  "cfr": "GBR000A21401",
  "flag": "GBR",
  "homePort": "MILFORD HAVEN",
  "registrationNumber": "M82",
  "imo": null,
  "fishingLicenceNumber": "11685",
  "fishingLicenceValidFrom": "2016-05-03T00:00:00",
  "fishingLicenceValidTo": "2030-12-31T00:00:00",
  "adminPort": "MILFORD HAVEN",
  "rssNumber": "A21401",
  "vesselLength": 11.75,
  "licenceHolderName": "MR  SIMON COLL"
}];

const vesselNotFoundData: IVessel[] = [{
  "adminPort": "N/A",
  "cfr": null,
  "fishingLicenceNumber": "27619",
  "fishingLicenceValidFrom": "2016-07-01T00:01:00",
  "fishingLicenceValidTo": "2300-12-31T00:01:00",
  "fishingVesselName": "Vessel not found",
  "flag": "GBR",
  "homePort": "N/A",
  "imo": null,
  "ircs": "",
  "registrationNumber": "N/A",
  "rssNumber": "N/A",
  "vesselLength": 0,
  "vesselNotFound": true,
  "licenceHolderName": "licenced holder not found"
}]

const seasonalFishData: any[] = [{
  fao: 'BSS',
  validFrom: '2014-02-01T00:00:00',
  validTo: '2014-03-31T23:59:59'
}];

const countriesData: any = [
  {
    "name": "Spain",
    "alpha-2": "ES",
    "alpha-3": "ESP",
    "country-code": "724",
    "iso_3166-2": "ISO 3166-2:ES",
    "region": "Europe",
    "sub-region": "Southern Europe",
    "intermediate-region": "",
    "region-code": "150",
    "sub-region-code": "039",
    "intermediate-region-code": ""
  },
  {
    "name": "Greece",
    "alpha-2": "GR",
    "alpha-3": "GRC",
    "country-code": "300",
    "iso_3166-2": "ISO 3166-2:GR",
    "region": "Europe",
    "sub-region": "Southern Europe",
    "intermediate-region": "",
    "region-code": "150",
    "sub-region-code": "039",
    "intermediate-region-code": ""
  },
  {
    "name": "United Kingdom of Great Britain and Northern Ireland",
    "alpha-2": "GB",
    "alpha-3": "GBR",
    "country-code": "826",
    "iso_3166-2": "ISO 3166-2:GB",
    "region": "Europe",
    "sub-region": "Northern Europe",
    "intermediate-region": "",
    "region-code": "150",
    "sub-region-code": "154",
    "intermediate-region-code": ""
  },
  {
    "name": "Brazil",
    "alpha-2": "BR",
    "alpha-3": "BRA",
    "country-code": "076",
    "iso_3166-2": "ISO 3166-2:BR",
    "region": "Americas",
    "sub-region": "Latin America and the Caribbean",
    "intermediate-region": "South America",
    "region-code": "019",
    "sub-region-code": "419",
    "intermediate-region-code": "005"
  },
  {
    "name": "Nigeria",
    "alpha-2": "NG",
    "alpha-3": "NGA",
    "country-code": "566",
    "iso_3166-2": "ISO 3166-2:NG",
    "region": "Africa",
    "sub-region": "Sub-Saharan Africa",
    "intermediate-region": "Western Africa",
    "region-code": "002",
    "sub-region-code": "202",
    "intermediate-region-code": "011"
  },
  {
    "name": "Ghana",
    "alpha-2": "GH",
    "alpha-3": "GHA",
    "country-code": "288",
    "iso_3166-2": "ISO 3166-2:GH",
    "region": "Africa",
    "sub-region": "Sub-Saharan Africa",
    "intermediate-region": "Western Africa",
    "region-code": "002",
    "sub-region-code": "202",
    "intermediate-region-code": "011"
  }
];

const speciesAliasesData: any = [
  {
    "speciesName": "Monkfish",
    "speciesCode": "MON",
    "speciesAlias": ["ANF"]
  },
  {
    "speciesName": "Anglerfish",
    "speciesCode": "ANF",
    "speciesAlias": ["MON"]
  },
  {
    "speciesName": "Megrim",
    "speciesCode": "MEG",
    "speciesAlias": ["LEZ"]
  },
  {
    "speciesName": "Megrim",
    "speciesCode": "LEZ",
    "speciesAlias": ["MEG"]
  },
  {
    "speciesName": "Cuttlefish",
    "speciesCode": "CTL",
    "speciesAlias": ["CTC"]
  },
  {
    "speciesName": "Squid",
    "speciesCode": "SQC",
    "speciesAlias": ["SQR", "SQZ", "SQI"]
  },
  {
    "speciesName": "Squid",
    "speciesCode": "SQR",
    "speciesAlias": ["SQC", "SQZ", "SQI"]
  },
];

const eodSettingsData: IEodSetting[] = [
  {
    da: "England",
    vesselSizes: ["12m+"],
    rules: [{
      ruleType: "expectedDate",
      vesselSize: "12m+",
      numberOfDays: 10
    }, {
      ruleType: "endDate",
      vesselSize: "12m+",
      numberOfDays: 10
    }]
  },
  {
    da: "Scotland",
    vesselSizes: ["12m+"],
    rules: [{
      ruleType: "endDate",
      vesselSize: "Under 10m",
      numberOfDays: 10
    }]
  },
  { da: "Wales", vesselSizes: ["10-12m"] },
  { da: "Guernsey", vesselSizes: ["Under 10m"] },
  { da: "Jersey", vesselSizes: ["Under 10m", "12m+"] },
  { da: "Northern Ireland", vesselSizes: ["Under 10m", "12m+"] }
];

const vesselsOfInterestData: IVesselOfInterest[] = [{
  registrationNumber: 'H1100', fishingVesselName: 'WIRON 5', homePort: 'PLYMOUTH', da: 'England'
}, {
  registrationNumber: 'NN732', fishingVesselName: 'CLAR INNIS', homePort: 'EASTBOURNE', da: 'England'
}, {
  registrationNumber: 'RX1', fishingVesselName: 'JOCALINDA', homePort: 'RYE', da: 'England'
}, {
  registrationNumber: 'SM161', fishingVesselName: 'JUST REWARD', homePort: 'WORTHING', da: 'England'
}];

const speciesToggleData: ISpeciesRiskToggle = { enabled: true };

const weightingRiskData: IWeighting = {
  exporterWeight: 1,
  vesselWeight: 1,
  speciesWeight: 1,
  threshold: 1
}

const commodityCodes: any[] = [{
  code: '01234567',
  description: 'some description'
}]

const gearTypesData: any[] = mockGearTypesData

const rfmosData: any[] = mockRfmosData;

describe('when in production mode', () => {
  let mockLoadAllSpecies;
  let mockLoadSpecies;
  let mockVesselsData;
  let mockaddVesselNotFound;
  let mockLoadSeasonalFishData;
  let mockLoadCountries;
  let mockLoadSpeciesAliases;
  let mockLoadConversionFactors;
  let mockSeedVesselsOfInterest;
  let mockSeedWeightingRisk;
  let mockGetAllVesselsOfInterest;
  let mockGetWeightingRisk;
  let mockGetSpeciesToggle;
  let mockGetAddresses;
  let mockGetCommodityCodes;
  let mockGetEodSettings;
  let mockLoadGearTypesData;
  let mockGetRfmosData;

  let mockLoggerInfo;
  let mockLoggerError;
  let mockLoggerDebug;

  beforeEach(() => {
    appConfig.inDev = false;
    appConfig.vesselNotFoundEnabled = true;
    appConfig.blobStorageConnection = 'blob-connection';

    mockLoadAllSpecies = jest.spyOn(SUT, 'loadAllSpecies');
    mockLoadSpecies = jest.spyOn(SUT, 'loadSpeciesData');
    mockVesselsData = jest.spyOn(SUT, 'loadVesselsData');
    mockaddVesselNotFound = jest.spyOn(SUT, 'addVesselNotFound')
    mockLoadSeasonalFishData = jest.spyOn(SUT, 'loadSeasonalFishData');
    mockLoadCountries = jest.spyOn(SUT, 'loadCountriesData');
    mockLoadSpeciesAliases = jest.spyOn(SUT, 'loadSpeciesAliases');
    mockLoadConversionFactors = jest.spyOn(SUT, 'loadConversionFactorsData');
    mockGetCommodityCodes = jest.spyOn(SUT, 'loadCommodityCodeData');
    mockSeedVesselsOfInterest = jest.spyOn(RiskingService, 'seedVesselsOfInterest');
    mockSeedWeightingRisk = jest.spyOn(RiskingService, 'seedWeightingRisk');
    mockGetAllVesselsOfInterest = jest.spyOn(RiskingService, 'getVesselsOfInterest');
    mockGetWeightingRisk = jest.spyOn(RiskingService, 'getWeightingRisk');
    mockGetSpeciesToggle = jest.spyOn(RiskingService, 'getSpeciesToggle');
    mockGetAddresses = jest.spyOn(BoomiService, 'getAddresses');
    mockGetEodSettings = jest.spyOn(EoDService, 'getEodSettings');
    mockLoadGearTypesData = jest.spyOn(SUT, 'loadGearTypesData');
    mockGetRfmosData = jest.spyOn(SUT, 'loadRfmosDataFromAzureBlob');

    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
    mockLoggerDebug = jest.spyOn(logger, 'debug');

    mockLoadAllSpecies.mockResolvedValue(allSpeciesData);
    mockVesselsData.mockResolvedValue(vesselData);
    mockLoadSpecies.mockResolvedValue(speciesData);
    mockLoadSeasonalFishData.mockResolvedValue(seasonalFishData);
    mockLoadCountries.mockResolvedValue(countriesData);
    mockLoadSpeciesAliases.mockResolvedValue(speciesAliasesData);
    mockLoadConversionFactors.mockResolvedValue([]);
    mockGetCommodityCodes.mockResolvedValue(commodityCodes);
    mockSeedVesselsOfInterest.mockResolvedValue(vesselsOfInterestData);
    mockGetEodSettings.mockResolvedValue(eodSettingsData);
    mockSeedWeightingRisk.mockResolvedValue(weightingRiskData);
    mockGetAllVesselsOfInterest.mockResolvedValue(vesselsOfInterestData);
    mockGetWeightingRisk.mockResolvedValue(weightingRiskData);
    mockGetSpeciesToggle.mockResolvedValue(speciesToggleData);
    mockGetAddresses.mockResolvedValue(null);
    mockLoadGearTypesData.mockResolvedValue(gearTypesData);
    mockGetRfmosData.mockResolvedValue(rfmosData);
  });

  afterEach(() => {
    mockLoadAllSpecies.mockRestore();
    mockVesselsData.mockRestore();
    mockLoadSpecies.mockRestore();
    mockLoadSeasonalFishData.mockRestore();
    mockLoadCountries.mockRestore();
    mockLoadSpeciesAliases.mockRestore();
    mockGetCommodityCodes.mockRestore();
    mockSeedVesselsOfInterest.mockRestore();
    mockSeedWeightingRisk.mockRestore();
    mockGetAllVesselsOfInterest.mockRestore();
    mockGetWeightingRisk.mockRestore();
    mockGetSpeciesToggle.mockRestore();
    mockGetEodSettings.mockRestore();
    mockLoadGearTypesData.mockRestore();
    mockGetRfmosData.mockRestore();
    
    mockLoggerInfo.mockRestore();
    mockLoggerError.mockRestore();
    mockLoggerDebug.mockRestore();
    SUT.updateCache({
      species: [],
      allSpecies: [],
      seasonalFish: [],
      countries: [],
      factors: [],
      speciesAliases: {},
      commodityCodes: [],
      gearTypes: [],
      rfmos: []
    });
    SUT.updateVesselsCache([]);
    SUT.updateVesselsOfInterestCache([]);
    SUT.updateWeightingCache({
      exporterWeight: 0,
      vesselWeight: 0,
      speciesWeight: 0,
      threshold: 0
    });
    SUT.updateSpeciesToggleCache({
      enabled: false
    });
    SUT.updateEodSettingsCache([]);
  });

  describe('loadProdFishCountriesAndSpecies ', () => {

    const originalEnableCountryData = appConfig.enableCountryData

    beforeEach(() => {
      appConfig.enableCountryData = originalEnableCountryData;
    });

    it('should call loadCountriesData when enableCountryData is set to true', async () => {
      appConfig.enableCountryData = true;

      await SUT.loadProdFishCountriesAndSpecies();

      expect(mockLoadCountries).toHaveBeenCalled();
    });

    it('should not call loadCountriesData when enableCountryData is set to false', async () => {
      appConfig.enableCountryData = false;

      await SUT.loadProdFishCountriesAndSpecies();

      expect(mockLoadCountries).not.toHaveBeenCalled();
    });

    it('should not call loadAllSpecies, loadSeasonalFishData  ', async () => {
      await SUT.loadProdFishCountriesAndSpecies();

      expect(mockLoggerInfo).toHaveBeenCalledWith('[LOAD-PROD-CONFIG] Loading data from blob storage in production mode');

      expect(mockLoadSpecies).toHaveBeenCalledWith('blob-connection');
      expect(mockLoadSeasonalFishData).toHaveBeenCalledWith('blob-connection');

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(2, '[LOAD-PROD-CONFIG] Finished reading data, previously species: 0, countries: 0, speciesAliases: 0, commodityCodes: 0');
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(3, '[LOAD-PROD-CONFIG] Finished loading data into cache, currently species: 1, seasonalFish: 1, countries: 0, speciesAliases: 7, commodityCodes: 1');
    });

    it('should call loadConversionFactors ', async () => {
      await SUT.loadProdFishCountriesAndSpecies();

      expect(mockLoadConversionFactors).toHaveBeenCalled();
    });

    it('should call getAllVesselsOfInterest', async () => {
      await SUT.loadProdFishCountriesAndSpecies();

      expect(mockGetAllVesselsOfInterest).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(4, '[LOAD-PROD-CONFIG] Finished reading vessels of interest, previously: 0');
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(5, '[LOAD-PROD-CONFIG] Finished loading vessels of interest, currently: 4');
    });

    it('should call get weighting risk data', async () => {
      await SUT.loadProdFishCountriesAndSpecies();

      expect(mockGetWeightingRisk).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(6, '[LOAD-PROD-CONFIG] Finished reading weighting risk, previously exporterWeight: 0, vesselWeight: 0, speciesWeight: 0, threshold: 0');
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(7, '[LOAD-PROD-CONFIG] Finished loading weighting, currently exporterWeight: 1, vesselWeight: 1, speciesWeight: 1, threshold: 1');
    });

    it('will initialise the cache for Species Toggle', async () => {
      await SUT.loadProdFishCountriesAndSpecies();

      expect(mockGetSpeciesToggle).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(8,'[LOAD-PROD-CONFIG] Finished reading the species toggle, previously: false');
    });

    it('will get the updated cache cache for Species Toggle', async () => {
      mockGetSpeciesToggle.mockResolvedValue(speciesToggleData);

      await SUT.loadProdFishCountriesAndSpecies();

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(9, '[LOAD-PROD-CONFIG] Finished loading the species toggle, currently: true');
    });

    it('should log when it is calling each function for data', async () => {
      const countryDataEnabled = true;

      appConfig.enableCountryData = countryDataEnabled;

      await SUT.loadProdFishCountriesAndSpecies();

      expect(mockLoggerDebug).toHaveBeenCalledWith('[LOAD-PROD-CONFIG] loadAllSpecies');
      expect(mockLoggerDebug).toHaveBeenCalledWith('[LOAD-PROD-CONFIG] loadSpeciesData');
      expect(mockLoggerDebug).toHaveBeenCalledWith('[LOAD-PROD-CONFIG] loadSeasonalFishData');
      expect(mockLoggerDebug).toHaveBeenCalledWith(`[LOAD-PROD-CONFIG] loadCountriesData ? ${countryDataEnabled}`);
      expect(mockLoggerDebug).toHaveBeenCalledWith('[LOAD-PROD-CONFIG] loadConversionFactorsData');
      expect(mockLoggerDebug).toHaveBeenCalledWith('[LOAD-PROD-CONFIG] getVesselsOfInterest');
      expect(mockLoggerDebug).toHaveBeenCalledWith('[LOAD-PROD-CONFIG] getWeightingRisk');
      expect(mockLoggerDebug).toHaveBeenCalledWith('[LOAD-PROD-CONFIG] getSpeciesToggle');
      expect(mockLoggerDebug).toHaveBeenCalledWith('[LOAD-PROD-CONFIG] loadSpeciesAliases');
      expect(mockLoggerDebug).toHaveBeenCalledWith('[LOAD-PROD-CONFIG] loadGearTypesData');
      expect(mockLoggerDebug).toHaveBeenCalledWith('[LOAD-PROD-CONFIG] loadRfmosData');
    });

    describe('getCountries', () => {

      it('should have a list of countries', async () => {
        const countryDataEnabled = true;

        appConfig.enableCountryData = countryDataEnabled;

        await SUT.loadProdFishCountriesAndSpecies();

        expect(SUT.getCountries()).toHaveLength(6);
      });

    })

    it('should log an error if thrown', async () => {

      mockLoadSpecies.mockImplementationOnce(() => {
        throw new Error('error')
      });

      await expect(() => SUT.loadProdFishCountriesAndSpecies()).rejects.toThrow();

      expect(mockLoggerError).toHaveBeenCalledWith('[ERROR][LOADING PROD MODE], Error: error');
    });

  });

  describe('loadFishCountriesAndSpecies', () => {

    it('should call loadProdFishCountriesAndSpecies', async () => {
      let mockloadProdFishCountriesAndSpecies;
      mockloadProdFishCountriesAndSpecies = jest.spyOn(SUT, 'loadProdFishCountriesAndSpecies');
      mockloadProdFishCountriesAndSpecies.mockResolvedValue({ some: 'data' });

      await SUT.loadFishCountriesAndSpecies();

      expect(mockloadProdFishCountriesAndSpecies).toHaveBeenCalled();

      mockloadProdFishCountriesAndSpecies.mockRestore();
    });

  });

  describe('loadVessels', () => {

    it('should call load vesssel data with addVesselNotFound', async () => {
      await SUT.loadVessels();
      expect(mockVesselsData).toHaveBeenCalled();
      expect(mockaddVesselNotFound).toHaveBeenCalled();
    });

  });

  describe('getSeasonalFish', () => {
    it('should have a list of seasonal fish', async () => {
      await SUT.loadProdFishCountriesAndSpecies();

      expect(SUT.getSeasonalFish()).toHaveLength(1);
    })
  });

  describe('getGearTypes', () => {
    it('should have a list of gear types data', async () => {
      await SUT.loadProdFishCountriesAndSpecies();
      expect(SUT.getGearTypes()).toHaveLength(54);
    });
  })

  describe('getRfmos', () => {
    it('should have a list of rfmos data', async () => {
      await SUT.loadProdFishCountriesAndSpecies();
      expect(SUT.getRfmos()).toHaveLength(20);
    });
  })

});

describe('when in development mode', () => {

  const enableCountryData = appConfig.enableCountryData;
  const enableVesselNotFound = appConfig.vesselNotFoundEnabled;

  let mockLoadAllSpecies;
  let mockLoadSpeciesDataFromLocalFile;
  let mockLoadVesselsDataFromLocalFile;
  let mockaddVesselNotFound;
  let mockLoadSeasonalFishData;
  let mockLoadCountries;
  let mockLoadSpeciesAliases;
  let mockLoggerInfo;
  let mockLoadConversionFactors;
  let mockSeedWeightingRisk;
  let mockSeedVesselsOfInterest;
  let mockGetSpeciesToggle;
  let mockSeedBlockingRules;
  let mockGetEodSettings;
  let mockLoadGearTypesData;
  let mockGetRfmosData;

  beforeEach(() => {
    appConfig.inDev = true;

    mockLoadAllSpecies = jest.spyOn(SUT, 'loadAllSpeciesFromLocalFile');
    mockLoadSpeciesDataFromLocalFile = jest.spyOn(SUT, 'loadSpeciesDataFromLocalFile');
    mockLoadVesselsDataFromLocalFile = jest.spyOn(SUT, 'loadVesselsDataFromLocalFile');
    mockaddVesselNotFound = jest.spyOn(SUT, 'addVesselNotFound')
    mockLoadSeasonalFishData = jest.spyOn(SUT, 'loadSeasonalFishDataFromLocalFile');
    mockLoadCountries = jest.spyOn(SUT, 'loadCountriesDataFromLocalFile');
    mockLoadSpeciesAliases = jest.spyOn(SUT, 'loadSpeciesAliasesFromLocalFile');
    mockLoadConversionFactors = jest.spyOn(ConversionFactorService, 'loadConversionFactorsFromLocalFile');
    mockSeedWeightingRisk = jest.spyOn(RiskingService, 'seedWeightingRisk')
    mockSeedVesselsOfInterest = jest.spyOn(RiskingService, 'seedVesselsOfInterest');
    mockGetEodSettings = jest.spyOn(EoDService, 'getEodSettings');
    mockGetSpeciesToggle = jest.spyOn(RiskingService, 'getSpeciesToggle');
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockSeedBlockingRules = jest.spyOn(systemBlocks, 'seedBlockingRules');
    mockLoadGearTypesData = jest.spyOn(SUT, 'loadGearTypesDataFromLocalFile');
    mockGetRfmosData = jest.spyOn(SUT, 'loadRfmosDataFromLocalFile');

    mockLoadAllSpecies.mockResolvedValue(allSpeciesData);
    mockLoadVesselsDataFromLocalFile.mockResolvedValue(vesselData);
    mockLoadSpeciesDataFromLocalFile.mockResolvedValue(speciesData);
    mockLoadSeasonalFishData.mockResolvedValue(seasonalFishData);
    mockLoadCountries.mockReturnValue(countriesData);
    mockLoadSpeciesAliases.mockReturnValue(speciesAliasesData);
    mockLoadConversionFactors.mockResolvedValue([]);
    mockSeedVesselsOfInterest.mockResolvedValue(vesselsOfInterestData);
    mockGetEodSettings.mockResolvedValue(eodSettingsData);
    mockSeedWeightingRisk.mockResolvedValue(weightingRiskData);
    mockGetSpeciesToggle.mockResolvedValue(speciesToggleData);
    mockSeedBlockingRules.mockResolvedValue(undefined);
    mockLoadGearTypesData.mockResolvedValue(gearTypesData);
    mockGetRfmosData.mockResolvedValue(rfmosData);
  });

  afterEach(() => {
    mockLoadAllSpecies.mockRestore();
    mockLoadVesselsDataFromLocalFile.mockRestore();
    mockLoadSpeciesDataFromLocalFile.mockRestore();
    mockLoadSeasonalFishData.mockRestore();
    mockLoadCountries.mockRestore();
    mockLoadSpeciesAliases.mockRestore();
    mockLoadConversionFactors.mockRestore();
    mockGetSpeciesToggle.mockRestore();
    mockSeedBlockingRules.mockRestore();
    mockLoggerInfo.mockRestore();
    mockGetEodSettings.mockRestore();
    mockLoadGearTypesData.mockRestore();
    mockGetRfmosData.mockRestore();

    appConfig.enableCountryData = enableCountryData;
    appConfig.vesselNotFoundEnabled = enableVesselNotFound;

    SUT.updateCache({
      species: [],
      allSpecies: [],
      seasonalFish: [],
      countries: [],
      factors: [],
      speciesAliases: {},
      commodityCodes: [],
      gearTypes: [],
      rfmos: []
    });
    SUT.updateVesselsOfInterestCache([]);
    SUT.updateSpeciesToggleCache({
      enabled: false
    });
    SUT.updateEodSettingsCache([])
  });

  describe('loadFishCountriesAndSpecies', () => {

    it('should call all data related methods', async () => {

      appConfig.enableCountryData = true;

      await SUT.loadFishCountriesAndSpecies();

      expect(mockLoadAllSpecies).toHaveBeenCalled();
      expect(mockLoadSpeciesDataFromLocalFile).toHaveBeenCalled();
      expect(mockLoadSeasonalFishData).toHaveBeenCalled();
      expect(mockLoadCountries).toHaveBeenCalled();
      expect(mockLoadSpeciesAliases).toHaveBeenCalled();
      expect(mockLoadConversionFactors).toHaveBeenCalled();
      expect(mockSeedWeightingRisk).toHaveBeenCalled();
      expect(mockSeedVesselsOfInterest).toHaveBeenCalled();
      expect(mockGetSpeciesToggle).toHaveBeenCalled();
      expect(mockLoadGearTypesData).toHaveBeenCalled();
      expect(mockGetRfmosData).toHaveBeenCalled();

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(2, 'Finished reading data from local file system, previously species: 0, seasonalFish: 0, countries: 0, factors: 0, speciesAliases: 0, commodityCodes: 0');
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(3, 'Finished loading data into cache from local file system, currently species: 1, seasonalFish: 1, countries: 6, factors: 0, speciesAliases: 7, commodityCodes: 1');
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(4, 'Start setting the blocking rules');
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(5, 'Finished saving the blocking rules');
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(6, 'Start setting the vessels of interest, previously vessels of interest: 0');
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(7, 'Finished saving vessels of interest, currently vessels of interest: 4');
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(8, 'Start setting the weighting risk, previously exporterWeight: 0, vesselWeight: 0, speciesWeight: 0, threshold: 0');
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(9, 'Finish setting the weighting risk, currently exporterWeight: 1, vesselWeight: 1, speciesWeight: 1, threshold: 1');
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(10, 'Start setting the species toggle, previously: false');
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(11, 'Finish setting the species toggle, currently: true');

    });

    it('should not call method to seed export countries', async () => {
      appConfig.enableCountryData = false;

      await SUT.loadFishCountriesAndSpecies();

      expect(mockLoadCountries.called).toBeFalsy();
    });

  });

  describe('loadVessels', () => {

    it('should call loadVesselsDataFromLocalFile', async () => {
      await SUT.loadVessels();

      expect(mockLoadVesselsDataFromLocalFile).toHaveBeenCalled();
      expect(mockaddVesselNotFound).toHaveBeenCalled();
    });

  });

  describe('getSpeciesAliases', () => {

    let mockSpeciesAliases: any = {
      ANF: ['MON'],
      CTL: ['CTC'],
      LEZ: ['MEG'],
      MEG: ['LEZ'],
      MON: ['ANF'],
      SQC: ['SQR', 'SQZ', 'SQI'],
      SQR: ['SQC', 'SQZ', 'SQI']
    };

    beforeEach(() => {
      SUT.updateCache({
        species: [],
        allSpecies: [],
        seasonalFish: [],
        countries: [],
        factors: [],
        speciesAliases: mockSpeciesAliases,
        commodityCodes: [],
        gearTypes: [],
        rfmos: []
      });
    });

    it('should return species aliases', () => {
      const speciesAliases = SUT.getSpeciesAliases('SQC');
      const expected = ['SQR', 'SQZ', 'SQI'];
      expect(speciesAliases).toEqual(expected);
    });

    it('should return an empty array if no species code passed in', () => {
      const speciesAliases = SUT.getSpeciesAliases('');
      expect(speciesAliases).toEqual([]);
    });

    it('should return empty array if there is no species aliases', () => {
      const speciesAliases = SUT.getSpeciesAliases('COD');
      expect(speciesAliases).toEqual([]);
    });
  });

  it('should call loadCountriesData', async () => {
    appConfig.enableCountryData = true;

    await SUT.loadLocalFishCountriesAndSpecies();
    expect(mockLoadAllSpecies).toHaveBeenCalled();

    expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, 'Loading data from local files in dev mode');
    expect(mockLoadSpeciesDataFromLocalFile).toHaveBeenCalled();
    expect(mockLoadSeasonalFishData).toHaveBeenCalled();
    expect(mockLoadGearTypesData).toHaveBeenCalled();
    expect(mockLoadCountries).toHaveBeenCalled();
    expect(mockGetRfmosData).toHaveBeenCalled();

    expect(mockLoggerInfo).toHaveBeenNthCalledWith(2, 'Finished reading data from local file system, previously species: 0, seasonalFish: 0, countries: 0, factors: 0, speciesAliases: 0, commodityCodes: 0');
    expect(mockLoggerInfo).toHaveBeenNthCalledWith(3, 'Finished loading data into cache from local file system, currently species: 1, seasonalFish: 1, countries: 6, factors: 0, speciesAliases: 7, commodityCodes: 1');
  });

});

describe('isQuotaSpecies', () => {

  beforeAll(() => {
    const conversionFactors: IConversionFactor[] = [
      {
        species: 'COD',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 1.2,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'HER',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 1.3,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'LBE',
        state: 'FRO',
        presentation: 'WHO',
        toLiveWeightFactor: 1,
        quotaStatus: 'nonquota',
        riskScore: 1
      },
      {
        species: 'HER',
        state: 'FRE',
        presentation: 'WHO',
        toLiveWeightFactor: 1,
        quotaStatus: 'quota',
        riskScore: 1
      }
    ];

    SUT.updateCache({
      species: [],
      allSpecies: [],
      seasonalFish: [],
      countries: [],
      factors: conversionFactors,
      speciesAliases: {},
      commodityCodes: [],
      gearTypes: [],
      rfmos: []
    });
  })

  it('returns true if quotaStatus equals quota', async () => {
    const isQuotaSpecies = SUT.isQuotaSpecies('COD');

    expect(isQuotaSpecies).toBe(true);
  });

  it('returns false if quotaStatus equals nonquota', async () => {
    const isQuotaSpecies = SUT.isQuotaSpecies('LBE');

    expect(isQuotaSpecies).toBe(false);
  });

  it('returns false if species data is undefined', async () => {
    const isQuotaSpecies = SUT.isQuotaSpecies('XXX');

    expect(isQuotaSpecies).toBe(false);
  });

  it('return true if quotaStates equals quota for the first species found', async () => {
    const isQuotaSpecies = SUT.isQuotaSpecies('HER');

    expect(isQuotaSpecies).toBe(true);
  });

});

describe('getSpeciesRiskScore', () => {

  beforeAll(() => {
    const conversionFactors: any[] = [
      {
        species: 'COD',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 1.2,
        quotaStatus: 'quota',
        riskScore: undefined
      },
      {
        species: 'HER',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 1.3,
        quotaStatus: 'quota',
        riskScore: '1'
      },
      {
        species: 'ALB',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 1.3,
        quotaStatus: 'quota',
        riskScore: 'hello'
      },
      {
        species: 'LBE',
        state: 'FRO',
        presentation: 'WHO',
        toLiveWeightFactor: 1,
        quotaStatus: 'nonquota',
        riskScore: 1
      },
      {
        species: 'WHO',
        state: 'FRE',
        presentation: 'WHO',
        toLiveWeightFactor: 1,
        quotaStatus: 'quota'
      }
    ];

    SUT.updateCache({
      species: [],
      allSpecies: [],
      seasonalFish: [],
      countries: [],
      factors: conversionFactors,
      speciesAliases: {},
      commodityCodes: [],
      gearTypes: [],
      rfmos: []
    });
  })

  it('should return defaultvalue when undefined riskScore ', () => {
    const speciesRisk = SUT.getSpeciesRiskScore('COD');
    expect(speciesRisk).toBe(0.5);
  });

  it('should return defaultvalue when missing riskScore ', () => {
    const speciesRisk = SUT.getSpeciesRiskScore('WHO');
    expect(speciesRisk).toBe(0.5);
  });

  it('should return riskScore value when riskScore is a number ', () => {
    const speciesRisk = SUT.getSpeciesRiskScore('LBE');
    expect(speciesRisk).toBe(1);
  });

  it('should return riskScore value when riskScore is a string valid number ', () => {
    const speciesRisk = SUT.getSpeciesRiskScore('HER');
    expect(speciesRisk).toBe(1);
  });

  it('should return defaultvalue when riskScore string is a string not valid number', () => {
    const speciesRisk = SUT.getSpeciesRiskScore('ALB');
    expect(speciesRisk).toBe(0.5);
  });

});

describe('getToLiveWeightFactor', () => {
  let mockConversionFactors: IConversionFactor[] = [];

  beforeEach(() => {
    mockConversionFactors = [
      {
        species: 'COD',
        state: 'FRE',
        presentation: 'FRO',
        toLiveWeightFactor: 0,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'HER',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 1.2,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'ALB',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 0,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'LBE',
        state: 'FRO',
        presentation: 'WHO',
        toLiveWeightFactor: 1.5,
        quotaStatus: 'nonquota',
        riskScore: 1
      },
      {
        species: 'WHO',
        state: 'FRE',
        presentation: 'WHO',
        quotaStatus: 'quota',
        riskScore: 1,
        toLiveWeightFactor: 0
      },
      {
        species: 'COD',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 1.2,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'BOB',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 1.2,
        quotaStatus: 'quota',
        riskScore: 0
      }
    ];
    SUT.updateCache({
      species: [],
      allSpecies: [],
      seasonalFish: [],
      countries: [],
      factors: mockConversionFactors,
      speciesAliases: {},
      commodityCodes: [],
      gearTypes: [],
    });
  });

  afterEach(() => {
    mockConversionFactors = [];
    SUT.updateCache({
      species: [],
      allSpecies: [],
      seasonalFish: [],
      countries: [],
      factors: mockConversionFactors,
      speciesAliases: {},
      commodityCodes: [],
      gearTypes: [],
      rfmos: []
    });
  });

  it('should return defaultvalue when toLiveWeightFactor is undefined', () => {
    expect(SUT.getToLiveWeightFactor('COD', 'FRE', 'FRO')).toBe(1);
  });

  it('should return defaultvalue when toLiveWeightFactor is missing', () => {
    expect(SUT.getToLiveWeightFactor('WHO', 'FRE', 'WHO')).toBe(1);
    expect(SUT.getToLiveWeightFactor('ALB', 'FRE', 'FIL')).toBe(1);
  });

  it('should return conversion factor value when toLiveWeightFactor is a number', () => {
    expect(SUT.getToLiveWeightFactor('LBE', 'FRO', 'WHO')).toBe(1.5);
  });

  it('should return conversion factor value when toLiveWeightFactor is a valid number', () => {
    expect(SUT.getToLiveWeightFactor('HER', 'FRE', 'FIL')).toBe(1.2);
  });

  it('should return defaultvalue when conversion factor is not a valid number', () => {
    expect(SUT.getToLiveWeightFactor('ALB', 'FRE', 'FIL')).toBe(1);
  });

  it('should return species\'s corresponding toliveWeightFactor', () => {
    expect(SUT.getToLiveWeightFactor('COD', 'FRE', 'FIL')).toBe(1.2);
  });

  it('should return 1 when the to live weight factor is not found', () => {
    expect(SUT.getToLiveWeightFactor('ASK', 'FRE', 'FIL')).toBe(1);
  });

  it('should return 1 as a to live weight factor when the species is found BUT does match on presentation and state', () => {
    expect(SUT.getToLiveWeightFactor('BOB', 'FRO', 'GUT')).toBe(1);
  });

});

describe('getAllConversionFactors', () => {
  let mockConversionFactors: IConversionFactor[] = [];

  beforeEach(() => {
    mockConversionFactors = [
      {
        species: 'COD',
        state: 'FRE',
        presentation: 'FRO',
        toLiveWeightFactor: 0,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'HER',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 1.2,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'ALB',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 0,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'LBE',
        state: 'FRO',
        presentation: 'WHO',
        toLiveWeightFactor: 1.5,
        quotaStatus: 'nonquota',
        riskScore: 1
      },
      {
        species: 'WHO',
        state: 'FRE',
        presentation: 'WHO',
        quotaStatus: 'quota',
        riskScore: 1,
        toLiveWeightFactor: 0
      },
      {
        species: 'COD',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 1.2,
        quotaStatus: 'quota',
        riskScore: 1
      },
      {
        species: 'BOB',
        state: 'FRE',
        presentation: 'FIL',
        toLiveWeightFactor: 1.2,
        quotaStatus: 'quota',
        riskScore: 0
      }
    ];
    SUT.updateCache({
      species: [],
      allSpecies: [],
      seasonalFish: [],
      countries: [],
      factors: mockConversionFactors,
      speciesAliases: {},
      commodityCodes: [],
      gearTypes: [],
      rfmos: []
    });
  });

  afterEach(() => {
    mockConversionFactors = [];

    SUT.updateCache({
      species: [],
      allSpecies: [],
      seasonalFish: [],
      countries: [],
      factors: mockConversionFactors,
      speciesAliases: {},
      commodityCodes: [],
      gearTypes: [],
      rfmos: []
    });
  });

  it('should return all conversion factors', () => {
    expect(SUT.getAllConversionFactors()).toHaveLength(7);
  });

});

describe('loadExporterBehaviour', () => {

  let mockLoadBlob;
  let mockLoadLocal;

  beforeEach(() => {
    mockLoadBlob = jest.spyOn(SUT, 'loadExporterBehaviourFromAzureBlob');
    mockLoadLocal = jest.spyOn(SUT, 'loadExporterBehaviourFromLocalFile');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('if in dev mode will call loadExporterBehaviourFromLocalFile', async () => {
    mockLoadLocal.mockResolvedValue(null);

    appConfig.inDev = true;

    await SUT.loadExporterBehaviour();

    expect(mockLoadLocal).toHaveBeenCalled();
  });

  it('if not in dev mode will call loadExporterBehaviourFromAzureBlob', async () => {
    mockLoadBlob.mockResolvedValue(null);

    appConfig.inDev = false;

    await SUT.loadExporterBehaviour();

    expect(mockLoadBlob).toHaveBeenCalled();
  });

});

describe('loadExporterBehaviourFromLocalFile', () => {

  let mockGetExporterBehaviourFromCSV;
  let mockLogError;

  beforeEach(() => {
    mockGetExporterBehaviourFromCSV = jest.spyOn(file, 'getExporterBehaviourFromCSV');
    mockLogError = jest.spyOn(logger, 'error');
  });

  it('will call and return the result from file.getExporterBehaviourFromCSV', async () => {
    const data = [
      { accountId: 'ID1', name: 'Exporter 1', score: 0 },
      { accountId: 'ID2', name: 'Exporter 2', score: 0.5 }
    ];

    mockGetExporterBehaviourFromCSV.mockResolvedValue(data);

    const result = await SUT.loadExporterBehaviourFromLocalFile();

    expect(result).toBe(data);
  });

  it('will handle any errors from file.getExporterBehaviourFromCSV and return an empty array', async () => {
    const error = new Error('boom');

    mockGetExporterBehaviourFromCSV.mockRejectedValue(error);

    const result = await SUT.loadExporterBehaviourFromLocalFile();

    expect(result).toEqual([]);
    expect(mockLogError).toHaveBeenNthCalledWith(1, error);
  });

});

describe('loadExporterBehaviourFromAzureBlob', () => {

  let mockGetExporterBehaviourData;
  let mockLogInfo;

  beforeEach(() => {
    mockGetExporterBehaviourData = jest.spyOn(blob, 'getExporterBehaviourData');
    mockLogInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    mockLogInfo.mockRestore();
  });

  it('will call and return the result from blob.getExporterBehaviourData', async () => {
    const data = [
      { accountId: 'ID1', name: 'Exporter 1', score: 0 },
      { accountId: 'ID2', name: 'Exporter 2', score: 0.5 }
    ];

    mockGetExporterBehaviourData.mockResolvedValue(data);

    const result = await SUT.loadExporterBehaviourFromAzureBlob('connStr');

    expect(result).toBe(data);
    expect(mockLogInfo).toHaveBeenCalledWith('[BLOB-STORAGE-DATA-LOAD][EXPORTER-BEHAVIOUR]');
  });

  it('will rethrow any errors from blob.getExporterBehaviourData', async () => {
    const error = new Error('boom');

    mockGetExporterBehaviourData.mockRejectedValue(error);

    await expect(SUT.loadExporterBehaviourFromAzureBlob('connStr'))
      .rejects
      .toThrow(new Error(`[BLOB-STORAGE-LOAD-ERROR][EXPORTER-BEHAVIOUR] ${error}`));
  });

});

describe('loadSpeciesAliases', () => {

  let mockGetSpeciesAliases;
  let mockLogInfo;

  beforeEach(() => {
    mockGetSpeciesAliases = jest.spyOn(blob, 'getSpeciesAliases');
    mockLogInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    mockLogInfo.mockRestore();
  });

  it('will call and return the result from blob.getSpeciesAliases', async () => {
    const speciesmissmatchData = [
      {
        "SQC": ["SQR", "SQZ", "SQI"]
      },
      {
        "SQR": ["SQC", "SQZ", "SQI"]
      },
    ];

    mockGetSpeciesAliases.mockResolvedValue(speciesmissmatchData);

    const result = await SUT.loadSpeciesAliases('connStr');

    expect(result).toBe(speciesmissmatchData);
    expect(mockLogInfo).toHaveBeenCalledWith('[BLOB-STORAGE-DATA-LOAD][SPECIES-ALIASES]');
  });

  it('will rethrow any errors from blob.getSpeciesAliases', async () => {
    const error = new Error('tis the error');

    mockGetSpeciesAliases.mockRejectedValue(error);

    await expect(SUT.loadSpeciesAliases('connStr'))
      .rejects
      .toThrow(new Error(`[BLOB-STORAGE-LOAD-ERROR][SPECIES-ALIASES] ${error}`));
  });

});

describe('getWeighting', () => {
  beforeAll(() => {
    SUT.updateWeightingCache(weightingRiskData);
  });

  afterAll(() => {
    SUT.updateWeightingCache({
      exporterWeight: 0,
      speciesWeight: 0,
      vesselWeight: 0,
      threshold: 0
    });
  });

  it('will return the correct weighting', () => {
    expect(SUT.getWeighting(WEIGHT.EXPORTER)).toBe(1);
    expect(SUT.getWeighting(WEIGHT.VESSEL)).toBe(1);
    expect(SUT.getWeighting(WEIGHT.SPECIES)).toBe(1);
  });

  it('will return the correct risk thres hold', () => {
    expect(SUT.getRiskThreshold()).toBe(1);
  });
});

describe('getExporterRiskScore', () => {

  const testExporters: IExporterBehaviour[] = [
    { name: 'Organisation 1, Contact 1', accountId: 'acc1', contactId: 'con1', score: 0.9 },
    { name: 'Organisation 1, Contact 2', accountId: 'acc1', contactId: 'con2', score: 0.7 },
    { name: 'Organisation 1, Contact 3', contactId: 'con3', score: 0.8 },
    { name: 'Organisation 1, All Other Contacts', accountId: 'acc1', score: 0.3 },
    { name: 'Individual fisherman', contactId: 'con2', score: 0.2 },
  ];

  beforeAll(async () => {
    appConfig.inDev = true;

    jest.spyOn(SUT, 'loadExporterBehaviourFromLocalFile')
      .mockResolvedValue(testExporters);

    await SUT.loadExporterBehaviour();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('will return a default of 1.0 if no ids are provided', () => {
    const score = SUT.getExporterRiskScore(null, null);

    expect(score).toBe(1.0);
  });

  describe('for an individual user (no accountId)', () => {

    it('will find an individual fisherman by contactId only', () => {
      const score = SUT.getExporterRiskScore(null, 'con2');

      expect(score).toBe(0.2);
    });

    it('will return a default of 1.0 if no match is found', () => {
      const score = SUT.getExporterRiskScore(null, 'xx');

      expect(score).toBe(1.0);
    });

  });

  describe('for a user within an organisation (has an accountId)', () => {

    it('will use both ids to find an exact match', () => {
      const score = SUT.getExporterRiskScore('acc1', 'con2');

      expect(score).toBe(0.7);
    });

    it('will match on contactId if no exact match', () => {
      const score = SUT.getExporterRiskScore('acc1', 'con3');

      expect(score).toBe(0.8);
    });

    it('will match on accountId if no contact match', () => {
      const score = SUT.getExporterRiskScore('acc1', 'con99');

      expect(score).toBe(0.3);
    });

    it('will return a default of 1.0 if no match is found', () => {
      const score = SUT.getExporterRiskScore('xx', 'xx');

      expect(score).toBe(1.0);
    });

  });

});

describe('getSpeciesRiskScore', () => {

  let mockConversionFactors: IConversionFactor[] = [{
    species: 'COD',
    state: 'FRE',
    presentation: 'FIL',
    toLiveWeightFactor: 1.2,
    quotaStatus: 'quota',
    riskScore: 1
  },
  {
    species: 'BOB',
    state: 'FRE',
    presentation: 'FIL',
    toLiveWeightFactor: 1.2,
    quotaStatus: 'quota',
    riskScore: undefined
  }];

  beforeEach(() => {
    SUT.updateCache({
      species: [],
      allSpecies: [],
      seasonalFish: [],
      countries: [],
      factors: mockConversionFactors,
      speciesAliases: {},
      commodityCodes: [],
      gearTypes: [],
      rfmos: []
    });
  });

  it('should return its riskScore when the riskScore is available', () => {
    const speciesCode = SUT.getSpeciesRiskScore('COD');
    expect(speciesCode).toBe(1);
  });

  it('should return 0.5 when the species is not found', () => {
    const speciesCode = SUT.getSpeciesRiskScore('ASK');
    expect(speciesCode).toBe(0.5);
  });

  it('should return 0.5 when the species is found BUT does not have a risk score', () => {
    const speciesCode = SUT.getSpeciesRiskScore('BOB');
    expect(speciesCode).toBe(0.5);
  });
});

describe('getVesselRiskScore', () => {

  beforeEach(() => {
    SUT.updateVesselsOfInterestCache(vesselsOfInterestData);
  });

  afterEach(() => {
    SUT.updateVesselsOfInterestCache([]);
  });

  it('returns a score of 1 if the vessel is present within the vessels of interest list', async () => {
    const pln: string = 'H1100';
    const result = SUT.getVesselRiskScore(pln);
    expect(result).toBe(1);
  });

  it('return a score of 0.5 if the vessel is not present within the vessels of interest list', async () => {
    const pln: string = 'WA1';
    const result = SUT.getVesselRiskScore('WA1');
    expect(result).toBe(0.5);
  });
});

describe('getSpeciesRiskToggle', () => {

  afterEach(() => {
    SUT.updateSpeciesToggleCache({ enabled: false });
  });

  it('should return true', () => {
    SUT.updateSpeciesToggleCache(speciesToggleData);
    expect(SUT.getSpeciesRiskToggle()).toBe(true);
  });

  it('should return false', () => {
    expect(SUT.getSpeciesRiskToggle()).toBe(false);
  });

});

describe('Refresh Risking Data', () => {
  const conversionFactors: IConversionFactor[] = [
    {
      species: 'COD',
      state: 'FRE',
      presentation: 'FIL',
      toLiveWeightFactor: 1.2,
      quotaStatus: 'quota',
      riskScore: 0
    },
    {
      species: 'LBE',
      state: 'FRO',
      presentation: 'WHO',
      toLiveWeightFactor: 1,
      quotaStatus: 'nonquota',
      riskScore: 1
    }
  ];

  let mockGetVesselsOfInterest;
  let mockUpdateVesselsOfInterestCache;
  let mockGetWeightingRisk;
  let mockUpdateWeightingCache;
  let mockGetSpeciesToggle;
  let mockUpdateSpeciesToggleCache;
  let mockGetEodSettingsCache;

  beforeEach(() => {
    SUT.updateVesselsCache(vesselData);

    SUT.updateCache({
      species: [],
      allSpecies: [],
      seasonalFish: [],
      countries: [],
      factors: conversionFactors,
      speciesAliases: {},
      commodityCodes: [],
      gearTypes: [],
      rfmos: []
    });
    SUT.updateEodSettingsCache([]);

    mockGetVesselsOfInterest = jest.spyOn(RiskingService, 'getVesselsOfInterest');
    mockGetWeightingRisk = jest.spyOn(RiskingService, 'getWeightingRisk');
    mockGetSpeciesToggle = jest.spyOn(RiskingService, 'getSpeciesToggle');
    mockUpdateVesselsOfInterestCache = jest.spyOn(SUT, 'updateVesselsOfInterestCache');
    mockUpdateWeightingCache = jest.spyOn(SUT, 'updateWeightingCache');
    mockUpdateSpeciesToggleCache = jest.spyOn(SUT, 'updateSpeciesToggleCache');
    mockGetEodSettingsCache = jest.spyOn(EoDService, 'getEodSettings');

    mockGetVesselsOfInterest.mockResolvedValue(vesselsOfInterestData);
    mockGetWeightingRisk.mockResolvedValue(weightingRiskData);
    mockGetSpeciesToggle.mockResolvedValue(speciesToggleData);
    mockGetEodSettingsCache.mockResolvedValue(eodSettingsData);
  });

  afterEach(() => {
    SUT.updateVesselsOfInterestCache([]);
    SUT.updateWeightingCache({
      exporterWeight: 0,
      vesselWeight: 0,
      speciesWeight: 0,
      threshold: 0
    });
    SUT.updateSpeciesToggleCache({
      enabled: true
    });

    SUT.updateEodSettingsCache([]);
    SUT.updateVesselsCache([]);


    SUT.updateCache({
      species: [],
      allSpecies: [],
      seasonalFish: [],
      countries: [],
      factors: [],
      speciesAliases: {},
      commodityCodes: [],
      gearTypes: [],
      rfmos: []
    });
    SUT.updateEodSettingsCache([]);

    mockGetVesselsOfInterest.mockRestore();
    mockUpdateVesselsOfInterestCache.mockRestore();

    mockGetSpeciesToggle.mockRestore();
    mockGetWeightingRisk.mockRestore();
    mockUpdateWeightingCache.mockRestore();
    mockGetEodSettingsCache.mockRestore();
  });

  it('should refresh the vessels of interest', async () => {
    await SUT.refreshRiskingData();

    expect(mockGetVesselsOfInterest).toHaveBeenCalled();
    expect(mockUpdateVesselsOfInterestCache).toHaveBeenCalledWith(vesselsOfInterestData);

    expect(mockGetWeightingRisk).toHaveBeenCalled();
    expect(mockUpdateWeightingCache).toHaveBeenCalledWith(weightingRiskData);

    expect(SUT.getVesselRiskScore('H1100')).toBe(1);
    expect(SUT.getVesselRiskScore('WA1')).toBe(0.5);

    expect(SUT.getWeighting(WEIGHT.VESSEL)).toBe(1);
    expect(SUT.getWeighting(WEIGHT.SPECIES)).toBe(1);
    expect(SUT.getWeighting(WEIGHT.EXPORTER)).toBe(1);
    expect(SUT.getRiskThreshold()).toBe(1);
  });

  it('should check if the refreshRiskingData calls the toggle functionality and get eod settings', async () => {
    await SUT.refreshRiskingData();

    expect(mockGetSpeciesToggle).toHaveBeenCalled();
    expect(mockUpdateSpeciesToggleCache).toHaveBeenCalledWith(speciesToggleData);
    expect(mockGetEodSettingsCache).toHaveBeenCalled();
  });
});

describe('getDataEverExpected', () => {

  it('should correct return the expected data ever expected', () => {
    SUT.updateVesselsCache(vesselData);
    SUT.updateEodSettingsCache(eodSettingsData);

    const A12032: ILicence = {
      da: 'Scotland',
      flag: 'GBR',
      vesselLength: 8.84,
      rssNumber: 'A12032',
      homePort: '',
      imoNumber: null,
      licenceNumber: '',
      licenceValidTo: '',
      licenceHolder: ''
    };

    const C20514: ILicence = {
      da: 'England',
      flag: 'GBR',
      vesselLength: 50.63,
      rssNumber: 'C20514',
      homePort: '',
      imoNumber: null,
      licenceNumber: '',
      licenceValidTo: '',
      licenceHolder: ''
    };

    const A21401: ILicence = {
      da: "Wales",
      flag: 'GBR',
      vesselLength: 11.75,
      rssNumber: 'A21401',
      homePort: '',
      imoNumber: null,
      licenceNumber: '',
      licenceValidTo: '',
      licenceHolder: ''
    };

    expect(SUT.getDataEverExpected(A12032)).toBe(false);
    expect(SUT.getDataEverExpected(C20514)).toBe(true);
    expect(SUT.getDataEverExpected(A21401)).toBe(true);
  });

})

describe('getLandingDataRuleDate', () => {

  const A12032: ILicence = {
    da: 'Scotland',
    flag: 'GBR',
    vesselLength: 8.84,
    rssNumber: 'A12032',
    homePort: '',
    imoNumber: null,
    licenceNumber: '',
    licenceValidTo: '',
    licenceHolder: ''
  };

  const C20514: ILicence = {
    da: 'England',
    flag: 'GBR',
    vesselLength: 50.63,
    rssNumber: 'C20514',
    homePort: '',
    imoNumber: null,
    licenceNumber: '',
    licenceValidTo: '',
    licenceHolder: ''
  };

  const A21401: ILicence = {
    da: "Wales",
    flag: 'GBR',
    vesselLength: 11.75,
    rssNumber: 'A21401',
    homePort: '',
    imoNumber: null,
    licenceNumber: '',
    licenceValidTo: '',
    licenceHolder: ''
  };

  beforeEach(() => {
    SUT.updateVesselsCache(vesselData);
    SUT.updateEodSettingsCache(eodSettingsData);
  });

  afterEach(() => {
    SUT.updateEodSettingsCache([]);
    SUT.updateVesselsCache([]);
  });

  it('should return default date rule if there are no eod settings', () => {
    expect(SUT.getLandingDataRuleDate('2023-05-10', A21401, 'expectedDate')).toBe(moment.utc().format('YYYY-MM-DD'));
  });

  it('should return default if there are no rules for a given eod setting', () => {
    expect(SUT.getLandingDataRuleDate('2023-05-10', A21401, 'expectedDate')).toBe(moment.utc().format('YYYY-MM-DD'));
  });

  it('should return default date if there are no expectedDate rule for a given eod setting', () => {
    expect(SUT.getLandingDataRuleDate('2023-05-10', A12032, 'expectedDate')).toBe(moment.utc().format('YYYY-MM-DD'));
  });

  it('should return a date x numberOfDays from landing date', () => {
    expect(SUT.getLandingDataRuleDate('2023-05-10', C20514, 'expectedDate', '')).toBe('2023-05-20');
  });

  it('should return default for end date without an expected date', () => {
    expect(SUT.getLandingDataRuleDate('2023-05-10', C20514, 'endDate')).toBe(moment.utc().add(14, 'day').format('YYYY-MM-DD'));
  });

  it('should return default for end date with a \'\' expected date', () => {
    expect(SUT.getLandingDataRuleDate('2023-05-10', C20514, 'endDate', '')).toBe(moment.utc().add(14, 'day').format('YYYY-MM-DD'));
  });

  it('should return default for end date with a non YYYY-MM-DD expected date', () => {
    expect(SUT.getLandingDataRuleDate('2023-05-10', C20514, 'endDate', '10-10-2020')).toBe(moment.utc().add(14, 'day').format('YYYY-MM-DD'));
  });

  it('should return a date x numberOfDays from landingDataExpectedDate date', () => {
    expect(SUT.getLandingDataRuleDate('2023-05-10', C20514, 'endDate', '2023-05-20')).toBe('2023-05-30');
  });

  it('should return default if rule is not defined', () => {
    expect(SUT.getLandingDataRuleDate('2023-05-10', C20514, 'endDate')).toBe(moment.utc().add(14, 'day').format('YYYY-MM-DD'));
  });
})

describe('updateCache', () => {
  it('should not add species, allSpecies, seasonalFish and countries to cache when undefined', () => {

    SUT.updateCache({
      species: undefined,
      allSpecies: undefined,
      seasonalFish: undefined,
      countries: undefined,
      factors: undefined,
      speciesAliases: undefined,
      commodityCodes: undefined,
      gearTypes: undefined,
      rfmos: undefined
    });

    expect(SUT.getSpeciesData('uk')).toHaveLength(0);
    expect(SUT.getSpeciesData('global')).toHaveLength(0)
    expect(SUT.getSeasonalFish()).toHaveLength(0)
    expect(SUT.getCountries()).toHaveLength(0)
    expect(SUT.getGearTypes()).toHaveLength(0)
    expect(SUT.getRfmos()).toHaveLength(0);
  });
});

describe('vesselLengthToSize', () => {
  it('will return Under 10m', () => {
    expect(SUT.vesselLengthToSize(9)).toBe('Under 10m');
  });

  it('will return Under 12m+', () => {
    expect(SUT.vesselLengthToSize(19)).toBe('12m+');
  });
  it('will return Under 10-12m', () => {
    expect(SUT.vesselLengthToSize(11)).toBe('10-12m');
  });

  it('will return Under 10-12m for any other provided vessel length', () => {
    expect(SUT.vesselLengthToSize(undefined)).toBe('10-12m');
  });
});

describe('addVesselNotFound', () => {
  const ActualVesselNotFoundEnabled = appConfig.vesselNotFoundEnabled

  beforeEach(() => {
    appConfig.vesselNotFoundEnabled = ActualVesselNotFoundEnabled;
  });

  it('should add vessel not found as valid vessel to vessel data if vesselNotFoundEnabled is true', () => {
    appConfig.vesselNotFoundEnabled = true;
    appConfig.vesselNotFoundName = 'Vessel not found';
    appConfig.vesselNotFoundPln = 'N/A';

    const result = SUT.addVesselNotFound(vesselData);
    expect(result).toEqual([...vesselData, ...vesselNotFoundData])
  })

  it('should NOT add `vessel not found` as valid vessel to vessel data if vesselNotFoundEnabled is false', () => {
    appConfig.vesselNotFoundEnabled = false;

    const result = SUT.addVesselNotFound(vesselData);
    expect(result).toEqual(vesselData)
  })

});

describe('loadAllSpecies', () => {

  const connString = 'connection string';

  let mockGetSpeciesData;
  let mockLoggerInfo;

  beforeEach(() => {
    mockGetSpeciesData = jest.spyOn(blob, 'getAllSpecies');
    mockLoggerInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will log being called', async () => {
    mockGetSpeciesData.mockResolvedValue('test');

    await SUT.loadAllSpecies(connString);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[BLOB-STORAGE-DATA-LOAD][ALL-SPECIES]');
  });

  it('will call getAllSpecies in blob storage', async () => {
    mockGetSpeciesData.mockResolvedValue('test');

    await SUT.loadAllSpecies(connString);

    expect(mockGetSpeciesData).toHaveBeenCalledWith(connString);
  });

  it('will return data from blob storage', async () => {
    mockGetSpeciesData.mockResolvedValue('test');

    const result = await SUT.loadAllSpecies(connString);

    expect(result).toBe('test');
  });

  it('will throw an error if blob storage throws an error', async () => {
    const error = new Error('something went wrong');

    mockGetSpeciesData.mockRejectedValue(error);

    const expected = `[BLOB-STORAGE-LOAD-ERROR][ALL-SPECIES] ${error}`;

    await expect(async () => SUT.loadAllSpecies(connString)).rejects.toThrow(expected);
  });

});

describe('loadSpeciesData', () => {

  const connString = 'connection string';

  let mockGetSpeciesData;
  let mockLoggerInfo;

  beforeEach(() => {
    mockGetSpeciesData = jest.spyOn(blob, 'getSpeciesData');
    mockLoggerInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will log being called', async () => {
    mockGetSpeciesData.mockResolvedValue('test');

    await SUT.loadSpeciesData(connString);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[BLOB-STORAGE-DATA-LOAD][SPECIES]');
  });

  it('will call getSpeciesData in blob storage', async () => {
    mockGetSpeciesData.mockResolvedValue('test');

    await SUT.loadSpeciesData(connString);

    expect(mockGetSpeciesData).toHaveBeenCalledWith(connString);
  });

  it('will return data from blob storage', async () => {
    mockGetSpeciesData.mockResolvedValue('test');

    const result = await SUT.loadSpeciesData(connString);

    expect(result).toBe('test');
  });

  it('will throw an error if blob storage throws an error', async () => {
    const error = new Error('something went wrong');

    mockGetSpeciesData.mockRejectedValue(error);

    const expected = `[BLOB-STORAGE-LOAD-ERROR][SPECIES] ${error}`;

    await expect(async () => SUT.loadSpeciesData(connString)).rejects.toThrow(expected);
  });

});

describe('loadCommodityData', () => {

  const connString = 'connection string';

  let mockGetCommodityCodeData;
  let mockLoggerInfo;

  beforeEach(() => {
    mockGetCommodityCodeData = jest.spyOn(blob, 'getCommodityCodeData');
    mockLoggerInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will log being called', async () => {
    mockGetCommodityCodeData.mockResolvedValue('test');

    await SUT.loadCommodityCodeData(connString);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[BLOB-STORAGE-DATA-LOAD][COMMODITY-CODES]');
  });

  it('will call getCommodityCodeData in blob storage', async () => {
    mockGetCommodityCodeData.mockResolvedValue('test');

    await SUT.loadCommodityCodeData(connString);

    expect(mockGetCommodityCodeData).toHaveBeenCalledWith(connString);
  });

  it('will return data from blob storage', async () => {
    mockGetCommodityCodeData.mockResolvedValue('test');

    const result = await SUT.loadCommodityCodeData(connString);

    expect(result).toBe('test');
  });

  it('will throw an error if blob storage throws an error', async () => {
    const error = new Error('something went wrong');

    mockGetCommodityCodeData.mockRejectedValue(error);

    const expected = `[BLOB-STORAGE-LOAD-ERROR][COMMODITY-CODES] ${error}`;

    await expect(async () => SUT.loadCommodityCodeData(connString)).rejects.toThrow(expected);
  });

});

describe('loadSeasonalFishData', () => {

  const connString = 'connection string';

  let mockGetSeasonalFishData;
  let mockLoggerInfo;

  beforeEach(() => {
    mockGetSeasonalFishData = jest.spyOn(blob, 'getSeasonalFishData');
    mockLoggerInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will log being called', async () => {
    mockGetSeasonalFishData.mockResolvedValue('test');

    await SUT.loadSeasonalFishData(connString);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[BLOB-STORAGE-DATA-LOAD][SEASONAL-FISH]');
  });

  it('will call getSeasonalFishData in blob storage', async () => {
    mockGetSeasonalFishData.mockResolvedValue('test');

    await SUT.loadSeasonalFishData(connString);

    expect(mockGetSeasonalFishData).toHaveBeenCalledWith(connString);
  });

  it('will return data from blob storage', async () => {
    mockGetSeasonalFishData.mockResolvedValue('test');

    const result = await SUT.loadSeasonalFishData(connString);

    expect(result).toBe('test');
  });

  it('will throw an error if blob storage throws an error', async () => {
    const error = new Error('something went wrong');

    mockGetSeasonalFishData.mockRejectedValue(error);

    const expected = `[BLOB-STORAGE-LOAD-ERROR][SEASONAL-FISH] ${error}`;

    await expect(async () => SUT.loadSeasonalFishData(connString)).rejects.toThrow(expected);
  });

});

describe('loadConversionFactorsData', () => {

  const connString = 'connection string';

  let mockGetConversionFactorsData;
  let mockLoggerInfo;

  beforeEach(() => {
    mockGetConversionFactorsData = jest.spyOn(blob, 'getConversionFactorsData');
    mockLoggerInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will log being called', async () => {
    mockGetConversionFactorsData.mockResolvedValue('test');

    await SUT.loadConversionFactorsData(connString);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[BLOB-STORAGE-DATA-LOAD][CONVERSION-FACTORS]');
  });

  it('will call getConversionFactorsData in blob storage', async () => {
    mockGetConversionFactorsData.mockResolvedValue('test');

    await SUT.loadConversionFactorsData(connString);

    expect(mockGetConversionFactorsData).toHaveBeenCalledWith(connString);
  });

  it('will return data from blob storage', async () => {
    mockGetConversionFactorsData.mockResolvedValue('test');

    const result = await SUT.loadConversionFactorsData(connString);

    expect(result).toBe('test');
  });

  it('will throw an error if blob storage throws an error', async () => {
    const error = new Error('something went wrong');

    mockGetConversionFactorsData.mockRejectedValue(error);

    const expected = `[BLOB-STORAGE-LOAD-ERROR][CONVERSION-FACTORS] ${error}`;

    await expect(async () => SUT.loadConversionFactorsData(connString)).rejects.toThrow(expected);
  });

});

describe('loadGearTypesData', () => {

  const connString = 'connection string';

  let mockGetGearTypesData;
  let mockLoggerInfo;

  beforeEach(() => {
    mockGetGearTypesData = jest.spyOn(blob, 'getGearTypesData');
    mockLoggerInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will log being called', async () => {
    mockGetGearTypesData.mockResolvedValue('test');

    await SUT.loadGearTypesData(connString);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[BLOB-STORAGE-DATA-LOAD][GEAR-TYPES]');
  });

  it('will call getGearTypesData in blob storage', async () => {
    mockGetGearTypesData.mockResolvedValue('test');

    await SUT.loadGearTypesData(connString);

    expect(mockGetGearTypesData).toHaveBeenCalledWith(connString);
  });

  it('will return data from blob storage', async () => {
    mockGetGearTypesData.mockResolvedValue('test');

    const result = await SUT.loadGearTypesData(connString);

    expect(result).toBe('test');
  });

  it('will throw an error if blob storage throws an error', async () => {
    const error = new Error('something went wrong');

    mockGetGearTypesData.mockRejectedValue(error);

    const expected = `[BLOB-STORAGE-LOAD-ERROR][GEAR-TYPES] ${error}`;

    await expect(async () => SUT.loadGearTypesData(connString)).rejects.toThrow(expected);
  });

});

describe('loadRfmosData', () => {

  const connString = 'connection string';

  let mockGetRfmosData;
  let mockLoggerInfo;

  beforeEach(() => {
    mockGetRfmosData = jest.spyOn(blob, 'getRfmosData');
    mockLoggerInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will log being called', async () => {
    mockGetRfmosData.mockResolvedValue('test');

    await SUT.loadRfmosDataFromAzureBlob(connString);

    expect(mockLoggerInfo).toHaveBeenCalledWith('[BLOB-STORAGE-DATA-LOAD][RFMO-AREAS]');
  });

  it('will call getRfmosData in blob storage', async () => {
    mockGetRfmosData.mockResolvedValue('test');

    await SUT.loadRfmosDataFromAzureBlob(connString);

    expect(mockGetRfmosData).toHaveBeenCalledWith(connString);
  });

  it('will return data from blob storage', async () => {
    mockGetRfmosData.mockResolvedValue('test');

    const result = await SUT.loadRfmosDataFromAzureBlob(connString);

    expect(result).toBe('test');
  });

  it('will throw an error if blob storage throws an error', async () => {
    const error = new Error('something went wrong');

    mockGetRfmosData.mockRejectedValue(error);

    const expected = `[BLOB-STORAGE-LOAD-ERROR][RFMO-AREAS] ${error}`;

    await expect(async () => SUT.loadRfmosDataFromAzureBlob(connString)).rejects.toThrow(expected);
  });

});

describe('loadAllSpeciesFromLocalFile', () => {

  let mockGetSpeciesData;
  let mockLoggerError;

  beforeEach(() => {
    mockGetSpeciesData = jest.spyOn(file, 'getSpeciesDataFromCSV');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will call getSpeciesDataFromCSV in file storage', async () => {
    mockGetSpeciesData.mockResolvedValue('test');

    await SUT.loadAllSpeciesFromLocalFile();

    expect(mockGetSpeciesData).toHaveBeenCalled();
  });

  it('will return data from file storage', async () => {
    mockGetSpeciesData.mockResolvedValue('test');

    const result = await SUT.loadAllSpeciesFromLocalFile();

    expect(result).toBe('test');
  });

  it('will log an error and return void if file storage throws an error', async () => {
    const error = new Error('something went wrong');

    mockGetSpeciesData.mockRejectedValue(error);

    const result = await SUT.loadAllSpeciesFromLocalFile();

    expect(mockLoggerError).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

});

describe('loadSpeciesDataFromLocalFile', () => {

  let mockGetSpeciesData;
  let mockLoggerError;

  beforeEach(() => {
    mockGetSpeciesData = jest.spyOn(file, 'getSpeciesDataFromFile');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will call getSpeciesDataFromFile in file storage', async () => {
    mockGetSpeciesData.mockResolvedValue('test');

    await SUT.loadSpeciesDataFromLocalFile();

    expect(mockGetSpeciesData).toHaveBeenCalled();
  });

  it('will return data from file storage', async () => {
    mockGetSpeciesData.mockResolvedValue('test');

    const result = await SUT.loadSpeciesDataFromLocalFile();

    expect(result).toBe('test');
  });

  it('will log an error and return void if file storage throws an error', async () => {
    const error = new Error('something went wrong');

    mockGetSpeciesData.mockRejectedValue(error);

    const result = await SUT.loadSpeciesDataFromLocalFile();

    expect(mockLoggerError).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

});

describe('loadVesselsDataFromLocalFile', () => {

  let mockGetVesselData;
  let mockLoggerError;

  beforeEach(() => {
    mockGetVesselData = jest.spyOn(file, 'getVesselsDataFromFile');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will call getVesselDataFromFile in file storage', async () => {
    mockGetVesselData.mockResolvedValue('test');

    await SUT.loadVesselsDataFromLocalFile();

    expect(mockGetVesselData).toHaveBeenCalled();
  });

  it('will return data from file storage', async () => {
    mockGetVesselData.mockResolvedValue('test');

    const result = await SUT.loadVesselsDataFromLocalFile();

    expect(result).toBe('test');
  });

  it('will log an error and return void if file storage throws an error', async () => {

    mockGetVesselData.mockImplementation(() => {
      throw 'something went wrong'
    });

    const result = await SUT.loadVesselsDataFromLocalFile();

    expect(mockLoggerError).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

});

describe('loadSeasonalFishDataFromLocalFile', () => {

  let mockGetSeasonalFishData;
  let mockLoggerError;

  beforeEach(() => {
    mockGetSeasonalFishData = jest.spyOn(file, 'getSeasonalFishDataFromCSV');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will call getSeasonalFishDataFromFile in file storage', async () => {
    mockGetSeasonalFishData.mockResolvedValue('test');

    await SUT.loadSeasonalFishDataFromLocalFile();

    expect(mockGetSeasonalFishData).toHaveBeenCalled();
  });

  it('will return data from file storage', async () => {
    mockGetSeasonalFishData.mockResolvedValue('test');

    const result = await SUT.loadSeasonalFishDataFromLocalFile();

    expect(result).toBe('test');
  });

  it('will log an error and return void if file storage throws an error', async () => {

    mockGetSeasonalFishData.mockImplementation(() => {
      throw 'something went wrong'
    });

    const result = await SUT.loadSeasonalFishDataFromLocalFile();

    expect(mockLoggerError).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

});

describe('loadCountriesDataFromLocalFile', () => {

  let mockGetCountriesData;
  let mockLoggerError;

  beforeEach(() => {
    mockGetCountriesData = jest.spyOn(file, 'getCountriesDataFromFile');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will call getCountriesDataFromFile', () => {
    mockGetCountriesData.mockReturnValue(countriesData);

    SUT.loadCountriesDataFromLocalFile();

    expect(mockGetCountriesData).toHaveBeenCalled();
  });

  it('will return countries data from local file', () => {
    mockGetCountriesData.mockReturnValue(countriesData);

    const expected: ICountry[] = [{
      officialCountryName: "Spain",
      isoCodeAlpha2: "ES",
      isoCodeAlpha3: "ESP",
      isoNumericCode: "724",
    },
    {
      officialCountryName: "Greece",
      isoCodeAlpha2: "GR",
      isoCodeAlpha3: "GRC",
      isoNumericCode: "300"
    },
    {
      officialCountryName: "United Kingdom of Great Britain and Northern Ireland",
      isoCodeAlpha2: "GB",
      isoCodeAlpha3: "GBR",
      isoNumericCode: "826"
    },
    {
      officialCountryName: "Brazil",
      isoCodeAlpha2: "BR",
      isoCodeAlpha3: "BRA",
      isoNumericCode: "076"
    },
    {
      officialCountryName: "Nigeria",
      isoCodeAlpha2: "NG",
      isoCodeAlpha3: "NGA",
      isoNumericCode: "566"
    },
    {
      officialCountryName: "Ghana",
      isoCodeAlpha2: "GH",
      isoCodeAlpha3: "GHA",
      isoNumericCode: "288"
    }];

    const result: ICountry[] = SUT.loadCountriesDataFromLocalFile();

    expect(result).toStrictEqual(expected);
  });

  it('will log an error and return [] read from countries file throws an error', () => {
    const error = new Error('something went wrong');

    mockGetCountriesData.mockImplementation(() => {
      throw error;
    });

    const result = SUT.loadCountriesDataFromLocalFile();

    expect(mockLoggerError).toHaveBeenCalledWith(error);
    expect(result).toStrictEqual([]);
  });

});

describe('loadSpeciesAliasesFromLocalFile', () => {

  let mockgetSpeciesAliasesFromFile;
  let mockLoggerError;

  beforeEach(() => {
    mockgetSpeciesAliasesFromFile = jest.spyOn(file, 'getSpeciesAliasesFromFile');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will call getSpeciesAliasesFromFile', () => {
    mockgetSpeciesAliasesFromFile.mockReturnValue(speciesAliasesData);

    SUT.loadSpeciesAliasesFromLocalFile();

    expect(mockgetSpeciesAliasesFromFile).toHaveBeenCalled();
  });

  it('will return species aliases data from local file', () => {
    mockgetSpeciesAliasesFromFile.mockReturnValue(speciesAliasesData);

    const expected: any = {
      ANF: ['MON'],
      CTL: ['CTC'],
      LEZ: ['MEG'],
      MEG: ['LEZ'],
      MON: ['ANF'],
      SQC: ['SQR', 'SQZ', 'SQI'],
      SQR: ['SQC', 'SQZ', 'SQI'],
    };

    const result: any = SUT.loadSpeciesAliasesFromLocalFile();

    expect(result).toStrictEqual(expected);
  });

  it('will log an error and return {} read from speciesmismatch file if there is an error', () => {
    const error = new Error('something went wrong');

    mockgetSpeciesAliasesFromFile.mockImplementation(() => {
      throw error;
    });

    const result = SUT.loadSpeciesAliasesFromLocalFile();

    expect(mockLoggerError).toHaveBeenCalledWith(error);
    expect(result).toStrictEqual({});
  });

});

describe('loadGearTypesDataFromLocalFile', () => {

  let mockGetGearTypesData;
  let mockLoggerError;

  beforeEach(() => {
    mockGetGearTypesData = jest.spyOn(file, 'getGearTypesDataFromCSV');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will call getGearTypesDataFromFile in file storage', async () => {
    mockGetGearTypesData.mockResolvedValue('test');

    await SUT.loadGearTypesDataFromLocalFile();

    expect(mockGetGearTypesData).toHaveBeenCalled();
  });

  it('will return data from file storage', async () => {
    mockGetGearTypesData.mockResolvedValue('test');

    const result = await SUT.loadGearTypesDataFromLocalFile();

    expect(result).toBe('test');
  });

  it('will log an error and return void if file storage throws an error', async () => {

    mockGetGearTypesData.mockImplementation(() => {
      throw 'something went wrong'
    });

    const result = await SUT.loadGearTypesDataFromLocalFile();

    expect(mockLoggerError).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

});

describe('loadRfmosDataFromLocalFile', () => {

  let mockGetRfmosData;
  let mockLoggerError;

  beforeEach(() => {
    mockGetRfmosData = jest.spyOn(file, 'getRfmosDataFromCSV');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will call getRfmosDataFromCSV in file storage', async () => {
    mockGetRfmosData.mockResolvedValue('test');

    await SUT.loadRfmosDataFromLocalFile();

    expect(mockGetRfmosData).toHaveBeenCalled();
  });

  it('will return data from file storage', async () => {
    mockGetRfmosData.mockResolvedValue('test');

    const result = await SUT.loadRfmosDataFromLocalFile();

    expect(result).toBe('test');
  });

  it('will log an error and return void if file storage throws an error', async () => {

    mockGetRfmosData.mockImplementation(() => {
      throw 'something went wrong'
    });

    const result = await SUT.loadRfmosDataFromLocalFile();

    expect(mockLoggerError).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
