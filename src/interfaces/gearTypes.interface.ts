export interface IGearType {
  gearName: string;
  gearCode: string;
}

type GearRecordKeys = 'Gear category' | 'Gear name' | 'Gear code';

export type GearRecord = Partial<Pick<{[key: string]: string;}, GearRecordKeys>>;
