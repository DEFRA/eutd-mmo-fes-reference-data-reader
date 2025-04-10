import * as SUT from '../../src/services/uploadValidation.service';
import * as SpeciesController from '../../src/controllers/species';
import * as VesselController from '../../src/controllers/vessel';
import * as DataCache from '../../src/data/cache';
import { faoAreas } from '../../src/data/faoAreas';
import moment from 'moment';

describe('uploadValidation.service', () => {

  describe('validateLandings', () => {

    let mockGetSeasonalFish;
    let mockInitialiseErrorsForLanding;
    let mockValidateDateForLanding;
    let mockValidateExportWeightForLanding;
    let mockValidateFaoAreaForLanding;
    let mockValidateProductForLanding;
    let mockValidateVesselForLanding;

    const seasonalFish = ['seasonal fish 1'];
    const landings = [{id: 'landing 1'}, {id: 'landing 2'}] as any[];
    const favourites = ['favourite 1', 'favourite 2'] as any[];
    const landingLimitDaysInFuture = 7;

    beforeEach(() => {
      mockGetSeasonalFish = jest.spyOn(DataCache, 'getSeasonalFish');
      mockGetSeasonalFish.mockReturnValue(seasonalFish);

      mockInitialiseErrorsForLanding = jest.spyOn(SUT, 'initialiseErrorsForLanding');
      mockInitialiseErrorsForLanding.mockImplementation((landing) => landing);

      mockValidateDateForLanding = jest.spyOn(SUT, 'validateDateForLanding');
      mockValidateDateForLanding.mockImplementation((landing) => landing);

      mockValidateExportWeightForLanding = jest.spyOn(SUT, 'validateExportWeightForLanding');
      mockValidateExportWeightForLanding.mockImplementation((landing) => landing);

      mockValidateFaoAreaForLanding = jest.spyOn(SUT, 'validateFaoAreaForLanding');
      mockValidateFaoAreaForLanding.mockImplementation((landing) => landing);

      mockValidateProductForLanding = jest.spyOn(SUT, 'validateProductForLanding');
      mockValidateProductForLanding.mockImplementation((landing) => landing);

      mockValidateVesselForLanding = jest.spyOn(SUT, 'validateVesselForLanding');
      mockValidateVesselForLanding.mockImplementation((landing) => landing);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should run initialiseErrorsForLanding for each landing', () => {
      SUT.validateLandings(landings, favourites, landingLimitDaysInFuture);

      expect(mockInitialiseErrorsForLanding).toHaveBeenCalledTimes(2);
      expect(mockInitialiseErrorsForLanding).toHaveBeenCalledWith(landings[0]);
      expect(mockInitialiseErrorsForLanding).toHaveBeenCalledWith(landings[1]);
    });

    it('should pipe the result of initialiseErrorsForLanding into validateDateForLanding', () => {
      mockInitialiseErrorsForLanding.mockImplementation((landing) => `${landing.id} - errors initialised`);

      SUT.validateLandings(landings, favourites, landingLimitDaysInFuture);

      expect(mockValidateDateForLanding).toHaveBeenCalledTimes(2);
      expect(mockValidateDateForLanding).toHaveBeenCalledWith('landing 1 - errors initialised', landingLimitDaysInFuture);
      expect(mockValidateDateForLanding).toHaveBeenCalledWith('landing 2 - errors initialised', landingLimitDaysInFuture);
    });

    it('should pipe the result of validateDateForLanding into validateExportWeightForLanding', () => {
      mockValidateDateForLanding.mockImplementation((landing) => `${landing.id} - date validated`);

      SUT.validateLandings(landings, favourites, landingLimitDaysInFuture);

      expect(mockValidateExportWeightForLanding).toHaveBeenCalledTimes(2);
      expect(mockValidateExportWeightForLanding).toHaveBeenCalledWith('landing 1 - date validated');
      expect(mockValidateExportWeightForLanding).toHaveBeenCalledWith('landing 2 - date validated');
    });

    it('should pipe the result of mockValidateExportWeightForLanding into validateFaoAreaForLanding', () => {
      mockValidateExportWeightForLanding.mockImplementation((landing) => `${landing.id} - weight validated`);

      SUT.validateLandings(landings, favourites, landingLimitDaysInFuture);

      expect(mockValidateFaoAreaForLanding).toHaveBeenCalledTimes(2);
      expect(mockValidateFaoAreaForLanding).toHaveBeenCalledWith('landing 1 - weight validated');
      expect(mockValidateFaoAreaForLanding).toHaveBeenCalledWith('landing 2 - weight validated');
    });

    it('should pipe the result of validateFaoAreaForLanding into validateProductForLanding', () => {
      mockValidateFaoAreaForLanding.mockImplementation((landing) => `${landing.id} - fao area validated`);

      SUT.validateLandings(landings, favourites, landingLimitDaysInFuture);

      expect(mockValidateProductForLanding).toHaveBeenCalledTimes(2);
      expect(mockValidateProductForLanding).toHaveBeenCalledWith('landing 1 - fao area validated', favourites, seasonalFish);
      expect(mockValidateProductForLanding).toHaveBeenCalledWith('landing 2 - fao area validated', favourites, seasonalFish);
    });

    it('should pipe the result of validateProductForLanding into validateVesselForLanding', () => {
      mockValidateProductForLanding.mockImplementation((landing) => `${landing.id} - product validated`);

      SUT.validateLandings(landings, favourites, landingLimitDaysInFuture);

      expect(mockValidateVesselForLanding).toHaveBeenCalledTimes(2);
      expect(mockValidateVesselForLanding).toHaveBeenCalledWith('landing 1 - product validated');
      expect(mockValidateVesselForLanding).toHaveBeenCalledWith('landing 2 - product validated');
    });

    it('should return the result of validateVesselForLanding', () => {
      mockValidateVesselForLanding.mockImplementation((landing) => `${landing.id} - final validation finished`);

      const result = SUT.validateLandings(landings, favourites, landingLimitDaysInFuture);

      expect(result).toStrictEqual([
        'landing 1 - final validation finished',
        'landing 2 - final validation finished'
      ]);
    });

  });

  describe('initialiseErrorsForLanding', () => {

    it('should initialise the error array for a landing', () => {

      const landing = {} as any

      const result = SUT.initialiseErrorsForLanding(
        landing
      );

      expect(result).toStrictEqual({errors: []});

    });

    it('should overwrite any existing errors', () => {

      const landing = {errors: ['error 1']} as any

      const result = SUT.initialiseErrorsForLanding(
        landing
      );

      expect(result).toStrictEqual({errors: []});

    });

  });

  describe('validateDateForLanding', () => {

    const uploadedLanding = {
      rowNumber : undefined,
      originalRow : undefined,
      productId : undefined,
      product : undefined,
      landingDate: '25/12/2020',
      faoArea: undefined,
      vessel : undefined,
      vesselPln: undefined,
      exportWeight: undefined,
      errors : []
    }

    const landingLimitDaysInFuture = 7;

    it('should return an error if the landingDate is missing', () => {

      const result = SUT.validateDateForLanding(
        {
          ...uploadedLanding,
          landingDate: undefined,
          errors: []
        },
        landingLimitDaysInFuture
      );

      expect(result.errors).toStrictEqual(['error.dateLanded.date.missing']);

    });

    it('should return an error if the landingDate is empty', () => {

      const result = SUT.validateDateForLanding(
        {
          ...uploadedLanding,
          landingDate: '',
          errors: []
        },
        landingLimitDaysInFuture
      );

      expect(result.errors).toStrictEqual(['error.dateLanded.date.missing']);

    });

    it('should return an error if the landingDate is invalid', () => {

      const result = SUT.validateDateForLanding(
        {
          ...uploadedLanding,
          landingDate: 'x',
          errors: []
        },
        landingLimitDaysInFuture
      );

      expect(result.errors).toStrictEqual(['error.dateLanded.date.base']);

    });

    it('should return an error if the startDate is invalid', () => {

      const result = SUT.validateDateForLanding(
        {
          ...uploadedLanding,
          startDate: 'x',
          landingDate: '25/12/2020',
          errors: []
        },
        landingLimitDaysInFuture
      );

      expect(result.errors).toStrictEqual(['error.startDate.date.base']);

    });

    it('should return an error if the startDate is before the endDate', () => {

      const result = SUT.validateDateForLanding(
        {
          ...uploadedLanding,
          startDate: '26/12/2020',
          landingDate: '25/12/2020',
          errors: []
        },
        landingLimitDaysInFuture
      );

      expect(result.errors).toStrictEqual(['error.startDate.date.max']);

    });

    it('should return an error if the landingDate is too far in the future', () => {

      const result = SUT.validateDateForLanding(
        {
          ...uploadedLanding,
          landingDate: moment()
            .add(landingLimitDaysInFuture + 1, 'days')
            .format('DD/MM/YYYY'),
          errors: []
        },
        landingLimitDaysInFuture
      );

      expect(result.errors).toStrictEqual([
        {
          key: 'error.dateLanded.date.max',
          params: [
            landingLimitDaysInFuture
          ]
        }
      ]);

    });

    it('should return no errors if the landingDate is valid', () => {

      const result = SUT.validateDateForLanding(
        {
          ...uploadedLanding,
          errors: []
        },
        landingLimitDaysInFuture
      );

      expect(result.errors).toStrictEqual([]);

    });

  });

  describe('validateExportWeightForLanding', () => {

    const uploadedLanding = {
      rowNumber : undefined,
      originalRow : undefined,
      productId : undefined,
      product : undefined,
      landingDate: undefined,
      faoArea: undefined,
      vessel : undefined,
      vesselPln: undefined,
      exportWeight: 1.1,
      errors : []
    }

    it('should return an error if the export weight is missing', () => {

      const result = SUT.validateExportWeightForLanding(
        {
          ...uploadedLanding,
          exportWeight: undefined,
          errors: []
        }
      );

      expect(result.errors).toStrictEqual(['error.exportWeight.any.missing']);

    });

    it('should return an error if the export weight is less than zero', () => {

      const result = SUT.validateExportWeightForLanding(
        {
          ...uploadedLanding,
          exportWeight: -1,
          errors: []
        }
      );

      expect(result.errors).toStrictEqual(['error.exportWeight.number.greater']);

    });

    it('should return an error if the export weight has more than two decimal places', () => {

      const result = SUT.validateExportWeightForLanding(
        {
          ...uploadedLanding,
          exportWeight: 1.123,
          errors: []
        }
      );

      expect(result.errors).toStrictEqual(['error.exportWeight.number.decimal-places']);

    });

    it('should return no errors if the export weight is valid', () => {

      const result = SUT.validateExportWeightForLanding(
        {
          ...uploadedLanding,
          errors: []
        }
      );

      expect(result.errors).toStrictEqual([]);

    });

  });

  describe('validateFaoAreaForLanding', () => {

    const uploadedLanding = {
      rowNumber : undefined,
      originalRow : undefined,
      productId : undefined,
      product : undefined,
      landingDate: undefined,
      faoArea: faoAreas[0],
      vessel : undefined,
      vesselPln: undefined,
      exportWeight: undefined,
      errors : []
    }

    it('should return an error if the fao area is missing', () => {

      const result = SUT.validateFaoAreaForLanding(
        {
          ...uploadedLanding,
          faoArea: undefined,
          errors: []
        }
      );

      expect(result.errors).toStrictEqual(['error.faoArea.any.missing']);

    });

    it('should return an error if the fao area is null', () => {

      const result = SUT.validateFaoAreaForLanding(
        {
          ...uploadedLanding,
          faoArea: null,
          errors: []
        }
      );

      expect(result.errors).toStrictEqual(['error.faoArea.any.missing']);

    });

    it('should return an error if the fao area is empty', () => {

      const result = SUT.validateFaoAreaForLanding(
        {
          ...uploadedLanding,
          faoArea: "",
          errors: []
        }
      );

      expect(result.errors).toStrictEqual(['error.faoArea.any.missing']);

    });

    it('should return an error if the fao area is invalid', () => {

      const result = SUT.validateFaoAreaForLanding(
        {
          ...uploadedLanding,
          faoArea: 'x',
          errors: []
        }
      );

      expect(result.errors).toStrictEqual(['error.faoArea.any.invalid']);

    });

    it('should return no errors if the fao area is valid', () => {

      const result = SUT.validateFaoAreaForLanding(
        {
          ...uploadedLanding,
          errors: []
        }
      );

      expect(result.errors).toStrictEqual([]);

    });

  });

  describe('validateVesselForLanding', () => {

    let mockVesselSearch;

    const uploadedLanding = {
      rowNumber : undefined,
      originalRow : undefined,
      productId : undefined,
      product : undefined,
      landingDate: '01/01/2020',
      faoArea: undefined,
      vessel : undefined,
      vesselPln: 'vesselPln',
      exportWeight: undefined,
      errors : []
    }

    const vessel = {
      pln: 'vesselPln',
      vesselLength: 10
    }

    beforeEach(() => {
      mockVesselSearch = jest.spyOn(VesselController, 'vesselSearch');
      mockVesselSearch.mockReturnValue([ vessel ]);
    });

    it('should return an error if the vessel pln is missing', () => {

      const result = SUT.validateVesselForLanding(
        {
          ...uploadedLanding,
          vesselPln: undefined,
          errors: []
        }
      );

      expect(result.errors).toStrictEqual(['error.vesselPln.any.missing']);

    });

    it('should return an error if the vessel pln is not found', () => {

      const result = SUT.validateVesselForLanding(
        {
          ...uploadedLanding,
          vesselPln: 'x',
          errors: []
        }
      );

      expect(result.errors).toStrictEqual(['error.vesselPln.any.invalid']);

    });

    it('should not validate the pln if the landing date is invalid', () => {

      const result = SUT.validateVesselForLanding(
        {
          ...uploadedLanding,
          landingDate: undefined,
          vesselPln: 'x',
          errors: []
        }
      );

      expect(result.errors).toStrictEqual([]);

    });

    it('should populate the vessel information if validation is successful', () => {

      const result = SUT.validateVesselForLanding(
        {
          ...uploadedLanding,
          errors: []
        }
      );

      expect(result).toStrictEqual({
        ...uploadedLanding,
        vessel
      });

    });

  });

  describe('validateProductForLanding', () => {

    let mockCommoditySearch;

    const favouriteProducts = [
      {
        id: 'favouriteId1',
        species: 'faoName1 (speciesCode1)',
        speciesCode: 'speciesCode1',
        scientificName: 'scientificName1',
        state: 'state1',
        stateLabel: 'stateLabel1',
        presentation: 'presentation1',
        presentationLabel: 'presentationLabel1',
        commodity_code: 'commodity_code1',
        commodity_code_description: 'commodity_code_description1'
      }
    ];

    const seasonalRestrictions = [
      {
        fao: 'speciesCode1',
        validFrom: '2020-01-01',
        validTo: '2020-03-01'
      }
    ];

    const uploadedLanding = {
      rowNumber : undefined,
      originalRow : undefined,
      productId : 'favouriteId1',
      product : undefined,
      landingDate: '01/10/2020',
      faoArea: undefined,
      vessel : undefined,
      vesselPln: undefined,
      exportWeight: undefined,
      errors : []
    }

    beforeEach(() => {
      mockCommoditySearch = jest.spyOn(SpeciesController, 'commoditySearch');
      mockCommoditySearch.mockReturnValue([
        {
          code: 'commodity_code1',
          description: 'description1',
          faoName: 'faoName1',
          stateLabel: 'stateLabel1',
          presentationLabel: 'presentationLabel1',
        }
      ]);
    });

    it('should return an error if the product id is missing', () => {

      const result = SUT.validateProductForLanding(
        {
          ...uploadedLanding,
          productId: undefined,
          errors: []
        },
        favouriteProducts,
        seasonalRestrictions
      );

      expect(result.errors).toStrictEqual(['error.product.any.missing']);

    });

    it('should return an error if the product id isnt found in the users favourites list', () => {

      const result = SUT.validateProductForLanding(
        {
          ...uploadedLanding,
          productId : 'x',
          errors : []
        },
        favouriteProducts,
        seasonalRestrictions
      );

      expect(result.errors).toStrictEqual(['error.product.any.exists']);

    });

    it('should search for the commodity code by speciesCode, state, and presentation', () => {

      SUT.validateProductForLanding(
        {
          ...uploadedLanding,
          errors : []
        },
        favouriteProducts,
        seasonalRestrictions
      );

      const matchingProduct = favouriteProducts[0];

      expect(mockCommoditySearch).toHaveBeenCalledWith(matchingProduct.speciesCode, matchingProduct.state, matchingProduct.presentation);

    });

    it('should return an error if the favourite does not validate against the commodity search', () => {

      mockCommoditySearch.mockReturnValue([]);

      const result = SUT.validateProductForLanding(
        {
          ...uploadedLanding,
          errors : []
        },
        favouriteProducts,
        seasonalRestrictions
      );

      expect(result.errors).toStrictEqual(['error.product.any.invalid']);

    });

    it('should populate the product data if the favourite validation passes', () => {

      const result = SUT.validateProductForLanding(
        {
          ...uploadedLanding,
          errors : []
        },
        favouriteProducts,
        seasonalRestrictions
      );

      expect(result).toStrictEqual({
        ...uploadedLanding,
        product: favouriteProducts[0]
      });

    });

    it('should return an error if the landing is in a restricted period', () => {

      const result = SUT.validateProductForLanding(
        {
          ...uploadedLanding,
          landingDate: '01/02/2020',
          errors : []
        },
        favouriteProducts,
        seasonalRestrictions
      );

      expect(result.errors).toStrictEqual(['validation.product.seasonal.invalid-date']);

    });

    it('should return an error if the start date is in a restricted period', () => {

      const result = SUT.validateProductForLanding(
        {
          ...uploadedLanding,
          startDate: '01/02/2020',
          landingDate: '01/04/2020',
          errors : []
        },
        favouriteProducts,
        seasonalRestrictions
      );

      const error = {
        key: 'validation.product.start-date.seasonal.invalid-date',
        params: ['faoName1 (speciesCode1)']
      };

      expect(result.errors).toStrictEqual([error]);

    });

    it('should skip the seasonal restriction check if the start date is in the wrong format', () => {

      const result = SUT.validateProductForLanding(
        {
          ...uploadedLanding,
          startDate: undefined,
          landingDate: '01/ 04/2020',
          errors : []
        },
        favouriteProducts,
        seasonalRestrictions
      );

      expect(result.errors).toStrictEqual([]);

    });

    it('should skip the seasonal restriction check if the landing date is in the wrong format', () => {

      const result = SUT.validateProductForLanding(
        {
          ...uploadedLanding,
          landingDate: '2020-02-01',
          errors : []
        },
        favouriteProducts,
        seasonalRestrictions
      );

      expect(result.errors).toStrictEqual([]);

    });

    it('should return no errors if all validation passes', () => {

      const result = SUT.validateProductForLanding(
        {
          ...uploadedLanding,
          errors : []
        },
        favouriteProducts,
        seasonalRestrictions
      );

      expect(result.errors).toStrictEqual([]);

    });

  });

  describe('isPositiveNumberWithTwoDecimals', () => {

    describe('returns true when given', () => {

      it('zero', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(0);
        expect(result).toBe(true);
      });

      it('a integer', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(1);
        expect(result).toBe(true);
      });

      it('a minus integer', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(-1);
        expect(result).toBe(false);
      });

      it('a float with less than two dp', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(1.1);
        expect(result).toBe(true);
      });

      it('a float with exactly two dp', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(1.11);
        expect(result).toBe(true);
      });

      it('a float with more than two dp - IF - there are only two significant figures after the decimal point', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(1.110);
        expect(result).toBe(true);
      });

    });

    describe('returns false when given', () => {

      it('a negative integer', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(-1);
        expect(result).toBe(false);
      });

      it('a negative float', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(-0.1);
        expect(result).toBe(false);
      });

      it('a float with more than two dp', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(1.111);
        expect(result).toBe(false);
      });

    });

  });

});