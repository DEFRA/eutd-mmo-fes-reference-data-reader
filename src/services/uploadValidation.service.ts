import moment from "moment";
import { commoditySearch } from "../controllers/species";
import { vesselSearch } from "../controllers/vessel";
import { getSeasonalFish } from "../data/cache";
import { faoAreas } from "../data/faoAreas";
import { IProduct, ISeasonalFishPeriod, ICommodityCode } from "../interfaces/products.interfaces";
import { IUploadedLanding } from "../interfaces/uploads.interfaces";
import { IVessel } from "../interfaces/vessels.interfaces";
import { pipe } from "../utils/functions";

export const validateLandings = (landings: IUploadedLanding[], products: IProduct[], landingLimitDaysInFuture: number): IUploadedLanding[] => {
  const seasonalRestrictions = getSeasonalFish();

  const validateProduct = (landing: IUploadedLanding) =>
    validateProductForLanding(landing, products, seasonalRestrictions);

  const validateLandingDate = (landing: IUploadedLanding) =>
    validateDateForLanding(landing, landingLimitDaysInFuture);

  return landings.map(l =>
    pipe(
      initialiseErrorsForLanding,
      validateLandingDate,
      validateExportWeightForLanding,
      validateFaoAreaForLanding,
      validateProduct,
      validateVesselForLanding
    )(l)
  );
}

export const initialiseErrorsForLanding = (landing: IUploadedLanding): IUploadedLanding => {
  landing.errors = [];
  return landing;
}

export const validateDateForLanding = (landing: IUploadedLanding, landingLimitDaysInFuture: number): IUploadedLanding => {

  if (landing.startDate && !moment(landing.startDate, 'DD/MM/YYYY', true).isValid()) {
    landing.errors.push('error.startDate.date.base');
    return landing;
  }

  if(landing.landingDate === undefined || landing.landingDate === '') {
    landing.errors.push('error.dateLanded.date.missing');
    return landing;
  }

  const landingDate = moment(landing.landingDate, 'DD/MM/YYYY', true);

  if (!landingDate.isValid()) {
    landing.errors.push('error.dateLanded.date.base');
    return landing;
  }

  if (landing.startDate && landingDate.isBefore(moment(landing.startDate, 'DD/MM/YYYY', true), 'day')) {
    landing.errors.push('error.startDate.date.max');
    return landing;
  }

  const maxValidDate = moment.utc().add(landingLimitDaysInFuture, 'days');

  if(landingDate.utc() > maxValidDate) {
    landing.errors.push({
      key: 'error.dateLanded.date.max',
      params: [landingLimitDaysInFuture],
    });
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

  //Update Description
  if (specificCommodity) {
    landing.product.commodity_code_description = specificCommodity.description;
    landing.product.presentationLabel = specificCommodity.presentationLabel;
    landing.product.stateLabel = specificCommodity.stateLabel
  }

  const landingDate = moment(landing.landingDate, 'DD/MM/YYYY', true);

  if (landingDate.isValid()) {
    const dateIsRestricted = hasSeasonalFishingRestriction(landingDate.format('YYYY-MM-DD'), favouriteProduct.speciesCode, seasonalRestrictions);

    if (dateIsRestricted) {
      landing.errors.push("validation.product.seasonal.invalid-date");
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