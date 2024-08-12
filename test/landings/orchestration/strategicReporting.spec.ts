import * as DefraMapper from "../../../src/landings/transformations/defraValidation";
import * as DefraPersistence from "../../../src/landings/persistence/defraValidation";
import * as SUT from "../../../src/landings/orchestration/strategicReporting";

import logger from "../../../src/logger";

const correlationId = 'some-uuid-correlation-id';

describe('reportPs', () => {

  let mockPsMapper;
  let mockCatchMapper;
  let mockPersistence;
  let mockLoggerInfo;

  beforeEach(() => {
    mockPsMapper = jest.spyOn(DefraMapper, 'toPsDefraReport');
    mockCatchMapper = jest.spyOn(DefraMapper, 'toCatches');
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockPersistence = jest.spyOn(DefraPersistence, 'insertPsDefraValidationReport');
    mockPersistence.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call the mapper and pass the result to the persistence service', async () => {
    const sdpsQuery: any[] = [{test: 'validation result', status: 'STATUS'}];
    const ps: any = {test: 'processing statement', documentNumber: 'DOCUMENT NUMBER', requestByAdmin: false};
    const mappedPs: any = {test: 'mapped', _correlationId: correlationId};
    const mappedCatches: any[] = [{test: 'catch'}];

    mockPsMapper.mockReturnValue(mappedPs);
    mockCatchMapper.mockReturnValue(mappedCatches);

    await SUT.reportPs(sdpsQuery, ps, correlationId);

    expect(mockPsMapper).toHaveBeenCalledWith('DOCUMENT NUMBER','some-uuid-correlation-id','STATUS', false, ps);
    expect(mockCatchMapper).toHaveBeenCalledWith(sdpsQuery);
    expect(mockPersistence).toHaveBeenCalledWith({...mappedPs, catches: mappedCatches});
    expect(mockLoggerInfo).toHaveBeenCalledWith('[REPORTING-PS][REPORT-ID][some-uuid-correlation-id]');
  });

});

describe('reportSd', () => {

  let mockSdMapper;
  let mockProductMapper;
  let mockPersistence;
  let mockLoggerInfo;

  beforeEach(() => {
    mockSdMapper = jest.spyOn(DefraMapper, 'toSdDefraReport');
    mockProductMapper = jest.spyOn(DefraMapper, 'toProducts');
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockPersistence = jest.spyOn(DefraPersistence, 'insertSdDefraValidationReport');
    mockPersistence.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call the mapper and pass the result to the persistence service', async () => {
    const sdpsQuery: any[] = [{test: 'validation result', status: 'STATUS'}];
    const sd: any = {test: 'storage document', documentNumber: 'DOCUMENT NUMBER', requestByAdmin: false};
    const mappedSd: any = {test: 'mapped', _correlationId: correlationId};
    const mappedProducts: any[] = [{test: 'product'}];

    mockSdMapper.mockReturnValue(mappedSd);
    mockProductMapper.mockReturnValue(mappedProducts);

    await SUT.reportSd(sdpsQuery, sd, correlationId);

    expect(mockSdMapper).toHaveBeenCalledWith('DOCUMENT NUMBER','some-uuid-correlation-id','STATUS', false, sd);
    expect(mockProductMapper).toHaveBeenCalledWith(sdpsQuery);
    expect(mockPersistence).toHaveBeenCalledWith({...mappedSd, products: mappedProducts});
    expect(mockLoggerInfo).toHaveBeenCalledWith('[REPORTING-SD][REPORT-ID][some-uuid-correlation-id]');
  });

});