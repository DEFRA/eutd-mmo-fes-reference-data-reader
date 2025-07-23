import moment from 'moment';
import * as blob from './blob-storage';
import * as file from './local-file';
import * as CountriesApi from './countries-api';

import logger from '../logger';
import appConfig from '../config';
import { generateIndex, type IConversionFactor, type ICountry } from 'mmo-shared-reference-data';
import { QuotaStatuses } from '../landings/types/appConfig/conversionFactors';
import { loadConversionFactorsFromLocalFile } from '../landings/persistence/conversionFactors';
import { ISpeciesRiskToggle, IVesselOfInterest, IWeighting, WEIGHT } from '../landings/types/appConfig/risking';
import { seedBlockingRules } from '../services/systemBlock.service';
import { seedVesselsOfInterest, seedWeightingRisk, getVesselsOfInterest, getWeightingRisk } from '../landings/persistence/risking';
import { getSpeciesToggle } from '../controllers/risking';
import { IExporterBehaviour } from '../landings/types/appConfig/exporterBehaviour';
import { IAllSpecies } from '../landings/types/appConfig/allSpecies';
import { ILicence, IVessel } from '../landings/types/appConfig/vessels';
import { IEodRule, IEodSetting, vesselSizeGroup } from '../landings/types/appConfig/eodSettings';
import { getEodSettings } from '../landings/persistence/eodSettings';
import { CacheType } from '../handler/types';

let VESSELS: IVessel[] = [];
let VESSELS_IDX = (pln: string) => undefined;
let SPECIES: any[] = [];
let COMMODITY_CODES: any[] = [];
let ALLSPECIES: any[] = [];
let CONVERSION_FACTORS: IConversionFactor[] = [];
let SEASONALFISH: any[] = [];
let COUNTRIES: ICountry[] = [];
let EXPORTER_BEHAVIOUR: IExporterBehaviour[] = [];
let VESSELS_OF_INTEREST: IVesselOfInterest[] = [];
let SPECIES_TOGGLE = false;
let WEIGHTING: IWeighting = {
  exporterWeight: 0,
  vesselWeight: 0,
  speciesWeight: 0,
  threshold: 0
};
let SPECIES_ALIASES: any = {};
let EOD_SETTINGS: IEodSetting[] = [];
let GEAR_TYPES: any[] = [];
let RFMO_AREAS: any[] = [];

export const loadLocalFishCountriesAndSpecies = async () => {
  logger.info('Loading data from local files in dev mode');
  const allSpecies = await loadAllSpeciesFromLocalFile();
  const species = await loadSpeciesDataFromLocalFile();
  const commodityCodes = await loadSpeciesDataFromLocalFile(`${__dirname}/../../data/commodity_code_ps_sd.txt`);
  const seasonalFish = await loadSeasonalFishDataFromLocalFile();
  const countries = appConfig.enableCountryData ? loadCountriesDataFromLocalFile() : [];
  const speciesAliases = loadSpeciesAliasesFromLocalFile();
  const factors = await loadConversionFactorsFromLocalFile();
  const vesselsOfInterest = await seedVesselsOfInterest();
  const weightingRisk = await seedWeightingRisk();
  const speciesToggle = await getSpeciesToggle();
  const gearTypes =await loadGearTypesDataFromLocalFile();
  const rfmos = await loadRfmosDataFromLocalFile();

  logger.info(`Finished reading data from local file system, previously species: ${SPECIES.length}, seasonalFish: ${SEASONALFISH.length}, countries: ${COUNTRIES.length}, factors: ${CONVERSION_FACTORS.length}, speciesAliases: ${Object.keys(SPECIES_ALIASES).length}, commodityCodes: ${COMMODITY_CODES.length}`);
  updateCache({species, allSpecies, seasonalFish, countries, factors, speciesAliases, commodityCodes, gearTypes, rfmos});
  logger.info(`Finished loading data into cache from local file system, currently species: ${SPECIES.length}, seasonalFish: ${SEASONALFISH.length}, countries: ${COUNTRIES.length}, factors: ${CONVERSION_FACTORS.length}, speciesAliases: ${Object.keys(SPECIES_ALIASES).length}, commodityCodes: ${COMMODITY_CODES.length}`);

  logger.info("Start setting the blocking rules");
  seedBlockingRules();
  logger.info("Finished saving the blocking rules");

  logger.info(`Start setting the vessels of interest, previously vessels of interest: ${VESSELS_OF_INTEREST.length}`);
  updateVesselsOfInterestCache(vesselsOfInterest);
  logger.info(`Finished saving vessels of interest, currently vessels of interest: ${VESSELS_OF_INTEREST.length}`);

  logger.info(`Start setting the weighting risk, previously exporterWeight: ${WEIGHTING.exporterWeight}, vesselWeight: ${WEIGHTING.vesselWeight}, speciesWeight: ${WEIGHTING.speciesWeight}, threshold: ${WEIGHTING.threshold}`);
  updateWeightingCache(weightingRisk);
  logger.info(`Finish setting the weighting risk, currently exporterWeight: ${WEIGHTING.exporterWeight}, vesselWeight: ${WEIGHTING.vesselWeight}, speciesWeight: ${WEIGHTING.speciesWeight}, threshold: ${WEIGHTING.threshold}`);

  logger.info(`Start setting the species toggle, previously: ${SPECIES_TOGGLE}`);
  updateSpeciesToggleCache(speciesToggle);
  logger.info(`Finish setting the species toggle, currently: ${SPECIES_TOGGLE}`);

}

export const loadProdFishCountriesAndSpecies = async () => {
  logger.info('[LOAD-PROD-CONFIG] Loading data from blob storage in production mode');

  try {
    const blobStorageConnStr = appConfig.blobStorageConnection;

    logger.debug('[LOAD-PROD-CONFIG] loadAllSpecies');
    const allSpecies = await loadAllSpecies(blobStorageConnStr);

    logger.debug('[LOAD-PROD-CONFIG] loadSpeciesData');
    const species = await loadSpeciesData(blobStorageConnStr);

    logger.debug('[LOAD-PROD-CONFIG] loadCommodityData');
    const commodityCodes = await loadCommodityCodeData(blobStorageConnStr);

    logger.debug('[LOAD-PROD-CONFIG] loadSeasonalFishData');
    const seasonalFish = await loadSeasonalFishData(blobStorageConnStr);

    logger.debug(`[LOAD-PROD-CONFIG] loadCountriesData ? ${appConfig.enableCountryData}`);
    const countries = appConfig.enableCountryData ? await loadCountriesData() : [];

    logger.debug('[LOAD-PROD-CONFIG] loadConversionFactorsData');
    const factors = await loadConversionFactorsData(blobStorageConnStr);

    logger.debug('[LOAD-PROD-CONFIG] getVesselsOfInterest');
    const vesselsOfInterest = await getVesselsOfInterest();

    logger.debug('[LOAD-PROD-CONFIG] getWeightingRisk');
    const weightingRisk = await getWeightingRisk();

    logger.debug('[LOAD-PROD-CONFIG] getSpeciesToggle');
    const speciesToggle = await getSpeciesToggle();

    logger.debug('[LOAD-PROD-CONFIG] loadSpeciesAliases');
    const speciesAliases = await loadSpeciesAliases(blobStorageConnStr);

    logger.debug('[LOAD-PROD-CONFIG] loadGearTypesData');
    const gearTypes = await loadGearTypesData(blobStorageConnStr);

    logger.debug('[LOAD-PROD-CONFIG] loadRfmosData');
    const rfmos = await loadRfmosDataFromAzureBlob(blobStorageConnStr);

    logger.info(`[LOAD-PROD-CONFIG] Finished reading data, previously species: ${SPECIES.length}, countries: ${COUNTRIES.length}, speciesAliases: ${Object.keys(SPECIES_ALIASES).length}, commodityCodes: ${COMMODITY_CODES.length}`);
    updateCache({species, allSpecies, seasonalFish, countries, factors, speciesAliases, commodityCodes, gearTypes, rfmos});
    logger.info(`[LOAD-PROD-CONFIG] Finished loading data into cache, currently species: ${SPECIES.length}, seasonalFish: ${SEASONALFISH.length}, countries: ${COUNTRIES.length}, speciesAliases: ${Object.keys(SPECIES_ALIASES).length}, commodityCodes: ${COMMODITY_CODES.length}`);

    logger.info(`[LOAD-PROD-CONFIG] Finished reading vessels of interest, previously: ${VESSELS_OF_INTEREST.length}`);
    updateVesselsOfInterestCache(vesselsOfInterest);
    logger.info(`[LOAD-PROD-CONFIG] Finished loading vessels of interest, currently: ${VESSELS_OF_INTEREST.length}`);

    logger.info(`[LOAD-PROD-CONFIG] Finished reading weighting risk, previously exporterWeight: ${WEIGHTING.exporterWeight}, vesselWeight: ${WEIGHTING.vesselWeight}, speciesWeight: ${WEIGHTING.speciesWeight}, threshold: ${WEIGHTING.threshold}`);
    updateWeightingCache(weightingRisk);
    logger.info(`[LOAD-PROD-CONFIG] Finished loading weighting, currently exporterWeight: ${WEIGHTING.exporterWeight}, vesselWeight: ${WEIGHTING.vesselWeight}, speciesWeight: ${WEIGHTING.speciesWeight}, threshold: ${WEIGHTING.threshold}`);

    logger.info(`[LOAD-PROD-CONFIG] Finished reading the species toggle, previously: ${SPECIES_TOGGLE}`);
    updateSpeciesToggleCache(speciesToggle);
    logger.info(`[LOAD-PROD-CONFIG] Finished loading the species toggle, currently: ${SPECIES_TOGGLE}`);
  }
  catch (e) {
    logger.error(`[ERROR][LOADING PROD MODE], ${e}`);
    throw e;
  }
};

export const loadFishCountriesAndSpecies = async () =>
  (appConfig.inDev) ? loadLocalFishCountriesAndSpecies() : loadProdFishCountriesAndSpecies();

export const loadVessels = async () => {
  let vessels = undefined;
  if (appConfig.inDev) {
    vessels = await loadVesselsDataFromLocalFile();
  } else {
    const blobStorageConnStr = appConfig.blobStorageConnection;
    vessels = await loadVesselsData(blobStorageConnStr);
  }

  updateVesselsCache(addVesselNotFound(vessels));
}

export const loadEodSettings = async () => {
  const eodSettings: IEodSetting[] = await getEodSettings();
  updateEodSettingsCache(eodSettings);
}

export const isQuotaSpecies = (speciesCode: string) => {
  const speciesData = CONVERSION_FACTORS.find(f => f.species == speciesCode);
  return speciesData ? speciesData.quotaStatus === QuotaStatuses.quota : false;
}

export const getVesselsData: () => IVessel[] = () => { return VESSELS };
export const getVesselsIdx = () => { return VESSELS_IDX };

export const getSpeciesData = (type: string) => {

  return (type == 'uk') ? SPECIES : ALLSPECIES;
};

export const getCommodityCodes = () => COMMODITY_CODES;

export const getSeasonalFish = () => { return SEASONALFISH };

export const getCountries = () => COUNTRIES;

export const getSpeciesAliases = (speciesCode: string): string[] => SPECIES_ALIASES[speciesCode] ?? [];

export const getVesselRiskScore = (pln: string) =>
  VESSELS_OF_INTEREST.find(v => v && v.registrationNumber === pln) ?
    1 : 0.5;

export const getSpeciesRiskScore = (speciesCode: string) => {
  const speciesData = CONVERSION_FACTORS.find(f => f.species === speciesCode);
  return speciesData?.riskScore ?? 0.5;
};

export const getToLiveWeightFactor = (species: string, state: string, presentation: string): number => {
  const conversionFactor: IConversionFactor = getConversionFactor(species, state, presentation);
  return (conversionFactor?.toLiveWeightFactor === undefined || !conversionFactor?.toLiveWeightFactor) ? 1 : conversionFactor.toLiveWeightFactor;
}

export const getConversionFactor = (species: string, state: string, presentation: string): IConversionFactor | undefined =>
  CONVERSION_FACTORS.find((f: IConversionFactor) => f.species === species && f.state === state && f.presentation === presentation);

export const getAllConversionFactors = (): IConversionFactor[] =>
  CONVERSION_FACTORS;

const getExactMatchScore = (
  accountId: string,
  contactId: string | null,
): number | undefined => {
  return EXPORTER_BEHAVIOUR.find(
    (e) => e.accountId === accountId && e.contactId === contactId,
  )?.score;
};

const getScoreByContactOnly = (
  contactId: string | null,
): number | undefined => {
  return EXPORTER_BEHAVIOUR.find(
    (e) => e.contactId === contactId && !e.accountId,
  )?.score;
};

const getScoreByAccountOnly = (accountId: string): number | undefined => {
  return EXPORTER_BEHAVIOUR.find(
    (e) => e.accountId === accountId && !e.contactId,
  )?.score;
};
  
  
export const getExporterRiskScore = (
  accountId: string | null,
  contactId: string | null,
) => {
  const defaultScore = 1.0;

  if ((!accountId && !contactId) || !EXPORTER_BEHAVIOUR.length) {
    return defaultScore;
  }
  if (!accountId) {
    return getScoreByContactOnly(contactId) ?? defaultScore;
  }

  return (
    getExactMatchScore(accountId, contactId) ??
    getScoreByContactOnly(contactId) ??
    getScoreByAccountOnly(accountId) ??
    defaultScore
  );
};

export const getWeighting = (type: WEIGHT): number => WEIGHTING[type];

export const getRiskThreshold = (): number => WEIGHTING['threshold'];

export const getSpeciesRiskToggle = (): boolean => SPECIES_TOGGLE;

export const getGearTypes = () => { return GEAR_TYPES };

export const getRfmos = (): any[] => { return RFMO_AREAS };

export const updateCache = ({
  species,
  allSpecies,
  seasonalFish,
  countries,
  factors,
  speciesAliases,
  commodityCodes,
  gearTypes,
  rfmos
}: CacheType) => {
  if (species) {
    SPECIES = species;
  }

  if (allSpecies) {
    ALLSPECIES = allSpecies;
  }

  if (seasonalFish) {
    SEASONALFISH = seasonalFish;
  }

  if (countries) {
    COUNTRIES = countries;
  }

  if (factors) {
    CONVERSION_FACTORS = factors.map(factorData => {
      return {
        species: factorData.species,
        state: factorData.state,
        presentation: factorData.presentation,
        toLiveWeightFactor: isNaN(factorData.toLiveWeightFactor) ? undefined : Number(factorData.toLiveWeightFactor),
        quotaStatus: factorData.quotaStatus,
        riskScore: isNaN(factorData.riskScore) ? undefined : Number(factorData.riskScore)
      }
    });
  }

  if (speciesAliases) {
    SPECIES_ALIASES = speciesAliases;
  }

  if (commodityCodes) {
    COMMODITY_CODES = commodityCodes;
  }

  if(gearTypes) {
    GEAR_TYPES = gearTypes;
  }

  if (rfmos) {
    RFMO_AREAS = rfmos;
  }
}

export const updateVesselsCache = (vessels: IVessel[] | undefined) => {
  if (vessels) {
    VESSELS = vessels;
    VESSELS_IDX = generateIndex(VESSELS);
  }
}

export const addVesselNotFound = (vessels: IVessel[] | undefined): IVessel[] => {
  const updatedVessels: IVessel[] = [...vessels];

  if (appConfig.vesselNotFoundEnabled) {
    updatedVessels.push({
      fishingVesselName: appConfig.vesselNotFoundName,
      ircs: '',
      flag: 'GBR',
      homePort: 'N/A',
      registrationNumber: appConfig.vesselNotFoundPln,
      imo: null,
      fishingLicenceNumber: '27619',
      fishingLicenceValidFrom: '2016-07-01T00:01:00',
      fishingLicenceValidTo: '2300-12-31T00:01:00',
      adminPort: 'N/A',
      rssNumber: 'N/A',
      vesselLength: 0,
      cfr: null,
      licenceHolderName: 'licenced holder not found',
      vesselNotFound: true
    });
  }

  return updatedVessels;
}

export const updateWeightingCache = (weighting: IWeighting) => {
  if (weighting)
    WEIGHTING = weighting;
}

export const updateVesselsOfInterestCache = (vesselsOfInterest: IVesselOfInterest[]) => {
  if (Array.isArray(vesselsOfInterest))
    VESSELS_OF_INTEREST = vesselsOfInterest;
}

export const updateSpeciesToggleCache = (speciesToggle: ISpeciesRiskToggle): void => {
  SPECIES_TOGGLE = speciesToggle.enabled;
};

export const updateEodSettingsCache = (eodSettings: IEodSetting[]): void => {
  EOD_SETTINGS = eodSettings;
};

export const vesselLengthToSize = (vesselLength: number | undefined): vesselSizeGroup => {
  if (vesselLength < 10) {
    return 'Under 10m';
  } else if (vesselLength > 12) {
    return '12m+';
  } else {
    return '10-12m';
  }
}

export const getDataEverExpected = (licence: ILicence): boolean => {
  const group: vesselSizeGroup = vesselLengthToSize(licence.vesselLength);
  return EOD_SETTINGS.some((setting: IEodSetting) => setting.da === licence.da && setting.vesselSizes.includes(group));
}

export const getLandingDataRuleDate = (landingDate: string, licence: ILicence, rule: 'expectedDate' | 'endDate', landingDataExpectedDate?: string): string => {
  const group: vesselSizeGroup = vesselLengthToSize(licence.vesselLength);
  const rulesForDa: IEodSetting | undefined = EOD_SETTINGS.find((setting: IEodSetting) => setting.da === licence.da);

  const hasIncorrectLandingDateRuleParams = () =>
    rulesForDa?.rules === undefined ||
    (rule === "endDate" && !moment(landingDataExpectedDate, 'YYYY-MM-DD', true).isValid());

  const getDefaultDates = () => rule === 'expectedDate' ? moment.utc().format('YYYY-MM-DD') : moment.utc().add(14, 'day').format('YYYY-MM-DD');

  if (hasIncorrectLandingDateRuleParams()) {
    return getDefaultDates();
  }

  const daysFromFoundRule = rulesForDa.rules
    .filter((setting: IEodRule) => setting.ruleType === rule)
    .find((setting: IEodRule) => setting.vesselSize.includes(group));

  if (daysFromFoundRule) {
    return moment.utc(rule === 'expectedDate' ? landingDate : landingDataExpectedDate).add(daysFromFoundRule.numberOfDays, 'day').format('YYYY-MM-DD');
  }

  return getDefaultDates();
}

export const refreshRiskingData = async () => {
  const vesselsOfInterest = await getVesselsOfInterest();
  const weightingRisk = await getWeightingRisk();
  const speciesToggle = await getSpeciesToggle();

  updateVesselsOfInterestCache(vesselsOfInterest);
  updateWeightingCache(weightingRisk);
  updateSpeciesToggleCache(speciesToggle);

  await loadEodSettings();
}

export const loadAllSpecies = async (blobConnStr: string): Promise<IAllSpecies[]> => {
  try {
    logger.info('[BLOB-STORAGE-DATA-LOAD][ALL-SPECIES]');
    return await blob.getAllSpecies(blobConnStr);
  } catch (e) {
    throw new Error(`[BLOB-STORAGE-LOAD-ERROR][ALL-SPECIES] ${e}`)
  }
}

export const loadSpeciesData = async (blobConnStr: string): Promise<any[] | undefined> => {
  try {
    logger.info('[BLOB-STORAGE-DATA-LOAD][SPECIES]');
    return await blob.getSpeciesData(blobConnStr);
  } catch (e) {
    throw new Error(`[BLOB-STORAGE-LOAD-ERROR][SPECIES] ${e}`)
  }
}

export const loadCommodityCodeData = async (blobConnStr: string): Promise<any[] | undefined> => {
  try {
    logger.info('[BLOB-STORAGE-DATA-LOAD][COMMODITY-CODES]');
    return await blob.getCommodityCodeData(blobConnStr);
  } catch (e) {
    throw new Error(`[BLOB-STORAGE-LOAD-ERROR][COMMODITY-CODES] ${e}`)
  }
}

export const loadVesselsData = async (blobConnStr: string): Promise<IVessel[] | undefined> => {
  try {
    logger.info('[BLOB-STORAGE-DATA-LOAD][VESSELS]');
    return await blob.getVesselsData(blobConnStr);
  } catch (e) {
    throw new Error(`[BLOB-STORAGE-LOAD-ERROR][VESSELS] ${e}`)
  }
}

export const loadSeasonalFishData = async (blobConnStr: string): Promise<any[] | undefined> => {
  try {
    logger.info('[BLOB-STORAGE-DATA-LOAD][SEASONAL-FISH]');
    return await blob.getSeasonalFishData(blobConnStr);
  } catch (e) {
    throw new Error(`[BLOB-STORAGE-LOAD-ERROR][SEASONAL-FISH] ${e}`)
  }
}

export const loadConversionFactorsData = async (blobConnStr: string): Promise<IConversionFactor[]> => {
  try {
    logger.info('[BLOB-STORAGE-DATA-LOAD][CONVERSION-FACTORS]');
    return await blob.getConversionFactorsData(blobConnStr);
  } catch (e) {
    throw new Error(`[BLOB-STORAGE-LOAD-ERROR][CONVERSION-FACTORS] ${e}`)
  }
}

export const loadCountriesData = async (): Promise<ICountry[] | undefined> => {
  try {
    return await CountriesApi.loadCountryData();
  } catch (e) {
    logger.error(`[LOAD-COUNTRIES-DATA][COUNTRIES-API][ERROR][${e.stack ?? e}]`);
  }
}

export const loadGearTypesData = async (blobConnStr: string): Promise<any[] | undefined> => {
  try {
    logger.info('[BLOB-STORAGE-DATA-LOAD][GEAR-TYPES]');
    return await blob.getGearTypesData(blobConnStr);
  } catch (e) {
    throw new Error(`[BLOB-STORAGE-LOAD-ERROR][GEAR-TYPES] ${e}`)
  }
}

export const loadRfmosDataFromAzureBlob = async (blobConnStr: string): Promise<string[] | undefined> => {
  try {
    logger.info('[BLOB-STORAGE-DATA-LOAD][RFMO-AREAS]');
    return await blob.getRfmosData(blobConnStr);
  } catch (e) {
    throw new Error(`[BLOB-STORAGE-LOAD-ERROR][RFMO-AREAS] ${e}`)
  }
}

export const loadAllSpeciesFromLocalFile = async (): Promise<IAllSpecies[] | undefined> => {
  const path = `${__dirname}/../../data/allSpecies.csv`;
  try {
    return await file.getSpeciesDataFromCSV(path);
  } catch (e) {
    logger.error(e);
    logger.error(`[LOCAL-LOAD-SPECIES-ERROR][PATH][${path}]`);
  }
}

export const loadSpeciesDataFromLocalFile = async (speciesFilePath?: string): Promise<any[] | undefined> => {
  const path = speciesFilePath || `${__dirname}/../../data/commodity_code.txt`;
  try {
    return await file.getSpeciesDataFromFile(path);

  } catch (e) {
    logger.error(e);
    logger.error(`Cannot load species file from local file system, path: ${path}`);
  }
}

export const loadVesselsDataFromLocalFile = async (vesselFilePath?: string): Promise<IVessel[] | undefined> => {
  const path = vesselFilePath || `${__dirname}/../../data/vessels.json`;
  try {
    return file.getVesselsDataFromFile(path);
  } catch (e) {
    logger.error(e);
    logger.error(`Cannot load vessels file from local file system, path: ${path}`);
  }
}

export const loadSeasonalFishDataFromLocalFile = async (seasonalFishFilePath?: string): Promise<any[] | undefined> => {
  const path = seasonalFishFilePath || `${__dirname}/../../data/seasonal_fish.csv`;
  try {
    return await file.getSeasonalFishDataFromCSV(path);
  } catch (e) {
    logger.error(e);
    logger.error(`Cannot load seasonal fish file from local file system, path: ${path}`);
  }
}

export const loadCountriesDataFromLocalFile = (countriesFilePath?: string): ICountry[] => {
  const path = countriesFilePath || `${__dirname}/../../data/countries.json`;
  try {
    return file.getCountriesDataFromFile(path).map(country => ({
      officialCountryName: country.name,
      isoCodeAlpha2: country['alpha-2'],
      isoCodeAlpha3: country['alpha-3'],
      isoNumericCode: country['country-code']
    }));
  } catch (e) {
    logger.error(e);
    logger.error(`Cannot load countries file from local file system, path: ${path}`);
    return [];
  }
};

export const loadSpeciesAliasesFromLocalFile = (speciesmismatchFilePath?: string) => {
  const path = speciesmismatchFilePath || `${__dirname}/../../data/speciesmismatch.json`;
  try {
    return file.getSpeciesAliasesFromFile(path)
      .map((species) => ({ [species.speciesCode]: species.speciesAlias }))
      .reduce((result, current) => Object.assign(result, current), {});
  } catch (e) {
    logger.error(e);
    logger.error(`Cannot load speciesmismatch file from local file system, path: ${path}`);
    return {};
  }
};

export const loadSpeciesAliases = async (blobConnStr: string): Promise<any> => {
  try {
    logger.info('[BLOB-STORAGE-DATA-LOAD][SPECIES-ALIASES]');
    return await blob.getSpeciesAliases(blobConnStr);
  } catch (e) {
    throw new Error(`[BLOB-STORAGE-LOAD-ERROR][SPECIES-ALIASES] ${e}`)
  }
}

export const loadExporterBehaviour = async () =>
  EXPORTER_BEHAVIOUR = (appConfig.inDev)
    ? await loadExporterBehaviourFromLocalFile()
    : await loadExporterBehaviourFromAzureBlob(appConfig.blobStorageConnection);

export const loadExporterBehaviourFromLocalFile = async (): Promise<IExporterBehaviour[]> => {
  const path = `${__dirname}/../../data/exporter_behaviour.csv`;
  try {
    return await file.getExporterBehaviourFromCSV(path);
  }
  catch (e) {
    logger.error(e);
    logger.error(`Cannot load exporter behaviour file from local file system, path: ${path}`);
    return [];
  }
};

export const loadExporterBehaviourFromAzureBlob = async (blobConnStr: string): Promise<IExporterBehaviour[]> => {
  try {
    logger.info('[BLOB-STORAGE-DATA-LOAD][EXPORTER-BEHAVIOUR]');
    return await blob.getExporterBehaviourData(blobConnStr);
  }
  catch (e) {
    throw new Error(`[BLOB-STORAGE-LOAD-ERROR][EXPORTER-BEHAVIOUR] ${e}`);
  }
};

export const loadGearTypesDataFromLocalFile = async (gearTypesFilePath?: string): Promise<any[] | undefined> => {
  const path = gearTypesFilePath || `${__dirname}/../../data/geartypes.csv`;
  try {
    return await file.getGearTypesDataFromCSV(path);
  } catch (e) {
    logger.error(e);
    logger.error(`Cannot load gear types file from local file system, path: ${path}`);
  }
};

export const loadRfmosDataFromLocalFile = async (rfmosFilePath?: string): Promise<string[] | undefined> => {
  const path = rfmosFilePath || `${__dirname}/../../data/rfmoList.csv`;
  try {
    return await file.getRfmosDataFromCSV(path);
  } catch (e) {
    logger.error(e);
    logger.error(`Cannot load rfmo list file from local file system, path: ${path}`);
  }
}
