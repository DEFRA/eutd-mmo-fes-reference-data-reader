import {
  getVesselsOfInterestFromFile,
  getWeightingRiskFromFile
} from '../../data/local-file';
import {
  VesselOfInterestModel,
  IVesselOfInterest,
  IWeighting,
  WeightingModel,
  SpeciesRiskToggleModel,
  ISpeciesRiskToggle,
} from '../types/appConfig/risking';
import logger from '../../logger';

export const seedVesselsOfInterest = async () => {
  try {
    const vesselsOfInterest = await getVesselsOfInterestFromFile(`${__dirname}/../../../data/vesselsOfInterest.csv`);

    logger.info(`[RISKING-SAVE-VESSELS-OF-INTEREST][${JSON.stringify(vesselsOfInterest)}`);

    await VesselOfInterestModel.deleteMany({});
    await VesselOfInterestModel.insertMany([...vesselsOfInterest]);

    return vesselsOfInterest;
  } catch (e) {
    logger.error(`[RISKING-SAVE-VESSELS-OF-INTEREST][ERROR][LOADING LOCAL MODE][${e}]`);
  }
};

export const filterVesselsOfInterest = async (searchTerm: string): Promise<IVesselOfInterest[]> =>
  await VesselOfInterestModel.find({
    $or: [
        {'registrationNumber': {'$regex': searchTerm, $options:'i'}},
        {'fishingVesselName': {'$regex': searchTerm, $options:'i'}}
    ]
  })
    .select(['-_id','-__v','-__t'])
      .lean();

export const getVesselsOfInterest = async (): Promise<IVesselOfInterest[]> =>
    await VesselOfInterestModel.find({})
        .select(['-_id','-__v','-__t'])
        .lean();

export const createVesselOfInterest = async (vessel): Promise<void> => {
  try {
    logger.info(`[RISKING-ADD-VESSELS-OF-INTEREST][${JSON.stringify(vessel)}]`);

    await new VesselOfInterestModel({
      registrationNumber: vessel.pln,
      fishingVesselName: vessel.vesselName,
      homePort: vessel.homePort,
      da: vessel.da
    }).save();
  } catch (e) {
    logger.warn(`[RISKING-ADD-VESSEL-OF-INTEREST][ERROR][${e}]`);
  }
}

export const deleteVesselOfInterest = async (pln: string, vesselName: string):Promise<void> => {
  await VesselOfInterestModel.findOneAndDelete({
    registrationNumber: pln,
    fishingVesselName: vesselName
  });
}

export const seedWeightingRisk = async (): Promise<IWeighting> => {
  try {
    const weighting = await getWeightingRiskFromFile(`${__dirname}/../../../data/weightingRisk.csv`)
      .then(result => result[0]);

    logger.info(`[RISKING-WEIGHTING][${JSON.stringify(weighting)}`);

    await WeightingModel.deleteMany({});
    await WeightingModel.create(weighting);

    return weighting;
  }
  catch (e) {
    logger.error(`[RISKING-WEIGHTING][ERROR][LOADING LOCAL MODE][${e}]`);
  }
};

export const getWeightingRisk = async (): Promise<IWeighting> =>
  await WeightingModel.findOne({})
    .select(['-_id','-__v','-__t'])
      .lean();


export const setWeightingRisk = async (exporter: number, species: number, vessel: number): Promise<void> => {
  const update = {
    exporterWeight: exporter,
    speciesWeight: species,
    vesselWeight: vessel
  };

  await WeightingModel.updateOne({}, update);
};

export const setThresholdRisk = async (threshold: number) : Promise<void> => {
  await WeightingModel.updateOne({},{threshold: threshold});
};

export const setSpeciesToggle = async (input: ISpeciesRiskToggle) => {
  await SpeciesRiskToggleModel.updateOne({}, input, {upsert: true});
};

export const getSpeciesToggle = async (): Promise<ISpeciesRiskToggle> => {
  return await SpeciesRiskToggleModel.findOne({})
    .select(['-_id','-__v','-__t'])
      .lean();
};