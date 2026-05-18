export interface IGearType {
  gearName: string;
  gearCode: string;
}

type GearRecordKeys = 'Gear category' | 'Gear name (code)' |'Gear name' | 'Gear code' | 'ISSCFG code';

export type GearRecord = Partial<Pick<{[key: string]: string;}, GearRecordKeys>>;