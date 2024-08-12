import { ISdPsQueryResult } from "./query";

export const ValidationRules = Object.freeze(
  {
    THREE_C : '3C',
    THREE_D : '3D',
    FOUR_A : '4A',
    NO_DATA : 'noDataSubmitted',
    NO_LICENCE_HOLDER : 'noLicenceHolder'
  }
)


export interface IOnlineValidationReportItemKey {
  species: string;
  presentation: string;
  state: string;
  date: Date;
  vessel: string;
}

export interface IOnlineValidationReportItem {
  species: string;
  presentation: string;
  state: string;
  date: Date;
  vessel: string;
  failures: string[];
}

export interface IForeignCatchCertificateValidationDetail {
    certificateNumber : string,
    product: string
}
export interface IForeignCatchCertificateValidationResult {
    isValid : boolean,
    details: IForeignCatchCertificateValidationDetail[]
    rawData: ISdPsQueryResult[]
}