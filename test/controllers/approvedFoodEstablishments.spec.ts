import * as cache from '../../src/data/cache';
import {
  getApprovedProcessingPlants,
  getApprovedStorageFacilities,
} from '../../src/controllers/approvedFoodEstablishments';

const getProcessingPlantsMock = jest.spyOn(cache, 'getProcessingPlants');
const getStorageFacilitiesMock = jest.spyOn(cache, 'getStorageFacilities');

describe('approvedFoodEstablishments controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getApprovedProcessingPlants', () => {
    it('returns processing plants from cache', () => {
      const mockData = [{ id: 'processing-1', tradingName: 'Plant 1' }];
      getProcessingPlantsMock.mockReturnValue(mockData);

      const result = getApprovedProcessingPlants();

      expect(result).toEqual(mockData);
      expect(getProcessingPlantsMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('getApprovedStorageFacilities', () => {
    it('returns storage facilities from cache', () => {
      const mockData = [{ id: 'storage-1', tradingName: 'Storage 1' }];
      getStorageFacilitiesMock.mockReturnValue(mockData);

      const result = getApprovedStorageFacilities();

      expect(result).toEqual(mockData);
      expect(getStorageFacilitiesMock).toHaveBeenCalledTimes(1);
    });
  });
});
