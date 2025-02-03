export type RiskingVesselPayload = { pln: string, vesselName: string, homePort: string, da }
export type RiskSpeciesTogglePayload = { enabled: boolean }
export type RiskWeightingPayload = {exporter: number ,species: number,vessel: number}
export type RiskThresholdPayload = {threshold: number}