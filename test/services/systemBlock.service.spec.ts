const mongoose = require('mongoose');

import { MongoMemoryServer } from 'mongodb-memory-server';
import * as SystemBlock from '../../src/services/systemBlock.service';
import { BlockingStatusModel, ValidationRules } from '../../src/landings/types/systemBlock';

let mongoServer;
const opts = { connectTimeoutMS:60000, socketTimeoutMS:600000, serverSelectionTimeoutMS:60000 }

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, opts).catch(err => {console.log(err)});
});

let mockSetSystemBlockRules;

beforeEach(() => {
    mockSetSystemBlockRules = jest.spyOn(SystemBlock, 'setSystemBlockRules');
    BlockingStatusModel.deleteMany({});
});

afterEach(async () => {
    mockSetSystemBlockRules.mockRestore();
})

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe("getBlockingStatus", () => {

    it ("returns a boolean value", async () => {
        const model = new BlockingStatusModel({ name: ValidationRules.FOUR_B, status: false });
        await model.save();

        const res = await SystemBlock.getBlockingStatus(ValidationRules.FOUR_B);
        expect(res).toBe(false);
    });

    it ("Treats a `not found` as false", async () => {
        const res = await SystemBlock.getBlockingStatus(ValidationRules.THREE_C);

        expect(res).toBe(false);
    });

});

describe("saveBlockingRules", () => {

    let mockSetSystemBlockRules;

    beforeEach(async () => {
        mockSetSystemBlockRules = jest.spyOn(SystemBlock, "setSystemBlockRules");
        mockSetSystemBlockRules.mockResolvedValue(null);

        await SystemBlock.seedBlockingRules();
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    it('should initialise all four rules', async () => {

        expect(mockSetSystemBlockRules).toHaveBeenCalledTimes(4);
    });
    it('should set 3c and 3d to true', async () => {

        expect(mockSetSystemBlockRules.mock.calls[0]).toMatchObject([{ name: ValidationRules.THREE_C, status: true}]);
        expect(mockSetSystemBlockRules.mock.calls[1]).toMatchObject([{ name: ValidationRules.THREE_D, status: true}]);
    });

    it('should set 4a and 4b to false', async () => {

        expect(mockSetSystemBlockRules.mock.calls[2]).toMatchObject([{name: ValidationRules.FOUR_A, status: false}]);
        expect(mockSetSystemBlockRules.mock.calls[3]).toMatchObject([{name: ValidationRules.FOUR_B, status: false}]);
    });

});

describe("setSystemBlockRules", () => {

    it('should upsert a new rule', async () => {
        await SystemBlock.setSystemBlockRules({ name: ValidationRules.FOUR_A, status: true });

        const res = await SystemBlock.getBlockingStatus(ValidationRules.FOUR_A);
        expect(res).toBe(true);
    });

    it('should update an existing new rule', async () => {
        await SystemBlock.setSystemBlockRules({name: ValidationRules.FOUR_A, status: true});
        await SystemBlock.setSystemBlockRules({name: ValidationRules.FOUR_A, status: false});

        const res = await SystemBlock.getBlockingStatus(ValidationRules.FOUR_A);

        expect(res).toBe(false);
    });

});