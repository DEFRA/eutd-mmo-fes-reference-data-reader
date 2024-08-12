import logger from '../logger';

import { IExtendedValidationData, RawLandingsModel, SalesNotesModel } from './types/extendedValidationData';

type extendedDataType = 'rawLandings' | 'salesNotes'

export const updateExtendedValidationData = async (landing: IExtendedValidationData, extendedDataType: extendedDataType) => {
  logger.info(`[EXTENDED-DATA-SERVICE][PUT][${extendedDataType}]`)
  
  return await _getModel(extendedDataType).updateMany({
      rssNumber: landing.rssNumber,
      dateLanded: landing.dateLanded
    },
    landing,
    {
      upsert: true
    }
  )
}

export const getExtendedValidationData = async (date: string, rssNumber: string, extendedDataType: extendedDataType ) => {
  logger.info(`[EXTENDED-DATA-SERVICE][GET][${extendedDataType}]`)

  return await _getModel(extendedDataType).findOne({ 
      dateLanded: date,
      rssNumber: rssNumber
    });
}


function _getModel(extendedDataType: string) {
  let model 

  if ( extendedDataType === 'rawLandings' ) 
    model = RawLandingsModel
  else if ( extendedDataType === 'salesNotes' )
    model = SalesNotesModel

  return model;
}
