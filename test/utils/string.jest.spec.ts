import { capitalize, equalsIgnoreCase } from "../../src/utils/string";

describe('string', () => {
  it('should return an empty string', () => {
    expect(capitalize(undefined)).toBe('');
  })
});

describe('equalsIgnoreCase', () => {
  it('should return true when values are the same', () => {
    expect(equalsIgnoreCase('equal', 'equal')).toBe(true);
    expect(equalsIgnoreCase('EqUaL', 'eQuAl')).toBe(true);
    expect(equalsIgnoreCase('EQUAL', 'equal')).toBe(true);
  });
  it('should treat undefined parameters as empty strings', () => {
    expect(equalsIgnoreCase(undefined, undefined)).toBe(true);
    expect(equalsIgnoreCase(undefined, '')).toBe(true);
    expect(equalsIgnoreCase('', undefined)).toBe(true);
    expect(equalsIgnoreCase(undefined, 'undefined')).toBe(false);
    expect(equalsIgnoreCase('undefined', undefined)).toBe(false);
  });
  it('should return false when values do not match', () => {
    expect(equalsIgnoreCase('equal', 'equaI')).toBe(false);
    expect(equalsIgnoreCase('EqUaL', 'eQu@l')).toBe(false);
  });
});