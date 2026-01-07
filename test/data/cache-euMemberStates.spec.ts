import { getEuMemberStates, updateCache } from '../../src/data/cache';

describe('EU Member States cache functions', () => {

  beforeEach(() => {
    // Reset cache before each test
    updateCache({
      species: undefined,
      allSpecies: undefined,
      seasonalFish: undefined,
      countries: undefined,
      factors: undefined,
      commodityCodes: undefined,
      euMemberStates: []
    });
  });

  describe('getEuMemberStates', () => {
    it('should return empty array when no EU member states are cached', () => {
      const result = getEuMemberStates();
      expect(result).toEqual([]);
    });

    it('should return EU member states when cached', () => {
      const euStates = ['Austria', 'Belgium', 'France', 'Germany'];
      updateCache({
        species: undefined,
        allSpecies: undefined,
        seasonalFish: undefined,
        countries: undefined,
        factors: undefined,
        commodityCodes: undefined,
        euMemberStates: euStates
      });

      const result = getEuMemberStates();
      expect(result).toEqual(euStates);
    });
  });

  describe('updateCache with EU member states', () => {
    it('should update EU member states in cache', () => {
      const newEuStates = ['Italy', 'Portugal', 'Greece'];

      updateCache({
        species: undefined,
        allSpecies: undefined,
        seasonalFish: undefined,
        countries: undefined,
        factors: undefined,
        commodityCodes: undefined,
        euMemberStates: newEuStates
      });

      expect(getEuMemberStates()).toEqual(newEuStates);
    });

    it('should not update EU member states when undefined', () => {
      const initialStates = ['Austria', 'Belgium'];
      updateCache({
        species: undefined,
        allSpecies: undefined,
        seasonalFish: undefined,
        countries: undefined,
        factors: undefined,
        commodityCodes: undefined,
        euMemberStates: initialStates
      });

      updateCache({
        species: undefined,
        allSpecies: undefined,
        seasonalFish: undefined,
        countries: undefined,
        factors: undefined,
        commodityCodes: undefined,
        euMemberStates: undefined
      });

      expect(getEuMemberStates()).toEqual(initialStates);
    });
  });
});
