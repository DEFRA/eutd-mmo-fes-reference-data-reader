const moment = require('moment');
const mongoose = require('mongoose');

import { MongoMemoryServer } from 'mongodb-memory-server';
import { ILanding, LandingModel, LandingSources } from '../../../src/landings/types/landing';
import { ApplicationConfig } from '../../../src/config';
import logger from '../../../src/logger';
const sinon = require('sinon');
const Service = require('../../../src/landings/persistence/landing');

ApplicationConfig.loadEnv({})


const addLandingTestData = async (landing: any) => {
  const model = new LandingModel(landing)
  await model.save()
}

describe('MongoMemoryServer - Wrapper to run inMemory Database', () => {

  let mongoServer;
  const opts = { connectTimeoutMS:60000, socketTimeoutMS:600000, serverSelectionTimeoutMS:60000 }

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, opts).catch(err => {console.log(err)});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });


describe('persisting landings', () => {

  beforeEach(async () => {
    await LandingModel.deleteMany({});
  });

  it('validating the mongoose model is wired up', async () => {

		const model = new LandingModel({
      rssNumber: 'rssNumber',
      dateTimeLanded: moment.utc(),
      source: LandingSources.LandingDeclaration,
      items: [ { species: 'COD', weight: 2, factor: 1 } ]
    })
    await model.save()

		const result: any = await LandingModel.findOne()

    expect(result.rssNumber).toBe('rssNumber')

  })

  it('can retrive landings', async () => {

    await addLandingTestData({
      rssNumber: '101',
      dateTimeLanded: moment.utc('2019-01-01T01:00:00Z'),
      source: LandingSources.LandingDeclaration,
      items: [ { species: 'COD', weight: 2, factor: 1 } ]
    })

    const results = await Service.getLandings('101', '2019-01-01')
    expect(results.length).toBe(1)
    expect(results[0].rssNumber).toBe('101')

  })

  it('can retrive landings with all optional data', async () => {
    const fullLanding = { species: 'COD', weight: 2, factor: 1, state: 'STA', presentation: 'PRE' }

    await addLandingTestData({
      rssNumber: '101',
      dateTimeLanded: moment.utc('2019-01-01T01:00:00Z'),
      source: LandingSources.LandingDeclaration,
      items: [fullLanding]
    })

    const results = await Service.getLandings('101', '2019-01-01')
    expect(results.length).toBe(1)
    expect(results[0].rssNumber).toBe('101')
    expect(results[0].items.length).toBe(1);
    expect(results[0].items[0]).toMatchObject(fullLanding);
  });

  it('can retrive multiple landings', async () => {

    await addLandingTestData({
      rssNumber: '101',
      dateTimeLanded: moment('2019-01-01T01:00:00Z'),
      source: LandingSources.LandingDeclaration,
      items: [ { species: 'COD', weight: 2, factor: 1 } ]
    })

    await addLandingTestData({
      rssNumber: '101',
      dateTimeLanded: moment('2019-01-01T23:00:00Z'),
      source: LandingSources.LandingDeclaration,
      items: [ { species: 'COD', weight: 2, factor: 1 } ]
    })

    await addLandingTestData({
      rssNumber: '101',
      dateTimeLanded: moment('2019-01-02T12:00:00Z'),
      source: LandingSources.LandingDeclaration,
      items: [ { species: 'COD', weight: 2, factor: 1 } ]
    })

    await addLandingTestData({
      rssNumber: '102',
      dateTimeLanded: moment('2019-01-01T13:00:00Z'),
      source: LandingSources.LandingDeclaration,
      items: [ { species: 'COD', weight: 2, factor: 1 } ]
    })

    let results

    results = await Service.getLandings('101', '2019-01-01')
    expect(results.length).toBe(2)

    results = await Service.getLandings('102', '2019-01-01')
    expect(results.length).toBe(1)

    results = await Service.getLandings('101', '2019-01-02')
    expect(results.length).toBe(1)

    results = await Service.getLandings('101', '2019-01-03')
    expect(results.length).toBe(0)

  })

  it('can insert landings and handle updated set of landings without overwriting the dateTimeRecieved', async () => {

    const rssNumber = '100'
    const theDay = '2019-01-01'

    const landings: ILanding[] = []

    // Record the first landing at 10:00
    landings.push({
      rssNumber: rssNumber,
      dateTimeLanded: moment.utc('2019-01-01T10:00:00Z'),
      source: LandingSources.LandingDeclaration,
      items: [ { species: 'COD', weight: 2, factor: 1 } ]
    })

    await Service.updateLandings(landings)

    let results
    results = await Service.getLandings(rssNumber, theDay)

    expect(results.length).toBe(1)

    // Save the dateTimeRetrived so we can check that it is not overwritten
    // after replacing these landings with a new set
    //
    let timesRetrieved = results.map( _ => [_.dateTimeLanded, _.dateTimeRetrieved])

    // Record another landing at 23:00
    landings.push({
      rssNumber: rssNumber,
      dateTimeLanded: moment.utc('2019-01-01T23:00:00Z'),
      source: LandingSources.LandingDeclaration,
      items: [ { species: 'COD', weight: 9, factor: 1 } ]
    })

    await Service.updateLandings(landings)

    results = await Service.getLandings(rssNumber, theDay)

    expect(results.length).toBe(2)

    const firstRecordedLanding = results.find( _ => (_.dateTimeLanded.toISOString() == '2019-01-01T10:00:00.000Z'))

    expect(firstRecordedLanding.dateTimeRetrieved).toEqual(timesRetrieved[0][1])

    timesRetrieved = results.map( _ => [_.dateTimeLanded, _.dateTimeRetrieved])

    // Push the landings again this time the same set

    await Service.updateLandings(landings)

    results = await Service.getLandings(rssNumber, theDay)

    expect(results.length).toBe(2)

    expect(timesRetrieved.sort()).toEqual(results.map( _ => [_.dateTimeLanded, _.dateTimeRetrieved]).sort())

  })

  it('can get all landings', async () => {

    await addLandingTestData({
      rssNumber: '101',
      dateTimeLanded: moment('2019-01-01T01:00:00Z'),
      source: LandingSources.LandingDeclaration,
      items: [ { species: 'COD', weight: 2, factor: 1 } ]
    })

    await addLandingTestData({
      rssNumber: '101',
      dateTimeLanded: moment('2019-01-01T23:00:00Z'),
      source: LandingSources.LandingDeclaration,
      items: [ { species: 'COD', weight: 2, factor: 1 } ]
    })

    await addLandingTestData({
      rssNumber: '101',
      dateTimeLanded: moment('2019-01-02T12:00:00Z'),
      source: LandingSources.LandingDeclaration,
      items: [ { species: 'COD', weight: 2, factor: 1 } ]
    })

    await addLandingTestData({
      rssNumber: '102',
      dateTimeLanded: moment('2019-01-01T13:00:00Z'),
      source: LandingSources.LandingDeclaration,
      items: [ { species: 'COD', weight: 2, factor: 1 } ]
    })

    const results = await Service.getAllLandings()
    expect(results.length).toBe(4)

  })

  it('will not filter out elogs', async () => {

    await addLandingTestData({
      rssNumber: '101',
      dateTimeLanded: moment('2019-01-01T01:00:00Z'),
      source: LandingSources.ELog,
      items: [ { species: 'COD', weight: 2, factor: 1 } ]
    })

    await addLandingTestData({
      rssNumber: '101',
      dateTimeLanded: moment('2019-01-01T23:00:00Z'),
      source: LandingSources.CatchRecording,
      items: [ { species: 'COD', weight: 2, factor: 1 } ]
    })

    await addLandingTestData({
      rssNumber: '101',
      dateTimeLanded: moment('2019-01-02T12:00:00Z'),
      source: LandingSources.LandingDeclaration,
      items: [ { species: 'COD', weight: 2, factor: 1 } ]
    })

    const results = await Service.getAllLandings()
    expect(results.length).toBe(3)

  })

  it('can handle multiple landings with the same timestamp: FI0-395', async () => {

    const rssNumber = '100'
    const theDay = '2019-07-01'

    const landings: ILanding[] = [
      {
        rssNumber: rssNumber,
        dateTimeLanded: moment.utc('2019-07-01T00:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 2, factor: 1 } ]
      },
      {
        rssNumber: rssNumber,
        dateTimeLanded: moment.utc('2019-07-01T00:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'POL', weight: 2, factor: 1 } ]
      }
    ]

    await Service.updateLandings(landings)

    const results = await Service.getLandings(rssNumber, theDay)

    expect(results.length).toBe(2)

  })

});

describe('given that timestamps from CEFAS are UTC, and dateLanded within the catch domain is UTC', () => {

  beforeEach(async () => {
    await LandingModel.deleteMany({});
  });

  it('can read back landings in summertime', async () => {

    const landings: ILanding[] = [
      {
        rssNumber: 'rssNumber',
        dateTimeLanded: moment.utc('2019-06-30T22:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 1, factor: 1 } ]
      },
      {
        rssNumber: 'rssNumber',
        dateTimeLanded: moment.utc('2019-06-30T23:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 1, factor: 1 } ]
      },
      {
        rssNumber: 'rssNumber',
        dateTimeLanded: moment.utc('2019-06-30T23:30:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 1, factor: 1 } ]
      },
      {
        rssNumber: 'rssNumber',
        dateTimeLanded: moment.utc('2019-07-01T00:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 1, factor: 1 } ]
      },
      {
        rssNumber: 'rssNumber',
        dateTimeLanded: moment.utc('2019-07-01T10:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 1, factor: 1 } ]
      },
      {
        rssNumber: 'rssNumber',
        dateTimeLanded: moment.utc('2019-07-01T23:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 1, factor: 1 } ]
      },
    ]

    await Service.updateLandings(landings)

    const res = await Service.getLandings('rssNumber', '2019-07-01')

    expect(res.length).toBe(3)

    expect(res.map(r => r.dateTimeLanded.toISOString())).toEqual([
      moment('2019-07-01T00:00:00Z').toISOString(),
      moment('2019-07-01T10:00:00Z').toISOString(),
      moment('2019-07-01T23:00:00Z').toISOString()
    ]);
    expect(true).toBeTruthy();

  })

})


describe('get multiple landings', () => {

  let mockLoggerInfo;

  beforeEach(async () => {
    await LandingModel.deleteMany({});
  });

  it('can get multiple landings', async() => {
    mockLoggerInfo = sinon.spy(logger, 'info');

    const landings: ILanding[] = [
      {
        rssNumber: '100',
        dateTimeLanded: moment.utc('2019-07-01T00:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 2, factor: 1 } ]
      },
      {
        rssNumber: '100',
        dateTimeLanded: moment.utc('2019-07-01T10:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 4, factor: 1 } ]
      }
    ]

    await Service.updateLandings(landings)

    const res = await Service.getLandingsMultiple( [{ rssNumber: '100', dateLanded: '2019-07-01' }] )

    expect(mockLoggerInfo.getCall(0).args[0]).toEqual('[LANDINGS][GET-MULTIPLE-LANDINGS][LENGTH][1]');

    expect(mockLoggerInfo.getCall(1).args[0]).toEqual('[LANDINGS][GET-MULTIPLE-LANDINGS][LANDING][RSS-NUMBER][100]');

    expect(res.length).toBe(2)
  })

  it('will match correctly on both attributes', async() => {

    const landings: ILanding[] = [
      {
        rssNumber: '100',
        dateTimeLanded: moment.utc('2019-07-01T00:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 2, factor: 1 } ]
      },
      {
        rssNumber: '100',
        dateTimeLanded: moment.utc('2019-08-01T10:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 4, factor: 1 } ]
      },
      {
        rssNumber: '200',
        dateTimeLanded: moment.utc('2019-08-01T10:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 4, factor: 1 } ]
      }
    ]

    await Service.updateLandings(landings)

    const res = await Service.getLandingsMultiple( [{ rssNumber: '100', dateLanded: '2019-08-01' }] )

    expect(res.length).toBe(1)

  })

  it('can fetch multiple', async() => {

    const landings: ILanding[] = [
      {
        rssNumber: '100',
        dateTimeLanded: moment.utc('2019-07-01T00:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 2, factor: 1 } ]
      },
      {
        rssNumber: '100',
        dateTimeLanded: moment.utc('2019-08-01T10:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 4, factor: 1 } ]
      },
      {
        rssNumber: '200',
        dateTimeLanded: moment.utc('2019-08-01T10:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 4, factor: 1 } ]
      }
    ]

    await Service.updateLandings(landings)

    const res = await Service.getLandingsMultiple( [
      { rssNumber: '100', dateLanded: '2019-08-01' },
      { rssNumber: '200', dateLanded: '2019-08-01' },
    ] )

    expect(res.length).toBe(2)

  })

  it('will behave correctly on duplicate input', async() => {

    const landings: ILanding[] = [
      {
        rssNumber: '100',
        dateTimeLanded: moment.utc('2019-07-01T00:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 2, factor: 1 } ]
      },
      {
        rssNumber: '100',
        dateTimeLanded: moment.utc('2019-08-01T10:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 4, factor: 1 } ]
      },
      {
        rssNumber: '200',
        dateTimeLanded: moment.utc('2019-08-01T10:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 4, factor: 1 } ]
      }
    ]

    await Service.updateLandings(landings)

    const res = await Service.getLandingsMultiple( [
      { rssNumber: '100', dateLanded: '2019-08-01' },
      { rssNumber: '100', dateLanded: '2019-08-01' },
    ] )

    expect(res.length).toBe(1)

  })

  it('can handle empty input', async() => {

    const landings: ILanding[] = [
      {
        rssNumber: '100',
        dateTimeLanded: moment.utc('2019-07-01T00:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 2, factor: 1 } ]
      },
      {
        rssNumber: '100',
        dateTimeLanded: moment.utc('2019-08-01T10:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 4, factor: 1 } ]
      },
      {
        rssNumber: '200',
        dateTimeLanded: moment.utc('2019-08-01T10:00:00Z').toISOString(),
        source: LandingSources.LandingDeclaration,
        items: [ { species: 'COD', weight: 4, factor: 1 } ]
      }
    ]

    await Service.updateLandings(landings)

    const res = await Service.getLandingsMultiple( [] )

    expect(res.length).toBe(0)

  })

})

describe('clearElogs', () => {

  describe('should only act on landing declarations', () => {

    let mockDeleteMany;

    beforeEach(() => {
      mockDeleteMany = jest.spyOn(LandingModel, 'deleteMany');
      mockDeleteMany.mockResolvedValue(null);
    });

    afterEach(() => {
      mockDeleteMany.mockRestore();
    });

    it('and issue a deleteMany for the elogs', async () => {

      const landingDec: ILanding = {source: LandingSources.LandingDeclaration, rssNumber: 'rss1', dateTimeLanded: '2019-12-11T23:30:00.000Z', items: []};
      const catchRec: ILanding = {source: LandingSources.CatchRecording, rssNumber: 'rss2', dateTimeLanded: '2019-12-12T23:30:00.000Z', items: []};
      const elog: ILanding = {source: LandingSources.ELog, rssNumber: 'rss3', dateTimeLanded: '2019-12-13T23:30:00.000Z', items: []};

      await Service.clearElogs([landingDec, catchRec, elog]);

      expect(mockDeleteMany).toHaveBeenCalledTimes(1);

      expect(mockDeleteMany).toHaveBeenCalledWith(
        {
          rssNumber: 'rss1',
          dateTimeLanded: {
            $gte: new Date('2019-12-11T00:00:00.000Z'),
            $lte: new Date('2019-12-11T23:59:59.999Z')
          },
          source: LandingSources.ELog
        }
      );

    });

  });

  describe('should delete elogs from mongo', () => {

    beforeEach(async () => {
      await LandingModel.deleteMany({});
    });

    it('where the rssNumber and dateLanded match for any passed in landing decs', async () => {

      const _toMongoFormat = (l: ILanding): any => ({...l, dateTimeLanded: new Date(l.dateTimeLanded)});

      const landingDec: ILanding = {source: LandingSources.LandingDeclaration, rssNumber: 'rss1', dateTimeLanded: '2019-12-11T23:30:00.000Z', items: []};

      const elogToDelete1: ILanding = {source: LandingSources.ELog, rssNumber: 'rss1', dateTimeLanded: '2019-12-11T23:30:00.000Z', items: []}; // same vessel, same date, same time - DELETE
      const elogToDelete2: ILanding = {source: LandingSources.ELog, rssNumber: 'rss1', dateTimeLanded: '2019-12-11T00:00:00.000Z', items: []}; // same vessel, same date, different time - DELETE
      const elogToRemain1: ILanding = {source: LandingSources.ELog, rssNumber: 'rss1', dateTimeLanded: '2019-12-10T23:59:59.999Z', items: []}; // same vessel, different date - KEEP
      const elogToRemain2: ILanding = {source: LandingSources.ELog, rssNumber: 'rss2', dateTimeLanded: '2019-12-11T23:30:00.000Z', items: []}; // same date, different vessel - KEEP

      await Promise.all([
        addLandingTestData(elogToDelete1),
        addLandingTestData(elogToDelete2),
        addLandingTestData(elogToRemain1),
        addLandingTestData(elogToRemain2)
      ]);

      const elogsBefore = await LandingModel.find({source: LandingSources.ELog}, ['source', 'rssNumber', 'dateTimeLanded', 'items'], {lean: true});

      expect(elogsBefore).toHaveLength(4);
      expect(elogsBefore).toEqual(
        expect.arrayContaining([
          expect.objectContaining(_toMongoFormat(elogToDelete1)),
          expect.objectContaining(_toMongoFormat(elogToDelete2)),
          expect.objectContaining(_toMongoFormat(elogToRemain1)),
          expect.objectContaining(_toMongoFormat(elogToRemain2))
        ])
      );

      await Service.clearElogs([landingDec]);

      const elogsAfter = await LandingModel.find({source: LandingSources.ELog}, ['source', 'rssNumber', 'dateTimeLanded', 'items'], {lean: true});

      expect(elogsAfter).toHaveLength(2);
      expect(elogsAfter).toEqual(
        expect.arrayContaining([
          expect.objectContaining(_toMongoFormat(elogToRemain1)),
          expect.objectContaining(_toMongoFormat(elogToRemain2))
        ])
      );

    });

  })

});

});