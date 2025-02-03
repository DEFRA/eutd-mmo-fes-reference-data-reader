import moment = require("moment");

export enum DEVOLVED_AUTHORITY {
  GUERNSEY = 'Guernsey',
  JERSEY = 'Jersey',
  NI = 'Northern Ireland',
  SCOTLAND = 'Scotland',
  IOM = 'Isle of Man',
  WALES = 'Wales',
  ENGLAND = 'England',
}

export const TOLERANCE_IN_KG = 50;
export const isLegallyDue = (
  vesselLength: number,
  da: string,
  applicationDate: moment.Moment,
  landedDate: moment.Moment,
  isQuotaSpecies: boolean,
  weightOnCert: number
): boolean => {
  if (vesselLength < 10) {
    switch (da) {
      case DEVOLVED_AUTHORITY.ENGLAND:
      case DEVOLVED_AUTHORITY.IOM:
        return isQuotaSpecies ? true : applicationDate.diff(landedDate, 'days') > 1;
      case DEVOLVED_AUTHORITY.WALES:
        return applicationDate.diff(landedDate, 'days') > 1;
      default:
        return false;
    }
  }
  else if (vesselLength > 12) {
    return weightOnCert > TOLERANCE_IN_KG;
  } else {
    return false;
  }
};