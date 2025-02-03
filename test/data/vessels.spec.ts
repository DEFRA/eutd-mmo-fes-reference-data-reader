import * as blob from '../../src/data/blob-storage';
import logger from '../../src/logger';

import { getVesselsData } from '../../src/data/blob-storage';
import { getVesselsDataFromFile } from '../../src/data/local-file';
import { loadVesselsDataFromLocalFile, loadVesselsData } from '../../src/data/cache';
import { IVessel } from '../../src/landings/types/appConfig/vessels';
import { BlobClient, BlobServiceClient, ContainerClient } from '@azure/storage-blob';
jest.mock("@azure/storage-blob");

const vesselsJson = require(__dirname + '/../../data/vessels.json');
const fs = require('fs');
const path = `${__dirname}/../../data/vessels.json`;
const connectionString: string = 'connection-string';
const expected: IVessel[] = [
  {
    "fishingVesselName": "MARLENA",
    "ircs": null,
    "flag": "GBR",
    "homePort": "WESTRAY",
    "registrationNumber": "K529",
    "imo": null,
    "fishingLicenceNumber": "30117",
    "fishingLicenceValidFrom": "2006-06-07T00:00:00",
    "fishingLicenceValidTo": "2006-06-30T00:00:00",
    "adminPort": "STORNOWAY",
    "rssNumber": "A12032",
    "vesselLength": 8.84,
    "cfr": "GBRA12032",
    "licenceHolderName": "I am the Licence Holder name for this fishing boat"
  }
];

describe('When getting vessels data', () => {
    let mockLoggerInfo: jest.SpyInstance;
    let mockLoggerError: jest.SpyInstance;

    beforeEach(() => {
        mockLoggerInfo = jest.spyOn(logger, 'info');
        mockLoggerError = jest.spyOn(logger, 'error');
        jest.spyOn(fs, 'readFileSync').mockImplementation(() => JSON.stringify([
          {
            "fishingVesselName": "MARLENA",
            "ircs": null,
            "flag": "GBR",
            "homePort": "WESTRAY",
            "registrationNumber": "K529",
            "imo": null,
            "fishingLicenceNumber": "30117",
            "fishingLicenceValidFrom": "2006-06-07T00:00:00",
            "fishingLicenceValidTo": "2006-06-30T00:00:00",
            "adminPort": "STORNOWAY",
            "rssNumber": "A12032",
            "vesselLength": 8.84,
            "cfr": "GBRA12032",
            "licenceHolderName": "I am the Licence Holder name for this fishing boat"
          }
        ]))
    });

    afterEach(() => {
        mockLoggerInfo.mockRestore();
        mockLoggerError.mockRestore();
    });

    describe('When getting vessels from a local file', () => {
        it('will return the data for export vessels from file', () => {
            const vessels = getVesselsDataFromFile(path);

            expect(vessels).toEqual(expected);
        });

        it('will return an error if getVesselsFromLocalFile throws a parse error', () => {
            jest.spyOn(JSON, 'parse').mockImplementationOnce(() => {
             throw new Error('parse error');
            });

            expect(() => getVesselsDataFromFile(path)).toThrow('parse error');
            expect(mockLoggerError).toHaveBeenNthCalledWith(1, 'Could not load vessels data from file', expect.anything());
        });

        it('will check if the loadVesselsDataFromLocalFile is returning the correct data', async () => {
            const vessels = await loadVesselsDataFromLocalFile();

            expect(vessels).toEqual(expected);
        });
    });

    describe('When getting vessels from a blob storage', () => {
        it('will check if the loadVesselsData is returning the correct data', async () => {

            const dataMock = jest.spyOn(blob, 'getVesselsData');
            dataMock.mockResolvedValue(expected);

            const result = await loadVesselsData(connectionString);

            expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, '[BLOB-STORAGE-DATA-LOAD][VESSELS]');
            expect(dataMock).toHaveBeenNthCalledWith(1, 'connection-string');
            expect(result).toEqual(expected);

            dataMock.mockRestore();
        })

        it('will fail if the loadVesselsData is not returning the correct data', async () => {
            const fakeError =  {};
            let dataMock = jest.spyOn(blob, 'getVesselsData');

            dataMock.mockImplementationOnce(() => {
              throw fakeError;
            })

            await expect(loadVesselsData(connectionString)).rejects.toThrow(`[BLOB-STORAGE-LOAD-ERROR][VESSELS] ${fakeError}`);

            dataMock.mockRestore();
        });
    });
});

describe('When getVesselsData is called to get vessels from a blob storage', () => {
    let mockLoggerError;
    let mockLoggerInfo;
    let mockReadToText;
    let mockBlobClient;

    const container = "catchcertdata";
    const file = "Notification.json";

    beforeEach(() => {
        mockLoggerError = jest.spyOn(logger, 'error');
        mockLoggerInfo = jest.spyOn(logger, 'info');
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

    it('will log and rethrow any errors when VesselAndLicenceData key is not available', async () => {

        mockReadToText.mockResolvedValue('[{ "viewName": "Dummy", "blobName": "vessels.json" }, { "viewName": "Dummy", "blobName": "countries.json" }]');

        await expect(blob.getVesselsData('connString')).rejects.toThrow('Cannot find vessel data in notification json, looking for key VesselAndLicenceData');
        expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, 'connecting to blob storage');
        expect(mockLoggerInfo).toHaveBeenNthCalledWith(2, 'reading notification file');
        expect(mockLoggerInfo).toHaveBeenNthCalledWith(3, 'parsing notification file to json');
        expect(mockLoggerInfo).toHaveBeenNthCalledWith(4, 'searching notification json');
        expect(mockLoggerError).toHaveBeenCalledTimes(2);
        expect(mockLoggerError.mock.calls[1]).toEqual(['Cannot read remote file Notification.json from container catchcertdata']);
    });

    it('should return a list of vessels', async () => {
        mockReadToText.mockResolvedValueOnce('[{ "viewName": "VesselAndLicenceData", "blobName": "vessels.json" }]').mockResolvedValueOnce(JSON.stringify(vesselsJson));
        const expected: IVessel[] = [{
            "fishingVesselName": "3 STROKES",
            "ircs": null,
            "cfr": "GBR000C16710",
            "flag": "GBR",
            "homePort": "PORTAFERRY",
            "registrationNumber": "B906",
            "imo": null,
            "fishingLicenceNumber": "30621",
            "fishingLicenceValidFrom": "2017-06-05T00:00:00",
            "fishingLicenceValidTo": "2030-12-31T00:00:00",
            "adminPort": "BELFAST",
            "rssNumber": "C16710",
            "vesselLength": 5.12,
            "licenceHolderName": "MR  KEVIN MCMILLEN "
        }];

        const res = await blob.getVesselsData('connectionString');
        expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, 'connecting to blob storage');
        expect(mockLoggerInfo).toHaveBeenNthCalledWith(2, 'reading notification file');
        expect(mockLoggerInfo).toHaveBeenNthCalledWith(3, 'parsing notification file to json');
        expect(mockLoggerInfo).toHaveBeenNthCalledWith(4, 'searching notification json');
        expect(mockLoggerInfo).toHaveBeenNthCalledWith(5, 'Reading vessel data from', 'vessels.json');
        expect([res[0]]).toStrictEqual(expected);
    });

    it('should throw an error if an error is thorwn in the try block', async () => {
        mockReadToText.mockRejectedValue(new Error("something went wrong"));

        await expect(getVesselsData(connectionString)).rejects.toThrow("something went wrong");
        expect(mockLoggerInfo).toHaveBeenNthCalledWith(1, 'connecting to blob storage');
        expect(mockLoggerInfo).toHaveBeenNthCalledWith(2, 'reading notification file');
    })

})