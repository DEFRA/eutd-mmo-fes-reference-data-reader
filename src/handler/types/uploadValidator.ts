import { IProduct } from "../../interfaces/products.interfaces"
import { IUploadedLanding } from "../../interfaces/uploads.interfaces"

export type UploadValidatorPayload = {
    landings: IUploadedLanding[],
    products: IProduct[],
    landingLimitDaysInFuture: number
  }