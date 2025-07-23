import logger from "../../src/logger";
import * as blob from '../../src/data/blob-storage';
import { BlobServiceClient, ContainerClient, BlobClient } from "@azure/storage-blob";
import config from '../../src/config';
jest.mock("@azure/storage-blob");
const speciesmismatch = require(__dirname + '/../../data/speciesmismatch.json');
const fs = require('fs');

describe('getExporterBehaviourData', () => {

    let mockLogError;
    let mockReadToText;
    let mockBlobClient;

    const container = "exporterbehaviour";
    const file = "exporter_behaviour.csv";

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
        mockReadToText = jest.spyOn(blob, 'readToText');

        mockBlobClient = jest.spyOn(BlobServiceClient, 'fromConnectionString');
        const containerObj = new ContainerClient(container);
        containerObj.getBlobClient = () => new BlobClient(file);
        mockBlobClient.mockImplementation(() => ({
            getContainerClient: () => containerObj,
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('will log and rethrow any errors', async () => {
        const error = new Error('ExporterBehaviourMockError');
        mockReadToText.mockRejectedValue(error);

        await expect(blob.getExporterBehaviourData('connString')).rejects.toThrow(error);

        expect(mockLogError).toHaveBeenNthCalledWith(1, error);
        expect(mockLogError).toHaveBeenNthCalledWith(2, 'Cannot read remote file exporter_behaviour.csv from container exporterbehaviour')
    });

    it('will return exporter behaviour data', async () => {
        mockReadToText.mockResolvedValue('accountId,contactId,name,score\nID1,,Exporter 1,0.5\nID2,,Exporter 2,0.75');
        const expected = [
            { accountId: 'ID1', name: 'Exporter 1', score: 0.5 },
            { accountId: 'ID2', name: 'Exporter 2', score: 0.75 }
        ]

        const res = await blob.getExporterBehaviourData('connString');

        expect(res).toStrictEqual(expected);
    });

});

describe('getAllSpecies', () => {

    let mockLogError;
    let mockReadToText;
    let mockBlobClient;

    const container = 'allspecies';
    const file = 'allSpecies.csv'

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
        mockReadToText = jest.spyOn(blob, 'readToText');
        mockBlobClient = jest.spyOn(BlobServiceClient, 'fromConnectionString');

        config.allSpeciesContainerName = container;
        config.allSpeciesFileName = file;

        const containerObj = new ContainerClient(container);
        containerObj.getBlobClient = () => new BlobClient(file);
        mockBlobClient.mockImplementation(() => ({
            getContainerClient: () => containerObj,
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('will log and rethrow any errors', async () => {
        const error = new Error('AllSpeciesMockError');
        mockReadToText.mockRejectedValue(error);

        await expect(blob.getAllSpecies('connString')).rejects.toThrow(error);

        expect(mockLogError).toHaveBeenNthCalledWith(1, error);
        expect(mockLogError).toHaveBeenNthCalledWith(2, `Cannot read remote file ${file} from container ${container}`)
    });

    it('will return exporter behaviour data', async () => {
        mockReadToText.mockResolvedValue('faoCode,faoName,scientificName\nAAB,Twobar seabream,Acanthopagrus bifasciatus\nAAE,Tailjet frogfish,Antennarius analis');
        const expected = [
            { faoCode: 'AAB', faoName: 'Twobar seabream', scientificName: 'Acanthopagrus bifasciatus' },
            { faoCode: 'AAE', faoName: 'Tailjet frogfish', scientificName: 'Antennarius analis' }
        ]

        const res = await blob.getAllSpecies('connString');
        expect(mockReadToText).toHaveBeenCalled();
        expect(res).toStrictEqual(expected);
    });

});

describe('getSpeciesData', () => {

    let mockLogError;
    let mockReadToText;
    let mockBlobClient;

    const container = 'commoditycodedata';
    const file = 'commodity_code.txt'

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
        mockReadToText = jest.spyOn(blob, 'readToText');

        mockBlobClient = jest.spyOn(BlobServiceClient, 'fromConnectionString');
        const containerObj = new ContainerClient(container);
        containerObj.getBlobClient = () => new BlobClient(file);
        mockBlobClient.mockImplementation(() => ({
            getContainerClient: () => containerObj,
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('will log and rethrow any errors', async () => {
        const error = new Error('SpeciesMockError');

        mockReadToText.mockRejectedValue(error);
        await expect(blob.getSpeciesData('connString')).rejects.toThrow('Error: SpeciesMockError');

        expect(mockLogError).toHaveBeenNthCalledWith(1, error);
        expect(mockLogError).toHaveBeenNthCalledWith(2, `Cannot read remote file ${file} from container ${container}`);
    });

    it('will return species data', async () => {
        mockReadToText.mockResolvedValue(fs.readFileSync(__dirname + '/../../data/commodity_code.txt', 'utf-8'));
        const res = await blob.getSpeciesData('connString');

        expect(res.length).toBeGreaterThan(0);
    });

});

describe('getCommodityCodeData', () => {

    let mockLogError;
    let mockReadToText;
    let mockBlobClient;
    const container = 'commoditycodedata';
    const file = 'commodity_code_ps_sd.txt'

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
        mockReadToText = jest.spyOn(blob, 'readToText');

        mockBlobClient = jest.spyOn(BlobServiceClient, 'fromConnectionString');
        const containerObj = new ContainerClient(container);
        containerObj.getBlobClient = () => new BlobClient(file);
        mockBlobClient.mockImplementation(() => ({
            getContainerClient: () => containerObj,
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('will log and rethrow any errors', async () => {
        const error = new Error('CommodityCodeMockError');
        mockReadToText.mockRejectedValue(error);

        await expect(blob.getCommodityCodeData('connString')).rejects.toThrow('Error: CommodityCodeMockError');

        expect(mockLogError).toHaveBeenNthCalledWith(1, error);
        expect(mockLogError).toHaveBeenNthCalledWith(2, `Cannot read remote file ${file} from container ${container}`);
    });

    it('will return species data', async () => {
        mockReadToText.mockResolvedValue(fs.readFileSync(__dirname + '/../../data/commodity_code.txt', 'utf-8'));
        const res = await blob.getCommodityCodeData('connString');

        expect(res.length).toBeGreaterThan(0);
    });

});

describe('getSeasonalFishData', () => {

    let mockLogError;
    let mockReadToText;
    let mockBlobClient;
    const container = 'seasonalfish';
    const file = 'seasonal_fish.csv'

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
        mockReadToText = jest.spyOn(blob, 'readToText');

        mockBlobClient = jest.spyOn(BlobServiceClient, 'fromConnectionString');
        const containerObj = new ContainerClient(container);
        containerObj.getBlobClient = () => new BlobClient(file);
        mockBlobClient.mockImplementation(() => ({
            getContainerClient: () => containerObj,
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('will log and rethrow any errors', async () => {
        const error = new Error('SeasonalFishMockError');
        mockReadToText.mockRejectedValue(error);
        await expect(blob.getSeasonalFishData('connString')).rejects.toThrow('Error: SeasonalFishMockError');

        expect(mockLogError).toHaveBeenNthCalledWith(1, error);
        expect(mockLogError).toHaveBeenNthCalledWith(2, `Cannot read remote file ${file} from container ${container}`);
    });

    it('will return seasonal fish data', async () => {
        mockReadToText.mockResolvedValue(fs.readFileSync(__dirname + '/../../data/commodity_code.txt', 'utf-8'));
        const res = await blob.getSeasonalFishData('connString');

        expect(res.length).toBeGreaterThan(0);
    });

});

describe('getConversionFactorsData', () => {

    let mockLogError;
    let mockReadToText;
    let mockBlobClient;

    const container = 'conversionfactors';
    const file = 'conversionfactors.csv'

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
        mockReadToText = jest.spyOn(blob, 'readToText');

        mockBlobClient = jest.spyOn(BlobServiceClient, 'fromConnectionString');
        const containerObj = new ContainerClient(container);
        containerObj.getBlobClient = () => new BlobClient(file);
        mockBlobClient.mockImplementation(() => ({
            getContainerClient: () => containerObj,
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('will log and rethrow any errors', async () => {
        const error = new Error('ConversionFactorsMockError');
        mockReadToText.mockRejectedValue(error);

        await expect(blob.getConversionFactorsData('connString')).rejects.toThrow('Error: ConversionFactorsMockError');

        expect(mockLogError).toHaveBeenNthCalledWith(1, error);
        expect(mockLogError).toHaveBeenNthCalledWith(2, `Cannot read remote file ${file} from container ${container}`);
    });

    it('will return conversion factors data', async () => {
        mockReadToText.mockResolvedValue('species,state,presentation,toLiveWeightFactor,quotaStatus,riskScore\nALB,FRE,GUT,1.11,quota,1');
        const res = await blob.getConversionFactorsData('connString');

        expect(res).toHaveLength(1);
        expect(res[0]).toStrictEqual({
            presentation: "GUT",
            quotaStatus: "quota",
            riskScore: "1",
            species: "ALB",
            state: "FRE",
            toLiveWeightFactor: "1.11"
        });
    });

});

describe('getSpeciesAliases', () => {
    let mockLogError;
    let mockReadToText;
    let mockBlobClient;

    const container = 'speciesmismatch';
    const file = 'speciesmismatch.json';

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
        mockReadToText = jest.spyOn(blob, 'readToText');

        mockBlobClient = jest.spyOn(BlobServiceClient, 'fromConnectionString');
        const containerObj = new ContainerClient(container);
        containerObj.getBlobClient = () => new BlobClient(file);
        mockBlobClient.mockImplementation(() => ({
            getContainerClient: () => containerObj,
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('will log and rethrow any errors', async () => {
        const error = new Error('SpeciesAliasesMockError');
        mockReadToText.mockRejectedValue(error);
        await expect(blob.getSpeciesAliases('connString')).rejects.toThrow('Error: SpeciesAliasesMockError');

        expect(mockLogError).toHaveBeenNthCalledWith(1, error);
        expect(mockLogError).toHaveBeenNthCalledWith(2, `Cannot read remote file ${file} from container ${container}`);
    });

    it('will return species aliases data', async () => {
        mockReadToText.mockResolvedValue(JSON.stringify(speciesmismatch))
        const res = await blob.getSpeciesAliases('connString');

        expect(res).toBeInstanceOf(Object);
        expect.objectContaining({ "SQC": ["SQR", "SQZ", "SQI"] })
    });
});



describe('getGearTypesData', () => {

    let mockLogError;
    let mockReadToText;
    let mockBlobClient;
    const container = 'geartype';
    const file = 'geartypes.csv'

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
        mockReadToText = jest.spyOn(blob, 'readToText');

        mockBlobClient = jest.spyOn(BlobServiceClient, 'fromConnectionString');
        const containerObj = new ContainerClient(container);
        containerObj.getBlobClient = () => new BlobClient(file);
        mockBlobClient.mockImplementation(() => ({
            getContainerClient: () => containerObj,
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('will log and rethrow any errors', async () => {
        const error = new Error('gearTypesMockError');
        mockReadToText.mockRejectedValue(error);
        await expect(blob.getGearTypesData('connString')).rejects.toThrow('Error: gearTypesMockError');

        expect(mockLogError).toHaveBeenNthCalledWith(1, error);
        expect(mockLogError).toHaveBeenNthCalledWith(2, `Cannot read remote file ${file} from container ${container}`);
    });

    it('will return gear types data', async () => {
        mockReadToText.mockResolvedValue(fs.readFileSync(__dirname + '/../../data/geartypes.csv', 'utf-8'));
        const res = await blob.getGearTypesData('connString');

        expect(res.length).toBeGreaterThan(0);
    });

});

describe('getRfmosData', () => {

    let mockLogError;
    let mockReadToText;
    let mockBlobClient;

    const container = 'catcharea';
    const file = 'RFMOList.csv';

    beforeEach(() => {
        mockLogError = jest.spyOn(logger, 'error');
        mockReadToText = jest.spyOn(blob, 'readToText');

        mockBlobClient = jest.spyOn(BlobServiceClient, 'fromConnectionString');
        const containerObj = new ContainerClient(container);
        containerObj.getBlobClient = () => new BlobClient(file);
        mockBlobClient.mockImplementation(() => ({
            getContainerClient: () => containerObj,
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('will return rfmos data', async () => {
        mockReadToText.mockResolvedValue(fs.readFileSync(__dirname + '/../../data/rfmoList.csv', 'utf-8'));
        const res = await blob.getRfmosData('connString');

        expect(res.length).toBeGreaterThan(0);
    });

    it('will log and throw any errors', async () => {
        const error = new Error('rfmosMockError');
        mockReadToText.mockRejectedValue(error);
        await expect(blob.getRfmosData('connString')).rejects.toThrow('Error: rfmosMockError');

        expect(mockLogError).toHaveBeenNthCalledWith(1, error);
        expect(mockLogError).toHaveBeenNthCalledWith(2, `Cannot read remote file ${file} from container ${container}`);
    });
});
