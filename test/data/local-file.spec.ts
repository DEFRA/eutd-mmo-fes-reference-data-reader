import logger from "../../src/logger";
import {
  getSpeciesDataFromCSV,
  getSpeciesDataFromFile,
  getSeasonalFishDataFromCSV,
  getConversionFactors,
  getVesselsOfInterestFromFile,
  getWeightingRiskFromFile,
  getExporterBehaviourFromCSV,
  getSpeciesAliasesFromFile,
  getGearTypesDataFromCSV
} from "../../src/data/local-file";

describe('get conversion factors ', () => {

  let mockLoggerError;

  beforeEach(() => {
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', async () => {
    const filePath = 'pathToNonExistingFile';

    try {
      await getConversionFactors(filePath)
    }
    catch (e) {
      expect(e.message).toContain('File does not exist');
      expect(mockLoggerError).toHaveBeenCalledWith('Could not load conversion factors data from file', filePath);
    }
  });

  it('should return an array conversion factor object', async () => {
    const filePath = `${__dirname}/../../data/conversionfactors.csv`;

    const result = await getConversionFactors(filePath);
    expect(result).toBeInstanceOf(Array);
    expect(result[0]).toMatchObject({
      species: expect.any(String),
      state: expect.any(String),
      presentation: expect.any(String),
      toLiveWeightFactor: expect.any(String),
      quotaStatus: expect.any(String),
      riskScore: expect.any(String)
    });
  });

});

describe('get exporter behaviour csv', () => {

  let mockLoggerInfo;
  let mockLoggerError;

  beforeEach(() => {
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', async () => {
    const filePath = 'pathToNonExistingFile';

    try {
      await getExporterBehaviourFromCSV(filePath)
    }
    catch (e) {
      expect(e.message).toContain('File does not exist');
      expect(mockLoggerError).toHaveBeenCalledWith('Could not load exporter behaviour data from file', filePath);
    }
  });

  it('should return an array of exporter behaviour objects', async () => {
    const filePath = `${__dirname}/../../data/exporter_behaviour.csv`;

    const result = await getExporterBehaviourFromCSV(filePath);

    expect(result).toBeInstanceOf(Array);

    try {
      expect(result[0]).toMatchObject({
        accountId: expect.any(String),
        contactId: expect.any(String),
        name: expect.any(String),
        score: expect.any(Number)
      });
    } catch {
      try {
        expect(result[0]).toMatchObject({
          contactId: expect.any(String),
          name: expect.any(String),
          score: expect.any(Number)
        });
      } catch {
        expect(result[0]).toMatchObject({
          accountId: expect.any(String),
          name: expect.any(String),
          score: expect.any(Number)
        });
      }
    }
  });

});

describe('get vessels of interest', () => {

  let mockLoggerError;

  beforeEach(() => {
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', async () => {
    const filePath = 'pathToNonExistingFile';

    try {
      await getVesselsOfInterestFromFile(filePath)
    }
    catch (e) {
      expect(e.message).toContain('File does not exist');
      expect(mockLoggerError).toHaveBeenCalledWith('Could not load vessels of interest data from file', filePath);
    }
  });

  it('should return an array of vessels of interests', async () => {
    const filePath = `${__dirname}/../../data/vesselsOfInterest.csv`;

    const result = await getVesselsOfInterestFromFile(filePath);
    expect(result).toBeInstanceOf(Array);
    expect(result[0]).toMatchObject({
      "__t": 'vesselOfInterest',
      registrationNumber: expect.any(String)
    });
  });

});

describe('get weighting risk factors', () => {

  let mockLoggerError;

  beforeEach(() => {
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', async () => {
    const filePath = 'pathToNonExistingFile';

    try {
      await getWeightingRiskFromFile(filePath)
    }
    catch (e) {
      expect(e.message).toContain('File does not exist');
      expect(mockLoggerError).toHaveBeenCalledWith('Could not load weighting risk data from file', filePath);
    }
  });

  it('should return an array of weighting rick factors', async () => {
    const filePath = `${__dirname}/../../data/weightingRisk.csv`;

    const result = await getWeightingRiskFromFile(filePath);
    expect(result).toBeInstanceOf(Array);
    expect(result[0]).toMatchObject({
      vesselWeight: expect.any(Number),
      speciesWeight: expect.any(Number),
      exporterWeight: expect.any(Number),
      threshold: expect.any(Number)
    });
  });

});

describe('get species data', () => {

  let mockLoggerError;

  beforeEach(() => {
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', async () => {
    const filePath = 'pathToNonExistingFile';

    try {
      await getSpeciesDataFromFile(filePath)
    }
    catch (e) {
      expect(e.message).toContain('File does not exist');
      expect(mockLoggerError).toHaveBeenCalledWith('Could not load species data from file', filePath);
    }
  });

  it('should return an array of species', async () => {
    const filePath = `${__dirname}/../../data/commodity_code.txt`;

    const result = await getSpeciesDataFromFile(filePath);
    expect(result).toBeInstanceOf(Array);
  });

});

describe('get species data from CSV', () => {

  let mockLoggerError;

  beforeEach(() => {
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', async () => {
    const filePath = 'pathToNonExistingFile';

    try {
      await getSpeciesDataFromCSV(filePath)
    }
    catch (e) {
      expect(e.message).toContain('File does not exist');
      expect(mockLoggerError).toHaveBeenCalledWith('Could not load species data from file', filePath);
    }
  });

  it('should return an array of species', async () => {
    const filePath = `${__dirname}/../../data/allSpecies.csv`;

    const result = await getSpeciesDataFromCSV(filePath);
    expect(result).toBeInstanceOf(Array);
  });

});

describe('get seasonal fish data from CSV', () => {

  let mockLoggerError;

  beforeEach(() => {
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', async () => {
    const filePath = 'pathToNonExistingFile';

    try {
      await getSeasonalFishDataFromCSV(filePath)
    }
    catch (e) {
      expect(e.message).toContain('File does not exist');
      expect(mockLoggerError).toHaveBeenCalledWith('Could not load seasonal fish data from file', filePath);
    }
  });

  it('should return an array of seasonal fish', async () => {
    const filePath = `${__dirname}/../../data/seasonal_fish.csv`;

    const result = await getSeasonalFishDataFromCSV(filePath);
    expect(result).toBeInstanceOf(Array);
  });

});

describe('get species aliases from file', () => {

  let mockLoggerError;

  beforeEach(() => {
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', () => {
    const filePath = 'pathToNonExistingFile';

    try {
      getSpeciesAliasesFromFile(filePath);
    }
    catch (e) {
      expect(e.message).toContain('no such file or directory');
      expect(mockLoggerError).toHaveBeenCalledWith('Could not load species aliases data from file', filePath);
    }
  });

  it('should return an array of species aliases', () => {
    const filePath = `${__dirname}/../../data/speciesmismatch.json`;

    const result = getSpeciesAliasesFromFile(filePath);
    expect(result).toBeInstanceOf(Array);
  });
});




describe('get gear types data from CSV', () => {

  let mockLoggerError;

  beforeEach(() => {
    mockLoggerError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw and log an error if file does not exist', async () => {
    const filePath = 'pathToNonExistingFile';

    try {
      await getGearTypesDataFromCSV(filePath)
    }
    catch (e) {
      expect(e.message).toContain('File does not exist');
      expect(mockLoggerError).toHaveBeenCalledWith('Could not load gear types data from file', filePath);
    }
  });

  it('should return an array of gear types', async () => {
    const filePath = `${__dirname}/../../data/geartypes.csv`;

    const result = await getGearTypesDataFromCSV(filePath);
    expect(result).toBeInstanceOf(Array);
  });

});