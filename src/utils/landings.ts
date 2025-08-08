export const gearCodeRegex = /^[a-zA-Z]{2,3}$/;
export const isoCountryCodeRegex = /^[A-Z]{2,3}$/;
const fuzzyDateRegex = /^(0\d|[12]\d|3[01])\/(0\d|1[0-2])\/\d{4}$/;

export const looksLikeADate = (value: string) => fuzzyDateRegex.test(value);

export const eezFieldCheck = (cells: string[], index: number) => {
  const eezValue = cells[index].trim();
  if (isoCountryCodeRegex.test(eezValue)) return true;
  else if (eezValue.includes(';')) {
    const eezValArr = eezValue.split(';');
    let isEez = true;
    for (const eezCode of eezValArr) {
      if (!isoCountryCodeRegex.test(eezCode.trim())) {
        isEez = false;
        break;
      }
    }
    return isEez;
  } else return false;
};

export const checkPresentField = (
  cells: string[],
  allKeys: string[],
  highSeasAreaList: string[],
  gearTypeCodeList: string[],
  rfmoCodeList: string[],
) => {
  const checkOptionalField = {
    isStartDatePresent: false,
    isHighSeasAreaPresent: false,
    isEezPresent: false,
    isRfmoPresent: false,
    isGearCodePresent: false,
  };
  const startDateIndex = allKeys.indexOf('startDate');
  const highSeasAreaIndex = allKeys.indexOf('highSeasArea');
  const exclusiveEconomicZoneIndex = allKeys.indexOf('eezCode');
  // checking valid landed date.
  if (looksLikeADate(cells[startDateIndex + 1])) {
    // If yes, startDate is present
    checkOptionalField.isStartDatePresent = true;
    if (highSeasAreaList.includes(cells[highSeasAreaIndex].trim())) {
      // highSeasArea is present
      checkOptionalField.isHighSeasAreaPresent = true;
      if (eezFieldCheck(cells, exclusiveEconomicZoneIndex)) {
        // eez is present
        checkOptionalField.isEezPresent = true;
      }
    } else if (eezFieldCheck(cells, exclusiveEconomicZoneIndex - 1)) {
      // eez is present
      checkOptionalField.isEezPresent = true;
    }
  } else if (highSeasAreaList.includes(cells[highSeasAreaIndex - 1].trim())) {
    // highSeasArea is present
    checkOptionalField.isHighSeasAreaPresent = true;
    if (eezFieldCheck(cells, exclusiveEconomicZoneIndex - 1)) {
      // eez is present
      checkOptionalField.isEezPresent = true;
    }
  } else if (eezFieldCheck(cells, exclusiveEconomicZoneIndex - 2)) {
    // eez is present
    checkOptionalField.isEezPresent = true;
  }

  if (gearTypeCodeList.includes(cells[cells.length - 2].trim())) {
    // gearCode is present
    checkOptionalField.isGearCodePresent = true;
    if (rfmoCodeList.includes(cells[cells.length - 4].trim())) {
      // rfmo is present
      checkOptionalField.isRfmoPresent = true;
    }
  } else if (rfmoCodeList.includes(cells[cells.length - 3].trim())) {
    // rfmo is present
    checkOptionalField.isRfmoPresent = true;
  }
  return checkOptionalField;
};
