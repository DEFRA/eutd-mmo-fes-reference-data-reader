import { IProduct } from "./products.interfaces";
import { IVessel } from "./vessels.interfaces";

export interface IUploadedLanding {
  rowNumber : number,
  originalRow : string,
  productId : string,
  product : IProduct,
  landingDate: string,
  faoArea: string,
  vessel : IVessel,
  vesselPln: string,
  exportWeight: number,
  errors : Array<IErrorObject | string>
}

export interface IErrorObject {
  key : string,
  params : number[]
}