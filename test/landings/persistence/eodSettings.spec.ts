import { MongoMemoryServer } from 'mongodb-memory-server';
import { ApplicationConfig } from '../../../src/config';
import { IEodAdminAudit, IEodAudit, IEodRule, IEodSetting, EodSettingModel } from '../../../src/landings/types/appConfig/eodSettings';
import { ILicence, IVessel } from '../../../src/landings/types/appConfig/vessels';
import * as SUT from '../../../src/landings/persistence/eodSettings';
import * as Cache from '../../../src/data/cache';

const mongoose = require('mongoose');

let mongoServer;

const opts = { connectTimeoutMS: 60000, socketTimeoutMS: 600000, serverSelectionTimeoutMS: 60000 }

ApplicationConfig.prototype.eodRulesMigration = true;
ApplicationConfig.prototype.cloudRoleName = 'mmo-cc-reference-data-reader-svc';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, opts).catch(err => { console.log(err) });
});

afterEach(async () => {
  await EodSettingModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Eod Rules: createEodRules', () => {
  const testEODUser = 'Bob';

  it('will insert a data ever expected rule', async () => {

    await SUT.createEodRules(testEODUser, 'England', ['10-12m', '12m+']);

    const rules = await EodSettingModel.find({});

    expect(rules).toHaveLength(1);
  });

  it('will insert default expected and end dates for a newly added data ever expected rule', async () => {

    await SUT.createEodRules(testEODUser, 'England', ['12m+']);

    const rules = await EodSettingModel.find({});

    expect(rules[0].rules).toHaveLength(2);
  });

  it('will insert an expected date rule', async () => {
    const newRule: IEodRule = {
      numberOfDays: 0,
      ruleType: 'expectedDate',
      vesselSize: '12m+',
      changedFrom: '10m-12m',
      changedTo: '12m+'
    }

    await SUT.createEodRules(testEODUser, 'England', undefined, newRule);

    const rules = await SUT.getEodSettings(false);
    const rulesNoAudit = await SUT.getEodSettings();

    expect(rules).toStrictEqual([{
      audit: [{
        rule: {
          changedFrom: "10m-12m",
          changedTo: "12m+",
          numberOfDays: 0,
          ruleType: "expectedDate",
          vesselSize: "12m+"
        },
        timestamp: expect.any(String),
        user: "Bob",
        vesselSizes: null
      }],
      da: "England",
      rules: [{
        numberOfDays: 0,
        ruleType: "expectedDate",
        vesselSize: "12m+"
      }],
      vesselSizes: []
    }]);
    expect(rulesNoAudit).toStrictEqual([{
      da: "England",
      rules: [{
        numberOfDays: 0,
        ruleType: "expectedDate",
        vesselSize: "12m+"
      }],
      vesselSizes: []
    }])
  });

  it('will insert an expected date rule with a pre-existing expected date rule', async () => {
    const existingRule: IEodRule = {
      numberOfDays: 0,
      ruleType: 'expectedDate',
      vesselSize: '12m+',
      changedFrom: '10-12m',
      changedTo: '12m+'
    }

    const newRule: IEodRule = {
      numberOfDays: 0,
      ruleType: 'expectedDate',
      vesselSize: '10-12m',
      changedFrom: '12m+',
      changedTo: '10-12m'
    }

    await SUT.createEodRules(testEODUser, 'England', undefined, existingRule);
    await SUT.createEodRules(testEODUser, 'England', undefined, newRule);

    const rules = await SUT.getEodSettings(false);

    expect(rules).toStrictEqual([{
      audit: [{
        rule: {
          changedFrom: "10-12m",
          changedTo: "12m+",
          numberOfDays: 0,
          ruleType: "expectedDate",
          vesselSize: "12m+"
        },
        timestamp: expect.any(String),
        user: "Bob",
        vesselSizes: null
      }, {
        rule: {
          changedFrom: "12m+",
          changedTo: "10-12m",
          numberOfDays: 0,
          ruleType: "expectedDate",
          vesselSize: "10-12m"
        },
        timestamp: expect.any(String),
        user: "Bob",
        vesselSizes: null
      }],
      da: "England",
      rules: [{
        numberOfDays: 0,
        ruleType: "expectedDate",
        vesselSize: "12m+"
      }, {
        numberOfDays: 0,
        ruleType: "expectedDate",
        vesselSize: "10-12m"
      }],
      vesselSizes: []
    }]);
  });

  it('will insert an end date rule with a pre-existing expected date rule', async () => {
    const existingRule: IEodRule = {
      numberOfDays: 0,
      ruleType: 'expectedDate',
      vesselSize: '12m+',
      changedFrom: '10m-12m',
      changedTo: '12m+'
    }

    const newRule: IEodRule = {
      numberOfDays: 0,
      ruleType: 'endDate',
      vesselSize: '12m+',
      changedFrom: '10m-12m',
      changedTo: '12m+'
    }

    await SUT.createEodRules(testEODUser, 'England', undefined, existingRule);
    await SUT.createEodRules(testEODUser, 'England', undefined, newRule);

    const rules = await SUT.getEodSettings(false);

    expect(rules).toStrictEqual([{
      audit: [{
        rule: {
          changedFrom: "10m-12m",
          changedTo: "12m+",
          numberOfDays: 0,
          ruleType: "expectedDate",
          vesselSize: "12m+"
        },
        timestamp: expect.any(String),
        user: "Bob",
        vesselSizes: null
      }, {
        rule: {
          changedFrom: "10m-12m",
          changedTo: "12m+",
          numberOfDays: 0,
          ruleType: "endDate",
          vesselSize: "12m+"
        },
        timestamp: expect.any(String),
        user: "Bob",
        vesselSizes: null
      }],
      da: "England",
      rules: [{
        numberOfDays: 0,
        ruleType: "expectedDate",
        vesselSize: "12m+"
      }, {
        numberOfDays: 0,
        ruleType: "endDate",
        vesselSize: "12m+"
      }],
      vesselSizes: []
    }]);
  });

  it('will insert a new expected date rule for a new da', async () => {
    const rule_1: IEodRule = {
      numberOfDays: 0,
      ruleType: 'expectedDate',
      vesselSize: '12m+',
      changedFrom: '10-12m',
      changedTo: '12m+'
    }

    const rule_2: IEodRule = {
      numberOfDays: 0,
      ruleType: 'expectedDate',
      vesselSize: '10-12m',
      changedFrom: '12m+',
      changedTo: '10-12m'
    }

    const ruleUpdate: IEodRule = {
      numberOfDays: 10,
      ruleType: 'expectedDate',
      vesselSize: '10-12m',
      changedFrom: '12m+',
      changedTo: '10-12m'
    }

    await SUT.createEodRules(testEODUser, 'England', undefined, rule_1);
    await SUT.createEodRules(testEODUser, 'England', undefined, rule_2);
    await SUT.createEodRules(testEODUser, 'Wales', undefined, ruleUpdate);

    const rules = await SUT.getEodSettings(false);

    expect(rules).toStrictEqual([{
      audit: [{
        rule: {
          changedFrom: "10-12m",
          changedTo: "12m+",
          numberOfDays: 0,
          ruleType: "expectedDate",
          vesselSize: "12m+"
        },
        timestamp: expect.any(String),
        user: "Bob",
        vesselSizes: null
      }, {
        rule: {
          changedFrom: "12m+",
          changedTo: "10-12m",
          numberOfDays: 0,
          ruleType: "expectedDate",
          vesselSize: "10-12m"
        },
        timestamp: expect.any(String),
        user: "Bob",
        vesselSizes: null
      }],
      da: "England",
      rules: [{
        numberOfDays: 0,
        ruleType: "expectedDate",
        vesselSize: "12m+"
      }, {
        numberOfDays: 0,
        ruleType: "expectedDate",
        vesselSize: "10-12m"
      }],
      vesselSizes: []
    }, {
      audit: [{
        rule: {
          changedFrom: "12m+",
          changedTo: "10-12m",
          numberOfDays: 10,
          ruleType: "expectedDate",
          vesselSize: "10-12m"
        },
        timestamp: expect.any(String),
        user: "Bob",
        vesselSizes: null
      }],
      da: "Wales",
      rules: [{
        numberOfDays: 10,
        ruleType: "expectedDate",
        vesselSize: "10-12m"
      }],
      vesselSizes: []
    }]);
  });

  it('will update the expected date rule', async () => {
    const existingRule: IEodRule = {
      numberOfDays: 0,
      ruleType: 'expectedDate',
      vesselSize: '12m+',
      changedFrom: '10m-12m',
      changedTo: '12m+'
    }

    const newRule: IEodRule = {
      numberOfDays: 10,
      ruleType: 'expectedDate',
      vesselSize: '12m+',
      changedFrom: '10m-12m',
      changedTo: '12m+'
    }

    await SUT.createEodRules(testEODUser, 'England', undefined, existingRule);
    await SUT.createEodRules(testEODUser, 'England', undefined, newRule);

    const rules = await SUT.getEodSettings(false);

    expect(rules).toStrictEqual([{
      audit: [{
        rule: {
          changedFrom: "10m-12m",
          changedTo: "12m+",
          numberOfDays: 0,
          ruleType: "expectedDate",
          vesselSize: "12m+"
        },
        timestamp: expect.any(String),
        user: "Bob",
        vesselSizes: null
      }, {
        rule: {
          changedFrom: "10m-12m",
          changedTo: "12m+",
          numberOfDays: 10,
          ruleType: "expectedDate",
          vesselSize: "12m+"
        },
        timestamp: expect.any(String),
        user: "Bob",
        vesselSizes: null
      }],
      da: "England",
      rules: [{
        numberOfDays: 10,
        ruleType: "expectedDate",
        vesselSize: "12m+"
      }],
      vesselSizes: []
    }]);
  });

  it('will update the correct expected date rule', async () => {
    const rule_1: IEodRule = {
      numberOfDays: 0,
      ruleType: 'expectedDate',
      vesselSize: '12m+',
      changedFrom: '10-12m',
      changedTo: '12m+'
    }

    const rule_2: IEodRule = {
      numberOfDays: 0,
      ruleType: 'expectedDate',
      vesselSize: '10-12m',
      changedFrom: '12m+',
      changedTo: '10-12m'
    }

    const ruleUpdate: IEodRule = {
      numberOfDays: 10,
      ruleType: 'expectedDate',
      vesselSize: '10-12m',
      changedFrom: '12m+',
      changedTo: '10-12m'
    }

    await SUT.createEodRules(testEODUser, 'England', undefined, rule_1);
    await SUT.createEodRules(testEODUser, 'England', undefined, rule_2);
    await SUT.createEodRules(testEODUser, 'England', undefined, ruleUpdate);

    const rules = await SUT.getEodSettings(false);

    expect(rules).toStrictEqual([{
      audit: [{
        rule: {
          changedFrom: "10-12m",
          changedTo: "12m+",
          numberOfDays: 0,
          ruleType: "expectedDate",
          vesselSize: "12m+"
        },
        timestamp: expect.any(String),
        user: "Bob",
        vesselSizes: null
      }, {
        rule: {
          changedFrom: "12m+",
          changedTo: "10-12m",
          numberOfDays: 0,
          ruleType: "expectedDate",
          vesselSize: "10-12m"
        },
        timestamp: expect.any(String),
        user: "Bob",
        vesselSizes: null
      }, {
        rule: {
          changedFrom: "12m+",
          changedTo: "10-12m",
          numberOfDays: 10,
          ruleType: "expectedDate",
          vesselSize: "10-12m"
        },
        timestamp: expect.any(String),
        user: "Bob",
        vesselSizes: null
      }],
      da: "England",
      rules: [{
        numberOfDays: 0,
        ruleType: "expectedDate",
        vesselSize: "12m+"
      }, {
        numberOfDays: 10,
        ruleType: "expectedDate",
        vesselSize: "10-12m"
      }],
      vesselSizes: []
    }]);
  });

  it('will add an audit for bob', async () => {
    await SUT.createEodRules(testEODUser, 'England', ['10-12m', '12m+']);

    const rules = await EodSettingModel.findOne({ da: "England" }).lean();

    expect(rules?.audit?.[0]).toStrictEqual({
      rule: null,
      vesselSizes: '10-12m,12m+',
      timestamp: expect.any(String),
      user: "Bob"
    });
  });

  it('will add an audit for bob with a rule', async () => {
    const testRule: IEodRule = {
      ruleType: 'expectedDate',
      numberOfDays: 10,
      vesselSize: '10-12m'
    };

    await SUT.createEodRules(testEODUser, 'England', undefined, testRule);

    const rules = await EodSettingModel.findOne({ da: "England" }).lean();

    expect(rules?.audit).toStrictEqual([{
      rule: {
        ruleType: 'expectedDate',
        numberOfDays: 10,
        vesselSize: '10-12m'
      },
      timestamp: expect.any(String),
      user: "Bob",
      vesselSizes: null,
    }]);
  });

  it('will add multiple audits for bob', async () => {
    await SUT.createEodRules(testEODUser, 'England', ['10-12m', '12m+']);
    await SUT.createEodRules(testEODUser, 'England', ['10-12m', '12m+']);

    const rules = await EodSettingModel.findOne({ da: "England" }).lean();

    expect(rules?.audit).toHaveLength(6);
  });

  it('will add audits for bob for each rule', async () => {
    await SUT.createEodRules(testEODUser, 'England', ['10-12m', '12m+']);
    await SUT.createEodRules(testEODUser, 'Wales', ['12m+']);

    let toggle = await EodSettingModel.findOne({ da: "England" }).lean();
    expect(toggle?.audit).toHaveLength(5);

    toggle = await EodSettingModel.findOne({ da: "Wales" }).lean();
    expect(toggle?.audit).toHaveLength(3);
  });
});

describe('Eod Rules: getEodAudits', () => {

  let mockGetEodSettings;

  beforeEach(() => {
    mockGetEodSettings = jest.spyOn(SUT, 'getEodSettings');
  });

  afterEach(() => {
    mockGetEodSettings.mockRestore();
  });

  it('will return an audit log', async () => {
    const rules = new EodSettingModel({
      da: "England",
      audit: [
        {
          vesselSizes: "Under 10m,10-12m,12m+",
          timestamp: "2023-04-20T08:05:36.204Z",
          user: "Automated Tester MMO ECC Service Management"
        }
      ],
      vesselSizes: [
        "Under 10m",
        "10-12m",
        "12m+"
      ]
    });

    await rules.save();
    const result: IEodAdminAudit[] = await SUT.getEodAudits();

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('20-04-2023');
    expect(result[0].time).toBe('08:05:36 am');
    expect(result[0].user).toBe('Automated Tester MMO ECC Service Management');
    expect(result[0].rule).toBe('dataEverExpected');
    expect(result[0].da).toBe('England');
    expect(result[0].vesselSizes).toBe('Under 10m,10-12m,12m+');
  });

  it('will return a list of audit logs', async () => {
    const rules = new EodSettingModel({
      da: "England",
      audit: [
        {
          vesselSizes: "Under 10m,10-12m,12m+",
          timestamp: "2023-04-20T08:05:36.204Z",
          user: "Automated Tester MMO ECC Service Management"
        },
        {
          vesselSizes: "Under 10m",
          timestamp: "2023-04-20T16:05:36.204Z",
          user: "Automated Tester MMO ECC Service Management"
        },
        {
          timestamp: "2023-04-21T13:20:04.456Z",
          user: "Automated Tester MMO ECC Service Management",
          rule: {
            ruleType: "expectedDate",
            vesselSize: "Under 10m",
            numberOfDays: 10
          }
        }
      ],
      vesselSizes: [
        "Under 10m",
        "10-12m",
        "12m+"
      ]
    });

    await rules.save();
    const result = await SUT.getEodAudits();

    expect(result).toHaveLength(3);
    expect(result[1].date).toBe('20-04-2023');
    expect(result[1].time).toBe('04:05:36 pm');
    expect(result[1].user).toBe('Automated Tester MMO ECC Service Management');
    expect(result[1].rule).toBe('dataEverExpected');
    expect(result[1].da).toBe('England');
    expect(result[1].vesselSizes).toBe('Under 10m');

    expect(result[2].date).toBe('21-04-2023');
    expect(result[2].time).toBe('01:20:04 pm');
    expect(result[2].user).toBe('Automated Tester MMO ECC Service Management');
    expect(result[2].rule).toBe('expectedDate');
    expect(result[2].da).toBe('England');
    expect(result[2].vesselSizes).toBe('Under 10m');
  });

  it('will return a list of audit logs from all rules', async () => {
    const england = new EodSettingModel({
      da: "England",
      audit: [
        {
          vesselSizes: "",
          timestamp: "2023-04-19T22:31:23.945Z",
          user: "Bob"
        },
        {
          vesselSizes: "10-12m,12m+",
          timestamp: "2023-04-20T06:21:46.415Z",
          user: "Automated Tester MMO ECC Service Management"
        },
        {
          vesselSizes: "Under 10m,10-12m,12m+",
          timestamp: "2023-04-20T08:05:36.204Z",
          user: "Automated Tester MMO ECC Service Management"
        }
      ],
      vesselSizes: [
        "Under 10m",
        "10-12m",
        "12m+"
      ]
    });

    await england.save();

    const guernsey = new EodSettingModel({
      da: "Guernsey",
      audit: [
        {
          vesselSizes: "Under 10m",
          timestamp: "2023-04-20T05:32:29.356Z",
          user: "Bob"
        },
        {
          vesselSizes: "Under 10m,10-12m",
          timestamp: "2023-04-20T05:33:30.754Z",
          user: "Isaac"
        }
      ],
      vesselSizes: [
        "Under 10m",
        "10-12m"
      ]
    });

    await guernsey.save();
    const result = await SUT.getEodAudits();

    expect(result).toHaveLength(5);
  });

  it('will return an empty array of audits', async () => {
    const result = await SUT.getEodAudits();
    expect(result).toHaveLength(0);
  });

  it('will return an empty array of audits when getEodSettingsRules return undefined', async () => {
    mockGetEodSettings.mockResolvedValue(null);

    const result = await SUT.getEodAudits();
    expect(result).toHaveLength(0);
  });

  it('will return an empty array of audits when audits are undefined', async () => {
    mockGetEodSettings.mockResolvedValue([{
      da: "Guernsey"
    }]);

    const result = await SUT.getEodAudits();
    expect(result).toHaveLength(0);
  });

});

describe('Eod Rules: getEodSettings', () => {

  it('will get eod settings without audits', async () => {
    const rules = new EodSettingModel({
      da: "England",
      audit: [
        {
          vesselSizes: "Under 10m,10-12m,12m+",
          timestamp: "2023-04-20T08:05:36.204Z",
          user: "Automated Tester MMO ECC Service Management"
        }
      ],
      vesselSizes: [
        "Under 10m",
        "10-12m",
        "12m+"
      ]
    });

    await rules.save();

    const settings = await SUT.getEodSettings();

    expect(settings).toHaveLength(1);
    expect(settings[0].audit).toBeUndefined();
  });

  it('will get eod settings with audits', async () => {
    const rules = new EodSettingModel({
      da: "England",
      audit: [
        {
          vesselSizes: "Under 10m,10-12m,12m+",
          timestamp: "2023-04-20T08:05:36.204Z",
          user: "Automated Tester MMO ECC Service Management"
        }
      ],
      vesselSizes: [
        "Under 10m",
        "10-12m",
        "12m+"
      ]
    });

    await rules.save();

    const settings = await SUT.getEodSettings(false);

    expect(settings).toHaveLength(1);
    expect(settings[0].audit).toHaveLength(1);
  });

});

describe('Eod Rules: getEodSetting', () => {

  it('will get eod settings without audits', async () => {
    const setting_1 = new EodSettingModel({
      da: "England",
      audit: [
        {
          vesselSizes: "Under 10m,10-12m,12m+",
          timestamp: "2023-04-20T08:05:36.204Z",
          user: "Automated Tester MMO ECC Service Management"
        }
      ],
      rules: [{
        numberOfDays: 0,
        ruleType: 'expectedDate',
        vesselSize: '12m+'
      }, {
        numberOfDays: 14,
        ruleType: 'endDate',
        vesselSize: '12m+'
      }],
      vesselSizes: [
        "Under 10m",
        "10-12m",
        "12m+"
      ]
    });

    await setting_1.save();

    const setting_2 = new EodSettingModel({
      da: "Wales",
      audit: [
        {
          vesselSizes: "Under 10m,10-12m,12m+",
          timestamp: "2023-04-20T08:05:36.204Z",
          user: "Automated Tester MMO ECC Service Management"
        }
      ],
      vesselSizes: [
        "Under 10m"
      ]
    });

    await setting_2.save();

    const expected: IEodSetting = {
      da: "England",
      rules: [{
        numberOfDays: 0,
        ruleType: 'expectedDate',
        vesselSize: '12m+'
      }, {
        numberOfDays: 14,
        ruleType: 'endDate',
        vesselSize: '12m+'
      }],
      vesselSizes: [
        "Under 10m",
        "10-12m",
        "12m+"
      ]
    }

    const result = await SUT.getEodSetting('England');

    expect(result).toStrictEqual(expected);
    expect(result.audit).toBeUndefined();
  });

});

describe('Eod Rules: isLandingDataAvailable', () => {
  const landingDate = '2020-05-12';
  const licence: ILicence = {
    da: 'England',
    flag: 'GBR',
    vesselLength: 50.63,
    rssNumber: 'C20514',
    homePort: '',
    imoNumber: null,
    licenceNumber: '',
    licenceValidTo: '',
    licenceHolder: ''
  };

  const vesselData: IVessel[] = [{
    fishingVesselName: "WIRON 5",
    ircs: "2HGD8",
    cfr: "NLD200202641",
    flag: "GBR",
    homePort: "PLYMOUTH",
    registrationNumber: "H1100",
    imo: 9249556,
    fishingLicenceNumber: "12480",
    fishingLicenceValidFrom: "2021-08-10T00:00:00",
    fishingLicenceValidTo: "2030-12-31T00:00:00",
    adminPort: "PLYMOUTH",
    rssNumber: "C20514",
    vesselLength: 50.63,
    licenceHolderName: "INTERFISH WIRONS LIMITED"
  }];

  let mockCurrentTime;
  let mockVesselsData;

  beforeEach(() => {
    mockCurrentTime = jest.spyOn(Date, 'now').mockImplementation(() => 1589353888000); // 2020-05-13T07:11:28.000Z
    mockVesselsData = jest.spyOn(Cache, 'getVesselsData');
    mockVesselsData.mockReturnValue(vesselData);
  });

  afterEach(() => {
    mockCurrentTime.mockRestore();
    mockVesselsData.mockRestore();
  });

  it('will return false when an eod setting has no vessel sizes', async () => {
    const setting_1 = new EodSettingModel({
      da: "England"
    });

    await setting_1.save();

    const result = await SUT.isLandingDataAvailable(licence, landingDate);

    expect(result).toBe(false);
  });

  it('will return false when an eod setting has an empty vessel sizes array', async () => {
    const setting_1 = new EodSettingModel({
      da: "England",
      vesselSizes: []
    });

    await setting_1.save();

    const result = await SUT.isLandingDataAvailable(licence, landingDate);

    expect(result).toBe(false);
  });

  it('will return false when an eod setting has no matching vessel sizes', async () => {
    const setting_1 = new EodSettingModel({
      da: "England",
      vesselSizes: ['Under 10m']
    });

    await setting_1.save();

    const result = await SUT.isLandingDataAvailable(licence, landingDate);

    expect(result).toBe(false);
  });

  it('will return false when the expected date is after the current date', async () => {
    const setting_1 = new EodSettingModel({
      da: "England",
      vesselSizes: ['12m+'],
      rules: [{
        numberOfDays: 2,
        ruleType: 'expectedDate',
        vesselSize: '12m+'
      }]
    });

    await setting_1.save();

    const result = await SUT.isLandingDataAvailable(licence, landingDate);

    expect(result).toBe(false);
  });

  it('will return true when the expected date is after the current date but the landing is legally due', async () => {
    const isLegallyDue = true;
    const setting_1 = new EodSettingModel({
      da: "England",
      vesselSizes: ['12m+'],
      rules: [{
        numberOfDays: 5,
        ruleType: 'expectedDate',
        vesselSize: '12m+'
      }]
    });

    await setting_1.save();

    const result = await SUT.isLandingDataAvailable(licence, landingDate, isLegallyDue);

    expect(result).toBe(true);
  });

  it('will return true when the expected date is on the landed date', async () => {
    const setting_1 = new EodSettingModel({
      da: "England",
      vesselSizes: ['12m+'],
      rules: [{
        numberOfDays: 0,
        ruleType: 'expectedDate',
        vesselSize: '12m+'
      }]
    });

    await setting_1.save();

    const result = await SUT.isLandingDataAvailable(licence, '2020-05-13');

    expect(result).toBe(true);
  });

  it('will return true when an eod setting is not found', async () => {
    const result = await SUT.isLandingDataAvailable(licence, landingDate);

    expect(result).toBe(true);
  });

  it('will return true when an eod setting has matching vessel sizes but no rules', async () => {
    const setting_1 = new EodSettingModel({
      da: "England",
      vesselSizes: ['12m+']
    });

    await setting_1.save();

    const result = await SUT.isLandingDataAvailable(licence, landingDate);

    expect(result).toBe(true);
  });

  it('will return true when the expected date is before the current date', async () => {
    const setting_1 = new EodSettingModel({
      da: "England",
      vesselSizes: ['12m+'],
      rules: [{
        numberOfDays: 0,
        ruleType: 'expectedDate',
        vesselSize: '12m+'
      }]
    });

    await setting_1.save();

    const result = await SUT.isLandingDataAvailable(licence, landingDate);

    expect(result).toBe(true);
  });

  it('will return true when the expected date is on the current date', async () => {
    const setting_1 = new EodSettingModel({
      da: "England",
      vesselSizes: ['12m+'],
      rules: [{
        numberOfDays: 1,
        ruleType: 'expectedDate',
        vesselSize: '12m+'
      }]
    });

    await setting_1.save();

    const result = await SUT.isLandingDataAvailable(licence, landingDate);

    expect(result).toBe(true);
  });

  it('will return true when the expected date is undefined', async () => {
    const setting_1 = new EodSettingModel({
      da: "England",
      vesselSizes: ['12m+'],
      rules: [{
        numberOfDays: 14,
        ruleType: 'endDate',
        vesselSize: '12m+'
      }]
    });

    await setting_1.save();

    const result = await SUT.isLandingDataAvailable(licence, landingDate);

    expect(result).toBe(true);
  });

});

describe('Eod Rules: seedingEodRules', () => {
  const testEODUser = 'Bob';

  beforeEach(() => {
    ApplicationConfig.prototype.eodRulesMigration = true;
  });

  it('will add default expectedDate and endDate rules for vessel group wiithin da where data is expected', async () => {
    await SUT.createEodRules(testEODUser, 'England', ['12m+']);

    await SUT.seedEodRules();

    const result = await SUT.getEodSettings();

    expect(result).toHaveLength(1);
    expect(result[0].rules).toHaveLength(2);
    expect(result[0]?.rules?.[0]).toEqual({ ruleType: 'expectedDate', vesselSize: '12m+', numberOfDays: 0 })
    expect(result[0]?.rules?.[1]).toEqual({ ruleType: 'endDate', vesselSize: '12m+', numberOfDays: 14 })
  });

  it('will add multiple default expectedDate and endDate rules for vessel group wiithin da where data is expected', async () => {
    await SUT.createEodRules(testEODUser, 'England', ['10-12m', '12m+']);

    await SUT.seedEodRules();

    const result = await SUT.getEodSettings();

    expect(result).toHaveLength(1);
    expect(result[0].rules).toHaveLength(4);
    expect(result[0]?.rules?.[0]).toEqual({ ruleType: 'expectedDate', vesselSize: '10-12m', numberOfDays: 0 })
    expect(result[0]?.rules?.[1]).toEqual({ ruleType: 'endDate', vesselSize: '10-12m', numberOfDays: 14 })
  });

  it('will add multiple default expectedDate and endDate rules for vessel group for mutliple da\'s where data is expected', async () => {
    await SUT.createEodRules(testEODUser, 'Wales', ['10-12m']);
    await SUT.createEodRules(testEODUser, 'England', ['10-12m', '12m+']);

    await SUT.seedEodRules();

    const result = await SUT.getEodSettings();

    expect(result).toHaveLength(2);
    expect(result[0].rules).toHaveLength(2);
    expect(result[0]?.rules?.[0]).toEqual({ ruleType: 'expectedDate', vesselSize: '10-12m', numberOfDays: 0 })
    expect(result[0]?.rules?.[1]).toEqual({ ruleType: 'endDate', vesselSize: '10-12m', numberOfDays: 14 })

    expect(result[1].rules).toHaveLength(4);
    expect(result[1]?.rules?.[0]).toEqual({ ruleType: 'expectedDate', vesselSize: '10-12m', numberOfDays: 0 })
    expect(result[1]?.rules?.[1]).toEqual({ ruleType: 'endDate', vesselSize: '10-12m', numberOfDays: 14 })
    expect(result[1]?.rules?.[2]).toEqual({ ruleType: 'expectedDate', vesselSize: '12m+', numberOfDays: 0 })
    expect(result[1]?.rules?.[3]).toEqual({ ruleType: 'endDate', vesselSize: '12m+', numberOfDays: 14 })
  });

  it('will not add default expectedDate and endDate rules for vessel group wiithin da where data is expected when eodruleMigration is false', async () => {
    ApplicationConfig.prototype.eodRulesMigration = false;

    const audit: IEodAudit = {
      user: 'Bob',
      timestamp: Date.now().toLocaleString(),
      vesselSizes: '12m+',
      changedFrom: '',
      changedTo: '12m+'
    }

    await EodSettingModel.findOneAndUpdate({ da: 'England' }, { "$push": { "audit": audit }, vesselSizes: ['12m+'] }, { upsert: true })

    await SUT.seedEodRules();

    const result = await SUT.getEodSettings();

    expect(result).toHaveLength(1);
    expect(result[0].rules).toHaveLength(0);
    expect(result[0].rules).toEqual([]);
  });

});

describe('Eod Rules: cleanUpEodRules', () => {
  beforeEach(() => {
    ApplicationConfig.prototype.eodRulesMigration = true;
  });

  it('will remove entries with old eod rules', async () => {
    const setting_1 = new EodSettingModel({
      "rule": "Wales",
      "vessels": [
        "Under 10m",
        "10-12m",
        "12m+"
      ],
      "audit": [
        {
          "audit": "Under 10m,10-12m,12m+",
          "timestamp": "2023-06-08T18:44:36.430Z",
          "user": "Horsfall, Dom"
        }
      ]
    });

    await setting_1.save();

    const setting_2 = new EodSettingModel({
      "da": "Wales",
      "__v": 0,
      "audit": [
      ],
      "rules": [
        {
          "ruleType": "expectedDate",
          "vesselSize": "12m+",
          "numberOfDays": 1
        },
        {
          "ruleType": "endDate",
          "vesselSize": "12m+",
          "numberOfDays": 1
        }
      ],
      "vesselSizes": [
        "12m+"
      ]
    });

    await setting_2.save();

    await SUT.cleanUpEodRules();

    const result = await SUT.getEodSettings();
    expect(result).toHaveLength(1);
  });

  it('will not fail with no rules', async () => {
    await SUT.cleanUpEodRules();

    const result = await SUT.getEodSettings();
    expect(result).toHaveLength(0);
  });
});

