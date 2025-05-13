import moment from 'moment';
import config from '../../config';
import { vesselLengthToSize } from '../../data/cache';
import { ILicence } from 'mmo-shared-reference-data';
import {
  EodSettingModel,
  IEodSetting,
  IEodAudit,
  IEodAdminAudit,
  IEodRule,
  vesselSizeGroup,
} from '../types/appConfig/eodSettings';
import logger from '../../logger';

const defaultRules: IEodRule[] = [{
  ruleType: 'expectedDate',
  numberOfDays: 0,
  vesselSize: undefined
}, {
  ruleType: 'endDate',
  numberOfDays: 14,
  vesselSize: undefined
}];

const addDefaultRules: (rules: IEodRule[], vesselSize: vesselSizeGroup) => boolean = (rules: IEodRule[], vesselSize) =>
  !Array.isArray(rules) ||
  rules.find((rule: IEodRule) => rule.ruleType === 'expectedDate' && rule.vesselSize === vesselSize) === undefined ||
  rules.find((rule: IEodRule) => rule.ruleType === 'endDate' && rule.vesselSize === vesselSize) === undefined

const seedEodRule = async (setting: IEodSetting) => {
  if (Array.isArray(setting.vesselSizes) && setting.vesselSizes.length > 0) {
    const rules: IEodRule[] = setting.rules;

    for (const vesselSize of setting.vesselSizes) {
      if (addDefaultRules(rules, vesselSize)) {
        for (const defaultRule of defaultRules) {
          await createEodRules(config.cloudRoleName, setting.da, undefined, { ...defaultRule, vesselSize, changedFrom: null, changedTo: defaultRule.numberOfDays.toString() });
        }
      }
    }
  }
}

const createUpdateRule = (audit: IEodAudit, vesselSizes?: vesselSizeGroup[], rule?: IEodRule) =>
  Array.isArray(vesselSizes) ?
    { "$push": { "audit": audit }, vesselSizes } :
    { "$push": { "audit": audit, "rules": { ruleType: rule.ruleType, vesselSize: rule.vesselSize, numberOfDays: rule.numberOfDays } } }

export const createEodRules = async (user: string, da: string, vesselSizes?: vesselSizeGroup[], rule?: IEodRule): Promise<void> => {
  if (rule)
    await EodSettingModel.findOneAndUpdate({ da }, { "$pull": { "rules": { ruleType: rule.ruleType, vesselSize: rule.vesselSize } } });

  const audit: IEodAudit = {
    user,
    timestamp: moment().utc().toISOString(),
    rule,
    vesselSizes: Array.isArray(vesselSizes) && vesselSizes.length > 0 ? vesselSizes.join(',') : undefined,
  };

  const update = createUpdateRule(audit, vesselSizes, rule);
  const result = await EodSettingModel.findOneAndUpdate({ da }, update, { upsert: true, returnDocument: "after" });

  if (Array.isArray(vesselSizes))
    await seedEodRule(result);
}

export const getEodSettings = async (excludeAudits: boolean = true): Promise<IEodSetting[]> =>
  await EodSettingModel.find({})
    .select((excludeAudits) ? ['-_id', '-__v', '-__t', '-audit', '-vessels'] : ['-_id', '-__v', '-__t', '-vessels'])
    .lean();

export const getEodSetting = async (da: string): Promise<IEodSetting> =>
  await EodSettingModel.findOne({ da })
    .select(['-_id', '-__v', '-__t', '-audit', '-vessels'])
    .lean();

export const getEodAudits = async (): Promise<IEodAdminAudit[]> => {
  const getEODRules: IEodSetting[] = await getEodSettings(false);

  if (!Array.isArray(getEODRules)) {
    return [];
  }

  return getEODRules.flatMap((eodSetting: IEodSetting) => processEodSettingAudits(eodSetting));
};

const processEodSettingAudits = (eodSetting: IEodSetting): IEodAdminAudit[] => {
  const audits: IEodAudit[] = eodSetting.audit;

  if (!Array.isArray(audits)) {
    return [];
  }

  return audits.map((eodAudit: IEodAudit) => mapEodAuditToAdminAudit(eodAudit, eodSetting.da));
};

const mapEodAuditToAdminAudit = (eodAudit: IEodAudit, da: string): IEodAdminAudit => ({
  date: moment(eodAudit.timestamp).utc().format('DD-MM-YYYY'),
  time: moment(eodAudit.timestamp).utc().format("hh:mm:ss a"),
  user: eodAudit.user,
  rule: eodAudit.rule ? eodAudit.rule.ruleType : 'dataEverExpected',
  da,
  vesselSizes: eodAudit.rule ? eodAudit.rule.vesselSize : eodAudit.vesselSizes,
  changedFrom: eodAudit.rule ? eodAudit.rule.changedFrom : undefined,
  changedTo: eodAudit.rule ? eodAudit.rule.changedTo : undefined,
});

export const seedEodRules = async (): Promise<void> => {
  if (config.eodRulesMigration) {
    const eodSettings: IEodSetting[] = await getEodSettings();

    for (const setting of eodSettings)
      await seedEodRule(setting);
  }
}

export const cleanUpEodRules = async (): Promise<void> => {
  if (config.eodRulesMigration) {
    const eodSettings: IEodSetting[] = await getEodSettings();
    logger.info(`[EOD-SETTINGS][PERSISTENCE][LENGTH][${eodSettings.length}]`);
    for await (const setting of eodSettings) {
      if (setting.rule) {
        logger.info(`[EOD-SETTINGS][DELETING][RULE][${setting.rule}]`);
        await EodSettingModel.findOneAndDelete({ rule: setting.rule })
      }
    }
  }
}

export const isLandingDataAvailable = async (licence: ILicence, landedDate: string, isLegallyDue?: boolean): Promise<boolean> => {
  const group: vesselSizeGroup = vesselLengthToSize(licence.vesselLength);
  const eodSetting: IEodSetting = await getEodSetting(licence.da);

  if (!eodSetting) {
    return true;
  }

  const isDataNeverExpected = () =>
    !Array.isArray(eodSetting.vesselSizes) || eodSetting.vesselSizes.length === 0 || !eodSetting.vesselSizes.includes(group)

  if (isDataNeverExpected()) {
    return false;
  }

  if (isLegallyDue === true) {
    return true;
  }

  const expectedDateRule: IEodRule = eodSetting?.rules?.find((rule: IEodRule) => rule.ruleType === 'expectedDate' && rule.vesselSize === group);

  if (!expectedDateRule) {
    return true;
  }

  const landingDataExpectedDate: moment.Moment = moment.utc(landedDate).add(expectedDateRule.numberOfDays, 'day');
  return moment.utc().isSameOrAfter(moment.utc(landingDataExpectedDate));
}