import * as Controllers from "../../src/controllers/risking";
import * as RiskingPersistence from "../../src/landings/persistence/risking";
import { ISpeciesRiskToggle } from "../../src/landings/types/appConfig/risking";

describe('getSpeciesToggle', () => {

  let mockGetSpecies;

  beforeEach(() => {
    mockGetSpecies = jest.spyOn(RiskingPersistence, 'getSpeciesToggle')
  });

  afterEach(() => {
    mockGetSpecies.mockRestore();
  });

  it('will get the species toggle when its set to true', async () => {

    const data: ISpeciesRiskToggle = { enabled: true };

    mockGetSpecies.mockResolvedValue(data);

    const result = await Controllers.getSpeciesToggle();

    expect(result).toMatchObject(data);

  });

  it('will get the species toggle when its set to false', async () => {

    const data: ISpeciesRiskToggle = { enabled: false };

    mockGetSpecies.mockResolvedValue(data);

    const result = await Controllers.getSpeciesToggle();

    expect(result).toMatchObject(data);

  });

  it('will default the toggle to being enabled if has not been set', async () => {

    mockGetSpecies.mockResolvedValue(null);

    const result = await Controllers.getSpeciesToggle();

    expect(result).toMatchObject({ enabled: true });

  });

});

describe('setSpeciesToggle', () => {

  let mockSetSpecies;

  beforeEach(() => {
    mockSetSpecies = jest.spyOn(RiskingPersistence, 'setSpeciesToggle');
    mockSetSpecies.mockResolvedValue(null);
  });

  afterEach(() => {
    mockSetSpecies.mockRestore();
  });

  it('will set the species toggle', async () => {

    const input = { enabled: true };

    await Controllers.setSpeciesToggle(input);

    expect(mockSetSpecies).toHaveBeenCalledWith(input);

  });

});

describe('getWeighting', () => {

  let mockGetWeighting;

  beforeEach(() => {
    mockGetWeighting = jest.spyOn(RiskingPersistence, 'getWeightingRisk');
  });

  afterEach(() => {
    mockGetWeighting.mockRestore();
  });

  it('will invoke getWeightingRisk and return the result', async () => {

    const data = {test: 'test'};

    mockGetWeighting.mockResolvedValue(data);

    const result = await Controllers.getWeighting();

    expect(result).toMatchObject(data);

  });

});

describe('setWeighting', () => {

  let mockSetWeighting;

  beforeEach(() => {
    mockSetWeighting = jest.spyOn(RiskingPersistence, 'setWeightingRisk');
  });

  afterEach(() => {
    mockSetWeighting.mockRestore();
  });

  it('will invoke setWeighting and return nothing', async () => {

    mockSetWeighting.mockResolvedValue(null);

    const result = await Controllers.setWeighting(1, 2, 3);

    expect(result).toBeNull();
    expect(mockSetWeighting).toHaveBeenCalledWith(1, 2, 3);

  });

});

describe('setThreshold', () => {

  let mockSetThreshold;

  beforeEach(() => {
    mockSetThreshold = jest.spyOn(RiskingPersistence, 'setThresholdRisk');
  });

  afterEach(() => {
    mockSetThreshold.mockRestore();
  });

  it('will invoke setThreshold with the threshold value and return nothing', async () => {

    mockSetThreshold.mockResolvedValue(null);

    const result = await Controllers.setThreshold(3);

    expect(result).toBeNull();
    expect(mockSetThreshold).toHaveBeenCalledWith(3);

  });

});