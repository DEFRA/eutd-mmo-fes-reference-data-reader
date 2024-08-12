import { capitalize } from "../../src/utils/string";

describe('string', () => {
  it('should return an empty string', () => {
    expect(capitalize(undefined)).toBe('');
  })
});