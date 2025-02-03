import { ISpeciesRiskToggle, IWeighting } from "../landings/types/appConfig/risking";
import * as RiskingPersistence from "../landings/persistence/risking";

export const getSpeciesToggle = async (): Promise<ISpeciesRiskToggle> => {
    const result = await RiskingPersistence.getSpeciesToggle();

    return result || { enabled: true };
};

export const setSpeciesToggle = async (input: ISpeciesRiskToggle): Promise<void> => {
    await RiskingPersistence.setSpeciesToggle(input);
};

export const getWeighting = async (): Promise<IWeighting> =>
  await RiskingPersistence.getWeightingRisk();

export const setWeighting = async (exporter: number, species: number, vessel: number): Promise<void> =>
  await RiskingPersistence.setWeightingRisk(exporter, species, vessel);

export const setThreshold = async (threshold: number): Promise<void> =>
  await RiskingPersistence.setThresholdRisk(threshold);