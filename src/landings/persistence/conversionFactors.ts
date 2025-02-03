import type { IConversionFactor } from 'mmo-shared-reference-data';
import { IProduct } from '../types/appConfig/conversionFactors';
import logger from '../../logger';
import * as file from '../../data/local-file';
import { getToLiveWeightFactor, getAllConversionFactors } from '../../data/cache';

export const getConversionFactors = (
  products?: IProduct[]
): IConversionFactor[] => {
  let conversionFactors = [];

  if (products) {
    for (const product of products) {
      const factor = getToLiveWeightFactor(
        product.species,
        product.state,
        product.presentation
      );
      logger.info(
        `[GET-CONVERSION-FACTOR][species:${product.species} state:${product.state} presentation:${product.presentation}][SUCCESS]`
      );
      conversionFactors.push({
        ...product,
        toLiveWeightFactor: factor,
      });
    }
  } else {
    conversionFactors = getAllConversionFactors();
    logger.info(`[GET-CONVERSION-FACTOR][GETTING-ALL-FACTORS][SUCCESS]`);
  }

  return conversionFactors;
};

export const loadConversionFactorsFromLocalFile = async (): Promise<IConversionFactor[]> => {
  try {
    const factors: IConversionFactor[] = await file.getConversionFactors(`${__dirname}/../../../data/conversionfactors.csv`) || [];

    logger.info(`[CONVERSION-FACTORS][LOAD-CONVERSION-FACTORS][${factors.length}]`);

    return factors;
  } catch (e) {
    logger.warn(`[CONVERSION-FACTORS][LOAD-CONVERSION-FACTORS][ERROR][${e}]`);
  }
};