export interface IProduct {
  id?: string;
  species: string;
  speciesCode: string;
  scientificName: string;
  state: string;
  stateLabel: string;
  presentation: string;
  presentationLabel: string;
  commodity_code: string;
  commodity_code_description: string;
}

export type ISeasonalFishPeriod = {
  fao: string,
  validFrom: string,
  validTo: string
}

export interface ICommodityCode {
  code: string;
  description: string;
  faoName: string;
}

export interface ICommodityCodeExtended extends ICommodityCode {
  stateLabel: string;
  presentationLabel: string;
}