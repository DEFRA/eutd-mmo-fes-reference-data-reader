import logger from '../../src/logger';
import * as file from "../../src/data/local-file";
import * as conversionFactorService from '../../src/landings/persistence/conversionFactors';
import * as cacheService from '../../src/data/cache';

const sinon = require('sinon');

const testData = {
    species: 'ANE',
    state: 'FRE',
    presentation: 'GUT',
    toLiveWeightFactor: 1.04,
    riskScore: 1.0
};

const testData2 = {
    presentation: 'GUT',
    species: 'BSF',
    state: 'FRO',
    toLiveWeightFactor: 1,
    riskScore: 1.0
};

describe('get conversion factors', () => {
    let mockGetAllConversionFactors;
    let mockGetToLiveWeightFactor;

    let mockLoggerInfo;
    let mockLoggerError;

    beforeEach(() => {
        mockLoggerInfo = sinon.spy(logger, 'info');
        mockLoggerError = sinon.spy(logger, 'error');

        mockGetAllConversionFactors = sinon.stub(cacheService, 'getAllConversionFactors');
        mockGetToLiveWeightFactor = sinon.stub(cacheService, 'getToLiveWeightFactor');
    });

    afterEach(() => {
        mockLoggerInfo.restore();
        mockLoggerError.restore();

        mockGetAllConversionFactors.restore();
        mockGetToLiveWeightFactor.restore();
    });

    it('should return one conversion factor', async () => {
        mockGetToLiveWeightFactor.returns(1);

        const products = [{
            species: 'ANE',
            state: 'FRE',
            presentation: 'GUT'
        }];

        const result = conversionFactorService.getConversionFactors(products);

        expect(result.length).toEqual(1);
        expect(mockLoggerInfo.getCall(0).args[0]).toEqual('[GET-CONVERSION-FACTOR][species:ANE state:FRE presentation:GUT][SUCCESS]');
    });

    it('should return two conversion factors', async () => {
        mockGetToLiveWeightFactor.onCall(0).returns(1.04);
        mockGetToLiveWeightFactor.onCall(1).returns(1);

        const products = [{
            species: 'ANE',
            state: 'FRE',
            presentation: 'GUT',
            riskScore: 1.0
        },{
            species: 'BSF',
            state: 'FRO',
            presentation: 'GUT',
            riskScore: 1.0
        }];

        const result = conversionFactorService.getConversionFactors(products);

        expect(result.length).toEqual(2);
        expect(mockLoggerInfo.getCall(0).args[0]).toEqual('[GET-CONVERSION-FACTOR][species:ANE state:FRE presentation:GUT][SUCCESS]');
        expect(mockLoggerInfo.getCall(1).args[0]).toEqual('[GET-CONVERSION-FACTOR][species:BSF state:FRO presentation:GUT][SUCCESS]');

        expect(result[0]).toEqual(testData);
        expect(result[1]).toEqual(testData2);
    });

    it('should return toLiveWeightFactor=1 if conversion factor if not found', async () => {
        mockGetToLiveWeightFactor.returns(1);

        const products = [{
            species: 'ANE',
            state: 'FRE',
            presentation: 'GUT'
        }];

        const result = conversionFactorService.getConversionFactors(products);

        expect(result.length).toEqual(1);
        expect(result).toEqual([{
            species: 'ANE',
            state: 'FRE',
            presentation: 'GUT',
            toLiveWeightFactor: 1
        }]);
        expect(mockLoggerInfo.getCall(0).args[0]).toEqual('[GET-CONVERSION-FACTOR][species:ANE state:FRE presentation:GUT][SUCCESS]');
    });

    it('should return all conversion factors if no products are passed in', async () => {
        mockGetAllConversionFactors.onCall(0).returns(testData)

        const result = conversionFactorService.getConversionFactors();

        expect(result).toEqual(testData);
        expect(mockLoggerInfo.getCall(0).args[0]).toEqual('[GET-CONVERSION-FACTOR][GETTING-ALL-FACTORS][SUCCESS]');
    });
});

describe('Load conversion factors', () => {
    let mockGetConversionFactors, mockLoggerInfo;

    const factorsJson = [{ species: 'COD', factor: 1 }, { species: 'HER', factor: 2 }];

    beforeEach(() => {
        mockGetConversionFactors = jest.spyOn(file, 'getConversionFactors');
        mockGetConversionFactors.mockResolvedValue(factorsJson);

        mockLoggerInfo = jest.spyOn(logger, 'info');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    })

    it('should call insert many with the right params', async () => {
        await conversionFactorService.loadConversionFactorsFromLocalFile();
        expect(mockLoggerInfo).toHaveBeenCalledWith('[CONVERSION-FACTORS][LOAD-CONVERSION-FACTORS][2]');

        expect(mockGetConversionFactors).toHaveBeenCalledTimes(1);
    });

    it('should return the factors loaded from file', async () => {
        const factors = await conversionFactorService.loadConversionFactorsFromLocalFile();

        expect(factors).toBe(factorsJson);
    });

    it('should return no factors if none provided', async () => {
      mockGetConversionFactors.mockResolvedValue(undefined);

      const factors = await conversionFactorService.loadConversionFactorsFromLocalFile();

      expect(mockLoggerInfo).toHaveBeenCalledWith('[CONVERSION-FACTORS][LOAD-CONVERSION-FACTORS][0]');
      expect(factors).toStrictEqual([]);
  });
});