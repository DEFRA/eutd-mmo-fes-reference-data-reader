import { IConversionFactor, ICountry } from 'mmo-shared-reference-data';
import { Establishment } from '../../interfaces/approvedFoodEstablishments.interface';

export type CacheType = {
  species: any[] | undefined;
  allSpecies: any[] | undefined;
  seasonalFish: any[] | undefined;
  countries: ICountry[] | undefined;
  factors: IConversionFactor[] | undefined;
  speciesAliases?: any;
  commodityCodes: any[] | undefined;
  gearTypes?: any[];
  rfmos?: any[];
  euMemberStates?: string[];
  processingPlants?: Establishment[];
  storageFacilities?: Establishment[];
};
