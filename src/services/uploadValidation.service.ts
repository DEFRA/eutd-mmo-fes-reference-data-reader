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

const gearCodeRegex = /^[a-zA-Z]{2,3}$/;
const isoCountryCodeRegex = /^[A-Z]{2,3}$/;

export const validateLandings = (landings: IUploadedLanding[], products: IProduct[], landingLimitDaysInFuture: number): IUploadedLanding[] => {
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

export const validateDateForLanding = (landing: IUploadedLanding, landingLimitDaysInFuture: number): IUploadedLanding => {
  const { errors } = landing;
  const startDate = landing.startDate ? moment(landing.startDate, 'DD/MM/YYYY', true) : null;
  const landingDate = landing.landingDate ? moment(landing.landingDate, 'DD/MM/YYYY', true) : null;

   // only validate the start date if set
   if (startDate && !startDate.isValid()) {
    errors.push('error.startDate.date.base');
  } 

  if (!landingDate) {
    errors.push('error.dateLanded.date.missing');
  } else if (!landingDate.isValid()) {
    errors.push('error.dateLanded.date.base');
  } else if (startDate?.isValid() && landingDate.isBefore(startDate, 'day')) {
    errors.push('error.startDate.date.max');
  } else {
    const maxValidDate = moment.utc().add(landingLimitDaysInFuture, 'days');
    if (landingDate.utc() > maxValidDate) {
      errors.push({
        key: 'error.dateLanded.date.max',
        params: [landingLimitDaysInFuture],
      })
    }
  }

  return landing;
}

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
  if (!landing.gearCode) return landing;

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
  if (landing.highSeasArea && ["yes", "no"].indexOf(landing.highSeasArea.toLowerCase()) === -1) {
    landing.errors.push('error.highSeasArea.any.invalid');
  }

  landing.highSeasArea = landing.highSeasArea?.toLowerCase();

  return landing;
}

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

export const validateEezCodeForLanding = (landing: IUploadedLanding): IUploadedLanding => {
  if (!landing.eezCode) return landing;

  const codes = landing.eezCode.split(';')
    .map(c => c.trim().toUpperCase())
    .filter(c => c);
  const validCodes = [...new Set(codes.filter(c => isoCountryCodeRegex.test(c)))];

  if (!validCodes.length || validCodes.length !== codes.length) {
    landing.errors.push('validation.eezCode.string.invalid');
  } else {
    const getEezNameByCode = (code: string) => getCountries()?.
      find(c => equalsIgnoreCase(code, c.isoCodeAlpha3) || equalsIgnoreCase(code, c.isoCodeAlpha2))?.officialCountryName;
    const eezNames = validCodes.map(getEezNameByCode).filter(eez => eez);
    if (new Set(eezNames).size !== eezNames.length) {
      // detect duplicate codes e.g. FR;FRA
      landing.errors.push('validation.eezCode.string.invalid');
    } else if (validCodes.length !== eezNames.length) {
      landing.errors.push('validation.eezCode.string.unknown');
    } else {
      landing.eezName = eezNames.join(', ');
    }
  }

  return landing;
}

export const isPositiveNumberWithTwoDecimals = (num: number) => {
  const regex = /^(\d+(\.\d{0,2})?|\.?\d{1,2})$/;
  return !isNaN(+num) && +num >= 0 && regex.test(''+num);
}

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