import moment from "moment";
import { commoditySearch } from "../controllers/species";
import { vesselSearch } from "../controllers/vessel";
import {
  getSeasonalFish,
  getGearTypes,
  getVesselsData,
  getCountries,
  getRfmos,
} from "../data/cache";
import { faoAreas } from "../data/faoAreas";
import { IProduct, ISeasonalFishPeriod, ICommodityCode } from "../interfaces/products.interfaces";
import { IUploadedLanding } from "../interfaces/uploads.interfaces";
import { IVessel } from "../interfaces/vessels.interfaces";
import { pipe } from "../utils/functions";
import { GearRecord } from "../interfaces/gearTypes.interface";
import { equalsIgnoreCase } from "../utils/string";
import { ICountry } from "mmo-shared-reference-data";
import ApplicationConfig from "../config";
const gearCodeRegex = /^[a-zA-Z]{2,3}$/;
const isoCountryCodeRegex = /^[A-Z]{2,3}$/;

export const validateLandings = async (products: IProduct[], landingLimitDaysInFuture: number, landings: IUploadedLanding[]): Promise<IUploadedLanding[]> => {
  const seasonalRestrictions = getSeasonalFish();

  const validateProduct = (landing: IUploadedLanding) =>
    validateProductForLanding(landing, products, seasonalRestrictions);

  const validateLandingDate = (landing: IUploadedLanding) =>
    validateDateForLanding(landing, landingLimitDaysInFuture);

  const gearRecords = getGearTypes();
  const validateGearCode = (landing: IUploadedLanding) =>
    validateGearCodeForLanding(landing, gearRecords);

  return landings.map(l =>
    pipe(
      initialiseErrorsForLanding,
      validateProduct,
      validateLandingDate,
      validateFaoAreaForLanding,
      validateHighSeasAreaForLanding,
      validateRfmoCodeForLanding,
      validateEezCodeForLanding,
      validateVesselForLanding,
      validateGearCode,
      validateExportWeightForLanding,
    )(l)
  );
}

export const initialiseErrorsForLanding = (landing: IUploadedLanding): IUploadedLanding => {
  landing.errors = [];
  return landing;
}

/**
 * Validates landing and start dates against business rules
 * @param landing - Uploaded landing data
 * @param landingLimitDaysInFuture - Max days in future for landing date
 * @returns Landing object with validation errors
 */
export const validateDateForLanding = (
  landing: IUploadedLanding,
  landingLimitDaysInFuture: number
): IUploadedLanding => {
  // Validate start date exists
  if (!landing.startDate) {
    landing.errors.push('error.startDate.date.missing');
    return landing;
  }

  const startDate = moment(landing.startDate, ['DD/MM/YYYY', 'D/M/YYYY'], true);

  // Validate start date format
  if (!startDate.isValid()) {
    landing.errors.push('error.startDate.date.base');
    return landing;
  }

  // Validate landing date exists
  if (!landing.landingDate) {
    landing.errors.push('error.dateLanded.date.missing');
    return landing;
  }

  const landingDate = moment(landing.landingDate, ['DD/MM/YYYY', 'D/M/YYYY'], true);

  // Validate landing date format
  if (!landingDate.isValid()) {
    landing.errors.push('error.dateLanded.date.base');
    return landing;
  }

  // Validate landing date is not before start date
  if (landingDate.isBefore(startDate, 'day')) {
    landing.errors.push('error.startDate.date.max');
    return landing;
  }

  // Validate landing date is not too far in future
  const maxValidDate = moment.utc().add(landingLimitDaysInFuture, 'days');
  if (landingDate.utc().isAfter(maxValidDate)) {
    landing.errors.push({
      key: 'error.dateLanded.date.max',
      params: [landingLimitDaysInFuture],
    });
  }

  return landing;
};

export const validateExportWeightForLanding = (landing: IUploadedLanding): IUploadedLanding => {
  if (!landing.exportWeight) {
    landing.errors.push('error.exportWeight.any.missing');
  }
  else if (landing.exportWeight <= 0){
    landing.errors.push('error.exportWeight.number.greater');
  }
  else if (!isPositiveNumberWithTwoDecimals(landing.exportWeight)) {
    landing.errors.push('error.exportWeight.number.decimal-places');
  }

  return landing;
}

export const validateFaoAreaForLanding = (landing: IUploadedLanding): IUploadedLanding => {
  if (!landing.faoArea) {
    landing.errors.push('error.faoArea.any.missing');
  } else if (!faoAreas.find((area: string) => area === landing.faoArea)) {
    landing.errors.push('error.faoArea.any.invalid');
  }

  return landing;
}

export const validateVesselForLanding = (landing: IUploadedLanding): IUploadedLanding => {
  if (!landing.vesselPln) {
    landing.errors.push('error.vesselPln.any.missing');
    return landing;
  }

  const knownVessels = getVesselsData();
  if (!knownVessels.find(v => equalsIgnoreCase(landing.vesselPln, v.registrationNumber) || equalsIgnoreCase(landing.vesselPln, v.fishingVesselName))) {
    landing.errors.push('error.vesselPln.any.exists');
    return landing;
  }

  const landingDate = moment(landing.landingDate, 'DD/MM/YYYY', true);

  if (landingDate.isValid()) {
    const vessels: IVessel[] = vesselSearch(landing.vesselPln, landingDate.toISOString());
    const vessel = vessels.find(v => v.pln === landing.vesselPln);

    if (vessel) {
      landing.vessel = vessel;
    }
    else {
      landing.errors.push('error.vesselPln.any.invalid')
    }
  }

  return landing;
}

export const validateProductForLanding = (landing: IUploadedLanding, products: IProduct[], seasonalRestrictions: ISeasonalFishPeriod[]): IUploadedLanding => {
  if (!landing.productId) {
    landing.errors.push("error.product.any.missing");
    return landing;
  }

  const favouriteProduct = products.find((p: IProduct) => p.id === landing.productId);

  if (!favouriteProduct) {
    landing.errors.push("error.product.any.exists");
    return landing;
  }

  const commodityCodes = commoditySearch(favouriteProduct.speciesCode, favouriteProduct.state, favouriteProduct.presentation);
  const favouriteIsValid = isFavouriteValid(favouriteProduct, commodityCodes);

  if (!favouriteIsValid) {
    landing.errors.push("error.product.any.invalid");
    return landing;
  }

  landing.product = favouriteProduct;

  const specificCommodity = commodityCodes.find(code => code.code === landing.product.commodity_code);

  if (specificCommodity) {
    landing.product.commodity_code_description = specificCommodity.description;
    landing.product.presentationLabel = specificCommodity.presentationLabel;
    landing.product.stateLabel = specificCommodity.stateLabel
  }

  const startDate = moment(landing.startDate, 'DD/MM/YYYY', true);

  if (startDate.isValid()) {
    const dateIsRestricted = hasSeasonalFishingRestriction(startDate.format('YYYY-MM-DD'), favouriteProduct.speciesCode, seasonalRestrictions);

    if (dateIsRestricted) {
      landing.errors.push({
        key: "validation.product.start-date.seasonal.invalid-date",
        params: [favouriteProduct.species]
      });
    }
  }

  const landingDate = moment(landing.landingDate, 'DD/MM/YYYY', true);

  if (landingDate.isValid()) {
    const dateIsRestricted = hasSeasonalFishingRestriction(landingDate.format('YYYY-MM-DD'), favouriteProduct.speciesCode, seasonalRestrictions);

    if (dateIsRestricted) {
      landing.errors.push({
        key: 'validation.product.seasonal.invalid-date',
        params: [favouriteProduct.species]
      });
    }
  }

  return landing;
}

export const validateGearCodeForLanding = (landing: IUploadedLanding, gearRecords: GearRecord[]): IUploadedLanding => {
  // Gear code is now required
  if (!landing.gearCode) {
    landing.errors.push('error.gearCode.any.missing');
    return landing;
  }
  if (!gearCodeRegex.test(landing.gearCode)) {
    landing.errors.push('validation.gearCode.string.invalid');
  } else {
    const gearRecord = gearRecords.find(r => equalsIgnoreCase(landing.gearCode, r["Gear code"]));
    if (!gearRecord) {
      landing.errors.push('validation.gearCode.string.unknown');
    } else {
      landing.gearCategory = gearRecord["Gear category"];
      landing.gearName = gearRecord["Gear name"];
    }
  }

  return landing;
}

export const validateHighSeasAreaForLanding = (landing: IUploadedLanding): IUploadedLanding => {
  if (!landing.highSeasArea) {
    landing.errors.push('error.highSeasArea.any.missing');
    return landing;
  }

  const normalizedValue = landing.highSeasArea.toLowerCase();
  
  if (!["yes", "no"].includes(normalizedValue)) {
    landing.errors.push('error.highSeasArea.any.invalid');
  }

  landing.highSeasArea = normalizedValue;
  return landing;
};

export const validateRfmoCodeForLanding = (landing: IUploadedLanding): IUploadedLanding => {
  if (!landing.rfmoCode) return landing;
  const rfmoRecord = getRfmos()?.find(r => equalsIgnoreCase(landing.rfmoCode, r['Abbreviation']));
  if (!rfmoRecord) {
    landing.errors.push('validation.rfmoCode.string.unknown');
  } else {
    landing.rfmoName = rfmoRecord['Full text'];
  }

  return landing;
}

// ========================================
// EEZ Validation Helper Functions
// (Cognitive complexity reduction - each ≤3)
// ========================================

/**
 * Parses semicolon-separated EEZ codes into normalized array
 * @param eezCode - Raw EEZ code string (e.g., "FR;GB;NLD")
 * @returns Array of uppercase, trimmed codes
 */
const parseEezCodes = (eezCode: string): string[] => {
  return eezCode
    .split(';')
    .map(c => c.trim().toUpperCase())
    .filter(c => c);
};

/**
 * Validates all codes match ISO format and are unique
 * @param codes - Array of EEZ codes
 * @returns Array of unique valid codes
 */
const validateEezCodeFormat = (codes: string[]): string[] => {
  const validCodes = codes.filter(c => isoCountryCodeRegex.test(c));
  return [...new Set(validCodes)];
};

/**
 * Finds country by 2-char or 3-char ISO code
 * @param code - ISO country code (e.g., "FR" or "FRA")
 * @returns Country object or undefined
 */
const findCountryByCode = (code: string): ICountry | undefined => {
  return getCountries()?.find(
    c => equalsIgnoreCase(code, c.isoCodeAlpha3) || equalsIgnoreCase(code, c.isoCodeAlpha2)
  );
};

/**
 * Checks for duplicate countries referenced by different ISO codes
 * @param eezDataArr - Array of country objects (may contain undefined)
 * @returns true if duplicates found (e.g., "FR" and "FRA" both present)
 */
const hasDuplicateCountries = (eezDataArr: Array<ICountry | undefined>): boolean => {
  const countryNames = eezDataArr
    .map(eezData => eezData?.officialCountryName)
    .filter((name): name is string => name !== undefined);
  
  return new Set(countryNames).size !== countryNames.length;
};

/**
 * Validates EEZ code field with format and existence checks
 * Required field as of business rule update
 * @param landing - Uploaded landing data
 * @returns Landing with enriched eezData or validation errors
 */
export const validateEezCodeForLanding = (landing: IUploadedLanding): IUploadedLanding => {  
  // EEZ code is now required only if high seas is "no"
  if(!landing.eezCode && landing.highSeasArea === 'yes') return landing;
  if ((!landing.eezCode || landing.eezCode.trim() === '') && landing.highSeasArea === 'no') {
    landing.errors.push('error.eezCode.any.missing');
    return landing;
  }

  const codes = parseEezCodes(landing.eezCode);
  const validCodes = validateEezCodeFormat(codes);
  if (codes.length > ApplicationConfig.euCatchMaxEEZ) {
     landing.errors.push('validation.eezCode.string.max');
  }
  // Validate code format (must be valid ISO codes)
  if (!validCodes.length || validCodes.length !== codes.length) {
    landing.errors.push('validation.eezCode.string.invalid');
    return landing;
  }

  // Find countries by codes
  const eezDataArr = validCodes.map(findCountryByCode);

  // Check for duplicate countries (e.g., FR and FRA both used)
  if (hasDuplicateCountries(eezDataArr)) {
    landing.errors.push('validation.eezCode.string.invalid');
    return landing;
  }

  // Check all codes resolve to valid countries
  const eezNames = eezDataArr.filter((data): data is ICountry => data !== undefined);
  
  if (validCodes.length !== eezNames.length) {
    landing.errors.push('validation.eezCode.string.unknown');
    return landing;
  }

  // All validations passed - enrich landing with EEZ data
  landing.eezData = eezNames;

  return landing;
};

// ========================================
// Utility Functions
// ========================================

export const isPositiveNumberWithTwoDecimals = (num: number): boolean => {
  if (isNaN(num) || num < 0) {
    return false;
  }
  
  // Safer: Check decimal places by converting to string
  const numStr = num.toString();
  const decimalIndex = numStr.indexOf('.');
  
  if (decimalIndex === -1) {
    return true; // No decimals
  }
  
  return numStr.length - decimalIndex - 1 <= 2; // Max 2 decimal places
};

const isFavouriteValid = (favouriteProduct: IProduct, commodityCodes: ICommodityCode[]): boolean =>
  commodityCodes.some(
    (commodity: ICommodityCode) =>
      commodity.code === favouriteProduct.commodity_code
      && `${commodity.faoName} (${favouriteProduct.speciesCode})` === favouriteProduct.species
  );

const hasSeasonalFishingRestriction = (landingDate: string, speciesCode: string, seasonalRestrictions: ISeasonalFishPeriod[]): boolean =>
  seasonalRestrictions.some(
    (period: ISeasonalFishPeriod) =>
      period.fao === speciesCode &&
      moment(period.validFrom).isSameOrBefore(landingDate) &&
      moment(landingDate).isSameOrBefore(period.validTo)
  );