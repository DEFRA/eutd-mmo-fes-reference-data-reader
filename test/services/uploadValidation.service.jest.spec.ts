import * as SUT from '../../src/services/uploadValidation.service';
import * as SpeciesController from '../../src/controllers/species';
import * as VesselController from '../../src/controllers/vessel';
import * as DataCache from '../../src/data/cache';
import { faoAreas } from '../../src/data/faoAreas';
import moment from 'moment';
import { ApplicationConfig } from '../../src/config';

describe('uploadValidation.service', () => {
  ApplicationConfig.loadEnv({ EU_CATCH_MAX_EEZ: '5' });
  const gearRecords = [
    {"Gear category":"Surrounding nets","Gear name":"Purse seines","Gear code":"PS"},
    {"Gear category":"Surrounding nets","Gear name":"Surrounding nets without purse lines","Gear code":"LA"},
    {"Gear category":"Surrounding nets","Gear name":"Surrounding nets (nei)","Gear code":"SUX"},
    {"Gear category":"Seine nets","Gear name":"Beach seines","Gear code":"SB"},
    {"Gear category":"Seine nets","Gear name":"Boat seines","Gear code":"SV"},
  ];

  const vessels = [
    {
      "fishingVesselName": "KINGFISHER",
      "ircs": "MXWZ7",
      "cfr": "GBR000C16272",
      "flag": "GBR",
      "homePort": "BALLANTRAE",
      "registrationNumber": "BA810",
      "imo": 9183714,
      "fishingLicenceNumber": "40836",
      "fishingLicenceValidFrom": "2017-06-27T00:00:00",
      "fishingLicenceValidTo": "2027-12-31T00:00:00",
      "adminPort": "AYR",
      "rssNumber": "C16272",
      "vesselLength": 22.94,
      "licenceHolderName": "J KING"
    },
    {
      "fishingVesselName": "KINGFISHER II",
      "ircs": "",
      "cfr": "GBR000C16608",
      "flag": "GBR",
      "homePort": "TORRIDON",
      "registrationNumber": "PD110",
      "imo": null,
      "fishingLicenceNumber": "31921",
      "fishingLicenceValidFrom": "2016-07-01T00:01:00",
      "fishingLicenceValidTo": "2027-12-31T00:01:00",
      "adminPort": "PORTREE",
      "rssNumber": "C16608",
      "vesselLength": 7.32,
      "licenceHolderName": "MR MA EDWARDS"
    },
  ];

  const rfmoRecords = [
    {
      "Full text": "Commission for the Conservation of Antarctic Marine Living Resources (CCAMLR)",
      Abbreviation: "CCAMLR",
    },
    {
      "Full text": "General Fisheries Commission for the Mediterranean (GFCM)",
      Abbreviation: "GFCM",
    },
    {
      "Full text": "North East Atlantic Fisheries Commission (NEAFC)",
      Abbreviation: "NEAFC"
    }
  ];

  const countries = [
    {
      officialCountryName: "United Kingdom of Great Britain and Northern Ireland",
      isoCodeAlpha2: "GB",
      isoCodeAlpha3: "GBR",
      isoNumericCode: 826
    },
    {
      officialCountryName: "France",
      isoCodeAlpha2: "FR",
      isoCodeAlpha3: "FRA",
      isoNumericCode: 250
    },
    {
      officialCountryName: "Germany",
      isoCodeAlpha2: "DE",
      isoCodeAlpha3: "DEU",
      isoNumericCode: 276
    },
    {
      officialCountryName: "Italy",
      isoCodeAlpha2: "IT",
      isoCodeAlpha3: "ITA",
      isoNumericCode: 380
    }
  ];

  let mockGetRfmoRecords;
  let mockGetCountries;

  describe('validateLandings', () => {

    let mockGetSeasonalFish;
    let mockGetGearTypes;
    let mockInitialiseErrorsForLanding;
    let mockValidateDateForLanding;
    let mockValidateExportWeightForLanding;
    let mockValidateFaoAreaForLanding;
    let mockValidateHighSeasAreaForLanding;
    let mockValidateProductForLanding;
    let mockValidateVesselForLanding;
    let mockValidateGearCodeForLanding;
    let mockValidateRfmoCodeForLanding;
    let mockValidateEezCodeForLanding;

    const seasonalFish = ['seasonal fish 1'];
    const landings = [{id: 'landing 1'}, {id: 'landing 2'}] as any[];
    const favourites = ['favourite 1', 'favourite 2'] as any[];
    const landingLimitDaysInFuture = 7;

    beforeEach(() => {
      mockGetSeasonalFish = jest.spyOn(DataCache, 'getSeasonalFish');
      mockGetSeasonalFish.mockReturnValue(seasonalFish);

      mockGetGearTypes = jest.spyOn(DataCache, 'getGearTypes');
      mockGetGearTypes.mockReturnValue(gearRecords);

      mockGetRfmoRecords = jest.spyOn(DataCache, 'getRfmos');
      mockGetRfmoRecords.mockReturnValue(rfmoRecords);

      mockGetCountries = jest.spyOn(DataCache, 'getCountries');
      mockGetCountries.mockReturnValue(countries);

      mockInitialiseErrorsForLanding = jest.spyOn(SUT, 'initialiseErrorsForLanding');
      mockInitialiseErrorsForLanding.mockImplementation((landing) => landing);

      mockValidateDateForLanding = jest.spyOn(SUT, 'validateDateForLanding');
      mockValidateDateForLanding.mockImplementation((landing) => landing);

      mockValidateExportWeightForLanding = jest.spyOn(SUT, 'validateExportWeightForLanding');
      mockValidateExportWeightForLanding.mockImplementation((landing) => landing);

      mockValidateFaoAreaForLanding = jest.spyOn(SUT, 'validateFaoAreaForLanding');
      mockValidateFaoAreaForLanding.mockImplementation((landing) => landing);

      mockValidateHighSeasAreaForLanding = jest.spyOn(SUT, 'validateHighSeasAreaForLanding');
      mockValidateHighSeasAreaForLanding.mockImplementation((landing) => landing);

      mockValidateProductForLanding = jest.spyOn(SUT, 'validateProductForLanding');
      mockValidateProductForLanding.mockImplementation((landing) => landing);

      mockValidateVesselForLanding = jest.spyOn(SUT, 'validateVesselForLanding');
      mockValidateVesselForLanding.mockImplementation((landing) => landing);

      mockValidateGearCodeForLanding = jest.spyOn(SUT, 'validateGearCodeForLanding');
      mockValidateGearCodeForLanding.mockImplementation((landing) => landing);

      mockValidateRfmoCodeForLanding = jest.spyOn(SUT, 'validateRfmoCodeForLanding');
      mockValidateRfmoCodeForLanding.mockImplementation((landing) => landing);

      mockValidateEezCodeForLanding = jest.spyOn(SUT, 'validateEezCodeForLanding');
      mockValidateEezCodeForLanding.mockImplementation((landing) => landing);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should run initialiseErrorsForLanding for each landing', () => {
      SUT.validateLandings(favourites, landingLimitDaysInFuture, landings);

      expect(mockInitialiseErrorsForLanding).toHaveBeenCalledTimes(2);
      expect(mockInitialiseErrorsForLanding).toHaveBeenCalledWith(landings[0]);
      expect(mockInitialiseErrorsForLanding).toHaveBeenCalledWith(landings[1]);
    });

    it('should pipe the result of initialiseErrorsForLanding into validateProduct', () => {
      mockInitialiseErrorsForLanding.mockImplementation((landing) => `${landing.id} - errors initialised`);

      SUT.validateLandings(favourites, landingLimitDaysInFuture, landings);

      expect(mockValidateProductForLanding).toHaveBeenCalledTimes(2);
      expect(mockValidateProductForLanding).toHaveBeenCalledWith('landing 1 - errors initialised', favourites, seasonalFish);
      expect(mockValidateProductForLanding).toHaveBeenCalledWith('landing 2 - errors initialised', favourites, seasonalFish);
    });

    it('should pipe the result of validateProduct into validateDateForLanding', () => {
      mockValidateProductForLanding.mockImplementation((landing) => `${landing.id} - product validated`);

      SUT.validateLandings(favourites, landingLimitDaysInFuture, landings);

      expect(mockValidateDateForLanding).toHaveBeenCalledTimes(2);
      expect(mockValidateDateForLanding).toHaveBeenCalledWith('landing 1 - product validated', landingLimitDaysInFuture);
      expect(mockValidateDateForLanding).toHaveBeenCalledWith('landing 2 - product validated', landingLimitDaysInFuture);
    });

    it('should pipe the result of validateDateForLanding into validateFaoAreaForLanding', () => {
      mockValidateDateForLanding.mockImplementation((landing) => `${landing.id} - date validated`);

      SUT.validateLandings(favourites, landingLimitDaysInFuture, landings);

      expect(mockValidateFaoAreaForLanding).toHaveBeenCalledTimes(2);
      expect(mockValidateFaoAreaForLanding).toHaveBeenCalledWith('landing 1 - date validated');
      expect(mockValidateFaoAreaForLanding).toHaveBeenCalledWith('landing 2 - date validated');
    });

    it('should pipe the result of validateFaoAreaForLanding into validateHighSeasAreaForLanding', () => {
      mockValidateFaoAreaForLanding.mockImplementation((landing) => `${landing.id} - fao area validated`);

      SUT.validateLandings(favourites, landingLimitDaysInFuture, landings);

      expect(mockValidateHighSeasAreaForLanding).toHaveBeenCalledTimes(2);
      expect(mockValidateHighSeasAreaForLanding).toHaveBeenCalledWith('landing 1 - fao area validated');
      expect(mockValidateHighSeasAreaForLanding).toHaveBeenCalledWith('landing 2 - fao area validated');
    });

    it('should pipe the result of validateHighSeasAreaForLanding into mockValidateRfmoCodeForLanding', () => {
      mockValidateHighSeasAreaForLanding.mockImplementation((landing) => `${landing.id} - high seas area validated`);

      SUT.validateLandings(favourites, landingLimitDaysInFuture, landings);

      expect(mockValidateRfmoCodeForLanding).toHaveBeenCalledTimes(2);
      expect(mockValidateRfmoCodeForLanding).toHaveBeenCalledWith('landing 1 - high seas area validated');
      expect(mockValidateRfmoCodeForLanding).toHaveBeenCalledWith('landing 2 - high seas area validated');
    });

    it('should pipe the result of mockValidateRfmoCodeForLanding into mockValidateEezCodeForLanding', () => {
      mockValidateRfmoCodeForLanding.mockImplementation((landing) => `${landing.id} - rfmo validated`);

      SUT.validateLandings(favourites, landingLimitDaysInFuture, landings);

      expect(mockValidateEezCodeForLanding).toHaveBeenCalledTimes(2);
      expect(mockValidateEezCodeForLanding).toHaveBeenCalledWith('landing 1 - rfmo validated');
      expect(mockValidateEezCodeForLanding).toHaveBeenCalledWith('landing 2 - rfmo validated');
    });

    it('should pipe the result of mockValidateEezCodeForLanding into validateVesselForLanding', () => {
      mockValidateEezCodeForLanding.mockImplementation((landing) => `${landing.id} - eez validated`);

      SUT.validateLandings(favourites, landingLimitDaysInFuture, landings);

      expect(mockValidateVesselForLanding).toHaveBeenCalledTimes(2);
      expect(mockValidateVesselForLanding).toHaveBeenCalledWith('landing 1 - eez validated');
      expect(mockValidateVesselForLanding).toHaveBeenCalledWith('landing 2 - eez validated');
    });

    it('should pipe the result of validateVesselForLanding into validateGearCodeForLanding', () => {
      mockValidateVesselForLanding.mockImplementation((landing) => `${landing.id} - vessel validated`);

      SUT.validateLandings(favourites, landingLimitDaysInFuture, landings);

      expect(mockValidateGearCodeForLanding).toHaveBeenCalledTimes(2);
      expect(mockValidateGearCodeForLanding).toHaveBeenCalledWith('landing 1 - vessel validated', gearRecords);
      expect(mockValidateGearCodeForLanding).toHaveBeenCalledWith('landing 2 - vessel validated', gearRecords);
    });

    it('should pipe the result of validateGearCodeForLanding into validateExportWeightForLanding', () => {
      mockValidateGearCodeForLanding.mockImplementation((landing) => `${landing.id} - gear code validated`);

      SUT.validateLandings(favourites, landingLimitDaysInFuture, landings);

      expect(mockValidateExportWeightForLanding).toHaveBeenCalledTimes(2);
      expect(mockValidateExportWeightForLanding).toHaveBeenCalledWith('landing 1 - gear code validated');
      expect(mockValidateExportWeightForLanding).toHaveBeenCalledWith('landing 2 - gear code validated');
    });

    it('should return the result of validateExportWeightForLanding', async () => {
      mockValidateExportWeightForLanding.mockImplementation((landing) => `${landing.id} - export weight validated`);

      const result = await SUT.validateLandings(favourites, landingLimitDaysInFuture, landings);

      expect(result).toStrictEqual([
        'landing 1 - export weight validated',
        'landing 2 - export weight validated'
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
      startDate: '24/12/2020',
      landingDate: '25/12/2020',
      faoArea: undefined,
      vessel : undefined,
      vesselPln: undefined,
      exportWeight: undefined,
      errors : []
    }

    beforeEach(() => {
      uploadedLanding.errors = [];
    })

    const landingLimitDaysInFuture = 7;

    it('should return an error if the startDate is missing', () => {
      const result = SUT.validateDateForLanding(
        {
          ...uploadedLanding,
          startDate: undefined,
        },
        landingLimitDaysInFuture
      );

      expect(result.errors).toStrictEqual(['error.startDate.date.missing']);
    });

    it('should return an error if the startDate is empty', () => {
      const result = SUT.validateDateForLanding(
        {
          ...uploadedLanding,
          startDate: '',
        },
        landingLimitDaysInFuture
      );

      expect(result.errors).toStrictEqual(['error.startDate.date.missing']);
    });

    it('should return an error if the landingDate is missing', () => {

      const result = SUT.validateDateForLanding(
        {
          ...uploadedLanding,
          landingDate: undefined,
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
        },
        landingLimitDaysInFuture
      );

      expect(result.errors).toStrictEqual(['error.startDate.date.base']);

    });

    it('should return an error if the startDate is after the landingDate', () => {

      const result = SUT.validateDateForLanding(
        {
          ...uploadedLanding,
          startDate: '26/12/2020',
          landingDate: '25/12/2020',
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

    it('should return no errors if the landingDate and startDate is valid', () => {

      const result = SUT.validateDateForLanding(
        uploadedLanding,
        landingLimitDaysInFuture
      );

      expect(result.errors).toStrictEqual([]);

    });

    describe('should return errors when landing dates are missing', () => {
      it('should return error for missing landing date', () => {
        const result = SUT.validateDateForLanding(
          {
            ...uploadedLanding,
            startDate: '24/12/2020',
            landingDate: undefined,
            errors: []
          },
          landingLimitDaysInFuture
        );

        expect(result.errors).toStrictEqual([
          'error.dateLanded.date.missing'
        ]);
      });
      it('should return error for missing start date', () => {
        const result = SUT.validateDateForLanding(
          {
            ...uploadedLanding,
            startDate: undefined,
            landingDate: '25/12/2020',
            errors: []
          },
          landingLimitDaysInFuture
        );

        expect(result.errors).toStrictEqual([
          'error.startDate.date.missing'
        ]);
      });
    });

    describe('should only validate landing date separate to start date', () => {
      it('should validate future landing date when start date is provided', () => {
        const futureDate = moment.utc().add(14, 'days').format('DD/MM/YYYY');
        
        const result = SUT.validateDateForLanding(
          {
            ...uploadedLanding,
            startDate: '24/12/2020',
            landingDate: futureDate,
            errors: []
          },
          landingLimitDaysInFuture
        );

        expect(result.errors).toStrictEqual([
          {
            key: 'error.dateLanded.date.max',
            params: [7],
          }
        ]);
      });
    });

    it('should not return error when landing date is within future limit', () => {
      const validFutureDate = moment.utc().add(landingLimitDaysInFuture - 1, 'days').format('DD/MM/YYYY');
      
      const result = SUT.validateDateForLanding(
        {
          ...uploadedLanding,
          startDate: moment.utc().format('DD/MM/YYYY'),
          landingDate: validFutureDate,
          errors: []
        },
        landingLimitDaysInFuture
      );

      expect(result.errors).toStrictEqual([]);
    });

    it('should not return error when landing date is exactly at future limit', () => {
      const limitDate = moment.utc().add(landingLimitDaysInFuture, 'days').format('DD/MM/YYYY');
      
      const result = SUT.validateDateForLanding(
        {
          ...uploadedLanding,
          startDate: moment.utc().format('DD/MM/YYYY'),
          landingDate: limitDate,
          errors: []
        },
        landingLimitDaysInFuture
      );

      expect(result.errors).toStrictEqual([]);
    });

    it('should not return error when landing date is today', () => {
      const today = moment.utc().format('DD/MM/YYYY');
      
      const result = SUT.validateDateForLanding(
        {
          ...uploadedLanding,
          startDate: moment.utc().subtract(1, 'day').format('DD/MM/YYYY'),
          landingDate: today,
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
    let mockGetVesselData;

    const uploadedLanding = {
      rowNumber : undefined,
      originalRow : undefined,
      productId : undefined,
      product : undefined,
      landingDate: '01/01/2020',
      faoArea: undefined,
      vessel : undefined,
      vesselPln: 'PD110',
      exportWeight: undefined,
      errors : []
    }

    const vessel = {
      pln: 'PD110',
      vesselLength: 10
    }

    beforeEach(() => {
      mockGetVesselData = jest.spyOn(DataCache, 'getVesselsData');
      mockGetVesselData.mockReturnValue(vessels);

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

      expect(result.errors).toStrictEqual(['error.vesselPln.any.exists']);

    });

    it('should not check vessel license if the landing date is invalid', () => {

      const result = SUT.validateVesselForLanding(
        {
          ...uploadedLanding,
          landingDate: undefined,
          vesselPln: 'PD110',
          errors: []
        }
      );

      expect(result.errors).toStrictEqual([]);

    });


    it('should return error when vessel exists but license search fails', () => {
    mockGetVesselData.mockReturnValue([
      { registrationNumber: 'PD110', fishingVesselName: 'TEST' }
    ]);
    
    mockVesselSearch.mockReturnValue([
      { pln: 'DIFFERENT_PLN', vesselLength: 10 }
    ]);

    const result = SUT.validateVesselForLanding({
      ...uploadedLanding,
      vesselPln: 'PD110',
      landingDate: '01/01/2020',
      errors: []
    });

    expect(result.vessel).toBeUndefined();
    expect(result.errors).toStrictEqual(['error.vesselPln.any.invalid']); 
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

      const error = {
        key: 'validation.product.seasonal.invalid-date',
        params: ['faoName1 (speciesCode1)']
      };

      expect(result.errors).toStrictEqual([error]);

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

  describe('validateGearCodeForLanding', () => {
    it('should return an error when gear code is missing', () => {
      const result = SUT.validateGearCodeForLanding({ errors: [], gearCode: undefined }, gearRecords);

      expect(result.gearCategory).toBeUndefined();
      expect(result.gearName).toBeUndefined();
      expect(result.errors).toStrictEqual(['error.gearCode.any.missing']);
    });

    it('should enrich the landing with gear details when gear code exists', () => {
      const result = SUT.validateGearCodeForLanding({ errors: [], gearCode: 'PS' }, gearRecords);

      expect(result.gearCategory).toEqual('Surrounding nets');
      expect(result.gearName).toEqual('Purse seines');
      expect(result.errors).toStrictEqual([]);
    });

    it('should return an error when gear code is not passed', () => {
      const result = SUT.validateGearCodeForLanding({ errors: [] }, gearRecords);

      expect(result.gearCategory).toBeUndefined()
      expect(result.gearName).toBeUndefined();
      expect(result.errors).toStrictEqual(['error.gearCode.any.missing']);
    });

    it('should return an error when gear code is not valid', () => {
      const result = SUT.validateGearCodeForLanding({ errors: [], gearCode: '123' }, gearRecords);

      expect(result.gearCategory).toBeUndefined()
      expect(result.gearName).toBeUndefined();
      expect(result.errors).toStrictEqual(['validation.gearCode.string.invalid']);
    });

    it('should return an error when gear code does not exist', () => {
      const result = SUT.validateGearCodeForLanding({ errors: [], gearCode: 'XYZ' }, gearRecords);

      expect(result.gearCategory).toBeUndefined()
      expect(result.gearName).toBeUndefined();
      expect(result.errors).toStrictEqual(['validation.gearCode.string.unknown']);
    });
  });

  describe('validateRfmoCodeForLanding', () => {

    let mockGetRfmoRecords: jest.SpyInstance;

    beforeEach(() => {
      mockGetRfmoRecords = jest.spyOn(DataCache, 'getRfmos');
      mockGetRfmoRecords.mockReturnValue(rfmoRecords);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    })

    it('should enrich the landing with the RFMO name when RFMO code exists', () => {
      const result = SUT.validateRfmoCodeForLanding({ errors: [], rfmoCode: 'NEAFC' });

      expect(result.rfmoName).toEqual('North East Atlantic Fisheries Commission (NEAFC)');
      expect(result.errors).toStrictEqual([]);
    });

    it('should return an error when RFMO code does not exist', () => {
      const result = SUT.validateRfmoCodeForLanding({ errors: [], rfmoCode: 'ABC' });

      expect(result.rfmoName).toBeUndefined();
      expect(result.errors).toStrictEqual(['validation.rfmoCode.string.unknown']);
    });

    it('should enrich landing with RFMO full text when valid code provided', () => {
      const result = SUT.validateRfmoCodeForLanding({ 
        errors: [], 
        rfmoCode: 'NEAFC' 
      });

      expect(result.rfmoName).toEqual('North East Atlantic Fisheries Commission (NEAFC)');
      expect(result.errors).toStrictEqual([]);
    });

    it('should enrich landing with RFMO name when code is lowercase', () => {
      const result = SUT.validateRfmoCodeForLanding({ 
        errors: [], 
        rfmoCode: 'gfcm' 
      });

      expect(result.rfmoName).toEqual('General Fisheries Commission for the Mediterranean (GFCM)');
      expect(result.errors).toStrictEqual([]);
    });

    it('should enrich landing with CCAMLR when code is valid', () => {
      const result = SUT.validateRfmoCodeForLanding({ 
        errors: [], 
        rfmoCode: 'CCAMLR' 
      });

      expect(result.rfmoName).toEqual('Commission for the Conservation of Antarctic Marine Living Resources (CCAMLR)');
      expect(result.errors).toStrictEqual([]);
    });

    it('should handle mixed case RFMO codes', () => {
      const result = SUT.validateRfmoCodeForLanding({ 
        errors: [], 
        rfmoCode: 'NeAfC' 
      });

      expect(result.rfmoName).toEqual('North East Atlantic Fisheries Commission (NEAFC)');
      expect(result.errors).toStrictEqual([]);
    });

  });

  describe('validateEezCodeForLanding', () => {

    beforeEach(() => {
      mockGetCountries = jest.spyOn(DataCache, 'getCountries');
      mockGetCountries.mockReturnValue(countries);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    })

    it('should return an error when EEZ code is missing when high seas is "no"', () => {
      const result = SUT.validateEezCodeForLanding({ errors: [], eezCode: undefined, highSeasArea: 'no' });

      expect(result.eezData).toBeUndefined();
      expect(result.errors).toStrictEqual(['error.eezCode.any.missing']);
    });

    it('should enrich the landing with the country name when EEZ code exists', () => {
      const result = SUT.validateEezCodeForLanding({ errors: [], eezCode: 'FRA' });
      const eezData = [{
        officialCountryName: "France",
        isoCodeAlpha2: "FR",
        isoCodeAlpha3: "FRA",
        isoNumericCode: 250
      }]

      expect(result.eezData).toEqual(eezData);
      expect(result.errors).toStrictEqual([]);
    });

    it('should enrich the landing with multiple country names when multiple EEZ codes exist', () => {
      const result = SUT.validateEezCodeForLanding({ errors: [], eezCode: 'GB;FRA' });
      const eezData = [
        {
          officialCountryName: "United Kingdom of Great Britain and Northern Ireland",
          isoCodeAlpha2: "GB",
          isoCodeAlpha3: "GBR",
          isoNumericCode: 826
        },
        {
          officialCountryName: "France",
          isoCodeAlpha2: "FR",
          isoCodeAlpha3: "FRA",
          isoNumericCode: 250
        }
      ];

      expect(result.eezData).toEqual(eezData);
      expect(result.errors).toStrictEqual([]);
    });

    it('should skip empty items when a multi-select EEZ value is passed', () => {
      const result = SUT.validateEezCodeForLanding({ errors: [], eezCode: 'FR;;GB;;;DEU' });
      const eezData = [
        {
          officialCountryName: "France",
          isoCodeAlpha2: "FR",
          isoCodeAlpha3: "FRA",
          isoNumericCode: 250
        },
        {
          officialCountryName: "United Kingdom of Great Britain and Northern Ireland",
          isoCodeAlpha2: "GB",
          isoCodeAlpha3: "GBR",
          isoNumericCode: 826
        },
        {
          officialCountryName: "Germany",
          isoCodeAlpha2: "DE",
          isoCodeAlpha3: "DEU",
          isoNumericCode: 276
        }
      ];

      expect(result.eezData).toEqual(eezData);
      expect(result.errors).toStrictEqual([]);
    });

    it('should return an error when EEZ code is not passed when high seas is "no"', () => {
      const result = SUT.validateEezCodeForLanding({ errors: [], highSeasArea: 'no' });

      expect(result.eezData).toBeUndefined();
      expect(result.errors).toStrictEqual(['error.eezCode.any.missing']);
    });

    it('should return an error when EEZ code is not valid', () => {
      const tooShortResult = SUT.validateEezCodeForLanding({ errors: [], eezCode: 'A' });
      const tooLongResult = SUT.validateEezCodeForLanding({ errors: [], eezCode: 'ABCD' });

      expect(tooShortResult.eezName).toBeUndefined();
      expect(tooLongResult.eezName).toBeUndefined();
      expect(tooShortResult.errors).toStrictEqual(['validation.eezCode.string.invalid']);
      expect(tooLongResult.errors).toStrictEqual(['validation.eezCode.string.invalid']);
    });

    it('should return an error when EEZ code is empty multi-select value', () => {
      const oneSemiComma = SUT.validateEezCodeForLanding({ errors: [], eezCode: ';' });
      const twoSemiCommas = SUT.validateEezCodeForLanding({ errors: [], eezCode: ';;' });

      expect(oneSemiComma.eezName).toBeUndefined();
      expect(twoSemiCommas.eezName).toBeUndefined();
      expect(oneSemiComma.errors).toStrictEqual(['validation.eezCode.string.invalid']);
      expect(twoSemiCommas.errors).toStrictEqual(['validation.eezCode.string.invalid']);
    });

    it('should return an error when multiple EEZ codes are provided and one or more are invalid', () => {
      // SCOT is not a valid ISO code (2-3 chars)
      const result = SUT.validateEezCodeForLanding({ errors: [], eezCode: 'FRA;SCOT;DEU' });

      expect(result.eezName).toBeUndefined();
      expect(result.errors).toStrictEqual(['validation.eezCode.string.invalid']);
    });

    it('should return an error when multiple EEZ codes are provided and one or more dont exist', () => {
      // UK/GER are not correct ISO codes
      const result = SUT.validateEezCodeForLanding({ errors: [], eezCode: 'FRA;UK;GER' });

      expect(result.eezName).toBeUndefined();
      expect(result.errors).toStrictEqual(['validation.eezCode.string.unknown']);
    });

    it('should return an error when multiple EEZ codes are provided with duplicate codes', () => {
      // FRA/FR are the same country
      const result = SUT.validateEezCodeForLanding({ errors: [], eezCode: 'FRA;GB;FR' });

      expect(result.eezName).toBeUndefined();
      expect(result.errors).toStrictEqual(['validation.eezCode.string.invalid']);
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


      it('should return an error when more than 5 EEZ codes are provided', () => {
        const landing = {
          eezCode: 'GB;FR;DE;IT;ES;PT',
          errors: []
        };

        const result = SUT.validateEezCodeForLanding(landing);

        expect(result.errors).toContain('validation.eezCode.string.max');
      });

  
      it('zero (edge case for num >= 0)', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(0);
        expect(result).toBe(true);
      });

      it('a very small positive number', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(0.01);
        expect(result).toBe(true);
      });

      it('a large positive integer', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(999999);
        expect(result).toBe(true);
      });

      it('a positive float with one decimal place', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(5.5);
        expect(result).toBe(true);
      });

      it('a positive float with exactly two decimal places', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(10.99);
        expect(result).toBe(true);
      });

      it('a positive float with trailing zeros (2.50)', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(2.50);
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

      it('negative zero (JavaScript quirk)', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(-0);
        // -0 is technically >= 0 in JavaScript, so should return true
        expect(result).toBe(true);
      });

      it('a very small negative number (-0.01)', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(-0.01);
        expect(result).toBe(false);
      });

      it('a large negative number', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(-999999);
        expect(result).toBe(false);
      });

      it('a negative number with two valid decimals (-5.99)', () => {
        const result = SUT.isPositiveNumberWithTwoDecimals(-5.99);
        expect(result).toBe(false);
      });

    });

  });

  describe('validateHighSeasAreaForLanding', () => {

    const uploadedLanding = {
      rowNumber : undefined,
      originalRow : undefined,
      productId : undefined,
      product : undefined,
      landingDate: undefined,
      faoArea: faoAreas[0],
      highSeasArea: "yes",
      vessel : undefined,
      vesselPln: undefined,
      exportWeight: undefined,
      errors : []
    }

    it('should return an error if the high seas area is missing', () => {
      const result = SUT.validateHighSeasAreaForLanding(
        {
          ...uploadedLanding,
          highSeasArea: undefined,
          errors: []
        }
      );

      expect(result.errors).toStrictEqual(['error.highSeasArea.any.missing']);
    });

    it('should return an error if the high seas area is invalid', () => {

      const result = SUT.validateHighSeasAreaForLanding(
        {
          ...uploadedLanding,
          highSeasArea: 'invalid',
          errors: []
        }
      );

      expect(result.errors).toStrictEqual(['error.highSeasArea.any.invalid']);

    });

    it('should return no errors if the high seas area is valid', () => {

      const result = SUT.validateHighSeasAreaForLanding(
        {
          ...uploadedLanding,
          errors: []
        }
      );

      expect(result.errors).toStrictEqual([]);

    });

    it('should return an error if the high seas area is empty', () => {

      const result = SUT.validateHighSeasAreaForLanding(
        {
          ...uploadedLanding,
          highSeasArea: '',
          errors: []
        }
      );

      expect(result.errors).toStrictEqual(['error.highSeasArea.any.missing']);

    });
  });

});