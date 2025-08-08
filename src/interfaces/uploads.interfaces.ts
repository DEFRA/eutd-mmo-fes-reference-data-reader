import { ICountry } from 'mmo-shared-reference-data';
import { IProduct } from './products.interfaces';
import { IVessel } from './vessels.interfaces';

export interface IUploadedLanding {
  rowNumber: number;
  originalRow: string;
  productId: string;
  product: IProduct;
  startDate?: string;
  landingDate: string;
  faoArea: string;
  highSeasArea?: string;
  rfmoCode?: string;
  rfmoName?: string;
  eezCode?: string;
  eezData?: ICountry[];
  vessel: IVessel;
  vesselPln: string;
  exportWeight: number;
  gearCategory?: string;
  gearName?: string;
  gearCode?: string;
  errors: Array<IErrorObject | string>;
}

export interface IErrorObject {
  key: string;
  params: (number | string)[];
}
export interface UploadedLandedFieldMeta {
  optional?: boolean;
}
export const UploadedLandingMeta: Record<string, UploadedLandedFieldMeta> = {
  productId: {},
  startDate: { optional: true },
  landingDate: {},
  faoArea: {},
  highSeasArea: { optional: true },
  eezCode: { optional: true },
  rfmoCode: { optional: true },
  vesselPln: {},
  gearCode: { optional: true },
  exportWeight: {},
};
