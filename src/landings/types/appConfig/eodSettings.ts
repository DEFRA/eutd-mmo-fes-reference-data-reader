import { Schema, Document, model } from 'mongoose';

export enum WEIGHT {
  VESSEL = 'vessel',
  rule = 'rule'
}

export const baseConfig = {
  discriminationKey: '_type',
  collection: 'eodSetting'
};

export type ruleType = 'expectedDate' | 'endDate' | 'dataEverExpected';
export type vesselSizeGroup = 'Under 10m' | '10-12m' | '12m+';

export interface IEodAudit {
  user:         string,
  timestamp:    string,
  vesselSizes?: string,
  rule?:        IEodRule
  changedFrom?: string,
  changedTo?:   string
}

export interface IEodRule {
  ruleType:     'expectedDate' | 'endDate',
  vesselSize:   vesselSizeGroup,
  vessels?:     vesselSizeGroup,
  numberOfDays: number,
  changedFrom?: string,
  changedTo?:   string
}

export interface IEodSetting {
  da:           string,
  rule?:        string,
  vesselSizes?: vesselSizeGroup[],
  rules?:       IEodRule[],
  audit?:       IEodAudit[],
}

export interface IEodAdminAudit {
  date:           string,
  time:           string,
  user:           string,
  rule:           ruleType,
  da:             string,
  vesselSizes?:   string,
  vesselSize?:    vesselSizeGroup,
  numberOfDays?:  number,
  changedFrom?:   string,
  changedTo?:     string,
}

const EodRulesSettingSchema = new Schema({
  da:           { type: String, required: false  },
  rule:         { type: String, required: false  },
  rules:        { type: Array,  required: false  },
  vessels:      { type: Array,  required: false  },
  vesselSizes:  { type: Array,  required: false  },
  audit:        { type: Array,  required: false  }
});

export interface IEodSettingModel extends IEodSetting, Document {}

export const Eod = model<Document>('Eod', new Schema({}, baseConfig));
export const EodSettingModel = Eod.discriminator<IEodSettingModel>('eodSetting', EodRulesSettingSchema);