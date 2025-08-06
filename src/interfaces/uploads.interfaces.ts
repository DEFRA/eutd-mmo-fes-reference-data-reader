import { IProduct } from "./products.interfaces";
import { IVessel } from "./vessels.interfaces";

export interface IUploadedLanding {
  rowNumber : number,
  originalRow : string,
  productId : string,
  product : IProduct,
  startDate? : string,
  landingDate: string,
  faoArea: string,
  vessel : IVessel,
  vesselPln: string,
  exportWeight: number,
  gearCategory?: string,
  gearName?: string,
  gearCode?: string,
  highSeasArea?: string;
  rfmoCode?: string,
  rfmoName?: string,
  eezCode?: string,
  eezName?: string,
  errors : Array<IErrorObject | string>
}

export interface IErrorObject {
  key : string,
  params : (number | string)[]
}