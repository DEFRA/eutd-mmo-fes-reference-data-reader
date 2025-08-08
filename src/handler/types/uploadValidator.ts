import { IProduct } from "../../interfaces/products.interfaces"
import { IUploadedLanding } from "../../interfaces/uploads.interfaces"

export type UploadValidatorPayload = {
  products: IProduct[],
  landingLimitDaysInFuture: number
  landings?: IUploadedLanding[],
  rows?: string[];
}