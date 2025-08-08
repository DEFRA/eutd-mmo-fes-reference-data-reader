import { checkPresentField, eezFieldCheck, looksLikeADate } from "../../src/utils/landings";

describe('looksLikeADate', () => {
  it('returns true for UK short date format', () => {
    expect(looksLikeADate('01/01/2025')).toBe(true);
  });
  it('returns false for ISO short date format', () => {
    expect(looksLikeADate('2025-01-01')).toBe(false);
  });
  it('returns false when the value contains at least one number and one forward slash', () => {
    expect(looksLikeADate('2/')).toBe(false);
  });
  it('returns false when the value contains only numbers', () => {
    expect(looksLikeADate('12345')).toBe(false);
  });
  it('returns false when the value contains only forward slashes', () => {
    expect(looksLikeADate('/////')).toBe(false);
  });
});
describe('eezFieldCheck', () => {
  it('returns true for a valid single ISO country code', () => {
    expect(eezFieldCheck(['FRA'], 0)).toBe(true);
  });

  it('returns true for multiple valid ISO country codes separated by semicolon', () => {
    expect(eezFieldCheck(['FRA;DEU;GBR'], 0)).toBe(true);
  });

  it('returns false if any code in the semicolon list is invalid', () => {
    expect(eezFieldCheck(['FRA;INVALID;GBR'], 0)).toBe(false);
  });

  it('returns false for an invalid single code', () => {
    expect(eezFieldCheck(['INVALID'], 0)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(eezFieldCheck([''], 0)).toBe(false);
  });
});

describe('checkPresentField', () => {
  const allKeys = [
    'productId', 'startDate', 'landingDate', 'faoArea', 'highSeasArea', 'eezCode', 'rfmoCode', 'vesselPln', 'gearCode', 'exportWeight'
  ];
  const highSeasAreaList = ['YES', 'NO'];
  const gearTypeCodeList = ['PS', 'LL'];
  const rfmoCodeList = ['GFCM', 'IOTC'];

  it('detects all optional fields present', () => {
    const cells = [
      'PRD738', '09/12/2020', '10/12/2020', 'FAO18', 'YES', 'FRA', 'GFCM', 'H1100', 'PS', '100'
    ];
    expect(checkPresentField(cells, allKeys, highSeasAreaList, gearTypeCodeList, rfmoCodeList)).toEqual({
      isStartDatePresent: true,
      isHighSeasAreaPresent: true,
      isEezPresent: true,
      isRfmoPresent: true,
      isGearCodePresent: true,
    });
  });

  it('detects only mandatory fields present', () => {
    const cells = [
      'PRD738','10/12/2020','FAO18','H1100','100'
    ];
    expect(checkPresentField(cells, allKeys, highSeasAreaList, gearTypeCodeList, rfmoCodeList)).toEqual({
      isStartDatePresent: false,
      isHighSeasAreaPresent: false,
      isEezPresent: false,
      isRfmoPresent: false,
      isGearCodePresent: false,
    });
  });

  it('detects only startDate present', () => {
    const cells = [
      'PRD738','10/12/2020','10/12/2020','FAO18','H1100','100'
    ];
    expect(checkPresentField(cells, allKeys, highSeasAreaList, gearTypeCodeList, rfmoCodeList)).toEqual(
      expect.objectContaining({ isStartDatePresent: true })
    );
  });

  it('detects only highSeasArea present', () => {
    const cells = [
      'PRD738','10/12/2020','FAO18','YES','H1100','100'
    ];
    expect(checkPresentField(cells, allKeys, highSeasAreaList, gearTypeCodeList, rfmoCodeList)).toEqual(
      expect.objectContaining({ isHighSeasAreaPresent: true })
    );
  });

  it('detects only gearCode present', () => {
    const cells = [
      'PRD738','10/12/2020','FAO18','H1100','PS','100'
    ];
    expect(checkPresentField(cells, allKeys, highSeasAreaList, gearTypeCodeList, rfmoCodeList)).toEqual(
      expect.objectContaining({ isGearCodePresent: true })
    );
  });

  it('detects only rfmoCode present', () => {
    const cells = [
      'PRD738','10/12/2020','FAO18','GFCM','H1100','100'
    ];
    expect(checkPresentField(cells, allKeys, highSeasAreaList, gearTypeCodeList, rfmoCodeList)).toEqual(
      expect.objectContaining({ isRfmoPresent: true })
    );
  });

  it('detects only eezCode present', () => {
    const cells = [
      'PRD738','10/12/2020','FAO18','FRA','H1100','100'
    ];
    expect(checkPresentField(cells, allKeys, highSeasAreaList, gearTypeCodeList, rfmoCodeList)).toEqual(
      expect.objectContaining({ isEezPresent: true })
    );
  });
});