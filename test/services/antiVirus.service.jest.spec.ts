import { ScanData, scanFile } from '../../src/services/antiVirus.service';
import appConfig, { ApplicationConfig } from '../../src/config';
import logger from '../../src/logger';
import axios from 'axios';
import * as TS from '../../src/services/trade.service'

describe('AV service', () => {

  ApplicationConfig.loadEnv({});

  let skipAvScanOriginalValue ;
  let mockLoggerInfo;
  let mockLoggerError;
  let mockAxiosPut;
  let mockGetAvServiceConf;

  const mockAVConf : TS.IAvConfig = {
    accessToken : 'anAccessToken',
    tokenType : 'ATokenType',
    apimHeaderName : 'anAPIMHeaderName',
    apimHeaderValue : 'anAPIHeaderValue',
    baseUrl : 'https://avApiBaseUlr',
    avUri : '/trade-file-store/v1/syncAv/'
  };

  beforeAll(()=>{
    skipAvScanOriginalValue = appConfig.skipAvScan;
    appConfig.skipAvScan = false;
  });

  afterAll(()=>{
    appConfig.skipAvScan  = skipAvScanOriginalValue;
  });

  beforeEach(()=>{
    mockLoggerInfo = jest.spyOn(logger, 'info');
    mockLoggerError = jest.spyOn(logger, 'error');
    mockAxiosPut = jest.spyOn(axios,'put');
    mockGetAvServiceConf = jest.spyOn(TS,'getAvServiceConf');
    mockGetAvServiceConf.mockResolvedValue(mockAVConf)
  });

  afterEach(()=>{
    jest.restoreAllMocks();
  });

  describe('scanFile',()=>{

    const mockScanData : ScanData = {
      fileName: 'upload9th19.csv',
      extension: 'csv',
      content: 'theFileContent',
      documentNumber: 'doc-number',
      key: 'theKey'
    };

    it('should call the api with the right parameters', async () => {
      mockAxiosPut.mockResolvedValue(null);

      await scanFile(mockScanData);

      expect(mockAxiosPut).toHaveBeenCalledWith(
        'https://avApiBaseUlr/trade-file-store/v1/syncAv/fes/theKey',
        {
          collection: "fes",
          content: "theFileContent",
          extension: "csv",
          fileName: "upload9th19.csv",
          key: "theKey",
          persistFile: false,
          service: "fes",
          userEmail: null,
          userId: null
        },
        {
          headers: {
            Authorization: `${mockAVConf.tokenType} ${mockAVConf.accessToken}`,
            [mockAVConf.apimHeaderName]: mockAVConf.apimHeaderValue
          }
        }
      );
    });

    it('should follow skip AV logic , no call the av api and return virus no detected if skipAvScan is true', async () => {
      appConfig.skipAvScan = true;

      const result = await scanFile(mockScanData);

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(1,`[AV][SCAN][${mockScanData.documentNumber}][START][${mockScanData.key}]`);
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(2,`[AV][SCAN][${mockScanData.documentNumber}][SKIPPED][${mockScanData.key}]`);
      expect(mockAxiosPut).not.toHaveBeenCalled();
      expect(result).toEqual({virusDetected: false});

      appConfig.skipAvScan = false;
    });

    it('should  log the appropriate messages and return no virus detected if api response is Clean', async () => {
      mockAxiosPut.mockResolvedValue({
        status: 200,
        data: 'Content-Scan: Clean'
      });

      const result = await scanFile(mockScanData);

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(1,`[AV][SCAN][${mockScanData.documentNumber}][START][${mockScanData.key}]`);
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(2,`[AV][SCAN][${mockScanData.documentNumber}][RESPONSE][${mockScanData.key}] Content-Scan: Clean`);
      expect(result).toEqual({virusDetected: false});

    });

    it('should log the appropriate messages and return virus detected if api response is Quarantined', async () => {
      mockAxiosPut.mockResolvedValue({
        status: 200,
        data: 'Content-Scan: Quarantined'
      });

      const result = await scanFile(mockScanData);

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(1,`[AV][SCAN][${mockScanData.documentNumber}][START][${mockScanData.key}]`);
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(2,`[AV][SCAN][${mockScanData.documentNumber}][RESPONSE][${mockScanData.key}] Content-Scan: Quarantined`);
      expect(result).toEqual({virusDetected: true});

    });

    it('should log the appropriate messages and return virus detected undefined if api response is FileInaccessible', async () => {
      mockAxiosPut.mockResolvedValue({
        status: 200,
        data: 'Content-Scan: FileInaccessible'
      });

      const result = await scanFile(mockScanData);

      expect(mockLoggerInfo).toHaveBeenNthCalledWith(1,`[AV][SCAN][${mockScanData.documentNumber}][START][${mockScanData.key}]`);
      expect(mockLoggerInfo).toHaveBeenNthCalledWith(2,`[AV][SCAN][${mockScanData.documentNumber}][RESPONSE][${mockScanData.key}] Content-Scan: FileInaccessible`);
      expect(result).toEqual({virusDetected: undefined});

    });

    it('should log the appropriate messages and return virus detected undefined if av config failed', async () => {
      mockGetAvServiceConf.mockRejectedValue(new Error('an error'));

      const result = await scanFile(mockScanData);

      expect(mockLoggerInfo).toHaveBeenCalledWith(`[AV][SCAN][${mockScanData.documentNumber}][START][${mockScanData.key}]`);
      expect(mockLoggerError).toHaveBeenCalledWith(`[AV][SCAN][${mockScanData.documentNumber}][ERROR][${mockScanData.key}] [Error: an error]`);
      expect(result).toEqual({virusDetected: undefined});

    });

    it('should log the appropriate messages and return virus detected undefined if av api failed', async () => {
      mockAxiosPut.mockRejectedValue(new Error('an error'));

      const result = await scanFile(mockScanData);

      expect(mockLoggerInfo).toHaveBeenCalledWith(`[AV][SCAN][${mockScanData.documentNumber}][START][${mockScanData.key}]`);
      expect(mockLoggerError).toHaveBeenCalledWith(`[AV][SCAN][${mockScanData.documentNumber}][ERROR][${mockScanData.key}] [Error: an error]`);
      expect(result).toEqual({virusDetected: undefined});

    });


  })
});