import { MongoMemoryServer } from 'mongodb-memory-server';
import { VesselOfInterestModel, IVesselOfInterest, WeightingModel, IWeighting, SpeciesRiskToggleModel } from '../../../src/landings/types/appConfig/risking';
import * as LocalFile from '../../../src/data/local-file';
import * as SUT from '../../../src/landings/persistence/risking';

const mongoose = require('mongoose');


let mongoServer;
let mockGetVesselsOfInterest;

const opts = { connectTimeoutMS:60000, socketTimeoutMS:600000, serverSelectionTimeoutMS:60000 }

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, opts).catch(err => {console.log(err)});
  });

afterEach(async () => {
    await VesselOfInterestModel.deleteMany({});
    await WeightingModel.deleteMany({});
    await SpeciesRiskToggleModel.deleteMany({});
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('vessels of interest', () => {

    const testVesselsOfInterestData: IVesselOfInterest[] = [{
        registrationNumber: "H1100", fishingVesselName: "WIRON 5",    homePort: "PLYMOUTH",  da: "England"
    },{
        registrationNumber: "NN732", fishingVesselName: "CLAR INNIS", homePort: "EASTBOURNE", da: "England"
    },{
        registrationNumber: "RX1", fishingVesselName: "JOCALINDA", homePort: "RYE", da: "England"
    },{
        registrationNumber: "SM161", fishingVesselName: "JUST REWARD", homePort: "WORTHING", da: "England"
    }];

    beforeAll(async () => {
        mockGetVesselsOfInterest = jest.spyOn(LocalFile, 'getVesselsOfInterestFromFile');
        mockGetVesselsOfInterest.mockResolvedValue(testVesselsOfInterestData);
    });

    afterAll(async () => {
        jest.restoreAllMocks();
    });

    it('will successfully seed vessels of interest', async () => {
        const vesselsOfInterest = new VesselOfInterestModel({
            registrationNumber: "InitialEntry",
            fishingVesselName: "Test",
            homePort: "test",
            da: "test"
        });

        await vesselsOfInterest.save();

        const result = await SUT.seedVesselsOfInterest();
        const count = await VesselOfInterestModel.countDocuments({});

        expect(count).toEqual(4);
        expect(mockGetVesselsOfInterest).toHaveBeenCalled();
        expect(result).toEqual(testVesselsOfInterestData);
    });

    it('will successfully Add a new vessels of interest', async () => {
        const testData = new VesselOfInterestModel(testVesselsOfInterestData[0]);
        await testData.save();

        const testData1 = new VesselOfInterestModel(testVesselsOfInterestData[1]);
        await testData1.save();

        const testData2 = new VesselOfInterestModel(testVesselsOfInterestData[2]);
        await testData2.save();

        const testData3 = new VesselOfInterestModel(testVesselsOfInterestData[3]);
        await testData3.save();

        let count = await VesselOfInterestModel.countDocuments({});
        expect(count).toBe(4);

        const newVesselOfInterest = {
            pln: "NewEntry",
            vesselName: "Test",
            homePort: "test",
            da: "test"
        };
        await SUT.createVesselOfInterest(newVesselOfInterest);
        count = await VesselOfInterestModel.countDocuments({});
        expect(count).toBe(5);
    });

    it('will successfully retrieve all related vessels of interest', async () => {
        const testData = new VesselOfInterestModel(testVesselsOfInterestData[0]);
        await testData.save();

        const testData1 = new VesselOfInterestModel(testVesselsOfInterestData[1]);
        await testData1.save();

        const testData2 = new VesselOfInterestModel(testVesselsOfInterestData[2]);
        await testData2.save();

        const testData3 = new VesselOfInterestModel(testVesselsOfInterestData[3]);
        await testData3.save();

        const count = await VesselOfInterestModel.countDocuments({});
        expect(count).toBe(4);

        let result = await SUT.filterVesselsOfInterest("H1100");
        expect(result).toEqual([testVesselsOfInterestData[0]]);

        result = await SUT.filterVesselsOfInterest("W");
        expect(result).toEqual([testVesselsOfInterestData[0], testVesselsOfInterestData[3]]);

        result = await SUT.filterVesselsOfInterest("J");
        expect(result).toEqual([testVesselsOfInterestData[2], testVesselsOfInterestData[3]]);

        result = await SUT.filterVesselsOfInterest("R");
        expect(result).toEqual(testVesselsOfInterestData);

        result = await SUT.filterVesselsOfInterest("NO-RESULT");
        expect(result).toEqual([]);
    });

    it('will successfully retrieve all vessels of interest', async () => {
        const testData = new VesselOfInterestModel(testVesselsOfInterestData[0]);
        await testData.save();

        const testData1 = new VesselOfInterestModel(testVesselsOfInterestData[1]);
        await testData1.save();

        const testData2 = new VesselOfInterestModel(testVesselsOfInterestData[2]);
        await testData2.save();

        const testData3 = new VesselOfInterestModel(testVesselsOfInterestData[3]);
        await testData3.save();

        const count = await VesselOfInterestModel.countDocuments({});
        expect(count).toBe(4);

        const result = await SUT.getVesselsOfInterest();
        expect(result).toEqual(testVesselsOfInterestData);
    });

    it('will return an empty array if no vessels of interest have been stored', async () => {
        const count = await VesselOfInterestModel.countDocuments({});
        expect(count).toBe(0);

        const result = await SUT.getVesselsOfInterest();
        expect(result).toEqual([]);
    });

    it('will successfully delete a vessel of interest', async () => {
        const testData = new VesselOfInterestModel(testVesselsOfInterestData[0]);
        await testData.save();

        const testData1 = new VesselOfInterestModel(testVesselsOfInterestData[1]);
        await testData1.save();

        const testData2 = new VesselOfInterestModel(testVesselsOfInterestData[2]);
        await testData2.save();

        const testData3 = new VesselOfInterestModel(testVesselsOfInterestData[3]);
        await testData3.save();

        let count = await VesselOfInterestModel.countDocuments({});
        expect(count).toBe(4);

        await SUT.deleteVesselOfInterest("H1100", "WIRON 5");
        count = await VesselOfInterestModel.countDocuments({});
        expect(count).toBe(3);

        await SUT.deleteVesselOfInterest("NOT IN LIST", "NOT IN LIST");
        count = await VesselOfInterestModel.countDocuments({});
        expect(count).toBe(3);

        await SUT.deleteVesselOfInterest("SM161", "JUST REWARD");
        count = await VesselOfInterestModel.countDocuments({});
        expect(count).toBe(2);
    })
});

describe('seedWeightingRisk', () => {

    let mockGetWeighting;

    const testWeightingData: IWeighting[] = [{
        exporterWeight: 1,
        vesselWeight: 1,
        speciesWeight: 1,
        threshold: 1
    }];

    beforeAll(() => {
        mockGetWeighting = jest.spyOn(LocalFile, 'getWeightingRiskFromFile');
        mockGetWeighting.mockResolvedValue(testWeightingData);
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    it('will successfully save weighting risking data', async () => {
        const weighting = testWeightingData[0]
        const result = await SUT.seedWeightingRisk();
        const count = await WeightingModel.countDocuments({});

        expect(count).toEqual(1);
        expect(mockGetWeighting).toHaveBeenCalled();

        expect(result.exporterWeight).toEqual(weighting['exporterWeight']);
        expect(result.vesselWeight).toEqual(weighting['vesselWeight']);
        expect(result.speciesWeight).toEqual(weighting['speciesWeight']);
        expect(result.threshold).toEqual(weighting['threshold']);
    });

});

describe('getWeightingRisk', () => {

    const testWeightingData: IWeighting[] = [{
        exporterWeight: 1,
        vesselWeight: 1,
        speciesWeight: 1,
        threshold: 1
    }];

    it('will successfully retrieve weighting information', async () => {
        await new WeightingModel(testWeightingData[0]).save();

        const count = await WeightingModel.countDocuments({});
        expect(count).toBe(1);

        const result = await SUT.getWeightingRisk();
        expect(result).toEqual(testWeightingData[0]);
    });

    it('will return null if vessel is not of interest', async () => {
        const count = await WeightingModel.countDocuments({});
        expect(count).toBe(0);

        const result = await SUT.getWeightingRisk();
        expect(result).toEqual(null);
    });

});

describe('setWeightingRisk', () => {

  it('will update the weightings but leave the threshold as is', async () => {
    await new WeightingModel({
        exporterWeight: 1,
        vesselWeight: 1,
        speciesWeight: 1,
        threshold: 1
    }).save();

    await SUT.setWeightingRisk(2, 3, 4);

    const result = await SUT.getWeightingRisk();

    expect(result).toEqual({
      exporterWeight: 2,
      speciesWeight: 3,
      vesselWeight: 4,
      threshold: 1
    });
  });

  it('will not upsert if a record doesnt already exist', async () => {
    await SUT.setWeightingRisk(2, 3, 4);

    const result = await SUT.getWeightingRisk();

    expect(result).toEqual(null);
  });

});

describe('setThresholdRisk', () => {

  it('will update the threshold but leave the others weightings as they are', async () => {
    await new WeightingModel({
      exporterWeight: 1,
      vesselWeight: 1,
      speciesWeight: 1,
      threshold: 1
    }).save();

    await SUT.setThresholdRisk(2);

    const result = await SUT.getWeightingRisk();

    expect(result).toEqual({
      exporterWeight: 1,
      speciesWeight: 1,
      vesselWeight: 1,
      threshold: 2
    });
  });

  it('will not upsert if a record doesnt already exist', async () => {
    await SUT.setThresholdRisk(2);

    const result = await SUT.getWeightingRisk();

    expect(result).toEqual(null);
  });

});

describe('setSpeciesToggle', () => {

    it('will insert the species toggle if it doesnt exist', async () => {

        await SUT.setSpeciesToggle({enabled: true});

        const toggle = await SpeciesRiskToggleModel.find({});

        expect(toggle).toHaveLength(1);
        expect(toggle[0]).toMatchObject({enabled: true});

    });

    it('will update the species toggle if it already exists', async () => {

        await SUT.setSpeciesToggle({enabled: true});
        await SUT.setSpeciesToggle({enabled: false});

        const toggle = await SpeciesRiskToggleModel.find({});

        expect(toggle).toHaveLength(1);
        expect(toggle[0]).toMatchObject({enabled: false});

    });

});

describe('getSpeciesToggle', () => {

    it('will get the toggle when its true', async () => {

        await SUT.setSpeciesToggle({enabled: true});

        const result = await SUT.getSpeciesToggle();

        expect(result).toMatchObject({enabled: true});

    });

    it('will get the toggle when its false', async () => {

        await SUT.setSpeciesToggle({enabled: false});

        const result = await SUT.getSpeciesToggle();

        expect(result).toMatchObject({enabled: false});

    });

    it('will return null if the toggle isnt set', async () => {

        const result = await SUT.getSpeciesToggle();

        expect(result).toBeNull();

    });

});