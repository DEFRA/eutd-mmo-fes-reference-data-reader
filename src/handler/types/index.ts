import { IConversionFactor, ICountry } from 'mmo-shared-reference-data';

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
};
