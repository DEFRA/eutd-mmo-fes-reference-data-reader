import { vesselSizeGroup, IEodRule } from "../../landings/types/appConfig/eodSettings";

export type EodAddRulesPayload = {user: string, da: string, vesselSizes?: vesselSizeGroup[], rule?: IEodRule}