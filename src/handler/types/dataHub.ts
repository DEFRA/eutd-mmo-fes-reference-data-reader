import { ICcQueryResult } from "mmo-shared-reference-data";
import { ISdPsQueryResult } from "../../landings/types/query"

export type DataHubPayloadCertificateIdOnly = {
    certificateId: string,
  }

  export type DataHubPayloadVoid = {
    certificateId: string,
    isFromExporter?: boolean
  }

  export type DataHubPayloadValidationDataCC = {
    validationData: ICcQueryResult[]
  }

  export type DataHubPayloadValidationDataSDPS = {
    validationData: ISdPsQueryResult[]
  }