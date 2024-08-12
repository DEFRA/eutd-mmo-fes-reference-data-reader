import { AxiosResponse } from 'axios';
import axios from "axios";
import logger from '../logger';
import appConfig from '../config';
import { getAvServiceConf, IAvConfig } from './trade.service';

export interface ScanData {
  fileName: string,
  extension: string,
  content: string,
  documentNumber: string,
  key:string
}

export interface ScanResponse {
  virusDetected : boolean
}

export const scanFile = async (fileData: ScanData) : Promise<ScanResponse>  => {
  logger.info(`[AV][SCAN][${fileData.documentNumber}][START][${fileData.key}]`);
  if(appConfig.skipAvScan) {
    logger.info(`[AV][SCAN][${fileData.documentNumber}][SKIPPED][${fileData.key}]`);
    return {virusDetected: false }
  }

  const collection : string = 'fes';
  const service : string = 'fes';
  const payload = {
    ...fileData,
    collection: collection,
    service: service,
    userEmail: null,
    userId: null,
    persistFile: false
  };
  delete payload.documentNumber;

  try {
    const avConfig : IAvConfig = await getAvServiceConf();
    const response: AxiosResponse = await axios.put(
      `${avConfig.baseUrl}${avConfig.avUri}${collection}/${fileData.key}`,
      payload,
      {
        headers: {
          Authorization: `${avConfig.tokenType} ${avConfig.accessToken}`,
          [avConfig.apimHeaderName]: avConfig.apimHeaderValue
        }
      }
    );

    logger.info(`[AV][SCAN][${fileData.documentNumber}][RESPONSE][${fileData.key}] ${response.data.toString()}`);

    let virusDetected = undefined;
    if(response.data.toString().includes('Clean')) virusDetected = false;
    if(response.data.toString().includes('Quarantined')) virusDetected = true;

    return { virusDetected : virusDetected }

  } catch (err) {
    logger.error(`[AV][SCAN][${fileData.documentNumber}][ERROR][${fileData.key}] [${err}]`);
    return {virusDetected:undefined}
  }

};