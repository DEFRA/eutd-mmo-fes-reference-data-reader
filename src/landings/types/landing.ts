import { Schema, model, Document } from 'mongoose';

export const enum LandingSources {
  LandingDeclaration  = 'LANDING_DECLARATION',
  CatchRecording      = 'CATCH_RECORDING',
  ELog                = 'ELOG'
}

export interface ILandingItem {
  species: string,
  weight: number,
  factor: number,
  state?: string,
  presentation?: string,
}

export interface ILanding {
  rssNumber: string,
  dateTimeLanded: string,
  dateTimeRetrieved?: string,
  source: string,
  items: ILandingItem[]
}

export interface ILandingQuery {
  rssNumber: string,
  dateLanded: string,
  dataEverExpected?: boolean,
  landingDataExpectedDate?: string,
  landingDataEndDate?: string,
  createdAt?: string
}

export interface ILandingModel extends ILanding, Document {}

//
// Aggregated per day
//
export interface ILandingAggregated {
  rssNumber: string,
  dateLanded: string,
  numberOfLandings: number,
  firstDateTimeRetrieved: string,
  lastDateTimeRetrieved: string,
  items: ILandingAggregatedItem[]
}

export interface ILandingAggregatedItem {
  species : string,
  weight: number,
  breakdown? : ILandingAggregatedItemBreakdown[]
}

export interface ILandingAggregatedItemBreakdown {
  presentation? : string
  state? : string
  source : string
  isEstimate: boolean
  factor: number
  weight: number
  liveWeight: number
}

const LandingItemSchema = new Schema({
    species:      { type: String, required: true },
    weight:       { type: Number, required: true },
    factor:       { type: Number, required: true },
    state:        { type: String, required: false },
    presentation: { type: String, required: false }
});

const LandingSchema = new Schema({
    rssNumber:         { type: String, required: true },
    dateTimeLanded:    { type: Date, required: true },
    dateTimeRetrieved: { type: Date, default: Date.now },
    source:            { type: String, required: true },
    items:             [ LandingItemSchema ]
});

export const LandingModel = model<ILandingModel>('Landing', LandingSchema);